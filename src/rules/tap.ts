// CRC: crc-Tap.md | R54, R55, R56, R57, R461, R59, R60, R66, R210, R211, R212, R250, R259, R463, R261, R262, R343, R344, R432, R433, R497
// Tapping Resources, Biases, Afflictions and Injuries into Influence cards, with a ledger per source
// so every Level can go back where it came from (Hollow Folks, *Tapping Resources* and *Damage
// Resources*), and NPCs' Motivations (Bunkum, *Mental Resources*). Pure: returns the records to
// write; who may tap is mayTap's question, asked before a tap starts (R212, R259).
//
// A source is `<character oid>:<rest>`: a `<res>` mark's name on the front (its Level is written in
// the text), `<damage>/<row>` for a named Damage slot, or `<damage>/<row>#<k>` for its k-th checked
// box. A Damage slot or box is worth its row's Levels, less what its `spent` holds, and makes a card
// of its kind named after the slot. `<damage>/lasting` is the column's Conviction or Burden (R343).
// `o<record oid>/<name>` is an Opinion on that NPC's Opinion Record (R433).

import { DAMAGE, LASTING, ROWS, damageSlots, type Character, type Damage, type Flag, type Influence, type LastingColumn, type Oid, type Opinion, type RowName, type Sign, type Where } from '../model/records.ts';
import { lastingLevels } from './absorb.ts';
import { marks, parse, serialize, setMark } from '../text/marks.ts';
import { adjust, influence, levelsOf, motiveLeft, spend, unadjusted } from './readmarks.ts';
import type { Viewer } from './visibility.ts';
import { MIN, STEP, rowLevels, slotWorth } from './influence.ts';

/** A source's holder: a character, or an Opinion Record (R433). */
export type Holder = Character | Opinion;
export type Lookup = (oid: Oid) => Holder | undefined;
/** What a tap writes: the card, and every character or record whose sources changed. */
export type Tapped = { card: Influence; changed: Holder[] };

type Source = {
  char: Character; name: string; sign: Sign; left: number; damage?: Damage; mot?: true; spend: (n: number) => Holder;
  /** R497: what its card is born at: 1 from a Damage slot worth only 1, else Min. */
  points?: number;
};

const OPINION_SOURCE = /^o([0-9a-f]{8})\/(.+)$/;
// R433: an Opinion is a line of the NPC's record; it spends as a Motivation does, into parentheses
// after its fixed Level, and its card is named for the NPC, at home with them.
function inOpinion(char: Character, rest: string, chars: Lookup): Source | null {
  const m = OPINION_SOURCE.exec(rest), rec = m ? chars(m[1]!) : undefined;
  if (rec?.kind !== 'opinion') return null;
  const lines = rec.text.split('\n'), reading = (l: string) => influence(unadjusted(l));
  const k = lines.findIndex(l => { const r = reading(l); return !!r && r.name === m![2] && !!r.sign && !!r.level; });
  if (k < 0) return null;
  const line = lines[k]!, r = reading(line)!;
  return {
    char, name: `${char.name}: ${r.name}`, sign: r.sign!, left: motiveLeft(line), mot: true,
    spend: n => ({ ...rec, text: lines.map((l, i) => i === k ? adjust(l, n) ?? l : l).join('\n') }),
  };
}

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

const LASTING_SOURCE = new RegExp(`^(${LASTING.join('|')})/lasting$`);

// R343: a named Conviction or Burden, worth its Levels less what it has spent, makes a card of its column.
function inLasting(char: Character, rest: string): Source | null {
  const m = LASTING_SOURCE.exec(rest), damage = m?.[1] as LastingColumn | undefined, l = damage && char.back.lasting?.[damage];
  if (!l?.name) return null;
  const spend = (n: number): Character =>
    ({ ...char, back: { ...char.back, lasting: { ...char.back.lasting, [damage!]: { ...l, spent: l.spent + n } } } });
  return { char, name: l.name, sign: -1, left: lastingLevels(l.points) - l.spent, damage, spend };
}

// R61, R210: a named slot, or one of its checked boxes, named after the slot.
function inBack(char: Character, rest: string): Source | null {
  const m = DAMAGE_SOURCE.exec(rest);
  if (!m) return inLasting(char, rest);
  const damage = m[1] as Damage, row = m[2] as RowName, k = m[3] ? Number(m[3]) : 0;
  const slot = char.back.damage[damage][row];
  if (!slot.name || (k > 0 && !slot.boxes[k - 1])) return null;
  const spend = (n: number): Character => {
    const spent = [...slot.spent];
    spent[k] = (spent[k] ?? 0) + n;
    const column = { ...char.back.damage[damage], [row]: { ...slot, spent: Array.from(spent, x => x ?? 0) } };
    return { ...char, back: { ...char.back, damage: { ...char.back.damage, [damage]: column } } };
  };
  return { char, name: slot.name, sign: -1, left: rowLevels(row) - (slot.spent[k] ?? 0), damage, spend,
    points: Math.min(MIN, slotWorth(char, damage, row)) };
}

// R259: your own Resources only (the GM may, running NPCs and working players' rolls); anyone's
// Motivations and Damage.
/** Whether `viewer` may tap this character's source (`rest` as after the colon). */
export function mayTap(viewer: Viewer, char: Character, rest: string): boolean {
  // R432: an Opinion only the GM, whose records they are.
  if (OPINION_SOURCE.test(rest)) return !!viewer?.gm;
  const s = inBack(char, rest) ?? inFront(char, rest);
  if (!s) return false;
  return !!s.damage || !!s.mot || !!viewer?.gm || char.owner === viewer?.name;
}

/** The source a `<character oid>:<rest>` string names, or null. */
function source(chars: Lookup, id: string): Source | null {
  const colon = id.indexOf(':');
  if (colon < 0) return null;
  const char = chars(id.slice(0, colon));
  if (char?.kind !== 'character') return null;
  const rest = id.slice(colon + 1);
  return inOpinion(char, rest, chars) ?? inBack(char, rest) ?? inFront(char, rest);
}

// R250: a dry source's glyph fades; R432: asked by the whole source, as an Opinion's is not on its card's own character.
/** The Levels a source has left to tap; 0 if none or unknown. */
export function leftOf(chars: Lookup, src: string): number {
  return source(chars, src)?.left ?? 0;
}

// R55, R60: born at Min, named after the source, which drops a Level; it may wait loose on the table.
/** A new resource-made card, or null when the source is dry or unknown. */
export function tap(chars: Lookup, src: string, where: Where, oid: Oid): Tapped | null {
  const s = source(chars, src);
  if (!s || s.left < 1) return null;
  const card: Influence = {
    kind: 'influence', oid, home: s.char.oid, where, n: 0, name: s.name, sign: s.sign, points: s.points ?? MIN,
    used: false, crit: false, tap: { ledger: { [src]: 1 }, current: src }, ...(s.damage && { damage: s.damage }),
    ...(s.mot && { mot: true as const }),
  };
  return { card, changed: [s.spend(1)] };
}

/** R461–R463: why a tap is the GM's call. */
export const PLAIN = 'Tapped into a plain card', USED = 'Tapped into a used card', MIXED = 'A Resource and a Motivation on one card';

// R56, R57, R461, R66, R211: a Level from the current source (or a dropped one, which becomes current).
// R461–R463: a plain card, a used card, or a Resource and a Motivation together are the GM's call:
// fed, and flagged; a Damage source of another kind than the card is still refused (R211).
/** Feeds a Level into a card; null for a dry or unknown source, or one of another Damage kind. */
export function feed(chars: Lookup, card: Influence, src: string | undefined, _oid: Oid): Tapped | null {
  const id = src ?? card.tap?.current;
  if (!id) return null;
  const s = source(chars, id);
  if (!s || s.left < 1 || s.damage !== card.damage) return null;
  // R497: a slot worth only 1 feeds no card, and a 1-point card is fed by nothing.
  if ((s.points ?? MIN) < MIN || card.points < MIN) return null;
  const why = !card.tap ? PLAIN : card.used ? USED : !!s.mot !== !!card.mot ? MIXED : null;
  const ledger = { ...card.tap?.ledger, [id]: (card.tap?.ledger[id] ?? 0) + 1 };
  const flag = why ? flagged(card.flag, why, id, !card.tap) : card.flag;
  return { card: { ...card, points: card.points + STEP, tap: { ledger, current: id }, ...(flag && { flag }) }, changed: [s.spend(1)] };
}

/** A flag with one more Level fed under it from `id`, its why joined if new. */
function flagged(was: Flag | undefined, why: string, id: string, plain: boolean): Flag {
  const whys = new Set(was?.why.split('; '));
  whys.add(why);
  return {
    why: [...whys].join('; '),
    fed: { ...was?.fed, [id]: (was?.fed?.[id] ?? 0) + 1 },
    ...((was?.plain || plain) && { plain: true as const }),
  };
}

// R464: the GM allows a flagged tap: it stays, unflagged.
export function allowFlag(card: Influence): Influence {
  const { flag: _gone, ...rest } = card;
  return rest;
}

// R464: the GM undoes a flagged tap: the Levels fed under the flag go back to their sources, and a card
// that was plain is plain again.
/** The card as it was before the flagged taps, and the sources given their Levels back; null if unflagged. */
export function undoFlag(chars: Lookup, card: Influence): Tapped | null {
  const f = card.flag;
  if (!f?.fed || !card.tap) return null;
  const out = new Map<Oid, Holder>();
  const now: Lookup = oid => out.get(oid) ?? chars(oid);
  const ledger = { ...card.tap.ledger };
  let points = card.points;
  for (const [id, n] of Object.entries(f.fed)) {
    const back = source(now, id)?.spend(-n);
    if (back) out.set(back.oid, back);
    ledger[id] = (ledger[id] ?? 0) - n;
    if (ledger[id]! <= 0) delete ledger[id];
    points -= n * STEP;
  }
  const { flag: _f, tap: _t, ...rest } = card;
  const keys = Object.keys(ledger);
  const tapped = f.plain && !keys.length ? rest
    : { ...rest, tap: { ledger, current: ledger[card.tap.current] ? card.tap.current : keys.at(-1) ?? card.tap.current } };
  return { card: { ...tapped, points }, changed: [...out.values()] };
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
export function kill(chars: Lookup, card: Influence): Holder[] {
  if (!card.tap || card.used) return [];
  const out = new Map<Oid, Holder>();
  const now: Lookup = oid => out.get(oid) ?? chars(oid);
  for (const [id, n] of Object.entries(card.tap.ledger)) {
    const s = n > 0 ? source(now, id) : null;
    const back = s?.spend(-n);
    if (back) out.set(back.oid, back);
  }
  return [...out.values()];
}

// R117: End recharges Biases, Afflictions and Injuries; R343: and Convictions and Burdens.
/** End: every Damage slot's and box's spent Levels come back, and a Conviction's or Burden's. */
export function recharge(char: Character): Character {
  const damage = damageSlots((d, r) => ({ ...char.back.damage[d][r], spent: [] })), was = char.back.lasting;
  const lasting = was && Object.fromEntries(Object.entries(was).map(([d, l]) => [d, { ...l, spent: 0 }]));
  return { ...char, back: { ...char.back, damage, ...(lasting && { lasting }) } };
}

// R344: a Mild Damage Resource "disappears immediately after the Contest" (Hollow Folks), and what was
// tapped from it with it (Bill, 11-15): a card loses the Levels Mild slots gave it, and goes when
// nothing else gave it any.
const MILD = new RegExp(`:(${DAMAGE.join('|')})/mild(?:#\\d+)?$`);
/** End for a tapped card: without what Mild slots gave it; null if they gave it everything. */
export function mildGone(card: Influence): Influence | null {
  const ledger = card.tap?.ledger ?? {}, sum = (es: [string, number][]) => es.reduce((a, [, n]) => a + n, 0);
  const all = Object.entries(ledger), rest = all.filter(([s]) => !MILD.test(s)), lost = sum(all) - sum(rest);
  if (!lost) return card;
  if (sum(rest) <= 0) return null;
  const keep = Object.fromEntries(rest), current = card.tap!.current in keep ? card.tap!.current : rest[0]![0];
  return { ...card, points: Math.max(MIN, card.points - STEP * lost), tap: { ledger: keep, current } };
}

// R262: Motivations recharge at the end of every scene.
/** The end of a scene: every Motivation's parentheses go. */
export function rechargeMotives(char: Character): Character {
  let lines = parse(char.front);
  for (const m of marks(lines, 'mot')) lines = setMark(lines, m, unadjusted(m.text));
  return { ...char, front: serialize(lines) };
}
