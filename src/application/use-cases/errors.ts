export class MemberNotFoundError extends Error {
  constructor(id: string) {
    super(`Member not found: ${id}`);
    this.name = 'MemberNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}