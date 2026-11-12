// CRC: crc-PoolView.md, crc-Drag.md | Seq: seq-drag.md#1.7 | R39, R40, R41, R42, R43, R44, R45, R46, R47, R48, R49, R50, R51, R55, R56, R57, R59, R60, R64
// What a click or a drop on a pool, a drawer or a glyph does to the game, as one change. Pure: each
// takes the game and gives a writer for Game.change (or null when nothing happens), so the views stay
// thin and these are tested without a browser.

import type { Game, Writer } from '../model/game.ts';
import {
  PLAYER_OIDS, isPiece, oidOf, ridOf, type Character, type Chip, type Influence, type Oid, type Place, type Rec,
  type Rid, type Sign, type SlotName, type Where,
} from '../model/records.ts';
import { lowerCard, lowerChip, raiseCard, raiseChip, MIN } from '../rules/influence.ts';
import { accepts, rollUp, type Item } from '../rules/pool.ts';
import { feed, kill, tap, unfeed, type Lookup, type Tapped } from '../rules/tap.ts';

export type Change = (w: Writer) => void;

// Players mint at random in their range so two players can't collide; the GM counts up below it.
/** A source of new oids for one change. */
export function minter(game: Game, gm: boolean, rng: () => number = Math.random): () => Oid {
  const used = new Set(game.all().map(([rid]) => rid).filter(isPiece).map(oidOf));
  let top = 0;
  for (const o of used) { const n = parseInt(o, 16); if (n < PLAYER_OIDS) top = Math.max(top, n); }
  return () => {
    let oid: Oid;
    do {
      oid = (gm ? ++top : PLAYER_OIDS + Math.floor(rng() * (0xffffffff - PLAYER_OIDS))).toString(16).padStart(8, '0');
    } while (used.has(oid));
    used.add(oid);
    return oid;
  };
}

const lookup = (game: Game): Lookup => oid => game.get(ridOf(oid)) as Character | undefined;
const item = (game: Game, rid: Rid): Item | undefined => {
  const r = game.get(rid) as Rec | undefined;
  return r && 'kind' in r && (r.kind === 'chip' || r.kind === 'influence') ? r : undefined;
};
const inSlot = (i: Item, owner: Oid, slot: SlotName) =>
  typeof i.where === 'object' && 'slot' in i.where && i.where.slot === owner && i.where.name === slot;

/** The chips and cards in one slot. */
export function slotItems(game: Game, owner: Oid, slot: SlotName): Item[] {
  return game.all().map(([rid]) => item(game, rid)).filter((i): i is Item => !!i && inSlot(i, owner, slot));
}

// R44, R45, R46: a slot's contents, settled: three of a value roll up, chaining.
function settle(w: Writer, items: Item[], mint: () => Oid): void {
  const plan = rollUp(items, mint);
  const gone = new Set(plan.remove);
  for (const i of items) if (!gone.has(i.oid)) w.put(ridOf(i.oid), i);
  for (const oid of plan.remove) w.del(ridOf(oid));
  for (const c of plan.add) w.put(ridOf(c.oid), c);
}

/** A slot's contents with `changed` in place of (or added to) what was there, and `gone` taken out. */
function withItem(game: Game, owner: Oid, slot: SlotName, changed: Item | null, gone?: Oid): Item[] {
  const rest = slotItems(game, owner, slot).filter(i => i.oid !== changed?.oid && i.oid !== gone);
  return changed ? [...rest, changed] : rest;
}

// R39, R47: a chip or card dropped on a slot joins it (a Damage card only its own kind's slot).
export function toSlot(game: Game, rid: Rid, owner: Oid, slot: SlotName, mint: () => Oid): Change | null {
  const i = item(game, rid);
  if (!i || !accepts(slot, i)) return null;
  const moved: Item = { ...i, where: { slot: owner, name: slot }, n: slotItems(game, owner, slot).length };
  return w => {
    // Leaving another slot can't break a Roll Up already made, so only the new one settles.
    settle(w, withItem(game, owner, slot, moved), mint);
  };
}

// R48: a card goes home to a drawer; another character's drawer makes it theirs.
export function toDrawer(game: Game, rid: Rid, owner: Oid): Change | null {
  const i = item(game, rid);
  if (!i || i.kind !== 'influence') return null;
  return w => w.put(rid, { ...i, home: owner, where: 'drawer', used: false });
}

// R48, R60: dropped anywhere else, a plain card goes home; a tap may wait loose; a chip lies there.
export function toTable(game: Game, rid: Rid, at: Place): Change | null {
  const i = item(game, rid);
  if (!i) return null;
  if (i.kind === 'influence' && !i.tap) return toDrawer(game, rid, i.home);
  return w => w.put(rid, { ...i, where: { table: at } });
}

// R49, R59: the kill box deletes a card; an unused tap gives its Levels back.
export function killCard(game: Game, rid: Rid): Change | null {
  const i = item(game, rid);
  if (!i || i.kind !== 'influence') return null;
  const refunds = kill(lookup(game), i);
  return w => { w.del(rid); for (const c of refunds) w.put(ridOf(c.oid), c); };
}

/** Plain chips just vanish (put away on the bar). */
export function vanish(game: Game, rid: Rid): Change | null {
  const i = item(game, rid);
  return i?.kind === 'chip' ? w => w.del(rid) : null;
}

// R40, R42, R46: click raises, shift lowers; lowering can complete a Roll Up.
export function chipClick(game: Game, rid: Rid, shift: boolean, mint: () => Oid): Change | null {
  const c = item(game, rid);
  if (c?.kind !== 'chip') return null;
  const next = shift ? lowerChip(c) : raiseChip(c);
  if (typeof c.where !== 'object' || !('slot' in c.where)) {
    return w => { if (next) w.put(rid, next); else w.del(rid); };
  }
  const { slot: owner, name } = c.where;
  return w => {
    if (!next) w.del(rid);
    settle(w, withItem(game, owner, name, next, next ? undefined : c.oid), mint);
  };
}

// R43: clicking a rider does nothing; shift-clicking removes it.
export function riderClick(game: Game, rid: Rid, shift: boolean): Change | null {
  const c = item(game, rid);
  if (c?.kind !== 'chip' || !c.rider || !shift) return null;
  return w => w.put(rid, { ...c, rider: false });
}

// R41: a click on a slot's empty space adds a loose +1; shift-click a −1.
export function addLoose(game: Game, owner: Oid, slot: SlotName, shift: boolean, mint: () => Oid): Change {
  const chip: Chip = { kind: 'chip', oid: mint(), where: { slot: owner, name: slot }, n: slotItems(game, owner, slot).length,
    sign: shift ? -1 : 1, points: 1, rider: false };
  return w => w.put(ridOf(chip.oid), chip);
}

// R51, R56: a card's Level: click raises, shift lowers (to Min); a resource-made card feeds and unfeeds.
export function cardClick(game: Game, rid: Rid, shift: boolean, mint: () => Oid): Change | null {
  const c = item(game, rid);
  if (c?.kind !== 'influence') return null;
  if (c.tap) {
    const t = shift ? unfeed(lookup(game), c) : feed(lookup(game), c, undefined, mint());
    return t ? apply(t, c) : null;
  }
  const next = shift ? lowerCard(c) : raiseCard(c);
  return next.points === c.points ? null : w => w.put(rid, next);
}

// R50: a drawer's writers make a new card at Min.
export function writeCard(owner: Oid, sign: Sign, name: string, mint: () => Oid): Change {
  const card: Influence = { kind: 'influence', oid: mint(), home: owner, where: 'drawer', n: 0, name, sign, points: MIN, used: false, crit: false };
  return w => w.put(ridOf(card.oid), card);
}

// R64: a card in the used pile, clicked, goes back to the drawer for the next roll.
export function restoreUsed(game: Game, rid: Rid): Change | null {
  const c = item(game, rid);
  return c?.kind === 'influence' && c.where === 'used' ? w => w.put(rid, { ...c, where: 'drawer', used: false }) : null;
}

function apply(t: Tapped, old?: Influence): Change {
  return w => {
    if (old && t.card.oid !== old.oid) w.put(ridOf(old.oid), old);
    w.put(ridOf(t.card.oid), t.card);
    for (const c of t.changed) w.put(ridOf(c.oid), c);
  };
}

// R55, R57: a glyph dragged out makes a card at Min where it lands; dropped on a resource-made card,
// it feeds that card a Level and becomes its current source.
export function tapOut(game: Game, src: string, where: Where, mint: () => Oid): Change | null {
  const t = tap(lookup(game), src, where, mint());
  return t ? apply(t) : null;
}

export function feedFrom(game: Game, cardRid: Rid, src: string, mint: () => Oid): Change | null {
  const c = item(game, cardRid);
  if (c?.kind !== 'influence') return null;
  const t = feed(lookup(game), c, src, mint());
  return t ? apply(t, c) : null;
}
