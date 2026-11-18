// CRC: crc-Connections.md | Test: test-Connections.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GM, type Character, type Connections } from '../model/records.ts';
import { cell, groupOf, keep, level, order, rename, seed, set } from './connections.ts';
import { DEVREUX, SAM, scene } from '../store/playtest.ts';

const records = scene();
const card = (oid: string) => records.find(r => r.oid === oid)! as Character;
const at = { x: 0, y: 0, z: 0, tilt: 0 };
const npc = (oid: string, name: string, front = `<head>${name}</head>`): Character => ({ ...card(DEVREUX), oid, owner: GM, name, front });
const names = (t: Connections) => t.rows.map(r => r.name);
const id = (t: Connections, name: string) => t.rows.find(r => r.name === name)!.id;

test('Levels and groups', () => {
  assert.deepEqual([0, 1, -2, 3, -4, 5].map(level), ['0', '+Min', '-Sig', '+Maj', '-Ext', '+Exq']);
  assert.equal(groupOf('<head>Mistress Devreux (Unton folk), Rank 3</head>'), 'Unton folk');
  assert.equal(groupOf('<head>Mistress Devreux</head>\nCha 2 (Unton folk)'), undefined);
  assert.equal(groupOf('<head>Jake ( </head>'), undefined);
});

test('a row for every named NPC', () => {
  let t = seed('0000000a', at, DEVREUX);
  assert.equal(keep(t, card(DEVREUX), 'f0000001'), t);
  const hank = npc('00000011', 'Name');
  assert.equal(keep(t, hank, 'f0000001'), t);
  t = keep(t, { ...hank, name: 'Obed' }, 'f0000001');
  assert.equal(t.rows.find(r => r.name === 'Obed')!.oid, '00000011');
  assert.equal(t.rows.length, 8);
  t = keep(t, { ...hank, name: 'Mayor Obed' }, 'f0000001');
  assert.equal(t.rows.find(r => r.oid === '00000011')!.name, 'Mayor Obed');
  assert.equal(t.rows.length, 8);
  t = keep(t, npc('00000012', 'Hank', '<head>Hank (Gravediggers)</head>'), 'f0000002');
  t = keep(t, npc('00000013', 'Lou', '<head>Lou (Gravediggers), Rank 1</head>'), 'f0000003');
  assert.deepEqual(names(t).slice(8), ['Gravediggers']);
  assert.equal(t.rows[8]!.group, true);
  assert.equal(keep(t, card(SAM), 'f0000004'), t);
});

test('renaming a row', () => {
  const hank = npc('00000012', 'Hank', '<head>Hank (Gravediggers)</head>\nCha 2');
  const lou = npc('00000013', 'Lou', '<head>Lou (Gravediggers), Rank 1</head>');
  const chars = [card(DEVREUX), card(SAM), hank, lou];
  let t = keep(seed('0000000a', at, DEVREUX), hank, 'f0000002');
  const dig = rename(t, 'f0000002', 'Diggers', chars);
  assert.deepEqual(dig.changed.map(c => c.front), ['<head>Hank (Diggers)</head>\nCha 2', '<head>Lou (Diggers), Rank 1</head>']);
  assert.ok(names(dig.table).includes('Diggers'));
  const dev = rename(t, id(t, 'Devreux'), 'Madame Devreux', chars);
  assert.deepEqual(dev.changed.map(c => [c.oid, c.name]), [[DEVREUX, 'Madame Devreux']]);
  const jake = id(t, 'Jake'), gone = rename(t, jake, '', chars).table;
  assert.ok(!names(gone).includes('Jake'));
  assert.ok(Object.keys(gone.cells).every(k => !k.split('>').includes(jake)));
  t = set(t, id(t, 'Eliza'), id(t, 'Obed'), 3);
  assert.equal(cell(t, id(t, 'Eliza'), id(t, 'Obed')), 3);
  t = set(t, id(t, 'Eliza'), id(t, 'Obed'), 0);
  assert.ok(!(`${id(t, 'Eliza')}>${id(t, 'Obed')}` in t.cells));
  assert.deepEqual(order([{ name: 'jake' }, { name: 'Beatrice' }, { name: 'Eliza' }]).map(r => r.name), ['Beatrice', 'Eliza', 'jake']);
});

test('the seed is the book\'s table', () => {
  const t = seed('0000000a', at, DEVREUX);
  assert.deepEqual(names(t), ['Obed', 'Beatrice', 'Eliza', 'Maggie', 'Devreux', 'Jake', 'Jameson', 'Jephthah']);
  assert.equal(t.rows.find(r => r.name === 'Devreux')!.oid, DEVREUX);
  assert.equal(t.away, true);
  assert.equal(cell(t, id(t, 'Obed'), id(t, 'Beatrice')), 2);
  assert.equal(cell(t, id(t, 'Devreux'), id(t, 'Jake')), -2);
  assert.equal(cell(t, id(t, 'Jameson'), id(t, 'Jephthah')), -2);
  assert.equal(Object.values(t.cells).reduce((a, b) => a + b, 0), 0);
});
