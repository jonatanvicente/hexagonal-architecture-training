// COMPOSITION ROOT – manual dependency injection
//
// This is the ONLY module that imports both the hexagon and the concrete driven adapters.
// It plugs adapters into ports; the hexagon itself never `new`s an adapter.
// No DI framework on purpose: the wiring is the lesson.
import {
  AirportPostgresRepository,
  assertPostgresConnection,
  CarrierPostgresRepository,
  createPostgresPool,
  FlightPostgresRepository,
} from '@usflights/adapter-postgres';
import {
  createSeedData,
  InMemoryAirportRepository,
  InMemoryCarrierRepository,
  InMemoryFlightRepository,
} from '@usflights/adapter-in-memory';
import { KafkaEventPublisher } from '@usflights/adapter-kafka-producer';
import { SimulatedNotificationGateway } from '@usflights/adapter-notification';
import {
  createRootLogger,
  PinoLoggerAdapter,
  SystemClock,
  type Logger,
} from '@usflights/adapter-platform';
import { SimulatedRedisCache } from '@usflights/adapter-redis-cache';
import {
  FindDelayedFlightsService,
  GetAirportDelayStatsService,
  GetAirportService,
  GetCarrierPunctualityRankingService,
  ListAirportsService,
  ListCarriersService,
  ProcessFlightStatusService,
  type AirportRepository,
  type CarrierRepository,
  type FindDelayedFlightsUseCase,
  type FlightRepository,
  type GetAirportDelayStatsUseCase,
  type GetAirportUseCase,
  type GetCarrierPunctualityRankingUseCase,
  type ListAirportsUseCase,
  type ListCarriersUseCase,
  type LoggerPort,
  type ProcessFlightStatusUseCase,
} from '@usflights/application';
import { DelayPolicy } from '@usflights/domain';
import { InProcessKafkaBroker } from '@usflights/fake-kafka';
import type { AppConfig } from './config.ts';

/** The driving ports, typed as interfaces: driving adapters never see the concrete services. */
export interface DrivingPorts {
  readonly listAirports: ListAirportsUseCase;
  readonly getAirport: GetAirportUseCase;
  readonly getAirportDelayStats: GetAirportDelayStatsUseCase;
  readonly findDelayedFlights: FindDelayedFlightsUseCase;
  readonly listCarriers: ListCarriersUseCase;
  readonly getCarrierPunctualityRanking: GetCarrierPunctualityRankingUseCase;
  readonly processFlightStatus: ProcessFlightStatusUseCase;
}

export interface Container {
  readonly config: AppConfig;
  readonly rootLogger: Logger;
  readonly logger: LoggerPort;
  /** Simulated external infrastructure, exposed so apps can attach driving adapters/simulators. */
  readonly broker: InProcessKafkaBroker;
  readonly ports: DrivingPorts;
  dispose(): Promise<void>;
}

interface Persistence {
  readonly airports: AirportRepository;
  readonly carriers: CarrierRepository;
  readonly flights: FlightRepository;
  dispose(): Promise<void>;
}

export interface ContainerOptions {
  readonly logToStderr?: boolean;
}

export async function createContainer(
  config: AppConfig,
  options: ContainerOptions = {},
): Promise<Container> {
  const rootLogger = createRootLogger({
    level: config.logLevel,
    toStderr: options.logToStderr ?? false,
  });
  const logger = new PinoLoggerAdapter(rootLogger);

  // --- Driven adapters (right side of the hexagon)
  const persistence = await createPersistence(config, logger);
  const clock = new SystemClock();
  const cache = new SimulatedRedisCache(
    logger.child({ adapter: 'redis-cache' }),
    clock,
    config.cacheTtlSeconds,
  );
  const broker = new InProcessKafkaBroker(logger.child({ infra: 'fake-kafka' }));
  const publisher = new KafkaEventPublisher(broker, logger.child({ adapter: 'kafka-producer' }));
  const notifier = new SimulatedNotificationGateway(logger.child({ adapter: 'notification' }));

  // --- Domain policy, configured once
  const policy = new DelayPolicy(config.delayThresholdMinutes);

  // --- Use cases (the hexagon), receiving driven ports through their constructors
  const { airports, carriers, flights } = persistence;
  const ports: DrivingPorts = {
    listAirports: new ListAirportsService(airports),
    getAirport: new GetAirportService(airports),
    getAirportDelayStats: new GetAirportDelayStatsService(airports, flights, cache, policy),
    findDelayedFlights: new FindDelayedFlightsService(flights, policy),
    listCarriers: new ListCarriersService(carriers),
    getCarrierPunctualityRanking: new GetCarrierPunctualityRankingService(
      flights,
      carriers,
      cache,
      policy,
    ),
    processFlightStatus: new ProcessFlightStatusService({
      airports,
      carriers,
      publisher,
      notifier,
      clock,
      logger: logger.child({ useCase: 'ProcessFlightStatus' }),
      policy,
      opsRecipients: config.opsRecipients,
    }),
  };

  return {
    config,
    rootLogger,
    logger,
    broker,
    ports,
    dispose: () => persistence.dispose(),
  };
}

async function createPersistence(
  config: AppConfig,
  logger: PinoLoggerAdapter,
): Promise<Persistence> {
  if (config.persistence === 'memory' || !config.postgres) {
    const data = createSeedData();
    logger.info(
      {
        airports: data.airports.length,
        carriers: data.carriers.length,
        flights: data.flights.length,
      },
      'Persistence: IN-MEMORY driven adapter (simulated database)',
    );
    return {
      airports: new InMemoryAirportRepository(data),
      carriers: new InMemoryCarrierRepository(data),
      flights: new InMemoryFlightRepository(data),
      dispose: async () => {},
    };
  }

  const pool = createPostgresPool(config.postgres);
  await assertPostgresConnection(pool);
  logger.info(
    { host: config.postgres.host, port: config.postgres.port, database: config.postgres.database },
    'Persistence: POSTGRES driven adapter',
  );
  return {
    airports: new AirportPostgresRepository(pool),
    carriers: new CarrierPostgresRepository(pool),
    flights: new FlightPostgresRepository(pool),
    dispose: () => pool.end(),
  };
}
