import { parseConfig, endpoint, request, validFile } from './km-upload-api.js';
import { parseReport } from './km-format-report.js';

const operations = ['list', 'view', 'delete'];
const state = { config: {}, test: { list: false, view: false, delete: false }, busy: true, ready: false, files: [], selected: null };
const ui = id => document.getElementById(id);
const urlFor = op => endpoint(state.config, op, state.test[op], 'KM_FORMAT_CONTROLS');
const configured = op => { try { urlFor(op); return true; } catch { return false; } };
const unwrap = data => Array.isArray(data) && data.length === 1 ? data[0] : data;
function el(tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  element.className = className;
  return element;
}
function notice(text, error = false) {
  ui('report-notice').textContent = text;
  ui('report-notice').classList.toggle('is-error', error);
}
const rows = new Map();
function clearDetail() {
  ui('report-detail')?.remove();
  state.selected = null;
}
function render() {
  ui('refresh-reports').disabled = state.busy || !configured('list');
  for (const op of operations) {
    ui(`webhook-${op}-toggle`).disabled = state.busy;
    ui(`webhook-${op}-toggle`).setAttribute('aria-checked', String(state.test[op]));
    ui(`webhook-${op}-toggle-image`).src = new URL(`icons/toggle_blue_${state.test[op] ? 'on' : 'off'}.png`, import.meta.url).href;
  }
  for (const [name, row] of rows) {
    if (!state.files.some(file => file.name === name)) { row.remove(); rows.delete(name); }
  }
  for (const [index, file] of state.files.entries()) {
    let row = rows.get(file.name);
    if (!row) {
      row = el('li', '', 'km-upload-row km-report-row');
      const info = el('div', '', 'km-upload-file-info');
      info.append(el('strong', file.name, 'km-upload-name'), el('span', '', 'km-upload-meta'));
      const button = el('button', 'Voir', 'km-upload-button km-report-view');
      button.type = 'button';
      const remove = el('button', 'Supprimer', 'km-upload-button km-upload-danger');
      remove.type = 'button';
      row.append(info, button, remove);
      rows.set(file.name, row);
      ui('reports-list').append(row);
    }
    const selected = state.selected === file.name;
    row.classList.toggle('is-selected', selected);
    row.querySelector('.km-upload-meta').textContent = `${file.size} octet(s)`;
    const button = row.querySelector(':scope > button');
    button.textContent = selected ? 'Fermer' : 'Voir';
    button.setAttribute('aria-label', `${selected ? 'Fermer' : 'Voir'} ${file.name}`);
    button.setAttribute('aria-expanded', String(selected));
    const detailId = `report-detail-${index}`;
    button.setAttribute('aria-controls', detailId);
    button.disabled = state.busy || !state.ready || !configured('view');
    button.onclick = () => {
      if (state.busy) return;
      if (state.selected === file.name) {
        clearDetail();
        render();
        notice(`Rapport fermé : ${file.name}.`);
        button.focus();
      } else view(file);
    };
    const remove = row.querySelector(':scope > .km-upload-danger');
    remove.disabled = state.busy || !state.ready || !configured('delete');
    remove.setAttribute('aria-label', `Supprimer ${file.name}`);
    remove.onclick = () => deleteReport(file);
    if (selected) {
      const detail = ui('report-detail');
      if (detail) {
        // The wrapper is the accessible disclosure target; internal IDs remain unique.
        let wrapper = row.querySelector('.km-report-disclosure');
        if (!wrapper) { wrapper = el('div', '', 'km-report-disclosure'); row.append(wrapper); }
        wrapper.id = detailId;
        if (detail.parentElement !== wrapper) wrapper.append(detail);
      }
    } else row.querySelector('.km-report-disclosure')?.remove();
  }
}
async function refresh() {
  state.ready = false;
  clearDetail();
  ui('reports-state').textContent = 'Chargement des rapports…';
  try {
    const data = await request(urlFor('list'), {}, data => Array.isArray(data.files) &&
      data.files.every(validFile) && new Set(data.files.map(file => file.name)).size === data.files.length,
    30000, unwrap);
    state.files = data.files;
    state.ready = true;
    ui('reports-state').textContent = state.files.length ? `${state.files.length} rapport(s) disponible(s).` : 'Aucun rapport disponible.';
    notice(configured('view') ? 'Liste des rapports actualisée.' : 'Liste disponible. Configurez le webhook de consultation pour ouvrir un rapport.');
    return true;
  } catch (error) {
    state.files = [];
    ui('reports-state').textContent = 'Liste des rapports indisponible.';
    notice(error.message, true);
    return false;
  }
}
async function view(file) {
  if (state.busy || !state.ready || !configured('view')) return;
  state.busy = true;
  clearDetail();
  state.selected = file.name;
  const fragment = ui('report-detail-template').content.cloneNode(true);
  rows.get(file.name).append(fragment);
  ui('report-detail').setAttribute('aria-busy', 'true');
  ui('report-heading').textContent = `Chargement du rapport : ${file.name}…`;
  render();
  notice(`Chargement du rapport : ${file.name}…`);
  try {
    const url = new URL(urlFor('view'));
    url.searchParams.set('name', file.name);
    // This endpoint returns the file JSON verbatim, without an ok envelope.
    const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Lecture impossible (HTTP ${response.status}).`);
    const payload = await response.json();
    const report = parseReport(payload);
    const q = report.quality;
    ui('report-heading').textContent = file.name;
    for (const [label, value] of [['Structure', `${q.structure_score} %`], ['Complétude', `${q.completeness_score} %`],
      ['Sections attendues', q.sections_expected], ['Champs présents', `${q.fields_present} / ${q.fields_expected}`],
      ['Champs renseignés', `${q.fields_filled} / ${q.fields_expected}`]]) {
      const card = el('p', label);
      card.append(el('strong', String(value)));
      ui('report-summary').append(card);
    }
    for (const [label, values] of [['Sections manquantes', q.sections_missing], ['Champs manquants', q.fields_missing], ['Champs non renseignés', q.fields_unfilled]]) {
      ui('report-findings').append(el('h4', label));
      const list = el('ul', '');
      for (const value of values) list.append(el('li', value));
      ui('report-findings').append(values.length ? list : el('p', 'Aucun.'));
    }
    ui('report-document').textContent = report.doc.text;
    ui('report-template').textContent = report.template.text;
    ui('report-json').textContent = JSON.stringify(payload, null, 2);
    ui('report-detail').hidden = false;
    notice(`Rapport chargé : ${file.name}.`);

  } catch (error) {
    const message = `Rapport indisponible : ${file.name}. ${error.message} Aucune relance automatique.`;
    const detail = ui('report-detail');
    const heading = el('h3', file.name);
    heading.id = 'report-heading';
    heading.tabIndex = -1;
    const retry = el('button', 'Réessayer', 'km-upload-button');
    retry.type = 'button';
    retry.onclick = () => view(file);
    detail.replaceChildren(heading, el('p', message, 'km-upload-message is-error'), retry);
    notice(message, true);
  } finally {
    ui('report-detail')?.setAttribute('aria-busy', 'false');
    state.busy = false;
    render();
    ui('report-heading')?.focus();
  }
}
async function deleteReport(file) {
  if (state.busy || !state.ready || !configured('delete')) return;
  if (!window.confirm(`Supprimer le rapport « ${file.name} » du serveur ?`)) return;
  state.busy = true;
  notice(`Suppression en cours : ${file.name}…`);
  render();
  let confirmed = false;
  let failure = '';
  try {
    await request(urlFor('delete'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, expected_revision: file.revision }),
    }, data => data.name === file.name, 30000, unwrap);
    confirmed = true;
    if (state.selected === file.name) clearDetail();
    state.files = state.files.filter(entry => entry.name !== file.name);
  } catch (error) {
    failure = error.message + (error.uncertain ? ' Résultat incertain, aucune relance automatique.' : '');
  }
  try {
    const refreshed = await refresh();
    notice((confirmed ? `Suppression confirmée : ${file.name}.` :
      `Suppression non confirmée pour ${file.name} : ${failure}`) +
      (refreshed ? '' : ' Actualisation de la liste indisponible.'), !confirmed || !refreshed);
  } finally {
    state.busy = false;
    render();
    ui('refresh-reports').focus();
  }
}
async function loadList() {
  clearDetail();
  state.busy = true;
  render();
  try { await refresh(); } finally { state.busy = false; render(); }
}
ui('refresh-reports').addEventListener('click', () => { if (!state.busy) loadList(); });
for (const op of operations) ui(`webhook-${op}-toggle`).addEventListener('click', () => {
  if (state.busy) return;
  state.test[op] = !state.test[op];
  if (op === 'list') loadList();
  else { if (op === 'view') clearDetail(); render(); notice(`WH - ${op} : ${state.test[op] ? 'test' : 'production'}.`); }
});
window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
async function initialize() {
  try {
    const response = await fetch(new URL('../config.ini', import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Configuration indisponible.');
    state.config = parseConfig(await response.text());
    await refresh();
  } catch (error) { ui('reports-state').textContent = 'Liste des rapports indisponible.'; notice(error.message, true); }
  finally { state.busy = false; render(); }
}
initialize();
