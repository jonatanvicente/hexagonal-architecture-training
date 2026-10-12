import { BookId } from "./BookId";
import { LoanAlreadyClosedError } from "./LoanAlreadyClosedError";
import { MemberId } from "./MemberId";

const LOAN_PERIOD_DAYS = 14;

export type LoanStatus = "OPEN" | "CLOSED";

export class Loan {
  private constructor(
    readonly id: string,
    readonly memberId: MemberId,
    readonly bookId: BookId,
    readonly dueDate: Date,
    private _status: LoanStatus,
  ) {}

  static open(id: string, memberId: MemberId, bookId: BookId, today: Date): Loan {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);
    return new Loan(id, memberId, bookId, dueDate, "OPEN");
  }

  get status(): LoanStatus {
    return this._status;
  }

  isOpen(): boolean {
    return this._status === "OPEN";
  }

  close(): void {
    if (!this.isOpen()) {
      throw new LoanAlreadyClosedError(this.id);
    }
    this._status = "CLOSED";
  }

  isOverdue(today: Date): boolean {
    return this.isOpen() && today.getTime() > this.dueDate.getTime();
  }
}
