// HEXAGON: outside – driven adapter (simulated data store)
// A tiny, deterministic dataset so the whole application runs with no database at all.
import {
  Airport,
  Carrier,
  CarrierCode,
  Delay,
  DELAY_CAUSES,
  Flight,
  FlightDate,
  IataCode,
  type DelayCause,
} from '@usflights/domain';

const AIRPORTS: ReadonlyArray<readonly [string, string, string, string, number, number]> = [
  ['ATL', 'William B Hartsfield-Atlanta Intl', 'Atlanta', 'GA', 33.6404, -84.4269],
  ['BOS', 'Gen Edw L Logan Intl', 'Boston', 'MA', 42.3643, -71.0052],
  ['BWI', 'Baltimore-Washington Intl', 'Baltimore', 'MD', 39.1754, -76.6683],
  ['DCA', 'Ronald Reagan Washington National', 'Arlington', 'VA', 38.8521, -77.0377],
  ['DFW', 'Dallas-Fort Worth International', 'Dallas-Fort Worth', 'TX', 32.8959, -97.0372],
  ['HOU', 'William P Hobby', 'Houston', 'TX', 29.6454, -95.2789],
  ['IAH', 'George Bush Intercontinental', 'Houston', 'TX', 29.9804, -95.3397],
  ['JFK', 'John F Kennedy Intl', 'New York', 'NY', 40.6398, -73.7789],
  ['LAX', 'Los Angeles International', 'Los Angeles', 'CA', 33.9425, -118.4081],
  ['ORD', "Chicago O'Hare International", 'Chicago', 'IL', 41.9796, -87.9045],
  ['SEA', 'Seattle-Tacoma Intl', 'Seattle', 'WA', 47.449, -122.3093],
  ['SFO', 'San Francisco International', 'San Francisco', 'CA', 37.619, -122.3748],
];

const CARRIERS: ReadonlyArray<readonly [string, string]> = [
  ['AA', 'American Airlines Inc.'],
  ['CO', 'Continental Air Lines Inc.'],
  ['DL', 'Delta Air Lines Inc.'],
  ['TW', 'Trans World Airways LLC'],
  ['UA', 'United Air Lines Inc.'],
  ['WN', 'Southwest Airlines Co.'],
];

export interface SeedData {
  readonly airports: Airport[];
  readonly carriers: Carrier[];
  readonly flights: Flight[];
}

export function createSeedData(flightCount = 400, seed = 42): SeedData {
  const airports = AIRPORTS.map(([iata, name, city, state, latitude, longitude]) =>
    Airport.create({
      iata: IataCode.of(iata),
      name,
      city,
      state,
      country: 'USA',
      location: { latitude, longitude },
    }),
  );
  const carriers = CARRIERS.map(([code, name]) => Carrier.create(CarrierCode.of(code), name));
  const random = mulberry32(seed);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;

  const flights: Flight[] = [];
  for (let id = 1; id <= flightCount; id++) {
    const origin = pick(airports);
    let destination = pick(airports);
    while (destination.iata.equals(origin.iata)) destination = pick(airports);

    const cancelled = random() < 0.01;
    const diverted = !cancelled && random() < 0.005;
    // Skewed distribution: most flights roughly on time, a long tail of big delays.
    const arrDelay = cancelled ? null : Math.round(-10 + Math.pow(random(), 5) * 240);
    const depDelay = arrDelay === null ? null : arrDelay - Math.round(random() * 10);
    const crsDep = 600 + Math.floor(random() * 15) * 100 + Math.floor(random() * 4) * 15;
    const causes: DelayCause[] = arrDelay !== null && arrDelay >= 15 ? [pick(DELAY_CAUSES)] : [];

    flights.push(
      Flight.create({
        id,
        date: FlightDate.of(
          1987 + Math.floor(random() * 22),
          1 + Math.floor(random() * 12),
          1 + Math.floor(random() * 28),
        ),
        carrier: pick(carriers).code,
        flightNumber: String(100 + Math.floor(random() * 3900)),
        tailNumber: null,
        origin: origin.iata,
        destination: destination.iata,
        scheduledDeparture: crsDep,
        actualDeparture: cancelled ? null : crsDep,
        scheduledArrival: crsDep + 200,
        actualArrival: cancelled ? null : crsDep + 200,
        departureDelay: Delay.ofMinutes(depDelay),
        arrivalDelay: Delay.ofMinutes(arrDelay),
        distanceMiles: 200 + Math.floor(random() * 2300),
        cancelled,
        diverted,
        delayCauses: causes,
      }),
    );
  }
  return { airports, carriers, flights };
}

/** Small deterministic PRNG so every run produces the same dataset. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
