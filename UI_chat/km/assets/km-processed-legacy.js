import { parseConfig, endpoint, request, validFile, iconName, imageBaseURL } from './km-upload-api.js';

const prefix = {
  '00c_processed_legacy_files': 'KM_PROCESSED_LEGACY_FILES',
  '01b_processed_files': 'KM_PROCESSED_FILES',
}[document.body.dataset.kmPage];
if (!prefix) throw new Error('Page de fichiers traités inconnue.');
const multiFolder = prefix === 'KM_PROCESSED_FILES';
const folders = ['01_processed_files', '01_legacy_processed_files'];
const fileKey = (file) => multiFolder ? JSON.stringify([file.folder, file.name]) : file.name;
const fileLabel = (file) => multiFolder ? `${file.folder}/${file.name}` : file.name;
const operations = ['list', 'view', 'replay', 'delete'];
const state = { config: {}, test: Object.fromEntries(operations.map((op) => [op, false])), busy: true, ready: false, files: [] };
const ui = Object.fromEntries(['upload-notice', 'refresh-files', 'server-state', 'server-files',
  ...operations.flatMap((op) => [`webhook-${op}-toggle`, `webhook-${op}-toggle-image`])]
  .map((id) => [id, document.getElementById(id)]));
const serviceEndpoint = (op) => endpoint(state.config, op, state.test[op], prefix);
const iconURL = (name) => new URL(`icons/${name}.png`, new URL(imageBaseURL, import.meta.url)).href;

function node(tag, className, text = '') {
  const result = document.createElement(tag);
  result.className = className;
  result.textContent = text;
  return result;
}
function message(text, error = false) {
  ui['upload-notice'].textContent = text;
  ui['upload-notice'].classList.toggle('is-error', error);
}
function configured(op) {
  try { serviceEndpoint(op); return true; } catch { return false; }
}
function sizeText(size) {
  if (size < 1024) return `${size} octet(s)`;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(size >= 1048576 ? size / 1048576 : size / 1024) +
    (size >= 1048576 ? ' Mo' : ' Ko');
}
function viewFile(file) {
  if (state.busy || !state.ready || !configured('view')) return;
  try {
    const url = new URL(serviceEndpoint('view'));
    url.searchParams.set('name', file.name);
    if (multiFolder) url.searchParams.set('folder', file.folder);
    window.open(url.href, '_blank', 'noopener,noreferrer');
  } catch (error) { message(error.message, true); }
}
function render() {
  for (const op of operations) {
    ui[`webhook-${op}-toggle`].disabled = state.busy;
    ui[`webhook-${op}-toggle`].setAttribute('aria-checked', String(state.test[op]));
    ui[`webhook-${op}-toggle-image`].src = iconURL(`toggle_blue_${state.test[op] ? 'on' : 'off'}`);
  }
  ui['refresh-files'].disabled = state.busy || !configured('list');
  ui['server-files'].replaceChildren();
  for (const file of state.files) {
    const row = node('li', 'km-upload-row');
    if (multiFolder && file.folder === '01_legacy_processed_files') row.classList.add('km-upload-row-legacy');
    const image = node('img', 'km-upload-file-icon');
    image.alt = '';
    image.src = iconURL(iconName(file.name));
    image.addEventListener('error', () => {
      if (image.src !== iconURL('file')) image.src = iconURL('file');
      else image.hidden = true;
    });
    const info = node('div', 'km-upload-file-info');
    info.append(node('strong', 'km-upload-name', file.name), node('span', 'km-upload-meta', sizeText(file.size)));
    if (multiFolder) info.append(node('span', 'km-upload-meta', `${file.folder}/`));
    row.append(image, info);
    for (const [op, label] of [['view', 'Voir'], ['replay', 'Rejouer'], ['delete', 'Supprimer']]) {
      const action = node('button', `km-upload-button${op === 'delete' ? ' km-upload-danger' : ''}`, label);
      action.type = 'button';
      action.setAttribute('aria-label', `${label} ${fileLabel(file)}`);
      action.disabled = state.busy || !state.ready || !configured(op);
      action.addEventListener('click', () => op === 'view' ? viewFile(file) : perform(op, file));
      row.append(action);
    }
    ui['server-files'].append(row);
  }
}
async function refresh() {
  state.ready = false;
  ui['server-state'].textContent = 'Chargement des fichiers…';
  render();
  try {
    const payload = await request(serviceEndpoint('list'), {}, (data) => Array.isArray(data.files) &&
      data.files.every((file) => validFile(file) && (!multiFolder || folders.includes(file.folder))) &&
      new Set(data.files.map(fileKey)).size === data.files.length, 30000,
      (data) => multiFolder && Array.isArray(data) && data.length === 1 ? data[0] : data);
    state.files = payload.files;
    state.ready = true;
    ui['server-state'].textContent = state.files.length ? `${state.files.length} fichier(s) sur le serveur.` : 'Aucun fichier sur le serveur.';
    return true;
  } catch (error) {
    ui['server-state'].textContent = `Liste indisponible : ${error.message} Les entrées précédentes éventuelles ne sont plus à jour.`;
    return false;
  } finally { render(); }
}
async function perform(op, file) {
  if (state.busy || !state.ready || !configured(op)) return;
  const replay = op === 'replay';
  if (!window.confirm(replay ? `Demander le rejeu du fichier « ${fileLabel(file)} » ?` : `Supprimer le fichier « ${fileLabel(file)} » du serveur ?`)) return;
  state.busy = true;
  message(`${replay ? 'Demande de rejeu' : 'Suppression'} en cours : ${fileLabel(file)}…`);
  render();
  let confirmed = false;
  let errorMessage = '';
  try {
    await request(serviceEndpoint(op), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, expected_revision: file.revision, ...(multiFolder ? { folder: file.folder } : {}) }),
    }, (data) => data.name === file.name && (!multiFolder || data.folder === undefined || data.folder === file.folder));
    confirmed = true;
    // Acceptance of a replay request never removes the source from the browser list.
    if (!replay) state.files = state.files.filter((entry) => fileKey(entry) !== fileKey(file));
  } catch (error) {
    errorMessage = error.message + (error.uncertain ? ' Résultat incertain, aucune relance automatique.' : '');
  }
  try {
    const refreshed = await refresh();
    const result = confirmed ? (replay ?
      `Demande de rejeu prise en compte : ${fileLabel(file)}. La réussite du traitement n’est pas encore confirmée.` :
      `Suppression confirmée : ${fileLabel(file)}.`) :
      `${replay ? 'Demande de rejeu non confirmée' : 'Suppression non confirmée'} pour ${fileLabel(file)} : ${errorMessage}`;
    message(result + (refreshed ? '' : ' Actualisation de la liste indisponible.'), !confirmed || !refreshed);
  } finally {
    state.busy = false;
    render();
    ui['refresh-files'].focus();
  }
}
ui['refresh-files'].addEventListener('click', async () => {
  if (state.busy) return;
  state.busy = true;
  try {
    const ok = await refresh();
    message(ok ? 'Liste serveur actualisée.' : 'Impossible de vérifier les fichiers présents sur le serveur.', !ok);
  } finally { state.busy = false; render(); }
});
for (const op of operations) ui[`webhook-${op}-toggle`].addEventListener('click', async () => {
  if (state.busy) return;
  state.busy = true;
  state.test[op] = !state.test[op];
  render();
  try {
    let ok = true;
    if (op === 'list') {
      state.files = [];
      ok = await refresh();
    }
    message(`WH - ${op} : ${state.test[op] ? 'test' : 'production'}.${ok ? '' : ' Liste serveur indisponible.'}`, !ok);
  } finally { state.busy = false; render(); }
});
window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });

async function initialize() {
  try {
    const response = await fetch(new URL('../config.ini', import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Configuration indisponible.');
    state.config = parseConfig(await response.text());
    const ok = await refresh();
    const allConfigured = operations.every(configured);
    message(ok && allConfigured ? 'Mode production. Vous pouvez gérer les fichiers traités.' :
      'Service non raccordé ou indisponible. Les opérations nécessitent leurs webhooks dédiés.', !(ok && allConfigured));
  } catch (error) {
    ui['server-state'].textContent = 'Liste serveur indisponible.';
    message(error.message || 'Configuration indisponible.', true);
  } finally { state.busy = false; render(); }
}
initialize();
