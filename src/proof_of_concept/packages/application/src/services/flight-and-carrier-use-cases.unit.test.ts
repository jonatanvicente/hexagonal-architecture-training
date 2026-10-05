// UNIT – flight and carrier query use cases.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CarrierCode, DelayPolicy, ValidationError } from '@usflights/domain';
import {
  aCarrier,
  aFlight,
  aStatsSnapshot,
  InMemoryCache,
  StubCarrierRepository,
  StubFlightRepository,
} from '../testing/index.ts';
import { FindDelayedFlightsService } from './find-delayed-flights.service.ts';
import { GetCarrierPunctualityRankingService } from './get-carrier-punctuality-ranking.service.ts';
import { ListCarriersService } from './list-carriers.service.ts';

describe('FindDelayedFlightsService', () => {
  const policy = new DelayPolicy(15);

  it('should default the minimum delay to the policy threshold', async () => {
    const flights = new StubFlightRepository();
    await new FindDelayedFlightsService(flights, policy).execute({});
    assert.equal(flights.findDelayedCalls[0]?.minDelayMinutes, 15);
  });

  it('should reject a minimum delay below the policy threshold', async () => {
    const flights = new StubFlightRepository();
    const service = new FindDelayedFlightsService(flights, policy);
    await assert.rejects(service.execute({ minDelayMinutes: 5 }), ValidationError);
    assert.equal(flights.findDelayedCalls.length, 0);
  });

  it('should convert primitive filters into value objects', async () => {
    const flights = new StubFlightRepository();
    await new FindDelayedFlightsService(flights, policy).execute({
      minDelayMinutes: 60,
      origin: 'ord',
      destination: 'lax',
      carrier: 'ua',
      year: 2005,
      limit: 5,
    });
    const criteria = flights.findDelayedCalls[0];
    assert.equal(criteria?.origin?.value, 'ORD');
    assert.equal(criteria?.destination?.value, 'LAX');
    assert.equal(criteria?.carrier?.value, 'UA');
    assert.equal(criteria?.year, 2005);
    assert.deepEqual(criteria?.pagination, { limit: 5, offset: 0 });
  });

  it('should reject an out-of-range year', async () => {
    const service = new FindDelayedFlightsService(new StubFlightRepository(), policy);
    await assert.rejects(service.execute({ year: 3000 }), ValidationError);
  });

  it('should map flights to views with status and formatted times', async () => {
    const flights = new StubFlightRepository({
      delayed: [aFlight({ id: 7, arrDelay: 45, causes: ['WEATHER'] })],
    });
    const page = await new FindDelayedFlightsService(flights, policy).execute({});
    assert.equal(page.total, 1);
    assert.equal(page.items[0]?.status, 'DELAYED');
    assert.equal(page.items[0]?.scheduledDeparture, '09:00');
    assert.deepEqual(page.items[0]?.delayCauses, ['WEATHER']);
  });
});

describe('ListCarriersService', () => {
  it('should trim the search text and map views', async () => {
    const carriers = new StubCarrierRepository([aCarrier('DL', 'Delta Air Lines Inc.')]);
    const page = await new ListCarriersService(carriers).execute({ text: '  delta ' });
    assert.equal(carriers.searchCalls[0]?.text, 'delta');
    assert.deepEqual(page.items, [{ code: 'DL', name: 'Delta Air Lines Inc.' }]);
  });
});

describe('GetCarrierPunctualityRankingService', () => {
  const stats = (code: string, total: number, delayed: number) => ({
    carrier: CarrierCode.of(code),
    stats: aStatsSnapshot({ total, delayed, cancelled: 0, diverted: 0 }),
  });

  const setup = () => {
    const flights = new StubFlightRepository({
      carrierStats: [stats('AA', 100, 30), stats('DL', 100, 10), stats('WN', 50, 25)],
    });
    const carriers = new StubCarrierRepository([
      aCarrier('AA', 'American Airlines Inc.'),
      aCarrier('DL', 'Delta Air Lines Inc.'),
    ]);
    const cache = new InMemoryCache();
    const service = new GetCarrierPunctualityRankingService(
      flights,
      carriers,
      cache,
      new DelayPolicy(15),
    );
    return { flights, cache, service };
  };

  it('should rank carriers by on-time percentage', async () => {
    const view = await setup().service.execute({});
    assert.deepEqual(
      view.ranking.map((r) => [r.rank, r.carrier.code, r.punctuality.onTimePercentage]),
      [
        [1, 'DL', 90],
        [2, 'AA', 70],
        [3, 'WN', 50],
      ],
    );
  });

  it('should fall back to the code when the carrier name is unknown', async () => {
    const view = await setup().service.execute({});
    assert.deepEqual(view.ranking[2]?.carrier, { code: 'WN', name: 'WN' });
  });

  it('should apply the limit after ranking', async () => {
    const view = await setup().service.execute({ limit: 1 });
    assert.deepEqual(
      view.ranking.map((r) => r.carrier.code),
      ['DL'],
    );
  });

  it('should default minFlights to 10 and forward the year', async () => {
    const { service, flights } = setup();
    await service.execute({ year: 2005 });
    assert.deepEqual(flights.statsByCarrierCalls[0], {
      filter: { year: 2005, minFlights: 10 },
      threshold: 15,
    });
  });

  it('should reject a non-positive minFlights', async () => {
    await assert.rejects(setup().service.execute({ minFlights: 0 }), ValidationError);
  });

  it('should cache per year, minFlights and limit', async () => {
    const { service, flights, cache } = setup();
    await service.execute({ year: 2005 });
    await service.execute({ year: 2005 });
    await service.execute({ year: 2006 });
    assert.equal(flights.statsByCarrierCalls.length, 2);
    assert.deepEqual(cache.hits, ['carrier-ranking:2005:10:20']);
  });
});
