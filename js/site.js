// Shared behavior for every page: mobile nav toggle, active-link
// highlighting, footer year, and a small toast notification helper
// reused by the catalogue and devis pages.

document.addEventListener("DOMContentLoaded", () => {
  highlightActiveNavLinks();
  wireMobileNav();
  setFooterYear();
});

function highlightActiveNavLinks() {
  const currentPage = document.body.getAttribute("data-page");
  if (!currentPage) return;

  document.querySelectorAll("[data-path]").forEach((link) => {
    if (link.getAttribute("data-path") === currentPage) {
      link.setAttribute("data-nav-active", "true");
      link.setAttribute("aria-current", "page");
    }
  });
}

function wireMobileNav() {
  const toggle = document.getElementById("mobile-nav-toggle");
  const panel = document.getElementById("mobile-nav-panel");
  if (!toggle || !panel) return;

  toggle.addEventListener("click", () => {
    const isOpen = panel.classList.contains("flex");
    panel.classList.toggle("hidden", isOpen);
    panel.classList.toggle("flex", !isOpen);
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  panel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      panel.classList.add("hidden");
      panel.classList.remove("flex");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setFooterYear() {
  const el = document.getElementById("footer-year");
  if (el) el.textContent = new Date().getFullYear();
}

/**
 * Shows the shared toast notification (markup lives once per page,
 * see #notification in each HTML file).
 */
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
