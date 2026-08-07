const test = require("node:test");
const assert = require("node:assert/strict");

const { handler, _test } = require("../netlify/functions/quote.js");

const ALLOWED_ORIGIN = "https://davehomeassist.github.io";
const VALID_FORM = {
  eventType: "Private Party",
  guests: "24",
  eventDate: "2026-09-12",
  location: "Cherry Hill, NJ",
  name: "Codex Smoke Test",
  phone: "856-555-0100",
  email: "smoke@example.com",
  details: "Automated quote function verification.",
  website: "",
};

function event(httpMethod, body = VALID_FORM, origin = ALLOWED_ORIGIN) {
  return {
    httpMethod,
    headers: origin ? { origin } : {},
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

function configured() {
  process.env.NOTION_API_KEY = "test-token";
  process.env.NOTION_LEADS_DB_ID = "test-database";
}

test.afterEach(() => {
  delete process.env.NOTION_API_KEY;
  delete process.env.NOTION_LEADS_DB_ID;
  delete global.fetch;
});

test("answers allowed CORS preflight without writing", async () => {
  const result = await handler(event("OPTIONS", ""));
  assert.equal(result.statusCode, 204);
  assert.equal(result.headers["Access-Control-Allow-Origin"], ALLOWED_ORIGIN);
  assert.equal(result.body, "");
});

test("rejects unknown browser origins", async () => {
  const result = await handler(event("POST", VALID_FORM, "https://attacker.example"));
  assert.equal(result.statusCode, 403);
  assert.equal(result.headers["Access-Control-Allow-Origin"], undefined);
});

test("rejects unsupported methods", async () => {
  const result = await handler(event("GET", ""));
  assert.equal(result.statusCode, 405);
});

test("fails closed when server configuration is missing", async () => {
  const result = await handler(event("POST"));
  assert.equal(result.statusCode, 503);
  assert.match(result.body, /not configured/);
});

test("validates JSON and required lead fields", async () => {
  configured();
  const malformed = await handler(event("POST", "{"));
  const nullBody = await handler(event("POST", "null"));
  const missing = await handler(event("POST", { eventType: "Unknown" }));
  assert.equal(malformed.statusCode, 400);
  assert.equal(nullBody.statusCode, 400);
  assert.equal(missing.statusCode, 400);
});

test("drops honeypot submissions without calling Notion", async () => {
  configured();
  global.fetch = async () => {
    throw new Error("fetch must not run");
  };
  const result = await handler(event("POST", { website: "spam.example" }));
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { ok: true });
});

test("writes the canonical Leads schema and confirms only after Notion accepts", async () => {
  configured();
  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };

  const result = await handler(event("POST"));
  const payload = JSON.parse(request.options.body);

  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { ok: true });
  assert.equal(request.url, "https://api.notion.com/v1/pages");
  assert.equal(payload.parent.database_id, "test-database");
  assert.deepEqual(payload.properties["Lead Name"], { title: [{ text: { content: VALID_FORM.name } }] });
  assert.deepEqual(payload.properties["Event Type"], { select: { name: "Private Party" } });
  assert.deepEqual(payload.properties.Source, { select: { name: "Website Form" } });
  assert.deepEqual(payload.properties.Status, { status: { name: "New Lead" } });
  assert.deepEqual(payload.properties["Guest Count"], { number: 24 });
  assert.equal(request.options.headers.Authorization, "Bearer test-token");
});

test("returns a truthful failure when Notion rejects the write", async () => {
  configured();
  global.fetch = async () => ({ ok: false, status: 400 });
  const result = await handler(event("POST"));
  assert.equal(result.statusCode, 502);
  assert.match(result.body, /could not save/i);
  assert.doesNotMatch(result.body, /test-token/);
});

test("validation and property helpers match the live database option set", () => {
  assert.deepEqual([..._test.EVENT_TYPES], [
    "Wedding", "Corporate", "Private Party", "Birthday", "Holiday Event", "Other",
  ]);
  const invalid = _test.validate({ ...VALID_FORM, guests: "1.5" });
  assert.equal(invalid.errors.length, 1);
});
