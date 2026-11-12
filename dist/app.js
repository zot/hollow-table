// src/model/records.ts
var GM = "GM";
var OPEN = "open";
var SLOTS = ["bonus", "main", "edge", "stagger", "bias", "affliction", "injury"];
var ROWS = ["mild", "min", "sig", "maj"];
var DAMAGE = ["bias", "affliction", "injury"];
function damageSlots(f) {
  const column2 = (d) => Object.fromEntries(ROWS.map((r) => [r, f(d, r)]));
  return Object.fromEntries(DAMAGE.map((d) => [d, column2(d)]));
}
var DICE = ["W", "G", "R", "B", "Y"];
var TOMBS = 3e3;
var PLAYER_OIDS = 1048576;
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
var dict = (each, cap = CAPS.list) => (v) => obj(v) && Object.keys(v).length <= cap && Object.keys(v).every((k) => k.length <= CAPS.name && each(v[k]));
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
    base: int(-1e3, 1e3),
    vs: str(CAPS.name),
    row: str(CAPS.name),
    ok: bool,
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
  book: fields(
    { claims: dict(str(CAPS.id)), gv: int(0, Number.MAX_SAFE_INTEGER), tomb: dict(int(0, Number.MAX_SAFE_INTEGER), TOMBS) },
    { hillGv: int(0, Number.MAX_SAFE_INTEGER) }
  ),
  tape: fields({ receipts: list(receipt, 1e4) })
};
function check(rid, value2) {
  if (isPiece(rid)) return piece(value2) && value2.oid === oidOf(rid);
  return Object.hasOwn(SINGLETONS, rid) && SINGLETONS[rid](value2);
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
      put: (rid, value2) => {
        if (!check(rid, value2)) throw new Refused(rid);
        staged.set(rid, value2);
      },
      del: (rid) => {
        staged.set(rid, void 0);
      }
    });
    const changed = /* @__PURE__ */ new Set();
    for (const [rid, value2] of staged) {
      if (same(this.#records.get(rid), value2)) continue;
      if (value2 === void 0) this.#records.delete(rid);
      else this.#records.set(rid, value2);
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

// src/rules/ownership.ts
function mayChange(viewer, before, after) {
  if (viewer?.gm) return true;
  if (!viewer) return false;
  const mine = (c) => c.owner === viewer.name || c.owner === OPEN;
  if (before && !mine(before)) return false;
  return !after || mine(after);
}

// src/rules/visibility.ts
function canSee(viewer, character2) {
  return !!viewer?.gm || character2.owner === OPEN || !!viewer && character2.owner === viewer.name;
}
var blank = (text) => text.replace(/[^\n]/g, "");
var blankBack = (b) => ({
  notes: blank(b.notes),
  absorb: { bias: 0, affliction: 0, injury: 0 },
  damage: damageSlots((d, r) => ({ name: "", boxes: b.damage[d][r].boxes.map(() => false), spent: [] }))
});
var inSlot = (i) => typeof i.where === "object" && "slot" in i.where;
function redactPiece(r, viewer, chars) {
  if (r.kind === "character") return canSee(viewer, r) ? r : { ...r, front: blank(r.front), back: blankBack(r.back) };
  if (r.kind === "influence") {
    const home = chars(r.home);
    if (home && canSee(viewer, home)) return r;
    const { tap: _secret, ...rest } = r;
    return { ...rest, name: "", points: inSlot(r) ? r.points : 0 };
  }
  return r;
}
function redact(record, viewer, chars) {
  if ("kind" in record) return redactPiece(record, viewer, chars);
  if ("yards" in record) return redactYards(record, viewer, chars);
  return record;
}
function redactYards(y, viewer, chars) {
  return {
    yards: y.yards.map((g) => ({
      ...g,
      items: g.items.map((b) => {
        const buried = new Map(b.records.filter((r) => r.kind === "character").map((c) => [c.oid, c]));
        const look = (oid) => buried.get(oid) ?? chars(oid);
        return { ...b, records: b.records.map((r) => redactPiece(r, viewer, look)) };
      })
    }))
  };
}

// src/net/claims.ts
var book = (game) => game.get("book");
function whoIs(game, name2, browser) {
  if (!name2 || name2 === GM) return null;
  const b = book(game), held = b.claims[name2];
  if (held === void 0) {
    game.change((w) => w.put("book", { ...b, claims: { ...b.claims, [name2]: browser } }));
    return name2;
  }
  return held === browser ? name2 : null;
}
function why(name2) {
  return `${name2} is played from another browser, so the GM's page shows you only what anyone sees and doesn't take your changes. The GM can hand ${name2} to you by clicking your name in their strip.`;
}

// src/net/envelope.ts
var VERSION = 1;
var KINDS = ["hello", "here", "bye", "recs", "sync", "edit", "move", "intent", "roll", "crit", "refuse", "claim"];
var LIMITS = { dice: 40, moveItems: 8, batch: 1e4, why: 500, box: 4e6 };
var tab = str(CAPS.id);
var name = str(CAPS.name);
var why2 = str(LIMITS.why);
var seq = int(0, Number.MAX_SAFE_INTEGER);
var coord2 = num(-CAPS.coord, CAPS.coord);
var oidOrNull = (v) => v === null || isOid(v);
var box = fields({ iv: str(24), data: str(LIMITS.box) });
var put = (v) => fields({ rid: str(CAPS.id), s: seq, rec: () => true }, { by: tab })(v) && check(v.rid, v.rec);
var del = fields({ rid: str(CAPS.id), s: seq }, { by: tab });
var fewDice = (r) => r.dice.length <= LIMITS.dice;
var roll = (v) => fields({ n: seq, receipt, sealed: dict(box) })(v) && fewDice(v.receipt);
var BODIES = {
  hello: fields({}),
  here: fields({ name, role: oneOf("gm", "player") }),
  bye: fields({}),
  // A batch from the GM's page: the public view, and each tab's own view sealed to it.
  recs: fields({ g: seq, full: bool, puts: list(put, LIMITS.batch), dels: list(del, LIMITS.batch), sealed: dict(box) }),
  sync: fields({}),
  // A player's change, sealed to the GM's page.
  edit: fields({ box }),
  move: fields({ s: seq, items: list(fields({ rid: str(CAPS.id), x: coord2, y: coord2, z: int(0, CAPS.coord) }, { part: str(CAPS.id) }), LIMITS.moveItems) }),
  intent: fields({
    n: seq,
    pool: isOid,
    action: name,
    vs: oidOrNull,
    defend: oneOf("mental", "psych"),
    hand: fields({ yellows: int(-LIMITS.dice, LIMITS.dice), bonus: int(-1e3, 1e3) })
  }, { row: str(32) }),
  roll,
  crit: fields({ id: str(CAPS.id), choice: oneOf("max", "dbl"), lock: bool }),
  refuse: fields({ why: why2 }, { n: seq }),
  claim: fields({ name, why: why2 })
};
var sealedRoll = (v) => fields({ re: seq, receipt })(v) && fewDice(v.receipt);
var sealedRecs = fields({ g: seq, puts: list(put, LIMITS.batch) });
var change = (v) => fields({ rid: str(CAPS.id), rec: () => true })(v) && check(v.rid, v.rec);
var editBody = fields({ s: seq, base: seq, puts: list(change, LIMITS.batch), dels: list(str(CAPS.id), LIMITS.batch) });
var header = fields({ v: oneOf(VERSION), kind: oneOf(...KINDS), tab, at: num(0, 1e15), body: () => true });
function make(kind, from, body, at2 = Date.now()) {
  return { v: VERSION, kind, tab: from, at: at2, body };
}
function check2(raw) {
  let e = raw;
  if (typeof raw === "string") {
    try {
      e = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!header(e)) return null;
  const env = e;
  return BODIES[env.kind](env.body) ? env : null;
}

// src/net/authority.ts
var LOCAL = /* @__PURE__ */ new Set(["book", "tape"]);
var stampOf = (o) => o.by === void 0 ? { s: o.s } : { s: o.s, by: o.by };
var kindOf = (r) => r && "kind" in r ? r.kind : void 0;
var characters = (game) => (oid) => game.get(`o:${oid}`);
var seen = (rec, viewer, chars) => same(redact(rec, viewer, chars), rec);
function mergeYards(real2, mine, viewer, chars) {
  const truth = /* @__PURE__ */ new Map(), secret = /* @__PURE__ */ new Set();
  for (const g of real2?.yards ?? []) for (const b of g.items) for (const r of b.records) {
    truth.set(r.oid, r);
    if (!seen(r, viewer, chars)) secret.add(r.oid);
  }
  const kept = /* @__PURE__ */ new Set();
  const yards = mine.yards.map((g) => ({ ...g, items: g.items.map((b) => ({ ...b, records: b.records.map((r) => {
    if (!secret.has(r.oid)) return r;
    kept.add(r.oid);
    return truth.get(r.oid);
  }) })) }));
  return [...secret].every((o) => kept.has(o)) ? { yards } : null;
}
function judge(game, edit, who) {
  const all2 = [...edit.puts.map((p) => p.rid), ...edit.dels].filter((rid) => rid !== "meta" && !LOCAL.has(rid));
  const book2 = game.get("book"), chars = characters(game);
  if (!who) return { puts: [], dels: [], refused: all2 };
  if (edit.puts.some((p) => p.rid === "yards") && edit.base < (book2.hillGv ?? 0)) return { puts: [], dels: [], refused: all2 };
  const viewer = { name: who, gm: false };
  const mine = (old, rec) => {
    if (old && !seen(old, viewer, chars)) return false;
    if (rec && !seen(rec, viewer, chars)) return false;
    const c = (r) => r && "kind" in r && r.kind === "character" ? r : void 0;
    return !c(old) && !c(rec) ? true : mayChange(viewer, c(old), c(rec));
  };
  const puts = [], dels = [], refused = [];
  for (const rid of edit.dels) {
    if (!all2.includes(rid)) continue;
    if (isPiece(rid) && mine(game.get(rid), void 0)) dels.push(rid);
    else refused.push(rid);
  }
  for (const { rid, rec } of edit.puts) {
    if (!all2.includes(rid)) continue;
    if (rid === "yards") {
      const merged = mergeYards(game.get("yards"), rec, viewer, chars);
      if (merged) puts.push({ rid, rec: merged });
      else refused.push(rid);
    } else if (!isPiece(rid) || (book2.tomb[rid] ?? 0) > edit.base) refused.push(rid);
    else if (mine(game.get(rid), rec)) puts.push({ rid, rec });
    else refused.push(rid);
  }
  return { puts, dels, refused };
}
var Authority = class {
  #w;
  /** What went out to everyone: the view for nobody. */
  #public = /* @__PURE__ */ new Map();
  #tabs = /* @__PURE__ */ new Map();
  /** A change taken from a player keeps their stamp for the batch that answers it. */
  #origin = /* @__PURE__ */ new Map();
  #answerDel = /* @__PURE__ */ new Set();
  #pending = /* @__PURE__ */ new Set();
  #flushing = false;
  #work = Promise.resolve();
  constructor(w) {
    this.#w = w;
    w.game.listen((rids) => this.#queue(rids));
    w.link.on("sync", (_, from) => {
      this.#catchUp(from.tab);
    });
    w.link.on("edit", (body, from) => this.#edit(body.box, from));
    w.link.on("bye", (_, from) => {
      this.#tabs.delete(from.tab);
    });
  }
  /** Everything sent or being sent has gone (for tests and orderly shutdown). */
  idle() {
    return this.#work;
  }
  // Seq: seq-join.md#1.9, seq-join.md#1.10 | R166, R167
  /** A player's tab said who it is (Presence's `here`). Nobody is told why, privately. */
  join(tab2, name2, browser, sealKey) {
    const who = whoIs(this.#w.game, name2, browser);
    this.#tabs.set(tab2, { name: name2, browser, sealKey, holds: /* @__PURE__ */ new Map() });
    if (!who) this.#w.link.send("claim", { name: name2, why: why(name2) }, tab2);
    return who;
  }
  /** The name a tab plays as, if its browser holds it. */
  #viewer(t) {
    const held = this.#w.game.get("book").claims[t.name];
    return held === t.browser ? { name: t.name, gm: false } : null;
  }
  // R193: secrets follow ownership; a character changing hands re-checks everything.
  /** Re-sends to each tab whatever it now sees differently (after a hand-over, say). */
  recheck() {
    this.#queue(new Set(this.#w.game.all().map(([rid]) => rid)));
  }
  #queue(rids) {
    for (const rid of rids) this.#pending.add(rid);
    if (this.#flushing) return;
    this.#flushing = true;
    const { schedule } = this.#w;
    schedule(() => {
      this.#flushing = false;
      this.#out();
    });
  }
  #stamp(rid) {
    const o = this.#origin.get(rid);
    if (o?.fresh) {
      o.fresh = false;
      return stampOf(o);
    }
    const mine = { s: this.#w.stamps.next() };
    this.#origin.set(rid, { ...mine, fresh: false });
    return mine;
  }
  /** The stamp a piece already went out under, for a catch-up. */
  #current(rid) {
    const o = this.#origin.get(rid);
    return o ? stampOf(o) : this.#stamp(rid);
  }
  // Seq: seq-sync.md#1.1 to seq-sync.md#1.6 | R170, R174, R175, R185, R188
  #out() {
    const { game } = this.#w, chars = characters(game);
    let rids = [...this.#pending].filter((rid) => !LOCAL.has(rid));
    this.#pending.clear();
    if (rids.some((rid) => kindOf(game.get(rid)) === "character" || kindOf(this.#public.get(rid)) === "character")) {
      rids = [...game.all().map(([rid]) => rid).filter((rid) => !LOCAL.has(rid)), ...rids.filter((rid) => !game.get(rid))];
    }
    const puts = [], dels = [], sealFor = /* @__PURE__ */ new Map();
    const gone = [];
    for (const rid of /* @__PURE__ */ new Set([...rids, ...this.#answerDel])) {
      const rec = game.get(rid);
      if (!rec) {
        if (!this.#public.has(rid) && !this.#answerDel.has(rid)) continue;
        this.#public.delete(rid);
        for (const t of this.#tabs.values()) t.holds.delete(rid);
        dels.push({ rid, ...this.#stamp(rid) });
        gone.push(rid);
        continue;
      }
      const pv = redact(rec, null, chars), changed = !same(this.#public.get(rid), pv);
      let stamp;
      const stampOnce = () => stamp ??= this.#stamp(rid);
      if (changed) {
        this.#public.set(rid, pv);
        puts.push({ rid, ...stampOnce(), rec: pv });
      }
      for (const [tab2, t] of this.#tabs) {
        const tv = redact(rec, this.#viewer(t), chars), holds = changed ? pv : t.holds.get(rid);
        t.holds.set(rid, tv);
        if (!same(tv, holds)) {
          const f = sealFor.get(tab2) ?? [];
          f.push({ rid, ...stampOnce(), rec: tv });
          sealFor.set(tab2, f);
        }
      }
    }
    this.#answerDel.clear();
    if (!puts.length && !dels.length && !sealFor.size) return;
    const book2 = game.get("book"), g = book2.gv + 1;
    const tomb = { ...book2.tomb };
    for (const rid of gone) if (isPiece(rid)) tomb[rid] = g;
    for (const p of puts) delete tomb[p.rid];
    const keys2 = Object.keys(tomb);
    if (keys2.length > TOMBS) for (const k of keys2.sort((a, b) => tomb[a] - tomb[b]).slice(0, keys2.length - TOMBS)) delete tomb[k];
    const hill = puts.some((p) => p.rid === "yards") ? { hillGv: g } : {};
    game.change((w) => w.put("book", { ...book2, gv: g, tomb, ...hill }));
    this.#send({ g, full: false, puts, dels }, sealFor);
  }
  #send(batch, sealFor, to) {
    const { link, sealer } = this.#w;
    this.#work = this.#work.then(async () => {
      const sealed = {};
      for (const [tab2, puts] of sealFor) {
        const t = this.#tabs.get(tab2);
        if (t) sealed[tab2] = await sealer.seal(t.sealKey, "recs", link.tab, tab2, { g: batch.g, puts });
      }
      link.send("recs", { ...batch, sealed }, to);
    });
  }
  // Seq: seq-join.md#1.12 | R171: the whole table to one tab, at the current version without moving it.
  #catchUp(tab2) {
    const t = this.#tabs.get(tab2);
    if (!t) return;
    const { game } = this.#w, chars = characters(game), viewer = this.#viewer(t);
    const puts = [], mine = [];
    t.holds.clear();
    for (const [rid, rec] of game.all()) {
      if (LOCAL.has(rid)) continue;
      const stamp = this.#current(rid), pv = redact(rec, null, chars), tv = redact(rec, viewer, chars);
      puts.push({ rid, ...stamp, rec: pv });
      if (!same(tv, pv)) mine.push({ rid, ...stamp, rec: tv });
      t.holds.set(rid, tv);
    }
    const g = game.get("book").gv;
    this.#send({ g, full: true, puts, dels: [] }, mine.length ? /* @__PURE__ */ new Map([[tab2, mine]]) : /* @__PURE__ */ new Map(), tab2);
    if (!viewer) this.#w.link.send("claim", { name: t.name, why: why(t.name) }, tab2);
  }
  // Seq: seq-edit.md#1.4, seq-edit.md#1.5, seq-edit.md#1.7 | R172, R173
  #edit(box2, from) {
    this.#work = this.#work.then(async () => {
      const t = this.#tabs.get(from.tab);
      if (!t || t.browser !== from.browser) return;
      const opened = await this.#w.sealer.open(from.sealKey, "edit", from.tab, this.#w.link.tab, box2);
      if (editBody(opened)) this.#take(opened, from.tab);
    });
    return this.#work;
  }
  // R179, R182: a player's drags, as the move actor places them, are judged like a change: a piece
  // they may not move is answered with the GM's version, which puts it back on their page.
  /** Moves from other pages, after the move actor's pass (Moves.place on the GM's page). */
  moved(commands) {
    const { game } = this.#w, gv = game.get("book").gv;
    const groups = /* @__PURE__ */ new Map();
    for (const c of commands) {
      const r = game.get(c.rid);
      if (!r || !this.#tabs.has(c.tab)) continue;
      const at2 = { x: c.x, y: c.y, z: c.z };
      let rec = r;
      if (r.kind === "character") rec = c.part === "pool" ? { ...r, pool: { ...r.pool, ...at2 } } : { ...r, card: { ...r.card, ...at2 } };
      else if ("place" in r) rec = { ...r, place: { ...r.place, ...at2 } };
      const key = `${c.tab}:${c.s}`, g = groups.get(key) ?? { tab: c.tab, s: c.s, base: gv, puts: [], dels: [] };
      g.puts.push({ rid: c.rid, rec });
      groups.set(key, g);
    }
    for (const { tab: tab2, ...edit } of groups.values()) this.#take(edit, tab2);
  }
  // Seq: seq-edit.md#1.4, seq-edit.md#1.5, seq-edit.md#1.7: judge, take what's allowed, answer the rest.
  #take(edit, tab2) {
    const t = this.#tabs.get(tab2), { game, stamps } = this.#w;
    if (!t) return;
    const fresh2 = (rid) => stamps.fresh(rid, tab2, edit.s);
    const current = { ...edit, puts: edit.puts.filter((p) => fresh2(p.rid)), dels: edit.dels.filter(fresh2) };
    const verdict = judge(game, current, this.#viewer(t)?.name ?? null);
    for (const rid of [...current.puts.map((p) => p.rid), ...current.dels]) stamps.mark(rid, tab2, edit.s);
    const theirs = (rid) => {
      this.#origin.set(rid, { s: edit.s, by: tab2, fresh: true });
    };
    const answer = (rid) => {
      theirs(rid);
      this.#public.delete(rid);
      for (const x of this.#tabs.values()) x.holds.delete(rid);
      if (!game.get(rid)) this.#answerDel.add(rid);
    };
    const taken = [...verdict.puts.map((p) => p.rid), ...verdict.dels];
    for (const rid of taken) theirs(rid);
    const changed = game.change((w) => {
      for (const p of verdict.puts) w.put(p.rid, p.rec);
      for (const rid of verdict.dels) w.del(rid);
    });
    const unchanged = taken.filter((rid) => !changed.has(rid));
    for (const rid of unchanged) answer(rid);
    for (const rid of verdict.refused) answer(rid);
    this.#queue([...verdict.refused, ...unchanged]);
  }
};

// src/net/copy.ts
var RESEND_MS = 3e3;
var TRIES = 5;
var ASK_MS = 3e3;
var GAP_MS = 1500;
var AWAY_MS = 25e3;
var TICK_MS = 1e3;
var Copy = class {
  /** Whether the whole table has arrived since joining, or since the GM's page came back. */
  synced = false;
  #w;
  #seen;
  #lastG;
  #pending;
  #gmPeer;
  #quiet = false;
  #asked = -Infinity;
  #gapTimer = null;
  #tick = null;
  #deferred = /* @__PURE__ */ new Map();
  #work = Promise.resolve();
  constructor(w) {
    this.#w = w;
    this.#seen = Number(this.#read(w.local, this.#seenKey)) || 0;
    let kept = [];
    try {
      kept = JSON.parse(this.#read(w.session, this.#pendingKey) ?? "[]");
    } catch {
    }
    this.#pending = new Map(kept);
    w.game.listen((rids) => {
      if (!this.#quiet) this.#changed(rids);
    });
    w.link.on("recs", (b, from) => this.#recs(b, from));
    for (const kind of ["hello", "here"]) w.link.on(kind, (_, from) => {
      if (from.browser === w.gm) this.heardGm(from);
    });
  }
  get #seenKey() {
    return `hollow.seen.${this.#w.room}`;
  }
  get #pendingKey() {
    return `hollow.pending.${this.#w.room}`;
  }
  #read(s, k) {
    try {
      return s.getItem(k);
    } catch {
      return null;
    }
  }
  #write(s, k, v) {
    try {
      s.setItem(k, v);
    } catch {
    }
  }
  #keepPending() {
    this.#write(this.#w.session, this.#pendingKey, JSON.stringify([...this.#pending]));
  }
  /** Rids still waiting for the GM's answer. */
  pending() {
    return [...this.#pending.keys()];
  }
  /** The version this copy has seen everything up to. */
  get seen() {
    return this.#seen;
  }
  idle() {
    return this.#work;
  }
  // Seq: seq-join.md#1.11 | R171: ask for the whole table until it arrives.
  /** Starts the page's clock: asking for the table until it arrives, resending what's pending. */
  start() {
    const tick = () => {
      this.#onTick();
      this.#tick = this.#w.clock.setTimeout(tick, TICK_MS);
    };
    this.#ask();
    this.#tick = this.#w.clock.setTimeout(tick, TICK_MS);
  }
  stop() {
    if (this.#tick !== null) this.#w.clock.clearTimeout(this.#tick);
    this.#tick = null;
  }
  #ask() {
    this.#asked = this.#w.clock.now();
    this.#w.link.send("sync", {});
  }
  // R190: a new key, or a message after AWAY_MS of silence, means the GM's page came back.
  /** The GM's page was heard. */
  heardGm(from) {
    const now2 = this.#w.clock.now(), was = this.#gmPeer;
    const back3 = was && (was.sealKey !== from.sealKey || now2 - was.at > AWAY_MS);
    this.#gmPeer = { ...from, at: now2 };
    if (back3) {
      this.synced = false;
      this.#lastG = void 0;
      this.#ask();
    }
  }
  #onTick() {
    const now2 = this.#w.clock.now();
    if (!this.synced) {
      if (now2 - this.#asked >= ASK_MS) this.#ask();
      return;
    }
    if (!this.#gmPeer || !this.#pending.size) return;
    const due = [...this.#pending].filter(([, p]) => now2 - p.at >= RESEND_MS).map(([rid]) => rid);
    if (!due.length) return;
    const gaveUp = due.filter((rid) => ++this.#pending.get(rid).tries > TRIES);
    for (const rid of gaveUp) {
      this.#pending.delete(rid);
      this.#w.stamps.forget(rid, this.#w.link.tab);
    }
    this.#resend(due.filter((rid) => this.#pending.has(rid)));
    if (gaveUp.length) {
      this.#keepPending();
      this.#ask();
    }
  }
  // Seq: seq-sync.md#1.7 to seq-sync.md#1.11
  #recs(batch, from) {
    if (from.browser !== this.#w.gm) return Promise.resolve();
    this.heardGm(from);
    this.#work = this.#work.then(async () => {
      let puts = batch.puts;
      const box2 = batch.sealed[this.#w.link.tab];
      if (box2) {
        const mine = await this.#w.sealer.open(from.sealKey, "recs", from.tab, this.#w.link.tab, box2);
        if (sealedRecs(mine) && mine.g === batch.g) {
          const own = new Set(mine.puts.map((p) => p.rid));
          puts = [...puts.filter((p) => !own.has(p.rid)), ...mine.puts];
        }
      }
      const last = this.#lastG;
      if (batch.full) {
        this.#lastG = batch.g;
        this.synced = true;
        this.#clearGap();
      } else if (last === void 0 || batch.g > last) {
        if (last !== void 0 && batch.g > last + 1 && this.#gapTimer === null) {
          this.#gapTimer = this.#w.clock.setTimeout(() => {
            this.#gapTimer = null;
            this.#ask();
          }, GAP_MS);
        }
        this.#lastG = batch.g;
      }
      this.#apply(puts, batch.dels, from.tab, batch.full);
      if (this.synced && (batch.full || last !== void 0 && batch.g === last + 1)) this.#setSeen(batch.g);
      if (batch.full && this.#pending.size) this.#resend([...this.#pending.keys()]);
    });
    return this.#work;
  }
  #clearGap() {
    if (this.#gapTimer !== null) this.#w.clock.clearTimeout(this.#gapTimer);
    this.#gapTimer = null;
  }
  #setSeen(g) {
    if (g === this.#seen) return;
    this.#seen = g;
    this.#write(this.#w.local, this.#seenKey, String(g));
  }
  // Seq: seq-sync.md#1.9, seq-edit.md#1.8: newer than what was applied from that page, and not
  // pending, unless it is the GM's answer to ours.
  #takes(rid, by, s) {
    if (!this.#w.stamps.fresh(rid, by, s)) return false;
    const p = this.#pending.get(rid);
    if (!p) return true;
    if (by !== this.#w.link.tab || s < p.s) return false;
    this.#pending.delete(rid);
    this.#keepPending();
    return true;
  }
  #apply(puts, dels, gmTab, full) {
    const held = this.#w.held ?? (() => false);
    const now2 = [], gone = [];
    for (const d of dels) {
      const by = d.by ?? gmTab;
      if (!this.#takes(d.rid, by, d.s)) continue;
      if (held(d.rid)) {
        this.#deferred.set(d.rid, { del: d, by });
        continue;
      }
      this.#w.stamps.mark(d.rid, by, d.s);
      gone.push(d.rid);
    }
    for (const p of puts) {
      const by = p.by ?? gmTab;
      if (LOCAL.has(p.rid) || !this.#takes(p.rid, by, p.s)) continue;
      if (held(p.rid)) {
        this.#deferred.set(p.rid, { put: p, by });
        continue;
      }
      this.#w.stamps.mark(p.rid, by, p.s);
      now2.push(p);
    }
    if (full) {
      const have = new Set(puts.map((p) => p.rid));
      for (const [rid] of this.#w.game.all()) {
        if (isPiece(rid) && !have.has(rid) && !this.#pending.has(rid) && !held(rid)) gone.push(rid);
      }
    }
    this.#quietly(now2, gone);
  }
  #quietly(puts, dels) {
    if (!puts.length && !dels.length) return;
    this.#quiet = true;
    try {
      this.#w.game.change((w) => {
        for (const p of puts) w.put(p.rid, p.rec);
        for (const rid of dels) w.del(rid);
      });
    } finally {
      this.#quiet = false;
    }
  }
  // R179: another page's drags, as the move actor places them: places only, never a change of ours.
  /** Moves from other pages, after the move actor's pass (Moves.place on a player's page). */
  place(commands) {
    const puts = [];
    for (const c of commands) {
      const r = this.#w.game.get(c.rid);
      if (!r || this.#pending.has(c.rid)) continue;
      const at2 = { x: c.x, y: c.y, z: c.z };
      if (r.kind === "character") puts.push({ rid: c.rid, rec: c.part === "pool" ? { ...r, pool: { ...r.pool, ...at2 } } : { ...r, card: { ...r.card, ...at2 } } });
      else if ("place" in r) puts.push({ rid: c.rid, rec: { ...r, place: { ...r.place, ...at2 } } });
    }
    this.#quietly(puts, []);
  }
  // R183: what waited for a held piece is checked again when it's let go.
  /** This page let go of `rid`. */
  release(rid) {
    const d = this.#deferred.get(rid);
    if (!d) return;
    this.#deferred.delete(rid);
    if (d.put) this.#apply([{ ...d.put, by: d.by }], [], d.by, false);
    if (d.del) this.#apply([], [{ ...d.del, by: d.by }], d.by, false);
  }
  // Seq: seq-edit.md#1.1, seq-edit.md#1.2, seq-edit.md#1.3 | R172
  #changed(rids) {
    const mine = [...rids].filter((rid) => isPiece(rid) || rid === "yards");
    if (!mine.length) return;
    const s = this.#w.stamps.next(), at2 = this.#w.clock.now();
    for (const rid of mine) {
      this.#w.stamps.mark(rid, this.#w.link.tab, s);
      this.#pending.set(rid, { s, at: at2, tries: 0, base: this.#seen, group: s });
    }
    this.#keepPending();
    this.#sendEdit(s, this.#seen, mine);
  }
  // R173: nothing goes before the table has arrived, so a stale copy can't overwrite the GM's.
  #sendEdit(s, base, rids) {
    const gm = this.#gmPeer;
    if (!gm || !this.synced) return;
    const { game, sealer, link } = this.#w;
    const edit = { s, base, puts: [], dels: [] };
    for (const rid of rids) {
      const rec = game.get(rid);
      if (rec) edit.puts.push({ rid, rec });
      else if (isPiece(rid)) edit.dels.push(rid);
    }
    this.#work = this.#work.then(async () => {
      link.send("edit", { box: await sealer.seal(gm.sealKey, "edit", link.tab, gm.tab, edit) });
    });
  }
  // Seq: seq-edit.md#2.1: each change goes again as it went first: with what was changed with it,
  // and as old as its copy, so one refused as stale can't take a fresh one down with it.
  #resend(rids) {
    const groups = /* @__PURE__ */ new Map();
    for (const rid of rids) {
      const p = this.#pending.get(rid);
      if (!p) continue;
      const g = groups.get(p.group) ?? { base: p.base, rids: [] };
      g.rids.push(rid);
      groups.set(p.group, g);
    }
    const now2 = this.#w.clock.now();
    for (const { base, rids: group } of groups.values()) {
      const s = this.#w.stamps.next();
      for (const rid of group) {
        const p = this.#pending.get(rid);
        p.s = s;
        p.at = now2;
        this.#w.stamps.mark(rid, this.#w.link.tab, s);
      }
      this.#sendEdit(s, base, group);
    }
    this.#keepPending();
  }
};

// src/net/b64.ts
var b64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
var unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

// src/net/identity.ts
var PUB = /^[\w-]{87}$/;
var ALG = { name: "ECDSA", namedCurve: "P-256" };
var SIG = { name: "ECDSA", hash: "SHA-256" };
var enc = new TextEncoder();
async function idOf(raw) {
  return b64(new Uint8Array(await crypto.subtle.digest("SHA-256", raw))).slice(0, 20);
}
var statement = (nonce, peers, idPub, sealPub) => enc.encode(JSON.stringify(["hollow-table handshake", nonce, peers.from, peers.to, idPub, sealPub]));
var Identity = class _Identity {
  id;
  /** The public key, as sent in the handshake. */
  pub;
  #key;
  constructor(id, pub, key) {
    this.id = id;
    this.pub = pub;
    this.#key = key;
  }
  // R164: made on first use and kept; a page without a database keeps it for this load only.
  /** This browser's identity, from the `identity` store. */
  static async load(db) {
    const kept = db && await db.tx(["identity"], "readonly", (t) => t.get("identity", "me"));
    const pair = kept ?? await crypto.subtle.generateKey(ALG, false, ["sign", "verify"]);
    if (db && !kept) await db.tx(["identity"], "readwrite", (t) => t.put("identity", "me", pair));
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    return new _Identity(await idOf(raw), b64(raw), pair.privateKey);
  }
  // Seq: seq-join.md#1.4
  /** Signs their nonce, the two peer ids, and this page's identity and sealing keys. */
  async prove(theirNonce, peers, sealPub) {
    const sig = await crypto.subtle.sign(SIG, this.#key, statement(theirNonce, peers, this.pub, sealPub));
    return b64(new Uint8Array(sig));
  }
};
async function verify(sig, ourNonce, peers, idPub, sealPub) {
  if (typeof sig !== "string" || sig.length > 200 || typeof idPub !== "string" || !PUB.test(idPub) || typeof sealPub !== "string" || !PUB.test(sealPub)) return null;
  try {
    const raw = unb64(idPub), key = await crypto.subtle.importKey("raw", raw, ALG, false, ["verify"]);
    return await crypto.subtle.verify(SIG, key, unb64(sig), statement(ourNonce, peers, idPub, sealPub)) ? await idOf(raw) : null;
  } catch {
    return null;
  }
}

// src/net/images.ts
var RETRY_MS = 1e4;
var NOBODY = "Nobody at the table has sent this image yet (the page that has it may be closed); trying again";
var ImageExchange = class {
  /** Hashes shown on the table but not in the BlobStore, with why. */
  missing = /* @__PURE__ */ new Map();
  #net;
  #blobs;
  #clock;
  #asking = /* @__PURE__ */ new Map();
  #tick = null;
  constructor(net, blobs, clock2) {
    this.#net = net;
    this.#blobs = blobs;
    this.#clock = clock2;
    net.answer((hash) => blobs.get(hash));
  }
  // Seq: seq-images.md#1.2 to seq-images.md#1.5 | R194
  /** Makes sure this page has the image: true once it does. */
  want(hash) {
    let asking = this.#asking.get(hash);
    if (!asking) {
      asking = (async () => {
        if (!await this.#blobs.get(hash)) {
          const blob = await this.#net.request(hash);
          if (!blob || !await this.#blobs.accept(hash, blob)) {
            this.missing.set(hash, NOBODY);
            return false;
          }
        }
        this.missing.delete(hash);
        return true;
      })().finally(() => this.#asking.delete(hash));
      this.#asking.set(hash, asking);
    }
    return asking;
  }
  /** Every image the game shows is wanted, as it arrives. */
  watch(game) {
    const check3 = (rids) => {
      for (const rid of rids) {
        const r = game.get(rid);
        if (r && "kind" in r && r.kind === "image") void this.want(r.blob);
      }
    };
    game.listen(check3);
    check3(game.all().map(([rid]) => rid));
  }
  // Seq: seq-images.md#2 | R195: asked again every 10 s until a page with it is back.
  start() {
    const tick = () => {
      for (const hash of this.missing.keys()) void this.want(hash);
      this.#tick = this.#clock.setTimeout(tick, RETRY_MS);
    };
    this.#tick = this.#clock.setTimeout(tick, RETRY_MS);
  }
  stop() {
    if (this.#tick !== null) this.#clock.clearTimeout(this.#tick);
    this.#tick = null;
  }
};

// src/net/moves.ts
var SEND_MS = 100;
var Moves = class {
  #w;
  #filling = [];
  #draining = [];
  #acting = false;
  #inHand = [];
  #timer = null;
  #held = /* @__PURE__ */ new Set();
  #waiting = /* @__PURE__ */ new Map();
  constructor(w) {
    this.#w = w;
  }
  // Seq: seq-move.md#1 | R178: at most every SEND_MS while in hand.
  /** The pieces in hand moved: they go out within SEND_MS, as they are then. */
  drag(items) {
    this.#inHand = items;
    if (this.#timer === null) {
      this.#timer = this.#w.timers.setTimeout(() => {
        this.#timer = null;
        this.#sendNow(this.#inHand);
      }, SEND_MS);
    }
  }
  // Seq: seq-move.md#2: a drop is a move with its own number; what it changed goes out after it.
  /** The pieces were let go: their places go out now. */
  drop(items) {
    if (this.#timer !== null) {
      this.#w.timers.clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#sendNow(items);
  }
  #sendNow(items) {
    if (!items.length) return;
    const s = this.#w.stamps.next();
    for (const i of items) this.#w.stamps.mark(i.rid, this.#w.tab, s);
    this.#w.send({ s, items });
  }
  // Seq: seq-move.md#1.1, seq-move.md#1.2
  /** A move from another page joins the queue; an actor starts if none is running. */
  receive(from, move) {
    for (const i of move.items) this.#filling.push({ ...i, tab: from, s: move.s });
    this.#startActor();
  }
  // Seq: seq-move.md#1.3, seq-move.md#1.5 | R179, R182
  /**
   * Swaps the buffers and works through what arrived, newest arrival first. The first command to
   * reach a piece places it; an older arrival changes it only if it is from the same page with a
   * higher number. Anything lower than what was applied from its page is discarded.
   */
  pass() {
    const run = this.#filling;
    this.#filling = this.#draining;
    this.#draining = run;
    const placed = /* @__PURE__ */ new Map();
    for (let k = run.length - 1; k >= 0; k--) {
      const c = run[k];
      if (this.#held.has(c.rid)) {
        this.#hold(c);
        continue;
      }
      if (!this.#w.stamps.fresh(c.rid, c.tab, c.s)) continue;
      this.#w.stamps.mark(c.rid, c.tab, c.s);
      const first = placed.get(c.rid);
      if (first && (first.tab !== c.tab || c.s <= first.s)) continue;
      placed.set(c.rid, c);
    }
    run.length = 0;
    if (placed.size) this.#w.place([...placed.values()]);
    if (this.#filling.length) this.#later();
    else this.#acting = false;
  }
  // R183: a piece in your hand, or one you're writing in, waits until you let go.
  /** Whether this page holds `rid` (in hand, or being written in). */
  holds(rid) {
    return this.#held.has(rid);
  }
  /** This page holds `rid`: what arrives for it waits. */
  hold(rid) {
    this.#held.add(rid);
  }
  /** Let go of `rid`: what waited for it is checked again, as if it had just arrived. */
  release(rid) {
    this.#held.delete(rid);
    const waited = this.#waiting.get(rid);
    if (!waited) return;
    this.#waiting.delete(rid);
    this.#filling.push(...waited);
    this.#startActor();
  }
  /** Starts an actor if none is running. */
  #startActor() {
    if (!this.#acting) {
      this.#acting = true;
      this.#later();
    }
  }
  /** The next pass. `schedule` is called detached, so a native like requestAnimationFrame works as given. */
  #later() {
    const { schedule } = this.#w;
    schedule(() => this.pass());
  }
  #hold(c) {
    const w = this.#waiting.get(c.rid);
    if (w) w.unshift(c);
    else this.#waiting.set(c.rid, [c]);
  }
};

// src/net/presence.ts
var OFFLINE_MS = 15e3;
var CHECK_MS = 1e3;
function newRoom(label = "table") {
  const hex = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table"}-${hex}`;
}
function invite(base, room, gm) {
  const u = new URL(base);
  u.search = "";
  u.hash = "";
  u.searchParams.set("room", room);
  u.searchParams.set("gm", gm);
  return u.toString();
}
var ROOM = /^[a-z0-9-]{1,40}-[0-9a-f]{32}$/;
var BROWSER = /^[\w-]{20}$/;
function fromUrl(search) {
  const q = new URLSearchParams(search), room = q.get("room"), gm = q.get("gm");
  return room && gm && ROOM.test(room) && BROWSER.test(gm) ? { room, gm } : null;
}
var Presence = class {
  /** tab → who is there. */
  people = /* @__PURE__ */ new Map();
  status = { state: "live" };
  #w;
  #name;
  #lastLive;
  #tick = null;
  constructor(w) {
    this.#w = w;
    this.#name = w.name;
    this.#lastLive = w.clock.now();
    w.net.onJoin((p) => {
      w.net.send("hello", {}, p.tab);
    });
    w.net.on("hello", (_, from) => {
      w.net.send("here", { name: this.#name, role: w.role }, from.tab);
    });
    w.net.on("here", (body, from) => {
      const person = { name: body.name, role: body.role, browser: from.browser };
      this.people.set(from.tab, person);
      w.here?.(person, from);
    });
    const gone = (tab2) => {
      if (this.people.delete(tab2)) w.gone?.(tab2);
    };
    w.net.onLeave((p) => gone(p.tab));
    w.net.on("bye", (_, from) => gone(from.tab));
  }
  get name() {
    return this.#name;
  }
  /** Starts watching whether this page can reach anyone. */
  start() {
    const tick = () => {
      this.#check();
      this.#tick = this.#w.clock.setTimeout(tick, CHECK_MS);
    };
    this.#tick = this.#w.clock.setTimeout(tick, CHECK_MS);
  }
  // R163: live while a relay or a peer is reachable; offline after 15 s with neither, with why.
  #check() {
    const now2 = this.#w.clock.now(), r = this.#w.net.reachable();
    if (r.relays || r.peers) {
      this.#lastLive = now2;
      this.status = { state: "live" };
      return;
    }
    if (now2 - this.#lastLive >= OFFLINE_MS) {
      this.status = { state: "offline", why: "No relay or other page has been reachable for 15 seconds; still trying." };
    }
  }
  // R159: the GM's own name tag renames.
  /** This page's name, told to everyone. */
  rename(name2) {
    this.#name = name2;
    this.#w.net.send("here", { name: name2, role: this.#w.role });
  }
  /** Leaves the room (the GM's shift-click on Copy invite closes the table). */
  async close() {
    if (this.#tick !== null) this.#w.clock.clearTimeout(this.#tick);
    this.#tick = null;
    this.#w.net.send("bye", {});
    await this.#w.net.leave();
    this.people.clear();
  }
};

// src/rules/dice.ts
function d6(rng) {
  return 1 + Math.min(5, Math.floor(rng() * 6));
}
var die2 = (c, v, added = false) => ({ c, v, added, dropped: false });
function crit(white, blue) {
  return white === 6 && blue >= 5;
}
var NAMES = [[20, "Exquisite"], [15, "Extreme"], [10, "Major"], [5, "Significant"], [1, "Minor"]];
function levelName(result) {
  return NAMES.find(([from]) => result >= from)?.[1] ?? "no noticeable effect";
}
function resolve(row2, white, other) {
  if (row2.auto) return null;
  if (other === null) return white + row2.mod;
  return (row2.die === "G" ? Math.max(white, other) : Math.min(white, other)) + row2.mod;
}
function outcomeOf(row2, resolved, isCrit) {
  if (isCrit || row2.auto === "success") return "success";
  if (row2.auto === "failure" || resolved === null || resolved <= 2) return "failure";
  return resolved === 3 ? "cost" : "success";
}
function roll2(row2, yellows, bonus2, rng) {
  const white = d6(rng);
  const dice = [die2("W", white)];
  let other = null;
  if (row2.die) {
    other = d6(rng);
    dice.push(die2(row2.die, other));
  }
  const blue = d6(rng);
  dice.push(die2("B", blue));
  for (let i = 0; i < yellows; i++) dice.push(die2("Y", d6(rng)));
  const isCrit = crit(white, blue);
  const resolved = resolve(row2, white, other);
  const outcome = outcomeOf(row2, resolved, isCrit);
  if (outcome === "failure") {
    for (const d of dice) if (d.c === "Y") d.dropped = true;
  }
  const result = dice.filter((d) => d.c === "B" || d.c === "Y" && !d.dropped);
  for (let i = 0; i < result.length; i++) {
    if (result[i].v === 6) {
      const y = die2("Y", d6(rng), true);
      dice.push(y);
      result.push(y);
    }
  }
  const sum2 = result.reduce((a, d) => a + d.v, 0);
  const plain = Math.max(0, sum2 + (outcome === "failure" ? 0 : bonus2));
  if (!isCrit) return { dice, resolved, outcome, result: plain, level: levelName(plain) };
  const max = Math.max(0, result.length * 6 + bonus2), dbl = plain * 2;
  const chosen = max >= dbl ? "max" : "dbl";
  const value2 = Math.max(max, dbl);
  return { dice, resolved, outcome, result: value2, level: levelName(value2), crit: { max, dbl, chosen, locked: false } };
}

// src/rules/odds.ts
var ADV = [
  { key: "outclass", words: "Outclass", min: 10, die: null, mod: 0, auto: "success" },
  { key: "green+1", words: "Strong Advantage", min: 7, die: "G", mod: 1, auto: null },
  { key: "green", words: "Advantage", min: 5, die: "G", mod: 0, auto: null },
  { key: "+1", words: "Weak Advantage", min: 3, die: null, mod: 1, auto: null },
  { key: "white", words: "No Advantage", min: -2, die: null, mod: 0, auto: null },
  { key: "-1", words: "Weak Disadvantage", min: -4, die: null, mod: -1, auto: null },
  { key: "red", words: "Disadvantage", min: -6, die: "R", mod: 0, auto: null },
  { key: "red-1", words: "Strong Disadvantage", min: -9, die: "R", mod: -1, auto: null },
  { key: "outclassed", words: "Outclassed", min: -Infinity, die: null, mod: 0, auto: "failure" }
];
function row(difference) {
  return ADV.find((r) => difference >= r.min);
}
var sum = (parts) => ({ total: Object.values(parts).reduce((a, b) => a + b, 0), parts });
function total(base, p) {
  return sum({ base, main: p.main, edge: p.edge, bias: p.bias, affliction: p.affliction, injury: p.injury });
}
function opposition(defend2, p) {
  return sum({ defend: defend2, main: p.main, edge: p.edge, bias: p.bias, affliction: p.affliction, injury: p.injury, stagger: p.stagger });
}
function bonus(action2, bonusPool, hand = { yellows: 0, bonus: 0 }) {
  let { yellows, bonus: b } = action2;
  if (bonusPool !== 0) {
    const t = b + bonusPool;
    if (t >= 0) {
      yellows += Math.floor(t / 3);
      b = t % 3;
    } else b = t;
  }
  return { yellows: Math.max(0, yellows + hand.yellows), bonus: b + hand.bonus };
}

// src/rules/influence.ts
var STEP = 2;

// src/rules/pool.ts
function worth(i) {
  return i.points + (i.kind === "chip" && i.rider ? 1 : 0);
}
var isPile = (u) => "members" in u;
var unitWorth = (u) => isPile(u) ? u.points : worth(u);
function rollUp(items, mint2) {
  const remove = [], add = [];
  const units = [];
  for (const sign2 of [1, -1]) {
    let side = items.filter((i) => i.sign === sign2 && i.points >= STEP);
    for (; ; ) {
      const counts = /* @__PURE__ */ new Map();
      for (const u of side) counts.set(u.points, [...counts.get(u.points) ?? [], u]);
      const v = [...counts.keys()].sort((a, b) => a - b).find((k) => counts.get(k).length >= 3);
      if (v === void 0) break;
      const group = counts.get(v);
      const plain = group.filter((u) => !isPile(u) && u.kind === "chip").sort((a, b) => Number(a.rider) - Number(b.rider));
      let three, made;
      if (plain.length >= 3) {
        const chips = plain.slice(0, 3), first = chips[0];
        const chip = { kind: "chip", oid: mint2(), where: first.where, n: first.n, sign: sign2, points: v + STEP, rider: false };
        for (const c of chips) {
          const k = add.indexOf(c);
          if (k >= 0) add.splice(k, 1);
          else remove.push(c.oid);
        }
        add.push(chip);
        three = chips;
        made = chip;
      } else {
        three = [...plain, ...group.filter((u) => !plain.includes(u))].slice(0, 3);
        made = { sign: sign2, points: v + STEP, members: three };
      }
      side = [...side.filter((u) => !three.includes(u)), made];
    }
    units.push(...side, ...items.filter((i) => i.sign === sign2 && i.points < STEP));
  }
  return { remove, add, units };
}
function value(items) {
  const { units } = rollUp(items, () => "");
  const best = (s) => Math.max(0, ...units.filter((u) => u.sign === s).map(unitWorth));
  return best(1) - best(-1);
}
function pools(character2, items) {
  const inSlot2 = (name2) => items.filter((i) => typeof i.where === "object" && "slot" in i.where && i.where.slot === character2 && i.where.name === name2);
  return Object.fromEntries(SLOTS.map((s) => [s, value(inSlot2(s))]));
}

// src/rules/readmarks.ts
var MINUS = "-\u2212\u2013";
var signed = (s) => Number(s.replace(/\s/g, "").replace(/[−–]/, "-"));
function splitComma(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0) return [s.slice(0, i), s.slice(i + 1)];
  }
  return null;
}
var BASE = new RegExp(`^\\s*([${MINUS}]?\\d+)(?:\\s|\\(|$)`);
var DICE2 = new RegExp(`^\\s*(?:(\\d+)d)?\\s*([+${MINUS}]\\s*\\d+)?(?:\\s|\\(|$)`);
function action(text) {
  const colon = text.indexOf(":");
  if (colon <= 0) return null;
  const label = text.slice(0, colon).trim();
  const parts = splitComma(text.slice(colon + 1));
  if (!label || !parts) return null;
  const b = BASE.exec(parts[0]), d = DICE2.exec(parts[1]);
  if (!b || !d || d[1] === void 0 && d[2] === void 0) return null;
  return { label, base: signed(b[1]), yellows: d[1] ? Number(d[1]) : 0, bonus: d[2] ? signed(d[2]) : 0 };
}
var LEVEL_WORDS = ["Min", "Sig", "Maj", "Ext", "Exq"];
var LEVEL = `(${LEVEL_WORDS.join("|")}|\\d+)`;
var INFLUENCE = new RegExp(`^(.*?)\\s*([+${MINUS}])\\s*${LEVEL}\\b(.*)$`, "is");
var N = "(\\d+)";
var DEF_ONE = new RegExp(`^${N}$`);
var DEF_TWO = new RegExp(`^${N}\\s*/\\s*${N}$`);
var DEF_NAMED = new RegExp(`^(mental|psych)\\s*${N}\\s*/\\s*(mental|psych)\\s*${N}$`, "i");
function defend(text) {
  const t = text.trim().replace(/^defend\s*:\s*/i, "");
  let m = DEF_ONE.exec(t);
  if (m) return { mental: Number(m[1]), psych: Number(m[1]) };
  m = DEF_TWO.exec(t);
  if (m) return { mental: Number(m[1]), psych: Number(m[2]) };
  m = DEF_NAMED.exec(t);
  if (m && m[1].toLowerCase() !== m[3].toLowerCase()) {
    const v = { [m[1].toLowerCase()]: Number(m[2]), [m[3].toLowerCase()]: Number(m[4]) };
    return { mental: v.mental, psych: v.psych };
  }
  return null;
}
var LEVEL_AT = new RegExp(`^(.*?[+${MINUS}]\\s*)${LEVEL}\\b(.*)$`, "is");

// src/text/marks.ts
var MARKS = ["act", "res", "inf", "def", "head"];
var TAG = new RegExp(`<(${MARKS.join("|")})>`, "g");
function parseLine(src) {
  const runs = [];
  let from = 0;
  TAG.lastIndex = 0;
  for (let m = TAG.exec(src); m; m = TAG.exec(src)) {
    const mark = m[1], close = `</${mark}>`;
    const start = m.index + m[0].length, end = src.indexOf(close, start);
    if (end < 0) continue;
    if (m.index > from) runs.push(src.slice(from, m.index));
    runs.push({ mark, text: src.slice(start, end) });
    from = end + close.length;
    TAG.lastIndex = from;
  }
  if (from < src.length || runs.length === 0) runs.push(src.slice(from));
  return runs;
}
function parse(source) {
  return source.split("\n").map(parseLine);
}
var runSource = (r) => typeof r === "string" ? r : `<${r.mark}>${r.text}</${r.mark}>`;
function serialize(lines) {
  return lines.map((l) => l.map(runSource).join("")).join("\n");
}
function marks(lines, tag2) {
  const out = [];
  lines.forEach((l, line) => l.forEach((r, run) => {
    if (typeof r !== "string" && (!tag2 || r.mark === tag2)) out.push({ line, run, mark: r.mark, text: r.text });
  }));
  return out;
}
var fits = (mark, text) => !text.includes("\n") && !text.includes(`</${mark}>`);
function render(lines, el2) {
  const doc = el2.ownerDocument;
  el2.replaceChildren(...lines.map((l) => {
    const div = doc.createElement("div");
    for (const r of l) {
      if (typeof r === "string") {
        div.append(r);
        continue;
      }
      const span = doc.createElement("span");
      span.className = r.mark;
      span.textContent = r.text;
      div.append(span);
    }
    return div;
  }));
}
var isMark = (s) => MARKS.includes(s);
function read(el2) {
  const lines = [[]];
  const push = (r) => {
    const line = lines[lines.length - 1], last = line[line.length - 1];
    if (typeof r === "string" && typeof last === "string") line[line.length - 1] = last + r;
    else if (r !== "") line.push(r);
  };
  const walk = (n, top) => {
    Array.from(n.childNodes).forEach((c, k) => {
      if (c.nodeType === 3) return push(c.textContent ?? "");
      if (c.nodeType !== 1) return;
      const e = c, cls = e.className;
      if (e.tagName === "BR") return void lines.push([]);
      if (e.tagName === "SPAN" && isMark(cls) && fits(cls, e.textContent ?? "")) return push({ mark: cls, text: e.textContent ?? "" });
      if (top && k > 0 && e.tagName === "DIV") lines.push([]);
      walk(e, false);
    });
  };
  walk(el2, true);
  return lines.map((l) => l.length ? l : [""]);
}

// src/net/rolls.ts
var WAIT_MS = 1e4;
var MANY = 20;
var OUTCOME = { success: "Success", cost: "Success at a cost", failure: "Failure" };
var signed2 = (n) => n >= 0 ? `+${n}` : `\u2212${-n}`;
var DIE_NAME = { G: "Green", R: "Red" };
function diceOnly(r) {
  if (r.auto) return r.auto === "success" ? "\u2713" : "\u2717";
  const die3 = r.die ? DIE_NAME[r.die] : "White";
  return r.mod ? `${die3} ${r.mod > 0 ? "+" : "\u2212"} 1` : die3;
}
function mint(game) {
  let top = 0;
  for (const [rid] of game.all()) {
    if (!isPiece(rid)) continue;
    const n = parseInt(oidOf(rid), 16);
    if (n < PLAYER_OIDS) top = Math.max(top, n);
  }
  return (top + 1).toString(16).padStart(8, "0");
}
function resolve2(game, intent, rng, at2) {
  const character2 = game.get(ridOf(intent.pool));
  if (character2?.kind !== "character") return { refused: "That character is not on the table." };
  const act = marks(parse(character2.front), "act").map((m) => action(m.text)).find((a) => a?.label === intent.action);
  if (!act) return { refused: `${character2.name} has no action \u201C${intent.action}\u201D.` };
  const items = game.all().map(([, r2]) => r2).filter((r2) => "kind" in r2 && (r2.kind === "chip" || r2.kind === "influence"));
  const mine = pools(character2.oid, items), sum2 = total(act.base, mine);
  let opp, against;
  if (intent.vs) {
    opp = game.get(ridOf(intent.vs));
    if (opp?.kind !== "character") return { refused: "That opponent is not on the table." };
    const def = marks(parse(opp.front), "def").map((m) => defend(m.text)).find((d) => d);
    against = opposition(def ? def[intent.defend] : 0, pools(opp.oid, items)).total;
  }
  const diff = against === void 0 ? void 0 : sum2.total - against;
  const picked = intent.row ? ADV.find((r2) => r2.key === intent.row) : void 0;
  const row2 = picked ?? (diff === void 0 ? ADV.find((r2) => r2.key === "white") : row(diff));
  const dice = bonus({ yellows: act.yellows, bonus: act.bonus }, mine.bonus, intent.hand);
  const r = roll2(row2, dice.yellows, dice.bonus, rng);
  const meta = game.get("meta"), n = meta.rolls + 1;
  const by = character2.owner === GM ? "GM" : character2.owner;
  const base = {
    id: `roll-${n}`,
    at: at2,
    title: `${character2.name} #${n}: ${act.label}`,
    by,
    dice: r.dice,
    resolution: row2.auto ? row2.words : `${row2.words}: ${r.resolved}`,
    level: `${r.result} ${levelName(r.result)}`,
    outcome: r.crit ? `CRIT! ${OUTCOME.success}` : OUTCOME[r.outcome],
    ...r.crit && { crit: r.crit }
  };
  const vsFull = opp && `${opp.name} ${against} (${signed2(diff)})`;
  const owner = character2.owner === GM ? { name: GM, gm: true } : { name: character2.owner, gm: false };
  const seesOpp = !opp || canSee(owner, opp);
  const full = { ...base, influence: sum2.total, base: act.base, row: row2.key, ...vsFull && { vs: vsFull } };
  const roller = {
    ...base,
    influence: sum2.total,
    base: act.base,
    row: seesOpp ? row2.key : diceOnly(row2),
    ...opp && { vs: seesOpp ? vsFull : opp.name }
  };
  const table = { ...base, ...opp && { vs: opp.name } };
  const apply = (w) => {
    w.put("meta", { ...meta, rolls: n });
    for (const i of items) {
      if (i.kind === "influence" && typeof i.where === "object" && "slot" in i.where && i.where.slot === character2.oid && !i.used) {
        w.put(ridOf(i.oid), { ...i, used: true });
      }
    }
    if (!r.crit) return;
    const had = items.find((i) => i.kind === "influence" && i.crit && i.home === character2.oid);
    if (had) w.put(ridOf(had.oid), { ...had, points: had.points + 2 });
    else {
      const oid = mint(game);
      w.put(ridOf(oid), {
        kind: "influence",
        oid,
        home: character2.oid,
        where: "drawer",
        n: 0,
        name: "CRIT!",
        sign: 1,
        points: 2,
        used: false,
        crit: true
      });
    }
  };
  return { full, roller, table, apply, character: character2 };
}
function choose(r, choice, lock) {
  if (!r.crit) return r;
  const value2 = choice === "max" ? r.crit.max : r.crit.dbl;
  return { ...r, level: `${value2} ${levelName(value2)}`, crit: { ...r.crit, chosen: choice, locked: lock } };
}
var Rolls = class {
  #w;
  #gmPeer;
  #last = /* @__PURE__ */ new Map();
  #waiting = /* @__PURE__ */ new Map();
  #kept = /* @__PURE__ */ new Map();
  #work = Promise.resolve();
  constructor(w) {
    this.#w = w;
    const link = w.link;
    if (!link) return;
    if (w.gm) {
      link.on("intent", (body, from) => this.#intent(body, from));
      link.on("crit", (body, from) => this.#crit(body, from));
    } else {
      link.on("roll", (body, from) => this.#heard(body, from));
      link.on("refuse", (body, from) => {
        if (from.browser !== w.gmBrowser || body.n === void 0) return;
        this.#answered(body.n, body.why);
      });
      for (const kind of ["hello", "here"]) link.on(kind, (_, from) => {
        if (from.browser === w.gmBrowser) this.#gmPeer = from;
      });
    }
  }
  idle() {
    return this.#work;
  }
  #count(key) {
    let n = 0;
    try {
      n = Number(this.#w.session.getItem(key)) || 0;
    } catch {
    }
    try {
      this.#w.session.setItem(key, String(n + 1));
    } catch {
    }
    return n + 1;
  }
  /** Prints on this page's own tape (R111: it never goes over the wire), newest first; a receipt
   * already there by id is replaced (a CRIT switched or locked). */
  #print(r) {
    const { game } = this.#w, tape = game.get("tape") ?? { receipts: [] };
    const at2 = tape.receipts.findIndex((x) => x.id === r.id);
    const receipts = tape.receipts.filter((x) => x.id !== r.id);
    receipts.splice(Math.max(at2, 0), 0, r);
    game.change((w) => w.put("tape", { receipts }));
  }
  // ---- the GM's page ----
  // R103, R104: with no table the GM's page rolls for itself; a private roll sends nothing.
  /** The GM's own roll. Returns why not, or null. */
  roll(intent, priv = false) {
    const { game, rng, clock: clock2, link } = this.#w;
    const done2 = resolve2(game, { ...intent, n: 0 }, rng, clock2.now());
    if ("refused" in done2) return done2.refused;
    game.change(done2.apply);
    if (priv || !link) {
      this.#print({ ...done2.full, ...priv && { priv: true } });
      return null;
    }
    const n = this.#count("hollow.rolls.sent");
    this.#kept.set(done2.full.id, { character: done2.character.oid, n, full: done2.full, roller: done2.roller, table: done2.table });
    this.#print({ ...done2.full, ok: true });
    link.send("roll", { n, receipt: done2.table, sealed: {} });
    return null;
  }
  // Seq: seq-roll.md#1.2 to seq-roll.md#1.7 | R101
  #intent(intent, from) {
    const { game, rng, clock: clock2, link, sealer } = this.#w;
    const who = this.#w.whoIs?.(from) ?? null;
    const c = game.get(ridOf(intent.pool));
    const refuse = (why3) => {
      link.send("refuse", { why: why3, n: intent.n }, from.tab);
    };
    if (!who) {
      refuse("Only someone at the table can roll.");
      return this.#work;
    }
    if (c?.kind === "character" && c.owner !== who) {
      refuse(`${c.name} isn't yours to roll.`);
      return this.#work;
    }
    const done2 = resolve2(game, intent, rng, clock2.now());
    if ("refused" in done2) {
      refuse(done2.refused);
      return this.#work;
    }
    game.change(done2.apply);
    this.#print(done2.full);
    const n = this.#count("hollow.rolls.sent");
    this.#kept.set(done2.full.id, { character: done2.character.oid, n, full: done2.full, roller: done2.roller, table: done2.table, tab: from.tab, sealKey: from.sealKey });
    this.#work = this.#work.then(async () => {
      const box2 = await sealer.seal(from.sealKey, "roll", link.tab, from.tab, { re: intent.n, receipt: done2.roller });
      link.send("roll", { n, receipt: done2.table, sealed: { [from.tab]: box2 } });
    });
    return this.#work;
  }
  // Seq: seq-roll.md#2 | R97: the owner or the GM switches or locks a CRIT; every tape updates.
  #crit(body, from) {
    const k = this.#kept.get(body.id), { game, link, sealer } = this.#w;
    if (!k || k.full.crit?.locked) return this.#work;
    const c = game.get(ridOf(k.character));
    if (from && (!c || c.owner !== this.#w.whoIs?.(from))) return this.#work;
    k.full = choose(k.full, body.choice, body.lock);
    k.roller = choose(k.roller, body.choice, body.lock);
    k.table = choose(k.table, body.choice, body.lock);
    this.#print(k.full);
    if (!link) return this.#work;
    this.#work = this.#work.then(async () => {
      const sealed = k.tab && k.sealKey ? { [k.tab]: await sealer.seal(k.sealKey, "roll", link.tab, k.tab, { re: 0, receipt: k.roller }) } : {};
      link.send("roll", { n: k.n, receipt: k.table, sealed });
    });
    return this.#work;
  }
  // ---- a player's page ----
  // Seq: seq-roll.md#1, seq-roll.md#1.1 | R100, R102, R103
  /** A player's Roll: resolves with null when the GM's page answered with the roll, else why not. */
  request(intent) {
    const { link, clock: clock2 } = this.#w;
    if (!link || !this.#gmPeer) return Promise.resolve("Nobody can roll: the GM isn't at the table.");
    const n = this.#count("hollow.rolls.asked");
    return new Promise((done2) => {
      const timer = clock2.setTimeout(() => this.#answered(n, "The GM's page didn't answer that roll."), WAIT_MS);
      this.#waiting.set(n, { done: done2, timer });
      link.send("intent", { ...intent, n }, this.#gmPeer.tab);
    });
  }
  #answered(n, why3) {
    const w = this.#waiting.get(n);
    if (!w) return;
    this.#waiting.delete(n);
    this.#w.clock.clearTimeout(w.timer);
    w.done(why3);
  }
  /** Switch or lock a CRIT: the GM's page applies it; on the GM's page, at once. */
  crit(id, choice, lock) {
    if (this.#w.gm) {
      void this.#crit({ id, choice, lock }, null);
      return;
    }
    if (this.#gmPeer) this.#w.link?.send("crit", { id, choice, lock }, this.#gmPeer.tab);
  }
  // Seq: seq-roll.md#1.8 | R106, R107, R108
  #heard(msg, from) {
    if (from.browser !== this.#w.gmBrowser) return this.#work;
    this.#gmPeer = from;
    const last = this.#last.get(from.tab);
    if (last === void 0 || msg.n > last) {
      const missed = last === void 0 ? 0 : msg.n - last - 1;
      if (missed > 0) {
        const count = missed > MANY ? "Many" : String(missed);
        this.#print({
          id: `missed-${from.tab}-${msg.n}`,
          at: this.#w.clock.now(),
          title: `${count} roll${missed === 1 ? "" : "s"} from the GM didn't arrive`,
          dice: [],
          resolution: "",
          level: "",
          outcome: "missing"
        });
      }
      this.#last.set(from.tab, msg.n);
    }
    const tab2 = this.#w.link.tab, box2 = msg.sealed[tab2];
    this.#work = this.#work.then(async () => {
      const mine = box2 ? await this.#w.sealer.open(from.sealKey, "roll", from.tab, tab2, box2) : void 0;
      if (sealedRoll(mine)) {
        const m = mine;
        this.#print({ ...m.receipt, ok: true });
        this.#answered(m.re, null);
      } else this.#print(msg.receipt);
    });
    return this.#work;
  }
};

// src/net/seal.ts
var ECDH = { name: "ECDH", namedCurve: "P-256" };
var enc2 = new TextEncoder();
var dec = new TextDecoder();
var ad = (what, from, to) => enc2.encode(`${what}:${from}>${to}`);
var Sealer = class _Sealer {
  /** This page's sealing key, sent in the handshake. */
  pub;
  #pair;
  #shared = /* @__PURE__ */ new Map();
  constructor(pair, pub) {
    this.#pair = pair;
    this.pub = pub;
  }
  /** A new key pair: one per page load. */
  static async make() {
    const pair = await crypto.subtle.generateKey(ECDH, false, ["deriveKey"]);
    return new _Sealer(pair, b64(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))));
  }
  #with(theirs) {
    let key = this.#shared.get(theirs);
    if (!key) {
      key = (async () => {
        if (!PUB.test(theirs)) throw new Error("not a sealing key");
        const pub = await crypto.subtle.importKey("raw", unb64(theirs), ECDH, false, []);
        return crypto.subtle.deriveKey({ name: "ECDH", public: pub }, this.#pair.privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      })();
      key.catch(() => this.#shared.delete(theirs));
      this.#shared.set(theirs, key);
    }
    return key;
  }
  /** A box only the page holding `theirs` can open, and only as `what` from `from` to `to`. */
  async seal(theirs, what, from, to, value2) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: ad(what, from, to) },
      await this.#with(theirs),
      enc2.encode(JSON.stringify(value2))
    );
    return { iv: b64(iv), data: b64(new Uint8Array(data)) };
  }
  /** What the box holds, or undefined if it was made for anything else (or is no box at all). */
  async open(theirs, what, from, to, box2) {
    const b = box2;
    if (!b || typeof b.iv !== "string" || typeof b.data !== "string" || b.iv.length > 24) return void 0;
    try {
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: unb64(b.iv), additionalData: ad(what, from, to) },
        await this.#with(theirs),
        unb64(b.data)
      );
      return JSON.parse(dec.decode(plain));
    } catch {
      return void 0;
    }
  }
};

// src/net/stamps.ts
var SEQ_KEY = "hollow.seq";
var Stamps = class {
  #storage;
  #seq = 0;
  #peers = /* @__PURE__ */ new Map();
  #highest = /* @__PURE__ */ new Map();
  /** `storage` is sessionStorage on the page, so a reload continues the count. */
  constructor(storage) {
    this.#storage = storage;
    try {
      this.#seq = Number(storage.getItem(SEQ_KEY)) || 0;
    } catch {
    }
  }
  // R180: one counter for moves and changes.
  /** The next number. A deletion takes one too, never the piece's last (crc-Stamps.md). */
  next() {
    this.#seq++;
    try {
      this.#storage.setItem(SEQ_KEY, String(this.#seq));
    } catch {
    }
    return this.#seq;
  }
  /** A sending page's small local number; each page numbers the others in the order it meets them. */
  peer(tab2) {
    let n = this.#peers.get(tab2);
    if (n === void 0) this.#peers.set(tab2, n = this.#peers.size + 1);
    return n;
  }
  /** The highest number applied to `rid` from that page (0 if none). */
  highest(rid, tab2) {
    return this.#highest.get(rid)?.get(this.peer(tab2)) ?? 0;
  }
  // R181: lower than what was applied from that page is stale.
  fresh(rid, tab2, s) {
    return s >= this.highest(rid, tab2);
  }
  /** Forget what was applied to `rid` from one page: a change given up on lets the GM's version win. */
  forget(rid, tab2) {
    this.#highest.get(rid)?.delete(this.peer(tab2));
  }
  mark(rid, tab2, s) {
    let m = this.#highest.get(rid);
    if (!m) this.#highest.set(rid, m = /* @__PURE__ */ new Map());
    const p = this.peer(tab2);
    if (s > (m.get(p) ?? 0)) m.set(p, s);
  }
};

// node_modules/@noble/secp256k1/index.js
var freeze = Object.freeze;
var P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
var N2 = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
var Gx = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
var Gy = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
var secp256k1_CURVE = freeze({
  p: P,
  n: N2,
  h: 1n,
  a: 0n,
  b: 7n,
  Gx,
  Gy
});
var L = 32;
var isBytes = (a) => {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && a.BYTES_PER_ELEMENT === 1;
};
var abytes = (value2, length, title = "") => {
  if (isBytes(value2) && (length === void 0 || value2.length === length))
    return value2;
  const bytes = isBytes(value2);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value2.length}` : `type=${typeof value2}`;
  const message = (title ? `"${title}" ` : "") + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes)
    throw new TypeError(message);
  throw new RangeError(message);
};
var cloneBytes = (value2) => Uint8Array.from(value2);
var snapshotBytes = (value2, title, length) => cloneBytes(abytes(value2, length, title));
var padh = (n, pad2) => n.toString(16).padStart(pad2, "0");
var bytesToHex = (bytes) => {
  let hex = "";
  for (const byte of abytes(bytes))
    hex += padh(byte, 2);
  return hex;
};
var hexToBytes = (hex) => {
  const e = "hex invalid";
  if (typeof hex !== "string")
    throw new TypeError(e);
  if (hex.length % 2 || !/^[\da-f]*$/i.test(hex))
    throw new RangeError(e);
  const array = new Uint8Array(hex.length / 2);
  for (let ai = 0, hi = 0; ai < array.length; ai++, hi += 2) {
    const n1 = hex.charCodeAt(hi);
    const n2 = hex.charCodeAt(hi + 1);
    array[ai] = ((n1 & 15) + (n1 >> 6) * 9) * 16 + (n2 & 15) + (n2 >> 6) * 9;
  }
  return array;
};
var subtle = () => {
  const s = globalThis?.crypto?.subtle;
  if (s)
    return s;
  throw new Error("crypto.subtle must be defined, consider polyfill");
};
var concatBytes = (...arrays) => {
  let sum2 = 0;
  for (const a of arrays)
    sum2 += abytes(a).length;
  const res = new Uint8Array(sum2);
  let pad2 = 0;
  for (const a of arrays) {
    res.set(a, pad2);
    pad2 += a.length;
  }
  return res;
};
var randomBytes = (len = L) => {
  const c = globalThis?.crypto;
  if (typeof c?.getRandomValues !== "function")
    throw new Error("crypto.getRandomValues must be defined, consider polyfill");
  return c.getRandomValues(new Uint8Array(len));
};
var big = BigInt;
var arange = (n, min2, max, msg = "bad number: out of range") => {
  if (typeof n !== "bigint")
    throw new TypeError(msg);
  if (min2 <= n && n < max)
    return n;
  throw new RangeError(msg);
};
var M = (a, b = P) => (a %= b) >= 0n ? a : b + a;
var modN = (a) => M(a, N2);
var invert = (number, modulo) => {
  if (number === 0n)
    throw new Error("invert: expected non-zero number");
  if (modulo <= 1n)
    throw new Error("invert: expected modulus > 1, got " + modulo);
  let a = M(number, modulo);
  let b = modulo;
  let x = 0n, u = 1n;
  while (a !== 0n) {
    const q = b / a;
    const r = b - a * q;
    const m = x - u * q;
    b = a, a = r, x = u, u = m;
  }
  const gcd = b;
  if (gcd !== 1n)
    throw new Error("invert: does not exist");
  return M(x, modulo);
};
var _hash = (name2) => {
  const fn = hashes[name2];
  if (typeof fn !== "function")
    throw new Error("hashes." + name2 + " not set");
  return fn;
};
var callHash = (name2, a, b) => abytes(_hash(name2)(a, b), L, "digest");
var callHashAsync = async (name2, a, b) => abytes(await _hash(name2)(a, b), L, "digest");
var apoint = (p) => {
  if (p instanceof Point)
    return p;
  throw new TypeError("Point expected");
};
var E_BADPOINT = "bad point: not on curve";
var koblitz = (x) => M(M(x * x) * x + 7n);
var FpIsValid = (n) => arange(n, 0n, P);
var FpIsValidNot0 = (n) => arange(n, 1n, P);
var FnIsValidNot0 = (n) => arange(n, 1n, N2);
var isEven = (y) => !(y & 1n);
var getPrefix = (y) => Uint8Array.of(isEven(y) ? 2 : 3);
var lift_x = (x) => {
  const c = koblitz(FpIsValidNot0(x));
  let r = 1n;
  for (let num2 = c, e = (P + 1n) / 4n; e > 0n; e >>= 1n) {
    if (e & 1n)
      r = r * num2 % P;
    num2 = num2 * num2 % P;
  }
  if (M(r * r) !== c)
    throw new Error("sqrt invalid");
  return new Point(x, isEven(r) ? r : M(-r), 1n);
};
var Point = class _Point {
  static BASE;
  static ZERO;
  X;
  Y;
  Z;
  constructor(X, Y, Z) {
    this.X = FpIsValid(X);
    this.Y = FpIsValidNot0(Y);
    this.Z = FpIsValid(Z);
    freeze(this);
  }
  /** Returns the shared curve metadata object by reference.
   * It is readonly only at type level, and mutating it won't retarget arithmetic,
   * which already uses module-load snapshots. */
  static CURVE() {
    return secp256k1_CURVE;
  }
  /** Create 3d xyz point from 2d xy. (0, 0) => (0, 1, 0), not (0, 0, 1) */
  static fromAffine(ap) {
    const { x, y } = ap;
    return x === 0n && y === 0n ? I : new _Point(x, y, 1n);
  }
  /** Convert Uint8Array or hex string to Point. */
  static fromBytes(bytes) {
    abytes(bytes);
    const length = bytes.length;
    const head = bytes[0];
    const x = sliceBytesNumBE(bytes, 1, 33);
    try {
      if (length === 33 && (head === 2 || head === 3)) {
        const p = lift_x(x);
        return head === 3 ? p.negate() : p;
      }
      if (length === 65 && head === 4)
        return new _Point(x, sliceBytesNumBE(bytes, 33, 65), 1n).assertValidity();
    } catch (error) {
      throw new Error(E_BADPOINT);
    }
    throw new Error(E_BADPOINT);
  }
  static fromHex(hex) {
    return _Point.fromBytes(hexToBytes(hex));
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  /** Equality check: compare points P&Q. */
  equals(other) {
    const { X: X1, Y: Y1, Z: Z1 } = this;
    const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
    return M(X1 * Z2) === M(X2 * Z1) && M(Y1 * Z2) === M(Y2 * Z1);
  }
  is0() {
    return this.Z === 0n;
  }
  /** Flip point over y coordinate. */
  negate() {
    return new _Point(this.X, M(-this.Y), this.Z);
  }
  /** Point doubling: P+P, complete formula. */
  double() {
    return this.add(this);
  }
  /**
   * Point addition: P+Q, complete, exception-free formula
   * (Renes-Costello-Batina, algo 1 of [2015/1060](https://eprint.iacr.org/2015/1060)).
   * Cost: `12M + 0S + 3*a + 3*b3 + 23add`.
   */
  // prettier-ignore
  add(other) {
    const { X: X1, Y: Y1, Z: Z1 } = this;
    const { X: X2, Y: Y2, Z: Z2 } = apoint(other);
    const a = 0n;
    const b = 7n;
    let X3 = 0n, Y3 = 0n, Z3 = 0n;
    const b3 = M(b * 3n);
    let t0 = M(X1 * X2), t1 = M(Y1 * Y2), t2 = M(Z1 * Z2), t3 = M(X1 + Y1);
    let t4 = M(X2 + Y2);
    t3 = M(t3 * t4);
    t4 = M(t0 + t1);
    t3 = M(t3 - t4);
    t4 = M(X1 + Z1);
    let t5 = M(X2 + Z2);
    t4 = M(t4 * t5);
    t5 = M(t0 + t2);
    t4 = M(t4 - t5);
    t5 = M(Y1 + Z1);
    X3 = M(Y2 + Z2);
    t5 = M(t5 * X3);
    X3 = M(t1 + t2);
    t5 = M(t5 - X3);
    Z3 = M(a * t4);
    X3 = M(b3 * t2);
    Z3 = M(X3 + Z3);
    X3 = M(t1 - Z3);
    Z3 = M(t1 + Z3);
    Y3 = M(X3 * Z3);
    t1 = M(t0 + t0);
    t1 = M(t1 + t0);
    t2 = M(a * t2);
    t4 = M(b3 * t4);
    t1 = M(t1 + t2);
    t2 = M(t0 - t2);
    t2 = M(a * t2);
    t4 = M(t4 + t2);
    t0 = M(t1 * t4);
    Y3 = M(Y3 + t0);
    t0 = M(t5 * t4);
    X3 = M(t3 * X3);
    X3 = M(X3 - t0);
    t0 = M(t3 * t1);
    Z3 = M(t5 * Z3);
    Z3 = M(Z3 + t0);
    return new _Point(X3, Y3, Z3);
  }
  subtract(other) {
    return this.add(apoint(other).negate());
  }
  /**
   * Point-by-scalar multiplication. Scalar must be in range 1 <= n < CURVE.n.
   * Uses {@link wNAF} for base point.
   * Uses fake point to mitigate leakage shape in JS, not as a hard constant-time guarantee.
   * @param n scalar by which point is multiplied
   * @param safe safe mode guards against timing attacks; unsafe mode is faster
   */
  multiply(n, safe = true) {
    if (!safe && n === 0n)
      return I;
    FnIsValidNot0(n);
    if (n === 1n)
      return this;
    if (this.equals(G))
      return wNAF(n).p;
    let p = I;
    let f = G;
    let d = this;
    for (let i = 0; safe ? i < 256 : n > 0n; i++) {
      if (n & 1n)
        p = p.add(d);
      else if (safe)
        f = f.add(d);
      d = d.double();
      n >>= 1n;
    }
    return p;
  }
  multiplyUnsafe(scalar) {
    return this.multiply(scalar, false);
  }
  /** Convert point to 2d xy affine point. (X, Y, Z) ∋ (x=X/Z, y=Y/Z) */
  toAffine() {
    const { X: x, Y: y, Z: z } = this;
    if (z === 0n)
      return { x: 0n, y: 0n };
    if (z === 1n)
      return { x, y };
    const iz = invert(z, P);
    if (M(z * iz) !== 1n)
      throw new Error("inverse invalid");
    return { x: M(x * iz), y: M(y * iz) };
  }
  /** Checks if the point is valid and on-curve. */
  assertValidity() {
    const { x, y } = this.toAffine();
    FpIsValidNot0(x);
    FpIsValidNot0(y);
    if (M(y * y) !== koblitz(x))
      throw new Error(E_BADPOINT);
    return this;
  }
  /** Converts point to 33/65-byte Uint8Array. */
  toBytes(isCompressed = true) {
    const { x, y } = this.assertValidity().toAffine();
    const x32b = numTo32b(x);
    if (isCompressed)
      return concatBytes(getPrefix(y), x32b);
    return concatBytes(Uint8Array.of(4), x32b, numTo32b(y));
  }
  toHex(isCompressed) {
    return bytesToHex(this.toBytes(isCompressed));
  }
};
var G = new Point(Gx, Gy, 1n);
var I = new Point(0n, 1n, 0n);
Point.BASE = G;
Point.ZERO = I;
var doubleScalarMulUns = (R, u1, u2) => {
  return G.multiply(u1, false).add(R.multiply(u2, false)).assertValidity();
};
var bytesToNumBE = (b) => big("0x" + (bytesToHex(b) || "0"));
var sliceBytesNumBE = (b, from, to) => bytesToNumBE(b.subarray(from, to));
var numTo32b = (num2) => hexToBytes(padh(arange(num2, 0n, 2n ** 256n), L * 2));
var secretKeyToScalar = (secretKey2) => {
  const num2 = bytesToNumBE(abytes(secretKey2, L, "secret key"));
  return arange(num2, 1n, N2, "invalid secret key: outside of range");
};
var _sha = "SHA-256";
var hashes = {
  hmacSha256Async: async (key, message) => {
    const s = subtle();
    const k = await s.importKey("raw", key, { name: "HMAC", hash: _sha }, false, ["sign"]);
    return new Uint8Array(await s.sign("HMAC", k, message));
  },
  hmacSha256: void 0,
  sha256Async: async (msg) => new Uint8Array(await subtle().digest(_sha, msg)),
  sha256: void 0
};
var randomSecretKey = (seed) => {
  seed = seed === void 0 ? randomBytes(48) : seed;
  abytes(seed);
  if (seed.length < 48 || seed.length > 1024)
    throw new RangeError("expected 48-1024b");
  const num2 = M(bytesToNumBE(seed), N2 - 1n);
  return numTo32b(num2 + 1n);
};
var createKeygen = (getPublicKey) => (seed) => {
  const secretKey2 = randomSecretKey(seed);
  return { secretKey: secretKey2, publicKey: getPublicKey(secretKey2) };
};
var getTag = (tag2) => Uint8Array.from("BIP0340/" + tag2, (c) => c.charCodeAt(0));
var taggedHash = (tag2, ...messages) => {
  const tagH = callHash("sha256", getTag(tag2));
  return callHash("sha256", concatBytes(tagH, tagH, ...messages));
};
var taggedHashAsync = (tag2, ...messages) => callHashAsync("sha256Async", getTag(tag2)).then((tagH) => callHashAsync("sha256Async", concatBytes(tagH, tagH, ...messages)));
var extpubSchnorr = (priv) => {
  const d_ = secretKeyToScalar(priv);
  const p = G.multiply(d_);
  const { x, y } = p.assertValidity().toAffine();
  const d = isEven(y) ? d_ : modN(-d_);
  const px = numTo32b(x);
  return { d, px };
};
var bytesModN = (bytes) => modN(bytesToNumBE(bytes));
var challenge = (...args) => bytesModN(taggedHash("challenge", ...args));
var challengeAsync = async (...args) => bytesModN(await taggedHashAsync("challenge", ...args));
var pubSchnorr = (secretKey2) => {
  return extpubSchnorr(secretKey2).px;
};
var keygenSchnorr = /* @__PURE__ */ createKeygen(pubSchnorr);
var prepSigSchnorr = (message, secretKey2, auxRand) => {
  const m = snapshotBytes(message, "message");
  const { px, d } = extpubSchnorr(secretKey2);
  return { m, px, d, a: abytes(auxRand, L) };
};
var extractK = (rand) => {
  const k_ = bytesModN(rand);
  if (k_ === 0n)
    throw new Error("sign failed: k is zero");
  const { px, d } = extpubSchnorr(numTo32b(k_));
  return { rx: px, k: d };
};
var createSigSchnorr = (k, px, e, d) => {
  return concatBytes(px, numTo32b(modN(k + e * d)));
};
var E_INVSIG = "invalid signature produced";
var signSchnorr = (message, secretKey2, auxRand = randomBytes(L)) => {
  const { m, px, d, a } = prepSigSchnorr(message, secretKey2, auxRand);
  const t = numTo32b(d ^ bytesToNumBE(taggedHash("aux", a)));
  const { rx, k } = extractK(taggedHash("nonce", t, px, m));
  const sig = createSigSchnorr(k, rx, challenge(rx, px, m), d);
  if (!verifySchnorr(sig, m, px))
    throw new Error(E_INVSIG);
  return sig;
};
var signSchnorrAsync = async (message, secretKey2, auxRand = randomBytes(L)) => {
  const { m, px, d, a } = prepSigSchnorr(message, secretKey2, auxRand);
  const t = numTo32b(d ^ bytesToNumBE(await taggedHashAsync("aux", a)));
  const { rx, k } = extractK(await taggedHashAsync("nonce", t, px, m));
  const sig = createSigSchnorr(k, rx, await challengeAsync(rx, px, m), d);
  if (!await verifySchnorrAsync(sig, m, px))
    throw new Error(E_INVSIG);
  return sig;
};
var callSyncAsyncFn = (res, later) => {
  return res instanceof Promise ? res.then(later) : later(res);
};
var _verifSchnorr = (signature, message, publicKey2, challengeFn) => {
  const sig = abytes(signature, 64, "signature");
  const msg = abytes(message, void 0, "message");
  const pub = abytes(publicKey2, L, "publicKey");
  let P_;
  let r;
  let s;
  let chalInput;
  try {
    const x = bytesToNumBE(pub);
    P_ = lift_x(x);
    r = FpIsValidNot0(sliceBytesNumBE(sig, 0, L));
    s = FnIsValidNot0(sliceBytesNumBE(sig, L, 64));
    chalInput = concatBytes(numTo32b(r), pub, msg);
  } catch (error) {
    return false;
  }
  return callSyncAsyncFn(challengeFn(chalInput), (e) => {
    try {
      const { x, y } = doubleScalarMulUns(P_, s, modN(-e)).toAffine();
      if (!isEven(y) || x !== r)
        return false;
      return true;
    } catch (error) {
      return false;
    }
  });
};
var verifySchnorr = (s, m, p) => _verifSchnorr(s, m, p, challenge);
var verifySchnorrAsync = async (s, m, p) => _verifSchnorr(s, m, p, challengeAsync);
var schnorr = /* @__PURE__ */ freeze({
  keygen: keygenSchnorr,
  getPublicKey: pubSchnorr,
  sign: signSchnorr,
  verify: verifySchnorr,
  signAsync: signSchnorrAsync,
  verifyAsync: verifySchnorrAsync
});
var precompute = () => {
  const points2 = [];
  let p = G;
  let b = p;
  for (let w = 0; w < 33; w++) {
    b = p;
    points2.push(b);
    for (let i = 1; i < 128; i++) {
      b = b.add(p);
      points2.push(b);
    }
    p = b.double();
  }
  return points2;
};
var Gpows = void 0;
var ctneg = (cnd, p) => {
  const n = p.negate();
  return cnd ? n : p;
};
var wNAF = (n) => {
  const comp = Gpows || (Gpows = precompute());
  let p = I;
  let f = G;
  for (let w = 0; w < 33; w++) {
    let wbits = Number(n & 255n);
    n >>= 8n;
    if (wbits > 128) {
      wbits -= 256;
      n += 1n;
    }
    const off = w * 128;
    const offP = off + Math.abs(wbits) - 1;
    const isOddW = w % 2 !== 0;
    const isNeg = wbits < 0;
    if (wbits === 0) {
      f = f.add(ctneg(isOddW, comp[off]));
    } else {
      p = p.add(ctneg(isNeg, comp[offP]));
    }
  }
  if (n !== 0n)
    throw new Error("invalid wnaf");
  return { p, f };
};

// node_modules/@trystero-p2p/core/dist/utils.mjs
var { floor, min, sin } = Math;
var libName = "Trystero";
var alloc = (n, f) => Array(n).fill(void 0).map(f);
var charSet = "0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz";
var genId = (n) => alloc(n, () => charSet[floor(Math.random() * 62)] ?? "").join("");
var selfId = genId(20);
var all = Promise.all.bind(Promise);
var isBrowser = typeof window !== "undefined";
var { entries, fromEntries, keys, values } = Object;
var noOp = () => {
};
var candidateType = "candidate";
var resetTimer = (timer) => {
  if (timer !== null) clearTimeout(timer);
  return null;
};
var mkErr = (msg) => /* @__PURE__ */ new Error(`${libName}: ${msg}`);
var toErrorMessage = (reason, fallback) => {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason) return reason;
  return toJson(reason ?? fallback);
};
var toError = (reason, fallback) => reason instanceof Error ? reason : mkErr(toErrorMessage(reason, fallback));
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var encodeBytes = (txt) => encoder.encode(txt);
var decodeBytes = (buffer) => decoder.decode(buffer);
var toHex = (buffer) => buffer.reduce((a, c) => a + c.toString(16).padStart(2, "0"), "");
var topicPath = (...parts) => parts.join("@");
var shuffle = (xs, seed) => {
  const a = [...xs];
  const rand = () => {
    const x = sin(seed++) * 1e4;
    return x - floor(x);
  };
  let i = a.length;
  while (i) {
    const j = floor(rand() * i--);
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
};
var getRelays = (config, defaults, defaultN, deriveFromAppId = false) => config.relayConfig?.urls || (deriveFromAppId ? shuffle(defaults, strToNum(config.appId)) : defaults).slice(0, config.relayConfig?.redundancy ?? defaultN);
var toJson = JSON.stringify;
var fromJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    throw mkErr(`failed to parse JSON: ${s}`);
  }
};
var strToNum = (str2, limit = Number.MAX_SAFE_INTEGER) => str2.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % limit;
var defaultRetryMs = 3333;
var maxRetryMs = 6e4;
var socketRetryPeriods = {};
var reconnectionLockingPromise = null;
var resolver = null;
var pauseRelayReconnection = () => {
  if (!reconnectionLockingPromise) reconnectionLockingPromise = new Promise((resolve3) => {
    resolver = resolve3;
  }).finally(() => {
    resolver = null;
    reconnectionLockingPromise = null;
  });
};
var resumeRelayReconnection = () => {
  resolver?.();
};
var makeSocket = (url, onMessage, onReconnect) => {
  const client = {};
  let didOpen = false;
  let isReconnectPending = false;
  let retryTimer;
  let resolveReady = noOp;
  client.isClosed = false;
  client.ready = new Promise((res) => resolveReady = res);
  const init = () => {
    if (client.isClosed) return;
    retryTimer = void 0;
    isReconnectPending = false;
    const socket = new WebSocket(url);
    socket.onclose = () => {
      if (client.isClosed || isReconnectPending) return;
      isReconnectPending = true;
      if (reconnectionLockingPromise) {
        reconnectionLockingPromise.then(init);
        return;
      }
      const period = socketRetryPeriods[url] ??= defaultRetryMs;
      retryTimer = setTimeout(init, Math.random() * period);
      socketRetryPeriods[url] = min(period * 2, maxRetryMs);
    };
    socket.onmessage = (e) => onMessage(String(e.data));
    client.socket = socket;
    client.url = socket.url;
    socket.onopen = () => {
      const isReconnect = didOpen;
      didOpen = true;
      resolveReady(client);
      socketRetryPeriods[url] = defaultRetryMs;
      if (isReconnect) onReconnect?.();
    };
    client.send = (data) => {
      if (socket.readyState === 1) socket.send(data);
    };
  };
  client.close = () => {
    client.isClosed = true;
    if (retryTimer !== void 0) {
      clearTimeout(retryTimer);
      retryTimer = void 0;
    }
    client.socket.close();
  };
  init();
  return client;
};
var createRelayManager = (getSocket) => {
  const relays = {};
  const keysByRelay = /* @__PURE__ */ new WeakMap();
  const keyOf = (relay) => {
    const key = keysByRelay.get(relay);
    if (!key) throw mkErr("relay bookkeeping missing registration for relay client");
    return key;
  };
  const scoped = () => {
    const store2 = {};
    const forKey = (key) => store2[key] ??= {};
    return {
      forKey,
      forRelay: (relay) => forKey(keyOf(relay))
    };
  };
  const store = (key, relay) => {
    relays[key] = relay;
    keysByRelay.set(relay, key);
    return relay;
  };
  return {
    register: (key, createRelay) => {
      const relay = relays[key];
      if (relay) return relay;
      return store(key, createRelay());
    },
    keyOf,
    scoped,
    getSockets: () => fromEntries(entries(relays).flatMap(([key, relay]) => {
      const socket = getSocket(relay);
      return socket ? [[key, socket]] : [];
    }))
  };
};
var watchOnline = () => {
  if (isBrowser) {
    const controller = new AbortController();
    addEventListener("online", resumeRelayReconnection, { signal: controller.signal });
    addEventListener("offline", pauseRelayReconnection, { signal: controller.signal });
    return () => controller.abort();
  }
  return noOp;
};

// node_modules/@trystero-p2p/core/dist/crypto.mjs
var algo = "AES-GCM";
var strToSha1 = {};
var pack = (buff) => btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buff))));
var unpack = (packed) => {
  const str2 = atob(packed);
  return new Uint8Array(str2.length).map((_, i) => str2.charCodeAt(i)).buffer;
};
var hashWith = async (algorithm, str2) => new Uint8Array(await crypto.subtle.digest(algorithm, encodeBytes(str2)));
var sha1 = async (str2) => strToSha1[str2] ??= Array.from(await hashWith("SHA-1", str2)).map((b) => b.toString(36)).join("");
var genKey = async (secret, appId, roomId) => crypto.subtle.importKey("raw", await crypto.subtle.digest({ name: "SHA-256" }, encodeBytes(`${secret}:${appId}:${roomId}`)), { name: algo }, false, ["encrypt", "decrypt"]);
var deriveRoomNamespace = async (appId, roomId) => toHex(await hashWith("SHA-256", `${libName}:${appId}:${roomId}`));
var joinChar = "$";
var ivJoinChar = ",";
var encrypt = async (keyP, plaintext) => {
  const iv = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16));
  return iv.join(ivJoinChar) + joinChar + pack(await crypto.subtle.encrypt({
    name: algo,
    iv
  }, await keyP, encodeBytes(plaintext)));
};
var decrypt = async (keyP, raw) => {
  const [iv, c] = raw.split(joinChar);
  return decodeBytes(await crypto.subtle.decrypt({
    name: algo,
    iv: new Uint8Array(iv?.split(ivJoinChar).map(Number) ?? [])
  }, await keyP, unpack(c ?? "")));
};

// node_modules/@trystero-p2p/core/dist/offer-manager.mjs
var offerLeaseTtlMs = 18e4;
var OfferManager = class {
  makeOffer;
  leased = /* @__PURE__ */ new Map();
  destroyed = false;
  constructor(makeOffer) {
    this.makeOffer = makeOffer;
  }
  claimLeased(peer) {
    const timer = this.leased.get(peer);
    if (timer) {
      resetTimer(timer);
      this.leased.delete(peer);
    }
  }
  reclaimLeased(peer) {
    if (this.leased.has(peer)) {
      this.claimLeased(peer);
      peer.destroy();
    }
  }
  checkout(n, leaseOffers, encryptOffer) {
    const toRecord = async (didRetry = false) => {
      if (this.destroyed) throw mkErr("room left while preparing offer");
      const peer = this.makeOffer();
      try {
        const offer2 = await encryptOffer(peer);
        if (this.destroyed) throw mkErr("room left while preparing offer");
        if (leaseOffers) {
          this.leased.set(peer, setTimeout(() => {
            this.leased.delete(peer);
            peer.destroy();
          }, offerLeaseTtlMs));
          return {
            peer,
            offer: offer2,
            claim: () => this.claimLeased(peer),
            reclaim: () => this.reclaimLeased(peer)
          };
        }
        return {
          peer,
          offer: offer2
        };
      } catch (error) {
        peer.destroy();
        if (!didRetry && !this.destroyed) return toRecord(true);
        throw error;
      }
    };
    return all(alloc(n, () => toRecord()));
  }
  getOffers(n, encryptOffer) {
    return this.checkout(n, true, encryptOffer);
  }
  destroy() {
    this.destroyed = true;
    this.leased.forEach((timer, peer) => {
      resetTimer(timer);
      peer.destroy();
    });
    this.leased.clear();
  }
};

// node_modules/@trystero-p2p/core/dist/handshake.mjs
var overlapRoomPasswordErr = mkErr("incorrect password for overlapping room");
var createPasswordHandshake = (password, appId, roomId) => {
  const hashChallenge = (challenge2) => hashWith("SHA-256", `${challenge2}:${password}:${appId}:${roomId}`).then(toHex);
  const run = async (send, receive, isInitiator) => {
    if (!password) return;
    if (isInitiator) {
      const challenge2 = genId(36);
      await send({
        __trystero_pw: "challenge",
        c: challenge2
      });
      const { data: data2 } = await receive();
      if (!data2 || typeof data2 !== "object" || data2.__trystero_pw !== "response" || typeof data2.h !== "string") throw overlapRoomPasswordErr;
      const expected = await hashChallenge(challenge2);
      if (data2.h !== expected) throw overlapRoomPasswordErr;
      return;
    }
    const { data } = await receive();
    if (!data || typeof data !== "object" || data.__trystero_pw !== "challenge" || typeof data.c !== "string") throw overlapRoomPasswordErr;
    await send({
      __trystero_pw: "response",
      h: await hashChallenge(data.c)
    });
  };
  const compose = (userHandshake) => password || userHandshake ? async (peerId, send, receive, isInitiator) => {
    await run(send, receive, isInitiator);
    await userHandshake?.(peerId, send, receive, isInitiator);
  } : void 0;
  return {
    run,
    compose
  };
};
var toHandshakeErrorMessage = (error) => {
  const message = toErrorMessage(error, "unknown error");
  return message.startsWith("handshake ") ? message : `handshake failed: ${message}`;
};
var createHandshakeManager = ({ onPeerHandshake, onHandshakeError, handshakeTimeoutMs, sendHandshakeData, sendHandshakeReady, onActivate, onFailure }) => {
  const peerStates = {};
  const maybeActivatePeer = (id, peer) => {
    const state = peerStates[id];
    if (!state || peer && state.peer !== peer || state.isActive) return;
    if (!state.didLocalHandshakePass || !state.didReceiveRemoteReady) return;
    state.isActive = true;
    state.handshakeTimer = resetTimer(state.handshakeTimer);
    onActivate(id, state.peer);
  };
  const failPeerHandshake = (id, peer, reason) => {
    const state = peerStates[id];
    if (!state || state.peer !== peer) return;
    const error = toHandshakeErrorMessage(reason);
    onHandshakeError?.(id, error);
    onFailure(id, peer, mkErr(error));
  };
  const markLocalHandshakePassed = (id, peer) => {
    const state = peerStates[id];
    if (!state || state.peer !== peer || state.isActive) return;
    state.didLocalHandshakePass = true;
    sendHandshakeReady("", id).catch((err) => failPeerHandshake(id, peer, mkErr(`failed sending handshake readiness: ${toErrorMessage(err, "unknown send failure")}`)));
    maybeActivatePeer(id, peer);
  };
  return {
    addPeer: (id, peer) => {
      peerStates[id] = {
        peer,
        isActive: false,
        didLocalHandshakePass: false,
        didReceiveRemoteReady: false,
        handshakeTimer: null,
        pendingHandshakePayloads: [],
        handshakeWaiters: []
      };
    },
    clearPeer: (id, error) => {
      const state = peerStates[id];
      if (!state) return;
      state.handshakeTimer = resetTimer(state.handshakeTimer);
      state.pendingHandshakePayloads.length = 0;
      state.handshakeWaiters.splice(0).forEach((waiter) => waiter.reject(error));
      delete peerStates[id];
    },
    canReceiveFromPeer: (id, receiveWhilePending) => {
      const state = peerStates[id];
      return Boolean(state && (state.isActive || receiveWhilePending));
    },
    start: (id, peer) => {
      const state = peerStates[id];
      if (!state || state.peer !== peer) return;
      state.handshakeTimer = setTimeout(() => failPeerHandshake(id, peer, mkErr(`handshake timed out after ${handshakeTimeoutMs}ms`)), handshakeTimeoutMs);
      const sendHandshake = async (data, metadata) => {
        await sendHandshakeData(data, id, metadata);
      };
      const receiveHandshake = () => new Promise((resolve3, reject) => {
        const current = peerStates[id];
        if (!current || current.peer !== peer) {
          reject(mkErr("peer disconnected during handshake"));
          return;
        }
        const payload = current.pendingHandshakePayloads.shift();
        if (payload) {
          resolve3(payload);
          return;
        }
        current.handshakeWaiters.push({
          resolve: resolve3,
          reject: (error) => reject(error)
        });
      });
      const isInitiator = selfId < id;
      Promise.resolve(onPeerHandshake?.(id, sendHandshake, receiveHandshake, isInitiator)).then(() => markLocalHandshakePassed(id, peer)).catch((err) => failPeerHandshake(id, peer, toError(err, "handshake failed")));
    },
    receiveHandshakeData: (data, id, metadata) => {
      const state = peerStates[id];
      if (!state || state.isActive) return;
      const payload = metadata === void 0 ? { data } : {
        data,
        metadata
      };
      const pending = state.handshakeWaiters.shift();
      if (pending) {
        pending.resolve(payload);
        return;
      }
      if (state.pendingHandshakePayloads.length >= 16) {
        failPeerHandshake(id, state.peer, mkErr("too many pending handshake messages"));
        return;
      }
      state.pendingHandshakePayloads.push(payload);
    },
    receiveHandshakeReady: (id) => {
      const state = peerStates[id];
      if (!state || state.isActive) return;
      state.didReceiveRemoteReady = true;
      maybeActivatePeer(id);
    }
  };
};

// node_modules/@trystero-p2p/core/dist/data-limits.mjs
var maxActionFrameBytes = 16384;
var pendingDataTimeoutMs = 1e4;
var transferTimeoutMs = 12e4;

// node_modules/@trystero-p2p/core/dist/peer.mjs
var iceTimeout = 15e3;
var iceCandidateSettleMs = 150;
var disconnectedCloseDelayMs = 5e3;
var iceCandidateEvent = "icecandidate";
var iceStateEvent = "icegatheringstatechange";
var iceConnectionStateEvent = "iceconnectionstatechange";
var offerType = "offer";
var answerType = "answer";
var outOfRangePattern = /out of range/i;
var maxPendingRemoteCandidates = 128;
var maxRemoteCandidateSdpLength = 8192;
var rewriteMdnsCandidatesToLoopback = (sdp) => sdp.replace(/ (\S+\.local) (\d+) typ host/g, " 127.0.0.1 $2 typ host");
var peer_default = (initiator, { trickleIce, rtcConfig, rtcPolyfill, turnConfig, _test_only_mdnsHostFallbackToLoopback }) => {
  const pc = new (rtcPolyfill ?? RTCPeerConnection)({
    iceServers: defaultIceServers.concat(turnConfig ?? []),
    ...rtcConfig
  });
  const handlers = {};
  const pendingIceGathering = /* @__PURE__ */ new Set();
  const pendingSignals = [];
  const pendingData = [];
  let pendingDataTimer = null;
  const shouldTrickleIce = trickleIce !== false;
  const pendingRemoteCandidates = [];
  const pendingTracks = [];
  let resolveInitialOffer;
  let makingOffer = false;
  let isSettingRemoteAnswerPending = false;
  let dataChannel = null;
  let disconnectedCloseTimer = null;
  let didEmitClose = false;
  const settleInitialOffer = (signal) => {
    if (resolveInitialOffer) {
      resolveInitialOffer(signal);
      resolveInitialOffer = void 0;
    }
  };
  const clearDisconnectedCloseTimer = () => disconnectedCloseTimer = resetTimer(disconnectedCloseTimer);
  const emitClose = () => {
    if (didEmitClose) return;
    didEmitClose = true;
    pendingIceGathering.forEach((finish) => finish());
    pendingDataTimer = resetTimer(pendingDataTimer);
    pendingData.length = 0;
    clearDisconnectedCloseTimer();
    handlers.close?.();
  };
  const emitSignal = (signal) => {
    if (signal.type === offerType) {
      settleInitialOffer(signal);
      if (!handlers.signal && !pc.remoteDescription) return;
    }
    if (handlers.signal) handlers.signal(signal);
    else pendingSignals.push(signal);
  };
  const appendSignalHandler = (handler) => {
    const previousSignalHandler = handlers.signal;
    handlers.signal = (signal) => {
      previousSignalHandler?.(signal);
      handler(signal);
    };
    if (pendingSignals.length > 0) pendingSignals.splice(0).forEach((signal) => handlers.signal?.(signal));
  };
  const normalizeSdp = (sdp) => _test_only_mdnsHostFallbackToLoopback ? rewriteMdnsCandidatesToLoopback(sdp) : sdp;
  const normalizeCandidate = (candidate) => {
    if (!_test_only_mdnsHostFallbackToLoopback || typeof candidate.candidate !== "string") return candidate;
    const normalizedCandidate = rewriteMdnsCandidatesToLoopback(candidate.candidate);
    return normalizedCandidate === candidate.candidate ? candidate : {
      ...candidate,
      candidate: normalizedCandidate
    };
  };
  const localDescriptionSignal = (peerConnection) => ({
    type: peerConnection.localDescription?.type ?? offerType,
    sdp: normalizeSdp(peerConnection.localDescription?.sdp ?? "")
  });
  const getRemoteUfrag = () => {
    const sdp = pc.remoteDescription?.sdp;
    if (!sdp) return null;
    return sdp.match(/a=ice-ufrag:([^\s]+)/)?.[1] ?? null;
  };
  const getRemoteMediaSectionCount = () => (pc.remoteDescription?.sdp?.match(/^m=/gm) ?? []).length;
  const canApplyRemoteCandidate = (candidate) => {
    if (!pc.remoteDescription) return false;
    const remoteMLineCount = getRemoteMediaSectionCount();
    if (typeof candidate.sdpMLineIndex === "number" && remoteMLineCount > 0 && candidate.sdpMLineIndex >= remoteMLineCount) return false;
    const remoteUfrag = getRemoteUfrag();
    if (remoteUfrag && candidate.usernameFragment && candidate.usernameFragment !== remoteUfrag) return false;
    return true;
  };
  const addIceCandidateSafe = async (candidate) => {
    try {
      await pc.addIceCandidate(candidate);
      return true;
    } catch (err) {
      if (err instanceof Error && outOfRangePattern.test(err.message) && typeof candidate.sdpMLineIndex === "number") return false;
      throw err;
    }
  };
  const queueRemoteCandidate = (candidate) => {
    if (pendingRemoteCandidates.length >= maxPendingRemoteCandidates) pendingRemoteCandidates.shift();
    pendingRemoteCandidates.push(candidate);
  };
  const flushPendingRemoteCandidates = async () => {
    if (!pc.remoteDescription || pendingRemoteCandidates.length === 0) return;
    const remoteUfrag = getRemoteUfrag();
    const queuedCandidates = pendingRemoteCandidates.splice(0);
    const stillPending = [];
    for (const candidate of queuedCandidates) {
      if (remoteUfrag && candidate.usernameFragment && candidate.usernameFragment !== remoteUfrag) continue;
      if (!canApplyRemoteCandidate(candidate)) {
        stillPending.push(candidate);
        continue;
      }
      if (!await addIceCandidateSafe(candidate)) stillPending.push(candidate);
    }
    stillPending.forEach(queueRemoteCandidate);
  };
  const addRemoteCandidate = async (candidate) => {
    if (canApplyRemoteCandidate(candidate)) {
      if (!await addIceCandidateSafe(candidate)) queueRemoteCandidate(candidate);
      return;
    }
    queueRemoteCandidate(candidate);
  };
  const setupDataChannel = (channel) => {
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = 65535;
    const failData = () => {
      console.warn(`${libName}: invalid or excessive data before handler registration; disconnecting peer`);
      channel.close();
      pc.close();
      emitClose();
    };
    channel.onmessage = (e) => {
      const data = e.data;
      if (didEmitClose) return;
      if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data) || data.byteLength > 16515) {
        failData();
        return;
      }
      if (handlers.data) handlers.data(data);
      else {
        if (pendingData.length >= 64) {
          failData();
          return;
        }
        if (!pendingDataTimer) pendingDataTimer = setTimeout(failData, pendingDataTimeoutMs);
        pendingData.push(data);
      }
    };
    channel.onopen = () => handlers.connect?.();
    channel.onclose = emitClose;
    channel.onerror = ({ error }) => {
      if (didEmitClose || error?.errorDetail === "sctp-failure" && (error.sctpCauseCode === 12 || /^User-Initiated Abort\b/.test(error.message))) return;
      handlers.error?.(toError(error, "data channel error"));
    };
  };
  const configuredIceServers = rtcConfig?.iceServers ?? defaultIceServers.concat(turnConfig ?? []);
  const hasServerUrlPattern = (pattern) => configuredIceServers.some(({ urls }) => (Array.isArray(urls) ? urls : [urls]).some((url) => pattern.test(url)));
  const expectsTurnCandidate = hasServerUrlPattern(/^turns?:/i);
  const expectsStunCandidate = !expectsTurnCandidate && hasServerUrlPattern(/^stuns?:/i);
  const targetCandidatePattern = expectsTurnCandidate ? /\btyp relay\b/ : expectsStunCandidate ? /\btyp (?:srflx|relay|prflx)\b/ : /\btyp (?:host|srflx|relay|prflx)\b/;
  const waitForIceGathering = async (peerConnection) => {
    await new Promise((resolve3) => {
      let timeout = null;
      let settleTimeout = null;
      const finish = () => {
        resetTimer(timeout);
        resetTimer(settleTimeout);
        peerConnection.removeEventListener(iceStateEvent, checkState);
        peerConnection.removeEventListener(iceCandidateEvent, onCandidate);
        pendingIceGathering.delete(finish);
        resolve3();
      };
      const scheduleSettle = (candidateLine = "") => {
        const sdp = `${peerConnection.localDescription?.sdp ?? ""}
${candidateLine}`;
        if (targetCandidatePattern.test(sdp)) {
          resetTimer(settleTimeout);
          settleTimeout = setTimeout(finish, iceCandidateSettleMs);
        }
      };
      const checkState = () => {
        if (peerConnection.iceGatheringState === "complete" || didEmitClose) finish();
        else scheduleSettle();
      };
      const onCandidate = (event) => {
        const { candidate } = event;
        if (candidate) scheduleSettle(candidate.candidate);
        else finish();
      };
      pendingIceGathering.add(finish);
      timeout = setTimeout(finish, iceTimeout);
      peerConnection.addEventListener(iceStateEvent, checkState);
      peerConnection.addEventListener(iceCandidateEvent, onCandidate);
      checkState();
    });
    return localDescriptionSignal(peerConnection);
  };
  const emitLocalDescriptionSignal = async () => {
    const signal = shouldTrickleIce ? localDescriptionSignal(pc) : await waitForIceGathering(pc);
    if (!didEmitClose) emitSignal(signal);
    return signal;
  };
  if (initiator) {
    dataChannel = pc.createDataChannel("data");
    setupDataChannel(dataChannel);
  } else pc.ondatachannel = ({ channel }) => {
    dataChannel = channel;
    setupDataChannel(channel);
  };
  const createOffer = async (restartIce = false) => {
    if (pc.connectionState === "closed" || !restartIce && (makingOffer || pc.signalingState !== "stable")) {
      if (pc.connectionState === "closed") settleInitialOffer();
      return;
    }
    try {
      makingOffer = true;
      if (restartIce) {
        if (pc.remoteDescription && pc.signalingState !== "stable" && pc.signalingState !== "closed" && pc.localDescription?.type === offerType) await pc.setLocalDescription({ type: "rollback" });
        if (typeof pc.restartIce === "function") pc.restartIce();
      }
      await pc.setLocalDescription(restartIce ? await pc.createOffer({ iceRestart: true }) : void 0);
      return await emitLocalDescriptionSignal();
    } catch (err) {
      if (!restartIce) settleInitialOffer();
      handlers.error?.(toError(err, "failed to create local offer"));
    } finally {
      makingOffer = false;
    }
  };
  pc.onnegotiationneeded = async () => createOffer(false);
  pc.onicecandidate = ({ candidate }) => {
    if (!shouldTrickleIce || !candidate) return;
    const candidatePayload = normalizeCandidate(typeof candidate.toJSON === "function" ? candidate.toJSON() : {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment
    });
    emitSignal({
      type: candidateType,
      sdp: JSON.stringify(candidatePayload)
    });
  };
  const handleConnectionStateChange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "closed" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
      emitClose();
      return;
    }
    if (pc.connectionState === "connected" || pc.connectionState === "connecting" || pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed" || pc.iceConnectionState === "checking") {
      clearDisconnectedCloseTimer();
      return;
    }
    if (pc.connectionState === "disconnected" || pc.iceConnectionState === "disconnected") {
      if (!disconnectedCloseTimer) disconnectedCloseTimer = setTimeout(() => {
        disconnectedCloseTimer = null;
        if (pc.connectionState === "disconnected" || pc.iceConnectionState === "disconnected") emitClose();
      }, disconnectedCloseDelayMs);
      return;
    }
  };
  pc.onconnectionstatechange = handleConnectionStateChange;
  pc.addEventListener(iceConnectionStateEvent, handleConnectionStateChange);
  pc.ontrack = (e) => {
    const stream = e.streams[0];
    if (stream) {
      if (!handlers.track && !handlers.stream) {
        pendingTracks.push({
          track: e.track,
          stream
        });
        return;
      }
      handlers.track?.(e.track, stream);
      handlers.stream?.(stream);
    }
  };
  const offerPromise = initiator ? new Promise((res) => {
    resolveInitialOffer = res;
  }) : Promise.resolve();
  if (initiator) queueMicrotask(() => {
    if (!makingOffer && pc.signalingState === "stable" && !pc.localDescription && pc.connectionState !== "closed") pc.onnegotiationneeded?.(new Event("negotiationneeded"));
  });
  return {
    connection: pc,
    get channel() {
      return dataChannel;
    },
    get isDead() {
      return pc.connectionState === "closed";
    },
    getOffer: async (restartIce = false) => {
      if (!initiator) return;
      if (restartIce) return createOffer(true);
      if (resolveInitialOffer) return offerPromise;
      if (pc.localDescription?.type === offerType) return shouldTrickleIce ? localDescriptionSignal(pc) : waitForIceGathering(pc);
      return offerPromise;
    },
    async signal(sdp) {
      if (sdp.type === "candidate") {
        if (sdp.sdp.length > maxRemoteCandidateSdpLength) return;
        try {
          const candidate = JSON.parse(sdp.sdp);
          if (candidate && typeof candidate === "object") await addRemoteCandidate(normalizeCandidate(candidate));
        } catch (err) {
          handlers.error?.(toError(err, "failed to parse remote candidate"));
        }
        return;
      }
      if (dataChannel?.readyState === "open" && !sdp.sdp?.includes("a=rtpmap")) return;
      try {
        const rtcSdp = {
          ...sdp,
          sdp: normalizeSdp(sdp.sdp)
        };
        if (sdp.type === offerType) {
          const isCollision = makingOffer || pc.signalingState !== "stable" && !isSettingRemoteAnswerPending;
          if (isCollision && initiator) return;
          if (isCollision && pc.signalingState !== "stable") await all([pc.setLocalDescription({ type: "rollback" }), pc.setRemoteDescription(rtcSdp)]);
          else await pc.setRemoteDescription(rtcSdp);
          await flushPendingRemoteCandidates();
          await pc.setLocalDescription();
          return await emitLocalDescriptionSignal();
        }
        if (sdp.type === answerType) {
          isSettingRemoteAnswerPending = true;
          try {
            await pc.setRemoteDescription(rtcSdp);
            await flushPendingRemoteCandidates();
          } finally {
            isSettingRemoteAnswerPending = false;
          }
        }
      } catch (err) {
        handlers.error?.(toError(err, "failed to apply remote signal"));
      }
    },
    sendData: (data) => dataChannel?.send(data),
    destroy: () => {
      clearDisconnectedCloseTimer();
      settleInitialOffer();
      dataChannel?.close();
      pc.close();
      makingOffer = false;
      isSettingRemoteAnswerPending = false;
      emitClose();
    },
    setHandlers: (newHandlers) => {
      const { signal, ...restHandlers } = newHandlers;
      Object.assign(handlers, restHandlers);
      if (handlers.data && pendingData.length > 0) {
        pendingDataTimer = resetTimer(pendingDataTimer);
        pendingData.splice(0).forEach((data) => handlers.data?.(data));
      }
      if (signal) appendSignalHandler(signal);
      if ((handlers.track || handlers.stream) && pendingTracks.length > 0) pendingTracks.splice(0).forEach(({ track, stream }) => {
        handlers.track?.(track, stream);
        handlers.stream?.(stream);
      });
    },
    addStream: (stream) => stream.getTracks().forEach((track) => pc.addTrack(track, stream)),
    removeStream: (stream) => pc.getSenders().filter((sender) => sender.track && stream.getTracks().includes(sender.track)).forEach((sender) => pc.removeTrack(sender)),
    addTrack: (track, stream) => pc.addTrack(track, stream),
    removeTrack: (track) => {
      const sender = pc.getSenders().find((s) => s.track === track);
      if (sender) pc.removeTrack(sender);
    },
    replaceTrack: (oldTrack, newTrack) => {
      const sender = pc.getSenders().find((s) => s.track === oldTrack);
      if (sender) return sender.replaceTrack(newTrack);
    }
  };
};
var defaultIceServers = [...alloc(3, (_, i) => `stun:stun${i || ""}.l.google.com:19302`), "stun:stun.cloudflare.com:3478"].map((url) => ({ urls: url }));

// node_modules/@trystero-p2p/core/dist/action-receiver.mjs
var maxPendingTransfers = 1024;
var maxPendingPerPeer = 64;
var maxDecisions = 128;
var maxDecisionsPerPeer = 8;
var emptyBytes = /* @__PURE__ */ new Uint8Array();
var decideReceive = (decide, settle) => {
  let result;
  try {
    result = decide();
  } catch {
    return settle(false);
  }
  return typeof result === "boolean" ? settle(result) : Promise.resolve(result).then((value2) => settle(value2 === true), () => settle(false));
};
var decodePayload = (bytes, format, copy) => format === 2 ? copy ? bytes.slice() : bytes : format === 1 ? fromJson(decodeBytes(bytes)) : decodeBytes(bytes);
var progress = (action2, value2, peerId, metadata) => {
  try {
    action2.progress(value2, peerId, metadata);
  } catch (error) {
    console.error(`${libName} progress handler error:`, error);
  }
};
var deliverPayload = (action2, data, peerId, metadata) => {
  progress(action2, 1, peerId, metadata);
  try {
    action2.receiver?.(data, peerId, metadata);
  } catch (error) {
    console.error(`${libName} action handler error:`, error);
  }
};
var createActionReceiver = ({ fail, accept, refuse, maxReceiveBytes, chunkSize: chunkSize2 }) => {
  const actions = /* @__PURE__ */ new Map();
  const peers = /* @__PURE__ */ new Map();
  const waiting = /* @__PURE__ */ new Set();
  const decisions = /* @__PURE__ */ new Map();
  let pendingCount = 0;
  let decisionCount = 0;
  let reservedBytes = 0;
  let draining = false;
  let drainAgain = false;
  const current = (state) => state.phase !== "released";
  const payloadLimit = (action2) => Math.min(maxReceiveBytes, action2?.maxPayloadBytes ?? maxReceiveBytes);
  const notifyRejected = (message, reason, scope, bulkId) => {
    scope?.reject(reason);
    actions.get(message.type)?.reject?.(message.peerId, message.metadata, reason);
    if (bulkId !== void 0) refuse(message.peerId, bulkId, reason);
  };
  const rotateWaitingForPeer = (peerId) => {
    for (const queued of Array.from(waiting)) if (queued.peerId === peerId) {
      waiting.delete(queued);
      waiting.add(queued);
    }
  };
  const release = (state) => {
    if (!current(state)) return;
    state.phase = "released";
    state.removeAbortListener?.();
    state.timer = resetTimer(state.timer);
    const peer = peers.get(state.peerId);
    if (state.kind === "inline") {
      const queue = peer.inline.get(state.key);
      queue.splice(queue.indexOf(state), 1);
      if (!queue.length) peer.inline.delete(state.key);
      state.data = emptyBytes;
    } else {
      peer.bulk.delete(state.id);
      waiting.delete(state);
      state.data = null;
      if (state.transfer === "receiving") {
        reservedBytes -= state.size;
        if (peer.active === state) {
          peer.active = null;
          rotateWaitingForPeer(state.peerId);
        }
        drainAgain = true;
      }
    }
    peer.count--;
    pendingCount--;
    if (!peer.count) peers.delete(state.peerId);
    state.controller?.abort();
  };
  const reject = (state, reason) => {
    if (!current(state)) return;
    release(state);
    notifyRejected(state, reason, state.scope, state.kind === "bulk" ? state.id : void 0);
  };
  const admit = (state, action2) => {
    if (state.phase !== "pending") return state.phase === "ready";
    if (state.size > payloadLimit(action2)) {
      reject(state, "payload exceeds receiver size limit");
      return false;
    }
    const receive = state.scope ? state.scope.receive : action2.receive;
    if (!receive) {
      if (!action2.receiver) return false;
      state.phase = "ready";
      return true;
    }
    if (decisionCount >= maxDecisions || (decisions.get(state.peerId) ?? 0) >= maxDecisionsPerPeer) {
      reject(state, "too many pending receive decisions");
      return false;
    }
    state.phase = "deciding";
    const controller = new AbortController();
    state.controller = controller;
    decisionCount++;
    decisions.set(state.peerId, (decisions.get(state.peerId) ?? 0) + 1);
    const result = decideReceive(() => receive({
      byteLength: state.size,
      peerId: state.peerId,
      signal: controller.signal,
      ...state.metadata === void 0 ? {} : { metadata: state.metadata }
    }), (allow) => {
      decisionCount--;
      const count = decisions.get(state.peerId) - 1;
      if (count) decisions.set(state.peerId, count);
      else decisions.delete(state.peerId);
      if (!current(state)) return false;
      if (allow) state.phase = "ready";
      else reject(state, "payload rejected by receiver");
      return allow;
    });
    if (typeof result === "boolean") return result;
    result.then(() => drain());
    return false;
  };
  const complete = (state, action2, bytes) => {
    let payload;
    try {
      payload = decodePayload(bytes, state.format, state.kind === "inline");
    } catch {
      release(state);
      fail(state.peerId, "invalid action payload");
      return;
    }
    release(state);
    deliverPayload(action2, payload, state.peerId, state.metadata);
  };
  const tryInline = (state) => {
    const action2 = actions.get(state.type);
    if (current(state) && action2 && admit(state, action2) && action2.receiver) complete(state, action2, state.data);
  };
  const tryBulk = (state) => {
    const action2 = actions.get(state.type);
    if (!current(state) || !action2 || !admit(state, action2) || !action2.receiver) return;
    if (state.transfer === "receiving") {
      if (state.offset === state.size) complete(state, action2, state.data);
      return;
    }
    const peer = peers.get(state.peerId);
    if (!peer.active && reservedBytes + state.size <= maxReceiveBytes) {
      peer.active = state;
      state.transfer = "receiving";
      reservedBytes += state.size;
      state.lastSeen = Date.now();
      waiting.delete(state);
      accept(state.peerId, state.id);
    }
  };
  const drainInline = (peerId, key) => {
    const queue = peers.get(peerId)?.inline.get(key);
    while (queue?.[0]) {
      const state = queue[0];
      tryInline(state);
      if (current(state)) break;
    }
  };
  const drain = () => {
    if (draining) {
      drainAgain = true;
      return;
    }
    draining = true;
    try {
      do {
        drainAgain = false;
        for (const state of waiting) tryBulk(state);
        for (const [id, peer] of peers) {
          for (const state of peer.bulk.values()) if (state.offset === state.size) tryBulk(state);
          for (const key of peer.inline.keys()) drainInline(id, key);
        }
      } while (drainAgain);
    } finally {
      draining = false;
    }
  };
  const enqueue = (state) => {
    let peer = peers.get(state.peerId);
    if (pendingCount >= maxPendingTransfers || (peer?.count ?? 0) >= maxPendingPerPeer) {
      notifyRejected(state, "too many pending transfers", state.scope, state.kind === "bulk" ? state.id : void 0);
      return false;
    }
    if (!peer) {
      peer = {
        bulk: /* @__PURE__ */ new Map(),
        inline: /* @__PURE__ */ new Map(),
        active: null,
        count: 0
      };
      peers.set(state.peerId, peer);
    }
    peer.count++;
    pendingCount++;
    if (state.kind === "inline") {
      const queue = peer.inline.get(state.key) ?? [];
      queue.push(state);
      peer.inline.set(state.key, queue);
    } else {
      peer.bulk.set(state.id, state);
      waiting.add(state);
    }
    const expire = () => {
      const remaining = transferTimeoutMs - (Date.now() - state.lastSeen);
      if (remaining > 0) state.timer = setTimeout(expire, remaining);
      else {
        reject(state, "action transfer timed out");
        drain();
      }
    };
    state.timer = setTimeout(expire, transferTimeoutMs);
    if (state.scope) {
      const { signal } = state.scope;
      const cancel = () => {
        reject(state, "receive cancelled");
        drain();
      };
      signal.addEventListener("abort", cancel, { once: true });
      state.removeAbortListener = () => signal.removeEventListener("abort", cancel);
      if (signal.aborted) {
        cancel();
        return false;
      }
    }
    return true;
  };
  const resolveAdmission = (message, bulkId) => {
    const action2 = actions.get(message.type);
    const scope = action2?.receiveScope?.(message.peerId, message.metadata);
    if (scope === null || scope?.signal.aborted) {
      if (bulkId !== void 0) refuse(message.peerId, bulkId, "unexpected response");
      return null;
    }
    if (message.size > payloadLimit(action2)) {
      notifyRejected(message, "payload exceeds receiver size limit", scope, bulkId);
      return null;
    }
    return {
      action: action2,
      scope
    };
  };
  const admission = (message, scope) => ({
    ...message,
    ...scope ? { scope } : {},
    phase: "pending",
    controller: null,
    lastSeen: Date.now(),
    timer: null
  });
  return {
    register: (type, options = {}) => {
      const action2 = {
        ...options,
        receiver: null,
        receive: null,
        reject: null,
        progress: noOp
      };
      actions.set(type, action2);
      return {
        onMessage: (handler) => {
          action2.receiver = handler;
          drain();
        },
        onReceive: (handler) => {
          action2.receive = handler;
          drain();
        },
        onReject: (handler) => {
          action2.reject = handler;
        },
        onProgress: (handler) => {
          action2.progress = handler;
        }
      };
    },
    receiveInline: (message, data) => {
      const resolved = resolveAdmission(message);
      if (!resolved) return;
      const { action: action2, scope } = resolved;
      const key = scope ? `${message.type}\0${scope.key}` : message.type;
      if (action2?.receiver && !(scope ? scope.receive : action2.receive) && !peers.get(message.peerId)?.inline.has(key)) {
        let payload;
        try {
          payload = decodePayload(data, message.format, true);
        } catch {
          fail(message.peerId, "invalid action payload");
          return;
        }
        deliverPayload(action2, payload, message.peerId, message.metadata);
        return;
      }
      const state = {
        ...admission(message, scope),
        kind: "inline",
        key,
        data
      };
      if (enqueue(state)) drainInline(message.peerId, key);
    },
    receiveOffer: (message, id) => {
      if (peers.get(message.peerId)?.bulk.has(id)) {
        fail(message.peerId, "duplicate action offer");
        return;
      }
      const resolved = resolveAdmission(message, id);
      if (!resolved) return;
      const state = {
        ...admission(message, resolved.scope),
        kind: "bulk",
        id,
        transfer: "waiting",
        offset: 0,
        data: null
      };
      if (enqueue(state)) drain();
    },
    receiveChunk: (peerId, id, offset, data) => {
      const peer = peers.get(peerId);
      const state = peer?.bulk.get(id);
      if (!state) return;
      if (state.transfer !== "receiving" || offset !== state.offset || !data.length || data.length !== Math.min(chunkSize2, state.size - state.offset)) {
        fail(peerId, "invalid action chunk offset or length");
        return;
      }
      try {
        state.data ??= new Uint8Array(state.size);
      } catch {
        reject(state, "unable to allocate receive buffer");
        drain();
        return;
      }
      state.data.set(data, state.offset);
      state.offset += data.length;
      const now2 = Date.now();
      state.lastSeen = now2;
      for (const queued of waiting) if (queued.phase === "ready" && actions.get(queued.type)?.receiver) queued.lastSeen = now2;
      if (state.offset === state.size) {
        tryBulk(state);
        if (current(state) && peer?.active === state) {
          peer.active = null;
          rotateWaitingForPeer(peerId);
        }
        drain();
      } else progress(actions.get(state.type), state.offset / state.size, peerId, state.metadata);
    },
    cancel: (peerId, id) => {
      const state = peers.get(peerId)?.bulk.get(id);
      if (state) {
        release(state);
        state.scope?.reject("response cancelled by sender");
      }
      drain();
    },
    clearPeer: (peerId) => {
      const peer = peers.get(peerId);
      if (peer) {
        for (const state of peer.bulk.values()) release(state);
        for (const queue of peer.inline.values()) {
          const queuedMessages = [...queue];
          for (const state of queuedMessages) release(state);
        }
      }
      drain();
    }
  };
};

// node_modules/@trystero-p2p/core/dist/action-wire.mjs
var version = 2;
var inline = 0;
var offer = 1;
var chunk = 2;
var accepted = 3;
var rejected = 4;
var cancelled = 5;
var inlineHeaderSize = 36;
var offerHeaderSize = 48;
var controlHeaderSize = 6;
var chunkHeaderSize = 14;
var chunkSize = maxActionFrameBytes - chunkHeaderSize;
var defaultMaxReceiveBytes = 256 * 1024 ** 2;
var maxControlBufferedBytes = 1024 ** 2;
var buffLowEvent = "bufferedamountlow";
var channelCloseEvent = "close";
var channelErrorEvent = "error";
var backpressureWaitTimeoutMs = 1e4;
var makeActionError = (kind, message) => {
  const error = mkErr(message);
  error.kind = kind;
  error.name = kind === "aborted" ? "AbortError" : error.name;
  return error;
};
var throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeActionError("aborted", "operation aborted");
};
var packet = (kind, id, size = controlHeaderSize) => {
  const bytes = new Uint8Array(size);
  bytes[0] = version;
  bytes[1] = kind;
  new DataView(bytes.buffer).setUint32(2, id);
  return bytes;
};
var transferError = makeActionError;
var waitForBufferedAmountLow = (channel, signal, timeoutMs = backpressureWaitTimeoutMs) => {
  if (channel.readyState !== "open" || channel.bufferedAmount <= channel.bufferedAmountLowThreshold) return Promise.resolve(channel.readyState === "open");
  return new Promise((res) => {
    let settled = false;
    let timeout = null;
    const finish = (didDrain) => {
      if (settled) return;
      settled = true;
      channel.removeEventListener(buffLowEvent, onBufferLow);
      channel.removeEventListener(channelCloseEvent, onCloseOrError);
      channel.removeEventListener(channelErrorEvent, onCloseOrError);
      signal?.removeEventListener("abort", onCloseOrError);
      resetTimer(timeout);
      res(didDrain);
    };
    const onBufferLow = () => finish(true);
    const onCloseOrError = () => finish(false);
    channel.addEventListener(buffLowEvent, onBufferLow);
    channel.addEventListener(channelCloseEvent, onCloseOrError);
    channel.addEventListener(channelErrorEvent, onCloseOrError);
    signal?.addEventListener("abort", onCloseOrError, { once: true });
    timeout = setTimeout(() => finish(false), timeoutMs);
    if (channel.readyState !== "open" || signal?.aborted) {
      finish(false);
      return;
    }
    if (channel.bufferedAmount <= channel.bufferedAmountLowThreshold) finish(true);
  });
};
var createActionWireManager = ({ getPeer, getPeerIds, canReceiveFromPeer, onPeerError, throwIfAborted: checkAborted = throwIfAborted, maxReceiveBytes = defaultMaxReceiveBytes }) => {
  if (!Number.isSafeInteger(maxReceiveBytes) || maxReceiveBytes <= 0) throw mkErr("maxReceiveBytes must be a positive safe integer");
  const actions = /* @__PURE__ */ new Map();
  const outgoing = /* @__PURE__ */ new Map();
  const failedPeers = /* @__PURE__ */ new WeakSet();
  let nextId = 0;
  const receiver = createActionReceiver({
    fail: (peerId, reason) => failPeer(peerId, reason),
    accept: (peerId, id) => control(peerId, id, accepted),
    refuse: (peerId, id, reason) => control(peerId, id, rejected, reason),
    maxReceiveBytes,
    chunkSize
  });
  const clearPeer = (peerId) => {
    for (const state of outgoing.get(peerId)?.values() ?? []) state.fail(transferError("disconnected", "peer disconnected"));
    outgoing.delete(peerId);
    receiver.clearPeer(peerId);
  };
  const failPeer = (peerId, reason) => {
    const peer = getPeer(peerId, true);
    if (peer && !failedPeers.has(peer)) {
      failedPeers.add(peer);
      console.warn(`${libName}: ${reason}; disconnecting peer ${peerId}`);
      onPeerError(peerId, mkErr(reason));
    }
  };
  const control = (peerId, id, kind, reason = "") => {
    const peer = getPeer(peerId, true);
    if (!peer) return;
    const text = encodeBytes(reason).subarray(0, 200);
    const bytes = packet(kind, id, controlHeaderSize + text.length);
    bytes.set(text, controlHeaderSize);
    try {
      if ((peer.channel?.bufferedAmount ?? 0) > maxControlBufferedBytes) throw mkErr("control send buffer is full");
      peer.sendData(bytes);
    } catch {
      failPeer(peerId, "unable to send action control");
    }
  };
  const makeInternalAction = (type, options = {}) => {
    const normalizedOptions = {
      sendToPending: Boolean(options.sendToPending),
      receiveWhilePending: Boolean(options.receiveWhilePending),
      ...options.maxPayloadBytes === void 0 ? {} : { maxPayloadBytes: options.maxPayloadBytes },
      ...options.receiveScope ? { receiveScope: options.receiveScope } : {}
    };
    const cached = actions.get(type);
    if (cached) {
      if (cached.options.sendToPending !== normalizedOptions.sendToPending || cached.options.receiveWhilePending !== normalizedOptions.receiveWhilePending || cached.options.receiveScope !== normalizedOptions.receiveScope || cached.options.maxPayloadBytes !== normalizedOptions.maxPayloadBytes) throw mkErr(`action type "${type}" cannot be redefined`);
      return cached.action;
    }
    const typeBytes = encodeBytes(type);
    if (!type || type.includes("\0") || typeBytes.length > 32) throw mkErr("action type must contain 1\u201332 UTF-8 bytes and no null characters");
    const action2 = {
      options: normalizedOptions,
      action: {
        ...receiver.register(type, normalizedOptions),
        send: async (data, targets, metadata, onProgress, signal) => {
          checkAborted(signal);
          if (data === void 0) throw mkErr("action data cannot be undefined");
          const isBlob = data instanceof Blob;
          const binary = isBlob || data instanceof ArrayBuffer || ArrayBuffer.isView(data);
          const format = binary ? 2 : typeof data === "string" ? 0 : 1;
          let source = isBlob ? data : data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : encodeBytes(format === 0 ? data : toJson(data));
          const size = source instanceof Blob ? source.size : source.byteLength;
          const meta = metadata === void 0 ? /* @__PURE__ */ new Uint8Array() : encodeBytes(toJson(metadata));
          if (meta.length > 16336) throw mkErr("action metadata is too large");
          const small = inlineHeaderSize + meta.length + size <= maxActionFrameBytes;
          if (!small && binary && !(source instanceof Blob)) source = source.slice();
          const id = small ? 0 : nextId++ >>> 0;
          const headerSize = small ? inlineHeaderSize : offerHeaderSize;
          const start = new Uint8Array(headerSize + meta.length + (small ? size : 0));
          start[0] = version;
          start[1] = (small ? inline : offer) | format << 4;
          start.set(typeBytes, 2);
          const view = new DataView(start.buffer);
          view.setUint16(34, meta.length);
          if (!small) {
            view.setUint32(36, id);
            view.setFloat64(40, size);
          }
          start.set(meta, headerSize);
          if (small) start.set(source instanceof Blob ? new Uint8Array(await source.arrayBuffer()) : source, headerSize + meta.length);
          const ids = targets ? Array.isArray(targets) ? targets : [targets] : getPeerIds(normalizedOptions.sendToPending);
          await all([...new Set(ids)].map(async (peerId) => {
            const peer = getPeer(peerId, normalizedOptions.sendToPending);
            if (!peer) {
              console.warn(`${libName}: no peer with id ${peerId} found`);
              return;
            }
            let failure = null;
            const check3 = () => {
              if (failure) throw failure;
              checkAborted(signal);
              if (getPeer(peerId, normalizedOptions.sendToPending) !== peer || peer.channel?.readyState === "closed") throw transferError("disconnected", "peer disconnected");
            };
            const sendFrame = async (bytes) => {
              check3();
              const channel = peer.channel;
              if (channel && (channel.readyState !== "open" || channel.bufferedAmount > channel.bufferedAmountLowThreshold)) {
                if (!await waitForBufferedAmountLow(channel, signal)) {
                  checkAborted(signal);
                  throw transferError("disconnected", "data channel stopped draining");
                }
                check3();
              }
              try {
                peer.sendData(bytes);
              } catch {
                throw transferError("disconnected", "peer disconnected");
              }
            };
            if (small) {
              await sendFrame(start);
              onProgress?.(1, peerId, metadata);
              return;
            }
            let didSendOffer = false;
            let settledByReceiver = false;
            let lastSeen = Date.now();
            let accept;
            let rejectOffer;
            const permission = new Promise((resolve3, rejectPromise) => {
              accept = resolve3;
              rejectOffer = rejectPromise;
            });
            permission.catch(noOp);
            const transfers = outgoing.get(peerId) ?? /* @__PURE__ */ new Map();
            if (transfers.has(id)) throw mkErr("action transmission id is still in use");
            outgoing.set(peerId, transfers);
            let timer = null;
            const state = {
              accept: () => {
                if (!timer || failure) return false;
                timer = resetTimer(timer);
                accept();
                return true;
              },
              fail: (error, fromReceiver = false) => {
                if (fromReceiver) settledByReceiver = true;
                failure = error;
                rejectOffer(error);
              },
              touch: () => {
                if (timer) lastSeen = Date.now();
              }
            };
            transfers.set(id, state);
            const expire = () => {
              const remaining = transferTimeoutMs - (Date.now() - lastSeen);
              if (remaining > 0) timer = setTimeout(expire, remaining);
              else state.fail(transferError("timeout", "action offer timed out"));
            };
            timer = setTimeout(expire, transferTimeoutMs);
            const abort = () => {
              try {
                checkAborted(signal);
              } catch (error) {
                state.fail(error);
              }
            };
            signal?.addEventListener("abort", abort, { once: true });
            try {
              await sendFrame(start);
              didSendOffer = true;
              await permission;
              for (let offset = 0; offset < size; offset += chunkSize) {
                check3();
                const length = Math.min(chunkSize, size - offset);
                const bytes = packet(chunk, id, chunkHeaderSize + length);
                new DataView(bytes.buffer).setFloat64(controlHeaderSize, offset);
                bytes.set(source instanceof Blob ? new Uint8Array(await source.slice(offset, offset + length).arrayBuffer()) : source.subarray(offset, offset + length), chunkHeaderSize);
                await sendFrame(bytes);
                for (const pending of transfers.values()) pending.touch();
                onProgress?.((offset + length) / size, peerId, metadata);
              }
              check3();
            } catch (error) {
              if (didSendOffer && !settledByReceiver && getPeer(peerId, true) === peer && (!peer.channel || peer.channel.readyState === "open" && (peer.channel.bufferedAmount ?? 0) <= maxControlBufferedBytes)) control(peerId, id, cancelled);
              throw error;
            } finally {
              timer = resetTimer(timer);
              signal?.removeEventListener("abort", abort);
              transfers.delete(id);
              if (!transfers.size && outgoing.get(peerId) === transfers) outgoing.delete(peerId);
            }
          }));
        }
      }
    };
    actions.set(type, action2);
    return action2.action;
  };
  const handleData = (peerId, data) => {
    if (data.byteLength < 2 || data.byteLength > 16384) {
      failPeer(peerId, "invalid action frame");
      return;
    }
    const bytes = new Uint8Array(data);
    if (bytes[0] !== version) {
      failPeer(peerId, "incompatible action protocol version");
      return;
    }
    const kind = bytes[1] & 15;
    const format = bytes[1] >>> 4;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (kind > cancelled || format > 2 || kind > offer && format !== 0) {
      failPeer(peerId, "invalid action frame");
      return;
    }
    if (kind >= chunk) {
      if (bytes.length < controlHeaderSize || (kind === accepted || kind === cancelled) && bytes.length !== controlHeaderSize || kind === rejected && bytes.length > 206) {
        failPeer(peerId, "invalid action control");
        return;
      }
      const id2 = view.getUint32(2);
      if (kind === accepted) {
        const transfers = outgoing.get(peerId);
        if (transfers?.get(id2)?.accept()) for (const pending of transfers.values()) pending.touch();
        return;
      }
      if (kind === rejected) {
        outgoing.get(peerId)?.get(id2)?.fail(transferError("rejected", decodeBytes(bytes.subarray(controlHeaderSize))), true);
        return;
      }
      if (kind === cancelled) receiver.cancel(peerId, id2);
      else receiver.receiveChunk(peerId, id2, bytes.length >= chunkHeaderSize ? view.getFloat64(controlHeaderSize) : NaN, bytes.subarray(chunkHeaderSize));
      return;
    }
    const headerSize = kind === inline ? inlineHeaderSize : offerHeaderSize;
    if (bytes.length < headerSize) {
      failPeer(peerId, "invalid action header");
      return;
    }
    const type = decodeBytes(bytes.subarray(2, 34)).replaceAll("\0", "");
    const action2 = actions.get(type);
    if (!canReceiveFromPeer(peerId, Boolean(action2?.options.receiveWhilePending))) return;
    const metaLength = view.getUint16(34);
    const payloadIndex = headerSize + metaLength;
    const size = kind === inline ? bytes.length - payloadIndex : view.getFloat64(40);
    const id = kind === offer ? view.getUint32(36) : 0;
    if (!type || payloadIndex > bytes.length || !Number.isSafeInteger(size) || size < 0 || kind === offer && (size === 0 || payloadIndex !== bytes.length)) {
      failPeer(peerId, "invalid action proposal");
      return;
    }
    let metadata;
    try {
      if (metaLength) metadata = fromJson(decodeBytes(bytes.subarray(headerSize, payloadIndex)));
    } catch {
      failPeer(peerId, "invalid action metadata");
      return;
    }
    const message = {
      peerId,
      type,
      format,
      size,
      ...metadata === void 0 ? {} : { metadata }
    };
    if (kind === inline) receiver.receiveInline(message, bytes.subarray(payloadIndex));
    else receiver.receiveOffer(message, id);
  };
  return {
    makeInternalAction,
    handleData,
    clearPeer
  };
};

// node_modules/@trystero-p2p/core/dist/actions.mjs
var getEnvelopeRecord = (metadata) => metadata && typeof metadata === "object" && !Array.isArray(metadata) && typeof metadata.r === "string" ? metadata : null;
var getRequestMetadata = (metadata) => {
  const record = getEnvelopeRecord(metadata);
  return record ? {
    r: record.r,
    ...Object.hasOwn(record, "m") ? { m: record.m } : {}
  } : null;
};
var getResponseMetadata = (metadata) => {
  const record = getEnvelopeRecord(metadata);
  return record ? {
    r: record.r,
    ...typeof record.e === "string" ? { e: record.e } : {}
  } : null;
};
var withMetadata = (context, metadata) => metadata === void 0 ? context : {
  ...context,
  metadata
};
var createActionManager = ({ getPeer, getPeerIds, canReceiveFromPeer, onPeerError, maxReceiveBytes }) => {
  const publicActions = /* @__PURE__ */ Object.create(null);
  const pendingRequestWaiters = {};
  const activeRequestControllers = /* @__PURE__ */ new Map();
  const wire = createActionWireManager({
    getPeer,
    getPeerIds,
    canReceiveFromPeer,
    onPeerError,
    ...maxReceiveBytes === void 0 ? {} : { maxReceiveBytes }
  });
  const makeInternalAction = wire.makeInternalAction;
  const handleData = wire.handleData;
  const clearPendingRequestWaiter = (requestId) => {
    const waiter = pendingRequestWaiters[requestId];
    if (!waiter) return;
    resetTimer(waiter.timer);
    if (waiter.signal && waiter.abortHandler) waiter.signal.removeEventListener("abort", waiter.abortHandler);
    delete pendingRequestWaiters[requestId];
    waiter.controller.abort();
  };
  const rejectPendingRequestsForPeer = (id, error) => {
    entries(pendingRequestWaiters).forEach(([requestId, waiter]) => {
      if (waiter.peerId !== id) return;
      clearPendingRequestWaiter(requestId);
      waiter.reject(error);
    });
  };
  const clearPeer = (id, error) => {
    wire.clearPeer(id);
    const controllers = activeRequestControllers.get(id);
    if (controllers) {
      activeRequestControllers.delete(id);
      controllers.forEach((controller) => controller.abort());
    }
    rejectPendingRequestsForPeer(id, makeActionError("disconnected", toErrorMessage(error, "peer disconnected")));
  };
  const responseAction = makeInternalAction("@_response", { receiveScope: (peerId, metadata) => {
    const parsed = getResponseMetadata(metadata);
    const waiter = parsed && pendingRequestWaiters[parsed.r];
    if (!parsed || !waiter || waiter.peerId !== peerId) return null;
    const receive = parsed.e === void 0 ? waiter.getReceive() : null;
    return {
      key: parsed.r,
      signal: waiter.controller.signal,
      receive: receive ? (context) => receive({
        byteLength: context.byteLength,
        peerId: context.peerId,
        kind: "response",
        signal: context.signal
      }) : null,
      reject: (reason) => {
        if (pendingRequestWaiters[parsed.r] === waiter) {
          clearPendingRequestWaiter(parsed.r);
          waiter.reject(makeActionError("rejected", reason));
        }
      }
    };
  } });
  responseAction.onProgress((progress2, id, metadata) => {
    const parsed = getResponseMetadata(metadata);
    const waiter = parsed && pendingRequestWaiters[parsed.r];
    if (waiter && waiter.peerId === id && parsed?.e === void 0) waiter.getReceiveProgress()?.(progress2, { peerId: id });
  });
  responseAction.onMessage((payload, id, metadata) => {
    const parsed = getResponseMetadata(metadata);
    if (!parsed) return;
    const waiter = pendingRequestWaiters[parsed.r];
    if (!waiter || waiter.peerId !== id) return;
    clearPendingRequestWaiter(parsed.r);
    if (parsed.e !== void 0) {
      waiter.reject(makeActionError("rejected", parsed.e));
      return;
    }
    waiter.resolve(payload);
  });
  const makeActionImpl = (type, config) => {
    if (config && "onRequest" in config && config.kind !== "request") throw mkErr('request actions must use kind: "request"');
    const kind = config?.kind ?? "message";
    const rawAction = makeInternalAction(type);
    const existingState = publicActions[type];
    if (existingState) {
      if (existingState.kind !== kind) throw mkErr(`action type "${type}" cannot be redefined`);
      return existingState.action;
    }
    const state = {
      kind,
      action: null,
      onReceive: config?.onReceive ?? null,
      onReceiveProgress: config?.onReceiveProgress ?? null
    };
    const toProgressHandler = (handler, metadata) => handler ? (progress2, peerId) => handler(progress2, withMetadata({ peerId }, metadata)) : void 0;
    const dispatchReceiveProgress = (progress2, peerId, metadata) => {
      const requestMetadata = state.kind === "request" ? getRequestMetadata(metadata) : null;
      state.onReceiveProgress?.(progress2, withMetadata({ peerId }, requestMetadata ? requestMetadata.m : metadata));
    };
    const setReceive = (handler) => {
      state.onReceive = handler;
      rawAction.onReceive(handler ? (context) => {
        const requestMetadata = kind === "request" ? getRequestMetadata(context.metadata) : null;
        return handler(withMetadata({
          byteLength: context.byteLength,
          peerId: context.peerId,
          signal: context.signal,
          kind
        }, requestMetadata ? requestMetadata.m : context.metadata));
      } : null);
    };
    setReceive(state.onReceive);
    rawAction.onProgress(dispatchReceiveProgress);
    if (kind === "message") {
      let onMessage = config?.onMessage ?? null;
      const receiveMessage = (payload, peerId, metadata) => {
        const handler = onMessage;
        Promise.resolve().then(() => handler(payload, withMetadata({ peerId }, metadata))).catch((err) => console.error(`${libName} action handler error:`, err));
      };
      const action3 = {
        send: async (data, options = {}) => {
          await rawAction.send(data, options.target, options.metadata, toProgressHandler(options.onProgress, options.metadata), options.signal);
        },
        get onMessage() {
          return onMessage;
        },
        set onMessage(handler) {
          onMessage = handler;
          rawAction.onMessage(handler ? receiveMessage : null);
        },
        get onReceive() {
          return state.onReceive;
        },
        set onReceive(handler) {
          setReceive(handler);
        },
        get onReceiveProgress() {
          return state.onReceiveProgress;
        },
        set onReceiveProgress(handler) {
          state.onReceiveProgress = handler;
        }
      };
      state.action = action3;
      publicActions[type] = state;
      rawAction.onMessage(onMessage ? receiveMessage : null);
      return action3;
    }
    rawAction.onReject((peerId, metadata, reason) => {
      const parsed = getRequestMetadata(metadata);
      if (parsed) responseAction.send(null, peerId, {
        r: parsed.r,
        e: reason
      }).catch(noOp);
    });
    let onRequest = config?.onRequest ?? null;
    const receiveRequest = (payload, peerId, metadata) => {
      const parsed = getRequestMetadata(metadata);
      if (!parsed) return;
      const handler = onRequest;
      const controller = new AbortController();
      let peerControllers = activeRequestControllers.get(peerId);
      if (!peerControllers) {
        peerControllers = /* @__PURE__ */ new Set();
        activeRequestControllers.set(peerId, peerControllers);
      }
      peerControllers.add(controller);
      Promise.resolve().then(async () => {
        const response = await handler(payload, {
          ...withMetadata({ peerId }, parsed.m),
          signal: controller.signal
        });
        if (response === void 0) throw mkErr("request handler returned undefined");
        return response;
      }).then((response) => responseAction.send(response, peerId, { r: parsed.r }), (error) => responseAction.send(null, peerId, {
        r: parsed.r,
        e: toErrorMessage(error, "request failed").slice(0, 512)
      })).catch(noOp).finally(() => {
        const controllers = activeRequestControllers.get(peerId);
        controllers?.delete(controller);
        if (controllers && !controllers.size) activeRequestControllers.delete(peerId);
        controller.abort();
      });
    };
    const requestOne = async (data, options) => {
      const { target, metadata, onProgress, signal, timeoutMs } = options;
      throwIfAborted(signal);
      if (!getPeer(target, false)) throw makeActionError("disconnected", `no active peer with id ${target}`);
      const requestId = genId(20);
      const controller = new AbortController();
      const responsePromise = new Promise((resolve3, reject) => {
        const waiter = {
          controller,
          getReceive: () => state.onReceive,
          getReceiveProgress: () => state.onReceiveProgress,
          peerId: target,
          resolve: resolve3,
          reject,
          timer: null,
          ...signal === void 0 ? {} : { signal }
        };
        const rejectAsAborted = () => {
          clearPendingRequestWaiter(requestId);
          reject(makeActionError("aborted", "operation aborted"));
        };
        if (signal) {
          waiter.abortHandler = rejectAsAborted;
          signal.addEventListener("abort", rejectAsAborted, { once: true });
        }
        pendingRequestWaiters[requestId] = waiter;
        if (timeoutMs !== void 0) waiter.timer = setTimeout(() => {
          clearPendingRequestWaiter(requestId);
          waiter.reject(makeActionError("timeout", "request timed out"));
        }, timeoutMs);
      });
      try {
        const sending = rawAction.send(data, target, metadata === void 0 ? { r: requestId } : {
          r: requestId,
          m: metadata
        }, toProgressHandler(onProgress, metadata), controller.signal);
        return await Promise.race([responsePromise, sending.then(() => responsePromise)]);
      } finally {
        clearPendingRequestWaiter(requestId);
      }
    };
    const action2 = {
      request: requestOne,
      requestMany: async (data, options) => {
        const { targets, onResult, ...requestOptions } = options;
        throwIfAborted(requestOptions.signal);
        return await all(targets.map(async (target) => {
          try {
            const result = {
              peerId: target,
              status: "fulfilled",
              value: await requestOne(data, {
                ...requestOptions,
                target
              })
            };
            onResult?.(result);
            return result;
          } catch (err) {
            const error = toError(err, "request failed");
            if (error.kind === "aborted" || !error.kind) throw error;
            const result = error.kind === "timeout" ? {
              peerId: target,
              status: "timeout"
            } : error.kind === "disconnected" ? {
              peerId: target,
              status: "disconnected"
            } : {
              peerId: target,
              status: "rejected",
              error
            };
            onResult?.(result);
            return result;
          }
        }));
      },
      get onRequest() {
        return onRequest;
      },
      set onRequest(handler) {
        onRequest = handler;
        rawAction.onMessage(handler ? receiveRequest : null);
      },
      get onReceive() {
        return state.onReceive;
      },
      set onReceive(handler) {
        setReceive(handler);
      },
      get onReceiveProgress() {
        return state.onReceiveProgress;
      },
      set onReceiveProgress(handler) {
        state.onReceiveProgress = handler;
      }
    };
    state.action = action2;
    publicActions[type] = state;
    rawAction.onMessage(onRequest ? receiveRequest : null);
    return action2;
  };
  return {
    makeAction: makeActionImpl,
    makeInternalAction,
    handleData,
    clearPeer
  };
};

// node_modules/@trystero-p2p/core/dist/media.mjs
var toPendingMediaMeta = (value2) => {
  if (value2 && typeof value2 === "object" && !Array.isArray(value2) && typeof value2.k === "string") return {
    key: value2.k,
    ...typeof value2.s === "string" ? { streamId: value2.s } : {},
    ...typeof value2.t === "string" ? { trackId: value2.t } : {},
    ...Object.hasOwn(value2, "m") ? { metadata: value2.m } : {}
  };
  return null;
};
var makeKeyGetter = (map) => (item) => {
  let key = map.get(item);
  if (!key) {
    key = genId(20);
    map.set(item, key);
  }
  return key;
};
var createMediaIdentityCache = () => {
  const localStreamKeys = /* @__PURE__ */ new WeakMap();
  const localTrackKeys = /* @__PURE__ */ new WeakMap();
  const remoteStreamsByKey = /* @__PURE__ */ new Map();
  const remoteStreamsById = /* @__PURE__ */ new Map();
  const remoteTracksByKey = /* @__PURE__ */ new Map();
  const remoteTracksById = /* @__PURE__ */ new Map();
  const remoteStreamKeys = /* @__PURE__ */ new WeakMap();
  const remoteTrackKeys = /* @__PURE__ */ new WeakMap();
  return {
    getStreamKey: makeKeyGetter(localStreamKeys),
    getTrackKey: makeKeyGetter(localTrackKeys),
    rememberRemoteStream: (key, stream, streamId) => {
      const previous = remoteStreamKeys.get(stream);
      if (previous !== void 0 && remoteStreamsByKey.get(previous) === stream) remoteStreamsByKey.delete(previous);
      remoteStreamKeys.set(stream, key);
      remoteStreamsByKey.set(key, stream);
      if (streamId) remoteStreamsById.set(streamId, stream);
      stream.getTracks?.().forEach((track) => {
        if (typeof track.id === "string") remoteTracksById.set(track.id, {
          track,
          stream
        });
      });
    },
    getRemoteStream: (key, streamId) => remoteStreamsByKey.get(key) ?? (streamId ? remoteStreamsById.get(streamId) : void 0),
    rememberRemoteTrack: (key, track, stream, trackId, streamId) => {
      const ref = {
        track,
        stream
      };
      const previous = remoteTrackKeys.get(track);
      if (previous !== void 0 && remoteTracksByKey.get(previous)?.track === track) remoteTracksByKey.delete(previous);
      remoteTrackKeys.set(track, key);
      remoteTracksByKey.set(key, ref);
      if (trackId) remoteTracksById.set(trackId, ref);
      if (streamId) remoteStreamsById.set(streamId, stream);
    },
    getRemoteTrack: (key, trackId) => remoteTracksByKey.get(key) ?? (trackId ? remoteTracksById.get(trackId) : void 0),
    hasRemoteMedia: () => remoteStreamsByKey.size > 0 || remoteTracksByKey.size > 0,
    clearRemote: () => {
      remoteStreamsByKey.clear();
      remoteStreamsById.clear();
      remoteTracksByKey.clear();
      remoteTracksById.clear();
    }
  };
};
var createMediaManager = ({ iterate, isActive, getSharedMediaPeer, onPeerError }) => {
  const pendingStreamMetas = {};
  const pendingTrackMetas = {};
  const peerMediaCaches = {};
  const localMedia = createMediaIdentityCache();
  const getPeerMedia = (id) => getSharedMediaPeer(id)?.__trysteroMedia ?? (peerMediaCaches[id] ??= createMediaIdentityCache());
  const queuePendingMeta = (metas, id, parsed, kind) => {
    const queue = metas[id] ??= [];
    if (queue.length >= 64) {
      console.warn(`${libName}: too many pending ${kind} metadata messages`);
      onPeerError(id, mkErr("too many pending media metadata messages"));
      return;
    }
    queue.push(parsed);
  };
  const takePendingMeta = (queue, idValue, getMetaId) => {
    if (!queue?.length) return;
    const index = idValue ? queue.findIndex((meta) => {
      const metaId = getMetaId(meta);
      return !metaId || metaId === idValue;
    }) : 0;
    return index >= 0 ? queue.splice(index, 1)[0] : void 0;
  };
  const emitStream = (id, key, stream, metadata) => {
    if (!isActive(id)) return;
    getPeerMedia(id).rememberRemoteStream(key, stream, typeof stream.id === "string" ? stream.id : void 0);
    manager.onPeerStream?.(stream, id, metadata);
  };
  const emitTrack = (id, key, track, stream, metadata) => {
    if (!isActive(id)) return;
    getPeerMedia(id).rememberRemoteTrack(key, track, stream, typeof track.id === "string" ? track.id : void 0, typeof stream.id === "string" ? stream.id : void 0);
    manager.onPeerTrack?.(track, stream, id, metadata);
  };
  const applyMediaOp = (targets, key, metadata, sendMeta, op, mediaIds = {}) => {
    const payload = {
      k: key,
      ...mediaIds,
      ...metadata === void 0 ? {} : { m: metadata }
    };
    return iterate(targets, async (id, peer) => {
      await sendMeta(payload, id);
      await op(peer);
    });
  };
  const manager = {
    addStream: (stream, options, sendMeta) => applyMediaOp(options.target, localMedia.getStreamKey(stream), options.metadata, sendMeta, (peer) => peer.addStream(stream), { s: stream.id }),
    removeStream: (stream, target) => {
      iterate(target, (_, peer) => peer.removeStream(stream));
    },
    addTrack: (track, stream, options, sendMeta) => applyMediaOp(options.target, localMedia.getTrackKey(track), options.metadata, sendMeta, (peer) => peer.addTrack(track, stream), {
      s: stream.id,
      t: track.id
    }),
    removeTrack: (track, target) => {
      iterate(target, (_, peer) => peer.removeTrack(track));
    },
    replaceTrack: (oldTrack, newTrack, options, sendMeta) => applyMediaOp(options.target, localMedia.getTrackKey(newTrack), options.metadata, sendMeta, (peer) => peer.replaceTrack(oldTrack, newTrack), { t: oldTrack.id }),
    receiveStreamMeta: (meta, id) => {
      if (!isActive(id)) return;
      const parsed = toPendingMediaMeta(meta);
      if (!parsed) return;
      const cached = getPeerMedia(id).getRemoteStream(parsed.key, parsed.streamId);
      if (cached?.getTracks().length) {
        emitStream(id, parsed.key, cached, parsed.metadata);
        return;
      }
      queuePendingMeta(pendingStreamMetas, id, parsed, "stream");
    },
    receiveTrackMeta: (meta, id) => {
      if (!isActive(id)) return;
      const parsed = toPendingMediaMeta(meta);
      if (!parsed) return;
      const cached = getPeerMedia(id).getRemoteTrack(parsed.key, parsed.trackId);
      if (cached && cached.track.readyState !== "ended" && (!cached.stream.getTracks || cached.stream.getTracks().includes(cached.track))) {
        emitTrack(id, parsed.key, cached.track, cached.stream, parsed.metadata);
        return;
      }
      queuePendingMeta(pendingTrackMetas, id, parsed, "track");
    },
    receiveRemoteStream: (id, stream) => {
      if (!isActive(id)) return;
      const next = takePendingMeta(pendingStreamMetas[id], typeof stream.id === "string" ? stream.id : void 0, (meta) => meta.streamId);
      if (!next) return;
      emitStream(id, next.key, stream, next.metadata);
    },
    receiveRemoteTrack: (id, track, stream) => {
      if (!isActive(id)) return;
      const queue = pendingTrackMetas[id];
      const trackId = typeof track.id === "string" ? track.id : void 0;
      const streamId = typeof stream.id === "string" ? stream.id : void 0;
      const byTrackIdx = queue && trackId ? queue.findIndex((meta) => meta.trackId === trackId) : -1;
      const next = byTrackIdx >= 0 ? queue?.splice(byTrackIdx, 1)[0] : takePendingMeta(queue, streamId, (meta) => meta.streamId);
      if (!next) return;
      emitTrack(id, next.key, track, stream, next.metadata);
    },
    clearPeer: (id) => {
      delete pendingStreamMetas[id];
      delete pendingTrackMetas[id];
      delete peerMediaCaches[id];
    },
    onPeerStream: null,
    onPeerTrack: null
  };
  return manager;
};

// node_modules/@trystero-p2p/core/dist/room.mjs
var unloadEvent = "beforeunload";
var defaultHandshakeTimeoutMs = 1e4;
var internalNs = (ns) => "@_" + ns;
var beforeUnloadRoomCleanups = /* @__PURE__ */ new Set();
var cleanupActiveRoomsOnBeforeUnload = () => beforeUnloadRoomCleanups.forEach((cleanup) => cleanup());
var registerBeforeUnloadCleanup = (cleanup) => {
  beforeUnloadRoomCleanups.add(cleanup);
  if (beforeUnloadRoomCleanups.size === 1) addEventListener(unloadEvent, cleanupActiveRoomsOnBeforeUnload);
  return () => {
    beforeUnloadRoomCleanups.delete(cleanup);
    if (!beforeUnloadRoomCleanups.size) removeEventListener(unloadEvent, cleanupActiveRoomsOnBeforeUnload);
  };
};
var room_default = (onPeer, onPeerLeave, onSelfLeave, { onPeerHandshake, onHandshakeError, handshakeTimeoutMs = defaultHandshakeTimeoutMs, maxReceiveBytes, isPassive = false, onBeforeLeave } = {}) => {
  const peerMap = {};
  const activePeerMap = {};
  const pendingPongs = {};
  const listeners = {
    onPeerJoin: null,
    onPeerLeave: null
  };
  let unregisterBeforeUnloadCleanup = noOp;
  let leavePromise = null;
  const iterate = (targets, f) => (targets ? Array.isArray(targets) ? targets : [targets] : keys(activePeerMap)).flatMap((id) => {
    const peer = activePeerMap[id];
    if (!peer) {
      console.warn(`${libName}: no peer with id ${id} found`);
      return [];
    }
    return [Promise.resolve(f(id, peer))];
  });
  const kickPeer = (id, peer, reason) => {
    const current = peerMap[id];
    if (!current || peer && current !== peer) return;
    leaveAction.send("", id).catch(noOp);
    exitPeer(id, current, reason);
  };
  const onPeerError = (id, error) => kickPeer(id, void 0, error);
  const mediaManager = createMediaManager({
    onPeerError,
    iterate: (targets, f) => iterate(targets, (id, peer) => f(id, peer)),
    isActive: (id) => Boolean(activePeerMap[id]),
    getSharedMediaPeer: (id) => peerMap[id] ?? null
  });
  const actionManager = createActionManager({
    onPeerError,
    ...maxReceiveBytes === void 0 ? {} : { maxReceiveBytes },
    getPeer: (id, includePending) => (includePending ? peerMap : activePeerMap)[id],
    getPeerIds: (includePending) => keys(includePending ? peerMap : activePeerMap),
    canReceiveFromPeer: (id, receiveWhilePending) => handshakeManager.canReceiveFromPeer(id, receiveWhilePending)
  });
  const makeActionInternal = actionManager.makeInternalAction;
  const handleData = actionManager.handleData;
  const makeAction = actionManager.makeAction;
  const clearPeerState = (id, reason = mkErr("peer disconnected")) => {
    const err = toError(reason, "peer disconnected");
    handshakeManager.clearPeer(id, err);
    delete peerMap[id];
    delete activePeerMap[id];
    actionManager.clearPeer(id, err);
    pendingPongs[id]?.splice(0).forEach((waiter) => waiter.reject(err));
    delete pendingPongs[id];
    mediaManager.clearPeer(id);
  };
  const exitPeer = (id, peer, reason) => {
    const current = peerMap[id];
    if (!current) return;
    if (peer && current !== peer) return;
    const wasActive = Boolean(activePeerMap[id]);
    clearPeerState(id, reason);
    current.destroy();
    if (wasActive) listeners.onPeerLeave?.(id);
    onPeerLeave(id);
  };
  const leave = () => leavePromise ??= (async () => {
    onBeforeLeave?.();
    const controller = new AbortController();
    leaveAction.send("", void 0, void 0, void 0, controller.signal).catch(noOp);
    await new Promise((res) => setTimeout(res, 99));
    controller.abort();
    try {
      entries(peerMap).forEach(([id, peer]) => {
        peer.destroy();
        clearPeerState(id, mkErr("room left"));
      });
    } finally {
      try {
        unregisterBeforeUnloadCleanup();
      } finally {
        onSelfLeave();
      }
    }
  })();
  const pingAction = makeActionInternal(internalNs("ping"));
  const pongAction = makeActionInternal(internalNs("pong"));
  const signalAction = makeActionInternal(internalNs("signal"));
  const streamMetaAction = makeActionInternal(internalNs("stream"), { maxPayloadBytes: 65536 });
  const trackMetaAction = makeActionInternal(internalNs("track"), { maxPayloadBytes: 65536 });
  const leaveAction = makeActionInternal(internalNs("leave"), {
    sendToPending: true,
    receiveWhilePending: true
  });
  const handshakeDataAction = makeActionInternal(internalNs("hsdata"), {
    sendToPending: true,
    receiveWhilePending: true,
    maxPayloadBytes: 65536
  });
  const handshakeReadyAction = makeActionInternal(internalNs("hsready"), {
    sendToPending: true,
    receiveWhilePending: true
  });
  const handshakeManager = createHandshakeManager({
    ...onPeerHandshake === void 0 ? {} : { onPeerHandshake },
    ...onHandshakeError === void 0 ? {} : { onHandshakeError },
    handshakeTimeoutMs,
    sendHandshakeData: handshakeDataAction.send,
    sendHandshakeReady: handshakeReadyAction.send,
    onActivate: (id, peer) => {
      activePeerMap[id] = peer;
      peer.setHandlers({ signal: (sdp) => {
        if (activePeerMap[id] === peer) signalAction.send(sdp, id).catch(noOp);
      } });
      listeners.onPeerJoin?.(id);
    },
    onFailure: (id, peer, reason) => kickPeer(id, peer, reason)
  });
  pingAction.onMessage((_, id) => {
    pongAction.send("", id).catch(noOp);
  });
  pongAction.onMessage((_, id) => {
    const queue = pendingPongs[id];
    queue?.shift()?.resolve();
    if (queue && !queue.length) delete pendingPongs[id];
  });
  signalAction.onMessage((sdp, id) => {
    activePeerMap[id]?.signal(sdp);
  });
  streamMetaAction.onMessage((meta, id) => mediaManager.receiveStreamMeta(meta, id));
  trackMetaAction.onMessage((meta, id) => mediaManager.receiveTrackMeta(meta, id));
  leaveAction.onMessage((_, id) => exitPeer(id, void 0, mkErr("peer left room")));
  handshakeDataAction.onMessage((data, id, metadata) => handshakeManager.receiveHandshakeData(data, id, metadata));
  handshakeReadyAction.onMessage((_, id) => handshakeManager.receiveHandshakeReady(id));
  onPeer((peer, id) => {
    const existingPeer = peerMap[id];
    if (existingPeer) {
      if (existingPeer === peer) return;
      existingPeer.destroy();
      clearPeerState(id, mkErr("peer replaced"));
    }
    peerMap[id] = peer;
    handshakeManager.addPeer(id, peer);
    peer.setHandlers({
      data: (d) => {
        if (peerMap[id] === peer) handleData(id, d);
      },
      stream: (stream) => mediaManager.receiveRemoteStream(id, stream),
      track: (track, stream) => mediaManager.receiveRemoteTrack(id, track, stream),
      close: () => exitPeer(id, peer, mkErr("peer disconnected")),
      error: (err) => {
        console.error(`${libName} peer error:`, err);
        exitPeer(id, peer, err);
      }
    });
    handshakeManager.start(id, peer);
  });
  if (isBrowser) unregisterBeforeUnloadCleanup = registerBeforeUnloadCleanup(() => leave().catch(noOp));
  return {
    makeAction,
    leave,
    ping: async (id) => {
      if (!activePeerMap[id]) throw mkErr(`no active peer with id ${id}`);
      const start = Date.now();
      await new Promise((resolve3, reject) => {
        const queue = pendingPongs[id] ??= [];
        const clearFromQueue = () => {
          const currentQueue = pendingPongs[id];
          if (!currentQueue) return;
          const i = currentQueue.indexOf(waiter);
          if (i > -1) currentQueue.splice(i, 1);
          if (!currentQueue.length) delete pendingPongs[id];
        };
        const waiter = {
          resolve: () => {
            clearFromQueue();
            resolve3();
          },
          reject: (reason) => {
            clearFromQueue();
            reject(reason);
          }
        };
        queue.push(waiter);
        pingAction.send("", id).catch((err) => waiter.reject(toError(err, "peer disconnected")));
      });
      return Date.now() - start;
    },
    isPassive: () => isPassive,
    getPeers: () => fromEntries(entries(activePeerMap).map(([id, peer]) => [id, peer.connection])),
    addStream: (stream, options = {}) => mediaManager.addStream(stream, options, streamMetaAction.send),
    removeStream: (stream, options = {}) => {
      mediaManager.removeStream(stream, options.target);
    },
    addTrack: (track, stream, options = {}) => mediaManager.addTrack(track, stream, options, trackMetaAction.send),
    removeTrack: (track, options = {}) => {
      mediaManager.removeTrack(track, options.target);
    },
    replaceTrack: (oldTrack, newTrack, options = {}) => mediaManager.replaceTrack(oldTrack, newTrack, options, trackMetaAction.send),
    get onPeerJoin() {
      return listeners.onPeerJoin;
    },
    set onPeerJoin(handler) {
      listeners.onPeerJoin = handler;
      if (handler) keys(activePeerMap).forEach((peerId) => handler(peerId));
    },
    get onPeerLeave() {
      return listeners.onPeerLeave;
    },
    set onPeerLeave(handler) {
      listeners.onPeerLeave = handler;
    },
    get onPeerStream() {
      return mediaManager.onPeerStream;
    },
    set onPeerStream(handler) {
      mediaManager.onPeerStream = handler;
    },
    get onPeerTrack() {
      return mediaManager.onPeerTrack;
    },
    set onPeerTrack(handler) {
      mediaManager.onPeerTrack = handler;
    }
  };
};

// node_modules/@trystero-p2p/core/dist/shared-peer.mjs
var roomFrameVersion = 1;
var roomPresenceFrameVersion = 2;
var wrapRoomFrame = (roomToken, data) => {
  const tokenBytes = encodeBytes(roomToken);
  const frame2 = new Uint8Array(3 + tokenBytes.byteLength + data.byteLength);
  frame2[0] = roomFrameVersion;
  frame2[1] = tokenBytes.byteLength >>> 8 & 255;
  frame2[2] = tokenBytes.byteLength & 255;
  frame2.set(tokenBytes, 3);
  frame2.set(data, 3 + tokenBytes.byteLength);
  return frame2;
};
var wrapRoomPresenceFrame = (roomToken, isPresent) => {
  const tokenBytes = encodeBytes(roomToken);
  const frame2 = new Uint8Array(4 + tokenBytes.byteLength);
  frame2[0] = roomPresenceFrameVersion;
  frame2[1] = Number(isPresent);
  frame2[2] = tokenBytes.byteLength >>> 8 & 255;
  frame2[3] = tokenBytes.byteLength & 255;
  frame2.set(tokenBytes, 4);
  return frame2;
};
var decodeRoomTokenHeader = (buffer, offset) => {
  if (buffer.byteLength < offset + 2) return null;
  const tokenSize = (buffer[offset] ?? 0) << 8 | (buffer[offset + 1] ?? 0);
  const headerSize = offset + 2 + tokenSize;
  if (tokenSize <= 0 || tokenSize > 128 || buffer.byteLength < headerSize) return null;
  return {
    roomToken: decodeBytes(buffer.subarray(offset + 2, headerSize)),
    headerSize
  };
};
var unwrapFrame = (data) => {
  const buffer = new Uint8Array(data);
  if (buffer.byteLength < 3 || buffer.byteLength > 16515) return null;
  if (buffer[0] === roomFrameVersion) {
    const header2 = decodeRoomTokenHeader(buffer, 1);
    return header2 ? {
      type: "room",
      roomToken: header2.roomToken,
      payload: buffer.subarray(header2.headerSize).slice().buffer
    } : null;
  }
  if (buffer[0] === roomPresenceFrameVersion) {
    const header2 = decodeRoomTokenHeader(buffer, 2);
    return header2 ? {
      type: "presence",
      roomToken: header2.roomToken,
      isPresent: buffer[1] === 1
    } : null;
  }
  return null;
};
var isPeerUnderlyingStale = (peer) => {
  const { connection, channel } = peer;
  return peer.isDead || connection.connectionState === "closed" || connection.connectionState === "failed" || connection.iceConnectionState === "closed" || connection.iceConnectionState === "failed" || channel?.readyState === "closing" || channel?.readyState === "closed";
};
var getConnectedPeerHealth = (peer) => {
  if (isPeerUnderlyingStale(peer)) return "stale";
  const { channel } = peer;
  if (!channel || channel.readyState !== "open") return "transient";
  return "live";
};
var SharedPeerManager = class {
  rooms = /* @__PURE__ */ new Map();
  unclaimedDataTimers = /* @__PURE__ */ new WeakMap();
  pendingDataTimers = /* @__PURE__ */ new WeakMap();
  byApp = {};
  registerRoom(appId, roomId, tokenPromise, options) {
    const rooms = this.rooms.get(appId) ?? /* @__PURE__ */ new Map();
    if (rooms.has(roomId)) throw mkErr("room membership already registered");
    const registration = {
      token: null,
      tokenPromise,
      ...options
    };
    rooms.set(roomId, registration);
    this.rooms.set(appId, rooms);
    const current = () => this.rooms.get(appId)?.get(roomId) === registration;
    const advertise = (present) => {
      if (!registration.token) return;
      for (const shared of values(this.byApp[appId] ?? {})) try {
        this.sendRoomPresence(shared, registration.token, present);
      } catch {
      }
    };
    tokenPromise.then((token) => {
      if (!current()) return;
      registration.token = token;
      for (const shared of values(this.byApp[appId] ?? {})) {
        if (shared.remoteRoomTokens.has(token)) this.attachRoom(appId, roomId, registration, shared);
        this.discardUnboundData(shared);
      }
      if (current() && registration.active) advertise(true);
    });
    return {
      connect: (peerId, peer, idleMs) => {
        if (!current()) {
          peer.destroy();
          return;
        }
        const existing = this.reusable(appId, peerId);
        if (existing && existing.peer !== peer) peer.destroy();
        const shared = existing ?? this.register(appId, peerId, peer, idleMs);
        this.attachRoom(appId, roomId, registration, shared);
        if (!existing) {
          for (const room of rooms.values()) if (room.active && room.token) this.sendRoomPresence(shared, room.token, true);
        }
      },
      reuse: (peerId) => {
        if (!current()) return false;
        const shared = this.reusable(appId, peerId);
        if (!shared) return false;
        this.attachRoom(appId, roomId, registration, shared);
        return true;
      },
      setActive: (active) => {
        if (!current() || registration.active === active) return;
        registration.active = active;
        advertise(active);
      },
      leave: () => {
        if (!current()) return;
        rooms.delete(roomId);
        if (!rooms.size) this.rooms.delete(appId);
        advertise(false);
        for (const shared of values(this.byApp[appId] ?? {})) {
          const binding = shared.bindings[roomId];
          binding?.handlers.close?.();
          binding?.detach();
          this.discardUnboundData(shared);
        }
      }
    };
  }
  owns(appId, peerId, peer) {
    return this.byApp[appId]?.[peerId]?.peer === peer;
  }
  reusable(appId, peerId) {
    const shared = this.byApp[appId]?.[peerId];
    if (shared && isPeerUnderlyingStale(shared.peer)) {
      this.clear(appId, peerId, { destroyPeer: true });
      return;
    }
    return shared;
  }
  attachRoom(appId, roomId, registration, shared) {
    if (this.rooms.get(appId)?.get(roomId) !== registration || shared.isClosing || this.get(appId, shared.peerId) !== shared) return;
    const { proxy, isNew } = this.bind(roomId, registration.tokenPromise, shared, { onDetach: () => registration.onDetach(shared.peerId, shared.peer) });
    if (isNew) registration.onPeer(proxy, shared.peerId, shared.peer);
  }
  get(appId, peerId) {
    return this.byApp[appId]?.[peerId];
  }
  sendRoomPresence(shared, roomToken, isPresent) {
    if (shared.isClosing || isPeerUnderlyingStale(shared.peer)) return;
    shared.peer.sendData(wrapRoomPresenceFrame(roomToken, isPresent));
  }
  clear(appId, peerId, { destroyPeer }) {
    const map = this.byApp[appId];
    const shared = map?.[peerId];
    if (!shared || shared.isClosing) return;
    shared.idleTimer = resetTimer(shared.idleTimer);
    this.clearDataTimers(shared);
    shared.isClosing = true;
    if (destroyPeer && !shared.peer.isDead) shared.peer.destroy();
    const bindings = values(shared.bindings);
    shared.bindings = {};
    shared.bindingsByToken = {};
    shared.controlRoomId = null;
    delete map[peerId];
    bindings.forEach((binding) => {
      binding.handlers.close?.();
      binding.pendingData.length = 0;
      binding.pendingSendData.length = 0;
      binding.pendingTracks.length = 0;
    });
    shared.media.clearRemote();
    shared.pendingDataByToken.clear();
    shared.remoteRoomTokens.clear();
    if (keys(map).length === 0) delete this.byApp[appId];
  }
  register(appId, peerId, peer, idleMs) {
    const existing = this.byApp[appId]?.[peerId];
    if (existing) {
      existing.idleTimer = resetTimer(existing.idleTimer);
      if (existing.peer === peer) return existing;
      this.clear(appId, peerId, { destroyPeer: true });
    }
    const shared = {
      appId,
      peerId,
      peer,
      bindings: {},
      bindingsByToken: {},
      pendingDataByToken: /* @__PURE__ */ new Map(),
      remoteRoomTokens: /* @__PURE__ */ new Set(),
      idleTimer: null,
      controlRoomId: null,
      streamOwners: /* @__PURE__ */ new Map(),
      trackOwners: /* @__PURE__ */ new Map(),
      media: createMediaIdentityCache(),
      idleMs,
      isClosing: false
    };
    (this.byApp[appId] ??= {})[peerId] = shared;
    const clearCurrent = () => {
      if (this.owns(appId, peerId, peer)) this.clear(appId, peerId, { destroyPeer: true });
    };
    peer.setHandlers({
      data: (data) => this.dispatchData(shared, data),
      signal: (signal) => this.dispatchSignal(shared, signal),
      close: clearCurrent,
      error: (err) => {
        console.error(`${libName} peer error:`, err);
        clearCurrent();
      },
      track: (track, stream) => this.dispatchTrack(shared, track, stream)
    });
    return shared;
  }
  bind(roomId, roomTokenPromise, shared, { onDetach }) {
    const existingBinding = shared.bindings[roomId];
    if (existingBinding) {
      shared.idleTimer = resetTimer(shared.idleTimer);
      return {
        proxy: existingBinding.proxy,
        isNew: false
      };
    }
    const binding = {
      roomId,
      roomToken: null,
      roomTokenPromise,
      handlers: {},
      pendingData: [],
      pendingSendData: [],
      pendingTracks: [],
      detach: noOp,
      proxy: {}
    };
    const detachBinding = () => {
      if (shared.bindings[roomId] !== binding) return;
      const shouldDestroy = keys(shared.bindings).length === 1 && (shared.streamOwners.size > 0 || shared.trackOwners.size > 0 || shared.media.hasRemoteMedia());
      if (!shouldDestroy) this.pruneRoomOwnership(shared, roomId);
      delete shared.bindings[roomId];
      if (binding.roomToken && shared.bindingsByToken[binding.roomToken] === binding) delete shared.bindingsByToken[binding.roomToken];
      if (shared.controlRoomId === roomId) shared.controlRoomId = keys(shared.bindings)[0] ?? null;
      this.discardUnboundData(shared);
      onDetach();
      if (shouldDestroy) this.clear(shared.appId, shared.peerId, { destroyPeer: true });
      else this.scheduleIdleTimer(shared);
    };
    const proxy = {
      get connection() {
        return shared.peer.connection;
      },
      get channel() {
        return shared.peer.channel;
      },
      get isDead() {
        return shared.peer.isDead;
      },
      getOffer: (restartIce) => shared.peer.getOffer(restartIce),
      signal: (sdp) => shared.peer.signal(sdp),
      sendData: (data) => {
        if (!binding.roomToken) {
          binding.pendingSendData.push(data);
          return;
        }
        shared.peer.sendData(wrapRoomFrame(binding.roomToken, data));
      },
      destroy: () => detachBinding(),
      setHandlers: (newHandlers) => {
        Object.assign(binding.handlers, newHandlers);
        this.flushBindingQueues(shared, binding);
      },
      addStream: (stream) => {
        const owners = shared.streamOwners.get(stream) ?? /* @__PURE__ */ new Set();
        const shouldAttach = owners.size === 0;
        owners.add(roomId);
        shared.streamOwners.set(stream, owners);
        if (shouldAttach) shared.peer.addStream(stream);
      },
      removeStream: (stream) => this.releaseStreamOwner(shared, stream, roomId),
      addTrack: (track, stream) => {
        const entry = shared.trackOwners.get(track) ?? {
          stream,
          rooms: /* @__PURE__ */ new Set()
        };
        const shouldAttach = entry.rooms.size === 0;
        entry.stream = stream;
        entry.rooms.add(roomId);
        shared.trackOwners.set(track, entry);
        if (shouldAttach) return shared.peer.addTrack(track, stream);
        return shared.peer.connection.getSenders().find((s) => s.track === track) ?? shared.peer.addTrack(track, stream);
      },
      removeTrack: (track) => this.releaseTrackOwner(shared, track, roomId),
      replaceTrack: async (oldTrack, newTrack) => {
        const oldEntry = shared.trackOwners.get(oldTrack);
        await shared.peer.replaceTrack(oldTrack, newTrack);
        if (oldEntry && shared.trackOwners.get(oldTrack) === oldEntry) {
          shared.trackOwners.delete(oldTrack);
          const nextEntry = shared.trackOwners.get(newTrack) ?? {
            stream: oldEntry.stream,
            rooms: /* @__PURE__ */ new Set()
          };
          oldEntry.rooms.forEach((room) => nextEntry.rooms.add(room));
          shared.trackOwners.set(newTrack, nextEntry);
        }
      },
      __trysteroMedia: shared.media
    };
    binding.proxy = proxy;
    binding.detach = detachBinding;
    shared.bindings[roomId] = binding;
    shared.controlRoomId ??= roomId;
    shared.idleTimer = resetTimer(shared.idleTimer);
    roomTokenPromise.then((roomToken) => {
      if (shared.isClosing || shared.bindings[roomId] !== binding) return;
      binding.roomToken = roomToken;
      shared.bindingsByToken[roomToken] = binding;
      const pendingData = shared.pendingDataByToken.get(roomToken);
      if (pendingData?.length) {
        binding.pendingData.push(...pendingData);
        shared.pendingDataByToken.delete(roomToken);
      }
      const pendingSendData = binding.pendingSendData.splice(0);
      if (!isPeerUnderlyingStale(shared.peer)) pendingSendData.forEach((payload) => {
        try {
          shared.peer.sendData(wrapRoomFrame(roomToken, payload));
        } catch {
        }
      });
      this.flushBindingQueues(shared, binding);
      this.discardUnboundData(shared);
    });
    return {
      proxy,
      isNew: true
    };
  }
  releaseStreamOwner(shared, stream, roomIdToRemove) {
    const rooms = shared.streamOwners.get(stream);
    if (!rooms) return;
    rooms.delete(roomIdToRemove);
    if (rooms.size === 0) {
      shared.streamOwners.delete(stream);
      shared.peer.removeStream(stream);
    }
  }
  releaseTrackOwner(shared, track, roomIdToRemove) {
    const entry = shared.trackOwners.get(track);
    if (!entry) return;
    entry.rooms.delete(roomIdToRemove);
    if (entry.rooms.size === 0) {
      shared.trackOwners.delete(track);
      shared.peer.removeTrack(track);
    }
  }
  pruneRoomOwnership(shared, roomIdToRemove) {
    shared.streamOwners.forEach((_, stream) => this.releaseStreamOwner(shared, stream, roomIdToRemove));
    shared.trackOwners.forEach((_, track) => this.releaseTrackOwner(shared, track, roomIdToRemove));
  }
  scheduleIdleTimer(shared) {
    if (shared.isClosing || keys(shared.bindings).length > 0) return;
    shared.idleTimer = resetTimer(shared.idleTimer);
    shared.idleTimer = setTimeout(() => {
      const current = this.byApp[shared.appId]?.[shared.peerId];
      if (!current || keys(current.bindings).length > 0) return;
      this.clear(shared.appId, shared.peerId, { destroyPeer: true });
    }, shared.idleMs);
  }
  getSignalBinding(shared) {
    if (shared.controlRoomId) {
      const selected = shared.bindings[shared.controlRoomId];
      if (selected?.handlers.signal) return selected;
    }
    const fallback = values(shared.bindings).find((binding) => Boolean(binding.handlers.signal));
    if (!fallback) return null;
    shared.controlRoomId = fallback.roomId;
    return fallback;
  }
  flushBindingQueues(shared, binding) {
    const { handlers } = binding;
    if (handlers.data && binding.pendingData.length > 0) {
      const queued = binding.pendingData.splice(0);
      this.syncDataTimers(shared);
      queued.forEach((payload) => handlers.data?.(payload));
    } else this.syncDataTimers(shared);
    if ((handlers.track || handlers.stream) && binding.pendingTracks.length) binding.pendingTracks.splice(0).forEach(({ track, stream }) => {
      handlers.track?.(track, stream);
      handlers.stream?.(stream);
    });
  }
  unclaimedBufferedFrameCount(shared) {
    let count = 0;
    for (const queue of shared.pendingDataByToken.values()) count += queue.length;
    return count;
  }
  boundBufferedFrameCount(shared) {
    let count = 0;
    for (const binding of values(shared.bindings)) count += binding.pendingData.length;
    return count;
  }
  bufferedFrameCount(shared) {
    return this.unclaimedBufferedFrameCount(shared) + this.boundBufferedFrameCount(shared);
  }
  clearDataTimers(shared) {
    resetTimer(this.unclaimedDataTimers.get(shared));
    this.unclaimedDataTimers.delete(shared);
    resetTimer(this.pendingDataTimers.get(shared));
    this.pendingDataTimers.delete(shared);
  }
  syncDataTimers(shared) {
    if (shared.isClosing) {
      this.clearDataTimers(shared);
      return;
    }
    if (this.unclaimedBufferedFrameCount(shared) === 0) {
      resetTimer(this.unclaimedDataTimers.get(shared));
      this.unclaimedDataTimers.delete(shared);
    } else if (!this.unclaimedDataTimers.has(shared)) this.unclaimedDataTimers.set(shared, setTimeout(() => {
      this.unclaimedDataTimers.delete(shared);
      shared.pendingDataByToken.clear();
    }, pendingDataTimeoutMs));
    if (this.boundBufferedFrameCount(shared) === 0) {
      resetTimer(this.pendingDataTimers.get(shared));
      this.pendingDataTimers.delete(shared);
    } else if (!this.pendingDataTimers.has(shared)) this.pendingDataTimers.set(shared, setTimeout(() => {
      this.pendingDataTimers.delete(shared);
      if (this.boundBufferedFrameCount(shared) > 0) this.failData(shared, "room data handler timed out");
    }, pendingDataTimeoutMs));
  }
  canBindRoomToken(shared, token) {
    return values(shared.bindings).some((binding) => !binding.roomToken) || [...this.rooms.get(shared.appId)?.values() ?? []].some((room) => !room.token || room.token === token);
  }
  discardUnboundData(shared) {
    for (const token of shared.pendingDataByToken.keys()) if (!this.canBindRoomToken(shared, token)) shared.pendingDataByToken.delete(token);
    this.syncDataTimers(shared);
  }
  failData(shared, reason) {
    console.warn(`${libName}: ${reason}; disconnecting peer ${shared.peerId}`);
    this.clear(shared.appId, shared.peerId, { destroyPeer: true });
  }
  dispatchData(shared, data) {
    if (shared.isClosing) return;
    const decoded = unwrapFrame(data);
    if (!decoded) {
      this.failData(shared, "invalid or incompatible room frame");
      return;
    }
    if (decoded.type === "presence") {
      if (decoded.isPresent) {
        if (!shared.remoteRoomTokens.has(decoded.roomToken) && shared.remoteRoomTokens.size >= 64) {
          this.failData(shared, "too many advertised rooms");
          return;
        }
        shared.remoteRoomTokens.add(decoded.roomToken);
        for (const [roomId, registration] of this.rooms.get(shared.appId) ?? []) if (registration.token === decoded.roomToken) this.attachRoom(shared.appId, roomId, registration, shared);
      } else {
        shared.remoteRoomTokens.delete(decoded.roomToken);
        shared.pendingDataByToken.delete(decoded.roomToken);
        const binding2 = shared.bindingsByToken[decoded.roomToken];
        binding2?.handlers.close?.();
        binding2?.detach();
        this.syncDataTimers(shared);
      }
      return;
    }
    const binding = shared.bindingsByToken[decoded.roomToken];
    if (!binding) {
      if (!this.canBindRoomToken(shared, decoded.roomToken) || this.bufferedFrameCount(shared) >= 64) return;
      const pending = shared.pendingDataByToken.get(decoded.roomToken) ?? [];
      pending.push(decoded.payload);
      shared.pendingDataByToken.set(decoded.roomToken, pending);
      this.syncDataTimers(shared);
      return;
    }
    if (binding.handlers.data) binding.handlers.data(decoded.payload);
    else {
      if (this.bufferedFrameCount(shared) >= 64) {
        this.failData(shared, "too much data waiting for a room handler");
        return;
      }
      binding.pendingData.push(decoded.payload);
      this.syncDataTimers(shared);
    }
  }
  dispatchSignal(shared, signal) {
    const binding = this.getSignalBinding(shared);
    if (binding) binding.handlers.signal?.(signal);
    else if (signal.type === "offer") this.clear(shared.appId, shared.peerId, { destroyPeer: true });
  }
  dispatchTrack(shared, track, stream) {
    values(shared.bindings).forEach((binding) => {
      if (binding.handlers.track || binding.handlers.stream) {
        binding.handlers.track?.(track, stream);
        binding.handlers.stream?.(stream);
        return;
      }
      binding.pendingTracks.push({
        track,
        stream
      });
    });
  }
};

// node_modules/@trystero-p2p/core/dist/signal-handler.mjs
var offerPostAnswerTtlMs = 23333;
var offerTtl = 57333;
var offerIdSize = 12;
var disconnectedPeerGraceMs = 7533;
var answeringTtlMs = 23333;
var offerRelayPlaceholder = "offer-placeholder";
var signalKeys = [
  "offer",
  "answer",
  "candidate"
];
var toPayload = (msg) => {
  if (typeof msg === "string") try {
    const parsed = fromJson(msg);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
  return msg && typeof msg === "object" && !Array.isArray(msg) ? msg : null;
};
var getString = (payload, key) => typeof payload[key] === "string" && payload[key] ? payload[key] : void 0;
var isPeerHandle = (value2) => Boolean(value2 && typeof value2 === "object" && typeof value2.signal === "function" && typeof value2.destroy === "function" && typeof value2.setHandlers === "function");
var hasInvalidSignalField = (payload, isStringMessage = false) => signalKeys.some((key) => key in payload && (typeof payload[key] !== "string" || payload[key] === "")) || "peer" in payload && (isStringMessage || payload["peer"] !== void 0 && !isPeerHandle(payload["peer"]));
var shouldActivatePassiveRoom = (msg) => {
  const payload = toPayload(msg);
  if (!payload || hasInvalidSignalField(payload, typeof msg === "string")) return false;
  const peerId = getString(payload, "peerId");
  return Boolean(peerId && peerId !== selfId && payload["passive"] !== true && !getString(payload, "answer") && !getString(payload, "candidate"));
};
var publishCipheredSignalingMessage = (ctx, signal, peerTopic, signalPeer, buildPayload, stillValid) => {
  ctx.toCipher(signal).then((encryptedSignal) => {
    if (ctx.isLeaving() || !stillValid()) return;
    signalPeer(peerTopic, toJson(buildPayload(encryptedSignal.sdp)));
  });
};
var makeState = () => ({
  offerPeer: null,
  offerId: null,
  offerSdp: null,
  offerInitPromise: null,
  offerAnswered: false,
  offerRelays: [],
  offerSignalRelays: [],
  offerSignalBacklog: [],
  offerRelayTimers: [],
  offerExpiryTimer: null,
  connectedPeer: null,
  connectedPeerUnhealthySinceMs: null,
  answeringExpiryTimer: null,
  answeringPeer: null,
  answerSent: false,
  answerReplay: null,
  connectionErrorReported: false
});
var hasTurnServer = (config) => {
  return [...config.turnConfig ?? [], ...config.rtcConfig?.iceServers ?? []].some(({ urls }) => {
    return (Array.isArray(urls) ? urls : [urls]).some((url) => /^turns?:/i.test(url));
  });
};
var getSdpExchangeConnectionError = (peerId, config) => `could not connect to peer ${peerId} after exchanging SDP; ${hasTurnServer(config) ? "check that your TURN server URLs and credentials are reachable by both peers" : "configure TURN servers with turnConfig or rtcConfig.iceServers"}`;
var reportSdpExchangeConnectionFailure = (ctx, state, peerId) => {
  if (ctx.isLeaving() || state.connectedPeer || state.connectionErrorReported) return;
  state.connectionErrorReported = true;
  ctx.onJoinError?.({
    error: getSdpExchangeConnectionError(peerId, ctx.config),
    appId: ctx.appId,
    peerId,
    roomId: ctx.roomId
  });
};
var getState = (peerStates, peerId) => peerStates[peerId] ??= makeState();
var counterAnnounceTimestamps = /* @__PURE__ */ new WeakMap();
var resetAnsweringState = (state) => {
  counterAnnounceTimestamps.delete(state);
  state.answeringExpiryTimer = resetTimer(state.answeringExpiryTimer);
  state.answeringPeer = null;
  state.answerSent = false;
  state.answerReplay = null;
};
var clearAnswering = (state, peer) => {
  if (state.answeringPeer === peer) {
    resetAnsweringState(state);
    if (state.connectedPeer !== peer && !peer.isDead) peer.destroy();
  }
};
var markPeerConnected = (state, physical) => {
  if (state.answeringPeer && state.answeringPeer !== physical && !state.answeringPeer.isDead) state.answeringPeer.destroy();
  resetAnsweringState(state);
  state.connectedPeer = physical;
  state.connectedPeerUnhealthySinceMs = null;
};
var detachConnectedPeer = (state, physical) => {
  if (state?.connectedPeer === physical) {
    state.connectedPeer = null;
    state.connectedPeerUnhealthySinceMs = null;
  }
};
var clearConnectedPeer = (state, peerId, _reason) => {
  if (!state.connectedPeer) return;
  if (!state.connectedPeer.isDead) state.connectedPeer.destroy();
  state.connectedPeer = null;
  state.connectedPeerUnhealthySinceMs = null;
};
var clearOfferRelay = (state, relayId) => {
  state.offerRelayTimers[relayId] = resetTimer(state.offerRelayTimers[relayId]);
  if (state.offerRelays[relayId]) state.offerRelays[relayId] = void 0;
};
var clearOfferRelayIfPlaceholder = (state, relayId) => {
  if (state?.offerRelays[relayId] === offerRelayPlaceholder) clearOfferRelay(state, relayId);
};
var resetOfferState = (state) => {
  counterAnnounceTimestamps.delete(state);
  state.offerExpiryTimer = resetTimer(state.offerExpiryTimer);
  state.offerInitPromise = null;
  state.offerRelays.forEach((_, relayId) => clearOfferRelay(state, relayId));
  state.offerRelays = [];
  state.offerSignalRelays = [];
  state.offerRelayTimers = [];
  state.offerSignalBacklog = [];
  if (state.offerPeer && state.offerPeer !== state.connectedPeer) {
    if (!state.offerPeer.isDead) state.offerPeer.destroy();
  }
  state.offerPeer = null;
  state.offerId = null;
  state.offerSdp = null;
  state.offerAnswered = false;
  state.connectionErrorReported = false;
};
var scheduleAnsweringExpiry = (ctx, state, peerId, peer) => {
  resetTimer(state.answeringExpiryTimer);
  state.answeringExpiryTimer = setTimeout(() => {
    const current = ctx.peerStates[peerId];
    if (!current || current.connectedPeer || current.answeringPeer !== peer) return;
    if (current.answerSent) reportSdpExchangeConnectionFailure(ctx, current, peerId);
    clearAnswering(current, peer);
    ctx.checkDeactivate();
  }, answeringTtlMs);
};
var scheduleOfferExpiry = (ctx, state, peerId, ttlMs = offerTtl) => {
  resetTimer(state.offerExpiryTimer);
  const offerId = state.offerId;
  state.offerExpiryTimer = setTimeout(() => {
    const current = ctx.peerStates[peerId];
    if (!current || current.connectedPeer || current.offerId !== offerId) return;
    if (current.offerAnswered) reportSdpExchangeConnectionFailure(ctx, current, peerId);
    resetOfferState(current);
    ctx.checkDeactivate();
  }, ttlMs);
};
var bindOfferPeerHandlers = (ctx, state, peerId, peer, onSignal) => {
  const onOfferPeerClosedOrError = () => {
    if (state.offerPeer === peer && !state.connectedPeer) {
      if (state.offerAnswered) reportSdpExchangeConnectionFailure(ctx, state, peerId);
      resetOfferState(state);
    }
    ctx.disconnectPeer(peer, peerId);
    ctx.checkDeactivate();
  };
  peer.setHandlers({
    connect: () => ctx.connectPeer(peer, peerId),
    ...onSignal ? { signal: onSignal } : {},
    close: onOfferPeerClosedOrError,
    error: onOfferPeerClosedOrError
  });
};
var ensureOffer = (ctx, state, peerId) => {
  if (state.offerPeer && state.offerId && state.offerSdp) return Promise.resolve({
    peer: state.offerPeer,
    offer: state.offerSdp,
    offerId: state.offerId
  });
  if (state.offerInitPromise) return state.offerInitPromise;
  const allocateOffer = async () => {
    let firstOffer;
    try {
      firstOffer = (await ctx.offerManager.checkout(1, false, ctx.encryptOffer))[0];
    } catch (error) {
      if (ctx.isLeaving() || state.offerInitPromise !== pending) return null;
      throw error;
    }
    if (!firstOffer) throw mkErr("failed to allocate offer peer");
    const { peer, offer: offer2 } = firstOffer;
    if (ctx.isLeaving() || state.offerInitPromise !== pending) {
      peer.destroy();
      return null;
    }
    state.offerPeer = peer;
    state.offerId = genId(offerIdSize);
    state.offerSdp = offer2;
    state.offerAnswered = false;
    state.connectionErrorReported = false;
    state.offerSignalBacklog = [];
    bindOfferPeerHandlers(ctx, state, peerId, peer, (signal) => {
      if (state.offerPeer !== peer) return;
      state.offerSignalBacklog.push(signal);
      state.offerSignalRelays.forEach((sendSignal) => sendSignal?.(signal));
    });
    scheduleOfferExpiry(ctx, state, peerId);
    return {
      peer,
      offer: offer2,
      offerId: state.offerId
    };
  };
  const pending = allocateOffer().finally(() => {
    if (state.offerInitPromise === pending) state.offerInitPromise = null;
  });
  return state.offerInitPromise = pending;
};
var handleAnnouncement = async (ctx, relayId, peerId, signalPeer, retryAttempt = 0) => {
  const state = ctx.peerStates[peerId];
  if (!state || state.connectedPeer || state.answeringPeer || state.offerAnswered) {
    clearOfferRelayIfPlaceholder(state, relayId);
    return;
  }
  if (state.offerRelays[relayId] !== offerRelayPlaceholder) return;
  const [peerTopic, offerInfo] = await all([sha1(topicPath(ctx.rootTopicPlaintext, peerId)), ensureOffer(ctx, state, peerId)]);
  if (!offerInfo) {
    clearOfferRelayIfPlaceholder(state, relayId);
    return;
  }
  if (ctx.isLeaving()) {
    resetOfferState(state);
    return;
  }
  if (state.connectedPeer || state.answeringPeer || state.offerAnswered || state.offerRelays[relayId] !== offerRelayPlaceholder) {
    clearOfferRelayIfPlaceholder(state, relayId);
    return;
  }
  state.offerRelayTimers[relayId] = resetTimer(state.offerRelayTimers[relayId]);
  state.offerRelays[relayId] = true;
  state.offerRelayTimers[relayId] = setTimeout(() => {
    if (retryAttempt >= 2 || ctx.isLeaving() || state.connectedPeer || state.answeringPeer || state.offerAnswered || state.offerPeer !== offerInfo.peer || state.offerId !== offerInfo.offerId) {
      prunePendingOffer(ctx, peerId, relayId);
      return;
    }
    state.offerRelays[relayId] = offerRelayPlaceholder;
    handleAnnouncement(ctx, relayId, peerId, signalPeer, retryAttempt + 1);
  }, retryAttempt === 0 && ctx.announceIntervals[relayId] === void 0 ? 2e3 : (ctx.announceIntervals[relayId] ?? ctx.announceIntervalMs) * 0.9);
  let didSendOffer = false;
  state.offerSignalRelays[relayId] = (signal) => {
    if (!didSendOffer) return;
    if (ctx.isLeaving() || state.connectedPeer || state.offerPeer !== offerInfo.peer || state.offerId !== offerInfo.offerId || signal.type !== "candidate") return;
    publishCipheredSignalingMessage(ctx, signal, peerTopic, signalPeer, (sdp) => ({
      peerId: selfId,
      offerId: offerInfo.offerId,
      candidate: sdp,
      ...ctx.isPassive ? { passive: true } : {}
    }), () => !state.connectedPeer && state.offerPeer === offerInfo.peer && state.offerId === offerInfo.offerId);
  };
  signalPeer(peerTopic, toJson({
    peerId: selfId,
    offerId: offerInfo.offerId,
    offer: offerInfo.offer,
    ...ctx.isPassive ? { passive: true } : {}
  }));
  didSendOffer = true;
  state.offerSignalBacklog.forEach((signal) => state.offerSignalRelays[relayId]?.(signal));
};
var handleOffer = async (ctx, relayId, peerId, offer2, offerId, signalPeer) => {
  const state = getState(ctx.peerStates, peerId);
  if (state.answeringPeer || state.offerAnswered) {
    const replay2 = state.answerReplay;
    const lastSentAt = replay2?.lastSentAt[relayId];
    if (state.answeringPeer && !state.answeringPeer.isDead && replay2 && replay2.offer === offer2 && replay2.offerId === offerId && (lastSentAt === void 0 || Date.now() - lastSentAt >= 1e3)) {
      replay2.lastSentAt[relayId] = Date.now();
      const peerTopic2 = await sha1(topicPath(ctx.rootTopicPlaintext, peerId));
      if (!ctx.isLeaving() && state.answerReplay === replay2 && !state.connectedPeer) {
        const send = (message) => signalPeer(peerTopic2, message);
        replay2.relays[relayId] = send;
        replay2.messages.forEach(send);
      }
    }
    return;
  }
  const hasTrackedOutgoingOffer = Boolean(state.offerPeer || state.offerRelays.some(Boolean));
  if (hasTrackedOutgoingOffer && selfId < peerId) return;
  if (hasTrackedOutgoingOffer) resetOfferState(state);
  const answerPeer = ctx.initPeer(false, ctx.config);
  const replay = {
    offer: offer2,
    offerId,
    messages: [],
    lastSentAt: [],
    relays: []
  };
  replay.lastSentAt[relayId] = Date.now();
  state.answeringPeer = answerPeer;
  state.answerSent = false;
  state.answerReplay = replay;
  state.connectionErrorReported = false;
  scheduleAnsweringExpiry(ctx, state, peerId, answerPeer);
  const onAnswerPeerClosedOrError = () => {
    if (state.answeringPeer === answerPeer && !state.connectedPeer && state.answerSent) reportSdpExchangeConnectionFailure(ctx, state, peerId);
    clearAnswering(state, answerPeer);
    ctx.disconnectPeer(answerPeer, peerId);
    ctx.checkDeactivate();
  };
  answerPeer.setHandlers({
    connect: () => ctx.connectPeer(answerPeer, peerId),
    close: onAnswerPeerClosedOrError,
    error: onAnswerPeerClosedOrError
  });
  let plainOffer;
  try {
    plainOffer = await ctx.toPlain({
      type: "offer",
      sdp: offer2
    });
  } catch {
    clearAnswering(state, answerPeer);
    ctx.onJoinError?.({
      error: "incorrect room password when decrypting offer",
      appId: ctx.appId,
      peerId,
      roomId: ctx.roomId
    });
    return;
  }
  if (answerPeer.isDead) {
    clearAnswering(state, answerPeer);
    return;
  }
  const peerTopic = await sha1(topicPath(ctx.rootTopicPlaintext, peerId));
  if (ctx.isLeaving() || state.answerReplay !== replay) return;
  replay.relays[relayId] = (message) => signalPeer(peerTopic, message);
  const pendingCandidates = [];
  let didSendAnswer = false;
  const publishAnswerSignal = (signal) => {
    ctx.toCipher(signal).then((encryptedSignal) => {
      if (ctx.isLeaving() || state.answeringPeer !== answerPeer || answerPeer.isDead) return;
      const payloadToSend = { peerId: selfId };
      if (signal.type === "answer") {
        state.answerSent = true;
        payloadToSend["answer"] = encryptedSignal.sdp;
      } else payloadToSend["candidate"] = encryptedSignal.sdp;
      if (offerId) payloadToSend["offerId"] = offerId;
      if (ctx.isPassive) payloadToSend["passive"] = true;
      const message = toJson(payloadToSend);
      const now2 = Date.now();
      replay.messages.push(message);
      replay.relays.forEach((send, id) => {
        if (send) {
          replay.lastSentAt[id] = now2;
          send(message);
        }
      });
      if (signal.type === "answer" && !didSendAnswer) {
        didSendAnswer = true;
        pendingCandidates.splice(0).forEach(publishAnswerSignal);
      }
    });
  };
  answerPeer.setHandlers({ signal: (signal) => {
    if (ctx.isLeaving() || state.answeringPeer !== answerPeer || answerPeer.isDead) return;
    if (signal.type !== "answer" && signal.type !== "candidate") return;
    if (signal.type === "candidate" && !didSendAnswer) {
      pendingCandidates.push(signal);
      return;
    }
    publishAnswerSignal(signal);
  } });
  await answerPeer.signal(plainOffer);
};
var handleCandidate = async (ctx, peerId, candidate, offerId, peer) => {
  let plainCandidate;
  try {
    plainCandidate = await ctx.toPlain({
      type: candidateType,
      sdp: candidate
    });
  } catch {
    return;
  }
  const state = ctx.peerStates[peerId];
  const offerPeerMatch = offerId && state?.offerPeer && state.offerId === offerId ? state.offerPeer : null;
  const answeringPeer = !offerId || state?.answerReplay?.offerId === offerId ? state?.answeringPeer : null;
  const fallbackOfferPeer = !offerId && state?.offerPeer ? state.offerPeer : null;
  const targetPeer = peer && !peer.isDead ? peer : offerPeerMatch ?? answeringPeer ?? fallbackOfferPeer;
  if (targetPeer && !targetPeer.isDead) targetPeer.signal(plainCandidate);
};
var handleAnswer = async (ctx, peerId, answer, offerId, peer) => {
  let plainAnswer;
  try {
    plainAnswer = await ctx.toPlain({
      type: "answer",
      sdp: answer
    });
  } catch {
    if (peer) {
      ctx.offerManager.reclaimLeased(peer);
      if (!peer.isDead) peer.destroy();
    }
    ctx.onJoinError?.({
      error: "incorrect room password when decrypting answer",
      appId: ctx.appId,
      peerId,
      roomId: ctx.roomId
    });
    return;
  }
  if (peer) {
    const state = getState(ctx.peerStates, peerId);
    ctx.offerManager.claimLeased(peer);
    if (state.connectedPeer || state.offerAnswered || state.answeringPeer && !state.answeringPeer.isDead && selfId > peerId) {
      peer.destroy();
      return;
    }
    if (state.answeringPeer) {
      const answeringPeer = state.answeringPeer;
      clearAnswering(state, answeringPeer);
    }
    resetOfferState(state);
    state.offerPeer = peer;
    state.offerId = offerId ?? null;
    state.offerAnswered = true;
    scheduleOfferExpiry(ctx, state, peerId, offerPostAnswerTtlMs);
    bindOfferPeerHandlers(ctx, state, peerId, peer);
    peer.signal(plainAnswer);
  } else {
    const state = ctx.peerStates[peerId];
    if (!state || !state.offerPeer || state.offerAnswered || offerId && state.offerId && offerId !== state.offerId || state.offerPeer.isDead) return;
    state.offerAnswered = true;
    scheduleOfferExpiry(ctx, state, peerId, offerPostAnswerTtlMs);
    state.offerPeer.signal(plainAnswer);
  }
};
var prunePendingOffer = (ctx, peerId, relayId) => {
  const state = ctx.peerStates[peerId];
  if (!state || state.connectedPeer) return;
  if (state.offerRelays[relayId]) {
    clearOfferRelay(state, relayId);
    ctx.checkDeactivate();
  }
};
var createSignalHandler = (ctx) => (relayId) => async (topic, msg, signalPeer) => {
  if (ctx.isLeaving()) return;
  const payload = toPayload(msg);
  if (!payload || hasInvalidSignalField(payload, typeof msg === "string")) return;
  const peerId = getString(payload, "peerId") ?? "";
  const offer2 = getString(payload, "offer");
  const answer = getString(payload, "answer");
  const candidate = getString(payload, "candidate");
  const offerId = getString(payload, "offerId");
  const peer = isPeerHandle(payload["peer"]) ? payload["peer"] : void 0;
  const remoteIsPassive = payload["passive"] === true;
  if (!peerId || peerId === selfId) return;
  const [rootTopic, selfTopic] = await all([ctx.rootTopicP, ctx.selfTopicP]);
  if (ctx.isLeaving()) return;
  if (topic !== rootTopic && topic !== selfTopic) return;
  if (ctx.isPassive && remoteIsPassive) return;
  if (ctx.isPassive && !ctx.isActive && !answer && !candidate) {
    ctx.isActive = true;
    ctx.requeueAnnounce?.();
  }
  if (ctx.isPassive && !ctx.isActive) return;
  const state = ctx.peerStates[peerId];
  const connectedPeer = state?.connectedPeer;
  if (connectedPeer && state) {
    const health = getConnectedPeerHealth(connectedPeer);
    if (health === "live") {
      state.connectedPeerUnhealthySinceMs = null;
      return;
    }
    if (health === "stale") clearConnectedPeer(state, peerId, "message-from-stale-peer");
    else {
      const nowMs = Date.now();
      const unhealthySinceMs = state.connectedPeerUnhealthySinceMs ?? nowMs;
      state.connectedPeerUnhealthySinceMs = unhealthySinceMs;
      if (nowMs - unhealthySinceMs < disconnectedPeerGraceMs) return;
      clearConnectedPeer(state, peerId, "message-from-prolonged-disconnect");
    }
  }
  if (ctx.reusePeer(peerId)) return;
  if (Boolean(peerId && !offer2 && !answer && !candidate)) {
    const announcePeerState = getState(ctx.peerStates, peerId);
    const shouldLeadOffer = selfId < peerId;
    if (announcePeerState.answeringPeer || announcePeerState.connectedPeer || announcePeerState.offerAnswered) return;
    if (!shouldLeadOffer && !announcePeerState.offerPeer) {
      let lastSentByRelay = counterAnnounceTimestamps.get(announcePeerState);
      if (!lastSentByRelay) {
        lastSentByRelay = [];
        counterAnnounceTimestamps.set(announcePeerState, lastSentByRelay);
      }
      const lastSentAt = lastSentByRelay[relayId];
      if (lastSentAt !== void 0 && Date.now() - lastSentAt < 1e3) return;
      lastSentByRelay[relayId] = Date.now();
      const peerSelfTopic = await sha1(topicPath(ctx.rootTopicPlaintext, peerId));
      if (!ctx.isLeaving() && !announcePeerState.connectedPeer && !announcePeerState.answeringPeer && !announcePeerState.offerAnswered) signalPeer(peerSelfTopic, toJson({ peerId: selfId }));
      return;
    }
    if (announcePeerState.offerRelays[relayId]) return;
    announcePeerState.offerRelays[relayId] = offerRelayPlaceholder;
    return handleAnnouncement(ctx, relayId, peerId, signalPeer);
  }
  if (offer2) return handleOffer(ctx, relayId, peerId, offer2, offerId, signalPeer);
  if (candidate) return handleCandidate(ctx, peerId, candidate, offerId, peer);
  if (answer) return handleAnswer(ctx, peerId, answer, offerId, peer);
};

// node_modules/@trystero-p2p/core/dist/strategy.mjs
var announceIntervalMs = 5333;
var announceWarmupIntervalsMs = [
  233,
  533,
  1333
];
var passiveActivationGraceMs = 7533;
var sharedPeerIdleMsDefault = 123333;
var strategy_default = ({ init, subscribe, announce, deactivate }) => {
  const occupiedRooms = {};
  const leavingRoomCleanups = {};
  const sharedPeers = new SharedPeerManager();
  const hasActiveRooms = () => values(occupiedRooms).some((rooms) => keys(rooms).length > 0);
  let didInit = false;
  let initPromises = [];
  let cleanupWatchOnline = noOp;
  return (config, roomId, callbacks) => {
    if (!config) throw mkErr("requires a config map as the first argument");
    if (callbacks && typeof callbacks !== "object") throw mkErr("third argument must be a callbacks object");
    const { appId } = config;
    const onJoinError = callbacks?.onJoinError;
    const onPeerHandshake = callbacks?.onPeerHandshake;
    const handshakeTimeoutMs = callbacks?.handshakeTimeoutMs;
    if (!appId) throw mkErr("config map is missing appId field");
    if (!roomId) throw mkErr("roomId argument required");
    if (config.maxReceiveBytes !== void 0 && (!Number.isSafeInteger(config.maxReceiveBytes) || config.maxReceiveBytes <= 0)) throw mkErr("maxReceiveBytes must be a positive safe integer");
    if (handshakeTimeoutMs !== void 0 && (!Number.isFinite(handshakeTimeoutMs) || handshakeTimeoutMs <= 0)) throw mkErr("handshakeTimeoutMs must be a positive number");
    if (occupiedRooms[appId]?.[roomId]) return occupiedRooms[appId][roomId];
    leavingRoomCleanups[appId]?.[roomId]?.(true);
    const rootTopicPlaintext = topicPath(libName, appId, roomId);
    const rootTopicP = sha1(rootTopicPlaintext);
    const selfTopicP = sha1(topicPath(rootTopicPlaintext, selfId));
    const key = genKey(config.password ?? "", appId, roomId);
    const roomNamespacePromise = deriveRoomNamespace(appId, roomId);
    const sharedPeerIdleMs = config._test_only_sharedPeerIdleMs ?? sharedPeerIdleMsDefault;
    let didLeaveRoom = false;
    const withKey = (f) => async (signal) => ({
      type: signal.type,
      sdp: await f(key, signal.sdp)
    });
    const toPlain = withKey(decrypt);
    const toCipher = withKey(encrypt);
    const makeOffer = () => peer_default(true, config);
    let reannounceOnDisconnect = false;
    const offerManager = new OfferManager(makeOffer);
    const encryptOffer = async (peer) => {
      const plainOffer = await peer.getOffer();
      if (!plainOffer || plainOffer.type !== "offer") throw mkErr("failed to get offer for peer");
      return (await toCipher(plainOffer)).sdp;
    };
    const connectPeer = (peer, peerId) => {
      membership.connect(peerId, peer, sharedPeerIdleMs);
    };
    let disconnectReannounceQueued = false;
    const reannounceAfterDisconnect = () => {
      if (isPassive || !reannounceOnDisconnect || disconnectReannounceQueued) return;
      disconnectReannounceQueued = true;
      queueMicrotask(() => {
        disconnectReannounceQueued = false;
        if (!didLeaveRoom) ctx.requeueAnnounce?.();
      });
    };
    const disconnectPeer = (peer, peerId) => {
      if (didLeaveRoom) return;
      const state = ctx.peerStates[peerId];
      if (state?.connectedPeer === peer) {
        clearConnectedPeer(state, peerId, "close-event");
        checkDeactivate();
        reannounceAfterDisconnect();
      }
    };
    const isPassive = Boolean(config.passive);
    let passiveActivationTimeout;
    let deactivateRelayAnnouncements = noOp;
    const checkDeactivate = () => {
      if (!isPassive || !ctx.isActive) return;
      let hasActiveWork = false;
      entries(ctx.peerStates).forEach(([peerId, state]) => {
        if (state.connectedPeer || state.answeringPeer || state.offerInitPromise || state.offerPeer || state.offerRelays.some(Boolean)) hasActiveWork = true;
        else delete ctx.peerStates[peerId];
      });
      if (!hasActiveWork) {
        ctx.isActive = false;
        passiveActivationTimeout = resetTimer(passiveActivationTimeout);
        announceTimeouts.forEach(resetTimer);
        announceTimeouts.length = 0;
        deactivateRelayAnnouncements();
        membership.setActive(false);
      }
    };
    const ctx = {
      appId,
      roomId,
      config,
      peerStates: {},
      rootTopicPlaintext,
      rootTopicP,
      selfTopicP,
      toPlain,
      toCipher,
      isLeaving: () => didLeaveRoom,
      isPassive,
      isActive: !isPassive,
      onJoinError,
      offerManager,
      encryptOffer,
      initPeer: peer_default,
      connectPeer,
      disconnectPeer,
      reusePeer: (peerId) => membership.reuse(peerId),
      checkDeactivate,
      announceIntervals: [],
      announceIntervalMs
    };
    const strategyContext = {
      config,
      appId,
      roomId,
      isPassive
    };
    const handleMessage = createSignalHandler(ctx);
    if (!didInit) {
      const initRes = init(config);
      initPromises = (Array.isArray(initRes) ? initRes : [initRes]).map((value2) => Promise.resolve(value2));
      didInit = true;
      cleanupWatchOnline = config.relayConfig?.manualReconnection ? noOp : watchOnline();
    }
    const announceScheduleIntervals = initPromises.map(() => announceIntervalMs);
    const announceAttemptCounts = initPromises.map(() => 0);
    const announceErrorStreaks = initPromises.map(() => 0);
    const announceTimeouts = [];
    const unsubFns = initPromises.map(async (relayP, i) => subscribe(await relayP, await rootTopicP, await selfTopicP, handleMessage(i), (n) => offerManager.getOffers(n, encryptOffer), strategyContext));
    all([rootTopicP, selfTopicP]).then(([rootTopic, selfTopic]) => {
      if (didLeaveRoom) return;
      const queueAnnounce = async (relay, i) => {
        if (didLeaveRoom) return;
        if (isPassive && !ctx.isActive) return;
        const extra = isPassive ? { passive: true } : void 0;
        let announceResult = void 0;
        try {
          announceResult = await announce(relay, rootTopic, selfTopic, extra, strategyContext);
          announceErrorStreaks[i] = 0;
        } catch (error) {
          if (didLeaveRoom) return;
          const errorStreak = announceErrorStreaks[i] ?? 0;
          if (errorStreak === 0 && config.relayConfig?.warnOnRelayFailure !== false) console.warn(`${libName}: announce failed - ${toErrorMessage(error, "")}`);
          announceErrorStreaks[i] = errorStreak + 1;
        }
        if (didLeaveRoom || isPassive && !ctx.isActive) return;
        if (announceResult && typeof announceResult !== "number" && "stopAnnouncing" in announceResult) return;
        if (typeof announceResult === "number") {
          ctx.announceIntervals[i] = announceResult;
          announceScheduleIntervals[i] = announceResult;
        } else if (announceResult) {
          announceScheduleIntervals[i] = announceResult.nextAnnounceMs;
          reannounceOnDisconnect ||= announceResult.reannounceOnDisconnect === true;
        }
        const announceAttempt = announceAttemptCounts[i] ?? 0;
        announceAttemptCounts[i] = announceAttempt + 1;
        const currentInterval = announceScheduleIntervals[i] ?? announceIntervalMs;
        const warmupDelay = announceWarmupIntervalsMs[announceAttempt] ?? (announceAttempt === 3 && typeof announceResult === "object" ? announceIntervalMs : void 0);
        announceTimeouts[i] = setTimeout(() => {
          queueAnnounce(relay, i);
        }, typeof warmupDelay === "number" ? Math.min(currentInterval, warmupDelay) : currentInterval);
      };
      deactivateRelayAnnouncements = () => {
        if (!deactivate) return;
        initPromises.forEach(async (relayP) => {
          const relay = await relayP;
          if (!didLeaveRoom) deactivate(relay, rootTopic, selfTopic, strategyContext);
        });
      };
      ctx.requeueAnnounce = () => {
        announceTimeouts.forEach(resetTimer);
        announceTimeouts.length = 0;
        passiveActivationTimeout = resetTimer(passiveActivationTimeout);
        membership.setActive(true);
        passiveActivationTimeout = setTimeout(checkDeactivate, passiveActivationGraceMs);
        initPromises.forEach(async (relayP, i) => {
          const relay = await relayP;
          if (relay && !didLeaveRoom) {
            announceAttemptCounts[i] = 0;
            queueAnnounce(relay, i);
          }
        });
      };
      unsubFns.forEach(async (didSub, i) => {
        await didSub;
        if (didLeaveRoom) return;
        const relay = await initPromises[i];
        if (relay && !didLeaveRoom && (!isPassive || ctx.isActive)) queueAnnounce(relay, i);
      });
    });
    let onPeerConnect = noOp;
    const sharedPassword = config.password ?? "";
    const { compose } = createPasswordHandshake(sharedPassword, appId, roomId);
    const composedPeerHandshake = compose(onPeerHandshake);
    const releaseOccupiedRoom = () => {
      if (occupiedRooms[appId]?.[roomId] === joinedRoom) {
        delete occupiedRooms[appId][roomId];
        if (keys(occupiedRooms[appId]).length === 0) delete occupiedRooms[appId];
      }
    };
    const clearLeavingCleanup = () => {
      if (leavingRoomCleanups[appId]?.[roomId] === cleanupRoom) {
        delete leavingRoomCleanups[appId][roomId];
        if (keys(leavingRoomCleanups[appId]).length === 0) delete leavingRoomCleanups[appId];
      }
    };
    const cleanupRoom = (rejoining = false) => {
      if (didLeaveRoom) return;
      didLeaveRoom = true;
      onPeerConnect = noOp;
      releaseOccupiedRoom();
      clearLeavingCleanup();
      membership.leave();
      entries(ctx.peerStates).forEach(([peerId, state]) => {
        if (state.connectedPeer && !state.connectedPeer.isDead) {
          if (!sharedPeers.owns(appId, peerId, state.connectedPeer)) state.connectedPeer.destroy();
        }
        if (state.answeringPeer && !state.answeringPeer.isDead) state.answeringPeer.destroy();
        resetOfferState(state);
        resetAnsweringState(state);
        state.connectedPeer = null;
        state.connectedPeerUnhealthySinceMs = null;
      });
      announceTimeouts.forEach(resetTimer);
      passiveActivationTimeout = resetTimer(passiveActivationTimeout);
      unsubFns.forEach(async (f) => {
        (await f)();
      });
      offerManager.destroy();
      if (rejoining || hasActiveRooms()) return;
      didInit = false;
      cleanupWatchOnline();
    };
    const roomOptions = {
      ...config.maxReceiveBytes === void 0 ? {} : { maxReceiveBytes: config.maxReceiveBytes },
      ...composedPeerHandshake ? { onPeerHandshake: composedPeerHandshake } : {},
      ...handshakeTimeoutMs === void 0 ? {} : { handshakeTimeoutMs },
      isPassive,
      onBeforeLeave: () => {
        releaseOccupiedRoom();
        (leavingRoomCleanups[appId] ??= {})[roomId] = cleanupRoom;
      },
      onHandshakeError: (peerId, error) => onJoinError?.({
        error: error.replace(/^handshake failed: /, ""),
        appId,
        peerId,
        roomId
      })
    };
    occupiedRooms[appId] ??= {};
    const joinedRoom = room_default((f) => onPeerConnect = f, (id) => {
      if (didLeaveRoom) return;
      const state = ctx.peerStates[id];
      if (state?.connectedPeer) detachConnectedPeer(state, state.connectedPeer);
      checkDeactivate();
      reannounceAfterDisconnect();
    }, () => cleanupRoom(false), roomOptions);
    const membership = sharedPeers.registerRoom(appId, roomId, roomNamespacePromise, {
      active: !isPassive || ctx.isActive,
      onPeer: (proxy, peerId, physical) => {
        const state = getState(ctx.peerStates, peerId);
        markPeerConnected(state, physical);
        if (isPassive && !ctx.isActive) {
          ctx.isActive = true;
          membership.setActive(true);
          if (ctx.requeueAnnounce) ctx.requeueAnnounce();
          else {
            passiveActivationTimeout = resetTimer(passiveActivationTimeout);
            passiveActivationTimeout = setTimeout(checkDeactivate, passiveActivationGraceMs);
          }
        }
        onPeerConnect(proxy, peerId);
        resetOfferState(state);
      },
      onDetach: (peerId, physical) => {
        detachConnectedPeer(ctx.peerStates[peerId], physical);
        checkDeactivate();
      }
    });
    return occupiedRooms[appId][roomId] = joinedRoom;
  };
};

// node_modules/@trystero-p2p/core/dist/topic-strategy.mjs
var defaultSteadyAnnounceIntervalMs = 6e4;
var requireContext = (context) => {
  if (!context) throw mkErr("topic strategy missing room context");
  return context;
};
var makeTopicContext = (context, kind, rootTopic, selfTopic) => ({
  kind,
  appId: context.appId,
  roomId: context.roomId,
  rootTopic,
  selfTopic
});
var topic_strategy_default = ({ steadyAnnounceIntervalMs: steadyAnnounceIntervalMs2 = defaultSteadyAnnounceIntervalMs, reannounceOnDisconnect = true, init, subscribeTopic, publishTopic, unpublishTopic }) => strategy_default({
  init,
  subscribe: async (relay, rootTopic, selfTopic, onMessage, _getOffers, rawContext) => {
    const context = requireContext(rawContext);
    const signalPeer = (peerTopic, signal) => void publishTopic(relay, peerTopic, signal, makeTopicContext(context, "signal", rootTopic, selfTopic));
    let selfCleanup = null;
    let selfCleanupDone = false;
    let selfSubscriptionP = null;
    let didCleanup = false;
    const cleanupSelf = (cleanup) => {
      if (selfCleanupDone) return;
      selfCleanupDone = true;
      cleanup();
    };
    const ensureSelfSubscription = () => {
      if (!selfSubscriptionP) selfSubscriptionP = Promise.resolve(subscribeTopic(relay, selfTopic, (topic, msg) => {
        if (!didCleanup) onMessage(topic, msg, signalPeer);
      }, makeTopicContext(context, "self", rootTopic, selfTopic))).then((cleanup) => {
        selfCleanup = cleanup;
        if (didCleanup) cleanupSelf(cleanup);
      });
      return selfSubscriptionP;
    };
    if (!context.isPassive) await ensureSelfSubscription();
    const rootCleanup = await subscribeTopic(relay, rootTopic, async (topic, msg) => {
      if (didCleanup) return;
      if (context.isPassive && shouldActivatePassiveRoom(msg)) await ensureSelfSubscription();
      if (!didCleanup) await onMessage(topic, msg, signalPeer);
    }, makeTopicContext(context, "root", rootTopic, selfTopic));
    return () => {
      didCleanup = true;
      if (selfCleanup) cleanupSelf(selfCleanup);
      rootCleanup();
    };
  },
  announce: async (relay, rootTopic, selfTopic, extraPayload, rawContext) => {
    const context = requireContext(rawContext);
    const result = await publishTopic(relay, rootTopic, toJson({
      peerId: selfId,
      ...extraPayload
    }), makeTopicContext(context, "announce", rootTopic, selfTopic));
    return typeof result === "number" || result !== void 0 && "stopAnnouncing" in result ? result : {
      nextAnnounceMs: result?.nextAnnounceMs ?? steadyAnnounceIntervalMs2,
      reannounceOnDisconnect: result?.reannounceOnDisconnect ?? reannounceOnDisconnect
    };
  },
  ...unpublishTopic ? { deactivate: (relay, rootTopic, selfTopic, rawContext) => {
    const context = requireContext(rawContext);
    return unpublishTopic(relay, rootTopic, makeTopicContext(context, "announce", rootTopic, selfTopic));
  } } : {}
});

// node_modules/@trystero-p2p/nostr/dist/index.mjs
var relayManager = createRelayManager((client) => client.socket);
var defaultRedundancy = 5;
var tag = "x";
var eventMsgType = "EVENT";
var { secretKey, publicKey } = schnorr.keygen();
var pubkey = toHex(publicKey);
var kindCache = {};
var maxTopicsPerSubscription = 250;
var steadyAnnounceIntervalMs = 6e4;
var maxRelayBackoffMs = 9e5;
var subscriptionRetryMs = 5333;
var relayBackoffs = /* @__PURE__ */ new WeakMap();
var announcementMessages = relayManager.scoped();
var retiredRelays = /* @__PURE__ */ new WeakSet();
var backoffRelay = (client) => {
  const previous = relayBackoffs.get(client);
  const delayMs = Math.min(previous?.delayMs ? Math.max(steadyAnnounceIntervalMs, previous.delayMs * 2) : steadyAnnounceIntervalMs, maxRelayBackoffMs);
  relayBackoffs.set(client, {
    delayMs,
    untilMs: Date.now() + delayMs
  });
  return delayMs;
};
var getRelayBackoffMs = (client) => {
  const state = relayBackoffs.get(client);
  if (!state) return 0;
  const remainingMs = state.untilMs - Date.now();
  if (remainingMs > 0) return remainingMs;
  return 0;
};
var nextAnnounce = (nextAnnounceMs) => ({ nextAnnounceMs });
var stopAnnouncing = { stopAnnouncing: true };
var retireRelay = (client) => {
  if (retiredRelays.has(client)) return false;
  retiredRelays.add(client);
  relayBackoffs.delete(client);
  client.close?.();
  return true;
};
var now = () => Math.floor(Date.now() / 1e3);
var topicToKind = (topic) => kindCache[topic] ??= strToNum(topic, 1e4) + 2e4;
var createEvent = async (topic, content) => {
  const payload = {
    kind: topicToKind(topic),
    tags: [[tag, topic]],
    created_at: now(),
    content,
    pubkey
  };
  const id = await hashWith("SHA-256", toJson([
    0,
    payload.pubkey,
    payload.created_at,
    payload.kind,
    payload.tags,
    payload.content
  ]));
  return toJson([eventMsgType, {
    ...payload,
    id: toHex(id),
    sig: toHex(await schnorr.signAsync(id, secretKey))
  }]);
};
var batchers = {};
var resolveBatchFlush = (batcher) => {
  batcher.flushWaiters.forEach((resolve3) => resolve3());
  batcher.flushWaiters.clear();
};
var batchAdd = (client, topic, handler) => {
  const batcher = batchers[client.url] ??= {
    subIds: [],
    topics: /* @__PURE__ */ new Map(),
    updateTimer: null,
    flushWaiters: /* @__PURE__ */ new Set(),
    retryTimer: null,
    retryMs: subscriptionRetryMs,
    pendingEose: /* @__PURE__ */ new Set(),
    requestedAt: 0
  };
  batcher.topics.set(topic, handler);
  scheduleBatchFlush(client, batcher);
};
var batchRemove = (client, topic) => {
  const batcher = batchers[client.url];
  if (!batcher) return;
  batcher.topics.delete(topic);
  delete announcementMessages.forRelay(client)[topic];
  if (batcher.topics.size === 0) {
    if (batcher.retryTimer !== null) clearTimeout(batcher.retryTimer);
    if (batcher.updateTimer !== null) {
      clearTimeout(batcher.updateTimer);
      batcher.updateTimer = null;
    }
    resolveBatchFlush(batcher);
    batcher.subIds.forEach((subId) => client.send(toJson(["CLOSE", subId])));
    delete batchers[client.url];
  } else scheduleBatchFlush(client, batcher);
};
var scheduleBatchFlush = (client, batcher) => {
  if (batcher.updateTimer !== null) return;
  batcher.updateTimer = setTimeout(() => {
    batcher.updateTimer = null;
    try {
      flushBatch(client);
    } finally {
      resolveBatchFlush(batcher);
    }
  }, 0);
};
var waitForBatchFlush = (client) => {
  const batcher = batchers[client.url];
  if (!batcher || batcher.updateTimer === null) return Promise.resolve();
  return new Promise((resolve3) => batcher.flushWaiters.add(resolve3));
};
var flushBatch = (client) => {
  const batcher = batchers[client.url];
  if (!batcher || batcher.topics.size === 0) return;
  const topics = [...batcher.topics.keys()];
  const chunks = [];
  const since = now();
  for (let i = 0; i < topics.length; i += maxTopicsPerSubscription) chunks.push(topics.slice(i, i + maxTopicsPerSubscription));
  while (batcher.subIds.length > chunks.length) {
    const subId = batcher.subIds.pop();
    if (subId) client.send(toJson(["CLOSE", subId]));
  }
  batcher.pendingEose.clear();
  batcher.requestedAt = Date.now();
  chunks.forEach((chunk2, i) => {
    const subId = batcher.subIds[i] ??= genId(64);
    batcher.pendingEose.add(subId);
    client.send(toJson([
      "REQ",
      subId,
      {
        kinds: [...new Set(chunk2.map(topicToKind))],
        since,
        ["#x"]: chunk2
      }
    ]));
  });
};
var resubscribeOnReconnect = (client) => {
  const batcher = batchers[client.url];
  if (batcher && batcher.topics.size > 0 && !client.isClosed) {
    if (getRelayBackoffMs(client) > 0) {
      retrySubscription(client, true);
      return;
    }
    if (batcher.retryTimer !== null) {
      clearTimeout(batcher.retryTimer);
      batcher.retryTimer = null;
    }
    flushBatch(client);
    replayAnnouncements(client);
  }
};
var replayAnnouncements = (client) => {
  Object.entries(announcementMessages.forRelay(client)).forEach(([topic, payload]) => {
    publishMessage(client, topic, payload, true);
  });
};
var publishMessage = async (client, topic, payload, isAnnouncement) => {
  if (retiredRelays.has(client) || client.isClosed) return isAnnouncement ? stopAnnouncing : void 0;
  const remaining = getRelayBackoffMs(client);
  if (remaining > 0 || client.socket.readyState !== 1) return isAnnouncement ? nextAnnounce(Math.max(steadyAnnounceIntervalMs, remaining)) : void 0;
  const event = await createEvent(topic, isAnnouncement ? toJson({
    ...fromJson(payload),
    nonce: genId(8)
  }) : payload);
  if (isAnnouncement && !batchers[client.url]?.topics.has(topic)) return nextAnnounce(steadyAnnounceIntervalMs);
  if (getRelayBackoffMs(client) > 0 || client.isClosed || client.socket.readyState !== 1) return isAnnouncement ? nextAnnounce(steadyAnnounceIntervalMs) : void 0;
  client.send(event);
  if (isAnnouncement) return nextAnnounce(steadyAnnounceIntervalMs);
};
var retrySubscription = (client, rateLimited) => {
  const batcher = batchers[client.url];
  if (!batcher || batcher.retryTimer !== null && !rateLimited) return;
  if (batcher.retryTimer !== null) clearTimeout(batcher.retryTimer);
  const delay = rateLimited ? getRelayBackoffMs(client) : batcher.retryMs;
  batcher.retryMs = Math.min(batcher.retryMs * 2, steadyAnnounceIntervalMs);
  batcher.retryTimer = setTimeout(() => {
    batcher.retryTimer = null;
    resubscribeOnReconnect(client);
  }, Math.max(delay, subscriptionRetryMs));
};
var joinRoom = topic_strategy_default({
  init: (config) => getRelays(config, defaultRelayUrls, defaultRedundancy, true).map((url) => {
    const client = relayManager.register(url, () => makeSocket(url, (data) => {
      const [msgType, subId, payload, relayMsg] = fromJson(data);
      if (msgType !== eventMsgType) {
        const prefix = `${libName}: relay failure from ${client.url} - `;
        const rejectionReason = msgType === "CLOSED" && typeof payload === "string" ? payload : relayMsg;
        const didRejectEvent = msgType === "OK" && payload === false;
        const isRateLimited = (didRejectEvent || msgType === "CLOSED") && rejectionReason?.startsWith("rate-limited:");
        const isDuplicate = didRejectEvent && rejectionReason?.startsWith("duplicate:");
        const isTerminalRejection = rejectionReason && /^(blocked|restricted|auth-required|pow):/.test(rejectionReason);
        if (msgType === "OK" && payload === true && getRelayBackoffMs(client) === 0) relayBackoffs.delete(client);
        if ((didRejectEvent || msgType === "CLOSED") && isTerminalRejection && !retireRelay(client)) return;
        if (isRateLimited) backoffRelay(client);
        else if (msgType === "EOSE") {
          const batcher = batchers[client.url];
          if (batcher?.pendingEose.delete(subId) && batcher.pendingEose.size === 0) {
            batcher.retryMs = subscriptionRetryMs;
            if (batcher.retryTimer !== null) {
              clearTimeout(batcher.retryTimer);
              batcher.retryTimer = null;
            }
            if (Date.now() - batcher.requestedAt >= 1e3) replayAnnouncements(client);
          }
        }
        if (msgType === "CLOSED" && !isTerminalRejection) retrySubscription(client, Boolean(isRateLimited));
        if (!isDuplicate && config.relayConfig?.warnOnRelayFailure !== false) {
          if (msgType === "NOTICE") console.warn(prefix + subId);
          else if (didRejectEvent || msgType === "CLOSED") console.warn(prefix + rejectionReason);
        }
        return;
      }
      if (payload && typeof payload === "object" && "content" in payload) {
        const batcher = batchers[client.url];
        if (batcher?.subIds.includes(subId) && payload.tags) {
          const topicTag = payload.tags.find((t) => t[0] === tag);
          if (topicTag?.[1]) batcher.topics.get(topicTag[1])?.(topicTag[1], payload.content);
        }
      }
    }, () => resubscribeOnReconnect(client)));
    return client.ready;
  }),
  subscribeTopic: (client, topic, onMessage, context) => {
    const handler = (topic2, data) => void onMessage(topic2, data);
    batchAdd(client, topic, handler);
    const cleanup = () => {
      if (batchers[client.url]?.topics.get(topic) === handler) batchRemove(client, topic);
    };
    return context.kind === "root" ? waitForBatchFlush(client).then(() => cleanup) : cleanup;
  },
  publishTopic: (client, topic, msg, { kind }) => {
    const payload = typeof msg === "string" ? msg : toJson(msg);
    if (kind === "announce") announcementMessages.forRelay(client)[topic] = payload;
    return publishMessage(client, topic, payload, kind === "announce");
  },
  unpublishTopic: (client, topic) => {
    delete announcementMessages.forRelay(client)[topic];
  }
});
var getRelaySockets = relayManager.getSockets;
var defaultRelayUrls = [
  "0x-nostr-relay.fly.dev",
  "bendernostur.duckdns.org:8443",
  "cdn.satellite.earth",
  "nos.lol",
  "nostr.chaima.info",
  "nostr.christiansass.de",
  "nostr.rblb.it",
  "nostr.red5d.dev",
  "nostr.robosats.org",
  "nostr.stakey.net",
  "nostrcity-club.fly.dev",
  "relay-dev.gulugulu.moe",
  "relay.aarpia.com",
  "relay.agentry.com",
  "relay.bitmacro.cloud",
  "relay.bullishbounty.com",
  "relay.degmods.com",
  "relay.flashapp.me",
  "relay.grigic.org",
  "relay.hackshed.dev",
  "relay.kaleidoswap.com",
  "relay.layer.systems",
  "relay.nostr.blockhenge.com",
  "relay.nostr.dev.br",
  "relay.nostrmap.net",
  "relay.novospes.com",
  "relay.piazza.today",
  "relay.routstr.com",
  "testr.nymble.world"
].map((url) => "wss://" + url);

// src/net/wire.ts
var APP = "hollow-table";
var RELAYS = ["nos.lol", "nostr.chaima.info", "nostr.rblb.it", "nostr.red5d.dev", "relay.grigic.org", "relay.bitmacro.cloud"].map((h) => `wss://${h}`);
var STUN = ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"];
var MAX_BYTES = 64 * 1024 * 1024;
var BLOB_MAX = 25 * 1024 * 1024;
var BLOB_MS = 6e4;
var HANDSHAKE_MS = 15e3;
var HASH = /^[0-9a-f]{64}$/;
var TAB = /^[\w-]{1,64}$/;
var Wire = class {
  tab;
  #room;
  #who = /* @__PURE__ */ new Map();
  #byTab = /* @__PURE__ */ new Map();
  #handlers = /* @__PURE__ */ new Map();
  #joins = [];
  #leaves = [];
  #answer;
  #msg;
  #img;
  // Seq: seq-join.md#1 | R156: join a room; the relays only introduce.
  constructor(roomName, w) {
    this.tab = w.tab;
    this.#room = joinRoom({
      appId: APP,
      maxReceiveBytes: MAX_BYTES,
      relayConfig: { urls: RELAYS },
      rtcConfig: { iceServers: STUN.map((urls) => ({ urls })) },
      ...w.loopback && { _test_only_mdnsHostFallbackToLoopback: true }
    }, roomName, {
      onPeerHandshake: (peer, send, receive) => this.#handshake(w, peer, send, receive),
      handshakeTimeoutMs: HANDSHAKE_MS,
      onJoinError: (d) => w.refused?.(d.peerId, d.error)
    });
    this.#msg = this.#room.makeAction("e");
    this.#msg.onMessage = (data, { peerId }) => this.#heard(data, peerId);
    this.#room.onPeerJoin = (peer) => {
      const p = this.#who.get(peer);
      if (p) for (const fn of this.#joins) fn(p);
    };
    this.#room.onPeerLeave = (peer) => {
      const p = this.#who.get(peer);
      this.#who.delete(peer);
      if (!p) return;
      if (this.#byTab.get(p.tab) === peer) this.#byTab.delete(p.tab);
      for (const fn of this.#leaves) fn(p);
    };
    this.#img = this.#room.makeAction("img", {
      kind: "request",
      onRequest: async (hash) => {
        if (typeof hash !== "string" || !HASH.test(hash)) throw new Error("not an image hash");
        const blob = await this.#answer?.(hash);
        if (!blob) throw new Error("not here");
        return blob;
      },
      onReceive: ({ byteLength }) => byteLength <= BLOB_MAX
    });
  }
  // Seq: seq-join.md#1.2 to seq-join.md#1.6 | R165: both sides prove their browsers' keys and vouch
  // for their sealing keys; a bad proof refuses the peer, which never joins.
  async #handshake(w, peer, send, receive) {
    const nonce = b64(crypto.getRandomValues(new Uint8Array(16)));
    await send({ ik: w.identity.pub, key: w.sealer.pub, nonce, tab: this.tab });
    const hi = (await receive()).data;
    if (!hi || typeof hi.ik !== "string" || !PUB.test(hi.ik) || typeof hi.key !== "string" || !PUB.test(hi.key) || typeof hi.nonce !== "string" || hi.nonce.length > 40 || typeof hi.tab !== "string" || !TAB.test(hi.tab)) throw new Error("bad hello");
    await send({ sig: await w.identity.prove(hi.nonce, { from: selfId, to: peer }, w.sealer.pub) });
    const back3 = (await receive()).data;
    const browser = await verify(back3?.sig, nonce, { from: peer, to: selfId }, hi.ik, hi.key);
    if (!browser) throw new Error("the proof did not check out");
    this.#who.set(peer, { tab: hi.tab, browser, sealKey: hi.key });
    this.#byTab.set(hi.tab, peer);
  }
  // R177: checked before anyone reads it, and only from a proven peer speaking for its own tab.
  #heard(data, peer) {
    const p = this.#who.get(peer), env = p && check2(data);
    if (!p || !env || env.tab !== p.tab) return;
    for (const fn of this.#handlers.get(env.kind) ?? []) void fn(env.body, p);
  }
  #peers() {
    return Object.keys(this.#room.getPeers()).filter((p) => this.#who.has(p));
  }
  /** To everyone, or to one tab; resolves with how many peers it reached. Nothing echoes back. */
  async send(kind, body, to) {
    const targets = to ? [this.#byTab.get(to)].filter((p) => !!p && this.#who.has(p)) : this.#peers();
    if (!targets.length) return 0;
    await this.#msg.send(make(kind, this.tab, body), { target: to ? targets : null });
    return targets.length;
  }
  on(kind, fn) {
    this.#handlers.set(kind, [...this.#handlers.get(kind) ?? [], fn]);
  }
  onJoin(fn) {
    this.#joins.push(fn);
  }
  onLeave(fn) {
    this.#leaves.push(fn);
  }
  answer(fn) {
    this.#answer = fn;
  }
  /** Asks every peer for an image's bytes; the first answer wins. */
  request(hash) {
    const targets = this.#peers();
    if (!targets.length) return Promise.resolve(null);
    return new Promise((done2) => {
      let got = false;
      const none = () => done2(null);
      this.#img.requestMany(hash, {
        targets,
        timeoutMs: BLOB_MS,
        onResult: (r) => {
          const v = r.status === "fulfilled" ? r.value : null;
          if (got || !(v instanceof Blob || v instanceof ArrayBuffer || ArrayBuffer.isView(v))) return;
          got = true;
          done2(v instanceof Blob ? v : new Blob([v]));
        }
      }).then(none, none);
    });
  }
  reachable() {
    let relays = 0;
    try {
      relays = Object.values(getRelaySockets() ?? {}).filter((s) => s?.readyState === 1).length;
    } catch {
    }
    return { relays, peers: this.#peers().length };
  }
  leave() {
    return this.#room.leave();
  }
};

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
var STORES = ["games", "records", "checkpoints", "blobs", "identity"];
var done = (r) => new Promise((ok, fail) => {
  r.onsuccess = () => ok(r.result);
  r.onerror = () => fail(r.error);
});
var IdbDb = class _IdbDb {
  #db;
  constructor(db) {
    this.#db = db;
  }
  static async open(name2 = "hollow-table") {
    const req = indexedDB.open(name2, 2);
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
        const [keys2, values2] = await Promise.all([done(store.getAllKeys(r)), done(store.getAll(r))]);
        return keys2.map((k, i) => [k, values2[i]]);
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
  const damage3 = damageSlots((d, r) => {
    const extra = d === "injury" ? 0 : boxes[r] ?? 0;
    return { name: "", boxes: Array(extra).fill(false), spent: [] };
  });
  return { damage: damage3, absorb: { bias: 0, affliction: 0, injury: 0 }, notes };
}
function character(oid, owner, name2, x, front, b) {
  return { kind: "character", oid, owner, name: name2, pool: at(x, 20), card: at(x, 300), flipped: false, gathered: true, front, back: b };
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
var infl = (oid, name2, points2, n) => ({ kind: "influence", oid, home: DEVREUX, where: "drawer", n, name: name2, sign: 1, points: points2, used: false, crit: false });
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
    const all2 = await this.#db.tx(["games"], "readonly", (t) => t.all("games"));
    return all2.map(([, g]) => g).filter((g) => !g.copyOf).sort((a, b) => b.opened - a.opened);
  }
  // R133: New game is an empty table beside the others.
  /** Stores a new game (not opened): its records, and any checkpoints it brings (an import). */
  async add(name2, records = singletons(), checkpoints = [], copyOf, id = this.#id("g")) {
    const now2 = this.#clock.now();
    const info = { id, name: name2, made: now2, opened: now2, ...copyOf && { copyOf } };
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
  async rename(name2) {
    const cur = this.#open();
    this.current = { ...cur, name: name2 };
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
  async checkpoint(name2, auto) {
    const cur = this.#open();
    await this.save();
    const cp = { id: this.#id("c"), name: name2, at: this.#clock.now(), auto, records: Object.fromEntries(this.game.all()) };
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
    const all2 = await this.#db.tx(["checkpoints"], "readonly", (t) => this.#checkpoints(t, cur.id));
    return all2.map(({ records: _, ...info }) => info);
  }
  // Seq: seq-restore.md#1.2, seq-restore.md#1.3, seq-restore.md#1.4 | R135
  /** Checkpoints the table first, so the restore can be undone; the book is not taken back. */
  async restore(id) {
    const cur = this.#open();
    const cp = await this.#db.tx(["checkpoints"], "readonly", (t) => t.get("checkpoints", [cur.id, id]));
    if (!cp) throw new Error(`no checkpoint ${id}`);
    await this.checkpoint(`Before restoring \u201C${cp.name}\u201D`, true);
    const book2 = this.game.get("book");
    const records = Object.entries(cp.records).filter(([rid]) => rid !== "book");
    this.game.load(book2 ? [...records, ["book", book2]] : records);
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
  #write(key, value2) {
    try {
      this.#storage.setItem(key, value2);
    } catch {
    }
  }
};

// src/store/seat.ts
var seatKey = (game, viewer) => `hollow.seat.${game}.${viewer}`;
function fresh() {
  return {
    view: { x: 0, y: 0, zoom: 1 },
    roller: null,
    viewAs: null,
    tapeUp: false,
    boothill: { cur: 0, open: false },
    open: { used: [], piles: [], slots: [], columns: [] }
  };
}
var isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function load(storage, game, viewer) {
  let saved;
  try {
    saved = JSON.parse(storage.getItem(seatKey(game, viewer)) ?? "null");
  } catch {
    return fresh();
  }
  if (!isObject(saved)) return fresh();
  const base = fresh();
  return {
    ...base,
    ...saved,
    view: { ...base.view, ...isObject(saved.view) ? saved.view : {} },
    boothill: { ...base.boothill, ...isObject(saved.boothill) ? saved.boothill : {} },
    open: { ...base.open, ...isObject(saved.open) ? saved.open : {} }
  };
}
function save(storage, game, viewer, seat) {
  try {
    storage.setItem(seatKey(game, viewer), JSON.stringify(seat));
  } catch {
  }
}

// src/ui/gesture.ts
var LONG_MS = 500;
var DRAG_PX = 5;
var real = { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h) };
var shifty = /* @__PURE__ */ new Set();
var shifted = (e) => !!(e.shiftKey || e.ctrlKey || e.altKey);
var clickOf = (h, e) => shifted(e) ? h.shift ?? h.click : h.click;
function gesture(el2, h, timers = real) {
  if (h.shift) shifty.add(el2);
  let down = null, long = null, done2 = false;
  const reset = () => {
    if (long !== null) timers.clearTimeout(long);
    long = null;
    down = null;
    stop();
  };
  const onMove = (ev) => {
    const e = ev;
    if (!down || done2 || e.pointerId !== down.pointerId) return;
    if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < DRAG_PX) return;
    done2 = true;
    const d = down;
    reset();
    h.drag?.(d, e);
  };
  const onUp = (ev) => {
    const e = ev;
    if (!down || e.pointerId !== down.pointerId) return;
    const d = down, fired = done2;
    reset();
    if (fired) return;
    clickOf(h, d)?.(e);
  };
  const onCancel = () => reset();
  const target = el2.ownerDocument ?? globalThis.document ?? el2;
  const stop = () => {
    target.removeEventListener("pointermove", onMove);
    target.removeEventListener("pointerup", onUp);
    target.removeEventListener("pointercancel", onCancel);
  };
  const onDown = (ev) => {
    const e = ev;
    if ((e.button ?? 0) !== 0) return;
    if (h.drag) e.stopPropagation();
    reset();
    down = e;
    done2 = false;
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);
    if (h.shift) {
      long = timers.setTimeout(() => {
        long = null;
        if (!down || done2) return;
        done2 = true;
        h.shift(down);
      }, LONG_MS);
    }
  };
  const onKey = (ev) => {
    const e = ev;
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target !== el2) return;
    e.preventDefault();
    clickOf(h, e)?.(e);
  };
  el2.addEventListener("pointerdown", onDown);
  if (h.click || h.shift) el2.addEventListener("keydown", onKey);
  return () => {
    reset();
    shifty.delete(el2);
    el2.removeEventListener("pointerdown", onDown);
    el2.removeEventListener("keydown", onKey);
  };
}

// src/ui/receipt.ts
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var two = (n) => String(n).padStart(2, "0");
function when(at2) {
  const d = new Date(at2);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}
var DIE = { W: "White", G: "Green", R: "Red", B: "Blue", Y: "Yellow" };
var CRIT = { max: "maximize", dbl: "double" };
function receiptEl(doc, r) {
  const el2 = doc.createElement("div");
  el2.className = "receipt";
  el2.dataset.id = r.id;
  const line = (text, cls) => {
    const div = doc.createElement("div");
    if (cls) div.className = cls;
    div.textContent = text;
    el2.append(div);
  };
  const head = doc.createElement("div");
  const time = doc.createElement("span");
  time.className = "when";
  time.textContent = when(r.at);
  head.append(time, `${r.title}${r.ok ? " \u2713" : ""}`);
  el2.append(head);
  if (r.outcome === "missing") return el2;
  if (r.priv) line("Private: not shown to the table");
  if (r.by) line(`rolled by ${r.by}`);
  if (r.influence !== void 0) line(`Total Influence ${r.influence}${r.base !== void 0 ? ` (base ${r.base})` : ""}`);
  if (r.vs) line(`vs ${r.vs}`);
  if (r.row) line(`row ${r.row}`);
  line(r.dice.map((d) => `${DIE[d.c]} ${d.v}${d.dropped ? " (dropped)" : ""}${d.added ? " +" : ""}`).join(", "));
  line(r.resolution);
  if (r.crit) {
    for (const k of ["max", "dbl"]) {
      const chosen = r.crit.chosen === k;
      if (r.crit.locked && !chosen) continue;
      let cls = "other";
      if (chosen) cls = r.crit.locked ? "chosen punched" : "chosen";
      line(`${CRIT[k]}: ${r.crit[k]}`, cls);
    }
  }
  line(r.level);
  line(r.outcome, "outcome");
  return el2;
}

// src/ui/piece.ts
var CLASS = { text: "loose", character: "card" };
var LEVEL2 = { mild: "Mild", min: "Min", sig: "Sig", maj: "Maj" };
var COLUMN = {
  bias: { name: "Biases", mark: "bias" },
  affliction: { name: "Afflictions", mark: "aff" },
  injury: { name: "Injuries", mark: "inj" }
};
function tilt(oid) {
  let h = 0;
  for (const c of oid) h = h * 31 + c.charCodeAt(0) | 0;
  return `${((h >>> 0) % 13 - 6) * 0.25}deg`;
}
var el = (doc, tag2, cls, text) => {
  const e = doc.createElement(tag2);
  if (cls) e.className = cls;
  if (text !== void 0) e.textContent = text;
  return e;
};
function writable(doc, cls, source, save2) {
  const t = el(doc, "div", cls);
  t.contentEditable = "true";
  t.spellcheck = false;
  render(parse(source), t);
  t.dataset.source = source;
  t.addEventListener("input", () => {
    const s = serialize(read(t));
    t.dataset.source = s;
    save2(s);
  });
  return t;
}
function rewrite(t, source) {
  if (t.dataset.source === source) return;
  if (t.ownerDocument.activeElement && t.contains(t.ownerDocument.activeElement)) return;
  render(parse(source), t);
  t.dataset.source = source;
}
function change2(w, rid, fn) {
  const cur = w.game.get(rid);
  if (cur) w.game.change((wr) => wr.put(rid, fn(cur)));
}
function placeOf(r) {
  if (r.kind === "character") return r.card;
  if ("place" in r) return r.place;
  return null;
}
function draw(r, old, w) {
  const at2 = placeOf(r);
  if (!at2) return null;
  const doc = old?.ownerDocument ?? document;
  const e = old?.dataset.kind === r.kind ? old : make2(doc, r, w);
  e.style.left = `${at2.x}px`;
  e.style.top = `${at2.y}px`;
  e.style.zIndex = String(at2.z);
  e.style.setProperty("--tilt", tilt(r.oid));
  update(e, r, w);
  return e;
}
function make2(doc, r, w) {
  const rid = ridOf(r.oid);
  const e = el(doc, "div", `obj glide ${CLASS[r.kind] ?? r.kind}`);
  e.dataset.kind = r.kind;
  e.dataset.rid = rid;
  e.addEventListener("pointerdown", (ev) => {
    const t = ev.target;
    if (t.isContentEditable && t.ownerDocument.activeElement === t.closest("[contenteditable]")) ev.stopPropagation();
  }, true);
  gesture(e, { drag: (down, move) => {
    doc.activeElement?.blur?.();
    w.drag(rid, down, move);
  } });
  switch (r.kind) {
    case "character": {
      const flipper = el(doc, "div", "flipper");
      const front = el(doc, "div", "face front"), back3 = el(doc, "div", "face back");
      front.append(writable(doc, "text", r.front, (s) => change2(w, rid, (c) => ({ ...c, front: s }))));
      back3.append(
        el(doc, "div", "damage"),
        el(doc, "div", "notes-hd", "Notes"),
        writable(doc, "notes", r.back.notes, (s) => change2(w, rid, (c) => ({ ...c, back: { ...c.back, notes: s } })))
      );
      flipper.append(front, back3);
      const flip = el(doc, "button", "flip");
      flip.setAttribute("aria-label", "Flip the card");
      gesture(flip, { click: () => change2(w, rid, (c) => ({ ...c, flipped: !c.flipped })) });
      e.append(flipper, flip);
      break;
    }
    case "sticky":
    case "text":
      e.append(writable(doc, "text", r.text, (s) => change2(w, rid, (c) => ({ ...c, text: s }))));
      break;
    case "image": {
      const img = doc.createElement("img");
      img.alt = "";
      e.append(img);
      break;
    }
    case "reference":
      e.append(...reference(doc, r));
      break;
    case "tornroll":
      break;
  }
  return e;
}
function update(e, r, w) {
  switch (r.kind) {
    case "character": {
      e.classList.toggle("flipped", r.flipped);
      e.classList.toggle("secret", !canSee(w.viewer, r));
      rewrite(e.querySelector(".front > .text"), r.front);
      rewrite(e.querySelector(".back > .notes"), r.back.notes);
      damage2(e.querySelector(".damage"), r, w);
      break;
    }
    case "sticky":
    case "text":
      rewrite(e.querySelector(".text"), r.text);
      break;
    case "image":
      image(e, r, w);
      break;
    case "tornroll":
      tornroll(e, r);
      break;
    case "reference":
      break;
  }
}
function image(e, r, w) {
  const img = e.querySelector("img");
  if (e.dataset.blob === r.blob) {
    const why3 = w.missing(r.blob);
    e.classList.toggle("missing", !!why3 && !img.src);
    if (why3 && !img.src) e.title = why3;
    if (!img.src) void show();
    return;
  }
  if (e.dataset.blob) w.imageGone(e.dataset.blob);
  e.dataset.blob = r.blob;
  img.removeAttribute("src");
  e.classList.add("fetching");
  void show();
  async function show() {
    const url = await w.imageUrl(r.blob);
    if (e.dataset.blob !== r.blob) return;
    if (url) {
      img.src = url;
      e.classList.remove("fetching", "missing");
      e.removeAttribute("title");
    } else {
      const why3 = w.missing(r.blob);
      e.classList.toggle("missing", !!why3);
      if (why3) e.title = why3;
    }
  }
}
function tornroll(e, r) {
  const key = r.receipts.map((x) => x.id).join(",");
  if (e.dataset.receipts === key) return;
  e.dataset.receipts = key;
  e.replaceChildren(...r.receipts.map((x) => receiptEl(e.ownerDocument, x)));
}
var filled = (s) => !!s.name || s.boxes.some((b) => b);
function damage2(box2, c, w) {
  const doc = box2.ownerDocument, opened = w.opened();
  const put2 = (fn) => change2(w, ridOf(c.oid), fn);
  const slotAt = (ch, d, row2, s) => ({ ...ch, back: { ...ch.back, damage: { ...ch.back.damage, [d]: { ...ch.back.damage[d], [row2]: { ...ch.back.damage[d][row2], ...s } } } } });
  if (!box2.children.length) {
    for (const d of DAMAGE) {
      const col = el(doc, "div", `column col-${d}`);
      col.dataset.damage = d;
      const hd = el(doc, "div", "hd");
      const absorb2 = el(doc, "span", "absorb");
      absorb2.contentEditable = "true";
      absorb2.addEventListener("input", () => {
        const n = Number(absorb2.textContent?.replace(/\D/g, "") || 0);
        put2((ch) => ({ ...ch, back: { ...ch.back, absorb: { ...ch.back.absorb, [d]: Math.min(100, n) } } }));
      });
      hd.append(`${COLUMN[d].name} `, absorb2);
      col.append(hd);
      gesture(hd, { click: () => {
        const o = new Set(w.opened());
        o.add(`${c.oid}:${d}`);
        w.setOpened(o);
      } });
      for (const row2 of ROWS) {
        const line = el(doc, "div", "slotline");
        line.dataset.row = row2;
        const boxes = el(doc, "span", "boxes"), name2 = el(doc, "span", `name ${COLUMN[d].mark}`);
        name2.contentEditable = "true";
        name2.spellcheck = false;
        name2.addEventListener("input", () => put2((ch) => slotAt(ch, d, row2, { name: name2.textContent ?? "" })));
        line.append(boxes, el(doc, "span", "lvl", LEVEL2[row2]), name2, el(doc, "span", "spent"));
        col.append(line);
      }
      box2.append(col);
    }
  }
  for (const col of box2.children) {
    const d = col.dataset.damage, slots = c.back.damage[d];
    const empty2 = !ROWS.some((r) => filled(slots[r])) && !c.back.absorb[d];
    col.classList.toggle("empty", empty2);
    col.classList.toggle("open", opened.has(`${c.oid}:${d}`));
    const absorb2 = col.querySelector(".absorb");
    if (doc.activeElement !== absorb2) absorb2.textContent = c.back.absorb[d] ? `(absorb ${c.back.absorb[d]})` : "";
    for (const line of col.querySelectorAll(".slotline")) {
      const row2 = line.dataset.row, s = slots[row2];
      const name2 = line.querySelector(".name");
      if (doc.activeElement !== name2 && name2.textContent !== s.name) name2.textContent = s.name;
      const spent = s.spent.reduce((a, b) => a + b, 0);
      line.querySelector(".spent").textContent = spent ? `\u2212${spent}` : "";
      const boxes = line.querySelector(".boxes");
      if (boxes.children.length !== s.boxes.length) {
        boxes.replaceChildren(...s.boxes.map((_, k) => {
          const b = el(doc, "button", "box");
          b.setAttribute("aria-label", `Slot ${k + 2}`);
          gesture(b, { click: () => put2((ch) => {
            const cur = ch.back.damage[d][row2];
            if (!cur.name) {
              b.animate?.([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }], 200);
              return ch;
            }
            return slotAt(ch, d, row2, { boxes: cur.boxes.map((on, i) => i === k ? !on : on) });
          }) });
          return b;
        }));
      }
      s.boxes.forEach((on, k) => boxes.children[k].classList.toggle("on", on));
    }
  }
}
function reference(doc, r) {
  const p = (bold, rest = "") => {
    const e = el(doc, "p");
    e.append(el(doc, "b", "", bold), rest);
    return e;
  };
  const hd = (left, right) => {
    const e = el(doc, "div", "rhd");
    e.append(el(doc, "span", "", left), el(doc, "em", "", right));
    return e;
  };
  if (r.which === "actions") {
    return [
      hd("SKILL USE", "ACTIONS"),
      p("CREATE INFLUENCE"),
      p("ATTACK", ": Create a Bias or Conviction"),
      p("INFER", ": Find out an NPC's Skills, Resources, Motivations, Opinions, or information on another character"),
      p("IMPRESS", ": change an NPC's Opinions"),
      p("REQUEST", ": get an NPC to transfer a Resource or perform a task")
    ];
  }
  return [
    hd("How to play the table", "put me away when known"),
    p("Move", ": drag anything; drag empty table to pan, the wheel zooms."),
    p("Write", ": click paper to write; the pens mark what the table should read."),
    p("Shift-click", " (or press and hold) lowers, opens and deletes."),
    p("Put away", ": drop it on the bar; Boot Hill keeps what was buried."),
    p("Roll", ": the die by a pool's name docks your dice there.")
  ];
}

// src/ui/drag.ts
var pinnable = (r) => r.kind === "sticky" || r.kind === "text" || r.kind === "image";
var Drag = class {
  #w;
  constructor(w) {
    this.#w = w;
  }
  /** The highest z on the table, so a dropped piece lands on top. */
  #top() {
    let z = 0;
    for (const [, r] of this.#w.game.all()) {
      const at2 = "kind" in r ? placeOf(r) : null;
      if (at2) z = Math.max(z, at2.z);
    }
    return z + 1;
  }
  // Seq: seq-drag.md#1.2: lift; seq-drag.md#1.3: carry; seq-drag.md#1.6: drop.
  /** Carries a piece from the press that started it, and what's pinned to it. */
  start(rid, down, move) {
    const { game, table, moves } = this.#w;
    const rec = game.get(rid), at2 = rec && placeOf(rec), el2 = table.element(rid);
    if (!rec || !at2 || !el2) return;
    const doc = el2.ownerDocument;
    const carried = [{ rid, el: el2, from: at2, ...rec.kind === "character" && { part: "card" } }];
    if (rec.kind === "character") {
      for (const [r2, other] of game.all()) {
        const o = other;
        if ("kind" in o && pinnable(o) && o.pin?.card === rec.oid) {
          const e2 = table.element(r2);
          if (e2) carried.push({ rid: r2, el: e2, from: o.place });
        }
      }
    }
    const p0 = table.toWorld(down.clientX, down.clientY);
    for (const c of carried) {
      c.el.classList.add("lifted");
      c.el.classList.remove("glide");
      moves?.hold(c.rid);
    }
    doc.body.classList.add("dragging");
    const z = this.#top();
    const items = (dx, dy) => carried.slice(0, 8).map((c) => ({
      rid: c.rid,
      x: Math.round(c.from.x + dx),
      y: Math.round(c.from.y + dy),
      z,
      ...c.part && { part: c.part }
    }));
    const delta = (e) => {
      const p = table.toWorld(e.clientX, e.clientY);
      return { dx: p.x - p0.x, dy: p.y - p0.y };
    };
    const show = (dx, dy) => {
      for (const c of carried) {
        c.el.style.left = `${c.from.x + dx}px`;
        c.el.style.top = `${c.from.y + dy}px`;
      }
    };
    const onMove = (ev) => {
      const e = ev;
      if (e.pointerId !== down.pointerId) return;
      const { dx, dy } = delta(e);
      show(dx, dy);
      moves?.drag(items(dx, dy));
    };
    const onUp = (ev) => {
      const e = ev;
      if (e.pointerId !== down.pointerId) return;
      doc.removeEventListener("pointermove", onMove);
      doc.removeEventListener("pointerup", onUp);
      doc.removeEventListener("pointercancel", onUp);
      doc.body.classList.remove("dragging");
      const { dx, dy } = delta(e);
      for (const c of carried) {
        c.el.classList.remove("lifted");
        c.el.classList.add("glide");
      }
      moves?.drop(items(dx, dy));
      this.#drop(rec, carried, dx, dy, z, e);
      for (const c of carried) moves?.release(c.rid);
    };
    doc.addEventListener("pointermove", onMove);
    doc.addEventListener("pointerup", onUp);
    doc.addEventListener("pointercancel", onUp);
    onMove(move);
  }
  /** The card under the pointer, other than the piece itself. */
  #cardAt(e, not) {
    const doc = not.ownerDocument;
    for (const hit of doc.elementsFromPoint?.(e.clientX, e.clientY) ?? []) {
      const card = hit.closest?.(".obj.card");
      if (card && card !== not) return this.#w.game.get(card.dataset.rid);
    }
    return void 0;
  }
  // Seq: seq-drag.md#1.7 | R27: one change: the new places, pinned to a card or let go of one.
  #drop(rec, carried, dx, dy, z, e) {
    const { game } = this.#w;
    const moved = (p) => ({ ...p, x: Math.round(p.x + dx), y: Math.round(p.y + dy), z });
    game.change((w) => {
      for (const c of carried) {
        const r = game.get(c.rid);
        if (!r) continue;
        if (r.kind === "character") {
          w.put(c.rid, { ...r, card: moved(r.card) });
          continue;
        }
        if (!("place" in r)) continue;
        const place2 = moved(r.place);
        if (c.rid !== ridOf(rec.oid) || !pinnable(r)) {
          w.put(c.rid, { ...r, place: place2 });
          continue;
        }
        const card = this.#cardAt(e, carried[0].el);
        const { pin: _old, ...loose } = r;
        w.put(c.rid, card ? { ...loose, place: place2, pin: { card: card.oid, dx: place2.x - card.card.x, dy: place2.y - card.card.y } } : { ...loose, place: place2 });
      }
    });
  }
};

// src/ui/table.ts
var ZOOM_MIN = 0.25;
var ZOOM_MAX = 3;
var TableView = class {
  #root;
  #world;
  #w;
  #els = /* @__PURE__ */ new Map();
  view;
  constructor(root, world, w) {
    this.#root = root;
    this.#world = world;
    this.#w = w;
    this.view = { ...w.view };
    this.#place();
    w.game.listen((rids) => this.render(rids));
    this.render(w.game.all().map(([rid]) => rid));
    this.#panZoom();
  }
  /** The element drawing a piece, if any. */
  element(rid) {
    return this.#els.get(rid);
  }
  // Seq: seq-save.md#1.4: only the changed rids are touched.
  render(rids) {
    for (const rid of rids) {
      if (!isPiece(rid)) continue;
      const r = this.#w.game.get(rid), old = this.#els.get(rid);
      const e = r ? draw(r, old, this.#w) : null;
      if (!e) {
        if (old) {
          old.remove();
          this.#els.delete(rid);
          if (old.dataset.blob) this.#w.imageGone(old.dataset.blob);
        }
        continue;
      }
      if (e !== old) {
        old?.remove();
        this.#world.append(e);
        this.#els.set(rid, e);
      }
    }
  }
  /** Screen to table coordinates, for drops. */
  toWorld(clientX, clientY) {
    const r = this.#root.getBoundingClientRect();
    return { x: (clientX - r.left - this.view.x) / this.view.zoom, y: (clientY - r.top - this.view.y) / this.view.zoom };
  }
  #place() {
    this.#world.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`;
  }
  // R15: drag empty table to pan; the wheel zooms about the pointer. R16: a press that no piece
  // takes (a pool's empty space beside its name included) lands here.
  #panZoom() {
    const root = this.#root, doc = root.ownerDocument;
    let from = null;
    root.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      doc.activeElement?.blur?.();
      from = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y, id: e.pointerId };
      doc.body.classList.add("panning");
    });
    doc.addEventListener("pointermove", (e) => {
      if (!from || e.pointerId !== from.id) return;
      this.view = { ...this.view, x: from.vx + e.clientX - from.x, y: from.vy + e.clientY - from.y };
      this.#place();
    });
    const end = (e) => {
      if (!from || e.pointerId !== from.id) return;
      from = null;
      doc.body.classList.remove("panning");
      this.#w.keepView(this.view);
    };
    doc.addEventListener("pointerup", end);
    doc.addEventListener("pointercancel", end);
    root.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = root.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.view.zoom * Math.exp(-e.deltaY * 15e-4)));
      const k = zoom / this.view.zoom;
      this.view = { x: px - (px - this.view.x) * k, y: py - (py - this.view.y) * k, zoom };
      this.#place();
      this.#w.keepView(this.view);
    }, { passive: false });
  }
};

// src/main.ts
var clock = { now: () => Date.now(), setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h) };
async function measure(blob) {
  const image2 = await createImageBitmap(blob);
  const size = { w: image2.width, h: image2.height };
  image2.close();
  return size;
}
function tabId(session) {
  let tab2 = null;
  try {
    tab2 = session.getItem("hollow.tab");
  } catch {
  }
  if (!tab2) {
    tab2 = `t-${[...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
    try {
      session.setItem("hollow.tab", tab2);
    } catch {
    }
  }
  return tab2;
}
function local(key, value2) {
  try {
    if (value2 !== void 0) localStorage.setItem(key, value2);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function frame(fn) {
  let done2 = false, raf = 0;
  const go = () => {
    if (done2) return;
    done2 = true;
    cancelAnimationFrame(raf);
    clearTimeout(t);
    fn();
  };
  raf = requestAnimationFrame(go);
  const t = setTimeout(go, 100);
}
function views(game, gameId, viewer, blobs, moves, missing) {
  const who = viewer?.name ?? "nobody";
  let seat = load(localStorage, gameId, who);
  const keep = (s) => {
    seat = s;
    save(localStorage, gameId, who, s);
  };
  let drag;
  const table = new TableView(document.getElementById("table"), document.getElementById("world"), {
    game,
    viewer,
    view: seat.view,
    keepView: (v) => keep({ ...seat, view: v }),
    imageUrl: (hash) => blobs.url(hash),
    imageGone: (hash) => blobs.release(hash),
    missing,
    opened: () => new Set(seat.open.columns),
    setOpened: (o) => {
      keep({ ...seat, open: { ...seat.open, columns: [...o] } });
      table.render(game.all().map(([rid]) => rid));
    },
    drag: (rid, down, move) => drag?.start(rid, down, move)
  });
  drag = new Drag({ game, table, moves });
  return { table, drag };
}
async function main() {
  const db = await IdbDb.open();
  const store = new GameStore(db, clock, localStorage);
  const blobs = new BlobStore(db, measure);
  const [identity, sealer] = await Promise.all([Identity.load(db), Sealer.make()]);
  const tab2 = tabId(sessionStorage), invited = fromUrl(location.search);
  const loopback = !!local("hollow.loopback");
  const stamps = new Stamps(sessionStorage);
  const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  addEventListener("pagehide", () => {
    void store.save();
  });
  if (invited) {
    await store.copyFor(invited.room);
    const game2 = store.game, name2 = local("hollow.name") ?? "Player";
    const wire = new Wire(invited.room, { identity, sealer, tab: tab2, loopback });
    const copy = new Copy({
      game: game2,
      stamps,
      sealer,
      link: wire,
      clock,
      session: sessionStorage,
      local: localStorage,
      room: invited.room,
      gm: invited.gm,
      held: (rid) => moves2.holds(rid)
    });
    const moves2 = new Moves({ stamps, tab: tab2, send: (m) => {
      void wire.send("move", m);
    }, place: (cs) => copy.place(cs), timers: clock, schedule: frame });
    wire.on("move", (b, from) => moves2.receive(from.tab, b));
    const presence = new Presence({ net: wire, clock, role: "player", name: name2 });
    const rolls2 = new Rolls({ game: game2, sealer, clock, rng, link: wire, session: sessionStorage, gm: false, gmBrowser: invited.gm });
    const images = new ImageExchange(wire, blobs, clock);
    images.watch(game2);
    images.start();
    presence.start();
    copy.start();
    const { table: table2, drag: drag2 } = views(game2, store.current.id, { name: name2, gm: false }, blobs, moves2, (hash) => images.missing.get(hash));
    return { stamp: "dev", role: "player", tab: tab2, identity, store, blobs, wire, presence, copy, rolls: rolls2, images, moves: moves2, view: table2, drag: drag2 };
  }
  await store.start();
  const game = store.game;
  let table = null;
  let rolls = new Rolls({ game, sealer, clock, rng, link: null, session: sessionStorage, gm: true });
  const moves = new Moves({
    stamps,
    tab: tab2,
    send: (m) => {
      void table?.wire.send("move", m);
    },
    place: (cs) => table?.authority.moved(cs),
    timers: clock,
    schedule: frame
  });
  const open = () => {
    if (table) return table;
    const key = `hollow.room.${store.current.id}`;
    const room = local(key) ?? local(key, newRoom(store.current.name));
    const wire = new Wire(room, { identity, sealer, tab: tab2, loopback });
    const presence = new Presence({
      net: wire,
      clock,
      role: "gm",
      name: "GM",
      here: (p, from) => {
        if (p.role === "player") authority.join(from.tab, p.name, from.browser, from.sealKey);
      }
    });
    const authority = new Authority({ game, stamps, sealer, link: wire, schedule: queueMicrotask });
    const whoIs2 = (from) => {
      const p = presence.people.get(from.tab), held = p && game.get("book").claims[p.name];
      return p && held === from.browser ? p.name : null;
    };
    rolls = new Rolls({ game, sealer, clock, rng, link: wire, session: sessionStorage, gm: true, whoIs: whoIs2 });
    const images = new ImageExchange(wire, blobs, clock);
    images.start();
    presence.start();
    wire.on("move", (b, from) => moves.receive(from.tab, b));
    table = { room, wire, presence, authority, rolls, images };
    return table;
  };
  const link = () => invite(location.href, open().room, identity.id);
  const { table: view, drag } = views(game, store.current.id, { name: "GM", gm: true }, blobs, moves, (hash) => table?.images.missing.get(hash));
  return {
    stamp: "dev",
    role: "gm",
    tab: tab2,
    identity,
    store,
    blobs,
    open,
    invite: link,
    moves,
    view,
    drag,
    get table() {
      return table;
    },
    get rolls() {
      return rolls;
    }
  };
}
var ready = main();
if (new URLSearchParams(location.search).has("test")) {
  window.hollow = { stamp: "dev", ready };
}
/*! Bundled license information:

@noble/secp256k1/index.js:
  (*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=app.js.map
