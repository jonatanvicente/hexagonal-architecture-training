// ENTRY POINT – REST API process
//   1. composition root builds the hexagon with its driven adapters
//   2. driving adapters are attached: HTTP (sync) and Kafka consumer (async)
//   3. graceful shutdown in reverse order
import { buildHttpServer } from '@usflights/adapter-http-rest';
import { FlightStatusKafkaConsumer } from '@usflights/adapter-kafka-consumer';
import { ConfigError, createContainer, loadConfig } from '@usflights/bootstrap';
import { registerFlightStatusFeedSimulator } from './flight-status-feed.simulator.ts';

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const container = await createContainer(config);
  const { ports, broker, rootLogger, logger } = container;

  // --- Driving adapter #1: REST API
  const http = buildHttpServer(ports, { logger: rootLogger });

  // --- Driving adapter #2: Kafka consumer
  const consumer = new FlightStatusKafkaConsumer(broker, ports.processFlightStatus, logger);
  consumer.start();

  // --- Outside-world simulator (airline feed + topic inspection)
  registerFlightStatusFeedSimulator(http, broker);

  await http.listen({ host: config.http.host, port: config.http.port });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');
    consumer.stop();
    await http.close();
    await container.dispose();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  const message =
    error instanceof ConfigError
      ? error.message
      : error instanceof Error
        ? error.stack
        : String(error);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
});
