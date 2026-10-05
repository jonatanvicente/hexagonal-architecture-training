// HEXAGON: outside – DRIVING adapter (HTTP controller)
// Controllers are thin: parse HTTP → call a driving port → return the view. No business logic.
import type {
  GetAirportDelayStatsUseCase,
  GetAirportUseCase,
  ListAirportsUseCase,
} from '@usflights/application';
import type { FastifyInstance } from 'fastify';
import { iataParamsSchema, paginationProperties } from './schemas.ts';

export interface AirportRoutesDeps {
  readonly listAirports: ListAirportsUseCase;
  readonly getAirport: GetAirportUseCase;
  readonly getAirportDelayStats: GetAirportDelayStatsUseCase;
}

interface ListAirportsQuerystring {
  state?: string;
  city?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

interface IataParams {
  iata: string;
}

export function airportRoutes(deps: AirportRoutesDeps) {
  return async (app: FastifyInstance): Promise<void> => {
    app.get<{ Querystring: ListAirportsQuerystring }>(
      '/airports',
      {
        schema: {
          querystring: {
            type: 'object',
            properties: {
              state: { type: 'string', description: 'US state code, e.g. TX' },
              city: { type: 'string' },
              q: { type: 'string', description: 'Matches IATA code or airport name' },
              ...paginationProperties,
            },
          },
        },
      },
      async (request) =>
        deps.listAirports.execute({
          state: request.query.state,
          city: request.query.city,
          text: request.query.q,
          limit: request.query.limit,
          offset: request.query.offset,
        }),
    );

    app.get<{ Params: IataParams }>(
      '/airports/:iata',
      { schema: { params: iataParamsSchema } },
      async (request) => deps.getAirport.execute({ iata: request.params.iata }),
    );

    app.get<{ Params: IataParams }>(
      '/airports/:iata/delay-stats',
      { schema: { params: iataParamsSchema } },
      async (request) => deps.getAirportDelayStats.execute({ iata: request.params.iata }),
    );
  };
}
