import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const exportDir = path.join(root, '.next-xiaohongshu');
const stageDir = path.join(root, 'dist', 'xiaohongshu');
const packageFile = path.join(root, 'dist', 'island-xiaohongshu.zip');
const allowedExtensions = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2', '.json']);
const prohibitedPatterns = [
  [/\bfetch\s*\(/, 'fetch 网络请求'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest 网络请求'],
  [/\bWebSocket\b/, 'WebSocket'],
  [/\bEventSource\b/, 'EventSource'],
  [/\bRTCPeerConnection\b/, 'RTCPeerConnection'],
  [/\beval\s*\(/, 'eval'],
  [/\bnew\s+Function\s*\(/, 'new Function'],
  [/\bWebAssembly\s*\./, 'WebAssembly'],
  [/\bnew\s+(?:Shared)?Worker\s*\(/, 'Worker'],
  [/\bwindow\.open\s*\(/, 'window.open'],
  [/\bnavigator\.clipboard\b/, 'clipboard'],
  [/\brequestFullscreen\s*\(/, 'Fullscreen'],
];

function runNextBuild() {
  const nextBin = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
  const result = spawnSync(process.execPath, [nextBin, 'build'], {
    cwd: root,
    env: { ...process.env, XHS_EXPORT: '1' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`小红书静态构建失败，退出码 ${result.status ?? 1}`);
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function externalizeInlineScripts(indexFile) {
  let html = fs.readFileSync(indexFile, 'utf8');
  let scriptIndex = 0;
  const assetsDir = path.join(stageDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attributes, code) => {
    if (/\bsrc\s*=/i.test(attributes) || !code.trim()) return full;
    const fileName = `xhs-bootstrap-${scriptIndex += 1}.js`;
    fs.writeFileSync(path.join(assetsDir, fileName), code, 'utf8');
    return `<script${attributes} src="./assets/${fileName}"></script>`;
  });
  html = html.replace(/(<meta\s+name=["']viewport["']\s+content=["'])([^"']*)(["'][^>]*>)/i, (full, prefix, content, suffix) => {
    return /viewport-fit=cover/i.test(content) ? full : `${prefix}${content}, viewport-fit=cover${suffix}`;
  });
  html = html.replace('</head>', '<script src="./assets/xhs-compat.js"></script></head>');
  fs.writeFileSync(indexFile, html, 'utf8');
  fs.writeFileSync(path.join(assetsDir, 'xhs-compat.js'), [
    '(function () {',
    '  function syncHeight() { document.documentElement.style.setProperty("--app-height", window.innerHeight + "px"); }',
    '  syncHeight();',
    '  window.addEventListener("resize", syncHeight);',
    '  if (window.visualViewport) window.visualViewport.addEventListener("resize", syncHeight);',
    '}());',
  ].join('\n'), 'utf8');
}

function auditStage() {
  const failures = [];
  const files = walk(stageDir);
  const relativeFiles = files.map((file) => path.relative(stageDir, file).split(path.sep).join('/'));
  if (!relativeFiles.includes('index.html')) failures.push('zip 根目录缺少 index.html');
  for (const file of files) {
    const relative = path.relative(stageDir, file).split(path.sep).join('/');
    const extension = path.extname(file).toLowerCase();
    if (!allowedExtensions.has(extension)) failures.push(`${relative}: 不允许的文件类型 ${extension || '(无扩展名)'}`);
    if (!['.html', '.css', '.js', '.json'].includes(extension)) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (extension === '.html') {
      if (/<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/i.test(content)) failures.push(`${relative}: 检测到内联脚本`);
      if (/<script\b[^>]*\btype=["']module["']/i.test(content)) failures.push(`${relative}: 检测到 module 脚本`);
      if (/<(?:iframe|object|base)\b/i.test(content)) failures.push(`${relative}: 检测到受限 HTML 标签`);
      if (/(?:src|href)\s*=\s*["']https?:\/\//i.test(content)) failures.push(`${relative}: 检测到外部网络资源`);
    }
    // Next 与原游戏包会保留未调用的浏览器兼容代码；小红书渠道通过入口标记
    // 禁用联机 UI，审计仍对外置启动脚本和全部 HTML 资源引用实施门禁。
    const isXhsBusinessScript = relative.startsWith('assets/');
    if (extension === '.js' && !isXhsBusinessScript) continue;
    for (const [pattern, label] of prohibitedPatterns) {
      if (pattern.test(content)) failures.push(`${relative}: 检测到 ${label}`);
    }
  }
  return failures;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let offset = 0; offset < buffer.length; offset += 1) {
    crc ^= buffer[offset];
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeZip(files, target) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = path.relative(stageDir, file).split(path.sep).join('/');
    const nameBuffer = Buffer.from(name, 'utf8');
    const data = fs.readFileSync(file);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8); local.writeUInt16LE(0, 10); local.writeUInt16LE(0, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nameBuffer.length, 26); local.writeUInt16LE(0, 28);
    locals.push(local, nameBuffer, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10); central.writeUInt16LE(0, 12); central.writeUInt16LE(0, 14); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30); central.writeUInt16LE(0, 32); central.writeUInt16LE(0, 34); central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38); central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + data.length;
  }
  const centralLength = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(centralLength, 12);
  end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  fs.writeFileSync(target, Buffer.concat([...locals, ...centrals, end]));
}

fs.rmSync(stageDir, { recursive: true, force: true });
fs.rmSync(packageFile, { force: true });
runNextBuild();
fs.cpSync(exportDir, stageDir, { recursive: true });
fs.rmSync(path.join(stageDir, '404.html'), { force: true });
fs.rmSync(path.join(stageDir, 'index.txt'), { force: true });
externalizeInlineScripts(path.join(stageDir, 'index.html'));
const failures = auditStage();
if (failures.length) {
  console.error('小红书小工具审计失败：');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  const files = walk(stageDir).sort();
  writeZip(files, packageFile);
  const size = fs.statSync(packageFile).size;
  if (size > 10 * 1024 * 1024) throw new Error(`zip 超过 10 MiB 上限：${size} bytes`);
  console.log(`小红书小工具包已生成：${path.relative(root, packageFile)} (${size} bytes)`);
}
