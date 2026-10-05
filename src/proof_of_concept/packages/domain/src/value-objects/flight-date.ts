// HEXAGON: inside – domain value object
import { ValidationError } from '../errors.ts';

export class FlightDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;

  private constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  static of(year: number, month: number, day: number): FlightDate {
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    if (!valid) {
      throw new ValidationError(`Invalid flight date ${year}-${month}-${day}`);
    }
    return new FlightDate(year, month, day);
  }

  toISODate(): string {
    const mm = String(this.month).padStart(2, '0');
    const dd = String(this.day).padStart(2, '0');
    return `${this.year}-${mm}-${dd}`;
  }
}
