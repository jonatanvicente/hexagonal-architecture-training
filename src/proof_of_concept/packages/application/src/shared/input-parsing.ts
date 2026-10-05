// HEXAGON: inside – application
// Driving adapters hand over primitives; use cases turn them into value objects here,
// so every driving adapter (HTTP, CLI, Kafka) gets the same validation for free.
import { CarrierCode, IataCode, ValidationError } from '@usflights/domain';

export function optionalIata(raw: string | undefined): IataCode | undefined {
  return raw === undefined || raw === '' ? undefined : IataCode.of(raw);
}

export function optionalCarrier(raw: string | undefined): CarrierCode | undefined {
  return raw === undefined || raw === '' ? undefined : CarrierCode.of(raw);
}

export function optionalYear(raw: number | undefined): number | undefined {
  if (raw === undefined) return undefined;
  if (!Number.isInteger(raw) || raw < 1900 || raw > 2100) {
    throw new ValidationError(`Invalid year '${raw}'`);
  }
  return raw;
}

export function optionalText(
  raw: string | undefined,
  field: string,
  maxLength = 80,
): string | undefined {
  if (raw === undefined) return undefined;
  const value = raw.trim();
  if (value.length === 0) return undefined;
  if (value.length > maxLength) {
    throw new ValidationError(`${field} must be at most ${maxLength} characters`);
  }
  return value;
}

export function optionalUsState(raw: string | undefined): string | undefined {
  if (raw === undefined || raw === '') return undefined;
  const value = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) {
    throw new ValidationError(`Invalid US state code '${raw}' (expected 2 letters, e.g. TX)`);
  }
  return value;
}

export function parseInstant(raw: string, field: string): Date {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be an ISO-8601 date-time`);
  }
  return date;
}
