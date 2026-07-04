import { bench, describe } from "vitest";
import { Result } from "@/core/result.js";

describe("Result.map vs native try/catch", () => {
  bench("Result.ok(...).map(...).unwrapOr(...)", () => {
    Result.ok(21)
      .map((value) => value * 2)
      .unwrapOr(0);
  });

  bench("Result.err(...).map(...).unwrapOr(...)", () => {
    Result.err<number, string>("error")
      .map((value) => value * 2)
      .unwrapOr(0);
  });

  bench("native try/catch (success)", () => {
    let _value: number;
    try {
      _value = 21 * 2;
    } catch {
      _value = 0;
    }
  });

  bench("native try/catch (error)", () => {
    let _value: number;
    try {
      throw new Error("error");
    } catch {
      _value = 0;
    }
  });
});

describe("Result.all", () => {
  for (const size of [10, 100, 1000]) {
    const results = Array.from({ length: size }, (_, index) =>
      Result.ok<number, string>(index),
    );

    bench(`Result.all (${size} items)`, () => {
      Result.all(results);
    });
  }

  bench("Result.all (empty)", () => {
    Result.all([]);
  });

  bench("Result.all (early Err)", () => {
    Result.all([
      Result.err<number, string>("error"),
      Result.ok<number, string>(1),
      Result.ok<number, string>(2),
    ]);
  });
});
