/**
 * Cart — client-side shopping cart (persisted in localStorage), shared
 * across every public page via the header's cart button. Injects its
 * own slide-over drawer into the page (no markup needed in the HTML
 * files) and keeps the header badge in sync.
 *
 * The "Générer mon devis PDF" action reuses the site's existing
 * official quote pipeline: it creates a devis_requests row (with the
 * cart's items) via Store.addDevisRequest(), then opens
 * /api/devis-pdf?id=... — the same server-rendered PDF (with the
 * Keniar Wide logo) used by the "Devis sur Mesure" configurator, and
 * the request also shows up in the admin "Devis" list.
 *
 * Requires js/store.js (Store) to look up product details and to
 * submit the devis request.
 *
 * Public API: Cart.add(id, qty), Cart.setQty(id, qty), Cart.remove(id),
 * Cart.clear(), Cart.getItems(), Cart.count(), Cart.open().
 */

const CART_STORAGE_KEY = "keniar_cart_v1";

const Cart = (function () {
  function read() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      const items = raw ? JSON.parse(raw) : [];
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("cart:change", { detail: items }));
  }

  return {
    getItems() {
      return read();
    },
    add(productId, qty = 1) {
      qty = Math.max(1, Math.floor(Number(qty)) || 1);
      const items = read();
      const existing = items.find((i) => i.id === productId);
      if (existing) {
        existing.qty += qty;
      } else {
        items.push({ id: productId, qty });
      }
      write(items);
    },
    setQty(productId, qty) {
      qty = Math.max(1, Math.floor(Number(qty)) || 1);
      const items = read().map((i) => (i.id === productId ? { ...i, qty } : i));
      write(items);
    },
    remove(productId) {
      write(read().filter((i) => i.id !== productId));
    },
    clear() {
      write([]);
    },
    count() {
      return read().reduce((sum, i) => sum + i.qty, 0);
    },
    open() {
      openCartDrawer();
    },
  };
})();

// ---------------------------------------------------------------------
// Drawer UI (injected once, reused on every page)
// ---------------------------------------------------------------------

let cartProductsCache = null; // Store.getProducts() result, cached per page load

async function getProductsCache() {
  if (!cartProductsCache) {
    cartProductsCache = await Store.getProducts();
  }
  return cartProductsCache;
}

function formatDZD(n) {
  return `${Number(n).toLocaleString("fr-FR")} DZD`;
}

document.addEventListener("DOMContentLoaded", () => {
  injectCartDrawer();
  wireCartToggleButtons();
  refreshCartBadge();
  window.addEventListener("cart:change", refreshCartBadge);
});

function wireCartToggleButtons() {
  document.querySelectorAll("[data-cart-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openCartDrawer();
    });
  });
}

function refreshCartBadge() {
  const count = Cart.count();
  document.querySelectorAll("[data-cart-count]").forEach((badge) => {
    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  });
}

function injectCartDrawer() {
  if (document.getElementById("cart-drawer")) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="cart-drawer-backdrop" class="hidden fixed inset-0 bg-inverse-surface/50 z-[60] transition-opacity"></div>
    <aside id="cart-drawer" class="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-surface z-[70] shadow-2xl translate-x-full transition-transform duration-300 flex flex-col">
      <div class="flex items-center justify-between px-6 h-20 border-b border-outline-variant/20 shrink-0">
        <span class="font-headline font-semibold text-lg text-on-surface flex items-center gap-2">
          <i class="ph ph-shopping-cart text-secondary"></i> Votre panier
        </span>
        <button id="cart-drawer-close" class="p-2 -mr-2 text-on-surface-variant hover:text-on-surface">
          <i class="ph ph-x text-2xl"></i>
        </button>
      </div>

      <div id="cart-drawer-body" class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4"></div>

      <div id="cart-drawer-footer" class="border-t border-outline-variant/20 p-6 flex flex-col gap-3 shrink-0"></div>
    </aside>`;
  document.body.appendChild(wrapper);

  const backdrop = document.getElementById("cart-drawer-backdrop");
  document.getElementById("cart-drawer-close").addEventListener("click", closeCartDrawer);
  backdrop.addEventListener("click", closeCartDrawer);
  window.addEventListener("cart:change", () => {
    if (isDrawerOpen()) renderCartDrawer();
  });
}

function isDrawerOpen() {
  const drawer = document.getElementById("cart-drawer");
  return drawer && !drawer.classList.contains("translate-x-full");
}

async function openCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const backdrop = document.getElementById("cart-drawer-backdrop");
  if (!drawer) return;
  backdrop.classList.remove("hidden");
  drawer.classList.remove("translate-x-full");
  document.body.classList.add("overflow-hidden");
  await renderCartDrawer();
}

function closeCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  const backdrop = document.getElementById("cart-drawer-backdrop");
  if (!drawer) return;
  drawer.classList.add("translate-x-full");
  backdrop.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

async function renderCartDrawer() {
  const body = document.getElementById("cart-drawer-body");
  const footer = document.getElementById("cart-drawer-footer");
  const items = Cart.getItems();

  if (items.length === 0) {
    body.innerHTML = `
      <div class="flex-1 flex flex-col items-center justify-center gap-3 text-center text-on-surface-variant py-16">
        <i class="ph ph-shopping-cart-simple text-4xl"></i>
        <span>Votre panier est vide pour le moment.</span>
      </div>`;
    footer.innerHTML = "";
    return;
  }

  body.innerHTML = `<div class="flex items-center justify-center py-10 text-on-surface-variant"><i class="ph ph-circle-notch animate-spin text-2xl"></i></div>`;

  let products;
  try {
    products = await getProductsCache();
  } catch {
    body.innerHTML = `<div class="flex flex-col items-center gap-2 py-16 text-center text-error"><i class="ph ph-warning-circle text-2xl"></i><span>Impossible de charger le panier.</span></div>`;
    return;
  }

  const lines = items
    .map((item) => {
      const product = products.find((p) => p.id === item.id);
      return product ? { product, qty: item.qty } : null;
    })
    .filter(Boolean);

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);

  body.innerHTML =
    lines
      .map(
        ({ product, qty }) => `
      <div class="flex gap-3 bg-surface-container rounded-xl p-3">
        <div class="w-16 h-16 rounded-lg bg-surface-container-high overflow-hidden shrink-0">
          ${
            product.imageUrl
              ? `<div class="w-full h-full bg-cover bg-center" style="background-image:url('${product.imageUrl}')"></div>`
              : `<div class="w-full h-full flex items-center justify-center text-on-surface-variant"><i class="ph ph-image"></i></div>`
          }
        </div>
        <div class="flex-1 min-w-0 flex flex-col gap-1">
          <span class="font-headline font-semibold text-sm text-on-surface truncate">${product.name}</span>
          <span class="text-xs text-on-surface-variant">${formatDZD(product.price)} / unité</span>
          <div class="flex items-center justify-between mt-1">
            <div class="flex items-center gap-2 bg-surface-container-high rounded-lg px-1.5 py-1">
              <button class="w-6 h-6 flex items-center justify-center text-on-surface hover:text-secondary" onclick="Cart.setQty('${product.id}', ${qty - 1 > 0 ? qty - 1 : 1})">
                <i class="ph ph-minus text-xs"></i>
              </button>
              <span class="text-sm font-label w-5 text-center">${qty}</span>
              <button class="w-6 h-6 flex items-center justify-center text-on-surface hover:text-secondary" onclick="Cart.setQty('${product.id}', ${qty + 1})">
                <i class="ph ph-plus text-xs"></i>
              </button>
            </div>
            <button class="text-on-surface-variant hover:text-error p-1" title="Retirer" onclick="Cart.remove('${product.id}')">
              <i class="ph ph-trash text-lg"></i>
            </button>
          </div>
        </div>
      </div>`
      )
      .join("") + renderSuggestions(lines, products);

  footer.innerHTML = `
    <div class="flex items-center justify-between text-sm">
      <span class="text-on-surface-variant">Sous-total (${items.reduce((s, i) => s + i.qty, 0)} article${items.reduce((s, i) => s + i.qty, 0) > 1 ? "s" : ""})</span>
      <span class="font-headline font-bold text-lg text-secondary">${formatDZD(subtotal)}</span>
    </div>

    <div class="flex flex-col gap-2 bg-surface-container rounded-xl p-3">
      <span class="text-[11px] font-label text-on-surface-variant uppercase">Vos coordonnées (pour vous recontacter)</span>
      <input id="cart-devis-nom" type="text" placeholder="Nom complet"
        class="bg-surface-container-high text-on-surface text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-secondary" />
      <input id="cart-devis-telephone" type="tel" placeholder="Téléphone"
        class="bg-surface-container-high text-on-surface text-sm px-3 py-2.5 rounded-lg outline-none focus:ring-2 focus:ring-secondary" />
    </div>

    <button id="cart-download-pdf" class="bg-secondary hover:bg-[#2468b3] text-on-secondary py-3 rounded-xl text-sm font-label uppercase tracking-wide flex items-center justify-center gap-2 transition-colors active:scale-95">
      <i class="ph ph-file-pdf"></i> Générer mon devis PDF
    </button>
    <button id="cart-clear" class="text-xs text-on-surface-variant hover:text-error text-center">Vider le panier</button>`;

  document.getElementById("cart-download-pdf").addEventListener("click", () => submitCartAsDevis(lines));
  document.getElementById("cart-clear").addEventListener("click", () => Cart.clear());
}

// ---------------------------------------------------------------------
// Suggestions — lightweight keyword heuristic (no schema change needed).
// If the cart contains a camera, suggest recorders (NVR/DVR) and storage
// (disque dur) from the catalogue that aren't already in the cart.
// ---------------------------------------------------------------------

function renderSuggestions(lines, allProductsList) {
  const inCartIds = new Set(lines.map((l) => l.product.id));
  const cartText = lines.map((l) => `${l.product.name} ${l.product.description || ""}`).join(" ").toLowerCase();

  const wantsRecorder = /cam[ée]ra/i.test(cartText);
  if (!wantsRecorder) return "";

  const isRecorderOrStorage = (p) => /nvr|dvr|enregistreur|disque dur|hdd|stockage/i.test(`${p.name} ${p.description || ""}`);

  const suggestions = allProductsList.filter((p) => !inCartIds.has(p.id) && isRecorderOrStorage(p)).slice(0, 3);

  if (suggestions.length === 0) return "";

  return `
    <div class="pt-2">
      <span class="text-xs font-label uppercase text-on-surface-variant">Vous pourriez aussi avoir besoin de</span>
      <div class="flex flex-col gap-2 mt-2">
        ${suggestions
          .map(
            (p) => `
          <div class="flex items-center gap-3 bg-surface-container-high/60 rounded-xl p-2.5">
            <div class="w-10 h-10 rounded-lg bg-surface-container-high overflow-hidden shrink-0">
              ${
                p.imageUrl
                  ? `<div class="w-full h-full bg-cover bg-center" style="background-image:url('${p.imageUrl}')"></div>`
                  : `<div class="w-full h-full flex items-center justify-center text-on-surface-variant"><i class="ph ph-image text-sm"></i></div>`
              }
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-headline font-semibold text-on-surface truncate">${p.name}</div>
              <div class="text-[11px] text-on-surface-variant">${formatDZD(p.price)}</div>
            </div>
            <button class="text-xs font-label text-secondary hover:underline shrink-0" onclick="Cart.add('${p.id}', 1)">
              + Ajouter
            </button>
          </div>`
          )
          .join("")}
      </div>
    </div>`;
}

// ---------------------------------------------------------------------
// Submit the cart as an official devis request, then open the
// server-generated PDF (same pipeline as "Devis sur Mesure").
// ---------------------------------------------------------------------

async function submitCartAsDevis(lines) {
  const btn = document.getElementById("cart-download-pdf");
  const nomInput = document.getElementById("cart-devis-nom");
  const telInput = document.getElementById("cart-devis-telephone");
  const nom = nomInput.value.trim();
  const telephone = telInput.value.trim();

  if (!nom || !telephone) {
    showNotification("Coordonnées requises", "Merci d'indiquer votre nom et votre téléphone.", "warning-circle");
    (!nom ? nomInput : telInput).focus();
    return;
  }

  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<i class="ph ph-circle-notch animate-spin"></i> Génération...`;

  try {
    const items = lines.map(({ product, qty }) => ({
      productId: product.id,
      name: product.name,
      reference: product.reference,
      qty,
      price: product.price,
    }));

    const created = await Store.addDevisRequest({ nom, telephone, items });

    showNotification("Devis généré", "Votre devis PDF va s'ouvrir dans un nouvel onglet.", "check-circle");
    window.open(`/api/devis-pdf?id=${created.id}`, "_blank");

    Cart.clear();
    closeCartDrawer();
  } catch (err) {
    console.error("Devis submission error:", err);
    showNotification("Erreur", "Le devis n'a pas pu être généré. Réessayez.", "warning-circle");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}
