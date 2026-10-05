// END-TO-END – starts the real API process (`node apps/api/src/main.ts`) and talks to it over
// real HTTP, exactly like a client would. Black box: nothing is imported from the code under test.
//
// Runs on the in-memory adapter by default (hermetic, no DB). A second suite repeats a smoke
// check against PostgreSQL when PGPASSWORD is available.
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const MAIN = fileURLToPath(new URL('./main.ts', import.meta.url));

interface RunningApi {
  readonly baseUrl: string;
  readonly process: ChildProcess;
}

async function startApi(env: Record<string, string>): Promise<RunningApi> {
  const child = spawn(process.execPath, [MAIN], {
    env: { ...process.env, HTTP_HOST: '127.0.0.1', HTTP_PORT: '0', LOG_LEVEL: 'info', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr?.on('data', (chunk) => (stderr += String(chunk)));

  // Port 0 = the OS picks a free port; Fastify logs the address it actually bound.
  const baseUrl = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`API did not start: ${stderr}`)), 10_000);
    child.once('exit', (code) => reject(new Error(`API exited with ${code}: ${stderr}`)));
    createInterface({ input: child.stdout! }).on('line', (line) => {
      const match = /"msg":"Server listening at (http:\/\/[^"]+)"/.exec(line);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  return { baseUrl, process: child };
}

async function stopApi(api: RunningApi | undefined): Promise<number | null> {
  if (!api || api.process.exitCode !== null) return api?.process.exitCode ?? null;
  const exited = once(api.process, 'exit');
  api.process.kill('SIGTERM');
  const [code] = (await exited) as [number | null];
  return code;
}

// E2E tests treat responses as untyped JSON on purpose: they check the wire format, not TS types.
type Json = any;

async function getJson(api: RunningApi, path: string) {
  const res = await fetch(`${api.baseUrl}${path}`);
  const body: Json = await res.json();
  return { status: res.status, type: res.headers.get('content-type'), body };
}

describe('API end-to-end (in-memory persistence)', () => {
  let api: RunningApi;

  before(async () => {
    api = await startApi({ PERSISTENCE: 'memory' });
  });

  after(async () => {
    await stopApi(api);
  });

  it('should report healthy', async () => {
    assert.deepEqual((await getJson(api, '/health')).body, { status: 'ok' });
  });

  it('should list airports filtered by state', async () => {
    const { status, body } = await getJson(api, '/api/v1/airports?state=TX');
    assert.equal(status, 200);
    assert.deepEqual(
      body.items.map((a: { iata: string }) => a.iata),
      ['DFW', 'HOU', 'IAH'],
    );
  });

  it('should return delay statistics for an airport', async () => {
    const { status, body } = await getJson(api, '/api/v1/airports/ORD/delay-stats');
    assert.equal(status, 200);
    assert.equal(body.airport.iata, 'ORD');
    assert.equal(body.delayThresholdMinutes, 15);
    assert.ok(body.departures.totalFlights > 0);
  });

  it('should list delayed flights worst first', async () => {
    const { body } = await getJson(api, '/api/v1/flights/delayed?minDelay=60&limit=5');
    const delays = body.items.map((f: { arrivalDelayMinutes: number }) => f.arrivalDelayMinutes);
    assert.ok(delays.length > 0);
    assert.ok(delays.every((d: number) => d >= 60));
    assert.deepEqual(
      delays,
      [...delays].sort((a: number, b: number) => b - a),
    );
  });

  it('should rank carriers by punctuality', async () => {
    const { body } = await getJson(api, '/api/v1/carriers/punctuality?limit=3');
    assert.deepEqual(
      body.ranking.map((r: { rank: number }) => r.rank),
      [1, 2, 3],
    );
  });

  it('should return problem+json for domain errors', async () => {
    const notFound = await getJson(api, '/api/v1/airports/ZZZ');
    assert.equal(notFound.status, 404);
    assert.match(notFound.type ?? '', /problem\+json/);

    const invalid = await getJson(api, '/api/v1/flights/delayed?minDelay=1');
    assert.equal(invalid.status, 400);
  });

  it('should process a flight-status event and publish FlightDelayDetected', async () => {
    const res = await fetch(`${api.baseUrl}/simulate/flight-status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        airline: 'DL',
        flight: '777',
        from: 'ATL',
        to: 'JFK',
        delayMinutes: 90,
      }),
    });
    assert.equal(res.status, 202);

    // Async: poll the outgoing topic until the consumer → use case → producer chain completes.
    let messages: Array<{ value: { flightNumber: string; delayMinutes: number } }> = [];
    for (let attempt = 0; attempt < 50 && messages.length === 0; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      messages = (await getJson(api, '/simulate/topics/flight-delays')).body.messages;
    }
    assert.equal(messages[0]?.value.flightNumber, '777');
    assert.equal(messages[0]?.value.delayMinutes, 90);
  });

  it('should shut down gracefully on SIGTERM', async () => {
    assert.equal(await stopApi(api), 0);
  });
});

describe(
  'API end-to-end (PostgreSQL persistence)',
  { skip: process.env['PGPASSWORD'] ? false : 'PGPASSWORD not set – skipped' },
  () => {
    let api: RunningApi;

    before(async () => {
      api = await startApi({ PERSISTENCE: 'postgres' });
    });

    after(async () => {
      await stopApi(api);
    });

    it('should serve real data from the usflights database', async () => {
      const { status, body } = await getJson(api, '/api/v1/airports/JFK/delay-stats');
      assert.equal(status, 200);
      assert.equal(body.airport.name, 'John F Kennedy Intl');
      assert.ok(body.departures.totalFlights > 0);
    });
  },
);
