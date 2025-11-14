# kitsune

Rust-inspired `Result` and `Option` types for TypeScript, enabling type-safe error handling and null safety.

## Features

- 🦀 **Rust-like API**: Familiar `Result<T, E>` and `Option<T>` types with methods like `map`, `andThen`, `unwrap`, etc.
- 🔒 **Type-safe**: Full TypeScript support with proper type inference and narrowing
- 🌳 Tree-shakeable: Fully ESM-ready with optional CJS support
- 📦 **Zero dependencies**: Lightweight and self-contained
- ⚡ **Async-ready**: Built-in support for `Promise` with `Result.tryAsync`

## Installation

```bash
# npm
npm install kitsune

# pnpm
pnpm add kitsune

# yarn
yarn add kitsune
```

## Usage

### Result Type

The `Result<T, E>` type represents either success (`Ok<T>`) or failure (`Err<E>`).

#### Basic Usage

```typescript
import { Result } from 'kitsune';

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

#### Error Handling with try/tryAsync

```typescript
import { Result } from 'kitsune';

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
    console.error('Error:', userResult.unwrapOr({ id: 0, name: 'Unknown' }));
  }
}

main();
```

#### Chaining Operations

```typescript
import { Result } from 'kitsune';

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
import { Result } from 'kitsune';

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
  console.log(allErr.unwrapOrElse((errors) => errors)); // ['error1', 'error2', 'error3']
}
```

### Option Type

The `Option<T>` type represents an optional value: either `Some<T>` or `None`.

#### Basic Usage

```typescript
import { Option } from 'kitsune';

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
import { Option } from 'kitsune';

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
import { Result, Option } from 'kitsune';

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
import { Option } from 'kitsune';

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

## API Reference

For a complete list of methods and detailed documentation, please refer to the source code or generated type definitions.

### Result<T, E> Methods

- `isOk()`, `isErr()` - Type guards
- `unwrap()`, `expect(message)` - Extract values (throws on error)
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

- `isSome()`, `isNone()` - Type guards
- `unwrap()`, `expect(message)` - Extract values (throws on None)
- `unwrapOr(defaultValue)`, `unwrapOrElse(fn)` - Safe extraction with fallback
- `map(fn)` - Transform values
- `and(other)`, `or(other)` - Combine Options
- `andThen(fn)` - Chain operations
- `filter(predicate)` - Filter values
- `toResult(error)` - Convert to Result

### Option Static Methods

- `Option.some(value)`, `Option.none()` - Constructors
- `Option.fromNullable(value)` - Convert nullable to Option
- `Option.all(options)` - All must be `Some` to return `Some<T[]>`, otherwise returns `None`
- `Option.any(options)` - Returns the first `Some`, or `None` if all are `None`

## License

MIT © @tr-yasuda
