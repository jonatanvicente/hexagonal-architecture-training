// HEXAGON: outside – DRIVING adapter (HTTP controller)
import type {
  GetCarrierPunctualityRankingUseCase,
  ListCarriersUseCase,
} from '@usflights/application';
import type { FastifyInstance } from 'fastify';
import { paginationProperties } from './schemas.ts';

export interface CarrierRoutesDeps {
  readonly listCarriers: ListCarriersUseCase;
  readonly getCarrierPunctualityRanking: GetCarrierPunctualityRankingUseCase;
}

interface ListCarriersQuerystring {
  q?: string;
  limit?: number;
  offset?: number;
}

interface RankingQuerystring {
  year?: number;
  minFlights?: number;
  limit?: number;
}

export function carrierRoutes(deps: CarrierRoutesDeps) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get<{ Querystring: ListCarriersQuerystring }>(
      '/carriers',
      {
        schema: {
          querystring: {
            type: 'object',
            properties: { q: { type: 'string' }, ...paginationProperties },
          },
        },
      },
      async (request) =>
        deps.listCarriers.execute({
          text: request.query.q,
          limit: request.query.limit,
          offset: request.query.offset,
        }),
    );

    app.get<{ Querystring: RankingQuerystring }>(
      '/carriers/punctuality',
      {
        schema: {
          querystring: {
            type: 'object',
            properties: {
              year: { type: 'integer' },
              minFlights: { type: 'integer', minimum: 1 },
              limit: { type: 'integer', minimum: 1 },
            },
          },
        },
      },
      async (request) =>
        deps.getCarrierPunctualityRanking.execute({
          year: request.query.year,
          minFlights: request.query.minFlights,
          limit: request.query.limit,
        }),
    );
  };
}
