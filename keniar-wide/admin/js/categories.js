const ICON_CHOICES = [
  "video-camera", "bell-ringing", "door-open", "fire-extinguisher",
  "fingerprint", "shield-check", "lock-key", "wifi-high",
  "broadcast", "camera", "siren", "key",
  "network", "router", "plug", "cpu",
  "monitor", "phone-call", "house-line", "warehouse",
  "buildings", "hard-drive", "battery-charging", "gear-six",
];

let pendingDeleteCategoryId = null;
let cachedCategories = [];
let cachedProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  buildIconPicker();
  wireModal();
  wireForm();
  await loadAll();
});

async function loadAll() {
  try {
    [cachedCategories, cachedProducts] = await Promise.all([Store.getCategories(), Store.getProducts()]);
    renderCategories();
  } catch (err) {
    console.error(err);
    showNotification("Erreur", "Impossible de charger les catégories.", "warning-circle");
  }
}

function productCountForCategory(categoryId) {
  return cachedProducts.filter((p) => p.categoryId === categoryId).length;
}

function renderCategories() {
  const grid = document.getElementById("categories-grid");
  const empty = document.getElementById("categories-empty");

  if (cachedCategories.length === 0) {
    grid.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.classList.add("flex");
    return;
  }

  grid.classList.remove("hidden");
  empty.classList.add("hidden");

  grid.innerHTML = cachedCategories
    .map((cat) => {
      const count = productCountForCategory(cat.id);
      return `
      <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
            <i class="ph ph-${cat.icon} text-2xl"></i>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="openCategoryModal('${cat.id}')" class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-secondary transition-colors" title="Modifier">
              <i class="ph ph-pencil-simple text-lg"></i>
            </button>
            <button onclick="openCategoryDeleteModal('${cat.id}')" class="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors" title="Supprimer">
              <i class="ph ph-trash text-lg"></i>
            </button>
          </div>
        </div>
        <div>
          <span class="font-headline font-semibold text-on-surface block">${cat.label}</span>
          <span class="text-sm text-on-surface-variant">${count} produit${count > 1 ? "s" : ""}</span>
        </div>
      </div>`;
    })
    .join("");
}

function buildIconPicker() {
  const picker = document.getElementById("icon-picker");
  picker.innerHTML = ICON_CHOICES.map(
    (icon) => `
    <button type="button" data-icon="${icon}" onclick="selectIcon('${icon}')"
      class="icon-choice aspect-square rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-secondary/10 hover:text-secondary transition-colors">
      <i class="ph ph-${icon} text-xl"></i>
    </button>`
  ).join("");
}

function selectIcon(icon) {
  document.getElementById("category-icon").value = icon;
  document.querySelectorAll(".icon-choice").forEach((btn) => {
    const isActive = btn.getAttribute("data-icon") === icon;
    btn.classList.toggle("bg-secondary", isActive);
    btn.classList.toggle("text-on-secondary", isActive);
    btn.classList.toggle("bg-surface-container-high", !isActive);
  });
}

function wireModal() {
  document.getElementById("open-add-category").addEventListener("click", () => openCategoryModal());
}

function openCategoryModal(categoryId) {
  const modal = document.getElementById("category-modal");
  const form = document.getElementById("category-form");
  form.reset();
  selectIcon("shapes");

  if (categoryId) {
    const cat = cachedCategories.find((c) => c.id === categoryId);
    document.getElementById("category-modal-title").textContent = "Modifier la catégorie";
    document.getElementById("category-id").value = cat.id;
    document.getElementById("category-label").value = cat.label;
    selectIcon(cat.icon);
  } else {
    document.getElementById("category-modal-title").textContent = "Ajouter une catégorie";
    document.getElementById("category-id").value = "";
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCategoryModal() {
  const modal = document.getElementById("category-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function wireForm() {
  document.getElementById("category-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> Enregistrement...`;

    const id = document.getElementById("category-id").value;
    const label = document.getElementById("category-label").value.trim();
    const icon = document.getElementById("category-icon").value;

    try {
      if (id) {
        await Store.updateCategory(id, { label, icon });
        showNotification("Catégorie mise à jour", `${label} a été modifiée avec succès.`, "check-circle");
      } else {
        await Store.addCategory({ label, icon });
        showNotification("Catégorie ajoutée", `${label} est maintenant disponible.`, "plus-circle");
      }
      closeCategoryModal();
      await loadAll();
    } catch (err) {
      showNotification("Erreur", "La catégorie n'a pas pu être enregistrée.", "warning-circle");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
    }
  });
}

function openCategoryDeleteModal(categoryId) {
  pendingDeleteCategoryId = categoryId;
  const count = productCountForCategory(categoryId);
  const modal = document.getElementById("category-delete-modal");
  const confirmBtn = document.getElementById("category-delete-confirm");
  const title = document.getElementById("category-delete-title");
  const desc = document.getElementById("category-delete-desc");

  if (count > 0) {
    title.textContent = "Impossible de supprimer";
    desc.textContent = `${count} produit${count > 1 ? "s utilisent" : " utilise"} encore cette catégorie. Réattribuez-les d'abord depuis "Produits & Stock".`;
    confirmBtn.classList.add("hidden");
  } else {
    title.textContent = "Supprimer cette catégorie ?";
    desc.textContent = "Cette action est irréversible.";
    confirmBtn.classList.remove("hidden");
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeCategoryDeleteModal() {
  pendingDeleteCategoryId = null;
  const modal = document.getElementById("category-delete-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function confirmDeleteCategory() {
  if (pendingDeleteCategoryId) {
    try {
      const result = await Store.deleteCategory(pendingDeleteCategoryId);
      if (result.ok) {
        showNotification("Catégorie supprimée", "La catégorie a été retirée.", "trash");
      }
    } catch (err) {
      showNotification("Erreur", "La suppression a échoué.", "warning-circle");
    }
  }
  closeCategoryDeleteModal();
  await loadAll();
}
