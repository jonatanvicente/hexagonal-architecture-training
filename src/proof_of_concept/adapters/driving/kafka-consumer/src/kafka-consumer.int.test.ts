// INTEGRATION (driving adapter + message broker) – a real (in-process) broker delivers messages
// to the consumer; the driving port is a stub. Verifies contract translation, DLQ routing and
// retryability classification.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  NotFoundError,
  type ProcessFlightStatusCommand,
  type ProcessFlightStatusUseCase,
} from '@usflights/application';
import { RecordingLogger, waitFor } from '@usflights/application/testing';
import { InProcessKafkaBroker } from '@usflights/fake-kafka';
import {
  FLIGHT_STATUS_DLQ_TOPIC,
  FLIGHT_STATUS_TOPIC,
  FlightStatusKafkaConsumer,
  type FlightStatusMessage,
} from './index.ts';

const validMessage: FlightStatusMessage = {
  airline: 'DL',
  flight: '1234',
  from: 'ATL',
  to: 'JFK',
  schedArr: '2026-01-01T10:00:00.000Z',
  actualArr: '2026-01-01T11:00:00.000Z',
  delayReasons: ['WEATHER'],
};

function setup(behaviour: (c: ProcessFlightStatusCommand) => Promise<void> = async () => {}) {
  const logger = new RecordingLogger();
  const broker = new InProcessKafkaBroker(logger);
  const commands: ProcessFlightStatusCommand[] = [];
  const useCase: ProcessFlightStatusUseCase = {
    execute: async (command) => {
      commands.push(command);
      await behaviour(command);
      return { status: 'DELAYED', delayMinutes: 60, thresholdMinutes: 15, eventId: 'e' };
    },
  };
  const consumer = new FlightStatusKafkaConsumer(broker, useCase, logger);
  consumer.start();
  const dlq = () => broker.readTopic(FLIGHT_STATUS_DLQ_TOPIC);
  const send = (value: string) => broker.produce(FLIGHT_STATUS_TOPIC, { key: 'k', value });
  return { broker, consumer, commands, dlq, send, logger };
}

describe('FlightStatusKafkaConsumer', () => {
  it('should translate the external message contract into the application command', async () => {
    const { send, commands } = setup();
    await send(JSON.stringify(validMessage));
    await waitFor(() => commands.length === 1);

    assert.deepEqual(commands[0], {
      carrier: 'DL',
      flightNumber: '1234',
      origin: 'ATL',
      destination: 'JFK',
      scheduledArrival: '2026-01-01T10:00:00.000Z',
      actualArrival: '2026-01-01T11:00:00.000Z',
      causes: ['WEATHER'],
    });
  });

  it('should dead-letter malformed JSON without calling the use case', async () => {
    const { send, dlq, commands } = setup();
    await send('{not json');
    await waitFor(() => dlq().length === 1);

    assert.equal(commands.length, 0);
    assert.equal(dlq()[0]?.headers['x-retryable'], 'false');
    assert.equal(dlq()[0]?.value, '{not json', 'original payload preserved');
  });

  it('should reject messages missing required fields', async () => {
    const { send, dlq } = setup();
    const { from: _omitted, ...incomplete } = validMessage;
    await send(JSON.stringify(incomplete));
    await waitFor(() => dlq().length === 1);
    assert.match(dlq()[0]?.headers['x-error'] ?? '', /'from' is required/);
  });

  it('should send domain errors to the DLQ as non-retryable', async () => {
    const { send, dlq } = setup(async () => {
      throw new NotFoundError('Airport', 'ZZZ');
    });
    await send(JSON.stringify(validMessage));
    await waitFor(() => dlq().length === 1);
    assert.equal(dlq()[0]?.headers['x-retryable'], 'false');
    assert.equal(dlq()[0]?.headers['x-error'], "Airport 'ZZZ' not found");
  });

  it('should flag infrastructure errors as retryable', async () => {
    const { send, dlq } = setup(async () => {
      throw new Error('connection reset');
    });
    await send(JSON.stringify(validMessage));
    await waitFor(() => dlq().length === 1);
    assert.equal(dlq()[0]?.headers['x-retryable'], 'true');
  });

  it('should stop consuming after stop()', async () => {
    const { send, consumer, commands } = setup();
    consumer.stop();
    await send(JSON.stringify(validMessage));
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(commands.length, 0);
  });
});
