# Assessment of the legacy code (before the migration)

Subject: `src/legacy/ReturnController.ts` (`POST /returns`).

## 1. Baseline

**Tests:** `npm test` passes 34 tests in 10 suites. None of them calls `POST /returns`.
The return flow has **0 tests**.

**Behavior with `curl`** (server started with `npm start`):

| Request | Response | Notes |
|---|---|---|
| Return an open loan | `200 {"status":"CLOSED","fineEuros":0}` | Email logged: "Thanks for returning book B-100." |
| Return the same loan again | `200 {"status":"CLOSED","fineEuros":0}` | No error. No email. Same response as a real return. |
| `loanId` that does not exist | `500 Internal server error` | `TypeError: Cannot read properties of undefined (reading 'due_date')` |
| `loanId` = `x' OR '1'='1` | `200 {"status":"CLOSED", ...}` | **SQL injection.** With 2 open loans, this request closed both of them. |
| Body that is not valid JSON | `400` | The `SyntaxError` is caught by the HTTP adapter, not by the controller. |

## 2. Metrics (`npm run metrics`)

| Metric | `src/legacy` | `src/core` |
|---|---|---|
| Files | 1 | 9 |
| Lines (non-empty) | 54 | 153 |
| Biggest function | 47 lines (`handle`) | 13 lines (`borrow`) |
| Max imports in one file | 2 | 8 |
| Complexity (decision points) | 8 | 6 |
| Max complexity per function | **8** | **1** |
| Tests | **0** | 21 unit (`test/domain`, `test/application`) + 6 contract + 4 adapter + 3 e2e |

How to read the table:

- The core has three times more lines, but its complexity is spread out: no function has more
  than 1 decision point. In the legacy code, **all** the complexity is in one 47-line function.
- `handle` is the biggest function in the whole project (top 1 of the "Top 5 biggest functions").
- The legacy file has only 2 imports, but this does not mean it has few dependencies. It does not
  import an email sender or a policy because the code is **inline**: SQL, the fine rule and the
  SMTP call are all written inside `handle`.

## 3. Responsibilities of `ReturnController.handle`

| # | Responsibility | Lines | Layer it belongs to |
|---|---|---|---|
| 1 | **HTTP input:** read the body stream and parse the JSON | 18-22 | Inbound adapter |
| 2 | **Input validation:** `loanId` is required and must be a string | 23-29 | Inbound adapter / value object |
| 3 | **Persistence (read):** build a SQL query and load the loan | 32 | Outbound adapter (`LoanRepository`) |
| 4 | **Time:** read the current date (`now`) | 34 | Port (clock), already injected |
| 5 | **Business rule:** a loan can only be returned if it is `OPEN` | 38 | Domain (`Loan`) |
| 6 | **Business rule:** fine of 0.50 EUR per day late, max 10 EUR | 39-46 | Domain (`LoanPolicy`) |
| 7 | **Persistence (write):** close the loan with a SQL `UPDATE` | 49 | Outbound adapter (`LoanRepository`) |
| 8 | **Notification:** build the address, write the message, "send" the email | 51-57 | Outbound adapter (`MemberNotifier`) |
| 9 | **HTTP output:** status code and JSON response | 60-61 | Inbound adapter |

There are 9 responsibilities in 4 different areas (HTTP, SQL, business rules, notification).
Each area changes for a different reason, but they are all in one method.

Other things the controller does **not** do:
- It does not handle "loan not found" (it crashes with a 500).
- It does not handle "loan already closed" (it says `CLOSED` again, with a fine of 0).
- It does not use a transaction: the `UPDATE` and the email are a dual write, as in the borrow flow.

## 4. Seams

Places where we can cut the code and put an interface (port) in between.

| Seam | Where | What to extract | Existing target in the hexagon |
|---|---|---|---|
| **S1: Fine calculation** | lines 39-46 | Pure function `fineFor(dueDate, returnedAt)`. Inputs are 2 dates, output is a number. No I/O. | `LoanPolicy` (domain) |
| **S2: Database access** | lines 32 and 49 | `findById(loanId)` and `save(loan)`. Replace string SQL with parameters. | `LoanRepository` port + `SqliteLoanRepository` |
| **S3: Email** | lines 51-57 | `notifyReturn(memberId, bookId, fine)` | `MemberNotifier` port + `SmtpEmailSender` / `SmsNotifier` |
| S4: Clock | constructor (`now`) | Already a seam: `now` is injected. The e2e helper uses it (`app.setToday`). | Keep it; pass it to the use case |
| S5: HTTP | lines 18-29 and 60-61 | Move parsing and the response into `HttpLoanController`, as `/loans` does already. | `ReturnBookUseCase` (new inbound port) |

Suggested order: **S1 first** (pure logic, easy to test, no risk), then S3 and S2 behind their
ports, and S5 last, when a `ReturnBookService` exists. Before S1, write **characterization
tests** through HTTP with `startTestServer` and `setToday`, to lock the current behavior.

## 5. Risks of changing this code now

1. **No safety net.** No test covers `POST /returns`. The fine rule has edge cases that are easy
   to break without noticing: `Math.ceil` makes 1 minute late = 1 day (0.50 EUR), and the 10 EUR
   cap applies from day 20. A refactor can change the amount charged to members, and no test will
   fail.
2. **Shared state with the hexagon.** The legacy code and `SqliteLoanRepository` use the **same
   database connection and the same `loans` table** (see `main.ts`). The legacy code reads raw
   columns (`due_date`, `status`, `member_id`) and writes the `status` with a string literal. If we
   change the schema or the status values for the new code, the legacy return can break, and the
   other way around. Also, the SQL injection (verified above: one request closed **all** open
   loans) means the current code is already unsafe; we must fix it, but a fix is also a behavior
   change, so we need tests first.

## 6. Why `ReturnController` is hard to change

- It mixes **4 or more areas** (HTTP, SQL, business rules, notification) in **one 47-line
  method** with a complexity of 8. Any change, even a small one, touches the method that does
  everything.
- It has **no tests**, and it cannot be unit tested: it needs a real `IncomingMessage`, a real
  `ServerResponse` and a real SQLite database, and the email goes to `console.log`, so a test cannot
  check it.
- Its error cases are not defined (500 for an unknown loan, 200 for a double return), so we do not
  know which behavior is a bug and which behavior clients depend on.
