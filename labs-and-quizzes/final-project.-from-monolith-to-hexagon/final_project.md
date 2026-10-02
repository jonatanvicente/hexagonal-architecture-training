# 🧠 Final Project Quiz: From Monolith to Hexagon

🧪 **Goal:** Assess the ability to migrate a monolith to Hexagonal Architecture and measure improvements in coupling and maintainability.

---

**1.** When migrating an MVC application to Hexagonal Architecture, what is usually the safest first step?

a) Rewriting the whole application from scratch with the new structure  
b) Covering current behavior with characterization tests before refactoring  
c) Splitting the database into one schema per future bounded context  
d) Replacing the web framework with a lighter one  

<details>
  <summary>Solution</summary>

- b
- Characterization tests capture what the system does today, including undocumented behavior, so refactoring can proceed safely.
</details>

---

**2.** A fat MVC `OrderService` mixes business rules with direct JPA calls. What is the target after refactoring?

a) Move all logic into the controller to keep the service thin  
b) Move the rules into the JPA entities, keeping repository calls in the service  
c) Keep the service as is and add interfaces only for the controllers  
d) Move rules into domain objects, and keep orchestration in an application service using driven ports  

<details>
  <summary>Solution</summary>

- d
- Rules go into a rich domain and persistence goes behind ports. Option b still couples business logic to the ORM.
</details>

---

**3.** Which monolith migration strategy generally carries the lowest risk?

a) Incremental migration, delivering slices while the legacy system keeps running  
b) A big-bang rewrite, deployed once all features are complete  
c) Freezing new features until the full migration is finished  
d) Migrating the database first, then all the code in a single release  

<details>
  <summary>Solution</summary>

- a
- Small, reversible steps deliver value early and limit the impact of mistakes. Big-bang rewrites must rebuild all hidden behavior at once.
</details>

---

**4.** In legacy code refactoring, what is a "seam"?

a) A merge conflict between legacy and new branches  
b) A database view used to hide legacy tables  
c) A place where behavior can be changed without editing the code there  
d) The network boundary between two microservices  

<details>
  <summary>Solution</summary>

- c
- Seams (Michael Feathers) let you substitute behavior, e.g., by extracting an interface and injecting it. This is the starting point for introducing ports.
</details>

---

**5.** `LegacyTaxCalculator` is used in many places inside the monolith. How do you replace it incrementally with Branch by Abstraction?

a) Delete the legacy class and fix compilation errors one by one  
b) Copy and modify the class, then switch all callers in one commit  
c) Route tax requests through an API gateway to a new service  
d) Introduce an interface, migrate callers to it, add the new implementation and switch with a toggle  

<details>
  <summary>Solution</summary>

- d
- Old and new implementations coexist behind the abstraction until the switch is safe. Option c describes Strangler Fig at the network level.
</details>

---

**6.** How does the Strangler Fig pattern move functionality out of the monolith?

a) A routing facade sends migrated features to the new system while the rest still reach the monolith  
b) Code is copied module by module, and the monolith is switched off at the end  
c) Both systems process every request, and results are compared before responding  
d) The monolith internally calls the new system for every request  

<details>
  <summary>Solution</summary>

- a
- Traffic shifts gradually until the monolith is no longer needed. Option c describes a parallel run, a useful verification technique but not the pattern itself.
</details>

---

**7.** A new hexagonal service needs data still owned by the monolith's database. What is a sound approach during migration?

a) Let the new service read and write the monolith's tables directly  
b) Access it through an anti-corruption adapter, or sync it via CDC/events until ownership moves  
c) Copy the monolith database nightly and treat the copy as the master  
d) Postpone the migration until the monolith database is retired  

<details>
  <summary>Solution</summary>

- b
- The legacy model stays outside the new core. Shared tables (a) couple both systems to the same schema.
</details>

---

**8.** How does Hexagonal Architecture relate to microservices?

a) Each port must be deployed as its own microservice  
b) Hexagonal Architecture can only be applied to microservices  
c) Each microservice can be structured as a hexagon, reaching other services through adapters  
d) Microservices make it unnecessary, since they are already decoupled  

<details>
  <summary>Solution</summary>

- c
- They are complementary. Microservices decouple at deployment level, while hexagons decouple each service's internals.
</details>

---

**9.** Service A consumes another team's API, whose model differs from A's domain. Where should the translation live?

a) In a driven adapter acting as an anti-corruption layer  
b) In A's domain entities, which adapt to the external model  
c) In the other team's service, which must adopt A's model  
d) In a shared library with common entities for both services  

<details>
  <summary>Solution</summary>

- a
- The adapter protects A's model from external changes. A shared entity library (d) couples both services' evolution.
</details>

---

**10.** How should an `OrderPlaced` domain event reach Kafka in a hexagonal service?

a) The aggregate publishes it directly using the Kafka client  
b) The domain event class extends Kafka's `ProducerRecord`  
c) The REST controller publishes it after the use case returns  
d) The core raises it, and a driven adapter behind an `EventPublisher` port sends it  

<details>
  <summary>Solution</summary>

- d
- The core stays broker-agnostic. Combine it with the Transactional Outbox to avoid dual writes.
</details>

---

**11.** An event consumer may receive the same `OrderPlaced` event twice. How should it handle this?

a) Rely on the broker to deliver each message exactly once  
b) Throw an exception on duplicates so the broker retries  
c) Process events idempotently, e.g., by tracking processed event IDs  
d) Process events in parallel to finish faster  

<details>
  <summary>Solution</summary>

- c
- Most brokers guarantee at-least-once delivery, so duplicates are normal. Option b causes endless redelivery.
</details>

---

**12.** Using Robert C. Martin's Instability metric, I = Ce / (Ca + Ce), what value should the domain package ideally have?

a) Close to 1, since the domain changes most often  
b) Close to 0, since many depend on it and it depends on few  
c) Exactly 0.5, balancing incoming and outgoing dependencies  
d) None, since the metric doesn't apply to domain packages  

<details>
  <summary>Solution</summary>

- b
- A stable core has few outgoing dependencies. Adapters are naturally unstable (close to 1), since they depend on the core and on frameworks.
</details>

---

**13.** Which metric measures how many external packages a module depends on?

a) Efferent coupling (Ce)  
b) Afferent coupling (Ca)  
c) Cyclomatic complexity  
d) Lack of cohesion (LCOM)  

<details>
  <summary>Solution</summary>

- a
- Ce counts outgoing dependencies and Ca counts incoming ones. A drop in the core's Ce after migration shows reduced coupling.
</details>

---

**14.** After migration, how can you prevent the domain from depending on infrastructure again?

a) Relying on code reviews, since such rules can't be automated  
b) Raising test coverage above 80%  
c) Documenting the rules in the project README  
d) Using automated architecture tests (e.g., ArchUnit) that fail the build  

<details>
  <summary>Solution</summary>

- d
- Automated rules make boundaries enforceable. Reviews and docs help, but violations slip through over time.
</details>

---

**15.** Which result best shows that the migration improved maintainability?

a) More classes were created, since responsibilities are now split  
b) Coverage rose thanks to many new end-to-end tests  
c) Typical changes touch fewer modules, and the core's coupling decreased  
d) API response times dropped after the migration  

<details>
  <summary>Solution</summary>

- c
- Maintainability is about the cost of change. Class count, e2e coverage and performance don't measure it directly.
</details>

---

