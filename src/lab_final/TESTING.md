# Testing strategy (result of Lab 3)

## Test pyramid

```
            /\
           /E2E\          3 tests   (test/e2e)       the wiring: HTTP + core + SQLite
          /------\
         /  Integ \       10 tests  (test/adapters,  the technical details:
        / +contract\                 test/contracts)  SQLite adapter, port contracts
       /------------\
      /     Unit     \    21 tests  (test/domain,    the business rules
     /                \              test/application)
    --------------------
```

All tests run locally, with no external services: SQLite runs in memory and the
HTTP server listens on a random free port (port 0).

## Findings

- **Test doubles:** stubs and fakes check outcomes; the mock is used only for the
  notifier, where the interaction is the behavior.
- **Fake bug:** the contract tests found that `FakeLoanRepository` returned closed
  loans. Fixed.
- **Shared database:** the SQLite tests shared one database and depended on their
  order. Fixed with a fresh `:memory:` database in `beforeEach`.
- **Dual write:** if the notification fails, the loan is still saved
  (see `test/application/doubles.test.ts`). To be solved with the Transactional
  Outbox pattern.
- **Security:** the API key is checked in the HTTP adapter, not in the core.
