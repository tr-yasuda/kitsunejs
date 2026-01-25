# kitsunejs

[![npm version](https://img.shields.io/npm/v/kitsunejs.svg)](https://www.npmjs.com/package/kitsunejs)
[![npm downloads](https://img.shields.io/npm/dm/kitsunejs.svg)](https://www.npmjs.com/package/kitsunejs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

Rust-inspired `Result` and `Option` types for TypeScript, enabling type-safe error handling and null safety.

## Features

- 🦀 **Rust-like API**: Familiar `Result<T, E>` and `Option<T>` types with methods like `map`, `andThen`, `unwrap`, etc.
- 🔒 **Type-safe**: Full TypeScript support with proper type inference and narrowing
- 🌳 **Tree-shakeable**: Fully ESM-ready with optional CJS support
- 📦 **Zero dependencies**: Lightweight and self-contained
- ⚡ **Async-ready**: Built-in support for `Promise` with `Result.tryAsync`

## Installation

```bash
# npm
npm install kitsunejs

# pnpm
pnpm add kitsunejs

# yarn
yarn add kitsunejs
```

## Usage

### Result Type

The `Result<T, E>` type represents either success (`Ok<T>`) or failure (`Err<E>`).

#### Basic Usage

```typescript
import { Result } from 'kitsunejs';

// Creating Results
const success = Result.ok(42);
const failure = Result.err('Something went wrong');

// Checking variants
if (success.isOk()) {
  console.log(success.unwrap()); // 42
}

if (failure.isErr()) {
  console.log(failure.unwrapOr(0)); // 0 (default value)
}
```

#### Additional Helpers

```typescript
import { Result } from 'kitsunejs';

const result: Result<number, string> = Result.ok(42);

// Type guard + predicate
if (result.isOkAnd((v) => v > 0)) {
  console.log(result.unwrap()); // 42
}

// Map with defaults
const value = Result.err<number, string>('error').mapOrElse(
  (e) => e.length,
  (v) => v * 2,
);
console.log(value); // 5

// Inspect without changing the Result
Result.err<number, string>('error')
  .inspectErr((e) => console.error(e))
  .unwrapOr(0);

// Extract Err as Option
const maybeError = Result.err<number, string>('error').err();
console.log(maybeError.unwrap()); // 'error'

// Extract Err value with custom message if Ok
const error = Result.err<number, string>('error').expectErr('Expected Err');
console.log(error); // 'error'
```

#### Error Handling with try/tryAsync

```typescript
import { Result } from 'kitsunejs';

// Sync: Convert exceptions to Result
const result = Result.try(() => {
  return JSON.parse('{"name": "Alice"}');
});

// Async: Handle Promise rejections
type User = {
  id: number;
  name: string;
}

async function fetchUser(id: number): Promise<Result<User, Error>> {
  return Result.tryAsync(async () => {
    const response = await fetch(`https://api.example.com/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as User;
  });
}

async function main() {
  const userResult = await fetchUser(1);

  if (userResult.isOk()) {
    console.log('User:', userResult.unwrap());
  } else {
    console.error('Failed to fetch user:', userResult.unwrapErr());
    // Provide fallback value
    const defaultUser = { id: 0, name: 'Unknown' };
    console.log('Using default user:', defaultUser);
  }
}

main();
```

#### Chaining Operations

```typescript
import { Result } from 'kitsunejs';

type User = {
  name: string;
  age: number;
}

function findUser(id: number): Result<User, string> {
  if (id === 1) {
    return Result.ok({ name: 'Alice', age: 30 });
  }
  return Result.err('User not found');
}

// Transform success values with map
const userName = findUser(1)
  .map((user) => user.name)
  .unwrapOr('Unknown');

console.log(userName); // 'Alice'

// Chain multiple Result-returning operations
function getAge(user: User): Result<number, string> {
  if (user.age < 0) {
    return Result.err('Invalid age');
  }
  return Result.ok(user.age);
}

const age = findUser(1)
  .andThen((user) => getAge(user))
  .unwrapOr(0);
```

#### Combining Multiple Results

```typescript
import { Result } from 'kitsunejs';

const results = [
  Result.ok(1),
  Result.ok(2),
  Result.ok(3),
];

// All must be Ok to get Ok<T[]>
const allOk = Result.all(results);
console.log(allOk.unwrap()); // [1, 2, 3]

// Get the first Ok, or Err<E[]> if all fail
const firstOk = Result.any([
  Result.err('error1'),
  Result.ok(42),
  Result.err('error2'),
]);
console.log(firstOk.unwrap()); // 42

// All Err case returns Err<E[]>
const allErr = Result.any([
  Result.err('error1'),
  Result.err('error2'),
  Result.err('error3'),
]);
if (allErr.isErr()) {
  console.log(allErr.unwrapErr()); // ['error1', 'error2', 'error3']
}
```

### Option Type

The `Option<T>` type represents an optional value: either `Some<T>` or `None`.

#### Basic Usage

```typescript
import { Option } from 'kitsunejs';

// Creating Options
const some = Option.some(42);
const none = Option.none();

// Checking variants
if (some.isSome()) {
  console.log(some.unwrap()); // 42
}

if (none.isNone()) {
  console.log('No value');
}

// Safe handling of null/undefined
function getConfig(key: string): string | null {
  // Simulated config lookup
  return null;
}

const config = Option.fromNullable(getConfig('api_key'))
  .unwrapOr('default-api-key');

console.log(config); // 'default-api-key'
```

#### Chaining Operations

```typescript
import { Option } from 'kitsunejs';

// Transform values with map
const doubled = Option.some(10)
  .map((n) => n * 2)
  .unwrapOr(0);

console.log(doubled); // 20

// Filter values based on predicates
const filtered = Option.some(10)
  .filter((n) => n > 15)
  .unwrapOr(0);

console.log(filtered); // 0 (filtered out)

// Chain Option-returning operations
function parseNumber(str: string): Option<number> {
  const num = Number.parseFloat(str);
  if (Number.isNaN(num)) {
    return Option.none();
  }
  return Option.some(num);
}

const result = Option.some('42.5')
  .andThen((str) => parseNumber(str))
  .map((num) => num * 2)
  .unwrapOr(0);

console.log(result); // 85
```

#### Converting Between Result and Option

```typescript
import { Result, Option } from 'kitsunejs';

// Option to Result
const option = Option.some(42);
const result = option.toResult('No value provided');
console.log(result.unwrap()); // 42

// Result to Option
const okResult = Result.ok(42);
const optionFromResult = okResult.toOption();
console.log(optionFromResult.unwrap()); // 42

const errResult = Result.err('error');
const noneFromErr = errResult.toOption();
console.log(noneFromErr.isNone()); // true
```

#### Combining Multiple Options

```typescript
import { Option } from 'kitsunejs';

const options = [
  Option.some(1),
  Option.some(2),
  Option.some(3),
];

// All must be Some to get Some<T[]>
const allSome = Option.all(options);
console.log(allSome.unwrap()); // [1, 2, 3]

// Get the first Some, or None if all are None
const firstSome = Option.any([
  Option.none(),
  Option.some(42),
  Option.none(),
]);
console.log(firstSome.unwrap()); // 42
```

## Documentation

For more detailed information, please refer to the following documentation:

- **[API Reference](./docs/api-reference.md)** - Complete list of all methods with detailed explanations and examples
- **[Rust Comparison](./docs/rust-comparison.md)** - Comparison table between Rust's `Result`/`Option` and kitsune
- **[Recipes](./docs/recipes.md)** - Practical usage patterns and best practices for common scenarios

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- How to set up your development environment
- Our coding standards and [Style Guide](./STYLE_GUIDE.md)
- How to submit pull requests
- Our commit message conventions

## Quick API Reference

Below is a quick reference of available methods. For detailed documentation with examples, see [API Reference](./docs/api-reference.md).

### Result<T, E> Methods

- `isOk()`, `isErr()` - Type guards
- `unwrap()`, `expect(message)` - Extract values (throws on error)
- `unwrapErr()` - Extract error value (throws on Ok)
- `unwrapOr(defaultValue)`, `unwrapOrElse(fn)` - Safe extraction with fallback
- `map(fn)`, `mapErr(fn)` - Transform values
- `and(other)`, `or(other)` - Combine Results
- `andThen(fn)`, `orElse(fn)` - Chain operations
- `toOption()` - Convert to Option

### Result Static Methods

- `Result.ok(value)`, `Result.err(error)` - Constructors
- `Result.fromNullable(value, error)` - Convert nullable to Result
- `Result.try(fn)`, `Result.tryAsync(fn)` - Exception handling
- `Result.all(results)` - All must be `Ok` to return `Ok<T[]>`, otherwise returns the first `Err`
- `Result.any(results)` - Returns the first `Ok`, or `Err<E[]>` containing all errors if none succeed

### Option<T> Methods

- `isSome()`, `isNone()`, `isSomeAnd(predicate)`, `isNoneOr(predicate)` - Type guards / conditional checks
- `unwrap()`, `expect(message)` - Extract values (throws on None)
- `unwrapOr(defaultValue)`, `unwrapOrElse(fn)` - Safe extraction with fallback
- `map(fn)`, `mapOr(defaultValue, fn)`, `mapOrElse(defaultFn, fn)` - Transform values
- `and(other)`, `or(other)` - Combine Options
- `andThen(fn)` - Chain operations
- `filter(predicate)` - Filter values
- `toResult(error)`, `toResultElse(fn)` - Convert to Result

### Option Static Methods

- `Option.some(value)`, `Option.none()` - Constructors
- `Option.fromNullable(value)` - Convert nullable to Option
- `Option.all(options)` - All must be `Some` to return `Some<T[]>`, otherwise returns `None`
- `Option.any(options)` - Returns the first `Some`, or `None` if all are `None`

## License

MIT © @tr-yasuda
