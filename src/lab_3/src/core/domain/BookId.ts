import { InvalidValueError } from "./DomainError";

export class BookId {
  private static readonly FORMAT = /^B-\d+$/;

  private constructor(readonly value: string) {}

  static of(value: string): BookId {
    if (!BookId.FORMAT.test(value)) {
      throw new InvalidValueError(`Invalid book id: "${value}" (expected B-<number>)`);
    }
    return new BookId(value);
  }

  equals(other: BookId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
