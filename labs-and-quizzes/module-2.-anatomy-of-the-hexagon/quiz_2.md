# 🧠 Module 2 Quiz: The Domain Core & Ubiquitous Language

🧪 **Goal:** Assess understanding of DDD building blocks inside the hexagon and how to keep the core free of technical concerns.

---

**1.** Where must the Ubiquitous Language be most faithfully reflected in the codebase?

a) In REST API paths and DTO field names, since they are the public contract  
b) In database table and column names, since data outlives code  
c) In the adapters, since they are the boundary with the outside world  
d) In the application core: class, method, variable and exception names  

<details>
  <summary>Solution</summary>

- d
- The core is where business concepts are modeled, so it must mirror the experts' language. Adapters and schemas may use technical or external naming and translate it.
</details>

---

**2.** What distinguishes an Entity from a Value Object?

a) Entities are immutable; Value Objects can change their state  
b) Entities have an identity that persists over time; Value Objects are defined by their attributes  
c) Entities contain behavior; Value Objects are plain data holders without methods  
d) Entities are persisted; Value Objects only exist in memory  

<details>
  <summary>Solution</summary>

- b
- Identity is the key difference. Value Objects can have rich behavior (e.g., `Money.add()`) and are persisted too, usually embedded in an entity.
</details>

---

**3.** How should a `Money` Value Object implement `money.add(otherMoney)`?

a) Return a new `Money` instance with the sum, leaving the original unchanged  
b) Update its internal amount and return `this` for method chaining  
c) Delegate the sum to a `MoneyService` to keep `Money` a pure data holder  
d) Return a primitive `BigDecimal` to avoid creating extra objects  

<details>
  <summary>Solution</summary>

- a
- Value Objects are immutable, so operations return new instances. Option c leads to an anemic model, and option d loses domain meaning (primitive obsession).
</details>

---

**4.** When should logic be placed in a Domain Service rather than in an Entity?

a) When the logic needs to load data from a repository  
b) When the logic is complex and makes the entity class too long  
c) When a business rule involves several entities and doesn't naturally belong to one  
d) When the logic must run inside a database transaction  

<details>
  <summary>Solution</summary>

- c
- Example: transferring funds between two `Account`s. Loading data and transactions (a, d) are Application Service concerns. Long entities (b) should be refactored into Value Objects.
</details>

---

**5.** What is the primary role of an Application Service?

a) Orchestrating a use case: load via ports, invoke domain behavior, persist and manage the transaction  
b) Holding the business rules that don't fit into entities  
c) Translating HTTP requests into domain commands  
d) Validating aggregate invariants before saving  

<details>
  <summary>Solution</summary>

- a
- It coordinates but holds no business decisions. Option b describes a Domain Service, c a driving adapter, and d the aggregate itself.
</details>

---

**6.** How does a rich Entity protect its business invariants?

a) Public setters plus a `validate()` method called before saving  
b) Validation annotations (`@NotNull`, `@Size`) checked by the framework  
c) The Application Service checks the rules before modifying it  
d) Private state changed only through business methods that validate rules  

<details>
  <summary>Solution</summary>

- d
- With encapsulation, the entity can never be in an invalid state. Options a and c allow invalid states between calls, and b couples the domain to a framework.
</details>

---

**7.** Business experts rename a core concept from "Customer" to "Subscriber". What should the team do?

a) Keep `Customer` in code and document the mapping in a glossary  
b) Refactor the core (classes, methods, exceptions) to use "Subscriber"  
c) Rename only the API and UI, since that is what the business sees  
d) Create a `Subscriber` class extending `Customer` for compatibility  

<details>
  <summary>Solution</summary>

- b
- Code must follow the Ubiquitous Language. Keeping old terms creates constant mental translation and misunderstandings.
</details>

---

**8.** Which scenario describes an Anemic Domain Model?

a) An entity that validates its invariants in the constructor  
b) A Value Object with methods such as `add()` and `isGreaterThan()`  
c) Entities with only getters and setters, while all business logic lives in service classes  
d) A Domain Service coordinating a rule across two aggregates  

<details>
  <summary>Solution</summary>

- c
- Entities become data containers and logic turns procedural. The other options are signs of a healthy, rich model.
</details>

---

**9.** How should the core report a rule violation, such as withdrawing more than the available balance?

a) Throw a domain exception like `InsufficientBalanceException` (or return a Result type)  
b) Return an HTTP 422 status from the domain method  
c) Log a warning and leave the balance unchanged  
d) Let a database constraint fail when saving  

<details>
  <summary>Solution</summary>

- a
- Failures are expressed in business terms. Adapters translate them into HTTP codes. Option c hides the error, and d moves the rule out of the core.
</details>

---

**10.** How is equality determined between two `Address` Value Objects?

a) By comparing their database identifiers  
b) By comparing their memory references  
c) By comparing only the most significant attribute (e.g., zip code)  
d) By comparing all their attributes  

<details>
  <summary>Solution</summary>

- d
- Value Objects have no identity, so they use structural equality. Option a applies to Entities.
</details>

---

**11.** An Application Service receives a `CancelOrderCommand`. What is the correct flow?

a) Call `orderRepository.updateStatus(id, CANCELLED)` directly  
b) Load `Order` → check its status in the service → set status via setter → save  
c) Load `Order` via port → call `order.cancel()` → save via port  
d) Call `order.cancel()` → load `Order` via port → save via port  

<details>
  <summary>Solution</summary>

- c
- The aggregate enforces its own rules inside `cancel()`. Options a and b bypass the domain (anemic model), and d is in an impossible order.
</details>

---

**12.** Why should an Entity not depend directly on an SMTP client to send emails?

a) Because entities must remain serializable by the ORM  
b) To keep domain rules testable in memory and independent of infrastructure  
c) Because sending emails is always a Domain Service's responsibility  
d) Because entities cannot hold references to other objects  

<details>
  <summary>Solution</summary>

- b
- Infrastructure belongs behind a driven port. The entity can raise a domain event, and an adapter sends the email.
</details>

---

**13.** What is the primary role of an Aggregate Root?

a) Being the single entry point to a cluster of objects and enforcing its invariants  
b) Being the entity with the most attributes in the bounded context  
c) Providing a base class that all entities extend to share an ID  
d) Loading child entities from the database on demand  

<details>
  <summary>Solution</summary>

- a
- External code references only the root, so every change passes through it and the aggregate stays consistent.
</details>

---

**14.** Which entity method signature leaks technical jargon instead of Ubiquitous Language?

a) `order.approve()`  
b) `account.withdraw(Money amount)`  
c) `subscription.renew()`  
d) `user.updateStatusFlagInDbTable(int status)`  

<details>
  <summary>Solution</summary>

- d
- It describes storage, not a business action. Prefer intention-revealing names like `user.activate()` or `user.suspend()`.
</details>

---

**15.** What is the main purpose of a Factory in the domain core?

a) Mapping domain entities to ORM models  
b) Creating test doubles for ports  
c) Encapsulating complex creation of an aggregate, so it is valid from instantiation  
d) Registering adapters in the dependency injection container  

<details>
  <summary>Solution</summary>

- c
- Factories guarantee invariants at creation time. Option a describes a mapper, b test doubles, and d the composition root.
</details>

---
