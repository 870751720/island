/** Runs in a temporary Node container with Docker CLI, socket and ISLAND_ROOT mounted. */
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { chownSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { verifySignaling } from '../signaling/verify.ts';
import { verifyRelay } from '../relay/verify.ts';

const root = process.env.ISLAND_ROOT ?? '';
const revision = process.env.REVISION ?? '';
if (!/^\/opt\/[a-z0-9-]+$/.test(root) || !/^[a-f0-9]{40}$/.test(revision)) throw new Error('Invalid deployment path or revision');
const release = join(root, 'releases', revision);
if (resolve(process.cwd()) !== release) throw new Error('Unexpected deployment directory');
const shared = join(root, 'shared');
for (const name of ['data', 'letsencrypt', 'acme', 'web/roots']) mkdirSync(join(shared, name), { recursive: true });
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
const backendFile = join(shared, 'backend-revision');
function activate(sha: string): void {
  const pending = join(shared, 'active-revision.next');
  writeFileSync(pending, sha);
  const link = join(root, `current-${randomUUID()}`);
  symlinkSync(join(root, 'releases', sha), link);
  renameSync(link, join(root, 'current'));
  renameSync(pending, previousFile);
}

/** Backend trees force a full service redeploy whenever their bytes change. */
const backendTrees = ['server', 'signaling', 'relay', 'shared'];
function sameTree(a: string, b: string): boolean {
  const list = (dir: string) => readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.name !== 'node_modules')
    .sort((x, y) => (x.name < y.name ? -1 : 1));
  const [left, right] = [list(a), list(b)];
  if (left.length !== right.length) return false;
  for (const [x, y] of left.map((entry, index) => [entry, right[index]] as const)) {
    if (x.name !== y.name || x.isDirectory() !== y.isDirectory()) return false;
    const [pa, pb] = [join(a, x.name), join(b, y.name)];
    if (x.isDirectory() ? !sameTree(pa, pb) : !readFileSync(pa).equals(readFileSync(pb))) return false;
  }
  return true;
}
function backendUnchanged(): boolean {
  if (!/^[a-f0-9]{40}$/.test(previous) || previous === revision) return false;
  const earlier = join(root, 'releases', previous);
  // The web container must already serve from the stable webroot; otherwise it still mounts a release directory.
  if (!existsSync(join(shared, 'web', 'current'))) return false;
  return backendTrees.every(tree => existsSync(join(earlier, tree)) && existsSync(join(release, tree))
    && sameTree(join(earlier, tree), join(release, tree)));
}

/** Stage frontend files and switch the relative `current` symlink atomically; no container is touched. */
function publishFrontend(sha: string): void {
  const roots = join(shared, 'web', 'roots');
  const staging = join(roots, `.staging-${randomUUID()}`);
  cpSync(join(root, 'releases', sha, 'out'), staging, { recursive: true });
  const target = join(roots, sha);
  rmSync(target, { recursive: true, force: true });
  renameSync(staging, target);
  const pending = join(shared, 'web', `current-${randomUUID()}`);
  symlinkSync(join('roots', sha), pending);
  renameSync(pending, join(shared, 'web', 'current'));
}
function pruneWebRoots(keep: string[]): void {
  for (const entry of readdirSync(join(shared, 'web', 'roots'))) {
    if (!keep.includes(entry)) rmSync(join(shared, 'web', 'roots', entry), { recursive: true, force: true });
  }
}

const frontendOnly = backendUnchanged();
// Frontend-only releases keep the running api/relay revisions; full releases roll them to this SHA.
const expectedBackend = frontendOnly
  ? (existsSync(backendFile) ? readFileSync(backendFile, 'utf8').trim() : previous)
  : revision;
if (!/^[a-f0-9]{40}$/.test(expectedBackend)) throw new Error('Backend revision unavailable');

try {
  publishFrontend(revision);
  if (!frontendOnly) {
    compose(revision, ['build', 'api', 'relay']);
    compose(revision, ['up', '-d', '--wait', '--wait-timeout', '120', '--force-recreate']);
  }
  // Also recover a certificate that expired while the machine was stopped.
  compose(revision, ['run', '--rm', '--no-deps', '--entrypoint', 'certbot', 'certbot', 'renew', '--webroot', '-w', '/var/www/acme', '--quiet']);
  compose(revision, ['exec', '-T', 'web', 'nginx', '-s', 'reload']);
  let healthy = false;
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const page = await fetch(site, { signal: AbortSignal.timeout(10_000) });
      const stamped = await fetch(`${site}/revision.txt`, { signal: AbortSignal.timeout(10_000) });
      const response = await fetch(`${site}/api/health`, { signal: AbortSignal.timeout(10_000) });
      const health = await response.json() as { ok?: boolean; revision?: string };
      if (page.status === 200 && stamped.ok && (await stamped.text()).trim() === revision
        && response.ok && health.ok && health.revision === expectedBackend) {
        await verifySignaling();
        await verifyRelay(site, expectedBackend);
        healthy = true;
        break;
      }
    } catch { /* Allow the proxy a short startup window. */ }
    await new Promise(done => setTimeout(done, 5000));
  }
  if (!healthy) throw new Error('Public HTTPS or service health check failed');
  if (!frontendOnly) writeFileSync(backendFile, `${revision}\n`);
  activate(revision);
  pruneWebRoots([revision, previous]);
  console.log(`Deployment verified: ${revision} (${frontendOnly ? 'frontend-only, services untouched' : 'full services redeploy'})`);
} catch (error) {
  if (/^[a-f0-9]{40}$/.test(previous) && previous !== revision) {
    publishFrontend(previous);
    if (!frontendOnly) {
      compose(previous, ['up', '-d', '--wait', '--wait-timeout', '120', '--force-recreate']);
      writeFileSync(backendFile, `${previous}\n`);
    }
    activate(previous);
    console.error('Previous release restored; this deployment failed.');
  }
  throw error;
}
