import { UnwrapError } from "./errors.js";
import type { Option as OptionType } from "./option.js";
import { Option } from "./option.js";

const MAX_FINALLY_UNWIND_ATTEMPTS = 64;

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
  try {
    return (
      typeof value === "object" &&
      value !== null &&
      "tag" in value &&
      "unwrap" in value &&
      "unwrapErr" in value &&
      typeof (value as { unwrap: unknown }).unwrap === "function" &&
      typeof (value as { unwrapErr: unknown }).unwrapErr === "function" &&
      ((value as { tag: unknown }).tag === "Ok" ||
        (value as { tag: unknown }).tag === "Err")
    );
  } catch {
    return false;
  }
}

type ResultValue<R> = R extends Result<infer T, infer _E> ? T : never;
type ResultError<R> = R extends Result<infer _T, infer E> ? E : never;
type AllValues<R extends readonly unknown[]> = {
  -readonly [K in keyof R]: ResultValue<R[K]>;
};

const MAX_STRINGIFY_LENGTH = 512;
const MAX_STRINGIFY_DEPTH = 4;
const MAX_STRINGIFY_ARRAY_LENGTH = 50;
const MAX_STRINGIFY_STRING_LENGTH = 200;

function truncateString(
  value: string,
  maxLength = MAX_STRINGIFY_LENGTH,
): string {
  if (value.length <= maxLength) {
    return value;
  }

  const suffix = "...";
  const limit = maxLength - suffix.length;
  let result = "";
  let count = 0;

  for (const codePoint of value) {
    if (count >= limit) {
      break;
    }
    result += codePoint;
    count++;
  }

  return `${result}${suffix}`;
}

function isErrorLike(value: unknown): value is Error {
  return Object.prototype.toString.call(value) === "[object Error]";
}

function createBudgetReplacer(
  maxDepth: number,
  maxArrayLength: number,
  maxStringLength: number,
): (_key: string, value: unknown) => unknown {
  const depthMap = new WeakMap<object, number>();

  return function replacer(
    this: unknown,
    _key: string,
    value: unknown,
  ): unknown {
    if (typeof value === "function") {
      return "[Function]";
    }
    if (typeof value === "bigint") {
      return "[BigInt]";
    }
    if (typeof value === "string" && value.length > maxStringLength) {
      return truncateString(value, maxStringLength);
    }
    if (Array.isArray(value) && value.length > maxArrayLength) {
      return value.slice(0, maxArrayLength).concat(["..."]);
    }
    if (value !== null && typeof value === "object") {
      const parent =
        this !== null && typeof this === "object"
          ? (this as object)
          : undefined;
      const parentDepth =
        parent === undefined ? 0 : (depthMap.get(parent) ?? 0);
      const currentDepth = parent === undefined ? 0 : parentDepth + 1;
      depthMap.set(value, currentDepth);
      if (currentDepth > maxDepth) {
        return "[...]";
      }
    }
    return value;
  };
}

const budgetReplacer = createBudgetReplacer(
  MAX_STRINGIFY_DEPTH,
  MAX_STRINGIFY_ARRAY_LENGTH,
  MAX_STRINGIFY_STRING_LENGTH,
);

/**
 * Bounds error messages even when the thrown value contains large or circular
 * data. Falls back to String(value) when JSON produces no usable text.
 */
function safeStringify(
  value: unknown,
  maxLength = MAX_STRINGIFY_LENGTH,
): string {
  if (typeof value === "function") {
    return truncateString("[Function]", maxLength);
  }

  let serialized: string | undefined;

  try {
    if (isErrorLike(value)) {
      const error = value as Error & Record<string, unknown>;
      const errorMessage = String(error);
      const enumerableKeys = Object.keys(error);
      if (enumerableKeys.length === 0) {
        serialized = errorMessage;
      } else {
        const props: Record<string, unknown> = {};
        for (const key of enumerableKeys) {
          props[key] = error[key];
        }
        try {
          serialized = `${errorMessage} ${JSON.stringify(props, budgetReplacer)}`;
        } catch {
          serialized = errorMessage;
        }
      }
    } else {
      serialized = JSON.stringify(value, budgetReplacer);
    }
  } catch {
    serialized = undefined;
  }

  if (serialized !== undefined) {
    return truncateString(serialized, maxLength);
  }

  try {
    return truncateString(String(value), maxLength);
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
   */
  abstract isOkAnd(predicate: (value: T) => boolean): this is Ok<T, E>;

  /**
   * Returns true if the result is Err and the predicate returns true.
   *
   * This is a type guard that narrows the type to Err<T, E> when true.
   */
  abstract isErrAnd(predicate: (error: E) => boolean): this is Err<T, E>;

  /**
   * Returns the contained Ok value.
   * Throws an UnwrapError if the value is Err. The thrown error may include
   * an optional `cause` property containing the Err value.
   */
  abstract unwrap(): T;

  /**
   * Returns the contained Ok value with a custom error message.
   * Throws an UnwrapError with the provided message if the value is Err. The
   * thrown error may include an optional `cause` property containing the Err value.
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
   * Throws an UnwrapError if the value is Ok. The thrown error may include an
   * optional `cause` property containing the Ok value.
   */
  abstract unwrapErr(): E;

  /**
   * Returns the contained Err value with a custom error message.
   * Throws an UnwrapError with the provided message if the value is Ok. The
   * thrown error may include an optional `cause` property containing the Ok value.
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
   */
  abstract mapOr<U>(defaultValue: U, fn: (value: T) => U): U;

  /**
   * Maps the Ok value to U by applying a function, or computes a default value from the Err.
   */
  abstract mapOrElse<U>(defaultFn: (error: E) => U, fn: (value: T) => U): U;

  /**
   * Pattern matches over the Result, applying one of two functions depending on the variant.
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
   */
  inspect(fn: (value: T) => void): this {
    if (this.isOk()) {
      fn(this.unwrap());
    }
    return this;
  }

  /**
   * Calls a function with the Err value (if Err), then returns self unchanged.
   */
  inspectErr(fn: (error: E) => void): this {
    if (this.isErr()) {
      fn(this.unwrapErr());
    }
    return this;
  }

  /**
   * Calls a function with self regardless of whether the result is Ok or Err,
   * then returns self unchanged.
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
   * Preserves errors from either operation as E | F without converting them.
   * If only U is specified, F defaults to E.
   * The same-error overload also accepts branches whose errors are within E.
   */
  abstract andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  abstract andThen<U, F = E>(fn: (value: T) => Result<U, F>): Result<U, E | F>;

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
   * Preserves errors from either operation as E | F without converting them.
   * If only U is specified, F defaults to E.
   * The same-error overload also accepts branches whose errors are within E.
   */
  abstract andThenAsync<U>(
    fn: (value: T) => Promise<Result<U, E>>,
  ): Promise<Result<U, E>>;
  abstract andThenAsync<U, F = E>(
    fn: (value: T) => Promise<Result<U, F>>,
  ): Promise<Result<U, E | F>>;

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
   */
  abstract err(): OptionType<E>;

  /**
   * Returns true if the result equals another result (or Result-like object)
   * by value. Both must be the same variant (`Ok`/`Err`) and contain strictly
   * equal (`===`) values. Returns false for arguments that do not look like a
   * Result, including missing or non-callable `unwrap`/`unwrapErr` methods or
   * an invalid variant tag. If the other object's `unwrap` or `unwrapErr`
   * throws, the comparison returns false.
   */
  equals(other: Result<unknown, unknown>): boolean {
    if (!isResult(other)) {
      return false;
    }
    if (this.tag === "Ok" && other.tag === "Ok") {
      const value = this.unwrap() as unknown;
      try {
        return value === other.unwrap();
      } catch {
        return false;
      }
    }
    if (this.tag === "Err" && other.tag === "Err") {
      const error = this.unwrapErr() as unknown;
      try {
        return error === other.unwrapErr();
      } catch {
        return false;
      }
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
  ): Result<NonNullable<T>, E> {
    if (value === null || value === undefined) {
      return Result.err<NonNullable<T>, E>(error);
    }
    return Result.ok<NonNullable<T>, E>(value);
  }

  /**
   * Executes a function that may throw an exception and converts it to a Result.
   * Returns Ok if the function executes successfully, otherwise returns Err with the caught error.
   *
   * **Note:** TypeScript cannot constrain the type of thrown values at runtime.
   * The generic `E` is a compile-time assertion; the actual payload may be any value.
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
   *
   * **Note:** TypeScript cannot constrain the type of thrown or rejected values at runtime.
   * The generic `E` is a compile-time assertion; the actual payload may be any value.
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
   *
   * **Note:** TypeScript cannot constrain the type of rejected values at runtime.
   * The generic `E` is a compile-time assertion; the actual payload may be any value.
   */
  static fromPromise<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
    return Result.tryAsync<T, E>(() => promise);
  }

  /**
   * Extracts an Ok value with `yield*` inside a Result sequence.
   * An Err is yielded unchanged so the sequence can exit early.
   * This is separate from the value-enumerating Symbol.iterator protocol.
   */
  static *step<R extends Result<unknown, unknown>>(
    result: R,
  ): Generator<Err<never, ResultError<R>>, ResultValue<R>, unknown> {
    if (result.isErr()) {
      yield result as unknown as Err<never, ResultError<R>>;
      throw new TypeError("Cannot resume a failed Result.step");
    }
    return result.unwrap() as ResultValue<R>;
  }

  /**
   * Returns the first Err yielded by a step, or the generator's final Result.
   * On Err, closes the generator before returning; cleanup throws propagate.
   * Do not yield from finally blocks: their pending exception is hidden from
   * the runner, and a detected yield causes a TypeError during closure.
   */
  static sequence<
    Y extends Err<never, unknown>,
    R extends Result<unknown, unknown>,
  >(
    body: () => Generator<Y, R, unknown>,
  ): Result<ResultValue<R>, ResultError<Y> | ResultError<R>> {
    const generator = body();
    const first = generator.next();
    if (!first.done) {
      const exitValue = first.value as unknown as R;
      let closing = generator.return(exitValue);
      if (!closing.done) {
        const closureError = new TypeError(
          "Cannot yield from finally; put fallible Result steps in the body",
        );
        // Throwing also unwinds delegates that never finish on return().
        for (
          let attempt = 0;
          !closing.done && attempt < MAX_FINALLY_UNWIND_ATTEMPTS;
          attempt++
        ) {
          closing = generator.throw(closureError);
        }
        throw closureError;
      }
    }
    return first.value as Result<
      ResultValue<R>,
      ResultError<Y> | ResultError<R>
    >;
  }

  /**
   * Extracts a success value with `yield*` inside Result.sequenceAsync.
   * Accepts a Result or a promise-like Result without an explicit await at
   * the call site. Rejected values propagate unchanged.
   * Infers success and error unions from the entire input, including mixtures
   * of synchronous and promise-like Results.
   * Async generator delegation also awaits thenable success values.
   */
  static async *stepAsync<
    R extends Result<unknown, unknown> | PromiseLike<Result<unknown, unknown>>,
  >(
    result: R,
  ): AsyncGenerator<
    Err<never, ResultError<Awaited<R>>>,
    Awaited<ResultValue<Awaited<R>>>,
    unknown
  > {
    return yield* Result.step(await result);
  }

  /**
   * Returns the first Err yielded by a step, or the async generator's final
   * Result. On Err, waits for generator closure before returning; cleanup
   * throws and rejections propagate. Finally blocks must not yield, as with
   * Result.sequence.
   */
  static async sequenceAsync<
    Y extends Err<never, unknown>,
    R extends Result<unknown, unknown>,
  >(
    body: () => AsyncGenerator<Y, R, unknown>,
  ): Promise<Result<ResultValue<R>, ResultError<Y> | ResultError<R>>> {
    const generator = body();
    const first = await generator.next();
    if (!first.done) {
      const exitValue = first.value as unknown as R;
      let closing = await generator.return(exitValue);
      if (!closing.done) {
        const closureError = new TypeError(
          "Cannot yield from finally; put fallible Result steps in the body",
        );
        // Throwing also unwinds delegates that never finish on return().
        for (
          let attempt = 0;
          !closing.done && attempt < MAX_FINALLY_UNWIND_ATTEMPTS;
          attempt++
        ) {
          closing = await generator.throw(closureError);
        }
        throw closureError;
      }
    }
    return first.value as Result<
      ResultValue<R>,
      ResultError<Y> | ResultError<R>
    >;
  }

  /**
   * Combines multiple Results into a single Result.
   * Returns Ok containing all values in input order if all Results are Ok.
   * Preserves the value types of fixed-length tuples.
   * Returns the first Err if any Result is Err.
   * Returns Ok([]) for an empty array.
   */
  // Infer factory defaults before checking that every input is a Result.
  static all<const R extends readonly unknown[]>(
    results: R & (R[number] extends Result<unknown, unknown> ? unknown : never),
  ): Result<AllValues<R>, ResultError<R[number]>>;
  // Generic callers can already constrain their inputs to Results.
  static all<const R extends readonly Result<unknown, unknown>[]>(
    results: R,
  ): Result<AllValues<R>, ResultError<R[number]>>;
  static all<T, E>(results: readonly Result<T, E>[]): Result<T[], E>;
  static all(
    results: readonly Result<unknown, unknown>[],
  ): Result<unknown[], unknown> {
    const values: unknown[] = [];

    for (const r of results) {
      if (r.isErr()) {
        return r as Result<unknown[], unknown>;
      }
      values.push(r.unwrap());
    }

    return Result.ok(values);
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
        // Ok contains no E, so it can also represent Result<T, E[]>.
        return r as unknown as Result<T, E[]>;
      }
      errors.push(r.unwrapErr());
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
    throw new UnwrapError("Called unwrapErr on an Ok value", {
      cause: this.value,
    });
  }

  expectErr(message: string): never {
    throw new UnwrapError(message, { cause: this.value });
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

  and<U>(other: Result<U, E>): Result<U, E> {
    return other;
  }

  or<F>(_other: Result<T, F>): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  andThen<U, F = E>(fn: (value: T) => Result<U, F>): Result<U, E | F>;
  andThen<U, F = E>(fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return fn(this.value);
  }

  orElse<F>(_fn: (error: E) => Result<T, F>): Result<T, F> {
    return this as unknown as Result<T, F>;
  }

  async mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Result<U, E>> {
    return new Ok(await fn(this.value));
  }

  andThenAsync<U>(
    fn: (value: T) => Promise<Result<U, E>>,
  ): Promise<Result<U, E>>;
  andThenAsync<U, F = E>(
    fn: (value: T) => Promise<Result<U, F>>,
  ): Promise<Result<U, E | F>>;
  async andThenAsync<U, F = E>(
    fn: (value: T) => Promise<Result<U, F>>,
  ): Promise<Result<U, E | F>> {
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
    const prefix = "Called unwrap on an Err value: ";
    throw new UnwrapError(
      `${prefix}${safeStringify(this.error, MAX_STRINGIFY_LENGTH - prefix.length)}`,
      { cause: this.error },
    );
  }

  expect(message: string): never {
    throw new UnwrapError(message, { cause: this.error });
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

  and<U>(_other: Result<U, E>): Result<U, E> {
    return this as unknown as Result<U, E>;
  }

  or<F>(other: Result<T, F>): Result<T, F> {
    return other;
  }

  andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  andThen<U, F = E>(fn: (value: T) => Result<U, F>): Result<U, E | F>;
  andThen<U, F = E>(_fn: (value: T) => Result<U, F>): Result<U, E | F> {
    return this as unknown as Result<U, E | F>;
  }

  orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F> {
    return fn(this.error);
  }

  async mapAsync<U>(_fn: (value: T) => Promise<U>): Promise<Result<U, E>> {
    return this as unknown as Result<U, E>;
  }

  andThenAsync<U>(
    fn: (value: T) => Promise<Result<U, E>>,
  ): Promise<Result<U, E>>;
  andThenAsync<U, F = E>(
    fn: (value: T) => Promise<Result<U, F>>,
  ): Promise<Result<U, E | F>>;
  async andThenAsync<U, F = E>(
    _fn: (value: T) => Promise<Result<U, F>>,
  ): Promise<Result<U, E | F>> {
    return this as unknown as Result<U, E | F>;
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
