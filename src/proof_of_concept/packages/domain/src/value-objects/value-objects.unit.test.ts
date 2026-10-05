// UNIT – domain value objects. Pure functions of their input: no I/O, no doubles needed.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationError } from '../errors.ts';
import { CarrierCode } from './carrier-code.ts';
import { Delay } from './delay.ts';
import { FlightDate } from './flight-date.ts';
import { IataCode } from './iata-code.ts';

describe('IataCode', () => {
  it('should normalize to trimmed upper case', () => {
    assert.equal(IataCode.of('  jfk ').value, 'JFK');
  });

  it('should accept 3 and 4 character alphanumeric codes', () => {
    assert.equal(IataCode.of('00M').value, '00M');
    assert.equal(IataCode.of('1G4A').value, '1G4A');
  });

  for (const invalid of ['', 'JF', 'JFKXX', 'J-K', "JF'"]) {
    it(`should reject '${invalid}' with a ValidationError`, () => {
      assert.throws(() => IataCode.of(invalid), ValidationError);
    });
  }

  it('should compare by value', () => {
    assert.ok(IataCode.of('lax').equals(IataCode.of('LAX')));
    assert.ok(!IataCode.of('LAX').equals(IataCode.of('SFO')));
  });
});

describe('CarrierCode', () => {
  it('should accept two and three character codes', () => {
    assert.equal(CarrierCode.of('aa').value, 'AA');
    assert.equal(CarrierCode.of('02Q').value, '02Q');
  });

  it('should accept historical duplicate codes such as "PA (1)"', () => {
    assert.equal(CarrierCode.of('PA (1)').value, 'PA (1)');
  });

  it('should reject malformed codes', () => {
    assert.throws(() => CarrierCode.of('A'), ValidationError);
    assert.throws(() => CarrierCode.of('AAAA'), ValidationError);
    assert.throws(() => CarrierCode.of('AA; DROP'), ValidationError);
  });
});

describe('Delay', () => {
  it('should round minutes', () => {
    assert.equal(Delay.ofMinutes(14.6).minutes, 15);
  });

  it('should compute the delay between two instants', () => {
    const delay = Delay.between(new Date('2026-01-01T10:00:00Z'), new Date('2026-01-01T10:42:00Z'));
    assert.equal(delay.minutes, 42);
  });

  it('should represent early arrivals as negative minutes', () => {
    const delay = Delay.between(new Date('2026-01-01T10:00:00Z'), new Date('2026-01-01T09:50:00Z'));
    assert.equal(delay.minutes, -10);
  });

  it('should never be "at least" a threshold when unknown', () => {
    assert.equal(Delay.unknown().isKnown(), false);
    assert.equal(Delay.unknown().isAtLeast(0), false);
  });

  it('should include the threshold itself in isAtLeast', () => {
    assert.equal(Delay.ofMinutes(15).isAtLeast(15), true);
    assert.equal(Delay.ofMinutes(14).isAtLeast(15), false);
  });

  it('should reject non-finite values', () => {
    assert.throws(() => Delay.ofMinutes(Number.NaN), ValidationError);
    assert.throws(() => Delay.ofMinutes(Number.POSITIVE_INFINITY), ValidationError);
  });
});

describe('FlightDate', () => {
  it('should format as ISO date with zero padding', () => {
    assert.equal(FlightDate.of(1990, 7, 3).toISODate(), '1990-07-03');
  });

  it('should accept 29 February in leap years only', () => {
    assert.equal(FlightDate.of(2004, 2, 29).day, 29);
    assert.throws(() => FlightDate.of(2005, 2, 29), ValidationError);
  });

  it('should reject impossible dates instead of rolling them over', () => {
    assert.throws(() => FlightDate.of(2005, 13, 1), ValidationError);
    assert.throws(() => FlightDate.of(2005, 4, 31), ValidationError);
  });
});
