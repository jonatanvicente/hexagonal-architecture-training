// INTEGRATION – the composition root. Wires the REAL hexagon with the REAL (simulated) driven
// adapters (in-memory DB, fake Redis, fake Kafka, fake notifier) and drives it through the ports.
// Catches wiring mistakes that unit tests with doubles cannot see.
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { loadConfig } from './config.ts';
import { createContainer, type Container } from './container.ts';

describe('createContainer (in-memory wiring)', () => {
  let container: Container;

  before(async () => {
    container = await createContainer(loadConfig({ PERSISTENCE: 'memory', LOG_LEVEL: 'silent' }));
  });

  after(async () => {
    await container.dispose();
  });

  it('should expose every driving port', () => {
    assert.deepEqual(Object.keys(container.ports).sort(), [
      'findDelayedFlights',
      'getAirport',
      'getAirportDelayStats',
      'getCarrierPunctualityRanking',
      'listAirports',
      'listCarriers',
      'processFlightStatus',
    ]);
  });

  it('should answer queries through the in-memory driven adapter', async () => {
    const page = await container.ports.listAirports.execute({ state: 'TX' });
    assert.deepEqual(
      page.items.map((a) => a.iata),
      ['DFW', 'HOU', 'IAH'],
    );
  });

  it('should run the event-driven command across all simulated driven adapters', async () => {
    const result = await container.ports.processFlightStatus.execute({
      carrier: 'DL',
      flightNumber: '42',
      origin: 'ATL',
      destination: 'JFK',
      scheduledArrival: '2026-01-01T10:00:00Z',
      actualArrival: '2026-01-01T10:50:00Z',
    });

    assert.equal(result.status, 'DELAYED');
    const [message] = container.broker.readTopic('flight-delays');
    assert.equal(JSON.parse(message?.value ?? '{}').eventId, result.eventId);
  });
});
