import { UnwrapError } from "@/core/errors.js";
import type { Result as ResultType } from "@/core/result.js";
import { Result } from "@/core/result.js";

const EMPTY_ITERATOR: IterableIterator<never> = Object.freeze({
  next: (): IteratorResult<never> => ({ done: true, value: undefined }),
  [Symbol.iterator](): IterableIterator<never> {
    return this;
  },
});

function isOption(value: unknown): value is Option<unknown> {
  if (value instanceof Option) {
    return true;
  }
  try {
    return (
      typeof value === "object" &&
      value !== null &&
      "tag" in value &&
      "unwrap" in value &&
      typeof (value as { unwrap: unknown }).unwrap === "function" &&
      ((value as { tag: unknown }).tag === "Some" ||
        (value as { tag: unknown }).tag === "None")
    );
  } catch {
    return false;
  }
}

export abstract class Option<T> {
  abstract readonly tag: "Some" | "None";

  /**
   * Returns true if the option is a Some value.
   * This is a type guard that narrows the type to Some<T>.
   */
  abstract isSome(): this is Some<T>;

  /**
   * Returns true if the option is a None value.
   * This is a type guard that narrows the type to None.
   */
  abstract isNone(): this is None<T>;

  /**
   * Returns true if the option is Some and the predicate returns true for the contained value.
   * This is a type guard that narrows the type to Some<T>.
   */
  abstract isSomeAnd(predicate: (value: T) => boolean): this is Some<T>;

  /**
   * Returns true if the option is None, otherwise returns the predicate result for the contained Some value.
   */
  abstract isNoneOr(predicate: (value: T) => boolean): boolean;

  /**
   * Returns the contained Some value.
   * Throws an UnwrapError if the value is None.
   */
  abstract unwrap(): T;

  /**
   * Returns the contained Some value with a custom error message.
   * Throws an UnwrapError with the provided message if the value is None.
   */
  abstract expect(message: string): T;

  /**
   * Implements the iterable protocol.
   * Some yields its contained value once; None yields nothing.
   *
   * Subclasses may override this for a more efficient implementation,
   * but the default implementation inherited from this base class is
   * sufficient for correctness.
   */
  *[Symbol.iterator](): IterableIterator<T> {
    if (this.isSome()) {
      yield this.unwrap();
    }
  }

  /**
   * Returns the contained Some value or a provided default.
   */
  abstract unwrapOr<U>(defaultValue: U): T | U;

  /**
   * Returns the contained Some value or computes it from a function.
   */
  abstract unwrapOrElse<U>(fn: () => U): T | U;

  /**
   * Maps an Option<T> to Option<U> by applying a function to a contained Some value.
   */
  abstract map<U>(fn: (value: T) => U): Option<U>;

  /**
   * Maps an Option<T> to U by applying a function to a contained Some value, or returns the provided default if None.
   */
  abstract mapOr<U>(defaultValue: U, fn: (value: T) => U): U;

  /**
   * Maps an Option<T> to U by applying a function to a contained Some value, or computes a default if None.
   */
  abstract mapOrElse<U>(defaultFn: () => U, fn: (value: T) => U): U;

  /**
   * Pattern matches over the Option, applying one of two functions depending on the variant.
   *
   * @template U - The type of the returned value
   * @param onSome - Function applied to the Some value
   * @param onNone - Function called when None
   * @returns The result of applying the appropriate function
   *
   * @example
   * ```typescript
   * const some = Option.some<number>(42);
   * console.log(some.match((v) => v * 2, () => 0)); // 84
   *
   * const none = Option.none<number>();
   * console.log(none.match((v) => v * 2, () => 0)); // 0
   * ```
   */
  match<U>(onSome: (value: T) => U, onNone: () => U): U {
    return this.mapOrElse(onNone, onSome);
  }

  /**
   * Calls a function with the Some value (if Some), then returns self unchanged.
   */
  inspect(fn: (value: T) => void): this {
    if (this.isSome()) {
      fn(this.unwrap());
    }
    return this;
  }

  /**
   * Calls a function with self regardless of whether the option is Some or None,
   * then returns self unchanged.
   *
   * @param fn - Function to call with the Option
   * @returns Self, unchanged
   *
   * @example
   * ```typescript
   * const option = Option.some(42)
   *   .tap((o) => console.log("option:", o.tag))
   *   .map((value) => value + 1);
   *
   * console.log(option.unwrap()); // 43
   * ```
   */
  tap(fn: (option: Option<T>) => void): this {
    fn(this);
    return this;
  }

  /**
   * Returns None if the option is None, otherwise returns other.
   */
  abstract and<U>(other: Option<U>): Option<U>;

  /**
   * Returns the option if it contains a value, otherwise returns other.
   */
  abstract or(other: Option<T>): Option<T>;

  /**
   * Returns the option if it contains a value, otherwise returns the result of fn.
   */
  orElse(fn: () => Option<T>): Option<T> {
    if (this.isSome()) {
      return this;
    }
    return fn();
  }

  /**
   * Returns the option if it contains a value, otherwise returns the async result of fn.
   */
  abstract orElseAsync(fn: () => Promise<Option<T>>): Promise<Option<T>>;

  /**
   * Returns Some if exactly one of self, other is Some, otherwise returns None.
   */
  xor(other: Option<T>): Option<T> {
    if (this.isSome()) {
      return other.isSome() ? Option.none<T>() : this;
    }
    return other.isSome() ? other : this;
  }

  /**
   * Zips self with another Option.
   * If both are Some, returns Some([a, b]), otherwise returns None.
   */
  zip<U>(other: Option<U>): Option<[T, U]> {
    if (this.isSome() && other.isSome()) {
      const value: [T, U] = [this.unwrap(), other.unwrap()];
      return Option.some(value);
    }
    return Option.none<[T, U]>();
  }

  /**
   * Zips self with another Option using a function.
   * If both are Some, returns Some(fn(a, b)), otherwise returns None.
   */
  zipWith<U, R>(other: Option<U>, fn: (a: T, b: U) => R): Option<R> {
    if (this.isSome() && other.isSome()) {
      return Option.some(fn(this.unwrap(), other.unwrap()));
    }
    return Option.none<R>();
  }

  /**
   * Unzips an Option containing a 2-tuple into a 2-tuple of Options.
   */
  unzip<A, B>(this: Option<[A, B]>): [Option<A>, Option<B>] {
    if (this.isSome()) {
      const [a, b] = this.unwrap();
      return [Option.some(a), Option.some(b)];
    }
    return [Option.none<A>(), Option.none<B>()];
  }

  /**
   * Transposes an Option of a Result into a Result of an Option.
   */
  transpose<U, E>(this: Option<ResultType<U, E>>): ResultType<Option<U>, E> {
    if (this.isSome()) {
      return this.unwrap().map((value) => Option.some(value));
    }
    return Result.ok<Option<U>, E>(this as unknown as Option<U>);
  }

  /**
   * Returns None if the option is None, otherwise calls fn with the wrapped value and returns the result.
   */
  abstract andThen<U>(fn: (value: T) => Option<U>): Option<U>;

  /**
   * Maps an Option<T> to Option<U> by applying an async function to a contained Some value.
   */
  abstract mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Option<U>>;

  /**
   * Returns None if the option is None, otherwise calls async fn with the wrapped value and returns the result.
   */
  abstract andThenAsync<U>(
    fn: (value: T) => Promise<Option<U>>,
  ): Promise<Option<U>>;

  /**
   * Returns None if the option is None, otherwise calls predicate with the wrapped value.
   * If predicate returns true, returns Some, otherwise returns None.
   */
  abstract filter(predicate: (value: T) => boolean): Option<T>;

  /**
   * Converts from Option<T> to Result<T, E>.
   */
  abstract toResult<E>(error: E): ResultType<T, E>;

  /**
   * Flattens one level of nesting in an Option.
   */
  flatten<U>(this: Option<Option<U>>): Option<U> {
    if (this.isSome()) {
      return this.unwrap();
    }
    return this as unknown as Option<U>;
  }

  /**
   * Converts from Option<T> to Result<T, E> by computing the error from a function.
   */
  abstract toResultElse<E>(fn: () => E): ResultType<T, E>;

  /**
   * Returns true if the option equals another option (or Option-like object)
   * by value. Both must be `Some` with strictly equal (`===`) values, or both
   * must be `None`. Returns false for arguments that do not look like an
   * Option, including missing or non-callable `unwrap` or an invalid variant
   * tag.
   *
   * @param other - Option (or Option-like object) to compare with
   * @returns true if both options are equal, otherwise false
   *
   * @example
   * ```typescript
   * const some1 = Option.some(42);
   * const some2 = Option.some(42);
   * console.log(some1.equals(some2)); // true
   *
   * const none = Option.none<number>();
   * console.log(some1.equals(none)); // false
   * ```
   */
  equals<U>(other: Option<U>): boolean {
    if (!isOption(other)) {
      return false;
    }
    if (this.tag === "Some" && other.tag === "Some") {
      return (this.unwrap() as unknown) === other.unwrap();
    }
    if (this.tag === "None" && other.tag === "None") {
      return true;
    }
    return false;
  }

  /**
   * Creates a Some variant containing the given value.
   */
  static some<T>(value: T): Option<T> {
    return new Some(value);
  }

  /**
   * Creates a None variant.
   */
  static none<T = never>(): Option<T> {
    return new None<T>();
  }

  /**
   * Converts a nullable value to an Option.
   * Returns None if the value is null or undefined, otherwise returns Some(value).
   */
  static fromNullable<T>(value: T | null | undefined): Option<T> {
    if (value === null || value === undefined) {
      return Option.none<T>();
    }
    return Option.some(value);
  }

  /**
   * Combines multiple Options into a single Option.
   * Returns Some containing an array of all values if all Options are Some.
   * Returns None if any Option is None.
   * Returns Some([]) for an empty array.
   */
  static all<T>(options: readonly Option<T>[]): Option<T[]> {
    const values: T[] = [];

    for (const o of options) {
      if (o.isNone()) {
        return Option.none<T[]>();
      }
      values.push(o.unwrap());
    }

    return Option.some(values);
  }

  /**
   * Returns the first Some option from an array of Options.
   * If all Options are None, returns None.
   */
  static any<T>(options: readonly Option<T>[]): Option<T> {
    for (const o of options) {
      if (o.isSome()) {
        return o;
      }
    }
    return Option.none<T>();
  }
}

/**
 * Some variant of Option<T> - contains a value
 */
export class Some<T> extends Option<T> {
  readonly tag = "Some" as const;

  constructor(private readonly value: T) {
    super();
  }

  isSome(): this is Some<T> {
    return true;
  }

  isNone(): this is None<T> {
    return false;
  }

  isSomeAnd(predicate: (value: T) => boolean): this is Some<T> {
    return predicate(this.value);
  }

  isNoneOr(predicate: (value: T) => boolean): boolean {
    return predicate(this.value);
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

  unwrapOr<U>(_defaultValue: U): T {
    return this.value;
  }

  unwrapOrElse<U>(_fn: () => U): T {
    return this.value;
  }

  map<U>(fn: (value: T) => U): Option<U> {
    return new Some(fn(this.value));
  }

  mapOr<U>(_defaultValue: U, fn: (value: T) => U): U {
    return fn(this.value);
  }

  mapOrElse<U>(_defaultFn: () => U, fn: (value: T) => U): U {
    return fn(this.value);
  }

  and<U>(other: Option<U>): Option<U> {
    return other;
  }

  or(_other: Option<T>): Option<T> {
    return this;
  }

  andThen<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this.value);
  }

  async mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Option<U>> {
    return new Some(await fn(this.value));
  }

  async andThenAsync<U>(
    fn: (value: T) => Promise<Option<U>>,
  ): Promise<Option<U>> {
    return fn(this.value);
  }

  async orElseAsync(_fn: () => Promise<Option<T>>): Promise<Option<T>> {
    return this;
  }

  filter(predicate: (value: T) => boolean): Option<T> {
    return predicate(this.value) ? this : Option.none<T>();
  }

  toResult<E>(_error: E): ResultType<T, E> {
    return Result.ok(this.value);
  }

  toResultElse<E>(_fn: () => E): ResultType<T, E> {
    return Result.ok(this.value);
  }
}

/**
 * None variant of Option<T> - contains no value
 */
export class None<T = never> extends Option<T> {
  readonly tag = "None" as const;

  isSome(): this is Some<T> {
    return false;
  }

  isNone(): this is None<T> {
    return true;
  }

  isSomeAnd(_predicate: (value: T) => boolean): this is Some<T> {
    return false;
  }

  isNoneOr(_predicate: (value: T) => boolean): boolean {
    return true;
  }

  unwrap(): T {
    throw new UnwrapError("Called unwrap on a None value");
  }

  expect(message: string): T {
    throw new UnwrapError(message);
  }

  [Symbol.iterator](): IterableIterator<T> {
    return EMPTY_ITERATOR as IterableIterator<T>;
  }

  unwrapOr<U>(defaultValue: U): T | U {
    return defaultValue;
  }

  unwrapOrElse<U>(fn: () => U): T | U {
    return fn();
  }

  map<U>(_fn: (value: T) => U): Option<U> {
    return Option.none<U>();
  }

  mapOr<U>(defaultValue: U, _fn: (value: T) => U): U {
    return defaultValue;
  }

  mapOrElse<U>(defaultFn: () => U, _fn: (value: T) => U): U {
    return defaultFn();
  }

  and<U>(_other: Option<U>): Option<U> {
    return Option.none<U>();
  }

  or(other: Option<T>): Option<T> {
    return other;
  }

  andThen<U>(_fn: (value: T) => Option<U>): Option<U> {
    return Option.none<U>();
  }

  async mapAsync<U>(_fn: (value: T) => Promise<U>): Promise<Option<U>> {
    return Option.none<U>();
  }

  async andThenAsync<U>(
    _fn: (value: T) => Promise<Option<U>>,
  ): Promise<Option<U>> {
    return Option.none<U>();
  }

  async orElseAsync(fn: () => Promise<Option<T>>): Promise<Option<T>> {
    return fn();
  }

  filter(_predicate: (value: T) => boolean): Option<T> {
    return this;
  }

  toResult<E>(error: E): ResultType<T, E> {
    return Result.err(error);
  }

  toResultElse<E>(fn: () => E): ResultType<T, E> {
    return Result.err(fn());
  }
}
