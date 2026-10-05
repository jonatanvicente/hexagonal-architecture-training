// HEXAGON: inside – use case implementation
import type { ListCarriersQuery, ListCarriersUseCase } from '../ports/in/carrier-queries.port.ts';
import type { CarrierRepository } from '../ports/out/carrier-repository.port.ts';
import { optionalText } from '../shared/input-parsing.ts';
import { mapPage, toPagination, type Page } from '../shared/pagination.ts';
import { toCarrierView, type CarrierView } from '../views.ts';

export class ListCarriersService implements ListCarriersUseCase {
  private readonly carriers: CarrierRepository;

  constructor(carriers: CarrierRepository) {
    this.carriers = carriers;
  }

  async execute(query: ListCarriersQuery): Promise<Page<CarrierView>> {
    const page = await this.carriers.search({
      text: optionalText(query.text, 'q'),
      pagination: toPagination(query.limit, query.offset),
    });
    return mapPage(page, toCarrierView);
  }
}
