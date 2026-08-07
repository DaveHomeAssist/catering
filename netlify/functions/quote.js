// Netlify Function: POST /.netlify/functions/quote
// Persists validated quote requests to the canonical Notion Leads database.

const NOTION_VERSION = "2022-06-28";
const NOTION_API_URL = "https://api.notion.com/v1/pages";
const MAX_BODY_BYTES = 12_000;

const ALLOWED_ORIGINS = new Set([
  "https://acttwocatering.com",
  "https://www.acttwocatering.com",
  "https://acttwocatering.netlify.app",
  "https://davehomeassist.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:8888",
  "http://127.0.0.1:8888",
]);

const EVENT_TYPES = new Set([
  "Wedding",
  "Corporate",
  "Private Party",
  "Birthday",
  "Holiday Event",
  "Other",
]);

function response(statusCode, origin, body) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return {
    statusCode,
    headers,
    body: statusCode === 204 ? "" : JSON.stringify(body),
  };
}

function text(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function validate(form) {
  const errors = [];
  const name = text(form.name, 200);
  const email = text(form.email, 200);
  const phone = text(form.phone, 50);
  const eventType = text(form.eventType, 100);
  const guests = form.guests === "" || form.guests == null ? null : Number(form.guests);
  const eventDate = text(form.eventDate, 10);

  if (name.length < 2) errors.push("Please enter your full name.");
  if (!email && !phone) errors.push("Please enter an email address or phone number.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Please enter a valid email address.");
  if (!EVENT_TYPES.has(eventType)) errors.push("Please choose an event type.");
  if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) errors.push("Please enter a valid event date.");
  if (guests !== null && (!Number.isInteger(guests) || guests < 1 || guests > 10_000)) {
    errors.push("Guest count must be between 1 and 10,000.");
  }

  return {
    errors,
    lead: {
      name,
      email,
      phone,
      eventType,
      guests,
      eventDate,
      location: text(form.location, 500),
      details: text(form.details, 5_000),
    },
  };
}

function buildProperties(lead) {
  const properties = {
    "Lead Name": { title: [{ text: { content: lead.name } }] },
    "Event Type": { select: { name: lead.eventType } },
    Source: { select: { name: "Website Form" } },
    Status: { status: { name: "New Lead" } },
  };

  if (lead.email) properties.Email = { email: lead.email };
  if (lead.phone) properties.Phone = { phone_number: lead.phone };
  if (lead.guests !== null) properties["Guest Count"] = { number: lead.guests };
  if (lead.eventDate) properties["Event Date"] = { date: { start: lead.eventDate } };
  if (lead.location) {
    properties["Venue / Location"] = { rich_text: [{ text: { content: lead.location } }] };
  }
  if (lead.details) properties.Notes = { rich_text: [{ text: { content: lead.details } }] };

  return properties;
}

exports.handler = async (event) => {
  const origin = text(event.headers && (event.headers.origin || event.headers.Origin), 500);

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return response(403, "", { error: "Origin not allowed" });
  }

  if (event.httpMethod === "OPTIONS") {
    return response(204, origin, null);
  }

  if (event.httpMethod !== "POST") {
    return response(405, origin, { error: "Method not allowed" });
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const notionLeadsDbId = process.env.NOTION_LEADS_DB_ID;
  if (!notionApiKey || !notionLeadsDbId) {
    return response(503, origin, { error: "Quote service is not configured" });
  }

  const body = event.body || "";
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    return response(413, origin, { error: "Request body is too large" });
  }

  let form;
  try {
    form = JSON.parse(body);
  } catch {
    return response(400, origin, { error: "Invalid request body" });
  }
  if (!form || typeof form !== "object" || Array.isArray(form)) {
    return response(400, origin, { error: "Invalid request body" });
  }

  // Honeypot submissions look successful to bots but are never persisted.
  if (text(form.website, 500)) {
    return response(200, origin, { ok: true });
  }

  const { errors, lead } = validate(form);
  if (errors.length) {
    return response(400, origin, { error: errors[0] });
  }

  try {
    const notionResponse = await fetch(NOTION_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: notionLeadsDbId },
        properties: buildProperties(lead),
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!notionResponse.ok) {
      return response(502, origin, { error: "We could not save your inquiry. Please call or email us." });
    }

    return response(200, origin, { ok: true });
  } catch {
    return response(502, origin, { error: "We could not save your inquiry. Please call or email us." });
  }
};

exports._test = { ALLOWED_ORIGINS, EVENT_TYPES, buildProperties, validate };
