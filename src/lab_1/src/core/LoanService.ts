import { Loan } from "./Loan";
import { LoanRepository } from "./LoanRepository";
import { MemberNotifier } from "./MemberNotifier";

export const MAX_ACTIVE_LOANS = 3;

export class MaxActiveLoansExceededError extends Error {
  constructor(readonly memberId: string) {
    super(`Member already has ${MAX_ACTIVE_LOANS} active loans`);
    this.name = "MaxActiveLoansExceededError";
  }
}

export class LoanService {
  constructor(
    private readonly repository: LoanRepository,
    private readonly notifier: MemberNotifier,
  ) {}

  getActiveLoans(memberId: string): Loan[] {
    return this.repository.findActiveByMember(memberId);
  }

  borrowBook(memberId: string, bookId: string): Loan {
    const activeLoans = this.getActiveLoans(memberId);
    if (activeLoans.length >= MAX_ACTIVE_LOANS) {
      throw new MaxActiveLoansExceededError(memberId);
    }

    const loan = this.repository.save(memberId, bookId);

    this.notifier.notifyLoan(memberId, bookId);

    return loan;
  }
}
