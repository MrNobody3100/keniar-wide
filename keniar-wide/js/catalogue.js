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
      grid.innerHTML = filtered.map((p) => productCardHTML(p, categoryLabel(p.categoryId))).join("");
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
