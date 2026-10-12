# Library Loans (final project)

A small library app that lets members borrow and return books.

- **Borrowing** (`POST /loans`) is already hexagonal (solution of Lab 3).
- **Returning** (`POST /returns`) is still **legacy** code in `src/legacy/`.
  Your job is to migrate it.

## Requirements

- Node.js 22.13 or later (uses the built-in `node:sqlite` module)

## Setup

```bash
npm install
git init && git add . && git commit -m "Start final project"
```

## Run

```bash
npm start
```

Then, in another terminal:

```bash
# borrow a book (copy the "id" from the response)
curl -s -X POST http://localhost:3000/loans \
  -H "Content-Type: application/json" -H "x-api-key: dev-key" \
  -d '{"memberId":"M-1","bookId":"B-100"}'

# return it
curl -s -X POST http://localhost:3000/returns \
  -H "Content-Type: application/json" -H "x-api-key: dev-key" \
  -d '{"loanId":"<id>"}'
```

Environment variables: `PORT` (3000), `API_KEY` (dev-key), `DB_PATH` (library.db), `NOTIFIER` (email | sms).

## Commands

```bash
npm test                  # all tests
npm run test:unit         # domain + application
npm run test:integration  # adapters + port contracts
npm run test:e2e          # whole app through HTTP
npm run typecheck         # type check
npm run check:arch        # dependency rule check
npm run metrics           # code metrics per folder
```

## Writing end-to-end tests

`test/e2e/helpers.ts` starts the whole app with an in-memory database:

```ts
const app = await startTestServer({ today: new Date("2026-01-01T10:00:00Z") });
const loan = await post(app.baseUrl, "/loans", { memberId: "M-1", bookId: "B-1" });

app.setToday(new Date("2026-01-18T10:00:00Z")); // 3 days after the due date
const result = await post(app.baseUrl, "/returns", { loanId: loan.body.id });

await app.close();
```

## Structure

```
src/
  core/
    domain/          Loan, MemberId, BookId, LoanPolicy
    application/     BorrowBookService
    ports/in/        BorrowBookUseCase
    ports/out/       LoanRepository, MemberNotifier
  adapters/
    in/http/         HttpLoanController (routes /loans and /returns)
    out/persistence/ SqliteLoanRepository, MySqlLoanRepository (simulated)
    out/notification SmtpEmailSender, SmsNotifier (simulated)
  legacy/            ReturnController  <- to be migrated
  main.ts            wiring
scripts/
  metrics.ts         code metrics
test/
  domain/  application/  adapters/  contracts/  e2e/  fakes/
```
