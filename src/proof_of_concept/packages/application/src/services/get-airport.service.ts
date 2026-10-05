// HEXAGON: inside – use case implementation
import { IataCode, NotFoundError } from '@usflights/domain';
import type { GetAirportQuery, GetAirportUseCase } from '../ports/in/airport-queries.port.ts';
import type { AirportRepository } from '../ports/out/airport-repository.port.ts';
import { toAirportView, type AirportView } from '../views.ts';

export class GetAirportService implements GetAirportUseCase {
  private readonly airports: AirportRepository;

  constructor(airports: AirportRepository) {
    this.airports = airports;
  }

  async execute(query: GetAirportQuery): Promise<AirportView> {
    const iata = IataCode.of(query.iata);
    const airport = await this.airports.findByIata(iata);
    if (!airport) {
      throw new NotFoundError('Airport', iata.value);
    }
    return toAirportView(airport);
  }
}
