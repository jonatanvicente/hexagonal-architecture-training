// UNIT (driven adapter, no external technology) – runs the shared repository CONTRACT.
// The in-memory adapter has no I/O, so it is as fast as a unit test and always runs.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runRepositoryContract } from '@usflights/application/testing';
import {
  InMemoryAirportRepository,
  InMemoryCarrierRepository,
  InMemoryFlightRepository,
} from './in-memory-repositories.ts';
import { createSeedData } from './seed-data.ts';

runRepositoryContract('in-memory', () => {
  const data = createSeedData();
  return {
    airports: new InMemoryAirportRepository(data),
    carriers: new InMemoryCarrierRepository(data),
    flights: new InMemoryFlightRepository(data),
  };
});

describe('createSeedData', () => {
  it('should be deterministic for the same seed', () => {
    const ids = (seed: number) =>
      createSeedData(50, seed).flights.map((f) => `${f.carrier.value}${f.flightNumber}`);
    assert.deepEqual(ids(7), ids(7));
    assert.notDeepEqual(ids(7), ids(8));
  });

  it('should never generate a flight whose origin equals its destination', () => {
    const { flights } = createSeedData();
    assert.ok(flights.every((f) => !f.origin.equals(f.destination)));
  });
});
