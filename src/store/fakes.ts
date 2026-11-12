// CRC: crc-GameStore.md | Test: test-GameStore.md
// Test doubles for the store: a clock that moves only when told, and localStorage in memory.

import type { Clock, KeyValue } from './gamestore.ts';

/** A clock that moves only when told; timers fire as it passes them. */
export function fakeClock(start = Date.UTC(2026, 10, 12, 16, 36, 31)) {
  let now = start, next = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const clock: Clock = {
    now: () => now,
    setTimeout: (fn, ms) => { timers.set(++next, { at: now + ms, fn }); return next; },
    clearTimeout: h => { timers.delete(h as number); },
  };
  const advance = (ms: number) => {
    now += ms;
    for (const [h, t] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
      if (t.at <= now) { timers.delete(h); t.fn(); }
    }
  };
  return { clock, advance };
}

export function memoryStorage(): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } };
}
