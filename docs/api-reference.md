# API Reference

## Result<T, E>

### Overview

`Result<T, E>` is a type that represents either success (`Ok<T>`) or failure (`Err<E>`).
It enables type-safe handling of both successful and failed outcomes, allowing explicit error handling instead of throwing exceptions.

**Main Use Cases**:
- Operations that may fail, such as API calls or file operations
- Representing validation results
- Implementing functional programming style that treats errors as values

### Type Definition

```typescript
type Result<T, E> = Ok<T, E> | Err<T, E>

// Ok variant: holds a success value
type Ok<T, E> = {
  tag: "Ok"
  isOk(): true
  isErr(): false
  unwrap(): T
  // ... other methods
}

// Err variant: holds an error value
type Err<T, E> = {
  tag: "Err"
  isOk(): false
  isErr(): true
  unwrap(): never  // throws UnwrapError
  // ... other methods
}
```

**Variants**:
- `Ok<T, E>`: Variant representing success. Holds a value of type `T`.
- `Err<T, E>`: Variant representing failure. Holds an error of type `E`.

### Static Methods

#### Constructors

##### `Result.ok<T, E>(value: T): Result<T, E>`

Creates an `Ok` variant representing success.

**Parameters**:
- `value: T` - Success value

**Returns**: `Result<T, E>` - Ok variant

**Example**:
```typescript
const result = Result.ok(42);
console.log(result.isOk()); // true
console.log(result.unwrap()); // 42
```

##### `Result.err<T, E>(error: E): Result<T, E>`

Creates an `Err` variant representing failure.

**Parameters**:
- `error: E` - Error value

**Returns**: `Result<T, E>` - Err variant

**Example**:
```typescript
const result = Result.err('Something went wrong');
console.log(result.isErr()); // true
console.log(result.unwrapOr(0)); // 0
```

#### Conversion & Utility

##### `Result.fromNullable<T, E>(value: T | null | undefined, error: E): Result<T, E>`

Converts a nullable value to a `Result`. Returns `Err` if the value is `null` or `undefined`, otherwise returns `Ok`.

**Parameters**:
- `value: T | null | undefined` - Value to convert
- `error: E` - Error value to use when null/undefined

**Returns**: `Result<T, E>` - Ok or Err

**Example**:
```typescript
const value1 = Result.fromNullable('hello', 'Value is null');
console.log(value1.unwrap()); // 'hello'

const value2 = Result.fromNullable(null, 'Value is null');
console.log(value2.isErr()); // true
```

##### `Result.try<T, E = Error>(fn: () => T): Result<T, E>`

Executes a synchronous function that may throw an exception and converts the result to a `Result`.
Returns `Ok` if the function executes successfully, otherwise returns `Err` with the caught error.

**Parameters**:
- `fn: () => T` - Function to execute

**Returns**: `Result<T, E>` - Ok or Err

**Example**:
```typescript
const result = Result.try(() => {
  return JSON.parse('{"name": "Alice"}');
});

if (result.isOk()) {
  console.log(result.unwrap()); // { name: 'Alice' }
}

const errorResult = Result.try(() => {
  return JSON.parse('invalid json');
});

console.log(errorResult.isErr()); // true
```

##### `Result.tryAsync<T, E = Error>(fn: () => Promise<T>): Promise<Result<T, E>>`

Executes a function that returns a Promise and converts the result to a `Promise<Result>`.
Returns `Ok` if the Promise resolves successfully, otherwise returns `Err` if rejected.

**Parameters**:
- `fn: () => Promise<T>` - Async function to execute

**Returns**: `Promise<Result<T, E>>` - Promise containing Ok or Err

**Example**:
```typescript
async function fetchData() {
  const result = await Result.tryAsync(async () => {
    const response = await fetch('/api/data');
    return await response.json();
  });

  if (result.isOk()) {
    console.log(result.unwrap());
  } else {
    console.error('Fetch failed');
  }
}
```

#### Aggregation & Combination

##### `Result.all<T, E>(results: readonly Result<T, E>[]): Result<T[], E>`

Combines multiple `Result`s. Returns `Ok<T[]>` containing all values if all `Result`s are `Ok`.
Returns the first `Err` if any `Result` is `Err`. Returns `Ok([])` for an empty array.

**Parameters**:
- `results: readonly Result<T, E>[]` - Array of Results

**Returns**: `Result<T[], E>` - Ok<T[]> if all succeed, otherwise the first Err

**Example**:
```typescript
const results = [
  Result.ok(1),
  Result.ok(2),
  Result.ok(3),
];

const combined = Result.all(results);
console.log(combined.unwrap()); // [1, 2, 3]

const resultsWithError = [
  Result.ok(1),
  Result.err('error'),
  Result.ok(3),
];

const combinedWithError = Result.all(resultsWithError);
console.log(combinedWithError.isErr()); // true
```

##### `Result.any<T, E>(results: readonly Result<T, E>[]): Result<T, E[]>`

Returns the first `Ok` result from an array of `Result`s. If all `Result`s are `Err`, returns `Err<E[]>` containing all errors.
Returns `Err([])` for an empty array.

**Parameters**:
- `results: readonly Result<T, E>[]` - Array of Results

**Returns**: `Result<T, E[]>` - First Ok, or Err containing all errors

**Example**:
```typescript
const results = [
  Result.err('error1'),
  Result.ok(42),
  Result.err('error2'),
];

const first = Result.any(results);
console.log(first.unwrap()); // 42

const allErrors = [
  Result.err('error1'),
  Result.err('error2'),
  Result.err('error3'),
];

const errors = Result.any(allErrors);
if (errors.isErr()) {
  console.log(errors.unwrapOrElse((e) => e)); // ['error1', 'error2', 'error3']
}
```

### Instance Methods

#### Type Guards

##### `isOk(): boolean`

Determines if the Result is an `Ok` variant. Functions as a TypeScript type guard.

**Returns**: `boolean` - true if Ok, false if Err

**Type Narrowing**: When this method returns `true`, TypeScript treats Result as type `Ok<T, E>`.

**Example**:
```typescript
const result = Result.ok(42);

if (result.isOk()) {
  // Here result is of type Ok<number, never>
  console.log(result.unwrap()); // 42
}
```

##### `isErr(): boolean`

Determines if the Result is an `Err` variant. Functions as a TypeScript type guard.

**Returns**: `boolean` - true if Err, false if Ok

**Type Narrowing**: When this method returns `true`, TypeScript treats Result as type `Err<T, E>`.

**Example**:
```typescript
const result = Result.err('Something went wrong');

if (result.isErr()) {
  // Here result is of type Err<never, string>
  console.log('Error occurred');
}
```

#### Extraction

##### `unwrap(): T`

Extracts the `Ok` value. Throws `UnwrapError` if the value is `Err`.

**Returns**: `T` - Value if Ok

**Throws**: `UnwrapError` - If Err

**⚠️ Usage Warning**:
- Use this method sparingly as it may throw exceptions
- Recommended only for tests, sample code, or when Ok is guaranteed
- In production code, prefer `unwrapOr` / `unwrapOrElse` / `andThen` / `orElse`

**Example**:
```typescript
const ok = Result.ok(42);
console.log(ok.unwrap()); // 42

const err = Result.err('error');
// err.unwrap(); // UnwrapError: Called unwrap on an Err value
```

##### `expect(message: string): T`

Extracts the `Ok` value. Throws `UnwrapError` with the specified message if the value is `Err`.

**Parameters**:
- `message: string` - Message to display on error

**Returns**: `T` - Value if Ok

**Throws**: `UnwrapError` - If Err (with custom message)

**⚠️ Usage Warning**:
- Like `unwrap()`, use sparingly
- Can be used to help identify error locations during debugging

**Example**:
```typescript
const ok = Result.ok(42);
console.log(ok.expect('Should have value')); // 42

const err = Result.err('error');
// err.expect('Expected valid result'); // UnwrapError: Expected valid result
```

##### `unwrapOr(defaultValue: T): T`

Extracts the `Ok` value. Returns the specified default value if `Err`.

**Parameters**:
- `defaultValue: T` - Default value to return if Err

**Returns**: `T` - Ok value, or default value if Err

**Example**:
```typescript
const ok = Result.ok(42);
console.log(ok.unwrapOr(0)); // 42

const err = Result.err('error');
console.log(err.unwrapOr(0)); // 0
```

##### `unwrapOrElse(fn: (error: E) => T): T`

Extracts the `Ok` value. If `Err`, executes the function and returns its result.

**Parameters**:
- `fn: (error: E) => T` - Function to execute if Err. Receives the error value and returns a default value.

**Returns**: `T` - Ok value, or function result

**Example**:
```typescript
const ok = Result.ok(42);
console.log(ok.unwrapOrElse(() => 0)); // 42

const err = Result.err('error');
console.log(err.unwrapOrElse((e) => {
  console.error(`Error: ${e}`);
  return 0;
})); // Error: error
     // 0
```

#### Mapping

##### `map<U>(fn: (value: T) => U): Result<U, E>`

Applies a function to transform the `Ok` value. Returns the `Err` unchanged if `Err`.

**Parameters**:
- `fn: (value: T) => U` - Function to transform the Ok value

**Returns**: `Result<U, E>` - Transformed Result

**Example**:
```typescript
const result = Result.ok(42);
const doubled = result.map((n) => n * 2);
console.log(doubled.unwrap()); // 84

const err = Result.err('error');
const mapped = err.map((n) => n * 2);
console.log(mapped.isErr()); // true
```

##### `mapErr<F>(fn: (error: E) => F): Result<T, F>`

Applies a function to transform the `Err` value. Returns the `Ok` unchanged if `Ok`.

**Parameters**:
- `fn: (error: E) => F` - Function to transform the Err value

**Returns**: `Result<T, F>` - Transformed Result

**Example**:
```typescript
const result = Result.err('error');
const mapped = result.mapErr((e) => `Wrapped: ${e}`);
console.log(mapped.unwrapOrElse((e) => e)); // 'Wrapped: error'

const ok = Result.ok(42);
const mappedOk = ok.mapErr((e) => `Wrapped: ${e}`);
console.log(mappedOk.unwrap()); // 42
```

#### Composition

##### `and<U>(other: Result<U, E>): Result<U, E>`

Returns `other` if `Ok`, returns self if `Err`.

**Parameters**:
- `other: Result<U, E>` - Result to return if Ok

**Returns**: `Result<U, E>` - other if Ok, self if Err

**Example**:
```typescript
const ok1 = Result.ok(1);
const ok2 = Result.ok('hello');
console.log(ok1.and(ok2).unwrap()); // 'hello'

const err = Result.err('error');
console.log(err.and(ok2).isErr()); // true
```

##### `or<F>(other: Result<T, F>): Result<T, F>`

Returns `other` if `Err`, returns self if `Ok`.

**Parameters**:
- `other: Result<T, F>` - Result to return if Err

**Returns**: `Result<T, F>` - self if Ok, other if Err

**Example**:
```typescript
const ok = Result.ok(42);
const other = Result.ok(100);
console.log(ok.or(other).unwrap()); // 42

const err = Result.err('error');
console.log(err.or(other).unwrap()); // 100
```

##### `andThen<U>(fn: (value: T) => Result<U, E>): Result<U, E>`

If `Ok`, executes the function and chains to the next Result. If `Err`, returns unchanged.
Similar to `map`, but differs in that the function returns a `Result` (also known as flatMap).

**Parameters**:
- `fn: (value: T) => Result<U, E>` - Function to generate the next Result from the Ok value

**Returns**: `Result<U, E>` - Chained Result

**Example**:
```typescript
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Result.err('Division by zero');
  }
  return Result.ok(a / b);
}

const result = Result.ok(10)
  .andThen((n) => divide(n, 2))
  .andThen((n) => divide(n, 0));

console.log(result.isErr()); // true
```

##### `orElse<F>(fn: (error: E) => Result<T, F>): Result<T, F>`

If `Err`, executes the function to switch to another Result. If `Ok`, returns unchanged.

**Parameters**:
- `fn: (error: E) => Result<T, F>` - Function to generate another Result from the Err value

**Returns**: `Result<T, F>` - Switched Result

**Example**:
```typescript
const result = Result.err('primary failed')
  .orElse((e) => {
    console.log(`Primary error: ${e}`);
    return Result.ok(42); // Fallback
  });

console.log(result.unwrap()); // 42
```

#### Conversion

##### `toOption(): Option<T>`

Converts a `Result` to an `Option`. `Ok` becomes `Some`, `Err` becomes `None`.
Error information is discarded.

**Returns**: `Option<T>` - Some(value) if Ok, None if Err

**Example**:
```typescript
const ok = Result.ok(42);
const some = ok.toOption();
console.log(some.unwrap()); // 42

const err = Result.err('error');
const none = err.toOption();
console.log(none.isNone()); // true
```

## Option<T>

### Overview

`Option<T>` is a type that represents either the presence of a value (`Some<T>`) or its absence (`None`).
Instead of using `null` or `undefined`, it enables type-safe handling of value absence.

**Main Use Cases**:
- Safe handling of nullable values
- Representing results of operations where a value may not exist
- Managing optional parameters or configuration values

### Type Definition

```typescript
type Option<T> = Some<T> | None

// Some variant: holds a value
type Some<T> = {
  tag: "Some"
  isSome(): true
  isNone(): false
  unwrap(): T
  // ... other methods
}

// None variant: no value exists
type None = {
  tag: "None"
  isSome(): false
  isNone(): true
  unwrap(): never  // throws UnwrapError
  // ... other methods
}
```

**Variants**:
- `Some<T>`: Variant representing value presence. Holds a value of type `T`.
- `None`: Variant representing value absence.

### Static Methods

#### Constructors

##### `Option.some<T>(value: T): Option<T>`

Creates a `Some` variant representing value presence.

**Parameters**:
- `value: T` - Value to hold

**Returns**: `Option<T>` - Some variant

**Example**:
```typescript
const option = Option.some(42);
console.log(option.isSome()); // true
console.log(option.unwrap()); // 42
```

##### `Option.none<T>(): Option<T>`

Creates a `None` variant representing value absence.

**Returns**: `Option<T>` - None variant

**Example**:
```typescript
const option = Option.none<number>();
console.log(option.isNone()); // true
console.log(option.unwrapOr(0)); // 0
```

#### Conversion & Utility

##### `Option.fromNullable<T>(value: T | null | undefined): Option<T>`

Converts a nullable value to an `Option`. Returns `None` if the value is `null` or `undefined`, otherwise returns `Some`.

**Parameters**:
- `value: T | null | undefined` - Value to convert

**Returns**: `Option<T>` - Some or None

**Example**:
```typescript
const some = Option.fromNullable('hello');
console.log(some.unwrap()); // 'hello'

const none = Option.fromNullable(null);
console.log(none.isNone()); // true

const none2 = Option.fromNullable(undefined);
console.log(none2.isNone()); // true
```

#### Aggregation & Combination

##### `Option.all<T>(options: readonly Option<T>[]): Option<T[]>`

Combines multiple `Option`s. Returns `Some<T[]>` containing all values if all `Option`s are `Some`.
Returns `None` if any `Option` is `None`. Returns `Some([])` for an empty array.

**Parameters**:
- `options: readonly Option<T>[]` - Array of Options

**Returns**: `Option<T[]>` - Some<T[]> if all are Some, otherwise None

**Example**:
```typescript
const options = [
  Option.some(1),
  Option.some(2),
  Option.some(3),
];

const combined = Option.all(options);
console.log(combined.unwrap()); // [1, 2, 3]

const optionsWithNone = [
  Option.some(1),
  Option.none(),
  Option.some(3),
];

const combinedWithNone = Option.all(optionsWithNone);
console.log(combinedWithNone.isNone()); // true
```

##### `Option.any<T>(options: readonly Option<T>[]): Option<T>`

Returns the first `Some` from multiple `Option`s. Returns `None` if all `Option`s are `None`.
Returns `None` for an empty array.

**Parameters**:
- `options: readonly Option<T>[]` - Array of Options

**Returns**: `Option<T>` - First Some, or None

**Example**:
```typescript
const options = [
  Option.none(),
  Option.some(42),
  Option.none(),
];

const first = Option.any(options);
console.log(first.unwrap()); // 42

const allNone = [
  Option.none(),
  Option.none(),
  Option.none(),
];

const none = Option.any(allNone);
console.log(none.isNone()); // true
```

### Instance Methods

#### Type Guards

##### `isSome(): boolean`

Determines if the Option is a `Some` variant. Functions as a TypeScript type guard.

**Returns**: `boolean` - true if Some, false if None

**Type Narrowing**: When this method returns `true`, TypeScript treats Option as type `Some<T>`.

**Example**:
```typescript
const option = Option.some(42);

if (option.isSome()) {
  // Here option is of type Some<number>
  console.log(option.unwrap()); // 42
}
```

##### `isNone(): boolean`

Determines if the Option is a `None` variant. Functions as a TypeScript type guard.

**Returns**: `boolean` - true if None, false if Some

**Type Narrowing**: When this method returns `true`, TypeScript treats Option as type `None`.

**Example**:
```typescript
const option = Option.none();

if (option.isNone()) {
  // Here option is of type None
  console.log('No value');
}
```

#### Extraction

##### `unwrap(): T`

Extracts the `Some` value. Throws `UnwrapError` if `None`.

**Returns**: `T` - Value if Some

**Throws**: `UnwrapError` - If None

**⚠️ Usage Warning**:
- Use this method sparingly as it may throw exceptions
- Recommended only for tests, sample code, or when Some is guaranteed
- In production code, prefer `unwrapOr` / `unwrapOrElse` / `andThen`

**Example**:
```typescript
const some = Option.some(42);
console.log(some.unwrap()); // 42

const none = Option.none();
// none.unwrap(); // UnwrapError: Called unwrap on a None value
```

##### `expect(message: string): T`

Extracts the `Some` value. Throws `UnwrapError` with the specified message if `None`.

**Parameters**:
- `message: string` - Message to display on error

**Returns**: `T` - Value if Some

**Throws**: `UnwrapError` - If None (with custom message)

**⚠️ Usage Warning**:
- Like `unwrap()`, use sparingly
- Can be used to help identify error locations during debugging

**Example**:
```typescript
const some = Option.some(42);
console.log(some.expect('Should have value')); // 42

const none = Option.none();
// none.expect('Expected a value'); // UnwrapError: Expected a value
```

##### `unwrapOr(defaultValue: T): T`

Extracts the `Some` value. Returns the specified default value if `None`.

**Parameters**:
- `defaultValue: T` - Default value to return if None

**Returns**: `T` - Some value, or default value if None

**Example**:
```typescript
const some = Option.some(42);
console.log(some.unwrapOr(0)); // 42

const none = Option.none<number>();
console.log(none.unwrapOr(0)); // 0
```

##### `unwrapOrElse(fn: () => T): T`

Extracts the `Some` value. If `None`, executes the function and returns its result.

**Parameters**:
- `fn: () => T` - Function to execute if None. Returns a default value.

**Returns**: `T` - Some value, or function result

**Example**:
```typescript
const some = Option.some(42);
console.log(some.unwrapOrElse(() => 0)); // 42

const none = Option.none<number>();
console.log(none.unwrapOrElse(() => {
  console.log('No value found');
  return 0;
})); // No value found
     // 0
```

#### Mapping

##### `map<U>(fn: (value: T) => U): Option<U>`

Applies a function to transform the `Some` value. Returns `None` unchanged if `None`.

**Parameters**:
- `fn: (value: T) => U` - Function to transform the Some value

**Returns**: `Option<U>` - Transformed Option

**Example**:
```typescript
const option = Option.some(42);
const doubled = option.map((n) => n * 2);
console.log(doubled.unwrap()); // 84

const none = Option.none<number>();
const mapped = none.map((n) => n * 2);
console.log(mapped.isNone()); // true
```

#### Composition

##### `and<U>(other: Option<U>): Option<U>`

Returns `other` if `Some`, returns self if `None`.

**Parameters**:
- `other: Option<U>` - Option to return if Some

**Returns**: `Option<U>` - other if Some, self if None

**Example**:
```typescript
const some1 = Option.some(1);
const some2 = Option.some('hello');
console.log(some1.and(some2).unwrap()); // 'hello'

const none = Option.none();
console.log(none.and(some2).isNone()); // true
```

##### `or(other: Option<T>): Option<T>`

Returns `other` if `None`, returns self if `Some`.

**Parameters**:
- `other: Option<T>` - Option to return if None

**Returns**: `Option<T>` - self if Some, other if None

**Example**:
```typescript
const some = Option.some(42);
const other = Option.some(100);
console.log(some.or(other).unwrap()); // 42

const none = Option.none<number>();
console.log(none.or(other).unwrap()); // 100
```

##### `andThen<U>(fn: (value: T) => Option<U>): Option<U>`

If `Some`, executes the function and chains to the next Option. If `None`, returns unchanged.
Similar to `map`, but differs in that the function returns an `Option` (also known as flatMap).

**Parameters**:
- `fn: (value: T) => Option<U>` - Function to generate the next Option from the Some value

**Returns**: `Option<U>` - Chained Option

**Example**:
```typescript
function parseNumber(str: string): Option<number> {
  const num = Number.parseFloat(str);
  if (Number.isNaN(num)) {
    return Option.none();
  }
  return Option.some(num);
}

const result = Option.some('42')
  .andThen((str) => parseNumber(str))
  .map((num) => num * 2);

console.log(result.unwrap()); // 84

const invalid = Option.some('invalid')
  .andThen((str) => parseNumber(str));

console.log(invalid.isNone()); // true
```

#### Filtering

##### `filter(predicate: (value: T) => boolean): Option<T>`

If `Some` and the value satisfies the condition, returns unchanged; otherwise returns `None`.
If already `None`, returns `None` unchanged.

**Parameters**:
- `predicate: (value: T) => boolean` - Condition function to check the value

**Returns**: `Option<T>` - Some if condition is met, otherwise None

**Example**:
```typescript
const option = Option.some(42);
const filtered = option.filter((n) => n > 40);
console.log(filtered.unwrap()); // 42

const filteredOut = option.filter((n) => n > 50);
console.log(filteredOut.isNone()); // true

const none = Option.none<number>();
const stillNone = none.filter((n) => n > 0);
console.log(stillNone.isNone()); // true
```

#### Conversion

##### `toResult<E>(error: E): Result<T, E>`

Converts an `Option` to a `Result`. `Some` becomes `Ok`, `None` becomes `Err`.

**Parameters**:
- `error: E` - Error value to use if None

**Returns**: `Result<T, E>` - Ok(value) if Some, Err(error) if None

**Example**:
```typescript
const some = Option.some(42);
const ok = some.toResult('No value');
console.log(ok.unwrap()); // 42

const none = Option.none<number>();
const err = none.toResult('No value');
console.log(err.isErr()); // true
console.log(err.unwrapOrElse((e) => e)); // 'No value'
```
