import { bench, describe } from "vitest";
import { Option } from "../src/core/option.js";

// Module-level sink to prevent the JIT from dead-code eliminating benchmark work.
let _sink: number;

const inputValue = 21;
const defaultValue = 0;

function double(value: number): number {
  return value * 2;
}

const someOption = Option.some(inputValue);
const noneOption = Option.none<number>();

function getSomeInput(): number | null {
  return inputValue;
}

function getNoneInput(): number | null {
  return null;
}

const sizes = [10, 100, 1000];
const optionArrays = sizes.map((size) =>
  Array.from({ length: size }, (_, index) => Option.some(index)),
);

const earlyNoneArray = [Option.none<number>(), Option.some(1), Option.some(2)];
const emptyArray: number[] = [];

describe("Option.map vs native null check", () => {
  bench("Option.some(...).map(...).unwrapOr(...)", () => {
    _sink = someOption.map(double).unwrapOr(defaultValue);
  });

  bench("Option.none().map(...).unwrapOr(...)", () => {
    _sink = noneOption.map(double).unwrapOr(defaultValue);
  });

  bench("native null check (some)", () => {
    const value = getSomeInput();
    _sink = value !== null ? value * 2 : defaultValue;
  });

  bench("native null check (none)", () => {
    const value = getNoneInput();
    _sink = value !== null ? value * 2 : defaultValue;
  });
});

describe("Option.all", () => {
  for (let index = 0; index < sizes.length; index++) {
    const size = sizes[index];
    const options = optionArrays[index];

    bench(`Option.all (${size} items)`, () => {
      _sink = Option.all(options).unwrap().length;
    });
  }

  bench("Option.all (empty)", () => {
    _sink = Option.all([]).unwrap().length;
  });

  bench("Option.all (early None)", () => {
    _sink = Option.all(earlyNoneArray).unwrapOr(emptyArray).length;
  });
});
