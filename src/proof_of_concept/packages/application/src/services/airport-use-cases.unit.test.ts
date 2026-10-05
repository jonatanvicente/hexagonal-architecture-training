// UNIT – airport use cases, isolated from any infrastructure through driven-port doubles.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DelayPolicy, NotFoundError, ValidationError } from '@usflights/domain';
import {
  anAirport,
  aStatsSnapshot,
  InMemoryCache,
  StubAirportRepository,
  StubFlightRepository,
} from '../testing/index.ts';
import { GetAirportDelayStatsService } from './get-airport-delay-stats.service.ts';
import { GetAirportService } from './get-airport.service.ts';
import { ListAirportsService } from './list-airports.service.ts';

describe('ListAirportsService', () => {
  it('should normalize the query before calling the repository', async () => {
    const airports = new StubAirportRepository([anAirport()]);
    await new ListAirportsService(airports).execute({ state: 'tx', city: '  Houston ', text: '' });

    assert.deepEqual(airports.searchCalls[0], {
      state: 'TX',
      city: 'Houston',
      text: undefined,
      pagination: { limit: 20, offset: 0 },
    });
  });

  it('should return plain views, not domain entities', async () => {
    const service = new ListAirportsService(new StubAirportRepository([anAirport()]));
    const page = await service.execute({});
    assert.deepEqual(page.items[0], {
      iata: 'JFK',
      name: 'John F Kennedy Intl',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      latitude: 40.6398,
      longitude: -73.7789,
    });
  });

  it('should reject an invalid state without touching the repository', async () => {
    const airports = new StubAirportRepository();
    await assert.rejects(
      new ListAirportsService(airports).execute({ state: 'Texas' }),
      ValidationError,
    );
    assert.equal(airports.searchCalls.length, 0);
  });

  it('should reject a limit above the maximum page size', async () => {
    const service = new ListAirportsService(new StubAirportRepository());
    await assert.rejects(service.execute({ limit: 101 }), ValidationError);
  });
});

describe('GetAirportService', () => {
  it('should return the airport view', async () => {
    const service = new GetAirportService(new StubAirportRepository([anAirport({ iata: 'LAX' })]));
    assert.equal((await service.execute({ iata: 'lax' })).iata, 'LAX');
  });

  it('should throw NotFoundError when the airport does not exist', async () => {
    const service = new GetAirportService(new StubAirportRepository());
    await assert.rejects(service.execute({ iata: 'ZZZ' }), NotFoundError);
  });

  it('should throw ValidationError for a malformed code without querying', async () => {
    const airports = new StubAirportRepository();
    await assert.rejects(new GetAirportService(airports).execute({ iata: 'X' }), ValidationError);
    assert.deepEqual(airports.findCalls, []);
  });
});

describe('GetAirportDelayStatsService', () => {
  const setup = () => {
    const airports = new StubAirportRepository([anAirport()]);
    const flights = new StubFlightRepository({
      airportStats: {
        DEPARTURES: aStatsSnapshot({ total: 10, delayed: 2, cancelled: 0, diverted: 0 }),
        ARRIVALS: aStatsSnapshot({ total: 4, delayed: 1, cancelled: 1, diverted: 0 }),
      },
    });
    const cache = new InMemoryCache();
    const service = new GetAirportDelayStatsService(airports, flights, cache, new DelayPolicy(20));
    return { airports, flights, cache, service };
  };

  it('should combine both directions into punctuality views', async () => {
    const { service } = setup();
    const view = await service.execute({ iata: 'JFK' });
    assert.equal(view.delayThresholdMinutes, 20);
    assert.equal(view.departures.onTimePercentage, 80);
    assert.equal(view.arrivals.onTimePercentage, 50);
  });

  it('should pass the configured DelayPolicy to the repository', async () => {
    const { service, flights } = setup();
    await service.execute({ iata: 'JFK' });
    assert.deepEqual(flights.statsForAirportCalls.map((c) => [c.direction, c.threshold]).sort(), [
      ['ARRIVALS', 20],
      ['DEPARTURES', 20],
    ]);
  });

  it('should serve the second request from the cache', async () => {
    const { service, flights, cache } = setup();
    const first = await service.execute({ iata: 'JFK' });
    const second = await service.execute({ iata: 'jfk' });

    assert.deepEqual(second, first);
    assert.equal(flights.statsForAirportCalls.length, 2, 'repository hit only once per direction');
    assert.deepEqual(cache.hits, ['airport-delay-stats:JFK:20']);
  });

  it('should throw NotFoundError and cache nothing for an unknown airport', async () => {
    const { service, cache } = setup();
    await assert.rejects(service.execute({ iata: 'ZZZ' }), NotFoundError);
    assert.deepEqual(cache.keys(), []);
  });
});
