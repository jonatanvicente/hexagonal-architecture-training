import { LoanService, MaxActiveLoansExceededError } from "../core/LoanService";

export interface BorrowRequest {
  memberId: string;
  bookId: string;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}

/**
 * Handles HTTP requests for loans.
 * (Simulated: requests are plain objects instead of real HTTP calls.)
 */
// ADAPTER
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  borrow(request: BorrowRequest): HttpResponse {
    if (!request.memberId || !request.bookId) {
      return { status: 400, body: { error: "memberId and bookId are required" } };
    }

    try {
      const loan = this.loanService.borrowBook(request.memberId, request.bookId);
      return { status: 201, body: loan };
    } catch (error) {
      if (error instanceof MaxActiveLoansExceededError) {
        return { status: 409, body: { error: error.message } };
      }
      throw error;
    }
  }
}
