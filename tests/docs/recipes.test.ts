import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, test, vi } from "vitest";
import { Result } from "../../src/core/result.js";

type User = { id: number; name: string };

function recipeCode(heading: string): string {
  const recipes = readFileSync(
    new URL("../../docs/recipes.md", import.meta.url),
    "utf8",
  );
  const section = recipes.split(heading)[1];
  const example = section?.match(/```typescript\n([\s\S]*?)\n```/)?.[1];
  if (!example) {
    throw new Error(`Recipe is missing: ${heading}`);
  }
  return example.replace(/^import .*;$/gm, "");
}

function loadApiRecipe(fetch: typeof globalThis.fetch): {
  fetchUser: (id: number) => Promise<Result<User, unknown>>;
} {
  const example = recipeCode("### 1.1 API Call Error Handling");
  const { outputText } = ts.transpileModule(`${example}\n({ fetchUser });`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  });
  return runInNewContext(outputText, { Result, fetch });
}

describe("Recipes API call error handling", () => {
  test("should type-check API recipes and their consumers", () => {
    const source = [
      'import { Result, Option } from "../src/index.js";',
      recipeCode("### 1.1 API Call Error Handling"),
      recipeCode("### 1.2 Unifying Multiple Error Types"),
      "type Data = { id: number; value: string };",
      "declare function getValue(): string | undefined;",
      ...[
        "### 3.1 Handling Promise Errors with Result",
        "### 3.2 Parallel Execution of Multiple Async Operations",
        "### 3.4 Converting an Existing Promise to Result",
        "### 5.2 Result.any - Fallback from Multiple Backends",
        "### 3. Specify Types Explicitly",
        "### 7.3 Mapping Both Branches",
      ].map(
        (heading, index) =>
          `async function example${index}() {\n${recipeCode(heading)}\n}`,
      ),
    ].join("\n");
    const fileName = fileURLToPath(
      new URL("../../docs/recipes.typecheck.ts", import.meta.url),
    );
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (
      path,
      languageVersion,
      onError,
      shouldCreateNewFile,
    ) =>
      path === fileName
        ? ts.createSourceFile(path, source, languageVersion, true)
        : getSourceFile(path, languageVersion, onError, shouldCreateNewFile);
    const program = ts.createProgram([fileName], options, host);
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      );

    expect(diagnostics).toEqual([]);
  });

  test("should return successful user data", async () => {
    const user = { id: 123, name: "Alice" };
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(Response.json(user));
    const { fetchUser } = loadApiRecipe(fetch);

    const result = await fetchUser(123);

    expect(result.unwrap()).toEqual(user);
  });

  test.each([200, 500])(
    "should preserve body-reading failures as unexpected for HTTP %s",
    async (status) => {
      const cause = new Error("Response body failed");
      const stream = new ReadableStream({
        start(controller) {
          controller.error(cause);
        },
      });
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(stream, { status }));
      const { fetchUser } = loadApiRecipe(fetch);

      const result = await fetchUser(123);

      expect(result.unwrapErr()).toEqual({ type: "unexpected", cause });
      expect((result.unwrapErr() as { cause: unknown }).cause).toBe(cause);
    },
  );

  test("should preserve JSON parsing failures as unexpected", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("invalid JSON"));
    const { fetchUser } = loadApiRecipe(fetch);

    const result = await fetchUser(123);

    expect(result.unwrapErr()).toEqual({
      type: "unexpected",
      cause: expect.any(SyntaxError),
    });
  });

  test("should preserve synchronous fetch failures as unexpected", async () => {
    const cause = new Error("Synchronous failure");
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(() => {
      throw cause;
    });
    const { fetchUser } = loadApiRecipe(fetch);

    const result = await fetchUser(123);

    expect(result.unwrapErr()).toEqual({ type: "unexpected", cause });
    expect((result.unwrapErr() as { cause: unknown }).cause).toBe(cause);
  });

  test("should preserve HTTP status and response text", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response("User not found", { status: 404 }));
    const { fetchUser } = loadApiRecipe(fetch);

    const result = await fetchUser(123);

    expect(result.unwrapErr()).toEqual({
      type: "http",
      status: 404,
      message: "User not found",
    });
  });

  test.each([
    new TypeError("Failed to fetch"),
    "rejected string",
    42,
    null,
    undefined,
    { type: "http", status: 503, message: "Not an HTTP response" },
  ])(
    "should preserve an arbitrary rejection as unexpected: %s",
    async (cause) => {
      const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(cause);
      const { fetchUser } = loadApiRecipe(fetch);

      const result = await fetchUser(123);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toEqual({ type: "unexpected", cause });
      expect((result.unwrapErr() as { cause: unknown }).cause).toBe(cause);
    },
  );
});
