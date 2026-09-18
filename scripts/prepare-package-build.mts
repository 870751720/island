import fs from 'node:fs';
import path from 'node:path';

export function preparePackageBuild(root: string, channel: 'h5' | 'xiaohongshu') {
  const workspace = fs.realpathSync(root);
  const directories = ['.next', `.next-${channel}`];
  if (channel === 'xiaohongshu') directories.push('dist/xiaohongshu');
  for (const relative of directories) {
    const target = path.resolve(workspace, relative);
    if (!target.startsWith(workspace + path.sep)) throw new Error(`构建清理路径越界：${target}`);
    // Next 静态导出仍使用 .next 作为中间目录，必须与渠道导出目录一起清理。
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.rmSync(path.join(workspace, 'dist', `island-${channel}.zip`), { force: true });
}
