// TEST SUPPORT – CONTRACT TESTS for the repository (driven) ports.
//
// A port is a promise: "any adapter plugged in here behaves like THIS". The contract is written
// once, next to the port's owner (the application), and every adapter runs it:
//   * adapters/driven/in-memory  → in-memory-repositories.unit.test.ts  (fast, always runs)
//   * adapters/driven/postgres   → postgres-repositories.int.test.ts    (real DB, may be skipped)
// If both pass, the adapters are interchangeable – which is the whole point of the hexagon.
//
// Assertions only use facts true in BOTH datasets (see README_testing.md):
//   airports JFK (NY), HOU + IAH (city Houston, TX), ORD (with flights);
//   carriers AA "American Airlines Inc.", DL "Delta Air Lines Inc.".
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { CarrierCode, DelayPolicy, IataCode } from '@usflights/domain';
import type { AirportRepository } from '../ports/out/airport-repository.port.ts';
import type { CarrierRepository } from '../ports/out/carrier-repository.port.ts';
import type { FlightRepository } from '../ports/out/flight-repository.port.ts';

export interface RepositoryUnderTest {
  readonly airports: AirportRepository;
  readonly carriers: CarrierRepository;
  readonly flights: FlightRepository;
  dispose?(): Promise<void>;
}

export interface ContractOptions {
  /** A reason string skips the whole suite (e.g. database not configured). */
  readonly skip?: string | false;
}

const page = (limit: number, offset = 0) => ({ limit, offset });
const iata = (code: string) => IataCode.of(code);
const policy = new DelayPolicy(15);

export function runRepositoryContract(
  adapterName: string,
  setup: () => Promise<RepositoryUnderTest> | RepositoryUnderTest,
  options: ContractOptions = {},
): void {
  describe(`Repository contract – ${adapterName}`, { skip: options.skip || false }, () => {
    let repos: RepositoryUnderTest;

    before(async () => {
      repos = await setup();
    });

    after(async () => {
      await repos?.dispose?.();
    });

    describe('AirportRepository', () => {
      it('should find an airport by IATA code', async () => {
        const airport = await repos.airports.findByIata(iata('JFK'));
        assert.ok(airport);
        assert.equal(airport.iata.value, 'JFK');
        assert.equal(airport.state, 'NY');
      });

      it('should return null when the IATA code does not exist', async () => {
        assert.equal(await repos.airports.findByIata(iata('ZZZZ')), null);
      });

      it('should filter by state and sort by IATA code', async () => {
        const result = await repos.airports.search({ state: 'TX', pagination: page(100) });
        assert.ok(result.items.length > 0);
        assert.ok(result.items.every((a) => a.state === 'TX'));
        const codes = result.items.map((a) => a.iata.value);
        assert.deepEqual(codes, [...codes].sort());
      });

      it('should match city case-insensitively and partially', async () => {
        const result = await repos.airports.search({ city: 'housTON', pagination: page(100) });
        const codes = result.items.map((a) => a.iata.value);
        assert.ok(codes.includes('HOU') && codes.includes('IAH'));
      });

      it('should match free text against the IATA code', async () => {
        const result = await repos.airports.search({ text: 'jfk', pagination: page(100) });
        assert.ok(result.items.some((a) => a.iata.value === 'JFK'));
      });

      it('should treat LIKE wildcards in the text literally', async () => {
        const result = await repos.airports.search({ text: '%', pagination: page(10) });
        assert.equal(result.total, 0);
      });

      it('should paginate keeping the total stable', async () => {
        const first = await repos.airports.search({ state: 'TX', pagination: page(1, 0) });
        const second = await repos.airports.search({ state: 'TX', pagination: page(1, 1) });
        const beyond = await repos.airports.search({ state: 'TX', pagination: page(1, 100_000) });
        assert.equal(first.items.length, 1);
        assert.notEqual(first.items[0]?.iata.value, second.items[0]?.iata.value);
        assert.equal(first.total, second.total);
        assert.equal(beyond.items.length, 0);
        assert.equal(beyond.total, first.total);
      });
    });

    describe('CarrierRepository', () => {
      it('should find a carrier by code', async () => {
        const carrier = await repos.carriers.findByCode(CarrierCode.of('AA'));
        assert.equal(carrier?.name, 'American Airlines Inc.');
      });

      it('should return only existing carriers when finding many codes', async () => {
        const codes = ['AA', 'DL', 'ZZ'].map((c) => CarrierCode.of(c));
        const found = await repos.carriers.findByCodes(codes);
        assert.deepEqual(found.map((c) => c.code.value).sort(), ['AA', 'DL']);
      });

      it('should return an empty list when no codes are given', async () => {
        assert.deepEqual(await repos.carriers.findByCodes([]), []);
      });

      it('should search carriers by name', async () => {
        const result = await repos.carriers.search({ text: 'delta', pagination: page(50) });
        assert.ok(result.items.some((c) => c.code.value === 'DL'));
      });
    });

    describe('FlightRepository', () => {
      it('should return only flown flights at or above the delay', async () => {
        const result = await repos.flights.findDelayed({
          minDelayMinutes: 30,
          pagination: page(100),
        });
        assert.ok(result.items.length > 0);
        for (const flight of result.items) {
          assert.ok(flight.arrivalDelay.isAtLeast(30), `flight ${flight.id} below 30 min`);
          assert.equal(flight.cancelled, false);
          assert.equal(flight.diverted, false);
        }
      });

      it('should order delayed flights from worst to least delayed', async () => {
        const result = await repos.flights.findDelayed({
          minDelayMinutes: 15,
          pagination: page(50),
        });
        const delays = result.items.map((f) => f.arrivalDelay.minutes ?? 0);
        assert.deepEqual(
          delays,
          [...delays].sort((a, b) => b - a),
        );
      });

      it('should apply the origin filter', async () => {
        const result = await repos.flights.findDelayed({
          minDelayMinutes: 15,
          origin: iata('ORD'),
          pagination: page(100),
        });
        assert.ok(result.items.every((f) => f.origin.value === 'ORD'));
      });

      it('should return nothing when the minimum delay is unreachable', async () => {
        const result = await repos.flights.findDelayed({
          minDelayMinutes: 30_000,
          pagination: page(10),
        });
        assert.equal(result.total, 0);
        assert.deepEqual(result.items, []);
      });

      it('should count delayed departures consistently with findDelayed', async () => {
        const stats = await repos.flights.statsForAirport(iata('ORD'), 'DEPARTURES', policy);
        const delayed = await repos.flights.findDelayed({
          minDelayMinutes: policy.thresholdMinutes,
          origin: iata('ORD'),
          pagination: page(1),
        });
        assert.ok(stats.total > 0);
        assert.equal(stats.delayed, delayed.total);
        assert.ok(stats.delayed + stats.cancelled + stats.diverted <= stats.total);
      });

      it('should return zeroed stats for an airport without flights', async () => {
        const stats = await repos.flights.statsForAirport(iata('ZZZZ'), 'ARRIVALS', policy);
        assert.deepEqual(stats, {
          total: 0,
          delayed: 0,
          cancelled: 0,
          diverted: 0,
          avgArrivalDelayMinutes: null,
        });
      });

      it('should exclude carriers below the minimum number of flights', async () => {
        const all = await repos.flights.statsByCarrier({ minFlights: 1 }, policy);
        const busy = await repos.flights.statsByCarrier({ minFlights: 20 }, policy);
        assert.ok(all.length >= busy.length);
        assert.ok(busy.every((c) => c.stats.total >= 20));
      });

      it('should restrict carrier stats to the requested year', async () => {
        const allYears = await repos.flights.statsByCarrier({ minFlights: 1 }, policy);
        const oneYear = await repos.flights.statsByCarrier({ minFlights: 1, year: 2005 }, policy);
        const sum = (rows: typeof allYears) => rows.reduce((acc, r) => acc + r.stats.total, 0);
        assert.ok(sum(oneYear) > 0);
        assert.ok(sum(oneYear) < sum(allYears));
      });
    });
  });
}
