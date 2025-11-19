# Contributing to kitsunejs

Thank you for your interest in contributing to **kitsunejs**! We welcome contributions of all kinds—bug fixes, new features, documentation improvements, and more.

This guide will help you get started with contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How Can I Contribute?](#how-can-i-contribute)
3. [Development Setup](#development-setup)
4. [Development Workflow](#development-workflow)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Commit Guidelines](#commit-guidelines)
8. [Pull Request Process](#pull-request-process)
9. [Community and Communication](#community-and-communication)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful, considerate, and collaborative when interacting with others in the community.

Key principles:
- **Be respectful**: Treat everyone with respect and kindness
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together to improve the project
- **Be patient**: Remember that everyone is learning and growing

If you experience or witness unacceptable behavior, please report it by opening an issue or contacting the maintainers.

---

## How Can I Contribute?

There are many ways to contribute to kitsunejs:

- **Report bugs**: Found a bug? Open an issue with details on how to reproduce it
- **Suggest features**: Have an idea for a new feature? Open an issue to discuss it
- **Fix bugs**: Browse the issue tracker and submit a PR to fix an existing bug
- **Add features**: Implement new functionality that aligns with the project's goals
- **Improve documentation**: Help improve docs, examples, or comments
- **Write tests**: Increase test coverage or add new test cases
- **Review PRs**: Help review and test pull requests from other contributors

---

## Development Setup

### Prerequisites

- **Node.js**: Version 22.x or higher
- **pnpm**: Version 10.20.0 or higher (specified in `package.json`)

### Setup Steps

1. **Fork the repository**
   Click the "Fork" button on the GitHub repository page.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/kitsunejs.git
   cd kitsunejs
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Verify the setup**
   ```bash
   # Run type checking
   pnpm type-check

   # Run tests
   pnpm test

   # Build the project
   pnpm build

   # Run linting
   pnpm lint
   ```

If all commands complete successfully, you're ready to start contributing!

---

## Development Workflow

### Branching Strategy

We use a simple branching model:

- **`main`**: The default branch containing stable code
- **Feature branches**: Create a new branch for each feature or bug fix

Branch naming conventions:
- `feature/description` - for new features (e.g., `feature/add-flatten-method`)
- `bugfix/description` - for bug fixes (e.g., `bugfix/fix-unwrap-panic`)
- `docs/description` - for documentation changes (e.g., `docs/update-contributing`)
- `refactor/description` - for refactoring (e.g., `refactor/simplify-error-handling`)

### Typical Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   Edit the code, add tests, and update documentation as needed.

3. **Run checks locally**
   ```bash
   pnpm lint          # Check code style
   pnpm type-check    # Check types
   pnpm test          # Run tests
   pnpm build         # Ensure it builds
   ```

4. **Commit your changes**
   Follow the [commit guidelines](#commit-guidelines).

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   Go to the original repository and click "New Pull Request".

---

## Coding Standards

kitsunejs follows strict coding standards to maintain consistency and quality. Please review the [**Style Guide**](./STYLE_GUIDE.md) for detailed rules.

### Key Rules

- **Use `type` instead of `interface`** for type definitions
- **Use `function` declarations** instead of arrow functions for top-level functions
- **Specify return types** for all functions
- **Use `async/await`** for asynchronous code (avoid `.then()/.catch()` chains)
- **Avoid `any`**: Use `unknown` or generics instead
- **Follow naming conventions**:
  - Variables/functions: `camelCase`
  - Types/classes: `PascalCase`
  - Constants: `UPPER_CASE`

### Automated Checks

The project uses [Biome](https://biomejs.dev/) for linting and formatting.

Run the following commands before committing:

```bash
# Check for issues
pnpm lint

# Automatically fix issues
pnpm format
```

---

## Testing

All code changes should include appropriate tests.

### Test Files

- **Runtime tests**: `*.test.ts` (using [Vitest](https://vitest.dev/))
- **Type tests**: `*.test-d.ts` (for type-level checks)

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run a specific test file
pnpm test src/core/result.test.ts
```

### Writing Tests

- Use descriptive test names that explain what is being tested
- Follow the existing test structure (see `tests/` directory for examples)
- Ensure edge cases are covered
- Test both success and error paths

Example:

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
});
```

---

## Commit Guidelines

We recommend using **[Conventional Commits](https://www.conventionalcommits.org/)** for commit messages. This helps maintain a clear and readable commit history.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, whitespace, etc.)
- `refactor`: Code refactoring without functional changes
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build scripts, etc.)

### Examples

```bash
# Feature
git commit -m "feat(result): add flatten method for nested Results"

# Bug fix
git commit -m "fix(option): handle None in andThen correctly"

# Documentation
git commit -m "docs: update README with async examples"

# Refactoring
git commit -m "refactor(result): simplify error handling logic"
```

---

## Pull Request Process

### Pull Request Size

Please keep pull requests **small and focused**. Large PRs are harder to review and may take longer to be merged.

**Guidelines**:
- Focus on a single feature, bug fix, or improvement per PR
- Break down large features into smaller, logical chunks
- Aim for PRs that can be reviewed in 15-30 minutes
- If your PR grows too large, consider splitting it into multiple PRs

**Benefits of small PRs**:
- ✅ Faster review and feedback cycles
- ✅ Easier to identify and fix issues
- ✅ Lower risk of merge conflicts
- ✅ Clearer commit history

**When in doubt**, split the work into multiple PRs. It's better to have several small, focused PRs than one large, complex PR.

---

### Before Submitting

1. **Ensure all checks pass**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm test
   pnpm build
   ```

2. **Update documentation** if your changes affect the public API

3. **Add or update tests** for your changes

4. **Review your own code** for any issues or improvements

### Submitting a PR

1. **Fill out the PR template**
   The template includes a checklist to ensure you've completed all necessary steps.

2. **Link related issues**
   If your PR fixes or addresses an issue, reference it (e.g., "Closes #123").

3. **Provide context**
   Explain what your changes do, why they're needed, and any trade-offs or design decisions.

4. **Be responsive**
   Address feedback from reviewers promptly and professionally.

### Review Process

- Maintainers will review your PR and provide feedback
- You may be asked to make changes or clarifications
- Once approved, a maintainer will merge your PR

---

## Community and Communication

### Asking Questions

If you have questions about the project, feel free to:

- **Open an issue**: For questions about usage, bugs, or feature requests
- **Start a discussion**: For broader topics or proposals

### Getting Help

If you're stuck or need help with your contribution:

- Review the [documentation](./docs/)
- Check existing issues and PRs for similar problems
- Ask for help in your issue or PR

---

## Thank You!

Your contributions make kitsunejs better for everyone. We appreciate your time and effort in helping improve this project!

Happy coding! 🦊
