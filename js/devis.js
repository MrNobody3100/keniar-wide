document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("devis-form");
  const steps = Array.from(form.querySelectorAll("[data-step]"));
  const dots = Array.from(document.querySelectorAll("[data-step-dot]"));
  const prevBtn = document.getElementById("devis-prev");
  const nextBtn = document.getElementById("devis-next");
  const submitBtn = document.getElementById("devis-submit");
  const equipementContainer = document.getElementById("equipement-options");

  let current = 1;
  const total = steps.length;

  async function buildEquipementOptions() {
    equipementContainer.innerHTML = `<div class="col-span-full flex items-center gap-2 text-on-surface-variant py-6"><i class="ph ph-circle-notch animate-spin"></i> Chargement...</div>`;
    try {
      const categories = await Store.getCategories();
      equipementContainer.innerHTML = categories
        .map(
          (cat) => `
        <label class="cursor-pointer bg-surface-container-high p-5 rounded-xl flex items-start gap-4 hover:bg-surface-container-highest transition-all">
          <input type="checkbox" name="equipement" value="${cat.id}" class="w-4 h-4 mt-1 rounded accent-secondary" />
          <div>
            <span class="font-headline font-semibold text-on-surface text-sm flex items-center gap-2">
              <i class="ph ph-${cat.icon} text-secondary"></i> ${cat.label}
            </span>
          </div>
        </label>`
        )
        .join("");
    } catch (err) {
      equipementContainer.innerHTML = `<div class="col-span-full text-error text-sm">Impossible de charger les options.</div>`;
    }
  }

  function showStep(stepNumber) {
    steps.forEach((section) => {
      const isTarget = Number(section.getAttribute("data-step")) === stepNumber;
      section.classList.toggle("hidden", !isTarget);
      section.classList.toggle("flex", isTarget);
    });

    dots.forEach((dot) => {
      dot.setAttribute("data-active", String(Number(dot.getAttribute("data-step-dot")) === stepNumber));
    });

    prevBtn.classList.toggle("hidden", stepNumber === 1);
    nextBtn.classList.toggle("hidden", stepNumber === total);
    submitBtn.classList.toggle("hidden", stepNumber !== total);

    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  }

  nextBtn.addEventListener("click", () => {
    if (current < total) {
      current += 1;
      showStep(current);
    }
  });

  prevBtn.addEventListener("click", () => {
    if (current > 1) {
      current -= 1;
      showStep(current);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> Envoi en cours...`;

    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      payload.equipements = formData.getAll("equipement");

      const created = await Store.addDevisRequest(payload);

      showNotification(
        "Demande envoyée",
        "Votre devis PDF va se télécharger automatiquement.",
        "paper-plane-tilt"
      );

      // Trigger the PDF download in a new tab (avoids losing the page
      // the client is on, and works even if the browser blocks
      // programmatic same-tab navigation on POST responses).
      window.open(`/api/devis-pdf?id=${created.id}`, "_blank");

      form.reset();
      current = 1;
      showStep(current);
    } catch (err) {
      showNotification("Erreur", "La demande n'a pas pu être envoyée. Réessayez.", "warning-circle");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Envoyer ma demande <i class="ph ph-paper-plane-tilt"></i>`;
    }
  });

  await buildEquipementOptions();
  showStep(current);
});
