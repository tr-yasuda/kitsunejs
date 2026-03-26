# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the library source. Public exports are collected in
`src/index.ts`, while core primitives live in `src/core/` (`result.ts`,
`option.ts`, `errors.ts`). Tests mirror the source layout under `tests/`:
runtime coverage uses `*.test.ts`, and type-level checks use `*.test-d.ts`.
User-facing docs live in `docs/`. Build output is written to `dist/` by `tsup`
and should never be edited by hand.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies with the pinned `pnpm@10.20.0`.
- `pnpm type-check`: run `tsc --noEmit`.
- `pnpm lint`: run Biome checks for formatting and lint rules.
- `pnpm format`: apply Biome fixes and import organization.
- `pnpm test`: run the full Vitest suite.
- `pnpm test -- tests/core/result.test.ts`: run a single test file.
- `pnpm test:coverage`: generate V8 coverage output.
- `pnpm build`: bundle ESM, CJS, and declarations into `dist/`.

Before opening a PR, run `pnpm lint && pnpm type-check && pnpm test && pnpm build`.

## Coding Style & Naming Conventions

Use TypeScript with ESM imports and explicit `.js` extensions for local modules.
Formatting is enforced by Biome and `.editorconfig`: 2-space indentation, LF,
UTF-8, trailing newline, and 80-character lines. Prefer `type` over
`interface`, `function` declarations over top-level arrow functions, and
explicit return types on functions. Use `camelCase` for variables/functions,
`PascalCase` for types/classes, and `UPPER_CASE` for constants.

## Testing Guidelines

Vitest is the test runner. Add or update tests for every behavior change, and
keep test paths aligned with the source tree. Name tests descriptively, for
example `describe("Result.map", ...)` and `it("should transform Ok value", ...)`.
Aim to preserve the project’s high coverage bar and include error-path and
edge-case checks, not only happy paths.

## Commit & Pull Request Guidelines

Follow Conventional Commits such as `feat(result): add flatten method` or
`fix(option): preserve None in andThen`. Keep PRs focused on one change, link
related issues when applicable, and update docs or examples when public APIs
change. Fill out the PR template and ensure local checks pass before requesting
review.
