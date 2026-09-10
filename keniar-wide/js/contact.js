document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> Envoi...`;

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      await Store.addMessage(payload);
      showNotification("Message envoyé", "Merci, nous revenons vers vous rapidement.", "paper-plane-tilt");
      form.reset();
    } catch (err) {
      showNotification("Erreur", "Le message n'a pas pu être envoyé. Réessayez.", "warning-circle");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
    }
  });
});
