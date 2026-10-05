// HEXAGON: inside – domain entity
import type { DelayPolicy } from '../policies/delay-policy.ts';
import type { CarrierCode } from '../value-objects/carrier-code.ts';
import type { Delay } from '../value-objects/delay.ts';
import type { FlightDate } from '../value-objects/flight-date.ts';
import type { IataCode } from '../value-objects/iata-code.ts';

export const DELAY_CAUSES = ['CARRIER', 'WEATHER', 'NAS', 'SECURITY', 'LATE_AIRCRAFT'] as const;
export type DelayCause = (typeof DELAY_CAUSES)[number];

export type FlightStatus = 'CANCELLED' | 'DIVERTED' | 'DELAYED' | 'ON_TIME';

export interface FlightProps {
  readonly id: number;
  readonly date: FlightDate;
  readonly carrier: CarrierCode;
  readonly flightNumber: string;
  readonly tailNumber: string | null;
  readonly origin: IataCode;
  readonly destination: IataCode;
  /** hhmm local time, as published by BTS (e.g. 1405). */
  readonly scheduledDeparture: number | null;
  readonly actualDeparture: number | null;
  readonly scheduledArrival: number | null;
  readonly actualArrival: number | null;
  readonly departureDelay: Delay;
  readonly arrivalDelay: Delay;
  readonly distanceMiles: number | null;
  readonly cancelled: boolean;
  readonly diverted: boolean;
  readonly delayCauses: readonly DelayCause[];
}

export class Flight {
  readonly id: number;
  readonly date: FlightDate;
  readonly carrier: CarrierCode;
  readonly flightNumber: string;
  readonly tailNumber: string | null;
  readonly origin: IataCode;
  readonly destination: IataCode;
  readonly scheduledDeparture: number | null;
  readonly actualDeparture: number | null;
  readonly scheduledArrival: number | null;
  readonly actualArrival: number | null;
  readonly departureDelay: Delay;
  readonly arrivalDelay: Delay;
  readonly distanceMiles: number | null;
  readonly cancelled: boolean;
  readonly diverted: boolean;
  readonly delayCauses: readonly DelayCause[];

  private constructor(props: FlightProps) {
    this.id = props.id;
    this.date = props.date;
    this.carrier = props.carrier;
    this.flightNumber = props.flightNumber;
    this.tailNumber = props.tailNumber;
    this.origin = props.origin;
    this.destination = props.destination;
    this.scheduledDeparture = props.scheduledDeparture;
    this.actualDeparture = props.actualDeparture;
    this.scheduledArrival = props.scheduledArrival;
    this.actualArrival = props.actualArrival;
    this.departureDelay = props.departureDelay;
    this.arrivalDelay = props.arrivalDelay;
    this.distanceMiles = props.distanceMiles;
    this.cancelled = props.cancelled;
    this.diverted = props.diverted;
    this.delayCauses = props.delayCauses;
  }

  static create(props: FlightProps): Flight {
    return new Flight(props);
  }

  isDelayed(policy: DelayPolicy): boolean {
    return !this.cancelled && !this.diverted && policy.isDelayed(this.arrivalDelay);
  }

  status(policy: DelayPolicy): FlightStatus {
    if (this.cancelled) return 'CANCELLED';
    if (this.diverted) return 'DIVERTED';
    return this.isDelayed(policy) ? 'DELAYED' : 'ON_TIME';
  }
}
