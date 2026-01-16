(() => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const statusEl = document.getElementById("contactStatus");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      message: String(fd.get("message") || "").trim(),
    };

    if (statusEl) statusEl.textContent = "sending…";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.ok) {
        form.reset();
        if (statusEl) statusEl.textContent = "sent.";
      } else {
        if (statusEl) statusEl.textContent = "couldn’t send. try again.";
        console.error("contact error:", json);
      }
    } catch (err) {
      if (statusEl) statusEl.textContent = "network error. try again.";
      console.error(err);
    }
  });
})();
