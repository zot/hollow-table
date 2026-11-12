// CRC: crc-Bar.md | R18, R19, R34, R287
// What a supply makes, pure: the records for a new piece with its middle at `at` (R287). A new
// character's pool pops out above its card, linked and gathered (R34).

import { DAMAGE, GM, damageSlots, type CardBack, type Character, type Chip, type Oid, type Place, type Reference, type Sign, type Sticky, type Text } from '../model/records.ts';
import type { Viewer } from './visibility.ts';

export type Point = { x: number; y: number };
const place = (at: Point, w: number, h: number): Place => ({ x: Math.round(at.x - w / 2), y: Math.round(at.y - h / 2), z: 0, tilt: 0 });

// The sizes the pieces are drawn at (theme.css), so a new one is taken by its middle.
const CARD = { w: 430, h: 316 }, STICKY = { w: 230, h: 150 }, TEXT = { w: 120, h: 30 }, CHIP = 42, POOL_H = 230;

/** A blank card, as a character sheet's template: written in, not filled in. */
export const BLANK_FRONT = `<head>Name, Rank _</head>
Cha _   Int _   Wis _

Field _ (_XP)
Skill
Skill
Mental Atk / Req: _
Infer: _
Impress: _
Defend: _
<head>Resources</head>`;

const blankBack = (): CardBack => ({
  damage: damageSlots(() => ({ name: '', boxes: [], spent: [] })),
  absorb: Object.fromEntries(DAMAGE.map(d => [d, 0])) as CardBack['absorb'], notes: '',
});

// R34: owned by its maker (the GM's when the GM makes it), its pool above the card, gathered.
export function newCharacter(oid: Oid, maker: Viewer, at: Point): Character {
  const card = place(at, CARD.w, CARD.h);
  return { kind: 'character', oid, owner: maker?.gm || !maker ? GM : maker.name, name: 'Name',
    pool: { ...card, y: card.y - POOL_H }, card, flipped: false, gathered: true, front: BLANK_FRONT, back: blankBack() };
}

export function newSticky(oid: Oid, at: Point): Sticky {
  return { kind: 'sticky', oid, place: place(at, STICKY.w, STICKY.h), text: '' };
}

// R287: loose text starts as "Write here".
export function newText(oid: Oid, at: Point): Text {
  return { kind: 'text', oid, place: place(at, TEXT.w, TEXT.h), text: 'Write here' };
}

export function newHowTo(oid: Oid, at: Point): Reference {
  return { kind: 'reference', oid, place: place(at, CARD.w, CARD.h), which: 'howto' };
}

export function newChip(oid: Oid, sign: Sign, points: number, at: Point): Chip {
  return { kind: 'chip', oid, where: { table: place(at, CHIP, CHIP) }, n: 0, sign, points, rider: false };
}
