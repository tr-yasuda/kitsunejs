import { bench, describe } from "vitest";
import { Option } from "@/core/option.js";

describe("Option.map vs native null check", () => {
  bench("Option.some(...).map(...).unwrapOr(...)", () => {
    Option.some(21)
      .map((value) => value * 2)
      .unwrapOr(0);
  });

  bench("Option.none().map(...).unwrapOr(...)", () => {
    Option.none<number>()
      .map((value) => value * 2)
      .unwrapOr(0);
  });

  bench("native null check (some)", () => {
    const value = 21;
    const _result = value !== null && value !== undefined ? value * 2 : 0;
  });

  bench("native null check (none)", () => {
    const value: number | null = null;
    const _result = value !== null && value !== undefined ? value * 2 : 0;
  });
});

describe("Option.all", () => {
  for (const size of [10, 100, 1000]) {
    const options = Array.from({ length: size }, (_, index) =>
      Option.some(index),
    );

    bench(`Option.all (${size} items)`, () => {
      Option.all(options);
    });
  }

  bench("Option.all (empty)", () => {
    Option.all([]);
  });

  bench("Option.all (early None)", () => {
    Option.all([Option.none<number>(), Option.some(1), Option.some(2)]);
  });
});
