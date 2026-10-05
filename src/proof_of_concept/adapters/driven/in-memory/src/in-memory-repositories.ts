// HEXAGON: outside – DRIVEN adapters implementing the SAME ports as adapters/driven/postgres.
// Swapping PERSISTENCE=postgres → memory changes nothing inside the hexagon.
import type {
  AirportRepository,
  AirportSearchCriteria,
  CarrierRepository,
  CarrierSearchCriteria,
  CarrierStats,
  CarrierStatsFilter,
  DelayedFlightCriteria,
  FlightRepository,
  Page,
  Pagination,
  TrafficDirection,
} from '@usflights/application';
import type {
  Airport,
  Carrier,
  CarrierCode,
  DelayPolicy,
  Flight,
  FlightStatsSnapshot,
  IataCode,
} from '@usflights/domain';
import type { SeedData } from './seed-data.ts';

export class InMemoryAirportRepository implements AirportRepository {
  private readonly airports: readonly Airport[];

  constructor(data: SeedData) {
    this.airports = data.airports;
  }

  async findByIata(iata: IataCode): Promise<Airport | null> {
    return this.airports.find((a) => a.iata.equals(iata)) ?? null;
  }

  async search(criteria: AirportSearchCriteria): Promise<Page<Airport>> {
    const city = criteria.city?.toLowerCase();
    const text = criteria.text?.toLowerCase();
    const matches = this.airports
      .filter((a) => !criteria.state || a.state === criteria.state)
      .filter((a) => !city || (a.city ?? '').toLowerCase().includes(city))
      .filter(
        (a) =>
          !text || a.iata.value.toLowerCase().includes(text) || a.name.toLowerCase().includes(text),
      )
      .sort((a, b) => a.iata.value.localeCompare(b.iata.value));
    return paginate(matches, criteria.pagination);
  }
}

export class InMemoryCarrierRepository implements CarrierRepository {
  private readonly carriers: readonly Carrier[];

  constructor(data: SeedData) {
    this.carriers = data.carriers;
  }

  async findByCode(code: CarrierCode): Promise<Carrier | null> {
    return this.carriers.find((c) => c.code.equals(code)) ?? null;
  }

  async findByCodes(codes: readonly CarrierCode[]): Promise<Carrier[]> {
    return this.carriers.filter((c) => codes.some((code) => c.code.equals(code)));
  }

  async search(criteria: CarrierSearchCriteria): Promise<Page<Carrier>> {
    const text = criteria.text?.toLowerCase();
    const matches = this.carriers
      .filter(
        (c) =>
          !text || c.code.value.toLowerCase().includes(text) || c.name.toLowerCase().includes(text),
      )
      .sort((a, b) => a.code.value.localeCompare(b.code.value));
    return paginate(matches, criteria.pagination);
  }
}

export class InMemoryFlightRepository implements FlightRepository {
  private readonly flights: readonly Flight[];

  constructor(data: SeedData) {
    this.flights = data.flights;
  }

  async findDelayed(criteria: DelayedFlightCriteria): Promise<Page<Flight>> {
    const matches = this.flights
      .filter(
        (f) => !f.cancelled && !f.diverted && f.arrivalDelay.isAtLeast(criteria.minDelayMinutes),
      )
      .filter((f) => !criteria.origin || f.origin.equals(criteria.origin))
      .filter((f) => !criteria.destination || f.destination.equals(criteria.destination))
      .filter((f) => !criteria.carrier || f.carrier.equals(criteria.carrier))
      .filter((f) => criteria.year === undefined || f.date.year === criteria.year)
      .sort((a, b) => (b.arrivalDelay.minutes ?? 0) - (a.arrivalDelay.minutes ?? 0) || a.id - b.id);
    return paginate(matches, criteria.pagination);
  }

  async statsForAirport(
    iata: IataCode,
    direction: TrafficDirection,
    policy: DelayPolicy,
  ): Promise<FlightStatsSnapshot> {
    const scope = this.flights.filter((f) =>
      direction === 'DEPARTURES' ? f.origin.equals(iata) : f.destination.equals(iata),
    );
    return computeStats(scope, policy);
  }

  async statsByCarrier(filter: CarrierStatsFilter, policy: DelayPolicy): Promise<CarrierStats[]> {
    const byCarrier = new Map<string, Flight[]>();
    for (const flight of this.flights) {
      if (filter.year !== undefined && flight.date.year !== filter.year) continue;
      const bucket = byCarrier.get(flight.carrier.value) ?? [];
      bucket.push(flight);
      byCarrier.set(flight.carrier.value, bucket);
    }
    return [...byCarrier.values()]
      .filter((flights) => flights.length >= filter.minFlights)
      .map((flights) => ({
        carrier: (flights[0] as Flight).carrier,
        stats: computeStats(flights, policy),
      }));
  }
}

function computeStats(flights: readonly Flight[], policy: DelayPolicy): FlightStatsSnapshot {
  const delays = flights
    .filter((f) => !f.cancelled && f.arrivalDelay.isKnown())
    .map((f) => f.arrivalDelay.minutes as number);
  return {
    total: flights.length,
    delayed: flights.filter((f) => f.isDelayed(policy)).length,
    cancelled: flights.filter((f) => f.cancelled).length,
    diverted: flights.filter((f) => f.diverted).length,
    avgArrivalDelayMinutes: delays.length
      ? delays.reduce((sum, d) => sum + d, 0) / delays.length
      : null,
  };
}

function paginate<T>(items: readonly T[], { limit, offset }: Pagination): Page<T> {
  return { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
}
