import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { BorrowBookService } from "../../src/core/application/BorrowBookService";
import { BookId } from "../../src/core/domain/BookId";
import { LoanNotAllowedError } from "../../src/core/domain/DomainError";
import { Loan } from "../../src/core/domain/Loan";
import { MemberId } from "../../src/core/domain/MemberId";
import { LoanRepository } from "../../src/core/ports/out/LoanRepository";
import { MemberNotifier } from "../../src/core/ports/out/MemberNotifier";
import { FakeLoanRepository } from "../fakes/FakeLoanRepository";
import { FakeMemberNotifier } from "../fakes/FakeMemberNotifier";

const TODAY = new Date("2026-01-01T10:00:00Z");
const member = MemberId.of("M-1");
const book = BookId.of("B-1");

describe("Test doubles", () => {
  it("STUB: a repository that always returns 3 open loans makes borrowing fail", () => {
    const threeLoans = [1, 2, 3].map((i) => Loan.open(`L-${i}`, member, BookId.of(`B-${i}`), TODAY));
    const stubRepository: LoanRepository = {
      nextId: () => "L-99",
      save: () => {},
      findOpenLoansOf: () => threeLoans,
    };
    const service = new BorrowBookService(stubRepository, new FakeMemberNotifier(), undefined, () => TODAY);

    assert.throws(() => service.borrow(member, book), LoanNotAllowedError);
  });

  it("MOCK: the notifier is called once with the right member", () => {
    const notifyLoanOpened = mock.fn((_loan: Loan) => {});
    const mockNotifier: MemberNotifier = { notifyLoanOpened };
    const service = new BorrowBookService(new FakeLoanRepository(), mockNotifier, undefined, () => TODAY);

    service.borrow(member, book);

    assert.equal(notifyLoanOpened.mock.callCount(), 1);
    assert.ok(notifyLoanOpened.mock.calls[0].arguments[0].memberId.equals(member));
  });

  it("FAKE: the in-memory repository keeps the saved loan", () => {
    const loans = new FakeLoanRepository();
    const service = new BorrowBookService(loans, new FakeMemberNotifier(), undefined, () => TODAY);

    service.borrow(member, book);

    assert.equal(loans.findOpenLoansOf(member).length, 1);
  });

  it("FAILING STUB: the loan is saved even when the notification fails (dual-write pitfall)", () => {
    const loans = new FakeLoanRepository();
    const failingNotifier: MemberNotifier = {
      notifyLoanOpened: () => {
        throw new Error("SMTP down");
      },
    };
    const service = new BorrowBookService(loans, failingNotifier, undefined, () => TODAY);

    assert.throws(() => service.borrow(member, book), /SMTP down/);
    // Known problem, solved in Module 5 (Transactional Outbox):
    assert.equal(loans.findOpenLoansOf(member).length, 1);
  });
});
