// HEXAGON: inside – use case implementation
import {
  PunctualityReport,
  rankByPunctuality,
  ValidationError,
  type DelayPolicy,
} from '@usflights/domain';
import type {
  CarrierPunctualityRankingQuery,
  CarrierPunctualityRankingView,
  GetCarrierPunctualityRankingUseCase,
} from '../ports/in/carrier-queries.port.ts';
import type { CachePort } from '../ports/out/cache.port.ts';
import type { CarrierRepository } from '../ports/out/carrier-repository.port.ts';
import type { FlightRepository } from '../ports/out/flight-repository.port.ts';
import { optionalYear } from '../shared/input-parsing.ts';
import { toPagination } from '../shared/pagination.ts';
import { toPunctualityView } from '../views.ts';

const DEFAULT_MIN_FLIGHTS = 10;

export class GetCarrierPunctualityRankingService implements GetCarrierPunctualityRankingUseCase {
  private readonly flights: FlightRepository;
  private readonly carriers: CarrierRepository;
  private readonly cache: CachePort;
  private readonly policy: DelayPolicy;

  constructor(
    flights: FlightRepository,
    carriers: CarrierRepository,
    cache: CachePort,
    policy: DelayPolicy,
  ) {
    this.flights = flights;
    this.carriers = carriers;
    this.cache = cache;
    this.policy = policy;
  }

  async execute(query: CarrierPunctualityRankingQuery): Promise<CarrierPunctualityRankingView> {
    const year = optionalYear(query.year);
    const minFlights = query.minFlights ?? DEFAULT_MIN_FLIGHTS;
    if (!Number.isInteger(minFlights) || minFlights < 1) {
      throw new ValidationError('minFlights must be a positive integer');
    }
    const { limit } = toPagination(query.limit, 0);

    const cacheKey = `carrier-ranking:${year ?? 'all'}:${minFlights}:${limit}`;
    const cached = await this.cache.get<CarrierPunctualityRankingView>(cacheKey);
    if (cached) return cached;

    const stats = await this.flights.statsByCarrier({ year, minFlights }, this.policy);
    const ranked = rankByPunctuality(
      stats.map((s) => ({
        key: s.carrier.value,
        carrier: s.carrier,
        report: PunctualityReport.from(s.stats),
      })),
    ).slice(0, limit);

    const carriers = await this.carriers.findByCodes(ranked.map((r) => r.carrier));
    const nameByCode = new Map(carriers.map((c) => [c.code.value, c.name]));

    const view: CarrierPunctualityRankingView = {
      delayThresholdMinutes: this.policy.thresholdMinutes,
      year: year ?? null,
      ranking: ranked.map((entry, index) => ({
        rank: index + 1,
        carrier: { code: entry.key, name: nameByCode.get(entry.key) ?? entry.key },
        punctuality: toPunctualityView(entry.report),
      })),
    };
    await this.cache.set(cacheKey, view);
    return view;
  }
}
