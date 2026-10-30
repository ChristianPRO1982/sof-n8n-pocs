"""Local Chrome checks for the shared footer; no remote workflows are called."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parents[2]

SETUP = """<script>
window.kmTestErrors = [];
window.addEventListener('error', e => window.kmTestErrors.push(e.message));
window.addEventListener('unhandledrejection', e => window.kmTestErrors.push(String(e.reason)));
window.kmConfigReads = [];
const nativeFetch = window.fetch;
window.fetch = (input, options) => {
  const url = new URL(input, location.href);
  if (url.origin !== location.origin) throw Error('External request: ' + url);
  if (url.pathname.endsWith('/config.ini')) {
    window.kmConfigReads.push(options?.cache);
    url.search = location.search;
  }
  return nativeFetch(url, options);
};
</script>"""

CHECK = """<script type="module">
const report = document.createElement('pre');
report.id = 'km-footer-check';
report.hidden = true;
document.body.append(report);
try {
  await import('/km/assets/km.js');
  const scenario = new URL(location.href).searchParams.get('scenario') || 'normal';
  const expected = scenario === 'normal' ? '0.4.0' :
    scenario === 'long' ? '0.4.' + '9'.repeat(100) : 'version indisponible';
  const footer = document.querySelector('.km-footer');
  for (let i = 0; i < 100 && footer.textContent !== 'POC INNO · Sofinco · ' + expected; i++)
    await new Promise(resolve => setTimeout(resolve, 20));
  // Let failure responses finish too: the fallback is present before the fetch.
  await new Promise(resolve => setTimeout(resolve, 100));
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  assert(footer.textContent === 'POC INNO · Sofinco · ' + expected, 'Version text: ' + footer.textContent);
  assert(document.querySelectorAll('.km-footer').length === 1, 'Duplicate footer');
  assert(!document.querySelector('.km-sidebar-footer'), 'Old sidebar footer');
  assert(document.querySelectorAll('.km-navigation a').length === 15, 'Navigation missing');
  assert(window.kmConfigReads.length && window.kmConfigReads.every(cache => cache === 'no-store'), 'Config cache');
  const visible = () => {
    const rect = footer.getBoundingClientRect();
    assert(rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.bottom <= innerHeight, 'Footer outside viewport');
    assert(document.querySelector('.km-layout').getBoundingClientRect().bottom <= rect.top + 1, 'Footer overlaps layout');
    assert(footer.contains(document.elementFromPoint(rect.left + 2, rect.top + rect.height / 2)), 'Footer obscured');
    assert(document.documentElement.scrollWidth <= innerWidth, 'Horizontal overflow');
  };
  visible();
  const content = document.getElementById('km-content');
  const filler = document.createElement('div');
  filler.style.height = '3000px';
  content.append(filler);
  const footerTop = footer.getBoundingClientRect().top;
  content.scrollTop = 100;
  assert(content.scrollTop > 0, 'Content cannot scroll');
  assert(footer.getBoundingClientRect().top === footerTop, 'Footer scrolls with content');
  const navigation = document.querySelector('.km-navigation');
  if (matchMedia('(max-width: 1100px)').matches) {
    const hamburger = document.querySelector('.km-hamburger');
    assert(document.getElementById('km-sidebar').hidden, 'Mobile menu initially open');
    hamburger.focus();
    hamburger.click();
    visible();
    assert(document.querySelector('.km-workspace').inert, 'Drawer does not isolate content');
    assert(document.getElementById('km-sidebar').getBoundingClientRect().bottom <= footerTop + 1, 'Drawer overlaps footer');
    assert(document.activeElement === document.querySelector('.km-close'), 'Drawer focus');
    navigation.style.maxHeight = '140px';
    navigation.scrollTop = 100;
    assert(navigation.scrollTop > 0, 'Menu cannot scroll');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert(document.getElementById('km-sidebar').hidden, 'Escape does not close menu');
    assert(document.activeElement === hamburger, 'Focus not restored');
  } else {
    navigation.style.maxHeight = '140px';
    navigation.scrollTop = 100;
    assert(navigation.scrollTop > 0, 'Menu cannot scroll');
  }
  visible();
  assert(!window.kmTestErrors.length, window.kmTestErrors.join('; '));
  report.textContent = 'PASS';
} catch (error) { report.textContent = 'FAIL: ' + error.stack; }
</script>"""


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        request = urlsplit(self.path)
        scenario = parse_qs(request.query).get('scenario', ['normal'])[0]
        if request.path == '/km/config.ini':
            if scenario == 'unavailable':
                self.send_error(503)
                return
            version = {'normal': '0.4.0', 'long': '0.4.' + '9' * 100,
                       'invalid': '<img src=x onerror=alert(1)>'}.get(scenario)
            data = ((f'KM_VERSION={version}\n' if version else '') +
                    f'KM_WEBHOOK_BASE_URL=http://127.0.0.1:{self.server.server_port}/webhook/\n').encode()
            content_type = 'text/plain'
        else:
            path = (ROOT / request.path.lstrip('/')).resolve()
            if request.path == '/km/':
                path = ROOT / 'km/index.html'
            if not path.is_relative_to(ROOT) or not path.is_file():
                self.send_error(404)
                return
            data = path.read_bytes()
            content_type = mimetypes.guess_type(path)[0] or 'application/octet-stream'
            if path.suffix == '.html':
                data = data.decode().replace('<head>', '<head>' + SETUP).replace('</body>', CHECK + '</body>').encode()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.end_headers()
        self.wfile.write(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--chrome', default=shutil.which('google-chrome') or shutil.which('chromium'))
    parser.add_argument('--no-sandbox', action='store_true', help='Only for isolated test environments that require it')
    args = parser.parse_args()
    if not args.chrome:
        parser.error('Chrome/Chromium is required')
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    pages = ['/km/', '/km/template.html'] + ['/km/pages/' + path.name for path in sorted((ROOT / 'km/pages').glob('*.html'))]
    cases = [(page, 1366, 'normal') for page in pages]
    cases += [(page, 390, 'normal') for page in pages]
    cases += [('/km/template.html', width, 'normal') for width in (768, 1100, 1920)]
    cases += [('/km/', 390, scenario) for scenario in ('missing', 'invalid', 'unavailable', 'long')]
    try:
        def check(case):
            page, width, scenario = case
            with tempfile.TemporaryDirectory(prefix='km-footer-browser-') as profile:
                command = [args.chrome, '--headless', '--disable-gpu', '--disable-background-networking',
                           '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
                           '--user-data-dir=' + profile, f'--window-size={width},900',
                           '--virtual-time-budget=5000', '--dump-dom']
                if args.no_sandbox:
                    command.append('--no-sandbox')
                command.append(f'http://127.0.0.1:{server.server_port}{page}?scenario={scenario}')
                result = subprocess.run(command, capture_output=True, text=True, timeout=30)
                report = re.search(r'<pre id="km-footer-check"[^>]*>(.*?)</pre>', result.stdout, re.S)
                if not report or report.group(1) != 'PASS':
                    raise AssertionError(f'{case}: ' + (report.group(1) if report else result.stderr[-2000:]))
            return case
        with ThreadPoolExecutor(max_workers=3) as pool:
            checked = list(pool.map(check, cases))
        print(f'{len(checked)} browser scenarios passed: all {len(pages)} pages, five widths, mobile drawer, scrolling and configuration failures.')
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
