import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BookId } from "../../src/core/domain/BookId";
import { LoanAlreadyClosedError } from "../../src/core/domain/DomainError";
import { Loan } from "../../src/core/domain/Loan";
import { MemberId } from "../../src/core/domain/MemberId";

const TODAY = new Date("2026-01-01T10:00:00Z");

function openLoan(): Loan {
  return Loan.open("L-1", MemberId.of("M-1"), BookId.of("B-1"), TODAY);
}

describe("Loan", () => {
  it("has a due date 14 days after it is opened", () => {
    assert.deepEqual(openLoan().dueDate, new Date("2026-01-15T10:00:00Z"));
  });

  it("can be closed when open", () => {
    const loan = openLoan();
    loan.close();
    assert.equal(loan.status, "CLOSED");
  });

  it("cannot be closed twice", () => {
    const loan = openLoan();
    loan.close();
    assert.throws(() => loan.close(), LoanAlreadyClosedError);
  });

  it("is overdue after its due date", () => {
    const loan = openLoan();
    assert.equal(loan.isOverdue(new Date("2026-01-15T10:00:00Z")), false);
    assert.equal(loan.isOverdue(new Date("2026-01-16T10:00:00Z")), true);
  });
});
