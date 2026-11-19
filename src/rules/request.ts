// CRC: crc-Request.md | R440
// Transferring a Resource with a successful Request (Bunkum, *REQUEST ACTIONS*): the PC's Resource rises
// toward the Success Level by what the NPC's can give, and the rest is extra. Pure: returns the cards.

import type { Character } from '../model/records.ts';
import { marks, parse, serialize, setMark, type Found, type Line } from '../text/marks.ts';
import { influence, levelWord, levelsOf, spend } from './readmarks.ts';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A card's `<res>` mark of this name, if it has one. */
function resource(lines: Line[], name: string): Found | undefined {
  return marks(lines, 'res').find(m => same(influence(m.text)?.name ?? '', name));
}

/** A card's Levels of a Resource, 0 when it has none. */
export function levelOf(front: string, name: string): number {
  const m = resource(parse(front), name), r = m && influence(m.text);
  return r?.level ? levelsOf(r) : 0;
}

// R440: what a transfer can take: the NPC has more of it than the PC, and the PC less than the Success Level.
/** The NPC's Resources a transfer at Success Level `sl` can take, by name as the NPC writes them. */
export function givable(npc: Character, pc: Character, sl: number): string[] {
  return marks(parse(npc.front), 'res').flatMap(m => {
    const r = influence(m.text), have = r?.level ? levelsOf(r) : 0, mine = r ? levelOf(pc.front, r.name) : 0;
    return r && have > mine && mine < sl ? [r.name] : [];
  });
}

/** The PC's front with a new Resource at the end of its Resources (a "Resources" heading made when there is none). */
function added(front: string, text: string): string {
  const lines = front.split('\n'), head = lines.findIndex(l => /^<head>\s*Resources\s*<\/head>\s*$/i.test(l.trim()));
  const res = `<res>${text}</res>`;
  if (head < 0) return [...lines, '<head>Resources</head>', res].join('\n');
  let at = head + 1;
  while (at < lines.length && lines[at]!.trim() && !lines[at]!.trim().startsWith('<head>')) at++;
  return [...lines.slice(0, at), res, ...lines.slice(at)].join('\n');
}

export type Transfer = { npc: Character; pc: Character; moved: number; extra: number };

// R440: the PC rises toward the Success Level by min(sl − theirs, the NPC's); the NPC drops as much.
/** Both cards after transferring `name`, the Levels moved and the extra Levels; null when it can't be given. */
export function transfer(npc: Character, pc: Character, name: string, sl: number): Transfer | null {
  if (!givable(npc, pc, sl).some(n => same(n, name))) return null;
  const nl = parse(npc.front), from = resource(nl, name)!, have = levelsOf(influence(from.text)!);
  const mine = levelOf(pc.front, name), moved = Math.min(sl - mine, have), extra = sl - mine - moved;
  const npcFront = serialize(setMark(nl, from, spend(from.text, moved)!));
  const pl = parse(pc.front), to = resource(pl, name);
  const pcFront = to ? serialize(setMark(pl, to, spend(to.text, -moved)!))
    : added(pc.front, `${influence(from.text)!.name} +${levelWord(moved)}`);
  return { npc: { ...npc, front: npcFront }, pc: { ...pc, front: pcFront }, moved, extra };
}
