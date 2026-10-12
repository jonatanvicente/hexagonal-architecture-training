import { InvalidIdError } from "./InvalidIdError";

const FORMAT = /^M-\d+$/;

export class MemberId {
  private constructor(readonly value: string) {}

  static of(value: string): MemberId {
    if (!FORMAT.test(value)) {
      throw new InvalidIdError("MemberId", value, "M-<number>");
    }
    return new MemberId(value);
  }

  equals(other: MemberId): boolean {
    return this.value === other.value;
  }
}
