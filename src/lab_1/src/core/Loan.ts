export interface Loan {
  id: string;
  memberId: string;
  bookId: string;
  borrowedAt: Date;
  returned: boolean;
}
