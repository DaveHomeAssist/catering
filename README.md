# Act Two Catering

A prototype marketing and lead-capture site for Act Two Catering, a real premium catering business ("Tom") serving South Jersey. It's a single-page React app (no build step — hand-written JS using the React/ReactDOM CDN globals) covering the business's services, sample menus, and a quote-request flow, deployed to GitHub Pages.

The business's actual customer-facing site today is still the Squarespace site at [acttwocatering.com](https://acttwocatering.com) — this repo is the in-progress rebuild.

## What's here

| Path | What it is |
|---|---|
| `index.html` | Static shell: loading overlay, `<noscript>` fallback content, and the script tags that load React/ReactDOM from CDN + `app.js` |
| `app.js` | The entire app — business info, service categories, sample-menu content, hash-based routing (`#/`, `#/sample-menus`, `#/contact`, etc.), and all page components. This is what actually ships. |
| `act-two-catering (3).jsx` | JSX source mirroring `app.js`. **Hand-synced, no build step ties them together** — edit both when changing the app. |
| `sw.js` | Service worker with a versioned cache key (`act-two-catering-vN`) and precache/route list |
| `manifest.json` | PWA manifest (icons, shortcuts to Sample Menus / Contact) |
| `data/sample-menus.json` | Curated sample-menu content, hand-picked from the business's real Notion recipe database. Documentation source of truth; the site itself uses an inline JS copy in `app.js`. |
| `netlify/functions/quote.js` | CORS-restricted Netlify Function that validates quote submissions and writes them to the canonical Notion Leads database. The UI confirms success only after this function returns a successful Notion write. |
| `netlify/functions/package.json` | Pins the serverless function directory to CommonJS. It has no dependencies and introduces no package install or build step. |
| `netlify.toml` | Netlify function directory + SPA redirect config (the site itself deploys via GitHub Pages, not Netlify hosting) |
| `.github/workflows/pages.yml` | Deploys the repo root to GitHub Pages on every push to `main` |
| `images/`, `icons/`, `assets/icons/` | Site photography (real photos of the business's food) and brand/favicon assets |
| `act-2-photos/` | Raw, unprocessed source photos for future hero-image swaps |
| `docs/`, `MATERIALS.md`, `catering-feature-analysis-2026-03-25.md` | Planning docs, UX audits, and a detailed materials/asset index from earlier work on the site |

## Running it

This is a static site with no build step or package manager — there's no `package.json`.

- **Locally:** serve the repo root with any static file server (e.g. `npx serve .` or `python -m http.server`) and open it in a browser. Opening `index.html` directly via `file://` will not work because the service worker and hash-routed app expect to run from an HTTP origin.
- **Deployed:** every push to `main` triggers `.github/workflows/pages.yml`, which publishes the repo root to GitHub Pages.

The quote backend deploys separately to the existing `acttwocatering.netlify.app` site. Activation requires `NOTION_API_KEY` and `NOTION_LEADS_DB_ID` in Netlify, with the Leads database shared to that Notion integration. Run `node --test tests/quote.test.cjs` before deploying the function.

## Conventions

- **`app.js` and `act-two-catering (3).jsx` are hand-synced.** There's no build/bundle step converting one to the other — if you change the app, edit both files.
- **Bump the cache version in `sw.js`** (`act-two-catering-vN`) whenever the precache list or route map changes, or returning visitors will keep getting stale assets.
- **Anti-fabrication rule:** customer-facing copy (services, phone, service area, dish names) must trace back to the real business — either the live Squarespace site or the real Notion recipe database — not invented content. See `MATERIALS.md` for the full asset/content registry.
