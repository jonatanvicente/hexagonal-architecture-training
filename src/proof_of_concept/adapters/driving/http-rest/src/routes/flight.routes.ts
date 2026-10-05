// HEXAGON: outside – DRIVING adapter (HTTP controller)
import type { FindDelayedFlightsUseCase } from '@usflights/application';
import type { FastifyInstance } from 'fastify';
import { paginationProperties } from './schemas.ts';

export interface FlightRoutesDeps {
  readonly findDelayedFlights: FindDelayedFlightsUseCase;
}

interface DelayedFlightsQuerystring {
  minDelay?: number;
  origin?: string;
  dest?: string;
  carrier?: string;
  year?: number;
  limit?: number;
  offset?: number;
}

export function flightRoutes(deps: FlightRoutesDeps) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get<{ Querystring: DelayedFlightsQuerystring }>(
      '/flights/delayed',
      {
        schema: {
          querystring: {
            type: 'object',
            properties: {
              minDelay: { type: 'integer', description: 'Minimum arrival delay in minutes' },
              origin: { type: 'string' },
              dest: { type: 'string' },
              carrier: { type: 'string' },
              year: { type: 'integer' },
              ...paginationProperties,
            },
          },
        },
      },
      async (request) =>
        deps.findDelayedFlights.execute({
          minDelayMinutes: request.query.minDelay,
          origin: request.query.origin,
          destination: request.query.dest,
          carrier: request.query.carrier,
          year: request.query.year,
          limit: request.query.limit,
          offset: request.query.offset,
        }),
    );
  };
}
