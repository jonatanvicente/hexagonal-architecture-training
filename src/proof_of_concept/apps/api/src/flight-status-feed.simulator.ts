// OUTSIDE WORLD SIMULATOR – not part of the hexagon, not an adapter.
// Plays the role of the airline operations system that publishes to the `flight-status` topic,
// plus a "kafka-console-consumer" to inspect topics. Exposed over HTTP only for demo convenience.
import { FLIGHT_STATUS_TOPIC, type FlightStatusMessage } from '@usflights/adapter-kafka-consumer';
import type { InProcessKafkaBroker } from '@usflights/fake-kafka';
import type { FastifyInstance } from 'fastify';

interface SimulateBody {
  airline?: string;
  flight?: string;
  from?: string;
  to?: string;
  delayMinutes?: number;
  delayReasons?: string[];
  /** Send the raw string as the message value (to demo the DLQ with malformed payloads). */
  rawValue?: string;
}

export function registerFlightStatusFeedSimulator(
  app: FastifyInstance,
  broker: InProcessKafkaBroker,
): void {
  app.post<{ Body: SimulateBody | undefined }>(
    '/simulate/flight-status',
    {
      schema: {
        body: {
          type: ['object', 'null'],
          properties: {
            airline: { type: 'string' },
            flight: { type: 'string' },
            from: { type: 'string' },
            to: { type: 'string' },
            delayMinutes: { type: 'integer' },
            delayReasons: { type: 'array', items: { type: 'string' } },
            rawValue: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = request.body ?? {};
      const scheduled = new Date();
      scheduled.setUTCSeconds(0, 0);
      const actual = new Date(scheduled.getTime() + (body.delayMinutes ?? 45) * 60_000);

      const message: FlightStatusMessage = {
        airline: body.airline ?? 'AA',
        flight: body.flight ?? '100',
        from: body.from ?? 'JFK',
        to: body.to ?? 'LAX',
        schedArr: scheduled.toISOString(),
        actualArr: actual.toISOString(),
        ...(body.delayReasons ? { delayReasons: body.delayReasons } : {}),
      };
      const value = body.rawValue ?? JSON.stringify(message);
      const produced = await broker.produce(FLIGHT_STATUS_TOPIC, {
        key: `${message.airline}${message.flight}`,
        value,
        headers: { source: 'airline-ops-simulator' },
      });

      return reply.status(202).send({
        accepted: true,
        note: 'Processed asynchronously – watch the logs, then GET /simulate/topics/flight-delays',
        topic: produced.topic,
        offset: produced.offset,
        message: body.rawValue ?? message,
      });
    },
  );

  app.get('/simulate/topics', async () => ({ topics: broker.topics() }));

  app.get<{ Params: { topic: string } }>('/simulate/topics/:topic', async (request) => ({
    topic: request.params.topic,
    messages: broker.readTopic(request.params.topic).map((m) => ({
      ...m,
      value: tryParse(m.value),
    })),
  }));
}

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
