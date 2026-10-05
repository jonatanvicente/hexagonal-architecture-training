# Testing – US Flights Hexagonal PoC

← Back to [README.md](./README.md)

This document explains **every test in the project, why it exists, and why it lives where it
does**. The test suite is the second half of the lesson: the hexagonal architecture is what makes
this pyramid cheap to build.

---

## 1. The idea in one picture

```
                      ▲  slower, fewer, broader, more realistic
                     ╱ ╲
                    ╱E2E╲             14 tests  apps/*/src/*.e2e.test.ts
                   ╱─────╲                      real process, real HTTP, real argv/exit codes
                  ╱ INTEG-╲
                 ╱ RATION  ╲          62 tests  adapters/**/src/*.int.test.ts
                ╱ + CONTRACT╲                   one adapter + its real technology
               ╱─────────────╲                  (PostgreSQL, Fastify, broker, clock, argv)
              ╱               ╲
             ╱      UNIT       ╲     141 tests  packages/**/src/*.unit.test.ts (+ pure adapter code)
            ╱                   ╲               domain + use cases, no I/O, milliseconds
           ╱─────────────────────╲
                      ▼  faster, more, narrower, more precise
```

| Level | Tests | Time (whole level) | Needs |
|---|---:|---:|---|
| Unit | 141 | ~0.2 s | nothing |
| Integration + contract | 62 | ~0.4 s | PostgreSQL for 23 of them (auto-skipped otherwise) |
| End-to-end | 14 | ~0.6 s | nothing, plus PostgreSQL for 1 optional smoke test |

**Why a pyramid?** Each level catches a different class of bug at a different cost:

- **Unit tests** check *business rules*. They are fast and pinpoint the broken line, so there are many.
- **Integration tests** check that *an adapter really talks to its technology*: SQL, HTTP
  framework, broker semantics. Unit tests cannot see those bugs.
- **E2E tests** check *the wiring of the whole running system*. They are slow and vague when they
  fail ("something is broken"), so there are few, and only for critical journeys.

Inverting it (many E2E, few unit tests) gives the "ice-cream cone": slow, flaky, and hard to debug.

### Why hexagonal architecture makes the pyramid easy

The hexagon depends **only on ports (interfaces)**. That gives three natural test seams:

```
 [E2E] ──► driving adapter ──► │ ports/in │ HEXAGON │ ports/out │ ──► driven adapter ──► tech
            └── [INTEGRATION] ─┘          [UNIT]               └── [INTEGRATION] ──┘
                 driving ports stubbed     driven ports faked       real technology
```

- **Inside the hexagon** → unit tests. Plug hand-written fakes into `ports/out`, call `ports/in`.
- **Each adapter** → integration test. Real technology on one side, stubs or contract assertions
  on the port side.
- **Whole system** → a few E2E tests through the real entry points.

---

## 2. Conventions

### File naming: the suffix *is* the pyramid level

| Suffix | Level | npm script |
|---|---|---|
| `*.unit.test.ts` | unit | `npm run test:unit` |
| `*.int.test.ts` | integration (incl. contract runs against real tech) | `npm run test:integration` |
| `*.e2e.test.ts` | end-to-end | `npm run test:e2e` |

The runner selects a level with a glob, so no configuration file is needed.

### Location: tests live next to the code they test

Tests are **co-located** (`flight.ts` ↔ `entities.unit.test.ts` in the same folder), not in a
separate `/tests` tree, because:

1. **The test belongs to the same boundary as the code.** A domain test sits inside `packages/domain`,
   so it can only import what the domain can import. If a domain test needed `pg`, the
   `package.json` of the domain would have to declare it, and that dependency would be an
   obvious red flag. Co-location makes the tests obey the hexagon's dependency rules.
2. **Ownership is obvious.** Deleting or moving an adapter moves its tests with it.
3. **Imports are short and honest.** `./mappers.ts`, not `../../../../src/adapters/...`.

### Rule of thumb: where does a new test go?

| You are testing… | Put it in… | Level |
|---|---|---|
| A business rule, value object, entity, policy | `packages/domain/src/**` | unit |
| A use case's orchestration (what it asks of the ports) | `packages/application/src/services` | unit |
| Pure logic inside an adapter (row mapping, SQL building) | that adapter's `src/` | unit |
| An adapter against its real technology | that adapter's `src/` | integration |
| Behaviour every implementation of a port must share | `packages/application/src/testing/*-contracts.ts` | contract |
| A user journey through a running process | `apps/<app>/src/` | e2e |

### Style

- Runner: **built-in `node:test` + `node:assert/strict`**. There are no test dependencies, and
  `.ts` files run natively exactly as in production. Vitest would add about 3 MB plus Vite for a
  nicer watch UI, which this PoC doesn't need.
- Descriptive names: `should <expected behaviour> when <condition>`.
- **No mocking library.** Doubles are small hand-written classes that implement the port
  interface. If a port is hard to fake, the port is badly designed, and that is useful feedback.
- No sleeps for time: time goes through `ClockPort`, and tests use `FixedClock.advanceSeconds()`.

---

## 3. The testing kit – `@usflights/application/testing`

`packages/application/src/testing/` is test support, exported as a **separate entry point**
(`"./testing"` in `packages/application/package.json`) so production code never pulls it in.

**Why in `application`?** The application *owns* the ports. Whoever defines an interface should
also provide its test doubles and its contract. Adapters already depend on `application`, so they
can import the kit without any new dependency arrow.

| File | Contents | Used by |
|---|---|---|
| `builders.ts` | `anAirport()`, `aCarrier()`, `aFlight()`, `aStatsSnapshot()`: objects with sensible defaults; each test overrides only what matters | unit tests |
| `fakes.ts` | `FixedClock`, `RecordingLogger`, `RecordingEventPublisher`, `RecordingNotifier`, `InMemoryCache`, `StubAirportRepository`, `StubCarrierRepository`, `StubFlightRepository` | unit + integration tests |
| `repository-contracts.ts` | `runRepositoryContract()`, the shared behavioural spec of the three repository ports | in-memory and postgres adapters |
| `async.ts` | `waitFor()`, which polls for asynchronous outcomes (broker delivery) without fixed sleeps | Kafka consumer test |

**Fakes vs stubs vs spies.** The doubles combine roles on purpose:

- **Stub** (canned answers): `StubFlightRepository` returns the stats you give it.
- **Spy** (records interactions): every stub also records its calls (`searchCalls`,
  `statsByCarrierCalls`…), so a test can assert *what the use case asked of the outside world*,
  e.g. "the policy threshold 20 was passed to the repository".
- **Fake** (working, simplified implementation): `InMemoryCache`, `FixedClock`.

---

## 4. Contract tests – the hexagonal-specific level

A driven port is a promise: *"any adapter plugged in here behaves like THIS"*. With two adapters
for the same port (`postgres` and `in-memory`), nothing guarantees by itself that they behave the
same. The in-memory one might sort differently, count cancelled flights as delayed, or ignore
LIKE escaping. Then `PERSISTENCE=memory` would silently change the application's behaviour.

`runRepositoryContract(name, setup, { skip })` defines **19 behavioural tests**, written once:

- **AirportRepository:** find by code, null when missing, state filter + ordering,
  case-insensitive partial city match, free text, LIKE wildcards treated literally, stable pagination.
- **CarrierRepository:** find by code, find many (ignoring unknown codes), empty input, search by name.
- **FlightRepository:** only flown flights at or above the delay, worst-first ordering, origin
  filter, unreachable threshold, **`statsForAirport().delayed` equals `findDelayed().total`**
  (the same rule in both queries), zeroed stats, `minFlights`, year filter.

It runs twice:

| Adapter | File | Level | When |
|---|---|---|---|
| in-memory | `adapters/driven/in-memory/src/in-memory-repositories.unit.test.ts` | unit (no I/O) | always |
| postgres | `adapters/driven/postgres/src/postgres-repositories.int.test.ts` | integration | when `PGPASSWORD` is set |

**If both pass, the adapters are interchangeable**, which is the core promise of the architecture,
proven by tests instead of by hope. The contract only relies on facts true in *both* datasets
(JFK in NY, HOU and IAH in Houston, flights from ORD and in 2005, carriers AA and DL).

---

## 5. Test catalogue – what, why, and why there

### 5.1 Unit tests (141) – the base

#### `packages/domain` – business rules (45 tests, zero doubles)

| File | What it pins down | Why here |
|---|---|---|
| `src/value-objects/value-objects.unit.test.ts` (20) | `IataCode`/`CarrierCode` normalization and rejection (including an injection-shaped input), `Delay` rounding, negative (early) and unknown delays, the `isAtLeast` boundary, `FlightDate` leap years and no silent roll-over | Value objects are pure. This is the cheapest place to cover every edge case. |
| `src/policies/delay-policy.unit.test.ts` (8) | The FAA default (15), **boundary: exactly 15 = delayed**, custom thresholds, invalid thresholds | The single definition of "delayed". If it is wrong, every report is wrong. |
| `src/entities/entities.unit.test.ts` (10) | `Flight.status()` precedence (CANCELLED > DIVERTED > DELAYED/ON_TIME), status depends on the injected policy, `Airport` invariants (trimmed name, coordinates), `Carrier` fallback name | Entity invariants belong with the entity. |
| `src/services/punctuality.unit.test.ts` (7) | On-time maths, rounding, **no division by zero**, defensive clamp, ranking order with deterministic tie-breaks, input not mutated | Interpretation of statistics is domain logic, kept apart from the SQL that counts. |

#### `packages/application` – use cases (46 tests, all ports faked)

| File | What it pins down | Why here |
|---|---|---|
| `src/services/airport-use-cases.unit.test.ts` (11) | Input normalization *before* reaching the repository, views instead of entities, validation failures **never reach the repository**, NotFound, the cache-aside flow (second call is a cache hit and doesn't touch the repository), the policy threshold propagated to the port, nothing cached on error | Orchestration logic: *what does the use case ask of its ports, in which order?* |
| `src/services/flight-and-carrier-use-cases.unit.test.ts` (12) | Default `minDelay` = policy threshold, below-threshold rejection, primitive → value-object conversion, view mapping, ranking order/limit/name fallback, cache keys per parameter set | Same. Each use case is tested in isolation from storage. |
| `src/services/process-flight-status.service.unit.test.ts` (10) | The **exact `FlightDelayDetected` event** published (deterministic thanks to `FixedClock`), one notification per recipient with the EMAIL/SMS channel, the boundary at 15 min, the on-time path publishes nothing, unknown airport or carrier and four invalid-input cases publish nothing | The write-side / event-driven use case. Recording doubles let us assert precisely what crosses the boundary. |
| `src/shared/shared.unit.test.ts` (13) | Pagination limits, "empty string = not provided", text length, state/year/instant parsing, view formatting (`1405 → "14:05"`, percentages) | Shared helpers used by every use case. One place, tested once. |

#### Pure logic inside adapters and infrastructure (50 tests)

| File | What it pins down | Why here (and why *unit*) |
|---|---|---|
| `adapters/driven/postgres/src/mappers.unit.test.ts` (11) | The **legacy schema quirks**: `dayofmonths`, boolean delay-cause columns, padded strings, NULL booleans, unknown delay ≠ 0, corrupt rows fail loudly | The anti-corruption layer is pure (row literal → entity). No DB needed, so it's a unit test, but it lives in the adapter that owns the knowledge. |
| `adapters/driven/postgres/src/sql.unit.test.ts` (6) | `WhereBuilder` numbers placeholders and **keeps values out of the SQL text** (an injection payload stays in `params`), placeholder reuse, LIKE escaping | Guards the SQL-injection rule at the level where it is implemented. |
| `adapters/driven/in-memory/src/in-memory-repositories.unit.test.ts` (21) | The **repository contract** (19) + seed determinism and sanity (2) | The adapter does no I/O, so it runs at unit speed. It's the always-on half of the contract. |
| `packages/fake-kafka/src/fake-kafka.unit.test.ts` (6) | Offsets, **asynchronous delivery**, fan-out, unsubscribe, failing handler isolated | Other tests rely on this stand-in, so its semantics must be pinned down. |
| `packages/bootstrap/src/config.unit.test.ts` (6) | Safe defaults (loopback host), **no default secret**, memory mode needs no DB config, invalid values rejected, recipient parsing | Config is a pure function `env → AppConfig`. A bad default is a security issue. |

### 5.2 Integration tests (62) – the middle

Each one tests **one adapter against its real technology**, with the hexagon replaced by stubs
(driving side) or verified through the contract (driven side).

| File | Technology really exercised | What it pins down | Why here |
|---|---|---|---|
| `adapters/driven/postgres/src/postgres-repositories.int.test.ts` (23) | **PostgreSQL** (`usflights`) | The repository contract (19) on real data. Specifics: `findDelayed().total` equals a hand-written `count(*)`, an **SQL injection attempt** returns 0 rows and the table survives, real rows map without errors, a stricter policy changes SQL results | Only a real DB proves the SQL is right. **Read-only**, so it's safe on the shared DB. **Skipped** without `PGPASSWORD`. |
| `adapters/driving/http-rest/src/http-rest.int.test.ts` (9) | **Fastify** via `app.inject()`: routing, JSON-schema coercion, serialization | HTTP → port translation (`dest` → `destination`, `minDelay` → `minDelayMinutes`, `"5"` → `5`), `NotFoundError` → 404 and `ValidationError` → 400 as problem+json, transport-level 400 never reaches the use case, **500 hides internal details**, unknown route → 404 | The adapter's job is translation and error mapping. Driving ports are stubbed, so no business logic runs. `inject()` avoids opening sockets. |
| `adapters/driving/cli/src/cli.int.test.ts` (10) | `node:util.parseArgs`, output formatting | Table and `--json` output, exit codes `0` / `2` (usage, validation) / `3` (not found), unknown flags | Same as HTTP, different protocol: argv in, exit codes out. **This test found a real bug:** an unknown flag crashed the CLI instead of returning exit code 2. |
| `adapters/driving/kafka-consumer/src/kafka-consumer.int.test.ts` (6) | The in-process **broker** (async delivery) | The external message contract is translated into the command. Malformed JSON, missing fields and domain errors go to the **DLQ as non-retryable**, infrastructure errors are flagged **retryable**, the original payload is preserved, `stop()` works | Messaging semantics (DLQ, retryability) are the consumer's responsibility, not the use case's. |
| `adapters/driven/kafka-producer/src/kafka-producer.int.test.ts` (4) | The **broker** | Topic routing, partition key (`DL1234`, which keeps per-flight ordering), headers, JSON payload | Transport decisions the hexagon deliberately delegates. |
| `adapters/driven/redis-cache/src/redis-cache.int.test.ts` (6) | Cache + `ClockPort` | JSON round-trip, **stored copy is isolated from later mutation**, TTL expiry exactly at the boundary (no `sleep`), per-entry TTL | TTL logic is classic flaky-test material. The injected clock makes it deterministic. |
| `adapters/driven/notification/src/notification.int.test.ts` (1) | Simulated gateway | Outbox and per-channel logging | A minimal check that the simulation behaves like a gateway. |
| `packages/bootstrap/src/container.int.test.ts` (3) | **Real wiring** of the hexagon + all simulated adapters | Every driving port is exposed, queries work through the in-memory adapter, the event-driven command crosses the real fake-Kafka producer | Catches **wiring mistakes** (a port connected to the wrong adapter) that unit tests with doubles cannot see, without starting a process. |

### 5.3 End-to-end tests (14) – the tip

**Black box**: they import nothing from the code under test. They start the real entry point with
`node apps/.../main.ts` and observe it from outside, like a user, a client or a shell script.

| File | What it does | Why only these |
|---|---|---|
| `apps/api/src/api.e2e.test.ts` (9) | Starts the API with `HTTP_PORT=0` (the OS picks a free port, and the test reads the bound address from the logs), then over **real HTTP**: health, airports, delay stats, delayed flights, ranking, problem+json errors, **the full async journey** (POST → topic → consumer → use case → producer → `flight-delays`, polled), and **graceful shutdown on SIGTERM with exit code 0**. An extra suite runs one smoke test against **PostgreSQL** when `PGPASSWORD` is set. | One test per critical journey, not per rule. Rules are already covered below. Runs on in-memory persistence, so it is **hermetic**. |
| `apps/cli/src/cli.e2e.test.ts` (5) | Spawns the real CLI: JSON output, table output, exit code 3, usage exit code 2, and **fail-fast with a clear message when PostgreSQL is selected without a password** (exit 1) | Verifies what only a real process can show: env handling, stdout vs stderr, exit codes. |

---

## 6. Running the tests

```bash
npm test                  # unit + integration – the everyday command (~0.5 s)
npm run test:unit         # only the base of the pyramid (no DB, no processes)
npm run test:integration  # adapters against their technology
npm run test:e2e          # spawns the real API / CLI processes
npm run test:all          # unit → integration → e2e, stopping at the first failing level
npm run test:watch        # unit tests in watch mode
npm run test:coverage     # unit + integration with a coverage report
npm run typecheck         # tests are type-checked like production code
```

PostgreSQL-backed tests read the standard `PG*` variables (loaded from `.env` by the npm
scripts). Without `PGPASSWORD` they are **skipped with an explicit reason**, so the suite stays
green on a machine without the database:

```
﹣ Repository contract – postgres # PGPASSWORD not set – PostgreSQL tests skipped
```

To run a single file: `node --test packages/domain/src/policies/delay-policy.unit.test.ts`.

---

## 7. Coverage

`npm run test:coverage` (unit + integration, test code and the testing kit excluded):

| Area | Lines | Branches |
|---|---:|---:|
| **All files** | **96.7 %** | **91.9 %** |
| Domain + application services | 100 % | 92–100 % |
| Postgres adapter | 100 % | 69–91 % |
| CLI adapter | 71 % | 76 % |

How to read it:

- **The hexagon is at 100 % lines.** The business rules are fully pinned down by fast tests.
- The **CLI adapter is lower on purpose**. The integration test covers parsing, formatting and
  exit codes once. Repeating every command there would only re-test the use cases. The remaining
  commands are exercised by the E2E test, which is not part of the coverage run.
- Coverage is a *smell detector*, not a goal. A 100 % covered use case with no assertions on the
  ports it calls would still be untested.

---

## 8. Deliberately not tested

| What | Why |
|---|---|
| `adapters/driven/platform` (`SystemClock`, `PinoLoggerAdapter`) | One-line delegations to `Date`/pino. A test would only re-state the implementation. They are exercised by every E2E run. |
| `apps/*/src/main.ts` as units | Pure plumbing. Covered by the E2E tests, which start these exact files. |
| `apps/api/src/flight-status-feed.simulator.ts` as a unit | It *is* test tooling (it plays the outside world). Exercised by the async E2E journey. |
| Writes to PostgreSQL | The application has no write side on the DB, and the integration tests are read-only on purpose (shared training DB). |

---

## 9. Next steps (suggested exercises)

1. **Architecture fitness tests.** Add a test that fails when `packages/domain` or
   `packages/application` imports anything outside their allowed dependencies
   (e.g. dependency-cruiser), so the hexagon's boundary is enforced by CI.
2. **Testcontainers.** Start a throw-away PostgreSQL with the `db/` scripts, so the integration
   level is hermetic and never skipped.
3. **Property-based tests** (e.g. fast-check) for `PunctualityReport` and `Delay`: for any input,
   `onTime + delayed + cancelled + diverted ≤ total`.
4. **Consumer-driven contract** for the `flight-status` Kafka message (e.g. Pact), shared with the
   (imaginary) airline team.
