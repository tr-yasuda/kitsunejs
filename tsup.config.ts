import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  // tsup internally sets baseUrl for DTS generation, which triggers a
  // TypeScript 6.0 deprecation warning (TS5101). Keep the suppression scoped
  // to the DTS build until tsup removes the baseUrl fallback.
  // See: https://github.com/egoist/tsup/issues/1389
  dts: {
    compilerOptions: {
      ignoreDeprecations: "6.0",
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  target: "es2020",
  treeshake: true,
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
});
