import { InvalidIdError } from "./InvalidIdError";

const FORMAT = /^B-\d+$/;

export class BookId {
  private constructor(readonly value: string) {}

  static of(value: string): BookId {
    if (!FORMAT.test(value)) {
      throw new InvalidIdError("BookId", value, "B-<number>");
    }
    return new BookId(value);
  }

  equals(other: BookId): boolean {
    return this.value === other.value;
  }
}
