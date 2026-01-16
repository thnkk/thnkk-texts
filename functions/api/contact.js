export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }

  const name = (body.name || "").toString().trim();
  const email = (body.email || "").toString().trim().toLowerCase();
  const message = (body.message || "").toString().trim();
  const website = (body.website || "").toString().trim(); // honeypot
  const lang = (body.lang || "").toString().trim().toLowerCase();

  if (website) return json({ ok: true }, 200); // silently ignore bots

  if (!name || !email || !message) {
    return json({ ok: false, error: "missing fields" }, 400);
  }
  if (name.length > 120 || email.length > 200 || message.length > 8000) {
    return json({ ok: false, error: "too long" }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: "invalid email" }, 400);
  }

  // blocklist via env var (comma-separated), easy to maintain in cloudflare dashboard
  const blocked = (env.BLOCKED_EMAILS || "")
    .toString()
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  if (blocked.includes(email)) {
    return json({ ok: false, error: "blocked" }, 403);
  }

  // optional: also block via db table if you want it later
  if (env.CONTACT_DB) {
    const row = await env.CONTACT_DB
      .prepare("select email from blocked_emails where email = ?1")
      .bind(email)
      .first();

    if (row) return json({ ok: false, error: "blocked" }, 403);

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      null;

    const ua = request.headers.get("user-agent") || null;

    await env.CONTACT_DB
      .prepare(
        "insert into messages (name, email, message, ip, ua, lang) values (?1, ?2, ?3, ?4, ?5, ?6)"
      )
      .bind(name, email, message, ip, ua, lang || null)
      .run();
  }

  return json({ ok: true }, 200);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
