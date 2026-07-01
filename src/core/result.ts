import { UnwrapError } from "@/core/errors.js";
import type { Option as OptionType } from "@/core/option.js";
import { Option } from "@/core/option.js";

const EMPTY_ITERATOR: IterableIterator<never> = Object.freeze({
  next: (): IteratorResult<never> => ({ done: true, value: undefined }),
  [Symbol.iterator](): IterableIterator<never> {
    return this;
  },
});

function isResult(value: unknown): value is Result<unknown, unknown> {
  if (value instanceof Result) {
    return true;
  }
  return (
    typeof value === "object" &&
    value !== null &&
    "tag" in value &&
    "unwrap" in value &&
    "unwrapErr" in value &&
    ((value as { tag: unknown }).tag === "Ok" ||
      (value as { tag: unknown }).tag === "Err")
  );
}

/**
 * Safely stringifies a value for use in an error message.
 * Falls back to String() when JSON.stringify returns undefined or throws
 * (e.g. undefined, functions, symbols, BigInt, or circular references).
 */
function safeStringify(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    if (serialized !== undefined) {
      return serialized;
    }
  } catch {
    // fall through to the fallback below
  }

  try {
    return String(value);
  } catch {
    return "[unable to serialize error value]";
  }
}

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
   * Returns true if the result is Ok and the predicate returns true.
   *
   * This is a type guard that narrows the type to Ok<T, E> when true.
   *
   * @param predicate - Predicate applied to the Ok value
   * @returns True if Ok and predicate returns true, otherwise false
   *
   * @example
   * ```typescript
   * const result: Result<number, string> = Result.ok(42);
   *
   * if (result.isOkAnd((v) => v > 0)) {
   *   console.log(result.unwrap()); // 42
   * }
   * ```
   */
  abstract isOkAnd(predicate: (value: T) => boolean): this is Ok<T, E>;

  /**
   * Returns true if the result is Err and the predicate returns true.
   *
   * This is a type guard that narrows the type to Err<T, E> when true.
   *
   * @param predicate - Predicate applied to the Err value
   * @returns True if Err and predicate returns true, otherwise false
   *
   * @example
   * ```typescript
   * const result: Result<number, string> = Result.err("error");
   *
   * if (result.isErrAnd((e) => e.length > 0)) {
   *   console.log(result.unwrapErr()); // "error"
   * }
   * ```
   */
  abstract isErrAnd(predicate: (error: E) => boolean): this is Err<T, E>;

  /**
   * Returns true if this result equals the other result by comparing
   * both the variant (Ok/Err) and the contained value using strict equality.
   */
  equals(other: Result<T, E>): boolean {
    if (this.isOk()) {
      return other.isOk() && this.unwrap() === other.unwrap();
    }
    return other.isErr() && this.unwrapErr() === other.unwrapErr();
  }

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
   * Implements the iterable protocol.
   * Ok yields its contained value once; Err yields nothing.
   *
   * Subclasses may override this for a more efficient implementation,
   * but the default implementation inherited from this base class is
   * sufficient for correctness.
   */
  *[Symbol.iterator](): IterableIterator<T> {
    if (this.isOk()) {
      yield this.unwrap();
    }
  }

  /**
   * Returns the contained Err value.
   * Throws an UnwrapError if the value is Ok.
   */
  abstract unwrapErr(): E;

  /**
   * Returns the contained Err value with a custom error message.
   * Throws an UnwrapError with the provided message if the value is Ok.
   *
   * @param message - Message to display on error
   * @returns Err value if Err
   *
   * @example
   * ```typescript
   * const err = Result.err<number, string>("error message");
   * console.log(err.expectErr("should be err")); // "error message"
   *
   * const ok = Result.ok<number, string>(42);
   * // ok.expectErr("should be err"); // UnwrapError: should be err
   * ```
   */
  abstract expectErr(message: string): E;

  /**
   * Returns the contained Ok value or a provided default.
   */
  abstract unwrapOr<U>(defaultValue: U): T | U;

  /**
   * Returns the contained Ok value or computes it from a function.
   */
  abstract unwrapOrElse<U>(fn: (error: E) => U): T | U;

  /**
   * Maps a Result<T, E> to Result<U, E> by applying a function to a contained Ok value.
   */
  abstract map<U>(fn: (value: T) => U): Result<U, E>;

  /**
   * Maps the Ok value to U by applying a function, or returns the provided default if Err.
   *
   * @template U - The type of the mapped value
   * @param defaultValue - Value to return if Err
   * @param fn - Function to map the Ok value
   * @returns Mapped value if Ok, otherwise defaultValue
   *
   * @example
   * ```typescript
   * const ok = Result.ok<number, string>(21);
   * console.log(ok.mapOr(0, (n) => n * 2)); // 42
   *
   * const err = Result.err<number, string>("error");
   * console.log(err.mapOr(0, (n) => n * 2)); // 0
   * ```
   */
  abstract mapOr<U>(defaultValue: U, fn: (value: T) => U): U;

  /**
   * Maps the Ok value to U by applying a function, or computes a default value from the Err.
   *
   * @template U - The type of the mapped value
   * @param defaultFn - Function to compute the default value from the Err value
   * @param fn - Function to map the Ok value
   * @returns Mapped value if Ok, otherwise the result of defaultFn
   *
   * @example
   * ```typescript
   * const ok = Result.ok<number, string>(21);
   * console.log(ok.mapOrElse((e) => e.length, (n) => n * 2)); // 42
   *
   * const err = Result.err<number, string>("error");
   * console.log(err.mapOrElse((e) => e.length, (n) => n * 2)); // 5
   * ```
   */
  abstract mapOrElse<U>(defaultFn: (error: E) => U, fn: (value: T) => U): U;

  /**
   * Pattern matches over the Result, applying one of two functions depending on the variant.
   *
   * @template U - The type of the returned value
   * @param onOk - Function applied to the Ok value
   * @param onErr - Function applied to the Err value
   * @returns The result of applying the appropriate function
   *
   * @example
   * ```typescript
   * const ok = Result.ok<number, string>(42);
   * console.log(ok.match((v) => v * 2, (e) => e.length)); // 84
   *
   * const err = Result.err<number, string>("error");
   * console.log(err.match((v) => v * 2, (e) => e.length)); // 5
   * ```
   */
  match<U>(onOk: (value: T) => U, onErr: (error: E) => U): U {
    return this.mapOrElse(onErr, onOk);
  }

  /**
   * Maps a Result<T, E> to Result<T, F> by applying a function to a contained Err value.
   */
  abstract mapErr<F>(fn: (error: E) => F): Result<T, F>;

  /**
   * Calls a function with the Ok value (if Ok), then returns self unchanged.
   *
   * @param fn - Function to call with the Ok value
   * @returns Self, unchanged
   *
   * @example
   * ```typescript
   * const result = Result.ok(42)
   *   .inspect((v) => console.log("ok:", v))
   *   .map((v) => v + 1);
   *
   * console.log(result.unwrap()); // 43
   * ```
   */
  abstract inspect(fn: (value: T) => void): this;

  /**
   * Calls a function with the Err value (if Err), then returns self unchanged.
   *
   * @param fn - Function to call with the Err value
   * @returns Self, unchanged
   *
   * @example
   * ```typescript
   * const result = Result.err<number, string>("error")
   *   .inspectErr((e) => console.error("err:", e))
   *   .unwrapOr(0);
   *
   * console.log(result); // 0
   * ```
   */
  abstract inspectErr(fn: (error: E) => void): this;

  /**
   * Calls a function with self regardless of whether the result is Ok or Err,
   * then returns self unchanged.
   *
   * @param fn - Function to call with the Result
   * @returns Self, unchanged
   *
   * @example
   * ```typescript
   * const result = Result.ok<number, string>(42)
   *   .tap((r) => console.log("result:", r.tag))
   *   .map((v) => v + 1);
   *
   * console.log(result.unwrap()); // 43
   * ```
   */
  tap(fn: (result: Result<T, E>) => void): this {
    fn(this);
    return this;
  }

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
   * Maps a Result<T, E> to Result<U, E> by applying an async function to a contained Ok value.
   */
  abstract mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Result<U, E>>;

  /**
   * Calls an async function if the result is Ok, otherwise returns the Err value of self.
   */
  abstract andThenAsync<U>(
    fn: (value: T) => Promise<Result<U, E>>,
  ): Promise<Result<U, E>>;

  /**
   * Calls an async function if the result is Err, otherwise returns the Ok value of self.
   */
  abstract orElseAsync<F>(
    fn: (error: E) => Promise<Result<T, F>>,
  ): Promise<Result<T, F>>;

  /**
   * Transposes a Result of an Option into an Option of a Result.
   */
  transpose<U>(this: Result<OptionType<U>, E>): OptionType<Result<U, E>> {
    if (this.isOk()) {
      return this.unwrap().map((value) => Result.ok<U, E>(value));
    }
    return Option.some(this as unknown as Result<U, E>);
  }

  /**
   * Flattens one level of nesting in a Result.
   */
  flatten<U>(this: Result<Result<U, E>, E>): Result<U, E> {
    if (this.isOk()) {
      return this.unwrap();
    }
    return this as unknown as Result<U, E>;
  }

  /**
   * Converts from Result<T, E> to Option<T>.
   * Converts self into an Option<T>, discarding the error, if any.
   */
  abstract toOption(): OptionType<T>;

  /**
   * Converts from Result<T, E> to Option<E>.
   * Converts self into an Option<E>, discarding the Ok value, if any.
   *
   * @returns Some(error) if Err, otherwise None
   *
   * @example
   * ```typescript
   * const err = Result.err<number, string>("error");
   * console.log(err.err().unwrap()); // "error"
   *
   * const ok = Result.ok<number, string>(42);
   * console.log(ok.err().isNone()); // true
   * ```
   */
  abstract err(): OptionType<E>;

  /**
   * Returns true if the result equals another result by value.
   * Both results must be the same variant (`Ok`/`Err`) and contain strictly
   * equal (`===`) values. Returns false for non-Result arguments.
   *
   * @param other - Result to compare with
   * @returns true if both results are equal, otherwise false
   *
   * @example
   * ```typescript
   * const ok1 = Result.ok(42);
   * const ok2 = Result.ok(42);
   * console.log(ok1.equals(ok2)); // true
   *
   * const err = Result.err<number, string>("error");
   * console.log(ok1.equals(err)); // false
   * ```
   */
  equals<U, F>(other: Result<U, F>): boolean {
    if (!isResult(other)) {
      return false;
    }
    if (this.tag === "Ok" && other.tag === "Ok") {
      return (this.unwrap() as unknown) === other.unwrap();
    }
    if (this.tag === "Err" && other.tag === "Err") {
      return (this.unwrapErr() as unknown) === other.unwrapErr();
    }
    return false;
  }

  /**
   * Creates an Err variant containing the given error.
   */
  static err<T = never, E = unknown>(error: E): Result<T, E> {
    return new Err<T, E>(error);
  }

  /**
   * Creates an Ok variant containing the given value.
   */
  static ok<T, E = never>(value: T): Result<T, E> {
    return new Ok<T, E>(value);
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

  /**
   * Converts a Promise to a Promise<Result>.
   * Returns Ok if the Promise resolves successfully, otherwise returns Err with the caught error.
   */
  static fromPromise<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
    return Result.tryAsync<T, E>(() => promise);
  }

  /**
   * Combines multiple Results into a single Result.
   * Returns Ok containing an array of all values if all Results are Ok.
   * Returns the first Err if any Result is Err.
   * Returns Ok([]) for an empty array.
   */
  static all<T, E>(results: readonly Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];

    for (const r of results) {
      if (r.isErr()) {
        // 型パラメータ T は配列版 (T[]) に変わるが、Err インスタンス自体はそのまま再利用して問題ない
        return r as unknown as Result<T[], E>;
      }
      values.push(r.unwrap());
    }

    return Result.ok<T[], E>(values);
  }

  /**
   * Returns the first Ok result from an array of Results.
   * If all Results are Err, returns Err containing an array of all errors.
   * Returns Err([]) for an empty array.
   */
  static any<T, E>(results: readonly Result<T, E>[]): Result<T, E[]> {
    const errors: E[] = [];

    for (const r of results) {
      if (r.isOk()) {
        // 型パラメータ E は配列版 (E[]) に変わるが、Ok インスタンス自体はそのまま再利用して問題ない
        return r as unknown as Result<T, E[]>;
      }
      // r は Err 側なので、unwrapOrElse のコールバックから error を取り出して蓄積する
      // 戻り値 T は使わないため、適当な値を返している
      r.unwrapOrElse((e) => {
        errors.push(e);
        return undefined as never;
      });
    }

    return Result.err<T, E[]>(errors);
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

  isOkAnd(predicate: (value: T) => boolean): this is Ok<T, E> {
    return predicate(this.value);
  }

  isErrAnd(_predicate: (error: E) => boolean): this is Err<T, E> {
    return false;
  }

  unwrap(): T {
    return this.value;
  }

  expect(_message: string): T {
    return this.value;
  }

  *[Symbol.iterator](): IterableIterator<T> {
    yield this.value;
  }

  unwrapErr(): never {
    throw new UnwrapError("Called unwrapErr on an Ok value");
  }

  expectErr(message: string): never {
    throw new UnwrapError(message);
  }

  unwrapOr<U>(_defaultValue: U): T {
    return this.value;
  }

  unwrapOrElse<U>(_fn: (error: E) => U): T {
    return this.value;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  mapOr<U>(_defaultValue: U, fn: (value: T) => U): U {
    return fn(this.value);
  }

  mapOrElse<U>(_defaultFn: (error: E) => U, fn: (value: T) => U): U {
    return fn(this.value);
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  inspect(fn: (value: T) => void): this {
    fn(this.value);
    return this;
  }

  inspectErr(_fn: (error: E) => void): this {
    return this;
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

  async mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Result<U, E>> {
    return new Ok(await fn(this.value));
  }

  async andThenAsync<U>(
    fn: (value: T) => Promise<Result<U, E>>,
  ): Promise<Result<U, E>> {
    return fn(this.value);
  }

  async orElseAsync<F>(
    _fn: (error: E) => Promise<Result<T, F>>,
  ): Promise<Result<T, F>> {
    return this as unknown as Result<T, F>;
  }

  toOption(): OptionType<T> {
    return Option.some(this.value);
  }

  err(): OptionType<E> {
    return Option.none<E>();
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

  isOkAnd(_predicate: (value: T) => boolean): this is Ok<T, E> {
    return false;
  }

  isErrAnd(predicate: (error: E) => boolean): this is Err<T, E> {
    return predicate(this.error);
  }

  unwrap(): never {
    throw new UnwrapError(
      `Called unwrap on an Err value: ${safeStringify(this.error)}`,
    );
  }

  expect(message: string): never {
    throw new UnwrapError(message);
  }

  unwrapErr(): E {
    return this.error;
  }

  expectErr(_message: string): E {
    return this.error;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return EMPTY_ITERATOR as IterableIterator<T>;
  }

  unwrapOr<U>(defaultValue: U): T | U {
    return defaultValue;
  }

  unwrapOrElse<U>(fn: (error: E) => U): T | U {
    return fn(this.error);
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  mapOr<U>(defaultValue: U, _fn: (value: T) => U): U {
    return defaultValue;
  }

  mapOrElse<U>(defaultFn: (error: E) => U, _fn: (value: T) => U): U {
    return defaultFn(this.error);
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  inspect(_fn: (value: T) => void): this {
    return this;
  }

  inspectErr(fn: (error: E) => void): this {
    fn(this.error);
    return this;
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

  async mapAsync<U>(_fn: (value: T) => Promise<U>): Promise<Result<U, E>> {
    return this as unknown as Result<U, E>;
  }

  async andThenAsync<U>(
    _fn: (value: T) => Promise<Result<U, E>>,
  ): Promise<Result<U, E>> {
    return this as unknown as Result<U, E>;
  }

  async orElseAsync<F>(
    fn: (error: E) => Promise<Result<T, F>>,
  ): Promise<Result<T, F>> {
    return fn(this.error);
  }

  toOption(): OptionType<T> {
    return Option.none<T>();
  }

  err(): OptionType<E> {
    return Option.some(this.error);
  }
}
