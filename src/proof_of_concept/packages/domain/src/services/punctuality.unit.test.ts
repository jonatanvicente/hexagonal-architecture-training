// UNIT – domain service: interpreting aggregated counters.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PunctualityReport, rankByPunctuality, type FlightStatsSnapshot } from './punctuality.ts';

const snapshot = (overrides: Partial<FlightStatsSnapshot> = {}): FlightStatsSnapshot => ({
  total: 100,
  delayed: 20,
  cancelled: 3,
  diverted: 2,
  avgArrivalDelayMinutes: 7.46,
  ...overrides,
});

describe('PunctualityReport', () => {
  it('should derive on-time flights as total minus delayed, cancelled and diverted', () => {
    const report = PunctualityReport.from(snapshot());
    assert.equal(report.onTime, 75);
    assert.equal(report.onTimeRate, 0.75);
  });

  it('should round the average delay to one decimal', () => {
    assert.equal(PunctualityReport.from(snapshot()).avgArrivalDelayMinutes, 7.5);
  });

  it('should return a null rate when there are no flights (no division by zero)', () => {
    const report = PunctualityReport.from(
      snapshot({ total: 0, delayed: 0, cancelled: 0, diverted: 0, avgArrivalDelayMinutes: null }),
    );
    assert.equal(report.onTimeRate, null);
    assert.equal(report.avgArrivalDelayMinutes, null);
  });

  it('should never report negative on-time flights on inconsistent input', () => {
    assert.equal(PunctualityReport.from(snapshot({ total: 5, delayed: 10 })).onTime, 0);
  });
});

describe('rankByPunctuality', () => {
  const entry = (key: string, s: Partial<FlightStatsSnapshot>) => ({
    key,
    report: PunctualityReport.from(snapshot(s)),
  });

  it('should rank by on-time rate descending', () => {
    const ranked = rankByPunctuality([
      entry('LOW', { delayed: 50 }),
      entry('HIGH', { delayed: 5 }),
      entry('MID', { delayed: 20 }),
    ]);
    assert.deepEqual(
      ranked.map((r) => r.key),
      ['HIGH', 'MID', 'LOW'],
    );
  });

  it('should break ties by volume, then by key', () => {
    const ranked = rankByPunctuality([
      entry('B', { total: 10, delayed: 0, cancelled: 0, diverted: 0 }),
      entry('A', { total: 10, delayed: 0, cancelled: 0, diverted: 0 }),
      entry('BIG', { total: 1000, delayed: 0, cancelled: 0, diverted: 0 }),
    ]);
    assert.deepEqual(
      ranked.map((r) => r.key),
      ['BIG', 'A', 'B'],
    );
  });

  it('should not mutate its input', () => {
    const input = [entry('X', { delayed: 50 }), entry('Y', { delayed: 0 })];
    rankByPunctuality(input);
    assert.deepEqual(
      input.map((r) => r.key),
      ['X', 'Y'],
    );
  });
});
