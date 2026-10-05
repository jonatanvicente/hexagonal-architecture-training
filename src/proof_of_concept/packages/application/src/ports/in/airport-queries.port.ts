// HEXAGON: boundary – DRIVING (primary / inbound) ports
// What the outside world may ask the hexagon about airports.
// Called by: adapters/driving/http-rest, adapters/driving/cli.
import type { Page } from '../../shared/pagination.ts';
import type { AirportView, PunctualityView } from '../../views.ts';

export interface ListAirportsQuery {
  readonly state?: string | undefined;
  readonly city?: string | undefined;
  readonly text?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export interface ListAirportsUseCase {
  execute(query: ListAirportsQuery): Promise<Page<AirportView>>;
}

export interface GetAirportQuery {
  readonly iata: string;
}

export interface GetAirportUseCase {
  execute(query: GetAirportQuery): Promise<AirportView>;
}

export interface AirportDelayStatsView {
  readonly airport: AirportView;
  readonly delayThresholdMinutes: number;
  readonly departures: PunctualityView;
  readonly arrivals: PunctualityView;
}

export interface GetAirportDelayStatsUseCase {
  execute(query: GetAirportQuery): Promise<AirportDelayStatsView>;
}
