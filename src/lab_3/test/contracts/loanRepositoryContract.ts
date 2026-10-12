import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { BookId } from "../../src/core/domain/BookId";
import { Loan } from "../../src/core/domain/Loan";
import { MemberId } from "../../src/core/domain/MemberId";
import { LoanRepository } from "../../src/core/ports/out/LoanRepository";

const TODAY = new Date("2026-01-01T10:00:00Z");

/**
 * Contract of the LoanRepository port. Every implementation, real or fake, must pass it.
 * Uses only the port interface, so it knows nothing about how loans are stored.
 */
export function loanRepositoryContract(name: string, create: () => LoanRepository): void {
  describe(`LoanRepository contract: ${name}`, () => {
    const alice = MemberId.of("M-1");
    const bob = MemberId.of("M-2");
    let repository: LoanRepository;

    function openLoan(memberId: MemberId, bookId: string): Loan {
      return Loan.open(repository.nextId(), memberId, BookId.of(bookId), TODAY);
    }

    beforeEach(() => {
      repository = create();
    });

    it("finds a saved loan", () => {
      const loan = openLoan(alice, "B-1");
      repository.save(loan);

      const found = repository.findOpenLoansOf(alice);

      assert.equal(found.length, 1);
      assert.equal(found[0].id, loan.id);
      assert.ok(found[0].bookId.equals(BookId.of("B-1")));
    });

    it("does not return a closed loan as open", () => {
      const loan = openLoan(alice, "B-1");
      repository.save(loan);

      loan.close();
      repository.save(loan);

      assert.deepEqual(repository.findOpenLoansOf(alice), []);
    });

    it("does not show one member the loans of another", () => {
      repository.save(openLoan(alice, "B-1"));
      repository.save(openLoan(bob, "B-2"));

      const alicesLoans = repository.findOpenLoansOf(alice);
      const bobsLoans = repository.findOpenLoansOf(bob);

      assert.equal(alicesLoans.length, 1);
      assert.ok(alicesLoans[0].memberId.equals(alice));
      assert.equal(bobsLoans.length, 1);
      assert.ok(bobsLoans[0].memberId.equals(bob));
    });
  });
}
