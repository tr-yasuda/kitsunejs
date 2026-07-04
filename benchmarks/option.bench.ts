import { bench, describe } from "vitest";
import { Option } from "@/core/option.js";

// Module-level sink to prevent the JIT from dead-code eliminating benchmark work.
let _sink: number;

const inputValue = 21;
const defaultValue = 0;

function double(value: number): number {
  return value * 2;
}

const someOption = Option.some(inputValue);
const noneOption = Option.none<number>();

const someInput: number | null = inputValue;
const noneInput: number | null = null;

const sizes = [10, 100, 1000];
const optionArrays = sizes.map((size) =>
  Array.from({ length: size }, (_, index) => Option.some(index)),
);

const earlyNoneArray = [Option.none<number>(), Option.some(1), Option.some(2)];

describe("Option.map vs native null check", () => {
  bench("Option.some(...).map(...).unwrapOr(...)", () => {
    _sink = someOption.map(double).unwrapOr(defaultValue);
  });

  bench("Option.none().map(...).unwrapOr(...)", () => {
    _sink = noneOption.map(double).unwrapOr(defaultValue);
  });

  bench("native null check (some)", () => {
    _sink =
      someInput !== null && someInput !== undefined
        ? someInput * 2
        : defaultValue;
  });

  bench("native null check (none)", () => {
    _sink =
      noneInput !== null && noneInput !== undefined
        ? noneInput * 2
        : defaultValue;
  });
});

describe("Option.all", () => {
  for (let index = 0; index < sizes.length; index++) {
    const size = sizes[index];
    const options = optionArrays[index];

    bench(`Option.all (${size} items)`, () => {
      _sink = Option.all(options).unwrapOr([]).length;
    });
  }

  bench("Option.all (empty)", () => {
    _sink = Option.all([]).unwrapOr([]).length;
  });

  bench("Option.all (early None)", () => {
    _sink = Option.all(earlyNoneArray).unwrapOr([]).length;
  });
});
