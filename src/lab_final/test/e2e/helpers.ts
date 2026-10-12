import { AddressInfo } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "../../src/adapters/in/http/HttpLoanController";
import { SqliteLoanRepository } from "../../src/adapters/out/persistence/SqliteLoanRepository";
import { BorrowBookService } from "../../src/core/application/BorrowBookService";
import { LoanPolicy } from "../../src/core/domain/LoanPolicy";
import { ReturnController } from "../../src/legacy/ReturnController";
import { FakeMemberNotifier } from "../fakes/FakeMemberNotifier";

export const API_KEY = "test-key";

export interface TestServer {
  baseUrl: string;
  loans: SqliteLoanRepository;
  notifier: FakeMemberNotifier;
  /** Changes the date the app sees as "today" (e.g. to simulate a late return). */
  setToday(date: Date): void;
  close(): Promise<void>;
}

export interface TestServerOptions {
  /** The date the app sees as "today". Defaults to the real current date. */
  today?: Date;
}

/**
 * Starts the whole app with an in-memory database on a random free port.
 */
export async function startTestServer(options: TestServerOptions = {}): Promise<TestServer> {
  let today = options.today ?? new Date();
  const now = () => today;

  const db = new DatabaseSync(":memory:");
  const loans = new SqliteLoanRepository(db);
  const notifier = new FakeMemberNotifier();
  const borrowBook = new BorrowBookService(loans, notifier, new LoanPolicy(), now);
  const legacyReturns = new ReturnController(db, now);

  const server = createServer({ borrowBook, legacyReturns, apiKey: API_KEY });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    loans,
    notifier,
    setToday: (date) => {
      today = date;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => {
          db.close();
          error ? reject(error) : resolve();
        });
      }),
  };
}

export interface ApiResponse {
  status: number;
  body: any;
}

/** Sends a POST request with a JSON body. Pass apiKey: null to omit the header. */
export async function post(
  baseUrl: string,
  path: string,
  body: unknown,
  apiKey: string | null = API_KEY,
): Promise<ApiResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey !== null) {
    headers["x-api-key"] = apiKey;
  }
  const response = await fetch(baseUrl + path, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
