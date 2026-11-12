// CRC: crc-Tap.md | R54, R55, R56, R57, R58, R59, R60, R66, R210, R211, R212, R250, R259, R260, R261, R262
// Tapping Resources, Biases, Afflictions and Injuries into Influence cards, with a ledger per source
// so every Level can go back where it came from (Hollow Folks, *Tapping Resources* and *Damage
// Resources*), and NPCs' Motivations (Bunkum, *Mental Resources*). Pure: returns the records to
// write; who may tap is mayTap's question, asked before a tap starts (R212, R259).
//
// A source is `<character oid>:<rest>`: a `<res>` mark's name on the front (its Level is written in
// the text), `<damage>/<row>` for a named Damage slot, or `<damage>/<row>#<k>` for its k-th checked
// box. A Damage slot or box is worth its row's Levels, less what its `spent` holds, and makes a card
// of its kind named after the slot.

import { DAMAGE, ROWS, damageSlots, type Character, type Damage, type Influence, type Oid, type RowName, type Sign, type Where } from '../model/records.ts';
import { marks, parse, serialize, setMark } from '../text/marks.ts';
import { adjust, influence, levelsOf, motiveLeft, spend, unadjusted } from './readmarks.ts';
import type { Viewer } from './visibility.ts';
import { MIN, STEP, rowLevels } from './influence.ts';

export type Lookup = (oid: Oid) => Character | undefined;
/** What a tap writes: the card, and every character whose sources changed. */
export type Tapped = { card: Influence; changed: Character[] };

type Source = {
  char: Character; name: string; sign: Sign; left: number; damage?: Damage; mot?: true; spend: (n: number) => Character;
};

// R54, R258: on the front, a `<res>` or a `<mot>` mark is a source. R261: a Motivation spends into
// its parentheses, its written Level kept.
function inFront(char: Character, name: string): Source | null {
  const lines = parse(char.front);
  for (const m of [...marks(lines, 'res'), ...marks(lines, 'mot')]) {
    const r = influence(m.text), mot = m.mark === 'mot';
    if (r?.name !== name || !r.level) continue;
    const write = (n: number) => (mot ? adjust(m.text, n) : spend(m.text, n)) ?? m.text;
    return {
      char, name, sign: r.sign ?? 1, left: mot ? motiveLeft(m.text) : levelsOf(r), ...(mot && { mot: true as const }),
      spend: n => ({ ...char, front: serialize(setMark(lines, m, write(n))) }),
    };
  }
  return null;
}

const DAMAGE_SOURCE = new RegExp(`^(${DAMAGE.join('|')})/(${ROWS.join('|')})(?:#(\\d+))?$`);

// R61, R210: a named slot, or one of its checked boxes, named after the slot.
function inBack(char: Character, rest: string): Source | null {
  const m = DAMAGE_SOURCE.exec(rest);
  if (!m) return null;
  const damage = m[1] as Damage, row = m[2] as RowName, k = m[3] ? Number(m[3]) : 0;
  const slot = char.back.damage[damage][row];
  if (!slot.name || (k > 0 && !slot.boxes[k - 1])) return null;
  const spend = (n: number): Character => {
    const spent = [...slot.spent];
    spent[k] = (spent[k] ?? 0) + n;
    const column = { ...char.back.damage[damage], [row]: { ...slot, spent: Array.from(spent, x => x ?? 0) } };
    return { ...char, back: { ...char.back, damage: { ...char.back.damage, [damage]: column } } };
  };
  return { char, name: slot.name, sign: -1, left: rowLevels(row) - (slot.spent[k] ?? 0), damage, spend };
}

// R259: your own Resources only (the GM may, running NPCs and working players' rolls); anyone's
// Motivations and Damage.
/** Whether `viewer` may tap this character's source (`rest` as after the colon). */
export function mayTap(viewer: Viewer, char: Character, rest: string): boolean {
  const s = inBack(char, rest) ?? inFront(char, rest);
  if (!s) return false;
  return !!s.damage || !!s.mot || !!viewer?.gm || char.owner === viewer?.name;
}

// R250: a dry source's glyph fades.
/** The Levels a source of this character (`rest` as after the colon) has left to tap; 0 if none. */
export function left(char: Character, rest: string): number {
  return (inBack(char, rest) ?? inFront(char, rest))?.left ?? 0;
}

/** The source a `<character oid>:<rest>` string names, or null. */
function source(chars: Lookup, id: string): Source | null {
  const colon = id.indexOf(':');
  if (colon < 0) return null;
  const char = chars(id.slice(0, colon));
  if (!char) return null;
  const rest = id.slice(colon + 1);
  return inBack(char, rest) ?? inFront(char, rest);
}

// R55, R60: born at Min, named after the source, which drops a Level; it may wait loose on the table.
/** A new resource-made card, or null when the source is dry or unknown. */
export function tap(chars: Lookup, src: string, where: Where, oid: Oid): Tapped | null {
  const s = source(chars, src);
  if (!s || s.left < 1) return null;
  const card: Influence = {
    kind: 'influence', oid, home: s.char.oid, where, n: 0, name: s.name, sign: s.sign, points: MIN,
    used: false, crit: false, tap: { ledger: { [src]: 1 }, current: src }, ...(s.damage && { damage: s.damage }),
    ...(s.mot && { mot: true as const }),
  };
  return { card, changed: [s.spend(1)] };
}

// R56, R57, R58, R66, R211: a Level from the current source (or a dropped one, which becomes current).
/**
 * Feeds a Level into a resource-made card. Refused (null) for a plain card, a dry source, or a
 * source of another kind than the card. For a used card, a new card beside it instead, named `oid`.
 */
export function feed(chars: Lookup, card: Influence, src: string | undefined, oid: Oid): Tapped | null {
  if (!card.tap) return null;
  const id = src ?? card.tap.current;
  if (card.used) return tap(chars, id, card.where, oid);
  const s = source(chars, id);
  if (!s || s.left < 1 || s.damage !== card.damage || !!s.mot !== !!card.mot) return null;
  const ledger = { ...card.tap.ledger, [id]: (card.tap.ledger[id] ?? 0) + 1 };
  return { card: { ...card, points: card.points + STEP, tap: { ledger, current: id } }, changed: [s.spend(1)] };
}

// R56: a Level back to the current source, never below what it put in, and the card never below Min.
export function unfeed(chars: Lookup, card: Influence): Tapped | null {
  const id = card.tap?.current;
  if (!card.tap || !id || !(card.tap.ledger[id]! > 0) || card.points - STEP < MIN) return null;
  const s = source(chars, id);
  if (!s) return null;
  const ledger = { ...card.tap.ledger, [id]: card.tap.ledger[id]! - 1 };
  return { card: { ...card, points: card.points - STEP, tap: { ledger, current: id } }, changed: [s.spend(-1)] };
}

// R59: killing an unused tap gives every source back its Levels.
/** The characters a killed card refunds (none for a plain or used card). */
export function kill(chars: Lookup, card: Influence): Character[] {
  if (!card.tap || card.used) return [];
  const out = new Map<Oid, Character>();
  const now: Lookup = oid => out.get(oid) ?? chars(oid);
  for (const [id, n] of Object.entries(card.tap.ledger)) {
    const s = n > 0 ? source(now, id) : null;
    if (s) out.set(s.char.oid, s.spend(-n));
  }
  return [...out.values()];
}

// R117: End recharges Biases, Afflictions and Injuries.
/** End: every Damage slot's and box's spent Levels come back. */
export function recharge(char: Character): Character {
  return { ...char, back: { ...char.back, damage: damageSlots((d, r) => ({ ...char.back.damage[d][r], spent: [] })) } };
}

// R262: Motivations recharge at the end of every scene.
/** The end of a scene: every Motivation's parentheses go. */
export function rechargeMotives(char: Character): Character {
  let lines = parse(char.front);
  for (const m of marks(lines, 'mot')) lines = setMark(lines, m, unadjusted(m.text));
  return { ...char, front: serialize(lines) };
}
