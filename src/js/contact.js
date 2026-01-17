(function () {
  const form = document.querySelector("form[data-contact-form]");
  if (!form) return;

  const statusEl = document.querySelector("[data-contact-status]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const message = form.querySelector('[name="message"]').value.trim();

    if (!name || !email || !message) {
      if (statusEl) statusEl.textContent = "please fill all fields.";
      return;
    }

    if (statusEl) statusEl.textContent = "sending...";

    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message })
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data.ok) {
        if (statusEl) statusEl.textContent = "failed to send. try again.";
        console.log("contact error:", resp.status, data);
        return;
      }

      if (statusEl) statusEl.textContent = "sent. thank you!";
      form.reset();
    } catch (err) {
      if (statusEl) statusEl.textContent = "failed to send. try again.";
      console.log("contact exception:", err);
    }
  });
})();
