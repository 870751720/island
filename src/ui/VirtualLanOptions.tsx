import { useId, useState, useSyncExternalStore } from 'react';
import { getVirtualLanAddress, setVirtualLanAddress, validVirtualLanAddress, getDirectDiagnostics, subscribeDirectDiagnostics } from '@/game/net/VirtualLan';
import styles from './VirtualLanOptions.module.css';

const EMPTY: string[] = [];
export function VirtualLanOptions({ disabled = false }: { disabled?: boolean }) {
  const id = useId();
  const [ip, setIp] = useState(getVirtualLanAddress);
  const logs = useSyncExternalStore(subscribeDirectDiagnostics, getDirectDiagnostics, () => EMPTY);
  const invalid = ip.trim() !== '' && !validVirtualLanAddress(ip.trim());
  return <details className={styles.panel}>
    <summary>UU 虚拟局域网（实验性） / 连接诊断</summary>
    <p>先在 UU 加入同一云联机房间。双方各填自己的虚拟 IPv4，再创建或加入游戏房间，仍需使用 6 位房间码。留空使用普通直连。</p>
    <label htmlFor={id}>本机 UU 虚拟 IP（不是朋友的 IP）</label>
    <input id={id} value={ip} disabled={disabled} inputMode="decimal" autoComplete="off" spellCheck={false}
      placeholder="例如 10.10.0.2" maxLength={15} aria-invalid={invalid} aria-describedby={`${id}-hint`}
      onChange={event => { setIp(event.target.value); setVirtualLanAddress(event.target.value); }} />
    <p id={`${id}-hint`}>{invalid ? '请输入有效的 IPv4；当前无效输入不会启用辅助连接。' : '仅本页临时使用，刷新需重填。修改后需重新连接；是否可用取决于浏览器和 UU 的网络支持。'}</p>
    <details><summary>查看诊断（可选中文字复制）</summary>
      <pre tabIndex={0}>{logs.length ? logs.join('\n') : '尚无 WebRTC 连接记录；创建房间后等待朋友加入。'}</pre>
    </details>
  </details>;
}
