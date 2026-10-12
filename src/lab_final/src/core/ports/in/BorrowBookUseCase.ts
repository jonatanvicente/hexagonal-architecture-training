import { BookId } from "../../domain/BookId";
import { Loan } from "../../domain/Loan";
import { MemberId } from "../../domain/MemberId";

// Driving port: called by the outside world.
export interface BorrowBookUseCase {
  borrow(memberId: MemberId, bookId: BookId): Loan;
}
