// CRC: crc-Ownership.md | R142, R149
// What clicking or shift-clicking a character's die does to its owner. Pure: returns the new owner,
// docking, or a refusal with its reason.

import { GM, OPEN, type Character } from '../model/records.ts';
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
