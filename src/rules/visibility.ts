// CRC: crc-Visibility.md | R143, R144, R145, R150, R356, R357, R358, R370, R185, R348, R371
// Who may read what, and each record as a given viewer may see it. Pure. The invariant: no page
// ever holds, in the clear, a secret its person may not read.

import { OPEN, damageSlots, type CardBack, type Character, type Chip, type Influence, type Oid, type PieceRecord, type Rec, type Yards } from '../model/records.ts';

/** Who is looking: a name and whether they are the GM; null for someone who owns nothing. */
export type Viewer = { name: string; gm: boolean } | null;
export type Characters = (oid: Oid) => Character | undefined;

// R143, R144, R145: the GM always; an open character everyone; otherwise its owner.
export function canSee(viewer: Viewer, character: Character): boolean {
  return !!viewer?.gm || character.owner === OPEN || (!!viewer && character.owner === viewer.name);
}

// R356: the sheet's shape is public: the same lines, the text gone.
const blank = (text: string) => text.replace(/[^\n]/g, '');
const blankBack = (b: CardBack): CardBack => ({
  notes: blank(b.notes),
  absorb: { bias: 0, affliction: 0, injury: 0 },
  damage: damageSlots((d, r) => ({ name: '', boxes: b.damage[d][r].boxes.map(() => false), spent: [] })),
});

const inSlot = (i: Influence) => typeof i.where === 'object' && 'slot' in i.where;
/** The character whose pool a chip or card is in, if it is in one. */
const poolOf = (i: Chip | Influence, chars: Characters) => typeof i.where === 'object' && 'slot' in i.where ? chars(i.where.slot) : undefined;

// R358: a contribution is put in a pool by someone other than its character's owner: a chip whose
// `by` is someone else, a card whose home character has another owner.
/** Whether a chip or card in a pool is on the public mat. */
export function contribution(i: Chip | Influence, chars: Characters): boolean {
  const pool = poolOf(i, chars);
  if (!pool) return false;
  if (i.kind === 'chip') return !!i.by && i.by !== pool.owner;
  const home = chars(i.home);
  return !!home && home.owner !== pool.owner;
}

function redactPiece(r: PieceRecord, viewer: Viewer, chars: Characters): PieceRecord | undefined {
  if (r.kind === 'character') return canSee(viewer, r) ? r : { ...r, front: blank(r.front), back: blankBack(r.back) };
  // R370: the private mat of a pool the viewer can't see never reaches them, not even face-down.
  if (r.kind === 'chip' || r.kind === 'influence') {
    const pool = poolOf(r, chars);
    if (pool && !canSee(viewer, pool) && !contribution(r, chars)) return undefined;
  }
  if (r.kind === 'influence') {
    const home = chars(r.home);
    if (home && canSee(viewer, home)) return r;
    // R357, R358: face-down, but a contribution's value in a pool is public.
    const { tap: _secret, ...rest } = r;
    return { ...rest, name: '', points: inSlot(r) ? r.points : 0 };
  }
  return r;
}

// R150, R185: the record as that viewer may see it; a burial's records are redacted the same way.
// R370: nothing at all for a piece of a private mat the viewer may not see.
export function redact(record: Rec, viewer: Viewer, chars: Characters): Rec | undefined {
  if ('kind' in record) return redactPiece(record, viewer, chars);
  if ('yards' in record) return redactYards(record, viewer, chars);
  // R371: a roll row is the table's, except one behind the GM's private switch.
  if ('rows' in record) return viewer?.gm ? record : { rows: Object.fromEntries(Object.entries(record.rows).filter(([, r]) => !r.priv)) };
  // R348: the world's number is the GM's alone; anyone else learns only whether the tray is set.
  if ('set' in record && !viewer?.gm) return { set: record.set, total: 0 };
  return record;
}

function redactYards(y: Yards, viewer: Viewer, chars: Characters): Yards {
  return {
    yards: y.yards.map(g => ({
      ...g,
      items: g.items.map(b => {
        // A buried character's cards are buried with it, so look there first.
        const buried = new Map(b.records.filter((r): r is Character => r.kind === 'character').map(c => [c.oid, c]));
        const look: Characters = oid => buried.get(oid) ?? chars(oid);
        return { ...b, records: b.records.map(r => redactPiece(r, viewer, look)).filter((r): r is PieceRecord => !!r) };
      }),
    })),
  };
}

/** Whether a viewer's view of a record differs from what someone who owns nothing sees. */
export function differs(record: Rec, viewer: Viewer, chars: Characters): boolean {
  return JSON.stringify(redact(record, viewer, chars)) !== JSON.stringify(redact(record, null, chars));
}
