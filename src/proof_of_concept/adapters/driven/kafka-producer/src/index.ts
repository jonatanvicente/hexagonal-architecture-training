// HEXAGON: outside – DRIVEN adapter implementing the EventPublisherPort
// Owns every transport decision the hexagon must not care about:
// topic naming, partition key, headers, serialization format.
import type { EventPublisherPort, LoggerPort } from '@usflights/application';
import type { DomainEvent } from '@usflights/domain';
import type { InProcessKafkaBroker } from '@usflights/fake-kafka';

export const FLIGHT_DELAYS_TOPIC = 'flight-delays';
const DEFAULT_TOPIC = 'domain-events';

const TOPIC_BY_EVENT_TYPE: Readonly<Record<string, string>> = {
  FlightDelayDetected: FLIGHT_DELAYS_TOPIC,
};

export class KafkaEventPublisher implements EventPublisherPort {
  private readonly broker: InProcessKafkaBroker;
  private readonly logger: LoggerPort;

  constructor(broker: InProcessKafkaBroker, logger: LoggerPort) {
    this.broker = broker;
    this.logger = logger;
  }

  async publish(event: DomainEvent): Promise<void> {
    const topic = TOPIC_BY_EVENT_TYPE[event.type] ?? DEFAULT_TOPIC;
    const message = await this.broker.produce(topic, {
      key: partitionKey(event),
      value: JSON.stringify(event),
      headers: {
        'content-type': 'application/json',
        'event-type': event.type,
        'event-id': event.eventId,
      },
    });
    this.logger.info(
      { topic, offset: message.offset, eventType: event.type, eventId: event.eventId },
      '[KAFKA PRODUCER] domain event published',
    );
  }
}

/** Events about the same flight go to the same partition, so they keep their order. */
function partitionKey(event: DomainEvent): string {
  const candidate = event as Partial<Record<'carrier' | 'flightNumber', string>>;
  return candidate.carrier && candidate.flightNumber
    ? `${candidate.carrier}${candidate.flightNumber}`
    : event.eventId;
}
