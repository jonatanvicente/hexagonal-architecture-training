# 🧪 Lab 1

> 📦 **STARTER CODE REQUIRED: `library-legacy`.** A tiny "Library Loans" app with 4 to 5 classes, runnable locally with one command, using in-memory storage (a list or map, no real database).

[See at Github Repo > src/lib/lab_1/library_legacy.zip]

***

### 🧩 Exercise 1: Spot the Problems

**Objective:** Recognize coupling in a classic layered (n-tier) design.

**Steps:**

1. Run the app and read the code (about 10 minutes).
2. **Without AI**, draw the dependencies between classes as boxes and arrows ("A uses B").
3. Answer these three questions in `NOTES.md`:
   * Where is the business rule?
   * Which classes does `LoanService` depend on directly?
   * What would you need to change to send SMS instead of email?
4. Now ask the AI the same questions and compare its answers with yours.

**Expected Result:**

* A simple diagram showing `Controller → Service → MySqlLoanRepository / SmtpEmailSender`.
* The students notice that the business logic depends on technical details, and that changing email to SMS means editing `LoanService`.

***

### 🧩 Exercise 2: Separate Concerns and Invert One Dependency

**Objective:** Apply Separation of Concerns and the Dependency Inversion Principle (DIP) to the notification part.

**Steps:**

1. Move the "max 3 loans" rule from `LoanController` into `LoanService`. After this, the controller only receives the request and returns the response.
2. Create a `MemberNotifier` interface **next to `LoanService`** with a single method: `notifyLoan(memberId, bookId)`.
3. Make `SmtpEmailSender` implement `MemberNotifier`.
4. Change `LoanService` to receive a `MemberNotifier` in its constructor, and remove the `new`.
5. Create the objects in `main` (or the app's startup class) and pass them in.
6. Do the same for the repository: create a `LoanRepository` interface and have `MySqlLoanRepository` implement it.
7. Run the app; it must behave exactly as before.

**Expected Result:**

* `LoanService` only knows interfaces; there is no `new` of technical classes inside it.
* All objects are created in one place, `main`.
* The app works the same as before.

***

### 🧩 Exercise 3: Your First Hexagon

**Objective:** Identify ports and adapters, and prove that new adapters don't change the core.

**Steps:**

1. Create two folders, `core` (the service, the rule, and the interfaces) and `adapters` (the controller, MySQL, and SMTP), and move the files.
2. Label each interface in a comment as either `// PORT`, or label each technical class as `// ADAPTER`.
3. Create a new adapter, `SmsNotifier`, that implements `MemberNotifier` and just prints "SMS sent".
4. Switch from email to SMS by changing only `main`.
5. Run `git diff --stat`: **no file in `core` should have changed** in steps 3 and 4.
6. Check that `core` has no imports from `adapters`, for example with `grep -r "adapters" core/` (it should return nothing).

**Expected Result:**

* The SMS notifier works, and the core files are unchanged.
* `grep` finds no imports of adapters inside `core`.
* The students can draw the hexagon: the core in the center, ports on the border, adapters outside.

***

**⏱️ Suggested timing:** theory 1.5 h, Ex1 30 min, Ex2 45 min, Ex3 45 min.
