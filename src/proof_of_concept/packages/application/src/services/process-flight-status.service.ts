// HEXAGON: inside – use case implementation (write-side / event-driven flow)
//
//   [driving] Kafka consumer ──► ProcessFlightStatusUseCase ──► DelayPolicy (domain)
//                                        │
//                                        ├──► EventPublisherPort  ──► [driven] Kafka producer
//                                        └──► NotificationPort    ──► [driven] e-mail / SMS gateway
import {
  CarrierCode,
  Delay,
  DELAY_CAUSES,
  IataCode,
  NotFoundError,
  ValidationError,
  type DelayCause,
  type DelayPolicy,
  type FlightDelayDetected,
} from '@usflights/domain';
import type {
  ProcessFlightStatusCommand,
  ProcessFlightStatusResult,
  ProcessFlightStatusUseCase,
} from '../ports/in/process-flight-status.port.ts';
import type { AirportRepository } from '../ports/out/airport-repository.port.ts';
import type { CarrierRepository } from '../ports/out/carrier-repository.port.ts';
import type { ClockPort } from '../ports/out/clock.port.ts';
import type { EventPublisherPort } from '../ports/out/event-publisher.port.ts';
import type { LoggerPort } from '../ports/out/logger.port.ts';
import type { NotificationPort } from '../ports/out/notification.port.ts';
import { parseInstant } from '../shared/input-parsing.ts';

export interface ProcessFlightStatusDeps {
  readonly airports: AirportRepository;
  readonly carriers: CarrierRepository;
  readonly publisher: EventPublisherPort;
  readonly notifier: NotificationPort;
  readonly clock: ClockPort;
  readonly logger: LoggerPort;
  readonly policy: DelayPolicy;
  readonly opsRecipients: readonly string[];
}

export class ProcessFlightStatusService implements ProcessFlightStatusUseCase {
  private readonly deps: ProcessFlightStatusDeps;

  constructor(deps: ProcessFlightStatusDeps) {
    this.deps = deps;
  }

  async execute(command: ProcessFlightStatusCommand): Promise<ProcessFlightStatusResult> {
    const { airports, carriers, publisher, notifier, clock, logger, policy } = this.deps;

    const carrier = CarrierCode.of(command.carrier);
    const origin = IataCode.of(command.origin);
    const destination = IataCode.of(command.destination);
    const flightNumber = command.flightNumber.trim();
    if (!/^\d{1,5}$/.test(flightNumber)) {
      throw new ValidationError(`Invalid flight number '${command.flightNumber}'`);
    }
    const causes = parseCauses(command.causes);
    const scheduledArrival = parseInstant(command.scheduledArrival, 'scheduledArrival');
    const actualArrival = parseInstant(command.actualArrival, 'actualArrival');

    // Referential checks through driven ports: the event must talk about things we know.
    const [knownCarrier, knownOrigin, knownDestination] = await Promise.all([
      carriers.findByCode(carrier),
      airports.findByIata(origin),
      airports.findByIata(destination),
    ]);
    if (!knownCarrier) throw new NotFoundError('Carrier', carrier.value);
    if (!knownOrigin) throw new NotFoundError('Airport', origin.value);
    if (!knownDestination) throw new NotFoundError('Airport', destination.value);

    const delay = Delay.between(scheduledArrival, actualArrival);
    const delayMinutes = delay.minutes ?? 0;
    const flightLabel = `${carrier.value}${flightNumber} ${origin.value}->${destination.value}`;

    if (!policy.isDelayed(delay)) {
      logger.info({ flight: flightLabel, delayMinutes }, 'Flight status processed: ON TIME');
      return {
        status: 'ON_TIME',
        delayMinutes,
        thresholdMinutes: policy.thresholdMinutes,
        eventId: null,
      };
    }

    const event: FlightDelayDetected = {
      type: 'FlightDelayDetected',
      eventId: crypto.randomUUID(),
      occurredAt: clock.now().toISOString(),
      carrier: carrier.value,
      flightNumber,
      origin: origin.value,
      destination: destination.value,
      scheduledArrival: scheduledArrival.toISOString(),
      actualArrival: actualArrival.toISOString(),
      delayMinutes,
      thresholdMinutes: policy.thresholdMinutes,
      causes,
    };

    logger.info({ flight: flightLabel, delayMinutes }, 'Flight status processed: DELAYED');
    await publisher.publish(event);
    await Promise.all(
      this.deps.opsRecipients.map((recipient) =>
        notifier.send({
          channel: recipient.includes('@') ? 'EMAIL' : 'SMS',
          recipient,
          subject: `Delay alert ${carrier.value}${flightNumber}`,
          body:
            `${knownCarrier.name} flight ${flightNumber} from ${knownOrigin.name} to ` +
            `${knownDestination.name} arrived ${delayMinutes} min late` +
            (causes.length ? ` (causes: ${causes.join(', ')})` : '') +
            '.',
        }),
      ),
    );

    return {
      status: 'DELAYED',
      delayMinutes,
      thresholdMinutes: policy.thresholdMinutes,
      eventId: event.eventId,
    };
  }
}

function parseCauses(raw: readonly string[] | undefined): DelayCause[] {
  if (!raw) return [];
  return raw.map((value) => {
    const cause = value.trim().toUpperCase();
    if (!(DELAY_CAUSES as readonly string[]).includes(cause)) {
      throw new ValidationError(
        `Unknown delay cause '${value}'. Allowed: ${DELAY_CAUSES.join(', ')}`,
      );
    }
    return cause as DelayCause;
  });
}
