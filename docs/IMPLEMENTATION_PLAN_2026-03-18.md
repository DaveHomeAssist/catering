# Act Two Catering — Implementation Plan

> **Source:** UX_AUDIT_2026-03-18.md (20 findings: 3 critical, 7 high, 10 medium)
> **Architecture:** Single app.js (2,765 lines) + index.html shell + PWA manifest/SW
> **Constraint:** No build step, React from CDN, Netlify hosting, no backend

---

## Batch Overview

| Batch | Type | Findings | Files | Model | Time |
|-------|------|----------|-------|-------|------|
| A | Form fix — business critical | S1-1, S1-2, S1-3 | app.js | Claude | 3 hours |
| B | Error handling & safety | S2-6, S2-7, S2-10 | app.js | Claude | 2 hours |
| C | PWA & performance | S2-8, S2-9 | app.js, sw.js, index.html | Codex | 2 hours |
| D | Accessibility | S2-5, S2-10, S3-18 | app.js | Codex | 2 hours |
| E | Polish & credibility | S3-11 through S3-20 | app.js, manifest.json | Codex | 3 hours |

---

## Batch A — Form Fix (Business Critical)

### A1. Wire form to Netlify Forms (S1-1)

**Problem:** Form data goes nowhere. "We'll reach out within 24 hours" is a lie.

**Implementation:**
1. The React app renders to `#root` — Netlify Forms needs a static HTML form to detect at build time
2. Add a hidden form to index.html that Netlify can parse:

```html
<!-- Hidden form for Netlify detection (below #root) -->
<form name="quote" netlify netlify-honeypot="bot-field" hidden>
  <input name="bot-field">
  <input name="service">
  <input name="guests">
  <input name="eventDate">
  <input name="name">
  <input name="phone">
  <input name="email">
  <input name="location">
  <input name="details">
</form>
```

3. In app.js QuoteForm, replace `onClick: () => setSubmitted(true)` (line 1554) with a proper submit handler:

```js
const handleSubmit = () => {
  const errors = validateForm(form);
  if (errors.length > 0) { setFormErrors(errors); return; }
  setSubmitting(true);
  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ 'form-name': 'quote', ...form }).toString()
  })
  .then(res => {
    if (!res.ok) throw new Error('Submission failed');
    setSubmitted(true);
  })
  .catch(() => {
    setSubmitError('Something went wrong. Please call us directly.');
    setSubmitting(false);
  });
};
```

**Files:** index.html (hidden form), app.js (QuoteForm submit handler)

### A2. Client-side form validation (S1-2)

**Problem:** Required fields not enforced. Empty forms show success.

**Implementation:**
1. Add validation function before submit:

```js
function validateForm(form) {
  const errors = [];
  if (!form.name.trim()) errors.push({ field: 'name', msg: 'Name is required' });
  if (!form.phone.trim()) errors.push({ field: 'phone', msg: 'Phone is required' });
  if (!form.email.trim()) errors.push({ field: 'email', msg: 'Email is required' });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.push({ field: 'email', msg: 'Enter a valid email' });
  if (!form.service) errors.push({ field: 'service', msg: 'Select an event type' });
  return errors;
}
```

2. Add `[formErrors, setFormErrors]` state to QuoteForm
3. On step transition (Continue button), validate current step fields before advancing
4. Show inline error messages below invalid fields with `aria-describedby` linking

**Files:** app.js (QuoteForm validation, error display, step guards)

### A3. Remove dangerouslySetInnerHTML (S1-3)

**Problem:** XSS vector in HeroSection title rendering.

**Implementation:**
1. Change HeroSection to accept `title` as a React element, not a string:

```js
// Before (line 1195-1198):
React.createElement("h1", { dangerouslySetInnerHTML: { __html: title } })

// After:
React.createElement("h1", null, title)
```

2. Update all HeroSection call sites to pass JSX elements:

```js
// Before:
title: 'Where Family Recipes Become <em>Unforgettable Events</em>'

// After:
title: React.createElement(React.Fragment, null, 'Where Family Recipes Become ', React.createElement('em', null, 'Unforgettable Events'))
```

3. Search all `title:` props passed to HeroSection and convert any HTML strings to React elements

**Files:** app.js (HeroSection component + all call sites)

---

## Batch B — Error Handling & Safety

### B1. Error boundary (S2-6)

**Problem:** One bad component = white screen for entire app.

**Implementation:**
1. Add class-based ErrorBoundary component (hooks can't catch render errors):

```js
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { className: 'error-page' },
        React.createElement('h1', null, 'Something went wrong'),
        React.createElement('p', null, 'Try refreshing the page.'),
        React.createElement('button', { className: 'btn-primary', onClick: () => { this.setState({ hasError: false }); navigate('/'); } }, 'Go Home')
      );
    }
    return this.props.children;
  }
}
```

2. Wrap the Router component in ErrorBoundary in the App shell

**Files:** app.js (new ErrorBoundary, App shell wrapper)

### B2. 404 page (S2-7)

**Problem:** Invalid routes show "Service not found." as plain unstyled text.

**Implementation:**
1. Add NotFoundPage component matching the existing design system:

```js
function NotFoundPage() {
  return React.createElement('div', { className: 'page-404' },
    React.createElement(HeroSection, {
      badge: '404',
      title: 'Page Not Found',
      subtitle: 'The page you're looking for doesn't exist.',
      primaryCta: 'Back to Home'
    })
  );
}
```

2. In Router, if no route matches, render NotFoundPage instead of null/text

**Files:** app.js (NotFoundPage, Router fallback)

### B3. Form draft persistence (S2-5)

**Problem:** Navigate away from form → all progress lost.

**Implementation:**
1. On every form field change, debounce-write to localStorage key `act2_quote_draft`
2. On QuoteForm mount, check localStorage for draft and restore if found
3. On successful submit, clear the draft
4. Add "Resume your quote" banner on /contact if draft exists

```js
const DRAFT_KEY = 'act2_quote_draft';
// In QuoteForm:
useEffect(() => {
  const saved = localStorage.getItem(DRAFT_KEY);
  if (saved) { try { setForm(JSON.parse(saved)); } catch(e) {} }
}, []);
useEffect(() => {
  const timer = setTimeout(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, 500);
  return () => clearTimeout(timer);
}, [form]);
```

**Files:** app.js (QuoteForm persistence)

---

## Batch C — PWA & Performance

### C1. Image optimization (S2-8)

**Problem:** No srcset, no WebP, hero images full-size on mobile.

**Implementation:**
1. In ImgWithFallback component, add `loading="lazy"` (already has this) and `decoding="async"`
2. For hero images, add width/height attributes to prevent layout shift
3. In CSS, add `aspect-ratio` to image containers for CLS prevention
4. Add `<link rel="preload" as="image">` in index.html for the home hero image

**Files:** app.js (ImgWithFallback, hero image sizing), index.html (preload hint)

### C2. SW auto-cache invalidation (S2-9)

**Problem:** Manual version string. Old content persists.

**Implementation:**
1. In sw.js, change cache name to include a build timestamp:

```js
const CACHE_VERSION = '2026-03-18T18-00';
const CACHE_NAME = `act-two-catering-${CACHE_VERSION}`;
```

2. Add a `/version.json` file that the SW checks on activate:

```json
{ "version": "2026-03-18T18-00" }
```

3. In the activate handler, compare cache version to version.json. If mismatch, purge old caches.

**Files:** sw.js (cache strategy), new version.json

---

## Batch D — Accessibility

### D1. Hero image alt text (S2-8 related)

**Problem:** Hero images have `alt=""` — decorative treatment, but they convey meaning.

**Implementation:**
1. In all HeroSection calls that pass `heroImg`, add `heroAlt` prop
2. In HeroSection, use the alt prop on the img element (line 1185)
3. If image is truly decorative (no content meaning), keep `alt=""`
4. If image shows food/venue, add descriptive alt: "Catering spread at an outdoor wedding"

**Files:** app.js (HeroSection prop, all call sites)

### D2. Mobile menu focus trap (S2-10)

**Problem:** Focus escapes menu to body content behind it.

**Implementation:**
1. When menu opens, add focus trap: Tab cycles within menu links only
2. On open, focus first menu link
3. On Escape, close menu and return focus to hamburger button
4. Prevent scroll on body while menu is open (`overflow: hidden` on body)

**Files:** app.js (Header component, menu open/close handlers)

### D3. Form aria-live for success (audit finding)

**Problem:** Success message not announced to screen readers.

**Implementation:**
1. Add `role="status"` and `aria-live="polite"` to the form success container (line 1404)
2. Add `aria-describedby` linking error messages to their fields in validation

**Files:** app.js (QuoteForm success container, error messages)

---

## Batch E — Polish & Credibility

### E1. Review variance (S3-11)

**Problem:** All 8 reviews are 5-star. Looks fake.

**Implementation:**
1. Change 2 reviews to 4-star with slightly constructive tone (e.g., "Food was incredible. Only wish the dessert options had more variety.")
2. Keep overall average above 4.5

**Files:** app.js (REVIEWS data)

### E2. Image loading skeletons (S3-12)

**Problem:** Blank space until images load.

**Implementation:**
1. In ImgWithFallback, show a shimmer placeholder while loading:
   - CSS class `.img-skeleton` with pulse animation
   - Replace with actual image on load
2. Match skeleton size to expected image dimensions

**Files:** app.js (ImgWithFallback), CSS in app.js

### E3. Budget estimator per-item fix (S3-14)

**Problem:** Pop-ups use per-person pricing but should be per-item.

**Implementation:**
1. In BudgetEstimator, check `service.pricingModel`
2. If `"item"`: show price range without guest multiplier, label as "per item"
3. If `"person"`: multiply by guest count (current behavior)

**Files:** app.js (BudgetEstimator calculation)

### E4. Hamburger close on nav (S3-18)

**Problem:** Menu stays open momentarily after clicking a link.

**Implementation:**
1. In Header nav link click handlers, call `setMenuOpen(false)` before `navigate()`
2. Ensure menu close animation starts immediately

**Files:** app.js (Header nav links)

### E5. PWA screenshots (S3-19)

**Problem:** Empty screenshots array means no rich install prompt.

**Implementation:**
1. Take 2 screenshots (home + menu page) at 1280×720
2. Add to manifest.json screenshots array:

```json
"screenshots": [
  { "src": "images/screenshot-home.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide" },
  { "src": "images/screenshot-menu.png", "sizes": "1280x720", "type": "image/png", "form_factor": "wide" }
]
```

**Files:** manifest.json, new screenshot images

---

## Finding → Batch Traceability

| Finding | Severity | Batch | Task |
|---------|----------|-------|------|
| S1-1 Form has no backend | Critical | A | A1 |
| S1-2 No form validation | Critical | A | A2 |
| S1-3 dangerouslySetInnerHTML | Critical | A | A3 |
| S2-5 Form state not persisted | High | B | B3 |
| S2-6 No error boundaries | High | B | B1 |
| S2-7 Invalid routes unstyled | High | B | B2 |
| S2-8 No image optimization | High | C | C1 |
| S2-9 SW cache no auto-invalidate | High | C | C2 |
| S2-10 Mobile menu no focus trap | High | D | D2 |
| S3-11 All reviews 5-star | Medium | E | E1 |
| S3-12 No image loading states | Medium | E | E2 |
| S3-13 Inline styles mixed | Medium | — | Deferred to file split |
| S3-14 Budget estimator formula | Medium | E | E3 |
| S3-15 No service area map | Medium | — | Deferred (needs API key) |
| S3-16 No share buttons | Medium | — | Deferred |
| S3-17 No dark mode | Medium | — | Deferred |
| S3-18 Hamburger close timing | Medium | E | E4 |
| S3-19 PWA missing screenshots | Medium | E | E5 |
| S3-20 No analytics | Medium | — | Deferred |
| — | Hero image alt text | — | D | D1 |
| — | Form success aria-live | — | D | D3 |

**15 of 20 findings addressed. 5 deferred (inline styles, map, share, dark mode, analytics).**

---

## Execution Order

1. **Batch A** (Claude) — fix the form. This is the business-critical path.
2. **Batch B** (Claude) — error handling. Depends on A being done (form validation pattern reused).
3. **Batch C** (Codex) — PWA fixes. Independent of A/B.
4. **Batch D** (Codex) — accessibility. Independent.
5. **Batch E** (Codex) — polish. Can run last or parallel with D.

---

## Batch Execution Prompts

### Batch A — Claude (form submission, validation, XSS fix)

```text
Act Two Catering Batch A: Form Fix
File: app.js (2765 lines, inline React without JSX — uses React.createElement)
File: index.html (44 lines, PWA shell)
Hosting: Netlify (netlify.toml present with SPA redirect)

You are fixing the 3 most critical issues. Read the full QuoteForm component (lines 1383-1556) before editing.

1. NETLIFY FORMS WIRING
Add a hidden HTML form to index.html for Netlify detection:
  <form name="quote" netlify netlify-honeypot="bot-field" hidden>
    <input name="bot-field"><input name="service"><input name="guests">
    <input name="eventDate"><input name="name"><input name="phone">
    <input name="email"><input name="location"><input name="details">
  </form>
In app.js QuoteForm, replace onClick: () => setSubmitted(true) (line 1554) with:
  - Add [submitting, setSubmitting] and [submitError, setSubmitError] state
  - handleSubmit: validate → fetch POST to '/' with URLSearchParams body including form-name='quote'
  - On success: setSubmitted(true). On error: setSubmitError('Something went wrong.')
  - Show submitting spinner on button. Show submitError below button.

2. FORM VALIDATION
Add validateForm(form) that checks: name required, phone required, email required + format, service required.
Add [formErrors, setFormErrors] state.
On step Continue click: validate current step fields before advancing.
Show inline .form-error messages below invalid fields with aria-describedby.
On final Submit: validate all fields before handleSubmit.

3. REMOVE dangerouslySetInnerHTML
In HeroSection (line 1195-1198), replace:
  React.createElement("h1", { dangerouslySetInnerHTML: { __html: title } })
with:
  React.createElement("h1", null, title)
Then update ALL HeroSection call sites to pass React elements instead of HTML strings.
Example: 'Where Family Recipes Become <em>Unforgettable Events</em>'
becomes: React.createElement(React.Fragment, null, 'Where Family Recipes Become ', React.createElement('em', null, 'Unforgettable Events'))

This file uses React.createElement, NOT JSX. Do not add JSX syntax.
Match existing code style. Use escapeHtml() for any dynamic user content.
```

### Batch B — Claude (error boundary, 404, form draft)

```text
Act Two Catering Batch B: Error Handling
File: app.js

3 changes requiring design judgment.

1. ERROR BOUNDARY
Add a class-based ErrorBoundary component (React hooks can't catch render errors).
Show styled error page with "Something went wrong" + "Go Home" button.
Wrap the Router in App shell with ErrorBoundary.

2. 404 PAGE
Add NotFoundPage component using existing HeroSection pattern.
In Router, if no route matches, render NotFoundPage.
Currently invalid service/event routes show unstyled text (line 1825).
Fix all route fallbacks to use NotFoundPage.

3. FORM DRAFT PERSISTENCE
localStorage key: act2_quote_draft
On mount: restore draft if exists.
On field change: debounce 500ms write to localStorage.
On successful submit: clear draft.
On /contact load with existing draft: show "Resume your quote?" banner.

Use React.createElement, not JSX. Match existing patterns.
```

### Batch C — Codex (mechanical: image attributes, SW versioning)

```text
Act Two Catering Batch C: PWA & Performance
Files: app.js, sw.js, index.html

1. IMAGE OPTIMIZATION
In ImgWithFallback: add decoding="async" prop to img element.
In HeroSection: add width and height attributes to hero img.
In CSS (app.js style string): add .hero-bg-image img { aspect-ratio: 16/9; object-fit: cover; }
In index.html: add <link rel="preload" as="image" href="images/hero-home.jpg"> if hero image path exists.

2. SW CACHE VERSIONING
In sw.js line 1: change CACHE_NAME to include ISO date: 'act-two-catering-2026-03-18'
Add comment: // UPDATE THIS DATE ON EVERY DEPLOY
In activate handler: add explicit old cache cleanup logging.
```

### Batch D — Codex (accessibility fixes)

```text
Act Two Catering Batch D: Accessibility
File: app.js

1. HERO IMAGE ALT TEXT
In HeroSection: change alt="" to accept heroAlt prop. Default to "" if not provided.
Update all HeroSection call sites that pass heroImg to also pass heroAlt with descriptive text.

2. MOBILE MENU FOCUS TRAP
In Header: when menuOpen is true, trap Tab within menu links.
On open: focus first menu link.
On Escape: close menu, return focus to hamburger button.
Add overflow:hidden to body style while menu open.

3. FORM SUCCESS ARIA
Add role="status" and aria-live="polite" to the form success container (line 1404).
```

### Batch E — Codex (polish)

```text
Act Two Catering Batch E: Polish
File: app.js, manifest.json

1. REVIEW VARIANCE: Change 2 of 8 reviews to 4-star with constructive tone.
2. IMAGE SKELETON: In ImgWithFallback, show .img-skeleton (pulse animation) while loading.
   Add CSS: .img-skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200%; animation: shimmer 1.5s infinite; }
3. BUDGET FIX: In BudgetEstimator, check pricingModel. If "item": don't multiply by guests.
4. HAMBURGER: In Header nav links, call setMenuOpen(false) BEFORE navigate().
5. PWA SCREENSHOTS: Add screenshots array to manifest.json (placeholder paths until real screenshots taken).
```
