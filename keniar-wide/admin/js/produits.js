// Product / inventory management: list, search, filter by category,
// add/edit via modal (image upload as a base64 data URL stored directly
// in the `image_url` column — fine for now; swap for real object storage
// like Vercel Blob later without changing the rest of this file), delete.

const TECH_LABELS_ADMIN = {
  ip: "IP / Numérique Haute Résolution",
  analogique: "Analogique HD (TVI/AHD)",
  "sans-fil": "Radio Sans Fil cryptée",
};

let pendingDeleteId = null;
let currentImageDataUrl = null;
let cachedCategories = [];
let cachedProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  wireSearchAndFilter();
  wireModal();
  wireImageUpload();
  wireForm();
  await loadAll();
});

async function loadAll() {
  try {
    [cachedCategories, cachedProducts] = await Promise.all([Store.getCategories(), Store.getProducts()]);
    populateCategorySelects();
    renderProductsTable();
  } catch (err) {
    console.error(err);
    showNotification("Erreur", "Impossible de charger les produits.", "warning-circle");
  }
}

function populateCategorySelects() {
  const filterSelect = document.getElementById("admin-product-category-filter");
  const formSelect = document.getElementById("product-category");
  filterSelect.querySelectorAll("option:not(:first-child)").forEach((o) => o.remove());
  formSelect.innerHTML = "";

  cachedCategories.forEach((cat) => {
    filterSelect.insertAdjacentHTML("beforeend", `<option value="${cat.id}">${cat.label}</option>`);
    formSelect.insertAdjacentHTML("beforeend", `<option value="${cat.id}">${cat.label}</option>`);
  });
}

function categoryLabel(categoryId) {
  const cat = cachedCategories.find((c) => c.id === categoryId);
  return cat ? cat.label : "—";
}

function categoryIcon(categoryId) {
  const cat = cachedCategories.find((c) => c.id === categoryId);
  return cat ? cat.icon : "package";
}

function wireSearchAndFilter() {
  document.getElementById("admin-product-search").addEventListener("input", renderProductsTable);
  document.getElementById("admin-product-category-filter").addEventListener("change", renderProductsTable);
}

function availabilityBadge(product) {
  if (Number(product.stock) === 0) {
    return `<span class="badge badge-danger"><i class="ph-fill ph-x-circle"></i> Rupture</span>`;
  }
  if (Number(product.stock) <= 5) {
    return `<span class="badge badge-progress"><i class="ph-fill ph-warning"></i> Stock faible (${product.stock})</span>`;
  }
  return `<span class="badge badge-done"><i class="ph-fill ph-check-circle"></i> En stock (${product.stock})</span>`;
}

function renderProductsTable() {
  const tbody = document.getElementById("products-table-body");
  const emptyState = document.getElementById("products-empty");
  const table = tbody.closest("table").parentElement;

  const search = document.getElementById("admin-product-search").value.trim().toLowerCase();
  const categoryFilter = document.getElementById("admin-product-category-filter").value;

  let products = cachedProducts;

  if (search) {
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.reference.toLowerCase().includes(search) ||
        (p.description || "").toLowerCase().includes(search)
    );
  }
  if (categoryFilter !== "all") {
    products = products.filter((p) => p.categoryId === categoryFilter);
  }

  if (products.length === 0) {
    table.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
    return;
  }

  table.classList.remove("hidden");
  emptyState.classList.add("hidden");
  emptyState.classList.remove("flex");

  tbody.innerHTML = products
    .map((p) => {
      const thumb = p.imageUrl
        ? `<div class="w-12 h-12 rounded-lg bg-cover bg-center shrink-0" style="background-image:url('${p.imageUrl}')"></div>`
        : `<div class="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant shrink-0"><i class="ph ph-image"></i></div>`;

      return `
      <tr>
        <td class="px-6 py-4">
          <div class="flex items-center gap-3">
            ${thumb}
            <div class="flex flex-col min-w-0">
              <span class="font-headline font-semibold text-on-surface text-sm truncate">${p.name}</span>
              <span class="text-xs text-on-surface-variant font-label">Réf: ${p.reference}</span>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center gap-1.5 text-sm text-on-surface-variant">
            <i class="ph ph-${categoryIcon(p.categoryId)} text-secondary"></i> ${categoryLabel(p.categoryId)}
          </span>
        </td>
        <td class="px-6 py-4 text-sm text-on-surface-variant">${TECH_LABELS_ADMIN[p.tech] || p.tech}</td>
        <td class="px-6 py-4 font-headline font-semibold text-on-surface text-sm">${Number(p.price).toLocaleString("fr-FR")} DZD</td>
        <td class="px-6 py-4 text-sm text-on-surface-variant">${p.stock}</td>
        <td class="px-6 py-4">${availabilityBadge(p)}</td>
        <td class="px-6 py-4">
          <div class="flex items-center justify-end gap-2">
            <button onclick="openProductModal('${p.id}')" class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-secondary transition-colors" title="Modifier">
              <i class="ph ph-pencil-simple text-lg"></i>
            </button>
            <button onclick="openDeleteModal('${p.id}')" class="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors" title="Supprimer">
              <i class="ph ph-trash text-lg"></i>
            </button>
          </div>
        </td>
      </tr>`;
    })
    .join("");
}

// ---------- Modal: add/edit ----------

function wireModal() {
  document.getElementById("open-add-product").addEventListener("click", () => openProductModal());
}

function openProductModal(productId) {
  const modal = document.getElementById("product-modal");
  const form = document.getElementById("product-form");
  form.reset();
  currentImageDataUrl = null;
  resetImagePreview();

  if (productId) {
    const p = cachedProducts.find((x) => x.id === productId);
    document.getElementById("product-modal-title").textContent = "Modifier le produit";
    document.getElementById("product-id").value = p.id;
    document.getElementById("product-reference").value = p.reference;
    document.getElementById("product-name").value = p.name;
    document.getElementById("product-description").value = p.description || "";
    document.getElementById("product-category").value = p.categoryId;
    document.getElementById("product-tech").value = p.tech;
    document.getElementById("product-price").value = p.price;
    document.getElementById("product-stock").value = p.stock;
    document.getElementById("product-availability").value = p.availability;
    if (p.imageUrl) {
      currentImageDataUrl = p.imageUrl;
      showImagePreview(p.imageUrl);
    }
  } else {
    document.getElementById("product-modal-title").textContent = "Ajouter un produit";
    document.getElementById("product-id").value = "";
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeProductModal() {
  const modal = document.getElementById("product-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function wireImageUpload() {
  const dropzone = document.getElementById("product-image-dropzone");
  const input = document.getElementById("product-image-input");

  dropzone.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentImageDataUrl = reader.result;
      showImagePreview(currentImageDataUrl);
    };
    reader.readAsDataURL(file);
  });
}

function showImagePreview(dataUrl) {
  document.getElementById("product-image-preview").src = dataUrl;
  document.getElementById("product-image-preview").classList.remove("hidden");
  document.getElementById("product-image-placeholder").classList.add("hidden");
}

function resetImagePreview() {
  document.getElementById("product-image-preview").classList.add("hidden");
  document.getElementById("product-image-placeholder").classList.remove("hidden");
}

function wireForm() {
  document.getElementById("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> Enregistrement...`;

    const id = document.getElementById("product-id").value;
    const categoryId = document.getElementById("product-category").value;
    const tech = document.getElementById("product-tech").value;

    const data = {
      reference: document.getElementById("product-reference").value.trim(),
      name: document.getElementById("product-name").value.trim(),
      description: document.getElementById("product-description").value.trim(),
      categoryId,
      tech,
      price: Number(document.getElementById("product-price").value),
      stock: Number(document.getElementById("product-stock").value),
      availability: document.getElementById("product-availability").value,
      imageUrl: currentImageDataUrl,
    };

    try {
      if (id) {
        await Store.updateProduct(id, data);
        showNotification("Produit mis à jour", `${data.name} a été modifié avec succès.`, "check-circle");
      } else {
        await Store.addProduct(data);
        showNotification("Produit ajouté", `${data.name} est maintenant visible dans le catalogue.`, "plus-circle");
      }
      closeProductModal();
      await loadAll();
    } catch (err) {
      showNotification("Erreur", "Le produit n'a pas pu être enregistré.", "warning-circle");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHTML;
    }
  });
}

// ---------- Delete ----------

function openDeleteModal(productId) {
  pendingDeleteId = productId;
  const modal = document.getElementById("delete-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeDeleteModal() {
  pendingDeleteId = null;
  const modal = document.getElementById("delete-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function confirmDeleteProduct() {
  if (pendingDeleteId) {
    try {
      await Store.deleteProduct(pendingDeleteId);
      showNotification("Produit supprimé", "Le produit a été retiré du catalogue.", "trash");
    } catch (err) {
      showNotification("Erreur", "La suppression a échoué.", "warning-circle");
    }
  }
  closeDeleteModal();
  await loadAll();
}
