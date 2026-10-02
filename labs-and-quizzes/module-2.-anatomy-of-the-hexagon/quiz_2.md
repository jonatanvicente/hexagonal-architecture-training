# 🧠 Module 2 Quiz: The Domain Core & Ubiquitous Language

**Goal:** Evaluate core concepts of Domain-Driven Design inside the Hexagon, including Ubiquitous Language, Entities, Value Objects, Domain Services vs. Application Services, and invariant enforcement without framework pollution.

---

**1. Where does the Ubiquitous Language strictly live and manifest within a Hexagonal application codebase?**

a) Exclusively inside database schema migration files and SQL scripts.  
b) Directly in the Application Core (class names, methods, variables, and domain exceptions).  
c) Inside REST Controller endpoints and HTTP payload DTOs.  
d) In the CI/CD pipeline configuration files and deployment scripts.  

<details>
  <summary>Solution</summary>
- b (Directly in the Application Core)  
- Why b is correct: Ubiquitous Language is the single shared language between business experts and developers. In Hexagonal Architecture, the Application Core (Domain) serves as its sanctuary, ensuring that code directly mirrors business domain terminology without technical jargon.  
- Why others are incorrect: Options a, c, and d represent infrastructure, delivery, or operational concerns where technical jargon (SQL, HTTP, Docker) naturally predominates.  
</details>

---

**2. What is the defining characteristic that distinguishes a Domain Entity from a Value Object?**

a) Entities are completely immutable, while Value Objects are mutable.  
b) Entities possess a thread of continuity and unique identity that persists over time; Value Objects are defined purely by their attributes and are immutable.  
c) Entities reside in the adapter layer, while Value Objects reside in the application core.  
d) Entities contain ORM annotations, while Value Objects contain JSON serialization annotations.  

<details>
  <summary>Solution</summary>
- b (Entities possess a thread of continuity and unique identity that persists over time; Value Objects are defined purely by their attributes and are immutable)
Why b is correct: An Entity has a distinct identity (e.g., UserId, OrderId) that remains constant even if its attributes change over time. A Value Object (e.g., Money, Address) has no identity and is identified strictly by the equality of its values; it is completely immutable.
Why others are incorrect: Option a inverts immutability (Value Objects are immutable, Entities can change state). Option c is wrong because both live in the Core. Option d introduces framework annotations that shouldn't exist on domain objects.  
</details>

---

**3. How should a Value Object like `Money` handle an operation such as adding an amount (`money.add(otherMoney)`)?**

a) Mutate its internal state variables directly using public setter methods.  
b) Return a brand-new instance of `Money` containing the resulting sum, leaving the original instance unchanged.  
c) Persist the updated amount directly to the database using an active record pattern.  
d) Throw a `UnsupportedOperationException` because arithmetic operations belong in controllers.  

<details>
  <summary>Solution</summary>
- b (Return a brand-new instance of Money containing the resulting sum, leaving the original instance unchanged)
Why b is correct: Value Objects are immutable. Any operation that modifies a Value Object must return a new Value Object instance containing the new state, preventing unintended side effects across the system.
Why others are incorrect: Option a violates immutability. Option c pollutes the Value Object with database access. Option d incorrectly delegates domain math rules away from domain models.
</details>

---

**4. When should domain logic be placed inside a Domain Service rather than inside a Domain Entity?**

a) When managing database connection pools and committing SQL transactions.  
b) When encapsulating business logic or rules that naturally involve multiple entities or aggregates and don't belong to a single entity.  
c) When converting JSON request strings into application DTOs.  
d) When sending HTTP notification requests to external third-party webhooks.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: A Domain Service handles domain logic that spans multiple entities (e.g., transferring funds between two `Account` entities) or doesn't naturally belong to a single entity, preserving entity encapsulation without forcing awkward responsibilities. Why others are incorrect: Option a is an infrastructure/orchestration task. Options c and d are adapter responsibilities (web/HTTP translation).
</details>

---

**5. What is the primary role of an Application Service in Hexagonal Architecture?**

a) Defining database table columns and ORM relationship mappings.  
b) Orchestrating use case execution by loading entities via ports, calling domain logic, persisting changes, and managing transaction boundaries.  
c) Rendering HTML views and parsing REST HTTP headers.  
d) Calculating mathematical tax formulas directly using raw primitive values.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Application Services act as use case orchestrators. They coordinate workflow steps (fetch from repository port, invoke core domain business logic, save back to repository port, publish events) without containing core business decision rules themselves. Why others are incorrect: Option a belongs to ORM mappers in adapters. Option c belongs to driving web adapters. Option d belongs inside pure domain models or domain services.
</details>

---

**6. How does a rich Domain Entity protect its business invariants?**

a) By exposing public setters for all fields and relying on REST Controllers to validate data before assignment.  
b) By encapsulating its state, exposing intention-revealing business methods, and validating business rules internally upon construction or mutation.  
c) By declaring database check constraints inside SQL migration scripts.  
d) By delegating validation logic to an external API Gateway.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Encapsulation ensures an entity can never enter an invalid state. By making fields private and mutating state only through methods that validate rules (throwing domain exceptions on failure), invariants are guaranteed. Why others are incorrect: Option a creates an "Anemic Domain Model" vulnerable to invalid state. Options c and d push business validation away from the core into external tools.
</details>

---

**7. If business domain experts change a core term from "Customer" to "Subscriber", how should the development team respond inside a Hexagonal application?**

a) Update only the frontend UI templates and leave the backend domain code named `Customer`.  
b) Refactor the core domain code (class names, methods, variables, exceptions) to reflect "Subscriber" directly.  
c) Add an alias comment above the `Customer` class in the code without changing the class name.  
d) Change only the database column and table names in SQL.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Under Ubiquitous Language, the code must reflect the exact mental model of business experts. If business terminology changes, the domain model in the code must be refactored to match, eliminating translation friction. Why others are incorrect: Options a, c, and d create a disconnect between business concepts and source code, breaking Ubiquitous Language.
</details>

---

**8. Which scenario describes an "Anemic Domain Model" anti-pattern inside the Domain Core?**

a) An entity with business methods like `order.cancel()` and `order.applyDiscount()` that enforce internal rules.  
b) An entity that contains only private fields with public getters and setters, while all business logic resides in external service classes.  
c) A Value Object that throws an exception when initialized with an invalid email string.  
d) A Domain Service calculating complex interest rates across multiple bank accounts.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: An Anemic Domain Model uses entities purely as data containers (getters/setters) with no behavior. Business logic is scattered across service layers, turning OO design into procedural code. Why others are incorrect: Options a, c, and d represent proper rich domain models, valid value objects, and appropriate domain services.
</details>

---

**9. How should business rule violations (e.g., attempting to withdraw more money than an account balance allows) be communicated from the Domain Core?**

a) By returning HTTP 400 Bad Request status codes directly from domain methods.  
b) By throwing domain-specific exceptions (e.g., `InsufficientBalanceException`) defined inside the Core.  
c) By returning `null` or boolean `false` silently.  
d) By throwing vendor-specific database driver exceptions.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: The core communicates business rule failures using domain-specific exceptions that express what went wrong in business terms (`InsufficientBalanceException`). Adapters catch these and translate them to HTTP status codes or messaging failures. Why others are incorrect: Option a pollutes the domain with HTTP protocols. Option c obscures errors and risks `NullPointerExceptions`. Option d leaks database vendor implementation details into the core.
</details>

---

**10. How is equality determined between two instances of a Value Object (e.g., `Address`)?**

a) By comparing their database primary key identifiers (`id`).  
b) By comparing the structural equality of all their internal attributes (e.g., street, city, zip code).  
c) By checking whether both objects point to the exact same reference location in memory (`==`).  
d) Value Objects cannot be evaluated for equality.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Value Objects have no identity. Two Value Objects are equal if all their fields/attributes contain equal values (structural equality). Why others are incorrect: Option a applies to Entities, which have primary key IDs. Option c tests memory reference, not attribute value equality. Option d is false.
</details>

---

**11. An Application Service receives a `CancelOrderCommand` from an Inbound REST Controller. What is the correct sequence of actions for the Application Service?**

a) Parse raw HTTP headers $\rightarrow$ execute SQL update $\rightarrow$ render JSON.  
b) Fetch `Order` via Outbound Port $\rightarrow$ call `order.cancel()` $\rightarrow$ persist `Order` via Outbound Port.  
c) Validate JWT signature $\rightarrow$ call database directly $\rightarrow$ return HTTP 200.  
d) Instantiate gRPC client $\rightarrow$ update database table $\rightarrow$ trigger docker container.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: This represents proper orchestration: retrieve the aggregate root through an abstract port, invoke the domain behavior method on the aggregate, and save the updated aggregate back through the port. Why others are incorrect: Options a, c, and d mix web framework concerns (HTTP, JWT, gRPC) and raw SQL access into the Application Service layer.
</details>

---

**12. Why must Domain Entities avoid direct dependencies on external infrastructure components (e.g., an SMTP client for sending emails)?**

a) To ensure domain rules can be unit-tested in-memory rapidly without network side-effects or external dependencies.  
b) Because programming languages prohibit network calls inside entity classes.  
c) To allow the database ORM to automatically serialize email server settings.  
d) Because infrastructure components are only compatible with REST Controllers.  

<details>
  <summary>Solution</summary>
- a.
Why a is correct: Keeping entities pure guarantees they can be tested in isolation in milliseconds without mocking complex external infrastructure or sending real side-effects (like emails) during unit tests. Why others are incorrect: Option b is factually incorrect. Options c and d are irrelevant or false assumptions about infrastructure.
</details>

---

**13. In Domain-Driven Design within the Core, what is the primary role of an Aggregate Root?**

a) To expose raw SQL endpoints for fast database queries.  
b) To act as the single entry point for a cluster of associated domain objects, enforcing consistency and invariant rules for the entire boundary.  
c) To format domain entities into JSON arrays for API responses.  
d) To manage web server thread execution pools.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: An Aggregate Root is the root entity of an aggregate boundary. External objects can only hold references to the Aggregate Root, ensuring all changes to internal child objects pass through the root to enforce business invariants. Why others are incorrect: Options a, c, and d describe database, presentation, or web server responsibilities.  
</details>

---

**14. Which method signature in a Domain Entity indicates a leakage of technical jargon rather than clean Ubiquitous Language?**

a) `order.approve()`  
b) `account.withdraw(Money amount)`  
c) `user.updateStatusFlagInDbTable(int status)`  
d) `subscription.renew()`  

<details>
  <summary>Solution</summary>
- c.
Why c is correct: `updateStatusFlagInDbTable` uses database and technical jargon (`DbTable`, `statusFlag`, `update`). In Ubiquitous Language, methods describe business actions (e.g., `user.activate()`, `user.suspend()`). Why others are incorrect: Options a, b, and d express pure business operations.
</details>

---

**15. What is the main purpose of using a Domain Factory (or Factory Method) within the Application Core?**  

a) To convert domain entities into ORM database models.   
b) To encapsulate complex creation logic of an Entity or Aggregate Root, ensuring all invariants are validated upon instantiation.  
c) To automatically generate REST controllers at application boot time.  
d) To mock outbound ports during integration testing.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: When creating a complex domain aggregate requires multi-step construction or intricate invariant validation, a Factory encapsulates creation logic so that an invalid object can never be instantiated. Why others are incorrect: Option a describes a Mapper. Option c describes framework code generation. Option d describes test doubles.
</details>