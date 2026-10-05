// HEXAGON: inside – public API of the domain package
export { DomainError, NotFoundError, ValidationError } from './errors.ts';

export { CarrierCode } from './value-objects/carrier-code.ts';
export { Delay } from './value-objects/delay.ts';
export { FlightDate } from './value-objects/flight-date.ts';
export { IataCode } from './value-objects/iata-code.ts';

export { DelayPolicy, FAA_DELAY_THRESHOLD_MINUTES } from './policies/delay-policy.ts';

export { Airport, type AirportProps, type GeoLocation } from './entities/airport.ts';
export { Carrier } from './entities/carrier.ts';
export {
  DELAY_CAUSES,
  Flight,
  type DelayCause,
  type FlightProps,
  type FlightStatus,
} from './entities/flight.ts';

export {
  PunctualityReport,
  rankByPunctuality,
  type FlightStatsSnapshot,
} from './services/punctuality.ts';

export type { DomainEvent, FlightDelayDetected } from './events/flight-delay-detected.ts';
