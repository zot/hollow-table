// CRC: crc-Records.md | Seq: seq-save.md | R340, R341, R343, R347, R348, R362, R360, R381, R380, R407-409, R419, R426, R436, R439, R486, R488, R491, R498-R500, R524, R525, R532, R533, R536, R542, R550, R557
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
export type DamageSlot = {
  name: string; boxes: boolean[]; spent: number[];
  /** R312: waiting for the attacker's name: the attacking character's name and the receipt it came from. */
  naming?: { by: string; id: string };
};
// R341, R343: a Conviction (under Biases) or a Burden (under Afflictions): its name, the overflow
// points it has absorbed, the Levels tapped until End, and while new, the attacker's name it waits for.
export const LASTING = ['bias', 'affliction'] as const satisfies readonly Damage[];
export type LastingColumn = (typeof LASTING)[number];
export type Lasting = { name: string; points: number; spent: number; naming?: { by: string; id: string } };
/** R340: what a name waits in: a row's named Slot, or the column's Conviction or Burden. */
export type NameRow = RowName | 'lasting';

// R264: `absorb` is no longer read (a column's absorb is worked out from Wis or Con); it stays so
// old games load.
export type CardBack = {
  damage: Record<Damage, Record<RowName, DamageSlot>>; absorb: Record<Damage, number>; notes: Marked;
  lasting?: Partial<Record<LastingColumn, Lasting>>;
};

/** Every Damage slot of a back, each made by `f` from its column and row. */
export function damageSlots(f: (d: Damage, r: RowName) => DamageSlot): CardBack['damage'] {
  const column = (d: Damage) => Object.fromEntries(ROWS.map(r => [r, f(d, r)])) as Record<RowName, DamageSlot>;
  return Object.fromEntries(DAMAGE.map(d => [d, column(d)])) as CardBack['damage'];
}

// R26, R28, R126: a character is its pool and its card; name is public, front and back secret.
export type Character = {
  kind: 'character'; oid: Oid; owner: Who; name: string; pool: Place; card: Place;
  flipped: boolean; gathered: boolean; front: Marked; back: CardBack;
  /** R391: the entries revealed to the table, each by its key; absent when none. */
  shown?: string[];
  /** R400: an NPC's Info cards, a text each; absent when none. */
  info?: Marked[];
  /** R584: the docket it is in, at its card's offset from the label; absent when in none. */
  pin?: Pin;
};

/** A tapped card's ledger: Levels put in by each source (`<character oid>:<name>`). */
export type TapLedger = { ledger: Record<string, number>; current: string };

// R47, R462, R98: an Influence card, readable only by whoever may read its home character.
export type Influence = {
  kind: 'influence'; oid: Oid; home: Oid; where: Where; n: number; name: string; sign: Sign;
  points: number; used: boolean; crit: boolean; tap?: TapLedger; damage?: Damage;
  /** R463: tapped from a Motivation, a Main Pool Influence. */
  mot?: true;
  /** R362, R353: put in its actor's Main pool by the action it suffers, for that action's roll only. */
  once?: true;
  /** R464: a tap the GM rules on: why, the Levels fed under it by source, and whether it was plain. */
  flag?: Flag;
};
/** R464: why a card is flagged; `fed` and `plain` only where the card may be read. */
export type Flag = { why: string; fed?: Record<string, number>; plain?: true };

// R36, R38: a chip; a loose odd point is `points: 1`, and `rider` is a +1 riding the chip.
// R360: `by` is who put it in a pool; none on a Roll Up's chip or one from before.
export type Chip = { kind: 'chip'; oid: Oid; where: Where; n: number; sign: Sign; points: number; rider: boolean; by?: Who };

// R27, R536, R584: paper pinned to a card or a docket (`card` names either), at its offset from the card or label;
// a character in a docket, its card at its offset from the label.
export type Pin = { card: Oid; dx: number; dy: number };
// R499, R500, R577, R581: paper's owner, at first its maker (`by`; none on paper from before, which counts
// as the GM's), the players who read it besides its owner (`to`; absent is everyone, and the GM reads any
// with `to`), `mine`, its owner's alone, kept under `m:`, and `handed`, a "just me" note on the table on
// its way to its new owner's page.
export type Readers = { by?: Who; to?: string[]; mine?: true; handed?: true };
// R248: `big` is the big sticky, for the GM's long notes.
export type Sticky = { kind: 'sticky'; oid: Oid; place: Place; text: Marked; pin?: Pin; big?: boolean } & Readers;
export type Text = { kind: 'text'; oid: Oid; place: Place; text: Marked; pin?: Pin } & Readers;
export type Image = { kind: 'image'; oid: Oid; place: Place; blob: string; w: number; h: number; pin?: Pin } & Readers;
// R532, R533: a docket, the label of a bundle of paper: its name, and paper's maker and readers.
export type Docket = { kind: 'docket'; oid: Oid; place: Place; name: string } & Readers;
export type Paper = Sticky | Text | Image | Docket;
/** Paper that pins to a card or a docket (R27, R536): a docket never does. */
export type Pinnable = Sticky | Text | Image;
/** R499, R533: whether a record is paper. */
export function isPaper(r: { kind?: string }): r is Paper { return isPinnable(r) || r.kind === 'docket'; }
/** R27, R536: whether a record is paper that pins. */
export function isPinnable(r: { kind?: string }): r is Pinnable { return r.kind === 'sticky' || r.kind === 'text' || r.kind === 'image'; }
/** R542: the dockets tied on this page, a record of its own. */
export type Tied = { tied: Oid[] };
/** R499: paper that names who reads it, or is its owner's alone. */
export function isPrivate(r: { kind?: string }): boolean { return isPaper(r) && (!!r.to || !!r.mine || !!r.handed); }
/** R577: paper's owner: its `by`, the GM for paper without one. */
export function ownerOf(r: Paper): Who { return r.by ?? GM; }

export const DICE = ['W', 'G', 'R', 'B', 'Y'] as const;
export type DieColor = (typeof DICE)[number];
export type Die = { c: DieColor; v: number; added: boolean; dropped: boolean };
export type Crit = { max: number; dbl: number; chosen: 'max' | 'dbl'; locked: boolean };

// R319: what a roll is: `?` for not saying, plain Skill use, Create Influence, the three Attacks, and
// Bunkum's actions against Defend.
export const ROLL_TYPES = ['?', 'skill', 'influence', 'phys', 'mental', 'psych', 'infer', 'impress', 'request'] as const;
export type RollType = (typeof ROLL_TYPES)[number];
/** R306: an Attack's kind, which picks its Damage column. */
export const ATTACKS = ['phys', 'mental', 'psych'] as const;
export type AttackKind = (typeof ATTACKS)[number];
export const isAttack = (t: RollType): t is AttackKind => (ATTACKS as readonly string[]).includes(t);

/**
 * R308, R312: the Attack a receipt can give its target: the target and its name, the attacking
 * character's name (`from`), the kind, the
 * Result to absorb; once taken, the Slots waiting for the attacker's names.
 */
export type Attack = {
  target: Oid; name: string; from: string; kind: AttackKind; result: number; taken?: boolean;
  waiting?: { damage: Damage; row: NameRow }[];
};
export type Receipt = {
  id: string; at: number; title: string; by?: string; dice: Die[];
  /** R317: the action's label, on every page's receipt. */
  action?: string;
  influence?: number; base?: number; vs?: string;
  row?: string; resolution: string; level: string; outcome: string; crit?: Crit; priv?: boolean;
  attack?: Attack;
  /** R439, R441: the transfer a successful Request against an NPC offers, at its Success Level; `done` once made. */
  transfer?: { target: Oid; name: string; sl: number; done?: { resource: string; moved: number; extra: number } };
  /** This page's own roll has reached the table (R107). */
  ok?: boolean;
};

export type TornRoll = { kind: 'tornroll'; oid: Oid; place: Place; receipts: Receipt[] };
export type Reference = { kind: 'reference'; oid: Oid; place: Place; which: 'howto' | 'actions' };

/** R407, R412, R413: a Connection Table row: an NPC's, linked to its card by `oid` once it has one, or a group's. */
export type ConnRow = { id: Oid; name: string; oid?: Oid; group?: true };
/**
 * R407-409: the Connection Table, one per game and the GM's alone: its rows, and the Levels set, -5
 * to 5, keyed `<row id>><column id>` (a cell not there is 0). `away` is put away: kept, not drawn.
 */
export type Connections = { kind: 'connections'; oid: Oid; place: Place; away?: true; rows: ConnRow[]; cells: Record<string, number> };

/**
 * R419, R426: an Opinion Record, held by the Connection Table row of its NPC or group (`holder`), of a
 * row or a PC (`of`): the GM's Opinions, a line each. It has no place: it is drawn under its NPC's card.
 */
export type Opinion = {
  kind: 'opinion'; oid: Oid; holder: Oid; of: Oid; text: Marked;
  /** R436: its revealed lines, by their words; once one is, the cards it shows under and what it is of. */
  shown?: string[]; on?: Oid[]; name?: string;
};

export type PieceRecord = Character | Influence | Chip | Sticky | Text | Image | Docket | TornRoll | Reference | Connections | Opinion;

/** R403: an Info card's burial carries its NPC, its place among the NPC's cards and its words, and no records. */
export type InfoBurial = { oid: Oid; k: number; text: Marked };
/** `gm` names a GM card's burial (R403, R406), kept when it is masked, so a player's Boot Hill merges back. */
export type Burial = { name: string; records: PieceRecord[]; info?: InfoBurial; gm?: Oid };
export type Graveyard = { name: string; named: boolean; items: Burial[] };
export type Yards = { yards: Graveyard[] };
/** R488: this page's own burials (torn tapes), each with the name of the graveyard it went to. */
export type Hill = { hill: { yard: string; burial: Burial }[] };
// R278: `counts` numbers each character's rolls on their own.
// R380: `marked`: an older game's Fields and Skills have been marked.
export type Meta = { round: number; rolls: number; counts?: Record<Oid, number>; marked?: true };
/** R326, R336: what was pointed at on the opponent's card, by name. */
export type Against = { def: 'mental' | 'psych' } | { act: string } | { fld: string } | { skl: string };
// R381: a character's roll row, one per character, a piece of the table.
export type Roller = {
  pool: Oid; action: string; opponent: Opponent | null; defend: 'mental' | 'psych'; row: string | null;
  byHand: boolean; hand: { yellows: number; bonus: number };
  /** R104, R275: the GM's private switch. */
  priv?: boolean;
  /** R319: what the roll is (absent counts as `?`). */
  type?: RollType;
  /** R316: the alternative of a `/` label whose die was clicked. */
  alt?: string;
  /** R326, R336: what was pointed at on the opponent's card, by name; absent, Defend (R328). */
  against?: Against;
  /** R429: a Reaction roll, from this NPC's card's record of the character. */
  reaction?: Oid;
};
export type Rows = { rows: Record<Oid, Roller> };
// R347, R348: the world's Total Influence in the brass tray; `set` false (or no record) is a blank
// tray. Written only by the GM's page; a player's page gets `{set, total: 0}` (Visibility).
export type World = { set: boolean; total: number };
/** The opponent a roll aimed at the world names, in place of an oid (an oid is eight hex digits). */
export const WORLD = 'world';
export type Opponent = Oid | typeof WORLD;
/**
 * The GM's page only, never sent: who holds which name, the table's version, the version each piece
 * was deleted at (at most TOMBS), the version Boot Hill last changed at, and (R444) the version and tab
 * of each piece's last change (at most TOMBS), and (R448) the floor: the newest version those caps dropped.
 */
export type Book = {
  claims: Record<string, string>; gv: number; tomb: Record<Rid, number>; hillGv?: number; kept?: KeptRoll[];
  last?: Record<Rid, { g: number; by: string }>; floor?: number;
};

/**
 * R308, R313: a roll the GM's page keeps so its CRIT, its Attack's take and its names can be acted on
 * later, across a reload: the rolling character, the roll's number on the wire, its three receipts,
 * and where the roller's own receipt goes (a player's tab and sealing key); `priv` is never sent.
 */
export type KeptRoll = {
  character: Oid; n: number; full: Receipt; roller: Receipt; table: Receipt; tab?: string; sealKey?: string; priv?: true;
};
/** The most rolls the book keeps, oldest dropped first. */
export const KEPT = 200;
export const TOMBS = 3000;
/** Each page's own; only a page arriving is sent the table's view of the GM's (R465, R490). R491: `last`, the GM's
 * time of the newest roll it held before a tear. */
export type Tape = { receipts: Receipt[]; last?: number };
/** R491: the GM's time of the newest roll the tape has held (a roll's receipt is stamped by the GM's page); 0 for none. */
export function newestRoll(tape: Tape | undefined): number {
  return Math.max(tape?.last ?? 0, ...(tape?.receipts ?? []).filter(r => r.id.startsWith('roll-')).map(r => r.at));
}

// R524, R525: this page's own drawers (the GM's saved with the game, a player's with their copy).
export type Drawer = 'characters' | 'npcs' | 'papers';
export type Filed = { drawer: Drawer; name: string; records: PieceRecord[] };
// R550: the desks, each its name, whether it was named, and what is filed in it. A desk record from
// before held one desk's entries (`OldDesk`); Drawers.desksOf reads either.
// R557: a desk's desktop (`top`, kept while another is set out), and where each traveler last lay on it.
export type Spot = { pool?: Place; card?: Place; gathered?: boolean; place?: Place };
export type OneDesk = { name: string; named: boolean; items: Filed[]; top?: PieceRecord[]; spots?: Record<Oid, Spot> };
/** R557: `out` is the desk set out, the first when absent. */
export type Desk = { desks: OneDesk[]; out?: number };
export type OldDesk = { desk: Filed[] };

export type Rec = PieceRecord | Yards | Meta | World | Rows | Book | Tape | Hill | Desk | OldDesk | Tied;

// Player-made characters number from here up, so they can't collide with the GM's.
export const PLAYER_OIDS = 0x100000;

export function isPiece(rid: Rid): boolean { return rid.startsWith('o:'); }
export function oidOf(rid: Rid): Oid { return rid.slice(2); }
export function ridOf(oid: Oid): Rid { return 'o:' + oid; }
/** R486: a torn roll is this page's own, under `t:` and its oid. */
export function isTorn(rid: Rid): boolean { return rid.startsWith('t:'); }
/** R500: a player's "just me" paper is this page's own, under `m:` and its oid. */
export function isMine(rid: Rid): boolean { return rid.startsWith('m:'); }
/** Drawn on the table: the table's pieces, and this page's torn rolls and own paper. */
export function onTable(rid: Rid): boolean { return isPiece(rid) || isTorn(rid) || isMine(rid); }
/** A piece's key: `t:` for a torn roll, `m:` for `mine` paper (R500), else ridOf. */
export function ridFor(r: PieceRecord): Rid {
  if (r.kind === 'tornroll') return 't:' + r.oid;
  if (minePaper(r)) return 'm:' + r.oid;
  return ridOf(r.oid);
}
/** R500: paper that is its maker's alone. */
function minePaper(r: PieceRecord): boolean { return isPaper(r) && !!r.mine; }
const LOCAL = new Set<Rid>(['book', 'tape', 'hill', 'desk', 'tied']);
/** R486, R500, R524, R542: each page's own, never sent: the GM's book, every page's tape, its Hill, desk and tied dockets, its torn rolls and its own paper. */
export function isLocal(rid: Rid): boolean { return LOCAL.has(rid) || isTorn(rid) || isMine(rid); }

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
const naming = fields({ by: str(CAPS.name), id: str(CAPS.id) });
const slot = fields({ name: str(CAPS.name), boxes: list(bool, 20), spent: list(int(0, 100), 21) },
  { naming });
const column = fields(Object.fromEntries(ROWS.map(r => [r, slot])));
const damage = fields(Object.fromEntries(DAMAGE.map(d => [d, column])));
const absorb = fields(Object.fromEntries(DAMAGE.map(d => [d, int(0, 100)])));
const lastingOne = fields({ name: str(CAPS.name), points: int(0, 10_000), spent: int(0, 100) }, { naming });
const lasting = fields({}, Object.fromEntries(LASTING.map(d => [d, lastingOne])));
const back = fields({ damage, absorb, notes: marked }, { lasting });
const die = fields({ c: oneOf(...DICE), v: int(1, 6), added: bool, dropped: bool }); // R109
export const receipt = fields(
  { id: str(CAPS.id), at: num(0, 1e15), title: str(CAPS.name), dice: list(die, 200),
    resolution: str(CAPS.name), level: str(CAPS.name), outcome: str(CAPS.name) },
  { by: str(CAPS.name), action: str(CAPS.name), influence: int(-1000, 1000), base: int(-1000, 1000), vs: str(CAPS.name), row: str(CAPS.name), ok: bool,
    crit: fields({ max: int(0, 10_000), dbl: int(0, 10_000), chosen: oneOf('max', 'dbl'), locked: bool }),
    priv: bool,
    attack: fields({ target: isOid, name: str(CAPS.name), from: str(CAPS.name), kind: oneOf(...ATTACKS), result: int(0, 10_000) },
      { taken: bool, waiting: list(fields({ damage: oneOf(...DAMAGE), row: oneOf(...ROWS, 'lasting') }), 20) }),
    transfer: fields({ target: isOid, name: str(CAPS.name), sl: int(1, 5) },
      { done: fields({ resource: str(CAPS.name), moved: int(0, 5), extra: int(0, 5) }) }) });

// R498-R500: paper's maker, its readers and whether it is its maker's alone.
const readers = { by: str(CAPS.name), to: list(str(CAPS.name), 200), mine: oneOf(true), handed: oneOf(true) };
/** R532: how long a docket's name may be. */
export const DOCKET_NAME = 40;
const PIECES: Record<PieceRecord['kind'], Shape> = {
  character: fields({ kind: oneOf('character'), oid: isOid, owner: str(CAPS.name), name: str(CAPS.name), pool: place,
    card: place, flipped: bool, gathered: bool, front: marked, back }, { shown: list(marked), info: list(marked, 20), pin }),
  influence: fields({ kind: oneOf('influence'), oid: isOid, home: isOid, where, n: int(0, CAPS.list), name: str(CAPS.name),
    sign, points, used: bool, crit: bool },
    { tap: fields({ ledger: dict(int(0, 100)), current: str(CAPS.name) }), damage: oneOf(...DAMAGE), mot: oneOf(true), once: oneOf(true),
      flag: fields({ why: str(CAPS.name) }, { fed: dict(int(0, 100)), plain: oneOf(true) }) }),
  chip: fields({ kind: oneOf('chip'), oid: isOid, where, n: int(0, CAPS.list), sign, points, rider: bool }, { by: str(CAPS.name) }),
  sticky: fields({ kind: oneOf('sticky'), oid: isOid, place, text: marked }, { pin, big: bool, ...readers }),
  text: fields({ kind: oneOf('text'), oid: isOid, place, text: marked }, { pin, ...readers }),
  image: fields({ kind: oneOf('image'), oid: isOid, place, blob: v => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v),
    w: int(1, 100_000), h: int(1, 100_000) }, { pin, ...readers }),
  docket: fields({ kind: oneOf('docket'), oid: isOid, place, name: str(DOCKET_NAME) }, readers),
  tornroll: fields({ kind: oneOf('tornroll'), oid: isOid, place, receipts: list(receipt, 10_000) }),
  reference: fields({ kind: oneOf('reference'), oid: isOid, place, which: oneOf('howto', 'actions') }),
  connections: fields({ kind: oneOf('connections'), oid: isOid, place,
    rows: list(fields({ id: isOid, name: str(CAPS.name) }, { oid: isOid, group: oneOf(true) }), 200),
    cells: dict(int(-5, 5), 40_000) }, { away: oneOf(true) }),
  opinion: fields({ kind: oneOf('opinion'), oid: isOid, holder: isOid, of: isOid, text: marked },
    { shown: list(str(CAPS.text)), on: list(isOid), name: str(CAPS.name) }),
};
const piece: Shape = v => obj(v) && typeof v.kind === 'string' && Object.hasOwn(PIECES, v.kind)
  && PIECES[v.kind as PieceRecord['kind']](v);

const filedEntry = fields({ drawer: oneOf('characters', 'npcs', 'papers'), name: str(CAPS.name), records: list(piece) });
const burial = fields({ name: str(CAPS.name), records: list(piece) }, { info: fields({ oid: isOid, k: int(0, 20), text: marked }), gm: isOid });
const SINGLETONS: Record<string, Shape> = {
  yards: fields({ yards: list(fields({ name: str(CAPS.name), named: bool, items: list(burial) }), 100) }),
  hill: fields({ hill: list(fields({ yard: str(CAPS.name), burial }), 10_000) }),
  desk: v => fields({ desks: list(fields({ name: str(CAPS.name), named: bool, items: list(filedEntry, 10_000) },
    { top: list(piece, 10_000), spots: dict(fields({}, { pool: place, card: place, gathered: bool, place }), 10_000) }), 100) }, { out: int(0, 99) })(v)
    || fields({ desk: list(filedEntry, 10_000) })(v),   // R550: one from before
  meta: fields({ round: int(0, 10_000), rolls: int(0, 1e9) }, { counts: dict(int(0, 1e9), 10_000), marked: oneOf(true) }),
  world: fields({ set: bool, total: int(-1000, 1000) }),
  rows: fields({ rows: dict(fields({ pool: isOid, action: str(CAPS.name), opponent: (v: unknown) => v === null || v === WORLD || isOid(v),
    defend: oneOf('mental', 'psych'), row: (v: unknown) => v === null || str(32)(v), byHand: bool,
    hand: fields({ yellows: int(-100, 100), bonus: int(-1000, 1000) }) },
  { priv: bool, type: oneOf(...ROLL_TYPES), alt: str(CAPS.name), against: (v: unknown) => [fields({ def: oneOf('mental', 'psych') }),
    fields({ act: str(CAPS.name) }), fields({ fld: str(CAPS.name) }), fields({ skl: str(CAPS.name) })].some(f => f(v)),
    reaction: isOid }), 1000) }),
  book: fields({ claims: dict(str(CAPS.id)), gv: int(0, Number.MAX_SAFE_INTEGER), tomb: dict(int(0, Number.MAX_SAFE_INTEGER), TOMBS) },
    { hillGv: int(0, Number.MAX_SAFE_INTEGER),
      last: dict(fields({ g: int(0, Number.MAX_SAFE_INTEGER), by: str(CAPS.id) }), TOMBS),
      floor: int(0, Number.MAX_SAFE_INTEGER),
      kept: list(fields({ character: isOid, n: int(0, Number.MAX_SAFE_INTEGER), full: receipt, roller: receipt, table: receipt },
        { tab: str(CAPS.id), sealKey: str(CAPS.text), priv: oneOf(true) }), KEPT) }),
  tape: fields({ receipts: list(receipt, 10_000) }, { last: int(0, Number.MAX_SAFE_INTEGER) }),
  tied: fields({ tied: list(isOid, 10_000) }),
};

/**
 * Whether `value` is a well-formed record for key `rid`, field by field: types, ranges and string
 * caps. Anything off rejects the record whole. A piece's oid must match its key.
 */
export function check(rid: Rid, value: unknown): value is Rec {
  // R500: `mine` paper is never the table's.
  if (isPiece(rid)) return piece(value) && (value as PieceRecord).oid === oidOf(rid) && !minePaper(value as PieceRecord);
  if (isTorn(rid)) return PIECES.tornroll(value) && (value as PieceRecord).oid === oidOf(rid);   // R486
  if (isMine(rid)) return piece(value) && minePaper(value as PieceRecord) && (value as PieceRecord).oid === oidOf(rid);   // R500
  return Object.hasOwn(SINGLETONS, rid) && SINGLETONS[rid]!(value);
}
