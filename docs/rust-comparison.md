# Comparison with Rust

## Overview

This document shows the correspondence between Rust's `Result<T, E>` / `Option<T>` and kitsunejs.
It explains method correspondences and key differences to help Rust developers smoothly start using kitsunejs.

## Basic Philosophy

kitsunejs faithfully reproduces Rust's Result/Option API as much as possible, but differs in the following ways:

- **Adjustments for TypeScript's type system**: Leverages TypeScript's type inference and type guards
- **Functionality tailored to JavaScript ecosystem**: Promise integration, null/undefined conversion, etc.
- **Naming convention differences**: Uses camelCase following JavaScript/TypeScript conventions

## Result<T, E> Correspondence Table

| Rust                 | kitsunejs                           | Notes                                                                              |
|----------------------|-------------------------------------|------------------------------------------------------------------------------------|
| `Ok(value)`          | `Result.ok(value)`                  | Function call to static method                                                     |
| `Err(error)`         | `Result.err(error)`                 | Function call to static method                                                     |
| `is_ok()`            | `isOk()`                            |                                                                                    |
| `is_err()`           | `isErr()`                           |                                                                                    |
| `unwrap()`           | `unwrap()`                          | Throws UnwrapError                                                                 |
| `expect(msg)`        | `expect(msg)`                       | Throws UnwrapError                                                                 |
| `unwrap_err()`       | `unwrapErr()`                       | Throws UnwrapError if called on Ok                                                 |
| `unwrap_or(default)` | `unwrapOr(default)`                 |                                                                                    |
| `unwrap_or_else(fn)` | `unwrapOrElse(fn)`                  |                                                                                    |
| `map(fn)`            | `map(fn)`                           |                                                                                    |
| `map_err(fn)`        | `mapErr(fn)`                        |                                                                                    |
| `and(res)`           | `and(res)`                          |                                                                                    |
| `or(res)`            | `or(res)`                           |                                                                                    |
| `and_then(fn)`       | `andThen(fn)`                       | Also known as flatMap                                                              |
| `or_else(fn)`        | `orElse(fn)`                        |                                                                                    |
| `ok()`               | `toOption()`                        | Different method name. Error information is discarded and converted to `Option<T>` |
| -                    | `Result.fromNullable(value, error)` | kitsunejs-specific. Integration with JavaScript/TypeScript null/undefined          |
| -                    | `Result.try(fn)`                    | kitsunejs-specific. Integration with JavaScript exception handling                 |
| -                    | `Result.tryAsync(fn)`               | kitsunejs-specific. Integration with Promises                                      |
| -                    | `Result.all(results)`               | kitsunejs-specific. Not in Rust std, but common in ecosystem (e.g., itertools)     |
| -                    | `Result.any(results)`               | kitsunejs-specific. Not in Rust std, but common fallback pattern in ecosystem      |

## Option<T> Correspondence Table

| Rust                 | kitsunejs                    | Notes                                                                                           |
|----------------------|------------------------------|-------------------------------------------------------------------------------------------------|
| `Some(value)`        | `Option.some(value)`         | Function call to static method                                                                  |
| `None`               | `Option.none()`              | Value to function call                                                                          |
| `is_some()`          | `isSome()`                   |                                                                                                 |
| `is_none()`          | `isNone()`                   |                                                                                                 |
| `unwrap()`           | `unwrap()`                   | Throws UnwrapError                                                                              |
| `expect(msg)`        | `expect(msg)`                | Throws UnwrapError                                                                              |
| `unwrap_or(default)` | `unwrapOr(default)`          |                                                                                                 |
| `unwrap_or_else(fn)` | `unwrapOrElse(fn)`           |                                                                                                 |
| `map(fn)`            | `map(fn)`                    |                                                                                                 |
| `and(optb)`          | `and(other)`                 |                                                                                                 |
| `or(optb)`           | `or(other)`                  |                                                                                                 |
| `or_else(fn)`        | `orElse(fn)`                 | Lazy alternative to `or`. `fn` is only called for `None`                                        |
| `xor(optb)`          | `xor(other)`                 | Returns `Some` if exactly one of the two is `Some`                                              |
| `and_then(fn)`       | `andThen(fn)`                | Also known as flatMap                                                                           |
| `filter(predicate)`  | `filter(predicate)`          |                                                                                                 |
| `zip(optb)`          | `zip(other)`                 | Returns `Some([a, b])` if both are `Some`, otherwise returns `None`                             |
| `zip_with(optb, fn)` | `zipWith(other, fn)`         | Returns `Some(fn(a, b))` if both are `Some`, otherwise returns `None`                           |
| `unzip()`            | `unzip()`                    | Unzips `Option<[A, B]>` into `[Option<A>, Option<B>]`                                           |
| `ok_or(err)`         | `toResult(error)`            | Different method name. Some → Ok, None → Err                                                    |
| -                    | `Option.fromNullable(value)` | kitsunejs-specific. Integration with JavaScript/TypeScript null/undefined                       |
| -                    | `Option.all(options)`        | kitsunejs-specific. Not in Rust std, but common in ecosystem                                    |
| -                    | `Option.any(options)`        | kitsunejs-specific. Common in priority-based fallback patterns like env vars → config → default |

## Key Differences

### 1. Naming Convention

- **Rust**: `snake_case` (e.g., `unwrap_or`, `and_then`)
- **kitsunejs**: `camelCase` (e.g., `unwrapOr`, `andThen`)

This follows JavaScript/TypeScript coding conventions.

### 2. Constructors

- **Rust**: `Ok(value)`, `Some(value)` are called directly as functions, `None` is used as a value
- **kitsunejs**: `Result.ok(value)`, `Option.some(value)`, `Option.none()` are called as static methods

TypeScript adopts a design that explicitly groups constructors using namespaces.

### 3. JavaScript-Specific Features

kitsunejs has unique features tailored to the JavaScript/TypeScript ecosystem:

#### `Result.try` / `Result.tryAsync`
Converts JavaScript exception handling to Result.

```typescript
// Convert synchronous function exceptions to Result
const result = Result.try(() => JSON.parse(input));

// Convert async function Promises to Result
const asyncResult = await Result.tryAsync(async () => {
  const response = await fetch('/api/data');
  return await response.json();
});
```

#### `fromNullable`
Converts `null` or `undefined` to Result/Option.

```typescript
const result = Result.fromNullable(maybeValue, 'Value is null');
const option = Option.fromNullable(maybeValue);
```

#### `all` / `any`
Combines multiple Result/Option values.

```typescript
// All must succeed
const allResults = Result.all([result1, result2, result3]);

// At least one must succeed
const anyResult = Result.any([result1, result2, result3]);
```

## Migration Example

### Rust Code

```rust
fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err("division by zero".to_string())
    } else {
        Ok(a / b)
    }
}

fn process_data(input: Option<i32>) -> Result<i32, String> {
    input
        .ok_or("No input provided".to_string())
        .and_then(|x| divide(x, 2))
        .map(|x| x * 3)
}

fn main() {
    let result = process_data(Some(10));
    match result {
        Ok(value) => println!("Result: {}", value),
        Err(e) => eprintln!("Error: {}", e),
    }
}
```

### kitsunejs Code

```typescript
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Result.err('division by zero');
  } else {
    return Result.ok(a / b);
  }
}

function processData(input: Option<number>): Result<number, string> {
  return input
    .toResult('No input provided')
    .andThen((x) => divide(x, 2))
    .map((x) => x * 3);
}

function main() {
  const result = processData(Option.some(10));

  if (result.isOk()) {
    console.log(`Result: ${result.unwrap()}`);
  } else {
    console.error(`Error: ${result.unwrapErr()}`);
  }
}

main();
```

### Main Changes

1. **Function definition**: `fn` → `function`
2. **Type annotations**: `: i32` → `: number`, `: String` → `: string`
3. **Strings**: `.to_string()` → string literals
4. **Constructors**: `Ok()` → `Result.ok()`, `Some()` → `Option.some()`
5. **Pattern matching**: `match` → `if`/`else` with type guards
6. **Naming convention**: `ok_or` → `toResult`, `and_then` → `andThen`

By using kitsunejs, you can achieve a functional programming style similar to Rust in TypeScript.
