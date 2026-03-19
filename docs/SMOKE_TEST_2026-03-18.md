# [2026-03-18] Catering [test] Run smoke test

## Goal

Confirm the static catering site still renders correctly, navigates cleanly, and keeps the main inquiry flow intact after UI or asset changes.

## Pre Check

1. Confirm `index.html`, `app.js`, `manifest.json`, and `sw.js` are the intended files under test
2. Confirm hero/menu/about/reviews images load with no missing file errors
3. Confirm the favicon and manifest paths resolve from `assets/icons/favicon/`

## Core Checks

1. Open the home page and confirm the first screen renders without the loading shell getting stuck
2. Navigate across the main sections and confirm the route/hash navigation still works
3. Open the menu and confirm cards/images/layout still render correctly
4. Use the primary inquiry/contact flow once
5. Reload and confirm the app still boots cleanly
6. Confirm PWA manifest and service worker registration do not throw obvious errors
7. Confirm one edge feature touched by the patch: favicon/manifest/icon paths resolve correctly

## UI Checks

1. Confirm focus order is usable by keyboard through nav and inquiry controls
2. Confirm the primary mobile layout does not break at narrow width
3. Confirm loading, error, or status feedback still appears when expected

## Failure Log

- Area:
  Result:
  Notes:

## Exit Rule

Ship only when the changed asset path flow and one adjacent user flow both pass.
