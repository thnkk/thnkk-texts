export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (request.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  let body = {};
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("form")) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    } else {
      body = await request.json();
    }
  } catch {
    return json({ ok: false, error: "invalid body" }, 400);
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

  const blocked = (env.BLOCKED_EMAILS || "")
    .toString()
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  if (blocked.includes(email)) {
    return json({ ok: false, error: "blocked" }, 403);
  }

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

  const toEmail = (env.CONTACT_TO_EMAIL || "").toString().trim();
  const fromEmail = (env.CONTACT_FROM_EMAIL || "").toString().trim();
  const resendApiKey = (env.RESEND_API_KEY || "").toString().trim();
  const subjectPrefix = (env.CONTACT_SUBJECT_PREFIX || "New contact message")
    .toString()
    .trim();

  if (!toEmail || !fromEmail || !resendApiKey) {
    return json({ ok: false, error: "email not configured" }, 500);
  }

  const subject = `${subjectPrefix}: ${name}`;
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    lang ? `Language: ${lang}` : null,
    "",
    message
  ]
    .filter(Boolean)
    .join("\n");

  const html = [
    `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`,
    lang ? `<p><strong>Language:</strong> ${escapeHtml(lang)}</p>` : null,
    `<p><strong>Message:</strong></p>`,
    `<pre>${escapeHtml(message)}</pre>`
  ]
    .filter(Boolean)
    .join("");

  await sendMail({
    apiKey: resendApiKey,
    to: toEmail,
    from: fromEmail,
    replyTo: email,
    subject,
    text,
    html
  });

  return json({ ok: true }, 200);
}

async function sendMail({ apiKey, to, from, replyTo, subject, text, html }) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      to: [to],
      from,
      reply_to: replyTo,
      subject,
      text,
      html
    })
  });

  if (!resp.ok) {
    const errorText = await resp.text().catch(() => "");
    throw new Error(`mail send failed: ${resp.status} ${errorText}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
