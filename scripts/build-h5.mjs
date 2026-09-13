import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const result = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: root,
  env: { ...process.env, H5_EXPORT: '1' },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
