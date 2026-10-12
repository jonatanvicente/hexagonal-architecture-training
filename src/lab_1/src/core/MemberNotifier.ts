// PORT
export interface MemberNotifier {
  notifyLoan(memberId: string, bookId: string): void;
}
