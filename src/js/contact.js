(function () {
  const form = document.querySelector("form[data-contact-form]");
  if (!form) return;

  const statusEl = document.querySelector("[data-contact-status]");
  const lang = form.dataset.lang === "tr" ? "tr" : "en";

  const i18n = {
    en: {
      fill: "please fill all fields.",
      sending: "sending...",
      error: "failed to send. try again.",
      success: "sent. thank you!"
    },
    tr: {
      fill: "lütfen tüm alanları doldurun.",
      sending: "gönderiliyor...",
      error: "gönderilemedi. tekrar deneyin.",
      success: "gönderildi. teşekkürler!"
    }
  };

  const t = i18n[lang];

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const message = form.querySelector('[name="message"]').value.trim();

    if (!name || !email || !message) {
      if (statusEl) statusEl.textContent = t.fill;
      return;
    }

    if (statusEl) statusEl.textContent = t.sending;

    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data.ok) {
        if (statusEl) statusEl.textContent = t.error;
        console.log("contact error:", resp.status, data);
        return;
      }

      if (statusEl) statusEl.textContent = t.success;
      form.reset();
    } catch (err) {
      if (statusEl) statusEl.textContent = t.error;
      console.log("contact exception:", err);
    }
  });
})();
