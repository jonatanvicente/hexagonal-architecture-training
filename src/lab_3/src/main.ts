import { createServer } from "./adapters/in/http/HttpLoanController";
import { SmsNotifier } from "./adapters/out/notification/SmsNotifier";
import { SmtpEmailSender } from "./adapters/out/notification/SmtpEmailSender";
import { SqliteLoanRepository } from "./adapters/out/persistence/SqliteLoanRepository";
import { BorrowBookService } from "./core/application/BorrowBookService";

// Wiring: the only place where concrete classes are chosen.
const port = Number(process.env.PORT ?? 3000);
const apiKey = process.env.API_KEY ?? "dev-key";
const dbPath = process.env.DB_PATH ?? "library.db";

const loans = new SqliteLoanRepository(dbPath);
const notifier = process.env.NOTIFIER === "sms" ? new SmsNotifier() : new SmtpEmailSender();
const borrowBook = new BorrowBookService(loans, notifier);

const server = createServer({ borrowBook, apiKey });

server.listen(port, () => {
  console.log(`Library API listening on http://localhost:${port} (database: ${dbPath})`);
});
