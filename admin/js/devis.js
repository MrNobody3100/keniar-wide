let activeStatusFilter = "all";
let cachedDevisRequests = [];
let cachedCategories = [];

const TYPOLOGIE_LABELS = {
  residentiel: "Résidentiel",
  commercial: "Commercial",
  industriel: "Industriel",
};

document.addEventListener("DOMContentLoaded", async () => {
  wireFilterTabs();
  await loadAll();
});

async function loadAll() {
  try {
    [cachedCategories, cachedDevisRequests] = await Promise.all([Store.getCategories(), Store.getDevisRequests()]);
    renderDevisTable();
  } catch (err) {
    console.error(err);
    showNotification("Erreur", "Impossible de charger les demandes.", "warning-circle");
  }
}

function wireFilterTabs() {
  document.querySelectorAll(".devis-filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeStatusFilter = tab.getAttribute("data-status-filter");
      document.querySelectorAll(".devis-filter-tab").forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle("bg-secondary", isActive);
        t.classList.toggle("text-on-secondary", isActive);
        t.classList.toggle("bg-surface-container-lowest", !isActive);
        t.classList.toggle("text-on-surface-variant", !isActive);
        t.classList.toggle("border", !isActive);
        t.classList.toggle("border-outline-variant/20", !isActive);
      });
      renderDevisTable();
    });
  });
}

function statusBadge(status) {
  const map = {
    nouveau: '<span class="badge badge-new"><i class="ph-fill ph-circle"></i> Nouveau</span>',
    "en-cours": '<span class="badge badge-progress"><i class="ph-fill ph-circle"></i> En cours</span>',
    traite: '<span class="badge badge-done"><i class="ph-fill ph-circle"></i> Traité</span>',
  };
  return map[status] || map["nouveau"];
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function findCategory(id) {
  return cachedCategories.find((c) => c.id === id);
}

function equipementLabels(ids) {
  if (!ids || ids.length === 0) return "—";
  return ids.map((id) => (findCategory(id) ? findCategory(id).label : id)).join(", ");
}

function renderDevisTable() {
  const tbody = document.getElementById("devis-table-body");
  const emptyState = document.getElementById("devis-empty");
  const table = tbody.closest("table").parentElement;

  let requests = cachedDevisRequests;
  if (activeStatusFilter !== "all") {
    requests = requests.filter((d) => d.status === activeStatusFilter);
  }

  if (requests.length === 0) {
    table.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
    return;
  }

  table.classList.remove("hidden");
  emptyState.classList.add("hidden");

  tbody.innerHTML = requests
    .map(
      (d) => `
    <tr>
      <td class="px-6 py-4">
        <div class="flex flex-col">
          <span class="font-headline font-semibold text-on-surface text-sm">${d.nom || "—"}</span>
          <span class="text-xs text-on-surface-variant">${d.telephone || "—"}</span>
        </div>
      </td>
      <td class="px-6 py-4 text-sm text-on-surface-variant">${TYPOLOGIE_LABELS[d.typologie] || "—"}</td>
      <td class="px-6 py-4 text-sm text-on-surface-variant max-w-xs truncate">${equipementLabels(d.equipements)}</td>
      <td class="px-6 py-4 text-xs text-on-surface-variant font-label">${formatDate(d.createdAt)}</td>
      <td class="px-6 py-4">${statusBadge(d.status)}</td>
      <td class="px-6 py-4">
        <div class="flex items-center justify-end gap-2">
          <a href="/api/devis-pdf?id=${d.id}" target="_blank" class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-secondary transition-colors" title="Télécharger le PDF">
            <i class="ph ph-file-pdf text-lg"></i>
          </a>
          <button onclick="openDevisDetail('${d.id}')" class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-secondary transition-colors" title="Voir le détail">
            <i class="ph ph-eye text-lg"></i>
          </button>
          <button onclick="deleteDevisRequest('${d.id}')" class="p-2 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors" title="Supprimer">
            <i class="ph ph-trash text-lg"></i>
          </button>
        </div>
      </td>
    </tr>`
    )
    .join("");
}

function openDevisDetail(id) {
  const d = cachedDevisRequests.find((r) => r.id === id);
  if (!d) return;

  const content = document.getElementById("devis-detail-content");
  content.innerHTML = `
    <div class="flex items-center justify-between">
      ${statusBadge(d.status)}
      <span class="text-xs text-on-surface-variant font-label">${formatDate(d.createdAt)}</span>
    </div>

    <a href="/api/devis-pdf?id=${d.id}" target="_blank"
      class="flex items-center justify-center gap-2 bg-secondary text-on-secondary px-4 py-2.5 rounded-xl text-sm font-headline font-semibold hover:bg-[#2468b3] transition-all">
      <i class="ph ph-file-pdf text-lg"></i> Télécharger le devis en PDF
    </a>

    <div class="grid grid-cols-2 gap-4">
      <div class="flex flex-col gap-1">
        <span class="text-xs font-label text-on-surface-variant uppercase">Nom / Entreprise</span>
        <span class="text-sm text-on-surface font-medium">${d.nom || "—"}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-label text-on-surface-variant uppercase">Téléphone</span>
        <span class="text-sm text-on-surface font-medium">${d.telephone || "—"}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-label text-on-surface-variant uppercase">Typologie</span>
        <span class="text-sm text-on-surface font-medium">${TYPOLOGIE_LABELS[d.typologie] || "—"}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-label text-on-surface-variant uppercase">Visite technique</span>
        <span class="text-sm text-on-surface font-medium">${d.visite === "oui" ? "Souhaitée" : d.visite === "non" ? "Non souhaitée" : "—"}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-label text-on-surface-variant uppercase">Surface estimée</span>
        <span class="text-sm text-on-surface font-medium">${d.surface ? d.surface + " m²" : "—"}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs font-label text-on-surface-variant uppercase">Pièces / Accès</span>
        <span class="text-sm text-on-surface font-medium">${d.acces || "—"}</span>
      </div>
    </div>

    <div class="flex flex-col gap-1">
      <span class="text-xs font-label text-on-surface-variant uppercase">Adresse du site</span>
      <span class="text-sm text-on-surface font-medium">${d.adresse || "—"}</span>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-label text-on-surface-variant uppercase">Équipements souhaités</span>
      <div class="flex flex-wrap gap-2">
        ${
          d.equipements && d.equipements.length
            ? d.equipements
                .map((id) => {
                  const cat = findCategory(id);
                  return `<span class="badge badge-muted"><i class="ph ph-${cat ? cat.icon : "package"}"></i> ${cat ? cat.label : id}</span>`;
                })
                .join("")
            : '<span class="text-sm text-on-surface-variant">Aucun</span>'
        }
      </div>
    </div>

    <div class="flex flex-col gap-2 pt-4 border-t border-outline-variant/10">
      <span class="text-xs font-label text-on-surface-variant uppercase">Changer le statut</span>
      <div class="flex gap-2">
        <button onclick="setDevisStatus('${d.id}', 'nouveau')" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-headline font-semibold border ${d.status === "nouveau" ? "bg-secondary text-on-secondary border-secondary" : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high"}">Nouveau</button>
        <button onclick="setDevisStatus('${d.id}', 'en-cours')" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-headline font-semibold border ${d.status === "en-cours" ? "bg-tertiary text-on-tertiary border-tertiary" : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high"}">En cours</button>
        <button onclick="setDevisStatus('${d.id}', 'traite')" class="flex-1 px-4 py-2.5 rounded-xl text-sm font-headline font-semibold border ${d.status === "traite" ? "bg-[#108552] text-white border-[#108552]" : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high"}">Traité</button>
      </div>
    </div>
  `;

  const modal = document.getElementById("devis-detail-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeDevisDetail() {
  const modal = document.getElementById("devis-detail-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function setDevisStatus(id, status) {
  try {
    await Store.updateDevisStatus(id, status);
    showNotification("Statut mis à jour", "Le statut de la demande a été modifié.", "check-circle");
    await loadAll();
    openDevisDetail(id);
  } catch (err) {
    showNotification("Erreur", "La mise à jour a échoué.", "warning-circle");
  }
}

async function deleteDevisRequest(id) {
  if (!confirm("Supprimer définitivement cette demande de devis ?")) return;
  try {
    await Store.deleteDevisRequest(id);
    showNotification("Demande supprimée", "La demande a été retirée.", "trash");
    await loadAll();
  } catch (err) {
    showNotification("Erreur", "La suppression a échoué.", "warning-circle");
  }
}
