import { describe, expectTypeOf, test } from "vitest";
import { type None, Option, Some } from "@/core/option.js";
import { Result, type Result as ResultType } from "@/core/result.js";

describe("Option type tests", () => {
  test("type behavior", () => {
    class LegacyOption<T> extends Option<T> {
      readonly tag: "Some" | "None";

      constructor(private readonly inner: Option<T>) {
        super();
        this.tag = inner.tag;
      }

      isSome(): this is Some<T> {
        return this.inner.isSome();
      }

      isNone(): this is None<T> {
        return this.inner.isNone();
      }

      isSomeAnd(predicate: (value: T) => boolean): this is Some<T> {
        return this.inner.isSomeAnd(predicate);
      }

      isNoneOr(predicate: (value: T) => boolean): boolean {
        return this.inner.isNoneOr(predicate);
      }

      unwrap(): T {
        return this.inner.unwrap();
      }

      expect(message: string): T {
        return this.inner.expect(message);
      }

      unwrapOr<U>(defaultValue: U): T | U {
        return this.inner.unwrapOr(defaultValue);
      }

      unwrapOrElse<U>(fn: () => U): T | U {
        return this.inner.unwrapOrElse(fn);
      }

      map<U>(fn: (value: T) => U): Option<U> {
        return this.inner.map(fn);
      }

      mapOr<U>(defaultValue: U, fn: (value: T) => U): U {
        return this.inner.mapOr(defaultValue, fn);
      }

      mapOrElse<U>(defaultFn: () => U, fn: (value: T) => U): U {
        return this.inner.mapOrElse(defaultFn, fn);
      }

      and<U>(other: Option<U>): Option<U> {
        return this.inner.and(other);
      }

      or(other: Option<T>): Option<T> {
        return this.inner.or(other);
      }

      andThen<U>(fn: (value: T) => Option<U>): Option<U> {
        return this.inner.andThen(fn);
      }

      mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Option<U>> {
        return this.inner.mapAsync(fn);
      }

      andThenAsync<U>(
        fn: (value: T) => Promise<Option<U>>,
      ): Promise<Option<U>> {
        return this.inner.andThenAsync(fn);
      }

      orElseAsync(fn: () => Promise<Option<T>>): Promise<Option<T>> {
        return this.inner.orElseAsync(fn);
      }

      filter(predicate: (value: T) => boolean): Option<T> {
        return this.inner.filter(predicate);
      }

      toResult<E>(error: E): ResultType<T, E> {
        return this.inner.toResult(error);
      }

      toResultElse<E>(fn: () => E): ResultType<T, E> {
        return this.inner.toResultElse(fn);
      }
    }

    // --- Basic type inference ---

    // Option.some
    const someNumber = Option.some(42);
    expectTypeOf(someNumber).toEqualTypeOf<Option<number>>();

    // Option.none
    const noneNumber = Option.none<number>();
    expectTypeOf(noneNumber).toEqualTypeOf<Option<number>>();

    // Default type of Option.none
    const plainNone = Option.none();
    expectTypeOf(plainNone).toEqualTypeOf<Option<never>>();

    // fromNullable
    const fromNullable = Option.fromNullable<number | null>(42);
    expectTypeOf(fromNullable).toEqualTypeOf<Option<number | null>>();

    // --- Narrowing with isSome / isNone ---

    const maybeNumber: Option<number> = Option.some(42);

    if (maybeNumber.isSome()) {
      // Verify it becomes Some<number> within this block
      expectTypeOf(maybeNumber).toEqualTypeOf<Some<number>>();
      expectTypeOf(maybeNumber.unwrap()).toEqualTypeOf<number>();
    }

    if (maybeNumber.isNone()) {
      // Verify it becomes None<number> within this block
      expectTypeOf(maybeNumber).toEqualTypeOf<None<number>>();
    }

    // --- Narrowing with isSomeAnd / isNoneOr ---

    if (maybeNumber.isSomeAnd((n) => n > 0)) {
      // Verify it becomes Some<number> within this block
      expectTypeOf(maybeNumber).toEqualTypeOf<Some<number>>();
      expectTypeOf(maybeNumber.unwrap()).toEqualTypeOf<number>();
    }

    const noneOrResult = maybeNumber.isNoneOr((n) => n > 0);
    expectTypeOf(noneOrResult).toEqualTypeOf<boolean>();

    // --- Type transformations with map / andThen / filter ---

    // map: number → string
    const mapped = Option.some(42).map((v) => v.toString());
    expectTypeOf(mapped).toEqualTypeOf<Option<string>>();

    // mapOr: Option<number> → string
    const mappedOr = Option.some(42).mapOr("default", (v) => v.toString());
    expectTypeOf(mappedOr).toEqualTypeOf<string>();

    // mapOrElse: Option<number> → string
    const mappedOrElse = Option.some(42).mapOrElse(
      () => "default",
      (v) => v.toString(),
    );
    expectTypeOf(mappedOrElse).toEqualTypeOf<string>();

    // match: returns unified type U
    const matchSome = Option.some(42).match(
      (v) => v * 2,
      () => 0,
    );
    expectTypeOf(matchSome).toEqualTypeOf<number>();

    const matchNone = Option.none<number>().match(
      (v) => v * 2,
      () => 0,
    );
    expectTypeOf(matchNone).toEqualTypeOf<number>();

    const inspectedSome = Option.some(42).inspect((_value) => {});
    expectTypeOf(inspectedSome).toEqualTypeOf<Option<number>>();

    const inspectedNone = Option.none<number>().inspect((_value) => {});
    expectTypeOf(inspectedNone).toEqualTypeOf<Option<number>>();

    // andThen: number → string → boolean
    const chained = Option.some(42)
      .andThen((n) => Option.some(n.toString()))
      .andThen((s) => Option.some(s.length > 0));
    expectTypeOf(chained).toEqualTypeOf<Option<boolean>>();

    // --- async methods ---

    // mapAsync: number → string
    const mapAsyncSome = Option.some(42).mapAsync(async (v) => v.toString());
    expectTypeOf(mapAsyncSome).toEqualTypeOf<Promise<Option<string>>>();

    const mapAsyncNone = Option.none<number>().mapAsync(async (v) =>
      v.toString(),
    );
    expectTypeOf(mapAsyncNone).toEqualTypeOf<Promise<Option<string>>>();

    // andThenAsync: number → string
    const andThenAsyncSome = Option.some(42).andThenAsync(async (v) =>
      Option.some(v.toString()),
    );
    expectTypeOf(andThenAsyncSome).toEqualTypeOf<Promise<Option<string>>>();

    // orElseAsync
    const orElseAsyncNone = Option.none<number>().orElseAsync(async () =>
      Option.some(0),
    );
    expectTypeOf(orElseAsyncNone).toEqualTypeOf<Promise<Option<number>>>();

    const orElseAsyncSome = Option.some(42).orElseAsync(async () =>
      Option.some(0),
    );
    expectTypeOf(orElseAsyncSome).toEqualTypeOf<Promise<Option<number>>>();

    // LegacyOption async methods
    const legacyMapAsync = new LegacyOption(Option.some(42)).mapAsync(
      async (v) => v.toString(),
    );
    expectTypeOf(legacyMapAsync).toEqualTypeOf<Promise<Option<string>>>();

    const legacyAndThenAsync = new LegacyOption(Option.some(42)).andThenAsync(
      async (v) => Option.some(v.toString()),
    );
    expectTypeOf(legacyAndThenAsync).toEqualTypeOf<Promise<Option<string>>>();

    const legacyOrElseAsync = new LegacyOption(
      Option.none<number>(),
    ).orElseAsync(async () => Option.some(0));
    expectTypeOf(legacyOrElseAsync).toEqualTypeOf<Promise<Option<number>>>();

    // filter: keeps T
    const filtered = Option.some(42).filter((v) => v > 0);
    expectTypeOf(filtered).toEqualTypeOf<Option<number>>();

    // --- unwrap / unwrapOr / unwrapOrElse ---

    const someForUnwrap = Option.some(42);
    expectTypeOf(someForUnwrap.unwrap()).toEqualTypeOf<number>();
    expectTypeOf(someForUnwrap.unwrapOr(0)).toEqualTypeOf<number>();
    expectTypeOf(someForUnwrap.unwrapOrElse(() => 0)).toEqualTypeOf<number>();

    // Some with a mismatched fallback still returns the contained type
    const concreteSome = new Some(42);
    expectTypeOf(concreteSome.unwrapOr("fallback")).toEqualTypeOf<number>();
    expectTypeOf(
      concreteSome.unwrapOrElse(() => "fallback"),
    ).toEqualTypeOf<number>();

    const noneForUnwrap = Option.none<number>();
    expectTypeOf(noneForUnwrap.unwrapOr(0)).toEqualTypeOf<number>();
    expectTypeOf(noneForUnwrap.unwrapOrElse(() => 0)).toEqualTypeOf<number>();

    // unwrapOr / unwrapOrElse: fresh None accepts any fallback
    const freshNone = Option.none();
    expectTypeOf(freshNone.unwrapOr(0)).toEqualTypeOf<number>();
    expectTypeOf(freshNone.unwrapOrElse(() => 0)).toEqualTypeOf<number>();
    expectTypeOf(freshNone.unwrapOr("fallback")).toEqualTypeOf<string>();
    expectTypeOf(
      freshNone.unwrapOrElse(() => "fallback"),
    ).toEqualTypeOf<string>();

    // Polymorphic Option uses the abstract T | U return type
    const maybeOption: Option<number> = Option.some(42);
    expectTypeOf(maybeOption.unwrapOr("fallback")).toEqualTypeOf<
      number | string
    >();
    expectTypeOf(maybeOption.unwrapOrElse(() => "fallback")).toEqualTypeOf<
      number | string
    >();

    // --- toResultElse ---

    const resultFromSome = Option.some(42).toResultElse(() => "error");
    expectTypeOf(resultFromSome).toEqualTypeOf<ResultType<number, string>>();

    const resultFromNone = Option.none<number>().toResultElse(() => "error");
    expectTypeOf(resultFromNone).toEqualTypeOf<ResultType<number, string>>();

    const resultFromNoneError = Option.none<number>().toResultElse(
      () => new Error("error"),
    );
    expectTypeOf(resultFromNoneError).toEqualTypeOf<
      ResultType<number, Error>
    >();

    // expect only accepts string message
    // @ts-expect-error - message must be string
    noneForUnwrap.expect(123);

    // --- Option.all / Option.any ---

    // Option.all: all Some → Some<T[]>
    const allSome = [Option.some(1), Option.some(2), Option.some(3)];
    const allCombined = Option.all(allSome);
    expectTypeOf(allCombined).toEqualTypeOf<Option<number[]>>();

    // Option.all: contains None
    const allWithNone = [Option.some(1), Option.none<number>(), Option.some(3)];
    const allCombinedWithNone = Option.all(allWithNone);
    expectTypeOf(allCombinedWithNone).toEqualTypeOf<Option<number[]>>();

    // Option.all: readonly array
    const readonlyOptions: readonly Option<number>[] = [
      Option.some(1),
      Option.some(2),
    ];
    const allFromReadonly = Option.all(readonlyOptions);
    expectTypeOf(allFromReadonly).toEqualTypeOf<Option<number[]>>();

    // Option.any: returns first Some
    const anySome = [Option.none<number>(), Option.some(42), Option.some(100)];
    const anyCombined = Option.any(anySome);
    expectTypeOf(anyCombined).toEqualTypeOf<Option<number>>();

    // Option.any: all None → None
    const anyAllNone = [Option.none<number>(), Option.none<number>()];
    const anyAllNoneCombined = Option.any(anyAllNone);
    expectTypeOf(anyAllNoneCombined).toEqualTypeOf<Option<number>>();

    // Option.any: readonly array
    const readonlyAnyOptions: readonly Option<number>[] = [
      Option.none(),
      Option.some(42),
    ];
    const anyFromReadonly = Option.any(readonlyAnyOptions);
    expectTypeOf(anyFromReadonly).toEqualTypeOf<Option<number>>();

    // --- orElse / xor ---

    const orElseSome = Option.some(1).orElse(() => Option.some(2));
    expectTypeOf(orElseSome).toEqualTypeOf<Option<number>>();

    const orElseNone = Option.none<number>().orElse(() => Option.some(2));
    expectTypeOf(orElseNone).toEqualTypeOf<Option<number>>();

    const xorSomeNone = Option.some(1).xor(Option.none<number>());
    expectTypeOf(xorSomeNone).toEqualTypeOf<Option<number>>();

    // @ts-expect-error - other must be Option<number>
    Option.some(1).xor(Option.some("nope"));

    // --- zip / zipWith / unzip ---

    const zipped = Option.some(1).zip(Option.some("hello"));
    expectTypeOf(zipped).toEqualTypeOf<Option<[number, string]>>();

    const zippedWith = Option.some(1).zipWith(Option.some("hello"), (a, b) => {
      const aNumber: number = a;
      const bString: string = b;
      return aNumber + bString.length;
    });
    expectTypeOf(zippedWith).toEqualTypeOf<Option<number>>();

    const [unzippedLeft, unzippedRight] = zipped.unzip();
    expectTypeOf(unzippedLeft).toEqualTypeOf<Option<number>>();
    expectTypeOf(unzippedRight).toEqualTypeOf<Option<string>>();

    // @ts-expect-error - unzip requires Option<[A, B]>
    Option.some(1).unzip();

    // --- transpose / flatten ---

    const transposedSomeOk = Option.some(
      Result.ok<number, string>(42),
    ).transpose();
    expectTypeOf(transposedSomeOk).toEqualTypeOf<
      ResultType<Option<number>, string>
    >();

    const transposedSomeErr = Option.some(
      Result.err<number, string>("error"),
    ).transpose();
    expectTypeOf(transposedSomeErr).toEqualTypeOf<
      ResultType<Option<number>, string>
    >();

    const transposedNone =
      Option.none<ResultType<number, string>>().transpose();
    expectTypeOf(transposedNone).toEqualTypeOf<
      ResultType<Option<number>, string>
    >();

    const flattenedSome = Option.some(Option.some(42)).flatten();
    expectTypeOf(flattenedSome).toEqualTypeOf<Option<number>>();

    const flattenedNone = Option.none<Option<number>>().flatten();
    expectTypeOf(flattenedNone).toEqualTypeOf<Option<number>>();

    const legacyInspected = new LegacyOption(Option.some(42)).inspect(
      (_value) => {},
    );
    expectTypeOf(legacyInspected).toEqualTypeOf<LegacyOption<number>>();

    const legacyTransposed = new LegacyOption(
      Option.some(Result.ok<number, string>(42)),
    ).transpose();
    expectTypeOf(legacyTransposed).toEqualTypeOf<
      ResultType<Option<number>, string>
    >();

    const legacyFlattened = new LegacyOption(
      Option.some(Option.some(42)),
    ).flatten();
    expectTypeOf(legacyFlattened).toEqualTypeOf<Option<number>>();

    // --- equals ---

    const equalsSome = Option.some(42).equals(Option.some(42));
    expectTypeOf(equalsSome).toEqualTypeOf<boolean>();

    const equalsNone = Option.none<number>().equals(Option.none<number>());
    expectTypeOf(equalsNone).toEqualTypeOf<boolean>();

    const equalsMixed = Option.some(42).equals(Option.none<number>());
    expectTypeOf(equalsMixed).toEqualTypeOf<boolean>();

    const equalsCrossType = Option.some(42).equals(Option.some("42"));
    expectTypeOf(equalsCrossType).toEqualTypeOf<boolean>();

    const legacyEquals = new LegacyOption(Option.some(42)).equals(
      Option.some(42),
    );
    expectTypeOf(legacyEquals).toEqualTypeOf<boolean>();

    // @ts-expect-error - other must be an Option
    Option.some(42).equals(Result.ok(42));

    // --- Symbol.iterator ---

    const someIterator = Option.some(42)[Symbol.iterator]();
    expectTypeOf(someIterator).toEqualTypeOf<IterableIterator<number>>();

    const noneIterator = Option.none<number>()[Symbol.iterator]();
    expectTypeOf(noneIterator).toEqualTypeOf<IterableIterator<number>>();

    const legacyIterator = new LegacyOption(Option.some(42))[Symbol.iterator]();
    expectTypeOf(legacyIterator).toEqualTypeOf<IterableIterator<number>>();
  });
});
