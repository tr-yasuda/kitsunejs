# Changelog

## Unreleased

### Breaking Changes

- `Result.andThen` and `Result.andThenAsync` now accept independent callback
  error types and infer the union of errors from both operations. Custom
  `Result` subclasses must expose both the same-error and independent-error
  overloads to support the full API. Their implementations use `<U, F = E>` and
  return `Result<U, E | F>` or `Promise<Result<U, E | F>>`, respectively. Legacy
  overrides can still type-check but do not expose independent callback errors.
  Compatibility overloads preserve callbacks with different Result types in
  their branches when all errors are already covered by `E`. Existing calls
  specifying only `U` continue to use `F = E`; omit type arguments or specify
  both to compose different error types. Error values and runtime short-circuit
  behavior are preserved. `and` and `flatten` retain their existing contracts.
