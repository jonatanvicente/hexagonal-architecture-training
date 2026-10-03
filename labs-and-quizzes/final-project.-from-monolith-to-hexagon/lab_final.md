# 🧪  Lab Final


> 📦 **STARTER CODE REQUIRED: `library-final`.** Lab 3 (TypeScript/Node 22.13 or later; borrowing already hexagonal, with all tests green), plus a **legacy feature** to migrate:
> - **`src/legacy/ReturnController.ts`**, a "fat" MVC controller for `POST /returns` with the body `{ loanId }`. In **one function**, it:
>   - reads and updates the `loans` table with raw SQL (sharing the SQLite database with the hexagon),
>   - calculates a fine with **floats**: €0.50 per day late, capped at €10,
>   - prints an email with `console.log`, and returns `{ loanId, status, fineEuros }`.


[See at Github Repo > src/lib/lab_final/library-final.zip]

---

### 🧩 Exercise 1: Assess the Starting Point

**Objective:**
Measure the legacy code before changing it, so the improvement can be proven with numbers.

**Steps:**

1. Run `npm test` and `npm start`, then try `POST /returns` with `curl`.
2. Run `npm run metrics` and copy the results into a table in `ASSESSMENT.md`, comparing `src/legacy` with `src/core`.
3. Read `ReturnController.ts` and list its **responsibilities**: HTTP, SQL, business rules, notification, and so on.
4. Mark the **seams**, the points where you can cut the code apart: the fine calculation, the database access, and the email.
5. **Without AI**, write down 2 risks of changing this code right now.

**Expected Result:**
- `ASSESSMENT.md` with baseline metrics, the list of responsibilities, and the seams.
- The students can explain why `ReturnController` is hard to change: it mixes 4 or more responsibilities and has no tests.

---

### 🧩 Exercise 2: Build a Safety Net (Characterization Tests)

**Objective:**
Capture the **current** behavior of the legacy feature before refactoring it.

**Steps:**

1. Create `test/e2e/returns.characterization.test.ts` using `startTestServer()`.
2. For each case, borrow a book through `POST /loans` and then return it through `POST /returns`:
   - A return on time gives `fineEuros: 0`.
   - A return 3 days late gives `fineEuros: 1.5`.
   - A return 40 days late gives `fineEuros: 10` (the cap).
   - Returning the same loan twice gives **200** and `fineEuros: 0` (the quirk).
   - An unknown loan gives **500** (the quirk).
3. To simulate "days late", use the `today` override that `startTestServer({ today })` accepts.
4. All the tests must **pass against the legacy code**. If one fails, fix the test, not the code: you are describing what *is*, not what *should be*.
5. Commit with the message `test: characterize legacy returns`.

**Expected Result:**
- 5 characterization tests, all green against the legacy code.
- The quirks are documented in the tests with a `// LEGACY QUIRK` comment.

---

### 🧩 Exercise 3: Build the New Hexagonal Slice

**Objective:**
Implement "return a book" in the hexagon, reusing the existing domain.

**Steps:**

1. **Domain:**
   - Create a `Fine` value object that stores **cents** (an integer), with `Fine.zero()`, `Fine.ofCents(n)`, and `toEuros()`.
   - Create a `FinePolicy` domain service with `fineFor(loan, today): Fine` (50 cents per day late, capped at 1000 cents).
   - Write 3 unit tests: on time, 3 days late, and over the cap.
2. **Ports:**
   - Add `ReturnBookUseCase` with `returnBook(loanId, today): Fine` to `ports/in`.
   - Add `findById(id): Loan | null` to `LoanRepository`.
   - Add `notifyLoanClosed(loan, fine)` to `MemberNotifier`.
3. **Application:** create `ReturnBookService`, which loads the loan, closes it (`loan.close()`), calculates the fine, saves the loan, and notifies the member.
4. **Adapters:** implement `findById` in `SqliteLoanRepository` and in `FakeLoanRepository`, and add `findById` to the **repository contract test** from Lab 3.
5. Run `npm test` and `npm run check:arch`; everything must be green.

**Expected Result:**
- A complete "return" slice in the hexagon, unit-tested with fakes.
- Money is handled in cents, with no floats in the domain.
- The contract tests pass for both repositories.
- The legacy code is still untouched and still serving traffic.

---

### 🧩 Exercise 4: Strangle the Legacy Code (Strangler Fig)

**Objective:**
Switch the traffic from the legacy code to the hexagon gradually and safely, and then remove the legacy code.

**Steps:**

1. In `HttpLoanController`, route `POST /returns` according to an environment variable: `RETURNS_IMPL=legacy` (the default) or `RETURNS_IMPL=hexagon`.
2. In the HTTP adapter, map the result to the **same JSON shape** as the legacy response: `{ loanId, status, fineEuros }`.
3. Run the characterization tests against **both** implementations by calling `startTestServer({ returnsImpl })` in a loop.
4. The quirk tests fail on the hexagon. **Decide** with your team, and write the decision in `docs/adr/0002-returns-migration.md`:
   - Keep the quirks (map the errors to 200 and 500), **or**
   - Fix them (409 for an already-returned loan, 404 for an unknown loan) and update the tests deliberately.
5. Change the default to `hexagon` and commit.
6. Delete `src/legacy/` and the toggle, and commit again. All tests must still be green.

**Expected Result:**
- Both implementations pass the same tests before the switch.
- An ADR documents the decision about the quirks.
- The legacy folder is deleted, with the history kept in git.


---

### 🧩 Exercise 5: Toward Event-Driven Architecture

**Objective:**
Decouple the side effects of returning a book with a domain event, preparing the code for microservices.

**Steps:**

1. In the domain, create a `LoanClosed` event: `{ loanId, memberId, fineCents, occurredAt }`.
2. Create a driven port, `EventPublisher`, with `publish(event)`.
3. Change `ReturnBookService` so it **publishes `LoanClosed`** instead of calling `MemberNotifier` directly.
4. Create an adapter, `InMemoryEventBus`, that implements `EventPublisher` and lets you `subscribe(handler)`.
5. Write 2 subscribers in `src/adapters/in/events/`:
   - `NotifyMemberOnLoanClosed`, which calls the existing `MemberNotifier`.
   - `LogFinesOnLoanClosed`, which prints `[FINES] M-1 owes €1.50` when the fine is greater than 0.
6. Wire everything in `main.ts`, and test `ReturnBookService` with a **fake publisher** that records events.

**Expected Result:**
- `ReturnBookService` knows nothing about notifications or fines logging.
- Adding the second subscriber required **no changes** to the core (check with `git diff --stat`).
- All tests are green.

---

### 🧩 Exercise 6: Final Assessment

**Objective:**
Prove the improvement with numbers and present the result.

**Steps:**

1. Run `npm run metrics` again and add an **"After"** column to `ASSESSMENT.md`.
2. Compare at least these numbers:
   - the lines in the biggest function,
   - the maximum imports per file,
   - the complexity score,
   - the number and speed of the tests (unit vs. E2E).
3. Run `npm run check:arch` and `npm test`, and paste the summary.
4. Write 3 conclusions, each one backed by a number. For example: "The biggest function went from 70 lines to 12."
5. Prepare a **5-minute presentation**: the starting point, the strategy (characterize, build, strangle, delete), the event step, and the metrics before and after.

**Expected Result:**
- `ASSESSMENT.md` with before/after metrics and 3 evidence-based conclusions.
- All tests and architecture checks are green.
- A short, clear presentation for the class.

---

**⏱️ Suggested timing:** intro 15 min, Ex1 20 min, Ex2 35 min, Ex3 55 min, Ex4 35 min, Ex5 40 min, Ex6 20 min (plus presentations).