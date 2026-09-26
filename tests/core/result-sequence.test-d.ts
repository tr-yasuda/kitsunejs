import { expectTypeOf, test } from "vitest";
import { type Err, Result } from "../../src/index.js";

type User = { name: string };
type LookupError = { kind: "lookup" };
type SettingsError = { kind: "settings" };
type FinalError = { kind: "final" };

declare function findUser(): Result<User, LookupError>;
declare function parseSettings(user: User): Result<number, SettingsError>;
declare function finish(
  user: User,
  count: number,
): Result<{ user: User; count: number }, FinalError>;
declare function findUserAsync(): Promise<Result<User, LookupError>>;
declare function finishAsync(
  user: User,
  count: number,
): Promise<Result<{ user: User; count: number }, FinalError>>;
type CleanupError = { kind: "cleanup" };
declare function releaseUser(user: User): Result<boolean, CleanupError>;

test("infers cleanup errors without changing the body success type", () => {
  const result = Result.sequence(
    function* () {
      yield* Result.step(findUser());
      return Result.ok(42);
    },
    function* () {
      const user = yield* Result.step(findUser());
      const released = yield* Result.step(releaseUser(user));
      expectTypeOf(released).toEqualTypeOf<boolean>();
      return Result.err({ kind: "final" as const });
    },
  );
  expectTypeOf(result).toEqualTypeOf<
    Result<number, LookupError | CleanupError | FinalError>
  >();

  const asyncResult = Result.sequenceAsync(
    async function* () {
      yield* Result.stepAsync(findUserAsync());
      return Result.ok(42);
    },
    async function* () {
      const user = yield* Result.stepAsync(findUserAsync());
      yield* Result.stepAsync(Promise.resolve(releaseUser(user)));
      return Result.err({ kind: "final" as const });
    },
  );
  expectTypeOf(asyncResult).toEqualTypeOf<
    Promise<Result<number, LookupError | CleanupError | FinalError>>
  >();
});

test("infers every success value and all step and return errors", () => {
  const result = Result.sequence(function* () {
    const user = yield* Result.step(findUser());
    expectTypeOf(user).toEqualTypeOf<User>();
    const count = yield* Result.step(parseSettings(user));
    expectTypeOf(count).toEqualTypeOf<number>();
    return finish(user, count);
  });

  expectTypeOf(result).toEqualTypeOf<
    Result<
      { user: User; count: number },
      LookupError | SettingsError | FinalError
    >
  >();
});

test("infers async values and unions step and final Result errors", () => {
  const result = Result.sequenceAsync(async function* () {
    const user = yield* Result.stepAsync(findUserAsync());
    expectTypeOf(user).toEqualTypeOf<User>();
    const count = yield* Result.stepAsync(parseSettings(user));
    expectTypeOf(count).toEqualTypeOf<number>();
    return finishAsync(user, count);
  });

  expectTypeOf(result).toEqualTypeOf<
    Promise<
      Result<
        { user: User; count: number },
        LookupError | SettingsError | FinalError
      >
    >
  >();
});

test("requires an explicit Result return", () => {
  // @ts-expect-error Ordinary values are not valid sequence returns.
  Result.sequence(function* () {
    yield* Result.step(Result.ok(1));
    return 42;
  });
  // @ts-expect-error Ordinary values are not valid async sequence returns.
  Result.sequenceAsync(async function* () {
    yield* Result.stepAsync(Result.ok(1));
    return 42;
  });
  Result.sequence(
    function* () {
      yield* Result.step(Result.ok(1));
      return Result.ok(42);
    },
    // @ts-expect-error Cleanup generators must explicitly return a Result.
    function* () {
      yield* Result.step(Result.ok(1));
      return undefined;
    },
  );
  Result.sequenceAsync(
    async function* () {
      yield* Result.stepAsync(Result.ok(1));
      return Result.ok(42);
    },
    // @ts-expect-error Async cleanup must explicitly return a Result.
    async function* () {
      yield* Result.stepAsync(Result.ok(1));
      return undefined;
    },
  );
});

test("matches async generator awaiting of a Promise success value", () => {
  Result.sequenceAsync(async function* () {
    const value = yield* Result.stepAsync(Result.ok(Promise.resolve(7)));
    expectTypeOf(value).toEqualTypeOf<number>();
    return Result.ok(value);
  });
});

test("infers errors from explicit final branches and never for only Ok", () => {
  const result = Result.sequence(function* () {
    const user = yield* Result.step(findUser());
    if (user.name.length === 0) return Result.err({ kind: "final" as const });
    return Result.ok(user.name.length);
  });
  expectTypeOf(result).toEqualTypeOf<
    Result<number, LookupError | FinalError>
  >();

  const allOk = Result.sequence(function* () {
    const value = yield* Result.step(Result.ok(1));
    return Result.ok(value);
  });
  expectTypeOf(allOk).toEqualTypeOf<Result<number, never>>();

  const allOkWithCleanup = Result.sequence(
    function* () {
      yield* Result.step(Result.ok(1));
      return Result.ok(42);
    },
    function* () {
      yield* Result.step(Result.ok(true));
      return Result.ok("ignored cleanup value");
    },
  );
  expectTypeOf(allOkWithCleanup).toEqualTypeOf<Result<number, never>>();
});

test("types async delegation with the awaited success value", () => {
  const delegate = Result.stepAsync(Result.ok(Promise.resolve(7)));
  expectTypeOf(delegate).toEqualTypeOf<
    AsyncGenerator<Err<never, never>, number, unknown>
  >();

  const syncDelegate = Result.step(Result.ok(Promise.resolve(7)));
  expectTypeOf(syncDelegate).toEqualTypeOf<
    Generator<Err<never, never>, Promise<number>, unknown>
  >();
});

test("rejects unsupported yielded values and generator kinds", () => {
  // @ts-expect-error Only failures yielded by steps belong in a sequence.
  Result.sequence(function* () {
    yield Result.ok(1);
    return Result.ok(42);
  });
  Result.sequence(function* () {
    // @ts-expect-error Async helpers cannot be delegated from a sync generator.
    yield* Result.stepAsync(Result.ok(1));
    return Result.ok(42);
  });
  // @ts-expect-error Async generators must use sequenceAsync.
  Result.sequence(async function* () {
    yield* Result.stepAsync(Result.ok(1));
    return Result.ok(42);
  });
  // @ts-expect-error A synchronous step does not accept a Promise.
  Result.step(Promise.resolve(Result.ok(1)));
});

test("infers union inputs without annotations on the producing function", () => {
  function read(flag: boolean) {
    if (flag) return Result.ok(1);
    return Result.ok("one");
  }

  const result = Result.sequence(function* () {
    const value = yield* Result.step(read(true));
    expectTypeOf(value).toEqualTypeOf<number | string>();
    return Result.ok(value);
  });
  expectTypeOf(result).toEqualTypeOf<Result<number | string, never>>();

  const asyncResult = Result.sequenceAsync(async function* () {
    const value = yield* Result.stepAsync(Promise.resolve(read(true)));
    expectTypeOf(value).toEqualTypeOf<number | string>();
    return Result.ok(value);
  });
  expectTypeOf(asyncResult).toEqualTypeOf<
    Promise<Result<number | string, never>>
  >();
});

test("infers success and error unions from inferred producer branches", () => {
  function read(branch: number) {
    if (branch === 0) return Result.ok(1);
    if (branch === 1) return Result.ok("one");
    if (branch === 2) return Result.err({ kind: "lookup" as const });
    return Result.err({ kind: "settings" as const });
  }

  const result = Result.sequence(function* () {
    const value = yield* Result.step(read(0));
    expectTypeOf(value).toEqualTypeOf<number | string>();
    return Result.ok(value);
  });
  expectTypeOf(result).toEqualTypeOf<
    Result<number | string, LookupError | SettingsError>
  >();

  const asyncResult = Result.sequenceAsync(async function* () {
    const value = yield* Result.stepAsync(Promise.resolve(read(0)));
    expectTypeOf(value).toEqualTypeOf<number | string>();
    return Result.ok(value);
  });
  expectTypeOf(asyncResult).toEqualTypeOf<
    Promise<Result<number | string, LookupError | SettingsError>>
  >();
});
