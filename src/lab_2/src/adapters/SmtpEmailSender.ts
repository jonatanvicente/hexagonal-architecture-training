import { BookId } from "../core/domain/BookId";
import { MemberId } from "../core/domain/MemberId";
import { MemberNotifier } from "../core/ports/out/MemberNotifier";

/**
 * ADAPTER: notifies members by email through an SMTP server.
 * (Simulated: emails are printed to the console.)
 */
export class SmtpEmailSender implements MemberNotifier {
  constructor(private readonly host: string = "smtp.library.local") {}

  notifyLoan(memberId: MemberId, bookId: BookId): void {
    this.sendEmail(
      `${memberId.value}@library.local`,
      "New loan",
      `You borrowed book ${bookId.value}. Please return it within 14 days.`,
    );
  }

  private sendEmail(to: string, subject: string, body: string): void {
    console.log(`[SMTP ${this.host}] To: ${to} | Subject: ${subject} | ${body}`);
  }
}
