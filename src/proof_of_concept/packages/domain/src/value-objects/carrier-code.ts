// HEXAGON: inside – domain value object
import { ValidationError } from '../errors.ts';

// Carrier codes are 2–3 chars; the dataset also contains historical duplicates such as "PA (1)".
const CARRIER_PATTERN = /^[A-Z0-9]{2,3}( \(\d+\))?$/;

export class CarrierCode {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static of(raw: string): CarrierCode {
    const value = raw.trim().toUpperCase();
    if (!CARRIER_PATTERN.test(value)) {
      throw new ValidationError(`Invalid carrier code '${raw}'`);
    }
    return new CarrierCode(value);
  }

  equals(other: CarrierCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
