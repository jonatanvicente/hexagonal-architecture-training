import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BookId } from "../../src/core/domain/BookId";
import { Loan } from "../../src/core/domain/Loan";
import { LoanPolicy } from "../../src/core/domain/LoanPolicy";
import { MemberId } from "../../src/core/domain/MemberId";

const TODAY = new Date("2026-01-01T10:00:00Z");
const policy = new LoanPolicy();

function loansOpenedOn(date: Date, count: number): Loan[] {
  return Array.from({ length: count }, (_, i) =>
    Loan.open(`L-${i + 1}`, MemberId.of("M-1"), BookId.of(`B-${i + 1}`), date),
  );
}

describe("LoanPolicy", () => {
  it("allows borrowing under the limit", () => {
    assert.equal(policy.canBorrow(loansOpenedOn(TODAY, 2), TODAY), true);
  });

  it("rejects borrowing at the limit", () => {
    assert.equal(policy.canBorrow(loansOpenedOn(TODAY, 3), TODAY), false);
  });

  it("rejects borrowing with an overdue loan", () => {
    const longAgo = new Date("2025-11-01T10:00:00Z");
    assert.equal(policy.canBorrow(loansOpenedOn(longAgo, 1), TODAY), false);
  });
});
