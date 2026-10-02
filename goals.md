
## ✨ Module 1. Fundamentals (3.5 hours)

🧪 **Goal:** Understand why Hexagonal Architecture emerged, the design principles behind it, and how Ports and Adapters improve system cohesion.

- **Historical context of design patterns**
  - Evolution from monolithic n-tier architectures
- **Key design principles**
  - Dependency Inversion Principle (DIP)
  - Separation of Concerns
  - Preventing architecture erosion
- **Introduction to Hexagonal Architecture (Ports & Adapters)**
  - Formal definition of Ports and Adapters
  - Impact on system cohesion

---

## ✨ Module 2. Anatomy of the Hexagon (5 hours)

🧪 **Goal:** Identify the building blocks of the domain core and design ports that define its boundary and keep dependencies pointing inward.

- **Domain model building blocks**
  - Entities
  - Value Objects
  - Domain Services
  - Application Services vs. Domain Services
  - Package & directory structuring patterns
- **Defining ports**
  - Interfaces as contracts of the application core
  - Defining the application boundary
- **Port classification**
  - Driving (primary / inbound) ports
  - Driven (secondary / outbound) ports
  - Dependency Rule: dependencies point inward

---

## ✨ Module 3. Communication and Data Flow (5 hours)

🧪 **Goal:** Implement driving and driven adapters and wire them to the core through Dependency Injection while keeping components loosely coupled.

- **Driving (primary) adapters**
  - User interfaces
  - REST controllers
  - Event consumers
- **Driven (secondary) adapters**
  - Persistence adapters
  - External service clients
  - Message brokers
  - Boundary Translation
  - Exception Translation
- **Dependency management**
  - Dependency Injection
  - Loose coupling between components

---

## ✨ Module 4. Testing Strategies in Decoupled Architectures (5 hours)

🧪 **Goal:** Design and apply a layered test strategy that tests the domain in isolation, adapters through integration tests, and the whole system end to end.

- **Test strategy design**
  - Test pyramid applied to Hexagonal Architecture
- **Domain testing**
  - Unit testing the domain in isolation
- **Infrastructure testing**
  - Integration tests for adapters
  - Test doubles: mocks, stubs and fakes
  - Controlled test environments
- **End-to-end validation**
  - Contract testing
  - End-to-end tests

---

## ✨ Module 5. Real-World Use Cases and Advanced Patterns (5 hours)

🧪 **Goal:** Apply advanced persistence and transaction patterns to keep the domain independent of databases and frameworks in real-world scenarios.

- **Persistence and databases**
  - Polyglot persistence
  - Database-agnostic design
- **Data access patterns**
  - Repository pattern implementation
- **Transaction management**
  - Transaction boundaries in the domain
  - Framework independence
  - Unit of Work pattern
  - Atomicity of operations
  - Dual-writes and the Transactional Outbox Pattern

---

## ✨ Final Project – "From Monolith to Hexagon" (4 hours)

🧪 **Goal:** Migrate a monolithic system to Hexagonal Architecture and measure the resulting improvements in coupling and maintainability.

- **Architectural migration**
  - MVC to Hexagonal
  - Monolith migration strategies
  - Code-level legacy refactoring
  - Strangler Fig Pattern
- **Hexagonal Architecture in modern systems**
  - Microservices
  - Event-Driven Architectures (EDA)
- **Architecture assessment**
  - Software quality metrics
  - Reducing coupling
  - Improving maintainability

---

