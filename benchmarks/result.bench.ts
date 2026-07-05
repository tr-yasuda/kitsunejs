import { bench, describe } from "vitest";
import { Result } from "../src/core/result.js";

// Module-level sink to prevent the JIT from dead-code eliminating benchmark work.
let _sink: number;

const inputValue = 21;
const defaultValue = 0;
const errorMessage = "error";

function double(value: number): number {
  return value * 2;
}

function getInputValue(): number {
  return inputValue;
}

const okResult = Result.ok<number, string>(inputValue);
const errResult = Result.err<number, string>(errorMessage);
const benchmarkError = new Error(errorMessage);
const emptyArray: number[] = [];

const sizes = [10, 100, 1000];
const resultArrays = sizes.map((size) =>
  Array.from({ length: size }, (_, index) => Result.ok<number, string>(index)),
);

const earlyErrArray = [
  Result.err<number, string>(errorMessage),
  Result.ok<number, string>(1),
  Result.ok<number, string>(2),
];

describe("Result.map vs native try/catch", () => {
  bench("Result.ok(...).map(...).unwrapOr(...)", () => {
    _sink = okResult.map(double).unwrapOr(defaultValue);
  });

  bench("Result.err(...).map(...).unwrapOr(...)", () => {
    _sink = errResult.map(double).unwrapOr(defaultValue);
  });

  bench("native try/catch (success)", () => {
    try {
      _sink = getInputValue() * 2;
    } catch {
      _sink = defaultValue;
    }
  });

  bench("native try/catch (error)", () => {
    try {
      throw benchmarkError;
    } catch {
      _sink = defaultValue;
    }
  });
});

describe("Result.all", () => {
  for (let index = 0; index < sizes.length; index++) {
    const size = sizes[index];
    const results = resultArrays[index];

    bench(`Result.all (${size} items)`, () => {
      _sink = Result.all(results).unwrap().length;
    });
  }

  bench("Result.all (empty)", () => {
    _sink = Result.all([]).unwrap().length;
  });

  bench("Result.all (early Err)", () => {
    _sink = Result.all(earlyErrArray).unwrapOr(emptyArray).length;
  });
});
