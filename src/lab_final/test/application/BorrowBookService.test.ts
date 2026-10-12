import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BorrowBookService } from "../../src/core/application/BorrowBookService";
import { BookId } from "../../src/core/domain/BookId";
import { LoanNotAllowedError } from "../../src/core/domain/DomainError";
import { LoanPolicy } from "../../src/core/domain/LoanPolicy";
import { MemberId } from "../../src/core/domain/MemberId";
import { FakeLoanRepository } from "../fakes/FakeLoanRepository";
import { FakeMemberNotifier } from "../fakes/FakeMemberNotifier";

const TODAY = new Date("2026-01-01T10:00:00Z");
const member = MemberId.of("M-1");

function setup(today: Date = TODAY) {
  const loans = new FakeLoanRepository();
  const notifier = new FakeMemberNotifier();
  const clock = { today };
  const service = new BorrowBookService(loans, notifier, new LoanPolicy(), () => clock.today);
  return { loans, notifier, service, clock };
}

describe("BorrowBookService", () => {
  it("saves a valid loan and notifies the member", () => {
    const { loans, notifier, service } = setup();

    const loan = service.borrow(member, BookId.of("B-1"));

    assert.equal(loans.loans.get(loan.id), loan);
    assert.deepEqual(notifier.notified, [loan]);
  });

  it("rejects a 4th loan without saving or notifying", () => {
    const { loans, notifier, service } = setup();
    service.borrow(member, BookId.of("B-1"));
    service.borrow(member, BookId.of("B-2"));
    service.borrow(member, BookId.of("B-3"));

    assert.throws(() => service.borrow(member, BookId.of("B-4")), LoanNotAllowedError);
    assert.equal(loans.loans.size, 3);
    assert.equal(notifier.notified.length, 3);
  });

  it("rejects a member with an overdue loan", () => {
    const { service, clock } = setup(new Date("2025-11-01T10:00:00Z"));
    service.borrow(member, BookId.of("B-1"));

    clock.today = TODAY;

    assert.throws(() => service.borrow(member, BookId.of("B-2")), LoanNotAllowedError);
  });

  it("lets a member borrow again after closing one of 3 loans", () => {
    const { loans, service } = setup();
    const first = service.borrow(member, BookId.of("B-1"));
    service.borrow(member, BookId.of("B-2"));
    service.borrow(member, BookId.of("B-3"));

    first.close();
    loans.save(first);

    assert.doesNotThrow(() => service.borrow(member, BookId.of("B-4")));
  });
});
