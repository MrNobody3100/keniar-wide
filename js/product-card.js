/**
 * Shared product card renderer + cart action helpers.
 *
 * Used by both js/catalogue.js (the main grid) and js/produit.js (the
 * "related products" row on the product detail page), so the card
 * markup/behaviour only needs to be maintained in one place.
 *
 * Expects a global `allProducts` array (used to look up a product's
 * name for the cart toast) and the `Cart` / `showNotification` globals
 * from js/cart.js / js/site.js to already be loaded.
 */

const AVAILABILITY_LABEL = {
  "en-stock": "En Stock",
  "sur-commande": "Sur Commande",
  rupture: "Rupture de Stock",
};

function formatPrice(price) {
  return `${Number(price).toLocaleString("fr-FR")} DZD`;
}

function productCardHTML(product, categoryLabel) {
  const imageBlock = product.imageUrl
    ? `<div class="product-card-image w-full h-full bg-cover bg-center" style="background-image:url('${product.imageUrl}')"></div>`
    : `<div class="product-card-image media-placeholder w-full h-full"><i class="ph ph-image"></i><span>Photo à ajouter</span></div>`;

  return `
    <div class="product-card group relative flex flex-col h-full bg-surface-container rounded-2xl overflow-hidden">
      <a href="produit.html?id=${product.id}" class="block">
        <div class="relative w-full aspect-[4/3] overflow-hidden bg-surface-container-high">
          ${imageBlock}
          <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span class="absolute top-3 left-3 bg-surface/90 backdrop-blur-md text-secondary text-[10px] font-label px-2.5 py-1 rounded-full uppercase tracking-wider">
            ${AVAILABILITY_LABEL[product.availability] || ""}
          </span>
          <span class="absolute top-3 right-3 bg-secondary text-on-secondary text-[10px] font-label px-2.5 py-1 rounded-full uppercase">${product.techLabel}</span>
          <span class="absolute bottom-3 left-3 bg-inverse-surface/80 backdrop-blur-md text-inverse-on-surface text-[11px] font-label px-2.5 py-1 rounded-lg opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            Réf. ${product.reference}
          </span>
        </div>
        <div class="flex flex-col gap-1.5 p-5 pb-2">
          <span class="text-[11px] font-label text-primary uppercase tracking-wide">${categoryLabel}</span>
          <h3 class="font-headline font-semibold text-on-surface leading-snug line-clamp-1 group-hover:text-secondary transition-colors">${product.name}</h3>
          <p class="text-sm text-on-surface-variant line-clamp-2 min-h-[2.6em]">${product.description || ""}</p>
        </div>
      </a>
      <div class="flex flex-col gap-3 px-5 pb-5 pt-1 mt-auto">
        <div class="flex items-center justify-between gap-2">
          <span class="font-headline font-bold text-lg text-secondary">${formatPrice(product.price)}</span>
          <button type="button" class="text-xs text-on-surface-variant hover:text-[var(--color-brand-orange-dark)] hover:underline underline-offset-2 transition-colors shrink-0" onclick="requestQuote('${product.name.replace(/'/g, "\\'")}')">
            Devis + install
          </button>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 bg-surface-container-highest rounded-xl px-1 shrink-0">
            <button type="button" class="w-8 h-9 flex items-center justify-center text-on-surface hover:text-secondary" onclick="stepQty('${product.id}', -1)">
              <i class="ph ph-minus text-xs"></i>
            </button>
            <input id="qty-${product.id}" type="number" min="1" value="1" class="w-8 h-9 text-center bg-transparent text-sm text-on-surface outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            <button type="button" class="w-8 h-9 flex items-center justify-center text-on-surface hover:text-secondary" onclick="stepQty('${product.id}', 1)">
              <i class="ph ph-plus text-xs"></i>
            </button>
          </div>
          <button class="flex-1 bg-secondary hover:bg-[#164d9e] text-on-secondary text-xs font-label py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors active:scale-95"
            onclick="addProductToCart('${product.id}')">
            <i class="ph ph-shopping-cart-simple"></i> Ajouter
          </button>
        </div>
      </div>
    </div>`;
}

function stepQty(productId, delta) {
  const input = document.getElementById(`qty-${productId}`);
  if (!input) return;
  const next = Math.max(1, (parseInt(input.value, 10) || 1) + delta);
  input.value = next;
}

function addProductToCart(productId) {
  const input = document.getElementById(`qty-${productId}`);
  const qty = Math.max(1, parseInt(input?.value, 10) || 1);
  const product = (typeof allProducts !== "undefined" ? allProducts : []).find((p) => p.id === productId);

  Cart.add(productId, qty);

  showNotification(
    "Panier mis à jour",
    product ? `${qty} × ${product.name} ajouté au panier.` : "Produit ajouté au panier.",
    "check-circle"
  );

  if (input) input.value = 1;
  Cart.open();
}

function requestQuote(productName) {
  showNotification(
    "Demande de devis",
    `Préparation du dossier d'installation pour : ${productName}`,
    "wrench"
  );
}
