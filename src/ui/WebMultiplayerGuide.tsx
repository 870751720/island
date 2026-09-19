import { useState } from 'react';
import { writeClipboardText } from '@/platform/compat';
import { buildWebInviteUrl } from './roomInvite';

/** 不支持直连时保留玩家选择，提供可复制的系统浏览器入口。 */
export function WebMultiplayerGuide({ roomCode = '' }: { roomCode?: string }) {
  const [message, setMessage] = useState('');
  const url = buildWebInviteUrl(roomCode);
  return <div role="note" style={{ padding: 12, borderRadius: 12, background: '#eef5fa', color: '#25475b', fontSize: 14 }}>
    <p>请复制链接，粘贴到手机系统浏览器打开网页版。服务器中转仍可选择，但免费房间数量有限。</p>
    <button type="button" style={{ minHeight: 44, padding: '10px 16px', cursor: 'pointer' }} onClick={async () => {
      try { await writeClipboardText(url); setMessage('链接已复制，请粘贴到手机系统浏览器打开'); }
      catch { setMessage('未能自动复制，请长按下方链接复制'); }
    }}>复制网页版链接</button>
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '12px 0', overflowWrap: 'anywhere', userSelect: 'text', WebkitUserSelect: 'text' }}>{url}</a>
    {message && <p role="status">{message}</p>}
  </div>;
}
