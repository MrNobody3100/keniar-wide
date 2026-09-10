let allRealisations = [];
let realisationCategories = [];
let activeFilter = "all";

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("realisation-grid");
  grid.innerHTML = `<div class="col-span-full flex items-center justify-center py-16 text-on-surface-variant"><i class="ph ph-circle-notch animate-spin text-2xl mr-2"></i> Chargement...</div>`;

  try {
    [realisationCategories, allRealisations] = await Promise.all([Store.getCategories(), Store.getRealisations()]);
  } catch (err) {
    grid.innerHTML = `<div class="col-span-full flex flex-col items-center gap-2 py-16 text-center text-error"><i class="ph ph-warning-circle text-2xl"></i><span>Impossible de charger les réalisations pour le moment.</span></div>`;
    return;
  }

  buildTabs();
  render();
});

function buildTabs() {
  const tabsContainer = document.getElementById("realisation-tabs");
  const tabs = [{ id: "all", label: "Tous" }, ...realisationCategories.map((c) => ({ id: c.id, label: c.label }))];
  tabsContainer.innerHTML = tabs
    .map(
      (tab, i) => `
    <button data-filter="${tab.id}"
      class="realisation-tab ${i === 0 ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"} px-4 py-2 rounded-full text-sm font-headline font-semibold transition-colors">
      ${tab.label}
    </button>`
    )
    .join("");

  tabsContainer.querySelectorAll(".realisation-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeFilter = tab.getAttribute("data-filter");
      tabsContainer.querySelectorAll(".realisation-tab").forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle("bg-secondary", isActive);
        t.classList.toggle("text-on-secondary", isActive);
        t.classList.toggle("bg-surface-container", !isActive);
        t.classList.toggle("text-on-surface-variant", !isActive);
      });
      render();
    });
  });
}

function cardHTML(item) {
  const imageBlock = item.imageUrl
    ? `<div class="w-full h-full bg-cover bg-center" style="background-image:url('${item.imageUrl}')"></div>`
    : `<div class="media-placeholder w-full h-full"><i class="ph ph-image"></i><span>Photo à ajouter</span></div>`;

  return `
    <div class="realisation-card flex flex-col bg-surface-container rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
      <div class="relative w-full h-52 bg-surface-container-high overflow-hidden">${imageBlock}</div>
      <div class="flex flex-col gap-2 p-6">
        <span class="text-xs font-label text-primary uppercase">${item.location || "—"} · ${item.year || ""}</span>
        <h3 class="font-headline font-semibold text-on-surface">${item.title}</h3>
        <p class="text-sm text-on-surface-variant line-clamp-2">${item.description || ""}</p>
        <span class="text-xs text-on-surface-variant mt-2">Client : ${item.client || "—"}</span>
      </div>
    </div>`;
}

function render() {
  const grid = document.getElementById("realisation-grid");
  const emptyState = document.getElementById("realisation-empty");
  const filtered = activeFilter === "all" ? allRealisations : allRealisations.filter((r) => r.categoryId === activeFilter);

  if (filtered.length === 0) {
    grid.innerHTML = "";
    grid.classList.add("hidden");
    emptyState.classList.remove("hidden");
    emptyState.classList.add("flex");
  } else {
    grid.classList.remove("hidden");
    emptyState.classList.add("hidden");
    emptyState.classList.remove("flex");
    grid.innerHTML = filtered.map(cardHTML).join("");
  }
}
