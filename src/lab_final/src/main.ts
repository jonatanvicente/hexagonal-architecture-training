import { DatabaseSync } from "node:sqlite";
import { createServer } from "./adapters/in/http/HttpLoanController";
import { SmsNotifier } from "./adapters/out/notification/SmsNotifier";
import { SmtpEmailSender } from "./adapters/out/notification/SmtpEmailSender";
import { SqliteLoanRepository } from "./adapters/out/persistence/SqliteLoanRepository";
import { BorrowBookService } from "./core/application/BorrowBookService";
import { ReturnController } from "./legacy/ReturnController";

// Wiring: the only place where concrete classes are chosen.
const port = Number(process.env.PORT ?? 3000);
const apiKey = process.env.API_KEY ?? "dev-key";
const dbPath = process.env.DB_PATH ?? "library.db";

// One database connection, shared by the hexagon and the legacy code.
const db = new DatabaseSync(dbPath);

const loans = new SqliteLoanRepository(db);
const notifier = process.env.NOTIFIER === "sms" ? new SmsNotifier() : new SmtpEmailSender();
const borrowBook = new BorrowBookService(loans, notifier);
const legacyReturns = new ReturnController(db);

const server = createServer({ borrowBook, legacyReturns, apiKey });

server.listen(port, () => {
  console.log(`Library API listening on http://localhost:${port} (database: ${dbPath})`);
});
