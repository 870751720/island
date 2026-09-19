import { useState } from 'react';
import { writeClipboardText } from '@/platform/compat';
import { buildWebInviteUrl } from './roomInvite';
import styles from './WebMultiplayerGuide.module.css';

/** 不支持直连时保留玩家选择，提供可复制的系统浏览器入口。 */
export function WebMultiplayerGuide({ roomCode = '' }: { roomCode?: string }) {
  if (process.env.NEXT_PUBLIC_XHS_EXPORT === '1') return null;
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [copying, setCopying] = useState(false);
  const url = buildWebInviteUrl(roomCode);
  return <div role="note" className={styles.guide}>
    <strong className={styles.title}>在浏览器中继续好友直连</strong>
    <p className={styles.description}>复制网页版链接，粘贴到手机系统浏览器打开{roomCode ? '，房间码会自动填入' : ''}。</p>
    <button type="button" className={styles.copy} disabled={copying} onClick={async () => {
      setCopying(true);
      setFailed(false);
      try { await writeClipboardText(url); setMessage('已复制，去手机浏览器粘贴打开'); }
      catch { setFailed(true); setMessage('自动复制未成功，请长按下方文字复制'); }
      finally { setCopying(false); }
    }}>{copying ? '正在复制…' : '复制网页版链接'}</button>
    {message && <p className={styles.message} role="status">{message}</p>}
    {failed && <textarea className={styles.fallback} readOnly aria-label="手动复制网页版链接" value={url} onFocus={event => event.currentTarget.select()} />}
  </div>;
}
