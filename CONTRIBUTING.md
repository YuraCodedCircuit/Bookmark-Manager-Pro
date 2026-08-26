# Contributing to Bookmark Manager Pro

Thank you for considering a contribution to Bookmark Manager Pro.

## Before contributing

- Search existing issues before opening a new one.
- Use public issues only for non-sensitive bugs, accessibility problems, and
  feature discussions.
- Report suspected vulnerabilities through
  [GitHub private vulnerability reporting](https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/security/advisories/new).
- Read the [Code of Conduct](CODE_OF_CONDUCT.md) and
  [Security Policy](SECURITY.md).
- Keep proposals consistent with the local-first privacy model and support for
  Chrome, Firefox, and Microsoft Edge.

## Development setup

Follow [INSTALLATION.md](INSTALLATION.md) and [DEVELOPMENT.md](DEVELOPMENT.md).
The repository declares its supported Node.js and pnpm versions in
`package.json`.

```text
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build:chrome
pnpm build:firefox
pnpm build:edge
```

## Contribution guidelines

- Keep changes focused and avoid unrelated refactoring.
- Use strict TypeScript and preserve the documented architecture boundaries.
- Keep browser APIs behind typed platform adapters.
- Keep domain logic independent of React and extension entry points.
- Validate imported files, runtime messages, URLs, and stored data.
- Preserve keyboard operation, visible focus, screen-reader names, reduced
  motion, high contrast, text zoom, and logical interaction order.
- Add proportionate tests for behavior changes and failure paths.
- Update affected documentation and both changelogs under `Unreleased`.
- Do not add analytics, tracking, accounts, remote storage, advertisements,
  remote executable code, or unnecessary permissions.

## Test data and privacy

Tests, screenshots, logs, issues, and pull requests must use synthetic data. Do
not submit real bookmark titles, URLs, notes, profile names, browser history,
credentials, encryption material, or other personal information.

## Pull requests

A pull request should explain the problem, the retained behavior, important
design decisions, verification performed, accessibility and cross-browser
effects, and any remaining limitations. Large or architecture-changing proposals
should be discussed in an issue before implementation.

Contributions are licensed under the same GPLv3-only terms as the project.
