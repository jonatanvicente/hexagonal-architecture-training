// INTEGRATION (driving adapter + Fastify) – exercised with `app.inject()`: real routing, schema
// validation and serialization, but no network socket. The driving ports are stubs, so this
// test checks ONLY the adapter's job: HTTP → port call translation, and error → HTTP mapping.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  NotFoundError,
  ValidationError,
  type FindDelayedFlightsQuery,
  type ListAirportsQuery,
} from '@usflights/application';
import { buildHttpServer, type HttpDrivingPorts } from './index.ts';

const emptyPage = { items: [], total: 0, limit: 20, offset: 0 };

function stubPorts(overrides: Partial<HttpDrivingPorts> = {}) {
  const calls: { listAirports: ListAirportsQuery[]; findDelayed: FindDelayedFlightsQuery[] } = {
    listAirports: [],
    findDelayed: [],
  };
  const ports: HttpDrivingPorts = {
    listAirports: {
      execute: async (q) => {
        calls.listAirports.push(q);
        return emptyPage;
      },
    },
    getAirport: {
      execute: async ({ iata }) => {
        if (iata === 'ZZZ') throw new NotFoundError('Airport', iata);
        if (iata === 'X') throw new ValidationError(`Invalid IATA code '${iata}'`);
        if (iata === 'BOOM') throw new Error('database password leaked in message');
        return {
          iata,
          name: 'Test',
          city: null,
          state: null,
          country: 'USA',
          latitude: null,
          longitude: null,
        };
      },
    },
    getAirportDelayStats: { execute: async () => assert.fail('not expected') },
    findDelayedFlights: {
      execute: async (q) => {
        calls.findDelayed.push(q);
        return emptyPage;
      },
    },
    listCarriers: { execute: async () => emptyPage },
    getCarrierPunctualityRanking: {
      execute: async ({ year }) => ({
        delayThresholdMinutes: 15,
        year: year ?? null,
        ranking: [],
      }),
    },
    ...overrides,
  };
  return { app: buildHttpServer(ports), calls };
}

describe('HTTP REST adapter', () => {
  it('should answer the health check', async () => {
    const { app } = stubPorts();
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { status: 'ok' });
  });

  it('should translate query params into the driving-port query', async () => {
    const { app, calls } = stubPorts();
    const res = await app.inject({ url: '/api/v1/airports?state=tx&q=hou&limit=5&offset=10' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls.listAirports[0], {
      state: 'tx',
      city: undefined,
      text: 'hou',
      limit: 5,
      offset: 10,
    });
  });

  it('should rename HTTP vocabulary to application vocabulary for delayed flights', async () => {
    const { app, calls } = stubPorts();
    await app.inject({ url: '/api/v1/flights/delayed?minDelay=60&dest=LAX&year=2005' });
    const query = calls.findDelayed[0];
    assert.equal(query?.minDelayMinutes, 60);
    assert.equal(query?.destination, 'LAX');
    assert.equal(query?.year, 2005);
  });

  it('should map NotFoundError to 404 problem+json', async () => {
    const res = await stubPorts().app.inject({ url: '/api/v1/airports/ZZZ' });
    assert.equal(res.statusCode, 404);
    assert.match(res.headers['content-type'] ?? '', /application\/problem\+json/);
    assert.deepEqual(res.json(), {
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: "Airport 'ZZZ' not found",
      code: 'NOT_FOUND',
    });
  });

  it('should map ValidationError from the hexagon to 400', async () => {
    const res = await stubPorts().app.inject({ url: '/api/v1/airports/X' });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().code, 'VALIDATION_ERROR');
  });

  it('should reject wrongly typed parameters at the transport level with 400', async () => {
    const { app, calls } = stubPorts();
    const res = await app.inject({ url: '/api/v1/airports?limit=abc' });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().code, 'REQUEST_VALIDATION_ERROR');
    assert.equal(calls.listAirports.length, 0, 'use case never called');
  });

  it('should hide internal error details behind a generic 500', async () => {
    const res = await stubPorts().app.inject({ url: '/api/v1/airports/BOOM' });
    assert.equal(res.statusCode, 500);
    assert.equal(res.json().detail, 'Unexpected error');
    assert.doesNotMatch(res.body, /password/);
  });

  it('should return 404 problem+json for unknown routes', async () => {
    const res = await stubPorts().app.inject({ url: '/api/v1/nope' });
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().code, 'ROUTE_NOT_FOUND');
  });

  it('should pass optional numeric filters through to the ranking use case', async () => {
    const res = await stubPorts().app.inject({ url: '/api/v1/carriers/punctuality?year=2001' });
    assert.equal(res.json().year, 2001);
  });
});
