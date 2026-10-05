// HEXAGON: inside – use case implementation
import { ValidationError, type DelayPolicy } from '@usflights/domain';
import type {
  FindDelayedFlightsQuery,
  FindDelayedFlightsUseCase,
} from '../ports/in/flight-queries.port.ts';
import type { FlightRepository } from '../ports/out/flight-repository.port.ts';
import { optionalCarrier, optionalIata, optionalYear } from '../shared/input-parsing.ts';
import { mapPage, toPagination, type Page } from '../shared/pagination.ts';
import { toFlightView, type FlightView } from '../views.ts';

export class FindDelayedFlightsService implements FindDelayedFlightsUseCase {
  private readonly flights: FlightRepository;
  private readonly policy: DelayPolicy;

  constructor(flights: FlightRepository, policy: DelayPolicy) {
    this.flights = flights;
    this.policy = policy;
  }

  async execute(query: FindDelayedFlightsQuery): Promise<Page<FlightView>> {
    const minDelayMinutes = query.minDelayMinutes ?? this.policy.thresholdMinutes;
    // Business rule: below the policy threshold a flight is, by definition, not "delayed".
    if (!Number.isInteger(minDelayMinutes) || minDelayMinutes < this.policy.thresholdMinutes) {
      throw new ValidationError(
        `minDelay must be an integer >= ${this.policy.thresholdMinutes} (delay policy threshold)`,
      );
    }

    const page = await this.flights.findDelayed({
      minDelayMinutes,
      origin: optionalIata(query.origin),
      destination: optionalIata(query.destination),
      carrier: optionalCarrier(query.carrier),
      year: optionalYear(query.year),
      pagination: toPagination(query.limit, query.offset),
    });
    return mapPage(page, (flight) => toFlightView(flight, this.policy));
  }
}
