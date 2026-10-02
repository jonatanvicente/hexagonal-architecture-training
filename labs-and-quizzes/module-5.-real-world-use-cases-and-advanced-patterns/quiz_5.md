# 🧠 Module 5 Quiz: Real-World Use Cases and Advanced Patterns

**1.** What does polyglot persistence mean?

a) Storing all data in a single multi-model database  
b) Using different storage technologies for different needs within the same system  
c) Translating database schemas into several programming languages  
d) Replicating the same database across multiple regions  

<details>
  <summary>Solution</summary>

- b
- Each data need (relational, documents, cache, search, graph...) uses the store that fits it best. Hexagonal Architecture hides this behind ports.
</details>

---

**2.** How does Hexagonal Architecture make polyglot persistence manageable?

a) By forcing all adapters to share one ORM  
b) By storing data in the domain entities  
c) Each storage technology is implemented as a separate adapter behind a port  
d) By removing the need for repositories  

<details>
  <summary>Solution</summary>

- c
- The domain talks to ports only. Each technology lives in its own adapter, so the core is unaware of how many stores exist.
</details>

---

**3.** Which design decision best supports a database-agnostic domain?

a) Domain entities annotated with ORM mappings  
b) Domain logic written as stored procedures  
c) Use cases that build SQL queries dynamically  
d) Separate persistence models in adapters, mapped to and from domain entities  

<details>
  <summary>Solution</summary>

- d
- Keeping persistence models in the adapter prevents DB concerns (annotations, nullable columns, IDs) from leaking into the domain.
</details>

---

**4.** Where should the repository interface be defined in Hexagonal Architecture?

a) In the domain/application core, as an output port  
b) In the infrastructure layer, next to the ORM  
c) In the REST controller  
d) In a shared library owned by the DB team  

<details>
  <summary>Solution</summary>

- a
- The core owns the interface (dependency inversion). Infrastructure implements it, so dependencies point inward.
</details>

---

**5.** Which repository interface is most aligned with domain-driven design?

a) `executeQuery(String sql)`  
b) `findByOrder(Order order)` returning `ResultSet`  
c) `findById(OrderId id)` and `save(Order order)` working with aggregates  
d) `getTable("orders")`  

<details>
  <summary>Solution</summary>

- c
- Repositories should act like collections of aggregates, using domain language and types, not database concepts.
</details>

---

**6.** What is a common anti-pattern when implementing repositories?

a) One repository per aggregate root  
b) Generic repositories exposing every possible query, leaking persistence details into the core  
c) Mapping persistence models to domain entities  
d) Defining repositories as interfaces  

<details>
  <summary>Solution</summary>

- b
- "Do-everything" generic repositories turn into query builders, couple the core to storage and break aggregate boundaries.
</details>

---

**7.** In Hexagonal Architecture, how can the application core control transactions without depending on a framework?

a) By using `@Transactional` annotations inside domain entities  
b) By opening JDBC connections inside use cases  
c) By letting each repository commit on every call  
d) By defining a transaction port (e.g., `TransactionManager` or Unit of Work) implemented by an adapter  

<details>
  <summary>Solution</summary>

- d
- An abstraction owned by the core keeps it framework-free, while the adapter delegates to Spring, JPA, or any other technology.
</details>

---

**8.** What is the main responsibility of the Unit of Work pattern?

a) Tracking changes during a business operation and committing them together as one atomic unit  
b) Caching query results across requests  
c) Splitting large transactions into smaller ones  
d) Generating database IDs for entities  

<details>
  <summary>Solution</summary>

- a
- It collects new, modified and deleted objects and persists them all at once, guaranteeing consistency of the operation.
</details>

---

**9.** Following DDD guidelines, what should a single transaction ideally modify?

a) As many aggregates as the use case needs  
b) One aggregate  
c) Only read models  
d) All aggregates in the bounded context  

<details>
  <summary>Solution</summary>

- b
- Aggregates are consistency boundaries. Changes to other aggregates should use eventual consistency (e.g., domain events).
</details>

---

**10.** What is the "dual-write" problem?

a) Two users updating the same record simultaneously  
b) Writing the same data in two different formats  
c) Writing to a database and publishing to a message broker without atomicity, risking inconsistency if one fails  
d) Saving an entity twice due to ORM cascading  

<details>
  <summary>Solution</summary>

- c
- The DB commit may succeed while the message publish fails (or vice versa), leaving systems out of sync.
</details>

---

**11.** How does the Transactional Outbox Pattern solve the dual-write problem?

a) By sending the message before writing to the database  
b) By using distributed two-phase commit between DB and broker  
c) By retrying the database write until the broker confirms  
d) By saving the event in an outbox table in the same DB transaction, then publishing it asynchronously  

<details>
  <summary>Solution</summary>

- d
- Business data and event commit atomically. A relay (polling or CDC) publishes the event afterward.
</details>

---

**12.** Which delivery guarantee does the outbox relay usually provide, and what does it imply for consumers?

a) At-least-once; consumers must be idempotent  
b) Exactly-once; consumers need no extra logic  
c) At-most-once; some events may be lost  
d) No guarantee; consumers must poll the database  

<details>
  <summary>Solution</summary>

- a
- The relay may publish an event again after a crash, so consumers must handle duplicates safely (e.g., deduplication by event ID).
</details>

---

**13.** Which technique is commonly used to publish outbox events without polling the table?

a) Database triggers calling REST APIs  
b) Change Data Capture (CDC), e.g., Debezium reading the transaction log  
c) Scheduled batch exports to CSV  
d) Two-phase commit  

<details>
  <summary>Solution</summary>

- b
- CDC streams committed changes from the DB log with low latency and no extra load from polling queries.
</details>

---

**14.** In Netflix's experience applying Hexagonal Architecture to its studio applications, what was the key benefit highlighted?

a) It eliminated the need for automated tests  
b) It allowed them to drop all databases in favor of APIs  
c) They could swap a data source (e.g., to GraphQL) with minimal changes, without touching business logic  
d) It removed the need for a domain model  

<details>
  <summary>Solution</summary>

- c
- Because data sources were adapters behind repository interfaces, changing the source was a localized change, letting them postpone and revise infrastructure decisions.
</details>

---

**15.** Which lesson from the Netflix case best generalizes to other projects?

a) Hexagonal Architecture is only useful for very large companies  
b) Infrastructure decisions should be made upfront and never changed  
c) Business logic should live in the adapters for flexibility  
d) Isolating the core from data sources lets you delay decisions and adapt to changing integrations cheaply  

<details>
  <summary>Solution</summary>

- d
- Decoupling gives flexibility: integrations evolve, but the core stays stable and testable.
</details>

---
