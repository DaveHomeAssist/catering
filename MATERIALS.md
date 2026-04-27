# Act Two Catering — materials index

Single registry for everything the project depends on. Update this file when you add or move a material. Last refreshed: 2026-04-27.

## Live links

| What | Where |
|---|---|
| Production site | https://davehomeassist.github.io/act-two-catering/ |
| Repo | https://github.com/DaveHomeAssist/act-two-catering |
| Deploy workflow | `.github/workflows/pages.yml` (push to `main` → GH Pages) |
| Source Squarespace (still Tom's customer-facing site at apex domain) | https://acttwocatering.com / https://www.acttwocatering.com |
| Today's Notion session log | https://www.notion.so/34f255fc8f448180b298fe9c682a50d2 |

## Source files

| File | Role |
|---|---|
| `index.html` | Static shell, fallback noscript, loading overlay, brand-mark wiring |
| `app.js` | Built IIFE bundle, what actually ships. Single source of truth at runtime. |
| `act-two-catering (3).jsx` | JSX source mirroring `app.js`. Hand-synced, no build step ties them — edit both. |
| `sw.js` | Service worker. Cache key `act-two-catering-vN`; bump N every time the route map or precache list changes. Currently v5. |
| `manifest.json` | PWA manifest. Description + shortcuts must match real routes. |

## Data

| File | Role |
|---|---|
| `data/sample-menus.json` | Canonical curation snapshot for the 3 sample menus. 39 dishes hand-picked from Notion DB Recipes (collection `e7d1db52`) on 2026-04-27. The site uses an inline JS const that mirrors this; treat the JSON as the documentation source of truth. |

## Brand assets

| File | Role |
|---|---|
| `assets/icons/svg/A2C_icon_animated.svg` | Animated build-sequence brand mark (Header + loading overlay) |
| `assets/icons/svg/A2C_icon_layered.svg` | Static layered version (favicon source) |
| `assets/icons/svg/preview.html` | Local preview/QA page for the SVGs |
| `assets/icons/favicon/` | Sized PNG favicons (32, 192, 512, etc.) and `favicon.svg` |
| `icons/` | Duplicate set at repo root — may be stale; check before editing |
| `favicon.png` | Root favicon shortcut |

## Photography

All under `images/`. Real Tom photos from his Samsung Galaxy Note 20 Ultra (EXIF confirmed), pre-resized to 1920×800 at ~190KB. See `images/IMAGE-GUIDE.md` for the original placeholder convention (now partly stale post-rewrite).

| File | Currently used on | Notes |
|---|---|---|
| `images/hero-events.jpg` | Home hero | Overhead grilled veg platter |
| `images/hero-about.jpg` | What We Do hero | Pork shoulder + grilled stone fruit on grill |
| `images/hero-areas.jpg` | Sample Menus index hero | Bright summery platter |
| `images/hero-pricing.jpg` | Sample Menu detail (Elegant Dinner Party) | Plated pork medallions |
| `images/hero-menu.jpg` | Sample Menu detail (Mediterranean Grill) | Joojeh kabob on grill |
| `images/hero-reviews.jpg` | Sample Menu detail (Big Game) | Baked pasta comfort |
| `images/hero-home.jpg` | The Chef hero | Crusted hand-formed food close-up |
| `images/hero-contact.jpg` | Contact hero | Bruschetta plate |
| `images/hero-services.jpg` | unused (chicken thighs over veg) | Available for swap |
| `images/about-{family,kitchen,team}.jpg` | unused | Available for future about-page expansion |
| `images/menu-*.jpg` (11 files) | unused | Tied to the deleted MENU_ITEMS lineup. Real photos, but the dishes (Croquettes Classic/Herb/Spicy/Truffle, Mac Cheese, Collard Greens, Cornbread, Sweet Potato, Citrus Slaw, Dipping Trio, Dessert Bites) aren't currently surfaced. |

### Raw photo pool

`act-2-photos/` — 30 timestamped raw shots (filename pattern `act-two-catering-product-pictures-YYYYMMDD_HHMMSS.jpg`), ~91MB total at 3-4 MB each. Use as source for future hero swaps; resize to 1920×800 ~190KB before committing into `images/` (overwrite the same filename so the IMAGE-GUIDE convention holds).

## Backend (Phase 2, deferred)

| File | Role |
|---|---|
| `netlify/functions/quote.js` | Quote intake endpoint. CORS allowlist hardened (`acttwocatering.com`, `www.`, `acttwocatering.netlify.app`). Not wired to the React form yet. |
| `netlify.toml` | Function directory + redirect rules. Site itself deploys via GH Pages, not Netlify static. |

## Documentation

| File | Role |
|---|---|
| `CLAUDE.md` | Project rules + issue tracker (001 P1 form backend, 002 P2 nav semantics) |
| `AGENTS.md` | Agent instructions baseline |
| `docs/IMPLEMENTATION_PLAN_2026-03-18.md` | Pre-rewrite implementation plan; partly stale |
| `docs/UX_AUDIT_2026-03-18.md` | Pre-rewrite UX audit; partly stale |
| `docs/SMOKE_TEST_2026-03-18.md` | Earlier smoke procedure |
| `catering-feature-analysis-2026-03-25.md` | Pre-rewrite feature audit; mostly historical |
| `images/IMAGE-GUIDE.md` | Placeholder-image swap-in convention; partly stale (mentions menu-* slots no longer used) |

## External references

| What | Where | Notes |
|---|---|---|
| Recipe source DB | Notion collection `e7d1db52-9389-45d3-8fbe-9a04b0e432d5` | "Notion DB \| Recipes". ~187 entries; ~60 shippable as of 2026-04-27. Private. Used as source for `data/sample-menus.json` only — the site does not browse it at runtime. |
| Davai project memory | `code/davai-ai-executive-system-memory/semantic/projects/act-two-catering.md` | Site canon: stack, deploy target, anti-fabrication rule, Phase 2 open issues. |
| Davai recipe-DB pointer | `code/davai-ai-executive-system-memory/reference/notion-recipes-db.md` | How to reach the Notion DB and what's in it. |
| Davai session record | `code/davai-ai-executive-system-memory/episodic/2026/04/2026-04-27-act-two-catering-rewrite.md` | What happened on the rewrite day. |
| Session log | `Desktop/07-Personal Docs/00- Structure/95-docs-personal/today.csv` | 2026-04-27 rows for rewrite + photo wire-up. |

## Smoke + dev (gitignored, local only)

| File | Role |
|---|---|
| `.smoke/smoke.mjs` | Brand-mark integration smoke (loading overlay + Header) |
| `.smoke/routes-smoke.mjs` | Route walk: HTTP + text-content + console-error checks across 8 routes × 2 viewports |
| `.smoke/out/` | Screenshots from smoke runs |
| `.tmp-sqs-copy/` (parent dir, outside this repo) | Cached Squarespace page extraction; rerun via the Python script in there if you need to re-pull live copy |

## Conventions worth keeping

- **Anti-fabrication.** Every customer-facing claim must be backed by either the live Squarespace copy or a real entry in the Notion recipe DB. No invented testimonials, neighborhoods, dates, dish names, or pricing.
- **`app.js` and the JSX are hand-synced.** Edit both in the same change.
- **Bump `sw.js` cache version** when the precache list or route map changes — otherwise old assets serve to returning visitors.
- **Direct-merge to main.** No PRs on this repo.
- **Phone is `856-296-5306`. Service area is "South Jersey".** Do not invent a city; the live Squarespace doesn't name one.
- **Chef's name is Tom.** First name only on the public site; full name is not public.
