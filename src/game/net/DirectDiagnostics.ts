import { directDiagnostic } from './VirtualLan';

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
    const endpoint = (candidateId: string) => {
      const candidate = report.get(candidateId);
      return candidate ? `${candidate.address ?? candidate.ip ?? '地址隐藏'}:${candidate.port ?? '?'} (${candidate.candidateType ?? '?'})` : '未知';
    };
    directDiagnostic(id, `选中路径 ${endpoint(pair.localCandidateId)} → ${endpoint(pair.remoteCandidateId)}；地址信息不代表 UU 路由证明`);
  } catch { directDiagnostic(id, '浏览器未提供连接路径统计'); }
}
