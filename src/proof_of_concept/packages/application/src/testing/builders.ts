// TEST SUPPORT – never imported by production code (exposed as `@usflights/application/testing`).
// Object builders with sensible defaults: a test states only what matters to it.
import {
  Airport,
  Carrier,
  CarrierCode,
  Delay,
  Flight,
  FlightDate,
  IataCode,
  type DelayCause,
  type FlightStatsSnapshot,
} from '@usflights/domain';

export interface AirportOverrides {
  readonly iata?: string;
  readonly name?: string;
  readonly city?: string | null;
  readonly state?: string | null;
}

export function anAirport(overrides: AirportOverrides = {}): Airport {
  return Airport.create({
    iata: IataCode.of(overrides.iata ?? 'JFK'),
    name: overrides.name ?? 'John F Kennedy Intl',
    city: overrides.city === undefined ? 'New York' : overrides.city,
    state: overrides.state === undefined ? 'NY' : overrides.state,
    country: 'USA',
    location: { latitude: 40.6398, longitude: -73.7789 },
  });
}

export function aCarrier(code = 'AA', name = 'American Airlines Inc.'): Carrier {
  return Carrier.create(CarrierCode.of(code), name);
}

export interface FlightOverrides {
  readonly id?: number;
  readonly carrier?: string;
  readonly flightNumber?: string;
  readonly origin?: string;
  readonly destination?: string;
  readonly year?: number;
  readonly arrDelay?: number | null;
  readonly depDelay?: number | null;
  readonly cancelled?: boolean;
  readonly diverted?: boolean;
  readonly causes?: DelayCause[];
}

export function aFlight(overrides: FlightOverrides = {}): Flight {
  return Flight.create({
    id: overrides.id ?? 1,
    date: FlightDate.of(overrides.year ?? 2005, 6, 15),
    carrier: CarrierCode.of(overrides.carrier ?? 'AA'),
    flightNumber: overrides.flightNumber ?? '100',
    tailNumber: null,
    origin: IataCode.of(overrides.origin ?? 'JFK'),
    destination: IataCode.of(overrides.destination ?? 'LAX'),
    scheduledDeparture: 900,
    actualDeparture: 905,
    scheduledArrival: 1205,
    actualArrival: 1210,
    departureDelay: Delay.ofMinutes(overrides.depDelay === undefined ? 5 : overrides.depDelay),
    arrivalDelay: Delay.ofMinutes(overrides.arrDelay === undefined ? 5 : overrides.arrDelay),
    distanceMiles: 2475,
    cancelled: overrides.cancelled ?? false,
    diverted: overrides.diverted ?? false,
    delayCauses: overrides.causes ?? [],
  });
}

export function aStatsSnapshot(overrides: Partial<FlightStatsSnapshot> = {}): FlightStatsSnapshot {
  return {
    total: 100,
    delayed: 20,
    cancelled: 2,
    diverted: 1,
    avgArrivalDelayMinutes: 7.5,
    ...overrides,
  };
}
