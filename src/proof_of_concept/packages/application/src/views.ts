// HEXAGON: inside – application read models
// Use cases return these plain, serializable views (not entities), so driving adapters
// never depend on domain internals and cannot mutate domain objects.
import type {
  Airport,
  Carrier,
  DelayCause,
  DelayPolicy,
  Flight,
  FlightStatus,
  PunctualityReport,
} from '@usflights/domain';

export interface AirportView {
  readonly iata: string;
  readonly name: string;
  readonly city: string | null;
  readonly state: string | null;
  readonly country: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
}

export interface CarrierView {
  readonly code: string;
  readonly name: string;
}

export interface FlightView {
  readonly id: number;
  readonly date: string;
  readonly carrier: string;
  readonly flightNumber: string;
  readonly tailNumber: string | null;
  readonly origin: string;
  readonly destination: string;
  readonly scheduledDeparture: string | null;
  readonly actualDeparture: string | null;
  readonly scheduledArrival: string | null;
  readonly actualArrival: string | null;
  readonly departureDelayMinutes: number | null;
  readonly arrivalDelayMinutes: number | null;
  readonly distanceMiles: number | null;
  readonly status: FlightStatus;
  readonly delayCauses: readonly DelayCause[];
}

export interface PunctualityView {
  readonly totalFlights: number;
  readonly onTime: number;
  readonly delayed: number;
  readonly cancelled: number;
  readonly diverted: number;
  readonly onTimePercentage: number | null;
  readonly avgArrivalDelayMinutes: number | null;
}

export function toAirportView(airport: Airport): AirportView {
  return {
    iata: airport.iata.value,
    name: airport.name,
    city: airport.city,
    state: airport.state,
    country: airport.country,
    latitude: airport.location?.latitude ?? null,
    longitude: airport.location?.longitude ?? null,
  };
}

export function toCarrierView(carrier: Carrier): CarrierView {
  return { code: carrier.code.value, name: carrier.name };
}

export function toFlightView(flight: Flight, policy: DelayPolicy): FlightView {
  return {
    id: flight.id,
    date: flight.date.toISODate(),
    carrier: flight.carrier.value,
    flightNumber: flight.flightNumber,
    tailNumber: flight.tailNumber,
    origin: flight.origin.value,
    destination: flight.destination.value,
    scheduledDeparture: formatHhmm(flight.scheduledDeparture),
    actualDeparture: formatHhmm(flight.actualDeparture),
    scheduledArrival: formatHhmm(flight.scheduledArrival),
    actualArrival: formatHhmm(flight.actualArrival),
    departureDelayMinutes: flight.departureDelay.minutes,
    arrivalDelayMinutes: flight.arrivalDelay.minutes,
    distanceMiles: flight.distanceMiles,
    status: flight.status(policy),
    delayCauses: flight.delayCauses,
  };
}

export function toPunctualityView(report: PunctualityReport): PunctualityView {
  return {
    totalFlights: report.total,
    onTime: report.onTime,
    delayed: report.delayed,
    cancelled: report.cancelled,
    diverted: report.diverted,
    onTimePercentage:
      report.onTimeRate === null ? null : Math.round(report.onTimeRate * 10_000) / 100,
    avgArrivalDelayMinutes: report.avgArrivalDelayMinutes,
  };
}

/** 1405 -> "14:05" */
function formatHhmm(hhmm: number | null): string | null {
  if (hhmm === null) return null;
  const padded = String(hhmm).padStart(4, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2)}`;
}
