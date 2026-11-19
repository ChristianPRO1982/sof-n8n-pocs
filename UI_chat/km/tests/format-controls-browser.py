"""Read-only UI tests with local simulated webhooks; never accesses EC2."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import re
import subprocess
import tempfile
import threading

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = r'''<script>
window.kmReads = [];
window.kmDeleted = new Set();
window.kmDeleteMode = 'ok';
const originalFetch = window.fetch;
window.fetch = async (input, options) => {
  const url = new URL(input, location.href);
  if(url.origin !== location.origin) throw Error('External request blocked: ' + url);
  window.kmReads.push({path: url.pathname, cache: options?.cache, method: options?.method, body: options?.body});
  if (options?.method === 'POST') {
    const body = JSON.parse(options.body);
    if (window.kmDeleteMode==='wrong') return new Response(JSON.stringify({ok:true,name:'wrong'}));
    if (window.kmDeleteMode==='refused') return new Response(JSON.stringify({ok:false,message:'Refus simulé'}),{status:409});
    window.kmDeleted.add(body.name);
    return new Response(JSON.stringify({ok:true,name:body.name}));
  }
  const response = await originalFetch(input, options);
  if (url.pathname==='/webhook/list') {
    const payload = await response.json();
    payload.files = payload.files.filter(file=>!window.kmDeleted.has(file.name));
    return new Response(JSON.stringify(payload));
  }
  return response;
};
</script><script type="module">
import {parseReport} from '/km/assets/km-format-report.js';
const assert = (value, message) => { if (!value) throw Error(message); };
const wait = async predicate => { for(let i=0;i<200;i++) { if(predicate()) return; await new Promise(r=>setTimeout(r,20)); } throw Error('Timeout'); };
try {
  await wait(()=>!document.querySelector('#refresh-reports').disabled);
  assert(document.querySelectorAll('#reports-list > li').length===2,'List');
  document.querySelector('#reports-list button').click();
  await wait(()=>!document.querySelector('#refresh-reports').disabled && document.querySelector('#report-summary')?.textContent.includes('55 %'));
  assert(document.querySelector('#report-summary').textContent.includes('55 %'),'Completeness');
  assert(document.querySelector('#report-findings').textContent.includes('id fiche'),'Findings');
  assert(!document.querySelector('#report-document img'),'Unsafe HTML');
  assert(document.querySelector('#report-document').textContent.includes('<img'),'Text preserved');
  const firstRow = document.querySelector('#reports-list > li');
  const detail = document.querySelector('#report-detail');
  assert(firstRow.contains(detail),'Report outside row');
  assert(getComputedStyle(firstRow).borderTopStyle==='dashed','Dashed border');
  assert(getComputedStyle(firstRow).borderTopWidth==='3px','Thick border');
  assert(firstRow.querySelector('button').getAttribute('aria-expanded')==='true','Disclosure expanded');
  assert(document.getElementById(firstRow.querySelector('button').getAttribute('aria-controls')).contains(detail),'Disclosure target');
  assert(document.activeElement===document.querySelector('#report-heading'),'Report focus');
  assert(document.documentElement.scrollWidth<=innerWidth,'Open report overflow');
  const report = JSON.parse(document.querySelector('#report-json').textContent);
  assert(parseReport(report).quality.structure_score===100,'Array JSON');
  assert(parseReport(report[0]).quality.structure_score===100,'Object JSON');
  for(const bad of [[],[report[0],report[0]],{}, {...report[0],quality:{...report[0].quality,structure_score:101}}]) {
    let rejected=false; try{parseReport(bad);}catch{rejected=true;} assert(rejected,'Invalid report accepted');
  }
  document.querySelectorAll('#reports-list > li > .km-report-view')[1].click();
  assert(!detail.isConnected,'Old report retained');
  await wait(()=>!document.querySelector('#refresh-reports').disabled);
  assert(document.querySelectorAll('#report-detail').length===1,'Multiple reports');
  assert(!firstRow.classList.contains('is-selected'),'Old selection');
  const secondRow = document.querySelectorAll('#reports-list > li')[1];
  assert(secondRow.contains(document.querySelector('#report-detail')),'Second report outside row');
  const readsBeforeClose = window.kmReads.length;
  secondRow.querySelector('button').click();
  assert(!document.querySelector('#report-detail'),'Closed report retained');
  assert(window.kmReads.length===readsBeforeClose,'Close made request');
  assert(document.activeElement===secondRow.querySelector('button'),'Close focus');
  secondRow.querySelector('button').click();
  await wait(()=>!document.querySelector('#refresh-reports').disabled);
  assert(window.kmReads.filter(r=>r.path==='/webhook/view').length===3,'Reopen did not refresh');
  assert(window.kmReads.filter(r=>r.path==='/webhook/view').every(r=>r.cache==='no-store'),'Cached report');
  document.querySelector('#webhook-view-toggle').click();
  assert(document.querySelector('#webhook-view-toggle').getAttribute('aria-checked')==='true','View toggle');
  assert(!document.querySelector('#report-detail'),'Stale details');
  document.querySelector('#reports-list button').click();
  await wait(()=>document.querySelector('#report-notice').classList.contains('is-error'));
  assert(!document.querySelector('#report-summary'),'Invalid JSON summary visible');
  assert(document.querySelector('#reports-list > li').contains(document.querySelector('#report-detail .is-error')),'Error outside row');
  const beforeRetry = window.kmReads.length;
  document.querySelector('#report-detail button').click();
  await wait(()=>!document.querySelector('#refresh-reports').disabled);
  assert(window.kmReads.length===beforeRetry+1,'Retry did not read again');
  document.querySelector('#webhook-view-toggle').click();
  let confirmText = '';
  window.confirm = text => { confirmText=text; return false; };
  let beforeDelete = window.kmReads.length;
  document.querySelector('#reports-list .km-upload-danger').click();
  assert(confirmText.includes('test.rapport.md'),'Delete confirmation missing name');
  assert(window.kmReads.length===beforeDelete,'Cancelled delete made request');
  window.confirm = () => true;
  for (const mode of ['wrong','refused']) {
    window.kmDeleteMode = mode;
    document.querySelector('#reports-list .km-upload-danger').click();
    assert(document.querySelector('#reports-list .km-upload-danger').disabled,'Concurrent delete allowed');
    await wait(()=>!document.querySelector('#refresh-reports').disabled);
    assert(document.querySelectorAll('#reports-list > li').length===2,'Unconfirmed deletion removed report');
    assert(document.querySelector('#report-notice').textContent.includes('Suppression non confirmée'),'False deletion success');
  }
  window.kmDeleteMode = 'ok';
  beforeDelete = window.kmReads.length;
  document.querySelector('#webhook-delete-toggle').click();
  assert(window.kmReads.length===beforeDelete,'Delete toggle made request');
  document.querySelector('#reports-list .km-report-view').click();
  await wait(()=>!document.querySelector('#refresh-reports').disabled);
  document.querySelector('#reports-list .km-upload-danger').click();
  await wait(()=>!document.querySelector('#refresh-reports').disabled);
  const deletion = window.kmReads.filter(r=>r.method==='POST').at(-1);
  assert(deletion.path==='/webhook-test/delete','Delete mode not independent');
  assert(JSON.stringify(JSON.parse(deletion.body))===JSON.stringify({name:'test.rapport.md',expected_revision:'r1'}),'Delete body');
  assert(document.querySelectorAll('#reports-list > li').length===1,'Confirmed delete retained report');
  assert(!document.querySelector('#report-detail'),'Deleted detail retained');
  assert(document.querySelector('#report-notice').textContent.includes('Suppression confirmée'),'Missing confirmation');
  document.querySelector('#webhook-list-toggle').click();
  await wait(()=>!document.querySelector('#refresh-reports').disabled);
  assert(document.querySelector('#reports-state').textContent.includes('Aucun'),'Empty list');
  assert(document.documentElement.scrollWidth<=innerWidth,'Horizontal overflow');
  document.body.dataset.testResult='PASS';
} catch(error) {document.body.dataset.testResult='FAIL: '+error.message;}
</script>'''
REPORT = [{"template":{"text":"Template"},"doc":{"text":"<img src=x onerror=alert(1)>"},"quality":{
    "structure_score":100,"completeness_score":55,"sections_expected":4,"sections_missing":[],
    "fields_expected":11,"fields_present":11,"fields_filled":6,"fields_missing":[],
    "fields_unfilled":["id fiche","titre","dispositif","source","pages"]}}]
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args): pass
    def do_GET(self):
        path=self.path.split('?')[0]
        if path=='/km/config.ini':
            body=b'KM_VERSION=0.7.1\nKM_WEBHOOK_BASE_URL=http://127.0.0.1:'+str(self.server.server_port).encode()+b'/webhook/\nKM_FORMAT_CONTROLS_LIST_WEBHOOK_PATH=list\nKM_FORMAT_CONTROLS_VIEW_WEBHOOK_PATH=view\nKM_FORMAT_CONTROLS_DELETE_WEBHOOK_PATH=delete\n'
        elif path=='/webhook/list': body=json.dumps({"ok":True,"files":[{"name":"test.rapport.md","size":123,"revision":"r1"},{"name":"second.rapport.md","size":456,"revision":"r2"}]}).encode()
        elif path=='/webhook-test/list': body=b'[{"ok":true,"files":[]}]'
        elif path=='/webhook/view': body=json.dumps(REPORT).encode()
        elif path=='/webhook-test/view': body=b'not json'
        elif path=='/km/pages/02_format_controls.html':
            body=(ROOT/'km/pages/02_format_controls.html').read_bytes().replace(b'</body>', SCRIPT.encode()+b'</body>')
        else: return super().do_GET()
        self.send_response(200); self.send_header('Content-Type','text/html' if path.endswith('.html') else 'application/json'); self.end_headers(); self.wfile.write(body)
server=ThreadingHTTPServer(('127.0.0.1',0), Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    for width in [1366,390]:
        with tempfile.TemporaryDirectory(prefix='km-format-test-') as profile:
            result=subprocess.run(['google-chrome','--headless','--no-sandbox','--disable-gpu',f'--user-data-dir={profile}',f'--window-size={width},900','--virtual-time-budget=15000','--dump-dom',f'http://127.0.0.1:{server.server_port}/km/pages/02_format_controls.html'],capture_output=True,text=True,timeout=40)
            assert 'data-test-result="PASS"' in result.stdout, str(re.findall(r'data-test-result="[^"]*"', result.stdout))+result.stderr[-500:]
            print(f'PASS format controls {width}px')
finally: server.shutdown(); server.server_close()
