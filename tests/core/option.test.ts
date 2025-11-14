import { describe, expect, test } from "vitest";
import { UnwrapError } from "@/core/errors.js";
import { None, Option, Some } from "@/core/option.js";

describe("Option", () => {
  describe("Option.some()", () => {
    test("基本的な値の生成", () => {
      const option = Option.some(42);
      expect(option).toBeInstanceOf(Some);
      expect(option.tag).toBe("Some");
    });

    test("isSome() が true を返す", () => {
      const option = Option.some(42);
      expect(option.isSome()).toBe(true);
    });

    test("isNone() が false を返す", () => {
      const option = Option.some(42);
      expect(option.isNone()).toBe(false);
    });

    test("unwrap() で値を取得できる", () => {
      const option = Option.some(42);
      expect(option.unwrap()).toBe(42);
    });
  });

  describe("Option.none()", () => {
    test("None の生成", () => {
      const option = Option.none();
      expect(option).toBeInstanceOf(None);
      expect(option.tag).toBe("None");
    });

    test("isSome() が false を返す", () => {
      const option = Option.none();
      expect(option.isSome()).toBe(false);
    });

    test("isNone() が true を返す", () => {
      const option = Option.none();
      expect(option.isNone()).toBe(true);
    });

    test("unwrap() で例外が発生する", () => {
      const option = Option.none();
      expect(() => option.unwrap()).toThrow(UnwrapError);
    });
  });

  describe("unwrap()", () => {
    test("Some の場合: 値を返す", () => {
      const option = Option.some(42);
      expect(option.unwrap()).toBe(42);
    });

    test("None の場合: 例外を投げる", () => {
      const option = Option.none();
      expect(() => option.unwrap()).toThrow(UnwrapError);
    });
  });

  describe("expect()", () => {
    test("Some の場合: 値を返す", () => {
      const option = Option.some(42);
      expect(option.expect("custom message")).toBe(42);
    });

    test("None の場合: カスタムメッセージで例外を投げる", () => {
      const option = Option.none();
      expect(() => option.expect("custom message")).toThrow(UnwrapError);
      expect(() => option.expect("custom message")).toThrow("custom message");
    });
  });

  describe("unwrapOr()", () => {
    test("Some の場合: 元の値を返す", () => {
      const option = Option.some(42);
      expect(option.unwrapOr(0)).toBe(42);
    });

    test("None の場合: デフォルト値を返す", () => {
      const option = Option.none<number>();
      expect(option.unwrapOr(0)).toBe(0);
    });
  });

  describe("unwrapOrElse()", () => {
    test("Some の場合: 元の値を返す", () => {
      const option = Option.some(42);
      expect(option.unwrapOrElse(() => 0)).toBe(42);
    });

    test("None の場合: 関数の結果を返す", () => {
      const option = Option.none<number>();
      expect(option.unwrapOrElse(() => 100)).toBe(100);
    });
  });

  describe("map()", () => {
    test("Some の場合: map が適用される", () => {
      const option = Option.some(42);
      const mapped = option.map((value) => value * 2);
      expect(mapped.isSome()).toBe(true);
      expect(mapped.unwrap()).toBe(84);
    });

    test("None の場合: map がスキップされる", () => {
      const option = Option.none<number>();
      const mapped = option.map((value) => value * 2);
      expect(mapped.isNone()).toBe(true);
    });

    test("型変換が正しく動作する", () => {
      const option = Option.some(42);
      const mapped = option.map((value) => value.toString());
      expect(mapped.unwrap()).toBe("42");
    });
  });

  describe("and()", () => {
    test("Some.and(other): other を返す", () => {
      const option1 = Option.some(42);
      const option2 = Option.some("hello");
      const combined = option1.and(option2);
      expect(combined.unwrap()).toBe("hello");
    });

    test("None.and(other): None を返す", () => {
      const option1 = Option.none<number>();
      const option2 = Option.some("hello");
      const combined = option1.and(option2);
      expect(combined.isNone()).toBe(true);
    });

    test("Some.and(None): None を返す", () => {
      const option1 = Option.some(42);
      const option2 = Option.none<string>();
      const combined = option1.and(option2);
      expect(combined.isNone()).toBe(true);
    });
  });

  describe("or()", () => {
    test("Some.or(other): self を返す", () => {
      const option1 = Option.some(42);
      const option2 = Option.some(100);
      const combined = option1.or(option2);
      expect(combined.unwrap()).toBe(42);
    });

    test("None.or(other): other を返す", () => {
      const option1 = Option.none<number>();
      const option2 = Option.some(100);
      const combined = option1.or(option2);
      expect(combined.unwrap()).toBe(100);
    });

    test("None.or(None): None を返す", () => {
      const option1 = Option.none<number>();
      const option2 = Option.none<number>();
      const combined = option1.or(option2);
      expect(combined.isNone()).toBe(true);
    });
  });

  describe("andThen()", () => {
    test("Some.andThen(fn): fn の結果を返す", () => {
      const option = Option.some(42);
      const chained = option.andThen((value) => Option.some(value * 2));
      expect(chained.unwrap()).toBe(84);
    });

    test("None.andThen(fn): None を返す", () => {
      const option = Option.none<number>();
      const chained = option.andThen((value) => Option.some(value * 2));
      expect(chained.isNone()).toBe(true);
    });

    test("Some.andThen(fn) で None を返す", () => {
      const option = Option.some(42);
      const chained = option.andThen((_value) => Option.none<number>());
      expect(chained.isNone()).toBe(true);
    });

    test("型変換チェーン (number → string → boolean)", () => {
      const option = Option.some(42);
      const chained = option
        .andThen((n) => Option.some(n.toString())) // number → string
        .andThen((s) => Option.some(s.length > 0)); // string → boolean
      expect(chained.unwrap()).toBe(true);
    });
  });

  describe("filter()", () => {
    test("Some で predicate が true: Some を返す", () => {
      const option = Option.some(42);
      const filtered = option.filter((value) => value > 0);
      expect(filtered.isSome()).toBe(true);
      expect(filtered.unwrap()).toBe(42);
    });

    test("Some で predicate が false: None を返す", () => {
      const option = Option.some(42);
      const filtered = option.filter((value) => value < 0);
      expect(filtered.isNone()).toBe(true);
    });

    test("None: None を返す", () => {
      const option = Option.none<number>();
      const filtered = option.filter((value) => value > 0);
      expect(filtered.isNone()).toBe(true);
    });

    test("複雑な条件でフィルタリング", () => {
      const option = Option.some("hello");
      const filtered = option.filter((value) => value.length > 3);
      expect(filtered.isSome()).toBe(true);
      expect(filtered.unwrap()).toBe("hello");
    });
  });

  describe("toResult()", () => {
    test("Some → Ok への変換", () => {
      const option = Option.some(42);
      const result = option.toResult("error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    test("None → Err への変換", () => {
      const option = Option.none<number>();
      const result = option.toResult("error");
      expect(result.isErr()).toBe(true);
    });

    test("エラーメッセージが保存される", () => {
      const option = Option.none<number>();
      const result = option.toResult("custom error");

      expect(result.isErr()).toBe(true);

      const marker = result.unwrapOrElse((err) => {
        return err === "custom error" ? -1 : 0;
      });

      expect(marker).toBe(-1);
    });
  });

  describe("Option.fromNullable()", () => {
    test("null → None", () => {
      const option = Option.fromNullable(null);
      expect(option.isNone()).toBe(true);
    });

    test("undefined → None", () => {
      const option = Option.fromNullable(undefined);
      expect(option.isNone()).toBe(true);
    });

    test("値 → Some", () => {
      const option = Option.fromNullable(42);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    test("0 → Some (falsy だが null/undefined ではない)", () => {
      const option = Option.fromNullable(0);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(0);
    });

    test("空文字列 → Some", () => {
      const option = Option.fromNullable("");
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe("");
    });

    test("false → Some", () => {
      const option = Option.fromNullable(false);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(false);
    });
  });

  describe("エッジケース", () => {
    test("Some(null) は有効", () => {
      const option = Option.some(null);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(null);
    });

    test("Some(undefined) は有効", () => {
      const option = Option.some(undefined);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(undefined);
    });

    test("複数の map を連鎖できる", () => {
      const option = Option.some(2)
        .map((x) => x * 3)
        .map((x) => x + 1)
        .map((x) => x.toString());
      expect(option.unwrap()).toBe("7");
    });

    test("複数の andThen を連鎖できる", () => {
      const option = Option.some(2)
        .andThen((x) => Option.some(x * 3))
        .andThen((x) => Option.some(x + 1))
        .andThen((x) => Option.some(x.toString()));
      expect(option.unwrap()).toBe("7");
    });

    test("map と filter を連鎖できる", () => {
      const option = Option.some(5)
        .map((x) => x * 2)
        .filter((x) => x > 8)
        .map((x) => x.toString());
      expect(option.unwrap()).toBe("10");
    });

    test("filter で None になった後の連鎖", () => {
      const option = Option.some(5)
        .filter((x) => x > 10)
        .map((x) => x * 2);
      expect(option.isNone()).toBe(true);
    });
  });

  describe("Result との相互変換", () => {
    test("Some → Result → Option", () => {
      const option = Option.some(42);
      const result = option.toResult("error");
      const backToOption = result.toOption();
      expect(backToOption.isSome()).toBe(true);
      expect(backToOption.unwrap()).toBe(42);
    });

    test("None → Result → Option", () => {
      const option = Option.none<number>();
      const result = option.toResult("error");
      const backToOption = result.toOption();
      expect(backToOption.isNone()).toBe(true);
    });
  });
});
