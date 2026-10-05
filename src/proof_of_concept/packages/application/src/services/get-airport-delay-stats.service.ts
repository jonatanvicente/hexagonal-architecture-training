// HEXAGON: inside – use case implementation
// Orchestrates three driven ports (airports, flights, cache) plus domain logic (PunctualityReport).
import { IataCode, NotFoundError, PunctualityReport, type DelayPolicy } from '@usflights/domain';
import type {
  AirportDelayStatsView,
  GetAirportDelayStatsUseCase,
  GetAirportQuery,
} from '../ports/in/airport-queries.port.ts';
import type { AirportRepository } from '../ports/out/airport-repository.port.ts';
import type { CachePort } from '../ports/out/cache.port.ts';
import type { FlightRepository } from '../ports/out/flight-repository.port.ts';
import { toAirportView, toPunctualityView } from '../views.ts';

export class GetAirportDelayStatsService implements GetAirportDelayStatsUseCase {
  private readonly airports: AirportRepository;
  private readonly flights: FlightRepository;
  private readonly cache: CachePort;
  private readonly policy: DelayPolicy;

  constructor(
    airports: AirportRepository,
    flights: FlightRepository,
    cache: CachePort,
    policy: DelayPolicy,
  ) {
    this.airports = airports;
    this.flights = flights;
    this.cache = cache;
    this.policy = policy;
  }

  async execute(query: GetAirportQuery): Promise<AirportDelayStatsView> {
    const iata = IataCode.of(query.iata);
    const cacheKey = `airport-delay-stats:${iata.value}:${this.policy.thresholdMinutes}`;

    const cached = await this.cache.get<AirportDelayStatsView>(cacheKey);
    if (cached) return cached;

    const airport = await this.airports.findByIata(iata);
    if (!airport) {
      throw new NotFoundError('Airport', iata.value);
    }

    const [departures, arrivals] = await Promise.all([
      this.flights.statsForAirport(iata, 'DEPARTURES', this.policy),
      this.flights.statsForAirport(iata, 'ARRIVALS', this.policy),
    ]);

    const view: AirportDelayStatsView = {
      airport: toAirportView(airport),
      delayThresholdMinutes: this.policy.thresholdMinutes,
      departures: toPunctualityView(PunctualityReport.from(departures)),
      arrivals: toPunctualityView(PunctualityReport.from(arrivals)),
    };
    await this.cache.set(cacheKey, view);
    return view;
  }
}
