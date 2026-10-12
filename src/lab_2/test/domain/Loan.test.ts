import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BookId } from "../../src/core/domain/BookId";
import { Loan } from "../../src/core/domain/Loan";
import { LoanAlreadyClosedError } from "../../src/core/domain/LoanAlreadyClosedError";
import { MemberId } from "../../src/core/domain/MemberId";

const today = new Date(2026, 0, 1);
const openLoan = () => Loan.open("L-1", MemberId.of("M-1"), BookId.of("B-1"), today);

describe("Loan", () => {
  it("should set the due date 14 days after the opening date", () => {
    assert.deepEqual(openLoan().dueDate, new Date(2026, 0, 15));
  });

  it("should close an open loan", () => {
    const loan = openLoan();
    loan.close();
    assert.equal(loan.status, "CLOSED");
  });

  it("should throw LoanAlreadyClosedError when closing a loan twice", () => {
    const loan = openLoan();
    loan.close();
    assert.throws(() => loan.close(), LoanAlreadyClosedError);
  });

  it("should be overdue after its due date but not on it", () => {
    const loan = openLoan();
    assert.equal(loan.isOverdue(new Date(2026, 0, 15)), false);
    assert.equal(loan.isOverdue(new Date(2026, 0, 16)), true);
  });
});
