// INTEGRATION (driven adapter) – the simulated gateway must record what a real one would send.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RecordingLogger } from '@usflights/application/testing';
import { SimulatedNotificationGateway } from './index.ts';

describe('SimulatedNotificationGateway', () => {
  it('should keep sent notifications in the outbox and log them per channel', async () => {
    const logger = new RecordingLogger();
    const gateway = new SimulatedNotificationGateway(logger);

    await gateway.send({ channel: 'SMS', recipient: '+1-555', subject: 's', body: 'b' });

    assert.equal(gateway.outbox().length, 1);
    assert.equal(gateway.outbox()[0]?.recipient, '+1-555');
    assert.ok(gateway.outbox()[0]?.sentAt);
    assert.equal(logger.entries[0]?.message, '[SIMULATED SMS] notification sent');
  });
});
