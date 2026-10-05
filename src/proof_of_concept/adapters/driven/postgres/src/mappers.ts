// HEXAGON: outside – driven adapter (anti-corruption layer)
// Translates the legacy table layout into domain objects. Schema quirks stay HERE:
//   * `dayofmonths` (sic) instead of DayOfMonth
//   * delay causes stored as boolean flags (carrierdelay, weatherdelay...)
//   * names padded with trailing spaces
import {
  Airport,
  Carrier,
  CarrierCode,
  Delay,
  Flight,
  FlightDate,
  IataCode,
  type DelayCause,
  type FlightStatsSnapshot,
} from '@usflights/domain';

export interface AirportRow {
  iata: string;
  airport: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface CarrierRow {
  carriercode: string;
  description: string | null;
}

export interface FlightRow {
  flightid: number;
  colyear: number;
  colmonth: number;
  dayofmonths: number;
  deptime: number | null;
  crsdeptime: number | null;
  arrtime: number | null;
  crsarrtime: number | null;
  uniquecarrier: string;
  flightnum: string;
  tailnum: string | null;
  arrdelay: number | null;
  depdelay: number | null;
  origin: string;
  dest: string;
  distance: number | null;
  cancelled: boolean | null;
  diverted: boolean | null;
  carrierdelay: boolean | null;
  weatherdelay: boolean | null;
  nasdelay: boolean | null;
  securitydelay: boolean | null;
  lateaircraftdelay: boolean | null;
}

export interface StatsRow {
  total: number;
  delayed: number;
  cancelled: number;
  diverted: number;
  avg_arr_delay: number | null;
}

export const FLIGHT_COLUMNS = `
  f.flightid, f.colyear, f.colmonth, f.dayofmonths,
  f.deptime, f.crsdeptime, f.arrtime, f.crsarrtime,
  f.uniquecarrier, f.flightnum, f.tailnum, f.arrdelay, f.depdelay, f.origin, f.dest, f.distance,
  f.cancelled, f.diverted, f.carrierdelay, f.weatherdelay, f.nasdelay, f.securitydelay,
  f.lateaircraftdelay`;

const CAUSE_FLAGS: ReadonlyArray<readonly [keyof FlightRow, DelayCause]> = [
  ['carrierdelay', 'CARRIER'],
  ['weatherdelay', 'WEATHER'],
  ['nasdelay', 'NAS'],
  ['securitydelay', 'SECURITY'],
  ['lateaircraftdelay', 'LATE_AIRCRAFT'],
];

export function toAirport(row: AirportRow): Airport {
  const location =
    row.latitude !== null && row.longitude !== null
      ? { latitude: row.latitude, longitude: row.longitude }
      : null;
  return Airport.create({
    iata: IataCode.of(row.iata),
    name: blankToNull(row.airport) ?? row.iata,
    city: blankToNull(row.city),
    state: blankToNull(row.state),
    country: blankToNull(row.country) ?? 'USA',
    location,
  });
}

export function toCarrier(row: CarrierRow): Carrier {
  return Carrier.create(CarrierCode.of(row.carriercode), row.description ?? '');
}

export function toFlight(row: FlightRow): Flight {
  return Flight.create({
    id: row.flightid,
    date: FlightDate.of(row.colyear, row.colmonth, row.dayofmonths),
    carrier: CarrierCode.of(row.uniquecarrier),
    flightNumber: row.flightnum.trim(),
    tailNumber: blankToNull(row.tailnum),
    origin: IataCode.of(row.origin),
    destination: IataCode.of(row.dest),
    scheduledDeparture: row.crsdeptime,
    actualDeparture: row.deptime,
    scheduledArrival: row.crsarrtime,
    actualArrival: row.arrtime,
    departureDelay: Delay.ofMinutes(row.depdelay),
    arrivalDelay: Delay.ofMinutes(row.arrdelay),
    distanceMiles: row.distance,
    cancelled: row.cancelled === true,
    diverted: row.diverted === true,
    delayCauses: CAUSE_FLAGS.filter(([column]) => row[column] === true).map(([, cause]) => cause),
  });
}

export function toStatsSnapshot(row: StatsRow | undefined): FlightStatsSnapshot {
  return {
    total: row?.total ?? 0,
    delayed: row?.delayed ?? 0,
    cancelled: row?.cancelled ?? 0,
    diverted: row?.diverted ?? 0,
    avgArrivalDelayMinutes: row?.avg_arr_delay ?? null,
  };
}

function blankToNull(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
