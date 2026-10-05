// END-TO-END – runs the real CLI process and checks stdout/stderr/exit code, as a user or a
// shell script would observe it.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const MAIN = fileURLToPath(new URL('./main.ts', import.meta.url));

function cli(args: string[], env: Record<string, string | undefined> = { PERSISTENCE: 'memory' }) {
  const { PGPASSWORD: _ignored, ...baseEnv } = process.env;
  const result = spawnSync(process.execPath, [MAIN, ...args], {
    env: { ...baseEnv, LOG_LEVEL: 'silent', ...env },
    encoding: 'utf8',
    timeout: 15_000,
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('CLI end-to-end (in-memory persistence)', () => {
  it('should print an airport as JSON and exit 0', () => {
    const { code, stdout } = cli(['airport', 'JFK', '--json']);
    assert.equal(code, 0);
    assert.equal(JSON.parse(stdout).iata, 'JFK');
  });

  it('should print a delayed-flights table', () => {
    const { code, stdout, stderr } = cli(['delayed', '--min', '60', '--limit', '3']);
    assert.equal(code, 0);
    assert.match(stdout, /^date\s+flight\s+route\s+arrDelay/);
    assert.match(stderr, /3 of \d+ delayed flights/);
  });

  it('should exit 3 for an unknown airport', () => {
    const { code, stderr } = cli(['airport', 'ZZZ']);
    assert.equal(code, 3);
    assert.match(stderr, /not found/);
  });

  it('should exit 2 and print usage without a command', () => {
    const { code, stdout } = cli([]);
    assert.equal(code, 2);
    assert.match(stdout, /^Usage:/);
  });

  it('should fail fast with a clear message when PostgreSQL is selected without a password', () => {
    const { code, stderr } = cli(['airports'], { PERSISTENCE: 'postgres' });
    assert.equal(code, 1);
    assert.match(stderr, /Missing environment variable PGPASSWORD/);
  });
});
