document.addEventListener("DOMContentLoaded", async () => {
  // Already logged in? Skip straight to the dashboard.
  try {
    const res = await fetch("/api/session", { credentials: "include" });
    const data = await res.json();
    if (data.authenticated) {
      window.location.href = "/admin/index.html";
      return;
    }
  } catch {
    // ignore — just show the login form
  }

  const form = document.getElementById("login-form");
  const errorMsg = document.getElementById("login-error");
  const errorText = document.getElementById("login-error-text");
  const submitBtn = document.getElementById("login-submit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.classList.add("hidden");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> Connexion...`;

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.ok) {
        window.location.href = "/admin/index.html";
      } else {
        errorText.textContent = data.error || "Identifiant ou mot de passe incorrect.";
        errorMsg.classList.remove("hidden");
      }
    } catch (err) {
      errorText.textContent = "Erreur de connexion au serveur. Réessayez.";
      errorMsg.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Se connecter <i class="ph ph-arrow-right"></i>`;
    }
  });
});
