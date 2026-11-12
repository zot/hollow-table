// src/store/blobs.ts
async function sha256(bytes) {
  const buf = bytes instanceof Blob ? await bytes.arrayBuffer() : bytes;
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
var BlobStore = class {
  #db;
  #measure;
  #urls;
  #shown = /* @__PURE__ */ new Map();
  constructor(db, measure2, urls = { create: (b) => URL.createObjectURL(b), revoke: (u) => URL.revokeObjectURL(u) }) {
    this.#db = db;
    this.#measure = measure2;
    this.#urls = urls;
  }
  // R26: an image from the supply belongs to the game by its hash.
  /** Stores a file and gives what an Image record needs. */
  async add(file) {
    const blob = await sha256(file), size = await this.#measure(file);
    await this.#db.tx(["blobs"], "readwrite", (t) => t.put("blobs", blob, file));
    return { blob, ...size };
  }
  get(hash) {
    return this.#db.tx(["blobs"], "readonly", (t) => t.get("blobs", hash));
  }
  // R194: bytes from another page are kept only if they hash to the name asked for.
  /** Keeps bytes another page (or an import) sent, if they are what `hash` names. */
  async accept(hash, bytes) {
    if (await sha256(bytes) !== hash) return false;
    await this.#db.tx(["blobs"], "readwrite", (t) => t.put("blobs", hash, bytes));
    return true;
  }
  /** An object URL for showing the image; each url() is paired with a release(). */
  async url(hash) {
    const shown = this.#shown.get(hash);
    if (shown) {
      shown.n++;
      return shown.url;
    }
    const blob = await this.get(hash);
    if (!blob) return void 0;
    const again = this.#shown.get(hash);
    if (again) {
      again.n++;
      return again.url;
    }
    const url = this.#urls.create(blob);
    this.#shown.set(hash, { url, n: 1 });
    return url;
  }
  /** One image stops showing; the URL is revoked when none does. */
  release(hash) {
    const shown = this.#shown.get(hash);
    if (!shown || --shown.n > 0) return;
    this.#urls.revoke(shown.url);
    this.#shown.delete(hash);
  }
};

// src/store/db.ts
var STORES = ["games", "records", "checkpoints", "blobs"];
var done = (r) => new Promise((ok, fail) => {
  r.onsuccess = () => ok(r.result);
  r.onerror = () => fail(r.error);
});
var IdbDb = class _IdbDb {
  #db;
  constructor(db) {
    this.#db = db;
  }
  static async open(name = "hollow-table") {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
    };
    return new _IdbDb(await done(req));
  }
  tx(stores, mode, fn) {
    const x = this.#db.transaction(stores, mode);
    const landed = new Promise((ok, fail) => {
      x.oncomplete = () => ok();
      x.onerror = () => fail(x.error);
      x.onabort = () => fail(x.error ?? new Error("transaction aborted"));
    });
    const range = (prefix) => prefix === void 0 ? void 0 : IDBKeyRange.bound([prefix], [prefix, []]);
    const t = {
      get: async (s, k) => await done(x.objectStore(s).get(k)),
      put: async (s, k, v) => {
        await done(x.objectStore(s).put(v, k));
      },
      del: async (s, k) => {
        await done(x.objectStore(s).delete(k));
      },
      all: async (s, prefix) => {
        const store = x.objectStore(s), r = range(prefix);
        const [keys, values] = await Promise.all([done(store.getAllKeys(r)), done(store.getAll(r))]);
        return keys.map((k, i) => [k, values[i]]);
      }
    };
    return (async () => {
      let result;
      try {
        result = await fn(t);
      } catch (e) {
        landed.catch(() => void 0);
        try {
          x.abort();
        } catch {
        }
        throw e;
      }
      await landed;
      return result;
    })();
  }
};

// src/model/records.ts
var SLOTS = ["bonus", "main", "edge", "stagger", "bias", "affliction", "injury"];
var ROWS = ["mild", "min", "sig", "maj"];
var DAMAGE = ["bias", "affliction", "injury"];
function damageSlots(f) {
  const column2 = (d) => Object.fromEntries(ROWS.map((r) => [r, f(d, r)]));
  return Object.fromEntries(DAMAGE.map((d) => [d, column2(d)]));
}
var DICE = ["W", "G", "R", "B", "Y"];
function isPiece(rid) {
  return rid.startsWith("o:");
}
function oidOf(rid) {
  return rid.slice(2);
}
function ridOf(oid) {
  return "o:" + oid;
}
var CAPS = { name: 200, text: 2e4, id: 64, coord: 1e6, list: 500 };
var obj = (v) => typeof v === "object" && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
var num = (lo, hi) => (v) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
var int = (lo, hi) => (v) => num(lo, hi)(v) && Number.isInteger(v);
var str = (cap) => (v) => typeof v === "string" && v.length <= cap;
var bool = (v) => typeof v === "boolean";
var oneOf = (...xs) => (v) => xs.includes(v);
var list = (each, cap = CAPS.list) => (v) => Array.isArray(v) && v.length <= cap && v.every(each);
var dict = (each) => (v) => obj(v) && Object.keys(v).length <= CAPS.list && Object.keys(v).every((k) => k.length <= CAPS.name && each(v[k]));
var isOid = (v) => typeof v === "string" && /^[0-9a-f]{8}$/.test(v);
function fields(req, opt = {}) {
  return (v) => obj(v) && Object.keys(req).every((k) => k in v && req[k](v[k])) && Object.keys(v).every((k) => k in req || k in opt && opt[k](v[k]));
}
var coord = num(-CAPS.coord, CAPS.coord);
var place = fields({ x: coord, y: coord, z: int(0, CAPS.coord), tilt: num(-45, 45) });
var pin = fields({ card: isOid, dx: coord, dy: coord });
var sign = oneOf(1, -1);
var points = int(0, 1e3);
var where = (v) => v === "drawer" || v === "used" || fields({ slot: isOid, name: oneOf(...SLOTS) })(v) || fields({ table: place })(v);
var marked = str(CAPS.text);
var slot = fields({ name: str(CAPS.name), boxes: list(bool, 20), spent: list(int(0, 100), 21) });
var column = fields(Object.fromEntries(ROWS.map((r) => [r, slot])));
var damage = fields(Object.fromEntries(DAMAGE.map((d) => [d, column])));
var absorb = fields(Object.fromEntries(DAMAGE.map((d) => [d, int(0, 100)])));
var back = fields({ damage, absorb, notes: marked });
var die = fields({ c: oneOf(...DICE), v: int(1, 6), added: bool, dropped: bool });
var receipt = fields(
  {
    id: str(CAPS.id),
    at: num(0, 1e15),
    title: str(CAPS.name),
    dice: list(die, 200),
    resolution: str(CAPS.name),
    level: str(CAPS.name),
    outcome: str(CAPS.name)
  },
  {
    by: str(CAPS.name),
    influence: int(-1e3, 1e3),
    vs: str(CAPS.name),
    row: str(CAPS.name),
    crit: fields({ max: int(0, 1e4), dbl: int(0, 1e4), chosen: oneOf("max", "dbl"), locked: bool }),
    priv: bool
  }
);
var PIECES = {
  character: fields({
    kind: oneOf("character"),
    oid: isOid,
    owner: str(CAPS.name),
    name: str(CAPS.name),
    pool: place,
    card: place,
    flipped: bool,
    gathered: bool,
    front: marked,
    back
  }),
  influence: fields(
    {
      kind: oneOf("influence"),
      oid: isOid,
      home: isOid,
      where,
      n: int(0, CAPS.list),
      name: str(CAPS.name),
      sign,
      points,
      used: bool,
      crit: bool
    },
    { tap: fields({ ledger: dict(int(0, 100)), current: str(CAPS.name) }), damage: oneOf(...DAMAGE) }
  ),
  chip: fields({ kind: oneOf("chip"), oid: isOid, where, n: int(0, CAPS.list), sign, points, rider: bool }),
  sticky: fields({ kind: oneOf("sticky"), oid: isOid, place, text: marked }, { pin }),
  text: fields({ kind: oneOf("text"), oid: isOid, place, text: marked }, { pin }),
  image: fields({
    kind: oneOf("image"),
    oid: isOid,
    place,
    blob: (v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v),
    w: int(1, 1e5),
    h: int(1, 1e5)
  }, { pin }),
  tornroll: fields({ kind: oneOf("tornroll"), oid: isOid, place, receipts: list(receipt, 1e4) }),
  reference: fields({ kind: oneOf("reference"), oid: isOid, place, which: oneOf("howto", "actions") })
};
var piece = (v) => obj(v) && typeof v.kind === "string" && Object.hasOwn(PIECES, v.kind) && PIECES[v.kind](v);
var SINGLETONS = {
  yards: fields({ yards: list(fields({
    name: str(CAPS.name),
    named: bool,
    items: list(fields({ name: str(CAPS.name), records: list(piece) }))
  }), 100) }),
  meta: fields({ round: int(0, 1e4), rolls: int(0, 1e9) }),
  book: fields({ claims: dict(str(CAPS.id)), gv: int(0, Number.MAX_SAFE_INTEGER), tomb: dict(int(0, Number.MAX_SAFE_INTEGER)) }),
  tape: fields({ receipts: list(receipt, 1e4) })
};
function check(rid, value) {
  if (isPiece(rid)) return piece(value) && value.oid === oidOf(rid);
  return Object.hasOwn(SINGLETONS, rid) && SINGLETONS[rid](value);
}

// src/model/game.ts
var Refused = class extends Error {
  rid;
  constructor(rid) {
    super(`refused: ${rid} is not a well-formed record`);
    this.rid = rid;
  }
};
function same(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  const ob = b;
  return ka.every((k) => Object.hasOwn(ob, k) && same(a[k], ob[k]));
}
var Game = class {
  #records = /* @__PURE__ */ new Map();
  #listeners = /* @__PURE__ */ new Set();
  get(rid) {
    return this.#records.get(rid);
  }
  /** Every record, rid first. */
  all() {
    return [...this.#records];
  }
  // Seq: seq-save.md#1.2, seq-save.md#1.3
  /**
   * The only way to mutate. Puts are checked as they are made, and nothing is applied until `fn`
   * returns, so a refused put (or any throw) leaves the game as it was. Listeners then hear the
   * rids that really changed, once; a put equal to what is there is not a change.
   */
  change(fn) {
    const staged = /* @__PURE__ */ new Map();
    fn({
      put: (rid, value) => {
        if (!check(rid, value)) throw new Refused(rid);
        staged.set(rid, value);
      },
      del: (rid) => {
        staged.set(rid, void 0);
      }
    });
    const changed = /* @__PURE__ */ new Set();
    for (const [rid, value] of staged) {
      if (same(this.#records.get(rid), value)) continue;
      if (value === void 0) this.#records.delete(rid);
      else this.#records.set(rid, value);
      changed.add(rid);
    }
    this.#tell(changed);
    return changed;
  }
  /** Replaces everything (opening a game, a restore, a full table arriving); every rid is heard. */
  load(records) {
    const changed = new Set(this.#records.keys());
    this.#records = new Map(records);
    for (const rid of this.#records.keys()) changed.add(rid);
    this.#tell(changed);
  }
  /** Hear each change's rids; the function returned stops it. */
  listen(fn) {
    this.#listeners.add(fn);
    return () => {
      this.#listeners.delete(fn);
    };
  }
  #tell(rids) {
    if (rids.size) for (const fn of [...this.#listeners]) fn(rids);
  }
};

// src/rules/yards.ts
function empty() {
  return { yards: [{ name: "Graveyard 1", named: false, items: [] }] };
}

// src/store/playtest.ts
var SAM = "00000001";
var BEAUFORD = "00000002";
var DEVREUX = "00000003";
var at = (x, y) => ({ x, y, z: 0, tilt: 0 });
function back2(boxes = {}, notes = "") {
  const damage2 = damageSlots((d, r) => {
    const extra = d === "injury" ? 0 : boxes[r] ?? 0;
    return { name: "", boxes: Array(extra).fill(false), spent: [] };
  });
  return { damage: damage2, absorb: { bias: 0, affliction: 0, injury: 0 }, notes };
}
function character(oid, owner, name, x, front, b) {
  return { kind: "character", oid, owner, name, pool: at(x, 20), card: at(x, 300), flipped: false, gathered: true, front, back: b };
}
var SAM_FRONT = `<head>Samuel Diamond, Rank 3</head>
Cha 2   Int 2   Wis 4
Private Investigator 2 (5XP)
Investigation (x2)
Advocacy (x2)
Fighting\u2020 (guns)
Sparker 2 (6XP)
\u2713 Glimmersense (x2) 3
Glimmer Lore (x2)
Composure
Skills 1: Suasion (Detective), Tact, Lock Picking, Fire Starting, Wilderness Survival
<act>Mental Atk / Req: 2, +2</act>
<act>Psych Atk / Req: 3, +2</act>
<act>Shoot: 4, +2 (unfr, x 2)</act>
<act>Infer: 4, +2</act>
<act>Impress: 4, +2</act>
<def>Defend: mental 2 / psych 4</def>
Sparked: 46  Grains: 14
<head>Hollow Memories</head>
Wicked deeds and hanging
<head>Resources</head>
<res>Money +Maj</res>
<res>Ammo +Sig</res>`;
var BEAUFORD_FRONT = `<head>Beauford T. Winkums, Rnk 3</head>
Cha 2   Int 3   Wis 1
Snakeoil Salesman 3 (5XP)
Rhetoric (Salesman) (x2)
Finesse (x2, Rhetoric)
\u2713 Rationalization 4
Medicineshow Occultist 2 (6XP)
\u2713 Glimmer Lore (x2) 3
Medicinals (x2)
Composure (x2)
<head>Resources</head>
<res>Money +Min</res>, <res>Liquid Courage +Maj</res>
<act>Mental Atk / Req: 5, 1d</act>
<act>Tricky -Min: 5, 2d</act>
<act>Psych Atk / Req: 2, 1d</act>
<act>Infer: 2, 1d</act>
<act>Impress: 2, 1d</act>
<def>Defend: mental 2 / psych 4</def>
Sparked: 55  Grains: 5
<head>Hollow Memories</head>
Saw your child kidnapped
<head>Items</head>
Horse & wagon
Dice token: Farkas, uses 20`;
var DEVREUX_FRONT = `<head>Mistress Devreux</head>
Saloon Proprietor, Rank 3
Cha 3   Int 1   Wis 3
Skills 3: Savvy, Profession (Saloon Keeper), Streetwise
Skills 2: Musician, Composure, Gambling, Etiquette, Bargaining, Tact
Skills 1: Suasion (Charm)
<head>Motivations</head>
<inf>Keep the Peace +Sig</inf>
<inf>Self-Preservation +Sig</inf>
<inf>Old Sympathy for Sparkers +Min</inf>
<act>Attack: 4 (Suasion, Charm), +1</act>
<def>Defend: 6 / 5</def>
Slots: Mild, Min \xD73, Sig, Maj
<head>Resources</head>
<res>Saloon Gossip +Maj</res>
<res>Money +Sig</res>
<head>Items</head>
Dead Man's Die
(Free Token, 9 uses)`;
var STICKY = `Find: How did Trudy get infected?
Answer: started less than a month ago, before she lost her doll

Level 3

0. Obed found Trudy in the forest as an infant
0. She had her doll at that time and was dressed in rags
0. She's very clever and athletic
0. The doll is wooden, carved, extremely ugly, and disturbing

Q1: What is the doll?
A1: *super* important to Trudy.

Next session: first day in town, late at night at the hotel`;
var infl = (oid, name, points2, n) => ({ kind: "influence", oid, home: DEVREUX, where: "drawer", n, name, sign: 1, points: points2, used: false, crit: false });
function scene(sam = "Player 1", beauford = "Player 2") {
  const chip = { kind: "chip", oid: "00000007", where: { slot: BEAUFORD, name: "stagger" }, n: 0, sign: -1, points: 2, rider: false };
  const sticky = { kind: "sticky", oid: "00000008", place: at(1430, 20), text: STICKY };
  const ref = { kind: "reference", oid: "00000009", place: at(1430, 650), which: "actions" };
  return [
    character(SAM, sam, "Sam", 40, SAM_FRONT, back2({ min: 2 }, "Fire tools. Lantern. 6 Candles.\nPocket knife. Bedroll. Canteen.\nRope. Notebook and pencil.")),
    character(BEAUFORD, beauford, "Beauford", 500, BEAUFORD_FRONT, back2({ min: 1 })),
    character(DEVREUX, "GM", "Devreux", 960, DEVREUX_FRONT, back2({ min: 2 })),
    infl("00000004", "Keep the Peace", 4, 0),
    infl("00000005", "Self-Preservation", 4, 1),
    infl("00000006", "Old Sympathy for Sparkers", 2, 2),
    chip,
    sticky,
    ref
  ];
}
var PLAYTEST = "The 11-08 playtest";
function singletons() {
  return [["yards", empty()], ["meta", { round: 0, rolls: 0 }], ["book", { claims: {}, gv: 0, tomb: {} }], ["tape", { receipts: [] }]];
}
function playtest(sam, beauford) {
  return [...scene(sam, beauford).map((r) => [ridOf(r.oid), r]), ...singletons()];
}

// src/store/gamestore.ts
var SAVE_PAUSE = 400;
var KEEP_AUTO = 20;
var LAST = "hollow.last";
var pad = (n, w) => String(n).padStart(w, "0");
var GameStore = class {
  /** The open game. */
  game = new Game();
  /** What the open game is, or null before one is opened. */
  current = null;
  #db;
  #clock;
  #storage;
  #pending = /* @__PURE__ */ new Set();
  #timer = null;
  #saving = Promise.resolve();
  #busy = 0;
  #savedAt = null;
  #quiet = false;
  #seq = 0;
  constructor(db, clock2, storage) {
    this.#db = db;
    this.#clock = clock2;
    this.#storage = storage;
    this.game.listen((rids) => {
      if (this.#quiet) return;
      for (const rid of rids) this.#pending.add(rid);
      if (this.#timer !== null) this.#clock.clearTimeout(this.#timer);
      this.#timer = this.#clock.setTimeout(() => {
        this.#timer = null;
        void this.save();
      }, SAVE_PAUSE);
    });
  }
  #id(prefix) {
    return `${prefix}${pad(this.#clock.now(), 14)}-${pad(++this.#seq, 4)}`;
  }
  // R131: the last game opens on load; the first visit makes one from the playtest scene.
  /** Opens the game last open, or the newest, or (on a first visit) makes the playtest game. */
  async start() {
    const last = this.#read(LAST);
    const games = await this.list();
    const pick = games.find((g) => g.id === last) ?? games[0] ?? await this.add(PLAYTEST, playtest());
    return this.open(pick.id);
  }
  /** The browser's own games, newest opened first; players' copies are left out. */
  async list() {
    const all = await this.#db.tx(["games"], "readonly", (t) => t.all("games"));
    return all.map(([, g]) => g).filter((g) => !g.copyOf).sort((a, b) => b.opened - a.opened);
  }
  // R133: New game is an empty table beside the others.
  /** Stores a new game (not opened): its records, and any checkpoints it brings (an import). */
  async add(name, records = singletons(), checkpoints = [], copyOf, id = this.#id("g")) {
    const now = this.#clock.now();
    const info = { id, name, made: now, opened: now, ...copyOf && { copyOf } };
    await this.#db.tx(["games", "records", "checkpoints"], "readwrite", async (t) => {
      await t.put("games", id, info);
      for (const [rid, rec] of records) await t.put("records", [id, rid], rec);
      for (const cp of checkpoints) {
        const cid = this.#id("c");
        await t.put("checkpoints", [id, cid], { ...cp, id: cid });
      }
    });
    return info;
  }
  /** Saves the open game, then opens another. */
  async open(id) {
    await this.save();
    const { info, records } = await this.#db.tx(["games", "records"], "readwrite", async (t) => {
      const info2 = await t.get("games", id);
      if (!info2) throw new Error(`no game ${id}`);
      const opened = { ...info2, opened: this.#clock.now() };
      await t.put("games", id, opened);
      return { info: opened, records: await this.#records(t, id) };
    });
    this.#quiet = true;
    try {
      this.game.load(records);
    } finally {
      this.#quiet = false;
    }
    this.current = info;
    if (!info.copyOf) this.#write(LAST, id);
    return info;
  }
  async rename(name) {
    const cur = this.#open();
    this.current = { ...cur, name };
    await this.#db.tx(["games"], "readwrite", (t) => t.put("games", cur.id, this.current));
  }
  // R140, R141: a player's copy, per room; never listed, never the last game.
  /** Opens this page's copy of a room's table, making an empty one the first time. */
  async copyFor(room) {
    const id = `m-${room}`;
    const have = await this.#db.tx(["games"], "readonly", (t) => t.get("games", id));
    if (!have) await this.add(room, singletons(), [], room, id);
    return this.open(id);
  }
  // Seq: seq-save.md#1.5, seq-save.md#1.5.1
  /** Writes what changed now, in one transaction: only records that differ from what's stored. */
  save() {
    if (this.#timer !== null) {
      this.#clock.clearTimeout(this.#timer);
      this.#timer = null;
    }
    const cur = this.current, rids = [...this.#pending];
    this.#pending.clear();
    if (!cur || !rids.length) return this.#saving;
    const records = rids.map((rid) => [rid, this.game.get(rid)]);
    this.#busy++;
    this.#saving = this.#saving.then(() => this.#db.tx(["records"], "readwrite", async (t) => {
      for (const [rid, rec] of records) {
        const stored = await t.get("records", [cur.id, rid]);
        if (same(stored, rec)) continue;
        if (rec === void 0) await t.del("records", [cur.id, rid]);
        else await t.put("records", [cur.id, rid], rec);
      }
    })).then(() => {
      this.#savedAt = this.#clock.now();
    }).finally(() => {
      this.#busy--;
    });
    return this.#saving;
  }
  // R134, R137: named checkpoints are kept; automatic ones keep the newest 20.
  /** A copy of the whole open game. */
  async checkpoint(name, auto) {
    const cur = this.#open();
    await this.save();
    const cp = { id: this.#id("c"), name, at: this.#clock.now(), auto, records: Object.fromEntries(this.game.all()) };
    await this.#db.tx(["checkpoints"], "readwrite", async (t) => {
      await t.put("checkpoints", [cur.id, cp.id], cp);
      if (!auto) return;
      const autos = (await this.#checkpoints(t, cur.id)).filter((c) => c.auto);
      for (const old of autos.slice(KEEP_AUTO)) await t.del("checkpoints", [cur.id, old.id]);
    });
    const { records: _, ...info } = cp;
    return info;
  }
  /** The open game's checkpoints, newest first. */
  async checkpoints() {
    const cur = this.#open();
    const all = await this.#db.tx(["checkpoints"], "readonly", (t) => this.#checkpoints(t, cur.id));
    return all.map(({ records: _, ...info }) => info);
  }
  // Seq: seq-restore.md#1.2, seq-restore.md#1.3, seq-restore.md#1.4 | R135
  /** Checkpoints the table first, so the restore can be undone; the book is not taken back. */
  async restore(id) {
    const cur = this.#open();
    const cp = await this.#db.tx(["checkpoints"], "readonly", (t) => t.get("checkpoints", [cur.id, id]));
    if (!cp) throw new Error(`no checkpoint ${id}`);
    await this.checkpoint(`Before restoring \u201C${cp.name}\u201D`, true);
    const book = this.game.get("book");
    const records = Object.entries(cp.records).filter(([rid]) => rid !== "book");
    this.game.load(book ? [...records, ["book", book]] : records);
    await this.save();
  }
  /** A game as stored, with its checkpoints oldest first (for Exchange). */
  async read(id) {
    if (id === this.current?.id) await this.save();
    return this.#db.tx(["games", "records", "checkpoints"], "readonly", async (t) => {
      const info = await t.get("games", id);
      if (!info) throw new Error(`no game ${id}`);
      return { info, records: await this.#records(t, id), checkpoints: (await this.#checkpoints(t, id)).reverse() };
    });
  }
  /** For the Ledger: "Saving…" while something is unwritten, else when it last saved. */
  status() {
    if (this.#pending.size || this.#busy) return "Saving\u2026";
    return this.#savedAt === null ? "Saved" : `Saved ${new Date(this.#savedAt).toTimeString().slice(0, 8)}`;
  }
  #open() {
    if (!this.current) throw new Error("no game is open");
    return this.current;
  }
  async #records(t, id) {
    return (await t.all("records", id)).map(([k, v]) => [k[1], v]);
  }
  async #checkpoints(t, id) {
    return (await t.all("checkpoints", id)).map(([, c]) => c).sort((a, b) => b.at - a.at || (a.id < b.id ? 1 : -1));
  }
  // localStorage may be missing or blocked; the store still works without `last`.
  #read(key) {
    try {
      return this.#storage.getItem(key);
    } catch {
      return null;
    }
  }
  #write(key, value) {
    try {
      this.#storage.setItem(key, value);
    } catch {
    }
  }
};

// src/main.ts
var clock = { now: () => Date.now(), setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h) };
async function measure(blob) {
  const image = await createImageBitmap(blob);
  const size = { w: image.width, h: image.height };
  image.close();
  return size;
}
async function main() {
  const db = await IdbDb.open();
  const store = new GameStore(db, clock, localStorage);
  const blobs = new BlobStore(db, measure);
  await store.start();
  addEventListener("pagehide", () => {
    void store.save();
  });
  return { stamp: "dev", store, blobs };
}
var ready = main();
if (new URLSearchParams(location.search).has("test")) {
  window.hollow = { stamp: "dev", ready };
}
//# sourceMappingURL=app.js.map
