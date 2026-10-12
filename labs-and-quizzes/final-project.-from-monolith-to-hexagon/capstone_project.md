# Lab 5: Capstone, "The Library Platform"


> 📦 **STARTER CODE: `library-platform`**. See at Github Repo > src/lib/lab_final/library-platform.zip

## 📖 The scenario

The **City Library** is happy: the loans app you migrated in the Final Project is
fast, tested and easy to change. So the director comes back with bigger plans.

> *"Until now the app only knew about loans. Now we want to manage the whole library:
> what books we have, how many copies of each, and the money members owe us.
> Different teams will look after each part, so changing one part must not break the others."*

The library has three departments, and each one speaks its own language:

| Department | What it cares about | Its words |
|---|---|---|
| 📚 **Catalog** | Which books the library owns and how many copies are on the shelf | book, title, copy, available |
| 🔄 **Lending** | Who has which book, and until when | member, loan, due date, return |
| 💶 **Fines** | How much each member owes, and payments | fine, account, balance, payment |

## ✅ New business rules

1. The librarian **registers books** with a title and a number of copies.
2. A member can only borrow a book that is **registered** and has a **copy available**.
3. When a book is lent, one copy leaves the shelf. When it's returned, the copy goes back.
4. Returning a book late creates a **fine**: €0.50 per day, at most €10 per loan.
5. Fines add up in the member's **account**. Members can **pay** all or part of it.
6. A member who **owes more than €5** cannot borrow books.
7. All the existing rules still apply (at most 3 open loans, no borrowing with an overdue loan).

## 🎯 Your mission

Turn the app into a **platform of three hexagons** living in the same codebase
(a *modular monolith*): **Catalog**, **Lending** (already exists) and **Fines**.

Each hexagon must:
- have its own domain, ports and adapters;
- own its data (its own tables);
- talk to the other hexagons only through their **public contract**.

## 🚧 Constraints

- Everything runs **on your machine**: no Docker, no external servers, no CI.
- Run `npm run check` before every commit. **Never commit on red.**
- You may use AI, but **you** are the architect: the architecture rules decide, not the AI.
- Small commits, with meaningful messages.

## 🏁 Definition of done

- [ ] Registering a book, borrowing, returning, paying and checking a balance work through HTTP.
- [ ] All the business rules above are covered by tests.
- [ ] `npm run check` is green, and `check:arch` lists the 3 hexagons.
- [ ] `ASSESSMENT.md` shows the metrics before and after.
- [ ] An ADR explains your main decisions.
- [ ] A 5-minute presentation of your platform.

> 💡 **Think like the library:** before writing code, ask *"which department does this
> rule belong to?"* If you can't answer, draw the context map first (Exercise 1).

---

### 🧩 Exercise 1: Map the Platform (recap Lab 1)

**Objective:**
Understand the starting point and design the three hexagons before writing code.

**Steps:**

1. Run `npm install`, `npm run check`, and `npm start`. Borrow and return a book with `curl` (see README).
2. Run `npm run metrics` and save the output in `ASSESSMENT.md` as **"Before"**.
3. Read these new requirements from the librarian:
   > *"We register **books** with a **number of copies**. A book can only be borrowed if a **copy is available**. **Fines** must be kept in a member **account**, members can **pay** them, and a member who **owes more than €5** cannot borrow."*
4. Create `CONTEXT-MAP.md`: draw the 3 hexagons (Catalog, Lending, Fines), their responsibilities, and the arrows between them. Mark each arrow as **sync** (a port call) or **async** (an event).
5. Complete `GLOSSARY.md` for Catalog and Fines. Note any word that means something different in two hexagons.

**Expected Result:**
- `ASSESSMENT.md` with the baseline, and a context map close to the target diagram.
- A glossary per hexagon.

**❓ Discussion:**
- *"Why three hexagons and not one bigger hexagon?"* 
- *"'Book' appears in Catalog and Lending. Is that duplication?"* 
- *"Why not microservices directly?"* 

---

### 🧩 Exercise 2: Guard the Boundaries (recap Labs 1–2)

**Objective:**
Turn the platform rules into executable checks before adding new hexagons.

**Steps:**

1. Read `scripts/check-arch.ts` and the "Rules of the platform" in the README.
2. **TODO 1:** add `"catalog"` and `"fines"` to `HEXAGONS`.
3. **TODO 2:** implement `isAllowedCrossHexagonImport` so another hexagon may only use the public contract: `ports/in` and `events`.
4. **Sabotage** (then revert each one):
   - import an adapter from `src/lending/domain/Loan.ts`;
   - import `node:sqlite` from a Lending application service;
   - import `src/lending/domain/Loan.ts` from a file in `src/catalog/adapters/`.
5. Check that each sabotage fails with a clear message, and write the 3 messages in `ASSESSMENT.md`.

**Expected Result:**
- `npm run check:arch` passes and lists the 3 hexagons.
- Each sabotage is detected.

**❓ Discussion:**
- *"Why can only adapters import another hexagon?"* 
- *"Why is `events` public but `domain` not?"* 

---

### 🧩 Exercise 3: The Catalog Domain (recap Lab 2)

**Objective:**
Model the Catalog core with an entity, invariants, and its own errors.

**Steps:**

1. Create `src/catalog/domain/CatalogErrors.ts`: `NoCopyAvailableError`, `BookAlreadyRegisteredError`, `BookNotFoundError` (all extend `DomainError`).
2. Create the `Book` entity in `src/catalog/domain/Book.ts`:
   - `Book.register(id: BookId, title: string, copies: number)`. The title can't be empty, and copies must be an integer from 1 to 100 (else `InvalidValueError`).
   - `availableCopies` starts equal to `totalCopies` and changes only through methods.
   - `checkOut()` throws `NoCopyAvailableError` when no copy is left; `checkIn()` throws if all copies are already in.
   - `isAvailable()` and `Book.reconstitute(...)`.
3. Write 5 unit tests in `test/catalog/domain/Book.test.ts`: valid book, invalid copies, check out, no copy left, check in.

**Expected Result:**
- `Book` protects its invariant: `0 ≤ availableCopies ≤ totalCopies`.
- 5 tests pass in milliseconds, and `check:arch` is green.

**❓ Discussion:**
- *"Why not a public `availableCopies` field that Lending updates?"* 
- *"Is `BookId` from `shared/kernel` OK here?"* 

---

### 🧩 Exercise 4: Catalog Use Cases and Ports (recap Labs 2–3)

**Objective:**
Define the Catalog boundary and orchestrate its use cases.

**Steps:**

1. Driving ports (`src/catalog/ports/in/`):
   - `RegisterBookUseCase.register(bookId, title, copies): BookView`
   - `GetBookQuery.get(bookId): BookView | null`
   - `CopyTrackingUseCase` with `checkOut(bookId)` and `checkIn(bookId)`
   - `BookView` is a plain object: `{ bookId: string, title, totalCopies, availableCopies }`.
2. Driven port: `BookRepository` with `save(book)` and `findById(bookId)` in `ports/out`.
3. Application services: `RegisterBookService` (rejects duplicates), `GetBookService`, `CopyTrackingService` (throws `BookNotFoundError` for unknown books).
4. Create `test/catalog/fakes/FakeBookRepository.ts` and write 4 unit tests: register, duplicate, check out, unknown book.

**Expected Result:**
- The Catalog core is complete and tested without a database.
- Ports return `BookView`, not the `Book` entity.

**❓ Discussion:**
- *"Why return `BookView` instead of `Book`?"* 
- *"Is `GetBookQuery` a use case?"* 

---

### 🧩 Exercise 5: Catalog Adapters and Module (recap Lab 3)

**Objective:**
Plug the Catalog hexagon into the platform.

**Steps:**

1. `SqliteBookRepository` in `src/catalog/adapters/out/persistence/`, using its own table `catalog_books`.
2. Write a `bookRepositoryContract` and run it against the fake and SQLite (same pattern as `test/lending/contracts`).
3. Routes in `src/catalog/adapters/in/http/catalogRoutes.ts`:
   - `POST /books` `{ bookId, title, copies }` → 201, or 409 if it already exists.
   - `GET /books/:bookId` → 200, or 404.
4. Create `src/catalog/catalogModule.ts` (copy the shape of `lendingModule.ts`) and add it in `src/app.ts`, including its routes.
5. Write 2 E2E tests in `test/e2e/catalog.e2e.test.ts`. Run `npm run check`.

**Expected Result:**
- Books can be registered and read through HTTP.
- The contract passes for both repositories, and nothing in `src/lending` changed.

**❓ Discussion:**
- *"Why one database file but separate tables per hexagon?"* 
- *"Why does each hexagon have a module file?"*

---

### 🧩 Exercise 6: Lending Asks Catalog (sync integration, recap Module 3)

**Objective:**
Reject loans of unknown or unavailable books, without coupling the Lending core to Catalog.

**Steps:**

1. In Lending, create a driven port `BookAvailability` with `statusOf(bookId): "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN"`.
2. In `BorrowBookService`, throw `BookNotFoundError` (Lending's own error) for unknown books and `BookNotAvailableError` for unavailable ones.
3. Create the adapter `src/lending/adapters/out/catalog/CatalogBookAvailability.ts`, which implements `BookAvailability` by calling Catalog's `GetBookQuery` and **translating** the `BookView` into the status.
4. `createLendingModule` receives Catalog's `GetBookQuery`; in `app.ts` create Catalog **before** Lending.
5. Map the new errors in `lendingRoutes.ts`: 404 and 409.
6. Update the tests that broke:
   - `BorrowBookService.test.ts`: use a **stub** `BookAvailability`.
   - E2E tests: register the books first with `POST /books`.
7. Run `npm run check` and `npm run metrics`: "Cross-hex imports" is now above 0 for Lending only.

**Expected Result:**
- Borrowing an unknown book returns 404, and an unavailable book returns 409.
- The Lending core imports nothing from Catalog (only the adapter does).

**❓ Discussion:**
- *"Why not call `GetBookQuery` directly from `BorrowBookService`?"* 
- *"Why did existing tests break?"* 
- *"If Catalog became a microservice?"* 

---

### 🧩 Exercise 7: Keep Copies in Sync with Events (async integration, recap Lab 4)

**Objective:**
Update Catalog's available copies when books are lent and returned, without Lending calling Catalog.

**Steps:**

1. Create the event `src/lending/events/LoanOpened.ts` `{ type, loanId, memberId, bookId, dueDate, occurredAt }` (primitives only).
2. `BorrowBookService` publishes `LoanOpened` through `EventPublisher` (add it to the constructor).
3. Add `bookId` to `LoanClosed`. Adding a field doesn't break existing subscribers.
4. In Catalog, create 2 driving adapters in `src/catalog/adapters/in/events/`: `CheckOutCopyOnLoanOpened` and `CheckInCopyOnLoanClosed`. Both call `CopyTrackingUseCase`.
5. Subscribe them in `catalogModule.ts` (it receives the event bus).
6. E2E test: register a book with **1 copy**, M-1 borrows it (201), M-2 tries (409), M-1 returns it, M-2 borrows it (201).

**Expected Result:**
- Availability changes through events only.
- `git diff --stat` shows Catalog didn't import Lending's core, only `lending/events`.

**❓ Discussion:**
- *"Why an event and not `catalog.checkOut()` from Lending?"* 
- *"Sync for availability, async for copies: isn't that inconsistent?"* 
- *"Why add a field instead of creating `LoanClosedV2`?"* 

---

### 🧩 Exercise 8: Extract the Fines Domain (recap Final Project)

**Objective:**
Move the money rules out of Lending into their own hexagon.

**Steps:**

1. Move `Fine` and `FinePolicy` to `src/fines/domain/` (use the IDE's *move* feature). Change the signature to `fineFor(dueDate: Date, returnedAt: Date): Fine`.
2. Add `Fine.plus(other)` and `Fine.minus(other)` (never below zero).
3. Create the entity `MemberAccount` (`memberId`, `balance: Fine`) with:
   - `charge(fine)`;
   - `pay(amount)`, which throws `InvalidPaymentError` if the amount is zero or larger than the balance;
   - `owes(): Fine`.
4. Move the `Fine` tests to `test/fines/domain/` and add 4 tests for `MemberAccount`.
5. Lending stops compiling. **Leave it for now** and note in `ASSESSMENT.md` which files depend on the fine.

**Expected Result:**
- Money rules live only in `src/fines/domain/`.
- A list of the Lending files to update in Exercise 9.

**❓ Discussion:**
- *"Why move fines out of Lending?"* 
- *"Why change `fineFor(loan, today)` to `fineFor(dueDate, returnedAt)`?"* 

---

### 🧩 Exercise 9: Fines Hexagon, End to End (recap Modules 3–4)

**Objective:**
Complete the Fines hexagon and make Lending publish facts instead of calculating money.

**Steps:**

1. Ports in `src/fines/ports/`:
   - in: `ChargeLateReturnUseCase.charge(memberId, dueDate, returnedAt)`, `PayFineUseCase.pay(memberId, cents)`, `GetBalanceQuery.balanceOf(memberId): number` (cents).
   - out: `MemberAccountRepository` with `findByMember` (a new account with balance 0 if none) and `save`.
2. Application services, `SqliteMemberAccountRepository` (table `fines_accounts`), and its contract test.
3. The subscriber `ChargeFineOnLoanClosed` in `src/fines/adapters/in/events/`.
4. Routes: `GET /members/:memberId/balance` → `{ memberId, balanceEuros }`, and `POST /members/:memberId/payments` `{ amountEuros }` → 200, or 409 for an invalid payment.
5. Update Lending:
   - `LoanClosed` carries `dueDate` instead of `fineCents`.
   - `ReturnBookUseCase.returnBook` returns `void`, and `POST /returns` answers `{ loanId, status }`.
   - `notifyLoanClosed(memberId, loanId)` drops the fine; delete `LogFinesOnLoanClosed`.
6. Create `finesModule.ts`, add it to `app.ts`, update the tests that broke, and run `npm run check`.

**Expected Result:**
- A late return adds the fine to the member's balance, which can be read and paid through HTTP.
- `grep -ri "fine" src/lending` finds nothing.

**❓ Discussion:**
- *"Removing `fineEuros` from `/returns` breaks the API. Is that OK?"* 
- *"Why remove `fineCents` from the event?"* 

---

### 🧩 Exercise 10: Lending Asks Fines (a cross-hexagon rule)

**Objective:**
Block members who owe more than €5, keeping each rule in the right hexagon.

**Steps:**

1. In Lending, create a driven port `MemberStanding` with `outstandingCentsOf(memberId): number`.
2. Add the rule to `LoanPolicy`: `canBorrow(openLoans, today, outstandingCents)` returns `false` if the debt is **more than 500 cents**. Add 2 unit tests (exactly €5 is allowed, €5.01 is not).
3. Create the adapter `src/lending/adapters/out/fines/FinesMemberStanding.ts`, which calls `GetBalanceQuery`.
4. Wire it in `lendingModule.ts` and `app.ts`, and update the tests that broke with a stub.
5. E2E test: return a book 11 days late (€5.50), borrowing is rejected, pay €1, borrowing works again.

**Expected Result:**
- The debt limit is a Lending rule; the balance is a Fines fact.
- `npm run metrics` shows Lending as the only hexagon that imports others.

**❓ Discussion:**
- *"Why is the €5 rule in Lending and not in Fines?"*
- *"Is there a dependency cycle between hexagons?"* 

---

### 🧩 Exercise 11: A Test Strategy per Hexagon (recap Lab 3)

**Objective:**
Check that every hexagon has a healthy pyramid and that its doubles are honest.

**Steps:**

1. Update `TESTING.md` with one pyramid **per hexagon** (unit / integration + contract / E2E).
2. Write a contract for the cross-hexagon port, `bookAvailabilityContract`, run against:
   - your stub from Exercise 6, with a book configured;
   - the real `CatalogBookAvailability` connected to a real Catalog with a fake repository.
   Both must agree for `AVAILABLE`, `UNAVAILABLE`, and `UNKNOWN`.
3. Run `npm run test:unit` and check it still takes **about a second or less**.
4. Write down which hexagon has the weakest pyramid and add the missing tests.

**Expected Result:**
- One pyramid per hexagon, with a wide unit-test base in each.
- The stub and the real adapter pass the same contract.

**❓ Discussion**
- *"Why a contract for a port between hexagons?"* 
- *"Are E2E tests now more important, with 3 hexagons?"* 

---

### 🧩 Exercise 12: Test the Event Flow (recap Module 5)

**Objective:**
Verify how the hexagons react to events, including when something fails.

**Steps:**

1. Create `test/integration/eventFlow.test.ts`. Build the three modules with a real `InMemoryEventBus` and a `:memory:` database, **without HTTP**.
2. Test: a borrow lowers the available copies, and a late return raises the balance.
3. **Failure test:** subscribe a handler that throws for `LoanClosed`, then return a book. Check:
   - Is the loan closed in Lending?
   - Did Catalog check the copy in? Did Fines charge the fine?
4. Write the results in `TESTING.md` and propose a solution, without implementing it.

**Expected Result:**
- 2 passing flow tests.
- A documented inconsistency: the loan is closed but some subscribers didn't run.

**❓ Discussion:**
- *"Why did some subscribers run and others not?"* 
- *"How is it solved in production?"* 

---

### 🧩 Exercise 13: The Full User Journey (E2E)

**Objective:**
Prove that the three hexagons work together through the public API.

**Steps:**

1. In `test/e2e/journey.e2e.test.ts`, write **one** test with this story:
   1. Register B-1 with 1 copy → 201.
   2. M-1 borrows B-1 → 201. M-2 tries → 409.
   3. 25 days later, M-1 returns it → 200. Balance is €5.50.
   4. M-1 tries to borrow → 409. M-2 borrows B-1 → 201.
   5. M-1 pays €5.50 → balance €0. M-1 can borrow another registered book → 201.
2. Add one security test: each hexagon's routes reject requests without an API key (401).
3. Run `npm run check` 3 times in a row: all green, and no `.db` files are left.

**Expected Result:**
- One readable test that tells the business story across the three hexagons.
- The whole suite is repeatable.

**❓ Discussion:**
- *"Why one long test instead of many short ones?"* 
- *"Where is authentication checked?"* 

---

### 🧩 Exercise 14: Final Assessment and Next Step

**Objective:**
Measure the result and decide how the platform could evolve.

**Steps:**

1. Run `npm run metrics` and add an **"After"** column to `ASSESSMENT.md`. Compare:
   - files and biggest function per hexagon;
   - cross-hexagon imports (and which files they are);
   - test count and time per level.
2. Write `docs/adr/0003-modular-monolith.md`: three hexagons, sync ports for questions, events for facts, one database with tables owned by each hexagon, and the `/returns` breaking change.
3. Answer in the ADR: **"If we must extract one hexagon into a microservice, which one first, and which files would change?"** List the exact adapters.
4. Prepare a **5-minute presentation**: context map, one design decision, the metrics, and one open risk (for example, Exercise 12).

**Expected Result:**
- Evidence-based conclusions, each backed by a number.
- A justified extraction plan in which only adapters, modules and `app.ts` change.

**❓ Discussion:**
- *"Which hexagon first?"* 
- *"What changes when extracting Fines?"* 
- *"Was the modular monolith a waste if we split it later?"* 

---

**⏱️ Suggested timing:** about 7 hours, in two sessions. Session 1: Ex1 20 min, Ex2 25 min, Ex3 25 min, Ex4 30 min, Ex5 35 min, Ex6 40 min, Ex7 40 min. Session 2: Ex8 30 min, Ex9 50 min, Ex10 35 min, Ex11 30 min, Ex12 30 min, Ex13 25 min, Ex14 30 min (plus presentations).

---
