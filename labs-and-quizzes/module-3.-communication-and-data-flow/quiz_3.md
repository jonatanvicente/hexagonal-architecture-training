# 🧠 Module 3 Quiz: Communication and Data Flow

🧪 **Goal:** Assess understanding of ports, adapters, DTO mapping and exception translation across the hexagon's boundaries.

---

**1.** What is the primary role of a Driving (Inbound) Port?

a) Implementing the use case workflow and handling transactions  
b) Defining, as an interface in the core, the use cases the application exposes  
c) Translating HTTP requests into commands for the application  
d) Defining what the core needs from external systems, such as persistence  

<details>
  <summary>Solution</summary>

- b
- It is the entry contract of the core. Option a describes the Application Service, c the driving adapter, and d a driven port.
</details>

---

**2.** Which component receives an HTTP JSON payload, converts it into a command and calls a Driving Port?

a) Application Service  
b) Driven Adapter  
c) Driving Port  
d) Driving Adapter  

<details>
  <summary>Solution</summary>

- d
- Driving adapters translate a protocol (HTTP, CLI, messaging) into calls to the core.
</details>

---

**3.** Why shouldn't a Driven Port return ORM/JPA entities to the Application Service?

a) It leaks persistence details into the core and exposes it to ORM issues like lazy loading  
b) ORM entities cannot be used outside the repository's package  
c) Ports may only return primitives or DTOs  
d) ORM entities are slower to pass between layers than domain objects  

<details>
  <summary>Solution</summary>

- a
- Ports speak the domain's language. ORM entities couple the core to the persistence framework and can cause errors like `LazyInitializationException`.
</details>

---

**4.** How does the Interface Segregation Principle apply to Driven Ports?

a) One generic repository port for the whole application, reused by all use cases  
b) One driven port per database table  
c) Narrow ports tailored to what the core needs (e.g., `OrderReader`, `OrderWriter`)  
d) One port per technology, such as `JpaPort` or `MongoPort`  

<details>
  <summary>Solution</summary>

- c
- Clients shouldn't depend on methods they don't use. Options b and d let storage or technology shape the core's contracts.
</details>

---

**5.** A payment adapter gets a network timeout from an external payment API. Where should this exception be translated into a domain exception?

a) In the payment driven adapter  
b) In the Application Service, with a try/catch around the port call  
c) In the REST controller's global exception handler  
d) In the domain entity that requested the payment  

<details>
  <summary>Solution</summary>

- a
- The adapter owns the technical details. Options b, c and d force other components to know HTTP client exceptions.
</details>

---

**6.** What is the role of a Data Mapper within a Driven Adapter?

a) Mapping HTTP requests to command objects  
b) Mapping domain objects to response DTOs for the API  
c) Generating database tables from domain entities at startup  
d) Translating between persistence models (ORM entities, documents) and domain entities  

<details>
  <summary>Solution</summary>

- d
- It works in both directions at the persistence boundary. Options a and b are mappings, but they belong to driving adapters.
</details>

---

**7.** Why pass a Command DTO to the core instead of a framework object like `HttpServletRequest`?

a) Command DTOs are faster to serialize than request objects  
b) The core stays independent of the delivery mechanism, so CLI, consumers or tests can reuse the use case  
c) Request objects cannot be validated with annotations  
d) Command DTOs let the core read HTTP headers in a type-safe way  

<details>
  <summary>Solution</summary>

- b
- Framework-neutral inputs make use cases callable from any driving adapter without changes.
</details>

---

**8.** How is a RabbitMQ message listener categorized?

a) Driven adapter, because messaging libraries are infrastructure  
b) Driven port, because the broker is an external system  
c) Driving adapter, because it triggers a use case from an external event  
d) Application Service, because it orchestrates message processing  

<details>
  <summary>Solution</summary>

- c
- Direction defines the role, not the technology. A RabbitMQ publisher, instead, would be a driven adapter.
</details>

---

**9.** What is the flaw if an Application Service creates `new SqlUserRepository()` directly?

a) It prevents the use of database transactions  
b) It creates a new connection pool on every call  
c) It breaks the Single Responsibility Principle of the repository  
d) It violates Dependency Inversion, coupling the core to a concrete adapter  

<details>
  <summary>Solution</summary>

- d
- The service should depend on a driven port, with the implementation injected from outside (composition root).
</details>

---

**10.** What is the relationship between a Driving Port and an Application Service?

a) The port is an interface in the core; the Application Service implements it  
b) The Application Service is an interface; the controller implements it  
c) The driving adapter implements the port and then calls the Application Service  
d) The port is an infrastructure class that delegates to the Application Service  

<details>
  <summary>Solution</summary>

- a
- The port defines *what* the application offers. The service defines *how* the use case runs. The adapter only calls the port.
</details>

---

**11.** A driven port declares `findAll(Pageable pageable)` using Spring Data's `Pageable`. What is the problem?

a) None, since `Pageable` is a standard pagination abstraction  
b) Ports must never support pagination, since it is a UI concern  
c) A framework type leaks into the core's contract, coupling it to Spring  
d) The method should return ORM entities to support lazy pagination  

<details>
  <summary>Solution</summary>

- c
- Port signatures must use domain or neutral types. Define your own value object (e.g., `PageRequest`) and map it in the adapter.
</details>

---

**12.** How should a driven adapter for a third-party CRM API return results to the core?

a) Return the vendor's SDK objects, since they are already typed  
b) Map the external response into domain objects defined by the port  
c) Return the raw JSON so the Application Service extracts what it needs  
d) Return a generic `Map<String, Object>` to stay flexible against API changes  

<details>
  <summary>Solution</summary>

- b
- The adapter shields the core from external schemas, so vendor changes only affect the adapter.
</details>

---

**13.** What is the key difference between a Command DTO and a Response DTO at the driving boundary?

a) Command DTOs are always validated inside entities, while Response DTOs are validated by adapters  
b) Command DTOs belong to driven ports, while Response DTOs belong to driving ports  
c) Command DTOs are mutable, while Response DTOs must be domain entities  
d) Command DTOs carry the input and intent of an action; Response DTOs carry output for the caller  

<details>
  <summary>Solution</summary>

- d
- Example: `RegisterUserCommand` as input and `UserRegistrationResponse` as output. Neither should expose domain entities directly.
</details>

---

**14.** Using "Package by Feature", where should adapters live?

a) Inside the feature package, e.g. `com.app.order.adapter`, next to `domain` and `port`  
b) In a global `com.app.adapters` package shared by all features  
c) Inside `com.app.order.domain`, next to the entities they persist  
d) In a separate `infrastructure` module containing the adapters of all features  

<details>
  <summary>Solution</summary>

- a
- Each feature keeps all its code together with explicit sub-packages. Options b and d group by layer, and c mixes infrastructure into the domain.
</details>

---

**15.** How does Hexagonal Architecture help when migrating from PostgreSQL to MongoDB?

a) The core is rewritten for the MongoDB driver while the adapters stay the same  
b) The ORM automatically translates SQL queries into MongoDB queries  
c) A new driven adapter implements the existing port, so changes are mostly confined to infrastructure  
d) Both databases must run in parallel permanently to keep the core unchanged  

<details>
  <summary>Solution</summary>

- c
- The core depends only on ports. Some adjustments may still be needed if the new store offers different guarantees, such as transactions or query capabilities.
</details>

---
