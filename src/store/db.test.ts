// CRC: crc-Db.md | Test: test-Db.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryDb } from './db.ts';

test('a transaction lands whole', async () => {
  const db = new MemoryDb();
  await assert.rejects(db.tx(['records'], 'readwrite', async t => {
    await t.put('records', ['g1', 'a'], 1);
    await t.put('records', ['g1', 'b'], 2);
    throw new Error('midway');
  }), /midway/);
  assert.deepEqual(await db.tx(['records'], 'readonly', t => t.all('records')), []);
  assert.equal(db.log.length, 0);

  await assert.rejects(db.tx(['records'], 'readonly', t => t.put('records', ['g1', 'a'], 1)), /readonly/);

  // One at a time: the second starts only after the first has landed.
  const slow = db.tx(['records'], 'readwrite', async t => {
    await new Promise(r => setTimeout(r, 10));
    await t.put('records', ['g1', 'a'], 1);
  });
  const seen = db.tx(['records'], 'readonly', t => t.get('records', ['g1', 'a']));
  await slow;
  assert.equal(await seen, 1);

  await db.tx(['records'], 'readwrite', async t => { await t.put('records', ['g2', 'a'], 9); await t.put('records', ['g1', 'c'], 3); });
  const g1 = await db.tx(['records'], 'readonly', t => t.all<number>('records', 'g1'));
  assert.deepEqual(g1.map(([k, v]) => [k, v]).sort(), [[['g1', 'a'], 1], [['g1', 'c'], 3]]);
});
