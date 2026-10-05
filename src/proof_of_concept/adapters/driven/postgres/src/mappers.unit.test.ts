// UNIT – the anti-corruption mapping (DB row → domain). No database needed: rows are literals.
// This is where the legacy schema quirks are pinned down.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationError } from '@usflights/domain';
import {
  toAirport,
  toCarrier,
  toFlight,
  toStatsSnapshot,
  type AirportRow,
  type FlightRow,
} from './mappers.ts';

const flightRow = (overrides: Partial<FlightRow> = {}): FlightRow => ({
  flightid: 4001,
  colyear: 1990,
  colmonth: 7,
  dayofmonths: 31,
  deptime: 1405,
  crsdeptime: 1405,
  arrtime: 1440,
  crsarrtime: 1430,
  uniquecarrier: 'CO',
  flightnum: '3006 ',
  tailnum: '  ',
  arrdelay: 10,
  depdelay: 0,
  origin: 'HOU',
  dest: 'IAH',
  distance: 24,
  cancelled: false,
  diverted: false,
  carrierdelay: false,
  weatherdelay: false,
  nasdelay: false,
  securitydelay: false,
  lateaircraftdelay: false,
  ...overrides,
});

describe('toFlight', () => {
  it('should read the day from the misspelled `dayofmonths` column', () => {
    assert.equal(toFlight(flightRow()).date.toISODate(), '1990-07-31');
  });

  it('should turn boolean delay-cause columns into domain causes', () => {
    const flight = toFlight(flightRow({ weatherdelay: true, lateaircraftdelay: true }));
    assert.deepEqual(flight.delayCauses, ['WEATHER', 'LATE_AIRCRAFT']);
  });

  it('should normalize blanks: trimmed flight number, null tail number', () => {
    const flight = toFlight(flightRow());
    assert.equal(flight.flightNumber, '3006');
    assert.equal(flight.tailNumber, null);
  });

  it('should treat NULL booleans as false', () => {
    const flight = toFlight(flightRow({ cancelled: null, diverted: null }));
    assert.equal(flight.cancelled, false);
    assert.equal(flight.diverted, false);
  });

  it('should keep an unknown delay as unknown, not zero', () => {
    assert.equal(toFlight(flightRow({ arrdelay: null })).arrivalDelay.isKnown(), false);
  });

  it('should fail loudly on corrupt data instead of propagating it', () => {
    assert.throws(() => toFlight(flightRow({ dayofmonths: 32 })), ValidationError);
  });
});

describe('toAirport', () => {
  const row: AirportRow = {
    iata: '00M',
    airport: 'Thigpen ',
    city: 'Bay Springs',
    state: 'MS',
    country: 'USA',
    latitude: 31.9538,
    longitude: -89.2345,
  };

  it('should trim padded names', () => {
    assert.equal(toAirport(row).name, 'Thigpen');
  });

  it('should fall back to the IATA code when the name is missing', () => {
    assert.equal(toAirport({ ...row, airport: null }).name, '00M');
  });

  it('should drop partial coordinates', () => {
    assert.equal(toAirport({ ...row, longitude: null }).location, null);
  });
});

describe('toCarrier', () => {
  it('should map code and description', () => {
    const carrier = toCarrier({ carriercode: 'DL', description: 'Delta Air Lines Inc.' });
    assert.equal(carrier.code.value, 'DL');
    assert.equal(carrier.name, 'Delta Air Lines Inc.');
  });
});

describe('toStatsSnapshot', () => {
  it('should return zeroes when the aggregate returned no row', () => {
    assert.deepEqual(toStatsSnapshot(undefined), {
      total: 0,
      delayed: 0,
      cancelled: 0,
      diverted: 0,
      avgArrivalDelayMinutes: null,
    });
  });
});
