import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { SqliteLoanRepository } from "../../src/adapters/out/persistence/SqliteLoanRepository";
import { BookId } from "../../src/core/domain/BookId";
import { Loan } from "../../src/core/domain/Loan";
import { MemberId } from "../../src/core/domain/MemberId";

const TODAY = new Date("2026-01-01T10:00:00Z");
const member = MemberId.of("M-1");

describe("SqliteLoanRepository", () => {
  let repository: SqliteLoanRepository;

  // A fresh in-memory database for every test: no shared state, no files on disk.
  beforeEach(() => {
    repository = new SqliteLoanRepository(":memory:");
  });

  afterEach(() => {
    repository.close();
  });

  function newLoan(bookId: string, memberId: MemberId = member): Loan {
    return Loan.open(repository.nextId(), memberId, BookId.of(bookId), TODAY);
  }

  it("finds a saved loan", () => {
    repository.save(newLoan("B-1"));

    const loans = repository.findOpenLoansOf(member);

    assert.equal(loans.length, 1);
    assert.equal(loans[0].bookId.value, "B-1");
  });

  it("finds all the open loans of a member", () => {
    repository.save(newLoan("B-2"));
    repository.save(newLoan("B-3"));

    assert.equal(repository.findOpenLoansOf(member).length, 2);
  });

  it("keeps the loan data when loading it back", () => {
    const loan = newLoan("B-1");
    repository.save(loan);

    const [loaded] = repository.findOpenLoansOf(member);

    assert.equal(loaded.id, loan.id);
    assert.deepEqual(loaded.dueDate, loan.dueDate);
    assert.equal(loaded.status, "OPEN");
  });

  it("does not return closed loans", () => {
    const loan = newLoan("B-1");
    repository.save(loan);

    loan.close();
    repository.save(loan);

    assert.equal(repository.findOpenLoansOf(member).length, 0);
  });
});
