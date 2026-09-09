// Runs on every admin page except login.html.
// - Redirects to login.html if not authenticated (client-side gate only —
//   see the note in js/store.js about this NOT being real security).
// - Wires the mobile sidebar drawer.
// - Highlights the active nav link based on body[data-admin-page].
// - Shows pending-count badges (new devis requests / unread messages).
// - Handles logout.

// Runs on every admin page except login.html.
// - Verifies the session with the server (/api/session) — the actual
//   credential check + cookie live server-side (see /api/login.js), so
//   nothing sensitive is ever present in this file.
// - Wires the mobile sidebar drawer.
// - Highlights the active nav link based on body[data-admin-page].
// - Shows pending-count badges (new devis requests / unread messages).
// - Handles logout.

async function checkAdminSession() {
  try {
    const res = await fetch("/api/session", { credentials: "include" });
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  } catch (err) {
    window.location.href = "login.html";
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const authenticated = await checkAdminSession();
  if (!authenticated) return;

  document.documentElement.classList.remove("admin-checking-auth");
  highlightActiveAdminLink();
  wireMobileSidebar();
  wireLogout();
  updateSidebarBadges();
  setFooterYear();
});

function highlightActiveAdminLink() {
  const currentPage = document.body.getAttribute("data-admin-page");
  if (!currentPage) return;
  document.querySelectorAll("[data-admin-path]").forEach((link) => {
    if (link.getAttribute("data-admin-path") === currentPage) {
      link.setAttribute("data-active", "true");
    }
  });
}

function wireMobileSidebar() {
  const toggle = document.getElementById("admin-mobile-toggle");
  const panel = document.getElementById("admin-mobile-sidebar");
  const closeBtn = document.getElementById("admin-mobile-close");
  const backdrop = document.getElementById("admin-mobile-backdrop");
  if (!toggle || !panel) return;

  const open = () => panel.classList.remove("hidden");
  const close = () => panel.classList.add("hidden");

  toggle.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
  panel.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
}

function wireLogout() {
  const btn = document.getElementById("admin-logout-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "login.html";
    }
  });
}

async function updateSidebarBadges() {
  try {
    const devisBadge = document.getElementById("sidebar-devis-count");
    const messagesBadge = document.getElementById("sidebar-messages-count");

    if (devisBadge) {
      const devis = await Store.getDevisRequests();
      const newCount = devis.filter((d) => d.status === "nouveau").length;
      if (newCount > 0) {
        devisBadge.textContent = newCount;
        devisBadge.classList.remove("hidden");
      }
    }

    if (messagesBadge) {
      const messages = await Store.getMessages();
      const unreadCount = messages.filter((m) => !m.read).length;
      if (unreadCount > 0) {
        messagesBadge.textContent = unreadCount;
        messagesBadge.classList.remove("hidden");
      }
    }
  } catch (err) {
    console.error("Failed to load sidebar badge counts", err);
  }
}

function setFooterYear() {
  const el = document.getElementById("footer-year");
  if (el) el.textContent = new Date().getFullYear();
}

/** Same toast helper used on the public site. */
function showNotification(title, desc, icon = "check-circle") {
  const notif = document.getElementById("notification");
  if (!notif) return;

  document.getElementById("notif-title").textContent = title;
  document.getElementById("notif-desc").textContent = desc;

  const iconEl = document.getElementById("notif-icon");
  iconEl.className = `ph-fill ph-${icon} text-secondary text-2xl`;

  notif.classList.remove("translate-y-32", "opacity-0");
  clearTimeout(window.__notifTimeout);
  window.__notifTimeout = setTimeout(() => {
    notif.classList.add("translate-y-32", "opacity-0");
  }, 3500);
}
