import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BookId } from "../../src/core/domain/BookId";
import { Loan } from "../../src/core/domain/Loan";
import { MemberId } from "../../src/core/domain/MemberId";
import { LoanRepository } from "../../src/core/ports/out/LoanRepository";

const TODAY = new Date("2026-01-01T10:00:00Z");

/**
 * Contract of the LoanRepository port.
 * Every implementation (real adapters AND test fakes) must pass it.
 */
export function loanRepositoryContract(name: string, create: () => LoanRepository): void {
  describe(`LoanRepository contract: ${name}`, () => {
    const m1 = MemberId.of("M-1");
    const m2 = MemberId.of("M-2");

    function newLoan(repository: LoanRepository, memberId: MemberId, bookId: string): Loan {
      return Loan.open(repository.nextId(), memberId, BookId.of(bookId), TODAY);
    }

    it("finds a saved loan", () => {
      const repository = create();
      const loan = newLoan(repository, m1, "B-1");
      repository.save(loan);

      const found = repository.findOpenLoansOf(m1);

      assert.deepEqual(found.map((l) => l.id), [loan.id]);
    });

    it("does not return a closed loan as open", () => {
      const repository = create();
      const loan = newLoan(repository, m1, "B-1");
      repository.save(loan);
      loan.close();
      repository.save(loan);

      assert.equal(repository.findOpenLoansOf(m1).length, 0);
    });

    it("keeps the loans of different members apart", () => {
      const repository = create();
      repository.save(newLoan(repository, m1, "B-1"));
      repository.save(newLoan(repository, m2, "B-2"));

      assert.equal(repository.findOpenLoansOf(m1).length, 1);
      assert.equal(repository.findOpenLoansOf(m2).length, 1);
    });
  });
}
