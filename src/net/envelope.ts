// CRC: crc-Envelope.md | R109, R177, R296, R299
// Every message's shape, checked field by field before anyone reads it. A peer is hostile until
// proven otherwise: a message that fails any check is dropped whole, and nothing in one is ever
// parsed as markup.

import {
  CAPS, SLOTS, bool, check as checkRecord, dict, fields, int, isOid, list, num, oneOf, receipt, str, type Shape,
} from '../model/records.ts';

export const VERSION = 1;
export const KINDS = ['hello', 'here', 'bye', 'recs', 'sync', 'edit', 'move', 'intent', 'roll', 'crit', 'refuse', 'claim'] as const;
export type Kind = (typeof KINDS)[number];
/** Limits beyond the records' own (R109, R177). */
export const LIMITS = { dice: 40, moveItems: 8, batch: 10_000, why: 500, box: 4_000_000 };

/** A message: who sent it (the sender's tab), when, and a body of its kind's shape. */
export type Envelope<B = unknown> = { v: typeof VERSION; kind: Kind; tab: string; at: number; body: B };

const tab = str(CAPS.id), name = str(CAPS.name), why = str(LIMITS.why);
const seq = int(0, Number.MAX_SAFE_INTEGER), coord = num(-CAPS.coord, CAPS.coord);
const oidOrNull: Shape = v => v === null || isOid(v);
// R296: a claim's why is null when the page now holds its name.
const whyOrNull: Shape = v => v === null || why(v);
const box = fields({ iv: str(24), data: str(LIMITS.box) });
// R299: a move's aim, each part optional; a slot name is one of the seven.
const slotName = oneOf(...SLOTS), rid = str(CAPS.id);
const aim = fields({}, {
  slot: fields({ owner: isOid, name: slotName }), drawer: fields({ owner: isOid }, { at: int(0, 1000) }), kill: isOid,
  merge: rid, card: rid, reach: fields({ owner: isOid, at: slotName, from: (v: unknown) => v === null || slotName(v) }), chip: bool,
});
// A record travels with its rid and the stamp it was sent under; it must pass Records.check.
const put: Shape = v => fields({ rid: str(CAPS.id), s: seq, rec: () => true }, { by: tab })(v)
  && checkRecord((v as { rid: string }).rid, (v as { rec: unknown }).rec);
const del = fields({ rid: str(CAPS.id), s: seq }, { by: tab });
const fewDice = (r: unknown) => (r as { dice: unknown[] }).dice.length <= LIMITS.dice;
// A roll: the table view in the clear; the roller's own view sealed to their tab.
const roll: Shape = v => fields({ n: seq, receipt, sealed: dict(box) })(v) && fewDice((v as { receipt: unknown }).receipt);

/** Each kind's body. Provisional where the module that owns the kind has not landed yet. */
const BODIES: Record<Kind, Shape> = {
  hello: fields({}),
  here: fields({ name, role: oneOf('gm', 'player') }),
  bye: fields({}),
  // A batch from the GM's page: the public view, and each tab's own view sealed to it.
  recs: fields({ g: seq, full: bool, puts: list(put, LIMITS.batch), dels: list(del, LIMITS.batch), sealed: dict(box) }),
  sync: fields({}),
  // A player's change, sealed to the GM's page.
  edit: fields({ box }),
  move: fields({ s: seq, items: list(fields({ rid: str(CAPS.id), x: coord, y: coord, z: int(0, CAPS.coord) }, { part: str(CAPS.id), aim }), LIMITS.moveItems) }, { drop: bool }),
  intent: fields({ n: seq, pool: isOid, action: name, vs: oidOrNull, defend: oneOf('mental', 'psych'),
    hand: fields({ yellows: int(-LIMITS.dice, LIMITS.dice), bonus: int(-1000, 1000) }) }, { row: str(32) }),
  roll,
  crit: fields({ id: str(CAPS.id), choice: oneOf('max', 'dbl'), lock: bool }),
  refuse: fields({ why }, { n: seq }),
  claim: fields({ name, why: whyOrNull }),
};

// What a sealed box holds is checked the same way once it is opened.
/** The roller's own view of a roll, and which of their requests it answers. */
export const sealedRoll: Shape = v => fields({ re: seq, receipt })(v) && fewDice((v as { receipt: unknown }).receipt);
/** A tab's own part of a batch: `{g, puts}`. */
export const sealedRecs: Shape = fields({ g: seq, puts: list(put, LIMITS.batch) });
const change: Shape = v => fields({ rid: str(CAPS.id), rec: () => true })(v)
  && checkRecord((v as { rid: string }).rid, (v as { rec: unknown }).rec);
/** A player's change, opened: `{s, base, puts: [{rid, rec}], dels: [rid]}`. */
export const editBody: Shape = fields({ s: seq, base: seq, puts: list(change, LIMITS.batch), dels: list(str(CAPS.id), LIMITS.batch) });

const header = fields({ v: oneOf(VERSION), kind: oneOf(...KINDS), tab, at: num(0, 1e15), body: () => true });

/** An envelope from this page. */
export function make<B>(kind: Kind, from: string, body: B, at = Date.now()): Envelope<B> {
  return { v: VERSION, kind, tab: from, at, body };
}

// R177: checked before anyone reads it; anything off drops the whole message.
/** The message if every field is as its kind requires, else null. Never throws. */
export function check(raw: unknown): Envelope | null {
  let e: unknown = raw;
  if (typeof raw === 'string') {
    try { e = JSON.parse(raw); } catch { return null; }
  }
  if (!header(e)) return null;
  const env = e as Envelope;
  return BODIES[env.kind](env.body) ? env : null;
}
