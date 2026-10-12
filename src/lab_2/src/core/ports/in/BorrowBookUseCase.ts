import { BookId } from "../../domain/BookId";
import { Loan } from "../../domain/Loan";
import { MemberId } from "../../domain/MemberId";

// DRIVING PORT
export interface BorrowBookUseCase {
  borrow(memberId: MemberId, bookId: BookId): Loan;
}
