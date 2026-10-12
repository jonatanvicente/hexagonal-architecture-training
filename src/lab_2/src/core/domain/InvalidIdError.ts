export class InvalidIdError extends Error {
  constructor(kind: string, value: string, expectedFormat: string) {
    super(`Invalid ${kind} "${value}": expected format ${expectedFormat}`);
    this.name = "InvalidIdError";
  }
}
