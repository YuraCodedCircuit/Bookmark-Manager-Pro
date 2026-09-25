# What's New in 0.5.2

Released September 25, 2026.

This release improves folder loading on older computers and expands the default
appearance controls used when new folders are created.

## Highlights

- **Faster new tabs** - The app waits for the current folder before displaying
  its saved style, avoids repeated folder reads, and no longer flashes Home's
  appearance first.
- **More reliable Save current URL popup** - The folder picker loads lightweight
  folder information, validates branches as they are opened, and keeps Home
  available with a Retry action if the complete tree cannot be loaded.
- **Smaller, reusable folder wallpapers** - Folder background images are resized
  and compressed locally before saving. Identical wallpapers are stored once
  and shared by folders that use them.
- **Complete new-folder style defaults** - Appearance settings now include the
  folder view, background, and navigation options from Customize folder style.
  These defaults apply to newly created folders without changing existing ones.

## Appearance Improvements

- An optional setting accepts folder wallpaper source files up to 10 MB instead
  of the default 1 MB limit while retaining local processing and safety limits.
- Background choices use a segmented control, and Color and Gradient include
  random-generation actions.

## Full Changelog

See the [complete changelog](./CHANGELOG.md) for the permanent release history.
