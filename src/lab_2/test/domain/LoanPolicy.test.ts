import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BookId } from "../../src/core/domain/BookId";
import { Loan } from "../../src/core/domain/Loan";
import { LoanPolicy } from "../../src/core/domain/LoanPolicy";
import { MemberId } from "../../src/core/domain/MemberId";

const today = new Date(2026, 0, 31);
const policy = new LoanPolicy();
const loanOpenedOn = (openedOn: Date, n = 1) =>
  Loan.open(`L-${n}`, MemberId.of("M-1"), BookId.of(`B-${n}`), openedOn);
const recentLoans = (count: number) =>
  Array.from({ length: count }, (_, i) => loanOpenedOn(new Date(2026, 0, 30), i + 1));

describe("LoanPolicy", () => {
  it("should allow borrowing when the member is under the limit", () => {
    assert.equal(policy.canBorrow(recentLoans(2), today), true);
  });

  it("should reject borrowing when the member is at the limit", () => {
    assert.equal(policy.canBorrow(recentLoans(3), today), false);
  });

  it("should reject borrowing when the member has an overdue loan", () => {
    const overdue = loanOpenedOn(new Date(2026, 0, 1)); // due Jan 15
    assert.equal(policy.canBorrow([overdue], today), false);
  });
});
