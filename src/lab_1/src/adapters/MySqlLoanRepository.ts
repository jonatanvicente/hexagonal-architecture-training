import { Loan } from "../core/Loan";
import { LoanRepository } from "../core/LoanRepository";

/**
 * Stores loans in MySQL.
 * (Simulated: data is kept in memory and queries are printed to the console.)
 */
// ADAPTER
export class MySqlLoanRepository implements LoanRepository {
  private readonly loans: Loan[] = [];
  private nextId = 1;

  constructor() {
    console.log("[MySQL] Connected to mysql://library-db:3306/library");
  }

  save(memberId: string, bookId: string): Loan {
    const loan: Loan = {
      id: `L-${this.nextId++}`,
      memberId,
      bookId,
      borrowedAt: new Date(),
      returned: false,
    };
    this.loans.push(loan);
    console.log(
      `[MySQL] INSERT INTO loans (id, member_id, book_id) VALUES ('${loan.id}', '${memberId}', '${bookId}')`,
    );
    return loan;
  }

  findActiveByMember(memberId: string): Loan[] {
    console.log(
      `[MySQL] SELECT * FROM loans WHERE member_id = '${memberId}' AND returned = 0`,
    );
    return this.loans.filter((l) => l.memberId === memberId && !l.returned);
  }
}
