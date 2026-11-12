// Test fixture: the 11-08 playtest scene as records (Sam, Beauford, Devreux, Devreux's three
// Influences, Beauford's Stagger chip, the sticky and the reference card). Owners are parameters so
// each test can name its players.

import { damageSlots, type CardBack, type Character, type Chip, type Influence, type Oid, type PieceRecord, type Place, type RowName, type Sticky, type Reference } from '../model/records.ts';

export const SAM = '00000001', BEAUFORD = '00000002', DEVREUX = '00000003';

const at = (x: number, y: number): Place => ({ x, y, z: 0, tilt: 0 });

/**
 * An empty back, as on Samuel Diamond's card in *A Ghoulish Problem*: `boxes` extra Slots per Level
 * for Biases and Afflictions (Wis gives both, Hollow Folks *Absorbing Damage*); none for Injuries,
 * which come from Con, and Bunkum characters have no Con.
 */
export function back(boxes: Partial<Record<RowName, number>> = {}, notes = ''): CardBack {
  const damage = damageSlots((d, r) => {
    const extra = d === 'injury' ? 0 : boxes[r] ?? 0;
    return { name: '', boxes: Array<boolean>(extra).fill(false), spent: [] };
  });
  return { damage, absorb: { bias: 0, affliction: 0, injury: 0 }, notes };
}

function character(oid: Oid, owner: string, name: string, x: number, front: string, b: CardBack): Character {
  return { kind: 'character', oid, owner, name, pool: at(x, 20), card: at(x, 300), flipped: false, gathered: true, front, back: b };
}

export const SAM_FRONT = `<head>Samuel Diamond, Rank 3</head>
Cha 2   Int 2   Wis 4
Private Investigator 2 (5XP)
Investigation (x2)
Advocacy (x2)
Fighting† (guns)
Sparker 2 (6XP)
✓ Glimmersense (x2) 3
Glimmer Lore (x2)
Composure
Skills 1: Suasion (Detective), Tact, Lock Picking, Fire Starting, Wilderness Survival
<act>Mental Atk / Req: 2, +2</act>
<act>Psych Atk / Req: 3, +2</act>
<act>Shoot: 4, +2 (unfr, x 2)</act>
<act>Infer: 4, +2</act>
<act>Impress: 4, +2</act>
<def>Defend: mental 2 / psych 4</def>
Sparked: 46  Grains: 14
<head>Hollow Memories</head>
Wicked deeds and hanging
<head>Resources</head>
<res>Money +Maj</res>
<res>Ammo +Sig</res>`;

export const BEAUFORD_FRONT = `<head>Beauford T. Winkums, Rnk 3</head>
Cha 2   Int 3   Wis 1
Snakeoil Salesman 3 (5XP)
Rhetoric (Salesman) (x2)
Finesse (x2, Rhetoric)
✓ Rationalization 4
Medicineshow Occultist 2 (6XP)
✓ Glimmer Lore (x2) 3
Medicinals (x2)
Composure (x2)
<head>Resources</head>
<res>Money +Min</res>, <res>Liquid Courage +Maj</res>
<act>Mental Atk / Req: 5, 1d</act>
<act>Tricky -Min: 5, 2d</act>
<act>Psych Atk / Req: 2, 1d</act>
<act>Infer: 2, 1d</act>
<act>Impress: 2, 1d</act>
<def>Defend: mental 2 / psych 4</def>
Sparked: 55  Grains: 5
<head>Hollow Memories</head>
Saw your child kidnapped
<head>Items</head>
Horse & wagon
Dice token: Farkas, uses 20`;

export const DEVREUX_FRONT = `<head>Mistress Devreux</head>
Saloon Proprietor, Rank 3
Cha 3   Int 1   Wis 3
Skills 3: Savvy, Profession (Saloon Keeper), Streetwise
Skills 2: Musician, Composure, Gambling, Etiquette, Bargaining, Tact
Skills 1: Suasion (Charm)
<head>Motivations</head>
<inf>Keep the Peace +Sig</inf>
<inf>Self-Preservation +Sig</inf>
<inf>Old Sympathy for Sparkers +Min</inf>
<act>Attack: 4 (Suasion, Charm), +1</act>
<def>Defend: 6 / 5</def>
Slots: Mild, Min ×3, Sig, Maj
<head>Resources</head>
<res>Saloon Gossip +Maj</res>
<res>Money +Sig</res>
<head>Items</head>
Dead Man's Die
(Free Token, 9 uses)`;

const STICKY = `Find: How did Trudy get infected?
Answer: started less than a month ago, before she lost her doll

Level 3

0. Obed found Trudy in the forest as an infant
0. She had her doll at that time and was dressed in rags
0. She's very clever and athletic
0. The doll is wooden, carved, extremely ugly, and disturbing

Q1: What is the doll?
A1: *super* important to Trudy.

Next session: first day in town, late at night at the hotel`;

const infl = (oid: Oid, name: string, points: number, n: number): Influence =>
  ({ kind: 'influence', oid, home: DEVREUX, where: 'drawer', n, name, sign: 1, points, used: false, crit: false });

export function scene(sam = 'Player 1', beauford = 'Player 2'): PieceRecord[] {
  const chip: Chip = { kind: 'chip', oid: '00000007', where: { slot: BEAUFORD, name: 'stagger' }, n: 0, sign: -1, points: 2, rider: false };
  const sticky: Sticky = { kind: 'sticky', oid: '00000008', place: at(1430, 20), text: STICKY };
  const ref: Reference = { kind: 'reference', oid: '00000009', place: at(1430, 650), which: 'actions' };
  return [
    character(SAM, sam, 'Sam', 40, SAM_FRONT, back({ min: 2 }, 'Fire tools. Lantern. 6 Candles.\nPocket knife. Bedroll. Canteen.\nRope. Notebook and pencil.')),
    character(BEAUFORD, beauford, 'Beauford', 500, BEAUFORD_FRONT, back({ min: 1 })),
    character(DEVREUX, 'GM', 'Devreux', 960, DEVREUX_FRONT, back({ min: 2 })),
    infl('00000004', 'Keep the Peace', 4, 0),
    infl('00000005', 'Self-Preservation', 4, 1),
    infl('00000006', 'Old Sympathy for Sparkers', 2, 2),
    chip, sticky, ref,
  ];
}
