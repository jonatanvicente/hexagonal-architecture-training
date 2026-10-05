// HEXAGON: inside – domain service
// Aggregation (counting rows) is an infrastructure concern and happens in the driven adapter.
// Interpreting those numbers (on-time rate, ranking) is business logic and lives here.

/** Raw counters produced by a repository for a set of flights. */
export interface FlightStatsSnapshot {
  readonly total: number;
  readonly delayed: number;
  readonly cancelled: number;
  readonly diverted: number;
  readonly avgArrivalDelayMinutes: number | null;
}

export class PunctualityReport {
  readonly total: number;
  readonly onTime: number;
  readonly delayed: number;
  readonly cancelled: number;
  readonly diverted: number;
  /** 0..1, or null when there are no flights. */
  readonly onTimeRate: number | null;
  readonly avgArrivalDelayMinutes: number | null;

  private constructor(snapshot: FlightStatsSnapshot) {
    this.total = snapshot.total;
    this.delayed = snapshot.delayed;
    this.cancelled = snapshot.cancelled;
    this.diverted = snapshot.diverted;
    const notOnTime = snapshot.delayed + snapshot.cancelled + snapshot.diverted;
    this.onTime = Math.max(0, snapshot.total - notOnTime);
    this.onTimeRate = snapshot.total === 0 ? null : this.onTime / snapshot.total;
    const avg = snapshot.avgArrivalDelayMinutes;
    this.avgArrivalDelayMinutes = avg === null ? null : Math.round(avg * 10) / 10;
  }

  static from(snapshot: FlightStatsSnapshot): PunctualityReport {
    return new PunctualityReport(snapshot);
  }
}

/**
 * Ranks subjects by on-time rate (desc). Ties are broken by volume (more flights = more reliable
 * statistic), then by key to keep the order deterministic.
 */
export function rankByPunctuality<T extends { key: string; report: PunctualityReport }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => {
    const rateDiff = (b.report.onTimeRate ?? -1) - (a.report.onTimeRate ?? -1);
    if (rateDiff !== 0) return rateDiff;
    const volumeDiff = b.report.total - a.report.total;
    if (volumeDiff !== 0) return volumeDiff;
    return a.key.localeCompare(b.key);
  });
}
