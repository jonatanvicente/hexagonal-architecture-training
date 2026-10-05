// COMPOSITION ROOT – configuration
// Environment variables are read here and nowhere else. Secrets are never defaulted.
import type { PostgresConfig } from '@usflights/adapter-postgres';
import type { LevelWithSilent } from '@usflights/adapter-platform';

export type Persistence = 'postgres' | 'memory';

export interface AppConfig {
  readonly persistence: Persistence;
  readonly postgres: PostgresConfig | null;
  readonly http: { readonly host: string; readonly port: number };
  readonly delayThresholdMinutes: number;
  readonly cacheTtlSeconds: number;
  readonly logLevel: LevelWithSilent;
  readonly opsRecipients: readonly string[];
}

const PERSISTENCE_VALUES: readonly Persistence[] = ['postgres', 'memory'];
const LOG_LEVELS: readonly LevelWithSilent[] = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
];

export class ConfigError extends Error {}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const persistence = oneOf(env['PERSISTENCE'] ?? 'postgres', PERSISTENCE_VALUES, 'PERSISTENCE');

  return {
    persistence,
    postgres:
      persistence === 'postgres'
        ? {
            host: env['PGHOST'] ?? 'localhost',
            port: integer(env['PGPORT'], 5432, 'PGPORT'),
            database: env['PGDATABASE'] ?? 'usflights',
            user: env['PGUSER'] ?? 'postgres',
            password: required(env['PGPASSWORD'], 'PGPASSWORD'),
          }
        : null,
    http: {
      // Loopback by default: the API has no authentication.
      host: env['HTTP_HOST'] ?? '127.0.0.1',
      port: integer(env['HTTP_PORT'], 3000, 'HTTP_PORT'),
    },
    delayThresholdMinutes: integer(env['DELAY_THRESHOLD_MIN'], 15, 'DELAY_THRESHOLD_MIN'),
    cacheTtlSeconds: integer(env['CACHE_TTL_SECONDS'], 60, 'CACHE_TTL_SECONDS'),
    logLevel: oneOf(env['LOG_LEVEL'] ?? 'info', LOG_LEVELS, 'LOG_LEVEL'),
    opsRecipients: (env['OPS_RECIPIENTS'] ?? 'ops@usflights.example,+1-555-0100')
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean),
  };
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new ConfigError(
      `Missing environment variable ${name}. Copy .env.example to .env and set it ` +
        '(or run with PERSISTENCE=memory).',
    );
  }
  return value;
}

function integer(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed))
    throw new ConfigError(`${name} must be an integer, got '${value}'`);
  return parsed;
}

function oneOf<T extends string>(value: string, allowed: readonly T[], name: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ConfigError(`${name} must be one of ${allowed.join(', ')}, got '${value}'`);
  }
  return value as T;
}
