// UNIT – configuration parsing. The env is passed in as a plain object, so no process state.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfigError, loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('should apply safe defaults', () => {
    const config = loadConfig({ PGPASSWORD: 'secret' });
    assert.equal(config.persistence, 'postgres');
    assert.deepEqual(config.http, { host: '127.0.0.1', port: 3000 });
    assert.equal(config.delayThresholdMinutes, 15);
    assert.equal(config.postgres?.database, 'usflights');
  });

  it('should require PGPASSWORD for the postgres adapter (no default secret)', () => {
    assert.throws(() => loadConfig({}), ConfigError);
  });

  it('should not require database settings for the in-memory adapter', () => {
    const config = loadConfig({ PERSISTENCE: 'memory' });
    assert.equal(config.postgres, null);
  });

  it('should reject unknown persistence and log levels', () => {
    assert.throws(() => loadConfig({ PERSISTENCE: 'mongo' }), /PERSISTENCE must be one of/);
    assert.throws(() => loadConfig({ PERSISTENCE: 'memory', LOG_LEVEL: 'loud' }), ConfigError);
  });

  it('should reject non-integer numbers', () => {
    assert.throws(() => loadConfig({ PERSISTENCE: 'memory', HTTP_PORT: '80a' }), /HTTP_PORT/);
  });

  it('should split and trim OPS_RECIPIENTS, ignoring empty entries', () => {
    const config = loadConfig({ PERSISTENCE: 'memory', OPS_RECIPIENTS: ' a@x.io , ,+1-555 ' });
    assert.deepEqual(config.opsRecipients, ['a@x.io', '+1-555']);
  });
});
