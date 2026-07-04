/**
 * Error thrown when unwrapping a None value or the wrong Result variant.
 */
export class UnwrapError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UnwrapError";
    Object.setPrototypeOf(this, UnwrapError.prototype);
  }
}
