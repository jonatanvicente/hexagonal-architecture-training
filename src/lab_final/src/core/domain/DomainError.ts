export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidValueError extends DomainError {}

export class LoanNotAllowedError extends DomainError {}

export class LoanAlreadyClosedError extends DomainError {}
