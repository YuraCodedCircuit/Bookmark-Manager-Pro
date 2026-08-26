# Installation

Bookmark Manager Pro targets Chrome, Firefox, and Microsoft Edge. The current
application is an Alpha release. Browser-store installation links will be added
when this implementation is published.

## Browser-store installation

When an official release becomes available, install it only from the listing
linked by the project repository. Browser stores manage installation, updates,
permissions, and removal. Avoid packages or listings published by unrelated
developers under a similar name.

## Development installation

Development builds require the Node.js and pnpm versions declared in
`package.json`, followed by:

```text
pnpm install --frozen-lockfile
pnpm build:chrome
pnpm build:firefox
pnpm build:edge
```

Generated extensions are written to `.output/`.

### Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked**.
4. Choose `.output/chrome-mv3`.

### Microsoft Edge

1. Open `edge://extensions`.
2. Enable Developer mode.
3. Select **Load unpacked**.
4. Choose `.output/edge-mv3`.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Choose `.output/firefox-mv3/manifest.json`.

Firefox can also load the `*-firefox-mv3.zip` archive produced by
`pnpm package:firefox`. Do not create
the archive by compressing the `firefox-mv3` folder itself: `manifest.json` must
be at the archive root, not inside a top-level `firefox-mv3/` directory.

Firefox removes temporary add-ons when the browser closes. A signed browser-store
release is required for normal persistent installation.

## Local preview

The development-only preview can be started from the repository root with:

```text
python tooling/start_preview_server.py --background
```

It is then available at `http://127.0.0.1:5173/`. The preview is not an installed
extension and cannot reproduce every browser API or extension-manifest behavior.

## Data compatibility

This implementation is a new application and does not migrate data from the
legacy Bookmark Manager Pro extension. Development builds and browser-specific
installations may also use separate browser-managed storage.

## Removal

Remove the extension through the browser's extension-management page. Removing
an extension or its browser profile may permanently delete locally stored data.
