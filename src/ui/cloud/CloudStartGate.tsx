'use client';

import { useEffect, useRef, useState } from 'react';
import { normalizeCode } from '../../../shared/cloudSave';
import { loadCloudCode, rememberCloudCode } from '@/game/cloud/CloudCode';
import { cloudError } from '@/game/cloud/CloudApi';
import { findStartingCloudSave, restoreStartingCloudSave } from '@/game/cloud/StartCloudSave';
import { bundleSummary, type SaveBundle } from '@/game/cloud/SaveBundle';
import { SaveSystem } from '@/game/systems/SaveSystem';
import { saveStyles } from './saveStyles';

type Phase = 'input' | 'checking' | 'choose' | 'empty' | 'skip' | 'restored';

/** This gate runs before any new-game clearing, room creation or world construction. */
export default function CloudStartGate({ onContinue, onCancel }: {
  onContinue: (backupCode?: string, useExistingLocal?: boolean) => void;
  onCancel: () => void;
}) {
  const [alreadyKnown] = useState(() => !!loadCloudCode());
  const passed = useRef(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('input');
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [cloud, setCloud] = useState<SaveBundle | null>(null);
  const [error, setError] = useState('');
  const [local] = useState(() => SaveSystem.load());
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (alreadyKnown && !passed.current) { passed.current = true; onContinue(); }
  }, [alreadyKnown, onContinue]);
  useEffect(() => { panel.current?.focus(); }, [phase]);

  const check = async () => {
    if (busy.current) return;
    let next: string;
    try { next = normalizeCode(input); } catch (error) { setError(cloudError(error)); return; }
    busy.current = true;
    setError('');
    setPhase('checking');
    try {
      const saved = await findStartingCloudSave(next);
      if (!mounted.current) return;
      setCode(next);
      setCloud(saved);
      setPhase(saved ? 'choose' : 'empty');
    } catch (error) {
      if (mounted.current) { setError(cloudError(error)); setPhase('input'); }
    } finally { busy.current = false; }
  };
  const useLocal = () => {
    if (passed.current) return;
    try {
      rememberCloudCode(code);
      passed.current = true;
      onContinue(code, !!cloud && !!local);
    } catch (error) { setError(cloudError(error)); }
  };
  const useCloud = () => {
    if (!cloud || passed.current) return;
    try {
      restoreStartingCloudSave(code, cloud);
      passed.current = true;
      setPhase('restored');
    } catch (error) { setError(cloudError(error)); }
  };
  if (alreadyKnown) return null;
  return <>
    <style>{saveStyles}</style>
    <div className="cloud-save-mask">
      <div ref={panel} tabIndex={-1} className="cloud-save-panel" role="dialog" aria-modal="true" aria-labelledby="start-cloud-title" aria-busy={phase === 'checking'} onKeyDown={event => {
        if (event.key === 'Escape' && phase !== 'checking' && phase !== 'restored') onCancel();
        if (event.key !== 'Tab') return;
        const fields = [...event.currentTarget.querySelectorAll<HTMLElement>('input, button:not(:disabled)')];
        const last = fields[fields.length - 1];
        if (event.shiftKey && document.activeElement === fields[0]) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); fields[0]?.focus(); }
      }}>
        <h3 id="start-cloud-title">{phase === 'choose' ? '找到云端存档' : phase === 'skip' ? '跳过可能丢失进度' : phase === 'restored' ? '云端存档已恢复' : '为你的岛留下存档码'}</h3>
        {phase === 'input' && <>
          <p className="cloud-save-copy">H5 本地数据容易丢失。请设置或输入原存档码（最多 20 位，区分大小写），一定要记住它，之后可凭码找回进度。</p>
          <p className="cloud-save-copy cloud-save-warning">知道同一码的人能读取和覆盖存档，请使用难猜的组合，不要告诉别人。</p>
          <label htmlFor="start-cloud-code">存档码</label>
          <input id="start-cloud-code" className="cloud-save-input" maxLength={20} value={input} autoComplete="off" autoCapitalize="off" spellCheck={false} onChange={event => setInput(event.target.value)} />
          <div className="cloud-save-actions"><button onClick={() => { setError(''); setPhase('skip'); }}>暂时跳过</button><button className="cloud-save-primary" onClick={() => void check()}>检查存档码</button></div>
        </>}
        {phase === 'checking' && <p className="cloud-save-copy">正在检查云端存档，请稍候…</p>}
        {phase === 'choose' && cloud && <>
          <p className="cloud-save-summary">云端：{bundleSummary(cloud)}<br />本地：{local ? `第 ${local.day} 天` : '暂无岛屿进度'}</p>
          <p className="cloud-save-copy">使用云端：覆盖全部本地游戏数据，不上传。使用本地：进入游戏后上传一次，覆盖这个码的云档。</p>
          {!cloud.entries['island.save.v1'] && <p className="cloud-save-copy cloud-save-warning">云档没有进行中的岛屿，读取它会清除本地岛屿。</p>}
          <div className="cloud-save-actions"><button onClick={useLocal}>使用本地并覆盖云端</button><button className="cloud-save-primary" onClick={useCloud}>使用云端并覆盖本地</button></div>
        </>}
        {phase === 'empty' && <>
          <p className="cloud-save-copy">存档码：{code}<br />这个码还没有云档。是否同意进入游戏后上传一次全部游戏数据？之后仍需手动上传。</p>
          <div className="cloud-save-actions"><button onClick={() => setPhase('input')}>重新输入</button><button className="cloud-save-primary" onClick={useLocal}>同意并开始</button></div>
        </>}
        {phase === 'skip' && <>
          <p className="cloud-save-copy cloud-save-warning">跳过后只有本机保存，没有云端备份。H5 清理数据、换设备或重装后，进度可能永久丢失，无法找回。</p>
          <div className="cloud-save-actions"><button onClick={() => setPhase('input')}>返回填写</button><button onClick={() => { if (!passed.current) { passed.current = true; onContinue(); } }}>知道风险，仍然跳过</button></div>
        </>}
        {phase === 'restored' && <>
          <p className="cloud-save-copy">本地已替换为云端版本，没有上传或覆盖云档。返回主界面后即可继续该进度。</p>
          <div className="cloud-save-actions"><button className="cloud-save-primary" onClick={() => window.location.reload()}>返回主界面读取</button></div>
        </>}
        {error && <p className="cloud-save-copy cloud-save-warning" role="alert">{error}</p>}
        {phase !== 'checking' && phase !== 'restored' && <div className="cloud-save-actions"><button onClick={onCancel}>返回主界面</button></div>}
      </div>
    </div>
  </>;
}
