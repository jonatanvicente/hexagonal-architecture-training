# 🧠 Module 3 Quiz: Communication and Data Flow

**Goal:** Evaluate understanding of boundary contracts, decoupling entry and exit points, adapter responsibilities, DTO mapping strategies, exception translation, and package structures inside Hexagonal Architecture.

---

**1. What is the primary role of a Driving (Inbound) Port in Hexagonal Architecture?**  
a) To expose raw SQL queries to external web controllers.  
b) To define abstract entry point contracts (use cases) that the Core exposes to external triggers.  
c) To implement concrete database connection drivers.  
d) To handle HTTP request authentication middleware.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: A Driving (Inbound) Port is an interface defined inside the Application Core that specifies what use cases or entry capabilities the application offers to the outside world. External drivers (like REST Controllers, CLI scripts, or messaging queue consumers) call this interface contract to execute business logic.
Why a is incorrect: Exposing SQL queries directly to web controllers leaks database implementation details to the outside edge, breaking layer isolation.
Why c is incorrect: Implementing database connection drivers is a responsibility of Driven (Outbound) Adapters, not Driving Ports.
Why d is incorrect: Handling HTTP authentication middleware is an infrastructure concern handled at the web adapter edge before reaching the port.
</details>

---

**2. Which component is responsible for receiving an HTTP JSON payload, deserializing it into an input DTO, and calling a Driving Port?**  
a) Driven (Outbound) Adapter  
b) Application Service  
c) Driving (Inbound) Adapter  
d) Value Object  

<details>
  <summary>Solution</summary>
- c.
Why c is correct: A Driving Adapter (such as a REST Controller) sits on the entry boundary. Its job is protocol translation: receiving protocol-specific input (HTTP JSON), transforming it into a clean command or DTO, and calling the Driving Port. Why others are incorrect: Option a handles outbound calls (databases/external APIs). Option b orchestrates business use cases. Option d represents immutable domain values inside the Core.
</details>

---

**3. Why must a Driven (Outbound) Port interface refrain from returning ORM/JPA database entities to the Application Service?**  
a) Because ORM entities cannot be converted into JSON format.  
b) Because returning ORM entities leaks persistence framework details into the Core and introduces ORM proxy issues.  
c) Because interfaces in object-oriented programming are forbidden from returning class instances.  
d) Because Driven Ports are restricted to returning primitive types like integers and strings.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Returning ORM entities across the port boundary couples the Core to persistence annotations and database frameworks. It also risks `LazyInitializationException` errors when accessing unmapped relations outside active DB sessions. Why others are incorrect: Option a is false (JSON serializers can serialize ORM entities, though it's an anti-pattern). Options c and d are false OOP constraints.
</details>

---

**4. How does the Interface Segregation Principle (ISP) apply to the design of Driven (Outbound) Ports?**  
a) Every database repository must implement a single global interface containing all CRUD operations for the application.  
b) Driven Ports should be narrow and specialized to specific use case needs rather than giant, fat interfaces.  
c) Ports must only contain static methods and constant variables.  
d) Driven Ports must be segregated into separate microservices on the network.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: ISP dictates that clients should not be forced to depend on methods they do not use. Designing focused, role-based Driven Ports (e.g., `OrderReaderPort`, `OrderWriterPort`) prevents Application Services from depending on unnecessary persistence operations. Why others are incorrect: Option a creates monolithic "fat" interfaces violating ISP. Options c and d confuse ISP with language syntax or network deployment strategies.
</details>

---

**5. An outbound payment adapter fails due to a network timeout calling an external Stripe REST API. Where should the low-level HTTP exception be caught and translated into a domain exception?**  
a) Inside the Domain Entity logic.  
b) Inside the Payment Driven Adapter.  
c) Inside the Inbound REST Controller.  
d) Inside the Application Service method.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Adapters encapsulate technical infrastructure mechanics. The Driven Adapter must catch vendor-specific SDK/HTTP errors (`HttpClientErrorException`) and map them into domain-meaningful exceptions (`PaymentGatewayDownException`) defined in the Core before throwing them upward. Why others are incorrect: Option a pollutes entities with HTTP logic. Options c and d force the Core or entry controller to know about external network library exceptions.
</details>

---

**6. What is the role of a Data Mapper within a Driven (Secondary) Adapter?**  
a) To map HTTP endpoints to web controller handlers.  
b) To translate between infrastructure data representations (e.g., ORM Entities, Mongo documents) and pure Domain Entities.  
c) To map domain objects into HTML templates.  
d) To automatically create database tables during application startup.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: A Data Mapper inside a Driven Adapter translates data bidirectionally between the persistence layer format (database rows/ORM objects) and pure domain aggregates used inside the Core. Why others are incorrect: Option a describes routing. Option c describes view rendering. Option d describes database schema migration tools (like Liquibase or Flyway).
</details>

---

**7. Why are Command DTOs used at the Driving Adapter boundary instead of passing framework request objects (e.g., `HttpServletRequest`) directly into the Core?**
a) `HttpServletRequest` objects cannot be passed into methods in modern programming languages.  
b) Command DTOs decouple the Core from web framework abstractions, allowing entry points to be triggered by non-HTTP callers (like CLI tools or message consumers).  
c) Command DTOs automatically encrypt data sent over network channels.  
d) Framework request objects prevent database transactions from executing.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Using framework-neutral Command DTOs ensures that the Application Core remains unaware of the delivery mechanism. The exact same use case can be called by an HTTP Controller, a Kafka Consumer, or an automated test without modifying the Core. Why others are incorrect: Option a is factually false. Options c and d are false claims regarding security and transaction management.
</details>

---

**8. In a Hexagonal application, how is a messaging queue consumer (e.g., a RabbitMQ listener) categorized?**
a) As a Driven Adapter because messaging queue drivers are infrastructure libraries.  
b) As a Driving Adapter because it receives external triggers, converts payloads into commands, and invokes a Driving Port.  
c) As a Domain Service inside the Application Core.  
d) As a Value Object encapsulating message strings.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Primary/Driving components initiate execution into the core. A queue consumer listens for incoming messages, parses payloads, and drives the application by invoking an Inbound Use Case Port. Why others are incorrect: Option a confuses outbound infrastructure calls with inbound drivers. Options c and d misclassify an infrastructure trigger as a core domain element.
</details>

---

**9. What is the structural flaw if an Application Service instantiates a concrete database adapter directly via `new SqlUserRepository()`?**
a) It causes compilation errors in object-oriented compilers.  
b) It violates Dependency Inversion, coupling the Application Core directly to a concrete infrastructure implementation.  
c) It automatically converts the application into a distributed monolith.  
d) It forces the application to run without an application server context.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Directly instantiating concrete adapters inside the Core hardcodes infrastructure dependencies. To achieve decoupling, the Application Service must depend on abstract Driven Ports (interfaces), letting Dependency Injection inject concrete adapters at runtime. Why others are incorrect: Option a is syntactically valid code. Option c relates to microservice network topology. Option d is irrelevant to dependency direction.
</details>

---

**10. Which statement correctly describes the relationship between a Driving Port and an Application Service?**  
a) The Application Service defines the Driving Port interface, and the REST Controller implements it.  
b) The Driving Port is an interface defined in the Core, and the Application Service implements it to fulfill the use case contract.  
c) The Driving Port inherits concrete logic directly from the Application Service.  
d) The Driving Port is an infrastructure class that invokes the Application Service via reflection.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: The Driving Port defines *what* the application can do (the interface), while the Application Service implements *how* the use case workflow is executed. Why others are incorrect: Option a misplaces the interface implementation. Options c and d confuse interface implementation with inheritance or reflection mechanisms.
</details>

---

**11. What is "Port Pollution" in Hexagonal Architecture?**  
a) Creating too many unit tests for the core domain.  
b) Leaking framework-specific types (e.g., `Spring Pageable`, `JPA Criteria`, `Express Request`) into Port interface signatures.  
c) Implementing Driven Ports using dependency injection frameworks.  
d) Defining ports using domain-driven naming conventions.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Port Pollution occurs when infrastructure-specific abstractions or framework classes leak into port method signatures (e.g., `findAll(Pageable pageable)`). Ports must use pure domain models, primitives, or domain-level abstractions. Why others are incorrect: Option a is good practice. Options c and d describe standard, correct Hexagonal practices.
</details>

---

**12. How should an Outbound REST Adapter (e.g., communicating with a Third-Party CRM) return results to the Application Core?**  
a) By returning raw HTTP response string bodies (`ResponseEntity<String>`).  
b) By mapping the third-party HTTP JSON response into pure domain objects or Value Objects required by the Driven Port.  
c) By saving the HTTP response directly into the application's SQL database table before returning.  
d) By returning the third-party API's vendor-specific SDK objects directly.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Outbound Adapters must isolate the Core from third-party schemas. They map external vendor payloads into domain concepts defined by the Port contract, ensuring vendor changes don't break business logic. Why others are incorrect: Options a and d expose low-level or vendor-specific formats to the Core. Option c mixes persistence side effects into an external communication adapter.
</details>

---

**13. What is the key distinction between a Command DTO and a Response DTO at the Driving boundary?**  
a) Command DTOs carry intent and input values required to execute an action; Response DTOs encapsulate output data formatted for external consumers.  
b) Command DTOs contain database ORM annotations; Response DTOs contain SQL statements.  
c) Command DTOs are used exclusively for relational databases; Response DTOs are used for NoSQL databases.  
d) Command DTOs are mutable entities; Response DTOs are database tables.  

<details>
  <summary>Solution</summary>
- a.
Why a is correct: Command DTOs represent write/execute operations (inputs like `RegisterUserCommand`), whereas Response DTOs represent query or execution results formatted specifically for external callers (outputs like `UserRegistrationResponse`). Why others are incorrect: Options b, c, and d introduce false associations with database mechanics and ORM mappings.
</details>

---

**14. When organizing a Hexagonal codebase using "Package by Feature", where should the adapter packages reside?**  
a) In a completely separate global top-level project module completely disconnected from features.  
b) Inside the feature package boundary (e.g., `com.app.order.adapter`), cleanly separated from `domain` and `port` sub-packages.  
c) Directly inside the `com.app.order.domain.model` package alongside entities.  
d) In the root system directory alongside build scripts.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: In Package by Feature, all code for a business capability (`order`) is co-located. Inside `com.app.order`, sub-packages (`domain`, `port`, `adapter`) keep architectural boundaries explicit while maintaining high domain cohesion. Why others are incorrect: Option a describes Package by Layer. Option c breaks isolation by mixing infrastructure adapters with pure domain models. Option d is invalid package organization.
</details>

---

**15. How does Hexagonal Architecture simplify replacing a database engine (e.g., migrating from PostgreSQL to MongoDB)?**  
a) By automatically converting SQL queries into MongoDB aggregation pipelines at runtime.  
b) By requiring changes only inside a new Driven Adapter that implements the existing Driven Port, leaving the Application Core completely untouched.  
c) By forcing Application Services and Domain Entities to be rewritten using MongoDB drivers.  
d) Infrastructure components cannot be changed once a Hexagonal system is built.  

<details>
  <summary>Solution</summary>
- b.
Why b is correct: Because the Core depends only on abstract Driven Ports, swapping persistence tech involves creating a new MongoDB Driven Adapter that implements the existing port interface and updating the DI configuration. The Core logic requires zero code changes. Why others are incorrect: Option a claims automated runtime conversion which doesn't exist. Option c describes the flaw of coupled non-hexagonal systems. Option d is false.
</details>