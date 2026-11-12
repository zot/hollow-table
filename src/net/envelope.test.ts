// CRC: crc-Envelope.md | Test: test-Crypto.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, make } from './envelope.ts';
import { ridOf, type Receipt, type Sticky } from '../model/records.ts';
import { marks, parse, serialize } from '../text/marks.ts';

const receipt = (title: string, v: number): Receipt => ({ id: 'r1', at: 1, title, resolution: '4', level: 'Minor',
  outcome: 'success', dice: [{ c: 'W', v, added: false, dropped: false }] });
const sticky = (text: string): Sticky => ({ kind: 'sticky', oid: '00000008', place: { x: 0, y: 0, z: 0, tilt: 0 }, text });

test('hostile envelopes are dropped', () => {
  // A die showing 7 drops the roll.
  assert.ok(check(make('roll', 'tab-a', { n: 1, receipt: receipt('Sam', 4), sealed: {} })));
  assert.equal(check(make('roll', 'tab-a', { n: 1, receipt: receipt('Sam', 7), sealed: {} })), null);
  // At most 40 dice.
  const dice = (n: number) => ({ ...receipt('Sam', 4), dice: Array.from({ length: n }, () => ({ c: 'Y' as const, v: 2, added: false, dropped: false })) });
  assert.ok(check(make('roll', 'tab-a', { n: 1, receipt: dice(40), sealed: {} })));
  assert.equal(check(make('roll', 'tab-a', { n: 1, receipt: dice(41), sealed: {} })), null);

  // Markup in a name is kept as text.
  const evil = '<img src=x onerror=alert(1)>';
  assert.equal((check(make('roll', 'tab-a', { n: 2, receipt: receipt(evil, 4), sealed: {} }))!.body as { receipt: Receipt }).receipt.title, evil);

  // A move with 9 items.
  const item = (i: number) => ({ rid: ridOf('0000000' + i), x: i, y: 0, z: 0 });
  assert.ok(check(make('move', 'tab-a', { s: 5, items: [1, 2, 3, 4, 5, 6, 7, 8].map(item) })));
  assert.equal(check(make('move', 'tab-a', { s: 5, items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(item) })), null);

  // A record failing check drops the batch.
  const batch = (rec: unknown) => make('recs', 'gm', { g: 3, full: false, puts: [{ rid: ridOf('00000008'), s: 9, rec }], dels: [], sealed: {} });
  assert.ok(check(batch(sticky('ok'))));
  assert.equal(check(batch({ ...sticky('ok'), script: 'x' })), null);
  assert.equal(check(batch({ ...sticky('ok'), oid: '00000009' })), null, "an oid that isn't its rid");

  // Text with <script> and an attributed tag passes, and stays plain text.
  const text = 'Hi <script>alert(1)</script> and <act class="x">A: 1</act>';
  const got = check(batch(sticky(text)))!.body as { puts: { rec: Sticky }[] };
  const lines = parse(got.puts[0]!.rec.text);
  assert.deepEqual(marks(lines), []);
  assert.equal(serialize(lines), text);

  // Not a message at all.
  for (const junk of ['not json', { ...make('sync', 'a', {}), v: 2 }, '{"v":1,"kind":"nope","tab":"a","at":1,"body":{}}', null, [], { ...make('sync', 'a', {}), extra: 1 }]) {
    assert.equal(check(junk), null, JSON.stringify(junk));
  }
  assert.ok(check(JSON.stringify(make('sync', 'a', {}))), 'a JSON string is read too');
});
