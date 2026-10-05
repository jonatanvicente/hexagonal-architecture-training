// HEXAGON: boundary – DRIVING (primary / inbound) ports
// Called by: adapters/driving/http-rest, adapters/driving/cli.
import type { Page } from '../../shared/pagination.ts';
import type { CarrierView, PunctualityView } from '../../views.ts';

export interface ListCarriersQuery {
  readonly text?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export interface ListCarriersUseCase {
  execute(query: ListCarriersQuery): Promise<Page<CarrierView>>;
}

export interface CarrierPunctualityRankingQuery {
  readonly year?: number | undefined;
  readonly minFlights?: number | undefined;
  readonly limit?: number | undefined;
}

export interface CarrierPunctualityEntry {
  readonly rank: number;
  readonly carrier: CarrierView;
  readonly punctuality: PunctualityView;
}

export interface CarrierPunctualityRankingView {
  readonly delayThresholdMinutes: number;
  readonly year: number | null;
  readonly ranking: CarrierPunctualityEntry[];
}

export interface GetCarrierPunctualityRankingUseCase {
  execute(query: CarrierPunctualityRankingQuery): Promise<CarrierPunctualityRankingView>;
}
