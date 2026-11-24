// CRC: crc-Connections.md | Test: test-Connections.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GM, type Character, type Connections, type Opinion } from '../model/records.ts';
import { awaits, cardName, cell, connection, opinionItems, published, recordsOn, first, groupOf, keep, level, order, reacted, reactionOf, recordOf, rename, respected, seed, set, synced } from './connections.ts';
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

test("a record's Connection", () => {
  assert.equal(connection('Reputation -Sig\nProfessional Respect (Composure) +Maj'), 1);
  assert.equal(connection('Old Friends +Sig (0)'), 2);
  assert.equal(connection('Reaction ?'), 0);
  assert.equal(connection('Grudge -Min\nFear -Maj'), -3);
  assert.equal(connection('Opinion 0'), 0);
});

test('the first meeting', () => {
  const t = seed('0000000a', at, DEVREUX), dev = card(DEVREUX), sam = card(SAM);
  const rec = (holder: string, text: string, oid = 'e0000001'): Opinion => ({ kind: 'opinion', oid, holder: id(t, holder), of: SAM, text });
  const eliza = [rec('Eliza', 'Old Friends +Sig')];
  assert.equal(first(t, eliza, id(t, 'Devreux'), id(t, 'Obed'), dev), 'Opinion -Min');
  assert.equal(first(t, eliza, id(t, 'Devreux'), SAM, dev, sam), 'Reputation +Sig\nProfessional Respect (Composure, Suasion, Tact) +Maj');
  assert.match(first(t, eliza, id(t, 'Jake'), SAM, dev, sam), /^Reputation -Sig\n/);
  assert.match(first(t, eliza, id(t, 'Jameson'), SAM, dev, sam), /^Reaction \?\n/);
  const two = [...eliza, rec('Beatrice', 'Respect +Maj', 'e0000002')];
  assert.match(first(t, two, id(t, 'Devreux'), SAM, dev, sam), /^Reputation \+Sig\n/);
  assert.match(first(t, two, id(t, 'Obed'), SAM, dev, sam), /^Reputation \+Maj\n/);
  const three = [...two, rec('Obed', 'Bad Blood -Ext', 'e0000003')];
  assert.match(first(t, three, id(t, 'Maggie'), SAM, dev, sam), /^Reputation -Ext\n/);
  assert.equal(respected('Reaction ?\nProfessional Respect (Suasion, Tact) +Maj', sam.front), 'Reaction ?\nProfessional Respect (Suasion, Tact) +Min');
  assert.equal(respected('Reaction ?\nProfessional Respect () +Maj', sam.front), 'Reaction ?');
  const mine: Opinion = { kind: 'opinion', oid: 'e0000004', holder: id(t, 'Devreux'), of: SAM, text: 'Reputation +Sig' };
  assert.equal(synced(t, mine).cells[`${id(t, 'Devreux')}>${SAM}`], 2);
  assert.equal(synced(t, { ...mine, text: 'Reaction ?' }).cells[`${id(t, 'Devreux')}>${SAM}`], 0);
});


test('a Reaction', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(reactionOf), [-2, -1, 0, 0, 1, 2]);
  const text = 'Reaction ?\nProfessional Respect (Tact) +Min';
  assert.equal(awaits(text), true);
  assert.equal(awaits('Reaction +Min'), false);
  assert.equal(reacted(text, 1), 'Reaction +Min\nProfessional Respect (Tact) +Min');
  assert.equal(reacted('  Reaction ?  ', -2), 'Reaction -Sig');
  assert.equal(reacted('Reputation +Sig', 1), 'Reputation +Sig');
  const t = seed('0000000a', at, DEVREUX), dev = card(DEVREUX);
  const mine: Opinion = { kind: 'opinion', oid: 'e0000001', holder: id(t, 'Devreux'), of: SAM, text };
  assert.equal(recordOf([mine], t, dev, SAM), mine);
  const g = { ...t, rows: [...t.rows, { id: 'c0000099', name: 'Unton folk', group: true as const }] };
  const ours: Opinion = { ...mine, oid: 'e0000002', holder: 'c0000099' };
  assert.equal(recordOf([mine, ours], g, npc('00000020', 'Hank', '<head>Hank (Unton folk)</head>'), SAM), ours);
});

test("a record's items and where it shows", () => {
  // R436-R438: lines are items keyed by the record; published once one is revealed; found by `on` with no table.
  const t = seed('0000000a', at, DEVREUX), dev = card(DEVREUX);
  const rec: Opinion = { kind: 'opinion', oid: 'e0000001', holder: id(t, 'Devreux'), of: SAM, text: 'Reputation +Sig\n\nGrudge -Min' };
  assert.deepEqual(opinionItems(rec).map(e => [e.key, e.cat]), [['oe0000001:Reputation +Sig', 'opinions'], ['oe0000001:Grudge -Min', 'opinions']]);
  const chars = [dev, card(SAM)];
  assert.deepEqual(published(t, chars, rec), rec, 'nothing shown: nothing published');
  const shown = published(t, chars, { ...rec, shown: ['Grudge -Min'] });
  assert.deepEqual([shown.on, shown.name], [[DEVREUX], 'Sam']);
  const g = { ...t, rows: [...t.rows, { id: 'c0000099', name: 'Unton folk', group: true as const }] };
  const front = (c: Character) => ({ ...c, front: c.front.replace(/^<head>([^<]*)<\/head>/, '<head>$1 (Unton folk)</head>') });
  const hank = npc('00000020', 'Hank', '<head>Hank (Unton folk)</head>'), members = [front(dev), hank, card(SAM)];
  const ours = published(g, members, { ...rec, holder: 'c0000099', shown: ['Grudge -Min'] });
  assert.deepEqual(ours.on, [DEVREUX, '00000020']);
  assert.deepEqual(recordsOn([ours], hank), [ours], 'a player finds it by `on`');
  assert.deepEqual(recordsOn([ours], card(SAM)), []);
});

test('the name on a card', () => {
  // R566: the first line's words before a group and before the first comma, marks left out.
  assert.equal(cardName('<head>Mistress Devreux (Unton folk), Rank 3</head>\nSkills'), 'Mistress Devreux');
  assert.equal(cardName('<head>Samuel Diamond, Rank 3</head>'), 'Samuel Diamond');
  assert.equal(cardName('<head>Name, Rank _</head>'), 'Name');
  assert.equal(cardName('<head>Devreux (Unton, folk)</head>'), 'Devreux', 'a comma inside the group');
  assert.equal(cardName('<head>Devreux (Unt</head>'), 'Devreux', 'a group still being typed');
  assert.equal(cardName(''), '');
});

