import { UnwrapError } from "@/core/errors.js";
import type { Result as ResultType } from "@/core/result.js";
import { Result } from "@/core/result.js";

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
   * Returns the contained Some value or a provided default.
   */
  abstract unwrapOr(defaultValue: T): T;

  /**
   * Returns the contained Some value or computes it from a function.
   */
  abstract unwrapOrElse(fn: () => T): T;

  /**
   * Maps an Option<T> to Option<U> by applying a function to a contained Some value.
   */
  abstract map<U>(fn: (value: T) => U): Option<U>;

  /**
   * Returns None if the option is None, otherwise returns other.
   */
  abstract and<U>(other: Option<U>): Option<U>;

  /**
   * Returns the option if it contains a value, otherwise returns other.
   */
  abstract or(other: Option<T>): Option<T>;

  /**
   * Returns None if the option is None, otherwise calls fn with the wrapped value and returns the result.
   */
  abstract andThen<U>(fn: (value: T) => Option<U>): Option<U>;

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

  unwrap(): T {
    return this.value;
  }

  expect(_message: string): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  unwrapOrElse(_fn: () => T): T {
    return this.value;
  }

  map<U>(fn: (value: T) => U): Option<U> {
    return new Some(fn(this.value));
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

  filter(predicate: (value: T) => boolean): Option<T> {
    return predicate(this.value) ? this : Option.none<T>();
  }

  toResult<E>(_error: E): ResultType<T, E> {
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

  unwrap(): T {
    throw new UnwrapError("Called unwrap on a None value");
  }

  expect(message: string): T {
    throw new UnwrapError(message);
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }

  unwrapOrElse(fn: () => T): T {
    return fn();
  }

  map<U>(_fn: (value: T) => U): Option<U> {
    return Option.none<U>();
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

  filter(_predicate: (value: T) => boolean): Option<T> {
    return this;
  }

  toResult<E>(error: E): ResultType<T, E> {
    return Result.err(error);
  }
}
