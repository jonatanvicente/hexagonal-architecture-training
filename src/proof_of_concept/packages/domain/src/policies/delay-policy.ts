// HEXAGON: inside – domain policy
// The single place that decides "what is a delayed flight". Adapters (SQL, in-memory filters)
// receive `thresholdMinutes` from here instead of hardcoding their own rule.
import { ValidationError } from '../errors.ts';
import type { Delay } from '../value-objects/delay.ts';

/** FAA definition: a flight is delayed when it arrives 15 minutes or more after schedule. */
export const FAA_DELAY_THRESHOLD_MINUTES = 15;

export class DelayPolicy {
  readonly thresholdMinutes: number;

  constructor(thresholdMinutes: number = FAA_DELAY_THRESHOLD_MINUTES) {
    if (!Number.isInteger(thresholdMinutes) || thresholdMinutes < 1) {
      throw new ValidationError(
        `Delay threshold must be a positive integer, got ${thresholdMinutes}`,
      );
    }
    this.thresholdMinutes = thresholdMinutes;
  }

  isDelayed(arrivalDelay: Delay): boolean {
    return arrivalDelay.isAtLeast(this.thresholdMinutes);
  }
}
