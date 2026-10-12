import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidIdError } from "../../src/core/domain/InvalidIdError";
import { MemberId } from "../../src/core/domain/MemberId";

describe("MemberId", () => {
  it("should create a MemberId from a valid value", () => {
    assert.equal(MemberId.of("M-42").value, "M-42");
  });

  it("should throw InvalidIdError for an invalid value", () => {
    for (const invalid of ["XYZ", "", "M-", "M-1a", "xM-1", "B-1"]) {
      assert.throws(() => MemberId.of(invalid), InvalidIdError, invalid);
    }
  });

  it("should be equal to another MemberId with the same value", () => {
    assert.ok(MemberId.of("M-1").equals(MemberId.of("M-1")));
    assert.ok(!MemberId.of("M-1").equals(MemberId.of("M-2")));
  });
});
