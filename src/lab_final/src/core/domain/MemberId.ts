import { InvalidValueError } from "./DomainError";

export class MemberId {
  private static readonly FORMAT = /^M-\d+$/;

  private constructor(readonly value: string) {}

  static of(value: string): MemberId {
    if (!MemberId.FORMAT.test(value)) {
      throw new InvalidValueError(`Invalid member id: "${value}" (expected M-<number>)`);
    }
    return new MemberId(value);
  }

  equals(other: MemberId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
