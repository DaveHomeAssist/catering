# Act Two Catering — Feature Analysis

**Date:** 2026-03-25
**Project:** catering
**Stack:** Static HTML shell + React 18 (CDN) + single app.js bundle, Netlify hosting, service worker, PWA manifest

---

## Summary Table

| Feature | Status | Data Source / Persistence | Critical Gap |
|---|---|---|---|
| SPA hash router with 10+ pages | Complete | `window.location.hash`, React useState | None |
| Full menu catalog with categories and tags | Complete | Hardcoded JS data (MENU_ITEMS array) | Static data — no CMS or admin |
| Service pages with process, FAQs, pricing | Complete | Hardcoded JS data (SERVICES array) | No real booking or payment flow |
| Event portfolio / case studies | Complete | Hardcoded JS data (EVENTS array) | None |
| Review showcase with filtering | Complete | Hardcoded JS data (REVIEWS array) | No live review feed (Google/Yelp API) |
| Service area pages with neighborhoods | Complete | Hardcoded JS data (SERVICE_AREAS array) | None |
| Budget estimation calculator | Complete | Client-side JS computation | Estimate only — no cart or checkout |
| Multi-step quote/contact form | Complete | React state, no backend | P1: Form does not submit to a real backend |
| PWA with service worker | Complete | Service worker cache (sw.js), manifest.json | None |
| Hero background image system | Complete | CSS + JS image path config (IMAGES object) | Placeholder fallbacks suggest images not yet photographed |
| Mobile responsive with call bar | Complete | CSS media queries, mobile CTA bar | None |
| SEO and social meta | Complete | OG/Twitter meta tags in HTML head | None |
| Accessibility (skip link, reduced motion, noscript) | Complete | Native HTML/CSS | Navigation semantics need cleanup (P2 issue) |
| Loading screen with spinner | Complete | CSS animation + JS `requestAnimationFrame` check | 3s timeout fallback is arbitrary |

---

## Detailed Feature Analysis

### 1. SPA Hash Router

**Problem it solves:** Delivers a multi-page experience (Home, Menu, Services, individual service pages, Events, event details, Reviews, Pricing, About, Areas, area details, Contact) from a single static HTML file without a server.

**Implementation:** `useHash()` hook (app.js line ~1182-1190) listens for `hashchange` events. `parseRoute()` (line ~1198) splits the hash path into segments. The main `App` component pattern-matches routes like `#/menu`, `#/services/:slug`, `#/events/:slug`, `#/areas/:slug`, `#/contact`, etc. `navigate()` (line ~1191-1197) sets `window.location.hash` and smooth-scrolls to top.

**Tradeoffs:** Hash routing means URLs like `/#/menu` instead of `/menu`. No SSR or pre-rendering — the entire app is client-rendered React. Search engines may not index hash routes well. Back button works natively via hash history.

---

### 2. Comprehensive Data Layer

**Problem it solves:** Provides rich content for every page without a database or CMS.

**Implementation:** All business data is defined as JS constants at the top of app.js (lines 1-565): `BIZ` (business info), `SERVICES` (6 service types with full descriptions, process steps, FAQs, pricing models), `IMAGES` (configurable image paths with placeholder fallback), `MENU_ITEMS` (11 items across 3 categories), `EVENTS` (6 case studies), `REVIEWS` (8 reviews), `SERVICE_AREAS` (6 counties with neighborhoods), `TRUST_BADGES` (4 badges).

**Tradeoffs:** Any content update requires editing app.js and redeploying. There is no admin panel, headless CMS, or even a separate JSON data file. The data layer is tightly coupled to the rendering code in a single 2900+ line file.

---

### 3. Multi-Step Quote Form

**Problem it solves:** Captures lead information (name, email, phone, event type, date, guest count, notes) through a guided step-by-step flow.

**Implementation:** A React component with step state (step 1: service + date + guests, step 2: contact info, step 3: details/notes, step 4: success). Form progress bar width is computed from current step. Validation happens on next-step click. The form renders inside a styled container (`.quote-form-container`). On "submit," the form shows a success message.

**Tradeoffs:** **P1 critical gap:** The form does not actually submit data anywhere. There is no Netlify Forms integration, no API endpoint, no email relay. Leads are lost. The success screen is purely cosmetic.

---

### 4. Budget Estimation Calculator

**Problem it solves:** Gives prospects an instant price range based on service type and guest count.

**Implementation:** A service dropdown and guest count input feed into a calculation using each service's `minRate` and `maxRate` per unit. The result displays as a formatted range (e.g., "$3,600 - $7,600") in a styled budget result box. Pricing is per-person for most services, per-item for pop-ups, and per-box for retail.

**Tradeoffs:** The calculator is a rough estimate tool. It does not account for add-ons, dietary requirements, venue distance, or seasonal pricing. There is no way to save or share the estimate.

---

### 5. PWA with Service Worker

**Problem it solves:** Enables offline access and app-like install experience on mobile.

**Implementation:** `sw.js` (127 lines) implements a multi-strategy cache: network-first for navigation (falling back to cached `/index.html`), cache-first for Google Fonts and CDN scripts (React, ReactDOM), and stale-while-revalidate for local assets. The `manifest.json` defines app name, icons (9 sizes from 72x72 to 512x512, including maskable), shortcuts to Menu and Book, standalone display mode, and categories.

**Tradeoffs:** The service worker caches external CDN URLs (unpkg.com React bundles) which is good for offline but means cached versions won't update if React patches a security issue. The `CACHE_NAME` must be manually incremented on deploys.

---

### 6. CSS Design System

**Problem it solves:** Establishes a premium hospitality visual language across all pages.

**Implementation:** A comprehensive CSS string (defined in the `CSS` constant, app.js lines 571-1176) is injected at runtime. It defines design tokens (`--wine`, `--gold`, `--cream`, `--parchment`, etc.), typography (Playfair Display for display, DM Sans for body), component styles for cards, menus, events, reviews, forms, heroes, and responsive breakpoints at 960px, 768px, 480px, and 360px. The mobile call bar (`.mobile-call-bar`) provides fixed-bottom call and quote CTAs on phones.

**Tradeoffs:** All CSS is in a JS string, not a separate .css file. This means no CSS caching independent of JS and no IDE syntax highlighting for the CSS. The design system is not tokenized via custom properties for theme switching — it uses hardcoded color values throughout.

---

### 7. Noscript Fallback

**Problem it solves:** Provides basic business information to users with JS disabled and to search engine crawlers.

**Implementation:** The `<noscript>` block (index.html lines 94-112) renders business name, description, services list, phone number, email, and location in inline-styled HTML. A note encourages enabling JS for the full experience.

**Tradeoffs:** The noscript content is minimal — no menu, no reviews, no service details. It's a lead-capture minimum rather than a full content fallback.

---

### 8. Image System with Graceful Fallbacks

**Problem it solves:** Allows the site to function before professional photography is available.

**Implementation:** The `IMAGES` object (app.js lines 170-203) maps every image slot (hero per page, about photos, menu items) to file paths. A placeholder SVG fallback (`data:image/svg+xml`) shows "Photo Coming Soon" in a soft gradient. Menu cards and about photos use an `onError` handler to swap to emoji-based fallback cards (`.menu-card-fallback`, `.about-photo-fallback`).

**Tradeoffs:** The placeholder system works but makes the site look unfinished. Most image paths reference files in `/images/` that likely do not yet exist, meaning the site currently runs almost entirely on fallbacks.

---

## Top 3 Priorities

1. **Wire up the quote form to a real backend.** This is tracked as issue 001 (P1). Without form delivery, the site cannot generate leads. Netlify Forms (since it deploys on Netlify) would be a zero-code fix.

2. **Add professional photography or at minimum styled placeholder images.** The entire visual system is built around food photography (hero images, menu cards, about photos) but runs on text fallbacks. The premium brand promise is undermined without real images.

3. **Extract the data layer into a separate JSON file.** Moving `SERVICES`, `MENU_ITEMS`, `EVENTS`, `REVIEWS`, and `SERVICE_AREAS` out of app.js into a fetchable JSON would make content updates possible without touching code, and would improve the separation of concerns in a 2900-line monolith.
