// Local mocked checks. Usage: node processed-legacy-browser.mjs <Chrome browser websocket URL>
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const pageId = '00c_processed_legacy_files';
const operations = ['list', 'view', 'replay', 'delete'];
const prefix = 'KM_PROCESSED_LEGACY_FILES';
const webhookPath = (op, test = false) => `/webhook${test ? '-test' : ''}/processed-legacy/${op}`;
const root = resolve(new URL('../../', import.meta.url).pathname);
const name = 'Dossier été & frais + #1.PDF';
const files = new Map([[name, { name, size: 12345, revision: 'v1' }]]);
let listMode = 'ok', configError = false, hold = false, release;
const missing = new Set();
const modes = { replay: 'ok', delete: 'ok' };
const calls = [], actions = [], browserErrors = [];
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://local').pathname;
    if (path === '/km/statuses.json') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ [pageId]: 'development' }));
      return;
    }
    if (path === '/km/config.ini') {
      if (configError) { res.writeHead(503).end(); return; }
      res.end(`KM_VERSION=0.5.1\nKM_WEBHOOK_BASE_URL=http://127.0.0.1:${server.address().port}/webhook/\n` +
        ['KM_FILES', 'KM_TEMPLATES', 'KM_LEGACY_FILES', prefix].flatMap((key) =>
          (key === prefix ? operations : ['list', 'upload', 'view', 'delete']).map((op) =>
            `${key}_${op.toUpperCase()}_WEBHOOK_PATH=${key === prefix ? (missing.has(op) ? '' : `processed-legacy/${op}`) : `other/${key}/${op}`}`)).join('\n'));
      return;
    }
    if (/^\/webhook(?:-test)?\//.test(path)) {
      calls.push(path);
      res.setHeader('Content-Type', 'application/json');
      const send = (value, code = 200) => { res.statusCode = code; res.end(JSON.stringify(value)); };
      if (path.endsWith('/list')) {
        if (listMode === 'timeout') return;
        if (listMode === 'error') send({ ok: false, message: 'Liste indisponible' }, 503);
        else if (listMode === 'duplicate') send({ ok: true, files: [files.get(name), files.get(name)] });
        else if (listMode === 'invalid') send({ ok: true, files: [{ name, size: -1, revision: '' }] });
        else send({ ok: true, files: listMode === 'empty' ? [] : [...files.values()] });
        return;
      }
      const op = path.endsWith('/replay') ? 'replay' : 'delete';
      const parts = [];
      for await (const chunk of req) parts.push(chunk);
      const data = JSON.parse(Buffer.concat(parts).toString());
      actions.push({ op, path, method: req.method, contentType: req.headers['content-type'], data });
      if (hold) await new Promise((done) => { release = done; });
      const mode = modes[op];
      if (mode === 'timeout') return;
      if (mode === 'conflict' || files.get(data.name)?.revision !== data.expected_revision) {
        send({ ok: false, code: 'conflict', message: 'Révision modifiée' }, 409);
      } else if (mode === 'invalidName') send({ ok: true, name: 'autre.pdf' });
      else if (mode === 'notOk') send({ ok: false, message: 'Action refusée' });
      else if (mode === 'malformed') res.end('Workflow launched');
      else if (mode === 'serverError') send({ ok: false, message: 'Erreur serveur' }, 500);
      else {
        if (op === 'delete') files.delete(data.name);
        send({ ok: true, name: data.name });
      }
      return;
    }
    const filename = resolve(root, `.${path}`);
    if (!filename.startsWith(`${root}/`)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' }[extname(filename)] || 'application/octet-stream');
    res.end(await readFile(filename));
  } catch { if (!res.headersSent) res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const socket = new WebSocket(process.argv[2]);
await new Promise((done, reject) => { socket.onopen = done; socket.onerror = reject; });
let id = 0;
const pending = new Map();
socket.onmessage = async ({ data }) => {
  const event = JSON.parse(data);
  if (event.id) {
    const entry = pending.get(event.id);
    pending.delete(event.id);
    if (event.error) entry.reject(new Error(JSON.stringify(event.error)));
    else entry.resolve(event.result);
  }
  if (event.method === 'Network.requestWillBeSent' && /^https?:/.test(event.params.request.url) &&
      !event.params.request.url.startsWith(origin + '/')) browserErrors.push(event.params.request.url);
  if (event.method === 'Runtime.exceptionThrown') browserErrors.push(event.params.exceptionDetails);

};
function cdp(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    pending.set(key, { resolve, reject });
    socket.send(JSON.stringify({ id: key, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
const call = (method, params) => cdp(method, params, sessionId);
const evaluate = async (expression) => {
  const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
async function wait(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await new Promise((done) => setTimeout(done, 30));
  }
  throw new Error(`Timed out: ${expression}`);
}
const click = (id) => evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
const text = (id) => evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
const rowAction = (label) => `document.querySelector('#server-files button[aria-label=${JSON.stringify(`${label} ${name}`)}]')`;
const action = (label) => evaluate(`${rowAction(label)}.click()`);
const ready = () => wait(`document.getElementById('webhook-list-toggle') && !document.getElementById('webhook-list-toggle').disabled`);
async function until(check) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await new Promise(done => setTimeout(done, 30));
  }
  throw new Error('Timed out waiting for mock server');
}
async function refreshList() { await click('refresh-files'); await ready(); }
async function reload() {
  await evaluate('window.kmTestReady = false');
  await call('Page.reload');
  await wait(`document.readyState === 'complete' && !!window.kmTestReady`);
  await ready();
}
try {
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Network.enable');
  await call('Network.setBlockedURLs', { urls: ['http://15.236.66.128/*', 'https://*'] });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.kmViews = [];
    window.open = (...args) => window.kmViews.push(args);
    window.kmConfirms = [];
    window.kmAgree = true;
    window.confirm = message => { window.kmConfirms.push(message); return window.kmAgree; };
    const originalTimeout = window.setTimeout;
    window.kmTimeouts = [];
    window.setTimeout = (fn, delay, ...args) => {
      if (delay === 30000) window.kmTimeouts.push(delay);
      return originalTimeout(fn, delay === 30000 ? 250 : delay, ...args);
    };
    window.addEventListener('load', () => { window.kmTestReady = true; });
  ` });
  await call('Page.navigate', { url: `${origin}/km/pages/${pageId}.html` });
  await wait(`window.kmTestReady === true`);
  await ready();
  assert.match(await text('server-files'), /Dossier été & frais/);
  assert.equal(await evaluate(`document.querySelectorAll('.km-upload-panel').length`), 1);
  assert.equal(await evaluate(`document.querySelectorAll('input[type=file], #send-files, #upload-drop').length`), 0);
  assert.equal(await evaluate(`document.querySelector('[data-km-status-page="${pageId}"]').dataset.kmStatus`), 'development');
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('#server-files button'), b => b.textContent)`), ['Voir', 'Rejouer', 'Supprimer']);
  const initial = calls.length;
  for (const op of operations) assert.equal(await evaluate(`document.getElementById('webhook-${op}-toggle').getAttribute('aria-checked')`), 'false');
  for (const test of [false, true]) {
    if (test) await click('webhook-view-toggle');
    await action('Voir');
    const [href, target, features] = await evaluate('window.kmViews.at(-1)');
    const url = new URL(href);
    assert.equal(url.pathname, webhookPath('view', test));
    assert.equal(url.searchParams.get('name'), name);
    assert.equal(target, '_blank');
    assert.equal(features, 'noopener,noreferrer');
    assert.ok(!href.includes(' '));
  }
  await click('webhook-view-toggle');
  for (const op of ['replay', 'delete']) {
    await click(`webhook-${op}-toggle`);
    await click(`webhook-${op}-toggle`);
  }
  assert.equal(calls.length, initial, 'Non-list switches and intercepted views make no network calls');

  // Cancellation must neither post nor refresh, and confirmations must identify the source.
  await evaluate('window.kmAgree = false');
  for (const label of ['Rejouer', 'Supprimer']) await action(label);
  assert.equal(actions.length, 0);
  assert.equal(calls.length, initial);
  assert.ok((await evaluate('window.kmConfirms')).every(message => message.includes(name)));
  await evaluate('window.kmAgree = true');

  // Hold a replay acknowledgement to test concurrency and the pending feedback.
  hold = true;
  const beforeReplay = actions.length;
  await evaluate(`window.kmReplayButton = ${rowAction('Rejouer')}; window.kmReplayButton.click(); window.kmReplayButton.click()`);
  await until(() => actions.length === beforeReplay + 1 && !!release);
  assert.match(await text('upload-notice'), /Demande de rejeu en cours/);
  assert.ok((await text('upload-notice')).includes(name));
  assert.equal(await evaluate(`Array.from(document.querySelectorAll('#server-files button, #refresh-files, .km-webhook-toggle')).every(b => b.disabled)`), true);
  assert.deepEqual(actions.at(-1), { op: 'replay', path: webhookPath('replay'), method: 'POST', contentType: 'application/json', data: { name, expected_revision: 'v1' } });
  hold = false;
  release();
  await ready();
  assert.equal(actions.length, beforeReplay + 1);
  assert.match(await text('upload-notice'), /Demande de rejeu prise en compte/);
  assert.match(await text('upload-notice'), /réussite du traitement n’est pas encore confirmée/);
  assert.ok((await text('server-files')).includes(name));
  assert.equal(calls.at(-1), webhookPath('list'));
  assert.equal(await evaluate(`document.activeElement.id`), 'refresh-files');

  // A replay acknowledgement alone must keep the entry even when the following GET fails.
  listMode = 'error';
  await action('Rejouer');
  await ready();
  assert.ok((await text('server-files')).includes(name));
  assert.match(await text('upload-notice'), /prise en compte.*Actualisation de la liste indisponible/);
  listMode = 'ok';
  await refreshList();

  // Exercise independent replay/delete modes and the list's own refresh mode.
  await click('webhook-replay-toggle');
  await action('Rejouer');
  await ready();
  assert.equal(actions.at(-1).path, webhookPath('replay', true));
  assert.equal(calls.at(-1), webhookPath('list'));
  await click('webhook-list-toggle');
  await ready();
  assert.equal(calls.at(-1), webhookPath('list', true));
  await click('webhook-replay-toggle');
  await action('Rejouer');
  await ready();
  assert.equal(actions.at(-1).path, webhookPath('replay'));
  assert.equal(calls.at(-1), webhookPath('list', true));

  for (const op of ['replay', 'delete']) {
    const label = op === 'replay' ? 'Rejouer' : 'Supprimer';
    for (const mode of ['conflict', 'invalidName', 'notOk', 'malformed', 'serverError', 'timeout']) {
      modes[op] = mode;
      const before = actions.length;
      await action(label);
      await ready();
      assert.equal(actions.length, before + 1, `No automatic ${op} retry on ${mode}`);
      assert.ok((await text('upload-notice')).includes(name));
      assert.match(await text('upload-notice'), /non confirmée/);
      if (mode === 'conflict') assert.match(await text('upload-notice'), /Conflit/);
      if (['invalidName', 'malformed', 'serverError', 'timeout'].includes(mode)) assert.match(await text('upload-notice'), /Résultat incertain/);
      if (mode === 'timeout') assert.match(await text('upload-notice'), /Délai dépassé/);
      assert.ok((await text('server-files')).includes(name));
    }
    modes[op] = 'ok';
  }
  assert.ok((await evaluate('window.kmTimeouts')).every(ms => ms === 30000));

  for (const mode of ['error', 'duplicate', 'invalid', 'timeout']) {
    listMode = mode;
    await refreshList();
    assert.match(await text('server-state'), /Liste indisponible/);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('#server-files button')).every(b => b.disabled)`), true);
    assert.ok((await text('server-files')).includes(name));
  }
  listMode = 'empty';
  await refreshList();
  assert.match(await text('server-state'), /Aucun fichier/);
  assert.equal(await evaluate(`document.querySelectorAll('#server-files li').length`), 0);
  listMode = 'ok';
  await refreshList();

  // Verify local icons and a readable row with three actions at each supported width.
  assert.match(await evaluate(`document.querySelector('#server-files img').src`), /pdf.png$/);
  await evaluate(`document.querySelector('#server-files img').dispatchEvent(new Event('error'))`);
  assert.match(await evaluate(`document.querySelector('#server-files img').src`), /file.png$/);
  await evaluate(`document.querySelector('#server-files img').dispatchEvent(new Event('error'))`);
  assert.equal(await evaluate(`document.querySelector('#server-files img').hidden`), true);
  await refreshList();
  for (const width of [1920, 1366, 1100, 768, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: false });
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth || document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth`), false, `Overflow at ${width}`);
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(`/tmp/km-processed-legacy-${width}.png`, Buffer.from(shot.data, 'base64'));
  }
  await evaluate(`document.getElementById('refresh-files').focus()`);
  for (const label of ['Voir', 'Rejouer', 'Supprimer']) {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    assert.equal(await evaluate('document.activeElement.textContent'), label);
  }

  // A confirmed deletion removes the source; its refresh follows list mode, not delete mode.
  await click('webhook-delete-toggle');
  await action('Supprimer');
  await ready();
  assert.equal(actions.at(-1).path, webhookPath('delete', true));
  assert.equal(calls.at(-1), webhookPath('list', true));
  assert.equal(files.size, 0);
  assert.match(await text('upload-notice'), /Suppression confirmée/);
  assert.equal(await evaluate(`document.querySelectorAll('#server-files li').length`), 0);
  files.set(name, { name, size: 12345, revision: 'v2' });
  await refreshList();
  await click('webhook-delete-toggle');
  modes.delete = 'conflict';
  await action('Supprimer');
  await ready();
  assert.equal(actions.at(-1).path, webhookPath('delete'));
  assert.equal(actions.at(-1).data.expected_revision, 'v2');
  assert.equal(calls.at(-1), webhookPath('list', true));
  modes.delete = 'ok';

  const beforeRestore = calls.length;
  await evaluate(`setTimeout(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted:true})), 0)`);
  await until(() => calls.length > beforeRestore);
  await ready();
  for (const op of operations) assert.equal(await evaluate(`document.getElementById('webhook-${op}-toggle').getAttribute('aria-checked')`), 'false');
  assert.equal(calls.at(-1), webhookPath('list'));

  // Each key independently controls its action; other stores remain fully configured.
  for (const [op, label] of [['view', 'Voir'], ['replay', 'Rejouer'], ['delete', 'Supprimer']]) {
    missing.add(op);
    await reload();
    assert.equal(await evaluate(`${rowAction(label)}.disabled`), true);
    for (const other of ['Voir', 'Rejouer', 'Supprimer'].filter(item => item !== label)) assert.equal(await evaluate(`${rowAction(other)}.disabled`), false);
    missing.clear();
  }
  for (const op of operations) missing.add(op);
  const beforeMissing = calls.length;
  await reload();
  assert.equal(calls.length, beforeMissing, 'Missing keys must not fall back to another store');
  assert.equal(await evaluate(`document.getElementById('refresh-files').disabled`), true);
  assert.match(await text('upload-notice'), /non raccordé/);
  missing.clear();
  configError = true;
  await reload();
  assert.equal(calls.length, beforeMissing);
  assert.match(await text('upload-notice'), /Configuration indisponible/);
  assert.ok(calls.every(path => operations.some(op => path === webhookPath(op) || path === webhookPath(op, true))), 'Only this screen’s endpoints may be used');
  assert.equal(browserErrors.length, 0, JSON.stringify(browserErrors));
  console.log('Processed legacy browser checks passed: list validation, view encoding, replay/delete confirmations and failures, timeout, concurrency, isolated modes, configuration, history, icons, keyboard and five widths.');
} finally {
  if (release) release();
  await cdp('Target.closeTarget', { targetId });
  socket.close();
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}
