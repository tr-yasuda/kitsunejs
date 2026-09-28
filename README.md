# kitsunejs

[![npm version](https://img.shields.io/npm/v/kitsunejs.svg)](https://www.npmjs.com/package/kitsunejs)
[![npm downloads](https://img.shields.io/npm/dm/kitsunejs.svg)](https://www.npmjs.com/package/kitsunejs)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)

Rust-inspired `Result` and `Option` types for TypeScript. Use `Result<T, E>`
when an operation can fail and `Option<T>` when a value may be absent.

## Installation

```bash
npm install kitsunejs
# or: pnpm add kitsunejs
# or: yarn add kitsunejs
```

## Start with Result

`Result.try` turns a thrown value into `Err` and a returned value into `Ok`.
The caller handles both cases with `match`:

```javascript
import { Result } from 'kitsunejs';

function parseSettings(json) {
  return Result.try(() => JSON.parse(json));
}

for (const input of ['{"theme":"dark"}', '{broken']) {
  parseSettings(input).match(
    (settings) => console.log('Parsed settings:', settings),
    (error) => console.error('Invalid settings:', error),
  );
}
```

Save this as `example.mjs` and run `node example.mjs`. The second input
produces an `Err` that the caller handles without throwing. JavaScript can
throw any value, so check or normalize the error before relying on its type.

`map` transforms an `Ok` value. `andThen` chains functions that return another
`Result`; the first `Err` passes through unchanged.

```typescript
import { Result } from 'kitsunejs';

function parsePort(input: string): Result<number, string> {
  const port = Number(input);
  return Number.isInteger(port) && port > 0
    ? Result.ok(port)
    : Result.err('Invalid port');
}

function configuredPort(input: string | undefined): number {
  return Result.fromNullable(input, 'Missing port')
    .andThen(parsePort)
    .unwrapOr(8080);
}
```

## Use Option for missing values

`Option.fromNullable` creates `None` from `null` or `undefined`. Use a type
guard, `match`, or a fallback to handle the missing case.

```typescript
import { Option } from 'kitsunejs';

function displayName(name: string | undefined): string {
  return Option.fromNullable(name)
    .map((value) => value.trim())
    .unwrapOr('Guest');
}
```

For asynchronous work, `Result.tryAsync` converts rejections to `Err`.
`Result.sequence` and `Result.sequenceAsync` let you keep intermediate success
values while returning the first failure. See the [API reference](./docs/api-reference.md#sequential-processing)
for their cleanup and type inference rules.

## Documentation

| Guide | Use it for |
| --- | --- |
| [API reference](./docs/api-reference.md) | Method signatures, return values, and error behavior |
| [Recipes](./docs/recipes.md) | Validation, async work, and combining operations |
| [Rust comparison](./docs/rust-comparison.md) | Differences from Rust's `Result` and `Option` |
| [Contributing](./CONTRIBUTING.md) | Development setup, tests, and pull requests |
| [Style guide](./STYLE_GUIDE.md) | Code and documentation conventions |

## License

MIT © @tr-yasuda
