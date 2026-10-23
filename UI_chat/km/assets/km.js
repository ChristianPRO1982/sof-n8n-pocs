// Registry shared by every page. File names are lowercase; labels match storage.
const pages = [
  { id: "home", label: "Accueil", title: "Accueil", path: "./" },
  { id: "01_upload_raw_files", label: "01_upload_raw_files", title: "Import des fichiers sources" },
  { id: "01_processed_files", label: "01_processed_files", title: "Fichiers traités" },
  { id: "02_format_controls", label: "02_format_controls", title: "Contrôles de format" },
  { id: "03_deltas", label: "03_deltas", title: "Deltas" },
  { id: "04_reports", label: "04_reports", title: "Rapports" },
  { id: "05_metadata", label: "05_metadata", title: "Métadonnées" },
  { id: "06_business_validation", label: "06_business_validation", title: "Validation humaine" },
  { id: "07_knowledges", label: "07_knowledges", title: "Connaissances" },
  { id: "08_markdown", label: "08_markdown", title: "Export Markdown" },
  { id: "09_ai_ready", label: "09_AI_Ready", title: "Base AI Ready" },
  { id: "10_tracking_journal", label: "10_tracking_journal", title: "Journal de suivi" },
];

// Status values come from statuses.json; labels and the legend remain shared.
const statuses = {
  not_started: "Aucun développement encore lancé pour cette partie",
  bugs: "Bugs détectés et en cours d’investigation",
  development: "Développement en cours",
  testing: "Phase de test",
  validated: "Validé",
};

const rootURL = new URL("../", import.meta.url);
const pageId = document.body.dataset.kmPage;
const page = pages.find((entry) => entry.id === pageId) ?? {
  id: pageId,
  title: document.body.dataset.kmTitle || "Nouvelle page",
};
const layout = document.querySelector(".km-layout");
const sidebar = document.querySelector("#km-sidebar");
const resizer = document.querySelector("#km-resizer");
const workspace = document.querySelector(".km-workspace");
const header = document.querySelector("[data-km-header]");
const context = document.querySelector("[data-km-context]");
const backdrop = document.querySelector(".km-backdrop");
const mobile = window.matchMedia("(max-width: 1100px)");
const storageKey = "km.sidebarWidthPercent";
const minimum = 15;
const maximum = 33;
let widthPercent = 22;
let drawerOpen = false;
let previousFocus = null;
let dragPointer = null;
let dragOffset = 0;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function updateStatusBadge(badge, status) {
  const key = typeof status === "string" && Object.hasOwn(statuses, status) ? status : "not_started";
  badge.dataset.kmStatus = key;
  badge.setAttribute("role", "img");
  badge.setAttribute("aria-label", `Statut : ${statuses[key]}`);
  badge.title = statuses[key];
}

function statusBadge(status) {
  const badge = element("span", "km-status-dot");
  updateStatusBadge(badge, status);
  return badge;
}

function pageBadge(entry) {
  if (entry.id !== "home") {
    const badge = statusBadge("not_started");
    badge.dataset.kmStatusPage = entry.id;
    return badge;
  }
  const icon = element("span", "km-home-icon", "🏠");
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function iconButton(label, className, iconPath) {
  const button = element("button", `km-icon-button ${className}`);
  button.type = "button";
  button.setAttribute("aria-label", label);
  // Icons are static local geometry, never supplied by a document or webhook.
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="${iconPath}"/></svg>`;
  return button;
}

const sidebarHeading = element("div", "km-sidebar-heading");
const brand = element("div");
const brandTitle = element("h2", "km-brand", "Knowledge Manager");
brandTitle.id = "km-navigation-title";
brand.append(brandTitle, element("p", "km-eyebrow", "Chaîne documentaire"));
const closeButton = iconButton("Fermer le menu général", "km-close", "M6 6l12 12M18 6 6 18");
sidebarHeading.append(brand, closeButton);
const navigation = element("nav", "km-navigation");
navigation.setAttribute("aria-label", "Chaîne documentaire");
const list = element("ul");
for (const entry of pages) {
  const item = element("li");
  const link = element("a");
  link.append(pageBadge(entry), element("span", "km-nav-label", entry.label));
  link.href = new URL(entry.path ?? `pages/${entry.id}.html`, rootURL).href;
  if (entry.id === page.id) link.setAttribute("aria-current", "page");
  item.append(link);
  list.append(item);
}
navigation.append(list);
sidebar.append(sidebarHeading, navigation, element("p", "km-sidebar-footer", "POC INNO · Sofinco"));

const hamburger = iconButton("Ouvrir le menu général", "km-hamburger", "M4 6h16M4 12h16M4 18h16");
hamburger.setAttribute("aria-controls", "km-sidebar");
hamburger.setAttribute("aria-expanded", "false");
const logoLink = element("a", "km-logo-link");
logoLink.href = rootURL.href;
logoLink.setAttribute("aria-label", "Knowledge Manager — accueil");
const logo = element("img", "km-logo");
logo.src = new URL("assets/logo-sofinco.png", rootURL).href;
logo.alt = "Sofinco";
logoLink.append(logo);
const heading = element("div", "km-page-heading");
heading.append(pageBadge(page), element("h1", "km-page-title", page.title));
header.prepend(hamburger, logoLink, heading);
context.setAttribute("aria-label", "Menu de la page");
const homeLink = element("a", "", page.id === "home" ? "Accueil" : "Retour à l’accueil");
homeLink.href = rootURL.href;
if (page.id === "home") homeLink.setAttribute("aria-current", "page");
context.prepend(homeLink);
document.title = `${page.title} — Knowledge Manager`;

// Only the home page provides this legend insertion point.
const statusLegend = document.querySelector("[data-km-status-legend]");
if (page.id === "home" && statusLegend) {
  for (const [key, label] of Object.entries(statuses)) {
    const item = element("li");
    const dot = statusBadge(key);
    dot.removeAttribute("role");
    dot.removeAttribute("aria-label");
    dot.setAttribute("aria-hidden", "true");
    item.append(dot, element("span", "", label));
    statusLegend.append(item);
  }
}

function applyWidth(value) {
  widthPercent = Math.min(maximum, Math.max(minimum, value));
  layout.style.setProperty("--km-sidebar-width", `${widthPercent}%`);
  resizer.setAttribute("aria-valuenow", String(Math.round(widthPercent * 10) / 10));
  resizer.setAttribute("aria-valuetext", `${Math.round(widthPercent)} % de la largeur`);
}

function saveWidth() {
  try { localStorage.setItem(storageKey, String(widthPercent)); } catch { /* Optional browser preference. */ }
}

try {
  const stored = localStorage.getItem(storageKey);
  if (stored !== null && stored.trim() !== "" && Number.isFinite(Number(stored))) {
    widthPercent = Number(stored);
  }
} catch { /* The shell works even when browser storage is blocked. */ }
applyWidth(widthPercent);

function focusableItems() {
  return [...sidebar.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')]
    .filter((node) => node.getClientRects().length > 0);
}

function closeDrawer(restoreFocus = true) {
  if (!drawerOpen) return;
  drawerOpen = false;
  workspace.inert = false;
  backdrop.hidden = true;
  document.body.classList.remove("km-menu-open");
  hamburger.setAttribute("aria-expanded", "false");
  sidebar.removeAttribute("role");
  sidebar.removeAttribute("aria-modal");
  if (restoreFocus && mobile.matches) (previousFocus || hamburger).focus();
  sidebar.hidden = mobile.matches;
}

function openDrawer() {
  if (!mobile.matches || drawerOpen) return;
  previousFocus = document.activeElement;
  drawerOpen = true;
  sidebar.hidden = false;
  sidebar.setAttribute("role", "dialog");
  sidebar.setAttribute("aria-modal", "true");
  sidebar.setAttribute("aria-labelledby", "km-navigation-title");
  backdrop.hidden = false;
  document.body.classList.add("km-menu-open");
  hamburger.setAttribute("aria-expanded", "true");
  closeButton.focus();
  workspace.inert = true;
}

hamburger.addEventListener("click", openDrawer);
closeButton.addEventListener("click", () => closeDrawer());
backdrop.addEventListener("click", () => closeDrawer());
navigation.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeDrawer();
});
document.addEventListener("keydown", (event) => {
  if (!drawerOpen) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeDrawer();
  } else if (event.key === "Tab") {
    const items = focusableItems();
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
document.addEventListener("focusin", (event) => {
  if (drawerOpen && !sidebar.contains(event.target)) closeButton.focus();
});

function stopResize(event) {
  if (dragPointer === null || (event && event.pointerId !== dragPointer)) return;
  const pointer = dragPointer;
  dragPointer = null;
  if (resizer.hasPointerCapture(pointer)) resizer.releasePointerCapture(pointer);
  document.body.classList.remove("km-resizing");
  saveWidth();
}

resizer.addEventListener("pointerdown", (event) => {
  if (mobile.matches || !event.isPrimary || event.button !== 0) return;
  event.preventDefault();
  const bounds = layout.getBoundingClientRect();
  dragOffset = event.clientX - bounds.left - bounds.width * widthPercent / 100;
  dragPointer = event.pointerId;
  resizer.setPointerCapture(dragPointer);
  resizer.focus();
  document.body.classList.add("km-resizing");
});
resizer.addEventListener("pointermove", (event) => {
  if (event.pointerId !== dragPointer) return;
  const bounds = layout.getBoundingClientRect();
  applyWidth(((event.clientX - bounds.left - dragOffset) / bounds.width) * 100);
});
resizer.addEventListener("pointerup", stopResize);
resizer.addEventListener("pointercancel", stopResize);
resizer.addEventListener("lostpointercapture", stopResize);
resizer.addEventListener("keydown", (event) => {
  if (mobile.matches) return;
  const changes = { ArrowLeft: widthPercent - 1, ArrowRight: widthPercent + 1, Home: minimum, End: maximum };
  if (!(event.key in changes)) return;
  event.preventDefault();
  applyWidth(changes[event.key]);
  saveWidth();
});

function syncViewport() {
  const hadDrawerFocus = sidebar.contains(document.activeElement);
  closeDrawer(false);
  stopResize();
  sidebar.hidden = mobile.matches;
  if (mobile.matches && (hadDrawerFocus || document.activeElement === resizer)) hamburger.focus();
  if (!mobile.matches && hadDrawerFocus && document.activeElement === closeButton) {
    (navigation.querySelector('[aria-current="page"]') || navigation.querySelector("a")).focus();
  }
}
mobile.addEventListener("change", syncViewport);
syncViewport();

// Fetch runtime status settings independently from the cached JavaScript bundle.
let statusRefreshPending = false;
let statusReadFailed = false;
async function refreshStatuses() {
  if (statusRefreshPending) return;
  statusRefreshPending = true;
  try {
    const response = await fetch(new URL("statuses.json", rootURL), {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const values = await response.json();
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new Error("Le fichier des statuts doit être un objet JSON.");
    }
    for (const badge of document.querySelectorAll("[data-km-status-page]")) {
      const id = badge.dataset.kmStatusPage;
      updateStatusBadge(badge, Object.hasOwn(values, id) ? values[id] : "not_started");
    }
    statusReadFailed = false;
  } catch (error) {
    // Keep the last successful display; an outage must not reset known statuses.
    if (!statusReadFailed) console.warn("KM : actualisation des pastilles indisponible.", error);
    statusReadFailed = true;
  } finally { statusRefreshPending = false; }
}
refreshStatuses();
setInterval(() => { if (!document.hidden) refreshStatuses(); }, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshStatuses(); });
window.addEventListener("pageshow", refreshStatuses);
