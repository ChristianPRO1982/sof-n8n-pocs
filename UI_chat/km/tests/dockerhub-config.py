"""Compose and publication checks without authentication, build, push or deployment."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]


class DockerHubConfiguration(unittest.TestCase):
    def test_compose_uses_registry_without_build(self):
        for tag in (None, '0.1.0'):
            env = dict(os.environ)
            env.pop('KM_IMAGE_TAG', None)
            for key in ('N8N_DB_NAME', 'N8N_DB_USER', 'N8N_DB_PASSWORD', 'N8N_ENCRYPTION_KEY', 'PUBLIC_HOST'):
                env.setdefault(key, 'km-test-placeholder')
            if tag:
                env['KM_IMAGE_TAG'] = tag
            payload = json.loads(subprocess.check_output(
                ['docker', 'compose', '--env-file', '/dev/null', 'config', '--format', 'json'],
                cwd=ROOT, env=env, text=True))
            service = payload['services']['km-front']
            self.assertEqual(service['image'], 'christianpro1982/km:' + (tag or 'latest'))
            self.assertNotIn('build', service)
            self.assertNotIn('ports', service)
            self.assertEqual(set(service['networks']), {'frontend'})
            self.assertNotIn('depends_on', service)
            self.assertEqual(len(service['volumes']), 2)
            mount = service['volumes'][0]
            self.assertEqual(mount['type'], 'bind')
            self.assertEqual(mount['source'], str(ROOT / 'UI_chat/km/config.ini'))
            self.assertEqual(mount['target'], '/usr/share/nginx/html/km/config.ini')
            self.assertTrue(mount['read_only'])
            self.assertFalse(mount['bind'].get('create_host_path', False))
            status_mount = service['volumes'][1]
            self.assertEqual(status_mount['source'], str(ROOT / 'UI_chat/km/statuses.json'))
            self.assertEqual(status_mount['target'], '/usr/share/nginx/html/km/statuses.json')
            self.assertEqual(status_mount['type'], 'bind')
            self.assertTrue(status_mount['read_only'])
            self.assertFalse(status_mount['bind'].get('create_host_path', False))

    def publish(self, version, mode='missing'):
        with tempfile.TemporaryDirectory(prefix='km-publish-test-') as temp:
            temp = Path(temp)
            log = temp / 'calls.jsonl'
            executable = temp / 'docker'
            executable.write_text('''#!/usr/bin/env python3
import json, os, sys
with open(os.environ['KM_TEST_LOG'], 'a') as stream:
    stream.write(json.dumps(sys.argv[1:])+'\\n')
args = sys.argv[1:]
if args[:2] == ['buildx','inspect']:
    if '--format' in args: sys.exit(2)
    print('Driver: docker' if os.environ['KM_TEST_MODE']=='driver' else 'Driver: docker-container')
elif args[:3] == ['buildx','imagetools','inspect']:
    mode = os.environ['KM_TEST_MODE']
    if mode == 'exists': sys.exit(0)
    print('manifest unknown' if mode == 'missing' else 'unauthorized: authentication required', file=sys.stderr)
    sys.exit(1)
''')
            executable.chmod(0o755)
            env = dict(os.environ, PATH=str(temp) + os.pathsep + os.environ['PATH'],
                       KM_TEST_LOG=str(log), KM_TEST_MODE=mode)
            result = subprocess.run(['bash', str(ROOT / 'scripts/publish-km.sh'), version],
                                    cwd='/tmp', env=env, text=True, capture_output=True)
            calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
            return result, calls

    def test_publication_tags_and_platforms(self):
        result, calls = self.publish('0.1.0')
        self.assertEqual(result.returncode, 0, result.stderr)
        build = calls[-1]
        self.assertEqual(build[:2], ['buildx', 'build'])
        self.assertIn('linux/amd64,linux/arm64', build)
        self.assertIn('christianpro1982/km:0.1.0', build)
        self.assertIn('christianpro1982/km:latest', build)
        self.assertIn('--push', build)
        self.assertEqual(build[-1], str(ROOT))

    def test_existing_tag_auth_failure_and_wrong_builder_block_publication(self):
        for mode in ('exists', 'auth', 'driver'):
            result, calls = self.publish('0.1.0', mode)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(any(call[:2] == ['buildx', 'build'] for call in calls))

    def test_invalid_version_never_calls_docker(self):
        for version in ('latest', '../bad', '0.1.0;echo nope', ''):
            result, calls = self.publish(version)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(calls, [])


if __name__ == '__main__':
    unittest.main()
