// CRC: crc-Presence.md | Test: test-Presence.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Presence, OFFLINE_MS, fromUrl, invite, newRoom } from './presence.ts';
import { FakeRoom } from './fakeroom.ts';
import { fakeClock } from '../store/fakes.ts';

test('who is at the table', async () => {
  const room = new FakeRoom(), { clock, advance } = fakeClock();
  const heard: string[] = [];
  const page = (tab: string, name: string, role: 'gm' | 'player') => new Presence({
    net: room.link({ tab, browser: `b-${tab}`.padEnd(20, 'x'), sealKey: '' }), clock, role, name,
    here: p => heard.push(`${tab} hears ${p.name}`),
  });
  const gm = page('gm', 'GM', 'gm');
  const dana = page('dana', 'Dana', 'player');
  await room.settle();
  assert.deepEqual([...gm.people.values()].map(p => [p.name, p.role]), [['Dana', 'player']]);
  assert.deepEqual([...dana.people.values()].map(p => [p.name, p.role]), [['GM', 'gm']]);
  assert.ok(heard.includes('gm hears Dana'));
  assert.ok(room.log.filter(m => m.kind === 'here').every(m => m.to), 'answers go to the greeter only');

  gm.rename('The Marshal');
  await room.settle();
  assert.deepEqual([...dana.people.values()].map(p => p.name), ['The Marshal']);

  // A closed connection is a goodbye.
  room.online('dana', false);
  assert.equal(gm.people.size, 0);

  // Live while a relay or a peer is reachable; offline after 15 s with neither.
  const state = () => gm.status.state;
  gm.start();
  room.online('gm', false);
  for (let t = 0; t < OFFLINE_MS - 1000; t += 1000) advance(1000);
  assert.equal(state(), 'live');
  advance(1000);
  assert.equal(state(), 'offline');
  room.online('gm', true);
  advance(1000);
  assert.equal(state(), 'live');
});

test('rooms and invites', () => {
  const room = newRoom('The 11-08 playtest');
  assert.match(room, /^the-11-08-playtest-[0-9a-f]{32}$/);
  assert.notEqual(newRoom(), newRoom());
  const link = invite('https://zot.github.io/hollow-table/?test#x', room, 'A'.repeat(20));
  assert.equal(link, `https://zot.github.io/hollow-table/?room=${room}&gm=${'A'.repeat(20)}`);
  assert.deepEqual(fromUrl(new URL(link).search), { room, gm: 'A'.repeat(20) });
  assert.equal(fromUrl(''), null, 'the plain page is the GM');
  assert.equal(fromUrl('?room=x&gm=y'), null, 'a malformed invite is no invite');
});
