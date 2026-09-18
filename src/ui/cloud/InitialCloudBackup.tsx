'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Game } from '@/game/Game';
import { captureStartingCloudSave } from '@/game/cloud/StartCloudSave';
import { cloudError, uploadCloud } from '@/game/cloud/CloudApi';
import { saveStyles } from './saveStyles';

/** One explicitly consented upload after the initial world exists; never writes guest world data. */
export default function InitialCloudBackup({ code, ready, gameRef, guest }: {
  code: string;
  ready: boolean;
  gameRef: RefObject<Game | null>;
  guest: boolean;
}) {
  const snapshot = useRef<string | null>(null);
  const request = useRef<Promise<void> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'pending' | 'saved' | 'error' | 'hidden'>('pending');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!ready || !gameRef.current) return;
    let cancelled = false;
    if (!request.current) {
      request.current = (async () => {
        snapshot.current ??= captureStartingCloudSave(code, guest ? undefined : gameRef.current!.collectSave());
        await uploadCloud(code, snapshot.current);
      })();
    }
    request.current.then(() => {
      if (!cancelled) setStatus('saved');
    }, error => {
      if (!cancelled) { setError(cloudError(error)); setStatus('error'); }
    });
    return () => { cancelled = true; };
  }, [ready, code, guest, gameRef, attempt]);
  useEffect(() => {
    if (status !== 'saved') return;
    const timer = window.setTimeout(() => setStatus('hidden'), 5000);
    return () => window.clearTimeout(timer);
  }, [status]);
  if (!ready || status === 'hidden') return null;
  return <>
    <style>{saveStyles}{`.initial-cloud-notice{position:absolute;z-index:90;top:calc(62px + var(--game-safe-top));left:50%;transform:translateX(-50%);width:min(88%,360px);padding:12px 16px;border-radius:16px;background:#fffdf0f5;color:#41614d;box-shadow:0 4px 18px #122d3d33;text-align:center;font:13px/1.6 Arial,sans-serif}.initial-cloud-notice .cloud-save-actions{margin-top:8px}`}</style>
    <div className="initial-cloud-notice" role="status" aria-live="polite">
      {status === 'pending' ? '正在为你上传首次云存档…' : status === 'saved' ? '已上传一次云存档，之后请记得手动备份。' : `尚未确认云端保存成功：${error}`}
      {status === 'error' && <div className="cloud-save-actions">
        <button onClick={() => setStatus('hidden')}>稍后手动上传</button>
        <button onClick={() => { request.current = null; setStatus('pending'); setAttempt(value => value + 1); }}>重试本次备份</button>
      </div>}
    </div>
  </>;
}
