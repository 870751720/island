import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { writeZip } from './zip.mts';

const root = process.cwd();
const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const result = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: root,
  env: { ...process.env, H5_EXPORT: '1' },
  stdio: 'inherit',
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const exportDir = path.join(root, '.next-h5');
const packageFile = path.join(root, 'dist', 'island-h5.zip');
if (!fs.existsSync(path.join(exportDir, 'index.html'))) throw new Error('H5 导出缺少 index.html');
fs.mkdirSync(path.dirname(packageFile), { recursive: true });
const files = fs.readdirSync(exportDir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => path.join(entry.parentPath, entry.name))
  .sort();
writeZip(files, exportDir, packageFile, 'island/');
console.log(`H5 包已生成：${path.relative(root, packageFile)} (${fs.statSync(packageFile).size} bytes)`);
