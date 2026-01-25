import { describe, expect, test } from "vitest";
import { UnwrapError } from "@/core/errors.js";
import { None, Option, Some } from "@/core/option.js";

describe("Option", () => {
  describe("Option.some()", () => {
    test("creates a basic value", () => {
      const option = Option.some(42);
      expect(option).toBeInstanceOf(Some);
      expect(option.tag).toBe("Some");
    });

    test("isSome() returns true", () => {
      const option = Option.some(42);
      expect(option.isSome()).toBe(true);
    });

    test("isNone() returns false", () => {
      const option = Option.some(42);
      expect(option.isNone()).toBe(false);
    });

    test("unwrap() retrieves the value", () => {
      const option = Option.some(42);
      expect(option.unwrap()).toBe(42);
    });
  });

  describe("Option.none()", () => {
    test("creates None", () => {
      const option = Option.none();
      expect(option).toBeInstanceOf(None);
      expect(option.tag).toBe("None");
    });

    test("isSome() returns false", () => {
      const option = Option.none();
      expect(option.isSome()).toBe(false);
    });

    test("isNone() returns true", () => {
      const option = Option.none();
      expect(option.isNone()).toBe(true);
    });

    test("unwrap() throws an exception", () => {
      const option = Option.none();
      expect(() => option.unwrap()).toThrow(UnwrapError);
    });
  });

  describe("isSomeAnd()", () => {
    test("Some: returns predicate result and calls predicate", () => {
      const option = Option.some(42);
      let calledWith: number | null = null;

      const result = option.isSomeAnd((value) => {
        calledWith = value;
        return value > 0;
      });

      expect(result).toBe(true);
      expect(calledWith).toBe(42);
    });

    test("Some: predicate false returns false", () => {
      const option = Option.some(42);
      expect(option.isSomeAnd((value) => value < 0)).toBe(false);
    });

    test("None: returns false and does not call predicate", () => {
      const option = Option.none<number>();
      let called = 0;

      const result = option.isSomeAnd((_value) => {
        called += 1;
        return true;
      });

      expect(result).toBe(false);
      expect(called).toBe(0);
    });
  });

  describe("isNoneOr()", () => {
    test("None: returns true and does not call predicate", () => {
      const option = Option.none<number>();
      let called = 0;

      const result = option.isNoneOr((_value) => {
        called += 1;
        return false;
      });

      expect(result).toBe(true);
      expect(called).toBe(0);
    });

    test("Some: returns predicate result", () => {
      const option = Option.some(42);
      expect(option.isNoneOr((value) => value < 0)).toBe(false);
      expect(option.isNoneOr((value) => value > 0)).toBe(true);
    });
  });

  describe("unwrap()", () => {
    test("Some case: returns the value", () => {
      const option = Option.some(42);
      expect(option.unwrap()).toBe(42);
    });

    test("None case: throws an exception", () => {
      const option = Option.none();
      expect(() => option.unwrap()).toThrow(UnwrapError);
    });
  });

  describe("expect()", () => {
    test("Some case: returns the value", () => {
      const option = Option.some(42);
      expect(option.expect("custom message")).toBe(42);
    });

    test("None case: throws an exception with custom message", () => {
      const option = Option.none();
      expect(() => option.expect("custom message")).toThrow(UnwrapError);
      expect(() => option.expect("custom message")).toThrow("custom message");
    });
  });

  describe("unwrapOr()", () => {
    test("Some case: returns the original value", () => {
      const option = Option.some(42);
      expect(option.unwrapOr(0)).toBe(42);
    });

    test("None case: returns the default value", () => {
      const option = Option.none<number>();
      expect(option.unwrapOr(0)).toBe(0);
    });
  });

  describe("unwrapOrElse()", () => {
    test("Some case: returns the original value", () => {
      const option = Option.some(42);
      expect(option.unwrapOrElse(() => 0)).toBe(42);
    });

    test("None case: returns the function result", () => {
      const option = Option.none<number>();
      expect(option.unwrapOrElse(() => 100)).toBe(100);
    });
  });

  describe("map()", () => {
    test("Some case: map is applied", () => {
      const option = Option.some(42);
      const mapped = option.map((value) => value * 2);
      expect(mapped.isSome()).toBe(true);
      expect(mapped.unwrap()).toBe(84);
    });

    test("None case: map is skipped", () => {
      const option = Option.none<number>();
      const mapped = option.map((value) => value * 2);
      expect(mapped.isNone()).toBe(true);
    });

    test("type conversion works correctly", () => {
      const option = Option.some(42);
      const mapped = option.map((value) => value.toString());
      expect(mapped.unwrap()).toBe("42");
    });
  });

  describe("mapOr()", () => {
    test("Some case: returns mapped value", () => {
      const option = Option.some(21);
      const result = option.mapOr(0, (value) => value * 2);
      expect(result).toBe(42);
    });

    test("None case: returns default value without calling fn", () => {
      const option = Option.none<number>();
      const result = option.mapOr(42, (_value) => {
        throw new Error("mapOr fn should not be called for None");
      });
      expect(result).toBe(42);
    });
  });

  describe("mapOrElse()", () => {
    test("Some case: returns mapped value without calling defaultFn", () => {
      const option = Option.some(21);
      const result = option.mapOrElse(
        () => {
          throw new Error("mapOrElse defaultFn should not be called for Some");
        },
        (value) => value * 2,
      );
      expect(result).toBe(42);
    });

    test("None case: returns defaultFn result without calling fn", () => {
      const option = Option.none<number>();
      const result = option.mapOrElse(
        () => 42,
        (_value) => {
          throw new Error("mapOrElse fn should not be called for None");
        },
      );
      expect(result).toBe(42);
    });

    test("None case: defaultFn is called exactly once", () => {
      const option = Option.none<number>();
      let called = 0;

      const result = option.mapOrElse(
        () => {
          called += 1;
          return 42;
        },
        (_value) => 0,
      );

      expect(result).toBe(42);
      expect(called).toBe(1);
    });
  });

  describe("and()", () => {
    test("Some.and(other): returns other", () => {
      const option1 = Option.some(42);
      const option2 = Option.some("hello");
      const combined = option1.and(option2);
      expect(combined.unwrap()).toBe("hello");
    });

    test("None.and(other): returns None", () => {
      const option1 = Option.none<number>();
      const option2 = Option.some("hello");
      const combined = option1.and(option2);
      expect(combined.isNone()).toBe(true);
    });

    test("Some.and(None): returns None", () => {
      const option1 = Option.some(42);
      const option2 = Option.none<string>();
      const combined = option1.and(option2);
      expect(combined.isNone()).toBe(true);
    });
  });

  describe("or()", () => {
    test("Some.or(other): returns self", () => {
      const option1 = Option.some(42);
      const option2 = Option.some(100);
      const combined = option1.or(option2);
      expect(combined.unwrap()).toBe(42);
    });

    test("None.or(other): returns other", () => {
      const option1 = Option.none<number>();
      const option2 = Option.some(100);
      const combined = option1.or(option2);
      expect(combined.unwrap()).toBe(100);
    });

    test("None.or(None): returns None", () => {
      const option1 = Option.none<number>();
      const option2 = Option.none<number>();
      const combined = option1.or(option2);
      expect(combined.isNone()).toBe(true);
    });
  });

  describe("andThen()", () => {
    test("Some.andThen(fn): returns fn result", () => {
      const option = Option.some(42);
      const chained = option.andThen((value) => Option.some(value * 2));
      expect(chained.unwrap()).toBe(84);
    });

    test("None.andThen(fn): returns None", () => {
      const option = Option.none<number>();
      const chained = option.andThen((value) => Option.some(value * 2));
      expect(chained.isNone()).toBe(true);
    });

    test("Some.andThen(fn) returns None", () => {
      const option = Option.some(42);
      const chained = option.andThen((_value) => Option.none<number>());
      expect(chained.isNone()).toBe(true);
    });

    test("type conversion chain (number → string → boolean)", () => {
      const option = Option.some(42);
      const chained = option
        .andThen((n) => Option.some(n.toString())) // number → string
        .andThen((s) => Option.some(s.length > 0)); // string → boolean
      expect(chained.unwrap()).toBe(true);
    });
  });

  describe("filter()", () => {
    test("Some with predicate true: returns Some", () => {
      const option = Option.some(42);
      const filtered = option.filter((value) => value > 0);
      expect(filtered.isSome()).toBe(true);
      expect(filtered.unwrap()).toBe(42);
    });

    test("Some with predicate false: returns None", () => {
      const option = Option.some(42);
      const filtered = option.filter((value) => value < 0);
      expect(filtered.isNone()).toBe(true);
    });

    test("None: returns None", () => {
      const option = Option.none<number>();
      const filtered = option.filter((value) => value > 0);
      expect(filtered.isNone()).toBe(true);
    });

    test("filtering with complex condition", () => {
      const option = Option.some("hello");
      const filtered = option.filter((value) => value.length > 3);
      expect(filtered.isSome()).toBe(true);
      expect(filtered.unwrap()).toBe("hello");
    });
  });

  describe("toResult()", () => {
    test("Some → Ok conversion", () => {
      const option = Option.some(42);
      const result = option.toResult("error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    test("None → Err conversion", () => {
      const option = Option.none<number>();
      const result = option.toResult("error");
      expect(result.isErr()).toBe(true);
    });

    test("error message is preserved", () => {
      const option = Option.none<number>();
      const result = option.toResult("custom error");

      expect(result.isErr()).toBe(true);

      const marker = result.unwrapOrElse((err) => {
        return err === "custom error" ? -1 : 0;
      });

      expect(marker).toBe(-1);
    });
  });

  describe("toResultElse()", () => {
    test("Some → Ok conversion without calling error fn", () => {
      const option = Option.some(42);
      const result = option.toResultElse(() => {
        throw new Error("toResultElse fn should not be called for Some");
      });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    test("None → Err conversion", () => {
      const option = Option.none<number>();
      const result = option.toResultElse(() => "error");
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
    });

    test("None case: error fn is called exactly once", () => {
      const option = Option.none<number>();
      let called = 0;

      const result = option.toResultElse(() => {
        called += 1;
        return "error";
      });

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe("error");
      expect(called).toBe(1);
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

    test("value → Some", () => {
      const option = Option.fromNullable(42);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    test("0 → Some (falsy but not null/undefined)", () => {
      const option = Option.fromNullable(0);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(0);
    });

    test("empty string → Some", () => {
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

  describe("edge cases", () => {
    test("Some(null) is valid", () => {
      const option = Option.some(null);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(null);
    });

    test("Some(undefined) is valid", () => {
      const option = Option.some(undefined);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(undefined);
    });

    test("can chain multiple maps", () => {
      const option = Option.some(2)
        .map((x) => x * 3)
        .map((x) => x + 1)
        .map((x) => x.toString());
      expect(option.unwrap()).toBe("7");
    });

    test("can chain multiple andThens", () => {
      const option = Option.some(2)
        .andThen((x) => Option.some(x * 3))
        .andThen((x) => Option.some(x + 1))
        .andThen((x) => Option.some(x.toString()));
      expect(option.unwrap()).toBe("7");
    });

    test("can chain map and filter", () => {
      const option = Option.some(5)
        .map((x) => x * 2)
        .filter((x) => x > 8)
        .map((x) => x.toString());
      expect(option.unwrap()).toBe("10");
    });

    test("chaining after filter returns None", () => {
      const option = Option.some(5)
        .filter((x) => x > 10)
        .map((x) => x * 2);
      expect(option.isNone()).toBe(true);
    });
  });

  describe("interconversion with Result", () => {
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

  describe("Option.all()", () => {
    test("all Some: returns Some<T[]>", () => {
      const options = [Option.some(1), Option.some(2), Option.some(3)];
      const combined = Option.all(options);
      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);
    });

    test("contains at least one None: returns None", () => {
      const options = [Option.some(1), Option.none<number>(), Option.some(3)];
      const combined = Option.all(options);
      expect(combined.isNone()).toBe(true);
    });

    test("first is None: returns None immediately", () => {
      const options = [Option.none<number>(), Option.some(1), Option.some(2)];
      const combined = Option.all(options);
      expect(combined.isNone()).toBe(true);
    });

    test("empty array: returns Some([])", () => {
      const options: Option<number>[] = [];
      const combined = Option.all(options);
      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toEqual([]);
    });

    test("accepts readonly array", () => {
      const options: readonly Option<number>[] = [
        Option.some(1),
        Option.some(2),
      ];
      const combined = Option.all(options);
      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2]);
    });

    test("can handle different types", () => {
      const options = [Option.some("hello"), Option.some("world")];
      const combined = Option.all(options);
      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toEqual(["hello", "world"]);
    });
  });

  describe("Option.any()", () => {
    test("contains at least one Some: returns first Some", () => {
      const options = [
        Option.none<number>(),
        Option.some(42),
        Option.some(100),
      ];
      const combined = Option.any(options);
      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toBe(42);
    });

    test("first is Some: returns Some immediately", () => {
      const options = [Option.some(1), Option.none<number>(), Option.some(2)];
      const combined = Option.any(options);
      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toBe(1);
    });

    test("all None: returns None", () => {
      const options = [
        Option.none<number>(),
        Option.none<number>(),
        Option.none<number>(),
      ];
      const combined = Option.any(options);
      expect(combined.isNone()).toBe(true);
    });

    test("empty array: returns None", () => {
      const options: Option<number>[] = [];
      const combined = Option.any(options);
      expect(combined.isNone()).toBe(true);
    });

    test("accepts readonly array", () => {
      const options: readonly Option<number>[] = [
        Option.none(),
        Option.some(42),
      ];
      const combined = Option.any(options);
      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toBe(42);
    });

    test("can handle different types", () => {
      const options = [Option.some("first"), Option.some("second")];
      const combined = Option.any(options);
      expect(combined.isSome()).toBe(true);
      expect(combined.unwrap()).toBe("first");
    });
  });
});
