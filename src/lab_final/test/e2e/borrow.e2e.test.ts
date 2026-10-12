import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { MemberId } from "../../src/core/domain/MemberId";
import { post, startTestServer, TestServer } from "./helpers";

describe("POST /loans (end to end)", () => {
  let app: TestServer;

  before(async () => {
    app = await startTestServer();
  });

  after(async () => {
    await app.close();
  });

  it("creates a loan with a valid API key", async () => {
    const response = await post(app.baseUrl, "/loans", { memberId: "M-1", bookId: "B-1" });

    assert.equal(response.status, 201);
    assert.equal(response.body.status, "OPEN");
  });

  it("rejects a request without an API key and saves nothing", async () => {
    const response = await post(app.baseUrl, "/loans", { memberId: "M-9", bookId: "B-1" }, null);

    assert.equal(response.status, 401);
    assert.equal(app.loans.findOpenLoansOf(MemberId.of("M-9")).length, 0);
  });

  it("rejects a 4th loan with 409", async () => {
    for (const bookId of ["B-1", "B-2", "B-3"]) {
      await post(app.baseUrl, "/loans", { memberId: "M-2", bookId });
    }

    const response = await post(app.baseUrl, "/loans", { memberId: "M-2", bookId: "B-4" });

    assert.equal(response.status, 409);
  });
});
