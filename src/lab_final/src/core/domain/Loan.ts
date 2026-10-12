import { BookId } from "./BookId";
import { LoanAlreadyClosedError } from "./DomainError";
import { MemberId } from "./MemberId";

export type LoanStatus = "OPEN" | "CLOSED";

const LOAN_PERIOD_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class Loan {
  private constructor(
    readonly id: string,
    readonly memberId: MemberId,
    readonly bookId: BookId,
    readonly dueDate: Date,
    private _status: LoanStatus,
  ) {}

  /** Opens a new loan. The due date is 14 days after `today`. */
  static open(id: string, memberId: MemberId, bookId: BookId, today: Date): Loan {
    const dueDate = new Date(today.getTime() + LOAN_PERIOD_DAYS * MS_PER_DAY);
    return new Loan(id, memberId, bookId, dueDate, "OPEN");
  }

  /** Rebuilds an existing loan, for example when it is loaded from storage. */
  static reconstitute(props: {
    id: string;
    memberId: MemberId;
    bookId: BookId;
    dueDate: Date;
    status: LoanStatus;
  }): Loan {
    return new Loan(props.id, props.memberId, props.bookId, props.dueDate, props.status);
  }

  get status(): LoanStatus {
    return this._status;
  }

  isOpen(): boolean {
    return this._status === "OPEN";
  }

  close(): void {
    if (!this.isOpen()) {
      throw new LoanAlreadyClosedError(`Loan ${this.id} is already closed`);
    }
    this._status = "CLOSED";
  }

  isOverdue(today: Date): boolean {
    return this.isOpen() && today.getTime() > this.dueDate.getTime();
  }
}
