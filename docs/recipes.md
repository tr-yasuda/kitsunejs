# Recipes

## Table of Contents

1. Error Handling
2. Null Safety
3. Asynchronous Operations
4. Data Validation
5. Combining Multiple Operations
6. Integration with Other Libraries

---

## 1. Error Handling

### 1.1 API Call Error Handling

> Use case: When you want to properly handle fetch API failures

**Problem**: Need to properly handle fetch API failures

**Solution**:
```typescript
import { Result } from 'kitsunejs';

type User = {
  id: number;
  name: string;
};

type ApiError = {
  status: number;
  message: string;
};

async function fetchUser(id: number): Promise<Result<User, ApiError>> {
  return Result.tryAsync(async () => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw {
        status: response.status,
        message: await response.text(),
      };
    }
    return await response.json();
  });
}

// Usage example
async function main() {
  const userResult = await fetchUser(123);

  if (userResult.isOk()) {
    console.log('User:', userResult.unwrap());
  } else {
    const error = userResult.unwrapOrElse((err) => err);
    console.error(`Error ${error.status}: ${error.message}`);
  }
}
```

### 1.2 Unifying Multiple Error Types

> Use case: When you want to combine different error types into one

**Problem**: Need to combine different error types into one

**Solution**:
```typescript
type ValidationError = { type: 'validation'; field: string; message: string };
type NetworkError = { type: 'network'; status: number };
type AppError = ValidationError | NetworkError;

function validateUser(user: unknown): Result<User, ValidationError> {
  // Validation logic
  if (!user || typeof user !== 'object') {
    return Result.err({
      type: 'validation',
      field: 'user',
      message: 'Invalid user object',
    });
  }
  return Result.ok(user as User);
}

function saveUser(user: User): Result<void, NetworkError> {
  // Save logic (omitted)
  return Result.ok(undefined);
}

// Convert to unified error type using mapErr
function processUser(input: unknown): Result<void, AppError> {
  return validateUser(input)
    .mapErr((e): AppError => e)
    .andThen((user) => saveUser(user).mapErr((e): AppError => e));
}
```

---

## 2. Null Safety

### 2.1 Safe Handling of Nullable Values

> Use case: When you want to safely handle values that may be `null` or `undefined`

**Problem**: Need to safely handle values that may be `null` or `undefined`

**Solution**:
```typescript
import { Option } from 'kitsunejs';

type User = {
  id: number;
  name: string | null;
};

// Traditional code (requires null checks)
function getUserNameOld(userId: number): string | null {
  const user = findUser(userId);
  if (user === null) return null;
  if (user.name === null) return null;
  return user.name.toUpperCase();
}

// Code using Option
function getUserName(userId: number): Option<string> {
  return Option.fromNullable(findUser(userId))
    .andThen((user) => Option.fromNullable(user.name))
    .map((name) => name.toUpperCase());
}

// Usage example
const name = getUserName(123).unwrapOr('Unknown');
console.log(name);
```

### 2.2 Getting the First Valid Value from an Array

> Use case: When you want to try multiple retrieval methods and use the first successful one

**Problem**: Want to try multiple retrieval methods and use the first successful one

**Solution**:
```typescript
function getConfig(key: string): Option<string> {
  // Try in order: environment variable → config file → default value
  return Option.fromNullable(process.env[key])
    .or(Option.fromNullable(configFile[key]))
    .or(Option.some(defaultConfig[key]));
}

// Usage example
const port = getConfig('PORT').unwrapOr('3000');
const host = getConfig('HOST').unwrapOr('localhost');
```

---

## 3. Asynchronous Operations

### 3.1 Handling Promise Errors with Result

> Use case: When you want to handle Promise rejections as Result

**Problem**: Want to handle Promise rejections as Result

**Solution**:
```typescript
type Data = {
  id: number;
  value: string;
};

async function loadData(): Promise<Result<Data, Error>> {
  return Result.tryAsync(async () => {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  });
}

// Usage example
async function main() {
  const result = await loadData();

  if (result.isOk()) {
    console.log('Data:', result.unwrap());
  } else {
    console.error('Failed to load data:', result.unwrapOrElse((e) => e.message));
  }
}
```

### 3.2 Parallel Execution of Multiple Async Operations

> Use case: When you want to execute multiple async operations in parallel and continue only if all succeed

**Problem**: Want to execute multiple async operations in parallel and continue only if all succeed

**Solution**:
```typescript
async function loadMultipleUsers(ids: number[]): Promise<Result<User[], Error>> {
  const promises = ids.map((id) => fetchUser(id));
  const results = await Promise.all(promises);
  return Result.all(results);
}

// Usage example
async function main() {
  const usersResult = await loadMultipleUsers([1, 2, 3]);

  if (usersResult.isOk()) {
    const users = usersResult.unwrap();
    console.log(`Loaded ${users.length} users`);
  } else {
    console.error('Failed to load some users');
  }
}
```

---

## 4. Data Validation

### 4.1 Chained Validation

> Use case: When you want to execute multiple validations sequentially

**Problem**: Want to execute multiple validations sequentially

**Solution**:
```typescript
type ValidationError = string;

function validateEmail(email: string): Result<string, ValidationError> {
  if (!email.includes('@')) {
    return Result.err('Invalid email format');
  }
  return Result.ok(email);
}

function validateLength(email: string): Result<string, ValidationError> {
  if (email.length < 5) {
    return Result.err('Email too short');
  }
  return Result.ok(email);
}

function validateDomain(email: string): Result<string, ValidationError> {
  if (!email.endsWith('@example.com')) {
    return Result.err('Invalid domain');
  }
  return Result.ok(email);
}

// Chain execution
const result = validateEmail('user@example.com')
  .andThen(validateLength)
  .andThen(validateDomain);

if (result.isOk()) {
  console.log('Valid email:', result.unwrap());
} else {
  console.error('Validation failed:', result.unwrapOrElse((e) => e));
}
```

### 4.2 Conditional Filtering with Option

> Use case: When you want to retrieve only values that meet a condition

**Problem**: Want to retrieve only values that meet a condition

**Solution**:
```typescript
function getAdultUsers(users: User[]): User[] {
  return users
    .map((user) => Option.some(user).filter((u) => u.age >= 18))
    .filter((opt) => opt.isSome())
    .map((opt) => opt.unwrap());
}

// Usage example
const users = [
  { id: 1, name: 'Alice', age: 25 },
  { id: 2, name: 'Bob', age: 17 },
  { id: 3, name: 'Charlie', age: 30 },
];

const adults = getAdultUsers(users);
console.log(adults); // [{ id: 1, name: 'Alice', age: 25 }, { id: 3, name: 'Charlie', age: 30 }]
```

---

## 5. Combining Multiple Operations

### 5.1 Result.all - All Validations/Operations Must Succeed

> Use case: When you want to continue only if all validations or async operations succeed

**Problem**: Want to validate multiple fields and create data only if all succeed

**Solution**:
```typescript
import { Result } from 'kitsunejs';

type ValidationError = { field: string; message: string };
type UserInput = { name: string; age: string; email: string };

function validateName(name: string): Result<string, ValidationError> {
  if (name.length < 2) {
    return Result.err({ field: 'name', message: 'Name too short' });
  }
  return Result.ok(name);
}

function validateAge(age: string): Result<number, ValidationError> {
  const parsed = Number.parseInt(age, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return Result.err({ field: 'age', message: 'Invalid age' });
  }
  return Result.ok(parsed);
}

function validateEmail(email: string): Result<string, ValidationError> {
  if (!email.includes('@')) {
    return Result.err({ field: 'email', message: 'Invalid email' });
  }
  return Result.ok(email);
}

// Execute all validations and create user only if all succeed
function createUser(input: UserInput): Result<User, ValidationError> {
  const results = [
    validateName(input.name),
    validateAge(input.age),
    validateEmail(input.email),
  ];

  // Result.all returns Ok<T[]> if all Ok, otherwise returns the first Err
  return Result.all(results).map(([name, age, email]) => ({
    name,
    age,
    email,
  }));
}

// Usage example
const userResult = createUser({ name: 'Alice', age: '25', email: 'alice@example.com' });
if (userResult.isOk()) {
  console.log('User created:', userResult.unwrap());
}
```

### 5.2 Result.any - Fallback from Multiple Backends

> Use case: When you want to try multiple operations and use any successful result

**Problem**: Want to make requests to multiple API endpoints and use the result if any succeeds

**Solution**:
```typescript
async function fetchFromMultipleServers(
  path: string
): Promise<Result<Data, Error[]>> {
  // Parallel requests to multiple servers
  const results = await Promise.all([
    Result.tryAsync(() => fetch(`https://api1.example.com${path}`).then(r => r.json())),
    Result.tryAsync(() => fetch(`https://api2.example.com${path}`).then(r => r.json())),
    Result.tryAsync(() => fetch(`https://api3.example.com${path}`).then(r => r.json())),
  ]);

  // Result.any returns the first Ok. If all Err, returns Err<E[]>
  return Result.any(results);
}

// Usage example
const dataResult = await fetchFromMultipleServers('/users/123');
if (dataResult.isOk()) {
  console.log('Data loaded:', dataResult.unwrap());
} else {
  console.error('All servers failed:', dataResult.unwrapOrElse((errors) => errors));
}
```

### 5.3 Option.all - When All Fields Are Required

> Use case: When you want to continue only if all optional values exist

**Problem**: Want to retrieve multiple required items from a config file and skip if any is missing

**Solution**:
```typescript
import { Option } from 'kitsunejs';

type Config = {
  apiKey: string;
  apiSecret: string;
  endpoint: string;
};

function loadConfig(data: Record<string, string | undefined>): Option<Config> {
  const options = [
    Option.fromNullable(data.apiKey),
    Option.fromNullable(data.apiSecret),
    Option.fromNullable(data.endpoint),
  ];

  // Option.all returns Some<T[]> if all Some, otherwise returns None
  return Option.all(options).map(([apiKey, apiSecret, endpoint]) => ({
    apiKey,
    apiSecret,
    endpoint,
  }));
}

// Usage example
const configData = {
  apiKey: 'key123',
  apiSecret: 'secret456',
  endpoint: 'https://api.example.com',
};

const config = loadConfig(configData);
if (config.isSome()) {
  console.log('Config loaded:', config.unwrap());
} else {
  console.error('Required config fields are missing');
}
```

### 5.4 Option.any - Priority-Based Fallback

> Use case: When you want to try candidates in priority order, like env vars → config → default

**Problem**: Want to retrieve config values from multiple sources and use the first one found

**Solution**:
```typescript
const configFile: Record<string, string | undefined> = { PORT: '8080' };
const defaultConfig: Record<string, string> = { PORT: '3000', HOST: 'localhost' };

function getConfigValue(key: string): Option<string> {
  const options = [
    Option.fromNullable(process.env[key]),           // Highest priority: env vars
    Option.fromNullable(configFile[key]),            // Next: config file
    Option.fromNullable(defaultConfig[key]),         // Last: default
  ];

  // Option.any returns the first Some. If all None, returns None
  return Option.any(options);
}

// Usage example
const port = getConfigValue('PORT').unwrapOr('3000');
const host = getConfigValue('HOST').unwrapOr('localhost');
console.log(`Server will run on ${host}:${port}`);
```

### 5.5 Converting Between Result and Option

> Use case: When you want to properly convert between Result and Option

**Problem**: Want to properly convert between Result and Option

**Solution**:
```typescript
// Option → Result
const option = Option.some(42);
const result = option.toResult('No value found');
console.log(result.unwrap()); // 42

const none = Option.none<number>();
const errResult = none.toResult('No value found');
console.log(errResult.isErr()); // true

// Result → Option
const okResult = Result.ok(42);
const some = okResult.toOption();
console.log(some.unwrap()); // 42

const err = Result.err('error');
const noneFromErr = err.toOption();
console.log(noneFromErr.isNone()); // true (error info is discarded)
```

### 5.6 Combining Multiple Results

> Use case: When you want to combine multiple operation results into a single value

**Problem**: Want to combine multiple operation results into a single value

**Solution**:
```typescript
type User = { name: string; age: number };

function getName(): Result<string, Error> {
  return Result.ok('Alice');
}

function getAge(): Result<number, Error> {
  return Result.ok(30);
}

// Create User only if both succeed
const userResult = getName().andThen((name) =>
  getAge().map((age) => ({ name, age }))
);

if (userResult.isOk()) {
  console.log('User:', userResult.unwrap());
}
```

---

## 6. Integration with Other Libraries

### 6.1 Integration with Zod (Schema Validation)

> Use case: When you want to handle Zod validation results as Result

**Problem**: Want to handle Zod validation results as Result

**Solution**:
```typescript
import { z } from 'zod';
import { Result } from 'kitsunejs';

const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
});

type User = z.infer<typeof userSchema>;

function parseUser(data: unknown): Result<User, z.ZodError> {
  return Result.try(() => userSchema.parse(data));
}

// Usage example
const input = { name: 'Alice', age: 25, email: 'alice@example.com' };
const userResult = parseUser(input);

if (userResult.isOk()) {
  console.log('Valid user:', userResult.unwrap());
} else {
  const error = userResult.unwrapOrElse((e) => e);
  console.error('Validation errors:', error.errors);
}
```

### 6.2 Integration with Express (Error Handling)

> Use case: When you want to use Result in Express route handlers

**Problem**: Want to use Result in Express route handlers

**Solution**:
```typescript
import express from 'express';
import { Result } from 'kitsunejs';

const app = express();

type ApiError = {
  status: number;
  message: string;
};

async function fetchUser(id: number): Promise<Result<User, ApiError>> {
  // Implementation omitted
  return Result.ok({ id, name: 'Alice' });
}

app.get('/users/:id', async (req, res) => {
  const userId = Number(req.params.id);
  const result = await fetchUser(userId);

  if (result.isOk()) {
    res.json(result.unwrap());
  } else {
    const error = result.unwrapOrElse((err) => err);
    res.status(error.status).json({ error: error.message });
  }
});

app.listen(3000);
```

---

## Best Practices

### 1. Avoid Early Returns

By using Result/Option, you can avoid early returns and nested if statements.

**Bad example**:
```typescript
function processUser(userId: number): string | null {
  const user = findUser(userId);
  if (!user) return null;

  const profile = getUserProfile(user);
  if (!profile) return null;

  const name = profile.name;
  if (!name) return null;

  return name.toUpperCase();
}
```

**Good example**:
```typescript
function processUser(userId: number): Option<string> {
  return Option.fromNullable(findUser(userId))
    .andThen((user) => Option.fromNullable(getUserProfile(user)))
    .andThen((profile) => Option.fromNullable(profile.name))
    .map((name) => name.toUpperCase());
}
```

### 2. Minimize unwrap() Usage

`unwrap()` can cause panics, so prefer `unwrapOr()` or `unwrapOrElse()`.

**Bad example**:
```typescript
const result = fetchUser(123);
const user = result.unwrap(); // UnwrapError if Err
```

**Good example**:
```typescript
// Use default value
const user = result.unwrapOr({ id: 0, name: 'Unknown' });

// Or handle error explicitly
if (result.isOk()) {
  const user = result.unwrap();
  // ...
} else {
  console.error('Failed to fetch user');
}
```

**When it's okay to use unwrap()**:
- Test code
- Sample code / demo code
- When Ok/Some is guaranteed (e.g., `Result.ok(42).unwrap()`)

See the unwrap section in [API Reference](./api-reference.md) for details.

### 3. Specify Types Explicitly

Especially for complex chains, specifying types improves readability.

**Good example**:
```typescript
const result: Result<User, ApiError> = fetchUser(123)
  .andThen((user) => validateUser(user))
  .andThen((user) => saveUser(user));

const option: Option<string> = Option.fromNullable(getValue())
  .filter((v) => v.length > 0)
  .map((v) => v.toUpperCase());
```

### 4. Use Specific Error Types

Don't leave error types as `unknown` or `Error`; define specific types.

**Bad example**:
```typescript
function fetchUser(id: number): Result<User, unknown> {
  // ...
}
```

**Good example**:
```typescript
type FetchError =
  | { type: 'network'; status: number }
  | { type: 'validation'; message: string }
  | { type: 'not_found'; id: number };

function fetchUser(id: number): Result<User, FetchError> {
  // ...
}
```

### 5. Distinguishing Between andThen and map

- `map`: When the function returns a regular value
- `andThen`: When the function returns Result/Option (to avoid nesting)

```typescript
// map: T => U
const doubled = Result.ok(21).map((n) => n * 2);

// andThen: T => Result<U, E>
const result = Result.ok(10).andThen((n) => divide(n, 2));
```
