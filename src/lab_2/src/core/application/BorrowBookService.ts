import { BookId } from "../domain/BookId";
import { BorrowNotAllowedError } from "../domain/BorrowNotAllowedError";
import { Loan } from "../domain/Loan";
import { LoanPolicy } from "../domain/LoanPolicy";
import { MemberId } from "../domain/MemberId";
import { BorrowBookUseCase } from "../ports/in/BorrowBookUseCase";
import { LoanRepository } from "../ports/out/LoanRepository";
import { MemberNotifier } from "../ports/out/MemberNotifier";

// APPLICATION SERVICE: coordinates the "borrow a book" use case; rules live in the domain.
export class BorrowBookService implements BorrowBookUseCase {
  constructor(
    private readonly repository: LoanRepository,
    private readonly notifier: MemberNotifier,
    private readonly policy: LoanPolicy = new LoanPolicy(),
  ) {}

  borrow(memberId: MemberId, bookId: BookId): Loan {
    const today = new Date();
    const openLoans = this.repository.findOpenLoansOf(memberId);
    if (!this.policy.canBorrow(openLoans, today)) throw new BorrowNotAllowedError(memberId);

    const loan = Loan.open(this.repository.nextId(), memberId, bookId, today);
    this.repository.save(loan);
    this.notifier.notifyLoan(memberId, bookId);
    return loan;
  }
}
