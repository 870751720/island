import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
for (const server of ['1', '0']) {
  const result = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
    stdio: 'inherit', env: { ...process.env, H5_EXPORT: '0', XHS_EXPORT: '0', SERVER_EXPORT: server },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  const html = readFileSync('out/index.html', 'utf8');
  const prefix = server === '1' ? '/_next/' : '/island/_next/';
  if (!html.includes(`src="${prefix}`)) throw new Error(`构建资源路径未匹配：${prefix}`);
  console.log(`${server === '1' ? '服务器' : 'GitHub Pages'}资源路径检查通过`);
}
