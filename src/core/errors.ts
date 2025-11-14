/**
 * Error thrown when unwrapping a None value
 */
export class UnwrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnwrapError";
    Object.setPrototypeOf(this, UnwrapError.prototype);
  }
}
