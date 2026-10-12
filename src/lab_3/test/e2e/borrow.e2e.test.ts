import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { after, before, describe, it } from "node:test";
import { createServer } from "../../src/adapters/in/http/HttpLoanController";
import { SqliteLoanRepository } from "../../src/adapters/out/persistence/SqliteLoanRepository";
import { BorrowBookService } from "../../src/core/application/BorrowBookService";
import { LoanPolicy } from "../../src/core/domain/LoanPolicy";
import { MemberId } from "../../src/core/domain/MemberId";
import { FakeMemberNotifier } from "../fakes/FakeMemberNotifier";

const API_KEY = "test-key";

let server: Server;
let loans: SqliteLoanRepository;
let baseUrl: string;

function borrow(memberId: string, bookId: string, apiKey?: string): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return fetch(`${baseUrl}/loans`, {
    method: "POST",
    headers,
    body: JSON.stringify({ memberId, bookId }),
  });
}

// Each test uses its own member, so the tests share the server but not their data.
describe("Borrow a book (E2E over HTTP)", () => {
  before(async () => {
    loans = new SqliteLoanRepository(":memory:");
    const borrowBook = new BorrowBookService(loans, new FakeMemberNotifier());
    server = createServer({ borrowBook, apiKey: API_KEY });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    loans.close();
  });

  it("returns 201 for a valid request with the API key", async () => {
    const response = await borrow("M-1", "B-100", API_KEY);

    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.memberId, "M-1");
    assert.equal(body.bookId, "B-100");
    assert.equal(body.status, "OPEN");
  });

  it("returns 401 without the API key and saves no loan", async () => {
    const response = await borrow("M-2", "B-100");

    assert.equal(response.status, 401);
    assert.equal(loans.findOpenLoansOf(MemberId.of("M-2")).length, 0);
  });

  it("returns 409 for a 4th loan", async () => {
    for (let i = 1; i <= LoanPolicy.MAX_OPEN_LOANS; i++) {
      assert.equal((await borrow("M-3", `B-${i}`, API_KEY)).status, 201);
    }

    const response = await borrow("M-3", "B-4", API_KEY);

    assert.equal(response.status, 409);
    assert.equal(loans.findOpenLoansOf(MemberId.of("M-3")).length, LoanPolicy.MAX_OPEN_LOANS);
  });
});
