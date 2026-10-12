import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { SqliteLoanRepository } from "../../src/adapters/out/persistence/SqliteLoanRepository";
import { BookId } from "../../src/core/domain/BookId";
import { Loan } from "../../src/core/domain/Loan";
import { MemberId } from "../../src/core/domain/MemberId";

const TODAY = new Date("2026-01-01T10:00:00Z");
const member = MemberId.of("M-1");

// A fresh in-memory database per test: no shared state, no files on disk.
let repository: SqliteLoanRepository;

function newLoan(bookId: string, memberId: MemberId = member): Loan {
  return Loan.open(repository.nextId(), memberId, BookId.of(bookId), TODAY);
}

describe("SqliteLoanRepository", () => {
  beforeEach(() => {
    repository = new SqliteLoanRepository(":memory:");
  });

  afterEach(() => {
    repository.close();
  });

  it("finds a saved loan", () => {
    repository.save(newLoan("B-1"));

    const loans = repository.findOpenLoansOf(member);

    assert.equal(loans.length, 1);
    assert.equal(loans[0].bookId.value, "B-1");
  });

  it("finds all the open loans of a member", () => {
    repository.save(newLoan("B-2"));
    repository.save(newLoan("B-3"));

    const loans = repository.findOpenLoansOf(member);

    assert.equal(loans.length, 2);
  });

  it("finds a saved loan by its member, with all its fields, and not by another member", () => {
    const loan = newLoan("B-100");
    repository.save(loan);
    repository.save(newLoan("B-200", MemberId.of("M-2")));

    const loans = repository.findOpenLoansOf(member);

    assert.equal(loans.length, 1);
    assert.equal(loans[0].id, loan.id);
    assert.ok(loans[0].memberId.equals(member));
    assert.ok(loans[0].bookId.equals(BookId.of("B-100")));
    assert.deepEqual(loans[0].dueDate, loan.dueDate);
    assert.equal(loans[0].status, "OPEN");
  });

  it("does not return a closed loan from findOpenLoansOf", () => {
    const loan = newLoan("B-1");
    repository.save(loan);
    repository.save(newLoan("B-2"));

    loan.close();
    repository.save(loan);

    const loans = repository.findOpenLoansOf(member);

    assert.equal(loans.length, 1);
    assert.equal(loans[0].bookId.value, "B-2");
  });
});
