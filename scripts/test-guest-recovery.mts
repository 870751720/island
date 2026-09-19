import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync('src/ui/GuestRecovery.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness(hidden = false) {
  let now = 0, serial = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const listeners = new Map<string, () => void>();
  const guests: Guest[] = [];
  const recovered: Guest[] = [];
  let cancelled = 0;
  let cleanup: () => void = () => {};
  class Guest {
    disposed = false;
    welcome: unknown = null;
    onClosed = () => {};
    onRejected = () => {};
    onStarted = () => {};
    args: unknown[] = [];
    constructor() { guests.push(this); }
    async join(...args: unknown[]) { this.args = args; }
    dispose() { this.disposed = true; }
  }
  const events = {
    addEventListener: (event: string, fn: () => void) => listeners.set(event, fn),
    removeEventListener: (event: string) => listeners.delete(event),
  };
  const document = { ...events, hidden };
  const exports: any = {};
  vm.runInNewContext(code, {
    exports, document, window: events,
    setTimeout: (fn: () => void, delay: number) => { const id = ++serial; timers.set(id, { at: now + delay, fn }); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    require: (id: string) => {
      if (id === 'react') return { useState: (value: unknown) => [value, () => {}], useEffect: (fn: () => () => void) => { cleanup = fn(); } };
      if (id === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
      if (id.endsWith('/NetGuest')) return { NetGuest: Guest, loadLastRoom: () => ({ code: '12345', name: 'Alice', mode: 'relay' }) };
      if (id.endsWith('/playerProfile')) return { loadProfile: () => ({ gender: 'girl' }) };
      throw new Error(id);
    },
  });
  exports.GuestRecovery({ onRecovered: (guest: Guest) => recovered.push(guest), onCancel: () => { cancelled++; } });
  const advance = (ms: number) => {
    const end = now + ms;
    while (true) {
      const next = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    now = end;
  };
  return { guests, recovered, timers, advance, document, listeners, cleanup: () => cleanup(), cancelled: () => cancelled };
}

const hidden = harness(true);
hidden.advance(60_000);
assert.equal(hidden.guests.length, 0, 'do not retry in the background');
hidden.document.hidden = false;
hidden.listeners.get('visibilitychange')!();
assert.deepEqual(hidden.guests[0].args, ['12345', 'Alice', 'girl', 'relay']);
hidden.guests[0].onStarted();
assert.equal(hidden.recovered.length, 0, 'wait for complete welcome state');
hidden.guests[0].welcome = {};
hidden.guests[0].onStarted();
hidden.cleanup();
assert.equal(hidden.recovered.length, 1);
assert.equal(hidden.guests[0].disposed, false, 'handed-off connection survives component unmount');
assert.equal(hidden.timers.size, 0);

const retry = harness();
retry.guests[0].onClosed();
retry.advance(2000);
assert.equal(retry.guests.length, 2);
retry.guests[0].onStarted();
assert.equal(retry.recovered.length, 0, 'late callbacks cannot restore an obsolete attempt');
retry.cleanup();
retry.advance(100_000);
assert.equal(retry.guests.length, 2);
assert.ok(retry.guests.every(guest => guest.disposed));
assert.equal(retry.timers.size, 0);

const exhausted = harness();
exhausted.advance(112_000);
assert.equal(exhausted.guests.length, 3);
assert.equal(exhausted.cancelled(), 1, 'return to manual join after bounded retries');
exhausted.cleanup();
console.log('Guest recovery: foreground resume, full welcome, retry, cancellation and stale callbacks passed.');
