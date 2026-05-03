# Countdown App

## Status: Obsolete / Deprecated

This web app is deprecated and should not be extended further.

The project direction has shifted away from the PWA approach in favor of native widget-oriented countdown experiences, especially on Android where true per-widget configuration matters.

A small installable countdown web app for Android, macOS, and Linux.

## What it does

- shows a live countdown to a specific date and time
- saves one countdown per device in local storage
- works offline after first load
- can be installed to home screen / desktop like an app
- includes a compact `?view=widget` mode for a pinned mini-window
- supports JSON export/import backups
- can optionally fire a browser notification when the timer completes

## Why this approach

A PWA is the best fit for your original goal:
- one codebase
- Android-friendly
- macOS and Linux friendly
- no app-store dependency
- easy to pin or install

## Files

- `index.html` - app shell
- `styles.css` - UI styling
- `app.js` - countdown logic and persistence
- `sw.js` - offline cache service worker
- `manifest.webmanifest` - PWA manifest
- `icons/` - app icons

## Run locally

```bash
cd countdown-tool
npm run serve
```

Then open:

```text
http://localhost:4173
```

## Install on devices

### Android
Open the site in Chrome → menu → **Add to Home screen** or **Install app**.

### macOS
Open in Chrome or Edge → install icon in the address bar.

### Linux
Open in Chrome, Brave, or Edge → install icon in the address bar.

## Compact widget mode

Open this URL:

```text
http://localhost:4173/?view=widget
```

That gives you a cleaner days-left view for a narrow pinned window.

## Verification

```bash
npm run check
```

## Deprecation note

- Do not add new features here.
- Treat this repo as archived reference material unless a migration task explicitly requires touching it.
