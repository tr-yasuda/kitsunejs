import { describe, expectTypeOf, test } from "vitest";
import { type None, Option, type Some } from "@/core/option.js";
import type { Result as ResultType } from "@/core/result.js";

describe("Option type tests", () => {
  test("type behavior", () => {
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

    // andThen: number → string → boolean
    const chained = Option.some(42)
      .andThen((n) => Option.some(n.toString()))
      .andThen((s) => Option.some(s.length > 0));
    expectTypeOf(chained).toEqualTypeOf<Option<boolean>>();

    // filter: keeps T
    const filtered = Option.some(42).filter((v) => v > 0);
    expectTypeOf(filtered).toEqualTypeOf<Option<number>>();

    // --- unwrap / unwrapOr / unwrapOrElse ---

    const someForUnwrap = Option.some(42);
    expectTypeOf(someForUnwrap.unwrap()).toEqualTypeOf<number>();
    expectTypeOf(someForUnwrap.unwrapOr(0)).toEqualTypeOf<number>();
    expectTypeOf(someForUnwrap.unwrapOrElse(() => 0)).toEqualTypeOf<number>();

    const noneForUnwrap = Option.none<number>();
    expectTypeOf(noneForUnwrap.unwrapOr(0)).toEqualTypeOf<number>();
    expectTypeOf(noneForUnwrap.unwrapOrElse(() => 0)).toEqualTypeOf<number>();

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
  });
});
