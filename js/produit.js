// Product detail page (produit.html?id=...). Loads the product, renders
// a full detail panel, and loads a row of related products (same
// category first, filled up with anything else if needed) using the
// shared card renderer from js/product-card.js.

let allProducts = [];
let allCategories = [];
let currentProduct = null;

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const detailEl = document.getElementById("product-detail");

  if (!id) {
    window.location.href = "catalogue-produits.html";
    return;
  }

  try {
    [allCategories, currentProduct] = await Promise.all([Store.getCategories(), Store.getProduct(id)]);
  } catch {
    detailEl.innerHTML = stateBlock("warning-circle", "Impossible de charger cette fiche produit pour le moment.");
    return;
  }

  if (!currentProduct) {
    detailEl.innerHTML = stateBlock("package", "Ce produit n'existe pas ou n'est plus disponible.", true);
    return;
  }

  document.getElementById("page-title").textContent = `${currentProduct.name} | EURL Keniar Wide`;
  document.getElementById("breadcrumb-product").textContent = currentProduct.name;
  detailEl.innerHTML = renderDetail(currentProduct);

  loadRelated(currentProduct);
});

function stateBlock(icon, text, withBackLink) {
  return `
    <div class="col-span-full flex flex-col items-center gap-3 py-24 text-center text-on-surface-variant">
      <i class="ph ph-${icon} text-3xl"></i>
      <span>${text}</span>
      ${withBackLink ? '<a href="catalogue-produits.html" class="text-secondary hover:underline text-sm mt-2">← Retour au catalogue</a>' : ""}
    </div>`;
}

function categoryLabel(categoryId) {
  const cat = allCategories.find((c) => c.id === categoryId);
  return cat ? cat.label : categoryId;
}

function availabilityClasses(availability) {
  if (availability === "en-stock") return "bg-emerald-100 text-emerald-700";
  if (availability === "sur-commande") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function renderDetail(product) {
  const imageBlock = product.imageUrl
    ? `<div class="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style="background-image:url('${product.imageUrl}')"></div>`
    : `<div class="media-placeholder w-full h-full"><i class="ph ph-image"></i><span>Photo à ajouter</span></div>`;

  return `
    <div class="group relative w-full aspect-square lg:aspect-[4/3] rounded-3xl overflow-hidden bg-surface-container-high">
      ${imageBlock}
      <span class="absolute top-4 right-4 bg-secondary text-on-secondary text-xs font-label px-3 py-1.5 rounded-full uppercase">${product.techLabel}</span>
    </div>

    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-label text-primary uppercase tracking-wide">${categoryLabel(product.categoryId)}</span>
          <span class="w-1 h-1 rounded-full bg-outline"></span>
          <span class="text-xs font-label text-on-surface-variant">Réf. ${product.reference}</span>
        </div>
        <h1 class="font-headline font-bold text-2xl sm:text-3xl text-on-surface">${product.name}</h1>
        <span class="inline-flex w-fit items-center gap-1.5 text-xs font-label px-3 py-1 rounded-full ${availabilityClasses(product.availability)}">
          <i class="ph-fill ph-circle text-[8px]"></i> ${AVAILABILITY_LABEL[product.availability] || ""}
        </span>
      </div>

      <p class="text-on-surface-variant leading-relaxed">${product.description || "Description à venir."}</p>

      <div class="flex items-end justify-between gap-4 bg-surface-container rounded-2xl p-5 flex-wrap">
        <div class="flex flex-col">
          <span class="text-xs text-on-surface-variant">Prix unitaire (HT)</span>
          <span class="font-headline font-bold text-2xl sm:text-3xl text-secondary">${formatPrice(product.price)}</span>
        </div>
        <div class="flex items-center gap-1 bg-surface-container-highest rounded-xl px-1">
          <button type="button" class="w-9 h-10 flex items-center justify-center text-on-surface hover:text-secondary" onclick="stepQty('${product.id}', -1)">
            <i class="ph ph-minus"></i>
          </button>
          <input id="qty-${product.id}" type="number" min="1" value="1" class="w-10 h-10 text-center bg-transparent text-on-surface outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          <button type="button" class="w-9 h-10 flex items-center justify-center text-on-surface hover:text-secondary" onclick="stepQty('${product.id}', 1)">
            <i class="ph ph-plus"></i>
          </button>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-3">
        <button class="flex-1 bg-secondary hover:bg-[#2468b3] text-on-secondary py-3.5 rounded-xl text-sm font-label uppercase tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-95"
          onclick="addProductToCart('${product.id}')">
          <i class="ph ph-shopping-cart-simple"></i> Ajouter au panier
        </button>
        <button class="flex-1 bg-surface-container-highest hover:bg-surface-bright text-on-surface py-3.5 rounded-xl text-sm font-label uppercase tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-95"
          onclick="requestQuote('${product.name.replace(/'/g, "\\'")}')">
          <i class="ph ph-wrench"></i> Devis + Installation
        </button>
      </div>

      <div class="grid grid-cols-3 gap-3 pt-2">
        <div class="flex flex-col items-center text-center gap-1.5 bg-surface-container-high/60 rounded-xl p-3">
          <i class="ph-fill ph-seal-check text-secondary text-xl"></i>
          <span class="text-[11px] text-on-surface-variant">Garantie 2 ans</span>
        </div>
        <div class="flex flex-col items-center text-center gap-1.5 bg-surface-container-high/60 rounded-xl p-3">
          <i class="ph-fill ph-wrench text-secondary text-xl"></i>
          <span class="text-[11px] text-on-surface-variant">Installation pro</span>
        </div>
        <div class="flex flex-col items-center text-center gap-1.5 bg-surface-container-high/60 rounded-xl p-3">
          <i class="ph-fill ph-truck text-secondary text-xl"></i>
          <span class="text-[11px] text-on-surface-variant">Livraison rapide</span>
        </div>
      </div>
    </div>`;
}

async function loadRelated(product) {
  const section = document.getElementById("related-products").parentElement;
  const container = document.getElementById("related-products");

  try {
    allProducts = await Store.getProducts();
  } catch {
    section.classList.add("hidden");
    return;
  }

  const sameCategory = allProducts.filter((p) => p.id !== product.id && p.categoryId === product.categoryId);
  const others = allProducts.filter((p) => p.id !== product.id && p.categoryId !== product.categoryId);
  const list = [...sameCategory, ...others].slice(0, 8);

  if (list.length === 0) {
    section.classList.add("hidden");
    return;
  }

  container.innerHTML = list
    .map(
      (p) => `
      <div class="snap-start shrink-0 w-[78%] xs:w-[60%] sm:w-[45%] lg:w-auto">
        ${productCardHTML(p, categoryLabel(p.categoryId))}
      </div>`
    )
    .join("");
}
