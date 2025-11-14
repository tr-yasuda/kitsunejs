import { describe, expect, test } from "vitest";
import { UnwrapError } from "@/core/errors.js";
import { Err, Ok, Result } from "@/core/result.js";

describe("Result", () => {
  describe("Result.ok()", () => {
    test("creates a basic value", () => {
      const result = Result.ok(42);
      expect(result).toBeInstanceOf(Ok);
      expect(result.tag).toBe("Ok");
    });

    test("isOk() returns true", () => {
      const result = Result.ok(42);
      expect(result.isOk()).toBe(true);
    });

    test("isErr() returns false", () => {
      const result = Result.ok(42);
      expect(result.isErr()).toBe(false);
    });

    test("unwrap() retrieves the value", () => {
      const result = Result.ok(42);
      expect(result.unwrap()).toBe(42);
    });
  });

  describe("Result.err()", () => {
    test("creates a basic error", () => {
      const result = Result.err("error");
      expect(result).toBeInstanceOf(Err);
      expect(result.tag).toBe("Err");
    });

    test("isOk() returns false", () => {
      const result = Result.err("error");
      expect(result.isOk()).toBe(false);
    });

    test("isErr() returns true", () => {
      const result = Result.err("error");
      expect(result.isErr()).toBe(true);
    });

    test("unwrap() throws an exception", () => {
      const result = Result.err("error");
      expect(() => result.unwrap()).toThrow(UnwrapError);
    });
  });

  describe("unwrap()", () => {
    test("Ok case: returns the value", () => {
      const result = Result.ok(42);
      expect(result.unwrap()).toBe(42);
    });

    test("Err case: throws an exception", () => {
      const result = Result.err("error");
      expect(() => result.unwrap()).toThrow(UnwrapError);
    });
  });

  describe("expect()", () => {
    test("Ok case: returns the value", () => {
      const result = Result.ok(42);
      expect(result.expect("custom message")).toBe(42);
    });

    test("Err case: throws an exception with custom message", () => {
      const result = Result.err("error");
      expect(() => result.expect("custom message")).toThrow(UnwrapError);
    });
  });

  describe("unwrapErr()", () => {
    test("Err case: returns the error value", () => {
      const result = Result.err("error message");
      expect(result.unwrapErr()).toBe("error message");
    });

    test("Ok case: throws an exception", () => {
      const result = Result.ok(42);
      expect(() => result.unwrapErr()).toThrow(UnwrapError);
    });
  });

  describe("unwrapOr()", () => {
    test("Ok case: returns the original value", () => {
      const result = Result.ok(42);
      expect(result.unwrapOr(0)).toBe(42);
    });

    test("Err case: returns the default value", () => {
      const result = Result.err<number, string>("error");
      expect(result.unwrapOr(0)).toBe(0);
    });
  });

  describe("unwrapOrElse()", () => {
    test("Ok case: returns the original value", () => {
      const result = Result.ok(42);
      expect(result.unwrapOrElse((_error) => 0)).toBe(42);
    });

    test("Err case: returns the function result", () => {
      const result = Result.err<number, string>("error");
      expect(result.unwrapOrElse((error) => error.length)).toBe(5);
    });
  });

  describe("map()", () => {
    test("Ok case: map is applied", () => {
      const result = Result.ok(42);
      const mapped = result.map((value) => value * 2);
      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe(84);
    });

    test("Err case: map is skipped", () => {
      const result = Result.err<number, string>("error");
      const mapped = result.map((value) => value * 2);
      expect(mapped.isErr()).toBe(true);
    });

    test("type conversion works correctly", () => {
      const result = Result.ok(42);
      const mapped = result.map((value) => value.toString());
      expect(mapped.unwrap()).toBe("42");
    });
  });

  describe("mapErr()", () => {
    test("Ok case: mapErr is skipped", () => {
      const result = Result.ok<number, string>(42);
      const mapped = result.mapErr((error) => error.length);
      expect(mapped.isOk()).toBe(true);
      expect(mapped.unwrap()).toBe(42);
    });

    test("Err case: mapErr is applied and type conversion works correctly", () => {
      const result = Result.err<number, string>("error");
      const mapped = result.mapErr((error) => error.length);
      expect(mapped.isErr()).toBe(true);
      const errorValue = mapped.unwrapOrElse((err) => err);
      expect(errorValue).toBe(5);
    });
  });

  describe("and()", () => {
    test("Ok.and(other): returns other", () => {
      const result1 = Result.ok(42);
      const result2 = Result.ok("hello");
      const combined = result1.and(result2);
      expect(combined.unwrap()).toBe("hello");
    });

    test("Err.and(other): returns self", () => {
      const result1 = Result.err("error1");
      const result2 = Result.ok("hello");
      const combined = result1.and(result2);
      expect(combined.isErr()).toBe(true);
      const errorValue = combined.unwrapOrElse((err) => err);
      expect(errorValue).toBe("error1");
    });

    test("Ok.and(Err): returns Err", () => {
      const result1 = Result.ok<number, string>(42);
      const result2 = Result.err("error2");
      const combined = result1.and<string>(result2);
      expect(combined.isErr()).toBe(true);
      const errorValue = combined.unwrapOrElse((err) => err);
      expect(errorValue).toBe("error2");
    });
  });

  describe("or()", () => {
    test("Ok.or(other): returns self", () => {
      const result1 = Result.ok(42);
      const result2 = Result.ok(100);
      const combined = result1.or(result2);
      expect(combined.unwrap()).toBe(42);
    });

    test("Err.or(other): returns other", () => {
      const result1 = Result.err<number, string>("error1");
      const result2 = Result.ok(100);
      const combined = result1.or(result2);
      expect(combined.unwrap()).toBe(100);
    });

    test("Err.or(Err): returns the second Err", () => {
      const result1 = Result.err<string, string>("error1");
      const result2 = Result.err<string, string>("error2");
      const combined = result1.or(result2);
      expect(combined.isErr()).toBe(true);
      const errorValue = combined.unwrapOrElse((err) => err);
      expect(errorValue).toBe("error2");
    });
  });

  describe("andThen()", () => {
    test("Ok.andThen(fn): returns fn result", () => {
      const result = Result.ok(42);
      const chained = result.andThen((value) => Result.ok(value * 2));
      expect(chained.unwrap()).toBe(84);
    });

    test("Err.andThen(fn): returns self", () => {
      const result = Result.err<number, string>("error");
      const chained = result.andThen((value) => Result.ok(value * 2));
      expect(chained.isErr()).toBe(true);
    });

    test("Ok.andThen(fn) returns Err", () => {
      const result = Result.ok<number, string>(42);
      const chained = result.andThen((_value) => Result.err("new error"));
      expect(chained.isErr()).toBe(true);
    });

    test("type conversion chain (number → string → boolean)", () => {
      const result = Result.ok<number, string>(42);
      const chained = result
        .andThen((n) => Result.ok(n.toString())) // number → string
        .andThen((s) => Result.ok(s.length > 0)); // string → boolean
      expect(chained.unwrap()).toBe(true);
    });
  });

  describe("orElse()", () => {
    test("Ok.orElse(fn): returns self", () => {
      const result = Result.ok<number, string>(42);
      const recovered = result.orElse((_error) => Result.ok(0));
      expect(recovered.unwrap()).toBe(42);
    });

    test("Err.orElse(fn): returns fn result", () => {
      const result = Result.err<number, string>("error");
      const recovered = result.orElse((_error) => Result.ok(0));
      expect(recovered.unwrap()).toBe(0);
    });

    test("Err.orElse(fn) returns another Err", () => {
      const result = Result.err<number, string>("error1");
      const recovered = result.orElse((_error) => Result.err("error2"));
      expect(recovered.isErr()).toBe(true);
    });
  });

  describe("toOption()", () => {
    test("Ok → Some conversion", () => {
      const result = Result.ok(42);
      const option = result.toOption();
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    test("Err → None conversion", () => {
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

    test("value → Ok", () => {
      const result = Result.fromNullable(42, "error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    test("0 → Ok (falsy but not null/undefined)", () => {
      const result = Result.fromNullable(0, "error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(0);
    });

    test("empty string → Ok", () => {
      const result = Result.fromNullable("", "error");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("");
    });
  });

  describe("Result.try()", () => {
    test("successful execution → Ok", () => {
      const result = Result.try(() => 42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    test("exception thrown → Err", () => {
      const result = Result.try(() => {
        throw new Error("test error");
      });
      expect(result.isErr()).toBe(true);
    });

    test("catches exception and holds it as Error in Err", () => {
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

    test("falsy value (0) still becomes Ok", () => {
      const result = Result.try(() => 0);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(0);
    });

    test("falsy value (empty string) still becomes Ok", () => {
      const result = Result.try(() => "");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("");
    });

    test("falsy value (false) still becomes Ok", () => {
      const result = Result.try(() => false);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
    });
  });

  describe("Result.tryAsync()", () => {
    test("Promise resolves → Ok", async () => {
      const result = await Result.tryAsync(async () => 42);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    test("Promise rejects → Err", async () => {
      const result = await Result.tryAsync(async () => {
        throw new Error("test error");
      });
      expect(result.isErr()).toBe(true);
    });

    test("Promise rejects → Err (verify error content)", async () => {
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

    test("async operation works correctly", async () => {
      const result = await Result.tryAsync(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "success";
      });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("success");
    });

    test("falsy value (0) still becomes Ok", async () => {
      const result = await Result.tryAsync(async () => 0);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(0);
    });

    test("falsy value (empty string) still becomes Ok", async () => {
      const result = await Result.tryAsync(async () => "");
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe("");
    });

    test("falsy value (false) still becomes Ok", async () => {
      const result = await Result.tryAsync(async () => false);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("Ok(null) is valid", () => {
      const result = Result.ok(null);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(null);
    });

    test("Ok(undefined) is valid", () => {
      const result = Result.ok(undefined);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(undefined);
    });

    test("Err(null) is valid", () => {
      const result = Result.err(null);
      expect(result.isErr()).toBe(true);
    });

    test("can chain multiple maps", () => {
      const result = Result.ok(2)
        .map((x) => x * 3)
        .map((x) => x + 1)
        .map((x) => x.toString());
      expect(result.unwrap()).toBe("7");
    });

    test("can chain multiple andThens", () => {
      const result = Result.ok(2)
        .andThen((x) => Result.ok(x * 3))
        .andThen((x) => Result.ok(x + 1))
        .andThen((x) => Result.ok(x.toString()));
      expect(result.unwrap()).toBe("7");
    });
  });

  describe("Result.all()", () => {
    test("all Ok: returns Ok<T[]>", () => {
      const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2, 3]);
    });

    test("contains at least one Err: returns first Err", () => {
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

    test("first is Err: returns Err immediately", () => {
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

    test("empty array: returns Ok([])", () => {
      const results: Result<number, string>[] = [];
      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([]);
    });

    test("accepts readonly array", () => {
      const results: readonly Result<number, string>[] = [
        Result.ok(1),
        Result.ok(2),
      ];
      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual([1, 2]);
    });

    test("can handle different types", () => {
      const results = [Result.ok("hello"), Result.ok("world")];
      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toEqual(["hello", "world"]);
    });
  });

  describe("Result.any()", () => {
    test("contains at least one Ok: returns first Ok", () => {
      const results = [
        Result.err<number, string>("error1"),
        Result.ok(42),
        Result.ok(100),
      ];
      const combined = Result.any(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe(42);
    });

    test("first is Ok: returns Ok immediately", () => {
      const results = [
        Result.ok(1),
        Result.err<number, string>("error"),
        Result.ok(2),
      ];
      const combined = Result.any(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe(1);
    });

    test("all Err: returns Err<E[]>", () => {
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

    test("empty array: returns Err([])", () => {
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

    test("accepts readonly array", () => {
      const results: readonly Result<number, string>[] = [
        Result.err("error"),
        Result.ok(42),
      ];
      const combined = Result.any(results);
      expect(combined.isOk()).toBe(true);
      expect(combined.unwrap()).toBe(42);
    });

    test("can handle different error types", () => {
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
