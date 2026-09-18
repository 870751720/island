/** Runs in a temporary Node container with Docker CLI, socket and ISLAND_ROOT mounted. */
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readFileSync, chownSync, renameSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.env.ISLAND_ROOT ?? '';
const revision = process.env.REVISION ?? '';
if (!/^\/opt\/[a-z0-9-]+$/.test(root) || !/^[a-f0-9]{40}$/.test(revision)) throw new Error('Invalid deployment path or revision');
const release = join(root, 'releases', revision);
if (resolve(process.cwd()) !== release) throw new Error('Unexpected deployment directory');
const shared = join(root, 'shared');
for (const name of ['data', 'letsencrypt', 'acme']) mkdirSync(join(shared, name), { recursive: true });
chownSync(join(shared, 'data'), 1000, 1000);
const runtime = join(shared, 'runtime.env');
if (!existsSync(runtime)) writeFileSync(runtime, `SAVE_SECRET=${randomBytes(32).toString('hex')}\n`, { mode: 0o600, flag: 'wx' });

function docker(args: string[], cwd = release): void {
  const result = spawnSync('docker', args, { cwd, stdio: 'inherit', env: { ...process.env, ISLAND_ROOT: root }, timeout: 600_000 });
  if (result.error || result.status !== 0) throw new Error(`Docker operation failed: ${args[0]}`);
}
const site = 'https://43.110.116.98';
if (!existsSync(join(shared, 'letsencrypt/live/43.110.116.98/fullchain.pem'))) {
  docker(['run', '--rm', '-p', '80:80', '-v', `${shared}/letsencrypt:/etc/letsencrypt`, 'certbot/certbot:v5.4.0',
    'certonly', '--standalone', '--preferred-profile', 'shortlived', '--ip-address', '43.110.116.98',
    '--cert-name', '43.110.116.98', '--non-interactive', '--agree-tos', '--register-unsafely-without-email']);
}
function compose(sha: string, args: string[]): void {
  const cwd = join(root, 'releases', sha);
  const result = spawnSync('docker', ['compose', '-p', 'island', '-f', join(cwd, 'server/compose.yml'), ...args], {
    cwd, stdio: 'inherit', env: { ...process.env, ISLAND_ROOT: root, REVISION: sha }, timeout: 600_000,
  });
  if (result.error || result.status !== 0) throw new Error('Compose operation failed');
}
const previousFile = join(shared, 'active-revision');
const previous = existsSync(previousFile) ? readFileSync(previousFile, 'utf8').trim() : '';
function activate(sha: string): void {
  const pending = join(shared, 'active-revision.next');
  writeFileSync(pending, sha);
  const link = join(root, `current-${randomUUID()}`);
  symlinkSync(join(root, 'releases', sha), link);
  renameSync(link, join(root, 'current'));
  renameSync(pending, previousFile);
}
try {
  compose(revision, ['build', 'api']);
  compose(revision, ['up', '-d', '--wait', '--wait-timeout', '120', '--force-recreate']);
  // Also recover a certificate that expired while the machine was stopped.
  compose(revision, ['run', '--rm', '--no-deps', '--entrypoint', 'certbot', 'certbot', 'renew', '--webroot', '-w', '/var/www/acme', '--quiet']);
  compose(revision, ['exec', '-T', 'web', 'nginx', '-s', 'reload']);
  let healthy = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const page = await fetch(site, { signal: AbortSignal.timeout(10_000) });
      const response = await fetch(`${site}/api/health`, { signal: AbortSignal.timeout(10_000) });
      const health = await response.json() as { ok?: boolean; revision?: string };
      if (page.status === 200 && response.ok && health.ok && health.revision === revision) { healthy = true; break; }
    } catch { /* Allow the proxy a short startup window. */ }
    await new Promise(done => setTimeout(done, 5000));
  }
  if (!healthy) throw new Error('Public HTTPS health check failed');
  activate(revision);
  console.log(`Deployment verified: ${revision}`);
} catch (error) {
  if (/^[a-f0-9]{40}$/.test(previous) && previous !== revision) {
    compose(previous, ['up', '-d', '--wait', '--wait-timeout', '120', '--force-recreate']);
    activate(previous);
    console.error('Previous release restored; this deployment failed.');
  }
  throw error;
}
