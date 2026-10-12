import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { BorrowBookService } from "../../src/core/application/BorrowBookService";
import { BookId } from "../../src/core/domain/BookId";
import { LoanNotAllowedError } from "../../src/core/domain/DomainError";
import { Loan } from "../../src/core/domain/Loan";
import { LoanPolicy } from "../../src/core/domain/LoanPolicy";
import { MemberId } from "../../src/core/domain/MemberId";
import { FakeLoanRepository } from "../fakes/FakeLoanRepository";
import { FakeMemberNotifier } from "../fakes/FakeMemberNotifier";

const TODAY = new Date("2026-01-01T10:00:00Z");
const member = MemberId.of("M-1");

let repository: FakeLoanRepository;
let notifier: FakeMemberNotifier;
let service: BorrowBookService;

function givenOpenLoans(count: number, openedOn: Date = TODAY): void {
  for (let i = 1; i <= count; i++) {
    repository.save(Loan.open(repository.nextId(), member, BookId.of(`B-${i}`), openedOn));
  }
}

describe("BorrowBookService", () => {
  beforeEach(() => {
    repository = new FakeLoanRepository();
    notifier = new FakeMemberNotifier();
    service = new BorrowBookService(repository, notifier, new LoanPolicy(), () => TODAY);
  });

  it("saves a valid loan and notifies the member", () => {
    const loan = service.borrow(member, BookId.of("B-100"));

    assert.equal(repository.loans.get(loan.id), loan);
    assert.deepEqual(notifier.notified, [loan]);
    assert.equal(loan.bookId.value, "B-100");
    assert.deepEqual(loan.dueDate, new Date("2026-01-15T10:00:00Z"));
  });

  it("rejects a 4th loan without saving or notifying", () => {
    givenOpenLoans(LoanPolicy.MAX_OPEN_LOANS);

    assert.throws(() => service.borrow(member, BookId.of("B-100")), LoanNotAllowedError);
    assert.equal(repository.loans.size, LoanPolicy.MAX_OPEN_LOANS);
    assert.equal(notifier.notified.length, 0);
  });

  it("rejects a member with an overdue loan", () => {
    givenOpenLoans(1, new Date("2025-11-01T10:00:00Z"));

    assert.throws(() => service.borrow(member, BookId.of("B-100")), LoanNotAllowedError);
    assert.equal(repository.loans.size, 1);
    assert.equal(notifier.notified.length, 0);
  });
});
