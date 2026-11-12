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

test('"You are" offers the GM, the players present and the defaults, never open', () => {
  // R153.
  assert.deepEqual(viewAsChoices(['Sam'], ['GM', 'open', 'Ann', 'Sam']), ['GM', 'Sam', 'Ann', 'Player 1', 'Player 2']);
});
