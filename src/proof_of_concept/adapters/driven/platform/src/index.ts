// HEXAGON: outside – DRIVEN adapters for cross-cutting ports
import type { ClockPort, LoggerPort } from '@usflights/application';
import { pino, type Logger, type LevelWithSilent } from 'pino';

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}

export interface RootLoggerOptions {
  readonly level: LevelWithSilent;
  /** CLI apps log to stderr so stdout stays clean for command output. */
  readonly toStderr?: boolean;
}

export function createRootLogger(options: RootLoggerOptions): Logger {
  return pino(
    { level: options.level, base: { app: 'usflights-hexagonal-poc' } },
    pino.destination(options.toStderr ? 2 : 1),
  );
}

/** Adapts pino to the LoggerPort the hexagon understands. */
export class PinoLoggerAdapter implements LoggerPort {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  child(bindings: Record<string, unknown>): PinoLoggerAdapter {
    return new PinoLoggerAdapter(this.logger.child(bindings));
  }

  debug(context: Record<string, unknown>, message: string): void {
    this.logger.debug(context, message);
  }

  info(context: Record<string, unknown>, message: string): void {
    this.logger.info(context, message);
  }

  warn(context: Record<string, unknown>, message: string): void {
    this.logger.warn(context, message);
  }

  error(context: Record<string, unknown>, message: string): void {
    this.logger.error(context, message);
  }
}

export type { Logger, LevelWithSilent };
