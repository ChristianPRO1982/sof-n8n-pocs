// Local-only browser checks. Usage: node upload-browser.mjs <Chrome browser websocket URL>
// Launch Chrome with --headless --remote-debugging-port=0 and a temporary profile.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(new URL('../../', import.meta.url).pathname);
const files = new Map([['existing.pdf', { name: 'existing.pdf', size: 3, revision: 'v1' }]]);
let pageStatus = 'development', statusError = false, statusReads = 0;
let listError = false, malformed = false, configured = true, active = 0, maxActive = 0;
let invalidDelete = false;
const uploads = [], deletions = [], calls = [], browserErrors = [];
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://local').pathname;
    if (path === '/km/statuses.json') {
      statusReads++;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.statusCode = statusError ? 503 : 200;
      res.end(JSON.stringify({'01_upload_raw_files': pageStatus}));
      return;
    }
    if (path === '/km/config.ini') {
      res.end(`KM_WEBHOOK_BASE_URL=http://127.0.0.1:${server.address().port}/webhook/\n` +
        ['LIST', 'UPLOAD', 'DELETE'].map((op) => `KM_FILES_${op}_WEBHOOK_PATH=${configured ? op.toLowerCase() : ''}`).join('\n'));
      return;
    }
    if (/^\/webhook(?:-test)?\//.test(path)) {
      calls.push(path);
      res.setHeader('Content-Type', 'application/json');
      const send = (value, code = 200) => { res.statusCode = code; res.end(JSON.stringify(value)); };
      if (path.endsWith('/list')) {
        if (listError) send({ ok: false, message: 'unavailable' }, 503);
        else send({ ok: true, files: [...files.values()] });
        return;
      }
      const parts = [];
      for await (const chunk of req) parts.push(chunk);
      const body = Buffer.concat(parts).toString();
      if (path.endsWith('/delete')) {
        const data = JSON.parse(body);
        deletions.push({ method: req.method, contentType: req.headers['content-type'], data });
        if (invalidDelete) { send({ ok: true, name: 'wrong-name.pdf' }); return; }
        if (files.get(data.name)?.revision !== data.expected_revision) send({ ok: false, message: 'changed' }, 409);
        else { files.delete(data.name); send({ ok: true, name: data.name }); }
        return;
      }
      active++;
      maxActive = Math.max(active, maxActive);
      const name = /filename="([^"]+)"/.exec(body)?.[1];
      uploads.push({ name, body, path });
      await new Promise((done) => setTimeout(done, 70));
      active--;
      if (name === 'fail.pdf') { send({ ok: false, message: 'too large' }, 413); return; }
      if (name === 'conflict.pdf') { send({ ok: false, message: 'new collision' }, 409); return; }
      if (malformed) { res.end('Workflow started'); return; }
      const file = { name, size: 3, revision: 'v2' };
      files.set(name, file);
      // Upload confirmations only require the name; list entries retain size and revision.
      const confirmation = { name };
      if (name === 'existing.pdf') confirmation.size = 999;
      else if (name !== 'README') confirmation.size = '4.95 kB';
      send({ ok: true, file: confirmation });
      return;
    }
    let filename = resolve(root, `.${path}`);
    if (!filename.startsWith(`${root}/`)) { res.writeHead(404).end(); return; }
    const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' };
    res.setHeader('Content-Type', types[extname(filename)] || 'application/octet-stream');
    res.end(await readFile(filename));
  } catch { res.writeHead(404).end(); }
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
const add = (names, drop = false) => evaluate(`(() => {
 const data = new DataTransfer();
 for (const name of ${JSON.stringify(names)}) data.items.add(new File(['abc'], name));
 ${drop ? `document.getElementById('upload-drop').dispatchEvent(new DragEvent('drop', {dataTransfer:data, bubbles:true, cancelable:true}));` :
 `const picker = document.getElementById('file-picker'); picker.files = data.files; picker.dispatchEvent(new Event('change'));`}
})()`);
const text = (id) => evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`);
try {
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Network.enable');
  await call('Network.setBlockedURLs', { urls: ['http://15.236.66.128/*'] });
  await call('Network.setBlockedURLs', { urls: ['http://15.236.66.128/*', 'https://*'] });
  await call('Page.addScriptToEvaluateOnNewDocument', {source: `
    const originalInterval = window.setInterval;
    window.setInterval = (fn, delay, ...args) => {
      if (delay === 30000) window.kmStatusRefreshInterval = delay;
      return originalInterval(fn, delay === 30000 ? 100 : delay, ...args);
    };
  `});
  await call('Page.navigate', { url: `${origin}/km/pages/01_upload_raw_files.html` });
  await wait(`document.getElementById('webhook-list-toggle') && !document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(await evaluate(`document.getElementById('webhook-list-toggle').getAttribute('aria-checked')`), 'false');
  assert.match(await text('server-files'), /existing.pdf/);
  await wait(`document.querySelector('.km-logo').complete && document.querySelector('.km-logo').naturalWidth > 0`);
  const badgeSelector = '[data-km-status-page="01_upload_raw_files"]';
  await wait(`document.querySelector(${JSON.stringify(badgeSelector)}).dataset.kmStatus === 'development'`);
  assert.equal(await evaluate('window.kmStatusRefreshInterval'), 30000);
  pageStatus = 'validated';
  await wait(`[...document.querySelectorAll(${JSON.stringify(badgeSelector)})].every(n => n.dataset.kmStatus === 'validated')`);
  assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(badgeSelector)}).length`), 2);
  assert.match(await evaluate(`document.querySelector(${JSON.stringify(badgeSelector)}).getAttribute('aria-label')`), /Validé/);
  statusError = true;
  const oldReads = statusReads;
  await wait(`true`);
  for(let i=0;i<50 && statusReads<=oldReads;i++) await new Promise(done=>setTimeout(done,20));
  assert.ok(statusReads > oldReads);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(badgeSelector)}).dataset.kmStatus`), 'validated');
  statusError = false;
  pageStatus = 'unknown';
  await wait(`document.querySelector(${JSON.stringify(badgeSelector)}).dataset.kmStatus === 'not_started'`);
  pageStatus = 'testing';
  await evaluate(`document.dispatchEvent(new Event('visibilitychange'))`);
  await wait(`document.querySelector(${JSON.stringify(badgeSelector)}).dataset.kmStatus === 'testing'`);
  assert.equal(await evaluate(`document.querySelector('[data-km-status-page="home"]')`), null);
  await add(['existing.pdf', 'fail.pdf', 'conflict.pdf', 'next.DOCX', 'README']);
  assert.match(await text('selected-files'), /sera écrasé/);
  await add(['existing.pdf'], true);
  assert.equal(await evaluate(`document.getElementById('send-files').disabled`), true);
  await evaluate(`document.querySelector('#selected-files li:last-child button').click()`);
  assert.equal(await evaluate(`document.getElementById('send-files').disabled`), false);
  await click('send-files');
  await wait(`document.getElementById('upload-result').textContent.startsWith('Lot terminé') && !document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(maxActive, 1);
  assert.deepEqual(uploads.map((u) => u.name), ['existing.pdf', 'fail.pdf', 'conflict.pdf', 'next.DOCX', 'README']);
  assert.match(uploads[0].body, /name="overwrite"\r\n\r\ntrue/);
  assert.match(uploads[0].body, /name="expected_revision"\r\n\r\nv1/);
  assert.match(uploads[3].body, /name="overwrite"\r\n\r\nfalse/);
  assert.match(await text('upload-result'), /3 réussi\(s\), 2 échoué/);
  await click('retry-files');
  await wait(`!document.getElementById('send-files').disabled`);
  assert.equal(uploads.length, 5, 'retry must wait for agreement');
  assert.equal(await evaluate(`document.querySelectorAll('#selected-files li').length`), 2);
  await click('send-files');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  await click('new-batch');
  malformed = true;
  await add(['unknown.pdf']);
  await click('send-files');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.match(await text('selected-files'), /incertain/);
  malformed = false;
  await evaluate('window.confirm = () => false');
  const beforeDelete = calls.filter((p) => p.endsWith('/delete')).length;
  await evaluate(`document.querySelector('#server-files button').click()`);
  assert.equal(calls.filter((p) => p.endsWith('/delete')).length, beforeDelete);
  await evaluate('window.confirm = () => true');
  // A changed revision must be refused without removal.
  files.get('existing.pdf').revision = 'v3';
  await evaluate(`document.querySelector('#server-files button').click()`);
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.match(await text('upload-notice'), /non confirmée/);
  assert.match(await text('server-files'), /existing.pdf/);
  assert.deepEqual(deletions.at(-1), {
    method: 'POST', contentType: 'application/json',
    data: { name: 'existing.pdf', expected_revision: 'v2' },
  });
  invalidDelete = true;
  await evaluate(`document.querySelector('#server-files button').click()`);
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.match(await text('upload-notice'), /non confirmée pour existing\.pdf.*Résultat incertain/);
  assert.match(await text('server-files'), /existing.pdf/);
  invalidDelete = false;
  await evaluate(`document.querySelector('#server-files button').click()`);
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.match(await text('upload-notice'), /Suppression confirmée/);
  assert.deepEqual(deletions.at(-1).data, { name: 'existing.pdf', expected_revision: 'v3' });
  assert.doesNotMatch(await text('server-files'), /existing.pdf/);
  await click('webhook-list-toggle');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(calls.at(-1), '/webhook-test/list');
  assert.equal(await evaluate(`document.getElementById('webhook-upload-toggle').getAttribute('aria-checked')`), 'false');
  const beforeUploadToggle = calls.length;
  await click('webhook-upload-toggle');
  assert.equal(calls.length, beforeUploadToggle, 'Upload toggle must not refresh the list');
  assert.equal(await evaluate(`document.getElementById('webhook-list-toggle').getAttribute('aria-checked')`), 'true');
  // Upload test must also work while list uses production.
  await click('webhook-list-toggle');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(calls.at(-1), '/webhook/list');
  await add(['test.pdf']);
  await click('send-files');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(uploads.at(-1).path, '/webhook-test/upload');
  assert.equal(calls.at(-1), '/webhook/list');
  await click('webhook-list-toggle');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  await evaluate(`document.querySelector('#server-files button').click()`);
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(calls.filter((p) => p.endsWith('/delete')).at(-1), '/webhook/delete');
  assert.equal(calls.at(-1), '/webhook-test/list');
  await click('webhook-list-toggle');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  const beforeDeleteToggle = calls.length;
  await click('webhook-delete-toggle');
  assert.equal(calls.length, beforeDeleteToggle, 'Delete toggle must not refresh the list');
  assert.equal(await evaluate(`document.getElementById('webhook-list-toggle').getAttribute('aria-checked')`), 'false');
  assert.equal(await evaluate(`document.getElementById('webhook-upload-toggle').getAttribute('aria-checked')`), 'true');
  assert.equal(await evaluate(`document.getElementById('webhook-delete-toggle').getAttribute('aria-checked')`), 'true');
  await evaluate(`document.querySelector('#server-files button').click()`);
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(calls.filter((p) => p.endsWith('/delete')).at(-1), '/webhook-test/delete');
  assert.equal(calls.at(-1), '/webhook/list');

  await click('new-batch');
  await add(['photo.PNG', 'other.zip']);
  assert.match(await evaluate(`document.querySelector('#selected-files img').src`), /image.png$/);
  await evaluate(`document.querySelector('#selected-files img').dispatchEvent(new Event('error'))`);
  assert.match(await evaluate(`document.querySelector('#selected-files img').src`), /file.png$/);
  await evaluate(`document.querySelector('#selected-files img').dispatchEvent(new Event('error'))`);
  assert.equal(await evaluate(`document.querySelector('#selected-files img').hidden`), true);
  for (const width of [1920, 1366, 1100, 768, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: false });
    await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
    const layout = await evaluate(`(() => {
      const [a,b] = [...document.querySelectorAll('.km-upload-panel')].map(n => n.getBoundingClientRect());
      return { sameRow: Math.abs(a.top-b.top)<1, overflow: document.documentElement.scrollWidth > innerWidth,
        contentOverflow: document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth };
    })()`);
    assert.equal(layout.sameRow, width >= 768, `panel order at ${width}`);
    assert.equal(layout.overflow || layout.contentOverflow, false, `overflow at ${width}: ${JSON.stringify(layout)} ${await evaluate('JSON.stringify({inner:innerWidth,doc:document.documentElement.scrollWidth,main:document.querySelector("main").scrollWidth,client:document.querySelector("main").clientWidth})')}`);
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(`/tmp/km-upload-${width}.png`, Buffer.from(shot.data, 'base64'));
  }
  await evaluate(`document.getElementById('choose-files').focus()`);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.match(await evaluate(`document.activeElement.getAttribute('aria-label') || document.activeElement.textContent`), /Retirer/);
  listError = true;
  await click('refresh-files');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(await evaluate(`document.getElementById('send-files').disabled`), true);
  assert.match(await text('server-state'), /indisponible/);
  listError = false;
  files.clear();
  await click('refresh-files');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.match(await text('server-state'), /Aucun fichier/);
  const readsBeforeRestore = calls.filter(p => p.endsWith('/list')).length;
  await evaluate(`setTimeout(() => window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted:true})), 0)`);
  for (let i=0; i<100 && calls.filter(p => p.endsWith('/list')).length === readsBeforeRestore; i++) {
    await new Promise(done => setTimeout(done, 30));
  }
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(calls.at(-1), '/webhook/list');
  for (const operation of ['list', 'upload', 'delete']) {
    assert.equal(await evaluate(`document.getElementById('webhook-${operation}-toggle').getAttribute('aria-checked')`), 'false');
  }
  configured = false;
  await call('Page.reload');
  await wait(`!document.getElementById('webhook-list-toggle').disabled`);
  assert.equal(await evaluate(`document.getElementById('webhook-list-toggle').getAttribute('aria-checked')`), 'false');
  await add(['local.txt']);
  assert.match(await text('selected-files'), /local.txt/);
  assert.equal(await evaluate(`document.getElementById('send-files').disabled`), true);
  assert.equal(await evaluate(`document.getElementById('refresh-files').disabled`), true);
  assert.equal(browserErrors.length, 0, JSON.stringify(browserErrors));
  console.log('Browser checks passed: sequential uploads, overwrite revisions, conflicts, retry, uncertain response, delete, toggle, icons, keyboard, configuration and five screen widths.');
} finally {
  await cdp('Target.closeTarget', { targetId });
  socket.close();
  server.closeAllConnections();
  await new Promise((done) => server.close(done));
}
