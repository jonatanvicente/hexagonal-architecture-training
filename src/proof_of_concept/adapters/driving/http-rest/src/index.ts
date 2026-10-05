// HEXAGON: outside – DRIVING adapter package (REST over HTTP)
// Depends on driving ports (interfaces) only – never on concrete services or driven adapters.
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import { registerErrorHandling } from './error-handler.ts';
import { airportRoutes, type AirportRoutesDeps } from './routes/airport.routes.ts';
import { carrierRoutes, type CarrierRoutesDeps } from './routes/carrier.routes.ts';
import { flightRoutes, type FlightRoutesDeps } from './routes/flight.routes.ts';

export const API_PREFIX = '/api/v1';

export type HttpDrivingPorts = AirportRoutesDeps & FlightRoutesDeps & CarrierRoutesDeps;

export interface HttpServerOptions {
  /** Omit to disable request logging (e.g. in adapter tests). */
  readonly logger?: FastifyBaseLogger;
}

export function buildHttpServer(
  ports: HttpDrivingPorts,
  options: HttpServerOptions = {},
): FastifyInstance {
  const app = options.logger
    ? Fastify({ loggerInstance: options.logger })
    : Fastify({ logger: false });

  registerErrorHandling(app);

  app.get('/health', async () => ({ status: 'ok' }));
  app.register(airportRoutes(ports), { prefix: API_PREFIX });
  app.register(flightRoutes(ports), { prefix: API_PREFIX });
  app.register(carrierRoutes(ports), { prefix: API_PREFIX });

  return app;
}
