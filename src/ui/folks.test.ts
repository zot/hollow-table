// CRC: crc-Folks.md | Test: test-Folks.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrivalName, gmName, tags, viewAsChoices, type Here } from './folks.ts';

const at = (name: string, role: 'gm' | 'player', browser = `b-${name}`, stale = false): Here => ({ tab: `t-${name}`, name, role, browser, stale });

test('the GM first, then you, then the rest alphabetically', () => {
  // R293.
  const people = [at('Zed', 'player'), at('Boss', 'gm'), at('amy', 'player')];
  assert.deepEqual(tags({ name: 'Mo', gm: false, live: true }, people).map(t => t.name), ['Boss', 'Mo', 'amy', 'Zed']);
  assert.deepEqual(tags({ name: 'GM', gm: true, live: true }, [at('Zed', 'player'), at('amy', 'player')]).map(t => t.name), ['GM', 'amy', 'Zed']);
});

test('a quiet page dims and loses its glow; an offline page says so', () => {
  // R163, R293.
  const [, sam] = tags({ name: 'GM', gm: true, live: true }, [at('Sam', 'player', 'b', true)]);
  assert.equal(sam!.stale, true);
  assert.equal(sam!.live, false);
  const [me] = tags({ name: 'Sam', gm: false, live: false, why: 'No relay' }, []);
  assert.equal(me!.warn, 'offline');
  assert.equal(tags({ name: 'GM', gm: true, live: false }, [])[0]!.warn, undefined);
});

test("the GM's page marks someone holding another browser's name", () => {
  // R168, R293.
  const held = (n: string) => (n === 'Sam' ? 'b-real' : undefined);
  const gm = tags({ name: 'GM', gm: true, live: true }, [at('Sam', 'player', 'b-other'), at('Ann', 'player')], held);
  assert.deepEqual(gm.map(t => t.warn), [undefined, undefined, 'impostor']);
  assert.equal(tags({ name: 'GM', gm: true, live: true }, [at('Sam', 'player', 'b-real')], held)[1]!.warn, undefined);
  assert.equal(tags({ name: 'Ann', gm: false, live: true }, [at('Sam', 'player', 'b-other')], held)[1]!.warn, undefined);
});

test('names: the GM blank is "GM"; an arrival asks until it isn\'t "GM"', () => {
  // R293, R294.
  assert.equal(gmName('  ', 'Bill'), 'GM');
  assert.equal(gmName(null, 'Bill'), 'Bill');
  assert.equal(gmName('x'.repeat(40), 'GM').length, 32);
  assert.equal(arrivalName(null), 'Player');
  assert.equal(arrivalName('GM'), null);
  assert.equal(arrivalName(' '), null);
  assert.equal(arrivalName(' Sam '), 'Sam');
});

test('an arrival picks a held name in any case', () => {
  // R476: a held name typed in any case is that name as held; any other is a new name.
  assert.equal(arrivalName(' fred ', ['Fred']), 'Fred');
  assert.equal(arrivalName('Sam', ['Fred']), 'Sam');
  assert.equal(arrivalName('GM', ['Fred']), null);
});

test('"You are" offers the GM, the players present and the defaults, never open', () => {
  // R153.
  assert.deepEqual(viewAsChoices(['Sam'], ['GM', 'open', 'Ann', 'Sam']), ['GM', 'Sam', 'Ann', 'Player 1', 'Player 2']);
});

test('a page that is nobody says "not yours"; offline says more', () => {
  // R167, R296.
  assert.equal(tags({ name: 'Ann', gm: false, live: true, notYours: 'Ann is played from another browser' }, [])[0]!.warn, 'notyours');
  assert.equal(tags({ name: 'Ann', gm: false, live: false, why: 'No relay', notYours: 'Ann is played…' }, [])[0]!.warn, 'offline');
  assert.equal(tags({ name: 'Ann', gm: false, live: true }, [])[0]!.warn, undefined);
});

test('every page bars someone holding another browser\'s name', () => {
  // R445: Sam held by b-real; another browser came as Sam.
  const held = (n: string) => (n === 'Sam' ? 'b-real' : undefined);
  const barred = (me: { name: string; gm: boolean }, people: Here[]) => tags({ ...me, live: true }, people, held).map(t => t.impostor === true);
  assert.deepEqual(barred({ name: 'Ann', gm: false }, [at('Sam', 'player', 'b-other')]), [false, true], "Ann's page bars the other Sam");
  assert.deepEqual(barred({ name: 'GM', gm: true }, [at('Sam', 'player', 'b-other')]), [false, true], "and the GM's");
  assert.deepEqual(barred({ name: 'Sam', gm: false }, [at('Sam', 'player', 'b-other')]), [false, true], "and the real Sam's");
  assert.deepEqual(barred({ name: 'Ann', gm: false }, [at('Sam', 'player', 'b-real')]), [false, false], 'never the holder, in any tab');
  assert.equal(tags({ name: 'Ann', gm: false, live: true }, [at('Sam', 'player', 'b-other')], () => undefined)[1]!.impostor, undefined, 'not before the claims arrive');
});

test('a refused rename is said on your own tag', () => {
  // R469: offline says more, then "not yours", then a refusal.
  const [me] = tags({ name: 'Dana', gm: false, live: true, said: 'Ann is already at this table.' }, []);
  assert.deepEqual([me!.name, me!.warn], ['Dana', 'said']);
  assert.equal(tags({ name: 'Dana', gm: false, live: true, notYours: 'x', said: 'y' }, [])[0]!.warn, 'notyours');
});
