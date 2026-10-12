import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BookId } from "../../src/core/domain/BookId";
import { InvalidValueError } from "../../src/core/domain/DomainError";

describe("BookId", () => {
  it("is created from a valid value", () => {
    assert.equal(BookId.of("B-100").value, "B-100");
  });

  it("rejects an invalid value", () => {
    assert.throws(() => BookId.of("M-1"), InvalidValueError);
  });

  it("is equal to another BookId with the same value", () => {
    assert.ok(BookId.of("B-1").equals(BookId.of("B-1")));
    assert.ok(!BookId.of("B-1").equals(BookId.of("B-2")));
  });
});
