'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { bundleSummary, captureBundle, decodeBundle, restoreBundle, type SaveBundle } from '@/game/platform/taptap/SaveBundle';
import { cloudError, downloadCloud, uploadCloud } from '@/game/platform/taptap/TapCloudApi';
import { saveStyles } from './saveStyles';

type Action = 'upload' | 'download';
type Dialog = {
  action: Action;
  phase: 'choose' | 'loading' | 'confirm' | 'busy' | 'success' | 'error';
  bundle?: SaveBundle;
  message?: string;
};

function SaveIcon({ action }: { action: Action }) {
  return <svg className="tap-save-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 17H5a4 4 0 0 1-.5-8A7 7 0 0 1 18 7a5 5 0 0 1 1 10h-1" />
    {action === 'upload' ? <path d="M12 21V12m-3 3 3-3 3 3" /> : <path d="M12 12v9m-3-3 3 3 3-3" />}
  </svg>;
}

export default function TapTapSaveControls({ onModalChange }: {
  onModalChange: (open: boolean) => void;
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const cancelButton = useRef<HTMLButtonElement | null>(null);
  const mounted = useRef(true);
  const working = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!dialog) return;
    if (dialog.phase === 'loading' || dialog.phase === 'busy') panel.current?.focus();
    else cancelButton.current?.focus();
  }, [dialog]);

  const open = async (action: Action) => {
    if (working.current) return;
    setDialog({ action, phase: 'loading' });
    working.current = true;
    try {
      const bundle = action === 'upload' ? captureBundle() : decodeBundle(await downloadCloud());
      if (mounted.current) setDialog({ action, phase: 'confirm', bundle });
    } catch (error) {
      if (mounted.current) setDialog({ action, phase: 'error', message: cloudError(error) });
    } finally { working.current = false; }
  };

  const close = () => {
    if (working.current) return;
    if (dialog?.phase === 'success' && dialog.action === 'download') {
      // 整页重载清掉传承、首次复活资格和菜单快照等内存缓存，避免旧会话覆盖导入值。
      window.location.reload();
      return;
    }
    setDialog(null);
    onModalChange(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };

  const confirm = async () => {
    if (!dialog?.bundle || working.current) return;
    const current = dialog;
    const bundle = dialog.bundle;
    working.current = true;
    setDialog({ ...current, phase: 'busy' });
    try {
      if (current.action === 'upload') await uploadCloud(JSON.stringify(bundle), bundleSummary(bundle));
      else restoreBundle(bundle);
      if (mounted.current) setDialog({ ...current, phase: 'success' });
    } catch (error) {
      if (mounted.current) setDialog({ ...current, phase: 'error', message: cloudError(error) });
    } finally { working.current = false; }
  };

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const waiting = dialog?.phase === 'loading' || dialog?.phase === 'busy';
  return <>
    <style>{saveStyles}</style>
    <button ref={trigger} aria-haspopup="dialog" onClick={() => {
      onModalChange(true);
      setDialog({ action: 'upload', phase: 'choose' });
    }}><SaveIcon action="upload" />云存档</button>
    {dialog && createPortal(<div className="tap-save-mask">
      <div ref={panel} tabIndex={-1} className="tap-save-panel" role="dialog" aria-modal="true" aria-labelledby="tap-save-title" aria-describedby="tap-save-description" aria-busy={waiting} onKeyDown={keys}>
        <div className="tap-save-emblem"><SaveIcon action={dialog.action} /></div>
        <h3 id="tap-save-title">{dialog.phase === 'choose' ? '云存档' : dialog.action === 'upload' ? '备份这座岛' : '找回这座岛'}</h3>
        <p className="tap-save-subtitle">TAPTAP · 手动云存档</p>
        {dialog.bundle && <p className="tap-save-summary">{dialog.action === 'upload' ? '本地进度' : '云端备份'}<br />{bundleSummary(dialog.bundle)}</p>}
        <div id="tap-save-description" aria-live="polite">
          {dialog.phase === 'choose' && <>
            <p className="tap-save-copy">手动备份岛屿进度、全局配置与荒岛传承。</p>
            <div className="tap-save-choices">
              <button onClick={() => void open('upload')}><SaveIcon action="upload" /><span>上传存档<small>把本机数据备份到云端</small></span></button>
              <button onClick={() => void open('download')}><SaveIcon action="download" /><span>下载存档<small>查看云端备份，确认后覆盖</small></span></button>
            </div>
          </>}
          {dialog.phase === 'loading' && <p className="tap-save-copy">正在读取存档，请稍候…</p>}
          {dialog.phase === 'confirm' && <>
            <p className="tap-save-copy">{dialog.action === 'upload'
              ? '将岛屿进度、名字与形象、传承点数和已解锁节点，以及音量、任务指引、画面缩放等全局配置一起备份到 TapTap。'
              : '将用这份备份覆盖本机的岛屿进度、名字与形象、传承点数和已解锁节点，以及音量、任务指引、画面缩放等全局配置。'}</p>
            {dialog.bundle?.entries['island.save.v1'] === null && <p className="tap-save-copy tap-save-warning">这份备份只有全局数据，没有进行中的岛屿。读取它会清除当前本地岛屿存档。</p>}
            <p className="tap-save-copy tap-save-warning">{dialog.action === 'upload'
              ? '会替换上一次手动上传的云存档。本地进度不变，之后的游玩不会自动上传。'
              : '覆盖后，当前本地数据将被替换，不能撤销。云端备份保持不变。'}</p>
          </>}
          {dialog.phase === 'busy' && <p className="tap-save-copy">{dialog.action === 'upload' ? '正在上传，请不要关闭游戏…' : '正在写入，请不要关闭游戏…'}</p>}
          {dialog.phase === 'error' && <p className="tap-save-copy tap-save-warning" role="alert">{dialog.message}</p>}
          {dialog.phase === 'success' && <p className="tap-save-copy">{dialog.action === 'upload'
            ? '上传成功，下次可手动下载这份备份。'
            : '存档与全局配置已覆盖。返回主界面后会重新载入。'}</p>}
        </div>
        <div className="tap-save-actions">
          <button ref={cancelButton} disabled={waiting} onClick={close}>{dialog.phase === 'success' ? (dialog.action === 'download' ? '返回主界面' : '完成') : dialog.phase === 'choose' ? '关闭' : dialog.phase === 'error' ? '返回' : '取消'}</button>
          {dialog.phase === 'confirm' && <button className="tap-save-primary" onClick={() => void confirm()}>{dialog.action === 'upload' ? '确认上传' : '确认覆盖并读取'}</button>}
        </div>
      </div>
    </div>, document.body)}
  </>;
}
