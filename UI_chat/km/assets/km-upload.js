import { parseConfig, endpoint, request, validFile, iconName } from './km-upload-api.js';

const $ = (id) => document.getElementById(id);
const ui = Object.fromEntries(['webhook-toggle', 'webhook-toggle-image', 'upload-notice',
  'refresh-files', 'server-state', 'server-files', 'file-picker', 'choose-files', 'upload-drop',
  'selection-count', 'selected-files', 'agreement-summary', 'send-files', 'retry-files',
  'new-batch', 'upload-progress', 'upload-result'].map((id) => [id, $(id)]));
const state = { config: {}, test: false, busy: true, ready: false, files: [], items: [], completed: false };
const statusLabels = { pending: 'En attente', sending: 'En cours…', success: 'Réussi', failed: 'Échoué' };

function node(tag, className = '', text = '') {
  const result = document.createElement(tag);
  result.className = className;
  result.textContent = text;
  return result;
}
function message(text, error = false) {
  ui['upload-notice'].textContent = text;
  ui['upload-notice'].classList.toggle('is-error', error);
}
function sizeText(size) {
  if (size < 1024) return `${size} octet(s)`;
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(size >= 1048576 ? size / 1048576 : size / 1024) +
    (size >= 1048576 ? ' Mo' : ' Ko');
}
function fileRow(file) {
  const row = node('li', 'km-upload-row');
  const image = node('img', 'km-upload-file-icon');
  image.alt = '';
  image.src = new URL(`icons/${iconName(file.name)}.png`, import.meta.url).href;
  image.addEventListener('error', () => {
    const generic = new URL('icons/file.png', import.meta.url).href;
    if (image.src !== generic) image.src = generic;
    else image.hidden = true;
  });
  const info = node('div', 'km-upload-file-info');
  info.append(node('strong', 'km-upload-name', file.name), node('span', 'km-upload-meta', sizeText(file.size)));
  row.append(image, info);
  return { row, info };
}
function button(text, action, name, danger = false) {
  const result = node('button', `km-upload-button${danger ? ' km-upload-danger' : ''}`, text);
  result.type = 'button';
  result.setAttribute('aria-label', `${text} ${name}`);
  result.addEventListener('click', action);
  return result;
}
function configured(operation) {
  try { endpoint(state.config, operation, state.test); return true; } catch { return false; }
}
function duplicates() {
  const names = new Set();
  const repeated = new Set();
  for (const { file } of state.items) {
    if (names.has(file.name)) repeated.add(file.name);
    names.add(file.name);
  }
  return repeated;
}
function render() {
  const repeated = duplicates();
  const existing = new Map(state.files.map((file) => [file.name, file]));
  ui['webhook-toggle'].disabled = state.busy;
  ui['webhook-toggle'].setAttribute('aria-checked', String(state.test));
  ui['webhook-toggle-image'].src = new URL(`icons/toggle_blue_${state.test ? 'on' : 'off'}.png`, import.meta.url).href;
  ui['refresh-files'].disabled = state.busy || !configured('list');
  ui['choose-files'].disabled = state.busy || state.completed;
  // Selection is available even when configuration is absent (after initialization).
  ui['file-picker'].disabled = state.busy || state.completed;
  ui['upload-drop'].setAttribute('aria-disabled', String(state.busy || state.completed));
  ui['send-files'].disabled = state.busy || state.completed || !state.ready || !configured('upload') ||
    !state.items.length || repeated.size > 0;
  ui['retry-files'].hidden = !state.completed || !state.items.some((item) => item.status === 'failed');
  ui['retry-files'].disabled = state.busy || !configured('list');
  ui['new-batch'].hidden = !state.completed;
  ui['new-batch'].disabled = state.busy;
  ui['selection-count'].textContent = state.items.length ? `${state.items.length} fichier(s) dans le lot.` : 'Aucun fichier sélectionné.';
  let summary = 'Vérifiez la liste, puis cliquez sur Accord pour envoyer le lot.';
  const replacements = state.items.filter(({ file }) => existing.has(file.name)).length;
  if (!state.ready) summary = 'La liste serveur doit être disponible avant de donner votre accord.';
  else if (!configured('upload')) summary = 'Le service de dépôt n’est pas encore raccordé.';
  else if (repeated.size) summary = 'Retirez les doublons de la sélection avant de donner votre accord.';
  else if (replacements) summary = `Accord autorise l’envoi du lot et l’écrasement des ${replacements} fichier(s) signalé(s) ci-dessus.`;
  if (state.completed) summary = 'Lot terminé. Préparez une reprise des échecs ou commencez un nouveau lot.';
  ui['agreement-summary'].textContent = summary;

  ui['server-files'].replaceChildren();
  for (const file of state.files) {
    const { row } = fileRow(file);
    const remove = button('Supprimer', () => deleteFile(file), file.name, true);
    remove.disabled = state.busy || !state.ready || !configured('delete');
    row.append(remove);
    ui['server-files'].append(row);
  }
  ui['selected-files'].replaceChildren();
  for (const item of state.items) {
    const { row, info } = fileRow(item.file);
    if (!state.completed && item.status === 'pending') {
      if (repeated.has(item.file.name)) info.append(node('div', 'km-upload-warning', 'Nom en double dans la sélection : retirez les entrées en trop.'));
      if (state.ready && existing.has(item.file.name)) info.append(node('div', 'km-upload-warning', 'Attention : le fichier serveur sera écrasé si vous validez le lot.'));
    }
    const status = node('span', 'km-upload-state', `${statusLabels[item.status]}${item.error ? ` — ${item.error}` : ''}`);
    status.dataset.state = item.status;
    info.append(status);
    if (!state.completed) {
      const remove = button('Retirer', () => {
        state.items = state.items.filter((entry) => entry !== item);
        render();
        ui['choose-files'].focus();
      }, item.file.name);
      remove.disabled = state.busy;
      row.append(remove);
    }
    ui['selected-files'].append(row);
  }
}

async function refresh() {
  state.ready = false;
  ui['server-state'].textContent = 'Chargement des fichiers…';
  render();
  try {
    const payload = await request(endpoint(state.config, 'list', state.test), {}, (data) =>
      Array.isArray(data.files) && data.files.every(validFile) && new Set(data.files.map((file) => file.name)).size === data.files.length);
    state.files = payload.files;
    state.ready = true;
    ui['server-state'].textContent = state.files.length ? `${state.files.length} fichier(s) sur le serveur.` : 'Aucun fichier sur le serveur.';
    return true;
  } catch (error) {
    ui['server-state'].textContent = `Liste indisponible : ${error.message} Les entrées précédentes éventuelles ne sont plus à jour.`;
    return false;
  } finally { render(); }
}
async function refreshAction() {
  if (state.busy) return;
  state.busy = true;
  try {
    const ok = await refresh();
    message(ok ? 'Liste serveur actualisée.' : 'Impossible de vérifier les fichiers présents sur le serveur.', !ok);
  } finally { state.busy = false; render(); }
}

function addFiles(files) {
  if (state.busy || state.completed) return;
  for (const file of files) state.items.push({ file, status: 'pending', error: '' });
  render();
}

async function sendBatch() {
  if (ui['send-files'].disabled) return;
  // Snapshot the revisions whose replacement was actually announced at agreement.
  const approved = new Map(state.files.map((file) => [file.name, file.revision]));
  state.busy = true;
  ui['upload-progress'].hidden = false;
  ui['upload-progress'].max = state.items.length;
  ui['upload-progress'].value = 0;
  ui['upload-result'].textContent = 'Envoi du lot…';
  message('Envoi en cours. Le lot est figé.');
  render();
  try {
    for (const item of state.items) {
      item.status = 'sending';
      render();
      ui['upload-result'].textContent = `Envoi de ${item.file.name}…`;
      const body = new FormData();
      body.append('file', item.file);
      body.append('overwrite', String(approved.has(item.file.name)));
      if (approved.has(item.file.name)) body.append('expected_revision', approved.get(item.file.name));
      try {
        await request(endpoint(state.config, 'upload', state.test), { method: 'POST', body },
          (data) => validFile(data.file) && data.file.name === item.file.name && data.file.size === item.file.size, 120000);
        item.status = 'success';
      } catch (error) {
        item.status = 'failed';
        item.error = error.message + (error.uncertain ? ' Résultat incertain, aucune relance automatique.' : '');
      }
      ui['upload-progress'].value += 1;
      render();
    }
    state.completed = true;
    const successes = state.items.filter((item) => item.status === 'success').length;
    ui['upload-result'].textContent = `Lot terminé : ${successes} réussi(s), ${state.items.length - successes} échoué(s).`;
    const refreshed = await refresh();
    message(refreshed ? 'Lot terminé. Consultez le bilan de chaque fichier.' :
      'Lot terminé, mais la liste serveur n’a pas pu être actualisée.', !refreshed);
  } finally { state.busy = false; render(); }
}

async function deleteFile(file) {
  if (state.busy || !state.ready || !configured('delete')) return;
  if (!window.confirm(`Supprimer le fichier « ${file.name} » du serveur ?`)) return;
  state.busy = true;
  render();
  let confirmed = false;
  let errorMessage = '';
  try {
    await request(endpoint(state.config, 'delete', state.test), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, expected_revision: file.revision }),
    }, (data) => data.name === file.name);
    confirmed = true;
    state.files = state.files.filter((entry) => entry.name !== file.name);
  } catch (error) { errorMessage = error.message; }
  try {
    const refreshed = await refresh();
    message(confirmed ? `Suppression confirmée : ${file.name}.${refreshed ? '' : ' Actualisation de la liste indisponible.'}` :
      `Suppression non confirmée : ${errorMessage}`, !confirmed || !refreshed);
  } finally {
    state.busy = false;
    render();
    ui['refresh-files'].focus();
  }
}

ui['choose-files'].addEventListener('click', () => ui['file-picker'].click());
ui['file-picker'].addEventListener('change', () => { addFiles(ui['file-picker'].files); ui['file-picker'].value = ''; });
let dragDepth = 0;
for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) {
  ui['upload-drop'].addEventListener(type, (event) => {
    event.preventDefault();
    if (type === 'dragenter') dragDepth += 1;
    if (type === 'dragleave') dragDepth = Math.max(0, dragDepth - 1);
    if (type === 'drop') { dragDepth = 0; addFiles(event.dataTransfer.files); }
    ui['upload-drop'].classList.toggle('is-dragging', dragDepth > 0 && !state.busy && !state.completed);
  });
}
// Prevent files dropped outside the zone from navigating away from the batch.
for (const type of ['dragover', 'drop']) document.addEventListener(type, (event) => {
  if ([...event.dataTransfer.types].includes('Files')) event.preventDefault();
});
ui['refresh-files'].addEventListener('click', refreshAction);
ui['send-files'].addEventListener('click', sendBatch);
ui['new-batch'].addEventListener('click', () => {
  if (state.busy) return;
  state.items = [];
  state.completed = false;
  ui['upload-progress'].hidden = true;
  ui['upload-result'].textContent = '';
  render();
  ui['choose-files'].focus();
});
ui['retry-files'].addEventListener('click', async () => {
  if (state.busy) return;
  state.busy = true;
  try {
    if (!await refresh()) { message('Reprise impossible : vérifiez d’abord la liste serveur.', true); return; }
    state.items = state.items.filter((item) => item.status === 'failed')
      .map(({ file }) => ({ file, status: 'pending', error: '' }));
    state.completed = false;
    ui['upload-progress'].hidden = true;
    ui['upload-result'].textContent = '';
    message('Échecs préparés. Vérifiez les remplacements signalés puis donnez un nouvel accord.');
  } finally { state.busy = false; render(); }
});
ui['webhook-toggle'].addEventListener('click', async () => {
  if (state.busy) return;
  state.busy = true;
  state.test = !state.test;
  state.files = [];
  state.ready = false;
  // Results belong to the previous environment; do not silently retry them here.
  state.items = state.items.filter((item) => item.status === 'pending');
  state.completed = false;
  ui['upload-result'].textContent = '';
  ui['upload-progress'].hidden = true;
  try {
    const ok = await refresh();
    message(`${state.test ? 'Mode test' : 'Mode production'}.${ok ? '' : ' Liste serveur indisponible.'}`, !ok);
  } finally { state.busy = false; render(); }
});
window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });

async function initialize() {
  try {
    const response = await fetch(new URL('../../config.ini', import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Configuration indisponible.');
    state.config = parseConfig(await response.text());
    const ok = await refresh();
    const allConfigured = ['list', 'upload', 'delete'].every(configured);
    message(ok && allConfigured ? 'Mode production. Vous pouvez préparer votre dépôt.' :
      'Service non raccordé ou indisponible. Vous pouvez préparer votre sélection ; les opérations nécessitent la configuration n8n.', !(ok && allConfigured));
  } catch (error) {
    ui['server-state'].textContent = 'Liste serveur indisponible.';
    message(error.message || 'Configuration indisponible.', true);
  } finally { state.busy = false; render(); }
}
initialize();
