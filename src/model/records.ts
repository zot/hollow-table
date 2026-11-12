// CRC: crc-Records.md | Seq: seq-save.md
// The game as typed records: plain data, no methods, so a record crosses the wire, the database
// and an export file unchanged. Every record from outside passes `check` before anything reads it.

/** Card text with marks, stored as its source string (crc-MarkedText.md). */
export type Marked = string;

/** 8 hex characters, unique within a game. */
export type Oid = string;
/** A record's key: `o:<oid>` for a piece, or a singleton's name. */
export type Rid = string;

export type Place = { x: number; y: number; z: number; tilt: number };

/** A character's owner: the GM, open, or a player's name. */
export type Who = string;
export const GM: Who = 'GM';
export const OPEN: Who = 'open';

// R28: Bonus, Main, Edge, Stagger, Bias, Affliction and Injury, in that order.
export const SLOTS = ['bonus', 'main', 'edge', 'stagger', 'bias', 'affliction', 'injury'] as const;
export type SlotName = (typeof SLOTS)[number];

export type Sign = 1 | -1;

/** Where a chip or Influence card is. Order within a drawer, used pile or slot is `n`. */
export type Where = 'drawer' | 'used' | { slot: Oid; name: SlotName } | { table: Place };

export const ROWS = ['mild', 'min', 'sig', 'maj'] as const;
export type RowName = (typeof ROWS)[number];

// R23, R209: the back's Damage columns, named as the pool slots their Influences go into.
export const DAMAGE = ['bias', 'affliction', 'injury'] as const satisfies readonly SlotName[];
export type Damage = (typeof DAMAGE)[number];

/**
 * One Damage slot: its entry's name (plain; the column says what it is), a box per extra Slot of
 * its Level, and the Levels spent until End recharges them (R61): `spent[0]` from the slot,
 * `spent[k]` from its k-th box.
 */
export type DamageSlot = { name: string; boxes: boolean[]; spent: number[] };
// R264: `absorb` is no longer read (a column's absorb is worked out from Wis or Con); it stays so
// old games load.
export type CardBack = { damage: Record<Damage, Record<RowName, DamageSlot>>; absorb: Record<Damage, number>; notes: Marked };

/** Every Damage slot of a back, each made by `f` from its column and row. */
export function damageSlots(f: (d: Damage, r: RowName) => DamageSlot): CardBack['damage'] {
  const column = (d: Damage) => Object.fromEntries(ROWS.map(r => [r, f(d, r)])) as Record<RowName, DamageSlot>;
  return Object.fromEntries(DAMAGE.map(d => [d, column(d)])) as CardBack['damage'];
}

// R26, R28, R126: a character is its pool and its card; name is public, front and back secret.
export type Character = {
  kind: 'character'; oid: Oid; owner: Who; name: string; pool: Place; card: Place;
  flipped: boolean; gathered: boolean; front: Marked; back: CardBack;
};

/** A tapped card's ledger: Levels put in by each source (`<character oid>:<name>`). */
export type TapLedger = { ledger: Record<string, number>; current: string };

// R47, R63, R98: an Influence card, readable only by whoever may read its home character.
export type Influence = {
  kind: 'influence'; oid: Oid; home: Oid; where: Where; n: number; name: string; sign: Sign;
  points: number; used: boolean; crit: boolean; tap?: TapLedger; damage?: Damage;
  /** R260: tapped from a Motivation, a Main Pool Influence. */
  mot?: true;
};

// R36, R38: a chip; a loose odd point is `points: 1`, and `rider` is a +1 riding the chip.
export type Chip = { kind: 'chip'; oid: Oid; where: Where; n: number; sign: Sign; points: number; rider: boolean };

export type Pin = { card: Oid; dx: number; dy: number };
// R248: `big` is the big sticky, for the GM's long notes.
export type Sticky = { kind: 'sticky'; oid: Oid; place: Place; text: Marked; pin?: Pin; big?: boolean };
export type Text = { kind: 'text'; oid: Oid; place: Place; text: Marked; pin?: Pin };
export type Image = { kind: 'image'; oid: Oid; place: Place; blob: string; w: number; h: number; pin?: Pin };

export const DICE = ['W', 'G', 'R', 'B', 'Y'] as const;
export type DieColour = (typeof DICE)[number];
export type Die = { c: DieColour; v: number; added: boolean; dropped: boolean };
export type Crit = { max: number; dbl: number; chosen: 'max' | 'dbl'; locked: boolean };
export type Receipt = {
  id: string; at: number; title: string; by?: string; dice: Die[]; influence?: number; base?: number; vs?: string;
  row?: string; resolution: string; level: string; outcome: string; crit?: Crit; priv?: boolean;
  /** This page's own roll has reached the table (R107). */
  ok?: boolean;
};

export type TornRoll = { kind: 'tornroll'; oid: Oid; place: Place; receipts: Receipt[] };
export type Reference = { kind: 'reference'; oid: Oid; place: Place; which: 'howto' | 'actions' };

export type PieceRecord = Character | Influence | Chip | Sticky | Text | Image | TornRoll | Reference;

export type Burial = { name: string; records: PieceRecord[] };
export type Graveyard = { name: string; named: boolean; items: Burial[] };
export type Yards = { yards: Graveyard[] };
export type Meta = { round: number; rolls: number };
/** The GM's page only, never sent. */
/**
 * The GM's page only, never sent: who holds which name, the table's version, the version each piece
 * was deleted at (at most TOMBS), and the version Boot Hill last changed at.
 */
export type Book = { claims: Record<string, string>; gv: number; tomb: Record<Rid, number>; hillGv?: number };
export const TOMBS = 3000;
/** Each page's own, never sent (R111). */
export type Tape = { receipts: Receipt[] };

export type Rec = PieceRecord | Yards | Meta | Book | Tape;

// Player-made characters number from here up, so they can't collide with the GM's.
export const PLAYER_OIDS = 0x100000;

export function isPiece(rid: Rid): boolean { return rid.startsWith('o:'); }
export function oidOf(rid: Rid): Oid { return rid.slice(2); }
export function ridOf(oid: Oid): Rid { return 'o:' + oid; }

// ---- check: every record from another page or an import passes here (R177) ----

export const CAPS = { name: 200, text: 20_000, id: 64, coord: 1e6, list: 500 };

// The shape combinators below are shared with Envelope, which checks messages the same way (R177).
export type Shape = (v: unknown) => boolean;
export const obj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
export const num = (lo: number, hi: number): Shape => v => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
export const int = (lo: number, hi: number): Shape => v => num(lo, hi)(v) && Number.isInteger(v);
export const str = (cap: number): Shape => v => typeof v === 'string' && v.length <= cap;
export const bool: Shape = v => typeof v === 'boolean';
export const oneOf = (...xs: readonly unknown[]): Shape => v => xs.includes(v);
export const list = (each: Shape, cap = CAPS.list): Shape => v => Array.isArray(v) && v.length <= cap && v.every(each);
export const dict = (each: Shape, cap = CAPS.list): Shape => v => obj(v) && Object.keys(v).length <= cap
  && Object.keys(v).every(k => k.length <= CAPS.name && each(v[k]));
export const isOid: Shape = v => typeof v === 'string' && /^[0-9a-f]{8}$/.test(v);

/** A record with exactly these fields (optional ones may be absent), each of its shape. */
export function fields(req: Record<string, Shape>, opt: Record<string, Shape> = {}): Shape {
  return v => obj(v)
    && Object.keys(req).every(k => k in v && req[k]!(v[k]))
    && Object.keys(v).every(k => k in req || (k in opt && opt[k]!(v[k])));
}

const coord = num(-CAPS.coord, CAPS.coord);
const place = fields({ x: coord, y: coord, z: int(0, CAPS.coord), tilt: num(-45, 45) });
const pin = fields({ card: isOid, dx: coord, dy: coord });
const sign = oneOf(1, -1);
const points = int(0, 1000);
const where: Shape = v => v === 'drawer' || v === 'used'
  || fields({ slot: isOid, name: oneOf(...SLOTS) })(v) || fields({ table: place })(v);
const marked = str(CAPS.text);
const slot = fields({ name: str(CAPS.name), boxes: list(bool, 20), spent: list(int(0, 100), 21) });
const column = fields(Object.fromEntries(ROWS.map(r => [r, slot])));
const damage = fields(Object.fromEntries(DAMAGE.map(d => [d, column])));
const absorb = fields(Object.fromEntries(DAMAGE.map(d => [d, int(0, 100)])));
const back = fields({ damage, absorb, notes: marked });
const die = fields({ c: oneOf(...DICE), v: int(1, 6), added: bool, dropped: bool }); // R109
export const receipt = fields(
  { id: str(CAPS.id), at: num(0, 1e15), title: str(CAPS.name), dice: list(die, 200),
    resolution: str(CAPS.name), level: str(CAPS.name), outcome: str(CAPS.name) },
  { by: str(CAPS.name), influence: int(-1000, 1000), base: int(-1000, 1000), vs: str(CAPS.name), row: str(CAPS.name), ok: bool,
    crit: fields({ max: int(0, 10_000), dbl: int(0, 10_000), chosen: oneOf('max', 'dbl'), locked: bool }),
    priv: bool });

const PIECES: Record<PieceRecord['kind'], Shape> = {
  character: fields({ kind: oneOf('character'), oid: isOid, owner: str(CAPS.name), name: str(CAPS.name), pool: place,
    card: place, flipped: bool, gathered: bool, front: marked, back }),
  influence: fields({ kind: oneOf('influence'), oid: isOid, home: isOid, where, n: int(0, CAPS.list), name: str(CAPS.name),
    sign, points, used: bool, crit: bool },
    { tap: fields({ ledger: dict(int(0, 100)), current: str(CAPS.name) }), damage: oneOf(...DAMAGE), mot: oneOf(true) }),
  chip: fields({ kind: oneOf('chip'), oid: isOid, where, n: int(0, CAPS.list), sign, points, rider: bool }),
  sticky: fields({ kind: oneOf('sticky'), oid: isOid, place, text: marked }, { pin, big: bool }),
  text: fields({ kind: oneOf('text'), oid: isOid, place, text: marked }, { pin }),
  image: fields({ kind: oneOf('image'), oid: isOid, place, blob: v => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v),
    w: int(1, 100_000), h: int(1, 100_000) }, { pin }),
  tornroll: fields({ kind: oneOf('tornroll'), oid: isOid, place, receipts: list(receipt, 10_000) }),
  reference: fields({ kind: oneOf('reference'), oid: isOid, place, which: oneOf('howto', 'actions') }),
};
const piece: Shape = v => obj(v) && typeof v.kind === 'string' && Object.hasOwn(PIECES, v.kind)
  && PIECES[v.kind as PieceRecord['kind']](v);

const SINGLETONS: Record<string, Shape> = {
  yards: fields({ yards: list(fields({ name: str(CAPS.name), named: bool,
    items: list(fields({ name: str(CAPS.name), records: list(piece) })) }), 100) }),
  meta: fields({ round: int(0, 10_000), rolls: int(0, 1e9) }),
  book: fields({ claims: dict(str(CAPS.id)), gv: int(0, Number.MAX_SAFE_INTEGER), tomb: dict(int(0, Number.MAX_SAFE_INTEGER), TOMBS) },
    { hillGv: int(0, Number.MAX_SAFE_INTEGER) }),
  tape: fields({ receipts: list(receipt, 10_000) }),
};

/**
 * Whether `value` is a well-formed record for key `rid`, field by field: types, ranges and string
 * caps. Anything off rejects the record whole. A piece's oid must match its key.
 */
export function check(rid: Rid, value: unknown): value is Rec {
  if (isPiece(rid)) return piece(value) && (value as PieceRecord).oid === oidOf(rid);
  return Object.hasOwn(SINGLETONS, rid) && SINGLETONS[rid]!(value);
}
