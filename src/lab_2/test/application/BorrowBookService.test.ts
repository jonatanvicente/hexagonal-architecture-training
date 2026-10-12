import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BorrowBookService } from "../../src/core/application/BorrowBookService";
import { BookId } from "../../src/core/domain/BookId";
import { BorrowNotAllowedError } from "../../src/core/domain/BorrowNotAllowedError";
import { Loan } from "../../src/core/domain/Loan";
import { MemberId } from "../../src/core/domain/MemberId";
import { LoanRepository } from "../../src/core/ports/out/LoanRepository";
import { MemberNotifier } from "../../src/core/ports/out/MemberNotifier";

// Simple in-memory fakes: no database, no email.
class FakeLoanRepository implements LoanRepository {
  readonly loans: Loan[] = [];

  nextId(): string {
    return `L-${this.loans.length + 1}`;
  }

  save(loan: Loan): void {
    this.loans.push(loan);
  }

  findOpenLoansOf(memberId: MemberId): Loan[] {
    return this.loans.filter((l) => l.memberId.equals(memberId) && l.isOpen());
  }
}

class FakeNotifier implements MemberNotifier {
  readonly notifications: string[] = [];

  notifyLoan(memberId: MemberId, bookId: BookId): void {
    this.notifications.push(`${memberId.value}:${bookId.value}`);
  }
}

describe("BorrowBookService", () => {
  it("rejects a 4th open loan for the same member", () => {
    const service = new BorrowBookService(new FakeLoanRepository(), new FakeNotifier());
    service.borrow(MemberId.of("M-1"), BookId.of("B-1"));
    service.borrow(MemberId.of("M-1"), BookId.of("B-2"));
    service.borrow(MemberId.of("M-1"), BookId.of("B-3"));

    assert.throws(
      () => service.borrow(MemberId.of("M-1"), BookId.of("B-4")),
      BorrowNotAllowedError,
    );
  });
});
