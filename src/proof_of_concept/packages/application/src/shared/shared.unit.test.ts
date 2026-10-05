// UNIT – application helpers shared by all use cases (input parsing, pagination, views).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DelayPolicy, PunctualityReport, ValidationError } from '@usflights/domain';
import { aFlight } from '../testing/builders.ts';
import { toFlightView, toPunctualityView } from '../views.ts';
import {
  optionalCarrier,
  optionalIata,
  optionalText,
  optionalUsState,
  optionalYear,
  parseInstant,
} from './input-parsing.ts';
import { mapPage, toPagination } from './pagination.ts';

describe('toPagination', () => {
  it('should default to limit 20 and offset 0', () => {
    assert.deepEqual(toPagination(), { limit: 20, offset: 0 });
  });

  for (const [limit, offset] of [
    [0, 0],
    [101, 0],
    [1.5, 0],
    [10, -1],
  ] as const) {
    it(`should reject limit=${limit} offset=${offset}`, () => {
      assert.throws(() => toPagination(limit, offset), ValidationError);
    });
  }

  it('should map page items without touching the metadata', () => {
    const page = mapPage({ items: [1, 2], total: 9, limit: 2, offset: 4 }, (n) => n * 10);
    assert.deepEqual(page, { items: [10, 20], total: 9, limit: 2, offset: 4 });
  });
});

describe('input parsing', () => {
  it('should treat empty strings as "not provided"', () => {
    assert.equal(optionalIata(''), undefined);
    assert.equal(optionalCarrier(''), undefined);
    assert.equal(optionalUsState(''), undefined);
    assert.equal(optionalText('   ', 'q'), undefined);
  });

  it('should limit free-text length', () => {
    assert.throws(() => optionalText('x'.repeat(81), 'q'), ValidationError);
  });

  it('should validate US state codes', () => {
    assert.equal(optionalUsState('ca'), 'CA');
    assert.throws(() => optionalUsState('CAL'), ValidationError);
  });

  it('should validate years', () => {
    assert.equal(optionalYear(2005), 2005);
    assert.throws(() => optionalYear(1850), ValidationError);
  });

  it('should parse ISO instants and reject garbage', () => {
    assert.equal(
      parseInstant('2026-01-01T00:00:00Z', 'f').toISOString(),
      '2026-01-01T00:00:00.000Z',
    );
    assert.throws(() => parseInstant('nope', 'f'), ValidationError);
  });
});

describe('views', () => {
  it('should format hhmm times and keep nulls', () => {
    const view = toFlightView(aFlight(), new DelayPolicy());
    assert.equal(view.scheduledDeparture, '09:00');
    assert.equal(view.scheduledArrival, '12:05');
    assert.equal(view.tailNumber, null);
  });

  it('should express on-time rate as a percentage with two decimals', () => {
    const report = PunctualityReport.from({
      total: 3,
      delayed: 1,
      cancelled: 0,
      diverted: 0,
      avgArrivalDelayMinutes: null,
    });
    assert.equal(toPunctualityView(report).onTimePercentage, 66.67);
  });
});
