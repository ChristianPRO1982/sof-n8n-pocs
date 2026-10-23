"""Local Docker smoke checks. Build km-front-local-check and km-gateway-local-check first."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[3]
FRONT_IMAGE = os.environ.get('KM_TEST_FRONT_IMAGE', 'km-front-local-check')
prefix = 'km-check-' + uuid.uuid4().hex[:8]
network = prefix + '-net'
km, gateway, stub, holder = [prefix + '-' + name for name in ('front', 'gateway', 'stub', 'holder')]
containers = []


def docker(*args):
    return subprocess.check_output(['docker', *map(str, args)], text=True, stderr=subprocess.STDOUT).strip()


def run(name, image, *options, command=()):
    containers.append(name)
    return docker('run', '-d', '--name', name, '--network', network, *options, image, *command)


def address(name):
    return docker('inspect', '-f', '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', name)


def origin(name):
    return 'http://' + address(name)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


opener = urllib.request.build_opener(NoRedirect, urllib.request.ProxyHandler({}))


def get(base, path):
    try:
        with opener.open(base + path, timeout=3) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers, error.read()


def wait_http(base):
    for _ in range(60):
        try:
            if get(base, '/km/')[0] == 200:
                return
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(.25)
    raise AssertionError('KM did not become available: ' + base)


with tempfile.TemporaryDirectory(prefix='km-docker-check-') as temp:
    temp = Path(temp)
    settings = temp / 'config.ini'
    settings.write_text((ROOT / 'UI_chat/km/config.ini').read_text())
    statuses = temp / 'statuses.json'
    statuses.write_text((ROOT / 'UI_chat/km/statuses.json').read_text())
    mock_config = temp / 'mock.conf'
    mock_config.write_text('server { listen 5678; location / { return 200 "mock-n8n"; } }')
    docker('network', 'create', '--internal', network)
    try:
        run(stub, FRONT_IMAGE, '--network-alias', 'n8n',
            '--mount', f'type=bind,src={mock_config},dst=/etc/nginx/conf.d/default.conf,readonly')
        km_mount = ['--network-alias', 'km-front', '--mount',
                    f'type=bind,src={settings},dst=/usr/share/nginx/html/km/config.ini,readonly',
                    '--mount', f'type=bind,src={statuses},dst=/usr/share/nginx/html/km/statuses.json,readonly']
        run(km, FRONT_IMAGE, *km_mount)
        run(gateway, 'km-gateway-local-check')
        direct, public = origin(km), origin(gateway)
        wait_http(direct)
        wait_http(public)
        docker('exec', km, 'nginx', '-t')
        docker('exec', gateway, 'nginx', '-t')
        paths = ['/km/', '/km/template.html', '/km/config.ini?check=1', '/km/statuses.json']
        paths += ['/km/pages/' + p.name for p in (ROOT / 'UI_chat/km/pages').glob('*.html')]
        paths += ['/km/assets/' + p.relative_to(ROOT / 'UI_chat/km/assets').as_posix()
                  for p in (ROOT / 'UI_chat/km/assets').rglob('*') if p.suffix in ('.png', '.js', '.css')]
        for base in (direct, public):
            for path in paths:
                status, headers, body = get(base, path)
                assert status == 200 and body, (base, path, status)
                if path.endswith('.js'):
                    assert 'javascript' in headers.get('Content-Type', ''), path
                if 'config.ini' in path or 'statuses.json' in path:
                    assert 'no-store' in headers.get('Cache-Control', ''), path
            status, headers, _ = get(base, '/km')
            assert status == 301 and headers['Location'].endswith('/km/'), headers
            for path in ['/km/missing', '/km/CONTEXT.md', '/km/docs', '/km/docs/',
                         '/km/docs/Poc_n8n.pdf', '/km/tests', '/km/tests/', '/km/tests/upload-browser.mjs']:
                assert get(base, path)[0] == 404, (base, path)
        assert get(public, '/')[0] == 200
        assert get(public, '/n8n/')[2] == b'mock-n8n'
        assert get(direct, '/')[0] == 404
        docker('exec', gateway, 'test', '!', '-e', '/usr/share/nginx/html/km')
        listing = docker('exec', km, 'find', '/usr/share/nginx/html/km', '-type', 'f')
        assert not any(token in listing for token in ('.md', '.pdf', '/tests/', '/docs/')), listing
        mount = json.loads(docker('inspect', km))[0]['Mounts'][0]
        assert mount['RW'] is False and mount['Destination'].endswith('/km/config.ini')
        before_id = docker('inspect', '-f', '{{.Id}}', km)
        with settings.open('a') as stream:
            stream.write('\n# updated-without-rebuild\n')
        assert b'updated-without-rebuild' in get(public, '/km/config.ini')[2]
        assert docker('inspect', '-f', '{{.Id}}', km) == before_id
        _, previous_headers, _ = get(public, '/km/statuses.json')
        statuses.write_text('{"01_upload_raw_files":"validated"}')
        status, headers, body = get(public, '/km/statuses.json')
        assert status == 200 and json.loads(body)['01_upload_raw_files'] == 'validated'
        assert 'ETag' not in headers
        request = urllib.request.Request(public + '/km/statuses.json', headers={
            'If-Modified-Since': previous_headers.get('Last-Modified', 'Thu, 01 Jan 1970 00:00:00 GMT')})
        with opener.open(request, timeout=3) as response:
            assert response.status == 200, 'Runtime status settings must never return a stale 304'
        assert docker('inspect', '-f', '{{.Id}}', km) == before_id
        old_ip = address(km)
        gateway_id = docker('inspect', '-f', '{{.Id}}', gateway)
        docker('rm', '-f', km)
        # Occupy the old IP so that the new frontend must receive a different one.
        run(holder, FRONT_IMAGE, '--ip', old_ip, command=('sleep', '60'))
        run(km, FRONT_IMAGE, *km_mount)
        assert address(km) != old_ip
        wait_http(public)
        assert docker('inspect', '-f', '{{.Id}}', gateway) == gateway_id
        for _ in range(100):
            if docker('inspect', '-f', '{{.State.Health.Status}}', km) == 'healthy':
                break
            time.sleep(.2)
        else:
            raise AssertionError('KM healthcheck did not pass')
        print(f'Docker checks passed: {len(paths)} routes direct/proxied, 404s, no-store config, image contents, '
              'read-only mount, live settings, healthcheck, DNS recovery with a new IP, gateway unchanged.')
    except Exception:
        for name in dict.fromkeys(containers):
            try:
                print(name, docker('logs', '--tail', '12', name))
            except subprocess.CalledProcessError:
                pass
        raise
    finally:
        for name in dict.fromkeys(containers):
            subprocess.run(['docker', 'rm', '-f', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        docker('network', 'rm', network)
