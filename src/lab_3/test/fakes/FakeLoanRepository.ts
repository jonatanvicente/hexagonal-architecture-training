import { Loan } from "../../src/core/domain/Loan";
import { MemberId } from "../../src/core/domain/MemberId";
import { LoanRepository } from "../../src/core/ports/out/LoanRepository";

/** In-memory fake of the LoanRepository port, for tests. */
export class FakeLoanRepository implements LoanRepository {
  readonly loans = new Map<string, Loan>();
  private sequence = 1;

  nextId(): string {
    return `L-${this.sequence++}`;
  }

  save(loan: Loan): void {
    this.loans.set(loan.id, loan);
  }

  findOpenLoansOf(memberId: MemberId): Loan[] {
    return [...this.loans.values()].filter((loan) => loan.memberId.equals(memberId) && loan.isOpen());
  }
}
