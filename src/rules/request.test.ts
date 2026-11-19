// CRC: crc-Request.md | Test: test-Request.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Character } from '../model/records.ts';
import { givable, levelOf, transfer } from './request.ts';
import { DEVREUX, SAM, scene } from '../store/playtest.ts';

const card = (oid: string) => scene().find(r => r.oid === oid) as Character;
const withRes = (c: Character, res: string) => ({ ...c, front: c.front.replace(/<head>Resources<\/head>(\n<res>[^\n]*)*/, `<head>Resources</head>\n${res}`) });

test('a transfer', () => {
  // R440: the PC rises to the Success Level by what the NPC can give; the rest is extra.
  const dev = withRes(card(DEVREUX), '<res>Money +Ext</res>\n<res>Ammo +Min</res>'), sam = withRes(card(SAM), '<res>Money +Min</res>');
  assert.deepEqual(givable(dev, sam, 3), ['Money', 'Ammo']);
  const money = transfer(dev, sam, 'Money', 3)!;
  assert.deepEqual([money.moved, money.extra, levelOf(money.pc.front, 'money'), levelOf(money.npc.front, 'Money')], [2, 0, 3, 2]);
  assert.match(money.pc.front, /<res>Money \+Maj<\/res>/);
  assert.match(money.npc.front, /<res>Money \+Sig<\/res>/);
  const ammo = transfer(dev, sam, 'Ammo', 3)!;
  assert.deepEqual([ammo.moved, ammo.extra], [1, 2]);
  assert.match(ammo.pc.front, /<res>Money \+Min<\/res>\n<res>Ammo \+Min<\/res>/, 'added under the Resources');
  assert.match(ammo.npc.front, /<res>Ammo \+0<\/res>/);
  assert.equal(transfer(dev, sam, 'Money', 1), null, 'Sam already has Min');
  assert.equal(transfer(dev, sam, 'Gold', 3), null);
});
