// HEXAGON: outside – DRIVEN adapter implementing the CarrierRepository port
import type { CarrierRepository, CarrierSearchCriteria, Page } from '@usflights/application';
import type { Carrier, CarrierCode } from '@usflights/domain';
import type pg from 'pg';
import { toCarrier, type CarrierRow } from './mappers.ts';
import { containsPattern, WhereBuilder } from './sql.ts';

export class CarrierPostgresRepository implements CarrierRepository {
  private readonly pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async findByCode(code: CarrierCode): Promise<Carrier | null> {
    const { rows } = await this.pool.query<CarrierRow>(
      'SELECT carriercode, description FROM carriers WHERE carriercode = $1',
      [code.value],
    );
    return rows[0] ? toCarrier(rows[0]) : null;
  }

  async findByCodes(codes: readonly CarrierCode[]): Promise<Carrier[]> {
    if (codes.length === 0) return [];
    const { rows } = await this.pool.query<CarrierRow>(
      'SELECT carriercode, description FROM carriers WHERE carriercode = ANY($1::text[])',
      [codes.map((c) => c.value)],
    );
    return rows.map(toCarrier);
  }

  async search(criteria: CarrierSearchCriteria): Promise<Page<Carrier>> {
    const where = new WhereBuilder();
    if (criteria.text) {
      where.add('(carriercode ILIKE ? OR description ILIKE ?)', containsPattern(criteria.text));
    }
    const whereSql = where.toSql();
    const countParams = [...where.params];
    const { limit, offset } = criteria.pagination;

    const [count, page] = await Promise.all([
      this.pool.query<{ total: number }>(
        `SELECT count(*)::int AS total FROM carriers ${whereSql}`,
        countParams,
      ),
      this.pool.query<CarrierRow>(
        `SELECT carriercode, description FROM carriers ${whereSql}
         ORDER BY carriercode LIMIT ${where.next(limit)} OFFSET ${where.next(offset)}`,
        where.params,
      ),
    ]);

    return { items: page.rows.map(toCarrier), total: count.rows[0]?.total ?? 0, limit, offset };
  }
}
