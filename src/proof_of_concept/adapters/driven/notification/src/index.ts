// HEXAGON: outside – DRIVEN adapter implementing the NotificationPort
// SIMULATED gateway: logs instead of calling SendGrid / Twilio / SES.
// Keeps an outbox so the demo can show what "was sent".
import type { LoggerPort, Notification, NotificationPort } from '@usflights/application';

export interface SentNotification extends Notification {
  readonly sentAt: string;
}

export class SimulatedNotificationGateway implements NotificationPort {
  private readonly logger: LoggerPort;
  private readonly sent: SentNotification[] = [];

  constructor(logger: LoggerPort) {
    this.logger = logger;
  }

  async send(notification: Notification): Promise<void> {
    this.sent.push({ ...notification, sentAt: new Date().toISOString() });
    this.logger.info(
      {
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        body: notification.body,
      },
      `[SIMULATED ${notification.channel}] notification sent`,
    );
  }

  outbox(): readonly SentNotification[] {
    return this.sent;
  }
}
