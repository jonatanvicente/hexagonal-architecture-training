# Lab 3

> 📦 **STARTER CODE REQUIRED: `library-hexagon-v2`.** Lab 2 (TypeScript/Node 22.13 or later), plus:
> - **`SqliteLoanRepository`**, a real driven adapter using Node's built-in `node:sqlite` (no native packages to install). It accepts a file path or `":memory:"`.
> - **`HttpLoanController`**, a real driving adapter using `node:http`:
>   - `POST /loans` with the JSON body `{ memberId, bookId }`.
>   - The `x-api-key` header is required; it returns 401 if missing or wrong.
>   - `createServer(deps)` returns the server without starting it, so tests can start it on port 0.
> - The domain tests from Lab 2 (`MemberId`, `BookId`, `Loan`, `LoanPolicy`).
> - Scripts:
>   - `test:unit` runs `test/domain` and `test/application`.
>   - `test:integration` runs `test/adapters`.
>   - `test:e2e` runs `test/e2e`.
>   - `test` runs all of them.


[See at Github Repo > src/lib/lab_3/library-hexagon-v2.zip]

---

### 🧩 Exercise 1: Draw Your Test Pyramid

**Objective:**
Understand which kinds of tests a hexagonal app needs, and how many of each.

**Steps:**

1. Run `npm test` and write down the number of tests and the total time.
2. In `TESTING.md`, classify each existing test file as **unit** (domain or application), **integration** (adapter), or **end-to-end** (the whole app).
3. Draw the pyramid by hand, with the number of tests at each level.
4. Next to each level, write **what it protects**:
   - Unit tests protect the business rules.
   - Integration tests protect the technical details.
   - E2E tests protect the wiring.
5. Write down the levels that are missing or weak; you will fill them in during this lab.

**Expected Result:**
- `TESTING.md` contains a small pyramid, with many unit tests and almost no integration or E2E tests.
- A short plan of which tests to add.

---

### 🧩 Exercise 2: Unit Test the Use Case in Isolation

**Objective:**
Test `BorrowBookService` without a database, HTTP, or the system clock.

**Steps:**

1. Create `test/application/BorrowBookService.test.ts`.
2. Use `FakeLoanRepository` and a fake notifier.
3. Write 3 tests:
   - A valid loan is saved, and the member is notified.
   - A 4th loan is rejected, nothing is saved, and no notification is sent.
   - A member with an overdue loan is rejected (pass in a fixed `today`).
4. Run `npm run test:unit`. The whole unit suite must take **less than 1 second**.
5. Run it with coverage, `node --import tsx --test --experimental-test-coverage "test/domain/**/*.test.ts" "test/application/**/*.test.ts"`, and check that `src/core` has more than 90% line coverage.

**Expected Result:**
- 3 new tests that pass in milliseconds.
- `src/core` coverage is above 90%.

---

### 🧩 Exercise 3: Stubs, Fakes and Mocks

**Objective:**
Know when to use each kind of test double, and use one to expose a transaction pitfall.

**Steps:**

1. In `test/application/doubles.test.ts`, write one test with each double:
   - **Stub:** a `LoanRepository` whose `findOpenLoansOf` always returns 3 loans. Assert that the loan is rejected.
   - **Mock:** the notifier, using `mock.fn()` from `node:test`. Assert it was called **once** with the right `memberId`.
   - **Fake:** the existing `FakeLoanRepository`. Assert the state after borrowing.
2. Write a **failing stub**: a notifier whose `notifyLoan` throws `new Error("SMTP down")`.
3. Borrow a book with it, then check the repository: **is the loan saved even though the request failed?**
4. Write down what you observe in `TESTING.md`. Don't fix it; it will be solved in Module 5.

**Expected Result:**
- 3 tests, each clearly labelled stub, mock, or fake.
- A test that shows the loan **is saved** even when the notification fails.

---

### 🧩 Exercise 4: Integration Test the SQLite Adapter

**Objective:**
Test a real adapter against a real database in a controlled, repeatable environment.

**Steps:**

1. Run `npm run test:integration`. Some tests fail.
2. Run one failing test alone with `--test-name-pattern="<test name>"`. It passes.
3. Find the cause: all the tests share one database, so data from one test leaks into the next.
4. Fix it by creating a **fresh `":memory:"` database in `beforeEach`**.
5. Add 2 tests:
   - A loan that is saved can be found by its member.
   - A closed loan is **not** returned by `findOpenLoansOf`.
6. Run the suite 3 times in a row; it must pass every time.

**Expected Result:**
- The integration tests are independent of order and repeatable.
- No files are left on disk after running them.

---

### 🧩 Exercise 5: Contract Test for the Repository Port

**Objective:**
Make sure every implementation of a port, including test fakes, behaves the same way.

**Steps:**

1. Create `test/contracts/loanRepositoryContract.ts` exporting a function:
   ```ts
   export function loanRepositoryContract(name: string, create: () => LoanRepository) { ... }
   ```
2. Inside it, write 3 tests that use only the **port interface**:
   - A saved loan is found.
   - A closed loan is not open.
   - Different members don't see each other's loans.
3. Run the contract against **both** implementations:
   - `loanRepositoryContract("Fake", () => new FakeLoanRepository())`
   - `loanRepositoryContract("SQLite", () => new SqliteLoanRepository(":memory:"))`
4. The fake fails. Fix the bug in `FakeLoanRepository`.
5. Re-run the tests from Exercise 2; the one that failed now passes.

**Expected Result:**
- One contract, run against two implementations, with both passing.
- The bug in the fake is found and fixed, and Exercise 2 is fully green.

---

### 🧩 Exercise 6: End-to-End Tests and Security

**Objective:**
Validate the whole app through HTTP, including a cross-cutting concern (authentication).

**Steps:**

1. Create `test/e2e/borrow.e2e.test.ts`.
2. In `before`, wire the real app:
   - `SqliteLoanRepository(":memory:")` and a fake notifier.
   - `createServer(...)`, then `server.listen(0)` to get a random free port.
3. In `after`, close the server.
4. Using `fetch`, write **only 3 tests**:
   - A valid request with the API key returns 201.
   - A request **without** the API key returns 401, and no loan is saved.
   - A 4th loan returns 409.
5. Check where the API-key check lives in `src/` and write the answer in `TESTING.md`.
6. Run `npm test`, then update the pyramid in `TESTING.md` with the new numbers and time.

**Expected Result:**
- 3 E2E tests pass in a few seconds without any external server.
- Authentication is checked in the **HTTP adapter**, not in the core.
- The final pyramid has many unit tests, some integration and contract tests, and a few E2E tests.

---

**⏱️ Suggested timing:** theory 1.5 h, Ex1 20 min, Ex2 30 min, Ex3 40 min, Ex4 35 min, Ex5 35 min, Ex6 40 min.