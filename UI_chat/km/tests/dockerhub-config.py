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

    def publish(self, version=None, mode='missing', initial='KM_VERSION=0.4.0\n', extra_args=(), config_state='normal'):
        with tempfile.TemporaryDirectory(prefix='km-publish-test-') as temp:
            temp = Path(temp)
            project = temp / 'project'
            (project / 'scripts').mkdir(parents=True)
            script = project / 'scripts/publish-km.sh'
            script.write_bytes((ROOT / 'scripts/publish-km.sh').read_bytes())
            settings = project / 'UI_chat/km/config.ini'
            settings.parent.mkdir(parents=True)
            self.original_config = initial + '# conserver\nKM_FILES_LIST_WEBHOOK_PATH=existing-list\n\nKM_CUSTOM=value=with=equals\n'
            if config_state == 'directory':
                settings.mkdir()
            elif config_state != 'missing':
                settings.write_text(self.original_config)
                if config_state == 'readonly':
                    settings.chmod(0o444)
            inode = settings.stat().st_ino if settings.is_file() else None
            self.publish_root = str(project)
            log = temp / 'calls.jsonl'
            snapshots = temp / 'config-snapshots.jsonl'
            executable = temp / 'docker'
            executable.write_text('''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
with open(os.environ['KM_TEST_LOG'], 'a') as stream:
    stream.write(json.dumps(sys.argv[1:])+'\\n')
with open(os.environ['KM_TEST_SNAPSHOTS'], 'a') as stream:
    stream.write(json.dumps(Path(os.environ['KM_TEST_CONFIG']).read_text())+'\\n')
args = sys.argv[1:]
if args[:2] == ['buildx','inspect']:
    if '--format' in args: sys.exit(2)
    print('Driver: docker' if os.environ['KM_TEST_MODE']=='driver' else 'Driver: docker-container')
elif args[:3] == ['buildx','imagetools','inspect']:
    mode = os.environ['KM_TEST_MODE']
    if mode == 'exists': sys.exit(0)
    print('manifest unknown' if mode in ('missing', 'build_failure') else 'unauthorized: authentication required', file=sys.stderr)
    sys.exit(1)
elif args[:2] == ['buildx','build'] and os.environ['KM_TEST_MODE']=='build_failure':
    sys.exit(1)
''')
            executable.chmod(0o755)
            env = dict(os.environ, PATH=str(temp) + os.pathsep + os.environ['PATH'],
                       KM_TEST_LOG=str(log), KM_TEST_MODE=mode, KM_TEST_CONFIG=str(settings),
                       KM_TEST_SNAPSHOTS=str(snapshots))
            args = ([] if version is None else [version]) + list(extra_args)
            result = subprocess.run(['bash', str(script), *args],
                                    cwd='/tmp', env=env, text=True, capture_output=True)
            calls = [json.loads(line) for line in log.read_text().splitlines()] if log.exists() else []
            self.published_config = settings.read_text() if settings.is_file() else None
            self.same_inode = settings.is_file() and settings.stat().st_ino == inode
            if snapshots.exists():
                for snapshot in snapshots.read_text().splitlines():
                    self.assertEqual(json.loads(snapshot), self.published_config,
                                     'Configuration must be updated before the first Docker call')
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
        self.assertEqual(build[-1], self.publish_root)
        self.assertEqual(self.published_config, self.original_config.replace('KM_VERSION=0.4.0', 'KM_VERSION=0.1.0'))
        self.assertTrue(self.same_inode)

    def test_existing_tag_auth_failure_and_wrong_builder_block_publication(self):
        for mode in ('exists', 'auth', 'driver', 'build_failure'):
            result, calls = self.publish('0.1.0', mode)
            self.assertNotEqual(result.returncode, 0)
            if mode != 'build_failure':
                self.assertFalse(any(call[:2] == ['buildx', 'build'] for call in calls))
            self.assertTrue(self.published_config.startswith('KM_VERSION=0.1.0\n'))
            self.assertTrue(self.same_inode)

    def test_invalid_version_never_calls_docker(self):
        for version in ('latest', '../bad', '0.1.0;echo nope', ''):
            result, calls = self.publish(version)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(calls, [])
            self.assertEqual(self.published_config, self.original_config)

    def test_automatic_patch_increment(self):
        for current, expected in [('0.4.0', '0.4.1'), ('0.4.9', '0.4.10'),
                                  ('0.4.99', '0.4.100'), ('0.4.009', '0.4.10'),
                                  ('0.4.9-rc.1', '0.4.10'),
                                  ('0.4.99999999999999999999', '0.4.100000000000000000000')]:
            with self.subTest(current=current):
                result, calls = self.publish(initial=f'KM_VERSION={current}\n')
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(self.published_config, self.original_config.replace(current, expected))
                self.assertIn('christianpro1982/km:' + expected, calls[-1])
                self.assertTrue(self.same_inode)

    def test_invalid_stored_version_and_extra_arguments_do_not_modify_config(self):
        for initial in ['', 'KM_VERSION=latest\n', 'KM_VERSION=0.4.0\nKM_VERSION=0.4.1\n',
                        'KM_VERSION=0.4\n', 'KM_VERSION=' + '9' * 129 + '.0.0\n']:
            result, calls = self.publish(initial=initial)
            self.assertEqual(result.returncode, 2)
            self.assertEqual(calls, [])
            self.assertEqual(self.published_config, self.original_config)
        result, calls = self.publish('0.4.1', extra_args=['0.4.2'])
        self.assertEqual(result.returncode, 2)
        self.assertEqual(calls, [])
        self.assertEqual(self.published_config, self.original_config)

    def test_explicit_version_moves_key_to_first_line_and_removes_duplicates(self):
        initial = '# existing header\nKM_VERSION=0.3.0\n KM_VERSION = 0.3.1\n'
        result, _ = self.publish('0.5.0-rc.1', initial=initial)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.published_config, 'KM_VERSION=0.5.0-rc.1\n' +
                         '# existing header\n# conserver\nKM_FILES_LIST_WEBHOOK_PATH=existing-list\n\nKM_CUSTOM=value=with=equals\n')
        self.assertTrue(self.same_inode)

    def test_missing_or_unwritable_config_never_calls_docker(self):
        for state in ('missing', 'directory', 'readonly'):
            if state == 'readonly' and os.geteuid() == 0:
                continue
            result, calls = self.publish('0.5.0', config_state=state)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(calls, [])
            if state == 'readonly':
                self.assertEqual(self.published_config, self.original_config)


if __name__ == '__main__':
    unittest.main()
