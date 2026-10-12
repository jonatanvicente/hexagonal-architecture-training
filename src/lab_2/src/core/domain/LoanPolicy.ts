import { Loan } from "./Loan";

const MAX_OPEN_LOANS = 3;

// DOMAIN SERVICE: rules that span several loans of the same member.
export class LoanPolicy {
  canBorrow(openLoans: Loan[], today: Date): boolean {
    const underLimit = openLoans.length < MAX_OPEN_LOANS;
    const nothingOverdue = !openLoans.some((loan) => loan.isOverdue(today));
    return underLimit && nothingOverdue;
  }
}
