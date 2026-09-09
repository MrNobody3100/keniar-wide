let pendingDeleteRealisationId = null;
let currentRealisationImageDataUrl = null;
let cachedCategories = [];
let cachedRealisations = [];

document.addEventListener("DOMContentLoaded", async () => {
  wireModal();
  wireImageUpload();
  wireForm();
  await loadAll();
});

async function loadAll() {
  try {
    [cachedCategories, cachedRealisations] = await Promise.all([Store.getCategories(), Store.getRealisations()]);
    populateCategorySelect();
    renderRealisations();
  } catch (err) {
    console.error(err);
    showNotification("Erreur", "Impossible de charger les réalisations.", "warning-circle");
  }
}

function populateCategorySelect() {
  const select = document.getElementById("realisation-category");
  select.innerHTML = "";
  cachedCategories.forEach((cat) => {
    select.insertAdjacentHTML("beforeend", `<option value="${cat.id}">${cat.label}</option>`);
  });
}

function categoryLabel(categoryId) {
  const cat = cachedCategories.find((c) => c.id === categoryId);
  return cat ? cat.label : "—";
}

function categoryIcon(categoryId) {
  const cat = cachedCategories.find((c) => c.id === categoryId);
  return cat ? cat.icon : "buildings";
}

function renderRealisations() {
  const grid = document.getElementById("realisations-grid");
  const empty = document.getElementById("realisations-empty");

  if (cachedRealisations.length === 0) {
    grid.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.classList.add("flex");
    return;
  }

  grid.classList.remove("hidden");
  empty.classList.add("hidden");

  grid.innerHTML = cachedRealisations
    .map((r) => {
      const image = r.imageUrl
        ? `<div class="w-full h-40 bg-cover bg-center" style="background-image:url('${r.imageUrl}')"></div>`
        : `<div class="w-full h-40 bg-surface-container-high flex items-center justify-center text-on-surface-variant"><i class="ph ph-image text-2xl"></i></div>`;

      return `
      <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden flex flex-col">
        ${image}
        <div class="p-5 flex flex-col gap-2 flex-1">
          <span class="text-xs font-label text-secondary uppercase flex items-center gap-1.5">
            <i class="ph ph-${categoryIcon(r.categoryId)}"></i> ${categoryLabel(r.categoryId)}
          </span>
          <span class="font-headline font-semibold text-on-surface text-sm">${r.title}</span>
          <span class="text-xs text-on-surface-variant">${r.location || "—"} · ${r.year || "—"}</span>
          <p class="text-sm text-on-surface-variant line-clamp-2 flex-1">${r.description || ""}</p>
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/10">
            <button onclick="openRealisationModal('${r.id}')" class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-secondary transition-colors" title="Modifier">
              <i class="ph ph-pencil-simple text-lg"></i>
            </button>
            <button onclick="openRealisationDeleteModal('${r.id}')" class="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors" title="Supprimer">
              <i class="ph ph-trash text-lg"></i>
            </button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

function wireModal() {
  document.getElementById("open-add-realisation").addEventListener("click", () => openRealisationModal());
}

function openRealisationModal(id) {
  const modal = document.getElementById("realisation-modal");
  const form = document.getElementById("realisation-form");
  form.reset();
  currentRealisationImageDataUrl = null;
  resetImagePreview();

  if (id) {
    const r = cachedRealisations.find((x) => x.id === id);
    document.getElementById("realisation-modal-title").textContent = "Modifier la réalisation";
    document.getElementById("realisation-id").value = r.id;
    document.getElementById("realisation-title").value = r.title;
    document.getElementById("realisation-client").value = r.client || "";
    document.getElementById("realisation-category").value = r.categoryId;
    document.getElementById("realisation-location").value = r.location || "";
    document.getElementById("realisation-year").value = r.year || "";
    document.getElementById("realisation-description").value = r.description || "";
    if (r.imageUrl) {
      currentRealisationImageDataUrl = r.imageUrl;
      showImagePreview(r.imageUrl);
    }
  } else {
    document.getElementById("realisation-modal-title").textContent = "Ajouter une réalisation";
    document.getElementById("realisation-id").value = "";
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeRealisationModal() {
  const modal = document.getElementById("realisation-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function wireImageUpload() {
  const dropzone = document.getElementById("realisation-image-dropzone");
  const input = document.getElementById("realisation-image-input");

  dropzone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentRealisationImageDataUrl = reader.result;
      showImagePreview(currentRealisationImageDataUrl);
    };
    reader.readAsDataURL(file);
  });
}

function showImagePreview(dataUrl) {
  document.getElementById("realisation-image-preview").src = dataUrl;
  document.getElementById("realisation-image-preview").classList.remove("hidden");
  document.getElementById("realisation-image-placeholder").classList.add("hidden");
}

function resetImagePreview() {
  document.getElementById("realisation-image-preview").classList.add("hidden");
  document.getElementById("realisation-image-placeholder").classList.remove("hidden");
}

function wireForm() {
  document.getElementById("realisation-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> Enregistrement...`;

    const id = document.getElementById("realisation-id").value;

    const data = {
      title: document.getElementById("realisation-title").value.trim(),
      client: document.getElementById("realisation-client").value.trim() || "Client confidentiel",
      categoryId: document.getElementById("realisation-category").value,
      location: document.getElementById("realisation-location").value.trim(),
      year: Number(document.getElementById("realisation-year").value) || new Date().getFullYear(),
      description: document.getElementById("realisation-description").value.trim(),
      imageUrl: currentRealisationImageDataUrl,
    };

    try {
      if (id) {
        await Store.updateRealisation(id, data);
        showNotification("Réalisation mise à jour", `${data.title} a été modifiée.`, "check-circle");
      } else {
        await Store.addRealisation(data);
        showNotification("Réalisation ajoutée", `${data.title} est maintenant visible sur le site.`, "plus-circle");
      }
      closeRealisationModal();
      await loadAll();
    } catch (err) {
      showNotification("Erreur", "La réalisation n'a pas pu être enregistrée.", "warning-circle");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
    }
  });
}

function openRealisationDeleteModal(id) {
  pendingDeleteRealisationId = id;
  const modal = document.getElementById("realisation-delete-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeRealisationDeleteModal() {
  pendingDeleteRealisationId = null;
  const modal = document.getElementById("realisation-delete-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function confirmDeleteRealisation() {
  if (pendingDeleteRealisationId) {
    try {
      await Store.deleteRealisation(pendingDeleteRealisationId);
      showNotification("Réalisation supprimée", "Le projet a été retiré du portfolio.", "trash");
    } catch (err) {
      showNotification("Erreur", "La suppression a échoué.", "warning-circle");
    }
  }
  closeRealisationDeleteModal();
  await loadAll();
}
