// HEXAGON: outside – driven adapter helpers
// Every value reaches PostgreSQL as a bind parameter ($1, $2...). Only fixed SQL fragments
// written in this package are concatenated – never user input.

/** Accumulates WHERE conditions and their positional parameters. */
export class WhereBuilder {
  private readonly conditions: string[] = [];
  readonly params: unknown[] = [];

  /**
   * `fragment` uses `?` as the placeholder for `value`, e.g. `f.origin = ?`.
   * Every `?` in the fragment refers to the same single value.
   */
  add(fragment: string, value: unknown): this {
    this.params.push(value);
    this.conditions.push(fragment.replaceAll('?', `$${this.params.length}`));
    return this;
  }

  addRaw(fragment: string): this {
    this.conditions.push(fragment);
    return this;
  }

  /** Reserve the next placeholder for a value appended after the WHERE (LIMIT, OFFSET...). */
  next(value: unknown): string {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  toSql(): string {
    return this.conditions.length ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }
}

/** Builds a `%text%` pattern for ILIKE, escaping LIKE wildcards present in the user input. */
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/** Aggregates shared by every stats query. `$1` is always the DelayPolicy threshold. */
export const STATS_COLUMNS = `
  count(*)::int AS total,
  count(*) FILTER (
    WHERE cancelled IS NOT TRUE AND diverted IS NOT TRUE AND arrdelay >= $1
  )::int AS delayed,
  count(*) FILTER (WHERE cancelled IS TRUE)::int AS cancelled,
  count(*) FILTER (WHERE diverted IS TRUE)::int AS diverted,
  avg(arrdelay) FILTER (WHERE cancelled IS NOT TRUE)::float8 AS avg_arr_delay`;
