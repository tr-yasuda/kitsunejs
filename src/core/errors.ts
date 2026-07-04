/**
 * Error thrown by `unwrap`, `expect`, `unwrapErr`, and `expectErr` when a
 * container does not hold the requested variant. The optional `cause` option
 * may contain the value that caused the failure.
 */
export class UnwrapError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UnwrapError";
    Object.setPrototypeOf(this, UnwrapError.prototype);
  }
}
