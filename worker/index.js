export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // api endpoint for the contact form
    if (url.pathname === "/api/contact" && request.method === "POST") {
      try {
        const data = await request.json();

        const name = (data.name || "").trim();
        const email = (data.email || "").trim();
        const message = (data.message || "").trim();

        // basic validation
        if (!name || !email || !message) {
          return new Response(JSON.stringify({ ok: false, error: "missing fields" }), {
            status: 400,
            headers: { "content-type": "application/json" }
          });
        }

        // very light email sanity check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(JSON.stringify({ ok: false, error: "invalid email" }), {
            status: 400,
            headers: { "content-type": "application/json" }
          });
        }

        // send via resend (recommended simple option)
        const to = env.CONTACT_TO;          // your inbox
        const apiKey = env.RESEND_API_KEY;  // secret

        if (!to || !apiKey) {
          return new Response(JSON.stringify({ ok: false, error: "server not configured" }), {
            status: 500,
            headers: { "content-type": "application/json" }
          });
        }

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
            "authorization": `Bearer ${apiKey}`,
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
          const errText = await resendResp.text();
          return new Response(JSON.stringify({ ok: false, error: "email failed", detail: errText }), {
            status: 502,
            headers: { "content-type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: "bad request" }), {
          status: 400,
          headers: { "content-type": "application/json" }
        });
      }
    }

    // anything else: let static assets handle it (assets are served automatically)
    return new Response("not found", { status: 404 });
  }
};

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
