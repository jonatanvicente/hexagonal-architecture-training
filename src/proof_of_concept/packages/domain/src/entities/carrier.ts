// HEXAGON: inside – domain entity
import type { CarrierCode } from '../value-objects/carrier-code.ts';

export class Carrier {
  readonly code: CarrierCode;
  readonly name: string;

  private constructor(code: CarrierCode, name: string) {
    this.code = code;
    this.name = name;
  }

  static create(code: CarrierCode, name: string): Carrier {
    return new Carrier(code, name.trim() || code.value);
  }
}
