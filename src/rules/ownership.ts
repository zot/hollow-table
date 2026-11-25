// CRC: crc-Ownership.md | R142, R149, R567, R579, R581, R582
// What clicking or shift-clicking a character's die does to its owner. Pure: returns the new owner,
// docking, or a refusal with its reason.

import { GM, OPEN, isPaper, ownerOf, ridFor, type Character, type Paper, type PieceRecord, type Rid } from '../model/records.ts';
import type { Viewer } from './visibility.ts';

export type Result = { owner: string } | { dock: true } | { refused: string };

const own = (viewer: Viewer, c: Character) => !!viewer && c.owner === (viewer.gm ? GM : viewer.name);

// R144, R146, R147, R148: your own (or, for the GM, anyone's) docks; open is claimed; another
// player's does nothing.
export function click(viewer: Viewer, c: Character): Result {
  if (!viewer) return { refused: 'Only someone at the table can take a character.' };
  if (c.owner === OPEN) return { owner: viewer.gm ? GM : viewer.name };
  if (viewer.gm || own(viewer, c)) return { dock: true };
  return { refused: `${c.name} is ${c.owner === GM ? "the GM's" : `${c.owner}'s`}.` };
}

// R146: your own, or any for the GM, opens.
export function shiftClick(viewer: Viewer, c: Character): Result {
  if (viewer && (viewer.gm || own(viewer, c))) return { owner: OPEN };
  return { refused: `${c.name} isn't yours to open.` };
}

// R148: a character and its card belong to their owner, or anyone while open; a player can't
// hand a character to someone else.
/** Whether the GM's page takes a player's change to a character, before → after. */
export function mayChange(viewer: Viewer, before: Character | undefined, after: Character | undefined): boolean {
  if (viewer?.gm) return true;
  if (!viewer) return false;
  const mine = (c: Character) => c.owner === viewer.name || c.owner === OPEN;
  if (before && !mine(before)) return false;
  return !after || mine(after);
}

// R567: the owner and the GM write a character's card and name; an open one's, the GM alone.
/** Whether this viewer may write a character's card and the name above its pool. */
export function mayWrite(viewer: Viewer, c: Character): boolean {
  return !!viewer && (viewer.gm || (c.owner !== OPEN && c.owner === viewer.name));
}

/** R567: whether a change touches a character's writing: its front, its back's notes or its name. */
export function rewrites(before: Character | undefined, after: Character | undefined): boolean {
  if (!before || !after) return false;
  return before.front !== after.front || before.back.notes !== after.back.notes || before.name !== after.name;
}

// R579, R581: the note handed to `who`: they own it and leave its readers; everyone's stays everyone's, and
// a "just me" note (a player's `mine`, or the GM's to no one) goes to the table `handed`, for their page to take.
/** The note handed over to `who`. */
export function handOver<P extends Paper>(r: P, who: string): P {
  const { to, mine, handed: _handed, ...rest } = r, base = { ...rest, by: who };
  if (mine || (ownerOf(r) === GM && to && !to.length)) return { ...base, handed: true } as P;
  return (to ? { ...base, to: to.filter(n => n !== who) } : base) as P;
}

// R581: a page takes the `handed` notes it owns as its own "just me": a player's under `m:` as `mine`, the
// GM's as its note to no one; the table's copy goes in the same change.
/** The handed notes `self` takes, each from its table key to its own. */
export function takeHanded(all: [Rid, PieceRecord][], self: string): { from: Rid; rid: Rid; rec: Paper }[] {
  const out: { from: Rid; rid: Rid; rec: Paper }[] = [];
  for (const [from, r] of all) {
    if (!isPaper(r) || !r.handed || r.by !== self) continue;
    const { handed: _handed, ...rest } = r;
    const rec: Paper = self === GM ? { ...rest, to: [] } : { ...rest, mine: true };
    out.push({ from, rid: ridFor(rec), rec });
  }
  return out;
}

const readers = (r: Paper) => JSON.stringify([r.to ?? null, r.mine ?? null, r.handed ?? null]);
/** R582: whether paper's readers differ. */
export function reread(a: Paper, b: Paper): boolean { return readers(a) !== readers(b); }

// R582: a player hands a note over as its owner, exactly as handOver writes it; paper the GM's page hasn't
// got is a "just me" note leaving its page, which may come only `handed`, for its new owner alone.
/** Whether a player's paper change is a hand-over, which the GM's page takes though the giver can't read the result. */
export function handsOver(was: Paper | undefined, rec: Paper, who: string): boolean {
  if (rec.by === undefined) return false;
  if (!was) return !!rec.handed && rec.by !== who;
  return rec.by !== was.by && ownerOf(was) === who && !reread(rec, handOver(was, rec.by));
}
