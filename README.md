# Countdown App

A small installable countdown web app designed to work across Android, macOS, and Linux.

## Current status

This repo contains **v1**, a lightweight PWA focused on:
- a clean countdown display
- per-device date/time entry
- offline support
- installability to home screen or desktop
- durable local persistence on each device
- manual backup export/import

## Why this architecture

The first version is intentionally web-first.

That gives us:
- one codebase for phone and desktop
- easy free hosting
- Android home screen install support
- desktop pinning as an app-like window
- a straightforward path to future cloud sync

## Current persistence model

Each device stores its own countdown locally.

That means:
- your Android phone can have one countdown
- your Linux laptop can have another
- your Mac can have another
- refreshes and reopens keep the device's saved countdown

This is a good fit for the requirement that **each device can enter its own date and time**.

## Important note about 2-year durability

Browser local storage is practical and usually durable, but it should not be treated as the sole long-term guarantee for a 2-year retention requirement.

So the current v1 safety model is:
- local persistence on each device
- installable PWA behavior
- JSON backup export/import

## Recommended next step

The best upgrade is:
- keep this static frontend
- deploy it free online
- add a tiny cloud persistence layer
- give each device a stable device ID
- store device-specific countdowns in a small hosted database

That would satisfy the "2 years and not forgotten" goal much more reliably than browser storage alone.

## Files

- `index.html` - app shell
- `styles.css` - UI styling
- `app.js` - countdown logic, persistence, import/export, install flow
- `sw.js` - offline cache service worker
- `manifest.webmanifest` - PWA manifest
- `icons/` - app icons

## Local development

Run a small HTTP server so the service worker can register:

```bash
cd countdown-tool
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173
```

## Free deployment options

Recommended order:
1. Cloudflare Pages
2. Netlify
3. GitHub Pages
4. Vercel

For this project, **Cloudflare Pages** is the best default recommendation.

## Planned roadmap

### v1
- [x] Countdown PWA
- [x] Installable
- [x] Offline support
- [x] Per-device persistence
- [x] Backup export/import

### v2
- [ ] Free online deployment
- [ ] Stable per-device cloud persistence
- [ ] 2-year retention strategy
- [ ] Simple device identity model
- [ ] Optional notification support

## Repo intent

This repository is the canonical home for the Countdown App project under `bagginz-ventures`.
