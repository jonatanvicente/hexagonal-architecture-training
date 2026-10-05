// INTEGRATION (driven adapter + message broker) – verifies the transport decisions the hexagon
// delegates to this adapter: topic, partition key, headers and serialization.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RecordingLogger } from '@usflights/application/testing';
import type { DomainEvent, FlightDelayDetected } from '@usflights/domain';
import { InProcessKafkaBroker } from '@usflights/fake-kafka';
import { FLIGHT_DELAYS_TOPIC, KafkaEventPublisher } from './index.ts';

const delayEvent: FlightDelayDetected = {
  type: 'FlightDelayDetected',
  eventId: 'evt-1',
  occurredAt: '2026-01-01T00:00:00.000Z',
  carrier: 'DL',
  flightNumber: '1234',
  origin: 'ATL',
  destination: 'JFK',
  scheduledArrival: '2026-01-01T00:00:00.000Z',
  actualArrival: '2026-01-01T01:00:00.000Z',
  delayMinutes: 60,
  thresholdMinutes: 15,
  causes: [],
};

const setup = () => {
  const logger = new RecordingLogger();
  const broker = new InProcessKafkaBroker(logger);
  return { broker, publisher: new KafkaEventPublisher(broker, logger) };
};

describe('KafkaEventPublisher', () => {
  it('should publish FlightDelayDetected to the flight-delays topic as JSON', async () => {
    const { broker, publisher } = setup();
    await publisher.publish(delayEvent);

    const [message] = broker.readTopic(FLIGHT_DELAYS_TOPIC);
    assert.ok(message);
    assert.deepEqual(JSON.parse(message.value), delayEvent);
  });

  it('should key messages by flight so events of one flight keep their order', async () => {
    const { broker, publisher } = setup();
    await publisher.publish(delayEvent);
    assert.equal(broker.readTopic(FLIGHT_DELAYS_TOPIC)[0]?.key, 'DL1234');
  });

  it('should set content-type, event-type and event-id headers', async () => {
    const { broker, publisher } = setup();
    await publisher.publish(delayEvent);
    assert.deepEqual(broker.readTopic(FLIGHT_DELAYS_TOPIC)[0]?.headers, {
      'content-type': 'application/json',
      'event-type': 'FlightDelayDetected',
      'event-id': 'evt-1',
    });
  });

  it('should route unknown event types to the default topic keyed by event id', async () => {
    const { broker, publisher } = setup();
    const other: DomainEvent = { type: 'SomethingElse', eventId: 'evt-2', occurredAt: 'x' };
    await publisher.publish(other);
    assert.equal(broker.readTopic('domain-events')[0]?.key, 'evt-2');
  });
});
