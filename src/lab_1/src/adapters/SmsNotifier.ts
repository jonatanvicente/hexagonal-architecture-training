import { MemberNotifier } from "../core/MemberNotifier";

/**
 * Sends SMS notifications to members.
 * (Simulated: messages are printed to the console.)
 */
// ADAPTER
export class SmsNotifier implements MemberNotifier {
  notifyLoan(_memberId: string, _bookId: string): void {
    console.log("SMS sent");
  }
}
