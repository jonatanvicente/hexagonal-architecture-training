import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { post, startTestServer, TestServer } from "./helpers";

/**
 * CHARACTERIZATION TESTS for the legacy POST /returns (src/legacy/ReturnController.ts).
 *
 * They describe what the code DOES today, not what it SHOULD do.
 * They are the safety net for the migration: if one fails, the behavior changed.
 */
describe("POST /returns (legacy characterization)", () => {
  const BORROWED_AT = new Date("2026-01-01T10:00:00Z");
  const DAY_MS = 24 * 60 * 60 * 1000;

  let app: TestServer;

  beforeEach(async () => {
    app = await startTestServer({ today: BORROWED_AT });
  });

  afterEach(async () => {
    await app.close();
  });

  async function borrowBook(): Promise<{ id: string; dueDate: Date }> {
    const response = await post(app.baseUrl, "/loans", { memberId: "M-1", bookId: "B-1" });
    assert.equal(response.status, 201);
    return { id: response.body.id, dueDate: new Date(response.body.dueDate) };
  }

  function daysAfter(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
  }

  it("should return fineEuros 0 when the book is returned on time", async () => {
    const loan = await borrowBook();
    app.setToday(daysAfter(BORROWED_AT, 7));

    const response = await post(app.baseUrl, "/returns", { loanId: loan.id });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { loanId: loan.id, status: "CLOSED", fineEuros: 0 });
  });

  it("should return fineEuros 1.5 when the book is returned 3 days late", async () => {
    const loan = await borrowBook();
    app.setToday(daysAfter(loan.dueDate, 3));

    const response = await post(app.baseUrl, "/returns", { loanId: loan.id });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { loanId: loan.id, status: "CLOSED", fineEuros: 1.5 });
  });

  it("should cap the fine at 10 EUR when the book is returned 40 days late", async () => {
    const loan = await borrowBook();
    app.setToday(daysAfter(loan.dueDate, 40));

    const response = await post(app.baseUrl, "/returns", { loanId: loan.id });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { loanId: loan.id, status: "CLOSED", fineEuros: 10 });
  });

  it("should return 200 and fineEuros 0 when the same loan is returned twice", async () => {
    const loan = await borrowBook();
    app.setToday(daysAfter(loan.dueDate, 3));
    await post(app.baseUrl, "/returns", { loanId: loan.id });

    const response = await post(app.baseUrl, "/returns", { loanId: loan.id });

    // LEGACY QUIRK: a second return is not rejected. It answers 200 "CLOSED" as if it were a
    // real return, and the fine of the first return (1.5) is reported as 0.
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { loanId: loan.id, status: "CLOSED", fineEuros: 0 });
  });

  it("should return 500 when the loan does not exist", async () => {
    const response = await post(app.baseUrl, "/returns", { loanId: "unknown-loan" });

    // LEGACY QUIRK: there is no "not found" check. The controller reads row.due_date on an
    // undefined row, throws a TypeError, and the HTTP adapter turns it into a 500 (not a 404).
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { error: "Internal server error" });
  });
});
