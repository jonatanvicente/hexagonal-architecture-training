import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BookId } from "../../src/core/domain/BookId";
import { InvalidIdError } from "../../src/core/domain/InvalidIdError";

describe("BookId", () => {
  it("should create a BookId from a valid value", () => {
    assert.equal(BookId.of("B-42").value, "B-42");
  });

  it("should throw InvalidIdError for an invalid value", () => {
    for (const invalid of ["XYZ", "", "B-", "B-1a", "xB-1", "M-1"]) {
      assert.throws(() => BookId.of(invalid), InvalidIdError, invalid);
    }
  });

  it("should be equal to another BookId with the same value", () => {
    assert.ok(BookId.of("B-1").equals(BookId.of("B-1")));
    assert.ok(!BookId.of("B-1").equals(BookId.of("B-2")));
  });
});
