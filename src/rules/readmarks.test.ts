// CRC: crc-MarkReader.md | Test: test-MarkReader.md
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { action, adjust, attributes, defend, influence, motiveLeft, offer, spend, unadjusted } from './readmarks.ts';
import { field, pointed, points, skillsLine, suffered, variants, type Point } from './readmarks.ts';
import { BEAUFORD_FRONT } from '../store/playtest.ts';

test('action lines', () => {
  const rows: [string, string, number, number, number][] = [
    ['Mental Atk / Req: 5, 2d+3', 'Mental Atk / Req', 5, 2, 3],
    ['Mental Atk / Req: 2, +2', 'Mental Atk / Req', 2, 0, 2],
    ['Mental Atk / Req: 5, 1d', 'Mental Atk / Req', 5, 1, 0],
    ['Tricky -Min: 5, 2d', 'Tricky -Min', 5, 2, 0],
    ['Shoot: 4, +2 (unfr, x 2)', 'Shoot', 4, 0, 2],
    ['Attack: 4 (Suasion, Charm), +1', 'Attack', 4, 0, 1],
    ['Attack: -1, -1', 'Attack', -1, 0, -1],
    ['With Finesse: 4, 1d+1', 'With Finesse', 4, 1, 1],
    ['Attack: 1, +0', 'Attack', 1, 0, 0],
    ['Infer: 4, +2', 'Infer', 4, 0, 2],
  ];
  for (const [text, label, base, yellows, bonus] of rows) assert.deepEqual(action(text), { label, base, yellows, bonus, att: 'Cha' }, text);
  // R337: the attribute, an entry in the line's parentheses; a word that only holds "int" is no mark.
  assert.deepEqual([
    action('Shoot: 4, +2 (unfr, x2, no att)')?.att, action('Expertise: 3, +1 (Int)')?.att,
    action('Recall: 3 (Accounting, INT), +1')?.att, action('Infer: 4 (Intuition), +2')?.att,
  ], [null, 'Int', 'Int', 'Cha']);
  for (const text of ['Defend: mental 2 / psych 4', 'Defend: 6 / 5', 'Sparked: 46  Grains: 14', 'Slots: Mild, Min ×3, Sig, Maj']) {
    assert.equal(action(text), null, text);
  }
});

test('Influence and Defend', () => {
  assert.deepEqual(influence('Money +Maj'), { name: 'Money', sign: 1, level: 'Maj' });
  assert.deepEqual(influence('Uncertain −Sig'), { name: 'Uncertain', sign: -1, level: 'Sig' });
  assert.deepEqual(influence('Distrust'), { name: 'Distrust', sign: null, level: null });
  assert.deepEqual(defend('2'), { mental: 2, psych: 2 });
  assert.deepEqual(defend('mental 2 / psych 4'), { mental: 2, psych: 4 });
  assert.deepEqual(defend('6 / 5'), { mental: 6, psych: 5 });
});

test('offers and spending', () => {
  assert.equal(offer('Infer: 4, +2'), 'act');
  assert.equal(offer('Money +Maj', 'Resources'), 'res');
  assert.equal(offer('Money +Maj', 'Items'), null);
  assert.equal(spend('Money +Maj (bank)', 1), 'Money +Sig (bank)');
});

test('a Motivation spends into its parentheses', () => {
  // R261: the written Level stays; the Levels left follow it, gone again when back to full.
  assert.equal(adjust('Keep the Peace +Sig', 1), 'Keep the Peace +Sig (+Min)');
  assert.equal(adjust('Keep the Peace +Sig (+Min)', 1), 'Keep the Peace +Sig (0)');
  assert.equal(adjust('Keep the Peace +Sig (0)', 1), null);
  assert.equal(adjust('Keep the Peace +Sig (0)', -1), 'Keep the Peace +Sig (+Min)');
  assert.equal(adjust('Keep the Peace +Sig (+Min)', -1), 'Keep the Peace +Sig');
  assert.equal(adjust('Keep the Peace +Sig', -1), 'Keep the Peace +Sig', 'never past full');
  assert.equal(adjust('Paranoia -Maj', 1), 'Paranoia -Maj (-Sig)');
  assert.equal(adjust('Keep the Peace (good for business) +Sig', 1), 'Keep the Peace (good for business) +Sig (+Min)');
  assert.deepEqual(['Faith +Min', 'Faith +Maj (+Min)', 'Faith +Maj (0)', 'Faith +Maj (−Sig)'].map(motiveLeft), [1, 1, 0, 2]);
  assert.equal(unadjusted('Faith +Maj (0)'), 'Faith +Maj');
  assert.equal(influence('Keep the Peace +Sig (0)')?.name, 'Keep the Peace');
});

test('a Motivation line is offered the Motivation pen', () => {
  // R258: `Name ±Level` under a Motivations heading, either sign.
  assert.equal(offer('Be Left Alone +Sig', 'Motivations'), 'mot');
  assert.equal(offer('Sparkers Are Trouble -Min', 'Motivation'), 'mot');
  assert.equal(offer('Money +Maj', 'Resources'), 'res');
  assert.equal(offer('Be Left Alone', 'Motivations'), null);
});

test('attributes', () => {
  // R267: `Name N` pairs, read from an `<att>` mark; a plain line of two or more is offered the pen.
  assert.deepEqual(attributes('Cha 2   Int 2   Wis 4'), { Cha: 2, Int: 2, Wis: 4 });
  assert.deepEqual(attributes('Con −1  Wis 10'), { Con: -1, Wis: 10 });
  assert.equal(offer('Cha 3   Int 1   Wis 3'), 'att');
  assert.equal(offer('Saloon Proprietor, Rank 3'), null);
  assert.equal(offer('Sparked: 46  Grains: 14'), null);
  assert.equal(offer('Wis 4'), null, 'one pair is not an attribute line');
});

// R323, R324: Fields and Skills, read from their marks.
const MARKED = `<head>Samuel Diamond, Rank 3</head>
<att>Cha 2   Int 2   Wis 4</att>
<fld>Private Investigator 2 (5XP)</fld>
<skl>Investigation (x2)</skl>
<skl>Fighting† (guns)</skl>
<fld>Sparker 2 (6XP)</fld>
<skl>✓ Glimmersense (x2) 3</skl>
<skl>Skills 1: Suasion (Detective), Tact</skl>
<act>Shoot: 4, +2 (unfr, x 2)</act>
<def>Defend: mental 2 / psych 4</def>
<head>Hollow Memories</head>
<skl>Wicked deeds</skl>`;

test('Fields, Skills and their pens', () => {
  assert.deepEqual(field('Private Investigator 2 (5XP)'), { name: 'Private Investigator', level: 2 });
  assert.equal(field('✓ Glimmersense (x2) 3'), null, 'a ✓ marks a Skill');
  assert.equal(field('Saloon Proprietor, Rank 3'), null, 'a Rank is no Field');
  assert.deepEqual(skillsLine('Skills 2: Profession (Saloon Keeper, Bar), Tact')!.skills.map(k => k.name), ['Profession (Saloon Keeper, Bar)', 'Tact']);
  // R207, R323, R324: the pens offered.
  assert.deepEqual([offer('Sparker 2 (6XP)'), offer('Skills 1: Suasion, Tact'), offer('Composure'), offer('Composure', null, true)],
    ['fld', 'skl', null, 'skl']);
});

test('what a drop can point at', () => {
  // R326, R336: Defend numbers, an action's Base, Fields and Skills at Level plus Cha (2), each where it is.
  const lines = MARKED.split('\n'), at = (p: Point) => lines[p.line]!.replace(/<\/?[a-z]+>/g, '').slice(p.start, p.end);
  const ps = points(MARKED);
  assert.deepEqual(ps.map(p => [at(p), p.base, p.words]), [
    ['Private Investigator 2 (5XP)', 4, 'Private Investigator 2 + Cha 2'],
    ['Investigation (x2)', 4, 'Investigation 2 + Cha 2'],
    ['Fighting† (guns)', 4, 'Fighting† (guns) 2 + Cha 2'],
    ['Sparker 2 (6XP)', 4, 'Sparker 2 + Cha 2'],
    ['✓ Glimmersense (x2) 3', 5, 'Glimmersense 3 + Cha 2'],
    ['Suasion (Detective)', 3, 'Suasion (Detective) 1 + Cha 2'],
    ['Tact', 3, 'Tact 1 + Cha 2'],
    ['4', 4, 'Shoot 4'],
    ['2', 2, 'mental 2'],
    ['4', 4, 'psych 4'],
  ]);
  // A Skill under a heading, not a Field, has no Level to point at.
  assert.ok(!ps.some(p => 'skl' in p.against && p.against.skl === 'Wicked deeds'));
  // A heading straight after a Field's Skills ends them: what follows has no Level.
  assert.deepEqual(points('<fld>Sparker 2 (6XP)</fld>\n<skl>Composure</skl>\n<head>Memories</head>\n<skl>Wicked deeds</skl>').map(p => p.words),
    ['Sparker 2 + Cha 0', 'Composure 2 + Cha 0']);
  assert.deepEqual(pointed(MARKED, { def: 'psych' })?.base, 4);
  assert.deepEqual(points('<att>Cha 1</att>\n<fld>Snakeoil Salesman 3 (5XP)</fld>\n<skl>Rhetoric (Salesman) (x2)</skl>\n<skl>Finesse (x2, Rhetoric)</skl>')
    .map(p => p.words), ['Snakeoil Salesman 3 + Cha 1', 'Rhetoric (Salesman) 3 + Cha 1', 'Finesse 3 + Cha 1'], "a Skill's XP note is not its name");
  assert.equal(pointed(MARKED, { act: 'Fly' }), null);
  // R336: the attribute the acting action uses: none adds nothing, Int adds the card's Int, and an
  // attribute the card doesn't list counts 0.
  assert.deepEqual([pointed(MARKED, { skl: 'Investigation' }, null), pointed(MARKED, { skl: 'Investigation' }, 'Int')].map(p => [p?.base, p?.words]),
    [[2, 'Investigation 2'], [4, 'Investigation 2 + Int 2']]);
  assert.deepEqual(points('<att>Cha 1</att>\n<fld>Snakeoil Salesman 3 (5XP)</fld>', 'Int').map(p => [p.base, p.words]), [[3, 'Snakeoil Salesman 3 + Int 0']]);
  assert.deepEqual(points('<def>Defend: 6 / 5</def>').map(p => [p.against, p.words]), [[{ def: 'mental' }, 'mental 6'], [{ def: 'psych' }, 'psych 5']]);
});

test('an action that suffers an Influence, and its variants', () => {
  // R352: a label with a sign and a Level is an Influence the action suffers.
  assert.deepEqual(suffered('Tricky -Min'), { name: 'Tricky', sign: -1, level: 'Min' });
  assert.deepEqual(suffered('Audience −Sig'), { name: 'Audience', sign: -1, level: 'Sig' });
  for (const plain of ['Mental Atk / Req', 'Shoot', 'Infer']) assert.equal(suffered(plain), null, plain);
  // R354, R355: Beauford's Tricky -Min, right under his Mental Atk / Req, varies it; the rest don't.
  assert.deepEqual(variants(BEAUFORD_FRONT), [{ line: 13, label: 'Tricky -Min', of: 'Mental Atk / Req' }]);
  // Two under one action both vary it; one after a plain line, or with no action above, doesn't.
  const front = '<act>Attack: 4, 1d</act>\n<act>Tricky -Min: 4, 2d</act>\n<act>Audience -Sig: 4, 1d</act>\nnotes\n<act>Lucky +Min: 3, 1d</act>';
  assert.deepEqual(variants(front).map(v => [v.line, v.of]), [[1, 'Attack'], [2, 'Attack']]);
});
