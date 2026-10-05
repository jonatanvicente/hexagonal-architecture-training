// UNIT – domain entities and their invariants.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ValidationError } from '../errors.ts';
import { DelayPolicy } from '../policies/delay-policy.ts';
import { CarrierCode } from '../value-objects/carrier-code.ts';
import { Delay } from '../value-objects/delay.ts';
import { FlightDate } from '../value-objects/flight-date.ts';
import { IataCode } from '../value-objects/iata-code.ts';
import { Airport } from './airport.ts';
import { Carrier } from './carrier.ts';
import { Flight, type FlightProps } from './flight.ts';

const policy = new DelayPolicy(15);

function flight(overrides: Partial<FlightProps> = {}): Flight {
  return Flight.create({
    id: 1,
    date: FlightDate.of(2005, 1, 1),
    carrier: CarrierCode.of('AA'),
    flightNumber: '100',
    tailNumber: null,
    origin: IataCode.of('JFK'),
    destination: IataCode.of('LAX'),
    scheduledDeparture: 900,
    actualDeparture: 900,
    scheduledArrival: 1200,
    actualArrival: 1200,
    departureDelay: Delay.ofMinutes(0),
    arrivalDelay: Delay.ofMinutes(0),
    distanceMiles: 2475,
    cancelled: false,
    diverted: false,
    delayCauses: [],
    ...overrides,
  });
}

describe('Flight.status', () => {
  it('should be ON_TIME below the policy threshold', () => {
    assert.equal(flight({ arrivalDelay: Delay.ofMinutes(14) }).status(policy), 'ON_TIME');
  });

  it('should be DELAYED at or above the policy threshold', () => {
    assert.equal(flight({ arrivalDelay: Delay.ofMinutes(15) }).status(policy), 'DELAYED');
  });

  it('should be CANCELLED even when a delay is recorded (cancellation wins)', () => {
    const cancelled = flight({ cancelled: true, arrivalDelay: Delay.ofMinutes(300) });
    assert.equal(cancelled.status(policy), 'CANCELLED');
    assert.equal(cancelled.isDelayed(policy), false);
  });

  it('should be DIVERTED and not counted as delayed', () => {
    const diverted = flight({ diverted: true, arrivalDelay: Delay.ofMinutes(90) });
    assert.equal(diverted.status(policy), 'DIVERTED');
    assert.equal(diverted.isDelayed(policy), false);
  });

  it('should depend on the policy, not on a hardcoded number', () => {
    const f = flight({ arrivalDelay: Delay.ofMinutes(30) });
    assert.equal(f.status(new DelayPolicy(15)), 'DELAYED');
    assert.equal(f.status(new DelayPolicy(45)), 'ON_TIME');
  });
});

describe('Airport.create', () => {
  const base = {
    iata: IataCode.of('JFK'),
    name: 'John F Kennedy Intl',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    location: { latitude: 40.6, longitude: -73.7 },
  };

  it('should trim the name', () => {
    assert.equal(Airport.create({ ...base, name: '  Thigpen  ' }).name, 'Thigpen');
  });

  it('should reject an empty name', () => {
    assert.throws(() => Airport.create({ ...base, name: '   ' }), ValidationError);
  });

  it('should reject coordinates outside the globe', () => {
    assert.throws(
      () => Airport.create({ ...base, location: { latitude: 91, longitude: 0 } }),
      ValidationError,
    );
  });

  it('should accept an airport without coordinates', () => {
    assert.equal(Airport.create({ ...base, location: null }).location, null);
  });
});

describe('Carrier.create', () => {
  it('should fall back to the code when the name is blank', () => {
    assert.equal(Carrier.create(CarrierCode.of('ZZ'), '  ').name, 'ZZ');
  });
});
