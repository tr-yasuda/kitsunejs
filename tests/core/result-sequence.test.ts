import { describe, expect, test } from "vitest";
import { Result } from "../../src/index.js";

describe("Result.sequence", () => {
  test("should preserve intermediate success values", () => {
    let released = false;
    const result = Result.sequence(function* () {
      try {
        const user = yield* Result.step(Result.ok({ name: "Alice" }));
        const count = yield* Result.step(Result.ok(3));
        return Result.ok({ name: user.name, count });
      } finally {
        released = true;
      }
    });

    expect(result.unwrap()).toEqual({ name: "Alice", count: 3 });
    expect(released).toBe(true);
  });

  test.each([0, 1, 2])(
    "should stop at the first Err at stage %s",
    (failedStage) => {
      const events: number[] = [];
      let released = false;
      const original = Result.err<number, string>("original");
      const result = Result.sequence(function* () {
        try {
          for (let stage = 0; stage < 3; stage++) {
            events.push(stage);
            yield* Result.step(
              stage === failedStage ? original : Result.ok(stage),
            );
          }
          events.push(3);
          return Result.ok(42);
        } finally {
          released = true;
        }
      });

      expect(result).toBe(original);
      expect(events).toEqual(
        Array.from({ length: failedStage + 1 }, (_, i) => i),
      );
      expect(released).toBe(true);
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
});

describe("Result.sequenceAsync", () => {
  test("should preserve intermediate values from sync and async successes", async () => {
    let released = false;
    const result = await Result.sequenceAsync(async function* () {
      try {
        const user = yield* Result.stepAsync(
          Promise.resolve(Result.ok({ name: "Alice" })),
        );
        const count = yield* Result.stepAsync(Result.ok(3));
        const enabled = yield* Result.step(Result.ok(true));
        return Result.ok({ name: user.name, count, enabled });
      } finally {
        await Promise.resolve();
        released = true;
      }
    });

    expect(result.unwrap()).toEqual({ name: "Alice", count: 3, enabled: true });
    expect(released).toBe(true);
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

      const message =
        "Cannot yield from finally; put fallible Result steps in the body";
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

  test.each([undefined, null, 0, "failure", { kind: "failure" }])(
    "should preserve thrown and rejected values: %s",
    async (failure) => {
      let observed: unknown = Symbol("unobserved");
      let released = false;
      try {
        Result.sequence(function* () {
          try {
            yield* Result.step(Result.ok(1));
            throw failure;
          } finally {
            released = true;
          }
        });
      } catch (error) {
        observed = error;
      }
      expect(observed).toBe(failure);
      expect(released).toBe(true);

      let asyncReleased = false;
      await expect(
        Result.sequenceAsync(async function* () {
          try {
            yield* Result.stepAsync(Promise.reject(failure));
            return Result.ok(42);
          } finally {
            await Promise.resolve();
            asyncReleased = true;
          }
        }),
      ).rejects.toBe(failure);
      expect(asyncReleased).toBe(true);
    },
  );
});
