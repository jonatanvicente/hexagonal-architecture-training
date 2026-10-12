import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { BorrowBookService } from "../../src/core/application/BorrowBookService";
import { BookId } from "../../src/core/domain/BookId";
import { LoanNotAllowedError } from "../../src/core/domain/DomainError";
import { Loan } from "../../src/core/domain/Loan";
import { LoanPolicy } from "../../src/core/domain/LoanPolicy";
import { MemberId } from "../../src/core/domain/MemberId";
import { LoanRepository } from "../../src/core/ports/out/LoanRepository";
import { MemberNotifier } from "../../src/core/ports/out/MemberNotifier";
import { FakeLoanRepository } from "../fakes/FakeLoanRepository";
import { FakeMemberNotifier } from "../fakes/FakeMemberNotifier";

const TODAY = new Date("2026-01-01T10:00:00Z");
const member = MemberId.of("M-1");
const book = BookId.of("B-100");

function serviceWith(loans: LoanRepository, notifier: MemberNotifier): BorrowBookService {
  return new BorrowBookService(loans, notifier, new LoanPolicy(), () => TODAY);
}

describe("Test doubles for BorrowBookService", () => {
  it("[stub] rejects the loan when the repository returns 3 open loans", () => {
    const threeLoans = [1, 2, 3].map((i) => Loan.open(`L-${i}`, member, BookId.of(`B-${i}`), TODAY));
    const stubRepository: LoanRepository = {
      nextId: () => "L-99",
      save: () => {},
      findOpenLoansOf: () => threeLoans,
    };

    const service = serviceWith(stubRepository, new FakeMemberNotifier());

    assert.throws(() => service.borrow(member, book), LoanNotAllowedError);
  });

  it("[mock] notifies the member exactly once with the right memberId", () => {
    const notifyLoanOpened = mock.fn((_loan: Loan) => {});
    const mockNotifier: MemberNotifier = { notifyLoanOpened };

    serviceWith(new FakeLoanRepository(), mockNotifier).borrow(member, book);

    assert.equal(notifyLoanOpened.mock.callCount(), 1);
    assert.ok(notifyLoanOpened.mock.calls[0].arguments[0].memberId.equals(member));
  });

  it("[fake] stores the new open loan in the repository", () => {
    const fakeRepository = new FakeLoanRepository();

    const loan = serviceWith(fakeRepository, new FakeMemberNotifier()).borrow(member, book);

    assert.equal(fakeRepository.loans.size, 1);
    assert.equal(fakeRepository.loans.get(loan.id), loan);
    assert.deepEqual(fakeRepository.findOpenLoansOf(member), [loan]);
  });

  // Characterization test: documents CURRENT behaviour, which is a known defect (see TESTING.md).
  // The loan is persisted before notifying, and nothing undoes it when the notifier fails.
  it("[failing stub] keeps the loan saved even when the notification fails", (t) => {
    const fakeRepository = new FakeLoanRepository();
    const failingNotifier: MemberNotifier = {
      notifyLoanOpened: () => {
        throw new Error("SMTP down");
      },
    };

    const service = serviceWith(fakeRepository, failingNotifier);

    assert.throws(() => service.borrow(member, book), /SMTP down/);
    t.diagnostic('notification failed: "SMTP down" was thrown to the caller');
    for (const loan of fakeRepository.loans.values()) {
      t.diagnostic(
        `still persisted: ${loan.id} ${loan.memberId.value} ${loan.bookId.value} ${loan.status}`,
      );
    }
    assert.equal(fakeRepository.loans.size, 1);
    assert.equal(fakeRepository.findOpenLoansOf(member).length, 1);
  });
});
