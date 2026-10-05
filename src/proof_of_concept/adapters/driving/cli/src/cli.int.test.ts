// INTEGRATION (driving adapter) – argv parsing, output formatting and exit codes, with stubbed
// driving ports and a captured IO (no real stdout, no process spawning).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundError, ValidationError } from '@usflights/application';
import {
  EXIT_NOT_FOUND,
  EXIT_OK,
  EXIT_USAGE,
  runCli,
  type CliDrivingPorts,
  type CliIo,
} from './index.ts';

function harness() {
  const out: string[] = [];
  const err: string[] = [];
  const io: CliIo = { out: (t) => out.push(t), err: (t) => err.push(t) };
  const unexpected = { execute: async () => assert.fail('unexpected call') };
  const ports: CliDrivingPorts = {
    listAirports: {
      execute: async (q) => {
        if (q.state === 'Texas') throw new ValidationError('Invalid US state code');
        return {
          items: [
            {
              iata: 'HOU',
              name: 'William P Hobby',
              city: 'Houston',
              state: 'TX',
              country: 'USA',
              latitude: 1,
              longitude: 2,
            },
          ],
          total: 1,
          limit: q.limit ?? 20,
          offset: 0,
        };
      },
    },
    getAirport: {
      execute: async ({ iata }) => {
        throw new NotFoundError('Airport', iata);
      },
    },
    getAirportDelayStats: unexpected,
    findDelayedFlights: unexpected,
    listCarriers: unexpected,
    getCarrierPunctualityRanking: unexpected,
  };
  return { out, err, run: (...argv: string[]) => runCli(argv, ports, io) };
}

describe('CLI adapter', () => {
  it('should print a table and exit 0', async () => {
    const { run, out, err } = harness();
    assert.equal(await run('airports', '--state', 'TX'), EXIT_OK);
    assert.match(out[0] ?? '', /^iata\s+name\s+city\s+state\s+country/);
    assert.match(out[0] ?? '', /HOU\s+William P Hobby/);
    assert.doesNotMatch(out[0] ?? '', /latitude/, 'coordinates hidden in table mode');
    assert.deepEqual(err, ['1 of 1 airports']);
  });

  it('should print machine-readable JSON with --json', async () => {
    const { run, out } = harness();
    await run('airports', '--json');
    assert.equal(JSON.parse(out[0] ?? '').items[0].iata, 'HOU');
  });

  it('should exit 3 when the hexagon reports NotFound', async () => {
    const { run, err } = harness();
    assert.equal(await run('airport', 'ZZZ'), EXIT_NOT_FOUND);
    assert.deepEqual(err, ["Airport 'ZZZ' not found"]);
  });

  it('should exit 2 when the hexagon reports a validation error', async () => {
    assert.equal(await harness().run('airports', '--state', 'Texas'), EXIT_USAGE);
  });

  const usageErrors: Array<[string, string[]]> = [
    ['no command', []],
    ['an unknown command', ['fly']],
    ['an unknown flag', ['airports', '--colour']],
    ['a non-integer number', ['airports', '--limit', 'ten']],
    ['a missing positional argument', ['airport']],
  ];
  for (const [label, argv] of usageErrors) {
    it(`should exit 2 for ${label}`, async () => {
      assert.equal(await harness().run(...argv), EXIT_USAGE);
    });
  }

  it('should print usage and exit 0 with --help', async () => {
    const { run, out } = harness();
    assert.equal(await run('airports', '--help'), EXIT_OK);
    assert.match(out[0] ?? '', /^Usage:/);
  });
});
