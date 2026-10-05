// INTEGRATION – driven adapter against a REAL PostgreSQL (the `usflights` database).
// Read-only: it never writes, so it is safe against the shared training DB.
// Skipped automatically when PGPASSWORD is not set (e.g. a laptop without the DB).
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { runRepositoryContract } from '@usflights/application/testing';
import { DelayPolicy } from '@usflights/domain';
import type pg from 'pg';
import { AirportPostgresRepository } from './airport.postgres-repository.ts';
import { CarrierPostgresRepository } from './carrier.postgres-repository.ts';
import { FlightPostgresRepository } from './flight.postgres-repository.ts';
import { assertPostgresConnection, createPostgresPool } from './pool.ts';

const skip = process.env['PGPASSWORD'] ? false : 'PGPASSWORD not set – PostgreSQL tests skipped';

function createPool(): pg.Pool {
  return createPostgresPool({
    host: process.env['PGHOST'] ?? 'localhost',
    port: Number(process.env['PGPORT'] ?? 5432),
    database: process.env['PGDATABASE'] ?? 'usflights',
    user: process.env['PGUSER'] ?? 'postgres',
    password: process.env['PGPASSWORD'] ?? '',
    maxConnections: 4,
  });
}

// 1) The same contract the in-memory adapter passes → the two adapters are interchangeable.
runRepositoryContract(
  'postgres',
  async () => {
    const pool = createPool();
    await assertPostgresConnection(pool);
    return {
      airports: new AirportPostgresRepository(pool),
      carriers: new CarrierPostgresRepository(pool),
      flights: new FlightPostgresRepository(pool),
      dispose: () => pool.end(),
    };
  },
  { skip },
);

// 2) PostgreSQL-specific behaviour the contract cannot express.
describe('PostgreSQL adapter specifics', { skip }, () => {
  let pool: pg.Pool;

  before(async () => {
    pool = createPool();
  });

  after(async () => {
    await pool.end();
  });

  it('should count delayed flights exactly like a hand-written SQL query', async () => {
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM flights
       WHERE cancelled IS NOT TRUE AND diverted IS NOT TRUE AND arrdelay >= 15`,
    );
    const page = await new FlightPostgresRepository(pool).findDelayed({
      minDelayMinutes: 15,
      pagination: { limit: 1, offset: 0 },
    });
    assert.equal(page.total, rows[0]?.n);
  });

  it('should be immune to SQL injection through search text', async () => {
    const airports = new AirportPostgresRepository(pool);
    const result = await airports.search({
      text: "x'; DROP TABLE usairports; --",
      pagination: { limit: 5, offset: 0 },
    });
    assert.equal(result.total, 0);
    const { rows } = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM usairports');
    assert.ok((rows[0]?.n ?? 0) > 0, 'table still there');
  });

  it('should map every flight row of the real dataset into a valid domain object', async () => {
    // Guards the anti-corruption layer against the live schema (dayofmonths, boolean causes...).
    const page = await new FlightPostgresRepository(pool).findDelayed({
      minDelayMinutes: -10_000,
      pagination: { limit: 100, offset: 0 },
    });
    assert.equal(page.items.length, 100);
  });

  it('should apply a stricter policy threshold inside SQL', async () => {
    const flights = new FlightPostgresRepository(pool);
    const loose = await flights.statsByCarrier({ minFlights: 1 }, new DelayPolicy(15));
    const strict = await flights.statsByCarrier({ minFlights: 1 }, new DelayPolicy(60));
    const delayed = (rows: typeof loose) => rows.reduce((acc, r) => acc + r.stats.delayed, 0);
    assert.ok(delayed(strict) < delayed(loose));
  });
});
