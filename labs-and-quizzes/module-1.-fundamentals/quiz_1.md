# 🧠 Module 1 Quiz: Foundations & Architecture Critique

🧪 **Goal:** Assess understanding of Hexagonal Architecture foundations.

---

**1.** When converting a traditional MVC REST controller into a Driving (Primary) Adapter, which responsibility should be removed from it?

a) Mapping the HTTP request body into a command object  
b) Translating domain exceptions into HTTP status codes  
c) Opening and committing database transactions  
d) Calling the driving port (use case) interface  

<details>
  <summary>Solution</summary>

- c
- A driving adapter only translates the protocol (HTTP to use case calls and back). Transactions belong to the application service, and persistence belongs to driven adapters.
</details>

---

**2.** Which option correctly represents the direction of source code dependencies in Hexagonal Architecture?

a) Driving Adapters → Application Core ← Driven Adapters  
b) Driving Adapters → Application Core → Driven Adapters  
c) Driving Adapters ← Application Core → Driven Adapters  
d) Driving Adapters → Driven Adapters → Application Core  

<details>
  <summary>Solution</summary>

- a
- All dependencies point inward. Driven adapters implement ports defined by the core (dependency inversion). Option b describes classic layered architecture.
</details>

---

**3.** `OrderRepository` declares `save(Order order)` and `PlaceOrderUseCase` declares `execute(PlaceOrderCommand command)`. How are they classified?

a) Both are Driving Ports, because both are called during order placement  
b) `OrderRepository` is a Driving Port; `PlaceOrderUseCase` is a Driven Port  
c) Both are Driven Ports, because both are implemented outside the domain  
d) `PlaceOrderUseCase` is a Driving Port; `OrderRepository` is a Driven Port  

<details>
  <summary>Solution</summary>

- d
- The use case is an entry point the application exposes (driving). The repository is something the core needs from infrastructure (driven).
</details>

---

**4.** A microservice only reads user preferences from PostgreSQL and returns them as JSON, with no business rules. Why might Hexagonal Architecture be over-engineering here?

a) It requires a message broker to connect adapters with the core  
b) Extra ports, mappers and models add boilerplate with no business logic to protect  
c) It only allows databases to be accessed through driving adapters  
d) Each port must be deployed as an independent service  

<details>
  <summary>Solution</summary>

- b
- This is the "CRUD penalty". The extra layers pay off only when there is domain logic worth isolating.
</details>

---

**5.** What is the main reason to keep Domain Entities separate from ORM Entities?

a) ORM entities cannot contain behavior methods  
b) Mapping between models improves query performance  
c) To isolate business rules from schema changes, ORM annotations and lazy-loading proxies  
d) Domain entities must be serializable to JSON for the API  

<details>
  <summary>Solution</summary>

- c
- Separation keeps the domain free of persistence concerns, so schema or ORM changes don't affect business logic. Mapping adds a small cost; it doesn't improve performance.
</details>

---

**6.** What is the role of the proxy or API Gateway in the Strangler Fig pattern?

a) Synchronizing data between the legacy and the new databases  
b) Automatically translating legacy code into the new architecture  
c) Running legacy and new code side by side in the same process using feature flags  
d) Routing migrated endpoints to the new module while the rest still reach the legacy system  

<details>
  <summary>Solution</summary>

- d
- Traffic is gradually redirected at the network edge until the monolith receives no requests. Option c describes Branch by Abstraction.
</details>

---

**7.** How does Branch by Abstraction differ from Strangler Fig?

a) Branch by Abstraction works inside one codebase via an interface and toggles; Strangler Fig redirects traffic between deployed applications  
b) Branch by Abstraction requires downtime; Strangler Fig migrates without it  
c) Strangler Fig works inside one codebase; Branch by Abstraction relies on a network proxy  
d) Branch by Abstraction migrates data; Strangler Fig migrates code  

<details>
  <summary>Solution</summary>

- a
- Both migrate incrementally with zero downtime, but at different boundaries: code level versus network level.
</details>

---

**8.** A driven HTTP adapter receives a `503 Service Unavailable` from a third-party payment API. What should it do?

a) Propagate the raw `HttpClientException` so the core knows the exact cause  
b) Translate it into a domain exception defined in the core, e.g. `PaymentGatewayUnavailableException`  
c) Return an empty `Payment` object so the use case can continue  
d) Map it directly to an HTTP 503 response from the driven adapter  

<details>
  <summary>Solution</summary>

- b
- Technical errors must not leak into the core. The adapter translates them into domain-meaningful exceptions; HTTP responses are the driving adapter's job.
</details>

---

**9.** Which structure represents "Package by Feature"?

a) `com.app.controllers`, `com.app.services`, `com.app.repositories`  
b) `com.app.ports.inbound`, `com.app.ports.outbound`, `com.app.adapters`  
c) `com.app.domain`, `com.app.application`, `com.app.infrastructure`  
d) `com.app.order.domain`, `com.app.order.ports`, `com.app.order.adapters`  

<details>
  <summary>Solution</summary>

- d
- Code is grouped by business capability first (`order`), then by role. The other options are package by layer.
</details>

---

**10.** Why are domain unit tests in Hexagonal Architecture usually faster and more stable than those in a layered MVC service?

a) Hexagonal frameworks run domain tests in parallel automatically  
b) Domain tests use an embedded in-memory database instead of a real one  
c) The core has no framework or database dependencies, so tests run in memory without booting a container  
d) Domain tests only need to cover getters and setters  

<details>
  <summary>Solution</summary>

- c
- Pure domain code needs no Spring context or database. Ports can be replaced by simple fakes or stubs.
</details>

---

**11.** A developer adds `@Entity` and `@Table(name = "users")` to a class in `domain.model`. Which principle is violated?

a) The domain core must stay free of framework and persistence details  
b) Domain classes must always be immutable  
c) ORM annotations are only allowed in driving adapters  
d) Entities must be defined in the application services layer  

<details>
  <summary>Solution</summary>

- a
- ORM annotations couple the domain to a framework and a schema. They belong in persistence models inside driven adapters.
</details>

---

**12.** Which component is a Driving (Primary) Adapter?

a) A Spring Data JPA repository extending `CrudRepository`  
b) A Kafka consumer that deserializes a message and calls a use case port  
c) A Kafka producer that publishes domain events emitted by the core  
d) A REST client that calls an external payment gateway  

<details>
  <summary>Solution</summary>

- b
- It triggers the application from outside. A Kafka producer uses the same technology but is driven, because the core invokes it.
</details>

---

**13.** Which component is a Driven (Secondary) Adapter?

a) An Amazon SQS listener receiving user registration events  
b) A REST controller handling `POST /api/v1/orders`  
c) A scheduled job that triggers a use case every night  
d) A SendGrid adapter implementing an outbound `NotificationPort`  

<details>
  <summary>Solution</summary>

- d
- It implements a port defined by the core and is invoked by it. The others initiate calls into the core.
</details>

---

**14.** What causes "code navigation friction" in an IDE when working with a Hexagonal codebase?

a) Package by Feature duplicates class names across packages  
b) Domain classes are excluded from the IDE index  
c) "Go to declaration" from a use case opens the port interface, not the adapter implementation  
d) Adapters are wired by configuration, so the IDE cannot find any references to them  

<details>
  <summary>Solution</summary>

- c
- The core depends on interfaces, so developers need "Go to implementation" to reach the adapter. This is a minor but real cost of decoupling.
</details>

---

**15.** What is the fundamental trade-off of choosing Hexagonal over a traditional 3-tier layered architecture?

a) More initial structure and mapping boilerplate in exchange for decoupling, testability and framework independence  
b) Faster initial delivery in exchange for harder long-term maintenance  
c) Fewer classes in exchange for slower runtime performance  
d) Stronger security in exchange for reduced testability  

<details>
  <summary>Solution</summary>

- a
- Hexagonal costs more upfront (ports, adapters, mappers) and pays off with a stable, testable core that adapts to changing technologies.
</details>

---
