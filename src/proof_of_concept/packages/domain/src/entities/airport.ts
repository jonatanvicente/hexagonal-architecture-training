// HEXAGON: inside – domain entity
import { ValidationError } from '../errors.ts';
import type { IataCode } from '../value-objects/iata-code.ts';

export interface GeoLocation {
  readonly latitude: number;
  readonly longitude: number;
}

export interface AirportProps {
  readonly iata: IataCode;
  readonly name: string;
  readonly city: string | null;
  readonly state: string | null;
  readonly country: string;
  readonly location: GeoLocation | null;
}

export class Airport {
  readonly iata: IataCode;
  readonly name: string;
  readonly city: string | null;
  readonly state: string | null;
  readonly country: string;
  readonly location: GeoLocation | null;

  private constructor(props: AirportProps) {
    this.iata = props.iata;
    this.name = props.name;
    this.city = props.city;
    this.state = props.state;
    this.country = props.country;
    this.location = props.location;
  }

  static create(props: AirportProps): Airport {
    const name = props.name.trim();
    if (name.length === 0) {
      throw new ValidationError(`Airport ${props.iata.value} must have a name`);
    }
    const loc = props.location;
    if (loc && (Math.abs(loc.latitude) > 90 || Math.abs(loc.longitude) > 180)) {
      throw new ValidationError(`Airport ${props.iata.value} has invalid coordinates`);
    }
    return new Airport({ ...props, name });
  }
}
