// HEXAGON: outside – DRIVEN adapter implementing the AirportRepository port
import type { AirportRepository, AirportSearchCriteria, Page } from '@usflights/application';
import type { Airport, IataCode } from '@usflights/domain';
import type pg from 'pg';
import { toAirport, type AirportRow } from './mappers.ts';
import { containsPattern, WhereBuilder } from './sql.ts';

const AIRPORT_COLUMNS = 'iata, airport, city, state, country, latitude, longitude';

export class AirportPostgresRepository implements AirportRepository {
  private readonly pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async findByIata(iata: IataCode): Promise<Airport | null> {
    const { rows } = await this.pool.query<AirportRow>(
      `SELECT ${AIRPORT_COLUMNS} FROM usairports WHERE iata = $1`,
      [iata.value],
    );
    return rows[0] ? toAirport(rows[0]) : null;
  }

  async search(criteria: AirportSearchCriteria): Promise<Page<Airport>> {
    const where = new WhereBuilder();
    if (criteria.state) where.add('state = ?', criteria.state);
    if (criteria.city) where.add('city ILIKE ?', containsPattern(criteria.city));
    if (criteria.text)
      where.add('(iata ILIKE ? OR airport ILIKE ?)', containsPattern(criteria.text));

    const whereSql = where.toSql();
    const countParams = [...where.params];
    const { limit, offset } = criteria.pagination;

    const [count, page] = await Promise.all([
      this.pool.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM usairports ${whereSql}`,
        countParams,
      ),
      this.pool.query<AirportRow>(
        `SELECT ${AIRPORT_COLUMNS} FROM usairports ${whereSql}
         ORDER BY iata LIMIT ${where.next(limit)} OFFSET ${where.next(offset)}`,
        where.params,
      ),
    ]);

    return { items: page.rows.map(toAirport), total: count.rows[0]?.total ?? 0, limit, offset };
  }
}
