const LOW_STOCK_THRESHOLD = 5;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [devis, products, messages, realisations] = await Promise.all([
      Store.getDevisRequests(),
      Store.getProducts(),
      Store.getMessages(),
      Store.getRealisations(),
    ]);
    renderStats(devis, products, messages, realisations);
    renderRecentDevis(devis);
    renderLowStock(products);
  } catch (err) {
    console.error("Failed to load dashboard data", err);
    showNotification("Erreur", "Impossible de charger le tableau de bord.", "warning-circle");
  }
});

function renderStats(devis, products, messages, realisations) {
  document.getElementById("stat-devis-total").textContent = devis.length;
  document.getElementById("stat-devis-new").textContent =
    `${devis.filter((d) => d.status === "nouveau").length} nouvelles`;

  document.getElementById("stat-products-total").textContent = products.length;
  const lowStockCount = products.filter((p) => Number(p.stock) <= LOW_STOCK_THRESHOLD).length;
  document.getElementById("stat-products-low").textContent = `${lowStockCount} en stock faible`;

  document.getElementById("stat-messages-total").textContent = messages.length;
  document.getElementById("stat-messages-unread").textContent =
    `${messages.filter((m) => !m.read).length} non lus`;

  document.getElementById("stat-realisations-total").textContent = realisations.length;
}

function timeAgo(isoDate) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function statusBadge(status) {
  const map = {
    nouveau: '<span class="badge badge-new"><i class="ph-fill ph-circle"></i> Nouveau</span>',
    "en-cours": '<span class="badge badge-progress"><i class="ph-fill ph-circle"></i> En cours</span>',
    traite: '<span class="badge badge-done"><i class="ph-fill ph-circle"></i> Traité</span>',
  };
  return map[status] || map["nouveau"];
}

function renderRecentDevis(devis) {
  const list = document.getElementById("recent-devis-list");
  const empty = document.getElementById("recent-devis-empty");
  const items = devis.slice(0, 5);

  if (items.length === 0) {
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.classList.add("flex");
    return;
  }

  list.classList.remove("hidden");
  empty.classList.add("hidden");

  list.innerHTML = items
    .map(
      (d) => `
    <a href="devis.html" class="flex items-center justify-between gap-4 px-6 py-4 hover:bg-surface-container-high transition-colors">
      <div class="flex items-center gap-4 min-w-0">
        <div class="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
          <i class="ph ph-user text-lg"></i>
        </div>
        <div class="flex flex-col min-w-0">
          <span class="font-headline font-semibold text-on-surface text-sm truncate">${d.nom || "Client"}</span>
          <span class="text-xs text-on-surface-variant truncate">${d.typologie || "—"} · ${timeAgo(d.createdAt)}</span>
        </div>
      </div>
      ${statusBadge(d.status)}
    </a>`
    )
    .join("");
}

function renderLowStock(products) {
  const list = document.getElementById("low-stock-list");
  const empty = document.getElementById("low-stock-empty");
  const items = products.filter((p) => Number(p.stock) <= LOW_STOCK_THRESHOLD).slice(0, 6);

  if (items.length === 0) {
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.classList.add("flex");
    return;
  }

  list.classList.remove("hidden");
  empty.classList.add("hidden");

  list.innerHTML = items
    .map(
      (p) => `
    <a href="produits.html" class="flex items-center justify-between gap-4 px-6 py-4 hover:bg-surface-container-high transition-colors">
      <div class="flex flex-col min-w-0">
        <span class="font-headline font-semibold text-on-surface text-sm truncate">${p.name}</span>
        <span class="text-xs text-on-surface-variant truncate">Réf: ${p.reference}</span>
      </div>
      <span class="badge ${Number(p.stock) === 0 ? "badge-danger" : "badge-progress"}">
        <i class="ph-fill ph-warning"></i> ${p.stock} en stock
      </span>
    </a>`
    )
    .join("");
}
