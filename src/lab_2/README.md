# Library Loans (hexagon v1)

A small library app that lets members borrow books.
This is the solution of Lab 1 and the starting point of Lab 2.

## Requirements

- Node.js 22 or later

## Setup

```bash
npm install
git init && git add . && git commit -m "Start Lab 2"
```

## Commands

```bash
npm start           # run the demo
npm test            # run the tests
npm run typecheck   # check types
```

## Structure

```
src/
  core/       business logic and the interfaces it needs
  adapters/   technical details (web, database, notifications)
  main.ts     creates the objects and wires them together
test/         tests
```
