// Renders the product grid from Store (Supabase-backed), builds the
// category filters dynamically, wires up search/filter/sort, and shows
// an empty state when there's nothing to display yet.

let allProducts = [];
let allCategories = [];

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = `<div class="col-span-full flex items-center justify-center py-16 text-on-surface-variant"><i class="ph ph-circle-notch animate-spin text-2xl mr-2"></i> Chargement du catalogue...</div>`;

  try {
    [allCategories, allProducts] = await Promise.all([Store.getCategories(), Store.getProducts()]);
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full flex flex-col items-center gap-2 py-16 text-center text-error"><i class="ph ph-warning-circle text-2xl"></i><span>Impossible de charger le catalogue pour le moment.</span></div>`;
    return;
  }

  initCatalogue();
});

function initCatalogue() {
  const grid = document.getElementById("product-grid");
  const emptyState = document.getElementById("empty-state");
  const productCount = document.getElementById("product-count");
  const categoryFilters = document.getElementById("category-filters");

  const searchInput = document.getElementById("product-search");
  const sortSelect = document.getElementById("sort-select");
  const priceRange = document.getElementById("price-range");
  const priceMaxLabel = document.getElementById("price-max-label");
  const techCheckboxes = document.querySelectorAll('input[name="tech"]');
  const resetButton = document.getElementById("reset-filters");

  const availabilityLabel = {
    "en-stock": "En Stock",
    "sur-commande": "Sur Commande",
    rupture: "Rupture de Stock",
  };

  function buildCategoryFilters() {
    categoryFilters.innerHTML = allCategories
      .map(
        (cat) => `
        <label class="flex items-center gap-3 cursor-pointer group">
          <input checked class="w-4 h-4 rounded accent-secondary cursor-pointer" name="category" type="checkbox" value="${cat.id}" />
          <span class="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors flex items-center gap-1.5">
            <i class="ph ph-${cat.icon}"></i> ${cat.label}
          </span>
        </label>`
      )
      .join("");
  }

  function formatPrice(price) {
    return `${Number(price).toLocaleString("fr-FR")} DZD`;
  }

  function categoryLabel(categoryId) {
    const cat = allCategories.find((c) => c.id === categoryId);
    return cat ? cat.label : categoryId;
  }

  function productCardHTML(product) {
    const imageBlock = product.imageUrl
      ? `<div class="w-full h-full bg-cover bg-center" style="background-image:url('${product.imageUrl}')"></div>`
      : `<div class="media-placeholder w-full h-full"><i class="ph ph-image"></i><span>Photo à ajouter</span></div>`;

    return `
      <div class="product-card flex flex-col bg-surface-container rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
        <div class="relative w-full h-56 bg-surface-container-high overflow-hidden">
          ${imageBlock}
          <div class="absolute top-3 left-3 flex gap-2">
            <span class="bg-surface/90 backdrop-blur-md text-secondary text-[11px] font-label px-3 py-1 rounded-full uppercase tracking-wider">
              ${availabilityLabel[product.availability] || ""}
            </span>
            <span class="bg-secondary text-on-secondary text-[11px] font-label px-3 py-1 rounded-full uppercase">${product.techLabel}</span>
          </div>
          <div class="absolute bottom-3 right-3 bg-surface-container-highest/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-label text-on-surface">
            Réf: ${product.reference}
          </div>
        </div>
        <div class="flex flex-col flex-1 p-6 justify-between gap-6">
          <div class="flex flex-col gap-2">
            <span class="text-xs font-label text-primary uppercase">${categoryLabel(product.categoryId)}</span>
            <h3 class="font-headline font-semibold text-on-surface group-hover:text-secondary transition-colors">${product.name}</h3>
            <p class="text-sm text-on-surface-variant line-clamp-2">${product.description || ""}</p>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex items-baseline justify-between">
              <span class="text-sm text-on-surface-variant">Prix unitaire</span>
              <span class="font-headline font-bold text-secondary">${formatPrice(product.price)}</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button class="bg-surface-container-highest hover:bg-surface-bright text-on-surface text-xs font-label py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                onclick="addToCart('${product.name.replace(/'/g, "\\'")}', ${product.price})">
                <i class="ph ph-shopping-cart"></i> Acheter
              </button>
              <button class="bg-secondary hover:bg-[#164d9e] text-on-secondary text-xs font-label py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                onclick="requestQuote('${product.name.replace(/'/g, "\\'")}')">
                <i class="ph ph-wrench"></i> Devis + Installation
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function getFilters() {
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]');
    return {
      search: searchInput.value.trim().toLowerCase(),
      maxPrice: parseInt(priceRange.value, 10),
      categories: Array.from(categoryCheckboxes).filter((cb) => cb.checked).map((cb) => cb.value),
      techs: Array.from(techCheckboxes).filter((cb) => cb.checked).map((cb) => cb.value),
    };
  }

  function renderProducts() {
    const { search, maxPrice, categories: activeCats, techs } = getFilters();
    priceMaxLabel.textContent = formatPrice(maxPrice);

    const filtered = allProducts.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search) ||
        p.reference.toLowerCase().includes(search) ||
        (p.description || "").toLowerCase().includes(search);
      const matchesCategory = activeCats.includes(p.categoryId);
      const matchesTech = techs.includes(p.tech);
      const matchesPrice = p.price <= maxPrice;
      return matchesSearch && matchesCategory && matchesTech && matchesPrice;
    });

    const sortVal = sortSelect.value;
    if (sortVal === "price-asc") filtered.sort((a, b) => a.price - b.price);
    if (sortVal === "price-desc") filtered.sort((a, b) => b.price - a.price);

    productCount.textContent = filtered.length;

    if (filtered.length === 0) {
      grid.innerHTML = "";
      grid.classList.add("hidden");
      emptyState.classList.remove("hidden");
      emptyState.classList.add("flex");
    } else {
      grid.classList.remove("hidden");
      emptyState.classList.add("hidden");
      emptyState.classList.remove("flex");
      grid.innerHTML = filtered.map(productCardHTML).join("");
    }
  }

  buildCategoryFilters();
  document.querySelectorAll('input[name="category"]').forEach((cb) => cb.addEventListener("change", renderProducts));

  searchInput.addEventListener("input", renderProducts);
  sortSelect.addEventListener("change", renderProducts);
  priceRange.addEventListener("input", renderProducts);
  techCheckboxes.forEach((cb) => cb.addEventListener("change", renderProducts));

  resetButton.addEventListener("click", () => {
    searchInput.value = "";
    priceRange.value = priceRange.max;
    document.querySelectorAll('input[name="category"]').forEach((cb) => (cb.checked = true));
    techCheckboxes.forEach((cb) => (cb.checked = true));
    sortSelect.value = "featured";
    renderProducts();
  });

  renderProducts();
}

function addToCart(productName, price) {
  showNotification(
    "Panier mis à jour",
    `${productName} (${price.toLocaleString("fr-FR")} DZD) ajouté avec succès.`,
    "check-circle"
  );
}

function requestQuote(productName) {
  showNotification(
    "Demande de devis",
    `Préparation du dossier d'installation pour : ${productName}`,
    "wrench"
  );
}
