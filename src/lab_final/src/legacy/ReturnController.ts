import { IncomingMessage, ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";

/**
 * LEGACY CODE - written before the hexagonal migration.
 * Handles POST /returns   body: { "loanId": "..." }
 *
 * Do not add new features here.
 */
export class ReturnController {
  constructor(
    private db: DatabaseSync,
    private now: () => Date = () => new Date(),
  ) {}

  async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // read the request body
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
    }
    const data = raw ? JSON.parse(raw) : {};
    const loanId = data.loanId;

    if (!loanId || typeof loanId !== "string") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "loanId is required" }));
      return;
    }

    // load the loan
    const row: any = this.db.prepare("SELECT * FROM loans WHERE id = '" + loanId + "'").get();

    const today = this.now();
    const due = new Date(row.due_date);
    let fine = 0;

    if (row.status == "OPEN") {
      // calculate the fine: 0.50 EUR per day late, max 10 EUR
      if (today.getTime() > due.getTime()) {
        const daysLate = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        fine = daysLate * 0.5;
        if (fine > 10) {
          fine = 10;
        }
      }

      // close the loan
      this.db.prepare("UPDATE loans SET status = 'CLOSED' WHERE id = '" + loanId + "'").run();

      // send the email
      const email = row.member_id + "@library.local";
      let body = "Thanks for returning book " + row.book_id + ".";
      if (fine > 0) {
        body = body + " You have a fine of " + fine + " EUR for returning it late.";
      }
      console.log("[SMTP smtp.library.local] To: " + email + " | Subject: Loan closed | " + body);
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ loanId: loanId, status: "CLOSED", fineEuros: fine }));
  }
}
