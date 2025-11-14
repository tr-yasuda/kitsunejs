import { describe, expect, test } from "vitest";
import { UnwrapError } from "@/core/errors.js";
import { Err, Ok, Result } from "@/core/result.js";

describe("Result", () => {
  describe("Result.ok()", () => {
    test("基本的な値の生成", () => {
      const result = Result.ok(42);
      expect(result).toBeInstanceOf(Ok);
      expect(result.tag).toBe("Ok");
    });

    test("isOk() が true を返す", () => {
      const result = Result.ok(42);
      expect(result.isOk()).toBe(true);
    });

    test("isErr() が false を返す", () => {
      const result = Result.ok(42);
      expect(result.isErr()).toBe(false);
    });

    test("unwrap() で値を取得できる", () => {
      const result = Result.ok(42);
      expect(result.unwrap()).toBe(42);
    });
  });

  describe("Result.err()", () => {
    test("基本的なエラーの生成", () => {
      const result = Result.err("error");
      expect(result).toBeInstanceOf(Err);
      expect(result.tag).toBe("Err");
    });

    test("isOk() が false を返す", () => {
      const result = Result.err("error");
      expect(result.isOk()).toBe(false);
    });

    test("isErr() が true を返す", () => {
      const result = Result.err("error");
      expect(result.isErr()).toBe(true);
    });

    test("unwrap() で例外が発生する", () => {
      const result = Result.err("error");
      expect(() => result.unwrap()).toThrow(UnwrapError);
    });
  });

  describe("unwrap()", () => {
    test("Ok の場合: 値を返す", () => {
      const result = Result.ok(42);
      expect(result.unwrap()).toBe(42);
    });

    test("Err の場合: 例外を投げる", () => {
      const result = Result.err("error");
      expect(() => result.unwrap()).toThrow(UnwrapError);
    });
  });

  describe("expect()", () => {
    test("Ok の場合: 値を返す", () => {
      const result = Result.ok(42);
      expect(result.expect("custom message")).toBe(42);
    });

    test("Err の場合: カスタムメッセージで例外を投げる", () => {
      const result = Result.err("error");
      expect(() => result.expect("custom message")).toThrow(UnwrapError);
    });
  });

  describe("unwrapErr()", () => {
    test("Err の場合: エラー値を返す", () => {
      const result = Result.err("error message");
      expect(result.unwrapErr()).toBe("error message");
    });

    test("Ok の場合: 例外を投げる", () => {
      const result = Result.ok(42);
      expect(() => result.unwrapErr()).toThrow(UnwrapError);
    });
  });

  describe("unwrapOr()", () => {
    test("Ok の場合: 元の値を返す", () => {
      const result = Result.ok(42);
      expect(result.unwrapOr(0)).toBe(42);
    });

    test("Err の場合: デフォルト値を返す", () => {
      const result = Result.err<number, string>("error");
      expect(result.unwrapOr(0)).toBe(0);
    });
  });

  describe("unwrapOrElse()", () => {
    test("Ok の場合: 元の値を返す", () => {
      const result = Result.ok(42);
      expect(result.unwrapOrElse((_error) => 0)).toBe(42);
    });

    test("Err の場合: 関数の結果を返す", () => {
      const result = Result.err<number, string>("error");
      expect(result.unwrapOrElse((error) => error.length)).toBe(5);
    });
  });

  describe("map()", () => {
    test("Ok の場合: map が適用される", () => {
      const result = Result.ok(42);
      const mapped = result.map((value) => value * 2);
      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe(84);
    });

    test("Err の場合: map がスキップされる", () => {
      const result = Result.err<number, string>("error");
      const mapped = result.map((value) => value * 2);
      expect(mapped.isErr()).toBe(true);
    });

    test("型変換が正しく動作する", () => {
      const result = Result.ok(42);
      const mapped = result.map((value) => value.toString());
      expect(mapped.unwrap()).toBe("42");
    });
  });

  describe("mapErr()", () => {
    test("Ok の場合: mapErr がスキップされる", () => {
      const result = Result.ok<number, string>(42);
      const mapped = result.mapErr((error) => error.length);
      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe(42);
    });

    test("Err の場合: mapErr が適用され、型変換が正しく動作する", () => {
      const result = Result.err<number, string>("error");
      const mapped = result.mapErr((error) => error.length);
      expect(mapped.isErr()).toBe(true);
      const errorValue = mapped.unwrapOrElse((err) => err);
      expect(errorValue).toBe(5);
    });
  });

  describe("and()", () => {
    test("Ok.and(other): other を返す", () => {
      const result1 = Result.ok(42);
      const result2 = Result.ok("hello");
      const combined = result1.and(result2);
      expect(combined.unwrap()).toBe("hello");
    });

    test("Err.and(other): self を返す", () => {
      const result1 = Result.err("error1");
      const result2 = Result.ok("hello");
      const combined = result1.and(result2);
      expect(combined.isErr()).toBe(true);
      const errorValue = combined.unwrapOrElse((err) => err);
      expect(errorValue).toBe("error1");
    });

    test("Ok.and(Err): Err を返す", () => {
      const result1 = Result.ok<number, string>(42);
      const result2 = Result.err("error2");
      const combined = result1.and<string>(result2);
      expect(combined.isErr()).toBe(true);
      const errorValue = combined.unwrapOrElse((err) => err);
      expect(errorValue).toBe("error2");
    });
  });

  describe("or()", () => {
    test("Ok.or(other): self を返す", () => {
      const result1 = Result.ok(42);
      const result2 = Result.ok(100);
      const combined = result1.or(result2);
      expect(combined.unwrap()).toBe(42);
    });

    test("Err.or(other): other を返す", () => {
      const result1 = Result.err<number, string>("error1");
      const result2 = Result.ok(100);
      const combined = result1.or(result2);
      expect(combined.unwrap()).toBe(100);
    });

    test("Err.or(Err): 後者の Err を返す", () => {
      const result1 = Result.err<string, string>("error1");
      const result2 = Result.err<string, string>("error2");
      const combined = result1.or(result2);
      expect(combined.isErr()).toBe(true);
      const errorValue = combined.unwrapOrElse((err) => err);
      expect(errorValue).toBe("error2");
    });
  });

  describe("andThen()", () => {
    test("Ok.andThen(fn): fn の結果を返す", () => {
      const result = Result.ok(42);
      const chained = result.andThen((value) => Result.ok(value * 2));
      expect(chained.unwrap()).toBe(84);
    });

    test("Err.andThen(fn): self を返す", () => {
      const result = Result.err<number, string>("error");
      const chained = result.andThen((value) => Result.ok(value * 2));
      expect(chained.isErr()).toBe(true);
    });

    test("Ok.andThen(fn) で Err を返す", () => {
      const result = Result.ok<number, string>(42);
      const chained = result.andThen((_value) => Result.err("new error"));
      expect(chained.isErr()).toBe(true);
    });

    test("型変換チェーン (number → string → boolean)", () => {
      const result = Result.ok<number, string>(42);
      const chained = result
        .andThen((n) => Result.ok(n.toString())) // number → string
        .andThen((s) => Result.ok(s.length > 0)); // string → boolean
      expect(chained.unwrap()).toBe(true);
    });
  });

  describe("orElse()", () => {
    test("Ok.orElse(fn): self を返す", () => {
      const result = Result.ok<number, string>(42);
      const recovered = result.orElse((_error) => Result.ok(0));
      expect(recovered.unwrap()).toBe(42);
    });

    test("Err.orElse(fn): fn の結果を返す", () => {
      const result = Result.err<number, string>("error");
      const recovered = result.orElse((_error) => Result.ok(0));
      expect(recovered.unwrap()).toBe(0);
    });

    test("Err.orElse(fn) で別の Err を返す", () => {
      const result = Result.err<number, string>("error1");
      const recovered = result.orElse((_error) => Result.err("error2"));
      expect(recovered.isErr()).toBe(true);
    });
  });

  describe("toOption()", () => {
    test("Ok → Some への変換", () => {
      const result = Result.ok(42);
      const option = result.toOption();
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    test("Err → None への変換", () => {
      const result = Result.err("error");
      const option = result.toOption();
      expect(option.isNone()).toBe(true);
    });
  });

  describe("Result.fromNullable()", () => {
    test("null → Err", () => {
      const result = Result.fromNullable(null, "null error");
      expect(result.isErr()).toBe(true);
    });

    test("undefined → Err", () => {
      const result = Result.fromNullable(undefined, "undefined error");
      expect(result.isErr()).toBe(true);
    });

    test("値 → Ok", () => {
      const result = Result.fromNullable(42, "error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    test("0 → Ok (falsy だが null/undefined ではない)", () => {
      const result = Result.fromNullable(0, "error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(0);
    });

    test("空文字列 → Ok", () => {
      const result = Result.fromNullable("", "error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("");
    });
  });

  describe("Result.try()", () => {
    test("正常実行 → Ok", () => {
      const result = Result.try(() => 42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    test("例外発生 → Err", () => {
      const result = Result.try(() => {
        throw new Error("test error");
      });
      expect(result.isErr()).toBe(true);
    });

    test("例外をキャッチして Error として Err に保持する", () => {
      const result = Result.try<number, Error>(() => {
        throw new Error("test error");
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.unwrapOrElse((err) => {
          expect(err.message).toBe("test error");
          return 0;
        });
        expect(error).toBe(0);
      }
    });

    test("falsy な値（0）を返しても Ok になる", () => {
      const result = Result.try(() => 0);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(0);
    });

    test("falsy な値（空文字列）を返しても Ok になる", () => {
      const result = Result.try(() => "");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("");
    });

    test("falsy な値（false）を返しても Ok になる", () => {
      const result = Result.try(() => false);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
    });
  });

  describe("Result.tryAsync()", () => {
    test("Promise が resolve → Ok", async () => {
      const result = await Result.tryAsync(async () => 42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    test("Promise が reject → Err", async () => {
      const result = await Result.tryAsync(async () => {
        throw new Error("test error");
      });
      expect(result.isErr()).toBe(true);
    });

    test("Promise が reject → Err（エラー内容を確認）", async () => {
      const result = await Result.tryAsync<number, Error>(async () => {
        throw new Error("async test error");
      });
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        const error = result.unwrapOrElse((err) => {
          expect(err).toBeInstanceOf(Error);
          expect(err.message).toBe("async test error");
          return 0;
        });
        expect(error).toBe(0);
      }
    });

    test("非同期処理が正しく動作する", async () => {
      const result = await Result.tryAsync(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "success";
      });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("success");
    });

    test("falsy な値（0）を返しても Ok になる", async () => {
      const result = await Result.tryAsync(async () => 0);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(0);
    });

    test("falsy な値（空文字列）を返しても Ok になる", async () => {
      const result = await Result.tryAsync(async () => "");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("");
    });

    test("falsy な値（false）を返しても Ok になる", async () => {
      const result = await Result.tryAsync(async () => false);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
    });
  });

  describe("エッジケース", () => {
    test("Ok(null) は有効", () => {
      const result = Result.ok(null);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(null);
    });

    test("Ok(undefined) は有効", () => {
      const result = Result.ok(undefined);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(undefined);
    });

    test("Err(null) は有効", () => {
      const result = Result.err(null);
      expect(result.isErr()).toBe(true);
    });

    test("複数の map を連鎖できる", () => {
      const result = Result.ok(2)
        .map((x) => x * 3)
        .map((x) => x + 1)
        .map((x) => x.toString());
      expect(result.unwrap()).toBe("7");
    });

    test("複数の andThen を連鎖できる", () => {
      const result = Result.ok(2)
        .andThen((x) => Result.ok(x * 3))
        .andThen((x) => Result.ok(x + 1))
        .andThen((x) => Result.ok(x.toString()));
      expect(result.unwrap()).toBe("7");
    });
  });

  describe("Result.all()", () => {
    test("すべて Ok の場合: Ok<T[]> を返す", () => {
      const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);
    });

    test("1つでも Err がある場合: 最初の Err を返す", () => {
      const results = [
        Result.ok(1),
        Result.err<number, string>("error1"),
        Result.err<number, string>("error2"),
      ];
      const combined = Result.all(results);
      expect(combined.isErr()).toBe(true);

      let errorValue: string | null = null;
      combined.orElse((e) => {
        errorValue = e;
        return Result.err(e);
      });
      expect(errorValue).toBe("error1");
    });

    test("最初が Err の場合: すぐに Err を返す", () => {
      const results = [
        Result.err<number, string>("first error"),
        Result.ok(1),
        Result.ok(2),
      ];
      const combined = Result.all(results);
      expect(combined.isErr()).toBe(true);

      let errorValue: string | null = null;
      combined.orElse((e) => {
        errorValue = e;
        return Result.err(e);
      });
      expect(errorValue).toBe("first error");
    });

    test("空配列の場合: Ok([]) を返す", () => {
      const results: Result<number, string>[] = [];
      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([]);
    });

    test("readonly 配列を受け取れる", () => {
      const results: readonly Result<number, string>[] = [
        Result.ok(1),
        Result.ok(2),
      ];
      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2]);
    });

    test("異なる型の値を扱える", () => {
      const results = [Result.ok("hello"), Result.ok("world")];
      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual(["hello", "world"]);
    });
  });

  describe("Result.any()", () => {
    test("1つでも Ok がある場合: 最初の Ok を返す", () => {
      const results = [
        Result.err<number, string>("error1"),
        Result.ok(42),
        Result.ok(100),
      ];
      const combined = Result.any(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe(42);
    });

    test("最初が Ok の場合: すぐに Ok を返す", () => {
      const results = [
        Result.ok(1),
        Result.err<number, string>("error"),
        Result.ok(2),
      ];
      const combined = Result.any(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe(1);
    });

    test("すべて Err の場合: Err<E[]> を返す", () => {
      const results = [
        Result.err<number, string>("error1"),
        Result.err<number, string>("error2"),
        Result.err<number, string>("error3"),
      ];
      const combined = Result.any(results);
      expect(combined.isErr()).toBe(true);

      let errorValues: string[] | null = null;
      combined.orElse((errors) => {
        errorValues = errors;
        return Result.err(errors);
      });
      expect(errorValues).toEqual(["error1", "error2", "error3"]);
    });

    test("空配列の場合: Err([]) を返す", () => {
      const results: Result<number, string>[] = [];
      const combined = Result.any(results);
      expect(combined.isErr()).toBe(true);

      let errorValues: string[] | null = null;
      combined.orElse((errors) => {
        errorValues = errors;
        return Result.err(errors);
      });
      expect(errorValues).toEqual([]);
    });

    test("readonly 配列を受け取れる", () => {
      const results: readonly Result<number, string>[] = [
        Result.err("error"),
        Result.ok(42),
      ];
      const combined = Result.any(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe(42);
    });

    test("異なる型のエラーを扱える", () => {
      const results = [
        Result.err<number, string>("error1"),
        Result.err<number, string>("error2"),
      ];
      const combined = Result.any(results);
      expect(combined.isErr()).toBe(true);

      let errorValues: string[] | null = null;
      combined.orElse((errors) => {
        errorValues = errors;
        return Result.err(errors);
      });
      expect(errorValues).toEqual(["error1", "error2"]);
    });
  });
});
