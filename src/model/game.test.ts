// CRC: crc-Game.md | Test: test-Game.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, Refused } from './game.ts';
import { ridOf, type Character, type Yards } from './records.ts';
import { DEVREUX, SAM, playtest } from '../store/playtest.ts';

test('one door for change', () => {
  const game = new Game();
  game.load(playtest());
  const heard: string[][] = [];
  const stop = game.listen(rids => heard.push([...rids].sort()));
  const devreux = game.get(ridOf(DEVREUX)) as Character, sam = game.get(ridOf(SAM)) as Character;
  const yards = game.get('yards') as Yards;

  // A burial and a move in one change: heard once, with every rid.
  game.change(w => {
    w.put(ridOf(DEVREUX), { ...devreux, card: { ...devreux.card, x: devreux.card.x + 10 } });
    w.del(ridOf(SAM));
    w.put('yards', { yards: [{ ...yards.yards[0]!, items: [{ name: 'Sam', records: [sam] }] }] });
  });
  assert.deepEqual(heard, [[ridOf(DEVREUX), ridOf(SAM), 'yards'].sort()]);
  assert.equal(game.get(ridOf(SAM)), undefined);

  // A refused put drops the whole change, the put before it included.
  const before = game.get(ridOf(DEVREUX));
  assert.throws(() => game.change(w => {
    w.put(ridOf(DEVREUX), { ...devreux, name: 'Moved' });
    w.put('meta', { round: -1, rolls: 0 } as never);
  }), Refused);
  assert.equal(game.get(ridOf(DEVREUX)), before);
  assert.equal(heard.length, 1);

  // A put equal to what is there is not a change.
  game.change(w => w.put('meta', { round: 0, rolls: 0 }));
  assert.equal(heard.length, 1);

  // load is heard with every rid, old and new.
  game.load([['meta', { round: 1, rolls: 0 }]]);
  const all = heard[1]!;
  assert.ok(all.includes('meta') && all.includes(ridOf(DEVREUX)) && all.includes('yards'));

  stop();
  game.change(w => w.put('meta', { round: 2, rolls: 0 }));
  assert.equal(heard.length, 2);
});
