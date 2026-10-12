import { Loan } from "./Loan";

// PORT
export interface LoanRepository {
  save(memberId: string, bookId: string): Loan;
  findActiveByMember(memberId: string): Loan[];
}
