// HEXAGON: inside – domain event
// Plain, serializable facts. The domain decides *that* something happened;
// a driven adapter (Kafka producer) decides *how* it is transported.
import type { DelayCause } from '../entities/flight.ts';

export interface DomainEvent {
  readonly type: string;
  readonly eventId: string;
  readonly occurredAt: string;
}

export interface FlightDelayDetected extends DomainEvent {
  readonly type: 'FlightDelayDetected';
  readonly carrier: string;
  readonly flightNumber: string;
  readonly origin: string;
  readonly destination: string;
  readonly scheduledArrival: string;
  readonly actualArrival: string;
  readonly delayMinutes: number;
  readonly thresholdMinutes: number;
  readonly causes: readonly DelayCause[];
}
