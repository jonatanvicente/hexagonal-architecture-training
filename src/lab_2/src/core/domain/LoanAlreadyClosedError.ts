export class LoanAlreadyClosedError extends Error {
  constructor(loanId: string) {
    super(`Loan ${loanId} is already closed`);
    this.name = "LoanAlreadyClosedError";
  }
}
