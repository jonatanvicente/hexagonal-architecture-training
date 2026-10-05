// INTEGRATION (driven adapter) – CachePort implementation. Time is controlled through the
// ClockPort, so TTL behaviour is tested deterministically without sleeping.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FixedClock, RecordingLogger } from '@usflights/application/testing';
import { SimulatedRedisCache } from './index.ts';

const setup = (ttl = 60) => {
  const clock = new FixedClock();
  const logger = new RecordingLogger();
  return { clock, logger, cache: new SimulatedRedisCache(logger, clock, ttl) };
};

describe('SimulatedRedisCache', () => {
  it('should return undefined on a miss', async () => {
    assert.equal(await setup().cache.get('nope'), undefined);
  });

  it('should round-trip JSON values', async () => {
    const { cache } = setup();
    await cache.set('k', { a: 1, nested: [1, 2] });
    assert.deepEqual(await cache.get('k'), { a: 1, nested: [1, 2] });
  });

  it('should store a serialized copy, isolating callers from later mutations', async () => {
    const { cache } = setup();
    const value = { count: 1 };
    await cache.set('k', value);
    value.count = 99;
    assert.deepEqual(await cache.get('k'), { count: 1 });
  });

  it('should expire entries after the default TTL', async () => {
    const { cache, clock } = setup(60);
    await cache.set('k', 'v');
    clock.advanceSeconds(59);
    assert.equal(await cache.get('k'), 'v');
    clock.advanceSeconds(1);
    assert.equal(await cache.get('k'), undefined);
  });

  it('should honour a per-entry TTL', async () => {
    const { cache, clock } = setup(60);
    await cache.set('short', 'v', 5);
    clock.advanceSeconds(5);
    assert.equal(await cache.get('short'), undefined);
  });

  it('should log hits so the demo can show the cache working', async () => {
    const { cache, logger } = setup();
    await cache.set('k', 'v');
    await cache.get('k');
    assert.ok(logger.entries.some((e) => e.message === '[SIMULATED REDIS] GET hit'));
  });
});
