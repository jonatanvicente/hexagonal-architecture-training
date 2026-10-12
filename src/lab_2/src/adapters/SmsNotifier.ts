import { BookId } from "../core/domain/BookId";
import { MemberId } from "../core/domain/MemberId";
import { MemberNotifier } from "../core/ports/out/MemberNotifier";

/**
 * ADAPTER: notifies members by SMS.
 * (Simulated: messages are printed to the console.)
 */
export class SmsNotifier implements MemberNotifier {
  notifyLoan(memberId: MemberId, bookId: BookId): void {
    console.log(`[SMS] To member ${memberId.value}: you borrowed book ${bookId.value}.`);
  }
}
