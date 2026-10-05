// UNIT – the in-process broker that stands in for Kafka. Other adapter tests rely on it,
// so its semantics (offsets, async delivery, isolation of failures) are pinned down here.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InProcessKafkaBroker, type KafkaMessage } from './index.ts';

const silent = { debug: () => {}, error: () => {} };
const tick = () => new Promise((resolve) => setImmediate(resolve));

describe('InProcessKafkaBroker', () => {
  it('should assign increasing offsets per topic', async () => {
    const broker = new InProcessKafkaBroker(silent);
    const a = await broker.produce('t', { value: '1' });
    const b = await broker.produce('t', { value: '2' });
    const other = await broker.produce('u', { value: '3' });
    assert.deepEqual([a.offset, b.offset, other.offset], [0, 1, 0]);
  });

  it('should deliver asynchronously, after produce() resolves', async () => {
    const broker = new InProcessKafkaBroker(silent);
    const received: KafkaMessage[] = [];
    broker.subscribe('t', 'g', async (m) => {
      received.push(m);
    });

    await broker.produce('t', { key: 'k', value: 'v' });
    assert.equal(received.length, 0, 'not delivered synchronously');
    await tick();
    assert.equal(received[0]?.key, 'k');
  });

  it('should fan out to every subscriber of the topic', async () => {
    const broker = new InProcessKafkaBroker(silent);
    let count = 0;
    broker.subscribe('t', 'g1', async () => void count++);
    broker.subscribe('t', 'g2', async () => void count++);
    await broker.produce('t', { value: 'v' });
    await tick();
    assert.equal(count, 2);
  });

  it('should stop delivering after unsubscribe', async () => {
    const broker = new InProcessKafkaBroker(silent);
    let count = 0;
    const unsubscribe = broker.subscribe('t', 'g', async () => void count++);
    unsubscribe();
    await broker.produce('t', { value: 'v' });
    await tick();
    assert.equal(count, 0);
  });

  it('should isolate a failing handler and log the error', async () => {
    const errors: string[] = [];
    const broker = new InProcessKafkaBroker({ debug: () => {}, error: (_c, m) => errors.push(m) });
    broker.subscribe('t', 'g', async () => {
      throw new Error('boom');
    });
    await broker.produce('t', { value: 'v' });
    await tick();
    await tick();
    assert.deepEqual(errors, ['[FAKE KAFKA] consumer handler failed']);
  });

  it('should keep the topic log readable and list topics sorted', async () => {
    const broker = new InProcessKafkaBroker(silent);
    await broker.produce('b', { value: '1' });
    await broker.produce('a', { value: '2' });
    assert.deepEqual(broker.topics(), ['a', 'b']);
    assert.equal(broker.readTopic('b')[0]?.value, '1');
    assert.deepEqual(broker.readTopic('missing'), []);
  });
});
