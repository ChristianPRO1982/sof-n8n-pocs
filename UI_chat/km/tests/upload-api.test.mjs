import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
// Import the browser module without introducing a package.json in this static site.
const source = await readFile(new URL('../assets/km-upload-api.js', import.meta.url), 'utf8');
const { endpoint, iconName, request, parseConfig } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const config = parseConfig('# comment\nKM_WEBHOOK_BASE_URL=http://localhost/n8n/webhook/\nKM_FILES_LIST_WEBHOOK_PATH=km/list\n');

test('production/test URLs share a base and reject escaping paths', () => {
  assert.equal(endpoint(config, 'list'), 'http://localhost/n8n/webhook/km/list');
  assert.equal(endpoint(config, 'list', true), 'http://localhost/n8n/webhook-test/km/list');
  for (const path of ['', '../other', '/other', '//external/a', 'http://external/a', '%2e%2e/a', 'a?x=1', 'a\\b']) {
    assert.throws(() => endpoint({ ...config, KM_FILES_LIST_WEBHOOK_PATH: path }, 'list'));
  }
});
test('icons follow final extension, case-insensitively, with generic fallback', () => {
  for (const [name, icon] of [['a.B.C.DOCX', 'word'], ['a.csv', 'excel'], ['a.pptm', 'powerpoint'],
    ['a.PDF', 'pdf'], ['a.JPEG', 'image'], ['a.zip', 'file'], ['README', 'file']]) assert.equal(iconName(name), icon);
});
test('strict confirmations, conflicts, HTTP failures and timeouts', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{"ok":true,"name":"a"}');
    await request('http://local', {}, (data) => data.name === 'a');
    await assert.rejects(request('http://local', {}, () => false), (error) => error.uncertain);
    globalThis.fetch = async () => new Response('Workflow was started');
    await assert.rejects(request('http://local'), (error) => error.uncertain);
    globalThis.fetch = async () => new Response('{"ok":false,"message":"changed"}', { status: 409 });
    await assert.rejects(request('http://local'), /Conflit/);
    globalThis.fetch = async () => new Response('{"ok":false,"message":"too large"}', { status: 413 });
    await assert.rejects(request('http://local'), /too large/);
    globalThis.fetch = async (_url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('abort')), { once: true });
    });
    await assert.rejects(request('http://local', {}, () => true, 10), (error) => error.uncertain && /Délai/.test(error.message));
  } finally { globalThis.fetch = original; }
});
