import { UnwrapError } from "@/core/errors.js";
import type { Option as OptionType } from "@/core/option.js";
import { Option } from "@/core/option.js";

/**
 * Abstract base class for Result<T, E>
 * Represents a value that is either a success (Ok) or a failure (Err).
 */
export abstract class Result<T, E> {
  abstract readonly tag: "Ok" | "Err";

  /**
   * Returns true if the result is Ok.
   * This is a type guard that narrows the type to Ok<T, E>.
   */
  abstract isOk(): this is Ok<T, E>;

  /**
   * Returns true if the result is Err.
   * This is a type guard that narrows the type to Err<T, E>.
   */
  abstract isErr(): this is Err<T, E>;

  /**
   * Returns the contained Ok value.
   * Throws an UnwrapError if the value is Err.
   */
  abstract unwrap(): T;

  /**
   * Returns the contained Ok value with a custom error message.
   * Throws an UnwrapError with the provided message if the value is Err.
   */
  abstract expect(message: string): T;

  /**
   * Returns the contained Ok value or a provided default.
   */
  abstract unwrapOr(defaultValue: T): T;

  /**
   * Returns the contained Ok value or computes it from a function.
   */
  abstract unwrapOrElse(fn: (error: E) => T): T;

  /**
   * Maps a Result<T, E> to Result<U, E> by applying a function to a contained Ok value.
   */
  abstract map<U>(fn: (value: T) => U): Result<U, E>;

  /**
   * Maps a Result<T, E> to Result<T, F> by applying a function to a contained Err value.
   */
  abstract mapErr<F>(fn: (error: E) => F): Result<T, F>;

  /**
   * Returns the argument if the result is Ok, otherwise returns the Err value of self.
   */
  abstract and<U>(other: Result<U, E>): Result<U, E>;

  /**
   * Returns the result if it is Ok, otherwise returns the passed result.
   */
  abstract or<F>(other: Result<T, F>): Result<T, F>;

  /**
   * Calls fn if the result is Ok, otherwise returns the Err value of self.
   */
  abstract andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;

  /**
   * Calls fn if the result is Err, otherwise returns the Ok value of self.
   */
  abstract orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F>;

  /**
   * Converts from Result<T, E> to Option<T>.
   * Converts self into an Option<T>, discarding the error, if any.
   */
  abstract toOption(): OptionType<T>;

  /**
   * Creates an Ok variant containing the given value.
   */
  static ok<T, E = never>(value: T): Result<T, E> {
    return new Ok<T, E>(value);
  }

  /**
   * Creates an Err variant containing the given error.
   */
  static err<T = never, E = unknown>(error: E): Result<T, E> {
    return new Err<T, E>(error);
  }

  /**
   * Converts a nullable value to a Result.
   * Returns Err if the value is null or undefined, otherwise returns Ok(value).
   */
  static fromNullable<T, E>(
    value: T | null | undefined,
    error: E,
  ): Result<T, E> {
    if (value === null || value === undefined) {
      return Result.err<T, E>(error);
    }
    return Result.ok<T, E>(value);
  }

  /**
   * Executes a function that may throw an exception and converts it to a Result.
   * Returns Ok if the function executes successfully, otherwise returns Err with the caught error.
   */
  static try<T, E = Error>(fn: () => T): Result<T, E> {
    try {
      return Result.ok<T, E>(fn());
    } catch (error) {
      return Result.err<T, E>(error as E);
    }
  }

  /**
   * Executes an async function that may throw an exception and converts it to a Promise<Result>.
   * Returns Ok if the function resolves successfully, otherwise returns Err with the caught error.
   */
  static async tryAsync<T, E = Error>(
    fn: () => Promise<T>,
  ): Promise<Result<T, E>> {
    try {
      const value = await fn();
      return Result.ok<T, E>(value);
    } catch (error) {
      return Result.err<T, E>(error as E);
    }
  }
}

/**
 * Ok variant of Result<T, E> - contains a success value
 */
export class Ok<T, E = never> extends Result<T, E> {
  readonly tag = "Ok" as const;
  private readonly value: T;

  constructor(value: T) {
    super();
    this.value = value;
  }

  isOk(): this is Ok<T, E> {
    return true;
  }

  isErr(): this is Err<T, E> {
    return false;
  }

  unwrap(): T {
    return this.value;
  }

  expect(_message: string): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  unwrapOrElse(_fn: (error: E) => T): T {
    return this.value;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  and<U>(other: Result<U, E>): Result<U, E> {
    return other;
  }

  or<F>(_other: Result<T, F>): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  orElse<F>(_fn: (error: E) => Result<T, F>): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  toOption(): OptionType<T> {
    return Option.some(this.value);
  }
}

/**
 * Err variant of Result<T, E> - contains an error value
 */
export class Err<T = never, E = unknown> extends Result<T, E> {
  readonly tag = "Err" as const;
  private readonly error: E;

  constructor(error: E) {
    super();
    this.error = error;
  }

  isOk(): this is Ok<T, E> {
    return false;
  }

  isErr(): this is Err<T, E> {
    return true;
  }

  unwrap(): never {
    throw new UnwrapError(
      `Called unwrap on an Err value: ${JSON.stringify(this.error)}`,
    );
  }

  expect(message: string): never {
    throw new UnwrapError(message);
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  unwrapOrElse(fn: (error: E) => T): T {
    return fn(this.error);
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  and<U>(_other: Result<U, E>): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  or<F>(other: Result<T, F>): Result<T, F> {
    return other;
  }

  andThen<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F> {
    return fn(this.error);
  }

  toOption(): OptionType<T> {
    return Option.none<T>();
  }
}
