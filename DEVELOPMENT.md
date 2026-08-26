# Development Guide

## Prerequisites

Install Git, the Node.js version declared in `.nvmrc`, and at least one supported
browser. Chrome, Firefox, and Microsoft Edge are recommended when verifying all
release targets.

The required pnpm version is declared in `package.json`. Corepack can install and
activate it without requiring a global pnpm installation:

```text
corepack enable
corepack install
pnpm install --frozen-lockfile
```

pnpm selects an appropriate package-store location for the developer's operating
system. A custom store is optional and must not be required by repository
configuration.

## Commands

Run the webpage preview with:

```text
pnpm dev
```

Run a browser-specific extension in development mode with one of:

```text
pnpm dev:chrome
pnpm dev:firefox
pnpm dev:edge
```

Run repository checks with:

```text
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:e2e
```

Create unpacked production builds with:

```text
pnpm build:chrome
pnpm build:firefox
pnpm build:edge
```

Create browser-store ZIP archives with:

```text
pnpm package:chrome
pnpm package:firefox
pnpm package:edge
```

Generated extension builds and archives are written under `.output/`.

## Local web preview

The standard Vite preview is available at `http://127.0.0.1:5173/`. The optional
development helper can start it in the background:

```text
python tooling/start_preview_server.py --background
```

The helper listens on all local interfaces so another device on the same trusted
network can use `http://<development-machine-ip>:5173/`. The bind address shown
by a server may be `0.0.0.0`; that is not a URL to enter in a browser.

Do not expose the preview to a public or untrusted network. If the operating
system requests firewall access, allow it only on trusted private networks.

## Definition of done

A change is complete when:

- Requested behavior is implemented without unrelated changes.
- Types, validation, error handling, and accessibility are addressed.
- Relevant unit, component, and end-to-end tests pass.
- Production builds succeed for Chrome, Firefox, and Edge.
- Browser-specific behavior is tested or documented as unverified.
- Permissions, storage, schema upgrades, and privacy implications are reviewed.
- Architecture, development, and changelog documentation is current.

## Branch and commit conventions

Use focused branches and commits. Commit titles use imperative mood and describe
one logical change. Generated browser packages and development profiles must not
be committed.

## Test data

Fixtures must be synthetic and contain no personal browsing data. Large bookmark
trees should be generated deterministically. Import and schema-upgrade fixtures
must be versioned and documented.

## Release artifacts

Expected outputs include separate Chrome, Firefox, and Edge packages plus
checksums and release notes. Artifact names must include the application version,
browser target, and architecture only when architecture affects the package.

## Extension versioning

The extension version is maintained manually in `package.json`. WXT uses that
value for development manifests, production builds, and browser packages. Set
the intended release version before generating artifacts, then verify that the
same value appears in every browser-specific `manifest.json` and artifact name.

Chrome, Firefox, and Edge reject updates whose version does not advance beyond
the version already published in their store. A version change is therefore a
deliberate release action rather than a side effect of running a build command.
