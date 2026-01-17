export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API endpoint for the contact form
    if (url.pathname === "/api/contact" && request.method === "POST") {
      let data;
      try {
        const ct = request.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          data = await request.json();
        } else {
          // optional: support form posts too
          const fd = await request.formData();
          data = Object.fromEntries(fd.entries());
        }
      } catch {
        return json({ ok: false, error: "invalid json" }, 400);
      }

      const name = (data.name || "").trim();
      const email = (data.email || "").trim();
      const message = (data.message || "").trim();

      if (!name || !email || !message) return json({ ok: false, error: "missing fields" }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "invalid email" }, 400);

      const to = env.CONTACT_TO;
      const apiKey = env.RESEND_API_KEY;

      if (!to || !apiKey) return json({ ok: false, error: "server not configured" }, 500);

      const subject = `thnkk - message from ${name}`;
      const html = `
        <p><strong>name:</strong> ${escapeHtml(name)}</p>
        <p><strong>email:</strong> ${escapeHtml(email)}</p>
        <p><strong>message:</strong></p>
        <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
      `;

      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          from: env.RESEND_FROM || "onboarding@resend.dev",
          to: [to],
          subject,
          html,
          reply_to: email
        })
      });

      if (!resendResp.ok) {
        const detail = await resendResp.text();
        return json({ ok: false, error: "email failed", detail }, 502);
      }

      return json({ ok: true }, 200);
    }

    // IMPORTANT: serve static assets for everything else
    return env.ASSETS.fetch(request);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
