// HEXAGON: boundary – DRIVING (primary / inbound) port – a COMMAND
// Called by: adapters/driving/kafka-consumer (an asynchronous driving adapter).
// Nothing here mentions Kafka: the same use case could be driven by HTTP, a cron job or a test.

export interface ProcessFlightStatusCommand {
  readonly carrier: string;
  readonly flightNumber: string;
  readonly origin: string;
  readonly destination: string;
  /** ISO-8601 date-times */
  readonly scheduledArrival: string;
  readonly actualArrival: string;
  /** Optional causes reported by the airline: CARRIER, WEATHER, NAS, SECURITY, LATE_AIRCRAFT. */
  readonly causes?: readonly string[] | undefined;
}

export interface ProcessFlightStatusResult {
  readonly status: 'DELAYED' | 'ON_TIME';
  readonly delayMinutes: number;
  readonly thresholdMinutes: number;
  /** Present when a FlightDelayDetected event was published. */
  readonly eventId: string | null;
}

export interface ProcessFlightStatusUseCase {
  execute(command: ProcessFlightStatusCommand): Promise<ProcessFlightStatusResult>;
}
