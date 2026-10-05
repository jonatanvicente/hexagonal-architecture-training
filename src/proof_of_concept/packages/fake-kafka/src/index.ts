// HEXAGON: outside – infrastructure (plays the role of a Kafka cluster)
// Not an adapter and not part of the hexagon: it is the "external system" the Kafka adapters
// talk to. A real deployment replaces it with kafkajs / @confluentinc/kafka-javascript.

export interface KafkaMessage {
  readonly topic: string;
  readonly partition: number;
  readonly offset: number;
  readonly key: string | null;
  readonly value: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly timestamp: string;
}

export interface ProduceRequest {
  readonly key?: string | null;
  readonly value: string;
  readonly headers?: Record<string, string>;
}

export type MessageHandler = (message: KafkaMessage) => Promise<void>;

export interface BrokerLogger {
  debug(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
}

interface Subscription {
  readonly groupId: string;
  readonly handler: MessageHandler;
}

export class InProcessKafkaBroker {
  private readonly log = new Map<string, KafkaMessage[]>();
  private readonly subscriptions = new Map<string, Subscription[]>();
  private readonly logger: BrokerLogger;

  constructor(logger: BrokerLogger) {
    this.logger = logger;
  }

  /** Appends to the topic log and delivers asynchronously, like a real broker. */
  async produce(topic: string, request: ProduceRequest): Promise<KafkaMessage> {
    const messages = this.log.get(topic) ?? [];
    const message: KafkaMessage = {
      topic,
      partition: 0,
      offset: messages.length,
      key: request.key ?? null,
      value: request.value,
      headers: request.headers ?? {},
      timestamp: new Date().toISOString(),
    };
    messages.push(message);
    this.log.set(topic, messages);
    this.logger.debug({ topic, offset: message.offset, key: message.key }, '[FAKE KAFKA] produced');

    for (const subscription of this.subscriptions.get(topic) ?? []) {
      setImmediate(() => {
        subscription.handler(message).catch((error: unknown) => {
          // A real consumer would not commit the offset; here we just surface the failure.
          this.logger.error(
            { topic, offset: message.offset, groupId: subscription.groupId, err: error },
            '[FAKE KAFKA] consumer handler failed',
          );
        });
      });
    }
    return message;
  }

  /** Returns an unsubscribe function. */
  subscribe(topic: string, groupId: string, handler: MessageHandler): () => void {
    const subscription: Subscription = { groupId, handler };
    this.subscriptions.set(topic, [...(this.subscriptions.get(topic) ?? []), subscription]);
    return () => {
      const remaining = (this.subscriptions.get(topic) ?? []).filter((s) => s !== subscription);
      this.subscriptions.set(topic, remaining);
    };
  }

  /** Inspection helper for the demo (like `kafka-console-consumer --from-beginning`). */
  readTopic(topic: string): readonly KafkaMessage[] {
    return this.log.get(topic) ?? [];
  }

  topics(): string[] {
    return [...this.log.keys()].sort();
  }
}
