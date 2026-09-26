import { describe, expect, test } from "vitest";
import { Result } from "../../src/index.js";

describe("Result.sequence", () => {
  test("should preserve intermediate success values", () => {
    const result = Result.sequence(function* () {
      const user = yield* Result.step(Result.ok({ name: "Alice" }));
      const count = yield* Result.step(Result.ok(3));
      return Result.ok({ name: user.name, count });
    });

    expect(result.unwrap()).toEqual({ name: "Alice", count: 3 });
  });

  test.each([0, 1, 2])(
    "should stop at the first Err at stage %s",
    (failedStage) => {
      const events: number[] = [];
      const original = Result.err<number, string>("original");
      const result = Result.sequence(function* () {
        for (let stage = 0; stage < 3; stage++) {
          events.push(stage);
          yield* Result.step(
            stage === failedStage ? original : Result.ok(stage),
          );
        }
        events.push(3);
        return Result.ok(42);
      });

      expect(result).toBe(original);
      expect(events).toEqual(
        Array.from({ length: failedStage + 1 }, (_, i) => i),
      );
    },
  );

  test.each(["complete", "return", "throw"])(
    "should preserve the Err unless finally throws: %s",
    (outcome) => {
      const events: string[] = [];
      const original = Result.err<number, string>("original");
      const cleanupError = { kind: "cleanup" };
      function run(): Result<number, string> {
        return Result.sequence(function* () {
          try {
            yield* Result.step(original);
            events.push("later");
            return Result.ok(42);
          } finally {
            events.push("cleanup");
            if (outcome === "throw") {
              // biome-ignore lint/correctness/noUnsafeFinally: Verify cleanup error precedence.
              throw cleanupError;
            }
            if (outcome === "return") {
              // biome-ignore lint/correctness/noUnsafeFinally: Verify the original Err survives a cleanup return.
              return Result.ok(99);
            }
          }
        });
      }

      if (outcome === "throw") {
        let observed: unknown = Symbol("unobserved");
        try {
          run();
        } catch (error) {
          observed = error;
        }
        expect(observed).toBe(cleanupError);
      } else {
        expect(run()).toBe(original);
      }
      expect(events).toEqual(["cleanup"]);
    },
  );

  test("should keep the first Err and close all outer finally blocks", () => {
    const events: string[] = [];
    const original = Result.err<number, string>("original");
    const result = Result.sequence(
      function* () {
        yield* Result.step(original);
        return Result.ok(42);
      },
      function* () {
        try {
          const cleanup = Result.sequence(
            function* () {
              events.push("inner");
              yield* Result.step(Result.err("inner cleanup failure"));
              events.push("later inner cleanup");
              return Result.ok(undefined);
            },
            function* () {
              events.push("middle");
              yield* Result.step(Result.err("middle cleanup failure"));
              events.push("later middle cleanup");
              return Result.ok(undefined);
            },
          );
          yield* Result.step(cleanup);
          return Result.ok(undefined);
        } finally {
          events.push("outer");
        }
      },
    );

    expect(result).toBe(original);
    expect(events).toEqual(["inner", "middle", "outer"]);
  });
});

describe("Result.sequenceAsync", () => {
  test("should preserve intermediate values from sync and async successes", async () => {
    const result = await Result.sequenceAsync(async function* () {
      const user = yield* Result.stepAsync(
        Promise.resolve(Result.ok({ name: "Alice" })),
      );
      const count = yield* Result.stepAsync(Result.ok(3));
      const enabled = yield* Result.step(Result.ok(true));
      return Result.ok({ name: user.name, count, enabled });
    });

    expect(result.unwrap()).toEqual({ name: "Alice", count: 3, enabled: true });
  });

  test.each(["complete", "return", "throw", "reject"])(
    "should stop async work and wait for finally: %s",
    async (outcome) => {
      const events: string[] = [];
      const original = Result.err<number, string>("original");
      const cleanupError = { kind: "cleanup" };
      const result = Result.sequenceAsync(async function* () {
        try {
          yield* Result.stepAsync(Promise.resolve(Result.ok(1)));
          yield* Result.stepAsync(Promise.resolve(original));
          events.push("later");
          return Result.ok(42);
        } finally {
          events.push("cleanup started");
          await Promise.resolve();
          events.push("cleanup finished");
          if (outcome === "throw") {
            // biome-ignore lint/correctness/noUnsafeFinally: Verify cleanup error precedence.
            throw cleanupError;
          }
          if (outcome === "reject") await Promise.reject(cleanupError);
          if (outcome === "return") {
            // biome-ignore lint/correctness/noUnsafeFinally: Verify the original Err survives a cleanup return.
            return Result.ok(99);
          }
        }
      });

      if (outcome === "throw" || outcome === "reject") {
        let observed: unknown = Symbol("unobserved");
        try {
          await result;
        } catch (error) {
          observed = error;
        }
        expect(observed).toBe(cleanupError);
      } else {
        expect(await result).toBe(original);
      }
      expect(events).toEqual(["cleanup started", "cleanup finished"]);
    },
  );

  test("should keep the first Err and await all outer finally blocks", async () => {
    const events: string[] = [];
    const original = Result.err<number, string>("original");
    const result = await Result.sequenceAsync(
      async function* () {
        yield* Result.stepAsync(Promise.resolve(original));
        return Result.ok(42);
      },
      async function* () {
        try {
          yield* Result.stepAsync(
            Result.sequenceAsync(
              async function* () {
                events.push("inner");
                yield* Result.stepAsync(
                  Promise.resolve(Result.err("inner cleanup failure")),
                );
                events.push("later inner cleanup");
                return Result.ok(undefined);
              },
              async function* () {
                events.push("middle");
                yield* Result.stepAsync(
                  Promise.resolve(Result.err("middle cleanup failure")),
                );
                events.push("later middle cleanup");
                return Result.ok(undefined);
              },
            ),
          );
          return Result.ok(undefined);
        } finally {
          await Promise.resolve();
          events.push("outer");
        }
      },
    );

    expect(result).toBe(original);
    expect(events).toEqual(["inner", "middle", "outer"]);
  });

  test("should await a Promise stored in the Ok value", async () => {
    const result = await Result.sequenceAsync(async function* () {
      const value = yield* Result.stepAsync(Result.ok(Promise.resolve(7)));
      return Result.ok(value);
    });
    expect(result.unwrap()).toBe(7);
  });

  test("should wait for pending cleanup before settling", async () => {
    let release: () => void = () => {};
    let started: () => void = () => {};
    const cleanupGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const cleanupStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const original = Result.err<number, string>("original");
    let settled = false;
    const result = Result.sequenceAsync(async function* () {
      try {
        yield* Result.stepAsync(original);
        return Result.ok(42);
      } finally {
        started();
        await cleanupGate;
      }
    }).finally(() => {
      settled = true;
    });

    const outcome = await Promise.race([
      cleanupStarted.then(() => "cleanup started"),
      result.then(() => "settled"),
    ]);
    try {
      expect(outcome).toBe("cleanup started");
      expect(settled).toBe(false);
    } finally {
      release();
    }
    expect(await result).toBe(original);
    expect(settled).toBe(true);
  });
});

describe("Result sequence cleanup", () => {
  const outcomes = ["ok", "err", "throw"] as const;
  const cases = [false, true].flatMap((asynchronous) =>
    outcomes.flatMap((bodyOutcome) =>
      outcomes.map((cleanupOutcome) => ({
        asynchronous,
        bodyOutcome,
        cleanupOutcome,
      })),
    ),
  );

  test.each(cases)(
    "should apply cleanup precedence: async=$asynchronous body=$bodyOutcome cleanup=$cleanupOutcome",
    async ({ asynchronous, bodyOutcome, cleanupOutcome }) => {
      const bodyOk = Result.ok(42);
      const bodyErr = Result.err("body failure");
      const cleanupErr = Result.err("cleanup failure");
      const bodyException = { kind: "body exception" };
      const cleanupException = { kind: "cleanup exception" };
      const events: string[] = [];

      function* body() {
        if (bodyOutcome === "throw") throw bodyException;
        if (bodyOutcome === "err") yield* Result.step(bodyErr);
        return bodyOk;
      }
      function* cleanup() {
        try {
          events.push("cleanup");
          if (cleanupOutcome === "throw") throw cleanupException;
          if (cleanupOutcome === "err") yield* Result.step(cleanupErr);
          events.push("later cleanup");
          return Result.ok("ignored cleanup value");
        } finally {
          events.push("cleanup closed");
        }
      }

      let result: unknown;
      let observed: unknown = Symbol("unobserved");
      try {
        result = asynchronous
          ? await Result.sequenceAsync(
              async function* () {
                return yield* body();
              },
              async function* () {
                return yield* cleanup();
              },
            )
          : Result.sequence(body, cleanup);
      } catch (error) {
        observed = error;
      }

      if (cleanupOutcome === "throw") {
        expect(observed).toBe(cleanupException);
      } else if (bodyOutcome === "throw") {
        expect(observed).toBe(bodyException);
      } else {
        expect(result).toBe(
          bodyOutcome === "err"
            ? bodyErr
            : cleanupOutcome === "err"
              ? cleanupErr
              : bodyOk,
        );
      }
      expect(events).toEqual(
        cleanupOutcome === "ok"
          ? ["cleanup", "later cleanup", "cleanup closed"]
          : ["cleanup", "cleanup closed"],
      );
    },
  );

  test("should await cleanup before propagating a rejected value", async () => {
    let release: () => void = () => {};
    let started: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const cleanupStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const bodyFailure = { kind: "body rejection" };
    let settled = false;
    const result = Result.sequenceAsync(
      async function* () {
        yield* Result.stepAsync(Promise.reject(bodyFailure));
        return Result.ok(42);
      },
      async function* () {
        started();
        await gate;
        yield* Result.stepAsync(Result.err("cleanup failure"));
        return Result.ok(undefined);
      },
    );
    const observed = result.then(
      (value) => {
        settled = true;
        return value;
      },
      (error: unknown) => {
        settled = true;
        return error;
      },
    );

    const first = await Promise.race([
      cleanupStarted.then(() => "cleanup started"),
      observed.then(() => "settled"),
    ]);
    try {
      expect(first).toBe("cleanup started");
      expect(settled).toBe(false);
    } finally {
      release();
    }
    expect(await observed).toBe(bodyFailure);
  });

  test.each([undefined, null, 0, "failure", { kind: "failure" }])(
    "should preserve arbitrary exception values through cleanup: %s",
    async (failure) => {
      let observed: unknown = Symbol("unobserved");
      try {
        Result.sequence(
          function* () {
            yield* Result.step(Result.ok(1));
            throw failure;
          },
          function* () {
            yield* Result.step(Result.err("cleanup failure"));
            return Result.ok(undefined);
          },
        );
      } catch (error) {
        observed = error;
      }
      expect(observed).toBe(failure);

      await expect(
        Result.sequenceAsync(
          async function* () {
            yield* Result.stepAsync(Promise.reject(failure));
            return Result.ok(42);
          },
          async function* () {
            yield* Result.stepAsync(Result.err("cleanup failure"));
            return Result.ok(undefined);
          },
        ),
      ).rejects.toBe(failure);

      await expect(
        Result.sequenceAsync(
          async function* () {
            yield* Result.stepAsync(Result.err("body failure"));
            return Result.ok(42);
          },
          async function* () {
            yield* Result.stepAsync(Promise.reject(failure));
            return Result.ok(undefined);
          },
        ),
      ).rejects.toBe(failure);
    },
  );
});

describe("Result sequences and exceptions", () => {
  test.each([false, true])(
    "should reject a step yielded from finally during closure: async=%s",
    async (asynchronous) => {
      const events: string[] = [];
      function* body() {
        try {
          try {
            yield* Result.step(Result.err("original"));
            return Result.ok(42);
          } finally {
            yield* Result.step(Result.err("unsupported cleanup"));
            events.push("later cleanup");
          }
        } finally {
          events.push("outer");
        }
      }

      const message = "Cannot yield from finally; use the cleanup argument";
      if (asynchronous) {
        await expect(
          Result.sequenceAsync(async function* () {
            return yield* body();
          }),
        ).rejects.toThrow(message);
      } else {
        expect(() => Result.sequence(body)).toThrow(message);
      }
      expect(events).toEqual(["outer"]);
    },
  );

  test.each([false, true])(
    "should preserve an exception when cleanup returns Err: async=%s",
    async (asynchronous) => {
      const failure = { kind: "cleanup exception" };
      const original = Result.err("original");
      const events: string[] = [];

      function* body() {
        try {
          yield* Result.step(original);
          return Result.ok(42);
        } finally {
          // biome-ignore lint/correctness/noUnsafeFinally: Regression for pending cleanup exceptions.
          throw failure;
        }
      }

      let observed: unknown = Symbol("unobserved");
      try {
        if (asynchronous) {
          await Result.sequenceAsync(
            async function* () {
              try {
                yield* Result.stepAsync(original);
                return Result.ok(42);
              } finally {
                await Promise.reject(failure);
              }
            },
            async function* () {
              try {
                events.push("cleanup");
                yield* Result.stepAsync(Result.err("cleanup failure"));
                events.push("later cleanup");
                return Result.ok(undefined);
              } finally {
                await Promise.resolve();
                events.push("outer");
              }
            },
          );
        } else {
          Result.sequence(body, function* () {
            try {
              events.push("cleanup");
              yield* Result.step(Result.err("cleanup failure"));
              events.push("later cleanup");
              return Result.ok(undefined);
            } finally {
              events.push("outer");
            }
          });
        }
      } catch (error) {
        observed = error;
      }
      expect(observed).toBe(failure);
      expect(events).toEqual(["cleanup", "outer"]);
    },
  );

  test.each([undefined, null, 0, "failure", { kind: "failure" }])(
    "should preserve thrown and rejected values: %s",
    async (failure) => {
      let observed: unknown = Symbol("unobserved");
      try {
        Result.sequence(function* () {
          yield* Result.step(Result.ok(1));
          throw failure;
        });
      } catch (error) {
        observed = error;
      }
      expect(observed).toBe(failure);

      await expect(
        Result.sequenceAsync(async function* () {
          yield* Result.stepAsync(Promise.reject(failure));
          return Result.ok(42);
        }),
      ).rejects.toBe(failure);
    },
  );
});
