// CRC: crc-Visibility.md | R143, R144, R145, R150, R151, R152, R185
// Who may read what, and each record as a given viewer may see it. Pure. The invariant: no page
// ever holds, in the clear, a secret its person may not read.

import { OPEN, damageSlots, type CardBack, type Character, type Influence, type Oid, type PieceRecord, type Rec, type Yards } from '../model/records.ts';

/** Who is looking: a name and whether they are the GM; null for someone who owns nothing. */
export type Viewer = { name: string; gm: boolean } | null;
export type Characters = (oid: Oid) => Character | undefined;

// R143, R144, R145: the GM always; an open character everyone; otherwise its owner.
export function canSee(viewer: Viewer, character: Character): boolean {
  return !!viewer?.gm || character.owner === OPEN || (!!viewer && character.owner === viewer.name);
}

// R151: the sheet's shape is public: the same lines, the text gone.
const blank = (text: string) => text.replace(/[^\n]/g, '');
const blankBack = (b: CardBack): CardBack => ({
  notes: blank(b.notes),
  absorb: { bias: 0, affliction: 0, injury: 0 },
  damage: damageSlots((d, r) => ({ name: '', boxes: b.damage[d][r].boxes.map(() => false), spent: [] })),
});

const inSlot = (i: Influence) => typeof i.where === 'object' && 'slot' in i.where;

function redactPiece(r: PieceRecord, viewer: Viewer, chars: Characters): PieceRecord {
  if (r.kind === 'character') return canSee(viewer, r) ? r : { ...r, front: blank(r.front), back: blankBack(r.back) };
  if (r.kind === 'influence') {
    const home = chars(r.home);
    if (home && canSee(viewer, home)) return r;
    // R151, R152: face-down, but a chip's value in a pool is public.
    const { tap: _secret, ...rest } = r;
    return { ...rest, name: '', points: inSlot(r) ? r.points : 0 };
  }
  return r;
}

// R150, R185: the record as that viewer may see it; a burial's records are redacted the same way.
export function redact(record: Rec, viewer: Viewer, chars: Characters): Rec {
  if ('kind' in record) return redactPiece(record, viewer, chars);
  if ('yards' in record) return redactYards(record, viewer, chars);
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
        return { ...b, records: b.records.map(r => redactPiece(r, viewer, look)) };
      }),
    })),
  };
}

/** Whether a viewer's view of a record differs from what someone who owns nothing sees. */
export function differs(record: Rec, viewer: Viewer, chars: Characters): boolean {
  return JSON.stringify(redact(record, viewer, chars)) !== JSON.stringify(redact(record, null, chars));
}
