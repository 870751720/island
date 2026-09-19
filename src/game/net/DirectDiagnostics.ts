import { directDiagnostic } from './VirtualLan';

function endpoint(report: RTCStatsReport, candidateId: string): string {
  const candidate = report.get(candidateId);
  return candidate ? `${candidate.address ?? candidate.ip ?? '地址隐藏'}:${candidate.port ?? '?'} (${candidate.candidateType ?? '?'})` : '未知';
}

/** Counts describe ICE checks, not game packets or proof of a VPN route. */
export function describeCandidateChecks(report: RTCStatsReport): string[] {
  const pairs: RTCIceCandidatePairStats[] = [];
  report.forEach(stat => { if (stat.type === 'candidate-pair') pairs.push(stat); });
  if (!pairs.length) return ['浏览器未提供候选路径检查统计，无法判断是否发送过探测'];
  const lines = [`候选路径共 ${pairs.length} 条（最多显示 12 条；? 表示浏览器未提供）`];
  for (const pair of pairs.slice(0, 12)) {
    lines.push(`${endpoint(report, pair.localCandidateId)} → ${endpoint(report, pair.remoteCandidateId)}：${pair.state}；检查发出 ${pair.requestsSent ?? '?'} / 响应收到 ${pair.responsesReceived ?? '?'} / 检查收到 ${pair.requestsReceived ?? '?'}`);
  }
  return lines;
}

export async function recordCandidateChecks(pc: RTCPeerConnection, id: number, reason: string): Promise<void> {
  try {
    const report = await pc.getStats();
    directDiagnostic(id, `${reason}时的路径检查快照`);
    describeCandidateChecks(report).forEach(line => directDiagnostic(id, line));
  } catch { directDiagnostic(id, `${reason}时无法读取路径检查统计（连接可能已释放）`); }
}

/** Read the selected pair once when connected, without a permanent stats polling loop. */
export async function recordSelectedPair(pc: RTCPeerConnection, id: number): Promise<void> {
  try {
    const report = await pc.getStats();
    if (pc.connectionState === 'closed') return;
    let pairId: string | undefined;
    report.forEach(stat => { if (stat.type === 'transport' && stat.selectedCandidatePairId) pairId = stat.selectedCandidatePairId; });
    let pair = pairId ? report.get(pairId) : undefined;
    if (!pair) report.forEach(stat => {
      if (stat.type === 'candidate-pair' && stat.nominated && stat.state === 'succeeded') pair = stat;
    });
    if (!pair) { directDiagnostic(id, '已连接；浏览器未提供选中路径'); return; }
    directDiagnostic(id, `选中路径 ${endpoint(report, pair.localCandidateId)} → ${endpoint(report, pair.remoteCandidateId)}；地址信息不代表 UU 路由证明`);
  } catch { directDiagnostic(id, '浏览器未提供连接路径统计'); }
}
