import { MemberNotifier } from "../core/MemberNotifier";

/**
 * Sends emails through an SMTP server.
 * (Simulated: emails are printed to the console.)
 */
// ADAPTER
export class SmtpEmailSender implements MemberNotifier {
  constructor(private readonly host: string = "smtp.library.local") {}

  notifyLoan(memberId: string, bookId: string): void {
    this.sendEmail(
      `${memberId}@library.local`,
      "New loan",
      `You borrowed book ${bookId}. Please return it within 14 days.`,
    );
  }

  sendEmail(to: string, subject: string, body: string): void {
    console.log(`[SMTP ${this.host}] To: ${to} | Subject: ${subject} | ${body}`);
  }
}
