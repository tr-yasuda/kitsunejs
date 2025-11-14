import { describe, expectTypeOf, test } from "vitest";
import { type None, Option, type Some } from "@/core/option.js";

describe("Option type tests", () => {
  test("型の挙動", () => {
    // --- 基本的な型推論 ---

    // Option.some
    const someNumber = Option.some(42);
    expectTypeOf(someNumber).toEqualTypeOf<Option<number>>();

    // Option.none
    const noneNumber = Option.none<number>();
    expectTypeOf(noneNumber).toEqualTypeOf<Option<number>>();

    // Option.none のデフォルト型
    const plainNone = Option.none();
    expectTypeOf(plainNone).toEqualTypeOf<Option<never>>();

    // fromNullable
    const fromNullable = Option.fromNullable<number | null>(42);
    expectTypeOf(fromNullable).toEqualTypeOf<Option<number | null>>();

    // --- isSome / isNone によるナローイング ---

    const maybeNumber: Option<number> = Option.some(42);

    if (maybeNumber.isSome()) {
      // このブロック内で Some<number> になっていることを確認
      expectTypeOf(maybeNumber).toEqualTypeOf<Some<number>>();
      expectTypeOf(maybeNumber.unwrap()).toEqualTypeOf<number>();
    }

    if (maybeNumber.isNone()) {
      // このブロック内で None<number> 相当になっていることを確認
      expectTypeOf(maybeNumber).toEqualTypeOf<None<number>>();
    }

    // --- map / andThen / filter の型変換 ---

    // map: number → string
    const mapped = Option.some(42).map((v) => v.toString());
    expectTypeOf(mapped).toEqualTypeOf<Option<string>>();

    // andThen: number → string → boolean
    const chained = Option.some(42)
      .andThen((n) => Option.some(n.toString()))
      .andThen((s) => Option.some(s.length > 0));
    expectTypeOf(chained).toEqualTypeOf<Option<boolean>>();

    // filter: T のまま
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

    // expect のメッセージは string のみ受け付ける
    // @ts-expect-error - message must be string
    noneForUnwrap.expect(123);

    // --- Option.all / Option.any ---

    // Option.all: すべて Some → Some<T[]>
    const allSome = [Option.some(1), Option.some(2), Option.some(3)];
    const allCombined = Option.all(allSome);
    expectTypeOf(allCombined).toEqualTypeOf<Option<number[]>>();

    // Option.all: None がある場合
    const allWithNone = [Option.some(1), Option.none<number>(), Option.some(3)];
    const allCombinedWithNone = Option.all(allWithNone);
    expectTypeOf(allCombinedWithNone).toEqualTypeOf<Option<number[]>>();

    // Option.all: readonly 配列
    const readonlyOptions: readonly Option<number>[] = [
      Option.some(1),
      Option.some(2),
    ];
    const allFromReadonly = Option.all(readonlyOptions);
    expectTypeOf(allFromReadonly).toEqualTypeOf<Option<number[]>>();

    // Option.any: 最初の Some を返す
    const anySome = [Option.none<number>(), Option.some(42), Option.some(100)];
    const anyCombined = Option.any(anySome);
    expectTypeOf(anyCombined).toEqualTypeOf<Option<number>>();

    // Option.any: すべて None → None
    const anyAllNone = [Option.none<number>(), Option.none<number>()];
    const anyAllNoneCombined = Option.any(anyAllNone);
    expectTypeOf(anyAllNoneCombined).toEqualTypeOf<Option<number>>();

    // Option.any: readonly 配列
    const readonlyAnyOptions: readonly Option<number>[] = [
      Option.none(),
      Option.some(42),
    ];
    const anyFromReadonly = Option.any(readonlyAnyOptions);
    expectTypeOf(anyFromReadonly).toEqualTypeOf<Option<number>>();
  });
});
