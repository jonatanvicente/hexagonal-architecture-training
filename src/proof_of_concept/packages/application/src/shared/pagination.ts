// HEXAGON: inside – application
import { ValidationError } from '@usflights/domain';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export interface Pagination {
  readonly limit: number;
  readonly offset: number;
}

export interface Page<T> {
  readonly items: T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

export function toPagination(limit?: number, offset?: number): Pagination {
  const resolvedLimit = limit ?? DEFAULT_PAGE_LIMIT;
  const resolvedOffset = offset ?? 0;
  if (!Number.isInteger(resolvedLimit) || resolvedLimit < 1 || resolvedLimit > MAX_PAGE_LIMIT) {
    throw new ValidationError(`limit must be an integer between 1 and ${MAX_PAGE_LIMIT}`);
  }
  if (!Number.isInteger(resolvedOffset) || resolvedOffset < 0) {
    throw new ValidationError('offset must be a non-negative integer');
  }
  return { limit: resolvedLimit, offset: resolvedOffset };
}

export function mapPage<A, B>(page: Page<A>, fn: (item: A) => B): Page<B> {
  return { ...page, items: page.items.map(fn) };
}
