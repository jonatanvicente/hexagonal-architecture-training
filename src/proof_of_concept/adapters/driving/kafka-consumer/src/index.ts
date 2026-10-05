// HEXAGON: outside – DRIVING adapter (asynchronous / message-driven)
//
// Same role as an HTTP controller, different trigger: a message arrives instead of a request.
//   1. deserialize + validate the EXTERNAL message contract (owned by the airline feed, not by us)
//   2. translate it into the application's command (anti-corruption)
//   3. call the driving port
//   4. map failures to messaging semantics (dead-letter queue) instead of HTTP status codes
import {
  DomainError,
  type LoggerPort,
  type ProcessFlightStatusCommand,
  type ProcessFlightStatusUseCase,
} from '@usflights/application';
import type { InProcessKafkaBroker, KafkaMessage } from '@usflights/fake-kafka';

export const FLIGHT_STATUS_TOPIC = 'flight-status';
export const FLIGHT_STATUS_DLQ_TOPIC = 'flight-status.dlq';
const CONSUMER_GROUP = 'usflights-delay-detector';

/** External contract published by the (simulated) airline operations feed. */
export interface FlightStatusMessage {
  airline: string;
  flight: string;
  from: string;
  to: string;
  schedArr: string;
  actualArr: string;
  delayReasons?: string[];
}

export class FlightStatusKafkaConsumer {
  private readonly broker: InProcessKafkaBroker;
  private readonly useCase: ProcessFlightStatusUseCase;
  private readonly logger: LoggerPort;
  private unsubscribe: (() => void) | null = null;

  constructor(
    broker: InProcessKafkaBroker,
    useCase: ProcessFlightStatusUseCase,
    logger: LoggerPort,
  ) {
    this.broker = broker;
    this.useCase = useCase;
    this.logger = logger;
  }

  start(): void {
    this.unsubscribe = this.broker.subscribe(FLIGHT_STATUS_TOPIC, CONSUMER_GROUP, (message) =>
      this.handle(message),
    );
    this.logger.info(
      { topic: FLIGHT_STATUS_TOPIC, group: CONSUMER_GROUP },
      '[KAFKA CONSUMER] started',
    );
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private async handle(message: KafkaMessage): Promise<void> {
    const meta = { topic: message.topic, offset: message.offset, key: message.key };
    this.logger.info(meta, '[KAFKA CONSUMER] message received');

    try {
      const command = toCommand(parseMessage(message.value));
      const result = await this.useCase.execute(command);
      this.logger.info({ ...meta, result }, '[KAFKA CONSUMER] message processed, offset committed');
    } catch (error) {
      // Business/validation errors are not retryable: park the message in the DLQ.
      // Infrastructure errors would normally be retried; for the PoC they go to the DLQ as well.
      const retryable = !(error instanceof DomainError || error instanceof MalformedMessageError);
      const reason = error instanceof Error ? error.message : String(error);
      await this.broker.produce(FLIGHT_STATUS_DLQ_TOPIC, {
        key: message.key,
        value: message.value,
        headers: {
          'x-error': reason,
          'x-retryable': String(retryable),
          'x-source-offset': String(message.offset),
        },
      });
      this.logger.warn({ ...meta, reason, retryable }, '[KAFKA CONSUMER] message sent to DLQ');
    }
  }
}

class MalformedMessageError extends Error {}

function parseMessage(raw: string): FlightStatusMessage {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new MalformedMessageError('Message value is not valid JSON');
  }
  if (typeof data !== 'object' || data === null) {
    throw new MalformedMessageError('Message value must be a JSON object');
  }
  const record = data as Record<string, unknown>;
  for (const field of ['airline', 'flight', 'from', 'to', 'schedArr', 'actualArr'] as const) {
    if (typeof record[field] !== 'string') {
      throw new MalformedMessageError(`Field '${field}' is required and must be a string`);
    }
  }
  const reasons = record['delayReasons'];
  if (
    reasons !== undefined &&
    !(Array.isArray(reasons) && reasons.every((r) => typeof r === 'string'))
  ) {
    throw new MalformedMessageError("Field 'delayReasons' must be an array of strings");
  }
  return data as FlightStatusMessage;
}

/** External vocabulary → application vocabulary. */
function toCommand(message: FlightStatusMessage): ProcessFlightStatusCommand {
  return {
    carrier: message.airline,
    flightNumber: message.flight,
    origin: message.from,
    destination: message.to,
    scheduledArrival: message.schedArr,
    actualArrival: message.actualArr,
    causes: message.delayReasons,
  };
}
