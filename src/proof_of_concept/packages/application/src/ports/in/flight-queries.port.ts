// HEXAGON: boundary – DRIVING (primary / inbound) ports
// Called by: adapters/driving/http-rest, adapters/driving/cli.
import type { Page } from '../../shared/pagination.ts';
import type { FlightView } from '../../views.ts';

export interface FindDelayedFlightsQuery {
  /** Defaults to the domain DelayPolicy threshold (FAA: 15 min). Cannot be lower than it. */
  readonly minDelayMinutes?: number | undefined;
  readonly origin?: string | undefined;
  readonly destination?: string | undefined;
  readonly carrier?: string | undefined;
  readonly year?: number | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export interface FindDelayedFlightsUseCase {
  execute(query: FindDelayedFlightsQuery): Promise<Page<FlightView>>;
}
