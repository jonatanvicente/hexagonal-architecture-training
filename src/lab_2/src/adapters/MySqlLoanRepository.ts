import { Loan } from "../core/domain/Loan";
import { MemberId } from "../core/domain/MemberId";
import { LoanRepository } from "../core/ports/out/LoanRepository";

/**
 * ADAPTER: stores loans in MySQL.
 * (Simulated: data is kept in memory and queries are printed to the console.)
 */
export class MySqlLoanRepository implements LoanRepository {
  private readonly loans: Loan[] = [];
  private nextSequence = 1;

  constructor() {
    console.log("[MySQL] Connected to mysql://library-db:3306/library");
  }

  nextId(): string {
    return `L-${this.nextSequence++}`;
  }

  save(loan: Loan): void {
    this.loans.push(loan);
    console.log(
      `[MySQL] INSERT INTO loans (id, member_id, book_id, due_date, status) VALUES ('${loan.id}', '${loan.memberId.value}', '${loan.bookId.value}', '${loan.dueDate.toISOString()}', '${loan.status}')`,
    );
  }

  findOpenLoansOf(memberId: MemberId): Loan[] {
    console.log(
      `[MySQL] SELECT * FROM loans WHERE member_id = '${memberId.value}' AND status = 'OPEN'`,
    );
    return this.loans.filter((l) => l.memberId.equals(memberId) && l.isOpen());
  }
}
