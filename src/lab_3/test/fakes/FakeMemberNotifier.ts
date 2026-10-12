import { Loan } from "../../src/core/domain/Loan";
import { MemberNotifier } from "../../src/core/ports/out/MemberNotifier";

/** Fake of the MemberNotifier port: records notifications instead of sending them. */
export class FakeMemberNotifier implements MemberNotifier {
  readonly notified: Loan[] = [];

  notifyLoanOpened(loan: Loan): void {
    this.notified.push(loan);
  }
}
