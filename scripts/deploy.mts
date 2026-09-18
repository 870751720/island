import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const repository = '870751720/island';
const site = 'https://43.110.116.98/';
const remote = `https://github.com/${repository}.git`;

function git(args: string[], env = process.env): string {
  const result = spawnSync('git', args, {
    cwd: root, env, encoding: 'utf8', timeout: 60_000,
  });
  // Git 的诊断可能带认证信息，不输出原始 stdout/stderr。
  if (result.error || result.status !== 0) {
    throw new Error(`Git ${args[0]} 失败或超时，请检查仓库、凭证与网络（诊断输出已隐藏）。`);
  }
  return result.stdout.trim();
}

interface WorkflowRun {
  id: number;
  head_sha: string;
  status: string;
  conclusion: string | null;
}

async function waitForDeployment(sha: string, token: string): Promise<void> {
  const deadline = Date.now() + 1_500_000;
  const api = `https://api.github.com/repos/${repository}/actions`;
  let runId: number | undefined;
  let previousStatus = '';
  while (Date.now() < deadline) {
    const url = runId === undefined
      ? `${api}/workflows/deploy.yml/runs?head_sha=${sha}&event=push&per_page=1`
      : `${api}/runs/${runId}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(Math.min(20_000, deadline - Date.now())),
      });
    } catch {
      throw new Error('GitHub API 请求失败或超时；推送已完成，部署状态尚未确认。');
    }
    if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}；部署状态尚未确认。`);
    const payload = await response.json();
    const run: WorkflowRun | undefined = runId === undefined ? payload.workflow_runs?.[0] : payload;
    if (run) {
      if (run.head_sha !== sha) throw new Error('Actions 提交 SHA 不匹配，停止验收。');
      if (runId === undefined) {
        runId = run.id;
        console.log(`Actions: https://github.com/${repository}/actions/runs/${runId}`);
      }
      if (run.status !== previousStatus) {
        console.log(`Actions 状态：${run.status}`);
        previousStatus = run.status;
      }
      if (run.status === 'completed') {
        if (run.conclusion !== 'success') throw new Error(`Actions 未成功：${run.conclusion}`);
        console.log('Actions conclusion=success');
        return;
      }
    }
    await sleep(Math.max(0, Math.min(10_000, deadline - Date.now())));
  }
  throw new Error(`等待提交 ${sha} 部署超时（25 分钟），请查看 Actions；不能确认部署成功。`);
}

async function main(): Promise<void> {
  if (git(['branch', '--show-current']) !== 'main') throw new Error('请切换到 main 后部署。');
  if (git(['status', '--porcelain'])) throw new Error('工作区存在未提交文件，请完成检查与提交后再部署。');
  if (![remote, `git@github.com:${repository}.git`].includes(git(['remote', 'get-url', 'origin']))) {
    throw new Error('origin 与本项目 GitHub 仓库不匹配，停止部署。');
  }
  if (git(['ls-files', '--', 'githubtoken.txt'])) throw new Error('githubtoken.txt 被 Git 跟踪，停止部署。');
  let token: string;
  try {
    token = fs.readFileSync(new URL('../githubtoken.txt', import.meta.url), 'utf8').trim();
  } catch {
    throw new Error('无法读取仓库根目录的 githubtoken.txt。');
  }
  if (!token || /\s/.test(token)) throw new Error('githubtoken.txt 内容为空或格式无效。');
  const sha = git(['rev-parse', 'HEAD']);
  console.log(`推送 main：${sha}`);
  // 认证仅传入子进程环境，不写入 Git 配置或命令行。强制使用本项目 HTTPS 地址。
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '3',
    GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`,
    GIT_CONFIG_KEY_1: 'remote.origin.pushurl', GIT_CONFIG_VALUE_1: remote,
    GIT_CONFIG_KEY_2: 'credential.helper', GIT_CONFIG_VALUE_2: '',
  };
  git(['push', 'origin', `${sha}:refs/heads/main`], env);
  console.log('推送完成，等待部署验收。');
  await waitForDeployment(sha, token);
  const result = spawnSync(process.platform === 'win32' ? 'curl.exe' : 'curl', [
    '--silent', '--max-time', '30', '--output', process.platform === 'win32' ? 'NUL' : '/dev/null',
    '--write-out', '%{http_code}', site,
  ], { encoding: 'utf8', timeout: 35_000 });
  if (result.error || result.status !== 0 || result.stdout !== '200') {
    throw new Error(`Actions 已成功，但站点验证未通过（HTTP ${result.stdout || '未知'}）。`);
  }
  const healthResponse = await fetch(`${site}api/health`, { signal: AbortSignal.timeout(30_000) });
  const health = await healthResponse.json() as { ok?: boolean; revision?: string };
  if (!healthResponse.ok || !health.ok || health.revision !== sha) throw new Error('云存档 API 版本验收失败。');
  console.log(`部署成功：${site}（HTTP 200，提交 ${sha}）`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : '部署失败。');
  process.exitCode = 1;
});
