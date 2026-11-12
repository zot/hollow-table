// CRC: crc-Stamps.md | Test: test-Stamps.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Stamps, SEQ_KEY } from './stamps.ts';
import { memoryStorage } from '../store/fakes.ts';

test('a deletion after a drag is not stale', () => {
  const gm = new Stamps(memoryStorage()), player = new Stamps(memoryStorage());
  const sticky = 'o:00000008';
  const last = gm.next();                                    // the sticky's last change
  player.mark(sticky, 'gm', last);
  for (let i = 0; i < 4; i++) player.mark(sticky, 'gm', gm.next());   // the drag to the bar
  assert.equal(player.fresh(sticky, 'gm', last), false, "the piece's last number is stale now (the 11-11 bug)");
  assert.equal(player.fresh(sticky, 'gm', gm.next()), true, 'the deletion, under a fresh number');
});

test('the counter continues across a reload', () => {
  const storage = memoryStorage();
  const a = new Stamps(storage);
  a.next(); a.next();
  assert.equal(storage.data.get(SEQ_KEY), '2');
  assert.equal(new Stamps(storage).next(), 3);
});
