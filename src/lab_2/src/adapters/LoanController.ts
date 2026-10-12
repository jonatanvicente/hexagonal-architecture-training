import { BookId } from "../core/domain/BookId";
import { BorrowNotAllowedError } from "../core/domain/BorrowNotAllowedError";
import { InvalidIdError } from "../core/domain/InvalidIdError";
import { Loan } from "../core/domain/Loan";
import { MemberId } from "../core/domain/MemberId";
import { BorrowBookUseCase } from "../core/ports/in/BorrowBookUseCase";

export interface BorrowRequest {
  memberId: string;
  bookId: string;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}

/**
 * ADAPTER: handles HTTP requests for loans.
 * (Simulated: requests are plain objects instead of real HTTP calls.)
 */
export class LoanController {
  constructor(private readonly borrowBook: BorrowBookUseCase) {}

  borrow(request: BorrowRequest): HttpResponse {
    if (!request.memberId || !request.bookId) {
      return { status: 400, body: { error: "memberId and bookId are required" } };
    }

    let memberId: MemberId;
    let bookId: BookId;
    try {
      memberId = MemberId.of(request.memberId);
      bookId = BookId.of(request.bookId);
    } catch (error) {
      if (error instanceof InvalidIdError) {
        return { status: 400, body: { error: error.message } };
      }
      throw error;
    }

    try {
      const loan = this.borrowBook.borrow(memberId, bookId);
      return { status: 201, body: toResponse(loan) };
    } catch (error) {
      if (error instanceof BorrowNotAllowedError) {
        return { status: 409, body: { error: error.message } };
      }
      throw error;
    }
  }
}

function toResponse(loan: Loan) {
  return {
    id: loan.id,
    memberId: loan.memberId.value,
    bookId: loan.bookId.value,
    dueDate: loan.dueDate.toISOString(),
    status: loan.status,
  };
}
