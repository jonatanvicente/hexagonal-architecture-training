import { Loan } from "./Loan";

/**
 * Domain service: decides whether a member may borrow another book.
 * Pure business logic, no I/O.
 */
export class LoanPolicy {
  static readonly MAX_OPEN_LOANS = 3;

  canBorrow(openLoans: Loan[], today: Date): boolean {
    if (openLoans.length >= LoanPolicy.MAX_OPEN_LOANS) {
      return false;
    }
    return !openLoans.some((loan) => loan.isOverdue(today));
  }
}
