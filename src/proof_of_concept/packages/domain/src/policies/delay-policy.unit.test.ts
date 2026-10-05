// UNIT – the single business rule that defines "delayed".
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationError } from '../errors.ts';
import { Delay } from '../value-objects/delay.ts';
import { DelayPolicy, FAA_DELAY_THRESHOLD_MINUTES } from './delay-policy.ts';

describe('DelayPolicy', () => {
  it('should default to the FAA threshold of 15 minutes', () => {
    assert.equal(FAA_DELAY_THRESHOLD_MINUTES, 15);
    assert.equal(new DelayPolicy().thresholdMinutes, 15);
  });

  it('should consider a flight exactly at the threshold as delayed (boundary)', () => {
    const policy = new DelayPolicy(15);
    assert.equal(policy.isDelayed(Delay.ofMinutes(15)), true);
    assert.equal(policy.isDelayed(Delay.ofMinutes(14)), false);
  });

  it('should not consider early or unknown arrivals as delayed', () => {
    const policy = new DelayPolicy();
    assert.equal(policy.isDelayed(Delay.ofMinutes(-20)), false);
    assert.equal(policy.isDelayed(Delay.unknown()), false);
  });

  it('should honour a custom threshold', () => {
    const policy = new DelayPolicy(60);
    assert.equal(policy.isDelayed(Delay.ofMinutes(59)), false);
    assert.equal(policy.isDelayed(Delay.ofMinutes(60)), true);
  });

  for (const invalid of [0, -5, 1.5, Number.NaN]) {
    it(`should reject threshold ${invalid}`, () => {
      assert.throws(() => new DelayPolicy(invalid), ValidationError);
    });
  }
});
