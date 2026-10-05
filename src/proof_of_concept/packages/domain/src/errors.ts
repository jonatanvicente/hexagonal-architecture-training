// HEXAGON: inside – domain
// Domain errors carry a stable `code`. Driving adapters translate them into their own protocol
// (HTTP status, CLI exit code, DLQ...). The domain never knows about HTTP.

export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} '${id}' not found`);
  }
}
