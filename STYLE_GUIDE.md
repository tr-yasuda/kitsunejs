# kitsunejs Style Guide

This document outlines the coding standards and best practices for contributing to **kitsunejs**. Following these guidelines ensures consistency, maintainability, and quality across the codebase.

---

## Table of Contents

1. [Type Definitions](#type-definitions)
2. [Functions](#functions)
3. [Naming Conventions](#naming-conventions)
4. [Asynchronous Code](#asynchronous-code)
5. [Error Handling](#error-handling)
6. [Imports](#imports)
7. [Comments and Documentation](#comments-and-documentation)
8. [Testing](#testing)
9. [Automated Checks](#automated-checks)

---

## Type Definitions

### ✅ Use `type` instead of `interface`

**Rule**: Always use `type` for type definitions. The use of `interface` is prohibited.

#### ❌ Bad

```typescript
interface User {
  name: string;
  age: number;
}

interface Result<T, E> {
  isOk(): boolean;
  isErr(): boolean;
}
```

#### ✅ Good

```typescript
type User = {
  name: string;
  age: number;
};

type Result<T, E> = {
  isOk(): boolean;
  isErr(): boolean;
};
```

**Rationale**:
- **Consistency**: Using a single keyword for all type definitions reduces cognitive load
- **Flexibility**: `type` can represent union types, primitives, and complex types
- **Functional alignment**: Aligns with the functional programming approach of the library

### Type Aliases for Primitives and Unions

```typescript
// Primitive alias
type UserId = number;

// Union type
type Status = "pending" | "success" | "error";

// Complex union
type Response<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };
```

---

## Functions

### ✅ Use `function` declarations for top-level functions

**Rule**: Use `function` declarations instead of arrow functions for top-level functions.

#### ❌ Bad

```typescript
const add = (a: number, b: number): number => {
  return a + b;
};

const processResult = <T, E>(result: Result<T, E>): T | null => {
  return result.isOk() ? result.unwrap() : null;
};
```

#### ✅ Good

```typescript
function add(a: number, b: number): number {
  return a + b;
}

function processResult<T, E>(result: Result<T, E>): T | null {
  return result.isOk() ? result.unwrap() : null;
}
```

**Rationale**:
- **Hoisting**: Function declarations are hoisted, making code organization more flexible
- **Readability**: Clear function names are more visible in the code
- **Debugging**: Named functions appear in stack traces with their actual names

### ✅ Arrow functions are allowed as arguments

**Rule**: Use arrow functions when passing functions as arguments (e.g., in `map`, `filter`, `forEach`).

#### ✅ Good

```typescript
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);

result.map((value) => value.toString());

option.andThen((user) => findUserProfile(user.id));
```

### ✅ Always specify return types

**Rule**: Explicitly declare the return type for all functions.

#### ❌ Bad

```typescript
function calculate(x: number, y: number) {
  return x + y;
}
```

#### ✅ Good

```typescript
function calculate(x: number, y: number): number {
  return x + y;
}
```

**Rationale**:
- **Type safety**: Prevents accidental return type changes
- **Documentation**: Makes the function's contract clear
- **Autocomplete**: Improves IDE support

---

## Naming Conventions

Follow these naming conventions consistently:

| Type               | Convention                            | Example                               |
|--------------------|---------------------------------------|---------------------------------------|
| **Variables**      | `camelCase`                           | `userName`, `totalCount`              |
| **Functions**      | `camelCase`                           | `calculateTotal()`, `processResult()` |
| **Types**          | `PascalCase`                          | `User`, `Result`, `OptionType`        |
| **Classes**        | `PascalCase`                          | `ResultImpl`, `OptionImpl`            |
| **Constants**      | `UPPER_CASE`                          | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`  |
| **Private fields** | `_camelCase` (prefix with underscore) | `_internalState`                      |

### Examples

```typescript
// Variables and functions
const userCount = 10;
function getUserById(id: number): Option<User> { ... }

// Types
type User = {
  id: number;
  name: string;
};

type Result<T, E> = Ok<T> | Err<E>;

// Constants
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT_MS = 5000;

// Private fields (if using classes)
class ResultImpl<T, E> {
  private _value: T | E;
  private _isOk: boolean;
}
```

---

## Asynchronous Code

### ✅ Use `async/await` for asynchronous operations

**Rule**: Always use `async/await` for handling asynchronous code. Avoid using `.then()/.catch()` chains.

#### ❌ Bad

```typescript
function fetchUser(id: number): Promise<User> {
  return fetch(`/api/users/${id}`)
    .then((response) => response.json())
    .then((data) => data as User)
    .catch((error) => {
      console.error(error);
      throw error;
    });
}
```

#### ✅ Good

```typescript
async function fetchUser(id: number): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();
    return data as User;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
```

### ✅ Prefer `Result.tryAsync` for safer error handling

```typescript
async function fetchUser(id: number): Promise<Result<User, Error>> {
  return Result.tryAsync(async () => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as User;
  });
}
```

**Rationale**:
- **Readability**: `async/await` is more readable and easier to follow
- **Error handling**: Explicit `try/catch` blocks make error handling clearer
- **Consistency**: Aligns with modern JavaScript/TypeScript practices

---

## Error Handling

### ❌ Never use `any`

**Rule**: The use of `any` is strictly prohibited. Use `unknown` or generics instead.

#### ❌ Bad

```typescript
function parseJSON(json: string): any {
  return JSON.parse(json);
}

function handleError(error: any): void {
  console.error(error.message);
}
```

#### ✅ Good

```typescript
function parseJSON<T>(json: string): T {
  return JSON.parse(json) as T;
}

function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
}
```

**Rationale**:
- **Type safety**: `any` bypasses TypeScript's type checking, defeating its purpose
- **Maintainability**: Explicit types make code easier to understand and refactor
- **Reliability**: Catches potential runtime errors at compile time

### ✅ Handle exceptions explicitly

**Rule**: Always handle exceptions explicitly. Do not silently ignore errors.

#### ❌ Bad

```typescript
try {
  riskyOperation();
} catch (error) {
  // Silent failure
}
```

#### ✅ Good

```typescript
try {
  riskyOperation();
} catch (error) {
  if (error instanceof Error) {
    console.error("Operation failed:", error.message);
    // Re-throw or return a Result
    throw error;
  }
}
```

### ✅ Prefer `Result` type for error handling

```typescript
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Result.err("Division by zero");
  }
  return Result.ok(a / b);
}
```

---

## Imports

### Import Order

Organize imports in the following order:

1. **External libraries** (from `node_modules`)
2. **Internal modules** (project code)
3. **Type-only imports** (using `import type`)

Add a blank line between each group.

#### ✅ Good

```typescript
// External libraries
import { describe, it, expect } from "vitest";

// Internal modules
import { Result } from "../src/core/result";
import { Option } from "../src/core/option";

// Type-only imports
import type { User } from "../src/types";
import type { Config } from "../src/config";
```

### Use Named Imports

**Rule**: Prefer named imports over default imports for clarity.

#### ✅ Good

```typescript
import { Result, Option } from "kitsunejs";
```

#### ⚠️ Avoid (unless necessary)

```typescript
import kitsune from "kitsunejs";
```

---

## Comments and Documentation

### JSDoc for Public APIs

**Rule**: All public APIs must include JSDoc comments.

#### ✅ Good

```typescript
/**
 * Maps a Result<T, E> to Result<U, E> by applying a function to the contained Ok value.
 *
 * @template T - The type of the Ok value
 * @template U - The type of the transformed Ok value
 * @template E - The type of the Err value
 * @param fn - The function to apply to the Ok value
 * @returns A new Result with the transformed value, or the original Err
 *
 * @example
 * ```typescript
 * const result = Result.ok(5);
 * const doubled = result.map(x => x * 2);
 * console.log(doubled.unwrap()); // 10
 * ```
 */
map<U>(fn: (value: T) => U): Result<U, E> {
  // Implementation
}
```

### Inline Comments

**Rule**: Use inline comments to explain **why**, not **what**.

#### ❌ Bad

```typescript
// Increment counter by 1
counter++;
```

#### ✅ Good

```typescript
// Retry mechanism requires at least one attempt
counter++;
```

### Complex Logic

**Rule**: Add comments for complex or non-obvious logic.

```typescript
// Using bitwise OR to ensure at least one bit is set
// This prevents all-zero edge cases in the hash function
const hash = (value | 0) >>> 0;
```

---

## Testing

### Test File Naming

- **Runtime tests**: `*.test.ts`
- **Type-level tests**: `*.test-d.ts`

### Test Structure

Use `describe` for grouping tests by functionality, and `it`/`test` for individual test cases.

```typescript
import { describe, it, expect } from "vitest";
import { Result } from "../src/core/result";

describe("Result.map", () => {
  it("should transform Ok value", () => {
    const result = Result.ok(5).map((x) => x * 2);
    expect(result.unwrap()).toBe(10);
  });

  it("should not transform Err value", () => {
    const result = Result.err("error").map((x) => x * 2);
    expect(result.isErr()).toBe(true);
  });

  it("should handle chained transformations", () => {
    const result = Result.ok(2)
      .map((x) => x * 2)
      .map((x) => x + 1);
    expect(result.unwrap()).toBe(5);
  });
});
```

### Test Naming

- **`describe`**: Name after the function, method, or class being tested
- **`it`/`test`**: Describe the expected behavior in plain English

#### ✅ Good

```typescript
describe("Result.unwrapOr", () => {
  it("should return the Ok value when Ok", () => { ... });
  it("should return the default value when Err", () => { ... });
});
```

#### ❌ Bad

```typescript
describe("unwrapOr", () => {
  it("test1", () => { ... });
  it("test2", () => { ... });
});
```

### Coverage

- **Aim for high coverage**: Target 90%+ code coverage
- **Test edge cases**: Include boundary conditions, empty inputs, and error paths
- **Test type safety**: Use type-level tests (`*.test-d.ts`) to verify type inference

---

## Automated Checks

The project uses [Biome](https://biomejs.dev/) for linting and formatting. Run these commands before committing:

### Check for Issues

```bash
pnpm lint
```

This will check for:
- Code style violations
- Potential bugs
- Unused variables

### Automatically Fix Issues

```bash
pnpm format
```

This will automatically:
- Fix formatting issues
- Organize imports
- Apply safe auto-fixes

### Type Checking

```bash
pnpm type-check
```

This runs TypeScript's compiler in `--noEmit` mode to verify types without generating output files.

### Run All Checks

```bash
pnpm lint && pnpm type-check && pnpm test && pnpm build
```

---

## Summary

Following these style guidelines ensures:

- **Consistency**: Code looks uniform across the project
- **Maintainability**: Easier to understand and modify
- **Quality**: Fewer bugs and better type safety
- **Collaboration**: Clear expectations for all contributors

If you have questions about any of these guidelines, feel free to ask in an issue or pull request!

Happy coding! 🦊
