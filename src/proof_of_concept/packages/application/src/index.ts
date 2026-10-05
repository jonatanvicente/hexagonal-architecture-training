// HEXAGON: inside – public API of the application package
// Everything exported here IS the boundary of the hexagon:
//   * ports/in  → what driving adapters may call
//   * ports/out → what driven adapters must implement
//   * services  → use case implementations, only instantiated by the composition root

// Errors are re-exported so driving adapters can map them without importing the domain.
export { DomainError, NotFoundError, ValidationError } from '@usflights/domain';

// --- Driving (primary / inbound) ports
export type * from './ports/in/airport-queries.port.ts';
export type * from './ports/in/carrier-queries.port.ts';
export type * from './ports/in/flight-queries.port.ts';
export type * from './ports/in/process-flight-status.port.ts';

// --- Driven (secondary / outbound) ports
export type * from './ports/out/airport-repository.port.ts';
export type * from './ports/out/cache.port.ts';
export type * from './ports/out/carrier-repository.port.ts';
export type * from './ports/out/clock.port.ts';
export type * from './ports/out/event-publisher.port.ts';
export type * from './ports/out/flight-repository.port.ts';
export type * from './ports/out/logger.port.ts';
export type * from './ports/out/notification.port.ts';

// --- Shared contracts
export {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  type Page,
  type Pagination,
} from './shared/pagination.ts';
export type { AirportView, CarrierView, FlightView, PunctualityView } from './views.ts';

// --- Use case implementations
export { FindDelayedFlightsService } from './services/find-delayed-flights.service.ts';
export { GetAirportDelayStatsService } from './services/get-airport-delay-stats.service.ts';
export { GetAirportService } from './services/get-airport.service.ts';
export {
  GetCarrierPunctualityRankingService,
} from './services/get-carrier-punctuality-ranking.service.ts';
export { ListAirportsService } from './services/list-airports.service.ts';
export { ListCarriersService } from './services/list-carriers.service.ts';
export {
  ProcessFlightStatusService,
  type ProcessFlightStatusDeps,
} from './services/process-flight-status.service.ts';
