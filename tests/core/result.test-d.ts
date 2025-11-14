import { describe, expectTypeOf, test } from "vitest";
import { Option } from "@/core/option.js";
import { type Err, type Ok, Result } from "@/core/result.js";

describe("Result type tests", () => {
  test("型の挙動", () => {
    // --- 基本的な型推論 ---

    const okNumber = Result.ok(42);
    expectTypeOf(okNumber).toEqualTypeOf<Result<number, never>>();

    // 型推論によりエラー型が string になることを確認
    const errString = Result.err("error");
    expectTypeOf(errString).toEqualTypeOf<Result<never, string>>();

    // 明示的ジェネリクス
    const okExplicit = Result.ok<number, string>(42);
    expectTypeOf(okExplicit).toEqualTypeOf<Result<number, string>>();

    // --- isOk / isErr によるナローイング ---

    const maybeResult: Result<number, string> = Result.ok(42);

    if (maybeResult.isOk()) {
      expectTypeOf(maybeResult).toEqualTypeOf<Ok<number, string>>();
      expectTypeOf(maybeResult.unwrap()).toEqualTypeOf<number>();
    }

    if (maybeResult.isErr()) {
      expectTypeOf(maybeResult).toEqualTypeOf<Err<number, string>>();
    }

    // --- map / mapErr / andThen ---

    // map: number → string
    const mapped = Result.ok<number, string>(42).map((v) => v.toString());
    expectTypeOf(mapped).toEqualTypeOf<Result<string, string>>();

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

    // --- toOption / Option.toResult ---

    const optionFromOk = Result.ok(42).toOption();
    expectTypeOf(optionFromOk).toEqualTypeOf<Option<number>>();

    const optionFromErr = Result.err<number, string>("error").toOption();
    expectTypeOf(optionFromErr).toEqualTypeOf<Option<number>>();

    const resultFromSome = Option.some(42).toResult("error");
    expectTypeOf(resultFromSome).toEqualTypeOf<Result<number, string>>();

    const resultFromNone = Option.none<number>().toResult("error");
    expectTypeOf(resultFromNone).toEqualTypeOf<Result<number, string>>();

    // --- fromNullable / try / tryAsync ---

    const fromNullableOk = Result.fromNullable(42, "error");
    expectTypeOf(fromNullableOk).toEqualTypeOf<Result<number, string>>();

    const fromNullableErr = Result.fromNullable<number, string>(null, "error");
    expectTypeOf(fromNullableErr).toEqualTypeOf<Result<number, string>>();

    const tryResult = Result.try(() => 42);
    expectTypeOf(tryResult).toEqualTypeOf<Result<number, Error>>();

    const tryAsyncResult = Result.tryAsync(async () => 42);
    expectTypeOf(tryAsyncResult).toEqualTypeOf<
      Promise<Result<number, Error>>
    >();

    // --- Result.all / Result.any ---

    // Result.all: すべて Ok → Ok<T[]>
    const allOk = [Result.ok(1), Result.ok(2), Result.ok(3)];
    const allCombined = Result.all(allOk);
    expectTypeOf(allCombined).toEqualTypeOf<Result<number[], never>>();

    // Result.all: Err がある場合
    const allWithErr = [
      Result.ok(1),
      Result.err<number, string>("error"),
      Result.ok(3),
    ];
    const allCombinedWithErr = Result.all(allWithErr);
    expectTypeOf(allCombinedWithErr).toEqualTypeOf<Result<number[], string>>();

    // Result.all: readonly 配列
    const readonlyResults: readonly Result<number, string>[] = [
      Result.ok(1),
      Result.ok(2),
    ];
    const allFromReadonly = Result.all(readonlyResults);
    expectTypeOf(allFromReadonly).toEqualTypeOf<Result<number[], string>>();

    // Result.any: 最初の Ok を返す
    const anyOk = [
      Result.err<number, string>("error1"),
      Result.ok(42),
      Result.ok(100),
    ];
    const anyCombined = Result.any(anyOk);
    expectTypeOf(anyCombined).toEqualTypeOf<Result<number, string[]>>();

    // Result.any: すべて Err → Err<E[]>
    const anyAllErr = [
      Result.err<number, string>("error1"),
      Result.err<number, string>("error2"),
    ];
    const anyAllErrCombined = Result.any(anyAllErr);
    expectTypeOf(anyAllErrCombined).toEqualTypeOf<Result<number, string[]>>();

    // Result.any: readonly 配列
    const readonlyAnyResults: readonly Result<number, string>[] = [
      Result.err("error"),
      Result.ok(42),
    ];
    const anyFromReadonly = Result.any(readonlyAnyResults);
    expectTypeOf(anyFromReadonly).toEqualTypeOf<Result<number, string[]>>();
  });
});
