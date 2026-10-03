# Lab 2

> 📦 **STARTER CODE REQUIRED: `library-hexagon-v1`.** 

Lab 1 code with:
> - Folders `src/core` and `src/adapters`.
> - `LoanService` receiving `LoanRepository` and `MemberNotifier` through its constructor.
> - The adapters `InMemoryLoanRepository`, `ConsoleEmailNotifier`, and `SmsNotifier`.
> - An `npm test` script using Node's built-in test runner (`node --import tsx --test`), with one sample test that passes.
> - `Loan` still a plain interface, and IDs still plain `string`s (these get improved in this lab).


[See at Github Repo > src/lib/lab_2/library-hexagon-v1.zip]

---

### 🧩 Exercise 1: Speak the Business Language (Ubiquitous Language)

**Objective:**
Align the names in the code with the words the business uses.

**Steps:**

1. Read this description from the "librarian":
   > *"A **member** **borrows** a **book**. This creates a **loan** with a **due date** 14 days later. When the member **returns** the book, the loan is **closed**. A loan past its due date is **overdue**. A member can have at most 3 **open loans**."*
2. Create `GLOSSARY.md` with each bold term and a one-line definition.
3. Find the code names that don't match the glossary, such as `save`, `findActiveByMember`, `returned`, or `getActiveLoans`.
4. Rename them to glossary terms, for example `findOpenLoansOf(memberId)` and `status: "OPEN" | "CLOSED"`. Use the IDE's rename feature, not search and replace.
5. Run `npm start` and `npm test`; both must still work.

**Expected Result:**
- A `GLOSSARY.md` file with about 8 terms.
- At least 3 renames in the code, and the app still works.

---

### 🧩 Exercise 2: Value Objects

**Objective:**
Replace primitive strings with small, validated, immutable objects.

**Steps:**

1. Create `src/core/domain/MemberId.ts`:
   - Give it a `private constructor` and a `static of(value: string)` method that throws if the value doesn't match `M-<number>`.
   - Make the value `readonly`.
   - Add an `equals(other: MemberId): boolean` method.
2. Create `BookId` the same way, with the format `B-<number>`.
3. Use `MemberId` and `BookId` in the core instead of `string`.
4. Convert from `string` to the value object **in the adapter** (the controller) when a request arrives.
5. Write 3 tests: a valid ID is created, an invalid ID throws, and two equal IDs are `equals`.

**Expected Result:**
- An invalid ID such as `"XYZ"` is rejected before reaching the business logic.
- The core never receives raw strings for IDs.
- The tests pass.

---

### 🧩 Exercise 3: The `Loan` Entity

**Objective:**
Turn `Loan` from a data bag into an entity with identity and behavior.

**Steps:**

1. Convert `Loan` into a class in `src/core/domain/Loan.ts` with:
   - `id`, `memberId`, `bookId`, `dueDate`, and `status`.
   - A `static open(id, memberId, bookId, today: Date)` method that sets `dueDate = today + 14 days`.
   - `close()`, which **throws** if the loan is already closed.
   - `isOverdue(today: Date): boolean`.
2. Make the fields `readonly` except `status`, which changes only through `close()`.
3. Write 4 tests:
   - The due date is 14 days later.
   - Closing an open loan works.
   - Closing twice throws.
   - A loan is overdue after its due date.
4. Update the repository and the service to use the class.

**Expected Result:**
- The business rules about a loan live **inside** `Loan`.
- Nobody can set `status` directly from outside the class.
- The tests pass.

---

### 🧩 Exercise 4: Domain Service vs. Application Service

**Objective:**
Separate the pure business decisions from the orchestration of the use case.

**Steps:**

1. Create a domain service, `src/core/domain/LoanPolicy.ts`, with:
   - `canBorrow(openLoans: Loan[], today: Date): boolean`.
   - It returns `false` if there are 3 or more open loans **or** any open loan is overdue (a new rule).
   - It has no repositories, no notifier, and no I/O.
2. Rename `LoanService` to `BorrowBookService` (the application service), which:
   - loads the open loans through the repository,
   - asks `LoanPolicy`,
   - creates the loan with `Loan.open`, saves it, and notifies the member.
3. Write 3 tests for `LoanPolicy`: under the limit (allowed), at the limit (rejected), and with an overdue loan (rejected).
4. Check that `BorrowBookService` has no `if` statements with business rules; it only coordinates.

**Expected Result:**
- `LoanPolicy` is pure, needs no fakes in its tests, and its tests run instantly.
- `BorrowBookService` reads like a recipe of 4 to 5 lines.
- The new "overdue" rule required changes **only** in the domain.

---

### 🧩 Exercise 5: Ports and the Dependency Rule

**Objective:**
Classify the ports and give the hexagon a clear folder structure.

**Steps:**

1. Reorganize `src/core`:
   ```
   core/
     domain/        Loan, MemberId, BookId, LoanPolicy
     application/   BorrowBookService
     ports/
       in/          BorrowBookUseCase
       out/         LoanRepository, MemberNotifier
   ```
2. Create the driving port `BorrowBookUseCase` (an interface with `borrow(memberId, bookId)`), and make `BorrowBookService` implement it.
3. Change the controller so it depends on `BorrowBookUseCase`, not on the service class.
4. Check the dependency rule using `grep`; all of these must return nothing:
   - `grep -r "adapters" src/core/`
   - `grep -r "application\|ports" src/core/domain/`
5. Add an npm script, `"check:arch"`, that runs those `grep` checks and fails if anything is found.

**Expected Result:**
- The folder structure follows the diagram.
- `npm run check:arch` passes.
- Each student can explain which ports are driving and which are driven, and why.

---

**⏱️ Suggested timing:** theory 2 h, Ex1 20 min, Ex2 30 min, Ex3 40 min, Ex4 40 min, Ex5 30 min.