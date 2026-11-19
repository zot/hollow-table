// CRC: crc-Build.md | Test: test-Build.md | R452
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { probe, report, type Socket } from './relays.ts';

/** A socket that does what `script` says once it is made. */
function fake(script: (s: Socket) => void): (url: string) => Socket {
  return () => {
    const s: Socket = { onopen: null, onmessage: null, onerror: null, onclose: null, send() {}, close() {} };
    queueMicrotask(() => script(s));
    return s;
  };
}

test('which relays answer', async () => {
  // R452.
  const answers = fake(s => { s.onopen?.(); queueMicrotask(() => s.onmessage?.({ data: JSON.stringify(['EOSE', 'probe']) })); });
  const refuses = fake(s => s.onerror?.({ message: 'non-101 status code' }));
  const silent = fake(s => s.onopen?.());
  const a = await probe('wss://a', answers, 50), b = await probe('wss://b', refuses, 50), c = await probe('wss://c', silent, 50);
  assert.equal(a.ok, true, 'EOSE: it answers');
  assert.deepEqual([b.ok, b.why], [false, 'refused: non-101 status code']);
  assert.equal(c.ok, false);
  assert.match(c.why!, /^connected, no answer in /);
  const lines = report([c, a, b], ['wss://b', 'wss://a']);
  assert.match(lines[0]!, /^\* wss:\/\/a +answers/, 'the pinned first, answering ones first');
  assert.match(lines[1]!, /^\* wss:\/\/b +refused/);
  assert.match(lines[2]!, /^  wss:\/\/c +connected, no answer/);
});
