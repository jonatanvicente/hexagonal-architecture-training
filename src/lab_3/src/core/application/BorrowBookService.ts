import { BookId } from "../domain/BookId";
import { LoanNotAllowedError } from "../domain/DomainError";
import { Loan } from "../domain/Loan";
import { LoanPolicy } from "../domain/LoanPolicy";
import { MemberId } from "../domain/MemberId";
import { BorrowBookUseCase } from "../ports/in/BorrowBookUseCase";
import { LoanRepository } from "../ports/out/LoanRepository";
import { MemberNotifier } from "../ports/out/MemberNotifier";

/**
 * Application service: orchestrates the "borrow a book" use case.
 * It contains no business rules; it coordinates the domain and the ports.
 */
export class BorrowBookService implements BorrowBookUseCase {
  constructor(
    private readonly loans: LoanRepository,
    private readonly notifier: MemberNotifier,
    private readonly policy: LoanPolicy = new LoanPolicy(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  borrow(memberId: MemberId, bookId: BookId): Loan {
    const today = this.now();
    const openLoans = this.loans.findOpenLoansOf(memberId);

    if (!this.policy.canBorrow(openLoans, today)) {
      throw new LoanNotAllowedError(`Member ${memberId} cannot borrow more books right now`);
    }

    const loan = Loan.open(this.loans.nextId(), memberId, bookId, today);
    this.loans.save(loan);
    this.notifier.notifyLoanOpened(loan);
    return loan;
  }
}
