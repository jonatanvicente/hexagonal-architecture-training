// HEXAGON: outside – driven adapter (infrastructure)
import pg from 'pg';

export interface PostgresConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly maxConnections?: number;
}

export function createPostgresPool(config: PostgresConfig): pg.Pool {
  return new pg.Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.maxConnections ?? 10,
    application_name: 'usflights-hexagonal-poc',
  });
}

/** Fails fast at startup with a readable error instead of on the first HTTP request. */
export async function assertPostgresConnection(pool: pg.Pool): Promise<void> {
  await pool.query('SELECT 1');
}
