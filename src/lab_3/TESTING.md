# Testing

## Baseline (`npm test`, 2026-10-08, Node 26.10)

| Tests | Suites | Pass | Fail | Duration |
|------:|-------:|-----:|-----:|---------:|
| 15    | 5      | 14   | 1    | ~167 ms  |

The failing test is `SqliteLoanRepository > finds all the open loans of a member` (expected 2, got 3).
Both tests in that file share one `:memory:` repository, so the loan saved by the first test leaks
into the second. It is a test-isolation bug, not an adapter bug.

### Baseline classification

| File                                         | Level       | Layer       | Tests |
|----------------------------------------------|-------------|-------------|------:|
| `test/domain/BookId.test.ts`                 | Unit        | Domain      | 3     |
| `test/domain/MemberId.test.ts`               | Unit        | Domain      | 3     |
| `test/domain/Loan.test.ts`                   | Unit        | Domain      | 4     |
| `test/domain/LoanPolicy.test.ts`             | Unit        | Domain      | 3     |
| `test/application/` (empty)                  | Unit        | Application | 0     |
| `test/adapters/SqliteLoanRepository.test.ts` | Integration | Adapter     | 2     |
| `test/e2e/` (empty)                          | End-to-end  | Whole app   | 0     |

`test/fakes/` holds test doubles (`FakeLoanRepository`, `FakeMemberNotifier`), not tests. They are
not used by any test yet.

### Baseline pyramid

```
                  /\
                 /  \         E2E           0   -> protects the WIRING
                /____\                            (main.ts + HTTP + real adapters together)
               /      \
              /   2    \      Integration   2   -> protects the TECHNICAL DETAILS
             /__________\     (1 failing)         (SQL, mapping, HTTP status codes, ...)
            /            \
           /     13       \   Unit         13   -> protects the BUSINESS RULES
          /   domain: 13   \                      (loan limit, due date, overdue, ids)
         /  application: 0  \
        /____________________\
```

### Baseline gaps

| Level              | State   | What is not protected                                                                 |
|--------------------|---------|---------------------------------------------------------------------------------------|
| Unit / application | Missing | `BorrowBookService`: rejects when the policy says no, saves the loan, notifies member |
| Integration / out  | Weak    | `SqliteLoanRepository`: shared state, closed loans excluded, status update on resave  |
| Integration / in   | Missing | `HttpLoanController`: 201 / 400 / 401 / 404 / 409 mapping, response body shape       |
| Integration / out  | Missing | Notifiers (`SmtpEmailSender`, `SmsNotifier`) — simulated, low value; skip for now     |
| E2E                | Missing | Nothing proves `main.ts` wires HTTP → service → SQLite correctly                      |

Side finding: `FakeLoanRepository.findOpenLoansOf` does not filter by `isOpen()`, unlike both real
adapters. A fake that breaks the port contract makes application tests lie.

## Test doubles (`test/application/doubles.test.ts`)

| Double       | Replaces         | Used to                                                    |
|--------------|------------------|------------------------------------------------------------|
| Stub         | `LoanRepository` | Force an input (always 3 open loans) → assert rejection    |
| Mock         | `MemberNotifier` | Verify an interaction (`mock.fn()`: called once, right id) |
| Fake         | `LoanRepository` | Working in-memory implementation → assert resulting state  |
| Failing stub | `MemberNotifier` | Force an error (`SMTP down`) → observe side effects        |

### Observation: a failed notification leaves a saved loan (not fixed, Module 5)

`BorrowBookService.borrow` calls `loans.save(loan)` and then `notifier.notifyLoanOpened(loan)`.
When the notifier throws `Error("SMTP down")`:

- the caller gets an error (over HTTP: **500**), so the client believes the borrow failed;
- but the loan **is already persisted** and counts as open: it uses one of the member's 3 slots;
- a client retry creates a **second** loan for the same book.

So the use case is not atomic: persistence and notification are one request but not one unit of
work, and a non-essential side effect (email/SMS) can fail the essential one (opening the loan).
The test `[failing stub] keeps the loan saved even when the notification fails` pins the current
behaviour; it must be updated when this is fixed in Module 5.

## Plan (status at the end of Lab 3)

1. ✅ **Fix the integration test isolation**: create a fresh `SqliteLoanRepository(":memory:")` per
   test (`beforeEach`), and close it after.
2. ✅ **Add application unit tests** (`test/application/BorrowBookService.test.ts`) using the fakes
   and a fixed `now`:
   - should open, save and notify a loan when the member is allowed
   - should throw `LoanNotAllowedError` and not save or notify at the limit
   - should throw when the member has an overdue loan
   Fix `FakeLoanRepository` to filter open loans first.
3. ✅ **Extend the repository integration tests** (contract suite included):
   - should not return closed loans
   - should update the status when a loan is saved again
   - should round-trip all fields (due date, ids, status)
   - optionally: one contract test suite run against both the SQLite adapter and the fake
4. ⏳ **Add HTTP adapter integration tests** (still open; E2E covers 201/401/409 only) (`test/adapters/HttpLoanController.test.ts`): start
   `createServer` on port 0 with a stub `BorrowBookUseCase`, assert 201, 400 (bad JSON / bad ids),
   401, 404, 409.
5. ✅ **Add one or two E2E tests** (wired by hand in the test; `buildApp` not extracted yet) (`test/e2e/BorrowBook.e2e.test.ts`): run the real wiring with
   an in-memory DB, `POST /loans` → 201, then a 4th loan → 409. `main.ts` calls `listen` at import
   time, so either spawn it as a child process with `PORT`/`DB_PATH` env vars, or extract a
   `buildApp(config)` composition function that both `main.ts` and the test use (recommended:
   faster and no process management).

Target shape after the lab: ~17 unit, ~10 integration, 1–2 E2E.

## After Lab 3 (`npm test`, 2026-10-08, Node 26.10)

| Tests | Suites | Pass | Fail | Duration |
|------:|-------:|-----:|-----:|---------:|
| 33    | 10     | 33   | 0    | ~202 ms  |

| File                                             | Level       | Layer         | Tests |
|--------------------------------------------------|-------------|---------------|------:|
| `test/domain/*.test.ts` (4 files)                | Unit        | Domain        | 13    |
| `test/application/BorrowBookService.test.ts`     | Unit        | Application   | 3     |
| `test/application/doubles.test.ts`               | Unit        | Application   | 4     |
| `test/adapters/SqliteLoanRepository.test.ts`     | Integration | Adapter (out) | 4     |
| `test/contracts/LoanRepository.contract.test.ts` | Contract    | Port (Fake + SQLite) | 6 |
| `test/e2e/borrow.e2e.test.ts`                    | End-to-end  | Whole app     | 3     |

```
                    /\
                   /  \           E2E                3   -> protects the WIRING
                  / 3  \                                    (HTTP → auth → service → SQLite)
                 /______\
                /        \        Integration        4   -> protects the TECHNICAL DETAILS
               /  4 + 6   \       + Contract         6      (SQL, mapping, port semantics
              /____________\                                 shared by real adapter and fake)
             /              \
            /       20       \    Unit              20   -> protects the BUSINESS RULES
           /   domain:    13  \                             (limit, due date, overdue, ids,
          /    application: 7  \                             use-case orchestration)
         /______________________\
```

Unit suite: ~150 ms. `src/core` line coverage: 100%.

### Where is the API key checked?

Only in the **driving HTTP adapter**: `src/adapters/in/http/HttpLoanController.ts:26` compares the
`x-api-key` header with `deps.apiKey` and returns **401** before any port is called. The key value
is chosen at wiring time in `src/main.ts:9` (`API_KEY`, default `dev-key`). Nothing in `src/core`
knows about authentication, which is correct: an API key is an HTTP transport concern. Another
driving adapter (CLI, message consumer) would authenticate its own way, and the core stays free of
it. If authorization ever becomes a business rule (e.g. "only librarians can close a loan"), the
*identity* would cross the port as data, and the *rule* would live in the core.

That is also why the 401 case is an **E2E** test here: unit tests of the core cannot see it.

### Remaining gaps

- **HTTP adapter integration tests** (plan item 4): 400 (bad JSON, invalid ids) and 404 are not
  tested at any level.
- **`main.ts` wiring is not under test.** The E2E test wires the app by hand, so a mistake in
  `main.ts` (wrong adapter, env vars) would go unnoticed. Extracting `buildApp(config)` would let
  `main.ts` and the E2E test share the same wiring.
- **Script globs**: `test:integration` does not include `test/contracts/`; only `npm test` runs it.
- **Failing notification** keeps the loan saved (see above), to be fixed in Module 5.
