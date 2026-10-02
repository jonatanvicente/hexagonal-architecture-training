# 🧠 Module 1 Quiz: Foundations & Architecture Critique

**Goal:** Assess understanding of Hexagonal Arch foundations 

---

**1. When converting a traditional MVC REST controller into a Driving (Primary) Adapter, which responsibility should be removed from the controller class?**  
a) Parsing incoming HTTP JSON request bodies into DTOs.  
b) Executing database queries and managing database transaction commits directly.  
c) Invoking a Driving Port (Use Case) interface.  
d) Returning HTTP response status codes such as 200 OK or 400 Bad Request.  

<details>
  <summary>Solution</summary>
- b. Why b is correct: In a traditional MVC "fat controller" or coupled controller, database access and transaction boundaries were frequently mixed into HTTP handling. In Hexagonal Architecture, the Driving Adapter's sole responsibility is protocol translation (HTTP/REST to domain commands). Database interactions and transactions belong strictly in Outbound Adapters and Application Services. Why others are incorrect: a, c, and d are all proper responsibilities of a Driving Adapter: parsing HTTP payloads, calling the application's use case port, and mapping domain responses back to HTTP status codes.
</details>

---

**2. Which diagram accurately represents the flow of source code dependencies in Hexagonal Architecture?**

a) Driving Adapters -> Application Core <- Driven Adapters
b) Driving Adapters -> Application Core -> Driven Adapters
c) Application Core -> Driving Adapters -> Database
d) Driven Adapters -> Driving Adapters -> Application Core

<details>
  <summary>Solution</summary>
* **a**
* **Explanation:**
* **Why a is correct:** The fundamental rule of Hexagonal Architecture is the **Dependency Inversion Principle**. All source code dependencies point inward toward the Application Core. Driving Adapters depend on Driving Ports (Core), and Driven Adapters depend on Driven Ports (Core).
* **Why others are incorrect:**
* *b* represents traditional layered architecture where the core directly imports infrastructure libraries (pointing outward to database adapters).
* *c* and *d* incorrectly invert the core's position and boundaries.
</details>

---

**3. An interface named `OrderRepository` contains a `save(Order order)` method. An interface named `PlaceOrderUseCase` contains an `execute(PlaceOrderCommand command)` method. How are these two interfaces classified?**

a) `OrderRepository` is a Driving Port; `PlaceOrderUseCase` is a Driven Port.
b) Both are Driving Ports because they drive application functionality.
c) `OrderRepository` is a Driven Port; `PlaceOrderUseCase` is a Driving Port.
d) Both are Driven Ports because they interact with external infrastructure.

<details>
  <summary>Solution</summary>
* **c**
* **Explanation:**
* **Why c is correct:** `PlaceOrderUseCase` defines an entry point into the application (a capability the application exposes to the outside world), making it a **Driving (Primary) Port**. `OrderRepository` defines an outbound requirement that the domain needs from infrastructure to persist data, making it a **Driven (Secondary) Port**.
* **Why others are incorrect:**
* *a* inverts the roles of inbound vs. outbound ports.
* *b* and *d* misclassify ports as both belonging to a single category.
</details>

---

**4. A developer is building a simple microservice that reads user preference rows from PostgreSQL and outputs them as JSON, with zero business rules. Why might Hexagonal Architecture be considered over-engineered for this project?**

a) Hexagonal Architecture does not support relational databases like PostgreSQL.
b) The overhead of creating separate DTOs, pure domain models, ports, and mappers (the "CRUD Penalty") adds extra boilerplate with no business logic to isolate.
c) Hexagonal Architecture requires all HTTP endpoints to operate asynchronously.
d) Modern web frameworks prohibit using Hexagonal Architecture alongside relational databases.

<details>
  <summary>Solution</summary>
* **b**
* **Explanation:**
* **Why b is correct:** This is known as "The CRUD Penalty." When an application is simply a pass-through layer between SQL and JSON with no complex domain rules, creating 5 to 8 separate classes (DTOs, Mappers, Ports, Domain Models, ORM Entities) adds development friction without delivering any architectural benefits.
* **Why others are incorrect:**
* *a* and *d* are factually false; Hexagonal Architecture works with any database.
* *c* is incorrect because Hexagonal Architecture is agnostic to synchronous or asynchronous execution styles.
</details>

---

**5. What is the primary motivation for maintaining separate Domain Entities and Database Entities (ORM models) in a Hexagonal application?**

a) Database entities cannot hold methods or functions in object-oriented programming languages.
b) To isolate core business rules from database schema changes, ORM framework annotations, and lazy-loading proxies.
c) To force the application to run faster in production environments.
d) Because modern relational databases reject connections from plain domain objects.

<details>
  <summary>Solution</summary>
* **b**
* **Explanation:**
* **Why b is correct:** Blending ORM annotations (`@Entity`, `@Table`) into domain models couples business rules directly to a database provider and framework (like Hibernate or Entity Framework). Separating them ensures that changes to database tables do not force changes to business logic, and prevents ORM issues like `LazyInitializationException` inside domain code.
* **Why others are incorrect:**
* *a* is false; ORM classes can contain methods.
* *c* is false; mapping between two objects adds a tiny CPU overhead, though usually negligible.
* *d* is a misconception about how database drivers operate.
</details>

---

**6. What is the main function of an intercepting proxy or API Gateway when applying the Strangler Fig Pattern during a monolithic migration?**

a) To automatically translate legacy monolithic code into microservices without developer intervention.
b) To intercept incoming requests and route specific migrated paths to the new Hexagonal module while keeping unmigrated traffic directed to the legacy system.
c) To replicate database tables in real time between relational and non-relational databases.
d) To encrypt all incoming HTTP requests before they reach the legacy backend.

<details>
  <summary>Solution</summary>
* **b**
* **Explanation:**
* **Why b is correct:** The Strangler Fig Pattern relies on a proxy at the network edge. As individual features are rewritten into the new architecture, the proxy's routing rules are updated to gradually divert traffic away from the legacy monolith to the new service until the monolith receives zero traffic.
* **Why others are incorrect:**
* *a* describes an impossible automated refactoring tool.
* *c* describes Change Data Capture (CDC) or data replication, which happens at the database layer, not the API Gateway proxy.
* *d* describes a security concern, not the traffic routing mechanism of the Strangler Fig pattern.
</details>

---

**7. How does the Branch by Abstraction pattern differ fundamentally from the Strangler Fig pattern?**

a) Branch by Abstraction refactors code incrementally *inside a single codebase* using interfaces and feature flags, whereas Strangler Fig shifts network traffic between *separate deployed applications*.
b) Branch by Abstraction requires taking the system offline during deployment, whereas Strangler Fig operates live.
c) Strangler Fig applies only to frontend user interfaces, whereas Branch by Abstraction applies only to databases.
d) Branch by Abstraction replaces an entire application all at once in a single release.

<details>
  <summary>Solution</summary>
* **a**
* **Explanation:**
* **Why a is correct:** Both are incremental migration strategies, but they operate at different architectural boundaries. Strangler Fig works at the network/infrastructure level using proxies between deployed services. Branch by Abstraction works inside a single deployment unit by creating an interface over legacy code, implementing the new code alongside it, and toggling execution via feature flags.
* **Why others are incorrect:**
* *b*, *c*, and *d* misrepresent both patterns; both patterns support zero-downtime, incremental migrations across backend and frontend systems.
</details>

---

**8. An outbound HTTP REST adapter receives a `503 Service Unavailable` error from a 3rd-party payment provider API. What should the adapter do before propagating the failure?**

a) Catch the low-level HTTP exception and translate it into a Domain Exception defined in the Core (e.g., `PaymentGatewayUnavailableException`).
b) Pass the raw `HttpClientException` and HTTP status code directly through to the Domain Model.
c) Retry the request in an infinite loop inside the adapter until the 3rd-party API recovers.
d) Catch the error, log it, and return a `null` object to the domain entity.

<details>
  <summary>Solution</summary>
* **a**
* **Explanation:**
* **Why a is correct:** To prevent infrastructure details (like HTTP status codes or client SDK exceptions) from leaking into the Core, Outbound Adapters must catch technical errors and translate them into domain-meaningful exceptions defined inside the Core.
* **Why others are incorrect:**
* *b* pollutes the Domain Core with external HTTP framework dependencies.
* *c* causes thread starvation and application hangs.
* *d* introduces `NullPointerException` risks and hides critical domain failure states.
</details>

---

**9. Which directory structure represents a "Package by Feature" organization in a Hexagonal application?**

a) `com.app.controllers`, `com.app.services`, `com.app.repositories`
b) `com.app.order.domain`, `com.app.order.ports`, `com.app.order.adapters`
c) `com.app.ports.inbound`, `com.app.ports.outbound`, `com.app.adapters.db`
d) `com.app.entities`, `com.app.dtos`, `com.app.interfaces`


<details>
  <summary>Solution</summary>
* **b**
* **Explanation:**
* **Why b is correct:** "Package by Feature" organizes code around business domain boundaries (e.g., `order`, `billing`, `customer`). Inside each feature package, sub-packages house the domain, ports, and adapters required for that feature.
* **Why others are incorrect:**
* *a*, *c*, and *d* are examples of "Package by Layer," which scatters a single business feature across global, technical folders.
</details>

---

**10. Why are unit tests for the Domain Core in Hexagonal Architecture typically faster and more resilient than unit tests in a traditional layered MVC service?**

a) Domain Core tests execute in parallel threads automatically without configuration.
b) The Domain Core has no dependencies on databases, web frameworks, or Spring container contexts, allowing tests to run as pure memory-based tests without mocks.
c) Hexagonal Architecture automatically bypasses test execution in CI/CD pipelines.
d) Domain Core tests only validate syntax rather than business logic.

<details>
  <summary>Solution</summary>
* **b**
* **Explanation:**
* **Why b is correct:** Because the Domain Core consists of pure language objects free from frameworks and database annotations, unit tests do not need to boot up Spring contexts or initialize mock databases. They test business logic directly in memory, executing hundreds of tests in milliseconds.
* **Why others are incorrect:**
* *a* depends on test runner configurations, not architecture.
* *c* and *d* are factually incorrect statements regarding testing practices.
</details>




---

**11. A developer adds `@Entity` and `@Table(name = "users")` annotations to a class inside the `domain.model` package. What architectural principle has been violated?**

a) The principle of keeping the Domain Core free from framework and persistence infrastructure details.
b) The rule requiring all domain classes to implement serializable interfaces.
c) The prohibition against using relational databases in Hexagonal Architecture.
d) The constraint that database tables must share names with Application Services.

<details>
  <summary>Solution</summary>
* **a**
* **Explanation:**
* **Why a is correct:** Adding `@Entity` or `@Table` imports ORM framework dependencies into the Domain Core. This couples business rules directly to database structures and framework APIs, breaking the isolation barrier of the hexagon.
* **Why others are incorrect:**
* *b*, *c*, and *d* state rules that do not exist in Hexagonal Architecture.
</details>

---

**12. Which of the following components is classified as a Driving (Primary) Adapter?**

a) A Spring Data JPA repository interface extending `CrudRepository`.
b) A Kafka Consumer class that listens to a messaging topic, deserializes a JSON payload, and calls a Use Case Port.
c) A REST Client class that uses an HTTP library to call an external payment gateway.
d) A PostgreSQL database driver adapter.

<details>
  <summary>Solution</summary>
* **b**
* **Explanation:**
* **Why b is correct:** Driving (Primary) Adapters trigger application execution from the outside. A Kafka Consumer receives an external event message and translates it to invoke an Inbound Use Case Port.
* **Why others are incorrect:**
* *a*, *c*, and *d* are all Driven (Secondary) Adapters because they are invoked *by* the application to interact with external systems (databases, external REST APIs).
</details>

---

**13. Which of the following components is classified as a Driven (Secondary) Adapter?**

a) An Amazon SQS Listener receiving user registration events.
b) A Spring REST Controller handling incoming `POST /api/v1/orders` requests.
c) A Command Line Interface (CLI) runner executing a batch job via a Use Case Port.
d) A SendGrid Email Adapter that implements an outbound `NotificationPort` to send emails.

<details>
  <summary>Solution</summary>
* **d**
* **Explanation:**
* **Why d is correct:** Driven (Secondary) Adapters are invoked by the Core to perform outbound tasks. An email adapter implementing a `NotificationPort` interface defined by the core is a classic Driven Adapter.
* **Why others are incorrect:**
* *a*, *b*, and *c* are all Driving (Primary) Adapters that initiate calls *into* the core via Driving Ports.
</details>

---

**14. What causes "code navigation friction" inside an IDE when working in a Hexagonal codebase?**

a) IDEs cannot index projects that use Package by Feature organizational structures.
b) Navigating from an Application Service call site to a dependency opens an Interface definition (Port) rather than the concrete Adapter implementation.
c) All methods inside Hexagonal Architecture must be declared as private.
d) Hexagonal Architecture requires using text editors without static analysis support.

<details>
  <summary>Solution</summary>
* **b**
* **Explanation:**
* **Why b is correct:** Because the Core relies on interface abstractions (Ports) to stay decoupled from infrastructure, clicking "Go to Declaration" in an IDE takes the developer to the Port interface rather than the concrete Adapter class. Developers must use "Go to Implementation" shortcuts, adding minor navigation overhead.
* **Why others are incorrect:**
* *a*, *c*, and *d* are factually false regarding IDE support and code visibility.
</details>

---

**15. What is the fundamental trade-off made when choosing Hexagonal Architecture over a traditional 3-tier Layered Architecture?**

a) Sacrificing long-term maintainability to achieve maximum initial setup speed.
b) Accepting higher initial structural complexity and object mapping boilerplate in exchange for long-term decoupling, testability, and framework independence.
c) Sacrificing security controls to allow faster database access.
d) Accepting slower runtime execution speed in exchange for reducing the number of source code files.

<details>
  <summary>Solution</summary>
* **b**
* **Explanation:**
* **Why b is correct:** Architectural decisions are always trade-offs. Hexagonal Architecture requires more initial effort, more files (Ports, Adapters, Mappers), and strict discipline. In return, it delivers a domain core that is easy to unit-test, maintain, and adapt when external technologies or frameworks change.
* **Why others are incorrect:**
* *a* describes the exact opposite of Hexagonal Architecture's value proposition.
* *c* and *d* present false trade-offs regarding security and file count.
</details>