import { MemberId } from "./MemberId";

export class BorrowNotAllowedError extends Error {
  constructor(memberId: MemberId) {
    super(`Member ${memberId.value} is not allowed to borrow more books`);
    this.name = "BorrowNotAllowedError";
  }
}
