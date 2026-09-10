let cachedMessages = [];

document.addEventListener("DOMContentLoaded", loadAll);

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

async function loadAll() {
  try {
    cachedMessages = await Store.getMessages();
    renderMessages();
  } catch (err) {
    console.error(err);
    showNotification("Erreur", "Impossible de charger les messages.", "warning-circle");
  }
}

function renderMessages() {
  const list = document.getElementById("messages-list");
  const empty = document.getElementById("messages-empty");

  if (cachedMessages.length === 0) {
    list.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.classList.add("flex");
    return;
  }

  list.classList.remove("hidden");
  empty.classList.add("hidden");

  list.innerHTML = cachedMessages
    .map(
      (m) => `
    <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-6 flex flex-col gap-3 ${m.read ? "" : "ring-1 ring-secondary/40"}">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center">
            <i class="ph ph-user text-lg"></i>
          </div>
          <div class="flex flex-col">
            <span class="font-headline font-semibold text-on-surface text-sm">${m.nom || "—"}</span>
            <span class="text-xs text-on-surface-variant">${m.email || "—"}</span>
          </div>
          ${!m.read ? '<span class="badge badge-new">Non lu</span>' : ""}
        </div>
        <span class="text-xs text-on-surface-variant font-label">${formatDate(m.createdAt)}</span>
      </div>
      <p class="text-sm text-on-surface-variant">${m.message || ""}</p>
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/10">
        ${!m.read ? `<button onclick="markRead('${m.id}')" class="text-sm text-secondary hover:underline flex items-center gap-1"><i class="ph ph-check"></i> Marquer comme lu</button>` : ""}
        <button onclick="deleteMessage('${m.id}')" class="text-sm text-error hover:underline flex items-center gap-1 ml-4"><i class="ph ph-trash"></i> Supprimer</button>
      </div>
    </div>`
    )
    .join("");
}

async function markRead(id) {
  try {
    await Store.markMessageRead(id);
    await loadAll();
  } catch (err) {
    showNotification("Erreur", "Action impossible.", "warning-circle");
  }
}

async function deleteMessage(id) {
  if (!confirm("Supprimer ce message ?")) return;
  try {
    await Store.deleteMessage(id);
    showNotification("Message supprimé", "Le message a été retiré.", "trash");
    await loadAll();
  } catch (err) {
    showNotification("Erreur", "La suppression a échoué.", "warning-circle");
  }
}
