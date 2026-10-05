// TEST SUPPORT – hand-written test doubles for the DRIVEN ports.
//
// Because the hexagon only depends on interfaces (ports/out), use cases are tested by plugging
// in these tiny fakes – no mocking library, no database, no network. Each fake records what the
// use case asked of it, so tests can assert on *interactions at the boundary*.
import type {
  Airport,
  Carrier,
  CarrierCode,
  DelayPolicy,
  DomainEvent,
  Flight,
  FlightStatsSnapshot,
  IataCode,
} from '@usflights/domain';
import type {
  AirportRepository,
  AirportSearchCriteria,
} from '../ports/out/airport-repository.port.ts';
import type { CachePort } from '../ports/out/cache.port.ts';
import type {
  CarrierRepository,
  CarrierSearchCriteria,
} from '../ports/out/carrier-repository.port.ts';
import type { ClockPort } from '../ports/out/clock.port.ts';
import type { EventPublisherPort } from '../ports/out/event-publisher.port.ts';
import type {
  CarrierStats,
  CarrierStatsFilter,
  DelayedFlightCriteria,
  FlightRepository,
  TrafficDirection,
} from '../ports/out/flight-repository.port.ts';
import type { LoggerPort } from '../ports/out/logger.port.ts';
import type { Notification, NotificationPort } from '../ports/out/notification.port.ts';
import type { Page } from '../shared/pagination.ts';

// --- Cross-cutting ports ---------------------------------------------------------------------

export class FixedClock implements ClockPort {
  private current: Date;

  constructor(now: Date | string = '2026-01-01T12:00:00.000Z') {
    this.current = new Date(now);
  }

  now(): Date {
    return new Date(this.current);
  }

  advanceSeconds(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}

export interface LogEntry {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly context: Record<string, unknown>;
  readonly message: string;
}

export class RecordingLogger implements LoggerPort {
  readonly entries: LogEntry[] = [];

  debug(context: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'debug', context, message });
  }

  info(context: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'info', context, message });
  }

  warn(context: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'warn', context, message });
  }

  error(context: Record<string, unknown>, message: string): void {
    this.entries.push({ level: 'error', context, message });
  }
}

export class RecordingEventPublisher implements EventPublisherPort {
  readonly published: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event);
  }
}

export class RecordingNotifier implements NotificationPort {
  readonly sent: Notification[] = [];

  async send(notification: Notification): Promise<void> {
    this.sent.push(notification);
  }
}

/** Cache double without TTL; stores JSON copies like a real remote cache would. */
export class InMemoryCache implements CachePort {
  private readonly store = new Map<string, string>();
  readonly hits: string[] = [];
  readonly misses: string[] = [];

  async get<T>(key: string): Promise<T | undefined> {
    const raw = this.store.get(key);
    if (raw === undefined) {
      this.misses.push(key);
      return undefined;
    }
    this.hits.push(key);
    return JSON.parse(raw) as T;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  keys(): string[] {
    return [...this.store.keys()];
  }
}

// --- Repository stubs -----------------------------------------------------------------------

export class StubAirportRepository implements AirportRepository {
  private readonly airports: readonly Airport[];
  readonly findCalls: string[] = [];
  readonly searchCalls: AirportSearchCriteria[] = [];

  constructor(airports: readonly Airport[] = []) {
    this.airports = airports;
  }

  async findByIata(iata: IataCode): Promise<Airport | null> {
    this.findCalls.push(iata.value);
    return this.airports.find((a) => a.iata.equals(iata)) ?? null;
  }

  async search(criteria: AirportSearchCriteria): Promise<Page<Airport>> {
    this.searchCalls.push(criteria);
    const { limit, offset } = criteria.pagination;
    return {
      items: this.airports.slice(offset, offset + limit),
      total: this.airports.length,
      limit,
      offset,
    };
  }
}

export class StubCarrierRepository implements CarrierRepository {
  private readonly carriers: readonly Carrier[];
  readonly searchCalls: CarrierSearchCriteria[] = [];

  constructor(carriers: readonly Carrier[] = []) {
    this.carriers = carriers;
  }

  async findByCode(code: CarrierCode): Promise<Carrier | null> {
    return this.carriers.find((c) => c.code.equals(code)) ?? null;
  }

  async findByCodes(codes: readonly CarrierCode[]): Promise<Carrier[]> {
    return this.carriers.filter((c) => codes.some((code) => code.equals(c.code)));
  }

  async search(criteria: CarrierSearchCriteria): Promise<Page<Carrier>> {
    this.searchCalls.push(criteria);
    const { limit, offset } = criteria.pagination;
    return {
      items: this.carriers.slice(offset, offset + limit),
      total: this.carriers.length,
      limit,
      offset,
    };
  }
}

export interface StubFlightRepositoryData {
  readonly delayed?: readonly Flight[];
  readonly airportStats?: Partial<Record<TrafficDirection, FlightStatsSnapshot>>;
  readonly carrierStats?: readonly CarrierStats[];
}

export class StubFlightRepository implements FlightRepository {
  private readonly data: StubFlightRepositoryData;
  readonly findDelayedCalls: DelayedFlightCriteria[] = [];
  readonly statsForAirportCalls: Array<{
    iata: string;
    direction: TrafficDirection;
    threshold: number;
  }> = [];
  readonly statsByCarrierCalls: Array<{ filter: CarrierStatsFilter; threshold: number }> = [];

  constructor(data: StubFlightRepositoryData = {}) {
    this.data = data;
  }

  async findDelayed(criteria: DelayedFlightCriteria): Promise<Page<Flight>> {
    this.findDelayedCalls.push(criteria);
    const items = [...(this.data.delayed ?? [])];
    const { limit, offset } = criteria.pagination;
    return { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
  }

  async statsForAirport(
    iata: IataCode,
    direction: TrafficDirection,
    policy: DelayPolicy,
  ): Promise<FlightStatsSnapshot> {
    this.statsForAirportCalls.push({
      iata: iata.value,
      direction,
      threshold: policy.thresholdMinutes,
    });
    return (
      this.data.airportStats?.[direction] ?? {
        total: 0,
        delayed: 0,
        cancelled: 0,
        diverted: 0,
        avgArrivalDelayMinutes: null,
      }
    );
  }

  async statsByCarrier(filter: CarrierStatsFilter, policy: DelayPolicy): Promise<CarrierStats[]> {
    this.statsByCarrierCalls.push({ filter, threshold: policy.thresholdMinutes });
    return [...(this.data.carrierStats ?? [])];
  }
}
