# Codex spec: act-two-catering — form-to-Notion leads (Option C)

**Status:** Ready for Codex execution
**Author:** Claude (orchestrator handoff)
**Date authored:** 2026-04-27
**Repo:** `act-two-catering` (path: `C:/Users/Dave RambleOn/Desktop/01-Projects/code/daveHomeAssist/act-two-catering/`)
**Parallel with:** `garden-os/docs/codex/worker-security-cross-device-sync.md`, `daily-quantum-scraper/docs/codex/scraper-schema-upgrades.md`. No cross-repo conflicts.

---

## Goal

Replace the current mailto-only lead capture with a Notion-backed form. New catering inquiries land as rows in a Notion DB Tom can triage in his existing workspace. Reuses the already-CORS-hardened `netlify/functions/quote.js` Netlify Function.

This is Option C from the prior comparison (Notion vs Netlify Forms vs custom function). Picked because it fits Dave's Notion-centered OS and lets Jerri/Margo agents process leads.

---

## Canonical target DB (locked 2026-04-27)

Use **🍽️ DB | Leads — Act Two Catering**. Do NOT create a new DB.

- Database URL: https://www.notion.so/ea13edba7d3e4b8a9247afa92628737d
- Database ID: `ea13edba7d3e4b8a9247afa92628737d`
- Data source ID (collection): `b31bc1e4-6b4f-47da-91ae-0f774b22e1a5`
- Default view (canonical): `855c674b-35d7-43e3-b605-a2d3c80d2e50` — All Leads sorted by Received desc

The older `DB | Leads — Act Two Catering` at `339255fc-8f44-81de-ac64-ecbea17edb87` and the `DB | Quote Submissions — Act Two Catering` at `250f1338b60a4a51a11cce54b5da4820` are NOT the target. They are predecessors and may be consolidated later.

## Pre-flight: prerequisites Dave must provide before Codex starts

Codex cannot proceed without these. Surface back if missing:

1. **Notion API key** with write access to the canonical leads DB above. Either:
   - Use an existing integration token Dave has configured.
   - OR create a new Notion integration named "Act Two Catering Form" with `Insert content` capability and share it with the canonical DB only.
2. **Integration share confirmation.** Confirm the integration is shared with the canonical DB (Notion: Settings -> Integrations or DB share modal). If not, surface back.
3. **Schema expansion approval.** The DB's `Event Type` select currently has options `[Wedding, Corporate, Private Party, Birthday, Holiday Event, Other]`. The post-rewrite React form sends `[Intimate Dinners, Milestone Events, Corporate Gatherings, Other]`. Codex must expand the DB select to add `Intimate Dinners` and `Milestone Events` (preserve existing options for non-website leads) before deploying. If Dave has not approved this expansion, surface back.
4. **Netlify project access** to set environment variables (Dave or Codex via `netlify env:set`).

If any of these are missing at start, Codex should write a one-paragraph status report and stop. Do not invent an API key, change the DB target, or guess workspace placement.

---

## Scope

### Files to touch

| File | Action | Why |
|---|---|---|
| `netlify/functions/quote.js` | MODIFY | Replace mailto/no-op handler with Notion API call. Keep CORS hardening. |
| `app.js` (or wherever the React form lives) | MODIFY | Add honeypot field; consume new structured response shape; show success/error UI |
| `netlify.toml` if it exists, otherwise no-op | MODIFY | Confirm function deploys in netlify config |
| `package.json` | MODIFY | Add `@notionhq/client` dep for the function |
| `tests/` (create if absent) | ADD | Unit test for the function (mock Notion client); honeypot rejection test; payload validation test |

### Files to NOT touch

- `act-two-catering (3).jsx` — looks like a snapshot/draft; leave alone
- `MATERIALS.md`, `AGENTS.md`, `CLAUDE.md` — out of scope
- `act-2-photos/`, `assets/` — visual assets, untouched
- `data/` — content / menu data, untouched
- DNS configuration, hosting setup — see `docs/codex/cutover-playbook.md` (separate spec, not yet written)

---

## Canonical DB schema (do NOT modify, except the Event Type select expansion called out in pre-flight)

The DB already exists with the schema below. Codex's job is to write to it, not redesign it.

| Canonical property | Type | Notes |
|---|---|---|
| `Lead Name` | title | Lead's full name. NOTE: title property name is "Lead Name", not "Name". |
| `Phone` | phone_number | |
| `Email` | email | |
| `Event Type` | select | Existing options: Wedding, Corporate, Private Party, Birthday, Holiday Event, Other. **Pre-flight #3 adds:** Intimate Dinners, Milestone Events. |
| `Guest Count` | number | |
| `Event Date` | date | |
| `Venue / Location` | rich_text | NOTE: property name has the slash and space; the form's `location` field maps here. |
| `Notes` | rich_text | NOTE: property name is "Notes", not "Details". The form's `details` field maps here. |
| `Source` | select | Options: Website Form, Referral, Direct, Social, Other. Always set to `Website Form` for form submissions. |
| `Status` | status | Options: New Lead, Contacted, Quote Sent, Negotiating, Booked, Lost. Always set to `New Lead` for new submissions. |
| `Received` | created_time | Auto-managed by Notion. |
| `Service Interest` | multi_select | Options exist (Full Service Catering, Drop-Off, Staffed Buffet, Passed Apps, Bar Service, Custom) but the React form does not capture this. Leave empty. |
| `Budget Range` | select | Options exist but the React form does not capture this (per the locked pricing-posture-B decision). Leave empty. |

### Form payload to canonical property mapping

| React form field | Canonical property | Transform |
|---|---|---|
| `name` | `Lead Name` (title) | trim, slice 200 |
| `email` | `Email` (email) | validated regex, slice 200 |
| `phone` | `Phone` (phone_number) | slice 50 |
| `eventType` | `Event Type` (select) | passed through verbatim; must be one of the post-expansion options |
| `guests` | `Guest Count` (number) | parseInt; reject if NaN or > 10000 |
| `eventDate` | `Event Date` (date) | ISO yyyy-mm-dd from `<input type="date">` |
| `location` | `Venue / Location` (rich_text) | slice 1000 |
| `details` | `Notes` (rich_text) | slice 5000 |
| (constant) | `Source` | `{ select: { name: "Website Form" } }` |
| (constant) | `Status` | `{ status: { name: "New Lead" } }` |
| (auto) | `Received` | not set; Notion populates |
| (skip) | `Service Interest` | omit |
| (skip) | `Budget Range` | omit |

The DB has no "Form Origin" property. If Codex wants to capture the originating page URL, append it to the `Notes` field rather than introducing a schema change.

---

## Design

### `netlify/functions/quote.js`

Current state (per session history): exists, has CORS hardened, no spam protection, no actual deploy yet.

Target shape:

```js
const { Client } = require("@notionhq/client");

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") return cors(204, "");
  if (event.httpMethod !== "POST") return cors(405, JSON.stringify({error: "method_not_allowed"}));

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return cors(400, JSON.stringify({error: "invalid_json"}));
  }

  // Honeypot: if `website` field is filled, it's a bot. Silently 200 to avoid signal.
  if (payload.website) {
    return cors(200, JSON.stringify({ok: true}));
  }

  // Server-side validation
  const errors = validatePayload(payload);
  if (errors.length > 0) {
    return cors(400, JSON.stringify({error: "validation_failed", fields: errors}));
  }

  const notion = new Client({ auth: process.env.NOTION_API_KEY });

  try {
    await notion.pages.create({
      parent: { database_id: process.env.NOTION_LEADS_DB_ID },
      properties: buildProperties(payload),
    });
    return cors(200, JSON.stringify({ok: true}));
  } catch (e) {
    console.error("notion_create_failed", { msg: e.message });
    return cors(502, JSON.stringify({error: "downstream_failure"}));
  }
};

function validatePayload(p) {
  const errs = [];
  if (!p.name || p.name.length < 2 || p.name.length > 200) errs.push("name");
  if (!p.email && !p.phone) errs.push("email_or_phone");  // require at least one
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) errs.push("email");
  if (p.guestCount && (isNaN(parseInt(p.guestCount)) || p.guestCount > 10000)) errs.push("guestCount");
  if (p.details && p.details.length > 5000) errs.push("details_too_long");
  return errs;
}

function buildProperties(p) {
  // Map payload fields to canonical Leads DB property shapes.
  // Property names are exact: "Lead Name" not "Name", "Venue / Location" not "Location",
  // "Notes" not "Details". Source is "Website Form", Status is "New Lead".
  const props = {
    "Lead Name": { title: [{ text: { content: p.name.slice(0, 200) }}] },
    Source: { select: { name: "Website Form" } },
    Status: { status: { name: "New Lead" } },
  };
  if (p.phone)     props.Phone        = { phone_number: p.phone.slice(0, 50) };
  if (p.email)     props.Email        = { email: p.email.slice(0, 200) };
  if (p.eventType) props["Event Type"] = { select: { name: p.eventType } };
  if (p.guests)    props["Guest Count"] = { number: parseInt(p.guests) };
  if (p.eventDate) props["Event Date"]  = { date: { start: p.eventDate } };
  if (p.location)  props["Venue / Location"] = { rich_text: [{ text: { content: p.location.slice(0, 1000) }}] };
  if (p.details)   props.Notes        = { rich_text: [{ text: { content: p.details.slice(0, 5000) }}] };
  return props;
}

function cors(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",  // tighten to acttwocatering.com after launch
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body,
  };
}
```

Codex: read the actual current `quote.js` first; preserve any CORS hardening already present (e.g., specific origin whitelist instead of `*`). The example above is the shape, not a verbatim spec.

### React form (`app.js` or equivalent)

Codex must locate the form component. Likely candidates:
- `app.js`
- `act-two-catering (3).jsx`
- Inside `assets/` or another folder

After locating, add:

1. **Honeypot field** — `<input type="text" name="website" tabIndex={-1} autoComplete="off" style={{display:"none"}} />`. Bots fill it; humans don't.

2. **Submit handler** — POST to `/.netlify/functions/quote` with the form payload. Show "Sending..." state, success state ("Thanks — we'll be in touch within 1 business day."), error state ("Something went wrong. Email us directly at [...].").

3. **Form fields** — match the validation in the function (name + at least one of email/phone, optional everything else).

4. **Loading + error UI** — already partially built per the prior comparison; this just connects the wires.

### Environment variables (Dave or Codex sets via `netlify env:set`)

```
NOTION_API_KEY=secret_xxx
NOTION_LEADS_DB_ID=ea13edba7d3e4b8a9247afa92628737d
```

Codex should NEVER commit these to the repo. They live in Netlify's UI / `netlify env`.

---

## Acceptance criteria

A run is successful when ALL of these hold:

1. Canonical DB (`ea13edba7d3e4b8a9247afa92628737d`) is shared with the integration; `Event Type` select expanded with `Intimate Dinners` and `Milestone Events`.
2. `netlify/functions/quote.js` is rewritten and deploys cleanly via `netlify dev` or actual Netlify build.
3. POST to the function with a valid payload creates a row in `🍽️ DB | Leads — Act Two Catering` with `Lead Name`, `Email`/`Phone`, `Event Type`, `Guest Count`, `Event Date`, `Venue / Location`, `Notes`, `Source = Website Form`, `Status = New Lead` populated.
4. POST to the function with a payload missing both `email` and `phone` returns `400` with `error: "validation_failed", fields: ["email_or_phone"]`.
5. POST with the `website` honeypot field filled returns `200 ok` and does NOT create a Notion row (silent drop).
6. POST with malformed JSON returns `400 invalid_json`.
7. CORS preflight `OPTIONS` returns `204`.
8. The React form connects to the function and shows success state on `200 ok`, error state on `4xx/5xx`.
9. New tests pass:
   - `test_function_creates_notion_page_on_valid_payload`
   - `test_function_rejects_missing_email_and_phone`
   - `test_honeypot_returns_200_without_notion_call`
   - `test_invalid_json_returns_400`
   - `test_options_preflight_returns_204`
10. No secrets in the repo. `git diff HEAD~1 -- 'netlify/**'` and `git diff HEAD~1 -- 'package.json'` show no `secret_` or `notion_api_key` strings.
11. Browser smoke (manual): submit the form on the live site (or via `netlify dev`), confirm a Notion row appears, confirm the success UI shows.

---

## Verification commands

Run from `act-two-catering/`:

```bash
# Install new dep
npm install @notionhq/client

# Run function locally
netlify dev   # serves the function at http://localhost:8888/.netlify/functions/quote

# Test cases (substitute your Notion DB ID; ensure NOTION_API_KEY is set in your shell)
curl -X POST http://localhost:8888/.netlify/functions/quote \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","eventType":"Intimate Dinners","guests":12,"eventDate":"2026-08-15","location":"Cherry Hill, NJ","details":"Test from local netlify dev"}'
# Expect 200 {"ok":true} + new Notion row in canonical Leads DB with Source=Website Form, Status=New Lead

curl -X POST http://localhost:8888/.netlify/functions/quote \
  -H "Content-Type: application/json" \
  -d '{"name":"No Contact"}'
# Expect 400 with email_or_phone error

curl -X POST http://localhost:8888/.netlify/functions/quote \
  -H "Content-Type: application/json" \
  -d '{"name":"Bot","email":"bot@example.com","website":"http://spam.com"}'
# Expect 200 ok, NO Notion row created

# Run unit tests
npm test
```

After deploy:

```bash
# Production smoke (replace with real domain when DNS is live)
curl -X POST https://acttwocatering.com/.netlify/functions/quote \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke","email":"dave+smoke@example.com","eventType":"Other","details":"smoke test from Codex"}'
```

Then check Notion for the row. Delete the smoke row after verification.

---

## Rollback

If anything breaks:

1. `git checkout HEAD -- netlify/functions/quote.js app.js package.json`
2. Remove the `@notionhq/client` dep if added: `npm uninstall @notionhq/client`
3. Revert env vars in Netlify if needed: `netlify env:unset NOTION_API_KEY NOTION_LEADS_DB_ID`
4. The Notion DB itself can stay (no harm in an empty DB; Tom can use it manually).

---

## Non-goals (do NOT do these in this pass)

- Do NOT migrate from Netlify Forms (Option B). Skipped by design.
- Do NOT add reCAPTCHA or paid spam services. Honeypot is enough for v1.
- Do NOT add SMS notifications, Zapier hooks, or auto-responder emails. Notion row is the signal; Tom owns reply.
- Do NOT touch DNS, custom domain, or HTTPS. Separate `cutover-playbook.md` spec.
- Do NOT change the React form's visual design beyond what's needed for honeypot + status states.
- Do NOT auto-relate the new leads to other Notion DBs (Calendar, Tasks). That's a follow-up enrichment pass.
- Do NOT bump the Notion integration's permissions beyond `Insert content`. No read of unrelated DBs.
- Do NOT use any LLM in the function. Plain validation + Notion API call.

---

## Path note

This spec is on Duncan (Windows). The repo path is `code/daveHomeAssist/act-two-catering/`. If Dave eventually renames `daveHomeAssist/` to `workshop/` (per the file-org plan), this path shifts but the spec stays valid.

If Codex runs on Mac, the equivalent path is `~/Desktop/Code/.../daveHomeAssist/act-two-catering/`. Path-portable since it's all relative `npm` and `netlify` invocations.

---

## Reference

- Prior decision: Option C (Notion-backed) chosen over Option A (custom function) and Option B (Netlify Forms) earlier this session.
- Notion API docs: https://developers.notion.com/reference/post-page
- Honeypot pattern: standard low-friction spam protection; bots fill all visible fields including hidden ones.
- Existing CORS-hardened `quote.js`: read it first; preserve allowlist origins if any.
- Companion spec (later): `docs/codex/cutover-playbook.md` for DNS go-live (depends on B2 registrar info from Dave).

---

## Return to Dave (after Codex run)

Codex should respond with:

1. Pre-flight status: confirm all 4 prerequisites were available; if not, list what was missing and stop.
2. Notion DB: created (with ID), or reused existing (with ID), or surface ambiguity.
3. Files changed (paths + lines added/removed).
4. Tests added (names + one-line intent each).
5. Acceptance criteria pass/fail per item 1-11.
6. Production smoke result (if Codex had `netlify env:set` access) OR a note that production smoke is Dave's to run after env vars land.
7. Any deviations from the design above and reason.
8. Confirmation: no secrets in the diff.
