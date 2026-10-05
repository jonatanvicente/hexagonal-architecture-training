// HEXAGON: inside – domain value object
import { ValidationError } from '../errors.ts';

/** A delay in minutes. Negative = early. `null` = unknown (e.g. cancelled flight). */
export class Delay {
  readonly minutes: number | null;

  private constructor(minutes: number | null) {
    this.minutes = minutes;
  }

  static ofMinutes(minutes: number | null): Delay {
    if (minutes !== null && !Number.isFinite(minutes)) {
      throw new ValidationError(`Invalid delay '${minutes}'`);
    }
    return new Delay(minutes === null ? null : Math.round(minutes));
  }

  static between(scheduled: Date, actual: Date): Delay {
    return Delay.ofMinutes((actual.getTime() - scheduled.getTime()) / 60_000);
  }

  static unknown(): Delay {
    return new Delay(null);
  }

  isKnown(): boolean {
    return this.minutes !== null;
  }

  isAtLeast(thresholdMinutes: number): boolean {
    return this.minutes !== null && this.minutes >= thresholdMinutes;
  }
}
