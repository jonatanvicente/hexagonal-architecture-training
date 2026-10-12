# Library Loans (hexagon v2)

A small library app that lets members borrow books.
This is the solution of Lab 2 and the starting point of Lab 3.

## Requirements

- Node.js 22.13 or later (uses the built-in `node:sqlite` module)

## Setup

```bash
npm install
git init && git add . && git commit -m "Start Lab 3"
```

## Run

```bash
npm start
```

Then, in another terminal:

```bash
curl -i -X POST http://localhost:3000/loans \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key" \
  -d '{"memberId":"M-1","bookId":"B-100"}'
```

Environment variables: `PORT` (3000), `API_KEY` (dev-key), `DB_PATH` (library.db), `NOTIFIER` (email | sms).

## Commands

```bash
npm test                  # all tests
npm run test:unit         # domain + application
npm run test:integration  # adapters
npm run test:e2e          # whole app through HTTP
npm run typecheck         # type check
npm run check:arch        # dependency rule check
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
    in/http/         HttpLoanController
    out/persistence/ SqliteLoanRepository, MySqlLoanRepository (simulated)
    out/notification SmtpEmailSender, SmsNotifier (simulated)
  main.ts            wiring
test/
  domain/  application/  adapters/  e2e/  fakes/
```
