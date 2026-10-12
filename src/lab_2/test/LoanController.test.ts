import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LoanController } from "../src/adapters/LoanController";
import { BorrowBookUseCase } from "../src/core/ports/in/BorrowBookUseCase";

// Fails the test if the request ever reaches the core.
const unreachable = (): never => assert.fail("core must not be called");
const borrowBook: BorrowBookUseCase = { borrow: unreachable };

describe("LoanController", () => {
  const controller = new LoanController(borrowBook);

  it("should return 400 without calling the core when memberId is invalid", () => {
    const response = controller.borrow({ memberId: "XYZ", bookId: "B-1" });
    assert.equal(response.status, 400);
  });

  it("should return 400 without calling the core when bookId is invalid", () => {
    const response = controller.borrow({ memberId: "M-1", bookId: "XYZ" });
    assert.equal(response.status, 400);
  });
});
