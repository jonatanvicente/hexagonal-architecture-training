// HEXAGON: outside – DRIVEN adapter implementing the FlightRepository port
// Heavy lifting (filtering, counting, averaging) is pushed down to PostgreSQL;
// the *meaning* of "delayed" comes from the DelayPolicy received from the hexagon.
import type {
  CarrierStats,
  CarrierStatsFilter,
  DelayedFlightCriteria,
  FlightRepository,
  Page,
  TrafficDirection,
} from '@usflights/application';
import {
  CarrierCode,
  type DelayPolicy,
  type Flight,
  type FlightStatsSnapshot,
  type IataCode,
} from '@usflights/domain';
import type pg from 'pg';
import {
  FLIGHT_COLUMNS,
  toFlight,
  toStatsSnapshot,
  type FlightRow,
  type StatsRow,
} from './mappers.ts';
import { STATS_COLUMNS, WhereBuilder } from './sql.ts';

// Column names cannot be bind parameters, so they are chosen from a fixed whitelist.
const AIRPORT_STATS_SQL: Record<TrafficDirection, string> = {
  DEPARTURES: `SELECT ${STATS_COLUMNS} FROM flights WHERE origin = $2`,
  ARRIVALS: `SELECT ${STATS_COLUMNS} FROM flights WHERE dest = $2`,
};

const CARRIER_STATS_SQL = `
  SELECT uniquecarrier AS carrier, ${STATS_COLUMNS}
  FROM flights
  WHERE ($2::smallint IS NULL OR colyear = $2)
  GROUP BY uniquecarrier
  HAVING count(*) >= $3`;

export class FlightPostgresRepository implements FlightRepository {
  private readonly pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async findDelayed(criteria: DelayedFlightCriteria): Promise<Page<Flight>> {
    const where = new WhereBuilder()
      .addRaw('f.cancelled IS NOT TRUE')
      .addRaw('f.diverted IS NOT TRUE')
      .add('f.arrdelay >= ?', criteria.minDelayMinutes);
    if (criteria.origin) where.add('f.origin = ?', criteria.origin.value);
    if (criteria.destination) where.add('f.dest = ?', criteria.destination.value);
    if (criteria.carrier) where.add('f.uniquecarrier = ?', criteria.carrier.value);
    if (criteria.year !== undefined) where.add('f.colyear = ?', criteria.year);

    const whereSql = where.toSql();
    const countParams = [...where.params];
    const { limit, offset } = criteria.pagination;

    const [count, page] = await Promise.all([
      this.pool.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM flights f ${whereSql}`,
        countParams,
      ),
      this.pool.query<FlightRow>(
        `SELECT ${FLIGHT_COLUMNS} FROM flights f ${whereSql}
         ORDER BY f.arrdelay DESC, f.flightid
         LIMIT ${where.next(limit)} OFFSET ${where.next(offset)}`,
        where.params,
      ),
    ]);

    return { items: page.rows.map(toFlight), total: count.rows[0]?.total ?? 0, limit, offset };
  }

  async statsForAirport(
    iata: IataCode,
    direction: TrafficDirection,
    policy: DelayPolicy,
  ): Promise<FlightStatsSnapshot> {
    const { rows } = await this.pool.query<StatsRow>(AIRPORT_STATS_SQL[direction], [
      policy.thresholdMinutes,
      iata.value,
    ]);
    return toStatsSnapshot(rows[0]);
  }

  async statsByCarrier(filter: CarrierStatsFilter, policy: DelayPolicy): Promise<CarrierStats[]> {
    const { rows } = await this.pool.query<StatsRow & { carrier: string }>(CARRIER_STATS_SQL, [
      policy.thresholdMinutes,
      filter.year ?? null,
      filter.minFlights,
    ]);
    return rows.map((row) => ({
      carrier: CarrierCode.of(row.carrier),
      stats: toStatsSnapshot(row),
    }));
  }
}
