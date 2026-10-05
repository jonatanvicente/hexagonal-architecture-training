// HEXAGON: inside – domain value object
import { ValidationError } from '../errors.ts';

// FAA/IATA location identifiers in the dataset are 3–4 alphanumeric chars (e.g. JFK, 00M, 1G4).
const IATA_PATTERN = /^[A-Z0-9]{3,4}$/;

export class IataCode {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static of(raw: string): IataCode {
    const value = raw.trim().toUpperCase();
    if (!IATA_PATTERN.test(value)) {
      throw new ValidationError(`Invalid IATA code '${raw}'`);
    }
    return new IataCode(value);
  }

  equals(other: IataCode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
