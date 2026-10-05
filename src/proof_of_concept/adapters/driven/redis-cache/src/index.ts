// HEXAGON: outside – DRIVEN adapter implementing the CachePort
//
// SIMULATED Redis: a Map with TTL that stores JSON strings, exactly like `SET key value EX ttl`
// would. Replacing it with a real client (ioredis / node-redis) means changing only this file:
//
//   async get(key) {
//     const raw = await this.redis.get(key);
//     return raw ? JSON.parse(raw) : undefined;
//   }
//   async set(k, v) { await this.redis.set(k, JSON.stringify(v), 'EX', ttl) }
import type { CachePort, ClockPort, LoggerPort } from '@usflights/application';

interface Entry {
  readonly payload: string;
  readonly expiresAt: number;
}

export class SimulatedRedisCache implements CachePort {
  private readonly store = new Map<string, Entry>();
  private readonly logger: LoggerPort;
  private readonly clock: ClockPort;
  private readonly defaultTtlSeconds: number;

  constructor(logger: LoggerPort, clock: ClockPort, defaultTtlSeconds = 60) {
    this.logger = logger;
    this.clock = clock;
    this.defaultTtlSeconds = defaultTtlSeconds;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry || entry.expiresAt <= this.clock.now().getTime()) {
      if (entry) this.store.delete(key);
      this.logger.debug({ key }, '[SIMULATED REDIS] GET miss');
      return undefined;
    }
    this.logger.info({ key }, '[SIMULATED REDIS] GET hit');
    return JSON.parse(entry.payload) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds = this.defaultTtlSeconds): Promise<void> {
    const expiresAt = this.clock.now().getTime() + ttlSeconds * 1000;
    this.store.set(key, { payload: JSON.stringify(value), expiresAt });
    this.logger.debug({ key, ttlSeconds }, '[SIMULATED REDIS] SET');
  }
}
