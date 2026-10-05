// UNIT – the event-driven command use case. Every outbound port is a recording double, so the
// test asserts exactly what crosses the hexagon boundary (events published, notifications sent).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DelayPolicy,
  NotFoundError,
  ValidationError,
  type FlightDelayDetected,
} from '@usflights/domain';
import type { ProcessFlightStatusCommand } from '../ports/in/process-flight-status.port.ts';
import {
  aCarrier,
  anAirport,
  FixedClock,
  RecordingEventPublisher,
  RecordingLogger,
  RecordingNotifier,
  StubAirportRepository,
  StubCarrierRepository,
} from '../testing/index.ts';
import { ProcessFlightStatusService } from './process-flight-status.service.ts';

function setup() {
  const publisher = new RecordingEventPublisher();
  const notifier = new RecordingNotifier();
  const service = new ProcessFlightStatusService({
    airports: new StubAirportRepository([
      anAirport({ iata: 'ATL', name: 'Atlanta Intl' }),
      anAirport({ iata: 'JFK', name: 'John F Kennedy Intl' }),
    ]),
    carriers: new StubCarrierRepository([aCarrier('DL', 'Delta Air Lines Inc.')]),
    publisher,
    notifier,
    clock: new FixedClock('2026-03-01T08:00:00.000Z'),
    logger: new RecordingLogger(),
    policy: new DelayPolicy(15),
    opsRecipients: ['ops@example.test', '+1-555-0100'],
  });
  return { service, publisher, notifier };
}

function command(delayMinutes: number, overrides: Partial<ProcessFlightStatusCommand> = {}) {
  const scheduled = new Date('2026-03-01T07:00:00.000Z');
  return {
    carrier: 'dl',
    flightNumber: '1234',
    origin: 'atl',
    destination: 'jfk',
    scheduledArrival: scheduled.toISOString(),
    actualArrival: new Date(scheduled.getTime() + delayMinutes * 60_000).toISOString(),
    ...overrides,
  };
}

describe('ProcessFlightStatusService', () => {
  it('should publish FlightDelayDetected when the flight is delayed', async () => {
    const { service, publisher } = setup();
    const result = await service.execute(command(72, { causes: ['weather'] }));

    assert.equal(result.status, 'DELAYED');
    assert.equal(result.delayMinutes, 72);
    assert.equal(publisher.published.length, 1);

    const event = publisher.published[0] as FlightDelayDetected;
    assert.equal(event.eventId, result.eventId);
    assert.deepEqual(
      { ...event, eventId: '<uuid>' },
      {
        type: 'FlightDelayDetected',
        eventId: '<uuid>',
        occurredAt: '2026-03-01T08:00:00.000Z',
        carrier: 'DL',
        flightNumber: '1234',
        origin: 'ATL',
        destination: 'JFK',
        scheduledArrival: '2026-03-01T07:00:00.000Z',
        actualArrival: '2026-03-01T08:12:00.000Z',
        delayMinutes: 72,
        thresholdMinutes: 15,
        causes: ['WEATHER'],
      },
    );
  });

  it('should notify every ops recipient on the right channel', async () => {
    const { service, notifier } = setup();
    await service.execute(command(30));

    assert.deepEqual(
      notifier.sent.map((n) => [n.channel, n.recipient]),
      [
        ['EMAIL', 'ops@example.test'],
        ['SMS', '+1-555-0100'],
      ],
    );
    assert.match(notifier.sent[0]?.body ?? '', /Delta Air Lines Inc\. flight 1234 .* 30 min late/);
  });

  it('should treat a delay exactly at the threshold as delayed (boundary)', async () => {
    const { service } = setup();
    assert.equal((await service.execute(command(15))).status, 'DELAYED');
  });

  it('should publish and notify nothing when the flight is on time', async () => {
    const { service, publisher, notifier } = setup();
    const result = await service.execute(command(14));

    assert.deepEqual(result, {
      status: 'ON_TIME',
      delayMinutes: 14,
      thresholdMinutes: 15,
      eventId: null,
    });
    assert.equal(publisher.published.length, 0);
    assert.equal(notifier.sent.length, 0);
  });

  it('should reject unknown airports with NotFoundError and publish nothing', async () => {
    const { service, publisher } = setup();
    await assert.rejects(service.execute(command(60, { origin: 'ZZZ' })), NotFoundError);
    assert.equal(publisher.published.length, 0);
  });

  it('should reject unknown carriers with NotFoundError', async () => {
    const { service } = setup();
    await assert.rejects(service.execute(command(60, { carrier: 'ZZ' })), NotFoundError);
  });

  const invalidCases: Array<[string, Partial<ProcessFlightStatusCommand>]> = [
    ['an unknown delay cause', { causes: ['ALIENS'] }],
    ['a non-numeric flight number', { flightNumber: 'DL12' }],
    ['a malformed date', { actualArrival: 'yesterday' }],
    ['a malformed IATA code', { destination: 'J' }],
  ];
  for (const [label, overrides] of invalidCases) {
    it(`should throw ValidationError for ${label}`, async () => {
      const { service, publisher } = setup();
      await assert.rejects(service.execute(command(60, overrides)), ValidationError);
      assert.equal(publisher.published.length, 0);
    });
  }
});
