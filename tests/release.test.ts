import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";

describe("Release notes", () => {
  test("renders a fix with the configured Conventional Commits preset", async () => {
    const cwd = fileURLToPath(new URL("../", import.meta.url));
    const config: {
      plugins: (string | [string, Record<string, unknown>])[];
    } = JSON.parse(
      readFileSync(new URL("../.releaserc.json", import.meta.url), "utf8"),
    );
    const plugin = config.plugins.find(
      (entry) =>
        Array.isArray(entry) &&
        entry[0] === "@semantic-release/release-notes-generator",
    );
    if (!Array.isArray(plugin)) {
      throw new Error("Release notes generator must be configured");
    }

    const require = createRequire(import.meta.url);
    const releaseRequire = createRequire(require.resolve("semantic-release"));
    const { generateNotes } = await import(
      pathToFileURL(releaseRequire.resolve(plugin[0])).href
    );
    const notes = await generateNotes(plugin[1], {
      cwd,
      commits: [
        {
          hash: "1234567890abcdef1234567890abcdef12345678",
          message: "fix(result): preserve tuple types in all",
        },
      ],
      lastRelease: { gitTag: "v2.1.0" },
      nextRelease: { version: "2.1.1", gitTag: "v2.1.1" },
      options: { repositoryUrl: "https://github.com/tr-yasuda/kitsunejs.git" },
    });

    expect(notes).toContain("2.1.1");
    expect(notes).toContain("### Bug Fixes");
    expect(notes).toContain("**result:** preserve tuple types in all");
  });
});
