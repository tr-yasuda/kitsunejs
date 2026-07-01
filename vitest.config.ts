import path from "node:path";
import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    exclude: [".worktrees/**", ...defaultExclude],
    typecheck: {
      enabled: true,
      exclude: [".worktrees/**", ...defaultExclude],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "tests/**",
        "**/*.test.ts",
        "**/*.test-d.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
