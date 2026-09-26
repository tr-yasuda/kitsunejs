import { describe, expectTypeOf, test } from "vitest";
import { Option } from "../../src/core/option.js";
import { Err, Ok, Result } from "../../src/core/result.js";

describe("Result type tests", () => {
  test("type behavior", () => {
    class LegacyResult<T, E> extends Result<T, E> {
      readonly tag: "Ok" | "Err";

      constructor(private readonly inner: Result<T, E>) {
        super();
        this.tag = inner.tag;
      }

      isOk(): this is Ok<T, E> {
        return this.inner.isOk();
      }

      isErr(): this is Err<T, E> {
        return this.inner.isErr();
      }

      isOkAnd(predicate: (value: T) => boolean): this is Ok<T, E> {
        return this.inner.isOkAnd(predicate);
      }

      isErrAnd(predicate: (error: E) => boolean): this is Err<T, E> {
        return this.inner.isErrAnd(predicate);
      }

      equals(other: Result<T, E>): boolean {
        return this.inner.equals(other);
      }

      unwrap(): T {
        return this.inner.unwrap();
      }

      expect(message: string): T {
        return this.inner.expect(message);
      }

      unwrapErr(): E {
        return this.inner.unwrapErr();
      }

      expectErr(message: string): E {
        return this.inner.expectErr(message);
      }

      unwrapOr<U>(defaultValue: U): T | U {
        return this.inner.unwrapOr(defaultValue);
      }

      unwrapOrElse<U>(fn: (error: E) => U): T | U {
        return this.inner.unwrapOrElse(fn);
      }

      map<U>(fn: (value: T) => U): Result<U, E> {
        return this.inner.map(fn);
      }

      mapOr<U>(defaultValue: U, fn: (value: T) => U): U {
        return this.inner.mapOr(defaultValue, fn);
      }

      mapOrElse<U>(defaultFn: (error: E) => U, fn: (value: T) => U): U {
        return this.inner.mapOrElse(defaultFn, fn);
      }

      mapErr<F>(fn: (error: E) => F): Result<T, F> {
        return this.inner.mapErr(fn);
      }

      inspect(fn: (value: T) => void): this {
        this.inner.inspect(fn);
        return this;
      }

      inspectErr(fn: (error: E) => void): this {
        this.inner.inspectErr(fn);
        return this;
      }

      and<U>(other: Result<U, E>): Result<U, E> {
        return this.inner.and(other);
      }

      or<F>(other: Result<T, F>): Result<T, F> {
        return this.inner.or(other);
      }

      andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
      andThen<U, F = E>(fn: (value: T) => Result<U, F>): Result<U, E | F>;
      andThen<U, F = E>(fn: (value: T) => Result<U, F>): Result<U, E | F> {
        return this.inner.andThen(fn);
      }

      orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F> {
        return this.inner.orElse(fn);
      }

      mapAsync<U>(fn: (value: T) => Promise<U>): Promise<Result<U, E>> {
        return this.inner.mapAsync(fn);
      }

      andThenAsync<U>(
        fn: (value: T) => Promise<Result<U, E>>,
      ): Promise<Result<U, E>>;
      andThenAsync<U, F = E>(
        fn: (value: T) => Promise<Result<U, F>>,
      ): Promise<Result<U, E | F>>;
      andThenAsync<U, F = E>(
        fn: (value: T) => Promise<Result<U, F>>,
      ): Promise<Result<U, E | F>> {
        return this.inner.andThenAsync(fn);
      }

      orElseAsync<F>(
        fn: (error: E) => Promise<Result<T, F>>,
      ): Promise<Result<T, F>> {
        return this.inner.orElseAsync(fn);
      }

      toOption(): Option<T> {
        return this.inner.toOption();
      }

      err(): Option<E> {
        return this.inner.err();
      }
    }

    // --- Basic type inference ---

    const okNumber = Result.ok(42);
    expectTypeOf(okNumber).toEqualTypeOf<Result<number, never>>();

    // Verify error type becomes string through inference
    const errString = Result.err("error");
    expectTypeOf(errString).toEqualTypeOf<Result<never, string>>();

    // Explicit generics
    const okExplicit = Result.ok<number, string>(42);
    expectTypeOf(okExplicit).toEqualTypeOf<Result<number, string>>();

    // --- Narrowing with isOk / isErr ---

    const maybeResult: Result<number, string> = Result.ok(42);

    if (maybeResult.isOk()) {
      expectTypeOf(maybeResult).toEqualTypeOf<Ok<number, string>>();
      expectTypeOf(maybeResult.unwrap()).toEqualTypeOf<number>();
    }

    if (maybeResult.isErr()) {
      expectTypeOf(maybeResult).toEqualTypeOf<Err<number, string>>();
      expectTypeOf(maybeResult.unwrapErr()).toEqualTypeOf<string>();
    }

    // --- isOkAnd / isErrAnd ---

    const maybeOkAnd: Result<number, string> = Result.ok(42);
    if (maybeOkAnd.isOkAnd((v) => v > 0)) {
      expectTypeOf(maybeOkAnd).toEqualTypeOf<Ok<number, string>>();
      expectTypeOf(maybeOkAnd.unwrap()).toEqualTypeOf<number>();
    }

    const maybeErrAnd: Result<number, string> = Result.err("error");
    if (maybeErrAnd.isErrAnd((e) => e.length > 0)) {
      expectTypeOf(maybeErrAnd).toEqualTypeOf<Err<number, string>>();
      expectTypeOf(maybeErrAnd.unwrapErr()).toEqualTypeOf<string>();
    }

    // --- equals ---

    const equalsResult = Result.ok<number, string>(42).equals(
      Result.ok<number, string>(42),
    );
    expectTypeOf(equalsResult).toEqualTypeOf<boolean>();

    const equalsLegacyResult = new LegacyResult<number, string>(
      Result.ok(42),
    ).equals(Result.ok<number, string>(42));
    expectTypeOf(equalsLegacyResult).toEqualTypeOf<boolean>();

    // --- map / mapErr / andThen ---

    // map: number → string
    const mapped = Result.ok<number, string>(42).map((v) => v.toString());
    expectTypeOf(mapped).toEqualTypeOf<Result<string, string>>();

    // mapOr: Ok returns mapper result, Err returns default
    const mapOrOk = Result.ok<number, string>(42).mapOr("default", (n) =>
      n.toString(),
    );
    expectTypeOf(mapOrOk).toEqualTypeOf<string>();

    const mapOrErr = Result.err<number, string>("error").mapOr(0, (n) => n);
    expectTypeOf(mapOrErr).toEqualTypeOf<number>();

    // mapOrElse: Ok returns mapper result, Err returns defaultFn result
    const mapOrElseOk = Result.ok<number, string>(42).mapOrElse(
      (e) => e.length,
      (n) => n * 2,
    );
    expectTypeOf(mapOrElseOk).toEqualTypeOf<number>();

    const mapOrElseErr = Result.err<number, string>("error").mapOrElse(
      (e) => e.length,
      (n) => n * 2,
    );
    expectTypeOf(mapOrElseErr).toEqualTypeOf<number>();

    // inspect / inspectErr: returns self unchanged
    const inspectedOk = new Ok<number, string>(42).inspect((_v) => {});
    expectTypeOf(inspectedOk).toEqualTypeOf<Ok<number, string>>();

    const inspectedErr = new Err<number, string>("error").inspectErr(
      (_e) => {},
    );
    expectTypeOf(inspectedErr).toEqualTypeOf<Err<number, string>>();

    // tap: returns self unchanged regardless of variant
    const tappedOk = new Ok<number, string>(42).tap((_r) => {});
    expectTypeOf(tappedOk).toEqualTypeOf<Ok<number, string>>();

    const tappedErr = new Err<number, string>("error").tap((_r) => {});
    expectTypeOf(tappedErr).toEqualTypeOf<Err<number, string>>();

    const legacyTapped = new LegacyResult<number, string>(
      Result.ok<number, string>(42),
    ).tap((_r) => {});
    expectTypeOf(legacyTapped).toEqualTypeOf<LegacyResult<number, string>>();

    // tap callback receives Result<T, E>
    Result.ok<number, string>(42).tap((r) => {
      expectTypeOf(r).toEqualTypeOf<Result<number, string>>();
    });
    type ResultTapCallback = Parameters<Result<number, string>["tap"]>[0];
    expectTypeOf<ResultTapCallback>().toEqualTypeOf<
      (result: Result<number, string>) => void
    >();

    // expectErr: returns Err value
    const expectedErr = Result.err<number, string>("error").expectErr(
      "message",
    );
    expectTypeOf(expectedErr).toEqualTypeOf<string>();

    // unwrapOr / unwrapOrElse: fresh Err accepts any fallback
    const errFallback = Result.err("error");
    expectTypeOf(errFallback.unwrapOr(0)).toEqualTypeOf<number>();
    expectTypeOf(errFallback.unwrapOrElse(() => 0)).toEqualTypeOf<number>();
    expectTypeOf(errFallback.unwrapOr("fallback")).toEqualTypeOf<string>();
    expectTypeOf(
      errFallback.unwrapOrElse(() => "fallback"),
    ).toEqualTypeOf<string>();

    // Ok with a mismatched fallback still returns the contained type
    const concreteOk = new Ok<number, string>(42);
    expectTypeOf(concreteOk.unwrapOr("fallback")).toEqualTypeOf<number>();
    expectTypeOf(
      concreteOk.unwrapOrElse(() => "fallback"),
    ).toEqualTypeOf<number>();

    // Polymorphic Result uses the abstract T | U return type
    const maybeResultForUnwrap: Result<number, string> = Result.ok(42);
    expectTypeOf(maybeResultForUnwrap.unwrapOr("fallback")).toEqualTypeOf<
      number | string
    >();
    expectTypeOf(
      maybeResultForUnwrap.unwrapOrElse(() => "fallback"),
    ).toEqualTypeOf<number | string>();

    // match: returns unified type U
    const matchOk = Result.ok<number, string>(42).match(
      (v) => v * 2,
      (e) => e.length,
    );
    expectTypeOf(matchOk).toEqualTypeOf<number>();

    const matchErr = Result.err<number, string>("error").match(
      (v) => v * 2,
      (e) => e.length,
    );
    expectTypeOf(matchErr).toEqualTypeOf<number>();

    // mapErr: string → number
    const mappedErr = Result.err<number, string>("error").mapErr(
      (e) => e.length,
    );
    expectTypeOf(mappedErr).toEqualTypeOf<Result<number, number>>();

    // andThen: number → string → boolean
    const chained = Result.ok<number, string>(42)
      .andThen((n) => Result.ok<string, string>(n.toString()))
      .andThen((s) => Result.ok<boolean, string>(s.length > 0));
    expectTypeOf(chained).toEqualTypeOf<Result<boolean, string>>();

    // Updated subclasses accept the same error unions as Result.
    const subclassChained = new LegacyResult<number, string>(
      Result.ok(42),
    ).andThen((value) => Result.ok<string, number>(value.toString()));
    expectTypeOf(subclassChained).toEqualTypeOf<
      Result<string, string | number>
    >();
    const subclassBranched = new LegacyResult<number, string | number>(
      Result.ok(42),
    ).andThen((value) => (value > 0 ? Result.err("fail") : Result.err(404)));
    expectTypeOf(subclassBranched).toEqualTypeOf<
      Result<never, string | number>
    >();

    abstract class PreviousSyncResult<T, E> extends Result<T, E> {
      abstract andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
    }
    expectTypeOf<PreviousSyncResult<number, string>>().toExtend<
      Result<number, string>
    >();
    const previousAndThen: PreviousSyncResult<number, string>["andThen"] = (
      fn,
    ) => fn(42);
    const previousChained = previousAndThen((value) =>
      Result.ok<string, string>(value.toString()),
    );
    expectTypeOf(previousChained).toEqualTypeOf<Result<string, string>>();
    // @ts-expect-error - an old override does not expose independent F
    previousAndThen<string, number>((value) =>
      Result.ok<string, number>(value.toString()),
    );

    // --- async methods ---

    // mapAsync: number → string
    const mapAsyncOk = Result.ok<number, string>(42).mapAsync(async (v) =>
      v.toString(),
    );
    expectTypeOf(mapAsyncOk).toEqualTypeOf<Promise<Result<string, string>>>();

    const mapAsyncErr = Result.err<number, string>("error").mapAsync(
      async (v) => v.toString(),
    );
    expectTypeOf(mapAsyncErr).toEqualTypeOf<Promise<Result<string, string>>>();

    // andThenAsync: number → string
    const andThenAsyncOk = Result.ok<number, string>(42).andThenAsync(
      async (v) => Result.ok(v.toString()),
    );
    expectTypeOf(andThenAsyncOk).toEqualTypeOf<
      Promise<Result<string, string>>
    >();

    // orElseAsync: string error → number error
    const orElseAsyncErr = Result.err<number, string>("error").orElseAsync(
      async (e) => Result.ok<number, number>(e.length),
    );
    expectTypeOf(orElseAsyncErr).toEqualTypeOf<
      Promise<Result<number, number>>
    >();

    const orElseAsyncOk = Result.ok<number, string>(42).orElseAsync(
      async (_e) => Result.ok(0),
    );
    expectTypeOf(orElseAsyncOk).toEqualTypeOf<Promise<Result<number, never>>>();

    // LegacyResult async methods
    const legacyMapAsync = new LegacyResult<number, string>(
      Result.ok(42),
    ).mapAsync(async (v) => v.toString());
    expectTypeOf(legacyMapAsync).toEqualTypeOf<
      Promise<Result<string, string>>
    >();

    const legacyAndThenAsync = new LegacyResult<number, string>(
      Result.ok(42),
    ).andThenAsync(async (v) => Result.ok(v.toString()));
    expectTypeOf(legacyAndThenAsync).toEqualTypeOf<
      Promise<Result<string, string>>
    >();

    const subclassChainedAsync = new LegacyResult<number, string>(
      Result.ok(42),
    ).andThenAsync(async (value) =>
      Result.ok<string, number>(value.toString()),
    );
    expectTypeOf(subclassChainedAsync).toEqualTypeOf<
      Promise<Result<string, string | number>>
    >();
    const subclassBranchedAsync = new LegacyResult<number, string | number>(
      Result.ok(42),
    ).andThenAsync(async (value) =>
      value > 0 ? Result.err("fail") : Result.err(404),
    );
    expectTypeOf(subclassBranchedAsync).toEqualTypeOf<
      Promise<Result<never, string | number>>
    >();

    abstract class PreviousAsyncResult<T, E> extends Result<T, E> {
      abstract andThenAsync<U>(
        fn: (value: T) => Promise<Result<U, E>>,
      ): Promise<Result<U, E>>;
    }
    expectTypeOf<PreviousAsyncResult<number, string>>().toExtend<
      Result<number, string>
    >();
    const previousAndThenAsync: PreviousAsyncResult<
      number,
      string
    >["andThenAsync"] = (fn) => fn(42);
    const previousChainedAsync = previousAndThenAsync(async (value) =>
      Result.ok<string, string>(value.toString()),
    );
    expectTypeOf(previousChainedAsync).toEqualTypeOf<
      Promise<Result<string, string>>
    >();
    // @ts-expect-error - an old override does not expose independent F
    previousAndThenAsync<string, number>(async (value) =>
      Result.ok<string, number>(value.toString()),
    );

    const legacyOrElseAsync = new LegacyResult<number, string>(
      Result.err<number, string>("error"),
    ).orElseAsync(async (_e) => Result.ok(0));
    expectTypeOf(legacyOrElseAsync).toEqualTypeOf<
      Promise<Result<number, never>>
    >();

    // --- toOption / Option.toResult ---

    const optionFromOk = Result.ok(42).toOption();
    expectTypeOf(optionFromOk).toEqualTypeOf<Option<number>>();

    const optionFromErr = Result.err<number, string>("error").toOption();
    expectTypeOf(optionFromErr).toEqualTypeOf<Option<number>>();

    const errOptionFromOk = Result.ok<number, string>(42).err();
    expectTypeOf(errOptionFromOk).toEqualTypeOf<Option<string>>();

    const errOptionFromErr = Result.err<number, string>("error").err();
    expectTypeOf(errOptionFromErr).toEqualTypeOf<Option<string>>();

    const transposedOkSome = Result.ok<Option<number>, string>(
      Option.some(42),
    ).transpose();
    expectTypeOf(transposedOkSome).toEqualTypeOf<
      Option<Result<number, string>>
    >();

    const transposedOkNone = Result.ok<Option<number>, string>(
      Option.none<number>(),
    ).transpose();
    expectTypeOf(transposedOkNone).toEqualTypeOf<
      Option<Result<number, string>>
    >();

    const transposedErr = Result.err<Option<number>, string>(
      "error",
    ).transpose();
    expectTypeOf(transposedErr).toEqualTypeOf<Option<Result<number, string>>>();

    const flattenedOk = Result.ok<Result<number, string>, string>(
      Result.ok(42),
    ).flatten();
    expectTypeOf(flattenedOk).toEqualTypeOf<Result<number, string>>();

    const flattenedErr = Result.err<Result<number, string>, string>(
      "error",
    ).flatten();
    expectTypeOf(flattenedErr).toEqualTypeOf<Result<number, string>>();

    const legacyTransposed = new LegacyResult<Option<number>, string>(
      Result.ok(Option.some(42)),
    ).transpose();
    expectTypeOf(legacyTransposed).toEqualTypeOf<
      Option<Result<number, string>>
    >();

    const legacyFlattened = new LegacyResult<Result<number, string>, string>(
      Result.ok(Result.ok(42)),
    ).flatten();
    expectTypeOf(legacyFlattened).toEqualTypeOf<Result<number, string>>();

    const resultFromSome = Option.some(42).toResult("error");
    expectTypeOf(resultFromSome).toEqualTypeOf<Result<number, string>>();

    const resultFromNone = Option.none<number>().toResult("error");
    expectTypeOf(resultFromNone).toEqualTypeOf<Result<number, string>>();

    // --- fromNullable / try / tryAsync ---

    const fromNullableOk = Result.fromNullable(42, "error");
    expectTypeOf(fromNullableOk).toEqualTypeOf<Result<number, string>>();

    const fromNullableErr = Result.fromNullable<number | null, string>(
      null,
      "error",
    );
    expectTypeOf(fromNullableErr).toEqualTypeOf<Result<number, string>>();

    const tryResult = Result.try(() => 42);
    expectTypeOf(tryResult).toEqualTypeOf<Result<number, Error>>();

    const tryAsyncResult = Result.tryAsync(async () => 42);
    expectTypeOf(tryAsyncResult).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const fromPromiseResult = Result.fromPromise(Promise.resolve(42));
    expectTypeOf(fromPromiseResult).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    const fromPromiseExplicit = Result.fromPromise<number, string>(
      Promise.resolve(42),
    );
    expectTypeOf(fromPromiseExplicit).toEqualTypeOf<
      Promise<Result<number, string>>
    >();

    const fromPromiseRejected = Result.fromPromise<number, Error>(
      Promise.reject(new Error("fail")),
    );
    expectTypeOf(fromPromiseRejected).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    // --- Result.all / Result.any ---

    // Result.all: all Ok → Ok<T[]>
    const allOk = [Result.ok(1), Result.ok(2), Result.ok(3)];
    const allCombined = Result.all(allOk);
    expectTypeOf(allCombined).toEqualTypeOf<Result<number[], never>>();

    // Result.all: contains Err
    const allWithErr = [
      Result.ok(1),
      Result.err<number, string>("error"),
      Result.ok(3),
    ];
    const allCombinedWithErr = Result.all(allWithErr);
    expectTypeOf(allCombinedWithErr).toEqualTypeOf<Result<number[], string>>();

    // Result.all: explicit type arguments remain available for arrays
    const allWithExplicitTypes = Result.all<number, string>(allWithErr);
    expectTypeOf(allWithExplicitTypes).toEqualTypeOf<
      Result<number[], string>
    >();

    // Result.all: readonly array
    const readonlyResults: readonly Result<number, string>[] = [
      Result.ok(1),
      Result.ok(2),
    ];
    const allFromReadonly = Result.all(readonlyResults);
    expectTypeOf(allFromReadonly).toEqualTypeOf<Result<number[], string>>();

    // Result.all: mixed tuple preserves each value and error type
    const mixedCombined = Result.all([
      Result.ok<string, "name-error">("Alice"),
      Result.ok<number, "age-error">(25),
      Result.ok<string, "email-error">("alice@example.com"),
    ]);
    expectTypeOf(mixedCombined).toEqualTypeOf<
      Result<
        [string, number, string],
        "name-error" | "age-error" | "email-error"
      >
    >();

    // Result.all: inline factories retain their default type arguments
    const inlineOk = Result.all([Result.ok(1)]);
    expectTypeOf(inlineOk).toEqualTypeOf<Result<[number], never>>();

    const inlineErr = Result.all([Result.ok(1), Result.err("failure")]);
    expectTypeOf(inlineErr).toEqualTypeOf<Result<[number, never], string>>();

    const contextualAll: Result<number[], string> = Result.all([Result.ok(1)]);
    expectTypeOf(contextualAll).toEqualTypeOf<Result<number[], string>>();

    // Result.all: generic callers preserve tuple value and error types
    function collectResults<R extends readonly Result<unknown, unknown>[]>(
      results: R,
    ): ReturnType<typeof Result.all<R>> {
      return Result.all(results);
    }
    const genericTuple = collectResults([
      Result.ok<string, "name-error">("Alice"),
      Result.ok<number, "age-error">(25),
    ] as const);
    expectTypeOf(genericTuple).toEqualTypeOf<
      Result<[string, number], "name-error" | "age-error">
    >();

    // Result.any: returns first Ok
    const anyOk = [
      Result.err<number, string>("error1"),
      Result.ok(42),
      Result.ok(100),
    ];
    const anyCombined = Result.any(anyOk);
    expectTypeOf(anyCombined).toEqualTypeOf<Result<number, string[]>>();

    // Result.any: all Err → Err<E[]>
    const anyAllErr = [
      Result.err<number, string>("error1"),
      Result.err<number, string>("error2"),
    ];
    const anyAllErrCombined = Result.any(anyAllErr);
    expectTypeOf(anyAllErrCombined).toEqualTypeOf<Result<number, string[]>>();

    // Result.any: readonly array
    const readonlyAnyResults: readonly Result<number, string>[] = [
      Result.err("error"),
      Result.ok(42),
    ];
    const anyFromReadonly = Result.any(readonlyAnyResults);
    expectTypeOf(anyFromReadonly).toEqualTypeOf<Result<number, string[]>>();

    // --- equals ---

    const equalsOk = Result.ok<number, string>(42).equals(Result.ok(42));
    expectTypeOf(equalsOk).toEqualTypeOf<boolean>();

    const equalsErr = Result.err<number, string>("error").equals(
      Result.err("error"),
    );
    expectTypeOf(equalsErr).toEqualTypeOf<boolean>();

    const equalsMixed = Result.ok<number, string>(42).equals(
      Result.err("error"),
    );
    expectTypeOf(equalsMixed).toEqualTypeOf<boolean>();

    const equalsCrossType = Result.ok<number, string>(42).equals(
      Result.ok<number, number>(42),
    );
    expectTypeOf(equalsCrossType).toEqualTypeOf<boolean>();

    const legacyEquals = new LegacyResult<number, string>(Result.ok(42)).equals(
      Result.ok(42),
    );
    expectTypeOf(legacyEquals).toEqualTypeOf<boolean>();

    // @ts-expect-error - other must be a Result
    Result.ok(42).equals(Option.some(42));

    // --- Symbol.iterator ---

    const okIterator = Result.ok<number, string>(42)[Symbol.iterator]();
    expectTypeOf(okIterator).toEqualTypeOf<IterableIterator<number>>();

    const errIterator = Result.err<number, string>("error")[Symbol.iterator]();
    expectTypeOf(errIterator).toEqualTypeOf<IterableIterator<number>>();

    const legacyIterator = new LegacyResult<number, string>(Result.ok(42))[
      Symbol.iterator
    ]();
    expectTypeOf(legacyIterator).toEqualTypeOf<IterableIterator<number>>();
  });
});

describe("Result chaining error types", () => {
  type LookupError = { kind: "lookup" };
  type ParseError = { kind: "parse" };
  type SaveError = { kind: "save" };
  type PublishError = { kind: "publish" };
  type ApplicationError = {
    kind: "application";
    cause: LookupError | ParseError;
  };

  test("should accept branches within an existing error union", () => {
    const source = Result.ok<number, string | number>(1);
    const result = source.andThen((value) =>
      value > 0 ? Result.err("fail") : Result.err(404),
    );

    expectTypeOf(result).toEqualTypeOf<Result<never, string | number>>();

    function callback(
      value: number,
    ): Result<string, LookupError> | Result<string, ParseError> {
      return value > 0
        ? Result.ok<string, LookupError>(value.toString())
        : Result.err<string, ParseError>({ kind: "parse" });
    }

    const tagged = Result.ok<number, LookupError | ParseError>(1);
    const fromCallback = tagged.andThen(callback);
    const fromOk = new Ok<number, LookupError | ParseError>(1).andThen(
      callback,
    );
    const fromErr = new Err<number, LookupError | ParseError>({
      kind: "lookup",
    }).andThen(callback);
    const explicitOutput = tagged.andThen<string>(callback);
    expectTypeOf(fromCallback).toEqualTypeOf<
      Result<string, LookupError | ParseError>
    >();
    expectTypeOf(fromOk).toEqualTypeOf<
      Result<string, LookupError | ParseError>
    >();
    expectTypeOf(fromErr).toEqualTypeOf<
      Result<string, LookupError | ParseError>
    >();
    expectTypeOf(explicitOutput).toEqualTypeOf<
      Result<string, LookupError | ParseError>
    >();
  });

  test("should infer the union of different error types", () => {
    const lookup = Result.ok<number, LookupError>(42);
    const result = lookup.andThen((value) =>
      Result.ok<string, ParseError>(value.toString()),
    );

    expectTypeOf(result).toEqualTypeOf<
      Result<string, LookupError | ParseError>
    >();

    const converted = result.mapErr(
      (cause): ApplicationError => ({ kind: "application", cause }),
    );
    expectTypeOf(converted).toEqualTypeOf<Result<string, ApplicationError>>();

    const accumulated = result
      .andThen((value) => Result.ok<boolean, SaveError>(value.length > 0))
      .andThen((value) => Result.ok<number, PublishError>(Number(value)));
    expectTypeOf(accumulated).toEqualTypeOf<
      Result<number, LookupError | ParseError | SaveError | PublishError>
    >();

    const concreteOk = new Ok<number, LookupError>(42).andThen((value) =>
      Result.ok<string, ParseError>(value.toString()),
    );
    const concreteErr = new Err<number, LookupError>({
      kind: "lookup",
    }).andThen((value) => Result.ok<string, ParseError>(value.toString()));
    expectTypeOf(concreteOk).toEqualTypeOf<
      Result<string, LookupError | ParseError>
    >();
    expectTypeOf(concreteErr).toEqualTypeOf<
      Result<string, LookupError | ParseError>
    >();

    const sameError = lookup.andThen((value) =>
      Result.ok<string, LookupError>(value.toString()),
    );
    expectTypeOf(sameError).toEqualTypeOf<Result<string, LookupError>>();

    const leftNever = Result.ok(42).andThen((value) =>
      Result.ok<string, ParseError>(value.toString()),
    );
    const rightNever = lookup.andThen((value) => Result.ok(value.toString()));
    const bothNever = Result.ok(42).andThen((value) =>
      Result.ok(value.toString()),
    );
    expectTypeOf(leftNever).toEqualTypeOf<Result<string, ParseError>>();
    expectTypeOf(rightNever).toEqualTypeOf<Result<string, LookupError>>();
    expectTypeOf(bothNever).toEqualTypeOf<Result<string, never>>();

    const onlyErr = lookup.andThen(() =>
      Result.err<never, ParseError>({ kind: "parse" }),
    );
    expectTypeOf(onlyErr).toEqualTypeOf<
      Result<never, LookupError | ParseError>
    >();

    const explicitOutput = lookup.andThen<string>((value) =>
      Result.ok<string, LookupError>(value.toString()),
    );
    const explicitOutputNever = lookup.andThen<string>((value) =>
      Result.ok(value.toString()),
    );
    const explicitBoth = lookup.andThen<string, ParseError>((value) =>
      Result.ok<string, ParseError>(value.toString()),
    );
    expectTypeOf(explicitOutput).toEqualTypeOf<Result<string, LookupError>>();
    expectTypeOf(explicitOutputNever).toEqualTypeOf<
      Result<string, LookupError>
    >();
    expectTypeOf(explicitBoth).toEqualTypeOf<
      Result<string, LookupError | ParseError>
    >();

    lookup.andThen<string>(
      // @ts-expect-error - specifying only U uses F = LookupError
      (value) => Result.ok<string, ParseError>(value.toString()),
    );
  });

  test("should accept async branches within an existing error union", () => {
    const source = Result.ok<number, string | number>(1);
    const result = source.andThenAsync(async (value) =>
      value > 0 ? Result.err("fail") : Result.err(404),
    );

    expectTypeOf(result).toEqualTypeOf<
      Promise<Result<never, string | number>>
    >();

    async function callback(
      value: number,
    ): Promise<Result<string, LookupError> | Result<string, ParseError>> {
      return value > 0
        ? Result.ok<string, LookupError>(value.toString())
        : Result.err<string, ParseError>({ kind: "parse" });
    }

    const tagged = Result.ok<number, LookupError | ParseError>(1);
    const fromCallback = tagged.andThenAsync(callback);
    const fromOk = new Ok<number, LookupError | ParseError>(1).andThenAsync(
      callback,
    );
    const fromErr = new Err<number, LookupError | ParseError>({
      kind: "lookup",
    }).andThenAsync(callback);
    const explicitOutput = tagged.andThenAsync<string>(callback);
    expectTypeOf(fromCallback).toEqualTypeOf<
      Promise<Result<string, LookupError | ParseError>>
    >();
    expectTypeOf(fromOk).toEqualTypeOf<
      Promise<Result<string, LookupError | ParseError>>
    >();
    expectTypeOf(fromErr).toEqualTypeOf<
      Promise<Result<string, LookupError | ParseError>>
    >();
    expectTypeOf(explicitOutput).toEqualTypeOf<
      Promise<Result<string, LookupError | ParseError>>
    >();
  });

  test("should infer the union of different async error types", async () => {
    const lookup = Result.ok<number, LookupError>(42);
    const result = lookup.andThenAsync(async (value) =>
      Result.ok<string, ParseError>(value.toString()),
    );

    expectTypeOf(result).toEqualTypeOf<
      Promise<Result<string, LookupError | ParseError>>
    >();

    const parsed = await result;
    const converted = parsed.mapErr(
      (cause): ApplicationError => ({ kind: "application", cause }),
    );
    expectTypeOf(converted).toEqualTypeOf<Result<string, ApplicationError>>();
    const saved = await parsed.andThenAsync(async (value) =>
      Result.ok<boolean, SaveError>(value.length > 0),
    );
    const accumulated = saved.andThenAsync(async (value) =>
      Result.ok<number, PublishError>(Number(value)),
    );
    expectTypeOf(accumulated).toEqualTypeOf<
      Promise<
        Result<number, LookupError | ParseError | SaveError | PublishError>
      >
    >();

    const concreteOk = new Ok<number, LookupError>(42).andThenAsync(
      async (value) => Result.ok<string, ParseError>(value.toString()),
    );
    const concreteErr = new Err<number, LookupError>({
      kind: "lookup",
    }).andThenAsync(async (value) =>
      Result.ok<string, ParseError>(value.toString()),
    );
    expectTypeOf(concreteOk).toEqualTypeOf<
      Promise<Result<string, LookupError | ParseError>>
    >();
    expectTypeOf(concreteErr).toEqualTypeOf<
      Promise<Result<string, LookupError | ParseError>>
    >();

    const sameError = lookup.andThenAsync(async (value) =>
      Result.ok<string, LookupError>(value.toString()),
    );
    expectTypeOf(sameError).toEqualTypeOf<
      Promise<Result<string, LookupError>>
    >();

    const leftNever = Result.ok(42).andThenAsync(async (value) =>
      Result.ok<string, ParseError>(value.toString()),
    );
    const rightNever = lookup.andThenAsync(async (value) =>
      Result.ok(value.toString()),
    );
    const bothNever = Result.ok(42).andThenAsync(async (value) =>
      Result.ok(value.toString()),
    );
    expectTypeOf(leftNever).toEqualTypeOf<
      Promise<Result<string, ParseError>>
    >();
    expectTypeOf(rightNever).toEqualTypeOf<
      Promise<Result<string, LookupError>>
    >();
    expectTypeOf(bothNever).toEqualTypeOf<Promise<Result<string, never>>>();

    const onlyErr = lookup.andThenAsync(async () =>
      Result.err<never, ParseError>({ kind: "parse" }),
    );
    expectTypeOf(onlyErr).toEqualTypeOf<
      Promise<Result<never, LookupError | ParseError>>
    >();

    const explicitOutput = lookup.andThenAsync<string>(async (value) =>
      Result.ok<string, LookupError>(value.toString()),
    );
    const explicitOutputNever = lookup.andThenAsync<string>(async (value) =>
      Result.ok(value.toString()),
    );
    const explicitBoth = lookup.andThenAsync<string, ParseError>(
      async (value) => Result.ok<string, ParseError>(value.toString()),
    );
    expectTypeOf(explicitOutput).toEqualTypeOf<
      Promise<Result<string, LookupError>>
    >();
    expectTypeOf(explicitOutputNever).toEqualTypeOf<
      Promise<Result<string, LookupError>>
    >();
    expectTypeOf(explicitBoth).toEqualTypeOf<
      Promise<Result<string, LookupError | ParseError>>
    >();

    lookup.andThenAsync<string>(
      // @ts-expect-error - specifying only U uses F = LookupError
      async (value) => Result.ok<string, ParseError>(value.toString()),
    );
  });
});
