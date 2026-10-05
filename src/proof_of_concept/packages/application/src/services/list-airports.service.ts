// HEXAGON: inside – use case implementation
import type { ListAirportsQuery, ListAirportsUseCase } from '../ports/in/airport-queries.port.ts';
import type { AirportRepository } from '../ports/out/airport-repository.port.ts';
import { optionalText, optionalUsState } from '../shared/input-parsing.ts';
import { mapPage, toPagination, type Page } from '../shared/pagination.ts';
import { toAirportView, type AirportView } from '../views.ts';

export class ListAirportsService implements ListAirportsUseCase {
  private readonly airports: AirportRepository;

  constructor(airports: AirportRepository) {
    this.airports = airports;
  }

  async execute(query: ListAirportsQuery): Promise<Page<AirportView>> {
    const page = await this.airports.search({
      state: optionalUsState(query.state),
      city: optionalText(query.city, 'city'),
      text: optionalText(query.text, 'q'),
      pagination: toPagination(query.limit, query.offset),
    });
    return mapPage(page, toAirportView);
  }
}
