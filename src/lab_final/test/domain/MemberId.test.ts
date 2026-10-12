import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvalidValueError } from "../../src/core/domain/DomainError";
import { MemberId } from "../../src/core/domain/MemberId";

describe("MemberId", () => {
  it("is created from a valid value", () => {
    assert.equal(MemberId.of("M-1").value, "M-1");
  });

  it("rejects an invalid value", () => {
    assert.throws(() => MemberId.of("XYZ"), InvalidValueError);
  });

  it("is equal to another MemberId with the same value", () => {
    assert.ok(MemberId.of("M-1").equals(MemberId.of("M-1")));
    assert.ok(!MemberId.of("M-1").equals(MemberId.of("M-2")));
  });
});
