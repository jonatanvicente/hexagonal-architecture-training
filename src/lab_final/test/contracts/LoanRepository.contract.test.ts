import { SqliteLoanRepository } from "../../src/adapters/out/persistence/SqliteLoanRepository";
import { FakeLoanRepository } from "../fakes/FakeLoanRepository";
import { loanRepositoryContract } from "./loanRepositoryContract";

loanRepositoryContract("Fake", () => new FakeLoanRepository());
loanRepositoryContract("SQLite", () => new SqliteLoanRepository(":memory:"));
