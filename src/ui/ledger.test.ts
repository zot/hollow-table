// CRC: crc-Ledger.md | Test: test-Ledger.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { named, newGame, offer, stamp } from './ledger.ts';

const at = new Date(2026, 10, 12, 14, 3, 22).getTime();

test("the Ledger's words", () => {
  // R291: entries dated "Nov 12, 14:03:22"; Checkpoint offers "Round N, hh:mm:ss", blank is
  // "Checkpoint", cancel makes none; New game is named for when it was made.
  assert.equal(stamp(at), 'Nov 12, 14:03:22');
  assert.equal(offer(3, at), 'Round 3, 14:03:22');
  assert.equal(named('  '), 'Checkpoint');
  assert.equal(named(' Before the duel '), 'Before the duel');
  assert.equal(named(null), null);
  assert.equal(newGame(at), 'New game Nov 12, 14:03:22');
});
