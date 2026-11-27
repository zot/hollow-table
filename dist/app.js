// src/model/records.ts
var GM = "GM";
var OPEN = "open";
var SLOTS = ["bonus", "main", "edge", "stagger", "bias", "affliction", "injury"];
var ROWS = ["mild", "min", "sig", "maj"];
var DAMAGE = ["bias", "affliction", "injury"];
var LASTING = ["bias", "affliction"];
function damageSlots(f) {
  const column2 = (d) => Object.fromEntries(ROWS.map((r) => [r, f(d, r)]));
  return Object.fromEntries(DAMAGE.map((d) => [d, column2(d)]));
}
function isPaper(r) {
  return isPinnable(r) || r.kind === "docket";
}
function isPinnable(r) {
  return r.kind === "sticky" || r.kind === "text" || r.kind === "image";
}
function isPrivate(r) {
  return isPaper(r) && (!!r.to || !!r.mine || !!r.handed);
}
function ownerOf(r) {
  return r.by ?? GM;
}
var DICE = ["W", "G", "R", "B", "Y"];
var ROLL_TYPES = ["?", "skill", "influence", "phys", "mental", "psych", "infer", "impress", "request"];
var ATTACKS = ["phys", "mental", "psych"];
var isAttack = (t) => ATTACKS.includes(t);
var SHEET_PAGES = ["howto", "quick", "creation"];
var WORLD = "world";
var KEPT = 200;
var TOMBS = 3e3;
function newestRoll(tape) {
  return Math.max(tape?.last ?? 0, ...(tape?.receipts ?? []).filter((r) => r.id.startsWith("roll-")).map((r) => r.at));
}
var PLAYER_OIDS = 1048576;
function isPiece(rid2) {
  return rid2.startsWith("o:");
}
function oidOf(rid2) {
  return rid2.slice(2);
}
function ridOf(oid) {
  return "o:" + oid;
}
function isTorn(rid2) {
  return rid2.startsWith("t:");
}
function isMine(rid2) {
  return rid2.startsWith("m:");
}
function onTable(rid2) {
  return isPiece(rid2) || isTorn(rid2) || isMine(rid2);
}
function ridFor(r) {
  if (r.kind === "tornroll") return "t:" + r.oid;
  if (ownPiece(r)) return "m:" + r.oid;
  return ridOf(r.oid);
}
function ownPiece(r) {
  return r.kind === "reference" || isPaper(r) && !!r.mine;
}
var LOCAL = /* @__PURE__ */ new Set(["book", "tape", "hill", "desk", "tied"]);
function isLocal(rid2) {
  return LOCAL.has(rid2) || isTorn(rid2) || isMine(rid2);
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
var naming = fields({ by: str(CAPS.name), id: str(CAPS.id) });
var slot = fields(
  { name: str(CAPS.name), boxes: list(bool, 20), spent: list(int(0, 100), 21) },
  { naming }
);
var column = fields(Object.fromEntries(ROWS.map((r) => [r, slot])));
var damage = fields(Object.fromEntries(DAMAGE.map((d) => [d, column])));
var absorb = fields(Object.fromEntries(DAMAGE.map((d) => [d, int(0, 100)])));
var lastingOne = fields({ name: str(CAPS.name), points: int(0, 1e4), spent: int(0, 100) }, { naming });
var lasting = fields({}, Object.fromEntries(LASTING.map((d) => [d, lastingOne])));
var back = fields({ damage, absorb, notes: marked }, { lasting });
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
    action: str(CAPS.name),
    influence: int(-1e3, 1e3),
    base: int(-1e3, 1e3),
    vs: str(CAPS.name),
    row: str(CAPS.name),
    ok: bool,
    crit: fields({ max: int(0, 1e4), dbl: int(0, 1e4), chosen: oneOf("max", "dbl"), locked: bool }),
    priv: bool,
    attack: fields(
      { target: isOid, name: str(CAPS.name), from: str(CAPS.name), kind: oneOf(...ATTACKS), result: int(0, 1e4) },
      { taken: bool, waiting: list(fields({ damage: oneOf(...DAMAGE), row: oneOf(...ROWS, "lasting") }), 20) }
    ),
    transfer: fields(
      { target: isOid, name: str(CAPS.name), sl: int(1, 5) },
      { done: fields({ resource: str(CAPS.name), moved: int(0, 5), extra: int(0, 5) }) }
    )
  }
);
var readers = { by: str(CAPS.name), to: list(str(CAPS.name), 200), mine: oneOf(true), handed: oneOf(true) };
var DOCKET_NAME = 40;
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
  }, { shown: list(marked), info: list(marked, 20), pin }),
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
    {
      tap: fields({ ledger: dict(int(0, 100)), current: str(CAPS.name) }),
      damage: oneOf(...DAMAGE),
      mot: oneOf(true),
      once: oneOf(true),
      flag: fields({ why: str(CAPS.name) }, { fed: dict(int(0, 100)), plain: oneOf(true) })
    }
  ),
  chip: fields({ kind: oneOf("chip"), oid: isOid, where, n: int(0, CAPS.list), sign, points, rider: bool }, { by: str(CAPS.name) }),
  sticky: fields({ kind: oneOf("sticky"), oid: isOid, place, text: marked }, { pin, big: bool, ...readers }),
  text: fields({ kind: oneOf("text"), oid: isOid, place, text: marked }, { pin, ...readers }),
  image: fields({
    kind: oneOf("image"),
    oid: isOid,
    place,
    blob: (v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v),
    w: int(1, 1e5),
    h: int(1, 1e5)
  }, { pin, ...readers }),
  docket: fields({ kind: oneOf("docket"), oid: isOid, place, name: str(DOCKET_NAME) }, readers),
  tornroll: fields({ kind: oneOf("tornroll"), oid: isOid, place, receipts: list(receipt, 1e4) }),
  reference: fields({ kind: oneOf("reference"), oid: isOid, place, which: oneOf(...SHEET_PAGES) }),
  connections: fields({
    kind: oneOf("connections"),
    oid: isOid,
    place,
    rows: list(fields({ id: isOid, name: str(CAPS.name) }, { oid: isOid, group: oneOf(true) }), 200),
    cells: dict(int(-5, 5), 4e4)
  }, { away: oneOf(true) }),
  opinion: fields(
    { kind: oneOf("opinion"), oid: isOid, holder: isOid, of: isOid, text: marked },
    { shown: list(str(CAPS.text)), on: list(isOid), name: str(CAPS.name) }
  )
};
var piece = (v) => obj(v) && typeof v.kind === "string" && Object.hasOwn(PIECES, v.kind) && PIECES[v.kind](v);
var filedEntry = fields({ drawer: oneOf("characters", "npcs", "papers"), name: str(CAPS.name), records: list(piece) });
var burial = fields({ name: str(CAPS.name), records: list(piece) }, { info: fields({ oid: isOid, k: int(0, 20), text: marked }), gm: isOid });
var SINGLETONS = {
  yards: fields({ yards: list(fields({ name: str(CAPS.name), named: bool, items: list(burial) }), 100) }),
  hill: fields({ hill: list(fields({ yard: str(CAPS.name), burial }), 1e4) }),
  desk: (v) => fields({ desks: list(fields(
    { name: str(CAPS.name), named: bool, items: list(filedEntry, 1e4) },
    { top: list(piece, 1e4), spots: dict(fields({}, { pool: place, card: place, gathered: bool, place }), 1e4) }
  ), 100) }, { out: int(0, 99) })(v) || fields({ desk: list(filedEntry, 1e4) })(v),
  // R550: one from before
  meta: fields({ round: int(0, 1e4), rolls: int(0, 1e9) }, { counts: dict(int(0, 1e9), 1e4), marked: oneOf(true) }),
  world: fields({ set: bool, total: int(-1e3, 1e3) }),
  rows: fields({ rows: dict(fields(
    {
      pool: isOid,
      action: str(CAPS.name),
      opponent: (v) => v === null || v === WORLD || isOid(v),
      defend: oneOf("mental", "psych"),
      row: (v) => v === null || str(32)(v),
      byHand: bool,
      hand: fields({ yellows: int(-100, 100), bonus: int(-1e3, 1e3) })
    },
    {
      priv: bool,
      type: oneOf(...ROLL_TYPES),
      alt: str(CAPS.name),
      against: (v) => [
        fields({ def: oneOf("mental", "psych") }),
        fields({ act: str(CAPS.name) }),
        fields({ fld: str(CAPS.name) }),
        fields({ skl: str(CAPS.name) })
      ].some((f) => f(v)),
      reaction: isOid
    }
  ), 1e3) }),
  book: fields(
    { claims: dict(str(CAPS.id)), gv: int(0, Number.MAX_SAFE_INTEGER), tomb: dict(int(0, Number.MAX_SAFE_INTEGER), TOMBS) },
    {
      hillGv: int(0, Number.MAX_SAFE_INTEGER),
      last: dict(fields({ g: int(0, Number.MAX_SAFE_INTEGER), by: str(CAPS.id) }), TOMBS),
      floor: int(0, Number.MAX_SAFE_INTEGER),
      kept: list(fields(
        { character: isOid, n: int(0, Number.MAX_SAFE_INTEGER), full: receipt, roller: receipt, table: receipt },
        { tab: str(CAPS.id), sealKey: str(CAPS.text), priv: oneOf(true) }
      ), KEPT)
    }
  ),
  tape: fields({ receipts: list(receipt, 1e4) }, { last: int(0, Number.MAX_SAFE_INTEGER) }),
  tied: fields({ tied: list(isOid, 1e4) })
};
function check(rid2, value2) {
  if (isPiece(rid2)) return piece(value2) && value2.oid === oidOf(rid2) && !ownPiece(value2);
  if (isTorn(rid2)) return PIECES.tornroll(value2) && value2.oid === oidOf(rid2);
  if (isMine(rid2)) return piece(value2) && ownPiece(value2) && value2.oid === oidOf(rid2);
  return Object.hasOwn(SINGLETONS, rid2) && SINGLETONS[rid2](value2);
}

// src/model/game.ts
var Refused = class extends Error {
  rid;
  constructor(rid2) {
    super(`refused: ${rid2} is not a well-formed record`);
    this.rid = rid2;
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
  get(rid2) {
    return this.#records.get(rid2);
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
      put: (rid2, value2) => {
        if (!check(rid2, value2)) throw new Refused(rid2);
        staged.set(rid2, value2);
      },
      del: (rid2) => {
        staged.set(rid2, void 0);
      }
    });
    const changed = /* @__PURE__ */ new Set();
    for (const [rid2, value2] of staged) {
      if (same(this.#records.get(rid2), value2)) continue;
      if (value2 === void 0) this.#records.delete(rid2);
      else this.#records.set(rid2, value2);
      changed.add(rid2);
    }
    this.#tell(changed);
    return changed;
  }
  /** Replaces everything (opening a game, a restore, a full table arriving); every rid is heard. */
  load(records3) {
    const changed = new Set(this.#records.keys());
    this.#records = new Map(records3);
    for (const rid2 of this.#records.keys()) changed.add(rid2);
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

// src/text/marks.ts
var MARKS = ["act", "res", "mot", "att", "inf", "def", "fld", "skl", "head"];
var TAG = new RegExp(`<(${MARKS.join("|")})>`, "g");
function parseLine(src) {
  const runs = [];
  let from = 0;
  TAG.lastIndex = 0;
  for (let m = TAG.exec(src); m; m = TAG.exec(src)) {
    const mark2 = m[1], close = `</${mark2}>`;
    const start = m.index + m[0].length, end = src.indexOf(close, start);
    if (end < 0) continue;
    if (m.index > from) runs.push(src.slice(from, m.index));
    runs.push({ mark: mark2, text: src.slice(start, end) });
    from = end + close.length;
    TAG.lastIndex = from;
  }
  if (from < src.length || runs.length === 0) runs.push(src.slice(from));
  return runs;
}
function parse(source2) {
  return source2.split("\n").map(parseLine);
}
var runSource = (r) => typeof r === "string" ? r : `<${r.mark}>${r.text}</${r.mark}>`;
function serialize(lines2) {
  return lines2.map((l) => l.map(runSource).join("")).join("\n");
}
function plain(line) {
  return line.map((r) => typeof r === "string" ? r : r.text).join("");
}
function marks(lines2, tag) {
  const out = [];
  lines2.forEach((l, line) => l.forEach((r, run2) => {
    if (typeof r !== "string" && (!tag || r.mark === tag)) out.push({ line, run: run2, mark: r.mark, text: r.text });
  }));
  return out;
}
var fits = (mark2, text) => !text.includes("\n") && !text.includes(`</${mark2}>`);
function replaceLine(lines2, i, line) {
  return lines2.map((l, j) => j === i ? line : l);
}
function setMark(lines2, at4, text) {
  const r = lines2[at4.line]?.[at4.run];
  if (!r || typeof r === "string" || !fits(r.mark, text)) return lines2;
  return replaceLine(lines2, at4.line, lines2[at4.line].map((x, k) => k === at4.run ? { mark: r.mark, text } : x));
}
function mark(lines2, range, tag) {
  const r = lines2[range.line]?.[range.run];
  if (typeof r !== "string" || range.start < 0 || range.end > r.length || range.start >= range.end) return lines2;
  const text = r.slice(range.start, range.end);
  if (!fits(tag, text)) return lines2;
  const parts2 = [r.slice(0, range.start), { mark: tag, text }, r.slice(range.end)].filter((x) => x !== "");
  const line = lines2[range.line];
  return replaceLine(lines2, range.line, [...line.slice(0, range.run), ...parts2, ...line.slice(range.run + 1)]);
}
function unmark(lines2, at4) {
  const line = lines2[at4.line], r = line?.[at4.run];
  if (!line || !r || typeof r === "string") return lines2;
  const out = [];
  line.forEach((x, k) => {
    const run2 = k === at4.run ? r.text : x, last = out[out.length - 1];
    if (typeof run2 === "string" && typeof last === "string") out[out.length - 1] = last + run2;
    else out.push(run2);
  });
  return replaceLine(lines2, at4.line, out);
}
function labelEnd(mark2, text) {
  return mark2 === "act" || mark2 === "def" ? text.indexOf(":") + 1 : 0;
}
function render(lines2, el4) {
  const doc = el4.ownerDocument;
  el4.replaceChildren(...lines2.map((l) => {
    const div = doc.createElement("div");
    for (const r of l) {
      if (typeof r === "string") {
        div.append(r);
        continue;
      }
      const span = doc.createElement("span"), cut = labelEnd(r.mark, r.text);
      span.className = r.mark;
      if (cut) {
        const b = doc.createElement("b");
        b.textContent = r.text.slice(0, cut);
        span.append(b, r.text.slice(cut));
      } else span.textContent = r.text;
      div.append(span);
    }
    return div;
  }));
}
var isMark = (s) => MARKS.includes(s);
function read(el4) {
  return scan(el4).lines;
}
function locate(el4, node, offset) {
  return scan(el4, { node, offset }).pos;
}
function scan(el4, at4) {
  const lines2 = [[]];
  let pos = null;
  const cur = () => lines2[lines2.length - 1];
  const here2 = (extra = 0) => {
    const line = cur(), last = line[line.length - 1];
    return typeof last === "string" ? { line: lines2.length - 1, run: line.length - 1, offset: last.length + extra } : { line: lines2.length - 1, run: line.length, offset: extra };
  };
  const push = (r) => {
    const line = cur(), last = line[line.length - 1];
    if (typeof r === "string" && typeof last === "string") line[line.length - 1] = last + r;
    else if (r !== "") line.push(r);
  };
  const walk = (n, top) => {
    const kids = Array.from(n.childNodes);
    kids.forEach((c, k) => {
      if (c.nodeType === 1 && c.tagName === "DIV" && top && k > 0) lines2.push([]);
      if (at4?.node === n && at4.offset === k) pos ??= here2();
      if (c.nodeType === 3) {
        if (at4?.node === c) pos = here2(at4.offset);
        return push(c.textContent ?? "");
      }
      if (c.nodeType !== 1) return;
      const e = c, cls = e.className;
      if (e.tagName === "BR") return void (k < kids.length - 1 && lines2.push([]));
      if (e.tagName === "SPAN" && isMark(cls) && fits(cls, e.textContent ?? "")) {
        if (at4 && e.contains(at4.node)) pos = { line: lines2.length - 1, run: cur().length, offset: offsetIn(e, at4.node, at4.offset) };
        return push({ mark: cls, text: e.textContent ?? "" });
      }
      walk(e, false);
    });
    if (at4?.node === n && at4.offset >= kids.length) pos ??= here2();
  };
  walk(el4, true);
  return { lines: lines2.map((l) => l.length ? l : [""]), pos };
}
function offsetIn(el4, node, offset) {
  let n = 0;
  const walk = (p) => {
    for (const [k, c] of Array.from(p.childNodes).entries()) {
      if (p === node && k === offset) return true;
      if (c.nodeType !== 3) {
        if (walk(c)) return true;
      } else if (c === node) {
        n += offset;
        return true;
      } else n += c.textContent?.length ?? 0;
    }
    return false;
  };
  walk(el4);
  return n;
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
  const label2 = text.slice(0, colon).trim();
  const parts2 = splitComma(text.slice(colon + 1));
  if (!label2 || !parts2) return null;
  const b = BASE.exec(parts2[0]), d = DICE2.exec(parts2[1]);
  if (!b || !d || d[1] === void 0 && d[2] === void 0) return null;
  return { label: label2, base: signed(b[1]), yellows: d[1] ? Number(d[1]) : 0, bonus: d[2] ? signed(d[2]) : 0, att: actionAtt(text.slice(colon + 1)) };
}
function actionAtt(text) {
  const entries4 = [...text.matchAll(/\(([^)]*)\)/g)].flatMap((m) => m[1].split(",").map((e) => e.trim().toLowerCase()));
  return entries4.includes("no att") ? null : entries4.includes("int") ? "Int" : "Cha";
}
var LEVEL_WORDS = ["Min", "Sig", "Maj", "Ext", "Exq"];
var LEVEL = `(${LEVEL_WORDS.join("|")}|\\d+)`;
var INFLUENCE = new RegExp(`^(.*?)\\s*([+${MINUS}])\\s*${LEVEL}\\b(.*)$`, "is");
function influence(text) {
  const t = text.trim(), m = INFLUENCE.exec(t);
  const name2 = m?.[1].trim();
  if (m && name2) {
    const w = m[3], word = LEVEL_WORDS.find((x) => x.toLowerCase() === w.toLowerCase());
    return { name: name2, sign: m[2] === "+" ? 1 : -1, level: word ?? w };
  }
  return t ? { name: t, sign: null, level: null } : null;
}
function suffered(label2) {
  const r = influence(label2);
  return r?.sign && r.level ? r : null;
}
function variants(front) {
  const out = [];
  let of = null;
  parse(front).forEach((runs, line) => {
    const marked2 = runs.filter((r) => typeof r !== "string" || r.trim());
    const only = marked2.length === 1 && typeof marked2[0] !== "string" ? marked2[0] : null;
    const act = only?.mark === "act" ? action(only.text) : null;
    if (!act) {
      of = null;
      return;
    }
    if (of && !act.label.includes(",") && suffered(act.label)) out.push({ line, label: act.label, of });
    else of = act.label;
  });
  return out;
}
function suffers(front, label2) {
  const comma = label2.lastIndexOf(",");
  if (comma > 0 && label2.slice(0, comma).trim()) return suffered(label2.slice(comma + 1));
  return variants(front).some((v) => v.label === label2) ? suffered(label2) : null;
}
function skillNamed(front, label2) {
  const name2 = label2.split(",")[0].trim().toLowerCase();
  return points2(front).some((p) => ("fld" in p.against ? p.against.fld : "skl" in p.against ? p.against.skl : "").toLowerCase() === name2);
}
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
function offer(line, heading2 = null, underField2 = false) {
  if (SKILLS.test(line)) return "skl";
  if (field(line)) return "fld";
  if (action(line)) return "act";
  if (ATT_LINE.test(line)) return "att";
  const r = influence(line);
  if (r?.level && r.sign === 1 && heading2 && /^\s*resources\b/i.test(heading2)) return "res";
  if (r?.level && heading2 && /^\s*motivations?\b/i.test(heading2)) return "mot";
  if (underField2 && line.trim()) return "skl";
  return null;
}
var LEVELS = { Min: 1, Sig: 2, Maj: 3, Ext: 4, Exq: 5 };
var WORD_OF = ["0", "Min", "Sig", "Maj", "Ext", "Exq"];
function levelsOf(r) {
  if (!r.level) return 0;
  if (/^\d+$/.test(r.level)) return Math.floor(Number(r.level) / 2);
  return LEVELS[r.level] ?? 0;
}
function levelWord(levels) {
  return WORD_OF[levels] ?? String(levels * 2);
}
var LEVEL_AT = new RegExp(`^(.*?[+${MINUS}]\\s*)${LEVEL}\\b(.*)$`, "is");
function spend(text, by) {
  const r = influence(text), m = LEVEL_AT.exec(text);
  if (!r?.level || !m) return null;
  const left = levelsOf(r) - by;
  return left < 0 ? null : m[1] + levelWord(left) + m[3];
}
var ADJUSTED = new RegExp(`\\s*\\((?:[+${MINUS}]\\s*)?${LEVEL}\\)\\s*$`, "i");
function unadjusted(text) {
  return text.replace(ADJUSTED, "");
}
function motiveLeft(text) {
  const a = ADJUSTED.exec(text);
  if (!a) return levelsOf(influence(text) ?? { name: "", sign: null, level: null });
  const w = a[1], word = LEVEL_WORDS.find((x) => x.toLowerCase() === w.toLowerCase());
  return levelsOf({ name: "", sign: null, level: word ?? w });
}
function adjust(text, by) {
  const base = unadjusted(text), r = influence(base);
  if (!r?.level) return null;
  const left = motiveLeft(text) - by;
  if (left < 0) return null;
  if (left >= levelsOf(r)) return base;
  if (!left) return `${base} (0)`;
  const sign2 = r.sign === -1 ? "-" : "+";
  return `${base} (${sign2}${levelWord(left)})`;
}
var ATT = new RegExp(`\\b([A-Z][a-z]{2})\\s*([+${MINUS}]?\\d+)\\b`, "g");
var ATT_LINE = new RegExp(`^\\s*(?:[A-Z][a-z]{2}\\s*[+${MINUS}]?\\d+\\s*){2,}$`);
function attributes(text) {
  return Object.fromEntries([...text.matchAll(ATT)].map((m) => [m[1], signed(m[2])]));
}
var FIELD = /^\s*([^✓\s].*?)\s+(\d+)\s*\(\s*\d+\s*XP\s*\)\s*$/i;
function field(text) {
  const m = FIELD.exec(text);
  return m ? { name: m[1].trim(), level: Number(m[2]) } : null;
}
var SKILLS = /^\s*Skills\s+(\d+)\s*:/i;
function skillsLine(text) {
  const m = SKILLS.exec(text);
  return m ? { level: Number(m[1]), skills: parts(text, m[0].length) } : null;
}
function parts(text, from) {
  const out = [];
  let depth = 0;
  const take2 = (to) => {
    const raw = text.slice(from, to), lead = raw.length - raw.trimStart().length, name2 = raw.trim();
    if (name2) out.push({ name: name2, start: from + lead, end: from + lead + name2.length });
  };
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === "," && !depth) {
      take2(i);
      from = i + 1;
    }
  }
  take2(text.length);
  return out;
}
var INFER = { fld: "skills", skl: "skills", res: "resources", mot: "motivations" };
function label(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === ":" && !depth) return text.slice(0, i + 1).trim();
  }
  return "";
}
var CLUE = { skill: "skills", resource: "resources", motivation: "motivations", item: "items", opinion: "opinions" };
function clues(info) {
  return info.split("\n").flatMap((line, k) => {
    const text = line.trim();
    if (!text) return [];
    const word = /^\s*([a-z]+?)s?\s*:/i.exec(text)?.[1]?.toLowerCase() ?? "";
    return [{ line: k, label: "", text, key: text, cat: CLUE[word] ?? "any" }];
  });
}
function entries(front) {
  const out = [];
  let items = null;
  parse(front).forEach((line, k) => {
    const heads = line.filter((r) => typeof r !== "string" && r.mark === "head");
    if (heads.length) {
      items = /^\s*items?\s*$/i.test(plain(line)) ? k : null;
      return;
    }
    const text = plain(line).trim();
    if (!text) return;
    const mark2 = line.map((r) => typeof r === "string" ? void 0 : INFER[r.mark]).find(Boolean);
    if (mark2) {
      const lab = label(text);
      for (const p of parts(text, lab.length)) out.push({ line: k, label: lab, text: p.name, key: lab ? `${lab} ${p.name}` : p.name, cat: mark2 });
    } else if (items !== null) out.push({ line: k, label: "", text, key: text, cat: "items", head: items });
  });
  return out;
}
var skillName = (text) => text.replace(/^\s*✓\s*/, "").replace(/\s+\d+\s*$/, "").replace(/\s*\(x\d+[^)]*\)/gi, "").trim();
function points2(front, att = "Cha") {
  const lines2 = parse(front), out = [], attrs = {};
  for (const l of lines2) for (const r of l) if (typeof r !== "string" && r.mark === "att") Object.assign(attrs, attributes(r.text));
  const value2 = att ? attrs[att] ?? 0 : 0;
  const plus = (level2) => ` ${level2}` + (att ? ` + ${att} ${value2}` : "");
  let fieldLevel = null;
  lines2.forEach((l, line) => {
    let at4 = 0, onlySkills = true, sawField = false;
    for (const r of l) {
      const len = (typeof r === "string" ? r : r.text).length;
      if (typeof r === "string") {
        if (r.trim()) onlySkills = false;
        at4 += len;
        continue;
      }
      const t = r.text;
      if (r.mark === "def") {
        const d = defend(t), colon = t.indexOf(":") + 1, nums = [...t.slice(colon).matchAll(/\d+/g)];
        if (d) nums.forEach((n, k) => {
          const before2 = t.slice(0, colon + n.index);
          const which = /mental\s*$/i.test(before2) ? "mental" : /psych\s*$/i.test(before2) ? "psych" : k === 0 ? "mental" : "psych";
          const start = at4 + colon + n.index;
          out.push({
            line,
            start,
            end: start + n[0].length,
            against: { def: which },
            base: d[which],
            words: nums.length === 1 ? `Defend ${d[which]}` : `${which} ${d[which]}`
          });
        });
      } else if (r.mark === "act") {
        const a = action(t), colon = t.indexOf(":") + 1, b = a && /[+\-−–]?\d+/.exec(t.slice(colon));
        if (a && b) out.push({
          line,
          start: at4 + colon + b.index,
          end: at4 + colon + b.index + b[0].length,
          against: { act: a.label },
          base: a.base,
          words: `${a.label} ${a.base}`
        });
      } else if (r.mark === "fld") {
        const f = field(t);
        if (f) {
          out.push({ line, start: at4, end: at4 + len, against: { fld: f.name }, base: f.level + value2, words: f.name + plus(f.level) });
          fieldLevel = f.level;
          sawField = true;
        }
      } else if (r.mark === "skl") {
        const many = skillsLine(t);
        if (many) {
          for (const k of many.skills) out.push({ line, start: at4 + k.start, end: at4 + k.end, against: { skl: k.name }, base: many.level + value2, words: k.name + plus(many.level) });
          fieldLevel = null;
        } else if (fieldLevel !== null) {
          const level2 = fieldLevel + (/^\s*✓/.test(t) ? 1 : 0), name2 = skillName(t);
          if (name2) out.push({ line, start: at4, end: at4 + len, against: { skl: name2 }, base: level2 + value2, words: name2 + plus(level2) });
        }
      } else onlySkills = false;
      at4 += len;
    }
    if (!sawField && !onlySkills && plain(l).trim()) fieldLevel = null;
  });
  return out;
}
function pointed(front, against, att = "Cha") {
  const key = JSON.stringify(against);
  return points2(front, att).find((p) => JSON.stringify(p.against) === key) ?? null;
}

// src/rules/influence.ts
var LEVELS2 = [
  { word: "Min", name: "Minor", points: 2 },
  { word: "Sig", name: "Significant", points: 4 },
  { word: "Maj", name: "Major", points: 6 },
  { word: "Ext", name: "Extreme", points: 8 },
  { word: "Exq", name: "Exquisite", points: 10 }
];
var MIN = 2;
var STEP = 2;
function raiseChip(chip2) {
  return { ...chip2, points: chip2.points === 1 ? 2 : chip2.points + STEP };
}
function lowerChip(chip2) {
  if (chip2.points <= 1) return null;
  if (chip2.points === 2) return { ...chip2, points: 1, rider: false };
  return { ...chip2, points: chip2.points - STEP };
}
function raiseCard(card2) {
  return { ...card2, points: card2.points + STEP };
}
function lowerCard(card2) {
  return { ...card2, points: Math.max(MIN, card2.points - STEP) };
}
function levelName(points3) {
  if (points3 < MIN) return String(points3);
  return LEVELS2[Math.floor(points3 / STEP) - 1]?.word ?? String(points3);
}
var ROW_LEVELS = { mild: 1, min: 1, sig: 2, maj: 3 };
function rowLevels(row2) {
  return ROW_LEVELS[row2];
}
var ROOM = [
  // level, mild, min, sig, absorb
  [15, 2, 2, 2, 3],
  [11, 2, 2, 1, 2],
  [10, 1, 2, 1, 2],
  [9, 1, 2, 1, 1],
  [7, 0, 2, 1, 1],
  [5, 0, 2, 0, 1],
  [3, 0, 2, 0, 0],
  [1, 0, 1, 0, 0]
];
function room(level2) {
  const [, mild, min2, sig, absorb2] = ROOM.find((r) => level2 >= r[0]) ?? [0, 0, 0, 0, 0];
  const one = level2 <= -2 ? ["mild", "min"] : level2 === -1 ? ["mild"] : [];
  return { boxes: { mild, min: min2, sig, maj: 0 }, absorb: absorb2, one };
}
function slotWorth(char, d, row2) {
  return columnRoom(char, d)?.one.includes(row2) ? 1 : rowLevels(row2) * STEP;
}
function columnRoom(char, d) {
  const name2 = d === "injury" ? "Con" : "Wis";
  for (const m of marks(parse(char.front), "att")) {
    const level2 = attributes(m.text)[name2];
    if (level2 !== void 0) return room(level2);
  }
  return null;
}

// src/rules/absorb.ts
var COLUMN_OF = { phys: "injury", mental: "bias", psych: "affliction" };
var OVERFLOW = { bias: "Conviction", affliction: "Burden", injury: "Condition" };
var isLasting = (d) => LASTING.includes(d);
var TOPS = [2, 6, 12, 20, 30];
function lastingLevels(points3) {
  if (points3 <= 0) return 0;
  const k = TOPS.findIndex((t) => points3 <= t);
  return k < 0 ? TOPS.length : k + 1;
}
function lastingTop(points3) {
  return TOPS[Math.max(lastingLevels(points3), 1) - 1];
}
function waitsIn(char, d, row2) {
  return row2 !== "lasting" ? char.back.damage[d][row2] : isLasting(d) ? char.back.lasting?.[d] : void 0;
}
var none = () => ({ mild: 0, min: 0, sig: 0, maj: 0 });
function boxCount(char, d, row2) {
  const s = char.back.damage[d][row2], room2 = columnRoom(char, d);
  return room2 ? Math.max(room2.boxes[row2], s.boxes.lastIndexOf(true) + 1) : s.boxes.length;
}
var namedFree = (s) => !s.name && !s.naming;
function free(char, d) {
  const out = none();
  for (const row2 of ROWS) {
    const s = char.back.damage[d][row2], n = boxCount(char, d, row2);
    out[row2] = (namedFree(s) ? 1 : 0) + Array.from({ length: n }, (_, k) => !s.boxes[k]).filter(Boolean).length;
  }
  return out;
}
var total = (use, size) => ROWS.reduce((a, r) => a + use[r] * size(r), 0);
var slots = (use) => ROWS.reduce((a, r) => a + use[r], 0);
function pages(char, kind, result) {
  const d = COLUMN_OF[kind], left = result - (columnRoom(char, d)?.absorb ?? 0);
  const size = (r) => slotWorth(char, d, r), sum2 = (use) => total(use, size);
  if (left <= 0) return [{ use: none(), overflow: 0 }];
  const avail = free(char, d), found = [];
  const walk = (i, use) => {
    if (i === ROWS.length) {
      const used = ROWS.filter((r) => use[r] > 0);
      if (!used.length) return;
      const got = sum2(use), smallest = Math.min(...used.map(size));
      if (got >= left && got - smallest < left) found.push({ use: { ...use }, overflow: 0 });
      return;
    }
    const row2 = ROWS[i];
    for (let n = 0; n <= avail[row2]; n++) walk(i + 1, { ...use, [row2]: n });
  };
  walk(0, none());
  if (!found.length) return [{ use: avail, overflow: left - sum2(avail) }];
  return found.sort((a, b) => sum2(a.use) - sum2(b.use) || slots(a.use) - slots(b.use));
}
function same2(a, b) {
  return a.overflow === b.overflow && ROWS.every((r) => a.use[r] === b.use[r]);
}
function fill(char, kind, page, by) {
  const d = COLUMN_OF[kind], column2 = { ...char.back.damage[d] };
  for (const row2 of ROWS) {
    let n = page.use[row2];
    if (!n) continue;
    const s = column2[row2], n0 = boxCount(char, d, row2);
    const next2 = { ...s, boxes: Array.from({ length: Math.max(s.boxes.length, n0) }, (_, k) => !!s.boxes[k]) };
    if (namedFree(s)) {
      next2.naming = { by: by.name, id: by.id };
      n--;
    }
    for (let k = 0; k < next2.boxes.length && n > 0; k++) if (!next2.boxes[k]) {
      next2.boxes[k] = true;
      n--;
    }
    column2[row2] = next2;
  }
  const back3 = { ...char.back, damage: { ...char.back.damage, [d]: column2 } };
  if (page.overflow <= 0) return { ...char, back: back3 };
  if (isLasting(d)) {
    const was = char.back.lasting?.[d];
    const now2 = was ? { ...was, points: was.points + page.overflow } : { name: "", points: page.overflow, spent: 0, naming: { by: by.name, id: by.id } };
    return { ...char, back: { ...back3, lasting: { ...char.back.lasting, [d]: now2 } } };
  }
  const line = `${OVERFLOW[d]}: ${page.overflow} from ${by.name}'s Attack`;
  return { ...char, back: { ...back3, notes: char.back.notes ? `${char.back.notes}
${line}` : line } };
}
function mildEnds(char) {
  const damage3 = { ...char.back.damage };
  for (const d of DAMAGE) {
    const mild = damage3[d].mild;
    damage3[d] = { ...damage3[d], mild: { name: "", boxes: mild.boxes.map(() => false), spent: [] } };
  }
  return { ...char, back: { ...char.back, damage: damage3 } };
}

// src/rules/yards.ts
var NUMBERED = /^Graveyard (\d+)$/;
function empty() {
  return { yards: [{ name: "Graveyard 1", named: false, items: [] }] };
}
function nextName(y) {
  const ns = y.yards.flatMap((g) => {
    const m = NUMBERED.exec(g.name);
    return m ? [Number(m[1])] : [];
  });
  return `Graveyard ${Math.max(0, ...ns) + 1}`;
}
var vacant = (g) => g.items.length === 0 && !g.named;
function sweep(y, at4, cur) {
  if (y.yards.length < 2 || !vacant(y.yards[at4])) return { yards: y, cur };
  const yards = { yards: y.yards.filter((_, i) => i !== at4) };
  return { yards, cur: Math.min(cur > at4 ? cur - 1 : cur, yards.yards.length - 1) };
}
var withYard = (y, at4, g) => ({ yards: y.yards.map((x, i) => i === at4 ? g : x) });
function burialOf(piece2, all2) {
  if (piece2.kind === "docket") return [piece2, ...all2.flatMap((r) => !("pin" in r) || r.pin?.card !== piece2.oid ? [] : r.kind === "character" ? burialOf(r, all2) : [r])];
  if (piece2.kind !== "character") return [piece2];
  const oid = piece2.oid;
  const inSlot3 = (r) => (r.kind === "chip" || r.kind === "influence") && typeof r.where === "object" && "slot" in r.where && r.where.slot === oid;
  return [piece2, ...all2.filter((r) => r.kind === "influence" && r.home === oid || inSlot3(r) || isPinnable(r) && r.pin?.card === oid)];
}
function putAway(piece2, all2) {
  const whole = burialOf(piece2, all2), mine = (r) => r.kind === "tornroll" || isPaper(r) && !!r.mine;
  return { shared: whole.filter((r) => !mine(r)), own: whole.filter(mine) };
}
function bury(y, cur, records3, name2) {
  const g = y.yards[cur];
  return withYard(y, cur, { ...g, items: [...g.items, { name: name2, records: records3 }] });
}
function buryInfo(y, cur, name2, info, gm) {
  const g = y.yards[cur];
  return withYard(y, cur, { ...g, items: [...g.items, { name: `${name2.trim() || "Nameless"}: Info card`, records: [], info, gm }] });
}
function withInfo(c, info) {
  const cards = [...c.info ?? []], k = Math.min(info.k, cards.length);
  cards.splice(k, 0, info.text);
  return { character: { ...c, info: cards }, k };
}
function lastCard(y, cur, here2) {
  const items = y.yards[cur]?.items ?? [];
  for (let i = items.length - 1; i >= 0; i--) if (items[i].gm && here2(items[i])) return { yard: cur, item: i };
  return null;
}
function buryRecord(y, cur, holder, of, record, gm) {
  const g = y.yards[cur];
  return withYard(y, cur, { ...g, items: [...g.items, { name: `${holder.trim() || "Nameless"}: Opinion of ${of}`, records: [record], gm }] });
}
function take(y, cur, at4) {
  const g = y.yards[at4.yard], burial2 = g?.items[at4.item];
  if (!g || !burial2) return { yards: y, cur, burial: void 0 };
  return { ...sweep(withYard(y, at4.yard, { ...g, items: g.items.filter((_, i) => i !== at4.item) }), at4.yard, cur), burial: burial2 };
}
function exhume(y, cur, at4) {
  const { burial: burial2, ...b } = take(y, cur, at4);
  return { ...b, records: burial2?.records ?? [], ...burial2?.info ? { info: burial2.info } : {} };
}
function next(y, cur) {
  if (cur < y.yards.length - 1) return sweep(y, cur, cur + 1);
  if (vacant(y.yards[cur])) return { yards: y, cur };
  return { yards: { yards: [...y.yards, { name: nextName(y), named: false, items: [] }] }, cur: cur + 1 };
}
function prev(y, cur) {
  return cur > 0 ? sweep(y, cur, cur - 1) : { yards: y, cur };
}
function rename(y, cur, name2) {
  const g = y.yards[cur], n = name2.trim();
  return sweep(withYard(y, cur, { ...g, name: n, named: n !== "" }), cur, cur);
}
function forget(y, cur, at4) {
  const { burial: _gone, ...b } = take(y, cur, at4);
  return b;
}
function forgetAll(y, cur) {
  return sweep(withYard(y, cur, { ...y.yards[cur], items: [] }), cur, cur);
}
function buryOwn(h, yard, records3, name2) {
  return { hill: [...h.hill, { yard, burial: { name: name2, records: records3 } }] };
}
function ownIn(h, y, cur) {
  const names = new Set(y.yards.map((g) => g.name)), name2 = y.yards[cur]?.name;
  return h.hill.flatMap((o, k) => o.yard === name2 || cur === 0 && !names.has(o.yard) ? [k] : []);
}
function exhumeOwn(h, k) {
  return { hill: forgetOwn(h, k), records: h.hill[k]?.burial.records ?? [] };
}
function forgetOwn(h, k) {
  return { hill: h.hill.filter((_, i) => i !== k) };
}
function forgetOwnIn(h, y, cur) {
  const gone = new Set(ownIn(h, y, cur));
  return { hill: h.hill.filter((_, k) => !gone.has(k)) };
}
function ownTorn(all2, y, h) {
  const puts = [], dels = [];
  for (const [rid2, r] of all2) {
    if (isPiece(rid2) && r.kind === "tornroll") {
      dels.push(rid2);
      puts.push([ridFor(r), r]);
    }
  }
  const tapes = (b) => !b.gm && b.records.length > 0 && b.records.every((r) => r.kind === "tornroll");
  const moved = y?.yards.flatMap((g) => g.items.filter(tapes).map((burial2) => ({ yard: g.name, burial: burial2 }))) ?? [];
  if (y && moved.length) {
    puts.push(["yards", { yards: y.yards.map((g) => ({ ...g, items: g.items.filter((b) => !tapes(b)) })) }]);
    puts.push(["hill", { hill: [...h?.hill ?? [], ...moved] }]);
  }
  return { puts, dels };
}
function ownedTorn(records3) {
  const m = new Map(records3), { puts, dels } = ownTorn(records3, m.get("yards"), m.get("hill"));
  for (const rid2 of dels) m.delete(rid2);
  for (const [rid2, r] of puts) m.set(rid2, r);
  return [...m];
}
var firstLine = (marked2) => marked2.replace(/<[^>]*>/g, "").split("\n").find((l) => l.trim())?.trim().slice(0, 28) || "\u2026";
function graveName(piece2) {
  switch (piece2.kind) {
    case "character":
      return piece2.name.trim() || "Nameless";
    case "sticky":
      return `Note: ${firstLine(piece2.text)}`;
    case "text":
      return `Writing: ${firstLine(piece2.text)}`;
    case "docket":
      return `Docket: ${piece2.name.trim()}`;
    // R544
    case "tornroll": {
      const n = piece2.receipts.length;
      return `Tape: ${n} roll${n === 1 ? "" : "s"}${n ? `, last ${piece2.receipts[0].title}` : ""}`;
    }
    default:
      return "Image";
  }
}
function raised(records3, at4, z) {
  const lead = records3[0];
  if (!lead) return [];
  const anchor = lead.kind === "character" ? lead.pool : "place" in lead ? lead.place : null;
  if (!anchor) return records3;
  const grab = lead.kind === "character" ? GRAB_POOL : GRAB_PIECE;
  const dx = Math.round(at4.x - grab.x - anchor.x), dy = Math.round(at4.y - grab.y - anchor.y);
  const moved = (p) => ({ ...p, x: p.x + dx, y: p.y + dy, z });
  return records3.map((r) => r.kind === "character" ? { ...r, pool: moved(r.pool), card: moved(r.card) } : "place" in r ? { ...r, place: moved(r.place) } : r);
}
var GRAB_POOL = { x: 30, y: 14 };
var GRAB_PIECE = { x: 20, y: 14 };

// src/rules/dockets.ts
var RADIUS = 14;
var CORD = 3;
var PILE_STEP = 5;
var PILE_GAP = 6;
var cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
function hull(points3) {
  const ps = [...new Map(points3.map((p) => [`${p.x},${p.y}`, p])).values()].sort((a, b) => a.x - b.x || a.y - b.y);
  if (ps.length < 3) return ps;
  const half = (list2) => {
    const h2 = [];
    for (const p of list2) {
      while (h2.length >= 2 && cross(h2[h2.length - 2], h2[h2.length - 1], p) <= 0) h2.pop();
      h2.push(p);
    }
    h2.pop();
    return h2;
  };
  const h = [...half(ps), ...half([...ps].reverse())];
  return area(h) < 0 ? h.reverse() : h;
}
function area(h) {
  let a = 0;
  h.forEach((p, i) => {
    const q = h[(i + 1) % h.length];
    a += p.x * q.y - q.x * p.y;
  });
  return a;
}
var corners = (b) => [{ x: b.left, y: b.top }, { x: b.right, y: b.top }, { x: b.right, y: b.bottom }, { x: b.left, y: b.bottom }];
function tapeOf(boxes) {
  return { hull: hull(boxes.flatMap(corners)), r: RADIUS };
}
function path(t) {
  const { hull: h, r } = t, f = (n) => Math.round(n * 10) / 10;
  if (!h.length) return "";
  if (h.length === 1) {
    const p = h[0];
    return `M${f(p.x - r)},${f(p.y)}a${r},${r} 0 1 0 ${2 * r},0a${r},${r} 0 1 0 ${-2 * r},0Z`;
  }
  const out = (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    return { x: dy / l * r, y: -dx / l * r };
  };
  const arc = `A${r},${r} 0 0 1 `, parts2 = [];
  h.forEach((a, i) => {
    const b = h[(i + 1) % h.length], n = out(a, b);
    const s = { x: a.x + n.x, y: a.y + n.y }, e = { x: b.x + n.x, y: b.y + n.y };
    parts2.push(`${i ? arc : "M"}${f(s.x)},${f(s.y)}L${f(e.x)},${f(e.y)}`);
  });
  const a0 = h[0], n0 = out(a0, h[1]);
  return `${parts2.join("")}${arc}${f(a0.x + n0.x)},${f(a0.y + n0.y)}Z`;
}
function inHull(h, p) {
  if (h.length < 3) return false;
  return h.every((a, i) => cross(a, h[(i + 1) % h.length], p) >= 0);
}
var inBox = (b, p) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
function crosses(a, b, c, d) {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if ((d1 > 0 && d2 < 0 || d1 < 0 && d2 > 0) && (d3 > 0 && d4 < 0 || d3 < 0 && d4 > 0)) return true;
  const on = (p, q, s) => Math.min(p.x, q.x) <= s.x && s.x <= Math.max(p.x, q.x) && Math.min(p.y, q.y) <= s.y && s.y <= Math.max(p.y, q.y);
  return d1 === 0 && on(c, d, a) || d2 === 0 && on(c, d, b) || d3 === 0 && on(a, b, c) || d4 === 0 && on(a, b, d);
}
function toSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
var edges = (ps) => ps.length < 2 ? [] : ps.map((p, i) => [p, ps[(i + 1) % ps.length]]);
function touches(t, box2) {
  const h = t.hull, reach2 = t.r + CORD / 2;
  if (!h.length) return false;
  const xs = h.map((p) => p.x), ys = h.map((p) => p.y);
  if (box2.right < Math.min(...xs) - reach2 || box2.left > Math.max(...xs) + reach2 || box2.bottom < Math.min(...ys) - reach2 || box2.top > Math.max(...ys) + reach2) return false;
  const c = corners(box2);
  if (c.some((p) => inHull(h, p))) return true;
  if (h.some((p) => inBox(box2, p))) return true;
  const he = edges(h), be = edges(c);
  if (he.some(([a, b]) => be.some(([p, q]) => crosses(a, b, p, q)))) return true;
  const near = Math.min(
    ...h.flatMap((v) => be.map(([p, q]) => toSegment(v, p, q))),
    ...c.flatMap((v) => he.map(([a, b]) => toSegment(v, a, b)))
  );
  return near <= reach2;
}
function aimed(targets, box2) {
  let best = null;
  for (const t of targets) if ((!best || t.z > best.z) && touches(t.tape, box2)) best = t;
  return best?.oid ?? null;
}
function pileKeys(items) {
  return [...items].sort((a, b) => a.z - b.z).flatMap((i) => i.on ? [`${i.rid}#pool`, i.rid, ...i.on] : [i.rid]);
}
function pile(label2, papers) {
  const order2 = [...papers].sort((a, b) => a.z - b.z);
  return new Map(order2.map((p, i) => [p.rid, { x: label2.left + i * PILE_STEP, y: label2.bottom + PILE_GAP + i * PILE_STEP }]));
}
function repin(all2, gm, gone) {
  const labels = /* @__PURE__ */ new Map();
  for (const [, r] of all2) if (r.kind === "docket") labels.set(r.oid, r.place);
  const puts = [], holders = new Map(labels);
  for (const [rid2, r] of all2) {
    if (r.kind !== "character") continue;
    let c = r;
    if (gm && r.pin) {
      const label2 = labels.get(r.pin.card);
      if (!label2 && gone(r.pin.card)) {
        const { pin: _was, ...out } = r;
        c = out;
        puts.push({ rid: rid2, rec: c });
      } else if (label2) {
        const dx = label2.x + r.pin.dx - r.card.x, dy = label2.y + r.pin.dy - r.card.y;
        if (dx || dy) {
          c = { ...r, card: { ...r.card, x: r.card.x + dx, y: r.card.y + dy }, pool: { ...r.pool, x: r.pool.x + dx, y: r.pool.y + dy } };
          puts.push({ rid: rid2, rec: c });
        }
      }
    }
    holders.set(r.oid, c.card);
  }
  for (const [rid2, r] of all2) {
    if (!isPinnable(r) || !r.pin || !(isMine(rid2) || gm && isPiece(rid2))) continue;
    if (!holders.has(r.pin.card)) {
      if (gone(r.pin.card)) {
        const { pin: _was, ...loose } = r;
        puts.push({ rid: rid2, rec: loose });
      }
      continue;
    }
    const h = holders.get(r.pin.card);
    const x = h.x + r.pin.dx, y = h.y + r.pin.dy;
    if (x !== r.place.x || y !== r.place.y) puts.push({ rid: rid2, rec: { ...r, place: { ...r.place, x, y } } });
  }
  return puts;
}

// src/rules/desktops.ts
var game = (r) => r.kind === "connections" || r.kind === "opinion";
function travelers(all2) {
  const out = /* @__PURE__ */ new Set();
  for (const r of all2) {
    if (r.kind === "character" && r.owner !== GM) out.add(r.oid);
    else if (isPaper(r) && r.by && r.by !== GM) out.add(r.oid);
  }
  const people = new Set(out);
  for (const r of all2) {
    if (r.kind === "influence" && people.has(r.home)) out.add(r.oid);
    if ((r.kind === "chip" || r.kind === "influence") && typeof r.where === "object" && "slot" in r.where && people.has(r.where.slot)) out.add(r.oid);
  }
  for (const r of all2) if (isPinnable(r) && r.pin && out.has(r.pin.card)) out.add(r.oid);
  return out;
}
function spotOf(r) {
  if (r.kind === "character") return { pool: r.pool, card: r.card, gathered: r.gathered };
  return isPaper(r) ? { place: r.place } : null;
}
function at(r, s) {
  if (r.kind === "character" && s.pool && s.card) return { ...r, pool: s.pool, card: s.card, gathered: !!s.gathered };
  if (isPaper(r) && s.place) return { ...r, place: s.place };
  return r;
}
function setOut(desk, all2, to) {
  const from = desk.out ?? 0;
  if (to === from || !desk.desks[to]) return null;
  const table = all2.filter(([rid2, r]) => (isPiece(rid2) || isMine(rid2)) && !game(r) && r.kind !== "reference");
  const go = travelers(table.map(([, r]) => r));
  const spots = {}, top = [], dels = [];
  for (const [rid2, r] of table) {
    if (go.has(r.oid)) {
      const s = spotOf(r);
      if (s) spots[r.oid] = s;
      continue;
    }
    top.push(r);
    dels.push(rid2);
  }
  const there = desk.desks[to];
  const puts = (there.top ?? []).map((r) => ({ rid: ridFor(r), rec: r }));
  for (const [rid2, r] of table) {
    const s = go.has(r.oid) ? there.spots?.[r.oid] : void 0;
    if (s) puts.push({ rid: rid2, rec: at(r, s) });
  }
  const desks = desk.desks.map((d, i) => {
    if (i === from) return { ...d, top, spots: { ...d.spots, ...spots } };
    if (i === to) {
      const { top: _laid, ...rest } = d;
      return rest;
    }
    return d;
  });
  return { desk: { ...desk, desks, out: to }, puts, dels };
}

// src/rules/drawers.ts
function drawers(gm) {
  return gm ? ["characters", "npcs", "papers"] : ["papers"];
}
var LABEL = { characters: "Characters", npcs: "NPCs", papers: "Papers" };
function drawerOf(piece2, gm) {
  if (piece2.kind === "character") {
    if (!gm) return null;
    return piece2.owner === GM ? "npcs" : "characters";
  }
  return isPaper(piece2) ? "papers" : null;
}
var NUMBERED2 = /^Desk (\d+)$/;
var blank = (name2) => ({ name: name2, named: false, items: [] });
function emptyDesk() {
  return { desks: [blank("Desk 1")] };
}
function desksOf(rec) {
  if (!rec) return emptyDesk();
  if ("desk" in rec) return { desks: [{ ...blank("Desk 1"), items: rec.desk }] };
  return rec.desks.length ? rec : emptyDesk();
}
var withDesk = (d, at4, one) => ({ ...d, desks: d.desks.map((x, i) => i === at4 ? one : x) });
function filed(d, at4, drawer2, records3, name2) {
  const one = d.desks[at4];
  return withDesk(d, at4, { ...one, items: [...one.items, { drawer: drawer2, name: name2, records: records3 }] });
}
function takeOut(d, at4, k) {
  const one = d.desks[at4];
  if (!one) return { desk: d, records: [] };
  return { desk: withDesk(d, at4, { ...one, items: one.items.filter((_, i) => i !== k) }), records: one.items[k]?.records ?? [] };
}
function inDrawer(d, at4, drawer2) {
  return (d.desks[at4]?.items ?? []).flatMap((entry, k) => entry.drawer === drawer2 ? [{ k, entry }] : []);
}
function nextName2(d) {
  const ns = d.desks.flatMap((x) => {
    const m = NUMBERED2.exec(x.name);
    return m ? [Number(m[1])] : [];
  });
  return `Desk ${Math.max(0, ...ns) + 1}`;
}
var vacant2 = (d, at4) => {
  const x = d.desks[at4];
  return !x.items.length && !x.named && !x.top?.length && at4 !== (d.out ?? 0);
};
function sweep2(d, at4, cur) {
  if (d.desks.length < 2 || !vacant2(d, at4)) return { desk: d, cur };
  const out = d.out ?? 0;
  const desk = { ...d, desks: d.desks.filter((_, i) => i !== at4), ...out > at4 && { out: out - 1 } };
  return { desk, cur: Math.min(cur > at4 ? cur - 1 : cur, desk.desks.length - 1) };
}
function deskNext(d, cur) {
  if (cur < d.desks.length - 1) return sweep2(d, cur, cur + 1);
  if (vacant2(d, cur)) return { desk: d, cur };
  return { desk: { ...d, desks: [...d.desks, blank(nextName2(d))] }, cur: cur + 1 };
}
function deskPrev(d, cur) {
  return cur > 0 ? sweep2(d, cur, cur - 1) : { desk: d, cur };
}
function deskRename(d, cur, name2) {
  const n = name2.trim();
  return sweep2(withDesk(d, cur, { ...d.desks[cur], name: n, named: n !== "" }), cur, cur);
}
var deskName = (one) => one.name || "Unnamed desk";
function wordsOf(r) {
  const plain2 = (m) => m.replace(/<[^>]*>/g, "");
  switch (r.kind) {
    case "character":
      return [r.front, r.back.notes, ...r.info ?? []].map(plain2).join("\n");
    case "sticky":
    case "text":
      return plain2(r.text);
    case "docket":
      return r.name;
    default:
      return "";
  }
}
function search(d, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const byName = (a, b) => a.entry.name.localeCompare(b.entry.name, void 0, { sensitivity: "base" });
  const all2 = d.desks.flatMap((one, at4) => one.items.map((entry, k) => ({ at: at4, k, entry }))).sort(byName);
  if (!words.length) return all2;
  const has = (text) => {
    const t = text.toLowerCase();
    return words.every((w) => t.includes(w));
  };
  const named4 = all2.filter((e) => has(e.entry.name));
  const worded = all2.filter((e) => !has(e.entry.name) && has(e.entry.records.map(wordsOf).join("\n")));
  return [...named4, ...worded];
}

// src/rules/ownership.ts
var own = (viewer, c) => !!viewer && c.owner === (viewer.gm ? GM : viewer.name);
function click(viewer, c) {
  if (!viewer) return { refused: "Only someone at the table can take a character." };
  if (c.owner === OPEN) return { owner: viewer.gm ? GM : viewer.name };
  if (viewer.gm || own(viewer, c)) return { dock: true };
  return { refused: `${c.name} is ${c.owner === GM ? "the GM's" : `${c.owner}'s`}.` };
}
function shiftClick(viewer, c) {
  if (viewer && (viewer.gm || own(viewer, c))) return { owner: OPEN };
  return { refused: `${c.name} isn't yours to open.` };
}
function mayChange(viewer, before2, after) {
  if (viewer?.gm) return true;
  if (!viewer) return false;
  const mine = (c) => c.owner === viewer.name || c.owner === OPEN;
  if (before2 && !mine(before2)) return false;
  return !after || mine(after);
}
function mayWrite(viewer, c) {
  return !!viewer && (viewer.gm || c.owner !== OPEN && c.owner === viewer.name);
}
function rewrites(before2, after) {
  if (!before2 || !after) return false;
  return before2.front !== after.front || before2.back.notes !== after.back.notes || before2.name !== after.name;
}
function handOver(r, who) {
  const { to, mine, handed: _handed, ...rest } = r, base = { ...rest, by: who };
  if (mine || ownerOf(r) === GM && to && !to.length) return { ...base, handed: true };
  return to ? { ...base, to: to.filter((n) => n !== who) } : base;
}
function takeHanded(all2, self) {
  const out = [];
  for (const [from, r] of all2) {
    if (!isPaper(r) || !r.handed || r.by !== self) continue;
    const { handed: _handed, ...rest } = r;
    const rec = self === GM ? { ...rest, to: [] } : { ...rest, mine: true };
    out.push({ from, rid: ridFor(rec), rec });
  }
  return out;
}
var readers2 = (r) => JSON.stringify([r.to ?? null, r.mine ?? null, r.handed ?? null]);
function reread(a, b) {
  return readers2(a) !== readers2(b);
}
function handsOver(was, rec, who) {
  if (rec.by === void 0) return false;
  if (!was) return !!rec.handed && rec.by !== who;
  return rec.by !== was.by && ownerOf(was) === who && !reread(rec, handOver(was, rec.by));
}

// src/rules/connections.ts
var WORDS = ["Min", "Sig", "Maj", "Ext", "Exq"];
function level(n) {
  return n === 0 ? "0" : `${n > 0 ? "+" : "-"}${WORDS[Math.min(Math.abs(n), 5) - 1]}`;
}
var LEVELS3 = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
var firstLine2 = (front) => (front.split("\n")[0] ?? "").replace(/<[^>]*>/g, "");
function cardName(front) {
  const bare = firstLine2(front).replace(/\([^()]*\)/g, "").replace(/\([^)]*$/, "");
  return bare.split(",")[0].replace(/\s+/g, " ").trim();
}
function groupOf(front) {
  const m = /\(([^()]*)\)/.exec(firstLine2(front));
  return m?.[1]?.trim() || void 0;
}
function named(c) {
  const name2 = c.name.trim();
  return c.owner === GM && !!name2 && name2 !== "Name";
}
function keep(t, c, id) {
  if (!named(c)) return t;
  const g = groupOf(c.front);
  if (g) return t.rows.some((r) => r.group && r.name === g) ? t : { ...t, rows: [...t.rows, { id, name: g, group: true }] };
  const name2 = c.name.trim();
  const mine = t.rows.find((r) => r.oid === c.oid) ?? t.rows.find((r) => !r.oid && !r.group && r.name === name2);
  if (!mine) return { ...t, rows: [...t.rows, { id, name: name2, oid: c.oid }] };
  if (mine.name === name2 && mine.oid === c.oid) return t;
  return { ...t, rows: t.rows.map((r) => r === mine ? { ...r, name: name2, oid: c.oid } : r) };
}
function regroup(front, to) {
  const lines2 = front.split("\n");
  lines2[0] = lines2[0].replace(/\(([^()]*)\)/, `(${to})`);
  return lines2.join("\n");
}
function rename2(t, id, name2, chars) {
  const row2 = t.rows.find((r) => r.id === id), to = name2.trim();
  if (!row2 || row2.name === to) return { table: t, changed: [] };
  if (!to) {
    const cells = Object.fromEntries(Object.entries(t.cells).filter(([k]) => !k.split(">").includes(id)));
    return { table: { ...t, rows: t.rows.filter((r) => r !== row2), cells }, changed: [] };
  }
  const table = { ...t, rows: t.rows.map((r) => r === row2 ? { ...r, name: to } : r) };
  const changed = row2.group ? chars.filter((c) => c.owner === GM && groupOf(c.front) === row2.name).map((c) => ({ ...c, front: regroup(c.front, to) })) : chars.filter((c) => c.oid === row2.oid).map((c) => ({ ...c, name: to }));
  return { table, changed };
}
var cell = (t, row2, col) => t.cells[`${row2}>${col}`] ?? 0;
function set(t, row2, col, n) {
  const { [`${row2}>${col}`]: _was, ...cells } = t.cells;
  return { ...t, cells: n ? { ...cells, [`${row2}>${col}`]: n } : cells };
}
function order(rows) {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, void 0, { sensitivity: "base" }));
}
function newConnections(oid, place3) {
  return { kind: "connections", oid, place: place3, rows: [], cells: {} };
}
var UNTON = ["Obed", "Beatrice", "Eliza", "Maggie", "Devreux", "Jake", "Jameson", "Jephthah"];
var UNTON_LEVELS = [
  [0, 2, 1, 1, -1, 1, -1, 1],
  [2, 0, 1, 0, -1, 0, 0, 1],
  [0, 1, 0, 1, 1, -1, -1, 0],
  [1, 0, 1, 0, 0, -1, -2, 0],
  [-1, 0, 1, 0, 0, -2, 0, -1],
  [1, 0, -1, -1, -2, 0, 1, 1],
  [-1, 0, 0, -1, 0, 1, 0, -2],
  [1, 1, 0, 0, -2, 1, -1, 0]
];
function seed(oid, place3, devreux) {
  const id = (k) => `c000000${k + 1}`;
  const rows = UNTON.map((name2, k) => ({ id: id(k), name: name2, ...name2 === "Devreux" && { oid: devreux } }));
  let t = { ...newConnections(oid, place3), away: true, rows };
  UNTON_LEVELS.forEach((row2, a) => row2.forEach((n, b) => {
    t = set(t, id(a), id(b), n);
  }));
  return t;
}
var tableOf = (records3) => records3.find((r) => r.kind === "connections");
var LEVEL_OF = { Min: 1, Sig: 2, Maj: 3, Ext: 4, Exq: 5 };
function fixed(line) {
  const m = /(?:^|\s)(?:([+-])(Min|Sig|Maj|Ext|Exq)\b|0(?=\s|$))/.exec(line.replace(/\([^)]*\)/g, " "));
  return m ? m[1] ? (m[1] === "-" ? -1 : 1) * LEVEL_OF[m[2]] : 0 : void 0;
}
function connection(text) {
  const all2 = text.split("\n").map(fixed).filter((n) => n !== void 0);
  return Math.max(0, ...all2) + Math.min(0, ...all2);
}
var skillName2 = (s) => s.replace(/\([^)]*\)/g, "").replace(/[✓†]/g, "").replace(/\s\d+\s*$/, "").trim();
function skills(front) {
  const out = /* @__PURE__ */ new Map();
  const add = (name2, n) => {
    const k = skillName2(name2);
    if (k && (out.get(k) ?? -1) < n) out.set(k, n);
  };
  let under = 0;
  for (const raw of front.split("\n")) {
    const text = raw.replace(/<[^>]*>/g, "");
    if (raw.startsWith("<fld>")) {
      under = field(text)?.level ?? 0;
      continue;
    }
    if (!raw.startsWith("<skl>")) continue;
    const line = skillsLine(text);
    if (line) {
      for (const p of line.skills) add(p.name, line.level);
      continue;
    }
    const own2 = /\s(\d+)\s*$/.exec(text.replace(/\([^)]*\)/g, ""));
    add(text, own2 ? Number(own2[1]) : under);
  }
  return out;
}
var respectLevel = (names, pc) => 1 + (names.some((n) => (pc.get(n) ?? 0) >= 2) ? 2 : 0);
function respect(npc, pc) {
  const theirs = skills(npc), mine = skills(pc), common = [...mine.keys()].filter((k) => theirs.has(k));
  return common.length ? `Professional Respect (${common.join(", ")}) ${level(respectLevel(common, mine))}` : void 0;
}
var RESPECT = /^(\s*Professional Respect\s*)\(([^)]*)\)\s*(?:[+-](?:Min|Sig|Maj|Ext|Exq)\b|0\b)?(.*)$/;
function respected(text, pc) {
  const mine = skills(pc);
  return text.split("\n").flatMap((line) => {
    const m = RESPECT.exec(line);
    if (!m) return [line];
    const names = m[2].split(",").map((n) => n.trim()).filter(Boolean);
    return names.length ? [`${m[1]}(${names.join(", ")}) ${level(respectLevel(names.map(skillName2), mine))}${m[3]}`] : [];
  }).join("\n");
}
function rowOf(t, c) {
  const g = groupOf(c.front);
  return t.rows.find((r) => g ? r.group && r.name === g : r.oid === c.oid);
}
var pcsOf = (chars) => order(chars.filter((c) => c.owner !== GM && c.owner !== OPEN));
function first(t, records3, holder, of, npc, pc) {
  if (!pc) return `Opinion ${level(cell(t, holder, of))}`;
  const known = t.rows.flatMap((r) => {
    const mine = cell(t, holder, r.id), rec = records3.find((x) => x.holder === r.id && x.of === pc.oid);
    return r.id !== holder && mine && rec ? [{ mine, theirs: connection(rec.text) }] : [];
  });
  known.sort((a, b) => Math.abs(b.mine) - Math.abs(a.mine) || Math.abs(b.theirs) - Math.abs(a.theirs) || b.theirs - a.theirs);
  const best = known[0];
  const lines2 = [best ? `Reputation ${level(best.mine < 0 ? -best.theirs : best.theirs)}` : "Reaction ?"];
  const pr = respect(npc.front, pc.front);
  return [...lines2, ...pr ? [pr] : []].join("\n");
}
function synced(t, r) {
  return { ...t, cells: { ...t.cells, [`${r.holder}>${r.of}`]: connection(r.text) } };
}
var DEFAULT_REACTION = [-2, -1, 0, 0, 1, 2];
var reactionOf = (d62) => DEFAULT_REACTION[d62 - 1] ?? 0;
var AWAITING = /^\s*Reaction \?\s*$/;
var awaits = (text) => text.split("\n").some((l) => AWAITING.test(l));
function reacted(text, n) {
  const lines2 = text.split("\n"), k = lines2.findIndex((l) => AWAITING.test(l));
  if (k >= 0) lines2[k] = `Reaction ${level(n)}`;
  return lines2.join("\n");
}
function recordOf(records3, t, npc, of) {
  const row2 = rowOf(t, npc);
  return row2 && records3.find((r) => r.holder === row2.id && r.of === of);
}
function opinionItems(rec) {
  return rec.text.split("\n").flatMap((line, k) => {
    const text = line.trim();
    return text ? [{ line: k, label: "", text, key: `o${rec.oid}:${text}`, cat: "opinions" }] : [];
  });
}
var revealed = (rec) => (rec.shown ?? []).map((t) => `o${rec.oid}:${t}`);
function published(t, chars, rec) {
  const { on: _o, name: _n, shown: shown3, ...rest } = rec;
  if (!shown3?.length) return rest;
  const on = chars.filter((c) => c.owner === GM && rowOf(t, c)?.id === rec.holder).map((c) => c.oid).sort();
  return { ...rest, shown: shown3, on, name: nameOf(t, chars, rec.of) };
}
function recordsOn(records3, c, t) {
  if (!t) return records3.filter((r) => r.on?.includes(c.oid));
  const row2 = rowOf(t, c);
  return row2 ? records3.filter((r) => r.holder === row2.id) : [];
}
function nameOf(t, chars, of) {
  return t.rows.find((r) => r.id === of)?.name ?? chars.find((c) => c.oid === of)?.name ?? "?";
}
function candidates(t, records3, holder, chars) {
  const has = new Set(records3.filter((r) => r.holder === holder).map((r) => r.of));
  return [
    ...pcsOf(chars).filter((c) => !has.has(c.oid)).map((c) => ({ id: c.oid, name: c.name, pc: true })),
    ...order(t.rows).filter((r) => r.id !== holder && !has.has(r.id)).map((r) => ({ id: r.id, name: r.name, pc: false }))
  ];
}

// src/ui/connections.ts
var el = (doc, tag, cls, text) => {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== void 0) e.textContent = text;
  return e;
};
var characters = (game2) => game2.all().map(([, r]) => r).filter((r) => r.kind === "character");
var tableOf2 = (game2, rid2) => game2.get(rid2);
function connections(e, rid2, w) {
  const doc = e.ownerDocument;
  e.addEventListener("focusout", (ev) => {
    const th = ev.target.closest("th.rowname");
    const t = tableOf2(w.game, rid2);
    if (!th || !t) return;
    const { table, changed } = rename2(t, th.dataset.id, th.textContent ?? "", characters(w.game));
    w.game.change((wr) => {
      wr.put(rid2, table);
      for (const c of changed) wr.put(ridOf(c.oid), c);
    });
    delete e.dataset.drawn;
    sheet(e, table, w);
  });
  e.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && ev.target.closest("th.rowname")) {
      ev.preventDefault();
      ev.target.blur();
    }
  });
  e.addEventListener("click", (ev) => {
    const td = ev.target.closest("td.cell");
    e.querySelector(".levels")?.remove();
    if (!td) return;
    const pick = el(doc, "div", "levels");
    for (const n of LEVELS3) {
      const b = el(doc, "button", n === 0 ? "zero" : n > 0 ? "pos" : "neg", level(n));
      b.addEventListener("click", (ev2) => {
        ev2.stopPropagation();
        const t = tableOf2(w.game, rid2);
        pick.remove();
        if (t) w.game.change((wr) => wr.put(rid2, set(t, td.dataset.row, td.dataset.col, n)));
      });
      pick.append(b);
    }
    pick.style.left = `${td.offsetLeft}px`;
    pick.style.top = `${td.offsetTop + td.offsetHeight}px`;
    e.append(pick);
  });
}
function sheet(e, t, w) {
  const doc = e.ownerDocument, key = JSON.stringify([t.rows, t.cells, pcs(w.game).map((c) => c.name)]);
  if (e.dataset.drawn === key || doc.activeElement && e.contains(doc.activeElement)) return;
  e.dataset.drawn = key;
  const rows = order(t.rows), players = pcs(w.game);
  const grid = el(doc, "table", "conn"), head = el(doc, "tr");
  head.append(
    el(doc, "th", "corner"),
    ...rows.map((r) => el(doc, "th", `col${r.group ? " group" : ""}`, r.name)),
    ...players.map((c, k) => el(doc, "th", `col pc${k ? "" : " first"}`, c.name))
  );
  grid.append(head);
  for (const r of rows) {
    const tr = el(doc, "tr"), name2 = el(doc, "th", `rowname${r.group ? " group" : ""}`, r.name);
    name2.contentEditable = "true";
    name2.spellcheck = false;
    name2.dataset.id = r.id;
    tr.append(name2);
    for (const c of rows) {
      if (c === r) {
        tr.append(el(doc, "td", "self", "X"));
        continue;
      }
      const n = cell(t, r.id, c.id), td = el(doc, "td", `cell${n > 0 ? " pos" : n < 0 ? " neg" : ""}`, level(n));
      td.dataset.row = r.id;
      td.dataset.col = c.id;
      tr.append(td);
    }
    tr.append(...players.map((c, k) => {
      const n = t.cells[`${r.id}>${c.oid}`];
      return el(doc, "td", `pc${k ? "" : " first"}${n ? n > 0 ? " pos" : " neg" : ""}`, n === void 0 ? "" : level(n));
    }));
    grid.append(tr);
  }
  const old = e.querySelector("table.conn");
  if (old) old.replaceWith(grid);
  else e.prepend(grid);
}
var pcs = (game2) => pcsOf(characters(game2));
function groups(game2) {
  const names = /* @__PURE__ */ new Set();
  for (const [, r] of game2.all()) {
    const p = r;
    if (p.kind === "connections") {
      for (const row2 of p.rows) if (row2.group) names.add(row2.name);
    }
    if (p.kind === "character" && p.owner === GM) {
      const g = groupOf(p.front);
      if (g) names.add(g);
    }
  }
  return order([...names].map((name2) => ({ name: name2 }))).map((g) => g.name);
}
function typed(text) {
  const line = text.innerText.split("\n")[0] ?? "", open = line.lastIndexOf("(");
  return open >= 0 && !line.slice(open).includes(")") ? line.slice(open + 1) : void 0;
}
function groupChooser(text, w, gmCard) {
  const doc = text.ownerDocument;
  let list2 = null, at4 = 0;
  const close = () => {
    list2?.remove();
    list2 = null;
  };
  const choices = () => {
    const so = typed(text) ?? "", all2 = groups(w.game).filter((g) => g.toLowerCase().includes(so.trim().toLowerCase()));
    return { so, all: all2 };
  };
  const choose2 = (name2) => {
    const { so } = choices();
    close();
    text.focus();
    for (let k = 0; k < so.length; k++) doc.execCommand("delete");
    doc.execCommand("insertText", false, `${name2.trim()})`);
  };
  const show = () => {
    if (typed(text) === void 0) {
      close();
      return;
    }
    const { so, all: all2 } = choices(), obj2 = text.closest(".obj");
    if (!list2) {
      list2 = el(doc, "div", "groups");
      obj2.append(list2);
    }
    at4 = Math.min(at4, Math.max(0, all2.length - 1));
    list2.replaceChildren(...all2.map((g, k2) => {
      const b = el(doc, "button", k2 === at4 ? "on" : "", g);
      b.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
      });
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        choose2(g);
      });
      return b;
    }));
    const typedName = so.trim();
    if (typedName && !all2.some((g) => g.toLowerCase() === typedName.toLowerCase())) list2.append(el(doc, "div", "new", `New group: ${typedName}`));
    const box2 = obj2.getBoundingClientRect(), k = box2.width / obj2.offsetWidth || 1;
    const sel = doc.getSelection(), r = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    const caret = r && r.width + r.height ? r : null;
    list2.style.left = `${caret ? (caret.left - box2.left) / k : 20}px`;
    list2.style.top = `${caret ? (caret.bottom - box2.top) / k + 4 : 40}px`;
  };
  text.addEventListener("input", (ev) => {
    if (!gmCard()) return;
    if (ev.data === "(" || list2) {
      if (ev.data === "(") at4 = 0;
      show();
    }
  });
  text.addEventListener("keydown", (ev) => {
    if (!list2) return;
    const { so, all: all2 } = choices();
    if (ev.key === "Escape") {
      ev.preventDefault();
      close();
    } else if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      at4 = Math.max(0, Math.min(all2.length - 1, at4 + (ev.key === "ArrowDown" ? 1 : -1)));
      show();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      const name2 = all2.length ? all2[at4] : so;
      if (name2?.trim()) choose2(name2);
      else close();
    }
  });
  text.addEventListener("focusout", () => close());
}

// src/rules/visibility.ts
function canSee(viewer, character2) {
  return !!viewer?.gm || character2.owner === OPEN || !!viewer && character2.owner === viewer.name;
}
var blank2 = (text) => text.replace(/[^\n]/g, "");
function blankInfo(info, shown3) {
  const keep2 = new Set(clues(info).filter((e) => shown3.has(e.key)).map((e) => e.line));
  return info.split("\n").map((l, k) => keep2.has(k) ? l : "").join("\n");
}
function blankFront(c) {
  const shown3 = new Set(c.shown ?? []), out = c.front.split("\n").map(() => ""), by = /* @__PURE__ */ new Map();
  for (const e of entries(c.front)) {
    if (!shown3.has(e.key)) continue;
    by.set(e.line, [...by.get(e.line) ?? [], e]);
    if (e.head !== void 0) out[e.head] = c.front.split("\n")[e.head];
  }
  for (const [k, es] of by) {
    const words = (es[0].label ? `${es[0].label} ` : "") + es.map((e) => e.text).join(", ");
    const mark2 = parse(c.front.split("\n")[k])[0].find((r) => typeof r !== "string");
    out[k] = mark2 && typeof mark2 !== "string" ? `<${mark2.mark}>${words}</${mark2.mark}>` : words;
  }
  return out.join("\n");
}
var blankBack = (b) => ({
  notes: blank2(b.notes),
  absorb: { bias: 0, affliction: 0, injury: 0 },
  damage: damageSlots((d, r) => ({ name: "", boxes: b.damage[d][r].boxes.map(() => false), spent: [] }))
});
var inSlot = (i) => typeof i.where === "object" && "slot" in i.where;
var poolOf = (i, chars) => typeof i.where === "object" && "slot" in i.where ? chars(i.where.slot) : void 0;
function contribution(i, chars) {
  const pool = poolOf(i, chars);
  if (!pool) return false;
  if (i.kind === "chip") return !!i.by && i.by !== pool.owner;
  const home = chars(i.home);
  return !!home && home.owner !== pool.owner;
}
function reads(viewer, p) {
  if (p.mine || p.handed) return !!viewer && !viewer.gm && viewer.name === p.by;
  if (!p.to) return true;
  return !!viewer && (viewer.gm || viewer.name === p.by || p.to.includes(viewer.name));
}
function redactPiece(r, viewer, chars) {
  if (isPaper(r)) return reads(viewer, r) ? r : void 0;
  if (r.kind === "connections") return viewer?.gm ? r : void 0;
  if (r.kind === "opinion") {
    if (viewer?.gm) return r;
    const shown3 = new Set(r.shown ?? []);
    return shown3.size ? { ...r, text: r.text.split("\n").map((l) => shown3.has(l.trim()) ? l : "").join("\n") } : void 0;
  }
  if (r.kind === "character") {
    if (canSee(viewer, r)) return r;
    const shown3 = new Set(r.shown ?? []);
    const hidden = { ...r, front: blankFront(r), back: blankBack(r.back) };
    if (r.info) hidden.info = r.info.map((i) => blankInfo(i, shown3));
    return hidden;
  }
  if (r.kind === "chip" || r.kind === "influence") {
    const pool = poolOf(r, chars);
    const stagger = typeof r.where === "object" && "slot" in r.where && r.where.name === "stagger";
    if (pool && !stagger && !canSee(viewer, pool) && !contribution(r, chars)) return void 0;
  }
  if (r.kind === "influence") {
    const home = chars(r.home);
    if (home && canSee(viewer, home)) return r;
    const { tap: _secret, flag, ...rest } = r;
    return { ...rest, name: "", points: inSlot(r) ? r.points : 0, ...flag && { flag: { why: flag.why } } };
  }
  return r;
}
function redact(record, viewer, chars) {
  if ("kind" in record) return redactPiece(record, viewer, chars);
  if ("yards" in record) return redactYards(record, viewer, chars);
  if ("rows" in record) return viewer?.gm ? record : { rows: Object.fromEntries(Object.entries(record.rows).filter(([, r]) => !r.priv)) };
  if ("set" in record && !viewer?.gm) return { set: record.set, total: 0 };
  return record;
}
function redactYards(y, viewer, chars) {
  return {
    yards: y.yards.map((g) => ({
      ...g,
      items: g.items.flatMap((b) => {
        if (b.gm) return [viewer?.gm ? b : { name: "GM card", records: [], gm: b.gm }];
        const buried = new Map(b.records.filter((r) => r.kind === "character").map((c) => [c.oid, c]));
        const look = (oid) => buried.get(oid) ?? chars(oid);
        if (b.records.length && b.records.every((r) => isPaper(r) && !reads(viewer, r))) return [];
        return [{ ...b, records: b.records.map((r) => redactPiece(r, viewer, look)).filter((r) => !!r) }];
      })
    }))
  };
}

// src/ui/eyes.ts
var CATEGORIES = [
  { key: "skills", word: "Skills" },
  { key: "resources", word: "Resources" },
  { key: "motivations", word: "Motivations" },
  { key: "items", word: "Items" },
  { key: "opinions", word: "Opinions" }
];
var revealable = (c) => [entries(c.front), ...(c.info ?? []).map(clues)].flat().map((e) => e.key);
function withShown(c, keys2) {
  const here2 = new Set(revealable(c)), shown3 = [...new Set(keys2)].filter((k) => here2.has(k));
  const { shown: _, ...rest } = c;
  return shown3.length ? { ...rest, shown: shown3 } : rest;
}
var Eyes = class {
  #open = /* @__PURE__ */ new Map();
  #game;
  #changed;
  constructor(game2, changed) {
    this.#game = game2;
    this.#changed = changed;
  }
  /** R388: whether any eye is open. */
  any() {
    return this.#open.size > 0;
  }
  /** The draft of an open card's revealed entries, by key; undefined when its eye is shut. */
  draft(oid) {
    return this.#open.get(oid)?.draft;
  }
  /** The category washed on an open card, if one was picked. */
  cat(oid) {
    return this.#open.get(oid)?.cat ?? null;
  }
  /** Opens a card's eye, its draft begun from what is shown; a category washes its unrevealed lines (R393). */
  open(oid, cat = null) {
    const was = this.#open.get(oid), c = this.#card(oid);
    if (!c) return;
    this.#open.set(oid, { draft: was?.draft ?? /* @__PURE__ */ new Set([...c.shown ?? [], ...this.#records(c).flatMap(revealed)]), cat });
    this.#changed(oid);
  }
  /** In the Infer state, a click on an entry (by key) reveals it or hides it again. */
  toggle(oid, key) {
    const o = this.#open.get(oid), c = this.#card(oid);
    if (!o || !c || ![...revealable(c), ...this.#records(c).flatMap((r) => opinionItems(r).map((e) => e.key))].includes(key)) return;
    if (!o.draft.delete(key)) o.draft.add(key);
    this.#changed(oid);
  }
  /** Shuts the eye, writing the draft to the card when it changed what is shown. */
  shut(oid) {
    const o = this.#open.get(oid), c = this.#card(oid);
    this.#open.delete(oid);
    if (o && c) {
      const next2 = withShown(c, o.draft), recs = this.#shownRecords(c, o.draft);
      const card2 = JSON.stringify(next2.shown ?? []) !== JSON.stringify(c.shown ?? []);
      if (card2 || recs.length) this.#game.change((w) => {
        if (card2) w.put(ridOf(oid), next2);
        for (const r of recs) w.put(ridOf(r.oid), r);
      });
    }
    this.#changed(oid);
  }
  /** The eye's click: open it, or shut it. */
  flip(oid) {
    if (this.#open.has(oid)) this.shut(oid);
    else this.open(oid);
  }
  /** R436: the records under a card, on the GM's page, by the Connection Table. */
  #records(c) {
    const all2 = this.#game.all().map(([, r]) => r), t = tableOf(all2);
    return t ? recordsOn(all2.filter((r) => r.kind === "opinion"), c, t) : [];
  }
  // R436: each record whose revealed lines the draft changes, with its cards and name as they go out.
  /** The records to write when the eye shuts. */
  #shownRecords(c, draft) {
    const all2 = this.#game.all().map(([, r]) => r), t = tableOf(all2);
    if (!t) return [];
    const chars = all2.filter((r) => r.kind === "character");
    return this.#records(c).flatMap((rec) => {
      const shown3 = opinionItems(rec).filter((e) => draft.has(e.key)).map((e) => e.text);
      const now2 = published(t, chars, shown3.length ? { ...rec, shown: shown3 } : (({ shown: _, ...rest }) => rest)(rec));
      return JSON.stringify(now2) === JSON.stringify(rec) ? [] : [now2];
    });
  }
  #card(oid) {
    const c = this.#game.get(ridOf(oid));
    return c && "kind" in c && c.kind === "character" ? c : void 0;
  }
};

// src/rules/tap.ts
var OPINION_SOURCE = /^o([0-9a-f]{8})\/(.+)$/;
function inOpinion(char, rest, chars) {
  const m = OPINION_SOURCE.exec(rest), rec = m ? chars(m[1]) : void 0;
  if (rec?.kind !== "opinion") return null;
  const lines2 = rec.text.split("\n"), reading = (l) => influence(unadjusted(l));
  const k = lines2.findIndex((l) => {
    const r2 = reading(l);
    return !!r2 && r2.name === m[2] && !!r2.sign && !!r2.level;
  });
  if (k < 0) return null;
  const line = lines2[k], r = reading(line);
  return {
    char,
    name: `${char.name}: ${r.name}`,
    sign: r.sign,
    left: motiveLeft(line),
    mot: true,
    spend: (n) => ({ ...rec, text: lines2.map((l, i) => i === k ? adjust(l, n) ?? l : l).join("\n") })
  };
}
function inFront(char, name2) {
  const lines2 = parse(char.front);
  for (const m of [...marks(lines2, "res"), ...marks(lines2, "mot")]) {
    const r = influence(m.text), mot = m.mark === "mot";
    if (r?.name !== name2 || !r.level) continue;
    const write = (n) => (mot ? adjust(m.text, n) : spend(m.text, n)) ?? m.text;
    return {
      char,
      name: name2,
      sign: r.sign ?? 1,
      left: mot ? motiveLeft(m.text) : levelsOf(r),
      ...mot && { mot: true },
      spend: (n) => ({ ...char, front: serialize(setMark(lines2, m, write(n))) })
    };
  }
  return null;
}
var DAMAGE_SOURCE = new RegExp(`^(${DAMAGE.join("|")})/(${ROWS.join("|")})(?:#(\\d+))?$`);
var LASTING_SOURCE = new RegExp(`^(${LASTING.join("|")})/lasting$`);
function inLasting(char, rest) {
  const m = LASTING_SOURCE.exec(rest), damage3 = m?.[1], l = damage3 && char.back.lasting?.[damage3];
  if (!l?.name) return null;
  const spend2 = (n) => ({ ...char, back: { ...char.back, lasting: { ...char.back.lasting, [damage3]: { ...l, spent: l.spent + n } } } });
  return { char, name: l.name, sign: -1, left: lastingLevels(l.points) - l.spent, damage: damage3, spend: spend2 };
}
function inBack(char, rest) {
  const m = DAMAGE_SOURCE.exec(rest);
  if (!m) return inLasting(char, rest);
  const damage3 = m[1], row2 = m[2], k = m[3] ? Number(m[3]) : 0;
  const slot2 = char.back.damage[damage3][row2];
  if (!slot2.name || k > 0 && !slot2.boxes[k - 1]) return null;
  const spend2 = (n) => {
    const spent = [...slot2.spent];
    spent[k] = (spent[k] ?? 0) + n;
    const column2 = { ...char.back.damage[damage3], [row2]: { ...slot2, spent: Array.from(spent, (x) => x ?? 0) } };
    return { ...char, back: { ...char.back, damage: { ...char.back.damage, [damage3]: column2 } } };
  };
  return {
    char,
    name: slot2.name,
    sign: -1,
    left: rowLevels(row2) - (slot2.spent[k] ?? 0),
    damage: damage3,
    spend: spend2,
    points: Math.min(MIN, slotWorth(char, damage3, row2))
  };
}
function mayTap(viewer, char, rest) {
  if (OPINION_SOURCE.test(rest)) return !!viewer?.gm;
  const s = inBack(char, rest) ?? inFront(char, rest);
  if (!s) return false;
  return !!s.damage || !!s.mot || !!viewer?.gm || char.owner === viewer?.name;
}
function source(chars, id) {
  const colon = id.indexOf(":");
  if (colon < 0) return null;
  const char = chars(id.slice(0, colon));
  if (char?.kind !== "character") return null;
  const rest = id.slice(colon + 1);
  return inOpinion(char, rest, chars) ?? inBack(char, rest) ?? inFront(char, rest);
}
function leftOf(chars, src) {
  return source(chars, src)?.left ?? 0;
}
function tap(chars, src, where2, oid) {
  const s = source(chars, src);
  if (!s || s.left < 1) return null;
  const card2 = {
    kind: "influence",
    oid,
    home: s.char.oid,
    where: where2,
    n: 0,
    name: s.name,
    sign: s.sign,
    points: s.points ?? MIN,
    used: false,
    crit: false,
    tap: { ledger: { [src]: 1 }, current: src },
    ...s.damage && { damage: s.damage },
    ...s.mot && { mot: true }
  };
  return { card: card2, changed: [s.spend(1)] };
}
var PLAIN = "Tapped into a plain card";
var USED = "Tapped into a used card";
var MIXED = "A Resource and a Motivation on one card";
function feed(chars, card2, src, _oid) {
  const id = src ?? card2.tap?.current;
  if (!id) return null;
  const s = source(chars, id);
  if (!s || s.left < 1 || s.damage !== card2.damage) return null;
  if ((s.points ?? MIN) < MIN || card2.points < MIN) return null;
  const why3 = !card2.tap ? PLAIN : card2.used ? USED : !!s.mot !== !!card2.mot ? MIXED : null;
  const ledger = { ...card2.tap?.ledger, [id]: (card2.tap?.ledger[id] ?? 0) + 1 };
  const flag = why3 ? flagged(card2.flag, why3, id, !card2.tap) : card2.flag;
  return { card: { ...card2, points: card2.points + STEP, tap: { ledger, current: id }, ...flag && { flag } }, changed: [s.spend(1)] };
}
function flagged(was, why3, id, plain2) {
  const whys = new Set(was?.why.split("; "));
  whys.add(why3);
  return {
    why: [...whys].join("; "),
    fed: { ...was?.fed, [id]: (was?.fed?.[id] ?? 0) + 1 },
    ...(was?.plain || plain2) && { plain: true }
  };
}
function allowFlag(card2) {
  const { flag: _gone, ...rest } = card2;
  return rest;
}
function undoFlag(chars, card2) {
  const f = card2.flag;
  if (!f?.fed || !card2.tap) return null;
  const out = /* @__PURE__ */ new Map();
  const now2 = (oid) => out.get(oid) ?? chars(oid);
  const ledger = { ...card2.tap.ledger };
  let points3 = card2.points;
  for (const [id, n] of Object.entries(f.fed)) {
    const back3 = source(now2, id)?.spend(-n);
    if (back3) out.set(back3.oid, back3);
    ledger[id] = (ledger[id] ?? 0) - n;
    if (ledger[id] <= 0) delete ledger[id];
    points3 -= n * STEP;
  }
  const { flag: _f, tap: _t, ...rest } = card2;
  const keys2 = Object.keys(ledger);
  const tapped = f.plain && !keys2.length ? rest : { ...rest, tap: { ledger, current: ledger[card2.tap.current] ? card2.tap.current : keys2.at(-1) ?? card2.tap.current } };
  return { card: { ...tapped, points: points3 }, changed: [...out.values()] };
}
function unfeed(chars, card2) {
  const id = card2.tap?.current;
  if (!card2.tap || !id || !(card2.tap.ledger[id] > 0) || card2.points - STEP < MIN) return null;
  const s = source(chars, id);
  if (!s) return null;
  const ledger = { ...card2.tap.ledger, [id]: card2.tap.ledger[id] - 1 };
  return { card: { ...card2, points: card2.points - STEP, tap: { ledger, current: id } }, changed: [s.spend(-1)] };
}
function kill(chars, card2) {
  if (!card2.tap || card2.used) return [];
  const out = /* @__PURE__ */ new Map();
  const now2 = (oid) => out.get(oid) ?? chars(oid);
  for (const [id, n] of Object.entries(card2.tap.ledger)) {
    const s = n > 0 ? source(now2, id) : null;
    const back3 = s?.spend(-n);
    if (back3) out.set(back3.oid, back3);
  }
  return [...out.values()];
}
function recharge(char) {
  const damage3 = damageSlots((d, r) => ({ ...char.back.damage[d][r], spent: [] })), was = char.back.lasting;
  const lasting2 = was && Object.fromEntries(Object.entries(was).map(([d, l]) => [d, { ...l, spent: 0 }]));
  return { ...char, back: { ...char.back, damage: damage3, ...lasting2 && { lasting: lasting2 } } };
}
var MILD = new RegExp(`:(${DAMAGE.join("|")})/mild(?:#\\d+)?$`);
function mildGone(card2) {
  const ledger = card2.tap?.ledger ?? {}, sum2 = (es) => es.reduce((a, [, n]) => a + n, 0);
  const all2 = Object.entries(ledger), rest = all2.filter(([s]) => !MILD.test(s)), lost = sum2(all2) - sum2(rest);
  if (!lost) return card2;
  if (sum2(rest) <= 0) return null;
  const keep2 = Object.fromEntries(rest), current = card2.tap.current in keep2 ? card2.tap.current : rest[0][0];
  return { ...card2, points: Math.max(MIN, card2.points - STEP * lost), tap: { ledger: keep2, current } };
}
function rechargeMotives(char) {
  let lines2 = parse(char.front);
  for (const m of marks(lines2, "mot")) lines2 = setMark(lines2, m, unadjusted(m.text));
  return { ...char, front: serialize(lines2) };
}

// src/ui/gesture.ts
var LONG_MS = 500;
var DRAG_PX = 5;
var real = { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h) };
var shifty = /* @__PURE__ */ new Set();
var pending = /* @__PURE__ */ new Map();
function claim(pointerId) {
  const ups = pending.get(pointerId);
  if (!ups?.size) return false;
  for (const up of [...ups]) up();
  return true;
}
var shifted = (e) => !!(e.shiftKey || e.ctrlKey || e.altKey);
var clickOf = (h, e) => shifted(e) ? h.shift ?? h.click : h.click;
function gesture(el4, h, timers = real) {
  if (h.shift) shifty.add(el4);
  let down = null, long = null, done2 = false;
  const reset = () => {
    const ups = down && pending.get(down.pointerId ?? 0);
    if (ups?.delete(reset) && !ups.size) pending.delete(down.pointerId ?? 0);
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
  const target = el4.ownerDocument ?? globalThis.document ?? el4;
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
    const id = e.pointerId ?? 0;
    pending.set(id, (pending.get(id) ?? /* @__PURE__ */ new Set()).add(reset));
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
    if (e.target !== el4) return;
    e.preventDefault();
    clickOf(h, e)?.(e);
  };
  el4.addEventListener("pointerdown", onDown);
  if (h.click || h.shift) el4.addEventListener("keydown", onKey);
  return () => {
    reset();
    shifty.delete(el4);
    el4.removeEventListener("pointerdown", onDown);
    el4.removeEventListener("keydown", onKey);
  };
}
function paced(schedule, apply3) {
  let pending2 = null;
  const pass = () => {
    if (!pending2) return;
    const { target } = pending2;
    pending2 = null;
    apply3(target);
  };
  return {
    to(target) {
      if (!pending2) schedule(pass);
      pending2 = { target };
    },
    flush: pass,
    cancel() {
      pending2 = null;
    }
  };
}

// src/ui/pens.ts
var PENS = [
  { mark: "act", word: "Action" },
  { mark: "res", word: "Resource" },
  { mark: "mot", word: "Motivation" },
  { mark: "att", word: "Attributes" },
  { mark: "inf", word: "Influence" },
  { mark: "def", word: "Defend" },
  { mark: "fld", word: "Field" },
  { mark: "skl", word: "Skill" },
  { mark: "head", word: "Heading" }
];
function before(a, b) {
  if (a.line !== b.line) return a.line < b.line;
  if (a.run !== b.run) return a.run < b.run;
  return a.offset <= b.offset;
}
function apply(lines2, a, b, tag) {
  const [from, to] = before(a, b) ? [a, b] : [b, a];
  for (const p of [from, to]) {
    const r2 = lines2[p.line]?.[p.run];
    if (r2 && typeof r2 !== "string") return unmark(lines2, p);
  }
  const line = lines2[from.line] ?? [];
  if (from.line === to.line && from.run === to.run && from.offset === to.offset) {
    const r2 = line[from.run], prev2 = line[from.run - 1], next2 = line[from.run + 1];
    if (from.offset === 0 && prev2 && typeof prev2 !== "string") return unmark(lines2, { line: from.line, run: from.run - 1 });
    if (typeof r2 === "string" && from.offset === r2.length && next2 && typeof next2 !== "string") return unmark(lines2, { line: from.line, run: from.run + 1 });
  }
  if (from.line !== to.line || from.run !== to.run) return lines2;
  const r = line[from.run];
  if (typeof r !== "string") return lines2;
  if (from.offset !== to.offset) return mark(lines2, { line: from.line, run: from.run, start: from.offset, end: to.offset }, tag);
  if (tag === "res" || tag === "mot") {
    const each = entries2(r, tag);
    if (each) return replaceRun(lines2, from.line, from.run, each);
  }
  const start = r.length - r.trimStart().length, end = r.trimEnd().length;
  return mark(lines2, { line: from.line, run: from.run, start, end }, tag);
}
function entries2(run2, tag = "res") {
  const parts2 = run2.split(",");
  if (!parts2.every((p) => {
    const r = influence(p);
    return !!r?.level && (tag === "mot" || r.sign === 1);
  })) return null;
  const out = [];
  const plainRun = (s) => {
    if (!s) return;
    const last = out[out.length - 1];
    if (typeof last === "string") out[out.length - 1] = last + s;
    else out.push(s);
  };
  parts2.forEach((p, k) => {
    if (k > 0) plainRun(",");
    const t = p.trim(), at4 = p.indexOf(t);
    plainRun(p.slice(0, at4));
    out.push({ mark: tag, text: t });
    plainRun(p.slice(at4 + t.length));
  });
  return out;
}
function replaceRun(lines2, line, run2, runs) {
  return lines2.map((l, i) => i === line ? [...l.slice(0, run2), ...runs, ...l.slice(run2 + 1)] : l);
}
function heading(lines2, line) {
  for (let i = line - 1; i >= 0; i--) {
    const h = lines2[i].find((r) => typeof r !== "string" && r.mark === "head");
    if (h && typeof h !== "string") return h.text;
  }
  return null;
}
function offered(lines2, line) {
  const l = lines2[line];
  if (!l || l.some((r) => typeof r !== "string")) return null;
  const text = plain(l).trim();
  return text ? offer(text, heading(lines2, line), underField(lines2, line)) : null;
}
function underField(lines2, line) {
  for (let k = line - 1; k >= 0; k--) {
    const marks2 = lines2[k].filter((r) => typeof r !== "string" && !!r.text.trim());
    if (marks2.some((r) => r.mark === "fld")) return true;
    if (marks2.some((r) => r.mark !== "skl")) return false;
  }
  return false;
}
function places(count, k, at4, step) {
  let y = 0;
  return Array.from({ length: count }, (_, i) => {
    if (i === k) return at4;
    if (y + step > at4 && y < at4 + step) y = at4 + step;
    const here2 = y;
    y += step;
    return here2;
  });
}
function selection(t) {
  const sel = t.ownerDocument.getSelection();
  if (!sel?.anchorNode || !sel.focusNode) return null;
  const a = locate(t, sel.anchorNode, sel.anchorOffset), b = locate(t, sel.focusNode, sel.focusOffset);
  return a && b ? [a, b] : null;
}
function caretAt(t, line) {
  const doc = t.ownerDocument, div = t.children[line] ?? t.lastElementChild;
  t.focus();
  if (!div) return;
  const range = doc.createRange();
  range.selectNodeContents(div);
  range.collapse(false);
  const sel = doc.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}
function tray(piece2) {
  const doc = piece2.ownerDocument;
  const box2 = doc.createElement("div");
  box2.className = "pens";
  let last = null;
  const area2 = (n) => (n?.nodeType === 1 ? n : n?.parentElement)?.closest(".writes") ?? null;
  const pens = PENS.map((p) => {
    const b = doc.createElement("button");
    b.className = `pen pen-${p.mark}`;
    b.textContent = p.word;
    b.setAttribute("aria-label", `${p.word} pen`);
    b.dataset.mark = p.mark;
    b.addEventListener("mousedown", (ev) => ev.preventDefault());
    b.addEventListener("pointerdown", (ev) => ev.stopPropagation());
    b.addEventListener("click", () => use(b, p.mark));
    box2.append(b);
    return b;
  });
  function use(b, tag) {
    const t = last;
    const ends = t && selection(t);
    if (!t || !ends) return shake2(b);
    const lines2 = read(t), out = apply(lines2, ends[0], ends[1], tag);
    if (out === lines2) return shake2(b);
    render(out, t);
    t.dispatchEvent(new Event("input", { bubbles: true }));
    caretAt(t, Math.min(ends[0].line, ends[1].line));
    raise();
  }
  function shake2(b) {
    b.animate?.([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }], 200);
  }
  function raise() {
    const t = last, ends = t && t.contains(doc.getSelection()?.anchorNode ?? null) ? selection(t) : null;
    let k = -1, div;
    if (t && ends) {
      const line = ends[1].line, tag = offered(read(t), line);
      k = pens.findIndex((p) => p.dataset.mark === tag);
      if (k >= 0) div = t.children[line];
    }
    pens.forEach((p, i) => p.classList.toggle("offered", i === k && !!div));
    if (!div) {
      for (const p of pens) p.style.removeProperty("--dy");
      return;
    }
    const scale2 = piece2.getBoundingClientRect().height / piece2.offsetHeight || 1;
    const at4 = (div.getBoundingClientRect().top - box2.getBoundingClientRect().top) / scale2;
    const step = pens[1].offsetTop - pens[0].offsetTop;
    places(pens.length, k, at4, step).forEach((y, i) => pens[i].style.setProperty("--dy", `${y - pens[i].offsetTop}px`));
  }
  piece2.addEventListener("focusin", (ev) => {
    const t = area2(ev.target);
    if (t) {
      last = t;
      raise();
    }
  });
  piece2.addEventListener("input", raise);
  piece2.addEventListener("keyup", raise);
  piece2.addEventListener("mouseup", raise);
  return box2;
}
function markFields(front) {
  const lines2 = parse(front);
  lines2.forEach((l, k) => {
    const m = offered(lines2, k);
    if (m !== "fld" && m !== "skl") return;
    const text = plain(l), t = text.trim(), at4 = text.indexOf(t);
    lines2[k] = [text.slice(0, at4), { mark: m, text: t }, text.slice(at4 + t.length)].filter((r) => r !== "");
  });
  return serialize(lines2);
}
function markOlder(game2) {
  const meta = game2.get("meta");
  if (!meta || meta.marked) return null;
  return (w) => {
    for (const [, r] of game2.all()) {
      if (!("kind" in r) || r.kind !== "character") continue;
      const front = markFields(r.front);
      if (front !== r.front) w.put(ridOf(r.oid), { ...r, front });
    }
    w.put("meta", { ...meta, marked: true });
  };
}

// src/ui/receipt.ts
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var two = (n) => String(n).padStart(2, "0");
function when(at4) {
  const d = new Date(at4);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}
var DIE = { W: "White", G: "Green", R: "Red", B: "Blue", Y: "Yellow" };
var CRIT = { max: "maximize", dbl: "double" };
function dieEl(doc, d, k) {
  const e = doc.createElement("span");
  e.className = `rdie ${d.c}${d.added ? " added" : ""}${d.dropped ? " dropped" : ""}`;
  e.textContent = String(d.v);
  e.title = DIE[d.c] + (d.added ? ", exploded" : "") + (d.dropped ? ", removed on a Failure" : "");
  e.style.animationDelay = `${k * 60}ms`;
  return e;
}
function receiptEl(doc, r) {
  const el4 = doc.createElement("div");
  el4.className = r.outcome === "missing" ? "receipt note" : "receipt";
  el4.dataset.id = r.id;
  const line = (text, cls) => {
    const div = doc.createElement("div");
    if (cls) div.className = cls;
    div.textContent = text;
    el4.append(div);
  };
  const head = doc.createElement("div"), title = doc.createElement("span"), time2 = doc.createElement("span");
  head.className = "rhead";
  title.className = "title";
  title.textContent = r.title;
  time2.className = "when";
  time2.textContent = when(r.at) + (r.ok ? " \u2713" : "");
  head.append(title, time2);
  el4.append(head);
  if (r.outcome === "missing") return el4;
  if (r.by) line(`rolled by ${r.by === "GM" ? "the GM" : r.by}`, "by");
  const dice = doc.createElement("div");
  dice.className = "rdice";
  dice.append(...r.dice.map((d, k) => dieEl(doc, d, k)));
  el4.append(dice);
  if (r.influence !== void 0) line(`${r.action ? `${r.action}: ` : ""}Total Influence ${r.influence}${r.base !== void 0 ? ` (base ${r.base})` : ""}`);
  else if (r.action) line(r.action);
  if (r.vs) line(`vs ${r.vs}`);
  if (r.row) line(r.row);
  if (r.resolution) line(`Resolution: ${r.resolution}`);
  if (r.crit) {
    for (const k of ["max", "dbl"]) {
      const chosen = r.crit.chosen === k;
      if (r.crit.locked && !chosen) continue;
      let cls = "other";
      if (chosen) cls = r.crit.locked ? "chosen punched" : "chosen";
      line(`${CRIT[k]}: ${r.crit[k]}`, cls);
    }
  }
  line(r.level ? `${r.outcome}: ${r.level}` : r.outcome, "outcome");
  const done2 = r.transfer?.done;
  if (done2) {
    const s = (n) => n === 1 ? "" : "s";
    line(`Transfer: ${done2.resource}, ${done2.moved} Level${s(done2.moved)} from ${r.transfer.name}`, "transfer");
    if (done2.extra) line(`${done2.extra} extra Level${s(done2.extra)} improve${done2.extra === 1 ? "s" : ""} ${r.transfer.name}'s Opinions`, "transfer");
  }
  if (r.priv) line("Private: not shown to the table", "privnote");
  return el4;
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
var el2 = (doc, tag, cls, text) => {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== void 0) e.textContent = text;
  return e;
};
function writable(doc, cls, source2, save2) {
  const t = el2(doc, "div", `${cls} writes`);
  t.contentEditable = "true";
  t.spellcheck = false;
  render(parse(source2), t);
  t.dataset.source = source2;
  t.addEventListener("input", () => {
    const s = serialize(read(t));
    t.dataset.source = s;
    save2(s);
  });
  t.addEventListener("keydown", (ev) => {
    if (ev.key.toLowerCase() !== "a" || !(ev.ctrlKey || ev.metaKey) || ev.altKey || ev.shiftKey) return;
    ev.preventDefault();
    const all2 = doc.createRange(), sel = doc.getSelection();
    all2.selectNodeContents(t);
    sel?.removeAllRanges();
    sel?.addRange(all2);
  });
  t.addEventListener("beforeinput", (ev) => {
    const sel = doc.getSelection(), r = sel?.rangeCount ? sel.getRangeAt(0) : null;
    if (!r || r.startContainer !== t || r.startOffset !== 0 || r.endContainer !== t || r.endOffset !== t.childNodes.length) return;
    const typed3 = ev.inputType === "insertText" ? ev.data ?? "" : ev.inputType === "insertFromPaste" ? ev.dataTransfer?.getData("text/plain") ?? "" : ev.inputType === "insertParagraph" || ev.inputType === "insertLineBreak" ? "\n" : ev.inputType.startsWith("delete") ? "" : null;
    if (typed3 === null) return;
    ev.preventDefault();
    const lines2 = typed3.split(/\r?\n/).map((l) => {
      const d = doc.createElement("div");
      if (l) d.textContent = l;
      else d.append(doc.createElement("br"));
      return d;
    });
    t.replaceChildren(...lines2);
    const end = doc.createRange(), last = lines2.at(-1);
    end.selectNodeContents(last);
    end.collapse(false);
    sel.removeAllRanges();
    sel.addRange(end);
    t.dispatchEvent(new Event("input"));
  });
  return t;
}
var RULE_PX = 26;
var RULES = 12;
function ruled(doc, text) {
  const NS = "http://www.w3.org/2000/svg", svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  for (let k = 0; k < RULES; k++) {
    const line = doc.createElementNS(NS, "line"), y = String(RULE_PX * (k + 1) - 0.5);
    for (const [a, v] of [["x1", "0"], ["x2", "100%"], ["y1", y], ["y2", y]]) line.setAttribute(a, v);
    svg.append(line);
  }
  text.addEventListener("scroll", () => {
    svg.style.transform = `translateY(${-(text.scrollTop % RULE_PX)}px)`;
  });
  const wrap = el2(doc, "div", "ruled");
  wrap.append(svg, text);
  return wrap;
}
function rewrite(t, source2) {
  if (t.dataset.source === source2) return;
  if (t.ownerDocument.activeElement && t.contains(t.ownerDocument.activeElement)) return;
  render(parse(source2), t);
  t.dataset.source = source2;
}
function change(w, rid2, fn) {
  const cur = w.game.get(rid2);
  if (cur) w.game.change((wr) => wr.put(rid2, fn(cur)));
}
function placeOf(r) {
  if (r.kind === "character") return r.card;
  if (r.kind === "connections" && r.away) return null;
  if ("place" in r) return r.place;
  return null;
}
function draw(r, old, w) {
  const at4 = placeOf(r);
  if (!at4) return null;
  const doc = old?.ownerDocument ?? document;
  const e = old?.dataset.kind === r.kind ? old : make(doc, r, w);
  e.style.left = `${at4.x}px`;
  e.style.top = `${at4.y}px`;
  e.style.zIndex = String(at4.z);
  e.style.setProperty("--tilt", tilt(r.oid));
  update(e, r, w);
  return e;
}
function make(doc, r, w) {
  const rid2 = ridFor(r);
  const e = el2(doc, "div", `obj ${CLASS[r.kind] ?? r.kind}`);
  e.dataset.kind = r.kind;
  e.dataset.rid = rid2;
  e.addEventListener("pointerdown", (ev) => {
    const t = ev.target;
    if (t.isContentEditable && t.ownerDocument.activeElement === t.closest("[contenteditable]")) ev.stopPropagation();
  }, true);
  gesture(e, {
    drag: (down, move) => {
      doc.activeElement?.blur?.();
      w.drag(rid2, down, move);
    },
    // R392: in the Infer state, a click on an entry tears it out or mends it.
    click: (ev) => {
      if (r.kind === "character") tear(e, r.oid, ev, w);
    }
  });
  switch (r.kind) {
    case "character": {
      const flipper = el2(doc, "div", "flipper");
      const front = el2(doc, "div", "face front"), back3 = el2(doc, "div", "face back");
      const text = writable(doc, "text", r.front, (s) => change(w, rid2, (c) => {
        const was = cardName(c.front), now2 = cardName(s);
        return { ...c, front: s, ...now2 !== was && { name: now2.slice(0, CAPS.name) } };
      }));
      front.append(text);
      e.addEventListener("pointerdown", (ev) => checkPress(ev, text), true);
      if (w.viewer?.gm) groupChooser(text, w, () => w.game.get(rid2)?.owner === GM);
      back3.append(
        el2(doc, "div", "damage"),
        el2(doc, "div", "notes-hd", "Notes"),
        ruled(doc, writable(doc, "notes", r.back.notes, (s) => change(w, rid2, (c) => ({ ...c, back: { ...c.back, notes: s } }))))
      );
      flipper.append(front, back3);
      const flip = el2(doc, "button", "flip");
      flip.setAttribute("aria-label", "Flip the card");
      gesture(flip, { click: () => change(w, rid2, (c) => ({ ...c, flipped: !c.flipped })) });
      const eye = el2(doc, "button", "eye"), pick = el2(doc, "button", "eyecat");
      eye.setAttribute("aria-label", "Infer: show the table lines of this card");
      pick.setAttribute("aria-label", "Open the eye on a category");
      gesture(eye, { click: () => {
        e.querySelector(".eyemenu")?.remove();
        w.eyes.flip(r.oid);
      } });
      gesture(pick, { click: () => eyeMenu(e, r.oid, w) });
      e.append(flipper, flip, eye, pick, tray(e), el2(doc, "div", "infos"));
      break;
    }
    case "sticky":
    case "text":
      e.append(writable(doc, "text", r.text, (s) => change(w, rid2, (c) => ({ ...c, text: s }))), tray(e), tack(doc, rid2, w));
      break;
    case "docket": {
      const knot = el2(doc, "button", "knot");
      knot.setAttribute("aria-label", "Tie or untie this docket");
      gesture(knot, { click: () => tie(w, r.oid) });
      const name2 = el2(doc, "span", "dname");
      name2.contentEditable = "true";
      name2.spellcheck = false;
      name2.addEventListener("input", () => {
        const words = (name2.textContent ?? "").slice(0, DOCKET_NAME);
        change(w, rid2, (d) => ({ ...d, name: words }));
      });
      name2.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          name2.blur();
        }
      });
      e.append(knot, name2);
      break;
    }
    case "image": {
      const img = doc.createElement("img");
      img.alt = "";
      e.append(img, tack(doc, rid2, w));
      break;
    }
    case "reference":
      break;
    case "connections":
      connections(e, rid2, w);
      break;
    case "tornroll":
      e.addEventListener("wheel", (ev) => {
        const more = ev.deltaY < 0 ? e.scrollTop > 0 : e.scrollTop + e.clientHeight < e.scrollHeight - 1;
        if (more) ev.stopPropagation();
      }, { passive: true });
      break;
  }
  return e;
}
function update(e, r, w) {
  switch (r.kind) {
    case "character": {
      if (e.classList.contains("flipped") !== r.flipped) turn(e, r.flipped);
      const secret = !canSee(w.viewer, r), eyed = !!w.viewer?.gm && r.owner === GM;
      const draft = eyed ? w.eyes.draft(r.oid) : void 0;
      const back3 = secret || !!draft;
      e.classList.toggle("secret", secret);
      e.classList.toggle("eyed", eyed);
      e.classList.toggle("inferring", !!draft);
      const front = e.querySelector(".front > .text");
      const writes = mayWrite(w.viewer, r);
      front.contentEditable = back3 || !writes ? "false" : "true";
      e.querySelector(".back .notes").contentEditable = writes ? "true" : "false";
      const body = secret ? blankFront(r) : r.front;
      if (!draft && front.querySelector("[data-entries]")) delete front.dataset.source;
      rewrite(front, back3 ? named2(body, r.name) : body);
      torn(front, r, secret, draft, draft ? w.eyes.cat(r.oid) : null);
      if (!back3) frontGlyphs(front, r, w);
      infos(e, r, w, secret, draft);
      rewrite(e.querySelector(".back .notes"), r.back.notes);
      damage2(e.querySelector(".damage"), r, w);
      dry(e, w);
      break;
    }
    case "sticky":
    case "text":
      rewrite(e.querySelector(".text"), r.text);
      if (r.kind === "sticky") e.classList.toggle("big", !!r.big);
      fold(e, r, w);
      break;
    case "image":
      image(e, r, w);
      fold(e, r, w);
      break;
    case "docket": {
      const name2 = e.querySelector(".dname");
      if (e.ownerDocument.activeElement !== name2 && name2.textContent !== r.name) name2.textContent = r.name;
      fold(e, r, w);
      break;
    }
    case "tornroll":
      tornroll(e, r);
      break;
    case "reference":
      if (e.dataset.page !== r.which) {
        e.replaceChildren(...referenceSheet(e.ownerDocument, e.dataset.rid, r, w));
        e.dataset.page = r.which;
      }
      break;
    case "connections":
      sheet(e, r, w);
      break;
  }
}
var TURN_MS = 125;
function turn(e, flipped) {
  const flipper = e.querySelector(".flipper");
  const reduce = e.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!e.isConnected || reduce || !flipper.animate) {
    e.classList.toggle("flipped", flipped);
    return;
  }
  flipper.getAnimations().forEach((a) => a.cancel());
  const half = (from, to) => flipper.animate([{ transform: from }, { transform: to }], { duration: TURN_MS, easing: "ease-in-out" });
  half("scaleX(1)", "scaleX(0)").onfinish = () => {
    e.classList.toggle("flipped", flipped);
    half("scaleX(0)", "scaleX(1)");
  };
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
function frontOrder(front) {
  const k = front ? DAMAGE.indexOf(front) : 0;
  return [...DAMAGE.slice(k), ...DAMAGE.slice(0, k)];
}
function damage2(box2, c, w) {
  const doc = box2.ownerDocument, opened = w.opened();
  const put2 = (fn) => change(w, ridOf(c.oid), fn);
  const slotAt = (ch, d, row2, s) => ({ ...ch, back: { ...ch.back, damage: { ...ch.back.damage, [d]: { ...ch.back.damage[d], [row2]: { ...ch.back.damage[d][row2], ...s } } } } });
  if (!box2.children.length) {
    for (const d of DAMAGE) {
      const col = el2(doc, "div", `column col-${d}`);
      col.dataset.damage = d;
      const hd = el2(doc, "div", "hd");
      hd.append(`${COLUMN[d].name} `, el2(doc, "span", "absorb"));
      col.append(hd);
      gesture(hd, { click: () => {
        const mine2 = `${c.oid}:`;
        w.setOpened(new Set([...w.opened()].filter((k) => !k.startsWith(mine2)).concat(mine2 + d)));
      } });
      for (const row2 of ROWS) {
        const line = el2(doc, "div", "slotline");
        line.dataset.row = row2;
        const boxes = el2(doc, "span", "boxes"), name2 = el2(doc, "span", `name ${COLUMN[d].mark}`);
        name2.contentEditable = "true";
        name2.spellcheck = false;
        name2.addEventListener("input", () => put2((ch) => slotAt(ch, d, row2, { name: name2.textContent ?? "" })));
        line.append(boxes, el2(doc, "span", "lvl", LEVEL2[row2]), name2, el2(doc, "span", "spent"));
        col.append(line);
      }
      if (isLasting(d)) col.append(lastLine(doc, d, put2));
      box2.append(col);
    }
  }
  const taking = w.taking(), mine = taking?.oid === c.oid ? taking : null, page = mine?.pages[mine.k];
  const preview = mine && page ? fill(c, mine.kind, page, { name: mine.by, id: mine.id }) : null;
  const order2 = frontOrder(DAMAGE.find((d) => opened.has(`${c.oid}:${d}`)) ?? null);
  for (const col of box2.children) {
    const d = col.dataset.damage, slots2 = c.back.damage[d], room2 = columnRoom(c, d), absorb2 = room2?.absorb ?? 0;
    const empty2 = !ROWS.some((r) => filled(slots2[r])) && !absorb2 && !(isLasting(d) && c.back.lasting?.[d]);
    col.classList.toggle("empty", empty2);
    col.classList.toggle("open", opened.has(`${c.oid}:${d}`));
    col.style.order = String(order2.indexOf(d));
    col.querySelector(".absorb").textContent = absorb2 ? `(absorb ${absorb2})` : "";
    for (const line of col.querySelectorAll(".slotline")) {
      const row2 = line.dataset.row, s = slots2[row2];
      line.querySelector(".lvl").textContent = room2?.one.includes(row2) ? `${LEVEL2[row2]} (1)` : LEVEL2[row2];
      const name2 = line.querySelector(".name");
      if (doc.activeElement !== name2 && name2.textContent !== s.name) name2.textContent = s.name;
      const spent = s.spent.reduce((a, b) => a + b, 0);
      name2.classList.toggle("waiting", !!s.naming);
      if (s.naming) name2.dataset.by = `${s.naming.by} names it`;
      else delete name2.dataset.by;
      const after = preview?.back.damage[d][row2];
      line.classList.toggle("fill", !!after && !!after.naming && !s.naming);
      line.querySelector(".spent").textContent = spent ? `\u2212${spent}` : "";
      slotGlyphs(line, s, `${c.oid}:${d}/${row2}`, w);
      const boxes = line.querySelector(".boxes");
      const count = room2 ? Math.max(room2.boxes[row2], s.boxes.lastIndexOf(true) + 1) : s.boxes.length;
      if (boxes.children.length !== count) {
        boxes.replaceChildren(...Array.from({ length: count }, (_, k) => {
          const b = el2(doc, "button", "box");
          b.setAttribute("aria-label", `Slot ${k + 2}`);
          gesture(b, { click: () => put2((ch) => {
            const cur = ch.back.damage[d][row2];
            if (!cur.name) {
              b.animate?.([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }], 200);
              return ch;
            }
            const next2 = Array.from({ length: Math.max(cur.boxes.length, k + 1) }, (_2, i) => !!cur.boxes[i]);
            next2[k] = !next2[k];
            return slotAt(ch, d, row2, { boxes: next2 });
          }) });
          return b;
        }));
      }
      [...boxes.children].forEach((b, k) => {
        b.classList.toggle("on", !!s.boxes[k]);
        b.classList.toggle("pencil", !!after?.boxes[k] && !s.boxes[k]);
      });
    }
  }
  for (const line of box2.querySelectorAll(".lastline")) {
    const d = line.dataset.damage;
    showLasting(line, c.back.lasting?.[d], preview?.back.lasting?.[d], `${c.oid}:${d}/lasting`, w);
  }
  takeStrip(box2, c, w);
}
function editLasting(ch, d, s) {
  const was = ch.back.lasting?.[d] ?? { name: "", points: 0, spent: 0 }, now2 = { ...was, ...s };
  const { [d]: _, ...others } = ch.back.lasting ?? {};
  const keep2 = now2.name || now2.points > 0 || now2.naming;
  const lasting2 = keep2 ? { ...others, [d]: now2 } : others;
  const { lasting: __, ...back3 } = ch.back;
  return { ...ch, back: Object.keys(lasting2).length ? { ...back3, lasting: lasting2 } : back3 };
}
function lastLine(doc, d, put2) {
  const line = el2(doc, "div", "lastline");
  line.dataset.damage = d;
  const name2 = el2(doc, "span", `name ${COLUMN[d].mark}`), pts = el2(doc, "span", "pts");
  for (const e of [name2, pts]) {
    e.contentEditable = "true";
    e.spellcheck = false;
  }
  name2.addEventListener("input", () => put2((ch) => editLasting(ch, d, { name: name2.textContent ?? "" })));
  pts.addEventListener("input", () => put2((ch) => editLasting(ch, d, { points: Math.min(Number((pts.textContent ?? "").replace(/\D/g, "")) || 0, 1e4) })));
  line.append(el2(doc, "span", "kind", OVERFLOW[d]), name2, el2(doc, "span", "lvl"), pts, el2(doc, "span", "top"), el2(doc, "span", "spent"));
  return line;
}
function showLasting(line, l, after, source2, w) {
  const doc = line.ownerDocument, shown3 = after ?? l, pencil = !!after && after !== l;
  line.hidden = !shown3;
  line.classList.toggle("fill", pencil);
  if (!shown3) return;
  const name2 = line.querySelector(".name"), pts = line.querySelector(".pts");
  if (doc.activeElement !== name2 && name2.textContent !== shown3.name) name2.textContent = shown3.name;
  if (doc.activeElement !== pts && pts.textContent !== String(shown3.points)) pts.textContent = String(shown3.points);
  name2.classList.toggle("waiting", !!shown3.naming);
  if (shown3.naming) name2.dataset.by = `${shown3.naming.by} names it`;
  else delete name2.dataset.by;
  line.querySelector(".lvl").textContent = LEVELS2[lastingLevels(shown3.points) - 1]?.word ?? "";
  line.querySelector(".top").textContent = `/${lastingTop(shown3.points)}`;
  line.querySelector(".spent").textContent = l?.spent ? `\u2212${l.spent}` : "";
  const want = l?.name ? source2 : "", g = line.querySelector(".glyph");
  if ((g?.dataset.source ?? "") === want) return;
  g?.remove();
  if (want) name2.before(glyph(doc, want, w));
}
function takeStrip(box2, c, w) {
  const doc = box2.ownerDocument, t = w.taking(), mine = t?.oid === c.oid ? t : null;
  let strip = box2.parentElement.querySelector(":scope > .takestrip");
  if (!mine) {
    strip?.remove();
    return;
  }
  if (!strip) {
    strip = el2(doc, "div", "takestrip");
    box2.after(strip);
  }
  const page = mine.pages[mine.k], n = mine.pages.length, empty2 = ROWS.every((r) => !page.use[r]);
  const button = (text, cls, title, go, off = false) => {
    const b = el2(doc, "button", cls, text);
    b.title = title;
    b.disabled = off;
    gesture(b, { click: () => {
      if (!off) go();
    } });
    return b;
  };
  const head = el2(doc, "div", "takehd", `${mine.by}'s Attack, ${mine.result}`);
  const pager = el2(doc, "div", "pager");
  pager.append(
    button("\u2039", "turn", "The page before", () => w.turnPage(mine.k - 1), mine.k === 0),
    el2(doc, "span", "of", empty2 ? "all absorbed" : `${mine.k + 1} of ${n}`),
    button("\u203A", "turn", "The next page", () => w.turnPage(mine.k + 1), mine.k >= n - 1),
    button("Take", "take", "Fill these Slots", () => w.takePage()),
    button("Cancel", "cancel", "Back out: nothing changes", () => w.cancelTake())
  );
  strip.replaceChildren(head, pager);
  if (page.overflow) strip.append(el2(doc, "div", "over", `${page.overflow} left over: a ${OVERFLOW[COLUMN_OF[mine.kind]]}`));
}
function glyph(doc, source2, w) {
  const g = el2(doc, "span", "glyph");
  g.contentEditable = "false";
  g.dataset.source = source2;
  g.title = "Drag to tap";
  g.draggable = false;
  g.addEventListener("pointerdown", (ev) => ev.preventDefault());
  g.addEventListener("dragstart", (ev) => ev.preventDefault());
  gesture(g, { drag: (d, m) => {
    if (!w.dragGlyph(source2, d, m)) g.animate?.([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "none" }], 200);
  } });
  return g;
}
function dry(e, w) {
  const look = (oid) => w.game.get(ridOf(oid));
  for (const g of e.querySelectorAll(".glyph")) g.classList.toggle("dry", leftOf(look, g.dataset.source ?? "") < 1);
}
var named2 = (front, name2) => [`<head>${name2}</head>`, ...front.split("\n").slice(1)].join("\n");
function rag(oid, line) {
  let h = 7;
  for (const ch of oid + line) h = h * 31 + ch.charCodeAt(0) | 0;
  return (h >>> 0) % 6;
}
function torn(text, c, secret, draft, cat, read2 = entries, name2 = true) {
  const src = text.dataset.source ?? "", lines2 = src.split("\n"), doc = text.ownerDocument, by = /* @__PURE__ */ new Map();
  if (draft) for (const e of read2(src)) by.set(e.line, [...by.get(e.line) ?? [], e]);
  [...text.children].forEach((div, k) => {
    const d = div, es = by.get(k), whole = secret ? lines2[k] !== "" : !!draft && name2 && k === 0;
    d.classList.toggle("torn", whole);
    if (whole) d.style.setProperty("--rag", String(rag(c.oid, lines2[k] ?? "")));
    else d.style.removeProperty("--rag");
    if (!es || !draft) return;
    const any = es.some((e) => draft.has(e.key)), parts2 = [];
    if (es[0].label) parts2.push(el2(doc, "span", `label${any ? " torn" : ""}`, es[0].label), " ");
    es.forEach((e, i) => {
      if (i) parts2.push(", ");
      const out = draft.has(e.key), lit = !!cat && (e.cat === cat || e.cat === "any");
      const s = el2(doc, "span", `entry${out ? " torn" : lit ? " lit" : ""}`, e.text);
      s.dataset.key = e.key;
      if (out) s.style.setProperty("--rag", String(rag(c.oid, e.key)));
      parts2.push(s);
    });
    d.replaceChildren(...parts2);
    d.dataset.entries = "";
  });
}
function infos(e, c, w, secret, draft) {
  const doc = e.ownerDocument, box2 = e.querySelector(":scope > .infos"), rid2 = ridOf(c.oid);
  const shown3 = new Set(c.shown ?? []), cards = (c.info ?? []).map((i) => secret ? blankInfo(i, shown3) : i);
  const showing = cards.flatMap((t, k) => secret && !t.trim() ? [] : [k]);
  const recs = c.owner === GM ? records(w.game, c).filter((r) => !secret || r.rec.text.trim()) : [];
  const mine = `${c.oid}:`, at4 = [...w.slid()].find((s) => s.startsWith(mine)), key = at4?.slice(mine.length) ?? "";
  const rec = key.startsWith("o") ? recs.find((r) => r.rec.oid === key.slice(1)) : void 0;
  const out = key && !key.startsWith("o") && showing.includes(Number(key)) ? Number(key) : -1;
  const want = rec ? `o${rec.rec.oid}` : String(out);
  const slide = (to) => w.setSlid(new Set([...w.slid()].filter((s) => !s.startsWith(mine)).concat(to === -1 ? [] : [mine + to])));
  let paper = box2.querySelector(":scope > .infopaper");
  if (paper && paper.dataset.k !== want) {
    paper.remove();
    paper = null;
  }
  if (out >= 0) {
    if (!paper) {
      paper = el2(doc, "div", "infopaper");
      paper.dataset.k = want;
      let words = cards[out];
      const text2 = writable(doc, "text", words, (s) => {
        if (s.trim()) words = s;
        change(w, rid2, (x) => ({ ...x, info: (x.info ?? []).map((t, j) => j === out ? s : t) }));
      });
      text2.addEventListener("focusout", () => {
        const x = w.game.get(rid2);
        if (x?.info?.[out]?.trim() !== "") return;
        const { info: _, ...rest } = x, info = x.info.filter((__, j) => j !== out);
        w.game.change((g) => g.put(rid2, info.length ? { ...rest, info } : rest));
        if (words.trim()) w.buryInfo(c.oid, out, words);
        slide(-1);
      });
      paper.append(text2);
      box2.prepend(paper);
    }
    const text = paper.querySelector(".text");
    text.contentEditable = secret || draft ? "false" : "true";
    if (!draft && text.querySelector("[data-entries]")) delete text.dataset.source;
    rewrite(text, cards[out]);
    torn(text, c, secret, draft, draft ? w.eyes.cat(c.oid) : null, clues, false);
  } else if (rec) {
    if (!paper) {
      paper = recordPaper(doc, rec.rec.oid, w, () => slide(-1), (t) => recordDrawn(t, rec.rec.oid, c.oid, w));
      paper.dataset.k = want;
      box2.prepend(paper);
    }
    paper.querySelector(".connhead").textContent = secret ? `\u2794 ${rec.name}` : `\u2794 ${rec.name} (Connection ${level(connection(rec.rec.text))})`;
    const text = paper.querySelector(".text"), face = secret || !!draft;
    text.contentEditable = face ? "false" : "true";
    if (face) {
      rewrite(text, rec.rec.text);
      torn(text, c, secret, draft, draft ? w.eyes.cat(c.oid) : null, (src) => opinionItems({ ...rec.rec, text: src }), false);
    } else {
      if (text.querySelector("[data-entries]")) delete text.dataset.source;
      recordDrawn(text, rec.rec.oid, c.oid, w);
    }
  }
  const tabs = el2(doc, "div", "infotabs");
  for (const k of showing) {
    const t = el2(doc, "button", `infotab${k === out ? " out" : ""}`, cards.length > 1 ? `Info ${k + 1}` : "Info");
    gesture(t, { click: () => slide(k === out ? -1 : k) });
    tabs.append(t);
  }
  for (const r of recs) {
    const on = r === rec, t = el2(doc, "button", `infotab opinion${on ? " out" : ""}`, r.name);
    gesture(t, { click: () => slide(on ? -1 : `o${r.rec.oid}`) });
    tabs.append(t);
  }
  box2.querySelector(":scope > .infotabs")?.remove();
  box2.append(tabs);
}
function records(game2, c) {
  const all2 = game2.all().map(([, r]) => r), t = tableOf(all2);
  const chars = all2.filter((r) => r.kind === "character");
  const recs = recordsOn(all2.filter((r) => r.kind === "opinion"), c, t);
  return order(recs.map((rec) => ({ rec, name: t ? nameOf(t, chars, rec.of) : rec.name ?? "" })));
}
function writeRecord(w, oid, text) {
  const rec = w.game.get(ridOf(oid));
  const t = tableOf(w.game.all().map(([, r]) => r));
  if (rec?.kind !== "opinion" || !t) return;
  const now2 = { ...rec, text };
  w.game.change((g) => {
    g.put(ridOf(oid), now2);
    g.put(ridOf(t.oid), synced(t, now2));
  });
}
function recordPaper(doc, oid, w, away, drawn) {
  const paper = el2(doc, "div", "infopaper opinion"), rid2 = ridOf(oid);
  let words = w.game.get(rid2)?.text ?? "";
  const text = writable(doc, "text", words, (s) => {
    if (s.trim()) words = s;
    writeRecord(w, oid, s);
  });
  text.addEventListener("focusout", () => {
    const x = w.game.get(rid2);
    if (x?.kind !== "opinion") return;
    if (!x.text.trim()) {
      w.buryRecord(oid, words);
      away();
      return;
    }
    const pc = w.game.get(ridOf(x.of)), reworked = pc?.kind === "character" ? respected(x.text, pc.front) : x.text;
    if (reworked !== x.text) {
      words = reworked;
      writeRecord(w, oid, reworked);
    }
    setTimeout(() => {
      delete text.dataset.source;
      drawn(text);
    });
  });
  paper.append(el2(doc, "div", "connhead"), text);
  return paper;
}
var shake = (d) => d.animate?.([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "none" }], 200);
function recordDrawn(text, oid, npc, w) {
  const rec = w.game.get(ridOf(oid)), c = w.game.get(ridOf(npc));
  if (rec?.kind !== "opinion" || c?.kind !== "character") return;
  rewrite(text, rec.text);
  reactDie(text, rec, c, w);
  recordGlyphs(text, rec, c, w);
}
function reactDie(text, rec, npc, w) {
  const doc = text.ownerDocument;
  if (doc.activeElement && text.contains(doc.activeElement)) return;
  for (const d2 of text.querySelectorAll(".reactdie")) d2.remove();
  const pc = w.game.get(ridOf(rec.of));
  const line = pc?.kind === "character" ? [...text.children].find((l) => awaits(l.textContent ?? "")) : void 0;
  if (!line) return;
  const d = el2(doc, "span", "reactdie");
  d.contentEditable = "false";
  d.title = `Roll ${npc.name}'s Reaction to ${pc.name}`;
  d.addEventListener("pointerdown", (ev) => ev.preventDefault());
  gesture(d, { click: () => {
    if (!w.react(pc.oid, npc.oid)) shake(d);
  } });
  line.prepend(d);
}
function recordGlyphs(text, rec, npc, w) {
  const doc = text.ownerDocument;
  if (doc.activeElement && text.contains(doc.activeElement)) return;
  for (const g of text.querySelectorAll(".glyph")) g.remove();
  for (const line of text.children) {
    const words = line.textContent ?? "", r = influence(unadjusted(words));
    if (fixed(words) && r?.sign) line.prepend(glyph(doc, `${npc.oid}:o${rec.oid}/${r.name}`, w));
  }
}
function tack(doc, rid2, w) {
  const t = el2(doc, "button", "tack");
  t.setAttribute("aria-label", "Thumbtack: click to unpin, drag to pin to another card");
  t.title = "Click to take the tack out; drag it to another card to pin it there";
  gesture(t, {
    click: () => change(w, rid2, (c) => {
      const { pin: _out, ...loose } = c;
      return loose;
    }),
    drag: (down, move) => w.dragTack(rid2, down, move)
  });
  return t;
}
function tiedHere(game2) {
  return new Set(game2.get("tied")?.tied ?? []);
}
function tie(w, oid) {
  const now2 = tiedHere(w.game);
  if (!now2.delete(oid)) now2.add(oid);
  w.game.change((wr) => wr.put("tied", { tied: [...now2] }));
}
function readersOf(r, viewer) {
  if (r.mine || r.handed) return ["me"];
  if (!r.to) return [];
  const me = selfName(viewer);
  const others = [.../* @__PURE__ */ new Set([GM, ownerOf(r), ...r.to])].filter((n) => n !== me);
  return others.length ? others : ["me"];
}
function withReaders(r, a) {
  const { to: _to, mine: _mine, handed: _handed, ...rest } = r, base = { ...rest, by: ownerOf(r) };
  if (a === "all") return base;
  if (a === "me") return { ...base, mine: true };
  return { ...base, to: a === "gm" ? [] : a };
}
function selfName(viewer) {
  return viewer?.gm ? GM : viewer?.name;
}
var owns = (r, viewer) => ownerOf(r) === selfName(viewer);
function rekey(w, rid2, next2) {
  const cur = w.game.get(rid2);
  if (!cur) return;
  const rec = next2(cur), to = ridFor(rec);
  w.game.change((wr) => {
    if (to !== rid2) wr.del(rid2);
    wr.put(to, rec);
  });
}
function fold(e, r, w) {
  const doc = e.ownerDocument;
  const f = e.querySelector(":scope > .fold") ?? e.appendChild(el2(doc, "div", "fold"));
  const priv = isPrivate(r);
  e.classList.toggle("folded", priv);
  f.title = priv ? "Private" : "Everyone reads this";
  const tags2 = e.querySelector(":scope > .readers") ?? e.appendChild(el2(doc, "div", "readers"));
  tags2.replaceChildren(...readersOf(r, w.viewer).map((n) => el2(doc, "span", "tag", n)));
  const mine = owns(r, w.viewer);
  let pick = e.querySelector(":scope > .foldpick");
  if (!mine && !w.viewer?.gm) {
    pick?.remove();
    e.querySelector(":scope > .readmenu")?.remove();
    return;
  }
  if (!pick) {
    pick = e.appendChild(el2(doc, "button", "foldpick"));
    gesture(pick, { click: () => {
      const was = e.querySelector(":scope > .readmenu");
      if (was) was.remove();
      else readMenu(e, w);
    } });
  }
  pick.setAttribute("aria-label", mine ? "Who reads this" : "Give this to");
  const menu = e.querySelector(":scope > .readmenu");
  if (menu) fillMenu(menu, e, r, w);
}
function readMenu(e, w) {
  const r = w.game.get(e.dataset.rid);
  if (!r) return;
  const doc = e.ownerDocument, m = e.appendChild(el2(doc, "div", "readmenu"));
  fillMenu(m, e, r, w);
  const close = (ev) => {
    const t = ev.target;
    if (m.isConnected && (m.contains(t) || e.querySelector(":scope > .foldpick")?.contains(t))) return;
    m.remove();
    doc.removeEventListener("pointerdown", close, true);
  };
  doc.addEventListener("pointerdown", close, true);
}
function fillMenu(m, e, r, w) {
  const doc = e.ownerDocument, rid2 = e.dataset.rid, owner = ownerOf(r), gmNote = owner === GM;
  const choice = (label2, on, a) => {
    const b = el2(doc, "button", on ? "on" : "", label2);
    gesture(b, { click: () => {
      m.remove();
      rekey(w, rid2, (cur) => withReaders(cur, a));
    } });
    return b;
  };
  const parts2 = [];
  if (owns(r, w.viewer)) {
    const to = new Set(r.to ?? []), shown3 = JSON.parse(m.dataset.names ?? "[]");
    const names = [.../* @__PURE__ */ new Set([...shown3, ...w.players(), ...to])].filter((n) => n !== owner).sort();
    m.dataset.names = JSON.stringify(names);
    const boxes = names.map((n) => {
      const l = el2(doc, "label", "reader"), box2 = doc.createElement("input");
      box2.type = "checkbox";
      box2.checked = to.has(n);
      box2.addEventListener("change", () => {
        const next2 = new Set(to);
        if (box2.checked) next2.add(n);
        else next2.delete(n);
        rekey(w, rid2, (cur) => withReaders(cur, [...next2]));
      });
      l.append(box2, n);
      return l;
    });
    const toGM = !!r.to && !r.to.length;
    parts2.push(
      choice("Everyone", !r.to && !r.mine, "all"),
      ...gmNote ? [] : [choice("GM", toGM, "gm")],
      gmNote ? choice("Just me", toGM, "gm") : choice("Just me", !!r.mine, "me"),
      ...boxes
    );
  }
  const takers = [.../* @__PURE__ */ new Set([...w.players(), ...gmNote ? [] : [GM]])].filter((n) => n !== owner).sort();
  if (takers.length) parts2.push(el2(doc, "div", "givehd", "Give to"), ...takers.map((n) => {
    const b = el2(doc, "button", "give", n);
    gesture(b, { click: () => {
      m.remove();
      rekey(w, rid2, (cur) => handOver(cur, n));
    } });
    return b;
  }));
  m.replaceChildren(...parts2);
}
function eyeMenu(e, oid, w) {
  const was = e.querySelector(".eyemenu");
  if (was) {
    was.remove();
    return;
  }
  const m = el2(e.ownerDocument, "div", "eyemenu");
  for (const c of CATEGORIES) {
    const b = el2(e.ownerDocument, "button", "", c.word);
    gesture(b, { click: () => {
      m.remove();
      w.eyes.open(oid, c.key);
    } });
    m.append(b);
  }
  e.append(m);
}
function tear(e, oid, ev, w) {
  if (!w.eyes.draft(oid)) return;
  const entry = ev.target?.closest?.(".entry");
  if (entry?.dataset.key) w.eyes.toggle(oid, entry.dataset.key);
}
function frontGlyphs(text, c, w) {
  const doc = text.ownerDocument, using = w.inUse(c.oid);
  const indents = skillIndents(c.front), vars = new Map(variants(c.front).map((v) => [v.line, v]));
  [...text.children].forEach((line, k) => {
    line.classList.toggle("sklpad", indents.has(k));
    line.classList.toggle("sklhang", indents.get(k) === "hang");
    line.classList.toggle("varpad", vars.has(k));
  });
  for (const span of text.querySelectorAll("span.act")) span.classList.toggle("inuse", !!using && action(span.textContent ?? "")?.label === using);
  if (doc.activeElement && text.contains(doc.activeElement)) return;
  for (const g of text.querySelectorAll(".glyph, .actdie")) g.remove();
  for (const span of text.querySelectorAll("span.res, span.mot")) {
    const name2 = influence(span.textContent ?? "")?.name;
    if (name2) span.before(glyph(doc, `${c.oid}:${name2}`, w));
  }
  for (const span of text.querySelectorAll("span.act")) {
    const label2 = action(span.textContent ?? "")?.label;
    if (!label2 || suffered(label2) && !suffers(c.front, label2)) continue;
    const alts = label2.split("/").map((a) => a.trim()).filter(Boolean);
    const die3 = (alt, title = `Roll this: ${alt ?? label2}`) => {
      const d = doc.createElement("span");
      d.className = "actdie";
      d.contentEditable = "false";
      d.title = title;
      d.addEventListener("pointerdown", (ev) => ev.preventDefault());
      gesture(d, { click: () => {
        if (!w.useAction(c.oid, label2, alt)) shake(d);
      } });
      return d;
    };
    let line = span;
    while (line.parentElement && line.parentElement !== text) line = line.parentElement;
    const v = vars.get([...text.children].indexOf(line));
    if (v) {
      for (const alt of v.of.split("/").map((a) => a.trim()).filter(Boolean)) span.before(die3(alt, `Roll this: ${label2} as ${alt}`));
      continue;
    }
    if (alts.length < 2) {
      span.before(die3());
      continue;
    }
    span.before(die3(alts[0]));
    let from = 0;
    for (const alt of alts.slice(1)) {
      const at4 = atText(span, alt, from);
      if (!at4) break;
      from = at4.offset;
      const rest = at4.node.splitText(at4.local);
      rest.before(die3(alt));
    }
  }
}
function skillIndents(front) {
  const out = /* @__PURE__ */ new Map();
  let group = [], inField = false;
  const close = () => {
    for (const g of group) out.set(g.line, g.check ? "hang" : "pad");
    group = [];
    inField = false;
  };
  parse(front).forEach((runs, line) => {
    const marked2 = runs.filter((r) => typeof r !== "string" || r.trim());
    const only = marked2.length === 1 && typeof marked2[0] !== "string" ? marked2[0] : null;
    if (only?.mark === "fld") {
      close();
      inField = true;
      return;
    }
    if (inField && only?.mark === "skl" && !/^\s*Skills\s+\d+\s*:/i.test(only.text)) {
      group.push({ line, check: /^\s*✓/.test(only.text) });
      return;
    }
    close();
  });
  close();
  return out;
}
function toggleCheck(lines2, line) {
  if (!skillIndents(serialize(lines2)).has(line)) return lines2;
  const runs = lines2[line], k = runs.findIndex((r2) => typeof r2 !== "string" && r2.mark === "skl"), r = runs[k];
  const text = /^\s*✓/.test(r.text) ? r.text.replace(/^(\s*)✓\s*/, "$1") : r.text.replace(/^(\s*)/, "$1\u2713 ");
  return lines2.map((l, i) => i === line ? l.map((x, j) => j === k ? { ...r, text } : x) : l);
}
function checkPress(ev, t) {
  if (t.ownerDocument.activeElement !== t) return;
  const line = ev.target.closest("div");
  if (line?.parentElement !== t || !line.classList.contains("sklpad")) return;
  const box2 = line.getBoundingClientRect(), scale2 = box2.width / line.offsetWidth || 1;
  if (ev.clientX >= box2.left + parseFloat(getComputedStyle(line).paddingLeft) * scale2) return;
  const k = [...t.children].indexOf(line), lines2 = read(t), out = toggleCheck(lines2, k);
  if (out === lines2) return;
  ev.preventDefault();
  render(out, t);
  t.dispatchEvent(new Event("input", { bubbles: true }));
  caretAt(t, k);
}
function atText(el4, needle, from) {
  const whole = el4.textContent ?? "", slash = whole.indexOf("/", from);
  if (slash < 0) return null;
  const offset = whole.indexOf(needle, slash);
  if (offset < 0) return null;
  const walk = el4.ownerDocument.createTreeWalker(el4, NodeFilter.SHOW_TEXT);
  let seen3 = 0;
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (offset < seen3 + n.length) return { node: n, local: offset - seen3, offset: offset + needle.length };
    seen3 += n.length;
  }
  return null;
}
function slotGlyphs(line, s, base, w) {
  const doc = line.ownerDocument, name2 = line.querySelector(".name");
  const want = s.name ? [base, ...s.boxes.flatMap((on, k) => on ? [`${base}#${k + 1}`] : [])] : [];
  const have = [...line.querySelectorAll(".glyph")].map((g) => g.dataset.source);
  if (want.join() === have.join()) return;
  for (const g of line.querySelectorAll(".glyph")) g.remove();
  for (const source2 of want) name2.before(glyph(doc, source2, w));
}
function said(doc, tag, cls, text) {
  const e = el2(doc, tag, cls);
  for (const [k, part] of text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).entries()) {
    if (!part) continue;
    e.append(k % 2 === 0 ? part : part.startsWith("**") ? el2(doc, "b", "", part.slice(2, -2)) : el2(doc, "i", "", part.slice(1, -1)));
  }
  return e;
}
var HOWTO = [
  "**Move**: drag anything; drag empty table to pan, the wheel or a two-finger pinch zooms.",
  "**Write**: click paper to write; the pens mark what the table should read.",
  "**Shift-click** (or press and hold) lowers, opens and deletes.",
  "**Put away**: drop it on the bar; Boot Hill keeps what was buried.",
  "**Roll**: the die by a pool's name docks your dice there.",
  "**Turn the page** below: the rules at a glance, then building a character. Put this away when you know the table; the desk gives it back."
];
var QUICK = [
  "# Making rolls",
  "1. COMPARE TOTAL **INFLUENCE**",
  "  **+10:** Automatic success, check for **CRIT!**",
  "  **+7 to +9:** **White** & **Green**, take highest, +1 to roll",
  "  **+5 to +6:** **White** & **Green**, take highest",
  "  **+3 to +4:** +1 to roll",
  "  **-2 to +2:** White",
  "  **-3 to -4:** -1 to roll",
  "  **-5 to -6:** **White** & **Red**, take lowest",
  "  **-7 to -9:** **White** & **Red**, take lowest, -1 to roll",
  "  **-10:** Automatic failure, but check for **CRIT!**",
  "2. ROLL ALL DICE AND CHECK **WHITE / GREEN / RED** RESULT",
  "  4-6: Clean **Success**",
  "  3: **Success** with cost, like +1 **Stagger**",
  "  1-2: **Fail**, may cause +1 **Stagger** and **Level** -1 **Fumble**",
  "3. RESULT IS **BLUE** + **YELLOW**(S) + BONUS (IF ANY)",
  "4. CRIT! ON **WHITE** 6 & **BLUE** 5 OR 6",
  "  Player doubles result *or* changes **Blue** & **Yellow** to 6s",
  "# Actions",
  "- **USE SKILL**",
  "- **CREATE INFLUENCE** (or change an **Influence Level**)",
  "- **ATTACK**: create **Bias**, **Conviction**, **Stagger**, or **Concession**.",
  "- **INFER**: Find out an NPCs **Skills**, **Resources**, **Motivations**, **Opinions**, or information on a character",
  "- **IMPRESS**: change an NPC's **Opinions**",
  "- **REQUEST**: get an NPC to transfer a **Resource** or perform a task",
  "# Concessions",
  "- Attacker must have Edge",
  "- Opponent must have Difficulty",
  "- Skilled attacker must win 2 in a row",
  "- Unskilled attacker must win 4 in a row",
  "# Special influences",
  "## STAGGER POOL",
  "- **STAGGER**: negative **Influence** countered by rest.",
  "## EDGE POOL",
  "- **EDGE**: long-term advantage. Required to create a **Difficulty**.",
  "- **DIFFICULTY**: long-term disadvantage, disappears when Edge does",
  "## BIAS POOL",
  "- **BIAS**: short-term belief",
  "- **CONVICTION**: long-term belief",
  "# Stagger",
  "## STAGGER INCREASES FROM",
  "- Success with cost (usually)",
  "- Failure (sometimes)",
  "- Attack to Stagger",
  "## RECOVER STAGGER WITH REST"
];
var ATTRIBUTES = [
  ["Smart", 4, 0, 0],
  ["Achiever", 3, 1, 1],
  ["Achiever, shrewd", 3, 0, 4],
  ["Balanced", 2, 2, 2],
  ["Balanced, shrewd", 2, 1, 5],
  ["Sharp", 1, 3, 3],
  ["Sharp, arch skeptic", 1, 0, 12],
  ["Insightful", 0, 4, 4],
  ["Insightful, arch skeptic", 0, 2, 10]
];
var FIELDS = [
  "Example Fields",
  "## Snake Oil Salesman (5XP / Level)",
  "  Rhetoric (x2) -- *requires at least same Level of* Int",
  "  Finesse (x2, Rhetoric) -- *add Level to successful Attacks and Requests but suffer a Mitigated* Tricky-Sig",
  "  Rationalization",
  "## Private Investigator (5XP / Level)",
  "  Investigation (x2)",
  "  Advocacy (x2)",
  "  Lock Picking",
  "## Public Speaker (5XP / Level)",
  "  Advocacy (x2)",
  "  Oratory (x2)",
  "  Rationalization"
];
function lines(doc, text) {
  return text.map((t) => t.startsWith("# ") ? said(doc, "h3", "", t.slice(2)) : t.startsWith("## ") ? said(doc, "h4", "", t.slice(3)) : t.startsWith("- ") ? said(doc, "p", "dot", t.slice(2)) : t.startsWith("  ") ? said(doc, "p", "in", t.slice(2)) : said(doc, "p", "", t));
}
function referenceSheet(doc, rid2, r, w) {
  const at4 = SHEET_PAGES.indexOf(r.which), n = SHEET_PAGES.length;
  let body;
  if (r.which === "howto") body = [el2(doc, "div", "rhd", "How to use the table"), ...lines(doc, HOWTO)];
  else if (r.which === "quick") body = [el2(doc, "div", "rhd", "Quick reference"), ...lines(doc, QUICK)];
  else {
    const table = doc.createElement("table"), row2 = (cells, tag) => {
      const tr = doc.createElement("tr");
      for (const c of cells) tr.append(el2(doc, tag, "", String(c)));
      return tr;
    };
    table.append(row2(["Description", "Cha (4)", "Int (3)", "Wis (1)"], "th"), ...ATTRIBUTES.map((a) => row2(a, "td")));
    body = [el2(doc, "div", "rhd", "Quick character creation"), said(doc, "p", "", "Some 16XP **Attribute** combinations:"), table, ...lines(doc, FIELDS)];
  }
  const turn2 = (to, label2, glyph2) => {
    const b = el2(doc, "button", "turn", glyph2);
    b.setAttribute("aria-label", label2);
    b.disabled = to < 0 || to >= n;
    gesture(b, { click: () => change(w, rid2, (s) => ({ ...s, which: SHEET_PAGES[to] })) });
    return b;
  };
  const foot = el2(doc, "div", "rfoot");
  foot.append(turn2(at4 - 1, "Previous page", "\u2039"), ` ${at4 + 1} of ${n} `, turn2(at4 + 1, "Next page", "\u203A"));
  return [...body, foot];
}

// src/net/identity.ts
var ID = /^[0-9A-Za-z]{22}$/;
var PUB = /^[\w-]{87}$/;
var ALG = { name: "ECDSA", namedCurve: "P-256" };
var SIG = { name: "ECDSA", hash: "SHA-256" };
var ME = "me";
var PLAYER = "player";
var BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
async function userIdOf(x, y) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`trystero:uid:v1:${x}.${y}`)));
  let n = digest.reduce((v, b) => v << 8n | BigInt(b), 0n) % 62n ** 22n, out = "";
  for (let i = 0; i < 22; i++) {
    out = BASE62[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out;
}
var Identity = class _Identity {
  id;
  #key;
  #jwk;
  constructor(id, key, jwk) {
    this.id = id;
    this.#key = key;
    this.#jwk = jwk;
  }
  // R474, R475: made on first use and kept; a page without a database keeps it for this load only.
  /** The browser's own identity, or with `key` a player name's, from the `identity` store. */
  static async load(db, key = ME) {
    const kept = db && await db.tx(["identity"], "readonly", (t) => t.get("identity", key));
    const pair = kept ?? await crypto.subtle.generateKey(ALG, false, ["sign", "verify"]);
    if (db && !kept) await db.tx(["identity"], "readwrite", (t) => t.put("identity", key, pair));
    const { x, y } = await crypto.subtle.exportKey("jwk", pair.publicKey);
    return new _Identity(await userIdOf(x, y), pair.privateKey, { kty: "EC", crv: "P-256", x, y });
  }
  // R475: a player name's identity, made the first time the name is taken here.
  /** The identity of the player name `name` in this browser. */
  static player(db, name2) {
    return _Identity.load(db, [PLAYER, name2]);
  }
  // R477: the first time, with no names held, the name from before names were per tab takes a copy of
  // the browser's own key pair, so its id and its claims hold.
  /** The player names this browser holds. */
  static async held(db, before2) {
    if (!db) return [];
    return db.tx(["identity"], "readwrite", async (t) => {
      const names = (await t.keys("identity", PLAYER)).map((k) => k[1]);
      if (names.length || !before2) return names;
      const me = await t.get("identity", ME);
      if (!me) return [];
      await t.put("identity", [PLAYER, before2], me);
      return [before2];
    });
  }
  // R478: a rename taken moves the name's key pair to the new name, so its id holds.
  /** Move the player name `from`'s key pair to `to`. */
  static async renamed(db, from, to) {
    if (!db) return;
    await db.tx(["identity"], "readwrite", async (t) => {
      const pair = await t.get("identity", [PLAYER, from]);
      if (!pair) return;
      await t.put("identity", [PLAYER, to], pair);
      await t.del("identity", [PLAYER, from]);
    });
  }
  // Seq: seq-join.md#1.2 | R470: what Trystero proves this browser with; the private half stays here.
  /** This browser's identity as Trystero takes it. */
  trystero() {
    return {
      userId: this.id,
      signPubJwk: this.#jwk,
      sign: async (payload) => new Uint8Array(await crypto.subtle.sign(SIG, this.#key, payload))
    };
  }
};

// src/net/claims.ts
var book = (game2) => game2.get("book");
function oldClaims(game2) {
  const b = book(game2), claims = Object.fromEntries(Object.entries(b.claims).filter(([, id]) => ID.test(id)));
  return Object.keys(claims).length === Object.keys(b.claims).length ? null : (w) => w.put("book", { ...b, claims });
}
function whoIs(game2, name2, browser) {
  if (!name2 || name2 === GM) return null;
  const b = book(game2), held = b.claims[name2];
  if (held === void 0) {
    game2.change((w) => w.put("book", { ...b, claims: { ...b.claims, [name2]: browser } }));
    return name2;
  }
  return held === browser ? name2 : null;
}
function handOver2(game2, name2, browser) {
  const b = book(game2);
  game2.change((w) => w.put("book", { ...b, claims: { ...b.claims, [name2]: browser } }));
}
function why(name2) {
  return `${name2} is played from another browser, so the GM's page shows you only what anyone sees and doesn't take your changes. The GM can hand ${name2} to you by clicking your name in their strip.`;
}
var fold2 = (s) => s.trim().toLowerCase();
function renameWhy(game2, from, to) {
  const t = to.trim();
  if (!t) return "A name can't be blank.";
  if (t.length > 32) return "A name is at most 32 characters.";
  if (fold2(t) === fold2(GM) || fold2(t) === fold2(OPEN)) return `\u201C${t}\u201D is a word the table keeps for itself.`;
  for (const n of Object.keys(book(game2).claims)) if (n !== from && fold2(n) === fold2(t)) return `${n} is already at this table.`;
  for (const [, r] of game2.all()) {
    if ("kind" in r && r.kind === "character" && r.owner !== from && fold2(r.owner) === fold2(t)) return `${r.owner} already owns ${r.name}.`;
  }
  return null;
}
function renamed(game2, from, to) {
  const t = to.trim(), b = book(game2), claims = { ...b.claims }, held = claims[from];
  delete claims[from];
  if (held !== void 0) claims[t] = held;
  const follow = (r) => !("kind" in r) ? r : r.kind === "character" && r.owner === from ? { ...r, owner: t } : r.kind === "chip" && r.by === from ? { ...r, by: t } : isPaper(r) && (r.by === from || r.to?.includes(from)) ? { ...r, ...r.by === from && { by: t }, ...r.to && { to: r.to.map((n) => n === from ? t : n) } } : r;
  return (w) => {
    w.put("book", { ...b, claims });
    for (const [rid2, r] of game2.all()) {
      if (rid2 === "yards") {
        const y = r;
        w.put(rid2, { ...y, yards: y.yards.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, records: i.records.map((x) => follow(x)) })) })) });
      } else if (rid2 === "desk") {
        const d = desksOf(r);
        const each = (rs) => rs.map((x) => follow(x));
        w.put(rid2, { ...d, desks: d.desks.map((one) => ({ ...one, items: one.items.map((e) => ({ ...e, records: each(e.records) })), ...one.top && { top: each(one.top) } })) });
      } else {
        const f = follow(r);
        if (f !== r) w.put(rid2, f);
      }
    }
  };
}

// src/net/envelope.ts
var VERSION = 1;
var KINDS = ["hello", "here", "bye", "recs", "sync", "edit", "move", "intent", "roll", "crit", "take", "name", "refuse", "claim", "claims", "tape", "rename"];
var LIMITS = { dice: 40, moveItems: 8, batch: 1e4, why: 500, box: 4e6 };
var tab = str(CAPS.id);
var name = str(CAPS.name);
var why2 = str(LIMITS.why);
var seq = int(0, Number.MAX_SAFE_INTEGER);
var coord2 = num(-CAPS.coord, CAPS.coord);
var opponent = (v) => v === null || v === WORLD || isOid(v);
var whyOrNull = (v) => v === null || why2(v);
var box = fields({ iv: str(24), data: str(LIMITS.box) });
var slotName = oneOf(...SLOTS);
var rid = str(CAPS.id);
var aim = fields({}, {
  slot: fields({ owner: isOid, name: slotName }),
  drawer: fields({ owner: isOid }, { at: int(0, 1e3) }),
  kill: isOid,
  merge: rid,
  card: rid,
  docket: rid,
  reach: fields({ owner: isOid, at: slotName, from: (v) => v === null || slotName(v) }),
  chip: bool
});
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
  move: fields({ s: seq, items: list(fields({ rid: str(CAPS.id), x: coord2, y: coord2, z: int(0, CAPS.coord) }, { part: str(CAPS.id), aim }), LIMITS.moveItems) }, { drop: bool }),
  intent: fields(
    {
      n: seq,
      pool: isOid,
      action: name,
      vs: opponent,
      defend: oneOf("mental", "psych"),
      hand: fields({ yellows: int(-LIMITS.dice, LIMITS.dice), bonus: int(-1e3, 1e3) })
    },
    { row: str(32), type: oneOf(...ROLL_TYPES), alt: name, against: (v) => [
      fields({ def: oneOf("mental", "psych") }),
      fields({ act: name }),
      fields({ fld: name }),
      fields({ skl: name })
    ].some((f) => f(v)), reaction: isOid }
  ),
  roll,
  crit: fields({ id: str(CAPS.id), choice: oneOf("max", "dbl"), lock: bool }),
  // R314: a take names a page, a count per row; a name is for one waiting Slot (R340: or a Conviction or Burden).
  take: fields({ id: str(CAPS.id), page: fields({ use: fields(Object.fromEntries(ROWS.map((r) => [r, int(0, 20)]))), overflow: int(0, 1e4) }) }),
  name: fields({ id: str(CAPS.id), damage: oneOf(...DAMAGE), row: oneOf(...ROWS, "lasting"), name }),
  refuse: fields({ why: why2 }, { n: seq }),
  claim: fields({ name, why: whyOrNull }),
  // R446: who holds each name, from the GM's page: name → browser id.
  claims: fields({ claims: dict(str(CAPS.id)) }),
  // R490: a page arriving asks (no receipts), and the GM's page answers with the table's view of its tape.
  tape: fields({}, { receipts: list(receipt, KEPT) }),
  // R469: a player's new name, and the GM's page's answer (why null: taken).
  rename: fields({ to: name }, { why: whyOrNull })
};
var sealedRoll = (v) => fields({ re: seq, receipt })(v) && fewDice(v.receipt);
var sealedRecs = fields({ g: seq, puts: list(put, LIMITS.batch) }, { dels: list(del, LIMITS.batch) });
var change2 = (v) => fields({ rid: str(CAPS.id), rec: () => true })(v) && check(v.rid, v.rec);
var editBody = fields({ s: seq, base: seq, puts: list(change2, LIMITS.batch), dels: list(str(CAPS.id), LIMITS.batch) });
var header = fields({ v: oneOf(VERSION), kind: oneOf(...KINDS), tab, at: num(0, 1e15), body: () => true });
function make2(kind, from, body, at4 = Date.now()) {
  return { v: VERSION, kind, tab: from, at: at4, body };
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
var stampOf = (o) => o.by === void 0 ? { s: o.s } : { s: o.s, by: o.by };
var kindOf = (r) => r && "kind" in r ? r.kind : void 0;
var characters2 = (game2) => (oid) => game2.get(`o:${oid}`);
var seen = (rec, viewer, chars) => same(redact(rec, viewer, chars), rec);
var forged = (old, rec, who) => "kind" in rec && rec.kind === "chip" && rec.by !== void 0 && rec.by !== who && rec.by !== (old && "kind" in old && old.kind === "chip" ? old.by : void 0);
var paperOf = (r) => r && "kind" in r && isPaper(r) ? r : void 0;
var handing = (old, rec, who) => {
  const p = paperOf(rec);
  return !!p && handsOver(paperOf(old), p, who);
};
var misread = (old, rec, who) => {
  const p = paperOf(rec), was = paperOf(old);
  if (!p || handing(old, rec, who)) return false;
  if (!was) return p.by !== void 0 && p.by !== who;
  if (p.by !== was.by) return true;
  return reread(p, was) && ownerOf(was) !== who;
};
var ruled2 = (old, rec) => {
  const f = old && "kind" in old && old.kind === "influence" ? old.flag : void 0;
  if (!f) return false;
  const g = "kind" in rec && rec.kind === "influence" ? rec.flag : void 0;
  return !g || !g.why.includes(f.why) || Object.entries(f.fed ?? {}).some(([k, n]) => (g.fed?.[k] ?? 0) < n);
};
function mergeYards(real2, mine, viewer, chars, deleted) {
  const truth = /* @__PURE__ */ new Map(), secret = /* @__PURE__ */ new Set(), cards = /* @__PURE__ */ new Map();
  for (const g of real2?.yards ?? []) for (const b of g.items) {
    if (b.gm) {
      cards.set(b.gm, b);
      if (!viewer?.gm) secret.add(b.gm);
    }
    for (const r of b.records) {
      truth.set(r.oid, r);
      if (!seen(r, viewer, chars)) secret.add(r.oid);
    }
  }
  const kept = /* @__PURE__ */ new Set();
  const unread = (r) => isPaper(r) && !reads(viewer, r);
  const home = /* @__PURE__ */ new Map();
  for (const g of real2?.yards ?? []) for (const b of g.items) for (const r of b.records) home.set(r.oid, b);
  const yards = mine.yards.map((g) => ({ ...g, items: g.items.flatMap((b) => {
    if (b.gm && secret.has(b.gm)) {
      kept.add(b.gm);
      return [cards.get(b.gm)];
    }
    if (b.gm && !viewer?.gm) return [];
    const records3 = b.records.flatMap((r) => {
      if (truth.has(r.oid)) {
        if (secret.has(r.oid)) kept.add(r.oid);
        return [truth.get(r.oid)];
      }
      const d = deleted.get(r.oid);
      return d ? [d] : [];
    });
    const was = records3.map((r) => home.get(r.oid)).find((x) => x);
    for (const r of was?.records.filter(unread) ?? []) if (!kept.has(r.oid)) {
      kept.add(r.oid);
      records3.push(r);
    }
    return records3.length || b.info ? [{ ...b, records: records3 }] : [];
  }) }));
  (real2?.yards ?? []).forEach((g) => g.items.forEach((b, k) => {
    if (b.gm || !b.records.length || !b.records.every(unread) || b.records.every((r) => kept.has(r.oid))) return;
    const to = yards.find((y) => y.name === g.name) ?? yards[0];
    if (!to) return;
    to.items.splice(Math.min(k, to.items.length), 0, b);
    for (const r of b.records) kept.add(r.oid);
  }));
  return [...secret].every((o) => kept.has(o)) ? { yards } : null;
}
function mergeRows(real2, mine, who, chars) {
  const rows = { ...real2?.rows };
  for (const [oid, r] of Object.entries(mine.rows)) {
    if (chars(oid)?.owner !== who) continue;
    const { alt: _a, type: _t, ...gms } = rows[oid] ?? { pool: oid, action: "", opponent: null, defend: "mental", row: null, byHand: false, hand: { yellows: 1, bonus: 0 } };
    rows[oid] = { ...gms, action: r.action, hand: r.hand, ...r.alt && { alt: r.alt }, ...r.type && { type: r.type } };
  }
  for (const [oid, r] of Object.entries(real2?.rows ?? {})) {
    if (!(oid in mine.rows) && !r.priv && chars(oid)?.owner === who) delete rows[oid];
  }
  return { rows };
}
function capped(m, at4) {
  const keys2 = Object.keys(m);
  let dropped = 0;
  if (keys2.length > TOMBS) for (const k of keys2.sort((a, b) => at4(m[a]) - at4(m[b])).slice(0, keys2.length - TOMBS)) {
    dropped = Math.max(dropped, at4(m[k]));
    delete m[k];
  }
  return dropped;
}
function judge(game2, edit, who, tab2) {
  const all2 = [...edit.puts.map((p) => p.rid), ...edit.dels].filter((rid2) => rid2 !== "meta" && !isLocal(rid2));
  const book2 = game2.get("book"), chars = characters2(game2);
  if (!who) return { puts: [], dels: [], refused: all2 };
  if (edit.base < (book2.floor ?? 0)) return { puts: [], dels: [], refused: all2 };
  if (edit.puts.some((p) => p.rid === "yards") && edit.base < (book2.hillGv ?? 0)) return { puts: [], dels: [], refused: all2 };
  const viewer = { name: who, gm: false };
  const mine = (old, rec) => {
    if (old && !seen(old, viewer, chars)) return false;
    if (rec && !seen(rec, viewer, chars) && !handing(old, rec, who)) return false;
    const gms = (r) => !!r && "kind" in r && (r.kind === "connections" || r.kind === "opinion");
    if (gms(old) || gms(rec)) return false;
    const c = (r) => r && "kind" in r && r.kind === "character" ? r : void 0;
    const before2 = c(old), after = c(rec);
    if (!before2 && !after) return true;
    if (rewrites(before2, after) && !mayWrite(viewer, before2)) return false;
    return mayChange(viewer, before2, after);
  };
  const stale = (rid2) => {
    const l = book2.last?.[rid2];
    return !!l && l.g > edit.base && l.by !== tab2;
  };
  const buried = /* @__PURE__ */ new Map();
  for (const g of game2.get("yards")?.yards ?? []) for (const b of g.items) for (const r of b.records) buried.set(r.oid, r);
  const puts = [], dels = [], refused = [];
  for (const rid2 of edit.dels) {
    if (!all2.includes(rid2)) continue;
    if (isPiece(rid2) && !stale(rid2) && mine(game2.get(rid2), void 0)) dels.push(rid2);
    else refused.push(rid2);
  }
  for (const { rid: rid2, rec } of edit.puts) {
    if (!all2.includes(rid2)) continue;
    if (rid2 === "yards") {
      const deleted = new Map(dels.map((d) => [oidOf(d), game2.get(d)]));
      const merged = mergeYards(game2.get("yards"), rec, viewer, chars, deleted);
      if (merged) puts.push({ rid: rid2, rec: merged });
      else refused.push(rid2);
    } else if (rid2 === "rows") puts.push({ rid: rid2, rec: mergeRows(game2.get("rows"), rec, who, chars) });
    else if (!isPiece(rid2) || (book2.tomb[rid2] ?? 0) > edit.base) refused.push(rid2);
    else if (kindOf(rec) === "tornroll") refused.push(rid2);
    else if (stale(rid2)) refused.push(rid2);
    else if (forged(game2.get(rid2), rec, who)) refused.push(rid2);
    else if (misread(game2.get(rid2) ?? buried.get(oidOf(rid2)), rec, who)) refused.push(rid2);
    else if (ruled2(game2.get(rid2), rec)) refused.push(rid2);
    else if (mine(game2.get(rid2), rec)) puts.push({ rid: rid2, rec });
    else refused.push(rid2);
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
  /** R444: the pieces changed since the last batch, and the tab whose change it was. */
  #touched = /* @__PURE__ */ new Map();
  /** R446: the claims last sent to everyone. */
  #claims = "";
  #flushing = false;
  #work = Promise.resolve();
  constructor(w) {
    this.#w = w;
    w.game.listen((rids) => {
      for (const rid2 of rids) if (isPiece(rid2)) this.#touched.set(rid2, w.link.tab);
      if (rids.has("book")) this.#sendClaims();
      this.#queue(rids);
    });
    w.link.on("sync", (_, from) => {
      this.#catchUp(from.tab);
    });
    w.link.on("edit", (body, from) => this.#edit(body.box, from));
    w.link.on("bye", (_, from) => {
      this.#tabs.delete(from.tab);
    });
    w.link.on("rename", (body, from) => {
      if (body.why === void 0) this.#rename(from.tab, body.to);
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
    this.#queue(new Set(this.#w.game.all().map(([rid2]) => rid2)));
  }
  // R469: a player's rename: the name their tab holds (a nobody has none), checked, and if free, everything
  // they hold follows it in one change; the tab is answered either way, and the claims go out as they change.
  #rename(tab2, to) {
    const t = this.#tabs.get(tab2), { game: game2, link } = this.#w;
    if (!t) return;
    const who = this.#viewer(t)?.name, refused = who ? renameWhy(game2, who, to) : "Only a name your browser holds can be renamed.";
    if (!refused) {
      game2.change(renamed(game2, who, to));
      t.name = to.trim();
    }
    link.send("rename", { to, why: refused }, tab2);
  }
  // R168, R296: after the GM hands a name over, the new holder gets its secrets, and every page of
  // that name hears whether it holds it: `why` for the one that doesn't, null for the holder.
  /** Tells the pages playing as `name` where the name now is. */
  handedOver(name2) {
    this.recheck();
    for (const [tab2, t] of this.#tabs) if (t.name === name2) this.#w.link.send("claim", { name: name2, why: this.#viewer(t) ? null : why(name2) }, tab2);
  }
  #queue(rids) {
    for (const rid2 of rids) this.#pending.add(rid2);
    if (this.#flushing) return;
    this.#flushing = true;
    const { schedule } = this.#w;
    schedule(() => {
      this.#flushing = false;
      this.#out();
    });
  }
  #stamp(rid2) {
    const o = this.#origin.get(rid2);
    if (o?.fresh) {
      o.fresh = false;
      return stampOf(o);
    }
    const mine = { s: this.#w.stamps.next() };
    this.#origin.set(rid2, { ...mine, fresh: false });
    return mine;
  }
  /** The stamp a piece already went out under, for a catch-up. */
  #current(rid2) {
    const o = this.#origin.get(rid2);
    return o ? stampOf(o) : this.#stamp(rid2);
  }
  // Seq: seq-sync.md#1.1 to seq-sync.md#1.6 | R170, R174, R175, R185, R188
  #out() {
    const { game: game2 } = this.#w, chars = characters2(game2);
    let rids = [...this.#pending].filter((rid2) => !isLocal(rid2));
    this.#pending.clear();
    if (rids.some((rid2) => kindOf(game2.get(rid2)) === "character" || kindOf(this.#public.get(rid2)) === "character")) {
      rids = [...game2.all().map(([rid2]) => rid2).filter((rid2) => !isLocal(rid2)), ...rids.filter((rid2) => !game2.get(rid2))];
    }
    const puts = [], dels = [], sealFor = /* @__PURE__ */ new Map();
    const gone = [];
    for (const rid2 of /* @__PURE__ */ new Set([...rids, ...this.#answerDel])) {
      const rec = game2.get(rid2);
      if (!rec) {
        const holders = [...this.#tabs].filter(([, t]) => t.holds.has(rid2));
        const wasPublic = this.#public.has(rid2) || this.#answerDel.has(rid2);
        if (!wasPublic && !holders.length) continue;
        const stamp3 = this.#stamp(rid2);
        if (wasPublic) dels.push({ rid: rid2, ...stamp3 });
        else for (const [tab2] of holders) {
          const f = sealFor.get(tab2) ?? { puts: [], dels: [] };
          f.dels.push({ rid: rid2, ...stamp3 });
          sealFor.set(tab2, f);
        }
        this.#public.delete(rid2);
        for (const t of this.#tabs.values()) t.holds.delete(rid2);
        gone.push(rid2);
        continue;
      }
      const pv = redact(rec, null, chars), changed = !same(this.#public.get(rid2), pv);
      let stamp2;
      const stampOnce = () => stamp2 ??= this.#stamp(rid2);
      if (changed && pv) {
        this.#public.set(rid2, pv);
        puts.push({ rid: rid2, ...stampOnce(), rec: pv });
      } else if (changed) {
        this.#public.delete(rid2);
        dels.push({ rid: rid2, ...stampOnce() });
      }
      for (const [tab2, t] of this.#tabs) {
        const tv = redact(rec, this.#viewer(t), chars), holds = changed ? pv : t.holds.get(rid2);
        if (tv) t.holds.set(rid2, tv);
        else t.holds.delete(rid2);
        if (same(tv, holds)) continue;
        const f = sealFor.get(tab2) ?? { puts: [], dels: [] };
        if (tv) f.puts.push({ rid: rid2, ...stampOnce(), rec: tv });
        else f.dels.push({ rid: rid2, ...stampOnce() });
        sealFor.set(tab2, f);
      }
    }
    this.#answerDel.clear();
    if (!puts.length && !dels.length && !sealFor.size) return;
    const book2 = game2.get("book"), g = book2.gv + 1;
    const tomb = { ...book2.tomb }, last = { ...book2.last };
    for (const rid2 of gone) if (isPiece(rid2)) tomb[rid2] = g;
    for (const p of puts) delete tomb[p.rid];
    for (const [rid2, by] of this.#touched) if (game2.get(rid2)) last[rid2] = { g, by };
    else delete last[rid2];
    this.#touched.clear();
    const hill = puts.some((p) => p.rid === "yards") ? { hillGv: g } : {};
    const floor2 = Math.max(book2.floor ?? 0, capped(tomb, (v) => v), capped(last, (v) => v.g));
    game2.change((w) => w.put("book", { ...book2, gv: g, tomb, last, ...floor2 && { floor: floor2 }, ...hill }));
    this.#send({ g, full: false, puts, dels }, sealFor);
  }
  // Seq: seq-join.md#1.10.2, seq-join.md#1.12.1 | R446: who holds each name is no secret: to everyone
  // when it changes, and to a tab catching up.
  #sendClaims(to) {
    const claims = this.#w.game.get("book").claims, json = JSON.stringify(claims);
    if (!to && json === this.#claims) return;
    if (!to) this.#claims = json;
    this.#w.link.send("claims", { claims }, to);
  }
  #send(batch, sealFor, to) {
    const { link, sealer } = this.#w;
    this.#work = this.#work.then(async () => {
      const sealed = {};
      for (const [tab2, { puts, dels }] of sealFor) {
        const t = this.#tabs.get(tab2);
        if (t) sealed[tab2] = await sealer.seal(t.sealKey, "recs", link.tab, tab2, { g: batch.g, puts, ...dels.length && { dels } });
      }
      link.send("recs", { ...batch, sealed }, to);
    });
  }
  // Seq: seq-join.md#1.12 | R171: the whole table to one tab, at the current version without moving it.
  #catchUp(tab2) {
    const t = this.#tabs.get(tab2);
    if (!t) return;
    const { game: game2 } = this.#w, chars = characters2(game2), viewer = this.#viewer(t);
    const puts = [], mine = [];
    t.holds.clear();
    for (const [rid2, rec] of game2.all()) {
      if (isLocal(rid2)) continue;
      const stamp2 = this.#current(rid2), pv = redact(rec, null, chars), tv = redact(rec, viewer, chars);
      if (pv) puts.push({ rid: rid2, ...stamp2, rec: pv });
      if (pv && !this.#public.has(rid2)) this.#public.set(rid2, pv);
      if (tv && !same(tv, pv)) mine.push({ rid: rid2, ...stamp2, rec: tv });
      if (tv) t.holds.set(rid2, tv);
    }
    const g = game2.get("book").gv;
    this.#send({ g, full: true, puts, dels: [] }, mine.length ? /* @__PURE__ */ new Map([[tab2, { puts: mine, dels: [] }]]) : /* @__PURE__ */ new Map(), tab2);
    this.#sendClaims(tab2);
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
  // R300: a move saves nothing; this page shows a player's carry only of what it would take from
  // them, unchanged (a nobody's, or another's piece, isn't shown). The drop's change is judged.
  /** Whether this page shows `tab`'s move of `rid`. */
  mayMove(tab2, rid2) {
    const t = this.#tabs.get(tab2), r = this.#w.game.get(rid2);
    if (!t || !r) return false;
    const gv = this.#w.game.get("book").gv;
    return judge(this.#w.game, { s: 0, base: gv, puts: [{ rid: rid2, rec: r }], dels: [] }, this.#viewer(t)?.name ?? null, tab2).refused.length === 0;
  }
  // Seq: seq-edit.md#1.4, seq-edit.md#1.5, seq-edit.md#1.7: judge, take what's allowed, answer the rest.
  #take(edit, tab2) {
    const t = this.#tabs.get(tab2), { game: game2, stamps } = this.#w;
    if (!t) return;
    const fresh3 = (rid2) => stamps.fresh(rid2, tab2, edit.s);
    const current = { ...edit, puts: edit.puts.filter((p) => fresh3(p.rid)), dels: edit.dels.filter(fresh3) };
    const verdict = judge(game2, current, this.#viewer(t)?.name ?? null, tab2);
    for (const rid2 of [...current.puts.map((p) => p.rid), ...current.dels]) stamps.mark(rid2, tab2, edit.s);
    const theirs = (rid2) => {
      this.#origin.set(rid2, { s: edit.s, by: tab2, fresh: true });
    };
    const answer = (rid2) => {
      theirs(rid2);
      this.#public.delete(rid2);
      for (const x of this.#tabs.values()) x.holds.delete(rid2);
      if (!game2.get(rid2)) this.#answerDel.add(rid2);
    };
    const taken = [...verdict.puts.map((p) => p.rid), ...verdict.dels];
    for (const rid2 of taken) theirs(rid2);
    for (const p of verdict.puts) if (!redact(p.rec, this.#viewer(t), characters2(game2))) t.holds.set(p.rid, p.rec);
    const changed = game2.change((w) => {
      for (const p of verdict.puts) w.put(p.rid, p.rec);
      for (const rid2 of verdict.dels) w.del(rid2);
    });
    for (const rid2 of changed) if (isPiece(rid2)) this.#touched.set(rid2, tab2);
    const unchanged = taken.filter((rid2) => !changed.has(rid2));
    for (const rid2 of unchanged) answer(rid2);
    for (const rid2 of verdict.refused) answer(rid2);
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
    return `hollow.seen.${this.#w.copy}`;
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
  // R443: a new key, or a message after AWAY_MS of silence, means the GM's page came back.
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
    const due = [...this.#pending].filter(([, p]) => now2 - p.at >= RESEND_MS).map(([rid2]) => rid2);
    if (!due.length) return;
    const gaveUp = due.filter((rid2) => ++this.#pending.get(rid2).tries > TRIES);
    for (const rid2 of gaveUp) {
      this.#pending.delete(rid2);
      this.#w.stamps.forget(rid2, this.#w.link.tab);
    }
    this.#resend(due.filter((rid2) => this.#pending.has(rid2)));
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
      let puts = batch.puts, dels = batch.dels;
      const box2 = batch.sealed[this.#w.link.tab];
      if (box2) {
        const mine = await this.#w.sealer.open(from.sealKey, "recs", from.tab, this.#w.link.tab, box2);
        if (sealedRecs(mine) && mine.g === batch.g) {
          const own2 = new Set(mine.puts.map((p) => p.rid));
          puts = [...puts.filter((p) => !own2.has(p.rid)), ...mine.puts];
          dels = [...dels.filter((d) => !own2.has(d.rid)), ...mine.dels ?? []];
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
      this.#apply(puts, dels, from.tab, batch.full);
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
  #takes(rid2, by, s) {
    if (!this.#w.stamps.fresh(rid2, by, s)) return false;
    const p = this.#pending.get(rid2);
    if (!p) return true;
    if (by !== this.#w.link.tab || s < p.s) return false;
    this.#pending.delete(rid2);
    this.#keepPending();
    return true;
  }
  #apply(puts, dels, gmTab, full) {
    const held = this.#w.held ?? (() => false);
    const now2 = [], gone = [];
    for (const d of dels) {
      const by = d.by ?? gmTab;
      if (isLocal(d.rid) || !this.#takes(d.rid, by, d.s)) continue;
      if (held(d.rid)) {
        this.#deferred.set(d.rid, { del: d, by });
        continue;
      }
      this.#w.stamps.mark(d.rid, by, d.s);
      gone.push(d.rid);
    }
    for (const p of puts) {
      const by = p.by ?? gmTab;
      if (isLocal(p.rid) || !this.#takes(p.rid, by, p.s)) continue;
      if (held(p.rid)) {
        this.#deferred.set(p.rid, { put: p, by });
        continue;
      }
      this.#w.stamps.mark(p.rid, by, p.s);
      now2.push(p);
    }
    if (full) {
      const have = new Set(puts.map((p) => p.rid));
      for (const [rid2] of this.#w.game.all()) {
        if (isPiece(rid2) && !have.has(rid2) && !this.#pending.has(rid2) && !held(rid2)) gone.push(rid2);
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
        for (const rid2 of dels) w.del(rid2);
      });
    } finally {
      this.#quiet = false;
    }
  }
  // R183: what waited for a held piece is checked again when it's let go.
  /** This page let go of `rid`. */
  release(rid2) {
    const d = this.#deferred.get(rid2);
    if (!d) return;
    this.#deferred.delete(rid2);
    if (d.put) this.#apply([{ ...d.put, by: d.by }], [], d.by, false);
    if (d.del) this.#apply([], [{ ...d.del, by: d.by }], d.by, false);
  }
  // Seq: seq-edit.md#1.1, seq-edit.md#1.2, seq-edit.md#1.3 | R172
  #changed(rids) {
    const mine = [...rids].filter((rid2) => isPiece(rid2) || rid2 === "yards" || rid2 === "rows");
    if (!mine.length) return;
    const s = this.#w.stamps.next(), at4 = this.#w.clock.now();
    for (const rid2 of mine) {
      this.#w.stamps.mark(rid2, this.#w.link.tab, s);
      this.#pending.set(rid2, { s, at: at4, tries: 0, base: this.#seen, group: s });
    }
    this.#keepPending();
    this.#sendEdit(s, this.#seen, mine);
  }
  // R173: nothing goes before the table has arrived, so a stale copy can't overwrite the GM's.
  #sendEdit(s, base, rids) {
    const gm = this.#gmPeer;
    if (!gm || !this.synced) return;
    const { game: game2, sealer, link } = this.#w;
    const edit = { s, base, puts: [], dels: [] };
    for (const rid2 of rids) {
      const rec = game2.get(rid2);
      if (rec) edit.puts.push({ rid: rid2, rec });
      else if (isPiece(rid2)) edit.dels.push(rid2);
    }
    this.#work = this.#work.then(async () => {
      link.send("edit", { box: await sealer.seal(gm.sealKey, "edit", link.tab, gm.tab, edit) });
    });
  }
  // Seq: seq-edit.md#2.1: each change goes again as it went first: with what was changed with it,
  // and as old as its copy, so one refused as stale can't take a fresh one down with it.
  #resend(rids) {
    const groups2 = /* @__PURE__ */ new Map();
    for (const rid2 of rids) {
      const p = this.#pending.get(rid2);
      if (!p) continue;
      const g = groups2.get(p.group) ?? { base: p.base, rids: [] };
      g.rids.push(rid2);
      groups2.set(p.group, g);
    }
    const now2 = this.#w.clock.now();
    for (const { base, rids: group } of groups2.values()) {
      const s = this.#w.stamps.next();
      for (const rid2 of group) {
        const p = this.#pending.get(rid2);
        p.s = s;
        p.at = now2;
        this.#w.stamps.mark(rid2, this.#w.link.tab, s);
      }
      this.#sendEdit(s, base, group);
    }
    this.#keepPending();
  }
};

// src/net/images.ts
var RETRY_MS = 1e4;
var NOBODY = "Nobody at the table has sent this image yet (the page that has it may be closed); trying again";
var FULL = "This browser's storage is full, so the image can't be kept here; trying again";
var ImageExchange = class {
  /** Hashes shown on the table but not in the BlobStore, with why. */
  missing = /* @__PURE__ */ new Map();
  #changed = [];
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
  // R195: whoever draws images hears when one arrives or is found missing.
  /** Calls `fn` with a hash whenever that image arrives or is found missing. */
  changed(fn) {
    this.#changed.push(fn);
  }
  #mark(hash, why3) {
    const was = this.missing.get(hash);
    if (why3) this.missing.set(hash, why3);
    else this.missing.delete(hash);
    if (was !== why3 || !why3) for (const fn of this.#changed) fn(hash);
  }
  // Seq: seq-images.md#1.2 to seq-images.md#1.5 | R194
  /** Makes sure this page has the image: true once it does. */
  want(hash) {
    let asking = this.#asking.get(hash);
    if (!asking) {
      asking = (async () => {
        if (!await this.#blobs.get(hash)) {
          const blob = await this.#net.request(hash);
          if (!blob) {
            this.#mark(hash, NOBODY);
            return false;
          }
          const kept = await this.#blobs.accept(hash, blob).catch(() => null);
          if (kept === null) {
            this.#mark(hash, FULL);
            return false;
          }
          if (!kept) {
            this.#mark(hash, NOBODY);
            return false;
          }
        }
        this.#mark(hash, void 0);
        return true;
      })().finally(() => this.#asking.delete(hash));
      this.#asking.set(hash, asking);
    }
    return asking;
  }
  /** Every image the game shows is wanted, as it arrives. */
  watch(game2) {
    const check3 = (rids) => {
      for (const rid2 of rids) {
        const r = game2.get(rid2);
        if (r && "kind" in r && r.kind === "image") void this.want(r.blob);
      }
    };
    game2.listen(check3);
    check3(game2.all().map(([rid2]) => rid2));
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
  /** The one command waiting for each held piece, and the pass that saw it (R218). */
  #waiting = /* @__PURE__ */ new Map();
  #pass = 0;
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
    this.#sendNow(items.map(({ aim: _, ...i }) => i), true);
  }
  #sendNow(all2, drop = false) {
    const items = all2.filter((i) => this.#w.shared(i.rid));
    if (!items.length) return;
    const s = this.#w.stamps.next();
    for (const i of items) this.#w.stamps.mark(i.rid, this.#w.tab, s);
    this.#w.send({ s, items, ...drop && { drop: true } });
  }
  // Seq: seq-move.md#1.1, seq-move.md#1.2
  /** A move from another page joins the queue; an actor starts if none is running. */
  receive(from, move) {
    for (const i of move.items) this.#filling.push({ ...i, tab: from, s: move.s, ...move.drop && { drop: true } });
    this.#startActor();
  }
  // Seq: seq-move.md#1.3, seq-move.md#1.5 | R182
  /**
   * Swaps the buffers and works through what arrived, newest arrival first. The first command to
   * reach a piece places it; an older arrival changes it only if it is from the same page with a
   * higher number. Anything lower than what was applied from its page is discarded.
   */
  pass() {
    this.#pass++;
    const run2 = this.#filling;
    this.#filling = this.#draining;
    this.#draining = run2;
    const placed = /* @__PURE__ */ new Map();
    for (let k = run2.length - 1; k >= 0; k--) {
      const c = run2[k];
      if (this.#held.has(c.rid)) {
        this.#hold(c);
        continue;
      }
      if (!this.#w.stamps.fresh(c.rid, c.tab, c.s)) continue;
      this.#w.stamps.mark(c.rid, c.tab, c.s);
      const first2 = placed.get(c.rid);
      if (first2 && (first2.tab !== c.tab || c.s <= first2.s)) continue;
      placed.set(c.rid, c);
    }
    run2.length = 0;
    if (placed.size) this.#w.place([...placed.values()]);
    if (this.#filling.length) this.#later();
    else this.#acting = false;
  }
  // R183: a piece in your hand, or one you're writing in, waits until you let go.
  /** Whether this page holds `rid` (in hand, or being written in). */
  holds(rid2) {
    return this.#held.has(rid2);
  }
  /** This page holds `rid`: what arrives for it waits. */
  hold(rid2) {
    this.#held.add(rid2);
  }
  /** Let go of `rid`: what waited for it is checked again, as if it had just arrived. */
  release(rid2) {
    this.#held.delete(rid2);
    const waited = this.#waiting.get(rid2);
    if (!waited) return;
    this.#waiting.delete(rid2);
    this.#filling.push(waited.c);
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
  // R218: a held piece keeps only the most recent move for it, by the pass's own rule, never the
  // moves in between: a later pass's arrival replaces it, unless it is the same page's with a lower
  // number; within one pass (newest first) only the same page's higher number does.
  #hold(c) {
    const w = this.#waiting.get(c.rid), same4 = !!w && w.c.tab === c.tab;
    const newer = !w || (w.pass === this.#pass ? same4 && c.s > w.c.s : !(same4 && w.c.s > c.s));
    if (newer) this.#waiting.set(c.rid, { c, pass: this.#pass });
  }
};

// src/net/presence.ts
var OFFLINE_MS = 15e3;
var CHECK_MS = 1e3;
var HEART_MS = 1e4;
var STALE_MS = 25e3;
var GONE_MS = 6e4;
function newRoom(label2 = "table") {
  const hex = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${label2.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table"}-${hex}`;
}
function invite(base, room2, gm) {
  const u = new URL(base);
  u.search = "";
  u.hash = "";
  u.searchParams.set("room", room2);
  u.searchParams.set("gm", gm);
  return u.toString();
}
var ROOM2 = /^[a-z0-9-]{1,40}-[0-9a-f]{32}$/;
var OLD = /^[\w-]{20}$/;
function fromUrl(search2) {
  const q = new URLSearchParams(search2), room2 = q.get("room"), gm = q.get("gm");
  if (!room2 || !gm || !ROOM2.test(room2)) return null;
  if (ID.test(gm)) return { room: room2, gm };
  return OLD.test(gm) ? "old" : null;
}
var Presence = class {
  /** tab → who is there. */
  people = /* @__PURE__ */ new Map();
  status = { state: "live" };
  #w;
  #name;
  #lastLive;
  #tick = null;
  /** tab → when it was last heard. */
  #heard = /* @__PURE__ */ new Map();
  #beat = 0;
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
      this.#heard.set(from.tab, w.clock.now());
      w.here?.(person, from);
    });
    w.net.onLeave((p) => this.#gone(p.tab));
    w.net.on("bye", (_, from) => this.#gone(from.tab));
  }
  // R162: forget a tab: no longer heard from, no longer present.
  #gone(tab2) {
    this.#heard.delete(tab2);
    if (this.people.delete(tab2)) this.#w.gone?.(tab2);
  }
  get name() {
    return this.#name;
  }
  /** R293: whether a page hasn't been heard for 25 s (its tag dims). */
  stale(tab2) {
    const at4 = this.#heard.get(tab2);
    return at4 !== void 0 && this.#w.clock.now() - at4 >= STALE_MS;
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
    if (now2 - this.#beat >= HEART_MS) {
      this.#beat = now2;
      this.#w.net.send("here", { name: this.#name, role: this.#w.role });
    }
    for (const [tab2, at4] of this.#heard) if (now2 - at4 >= GONE_MS) this.#gone(tab2);
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
var die2 = (c, v, added2 = false) => ({ c, v, added: added2, dropped: false });
function crit(white, blue) {
  return white === 6 && blue >= 5;
}
var NAMES = [[20, "Exquisite"], [15, "Extreme"], [10, "Major"], [5, "Significant"], [1, "Minor"]];
function levelName2(result) {
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
  const plain2 = Math.max(0, sum2 + (outcome === "failure" ? 0 : bonus2));
  if (!isCrit) return { dice, resolved, outcome, result: plain2, level: levelName2(plain2) };
  const max = Math.max(0, result.length * 6 + bonus2), dbl = plain2 * 2;
  const chosen = max >= dbl ? "max" : "dbl";
  const value2 = Math.max(max, dbl);
  return { dice, resolved, outcome, result: value2, level: levelName2(value2), crit: { max, dbl, chosen, locked: false } };
}

// src/rules/request.ts
var same3 = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
function resource(lines2, name2) {
  return marks(lines2, "res").find((m) => same3(influence(m.text)?.name ?? "", name2));
}
function levelOf(front, name2) {
  const m = resource(parse(front), name2), r = m && influence(m.text);
  return r?.level ? levelsOf(r) : 0;
}
function givable(npc, pc, sl) {
  return marks(parse(npc.front), "res").flatMap((m) => {
    const r = influence(m.text), have = r?.level ? levelsOf(r) : 0, mine = r ? levelOf(pc.front, r.name) : 0;
    return r && have > mine && mine < sl ? [r.name] : [];
  });
}
function added(front, text) {
  const lines2 = front.split("\n"), head = lines2.findIndex((l) => /^<head>\s*Resources\s*<\/head>\s*$/i.test(l.trim()));
  const res = `<res>${text}</res>`;
  if (head < 0) return [...lines2, "<head>Resources</head>", res].join("\n");
  let at4 = head + 1;
  while (at4 < lines2.length && lines2[at4].trim() && !lines2[at4].trim().startsWith("<head>")) at4++;
  return [...lines2.slice(0, at4), res, ...lines2.slice(at4)].join("\n");
}
function transfer(npc, pc, name2, sl) {
  if (!givable(npc, pc, sl).some((n) => same3(n, name2))) return null;
  const nl = parse(npc.front), from = resource(nl, name2), have = levelsOf(influence(from.text));
  const mine = levelOf(pc.front, name2), moved = Math.min(sl - mine, have), extra = sl - mine - moved;
  const npcFront = serialize(setMark(nl, from, spend(from.text, moved)));
  const pl = parse(pc.front), to = resource(pl, name2);
  const pcFront = to ? serialize(setMark(pl, to, spend(to.text, -moved))) : added(pc.front, `${influence(from.text).name} +${levelWord(moved)}`);
  return { npc: { ...npc, front: npcFront }, pc: { ...pc, front: pcFront }, moved, extra };
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
var sum = (parts2) => ({ total: Object.values(parts2).reduce((a, b) => a + b, 0), parts: parts2 });
function total2(base, p) {
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

// src/rules/pool.ts
function worth(i) {
  return i.points + (i.kind === "chip" && i.rider ? 1 : 0);
}
var isPile = (u) => "members" in u;
var unitWorth = (u) => isPile(u) ? u.points : worth(u);
function rollUp(items) {
  const units2 = [];
  const key = (u) => isPile(u) ? [2, 0, ""] : [u.kind === "chip" && u.rider ? 1 : 0, u.kind === "chip" ? 0 : 1, u.oid];
  const before2 = (a, b) => {
    const [x, y] = [key(a), key(b)];
    return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0);
  };
  for (const sign2 of [1, -1]) {
    let side = items.filter((i) => i.sign === sign2 && i.points >= STEP);
    for (; ; ) {
      const counts = /* @__PURE__ */ new Map();
      for (const u of side) counts.set(u.points, [...counts.get(u.points) ?? [], u]);
      const v = [...counts.keys()].sort((a, b) => a - b).find((k) => counts.get(k).length >= 3);
      if (v === void 0) break;
      const three = [...counts.get(v)].sort(before2).slice(0, 3);
      side = [...side.filter((u) => !three.includes(u)), { sign: sign2, points: v + STEP, members: three }];
    }
    units2.push(...side, ...items.filter((i) => i.sign === sign2 && i.points < STEP));
  }
  return units2;
}
function value(items) {
  const units2 = rollUp(items);
  const best = (s) => Math.max(0, ...units2.filter((u) => u.sign === s).map(unitWorth));
  return best(1) - best(-1);
}
function pools(character2, items) {
  const inSlot3 = (name2) => items.filter((i) => typeof i.where === "object" && "slot" in i.where && i.where.slot === character2 && i.where.name === name2);
  return Object.fromEntries(SLOTS.map((s) => [s, value(inSlot3(s))]));
}
function accepts(slot2, item2) {
  if (item2.kind !== "influence") return true;
  if (item2.damage) return item2.damage === slot2;
  return !item2.mot || slot2 === "main";
}

// src/net/rolls.ts
var WAIT_MS = 1e4;
var MANY = 20;
var OUTCOME = { success: "Success", cost: "Success at cost", failure: "Failure" };
var signed2 = (n) => n >= 0 ? `+${n}` : `\u2212${-n}`;
var DIE_NAME = { G: "Green", R: "Red" };
function rowWords(r) {
  const i = ADV.indexOf(r), above = ADV[i - 1];
  let range;
  if (r.auto === "success") range = `${signed2(r.min)} or more`;
  else if (r.auto === "failure") range = `${signed2(above.min - 1)} or less`;
  else {
    const hi = above.min - 1;
    range = hi < 0 ? `${signed2(hi)} to ${signed2(r.min)}` : `${signed2(r.min)} to ${signed2(hi)}`;
  }
  return `${range} ${r.words}: ${r.auto ? `automatic ${r.auto}` : diceOnly(r)}`;
}
function resolutionWords(r, dice) {
  if (r.auto) return `${r.words}: automatic ${r.auto}`;
  const w = dice.find((d) => d.c === "W").v, o = dice.find((d) => d.c === "G" || d.c === "R");
  let read2 = `White ${w}`;
  if (o) read2 = `${o.c === "G" ? "higher" : "lower"} of White ${w} and ${DIE_NAME[o.c]} ${o.v}`;
  return read2 + (r.mod ? ` ${r.mod > 0 ? "+" : "\u2212"} 1` : "");
}
function levelWords(dice, bonus2, failure) {
  const parts2 = dice.filter((d) => (d.c === "B" || d.c === "Y") && !d.dropped).map((d) => String(d.v));
  const b = failure || !bonus2 ? "" : ` ${bonus2 > 0 ? "+" : "\u2212"} ${Math.abs(bonus2)} bonus`;
  return parts2.join(" + ") + b;
}
var SHORT = { Minor: "Min", Significant: "Sig", Major: "Maj", Extreme: "Ext", Exquisite: "Exq" };
var slOf = (result) => Object.keys(SHORT).indexOf(levelName2(result)) + 1;
function outcomeWords(outcome, result, attack = false) {
  if (attack && outcome !== "failure") return `${OUTCOME[outcome]} ${result}`;
  return `${OUTCOME[outcome]} ${outcome === "failure" ? "\u2212" : "+"}${SHORT[levelName2(result)] ?? "0"}`;
}
function diceOnly(r) {
  if (r.auto) return r.auto === "success" ? "\u2713" : "\u2717";
  const die3 = r.die ? DIE_NAME[r.die] : "White";
  return r.mod ? `${die3} ${r.mod > 0 ? "+" : "\u2212"} 1` : die3;
}
function mint(game2) {
  let top = 0;
  for (const [rid2] of game2.all()) {
    if (!isPiece(rid2)) continue;
    const n = parseInt(oidOf(rid2), 16);
    if (n < PLAYER_OIDS) top = Math.max(top, n);
  }
  return (top + 1).toString(16).padStart(8, "0");
}
function resolve2(game2, intent, rng, at4) {
  const character2 = game2.get(ridOf(intent.pool));
  if (character2?.kind !== "character") return { refused: "That character is not on the table." };
  if (intent.reaction) return reaction(game2, intent.reaction, character2, rng, at4);
  const act = intent.action ? marks(parse(character2.front), "act").map((m) => action(m.text)).find((a) => a?.label === intent.action) : null;
  if (intent.action && !act) return { refused: `${character2.name} has no action \u201C${intent.action}\u201D.` };
  const items = game2.all().map(([, r2]) => r2).filter((r2) => "kind" in r2 && (r2.kind === "chip" || r2.kind === "influence"));
  const mine = pools(character2.oid, items), sum2 = act ? total2(act.base, mine) : null;
  const type = intent.type ?? "?";
  if (act && type === "?") return { refused: "Say what this roll is first." };
  if (act && !intent.vs) return { refused: "Aim it first." };
  const kind = isAttack(type) ? type : intent.defend;
  let opp, world, against, point = null;
  if (intent.vs === WORLD && sum2) {
    world = game2.get("world");
    if (!world?.set) return { refused: "The world has no number yet." };
    against = world.total;
  } else if (intent.vs && sum2) {
    opp = game2.get(ridOf(intent.vs));
    if (opp?.kind !== "character") return { refused: "That opponent is not on the table." };
    const def = marks(parse(opp.front), "def").map((m) => defend(m.text)).find((d) => d);
    point = intent.against ? pointed(opp.front, intent.against, act.att) : null;
    let base2;
    if (point) base2 = point.base;
    else if (kind === "phys" || !def) base2 = 0;
    else base2 = def[kind];
    against = opposition(base2, pools(opp.oid, items)).total;
  }
  const diff = against === void 0 || !sum2 ? void 0 : sum2.total - against;
  const picked2 = intent.row ? ADV.find((r2) => r2.key === intent.row) : void 0;
  const row2 = picked2 ?? (diff === void 0 ? ADV.find((r2) => r2.key === "white") : row(diff));
  const dice = act ? bonus({ yellows: act.yellows, bonus: act.bonus }, mine.bonus, intent.hand) : { yellows: Math.max(0, intent.hand.yellows), bonus: intent.hand.bonus };
  const r = roll2(row2, dice.yellows, dice.bonus, rng);
  const meta = game2.get("meta"), n = (meta.counts?.[character2.oid] ?? 0) + 1;
  const by = character2.owner === GM ? "GM" : character2.owner, outcome = r.crit ? "success" : r.outcome;
  const attack = isAttack(type) && opp && outcome !== "failure" ? { attack: { target: opp.oid, name: opp.name, from: character2.name, kind: type, result: r.result } } : {};
  const sl = slOf(r.result);
  const transfer2 = type === "request" && opp?.owner === GM && outcome !== "failure" && sl ? { transfer: { target: opp.oid, name: opp.name, sl } } : {};
  const id = `roll-${character2.oid}-${n}`;
  const base = {
    id,
    at: at4,
    title: `${character2.name}, roll ${n}`,
    by,
    ...act && { action: alternative(act.label, intent.alt) },
    dice: r.dice,
    resolution: resolutionWords(row2, r.dice),
    level: levelWords(r.dice, dice.bonus, r.outcome === "failure"),
    outcome: outcomeWords(outcome, r.result, isAttack(type)),
    ...r.crit && { crit: r.crit },
    ...attack,
    ...transfer2
  };
  let opposed;
  if (world) opposed = String(against);
  else if (point) opposed = point.words + (against !== point.base ? ` \u2192 ${against}` : "");
  else opposed = `${kind === "phys" ? "physical" : kind} ${against}`;
  const vsName = world ? "the world" : opp?.name;
  const vsFull = vsName && `${vsName} (${opposed}), Difference ${signed2(diff)}`;
  const owner = character2.owner === GM ? { name: GM, gm: true } : { name: character2.owner, gm: false };
  const seesOpp = world ? owner.gm : !opp || canSee(owner, opp);
  const numbers = sum2 && act ? { influence: sum2.total, base: act.base } : {};
  const full = { ...base, ...numbers, row: rowWords(row2), ...vsFull && { vs: vsFull } };
  const roller = {
    ...base,
    ...numbers,
    row: seesOpp ? rowWords(row2) : diceOnly(row2),
    ...vsName && { vs: seesOpp ? vsFull : vsName }
  };
  const table = { ...base, ...vsName && { vs: vsName } };
  const apply3 = (w) => {
    w.put("meta", { ...meta, rolls: meta.rolls + 1, counts: { ...meta.counts, [character2.oid]: n } });
    for (const i of items) {
      if (i.kind === "influence" && typeof i.where === "object" && "slot" in i.where && i.where.slot === character2.oid && !i.used) {
        if (i.once) w.del(ridOf(i.oid));
        else w.put(ridOf(i.oid), { ...i, used: true });
      }
    }
    if (!r.crit) return;
    const had = items.find((i) => i.kind === "influence" && i.crit && i.home === character2.oid);
    if (had) w.put(ridOf(had.oid), { ...had, points: had.points + 2 });
    else {
      const oid = mint(game2);
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
  return { full, roller, table, apply: apply3, character: character2 };
}
function reaction(game2, npcOid, character2, rng, at4) {
  const all2 = game2.all().map(([, r]) => r), t = tableOf(all2), npc = game2.get(ridOf(npcOid));
  if (npc?.kind !== "character") return { refused: "That NPC is not on the table." };
  const rec = t && recordOf(all2.filter((r) => r.kind === "opinion"), t, npc, character2.oid);
  if (!t || !rec || !awaits(rec.text)) return { refused: `${npc.name} has no Reaction to roll for ${character2.name}.` };
  const v = d6(rng), n = reactionOf(v);
  const meta = game2.get("meta"), k = (meta.counts?.[character2.oid] ?? 0) + 1;
  const receipt2 = {
    id: `roll-${character2.oid}-${k}`,
    at: at4,
    title: `${character2.name}, roll ${k}`,
    by: character2.owner === GM ? "GM" : character2.owner,
    dice: [{ c: "W", v, added: false, dropped: false }],
    resolution: `White ${v} on the Default Reaction table`,
    level: "",
    outcome: `${npc.name}'s Reaction: ${level(n)}`
  };
  const apply3 = (w) => {
    w.put("meta", { ...meta, rolls: meta.rolls + 1, counts: { ...meta.counts, [character2.oid]: k } });
    const now2 = { ...rec, text: reacted(rec.text, n) };
    w.put(ridOf(rec.oid), now2);
    w.put(ridOf(t.oid), synced(t, now2));
    const { [character2.oid]: _, ...rows } = game2.get("rows")?.rows ?? {};
    w.put("rows", { rows });
  };
  return { full: receipt2, roller: receipt2, table: receipt2, apply: apply3, character: character2 };
}
function choose(r, choice, lock) {
  if (!r.crit) return r;
  const value2 = choice === "max" ? r.crit.max : r.crit.dbl;
  return {
    ...r,
    outcome: outcomeWords("success", value2, !!r.attack),
    crit: { ...r.crit, chosen: choice, locked: lock },
    ...r.attack && !r.attack.taken && { attack: { ...r.attack, result: value2 } },
    ...r.transfer && !r.transfer.done && { transfer: { ...r.transfer, sl: slOf(value2) } }
  };
}
function alternative(label2, alt) {
  const alts = label2.split("/").map((a) => a.trim());
  return alt && alts.includes(alt) ? alt : label2;
}
var Rolls = class {
  #w;
  #gmPeer;
  #last = /* @__PURE__ */ new Map();
  #waiting = /* @__PURE__ */ new Map();
  #work = Promise.resolve();
  constructor(w) {
    this.#w = w;
    const link = w.link;
    if (!link) return;
    if (w.gm) {
      link.on("intent", (body, from) => this.#intent(body, from));
      link.on("crit", (body, from) => this.#crit(body, from));
      link.on("take", (body, from) => this.#take(body, from));
      link.on("name", (body, from) => this.#name(body, from));
      link.on("tape", (body, from) => {
        if (!body.receipts) this.#history(from.tab);
      });
    } else {
      link.on("roll", (body, from) => this.#heard(body, from));
      link.on("refuse", (body, from) => {
        if (from.browser !== w.gmBrowser || body.n === void 0) return;
        this.#answered(body.n, body.why);
      });
      for (const kind of ["hello", "here"]) link.on(kind, (_, from) => {
        if (from.browser !== w.gmBrowser) return;
        this.#gmPeer = from;
        if (this.#askedTape) return;
        this.#askedTape = true;
        link.send("tape", {}, from.tab);
      });
      link.on("tape", (body, from) => {
        if (from.browser === w.gmBrowser && body.receipts) this.#hung(body.receipts);
      });
    }
  }
  #askedTape = false;
  /** This page's tape, newest first. */
  #tape() {
    return this.#w.game.get("tape")?.receipts ?? [];
  }
  // R490: the table's view of each roll on the GM's own tape, newest first, from its
  // kept rolls: a private roll, or one no longer kept, is left out.
  #history(tab2) {
    const kept = this.#w.game.get("book")?.kept ?? [];
    const receipts = this.#tape().flatMap((r) => {
      const k = kept.find((x) => x.full.id === r.id);
      return k && !k.priv ? [k.table] : [];
    });
    this.#w.link.send("tape", { receipts }, tab2);
  }
  // R490, R491: of what hangs on the GM's tape, only the rolls newer than the newest this tape has held, each
  // once, merged in by when they were rolled: a new copy takes all, a page back takes what it missed, and
  // what it tore stays torn.
  #hung(receipts) {
    const tape = this.#w.game.get("tape"), mine = tape?.receipts ?? [], have = new Set(mine.map((r) => r.id));
    const newest = newestRoll(tape), missed = receipts.filter((r) => r.at > newest && !have.has(r.id));
    if (!missed.length) return;
    const all2 = [...mine, ...missed].sort((a, b) => b.at - a.at);
    this.#w.game.change((w) => w.put("tape", { ...tape, receipts: all2 }));
  }
  idle() {
    return this.#work;
  }
  // R308, R313: kept rolls live in the GM's own book (never sent), so a take or a name still works
  // after the GM's page reloads.
  /** The kept roll by its receipt's id. */
  #kept(id) {
    const k = (this.#w.game.get("book")?.kept ?? []).find((x) => x.full.id === id);
    return k && { ...k };
  }
  /** Keeps a roll (replacing it by id), the newest KEPT. */
  #keep(k) {
    const { game: game2 } = this.#w, book2 = game2.get("book") ?? { claims: {}, gv: 0, tomb: {} };
    const kept = [...(book2.kept ?? []).filter((x) => x.full.id !== k.full.id), k].slice(-KEPT);
    game2.change((w) => w.put("book", { ...book2, kept }));
  }
  // R103: a page that has left (Presence) can't roll for anyone; if it was the GM's, nobody can.
  /** Told by Presence that a tab has gone. */
  left(tab2) {
    if (this.#gmPeer?.tab === tab2) this.#gmPeer = void 0;
  }
  // R281: an error or a lost roll, as a short red note on this page's tape.
  note(text) {
    const at4 = this.#w.clock.now();
    this.#print({ id: `note-${at4}`, at: at4, title: text, dice: [], resolution: "", level: "", outcome: "missing" });
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
  /** Prints on this page's own tape (R465: it doesn't go over the wire, but to a page come late), newest first; a receipt
   * already there by id is replaced (a CRIT switched or locked). */
  #print(r) {
    const { game: game2 } = this.#w, tape = game2.get("tape") ?? { receipts: [] };
    const at4 = tape.receipts.findIndex((x) => x.id === r.id);
    const receipts = tape.receipts.filter((x) => x.id !== r.id);
    receipts.splice(Math.max(at4, 0), 0, r);
    game2.change((w) => w.put("tape", { ...tape, receipts }));
  }
  // ---- the GM's page ----
  // R103, R104: with no table the GM's page rolls for itself; a private roll sends nothing.
  /** The GM's own roll. Returns why not, or null. */
  roll(intent, priv = false) {
    const { game: game2, rng, clock: clock2, link } = this.#w;
    const done2 = resolve2(game2, { ...intent, n: 0 }, rng, clock2.now());
    if ("refused" in done2) return done2.refused;
    game2.change(done2.apply);
    if (priv || !link) {
      const full = { ...done2.full, ...priv && { priv: true } };
      this.#keep({ character: done2.character.oid, n: 0, full, roller: full, table: full, priv: true });
      this.#print(full);
      return null;
    }
    const n = this.#count("hollow.rolls.sent");
    this.#keep({ character: done2.character.oid, n, full: done2.full, roller: done2.roller, table: done2.table });
    this.#print({ ...done2.full, ok: true });
    link.send("roll", { n, receipt: done2.table, sealed: {} });
    return null;
  }
  // Seq: seq-roll.md#1.2 to seq-roll.md#1.7 | R101
  #intent(intent, from) {
    const { game: game2, rng, clock: clock2, link, sealer } = this.#w;
    const who = this.#w.whoIs?.(from) ?? null;
    const c = game2.get(ridOf(intent.pool));
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
    const held = game2.get("rows")?.rows[intent.pool];
    const { reaction: _asked, ...asked } = intent;
    const aimed3 = {
      ...asked,
      vs: held?.opponent ?? null,
      defend: held?.defend ?? intent.defend,
      against: held?.against,
      row: held?.byHand ? held.row ?? void 0 : void 0,
      ...held?.reaction && { reaction: held.reaction }
    };
    const done2 = resolve2(game2, aimed3, rng, clock2.now());
    if ("refused" in done2) {
      refuse(done2.refused);
      return this.#work;
    }
    game2.change(done2.apply);
    this.#print(done2.full);
    const n = this.#count("hollow.rolls.sent");
    this.#keep({ character: done2.character.oid, n, full: done2.full, roller: done2.roller, table: done2.table, tab: from.tab, sealKey: from.sealKey });
    this.#work = this.#work.then(async () => {
      const box2 = await sealer.seal(from.sealKey, "roll", link.tab, from.tab, { re: intent.n, receipt: done2.roller });
      link.send("roll", { n, receipt: done2.table, sealed: { [from.tab]: box2 } });
    });
    return this.#work;
  }
  // Seq: seq-roll.md#2 | R97: the owner or the GM switches or locks a CRIT; every tape updates.
  #crit(body, from) {
    const k = this.#kept(body.id), { game: game2 } = this.#w;
    if (!k || k.full.crit?.locked) return this.#work;
    const c = game2.get(ridOf(k.character));
    if (from && (!c || c.owner !== this.#w.whoIs?.(from))) return this.#work;
    k.full = choose(k.full, body.choice, body.lock);
    k.roller = choose(k.roller, body.choice, body.lock);
    k.table = choose(k.table, body.choice, body.lock);
    return this.#resend(k);
  }
  /** A kept roll's receipts again: on this tape, and (unless private) every tape, by id. */
  #resend(k) {
    const { link, sealer } = this.#w;
    this.#keep(k);
    this.#print(k.full);
    if (!link || k.priv) return this.#work;
    this.#work = this.#work.then(async () => {
      const sealed = k.tab && k.sealKey ? { [k.tab]: await sealer.seal(k.sealKey, "roll", link.tab, k.tab, { re: 0, receipt: k.roller }) } : {};
      link.send("roll", { n: k.n, receipt: k.table, sealed });
    });
    return this.#work;
  }
  /** Each of a kept roll's receipts with its Attack changed by `f`. */
  #attack(k, f) {
    for (const key of ["full", "roller", "table"]) {
      const r = k[key];
      if (r.attack) k[key] = { ...r, attack: f(r.attack) };
    }
  }
  // Seq: seq-take.md#1.4.1, seq-take.md#1.4.2, seq-take.md#1.4.3, seq-take.md#1.5 | R308, R312, R314, R340
  // The target's owner or the GM takes an Attack: refused unless it is untaken and the page is one of
  // the GM's own pages for it; then filled, marked taken, its named Slots (and a new Conviction or
  // Burden) waiting for names.
  #take(body, from) {
    const { game: game2 } = this.#w, k = this.#kept(body.id), a = k?.full.attack;
    if (!k || !a || a.taken) return this.#work;
    const c = game2.get(ridOf(a.target)), by = game2.get(ridOf(k.character));
    if (c?.kind !== "character" || by?.kind !== "character") return this.#work;
    if (from && c.owner !== this.#w.whoIs?.(from)) return this.#work;
    if (!pages(c, a.kind, a.result).some((p) => same2(p, body.page))) return this.#work;
    const next2 = fill(c, a.kind, body.page, { name: by.name, id: body.id }), d = COLUMN_OF[a.kind];
    const named4 = (ch, r) => waitsIn(ch, d, r)?.naming?.id === body.id;
    const waiting = [...ROWS, "lasting"].filter((r) => named4(next2, r) && !named4(c, r)).map((row2) => ({ damage: d, row: row2 }));
    game2.change((w) => w.put(ridOf(c.oid), next2));
    this.#attack(k, (x) => ({ ...x, taken: true, ...waiting.length && { waiting } }));
    return this.#resend(k);
  }
  // R441: the GM transfers a Resource for a successful Request: refused unless untransferred and the
  // Resource can be given between the GM's own cards; then both cards in one change, and every tape told.
  #transfer(id, resource2) {
    const { game: game2 } = this.#w, k = this.#kept(id), t = k?.full.transfer;
    if (!k || !t || t.done) return this.#work;
    const npc = game2.get(ridOf(t.target)), pc = game2.get(ridOf(k.character));
    if (npc?.kind !== "character" || pc?.kind !== "character") return this.#work;
    const made = transfer(npc, pc, resource2, t.sl);
    if (!made) return this.#work;
    game2.change((w) => {
      w.put(ridOf(npc.oid), made.npc);
      w.put(ridOf(pc.oid), made.pc);
    });
    const name2 = givable(npc, pc, t.sl).find((n) => n.toLowerCase() === resource2.trim().toLowerCase()) ?? resource2;
    for (const key of ["full", "roller", "table"]) {
      const r = k[key];
      if (r.transfer) k[key] = { ...r, transfer: { ...r.transfer, done: { resource: name2, moved: made.moved, extra: made.extra } } };
    }
    return this.#resend(k);
  }
  // Seq: seq-take.md#2.1, seq-take.md#2.2, seq-take.md#2.3 | R313, R314, R340
  // The attacking character's owner or the GM names a Slot (or a Conviction or Burden) this Attack left waiting.
  #name(body, from) {
    const { game: game2 } = this.#w, k = this.#kept(body.id), a = k?.full.attack, text = body.name.trim();
    if (!k || !a || !text || !a.waiting?.some((x) => x.damage === body.damage && x.row === body.row)) return this.#work;
    const by = game2.get(ridOf(k.character)), c = game2.get(ridOf(a.target));
    if (by?.kind !== "character" || c?.kind !== "character") return this.#work;
    if (from && by.owner !== this.#w.whoIs?.(from)) return this.#work;
    const slot2 = waitsIn(c, body.damage, body.row);
    if (slot2?.naming?.id !== body.id) return this.#work;
    const { naming: _, ...named4 } = { ...slot2, name: text };
    const back3 = body.row === "lasting" ? { ...c.back, lasting: { ...c.back.lasting, [body.damage]: named4 } } : { ...c.back, damage: { ...c.back.damage, [body.damage]: { ...c.back.damage[body.damage], [body.row]: named4 } } };
    game2.change((w) => w.put(ridOf(c.oid), { ...c, back: back3 }));
    this.#attack(k, (x) => {
      const rest = x.waiting.filter((w) => w.damage !== body.damage || w.row !== body.row);
      const { waiting: __, ...left } = x;
      return rest.length ? { ...left, waiting: rest } : left;
    });
    return this.#resend(k);
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
  /** R441: the Resources a kept Request's transfer can take, on the GM's page; none elsewhere or once done. */
  givable(id) {
    const { game: game2 } = this.#w, k = this.#w.gm ? this.#kept(id) : void 0, t = k?.full.transfer;
    const npc = t && game2.get(ridOf(t.target)), pc = k && game2.get(ridOf(k.character));
    return t && !t.done && npc?.kind === "character" && pc?.kind === "character" ? givable(npc, pc, t.sl) : [];
  }
  /** R441: transfer a Resource for a kept Request; the GM's page alone. */
  transfer(id, resource2) {
    return this.#w.gm ? this.#transfer(id, resource2) : this.#work;
  }
  /** Take an Attack by one of its pages (R308): the GM's page decides; on the GM's page, at once. */
  take(id, page) {
    if (this.#w.gm) return this.#take({ id, page }, null);
    if (this.#gmPeer) this.#w.link?.send("take", { id, page }, this.#gmPeer.tab);
    return this.#work;
  }
  /** Name a Slot an Attack left waiting (R313): the GM's page writes it, even on a card the sender can't see. */
  name(id, damage3, row2, name2) {
    if (this.#w.gm) return this.#name({ id, damage: damage3, row: row2, name: name2 }, null);
    if (this.#gmPeer) this.#w.link?.send("name", { id, damage: damage3, row: row2, name: name2 }, this.#gmPeer.tab);
    return this.#work;
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

// src/net/b64.ts
var b64 = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
var unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

// src/net/seal.ts
var ECDH = { name: "ECDH", namedCurve: "P-256" };
var enc = new TextEncoder();
var dec = new TextDecoder();
var ad = (what, from, to) => enc.encode(`${what}:${from}>${to}`);
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
      enc.encode(JSON.stringify(value2))
    );
    return { iv: b64(iv), data: b64(new Uint8Array(data)) };
  }
  /** What the box holds, or undefined if it was made for anything else (or is no box at all). */
  async open(theirs, what, from, to, box2) {
    const b = box2;
    if (!b || typeof b.iv !== "string" || typeof b.data !== "string" || b.iv.length > 24) return void 0;
    try {
      const plain2 = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: unb64(b.iv), additionalData: ad(what, from, to) },
        await this.#with(theirs),
        unb64(b.data)
      );
      return JSON.parse(dec.decode(plain2));
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
  highest(rid2, tab2) {
    return this.#highest.get(rid2)?.get(this.peer(tab2)) ?? 0;
  }
  // R181: lower than what was applied from that page is stale.
  fresh(rid2, tab2, s) {
    return s >= this.highest(rid2, tab2);
  }
  /** Forget what was applied to `rid` from one page: a change given up on lets the GM's version win. */
  forget(rid2, tab2) {
    this.#highest.get(rid2)?.delete(this.peer(tab2));
  }
  mark(rid2, tab2, s) {
    let m = this.#highest.get(rid2);
    if (!m) this.#highest.set(rid2, m = /* @__PURE__ */ new Map());
    const p = this.peer(tab2);
    if (s > (m.get(p) ?? 0)) m.set(p, s);
  }
};

// node_modules/@trystero-p2p/core/dist/primitives.mjs
var encoder = /* @__PURE__ */ new TextEncoder();
var decoder = /* @__PURE__ */ new TextDecoder();
var libName = "Trystero";
var libId = "trystero";
var domainTag = (name2, version) => `${libId}:${name2}:v${version}`;
var socketInitialFailureSymbol = /* @__PURE__ */ Symbol.for(`${libId}.socketInitialFailure`);
var pluginSlotSymbol = /* @__PURE__ */ Symbol.for(`${libId}.slot`);
var mkErr = (msg) => /* @__PURE__ */ new Error(`${libName}: ${msg}`);
var unreachable = (x) => {
  throw mkErr(x);
};
var toJson = JSON.stringify;
var fromJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    throw mkErr(`failed to parse JSON (${s.length} bytes)`);
  }
};
var encodeBytes = (txt) => encoder.encode(txt);
var encodeBytesInto = (txt, dest) => encoder.encodeInto(txt, dest);
var utf8ByteLength = (txt) => {
  let bytes = 0;
  for (let i = 0; i < txt.length; i++) {
    const code = txt.charCodeAt(i);
    if (code < 128) bytes += 1;
    else if (code < 2048) bytes += 2;
    else if (code >= 55296 && code <= 56319 && i + 1 < txt.length && (txt.charCodeAt(i + 1) & 64512) === 56320) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
};
var decodeBytes = (buf) => decoder.decode(buf);
var b64UrlEncodeOpts = {
  alphabet: "base64url",
  omitPadding: true
};
var b64UrlDecodeOpts = { alphabet: "base64url" };
var nativeToBase64 = Uint8Array.prototype.toBase64;
var nativeFromBase64 = Uint8Array.fromBase64;
var toBase64Url = typeof nativeToBase64 === "function" ? (bytes) => nativeToBase64.call(bytes, b64UrlEncodeOpts) : (bytes) => {
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};
var fromBase64Url = typeof nativeFromBase64 === "function" ? (b64url) => nativeFromBase64(b64url, b64UrlDecodeOpts) : (b64url) => {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - padded.length % 4) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
var base62Alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
var base64UrlRe = /^[A-Za-z0-9_-]+$/;
var bytesToBigInt = (bytes) => {
  let res = 0n;
  for (const b of bytes) res = res << 8n | BigInt(b);
  return res;
};
var bytesMatch = (a, b) => {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
};
var hash32 = (str2) => {
  const bytes = encodeBytes(str2);
  let h = 2166136261;
  for (let i = 0; i < bytes.byteLength; i++) h = Math.imul(h ^ bytes[i], 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  return (h ^ h >>> 16) >>> 0;
};
var createBoundedCache = (maxSize = 4096) => {
  const map = /* @__PURE__ */ new Map();
  return {
    get size() {
      return map.size;
    },
    get: (key) => {
      if (!map.has(key)) return;
      const value2 = map.get(key);
      map.delete(key);
      map.set(key, value2);
      return value2;
    },
    has: (key) => map.has(key),
    set: (key, value2) => {
      if (map.has(key)) map.delete(key);
      else if (map.size >= maxSize) {
        const oldest = map.keys().next().value;
        if (oldest !== void 0) map.delete(oldest);
      }
      map.set(key, value2);
    },
    delete: (key) => map.delete(key),
    clear: () => map.clear(),
    keys: () => [...map.keys()],
    entries: () => [...map.entries()]
  };
};

// node_modules/@trystero-p2p/core/dist/emitter.mjs
var noOp = () => {
};
var logHandlerErr = (kind, err) => console.error(`${libName} ${kind} error:`, err);
var createEventEmitter = (kind, onActiveChange) => {
  const subs = /* @__PURE__ */ new Set();
  let clearEpoch = 0;
  const invoke = (handler, args) => {
    try {
      const res = handler(...args);
      if (res && typeof res.then === "function") Promise.resolve(res).catch((err) => logHandlerErr(kind, err));
    } catch (err) {
      logHandlerErr(kind, err);
    }
  };
  return [
    (handler, options, getReplayItems) => {
      if (typeof handler !== "function") throw mkErr(`${kind.endsWith("handler") ? kind : `${kind} handler`} must be a function`);
      const signal = options?.signal;
      if (signal?.aborted) return noOp;
      const once = Boolean(options?.once);
      const abortCleanup = signal ? new AbortController() : null;
      let state;
      const unsub = () => {
        switch (state.phase) {
          case "closed":
            return;
          case "replaying": {
            const cleanup = state.abortCleanup;
            state = { phase: "closed" };
            cleanup?.abort();
            return;
          }
          case "live": {
            const { entry: liveEntry, abortCleanup: cleanup } = state;
            state = { phase: "closed" };
            cleanup?.abort();
            if (subs.delete(liveEntry) && subs.size === 0) onActiveChange?.(false);
            return;
          }
          default:
            unreachable(state);
        }
      };
      const entry = [(...args) => {
        if (state.phase !== "live") return;
        if (once) unsub();
        invoke(handler, args);
      }, unsub];
      const activateAfterReplay = () => {
        switch (state.phase) {
          case "replaying": {
            if (state.epoch !== clearEpoch) {
              unsub();
              return;
            }
            const wasEmpty = subs.size === 0;
            state = {
              phase: "live",
              entry,
              abortCleanup: state.abortCleanup
            };
            subs.add(entry);
            if (wasEmpty) onActiveChange?.(true);
            return;
          }
          case "live":
          case "closed":
            return;
          default:
            unreachable(state);
        }
      };
      state = {
        phase: "replaying",
        epoch: clearEpoch,
        abortCleanup
      };
      if (abortCleanup && signal) signal.addEventListener("abort", unsub, {
        once: true,
        signal: abortCleanup.signal
      });
      if (options?.replay && getReplayItems) {
        const currentPhase = () => state;
        for (const item2 of getReplayItems()) {
          const cur = currentPhase();
          if (cur.phase !== "replaying" || cur.epoch !== clearEpoch) {
            unsub();
            break;
          }
          if (once) unsub();
          invoke(handler, item2);
        }
      }
      activateAfterReplay();
      return unsub;
    },
    (...args) => {
      for (const sub of Array.from(subs)) sub[0](...args);
    },
    () => {
      clearEpoch++;
      for (const sub of Array.from(subs)) sub[1]();
    },
    () => subs.size > 0
  ];
};
var initSingleHandler = (name2, onChange) => {
  let current = null;
  return [
    (handler, options) => {
      if (typeof handler !== "function") throw mkErr(`${name2} handler must be a function`);
      const signal = options?.signal;
      if (signal?.aborted) return noOp;
      if (current) throw mkErr(`${name2} handler already registered; unsubscribe first`);
      const once = Boolean(options?.once);
      const abortCleanup = signal ? new AbortController() : null;
      let active = true;
      const unsub = () => {
        if (!active) return;
        active = false;
        abortCleanup?.abort();
        if (current?.[1] === unsub) {
          current = null;
          onChange?.(null);
        }
      };
      const call = ((...args) => {
        if (!active) return;
        if (once) unsub();
        return handler(...args);
      });
      current = [call, unsub];
      if (abortCleanup && signal) signal.addEventListener("abort", unsub, {
        once: true,
        signal: abortCleanup.signal
      });
      onChange?.(call);
      return unsub;
    },
    () => current?.[0] ?? null,
    () => current?.[1]()
  ];
};

// node_modules/@trystero-p2p/core/dist/utils.mjs
var lockMethods = (target, methodNames) => {
  for (const name2 of methodNames) {
    const fn = target[name2];
    Object.defineProperty(target, name2, {
      get: () => fn,
      set: () => {
        throw new TypeError(`${libName}: ${name2} is a method; call ${name2}(handler), which returns an unsubscribe function`);
      },
      enumerable: true,
      configurable: true
    });
  }
  return target;
};
var authMetaKey = `__${libId}Auth`;
var cmpStr = (a, b) => a < b ? -1 : a > b ? 1 : 0;
var warn = (msg) => console.warn(`${libName}: ${msg}`);
var warnNoPeer = (id) => warn(`no peer with id ${id} found`);
var warnEphemeralAdmin = () => warn("roles({selfAsAdmin: true}) with an ephemeral identity orphans the room on close; use identity: 'local' or an imported UserIdentity");
var logErr = (kind, err) => console.error(`${libName} ${kind} error:`, err);
var logActionHandlerErr = (err) => logErr("action handler", err);
var peerDisconnectedMsg = "peer disconnected";
var peerDisconnectedErr = /* @__PURE__ */ mkErr(peerDisconnectedMsg);
var peerBannedMsg = "peer banned";
var peerBannedErr = /* @__PURE__ */ mkErr(peerBannedMsg);
var mkBannedErr = (reason, peerId) => ({
  code: "banned",
  message: reason ? `${peerBannedMsg}: ${reason}` : peerBannedMsg,
  ...reason !== void 0 ? { reason } : {},
  ...peerId ? { peerId } : {}
});
var peerLeftRoomErr = /* @__PURE__ */ mkErr("peer left room");
var roomLeftErr = /* @__PURE__ */ mkErr("room left");
var roomFullMsg = "room full";
var roomFullErr = /* @__PURE__ */ mkErr(roomFullMsg);
var operationAbortedMsg = "operation aborted";
var insufficientAuthPrefix = "insufficient authority";
var invalidP256KeyErr = /* @__PURE__ */ mkErr("invalid ECDSA P-256 public key");
var posSafeIntErr = (name2) => mkErr(`${name2} must be a positive safe integer`);
var requiresRolesErr = (feature) => mkErr(`${feature} requires roles() in joinRoom config`);
var selfCertRoomRolesErr = /* @__PURE__ */ requiresRolesErr("self-certifying room ID");
var actionRedefinedErr = (type) => mkErr(`action type "${type}" cannot be redefined`);
var invalidActionMsg = (what) => `invalid action ${what}`;
var noActivePeerMsg = (id) => `no active peer with id ${id}`;
var requiredErr = (field2) => mkErr(`${field2} is required`);
var { floor } = Math;
var alloc = (n, f) => Array(n).fill(void 0).map(f);
var base62UnbiasedLimit = 248;
var genId = (n) => {
  if (n <= 0) return "";
  const buf = new Uint8Array(Math.ceil(n * 1.15) + 4);
  let out = "";
  while (out.length < n) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < buf.byteLength && out.length < n; i++) {
      const b = buf[i];
      if (b < base62UnbiasedLimit) out += base62Alphabet[b % 62];
    }
  }
  return out;
};
var all = /* @__PURE__ */ Promise.all.bind(Promise);
var isBrowser = typeof window !== "undefined";
var entries3 = Object.entries;
var fromEntries = Object.fromEntries;
var keys = Object.keys;
var values = Object.values;
var noOp2 = () => {
};
var candidateType = "candidate";
var resetTimer = (timer) => {
  if (timer !== null && timer !== void 0) clearTimeout(timer);
  return null;
};
var unrefTimer = (t) => {
  t?.unref?.();
};
var toErrorMessage = (reason, fallback) => {
  if (reason instanceof Error && reason.message) return reason.message;
  if (typeof reason === "string" && reason) return reason;
  return toJson(reason ?? fallback);
};
var toError = (reason, fallback) => reason instanceof Error ? reason : mkErr(toErrorMessage(reason, fallback));
var topicPath = (...parts2) => toJson(parts2);
var shuffle = (xs, seed2) => {
  const a = [...xs];
  let state = (Math.trunc(seed2) || 1) >>> 0;
  const rand = () => {
    state = state + 1831565813 >>> 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
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
var strToNum = (str2, limit = Number.MAX_SAFE_INTEGER) => hash32(str2) % limit;
var protocolViolations = /* @__PURE__ */ new WeakSet();
var markProtocolViolation = (err) => {
  protocolViolations.add(err);
  return err;
};
var mkViolationErr = (msg) => markProtocolViolation(mkErr(msg));
var userIdRegex = /* @__PURE__ */ new RegExp(`^[0-9A-Za-z]{${22}}$`);
var selfCertifyingRoomRegex = /* @__PURE__ */ new RegExp(`^(.+)~([0-9A-Za-z]{${22}})$`);
var splitSelfCertRoom = (roomId) => {
  const match = selfCertifyingRoomRegex.exec(roomId);
  return match?.[1] && match[2] ? [match[1], match[2]] : [roomId, null];
};
var formatSelfCertifyingRoomId = (base, userId) => `${splitSelfCertRoom(base)[0]}~${userId}`;
var toPayloadSource = (data) => {
  if (typeof Blob !== "undefined" && data instanceof Blob) return [2, data];
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) return [2, data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)];
  const isText = typeof data === "string";
  return [isText ? 0 : 1, encodeBytes(isText ? data : toJson(data))];
};
var hasIceUrl = (servers, pattern) => servers.some(({ urls }) => [urls].flat().some((url) => pattern.test(url)));
var isObj = (v) => Boolean(v && typeof v === "object" && !Array.isArray(v));
var isStr = (v) => typeof v === "string" && v.length > 0;
var isPosSafeInt = (n) => typeof n === "number" && Number.isSafeInteger(n) && n > 0;
var isValidSig = (s) => typeof s === "string" && s.length >= 64 && s.length <= 128;
var validateRoleCertificateShape = (c) => isObj(c) && c["v"] === 1 && isStr(c["certId"]) && isStr(c["issuerPubKey"]) && isStr(c["subUserId"]) && isStr(c["appId"]) && isStr(c["roomId"]) && Array.isArray(c["roles"]) && c["roles"].length > 0 && c["roles"].every(isStr) && isPosSafeInt(c["seq"]) && isPosSafeInt(c["iat"]) && isValidSig(c["sig"]);
var createWindowCounter = (maxEntries, limit, windowMs = 3e4) => {
  const map = createBoundedCache(maxEntries);
  return [
    (id) => {
      const now2 = Date.now();
      let cur = map.get(id);
      if (!cur || now2 - cur[1] > windowMs) {
        cur = [0, now2];
        map.set(id, cur);
      }
      return ++cur[0] >= limit;
    },
    (id) => {
      map.delete(id);
    },
    (id) => {
      const cur = map.get(id);
      return Boolean(cur && Date.now() - cur[1] <= windowMs && cur[0] >= limit);
    }
  ];
};

// node_modules/@trystero-p2p/core/dist/anti-entropy.mjs
var defaultFanout = 2;
var defaultPullTimeoutMs = 1500;
var defaultPeriodicIntervalMs = 15e3;
var defaultMaxPages = 32;
var timeoutCooldownMs = 1e4;
var isValidSyncCursor = (c) => c === void 0 || typeof c === "string" && c.length <= 512;
var hashWithSeed = (value2, seed2) => {
  let h = (2166136261 ^ seed2) >>> 0;
  for (let i = 0; i < value2.length; i++) {
    h ^= value2.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};
var occupiesFanoutSlot = (state) => state.phase === "in-flight" || state.phase === "completed";
var createAntiEntropySync = ({ fanout = defaultFanout, pullTimeoutMs = defaultPullTimeoutMs, periodicIntervalMs = defaultPeriodicIntervalMs, maxPages = defaultMaxPages, canSync = () => true, getDirectPeers, isPeerSendable, sendPull }) => {
  const seed2 = crypto.getRandomValues(/* @__PURE__ */ new Uint32Array(1))[0];
  const peerStates = /* @__PURE__ */ new Map();
  let schedulerPhase = "active";
  let periodicCursor = 0;
  const countCompleted = () => {
    let count = 0;
    for (const state of peerStates.values()) if (state.phase === "completed") count++;
    return count;
  };
  const countActiveOrCompleted = () => {
    let count = 0;
    for (const state of peerStates.values()) if (occupiesFanoutSlot(state)) count++;
    return count;
  };
  const hasInFlight = () => {
    for (const state of peerStates.values()) if (state.phase === "in-flight") return true;
    return false;
  };
  const clearPeerState = (peerId) => {
    const cur = peerStates.get(peerId);
    if (!cur) return;
    switch (cur.phase) {
      case "in-flight":
        resetTimer(cur.timer);
        peerStates.delete(peerId);
        return;
      case "completed":
      case "cooldown":
        peerStates.delete(peerId);
        return;
      default:
        unreachable(cur);
    }
  };
  const isCoolingDown = (peerId, now2) => {
    const cur = peerStates.get(peerId);
    if (cur?.phase !== "cooldown") return false;
    if (now2 >= cur.until) {
      peerStates.delete(peerId);
      return false;
    }
    return true;
  };
  const selectRankedPeers = (skipCooldown = true) => {
    const now2 = Date.now();
    return getDirectPeers().filter((id) => isPeerSendable(id) && (!skipCooldown || !isCoolingDown(id, now2))).map((id) => [id, hashWithSeed(id, seed2)]).sort((a, b) => a[1] - b[1] || cmpStr(a[0], b[0])).map(([id]) => id);
  };
  const transitionFailedPull = (peerId, pullId) => {
    const cur = peerStates.get(peerId);
    if (schedulerPhase === "closed" || cur?.phase !== "in-flight" || cur.pullId !== pullId) return;
    resetTimer(cur.timer);
    if (isPeerSendable(peerId)) peerStates.set(peerId, {
      phase: "cooldown",
      until: Date.now() + timeoutCooldownMs
    });
    else peerStates.delete(peerId);
    if (countCompleted() < fanout) fillFanout();
  };
  const makePullTimer = (peerId, pullId) => {
    const timer = setTimeout(() => transitionFailedPull(peerId, pullId), pullTimeoutMs);
    unrefTimer(timer);
    return timer;
  };
  const startPull = (peerId, cursor, pages2 = 0, preserveStaleDigest = false) => {
    if (schedulerPhase === "closed" || !canSync() || pages2 >= maxPages || !isPeerSendable(peerId)) {
      clearPeerState(peerId);
      return false;
    }
    const prev2 = peerStates.get(peerId);
    if (prev2?.phase === "in-flight") resetTimer(prev2.timer);
    const pullId = /* @__PURE__ */ Symbol();
    const timer = makePullTimer(peerId, pullId);
    peerStates.set(peerId, {
      phase: "in-flight",
      pullId,
      timer,
      pages: pages2 + 1,
      staleDigest: preserveStaleDigest
    });
    Promise.resolve().then(() => sendPull(peerId, cursor)).catch(() => transitionFailedPull(peerId, pullId));
    return true;
  };
  const fillFanout = () => {
    if (schedulerPhase === "closed" || !canSync()) return;
    let activeOrCompleted = countActiveOrCompleted();
    for (const candidate of selectRankedPeers()) {
      if (activeOrCompleted >= fanout) break;
      if (!peerStates.has(candidate) && startPull(candidate)) activeOrCompleted++;
    }
  };
  const pullPeer = (peerId, force = false) => {
    if (schedulerPhase === "closed" || !canSync()) return;
    const cur = peerStates.get(peerId);
    if (!cur) {
      startPull(peerId);
      return;
    }
    switch (cur.phase) {
      case "in-flight":
        if (force && !cur.staleDigest) peerStates.set(peerId, {
          ...cur,
          staleDigest: true
        });
        return;
      case "completed":
        if (force) startPull(peerId);
        return;
      case "cooldown":
        startPull(peerId);
        return;
      default:
        unreachable(cur);
    }
  };
  const onSyncPage = (fromPeerId, nextCursor) => {
    const cur = peerStates.get(fromPeerId);
    if (schedulerPhase === "closed" || cur?.phase !== "in-flight") return;
    if (nextCursor && cur.pages < maxPages) {
      startPull(fromPeerId, nextCursor, cur.pages, cur.staleDigest);
      return;
    }
    resetTimer(cur.timer);
    if (cur.staleDigest) {
      peerStates.delete(fromPeerId);
      startPull(fromPeerId);
      return;
    }
    peerStates.set(fromPeerId, { phase: "completed" });
  };
  const onPeerJoined = (peerId, forcePull = false) => {
    if (schedulerPhase === "closed") return;
    const cur = peerStates.get(peerId);
    if (cur?.phase === "in-flight") {
      if (!cur.staleDigest) peerStates.set(peerId, {
        ...cur,
        staleDigest: true
      });
    } else peerStates.delete(peerId);
    if (forcePull) pullPeer(peerId, true);
    fillFanout();
  };
  const onPeerDisconnected = (peerId) => {
    clearPeerState(peerId);
    if (schedulerPhase !== "closed" && countCompleted() < fanout) fillFanout();
  };
  const scheduleRepull = () => {
    if (schedulerPhase !== "active" || getDirectPeers().length === 0) return;
    schedulerPhase = "repull-queued";
    queueMicrotask(() => {
      if (schedulerPhase !== "repull-queued") return;
      schedulerPhase = "active";
      if (!canSync()) return;
      for (const [pid, state] of peerStates) switch (state.phase) {
        case "completed":
          peerStates.delete(pid);
          break;
        case "in-flight":
          if (!state.staleDigest) peerStates.set(pid, {
            ...state,
            staleDigest: true
          });
          break;
        case "cooldown":
          break;
        default:
          unreachable(state);
      }
      fillFanout();
    });
  };
  const periodicTimer = periodicIntervalMs > 0 ? setInterval(() => {
    if (schedulerPhase === "closed" || !canSync() || hasInFlight()) return;
    let ranked = selectRankedPeers();
    if (ranked.length === 0) ranked = selectRankedPeers(false);
    if (ranked.length === 0) return;
    const pick = ranked[periodicCursor++ % ranked.length];
    startPull(pick);
  }, periodicIntervalMs) : void 0;
  unrefTimer(periodicTimer);
  const destroy = () => {
    schedulerPhase = "closed";
    if (periodicTimer !== void 0) clearInterval(periodicTimer);
    for (const state of peerStates.values()) if (state.phase === "in-flight") resetTimer(state.timer);
    peerStates.clear();
  };
  return {
    pullPeer,
    onSyncPage,
    onPeerJoined,
    onPeerDisconnected,
    scheduleRepull,
    isPullInFlight: (peerId) => peerStates.get(peerId)?.phase === "in-flight",
    destroy
  };
};

// node_modules/@trystero-p2p/core/dist/crypto.mjs
var ecdsaKeyAlgo = {
  name: "ECDSA",
  namedCurve: "P-256"
};
var ecdsaSignAlgo = {
  name: "ECDSA",
  hash: "SHA-256"
};
var algo = "AES-GCM";
var gcmIvBytes = 12;
var hmacAlgo = "HMAC";
var pbkdf2Iterations = 6e5;
var emptyHkdfSalt = /* @__PURE__ */ new Uint8Array(32);
var roomAesInfo = /* @__PURE__ */ encodeBytes(domainTag("room-aes", 3));
var roomHmacInfo = /* @__PURE__ */ encodeBytes(domainTag("room-hmac", 3));
var topicHashCache = /* @__PURE__ */ createBoundedCache(4096);
var derivedRoomKeysCache = /* @__PURE__ */ createBoundedCache(64);
var p256N = 115792089210356248762697446949407573529996955224135760342422259061068512044369n;
var p256HalfN = p256N >> 1n;
var normalizeLowSP256Signature = (sig) => {
  if (sig.byteLength !== 64) return sig;
  const s = bytesToBigInt(sig.subarray(32, 64));
  if (s <= p256HalfN) return sig;
  const out = sig.slice();
  let lowS = p256N - s;
  for (let i = 63; i >= 32; i--) {
    out[i] = Number(lowS & 255n);
    lowS >>= 8n;
  }
  return out;
};
var isLowSP256Signature = (sig) => {
  if (sig.byteLength !== 64) return false;
  const r = bytesToBigInt(sig.subarray(0, 32));
  const s = bytesToBigInt(sig.subarray(32, 64));
  return r > 0n && r < p256N && s > 0n && s <= p256HalfN;
};
var sha256 = async (input) => new Uint8Array(await crypto.subtle.digest("SHA-256", typeof input === "string" ? encodeBytes(input) : input));
var ecdsaSign = async (privateKey, data) => normalizeLowSP256Signature(new Uint8Array(await crypto.subtle.sign(ecdsaSignAlgo, privateKey, data)));
var ecdsaVerify = (publicKey, sig, data) => crypto.subtle.verify(ecdsaSignAlgo, publicKey, sig, data);
var hashTopic = async (str2) => {
  const cached = topicHashCache.get(str2);
  if (cached !== void 0) return cached;
  const digest = toBase64Url(await sha256(str2));
  topicHashCache.set(str2, digest);
  return digest;
};
var derivePasswordRoomKeys = (secret, appId, roomId) => {
  const cacheKey = toJson([
    secret,
    appId,
    roomId
  ]);
  const existing = derivedRoomKeysCache.get(cacheKey);
  if (existing) return existing;
  const deriveP = (async () => {
    const [baseKey, salt] = await Promise.all([crypto.subtle.importKey("raw", encodeBytes(secret), "PBKDF2", false, ["deriveBits"]), sha256(toJson([
      domainTag("pbkdf2-master", 3),
      appId,
      roomId
    ]))]);
    const masterBits = new Uint8Array(await crypto.subtle.deriveBits({
      name: "PBKDF2",
      salt,
      iterations: pbkdf2Iterations,
      hash: "SHA-256"
    }, baseKey, 256));
    try {
      const hkdfKey = await crypto.subtle.importKey("raw", masterBits, "HKDF", false, ["deriveKey"]);
      const [aesKey, hmacKey] = await Promise.all([crypto.subtle.deriveKey({
        name: "HKDF",
        hash: "SHA-256",
        salt: emptyHkdfSalt,
        info: roomAesInfo
      }, hkdfKey, {
        name: algo,
        length: 256
      }, false, ["encrypt", "decrypt"]), crypto.subtle.deriveKey({
        name: "HKDF",
        hash: "SHA-256",
        salt: emptyHkdfSalt,
        info: roomHmacInfo
      }, hkdfKey, {
        name: hmacAlgo,
        hash: "SHA-256",
        length: 256
      }, false, ["sign", "verify"])]);
      return {
        aesKey,
        hmacKey
      };
    } finally {
      masterBits.fill(0);
    }
  })();
  deriveP.catch(() => {
    derivedRoomKeysCache.delete(cacheKey);
  });
  derivedRoomKeysCache.set(cacheKey, deriveP);
  return deriveP;
};
var genKey = async (secret, appId, roomId) => {
  if (!secret) {
    const aesRaw = await sha256(toJson([
      domainTag("room-aes", 3),
      appId,
      roomId
    ]));
    return crypto.subtle.importKey("raw", aesRaw, { name: algo }, false, ["encrypt", "decrypt"]);
  }
  return (await derivePasswordRoomKeys(secret, appId, roomId)).aesKey;
};
var gcmParams = (iv, aad) => aad === void 0 ? {
  name: algo,
  iv
} : {
  name: algo,
  iv,
  additionalData: encodeBytes(aad)
};
var encrypt = async (keyP, plaintext, aad) => {
  const iv = crypto.getRandomValues(new Uint8Array(gcmIvBytes));
  const ct = new Uint8Array(await crypto.subtle.encrypt(gcmParams(iv, aad), await keyP, encodeBytes(plaintext)));
  const packed = new Uint8Array(gcmIvBytes + ct.byteLength);
  packed.set(iv, 0);
  packed.set(ct, gcmIvBytes);
  return toBase64Url(packed);
};
var decrypt = async (keyP, raw, aad) => {
  if (typeof raw !== "string" || !base64UrlRe.test(raw)) throw mkErr("invalid ciphertext");
  const packed = fromBase64Url(raw);
  if (packed.byteLength < 28 || toBase64Url(packed) !== raw) throw mkErr("invalid ciphertext");
  return decodeBytes(await crypto.subtle.decrypt(gcmParams(packed.subarray(0, gcmIvBytes), aad), await keyP, packed.subarray(gcmIvBytes)));
};

// node_modules/@trystero-p2p/core/dist/identity-idb.mjs
var lockPrefix = `${libId}:user_identity:v1:`;
var idbDbName = `${libId}_identity_v1`;
var idbStoreName = "identities";
var idbErr = (op) => mkErr(`IndexedDB ${op} failed`);
var idbProbeBytes = /* @__PURE__ */ encodeBytes(domainTag("idb-key-probe", 1));
var buildUserIdentityFromIdbRecord = (rec) => ({
  userId: rec.userId,
  signPubJwk: rec.signPubJwk,
  sign: (payload) => ecdsaSign(rec.privateKey, payload)
});
var openIdentityDb = () => new Promise((resolve3, reject) => {
  const req = indexedDB.open(idbDbName, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains(idbStoreName)) db.createObjectStore(idbStoreName);
  };
  req.onsuccess = () => resolve3(req.result);
  req.onerror = () => reject(req.error ?? idbErr("open"));
});
var idbGetRecord = (db, appId) => new Promise((resolve3, reject) => {
  const req = db.transaction(idbStoreName, "readonly").objectStore(idbStoreName).get(appId);
  req.onsuccess = () => resolve3(req.result);
  req.onerror = () => reject(req.error ?? idbErr("get"));
});
var idbWriteTx = (db, run2, op) => new Promise((resolve3, reject) => {
  const tx = db.transaction(idbStoreName, "readwrite");
  let state;
  const stageResult = (value2) => {
    switch (state.phase) {
      case "pending":
      case "staged":
        state = {
          phase: "staged",
          value: value2
        };
        return;
      case "done":
        return;
      default:
        unreachable(state);
    }
  };
  const fail = (err) => {
    switch (state.phase) {
      case "pending":
      case "staged":
        state = { phase: "done" };
        reject(err instanceof Error ? err : tx.error ?? idbErr(op));
        return;
      case "done":
        return;
      default:
        unreachable(state);
    }
  };
  state = { phase: "pending" };
  tx.oncomplete = () => {
    switch (state.phase) {
      case "staged": {
        const { value: value2 } = state;
        state = { phase: "done" };
        resolve3(value2);
        return;
      }
      case "pending":
        state = { phase: "done" };
        reject(idbErr(op));
        return;
      case "done":
        return;
      default:
        unreachable(state);
    }
  };
  tx.onabort = () => fail(tx.error);
  tx.onerror = (event) => fail(event?.target?.error ?? tx.error);
  try {
    run2(tx.objectStore(idbStoreName), stageResult);
  } catch (err) {
    fail(err);
  }
});
var idbPutRecord = (db, appId, candidate) => idbWriteTx(db, (store, setResult) => {
  setResult(candidate);
  store.put(candidate, appId);
}, "put");
var checkThenAddIdbRecord = (db, idbKey, candidate) => idbWriteTx(db, (store, setResult) => {
  const getReq = store.get(idbKey);
  getReq.onsuccess = () => {
    const found = getReq.result;
    if (found !== void 0) {
      setResult([found, true]);
      return;
    }
    setResult([candidate, false]);
    store.add(candidate, idbKey);
  };
}, "add");
var isValidStoredIdbRecord = async (rec, verifyUserIdKey2, verifyWithP2562) => {
  if (!rec || typeof rec !== "object" || !rec.userId || !rec.signPubJwk || !rec.privateKey || !await verifyUserIdKey2(rec.userId, rec.signPubJwk)) return false;
  try {
    return await verifyWithP2562(await ecdsaSign(rec.privateKey, idbProbeBytes), idbProbeBytes, rec.signPubJwk);
  } catch {
    return false;
  }
};
var withNavigatorLock = async (appId, fn) => {
  const lockName = `${lockPrefix}${appId}`;
  const run2 = async () => {
    const db = await openIdentityDb();
    try {
      return await fn(db);
    } finally {
      db.close();
    }
  };
  const locks = typeof navigator !== "undefined" ? navigator.locks : void 0;
  return typeof locks?.request === "function" ? locks.request(lockName, run2) : run2();
};
var loadOrCreateIdbIdentity = (idbKey, generateRecord, verifyUserIdKey2, verifyWithP2562) => withNavigatorLock(idbKey, async (db) => {
  const validateOrRepair = async (rec) => await isValidStoredIdbRecord(rec, verifyUserIdKey2, verifyWithP2562) ? rec : idbPutRecord(db, idbKey, await generateRecord());
  const existing = await idbGetRecord(db, idbKey);
  if (existing !== void 0) return buildUserIdentityFromIdbRecord(await validateOrRepair(existing));
  const candidate = await generateRecord();
  const [record, wasExisting] = await checkThenAddIdbRecord(db, idbKey, candidate);
  return buildUserIdentityFromIdbRecord(wasExisting ? await validateOrRepair(record) : record);
});

// node_modules/@trystero-p2p/core/dist/identity.mjs
var base62Radix = 62n;
var userKeyPrefix = `${libId}_uk_`;
var maxCachedSigPayloadBytes = 4096;
var maxSigCacheTotalBytes = 2097152;
var maxSigCacheEntries = 8192;
var keyPairTestPayload = /* @__PURE__ */ encodeBytes(domainTag("identity-self-test", 1));
var userIdMismatchErr = /* @__PURE__ */ mkErr("invalid custom user identity; userId does not match signPubJwk");
var invalidCustomIdentityErr = /* @__PURE__ */ mkErr('invalid custom user identity; use "local", "none", loader, or importUserIdentity()');
var invalidCustomSignatureErr = /* @__PURE__ */ mkErr("invalid custom user identity signature; sign() must return a valid 64-byte IEEE P1363 ECDSA P-256 SHA-256 signature");
var encodeBase62 = (bytes, length) => {
  const modulus = base62Radix ** BigInt(length);
  let val = bytesToBigInt(bytes) % modulus;
  let out = "";
  for (let i = 0; i < length; i++) {
    out = base62Alphabet[Number(val % base62Radix)] + out;
    val /= base62Radix;
  }
  return out;
};
var pubJwkToUncompressedBytes = (pubKeyOrJwk) => {
  let x;
  let y;
  if (typeof pubKeyOrJwk === "string") {
    if (pubKeyOrJwk.length !== 87 || pubKeyOrJwk[43] !== ".") return null;
    x = pubKeyOrJwk.slice(0, 43);
    y = pubKeyOrJwk.slice(44);
  } else {
    if (!pubKeyOrJwk || typeof pubKeyOrJwk !== "object" || pubKeyOrJwk.d !== void 0 || pubKeyOrJwk.kty && pubKeyOrJwk.kty !== "EC" || pubKeyOrJwk.crv && pubKeyOrJwk.crv !== "P-256" || typeof pubKeyOrJwk.x !== "string" || typeof pubKeyOrJwk.y !== "string" || !pubKeyOrJwk.x || !pubKeyOrJwk.y) return null;
    x = pubKeyOrJwk.x;
    y = pubKeyOrJwk.y;
  }
  try {
    const xBytes = fromBase64Url(x);
    const yBytes = fromBase64Url(y);
    if (xBytes.byteLength !== 32 || yBytes.byteLength !== 32 || toBase64Url(xBytes) !== x || toBase64Url(yBytes) !== y) return null;
    const uncompressed = /* @__PURE__ */ new Uint8Array(65);
    uncompressed[0] = 4;
    uncompressed.set(xBytes, 1);
    uncompressed.set(yBytes, 33);
    return uncompressed;
  } catch {
    return null;
  }
};
var makeP256Jwk = (x = "", y = "", crv = "P-256", kty = "EC") => ({
  crv,
  kty,
  x,
  y
});
var toCompactPub = (pubKeyOrJwk) => {
  if (typeof pubKeyOrJwk === "object" && pubKeyOrJwk !== null) {
    const byRef = cleanJwkRecordCache.get(pubKeyOrJwk);
    if (byRef) return byRef.compactPub;
  }
  if (!pubJwkToUncompressedBytes(pubKeyOrJwk)) return null;
  return typeof pubKeyOrJwk === "string" ? pubKeyOrJwk : `${pubKeyOrJwk.x}.${pubKeyOrJwk.y}`;
};
var jwkToCompactPub = (pubKeyOrJwk) => {
  const compact = toCompactPub(pubKeyOrJwk);
  if (!compact) throw invalidP256KeyErr;
  return compact;
};
var compactPubToJwk = (pub) => typeof pub === "string" && pubJwkToUncompressedBytes(pub) ? makeP256Jwk(pub.slice(0, 43), pub.slice(44)) : null;
var resolvedPubKeyCache = /* @__PURE__ */ createBoundedCache();
var cleanJwkRecordCache = /* @__PURE__ */ new WeakMap();
var pendingPubKeyCache = /* @__PURE__ */ new Map();
var getCachedPubKeyRecord = (pubKeyOrJwk) => {
  if (typeof pubKeyOrJwk === "object" && pubKeyOrJwk !== null) {
    const byRef = cleanJwkRecordCache.get(pubKeyOrJwk);
    if (byRef) return byRef;
  }
  const compactPub = toCompactPub(pubKeyOrJwk);
  return compactPub ? resolvedPubKeyCache.get(compactPub) : void 0;
};
var getVerifiedPubKeyRecord = (pubKeyOrJwk, preimportedVerifyKey) => {
  if (typeof pubKeyOrJwk === "object" && pubKeyOrJwk !== null) {
    const byRef = cleanJwkRecordCache.get(pubKeyOrJwk);
    if (byRef) return Promise.resolve(byRef);
  }
  const uncompressed = pubJwkToUncompressedBytes(pubKeyOrJwk);
  if (!uncompressed) return Promise.resolve(null);
  const x = typeof pubKeyOrJwk === "string" ? pubKeyOrJwk.slice(0, 43) : pubKeyOrJwk.x;
  const y = typeof pubKeyOrJwk === "string" ? pubKeyOrJwk.slice(44) : pubKeyOrJwk.y;
  const compactPub = `${x}.${y}`;
  const existing = resolvedPubKeyCache.get(compactPub);
  if (existing) return Promise.resolve(existing);
  const inflight = pendingPubKeyCache.get(compactPub);
  if (inflight) return inflight;
  const p = (async () => {
    try {
      const [verifyKey, peerDigest, userDigest] = await Promise.all([
        preimportedVerifyKey ? Promise.resolve(preimportedVerifyKey) : crypto.subtle.importKey("raw", uncompressed, ecdsaKeyAlgo, false, ["verify"]),
        sha256(`${domainTag("pid", 1)}:${compactPub}`),
        sha256(`${domainTag("uid", 1)}:${compactPub}`)
      ]);
      const cleanJwk = Object.freeze(makeP256Jwk(x, y));
      const record = {
        compactPub,
        cleanJwk,
        verifyKey,
        peerId: encodeBase62(peerDigest, 20),
        userId: encodeBase62(userDigest, 22)
      };
      cleanJwkRecordCache.set(cleanJwk, record);
      resolvedPubKeyCache.set(compactPub, record);
      return record;
    } catch {
      return null;
    } finally {
      pendingPubKeyCache.delete(compactPub);
    }
  })();
  pendingPubKeyCache.set(compactPub, p);
  return p;
};
var isValidUserId = (id) => typeof id === "string" && userIdRegex.test(id);
var createByteBoundedPayloadCache = () => {
  const map = /* @__PURE__ */ new Map();
  let totalBytes = 0;
  return {
    get: (key) => {
      const val = map.get(key);
      if (val !== void 0) {
        map.delete(key);
        map.set(key, val);
      }
      return val;
    },
    set: (key, val) => {
      const prev2 = map.get(key);
      if (prev2 !== void 0) {
        totalBytes -= prev2.byteLength;
        map.delete(key);
      }
      while (map.size >= maxSigCacheEntries || map.size > 0 && totalBytes + val.byteLength > maxSigCacheTotalBytes) {
        const oldestKey = map.keys().next().value;
        if (oldestKey === void 0) break;
        const oldestVal = map.get(oldestKey);
        if (oldestVal) totalBytes -= oldestVal.byteLength;
        map.delete(oldestKey);
      }
      map.set(key, val);
      totalBytes += val.byteLength;
    }
  };
};
var verifiedSigPayloads = /* @__PURE__ */ createByteBoundedPayloadCache();
var inFlightSigVerifies = /* @__PURE__ */ new Map();
var verifyWithP256 = (sigBytes, payload, pubKeyOrJwk) => {
  if (!sigBytes || sigBytes.byteLength !== 64) return false;
  const cachedRec = getCachedPubKeyRecord(pubKeyOrJwk);
  if (cachedRec && payload.byteLength <= maxCachedSigPayloadBytes) {
    const cached = verifiedSigPayloads.get(`${cachedRec.compactPub}:${toBase64Url(sigBytes)}`);
    if (cached) return bytesMatch(cached, payload);
  }
  return verifyWithP256Async(sigBytes, payload, pubKeyOrJwk, cachedRec);
};
var verifyWithP256Async = async (sigBytes, payload, pubKeyOrJwk, cachedRec) => {
  const rec = cachedRec ?? await getVerifiedPubKeyRecord(pubKeyOrJwk);
  if (!rec) return false;
  if (payload.byteLength > maxCachedSigPayloadBytes) {
    if (!isLowSP256Signature(sigBytes)) return false;
    try {
      return await ecdsaVerify(rec.verifyKey, sigBytes, payload);
    } catch {
      return false;
    }
  }
  const cacheKey = `${rec.compactPub}:${toBase64Url(sigBytes)}`;
  const cached = verifiedSigPayloads.get(cacheKey);
  if (cached) return bytesMatch(cached, payload);
  if (!isLowSP256Signature(sigBytes)) return false;
  const inFlight = inFlightSigVerifies.get(cacheKey);
  if (inFlight && bytesMatch(inFlight[0], payload)) return inFlight[1];
  const snapshot = payload.slice();
  const promise = ecdsaVerify(rec.verifyKey, sigBytes, snapshot).then((ok) => {
    if (ok) {
      verifiedSigPayloads.set(cacheKey, snapshot);
      if (inFlightSigVerifies.get(cacheKey)?.[1] === promise) inFlightSigVerifies.delete(cacheKey);
      return true;
    }
    if (inFlightSigVerifies.get(cacheKey)?.[1] === promise) inFlightSigVerifies.delete(cacheKey);
    return false;
  }, () => {
    if (inFlightSigVerifies.get(cacheKey)?.[1] === promise) inFlightSigVerifies.delete(cacheKey);
    return false;
  });
  inFlightSigVerifies.set(cacheKey, [snapshot, promise]);
  return promise;
};
var verifyIdKey = (id, pubKeyOrJwk, field2) => {
  const cached = getCachedPubKeyRecord(pubKeyOrJwk);
  return cached ? cached[field2] === id : getVerifiedPubKeyRecord(pubKeyOrJwk).then((rec) => Boolean(rec && rec[field2] === id));
};
var verifyPeerIdKey = (peerId, pubKeyOrJwk) => Boolean(peerId && typeof peerId === "string") && verifyIdKey(peerId, pubKeyOrJwk, "peerId");
var verifyUserIdKey = (userId, pubKeyOrJwk) => isValidUserId(userId) && verifyIdKey(userId, pubKeyOrJwk, "userId");
var generateP256KeyMaterial = async (extractable) => {
  const keyPair = await crypto.subtle.generateKey(ecdsaKeyAlgo, extractable, ["sign", "verify"]);
  const rawJwk = await crypto.subtle.exportKey("jwk", extractable ? keyPair.privateKey : keyPair.publicKey);
  const rec = await getVerifiedPubKeyRecord(makeP256Jwk(rawJwk.x, rawJwk.y), keyPair.publicKey);
  if (!rec) throw invalidP256KeyErr;
  return [
    keyPair,
    rawJwk,
    rec
  ];
};
var defaultAppKey = "__default__";
var maxEpochResolveRetries = 8;
var normalizeAppId = (appId) => appId || defaultAppKey;
var appControllers = /* @__PURE__ */ new Map();
var appEndpointCache = /* @__PURE__ */ createBoundedCache();
var runtimeUserIdentityBySlot = /* @__PURE__ */ createBoundedCache();
var getAppController = (appKey) => {
  let ctrl = appControllers.get(appKey);
  if (!ctrl) {
    ctrl = {
      epoch: 0,
      inFlightLoad: null,
      opTail: Promise.resolve()
    };
    appControllers.set(appKey, ctrl);
  }
  return ctrl;
};
var enqueueControllerOp = (ctrl, fn) => {
  const next2 = ctrl.opTail.catch(noOp2).then(fn);
  ctrl.opTail = next2.catch(noOp2);
  return next2;
};
var nextIdentityClientSeq = 0;
var createIdentityClientId = () => `c${++nextIdentityClientSeq}`;
var slotForAppKey = (appKey, clientId = "", epoch = getAppController(appKey).epoch) => `${clientId}\0${epoch}\0${appKey}`;
var createEndpointIdentity = () => generateP256KeyMaterial(false).then(([keyPair, , rec]) => ({
  peerId: rec.peerId,
  signPrivateKey: keyPair.privateKey,
  signPublicKey: keyPair.publicKey,
  signPubJwk: rec.cleanJwk,
  sign: (payload) => ecdsaSign(keyPair.privateKey, payload)
}));
var getDefaultEndpointIdentity = (appId, clientId) => {
  const appKey = normalizeAppId(appId);
  const slot2 = slotForAppKey(appKey, clientId);
  const existing = appEndpointCache.get(slot2);
  if (existing) return existing;
  const created = createEndpointIdentity();
  created.catch(() => {
    if (appEndpointCache.get(slot2) === created) appEndpointCache.delete(slot2);
  });
  appEndpointCache.set(slot2, created);
  return created;
};
var extractableUserKeys = /* @__PURE__ */ new WeakMap();
var trustedUserIdentities = /* @__PURE__ */ new WeakSet();
var generateNonExtractableIdbRecord = async () => {
  const [keyPair, , rec] = await generateP256KeyMaterial(false);
  return {
    userId: rec.userId,
    signPubJwk: rec.cleanJwk,
    privateKey: keyPair.privateKey
  };
};
var createNonExtractableUserIdentity = () => generateNonExtractableIdbRecord().then((rec) => {
  const id = buildUserIdentityFromIdbRecord(rec);
  trustedUserIdentities.add(id);
  return id;
});
var isUserIdentityObjectStructural = (val) => Boolean(val && typeof val === "object" && typeof val.userId === "string" && isValidUserId(val.userId) && val.signPubJwk && pubJwkToUncompressedBytes(val.signPubJwk) && typeof val.sign === "function");
var withPersistence = (val, persistence, cleanJwk = val.signPubJwk) => {
  const isKnownTrusted = trustedUserIdentities.has(val);
  const wrapped = {
    userId: val.userId,
    signPubJwk: cleanJwk,
    sign: isKnownTrusted ? val.sign : async (payload) => normalizeLowSP256Signature(new Uint8Array(await val.sign(payload))),
    persistence
  };
  const userKey = extractableUserKeys.get(val);
  if (userKey !== void 0) extractableUserKeys.set(wrapped, userKey);
  if (isKnownTrusted) trustedUserIdentities.add(wrapped);
  return wrapped;
};
var coerceCustomUserIdentity = async (val) => {
  if (!isUserIdentityObjectStructural(val)) throw invalidCustomIdentityErr;
  const rec = await getVerifiedPubKeyRecord(val.signPubJwk);
  if (!rec || rec.userId !== val.userId) throw userIdMismatchErr;
  if (!trustedUserIdentities.has(val)) {
    let rawSig;
    try {
      rawSig = new Uint8Array(await val.sign(keyPairTestPayload.slice()));
    } catch (cause) {
      throw mkErr(`custom user identity sign() failed startup check: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
    const normalizedSig = normalizeLowSP256Signature(rawSig);
    if (normalizedSig.byteLength !== 64 || !await ecdsaVerify(rec.verifyKey, normalizedSig, keyPairTestPayload)) throw invalidCustomSignatureErr;
  }
  return withPersistence(val, val.persistence ?? "custom", rec.cleanJwk);
};
var hasIndexedDB = () => {
  try {
    return typeof globalThis !== "undefined" && "indexedDB" in globalThis && Boolean(globalThis.indexedDB);
  } catch {
    return false;
  }
};
var isEphemeralIdentityConfig = (identity) => identity === "none" || (identity === void 0 || identity === "local") && !hasIndexedDB();
var validateIdentityConfig = (config) => {
  const raw = config?.identity;
  if (raw === void 0 || raw === "none" || raw === "local" || typeof raw === "function") return;
  if (isUserIdentityObjectStructural(raw)) {
    const cached = getCachedPubKeyRecord(raw.signPubJwk);
    if (cached && cached.userId !== raw.userId) throw userIdMismatchErr;
    return;
  }
  throw invalidCustomIdentityErr;
};
var getOrCreateEphemeralIdentity = (appKey, clientId = "", epoch = getAppController(appKey).epoch) => {
  const slot2 = slotForAppKey(appKey, clientId, epoch);
  const existing = runtimeUserIdentityBySlot.get(slot2);
  if (existing) return existing;
  const created = createNonExtractableUserIdentity().then((id) => withPersistence(id, "none"));
  created.catch(() => {
    if (runtimeUserIdentityBySlot.get(slot2) === created) runtimeUserIdentityBySlot.delete(slot2);
  });
  runtimeUserIdentityBySlot.set(slot2, created);
  return created;
};
var epochSupersededErr = /* @__PURE__ */ mkErr("identity epoch superseded by clearUserIdentity");
var startAppLocalLoad = (appKey, ctrl, targetEpoch) => {
  const promise = enqueueControllerOp(ctrl, async () => {
    if (ctrl.epoch !== targetEpoch) throw epochSupersededErr;
    const id = await loadOrCreateIdbIdentity(appKey, generateNonExtractableIdbRecord, verifyUserIdKey, verifyWithP256);
    trustedUserIdentities.add(id);
    return withPersistence(id, "local");
  }).finally(() => {
    if (ctrl.inFlightLoad?.promise === promise) ctrl.inFlightLoad = null;
  });
  ctrl.inFlightLoad = {
    epoch: targetEpoch,
    promise
  };
  return promise;
};
var resolveUserIdentity = async (appId, roomId, config, clientId) => {
  const raw = config?.identity;
  if (typeof raw === "function") return coerceCustomUserIdentity(await raw({
    appId,
    roomId
  }));
  if (raw !== void 0 && raw !== "none" && raw !== "local") return coerceCustomUserIdentity(raw);
  const appKey = normalizeAppId(appId);
  const ctrl = getAppController(appKey);
  if ((raw === "none" || raw === "local" ? raw : hasIndexedDB() ? "local" : "none") === "none") return getOrCreateEphemeralIdentity(appKey, clientId, ctrl.epoch);
  if (!hasIndexedDB()) {
    warn("IndexedDB unavailable; falling back to identity: 'none'");
    return getOrCreateEphemeralIdentity(appKey, clientId, ctrl.epoch);
  }
  for (let attempt = 0; attempt < maxEpochResolveRetries; attempt++) {
    const targetEpoch = ctrl.epoch;
    const loadPromise = ctrl.inFlightLoad?.epoch === targetEpoch ? ctrl.inFlightLoad.promise : startAppLocalLoad(appKey, ctrl, targetEpoch);
    try {
      const resolved = await loadPromise;
      if (ctrl.epoch === targetEpoch) return resolved;
    } catch {
      if (ctrl.epoch !== targetEpoch) continue;
      warn("IndexedDB unavailable; falling back to identity: 'none'");
      return getOrCreateEphemeralIdentity(appKey, clientId, targetEpoch);
    }
  }
  return getOrCreateEphemeralIdentity(appKey, clientId, ctrl.epoch);
};

// node_modules/@trystero-p2p/core/dist/signed-record.mjs
var zeroHlc = [0, 0];
var defaultMaxClockSkewMs = 6e4;
var stateMaxFutureSkewMs = 1e4;
var maxObservedClockDragMs = 5e3;
var maxJsonDepth = 64;
var canonTag = (tag, items, version = 1) => toJson([domainTag(tag, version), ...items]);
var isValidHlc = (v) => Array.isArray(v) && v.length === 2 && isPosSafeInt(v[0]) && typeof v[1] === "number" && Number.isSafeInteger(v[1]) && v[1] >= 0;
var compareHlc = (a, b) => a[0] - b[0] || a[1] - b[1];
var signWith = async (signer, payload) => {
  const bytes = encodeBytes(payload);
  const signature = typeof signer === "function" ? normalizeLowSP256Signature(await signer(bytes)) : await ecdsaSign(signer, bytes);
  return toBase64Url(signature);
};
var verifySig = (pub, payload, sig) => {
  try {
    const res = verifyWithP256(fromBase64Url(sig), encodeBytes(payload), pub);
    return typeof res === "boolean" ? res : res.catch(() => false);
  } catch {
    return false;
  }
};
var canonicalizeAndMeasureJson = (value2, maxBytes = Number.POSITIVE_INFINITY) => {
  const seen3 = /* @__PURE__ */ new Set();
  const walk = (item2, depth) => {
    if (depth > maxJsonDepth) return null;
    if (item2 === null || typeof item2 === "boolean") return String(item2);
    if (typeof item2 === "number") return Number.isFinite(item2) ? toJson(item2) : null;
    if (typeof item2 === "string") return toJson(item2);
    if (typeof item2 !== "object") return null;
    const obj2 = item2;
    if (seen3.has(obj2)) return null;
    const isArr = Array.isArray(obj2);
    if (!isArr) {
      const proto = Object.getPrototypeOf(obj2);
      if (proto !== Object.prototype && proto !== null) return null;
    }
    seen3.add(obj2);
    try {
      if (isArr) {
        const parts3 = [];
        for (let i = 0; i < obj2.length; i++) {
          const serialized = walk(obj2[i], depth + 1);
          if (serialized === null) return null;
          parts3.push(serialized);
        }
        return `[${parts3.join(",")}]`;
      }
      const record = obj2;
      const sortedKeys = keys(record).sort();
      const parts2 = [];
      for (let i = 0; i < sortedKeys.length; i++) {
        const key = sortedKeys[i];
        const prop = record[key];
        if (prop === void 0) continue;
        const serialized = walk(prop, depth + 1);
        if (serialized === null) return null;
        parts2.push(`${toJson(key)}:${serialized}`);
      }
      return `{${parts2.join(",")}}`;
    } finally {
      seen3.delete(obj2);
    }
  };
  const json = walk(value2, 0);
  if (json === null) return 0;
  const bytes = utf8ByteLength(json);
  return bytes > maxBytes ? 1 : [json, bytes];
};
var canonicalizeJson = (value2) => {
  const res = canonicalizeAndMeasureJson(value2);
  if (!Array.isArray(res)) throw mkErr("value must be valid finite JSON");
  return res[0];
};
var createMonotonicClock = (initial = 0) => {
  let lastWall = initial;
  let lastCounter = 0;
  return {
    peek: () => lastWall,
    observe: (ts, maxForwardMs = maxObservedClockDragMs) => {
      const bounded = Math.min(ts, Date.now() + maxForwardMs);
      if (bounded > lastWall) {
        lastWall = bounded;
        lastCounter = 0;
      }
    },
    next: (minTs = 0) => {
      const now2 = Date.now();
      const target = Math.max(now2, lastWall + 1, minTs);
      const maxGlobal = now2 + maxObservedClockDragMs;
      if (target <= maxGlobal) lastWall = target;
      else if (maxGlobal > lastWall) lastWall = maxGlobal;
      lastCounter = 0;
      return target;
    },
    nextHlc: (ns, minHlc = zeroHlc, maxSkewMs = stateMaxFutureSkewMs) => {
      const now2 = Date.now();
      const targetWall = Math.max(now2, lastWall, minHlc[0]);
      if (targetWall > now2 + maxSkewMs) throw mkErr(`state clock skew exceeded for "${ns}"`);
      const counter = targetWall > lastWall && targetWall > minHlc[0] ? 0 : Math.max(targetWall === lastWall ? lastCounter : -1, targetWall === minHlc[0] ? minHlc[1] : -1) + 1;
      const maxGlobal = now2 + maxObservedClockDragMs;
      if (targetWall <= maxGlobal) {
        lastWall = targetWall;
        lastCounter = counter;
      } else if (maxGlobal > lastWall) {
        lastWall = maxGlobal;
        lastCounter = 0;
      }
      return [targetWall, counter];
    }
  };
};
var createTokenBucketLimiter = (ratePerSec, burst, maxKeys = 512) => {
  const buckets = createBoundedCache(maxKeys);
  return {
    consume: (key, cost = 1) => {
      const now2 = Date.now();
      const cur = buckets.get(key);
      if (!cur) {
        if (burst < cost) return false;
        buckets.set(key, [burst - cost, now2]);
        return true;
      }
      const elapsedSec = Math.max(0, now2 - cur[1]) / 1e3;
      if (elapsedSec > 0) {
        cur[0] = Math.min(burst, cur[0] + elapsedSec * ratePerSec);
        cur[1] = now2;
      }
      if (cur[0] < cost) return false;
      cur[0] -= cost;
      return true;
    },
    delete: (key) => {
      buckets.delete(key);
    },
    clear: () => {
      buckets.clear();
    }
  };
};

// node_modules/@trystero-p2p/core/dist/relay-manager.mjs
var { min } = Math;
var defaultRetryMs = 3333;
var maxRetryMs = 6e4;
var socketClosedErr = /* @__PURE__ */ mkErr("relay socket closed");
var socketRetryPeriods = /* @__PURE__ */ createBoundedCache(256);
var hasLiveSocket = (s) => s.phase === "connecting" || s.phase === "open";
var isSocketDormant = (s) => s.phase === "backoff-wait" || s.phase === "parked-offline";
var socketControllers = /* @__PURE__ */ new Set();
var socketWakeFns = /* @__PURE__ */ new WeakMap();
var defaultIsRelayClosed = (relay) => Boolean(relay.isClosed);
var relayConnectivity = "auto";
var isRelayOffline = false;
var stopWatchingOnline = null;
var getRelays = (config, defaults, defaultN, deriveFromAppId = false) => config.relayConfig?.urls || (deriveFromAppId ? shuffle(defaults, strToNum(config.appId)) : defaults).slice(0, config.relayConfig?.redundancy ?? defaultN);
var holdRelaySockets = () => {
  isRelayOffline = true;
  socketControllers.forEach((c) => c[0]());
};
var reconnectRelaySockets = () => {
  isRelayOffline = false;
  socketRetryPeriods.clear();
  socketControllers.forEach((c) => c[1]());
};
var attachOnlineWatcher = () => {
  if (stopWatchingOnline || typeof addEventListener !== "function") return;
  const controller = new AbortController();
  const { signal } = controller;
  addEventListener("online", reconnectRelaySockets, { signal });
  addEventListener("offline", holdRelaySockets, { signal });
  if (typeof document !== "undefined" && typeof document.addEventListener === "function") document.addEventListener("visibilitychange", () => {
    if (!isRelayOffline && document.visibilityState === "visible") reconnectRelaySockets();
  }, { signal });
  stopWatchingOnline = () => controller.abort();
};
var detachWebSocket = (socket) => {
  socket.onopen = socket.onclose = socket.onmessage = null;
  socket.close();
};
var makeSocket = (url, onMessage, onReconnect) => {
  const client = {
    url,
    isClosed: false,
    send: noOp2
  };
  const failureWaiters = /* @__PURE__ */ new Set();
  let lifecycle = {
    phase: "parked-offline",
    didOpen: false
  };
  const settleAttempt = (err) => {
    failureWaiters.forEach((w) => w(err));
    failureWaiters.clear();
  };
  const createReadyGate = () => {
    const { promise, resolve: resolve3, reject } = Promise.withResolvers();
    promise.catch(noOp2);
    Object.defineProperty(promise, socketInitialFailureSymbol, {
      value: () => {
        if (lifecycle.phase === "open" || lifecycle.phase === "closed" || isRelayOffline) return Promise.resolve(null);
        if (lifecycle.phase === "backoff-wait" && lifecycle.attemptFailure) return Promise.resolve(lifecycle.attemptFailure);
        return new Promise((res) => {
          failureWaiters.add(res);
        });
      },
      enumerable: false,
      configurable: true
    });
    return {
      promise,
      resolve: resolve3,
      reject
    };
  };
  let readyGate = createReadyGate();
  client.ready = readyGate.promise;
  const rotateReadyGateAfterDisconnect = () => {
    readyGate = createReadyGate();
    client.ready = readyGate.promise;
  };
  if (relayConnectivity === "auto") attachOnlineWatcher();
  const getDidOpen = (state) => state.phase === "open" ? true : state.didOpen;
  const init = () => {
    switch (lifecycle.phase) {
      case "closed":
      case "connecting":
      case "open":
        return;
      case "backoff-wait":
        clearTimeout(lifecycle.timer);
        if (isRelayOffline) {
          lifecycle = {
            phase: "parked-offline",
            didOpen: lifecycle.didOpen
          };
          return;
        }
        break;
      case "parked-offline":
        if (isRelayOffline) return;
        break;
      default:
        unreachable(lifecycle);
    }
    const didOpen = lifecycle.didOpen;
    const socket = new WebSocket(url);
    client.socket = socket;
    client.url = socket.url ?? url;
    lifecycle = {
      phase: "connecting",
      socket,
      didOpen
    };
    socket.onclose = () => {
      if (!hasLiveSocket(lifecycle) || lifecycle.socket !== socket) return;
      const wasOpen = lifecycle.phase === "open";
      const nextDidOpen = getDidOpen(lifecycle);
      client.send = noOp2;
      if (wasOpen) rotateReadyGateAfterDisconnect();
      if (isRelayOffline) {
        lifecycle = {
          phase: "parked-offline",
          didOpen: nextDidOpen
        };
        if (!wasOpen) settleAttempt(null);
        return;
      }
      const attemptFailure = wasOpen ? null : mkErr(`failed to connect to relay ${client.url}`);
      if (attemptFailure) settleAttempt(attemptFailure);
      const period = socketRetryPeriods.get(url) ?? defaultRetryMs;
      socketRetryPeriods.set(url, period);
      const timer = setTimeout(init, Math.random() * period);
      socketRetryPeriods.set(url, min(period * 2, maxRetryMs));
      lifecycle = {
        phase: "backoff-wait",
        didOpen: nextDidOpen,
        timer,
        attemptFailure
      };
    };
    socket.onmessage = (e) => {
      try {
        onMessage(String(e.data));
      } catch {
      }
    };
    socket.onopen = () => {
      if (lifecycle.phase !== "connecting" || lifecycle.socket !== socket) return;
      const isReconnect = lifecycle.didOpen;
      lifecycle = {
        phase: "open",
        socket
      };
      settleAttempt(null);
      readyGate.resolve(client);
      socketRetryPeriods.set(url, defaultRetryMs);
      if (isReconnect) onReconnect?.();
    };
    client.send = (data) => {
      if (socket.readyState === 1) socket.send(data);
    };
  };
  const controller = [() => {
    switch (lifecycle.phase) {
      case "closed":
      case "parked-offline":
        return;
      case "backoff-wait":
        clearTimeout(lifecycle.timer);
        lifecycle = {
          phase: "parked-offline",
          didOpen: lifecycle.didOpen
        };
        settleAttempt(null);
        return;
      case "connecting":
      case "open": {
        const wasOpen = lifecycle.phase === "open";
        const didOpen = getDidOpen(lifecycle);
        const activeSocket = lifecycle.socket;
        client.send = noOp2;
        lifecycle = {
          phase: "parked-offline",
          didOpen
        };
        if (wasOpen) rotateReadyGateAfterDisconnect();
        settleAttempt(null);
        detachWebSocket(activeSocket);
        return;
      }
      default:
        unreachable(lifecycle);
    }
  }, () => {
    if (lifecycle.phase === "closed") return;
    socketRetryPeriods.set(url, defaultRetryMs);
    if (isSocketDormant(lifecycle)) init();
  }];
  socketControllers.add(controller);
  socketWakeFns.set(client, () => {
    if (!isRelayOffline && isSocketDormant(lifecycle)) controller[1]();
  });
  client.close = () => {
    if (lifecycle.phase === "closed") return;
    const prev2 = lifecycle;
    client.isClosed = true;
    client.send = noOp2;
    lifecycle = { phase: "closed" };
    settleAttempt(null);
    readyGate.reject(socketClosedErr);
    socketControllers.delete(controller);
    socketWakeFns.delete(client);
    socketRetryPeriods.delete(url);
    switch (prev2.phase) {
      case "parked-offline":
        break;
      case "backoff-wait":
        clearTimeout(prev2.timer);
        break;
      case "connecting":
      case "open":
        detachWebSocket(prev2.socket);
        break;
      default:
        unreachable(prev2);
    }
  };
  if (!isRelayOffline) init();
  return client;
};
var createRelayScopedStore = () => {
  const store = /* @__PURE__ */ new WeakMap();
  return { forRelay: (relay) => {
    let map = store.get(relay);
    if (!map) {
      map = /* @__PURE__ */ Object.create(null);
      store.set(relay, map);
    }
    return map;
  } };
};
var relayLeaseReleases = /* @__PURE__ */ new WeakMap();
var releaseRelayLease = (leaseTarget) => {
  if (leaseTarget && typeof leaseTarget === "object") {
    const release2 = relayLeaseReleases.get(leaseTarget);
    if (release2) {
      relayLeaseReleases.delete(leaseTarget);
      release2();
    }
  }
};
var createRelayManager = (getSocket, closeRelay, isRelayClosed) => {
  const pooledByKey = /* @__PURE__ */ new Map();
  const relayKeys = /* @__PURE__ */ new WeakMap();
  const leaseCounts = /* @__PURE__ */ new WeakMap();
  const closedRelays = /* @__PURE__ */ new WeakSet();
  const checkClosed = isRelayClosed ?? defaultIsRelayClosed;
  const unpool = (relay) => {
    const key = relayKeys.get(relay);
    if (key !== void 0 && pooledByKey.get(key) === relay) pooledByKey.delete(key);
  };
  return {
    register: (key, createRelay) => {
      let relay = pooledByKey.get(key);
      if (relay && checkClosed(relay)) {
        unpool(relay);
        leaseCounts.delete(relay);
        relay = void 0;
      }
      if (!relay) {
        relay = createRelay();
        pooledByKey.set(key, relay);
        relayKeys.set(relay, key);
      } else socketWakeFns.get(relay)?.();
      return relay;
    },
    lease: (relay, readyP) => {
      socketWakeFns.get(relay)?.();
      leaseCounts.set(relay, (leaseCounts.get(relay) ?? 0) + 1);
      const leasedP = Promise.resolve(readyP).then((r) => r);
      leasedP.catch(noOp2);
      const getInitialFailure = readyP[socketInitialFailureSymbol];
      if (typeof getInitialFailure === "function") Object.defineProperty(leasedP, socketInitialFailureSymbol, {
        value: getInitialFailure,
        enumerable: false,
        configurable: true
      });
      let released = false;
      relayLeaseReleases.set(leasedP, () => {
        if (released) return;
        released = true;
        const prev2 = leaseCounts.get(relay);
        if (!prev2 || prev2 <= 0) return;
        if (prev2 > 1) {
          leaseCounts.set(relay, prev2 - 1);
          return;
        }
        leaseCounts.delete(relay);
        unpool(relay);
        if (!closedRelays.has(relay) && !checkClosed(relay)) {
          closedRelays.add(relay);
          closeRelay?.(relay);
        }
      });
      return leasedP;
    },
    evict: unpool,
    getSockets: () => fromEntries([...pooledByKey.entries()].flatMap(([key, relay]) => {
      const socket = checkClosed(relay) ? void 0 : getSocket(relay);
      return socket ? [[key, socket]] : [];
    }))
  };
};

// node_modules/@trystero-p2p/core/dist/data-limits.mjs
var maxActionFrameBytes = 16384;
var maxBulkFrameBytes = 65536;
var maxRoomFrameBytes = 17408;
var pendingDataTimeoutMs = 1e4;
var transferTimeoutMs = 12e4;

// node_modules/@trystero-p2p/core/dist/action-wire.mjs
var inlineKind = 0;
var offerKind = 1;
var chunkKind = 2;
var acceptedKind = 3;
var rejectedKind = 4;
var cancelledKind = 5;
var wideBulkFlag = 64;
var inlineHeaderSize = 36;
var offerHeaderSize = 48;
var controlHeaderSize = 6;
var chunkHeaderSize = 14;
var minChunkSize = maxActionFrameBytes - chunkHeaderSize;
var maxChunkSize = maxBulkFrameBytes - chunkHeaderSize;
var defaultMaxReceiveBytes = 256 * 1024 ** 2;
var maxControlBufferedBytes = 1024 ** 2;
var maxPendingTransfers = 1024;
var maxPendingPerPeer = 64;
var maxDecisions = 128;
var maxDecisionsPerPeer = 8;
var maxPreListenerMessages = 32;
var sizeLimitMsg = "payload exceeds receiver size limit";
var invalidPayloadMsg = invalidActionMsg("payload");
var textFormat = 0;
var jsonFormat = 1;
var binaryFormat = 2;
var bulkPhaseClass = {
  pending: {
    waiting: true,
    reserved: false,
    active: false,
    admitted: false
  },
  deciding: {
    waiting: true,
    reserved: false,
    active: false,
    admitted: false
  },
  queued: {
    waiting: true,
    reserved: false,
    active: false,
    admitted: true
  },
  accepted: {
    waiting: false,
    reserved: true,
    active: true,
    admitted: true
  },
  receiving: {
    waiting: false,
    reserved: true,
    active: true,
    admitted: true
  },
  buffered: {
    waiting: false,
    reserved: true,
    active: false,
    admitted: true
  },
  closed: {
    waiting: false,
    reserved: false,
    active: false,
    admitted: false
  }
};
var isBulkSettled = (s) => s.phase === "failed" || s.phase === "done";
var makeActionError = (kind, message) => {
  const error = Object.assign(mkErr(message), { kind });
  if (kind === "aborted") error.name = "AbortError";
  return error;
};
var throwIfAborted = (signal) => {
  if (signal?.aborted) throw makeActionError("aborted", operationAbortedMsg);
};
var viewOf = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
var buildControlPacket = (kind, id, size = controlHeaderSize) => {
  const bytes = new Uint8Array(size);
  bytes[0] = 3;
  bytes[1] = kind;
  viewOf(bytes).setUint32(2, id);
  return bytes;
};
var startIdleTimer = (getLast, onTimeout, onReschedule) => {
  const tick = () => {
    const remaining = transferTimeoutMs - (Date.now() - getLast());
    if (remaining > 0) {
      const next2 = setTimeout(tick, remaining);
      unrefTimer(next2);
      onReschedule(next2);
    } else onTimeout();
  };
  const initial = setTimeout(tick, transferTimeoutMs);
  unrefTimer(initial);
  return initial;
};
var decodeActionType = (frame2) => decodeBytes(frame2.subarray(2, 34)).replaceAll("\0", "");
var decideReceive = (decide, settle) => {
  let result;
  try {
    result = decide();
  } catch {
    return settle(false);
  }
  return typeof result === "boolean" ? settle(result) : Promise.resolve(result).then((value2) => settle(value2 === true), () => settle(false));
};
var decodePayload = (bytes, format, copy) => format === binaryFormat ? copy ? bytes.slice() : bytes : format === jsonFormat ? fromJson(decodeBytes(bytes)) : decodeBytes(bytes);
var emitRxProgress = (registration, value2, peerId, metadata) => {
  try {
    registration.onProgress(value2, peerId, metadata);
  } catch (error) {
    logErr("progress handler", error);
  }
};
var deliverPayload = (registration, data, peerId, metadata) => {
  emitRxProgress(registration, 1, peerId, metadata);
  try {
    registration.receiver?.(data, peerId, metadata);
  } catch (error) {
    logActionHandlerErr(error);
  }
};
var createActionWireManager = ({ resolveTransport, getPeerIds, canReceiveFromPeer, onPeerError, broadcastInline, checkAborted = throwIfAborted, onUnknownType, maxReceiveBytes = defaultMaxReceiveBytes }) => {
  if (!Number.isSafeInteger(maxReceiveBytes) || maxReceiveBytes <= 0) throw posSafeIntErr("maxReceiveBytes");
  const actions = /* @__PURE__ */ new Map();
  const rxActions = /* @__PURE__ */ new Map();
  const outgoing = /* @__PURE__ */ new Map();
  const outgoingInlineQueues = /* @__PURE__ */ new Map();
  const peers = /* @__PURE__ */ new Map();
  const preListenerQueues = /* @__PURE__ */ new Map();
  const waitingBulk = /* @__PURE__ */ new Set();
  const decisions = /* @__PURE__ */ new Map();
  const failedTransports = /* @__PURE__ */ new WeakSet();
  let preListenerSweepTimer = null;
  let nextTransferId = 0;
  let pendingCount = 0;
  let decisionCount = 0;
  let reservedBytes = 0;
  let draining = false;
  let drainDirty = false;
  const disconnectedTransferErr = () => makeActionError("disconnected", peerDisconnectedMsg);
  const invalidFrameMsg = invalidActionMsg("frame");
  const isCurrent = (transfer2) => transfer2.state.phase !== "closed";
  const payloadLimit = (registration) => Math.min(maxReceiveBytes, registration?.maxPayloadBytes ?? maxReceiveBytes);
  const markDrainDirty = () => {
    if (draining) drainDirty = true;
  };
  const failPeer = (peerId, reason, protocolViolation = true) => {
    const target = resolveTransport(peerId, true);
    if (target && !failedTransports.has(target)) {
      failedTransports.add(target);
      warn(`${reason}; disconnecting peer ${peerId}`);
      onPeerError(peerId, protocolViolation ? mkViolationErr(reason) : mkErr(reason));
    }
  };
  const sendControlFrame = (peerId, target, id, kind, reason = "") => {
    if (!target || !target.isOpen) return;
    const text = encodeBytes(reason).subarray(0, 200);
    const bytes = buildControlPacket(kind, id, controlHeaderSize + text.length);
    bytes.set(text, controlHeaderSize);
    try {
      if (target.bufferedAmount > maxControlBufferedBytes) throw mkErr("control send buffer is full");
      target.sendFrame(bytes, id);
    } catch {
      failPeer(peerId, "unable to send action control", false);
    }
  };
  const sendControl = (peerId, id, kind, reason = "") => {
    sendControlFrame(peerId, resolveTransport(peerId, true), id, kind, reason);
  };
  const notifyRejected = (message, reason, scope, bulkId) => {
    scope?.[3](reason);
    rxActions.get(message.type)?.onReject?.(message.peerId, message.metadata, reason);
    if (bulkId !== void 0) sendControl(message.peerId, bulkId, rejectedKind, reason);
  };
  const rotateWaitingForPeer = (peerId) => {
    for (const queued of Array.from(waitingBulk)) if (queued.message.peerId === peerId) {
      waitingBulk.delete(queued);
      waitingBulk.add(queued);
    }
  };
  const releaseDecisionSlot = (peerId) => {
    decisionCount--;
    const count = (decisions.get(peerId) ?? 1) - 1;
    if (count > 0) decisions.set(peerId, count);
    else decisions.delete(peerId);
  };
  const transitionBulk = (transfer2, next2) => {
    const from = bulkPhaseClass[transfer2.state.phase];
    const to = bulkPhaseClass[next2.phase];
    const { peerId, size } = transfer2.message;
    const peer = peers.get(peerId);
    if (from.reserved !== to.reserved) {
      reservedBytes += to.reserved ? size : -size;
      if (!to.reserved) markDrainDirty();
    }
    if (from.waiting !== to.waiting) {
      if (to.waiting) waitingBulk.add(transfer2);
      else waitingBulk.delete(transfer2);
    }
    if (from.active !== to.active && peer) {
      if (to.active) peer.activeBulk = transfer2;
      else if (peer.activeBulk === transfer2) {
        peer.activeBulk = null;
        rotateWaitingForPeer(peerId);
      }
    }
    transfer2.state = next2;
    if (next2.phase === "buffered") markDrainDirty();
  };
  const releaseTransfer = (transfer2) => {
    if (transfer2.state.phase === "closed") return false;
    const { peerId } = transfer2.message;
    const peer = peers.get(peerId);
    transfer2.unbindScopeAbort?.();
    transfer2.unbindScopeAbort = null;
    transfer2.timer = resetTimer(transfer2.timer);
    const admissionController = transfer2.controller;
    transfer2.controller = null;
    if (transfer2.kind === "inline") {
      transfer2.state = { phase: "closed" };
      const queue = peer?.inlineQueues.get(transfer2.queueKey);
      if (queue) {
        const idx = queue.indexOf(transfer2);
        if (idx >= 0) queue.splice(idx, 1);
        if (!queue.length) peer.inlineQueues.delete(transfer2.queueKey);
      }
    } else {
      peer?.bulkTransfers.delete(transfer2.transferId);
      transitionBulk(transfer2, { phase: "closed" });
    }
    if (peer) {
      peer.pendingCount--;
      pendingCount--;
      if (!peer.pendingCount) peers.delete(peerId);
    }
    admissionController?.abort();
    return true;
  };
  const rejectRx = (transfer2, reason) => {
    if (!releaseTransfer(transfer2)) return;
    notifyRejected(transfer2.message, reason, transfer2.scope, transfer2.kind === "bulk" ? transfer2.transferId : void 0);
  };
  const enterDeciding = (transfer2) => {
    if (transfer2.state.phase !== "pending") return null;
    const { peerId } = transfer2.message;
    if (decisionCount >= maxDecisions || (decisions.get(peerId) ?? 0) >= maxDecisionsPerPeer) {
      rejectRx(transfer2, "too many pending receive decisions");
      return null;
    }
    const controller = new AbortController();
    transfer2.controller = controller;
    decisionCount++;
    decisions.set(peerId, (decisions.get(peerId) ?? 0) + 1);
    if (transfer2.kind === "inline") transfer2.state = {
      phase: "deciding",
      data: transfer2.state.data
    };
    else transitionBulk(transfer2, { phase: "deciding" });
    return controller;
  };
  const enterReady = (transfer2) => {
    if (transfer2.kind === "inline") switch (transfer2.state.phase) {
      case "pending":
      case "deciding":
        transfer2.state = {
          phase: "ready",
          data: transfer2.state.data
        };
        return true;
      case "ready":
        return true;
      case "closed":
        return false;
      default:
        return unreachable(transfer2.state);
    }
    switch (transfer2.state.phase) {
      case "pending":
      case "deciding":
        transitionBulk(transfer2, { phase: "queued" });
        return true;
      case "queued":
      case "accepted":
      case "receiving":
      case "buffered":
        return true;
      case "closed":
        return false;
      default:
        return unreachable(transfer2.state);
    }
  };
  const acceptBulk = (transfer2) => {
    if (transfer2.state.phase !== "queued") return;
    const peer = peers.get(transfer2.message.peerId);
    if (!peer || peer.activeBulk !== null || reservedBytes + transfer2.message.size > maxReceiveBytes) return;
    transfer2.lastSeenAt = Date.now();
    transitionBulk(transfer2, { phase: "accepted" });
    sendControl(transfer2.message.peerId, transfer2.transferId, acceptedKind);
  };
  const beginReceivingChunks = (transfer2) => {
    switch (transfer2.state.phase) {
      case "receiving":
        return transfer2.state;
      case "accepted": {
        const totalSize = transfer2.message.size;
        try {
          const nextState = {
            phase: "receiving",
            data: new Uint8Array(totalSize),
            seenChunks: new Uint8Array(Math.ceil(Math.ceil(totalSize / transfer2.chunkSize) / 8)),
            offset: 0
          };
          transitionBulk(transfer2, nextState);
          return nextState;
        } catch {
          rejectRx(transfer2, "unable to allocate receive buffer");
          drain();
          return null;
        }
      }
      case "pending":
      case "deciding":
      case "queued":
      case "buffered":
      case "closed":
        return null;
      default:
        return unreachable(transfer2.state);
    }
  };
  const parkCompletedBulk = (transfer2) => {
    if (transfer2.state.phase !== "receiving") return;
    const { data } = transfer2.state;
    transitionBulk(transfer2, {
      phase: "buffered",
      data
    });
  };
  const isAdmittedTransfer = (transfer2) => transfer2.kind === "inline" ? transfer2.state.phase === "ready" : bulkPhaseClass[transfer2.state.phase].admitted;
  const admit = (transfer2, registration) => {
    if (transfer2.state.phase !== "pending") return isAdmittedTransfer(transfer2);
    if (transfer2.message.size > payloadLimit(registration)) {
      rejectRx(transfer2, sizeLimitMsg);
      return false;
    }
    const receive = transfer2.scope ? transfer2.scope[2] : registration.receiveGate;
    if (!receive) {
      if (!registration.receiver) return false;
      return enterReady(transfer2);
    }
    const controller = enterDeciding(transfer2);
    if (!controller) return false;
    const { peerId } = transfer2.message;
    let settled = false;
    const result = decideReceive(() => receive({
      byteLength: transfer2.message.size,
      peerId,
      signal: controller.signal,
      ...transfer2.message.metadata === void 0 ? {} : { metadata: transfer2.message.metadata }
    }), (allow) => {
      if (!settled) {
        settled = true;
        releaseDecisionSlot(peerId);
      }
      if (transfer2.state.phase !== "deciding") return false;
      if (allow) return enterReady(transfer2);
      rejectRx(transfer2, "payload rejected by receiver");
      return false;
    });
    if (typeof result === "boolean") return result;
    result.then(() => drain());
    return false;
  };
  const complete = (transfer2, registration, bytes, copyBinary) => {
    let payload;
    try {
      payload = decodePayload(bytes, transfer2.message.format, copyBinary);
    } catch {
      releaseTransfer(transfer2);
      failPeer(transfer2.message.peerId, invalidPayloadMsg);
      return;
    }
    releaseTransfer(transfer2);
    deliverPayload(registration, payload, transfer2.message.peerId, transfer2.message.metadata);
  };
  const tryInline = (transfer2) => {
    const registration = rxActions.get(transfer2.message.type);
    if (!registration) return;
    if (transfer2.state.phase === "pending" && !admit(transfer2, registration)) return;
    if (transfer2.state.phase !== "ready") return;
    if (registration.receiver) complete(transfer2, registration, transfer2.state.data, true);
    else if (!transfer2.scope) {
      const { data } = transfer2.state;
      const { lastSeenAt, message } = transfer2;
      releaseTransfer(transfer2);
      bufferPreListenerInline(message, data, true, true, lastSeenAt);
    }
  };
  const tryBulk = (transfer2) => {
    const registration = rxActions.get(transfer2.message.type);
    if (!registration) return;
    switch (transfer2.state.phase) {
      case "pending":
        if (admit(transfer2, registration) && registration.receiver) acceptBulk(transfer2);
        return;
      case "queued":
        if (registration.receiver) acceptBulk(transfer2);
        return;
      case "buffered":
        if (registration.receiver) complete(transfer2, registration, transfer2.state.data, false);
        return;
      case "deciding":
      case "accepted":
      case "receiving":
      case "closed":
        return;
      default:
        unreachable(transfer2.state);
    }
  };
  const drainInline = (peerId, queueKey) => {
    const queue = peers.get(peerId)?.inlineQueues.get(queueKey);
    while (queue?.[0]) {
      const head = queue[0];
      tryInline(head);
      if (isCurrent(head)) break;
    }
  };
  const drain = () => {
    if (draining) {
      drainDirty = true;
      return;
    }
    draining = true;
    try {
      do {
        drainDirty = false;
        for (const transfer2 of waitingBulk) tryBulk(transfer2);
        for (const [id, peer] of peers) {
          for (const transfer2 of peer.bulkTransfers.values()) if (transfer2.state.phase === "buffered") tryBulk(transfer2);
          for (const key of peer.inlineQueues.keys()) drainInline(id, key);
        }
      } while (drainDirty);
    } finally {
      draining = false;
      drainDirty = false;
    }
  };
  const ensurePreListenerSweepTimer = () => {
    if (!preListenerSweepTimer) {
      preListenerSweepTimer = setTimeout(sweepPreListenerQueues, pendingDataTimeoutMs);
      unrefTimer(preListenerSweepTimer);
    }
  };
  const sweepPreListenerQueues = () => {
    preListenerSweepTimer = resetTimer(preListenerSweepTimer);
    const now2 = Date.now();
    let hasRemaining = false;
    for (const [peerId, byType] of preListenerQueues) {
      for (const [type, ring] of byType) {
        while (ring.length > 0 && now2 - ring[0].receivedAt > 1e4) ring.shift();
        if (ring.length === 0) byType.delete(type);
        else hasRemaining = true;
      }
      if (byType.size === 0) preListenerQueues.delete(peerId);
    }
    if (hasRemaining) ensurePreListenerSweepTimer();
  };
  const bufferPreListenerInline = (message, dataSlice, admitted = false, alreadyOwned = false, receivedAt = Date.now()) => {
    const now2 = Date.now();
    let byType = preListenerQueues.get(message.peerId);
    if (!byType) {
      byType = /* @__PURE__ */ new Map();
      preListenerQueues.set(message.peerId, byType);
    }
    let ring = byType.get(message.type);
    if (!ring) {
      ring = [];
      byType.set(message.type, ring);
    }
    while (ring.length > 0 && now2 - ring[0].receivedAt > 1e4) ring.shift();
    if (ring.length >= maxPreListenerMessages) ring.shift();
    ring.push({
      admitted,
      message,
      data: alreadyOwned ? dataSlice : dataSlice.slice(),
      receivedAt
    });
    ensurePreListenerSweepTimer();
  };
  const createTransferBase = (message, scope) => ({
    message,
    scope,
    unbindScopeAbort: null,
    controller: null,
    lastSeenAt: Date.now(),
    timer: null
  });
  const ensureIdleTimer = (transfer2) => {
    if (!isCurrent(transfer2) || transfer2.timer) return;
    transfer2.timer = startIdleTimer(() => transfer2.lastSeenAt, () => {
      rejectRx(transfer2, "action transfer timed out");
      drain();
    }, (nextTimer) => {
      if (isCurrent(transfer2)) transfer2.timer = nextTimer;
      else clearTimeout(nextTimer);
    });
  };
  const enqueueTransfer = (transfer2, deferTimer = false) => {
    const { peerId } = transfer2.message;
    let peer = peers.get(peerId);
    if (pendingCount >= maxPendingTransfers || (peer?.pendingCount ?? 0) >= maxPendingPerPeer) {
      notifyRejected(transfer2.message, "too many pending transfers", transfer2.scope, transfer2.kind === "bulk" ? transfer2.transferId : void 0);
      return false;
    }
    if (!peer) {
      peer = {
        bulkTransfers: /* @__PURE__ */ new Map(),
        inlineQueues: /* @__PURE__ */ new Map(),
        activeBulk: null,
        pendingCount: 0
      };
      peers.set(peerId, peer);
    }
    peer.pendingCount++;
    pendingCount++;
    if (transfer2.kind === "inline") {
      const queue = peer.inlineQueues.get(transfer2.queueKey) ?? [];
      queue.push(transfer2);
      peer.inlineQueues.set(transfer2.queueKey, queue);
    } else {
      peer.bulkTransfers.set(transfer2.transferId, transfer2);
      transitionBulk(transfer2, { phase: "pending" });
    }
    if (!deferTimer) ensureIdleTimer(transfer2);
    if (transfer2.scope) {
      const sig = transfer2.scope[1];
      const cancel = () => {
        rejectRx(transfer2, "receive cancelled");
        drain();
      };
      if (sig.aborted) {
        cancel();
        return false;
      }
      const ac = new AbortController();
      sig.addEventListener("abort", cancel, {
        once: true,
        signal: ac.signal
      });
      transfer2.unbindScopeAbort = () => ac.abort();
    }
    return true;
  };
  const flushPreListenerType = (type, registration) => {
    const isFlushable = () => Boolean(registration.receiver || registration.receiveGate);
    if (!isFlushable()) return;
    const now2 = Date.now();
    for (const peerId of Array.from(preListenerQueues.keys())) {
      if (!isFlushable()) break;
      while (isFlushable()) {
        const byType = preListenerQueues.get(peerId);
        const ring = byType?.get(type);
        if (!ring || ring.length === 0) {
          if (byType) {
            byType.delete(type);
            if (byType.size === 0) preListenerQueues.delete(peerId);
          }
          break;
        }
        if (now2 - ring[0].receivedAt > 1e4) {
          ring.shift();
          continue;
        }
        if (ring[0].admitted && !registration.receiver) break;
        const entry = ring.shift();
        if (ring.length === 0) {
          byType.delete(type);
          if (byType.size === 0) preListenerQueues.delete(peerId);
        }
        if (entry.message.size > payloadLimit(registration)) {
          notifyRejected(entry.message, sizeLimitMsg);
          continue;
        }
        if (entry.admitted || registration.receiver && !registration.receiveGate && !peers.get(peerId)?.inlineQueues.has(type)) {
          let payload;
          try {
            payload = decodePayload(entry.data, entry.message.format, false);
          } catch {
            if (byType) {
              byType.delete(type);
              if (byType.size === 0) preListenerQueues.delete(peerId);
            }
            failPeer(peerId, invalidPayloadMsg);
            break;
          }
          deliverPayload(registration, payload, peerId, entry.message.metadata);
        } else {
          const transfer2 = {
            ...createTransferBase(entry.message),
            kind: "inline",
            queueKey: type,
            state: {
              phase: "pending",
              data: entry.data
            }
          };
          if (enqueueTransfer(transfer2, true)) {
            drainInline(peerId, type);
            ensureIdleTimer(transfer2);
          }
        }
      }
    }
  };
  const resolveAdmission = (message, bulkId) => {
    const registration = rxActions.get(message.type);
    if (!registration) {
      if (bulkId !== void 0) sendControl(message.peerId, bulkId, rejectedKind, "unregistered action");
      return null;
    }
    const scope = registration.receiveScope?.(message.peerId, message.metadata);
    if (scope === null || scope?.[1].aborted) {
      if (bulkId !== void 0) sendControl(message.peerId, bulkId, rejectedKind, "unexpected response");
      return null;
    }
    if (message.size > payloadLimit(registration)) {
      notifyRejected(message, sizeLimitMsg, scope, bulkId);
      return null;
    }
    return [registration, scope];
  };
  const clearPeer = (peerId) => {
    for (const transfer2 of outgoing.get(peerId)?.values() ?? []) transfer2.fail(disconnectedTransferErr());
    outgoing.delete(peerId);
    outgoingInlineQueues.delete(peerId);
    preListenerQueues.delete(peerId);
    const peer = peers.get(peerId);
    if (peer) {
      for (const transfer2 of Array.from(peer.bulkTransfers.values())) releaseTransfer(transfer2);
      for (const queue of Array.from(peer.inlineQueues.values())) queue.slice().forEach((transfer2) => {
        releaseTransfer(transfer2);
      });
    }
    drain();
  };
  const raceAbort = (p, signal) => new Promise((resolve3, reject) => {
    const onAbort = () => {
      try {
        checkAborted(signal);
      } catch (err) {
        reject(err);
      }
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    const ac = new AbortController();
    signal.addEventListener("abort", onAbort, {
      once: true,
      signal: ac.signal
    });
    p.then(resolve3, reject).finally(() => {
      ac.abort();
    });
  });
  const sendFrameToTransport = async (transport, bytes, check3, signal, transferId, isOffer, initialDrain, onBeforeSend, onSendFailed) => {
    check3();
    const drainRes = initialDrain ?? transport.waitForDrain(signal);
    if (drainRes !== true) {
      if (!await drainRes) {
        checkAborted(signal);
        throw makeActionError("disconnected", "data channel stopped draining");
      }
      check3();
    }
    onBeforeSend?.();
    try {
      transport.sendFrame(bytes, transferId, isOffer);
    } catch {
      const err = disconnectedTransferErr();
      onSendFailed?.(err);
      throw err;
    }
  };
  const sendBulkToPeer = async (peerId, transport, offerFrame, transferId, source2, size, metadata, progressCb, signal) => {
    const { promise: permission, resolve: acceptOffer, reject: rejectOffer } = Promise.withResolvers();
    permission.catch(noOp2);
    const transfers = outgoing.get(peerId) ?? /* @__PURE__ */ new Map();
    if (transfers.has(transferId)) throw mkErr("action transfer id in use");
    outgoing.set(peerId, transfers);
    const failTransfer = (error, fromReceiver = false, didSendOfferOverride) => {
      if (isBulkSettled(bulkState)) return;
      let didSendOffer = true;
      if (bulkState.phase === "offering") {
        didSendOffer = bulkState.sent;
        clearTimeout(bulkState.timer);
        bulkState = {
          phase: "failed",
          error,
          fromReceiver,
          didSendOffer: didSendOfferOverride ?? didSendOffer
        };
        rejectOffer(error);
        return;
      }
      bulkState = {
        phase: "failed",
        error,
        fromReceiver,
        didSendOffer: didSendOfferOverride ?? didSendOffer
      };
    };
    let bulkState = {
      phase: "offering",
      sent: false,
      timer: startIdleTimer(() => bulkState.phase === "offering" ? bulkState.lastSeen : 0, () => failTransfer(makeActionError("timeout", "action offer timed out")), (nextTimer) => {
        if (bulkState.phase === "offering") bulkState.timer = nextTimer;
        else clearTimeout(nextTimer);
      }),
      lastSeen: Date.now()
    };
    const currentBulkState = () => bulkState;
    const check3 = () => {
      if (bulkState.phase === "failed") throw bulkState.error;
      try {
        checkAborted(signal);
        if (!transport.isOpen) throw disconnectedTransferErr();
      } catch (err) {
        failTransfer(err);
        throw err;
      }
    };
    transfers.set(transferId, {
      accept: () => {
        if (bulkState.phase === "offering" && bulkState.sent) {
          clearTimeout(bulkState.timer);
          bulkState = { phase: "streaming" };
          acceptOffer();
          return true;
        }
        return false;
      },
      fail: (error, fromReceiver = false) => {
        failTransfer(error, fromReceiver);
      },
      touch: () => {
        if (bulkState.phase === "offering") bulkState.lastSeen = Date.now();
      }
    });
    const abortCleanup = signal ? new AbortController() : null;
    if (abortCleanup && signal) signal.addEventListener("abort", () => {
      try {
        checkAborted(signal);
      } catch (error) {
        failTransfer(error);
      }
    }, {
      once: true,
      signal: abortCleanup.signal
    });
    try {
      const useWideChunks = (transport.maxBulkFrameBytes ?? 16384) >= maxBulkFrameBytes;
      const txChunkSize = useWideChunks ? maxChunkSize : minChunkSize;
      let peerOfferFrame = offerFrame;
      if (useWideChunks) {
        peerOfferFrame = offerFrame.slice();
        peerOfferFrame[1] = peerOfferFrame[1] | wideBulkFlag;
      }
      await sendFrameToTransport(transport, peerOfferFrame, check3, signal, transferId, true, void 0, () => {
        if (bulkState.phase === "offering") bulkState.sent = true;
      }, (err) => {
        failTransfer(err, false, false);
      });
      await permission;
      for (let offset = 0; offset < size; offset += txChunkSize) {
        check3();
        const length = Math.min(txChunkSize, size - offset);
        const bytes = buildControlPacket(chunkKind, transferId, chunkHeaderSize + length);
        viewOf(bytes).setFloat64(controlHeaderSize, offset);
        bytes.set(source2 instanceof Uint8Array ? source2.subarray(offset, offset + length) : new Uint8Array(await source2.slice(offset, offset + length).arrayBuffer()), chunkHeaderSize);
        await sendFrameToTransport(transport, bytes, check3, signal, transferId);
        transfers.forEach((t) => t.touch());
        progressCb?.((offset + length) / size, peerId, metadata);
      }
      check3();
      if (currentBulkState().phase === "streaming") bulkState = { phase: "done" };
    } catch (error) {
      failTransfer(error);
      const failedState = currentBulkState();
      if (failedState.phase === "failed" && failedState.didSendOffer && !failedState.fromReceiver && transport.isOpen && transport.bufferedAmount <= maxControlBufferedBytes) sendControlFrame(peerId, transport, transferId, cancelledKind);
      throw failedState.phase === "failed" ? failedState.error : error;
    } finally {
      const finalState = currentBulkState();
      if (finalState.phase === "offering") clearTimeout(finalState.timer);
      abortCleanup?.abort();
      transfers.delete(transferId);
      if (!transfers.size && outgoing.get(peerId) === transfers) outgoing.delete(peerId);
    }
  };
  const handleControlOrChunk = (peerId, bytes, kind, view) => {
    if (bytes.length < controlHeaderSize || (kind === acceptedKind || kind === cancelledKind) && bytes.length !== controlHeaderSize || kind === rejectedKind && bytes.length > 206) {
      failPeer(peerId, invalidActionMsg("control"));
      return;
    }
    const id = view.getUint32(2);
    if (kind === acceptedKind) {
      const transfers = outgoing.get(peerId);
      if (transfers?.get(id)?.accept()) transfers.forEach((t) => t.touch());
      return;
    }
    if (kind === rejectedKind) {
      outgoing.get(peerId)?.get(id)?.fail(makeActionError("rejected", decodeBytes(bytes.subarray(controlHeaderSize))), true);
      return;
    }
    if (kind === cancelledKind) {
      const transfer3 = peers.get(peerId)?.bulkTransfers.get(id);
      if (transfer3) {
        releaseTransfer(transfer3);
        transfer3.scope?.[3]("response cancelled by sender");
      }
      drain();
      return;
    }
    const offset = bytes.length >= chunkHeaderSize ? view.getFloat64(controlHeaderSize) : NaN;
    const chunkData = bytes.subarray(chunkHeaderSize);
    const transfer2 = peers.get(peerId)?.bulkTransfers.get(id);
    if (!transfer2) return;
    const totalSize = transfer2.message.size;
    const rxChunkSize = transfer2.chunkSize;
    if (!bulkPhaseClass[transfer2.state.phase].active || !Number.isSafeInteger(offset) || offset < 0 || offset >= totalSize || offset % rxChunkSize !== 0 || !chunkData.length || chunkData.length !== Math.min(rxChunkSize, totalSize - offset)) {
      failPeer(peerId, invalidActionMsg("chunk"));
      return;
    }
    const rxState = beginReceivingChunks(transfer2);
    if (!rxState) return;
    const chunkIdx = offset / rxChunkSize;
    const byteIdx = chunkIdx >>> 3;
    const bitMask = 1 << (chunkIdx & 7);
    if ((rxState.seenChunks[byteIdx] & bitMask) !== 0) {
      failPeer(peerId, invalidActionMsg("chunk"));
      return;
    }
    rxState.seenChunks[byteIdx] |= bitMask;
    rxState.data.set(chunkData, offset);
    rxState.offset += chunkData.length;
    const now2 = Date.now();
    transfer2.lastSeenAt = now2;
    for (const queued of waitingBulk) if (queued.state.phase === "queued" && rxActions.get(queued.message.type)?.receiver) queued.lastSeenAt = now2;
    if (rxState.offset === totalSize) {
      const registration = rxActions.get(transfer2.message.type);
      if (registration?.receiver) complete(transfer2, registration, rxState.data, false);
      else parkCompletedBulk(transfer2);
      drain();
    } else {
      const registration = rxActions.get(transfer2.message.type);
      if (registration) emitRxProgress(registration, rxState.offset / totalSize, peerId, transfer2.message.metadata);
    }
  };
  const makeWireAction = (type, options = {}) => {
    const sendToPending = Boolean(options.sendToPending);
    const receiveWhilePending = Boolean(options.receiveWhilePending);
    const { maxPayloadBytes, receiveScope } = options;
    const cached = actions.get(type);
    if (cached) {
      if (cached.sendToPending !== sendToPending || cached.receiveWhilePending !== receiveWhilePending || cached.maxPayloadBytes !== maxPayloadBytes || cached.receiveScope !== receiveScope) throw actionRedefinedErr(type);
      return cached.action;
    }
    const typeBytes = encodeBytes(type);
    if (!type || type.includes("\0") || typeBytes.length > 32) throw mkErr("action type must be 1\u201332 non-null UTF-8 bytes");
    const registration = {
      ...maxPayloadBytes === void 0 ? {} : { maxPayloadBytes },
      ...receiveScope ? { receiveScope } : {},
      receiver: null,
      receiveGate: null,
      onReject: null,
      onProgress: noOp2
    };
    rxActions.set(type, registration);
    const actionObj = {
      onMessage: (handler) => {
        registration.receiver = handler;
        flushPreListenerType(type, registration);
        drain();
      },
      onReceive: (handler) => {
        registration.receiveGate = handler;
        if (handler) flushPreListenerType(type, registration);
        drain();
      },
      onReject: (handler) => {
        registration.onReject = handler;
      },
      onProgress: (handler) => {
        registration.onProgress = handler;
      },
      send: async (data, targets, metadata, progressCb, signal) => {
        checkAborted(signal);
        if (data === void 0) throw mkErr("action data cannot be undefined");
        const [format, source2] = toPayloadSource(data);
        const size = source2 instanceof Uint8Array ? source2.byteLength : source2.size;
        const metaJson = metadata === void 0 ? "" : toJson(metadata);
        const metaByteLen = metadata === void 0 ? 0 : utf8ByteLength(metaJson);
        if (metaByteLen > 16384 - offerHeaderSize) throw mkErr("action metadata is too large");
        const isSmall = inlineHeaderSize + metaByteLen + size <= maxActionFrameBytes;
        const transferId = isSmall ? 0 : nextTransferId++ >>> 0;
        const headerSize = isSmall ? inlineHeaderSize : offerHeaderSize;
        const startFrame = new Uint8Array(headerSize + metaByteLen + (isSmall ? size : 0));
        startFrame[0] = 3;
        startFrame[1] = (isSmall ? inlineKind : offerKind) | format << 4;
        startFrame.set(typeBytes, 2);
        const view = viewOf(startFrame);
        view.setUint16(34, metaByteLen);
        if (!isSmall) {
          view.setUint32(36, transferId);
          view.setFloat64(40, size);
        }
        if (metaByteLen > 0) encodeBytesInto(metaJson, startFrame.subarray(headerSize, headerSize + metaByteLen));
        if (isSmall) startFrame.set(source2 instanceof Uint8Array ? source2 : new Uint8Array(await source2.arrayBuffer()), headerSize + metaByteLen);
        const isExplicitTarget = targets !== void 0 && targets !== null;
        if (!isExplicitTarget && isSmall && !sendToPending && broadcastInline) {
          const bcastResult = broadcastInline(startFrame, (peerId) => progressCb?.(1, peerId, metadata), signal);
          if (typeof bcastResult === "boolean" ? bcastResult : await bcastResult) return;
        }
        const rawIds = isExplicitTarget ? [targets].flat() : getPeerIds(sendToPending);
        const uniqueIds = [...new Set(rawIds)];
        if (isExplicitTarget && uniqueIds.length === 0) throw makeActionError("disconnected", "target peer list must not be empty");
        const resolvedTargets = [];
        for (const peerId of uniqueIds) {
          const transport = resolveTransport(peerId, sendToPending);
          if (!transport || !transport.isOpen) {
            if (isExplicitTarget) throw makeActionError("disconnected", noActivePeerMsg(peerId));
            continue;
          }
          resolvedTargets.push([peerId, transport]);
        }
        const pendingPromises = [];
        const pushPending = (p) => {
          p.catch(noOp2);
          pendingPromises.push(p);
        };
        for (const [peerId, transport] of resolvedTargets) if (isSmall) {
          checkAborted(signal);
          const prevQueue = outgoingInlineQueues.get(peerId);
          const drainRes = prevQueue ? void 0 : transport.waitForDrain(signal);
          if (drainRes === true) {
            try {
              transport.sendFrame(startFrame);
            } catch {
              throw disconnectedTransferErr();
            }
            progressCb?.(1, peerId, metadata);
            continue;
          }
          const task = (async () => {
            await prevQueue;
            await sendFrameToTransport(transport, startFrame, () => {
              checkAborted(signal);
              if (!transport.isOpen) throw disconnectedTransferErr();
            }, signal, void 0, void 0, drainRes);
            progressCb?.(1, peerId, metadata);
          })();
          const tail = task.catch(noOp2).finally(() => {
            if (outgoingInlineQueues.get(peerId) === tail) outgoingInlineQueues.delete(peerId);
          });
          outgoingInlineQueues.set(peerId, tail);
          pushPending(prevQueue && signal ? raceAbort(task, signal) : task);
        } else pushPending(sendBulkToPeer(peerId, transport, startFrame, transferId, source2, size, metadata, progressCb, signal));
        if (pendingPromises.length > 0) await all(pendingPromises);
      }
    };
    actions.set(type, {
      sendToPending,
      receiveWhilePending,
      maxPayloadBytes,
      receiveScope,
      action: actionObj
    });
    return actionObj;
  };
  const handleData = (peerId, data) => {
    if (data.byteLength < 2 || data.byteLength > 65536) {
      failPeer(peerId, invalidFrameMsg);
      return;
    }
    const bytes = new Uint8Array(data);
    if (bytes[0] !== 3) {
      failPeer(peerId, "incompatible action protocol version");
      return;
    }
    const kind = bytes[1] & 15;
    const format = bytes[1] >>> 4 & 3;
    const flags = bytes[1] >>> 6;
    const view = viewOf(bytes);
    if (kind > cancelledKind || format > binaryFormat || flags > (kind === offerKind ? 1 : 0) || kind > offerKind && format !== textFormat || kind !== chunkKind && bytes.length > 16384) {
      failPeer(peerId, invalidFrameMsg);
      return;
    }
    if (kind >= chunkKind) {
      handleControlOrChunk(peerId, bytes, kind, view);
      return;
    }
    const headerSize = kind === inlineKind ? inlineHeaderSize : offerHeaderSize;
    if (bytes.length < headerSize) {
      failPeer(peerId, invalidActionMsg("header"));
      return;
    }
    const type = decodeActionType(bytes);
    let registered = actions.get(type);
    if (!registered && onUnknownType) {
      onUnknownType(type);
      registered = actions.get(type);
    }
    if (!canReceiveFromPeer(peerId, Boolean(registered?.receiveWhilePending))) return;
    const metaLength = view.getUint16(34);
    const payloadIndex = headerSize + metaLength;
    const size = kind === inlineKind ? bytes.length - payloadIndex : view.getFloat64(40);
    const transferId = kind === offerKind ? view.getUint32(36) : 0;
    if (!type || payloadIndex > bytes.length || !Number.isSafeInteger(size) || size < 0 || kind === offerKind && (size === 0 || payloadIndex !== bytes.length)) {
      failPeer(peerId, invalidActionMsg("proposal"));
      return;
    }
    let metadata;
    try {
      if (metaLength) metadata = fromJson(decodeBytes(bytes.subarray(headerSize, payloadIndex)));
    } catch {
      failPeer(peerId, invalidActionMsg("metadata"));
      return;
    }
    const message = {
      peerId,
      type,
      format,
      size,
      metadata
    };
    if (kind === inlineKind) {
      const dataSlice = bytes.subarray(payloadIndex);
      const resolved2 = resolveAdmission(message);
      if (!resolved2) return;
      const [registration, scope] = resolved2;
      const queueKey = scope ? `${type}\0${scope[0]}` : type;
      const hasGate = Boolean(scope ? scope[2] : registration.receiveGate);
      if (registration.receiver && !hasGate && !peers.get(peerId)?.inlineQueues.has(queueKey)) {
        let payload;
        try {
          payload = decodePayload(dataSlice, format, true);
        } catch {
          failPeer(peerId, invalidPayloadMsg);
          return;
        }
        deliverPayload(registration, payload, peerId, metadata);
        return;
      }
      if (!registration.receiver && !hasGate && !peers.get(peerId)?.inlineQueues.has(queueKey)) {
        bufferPreListenerInline(message, dataSlice);
        return;
      }
      const transfer3 = {
        ...createTransferBase(message, scope),
        kind: "inline",
        queueKey,
        state: {
          phase: "pending",
          data: dataSlice.slice()
        }
      };
      if (enqueueTransfer(transfer3, true)) {
        drainInline(peerId, queueKey);
        ensureIdleTimer(transfer3);
      }
      return;
    }
    if (peers.get(peerId)?.bulkTransfers.has(transferId)) {
      failPeer(peerId, "duplicate action offer");
      return;
    }
    const resolved = resolveAdmission(message, transferId);
    if (!resolved) return;
    const transfer2 = {
      ...createTransferBase(message, resolved[1]),
      kind: "bulk",
      transferId,
      chunkSize: flags === 1 ? maxChunkSize : minChunkSize,
      state: { phase: "closed" }
    };
    if (enqueueTransfer(transfer2)) drain();
  };
  return {
    makeWireAction,
    handleData,
    clearPeer
  };
};

// node_modules/@trystero-p2p/core/dist/peer-transport.mjs
var backpressureWaitTimeoutMs = 1e4;
var waitForBufferedAmountLow = (channel, signal, timeoutMs = backpressureWaitTimeoutMs) => {
  if (signal?.aborted) return false;
  if (channel.readyState !== "open" || channel.bufferedAmount <= (channel.bufferedAmountLowThreshold ?? 0)) return channel.readyState === "open";
  return new Promise((res) => {
    let settled = false;
    let timeout = null;
    const abortCleanup = new AbortController();
    const onBufferLow = () => finish(true);
    const onCloseOrError = () => finish(false);
    const toggleChannel = (op) => {
      channel[op]("bufferedamountlow", onBufferLow);
      channel[op]("close", onCloseOrError);
      channel[op]("error", onCloseOrError);
    };
    const finish = (didDrain) => {
      if (settled) return;
      settled = true;
      toggleChannel("removeEventListener");
      abortCleanup.abort();
      timeout = resetTimer(timeout);
      res(didDrain);
    };
    timeout = setTimeout(() => finish(false), timeoutMs);
    unrefTimer(timeout);
    toggleChannel("addEventListener");
    signal?.addEventListener("abort", onCloseOrError, {
      once: true,
      signal: abortCleanup.signal
    });
    if (channel.readyState !== "open" || signal?.aborted) {
      finish(false);
      return;
    }
    if (channel.bufferedAmount <= (channel.bufferedAmountLowThreshold ?? 0)) finish(true);
  });
};
var destroyAfterFlush = (peer, graceMs = 40, capMs = 150, onDone) => {
  if (peer.isDead) {
    onDone?.();
    return noOp2;
  }
  peer.setHandlers({
    connect: noOp2,
    data: noOp2,
    stream: noOp2,
    close: noOp2,
    error: noOp2
  });
  const channel = peer.channel;
  if (!channel || channel.readyState !== "open") {
    peer.destroy();
    onDone?.();
    return noOp2;
  }
  const hasEventTarget = typeof channel.addEventListener === "function";
  let state;
  const finish = () => {
    switch (state.phase) {
      case "done":
        return;
      case "grace-hold":
        resetTimer(state.graceTimer);
        resetTimer(state.capTimer);
        break;
      case "draining":
        resetTimer(state.capTimer);
        break;
      default:
        unreachable(state);
    }
    state = { phase: "done" };
    if (hasEventTarget) {
      channel.removeEventListener("bufferedamountlow", maybeFinish);
      channel.removeEventListener("close", finish);
      channel.removeEventListener("error", finish);
    }
    peer.destroy();
    onDone?.();
  };
  const isBufferDrained = () => channel.readyState !== "open" || typeof channel.bufferedAmount !== "number" || channel.bufferedAmount <= 0;
  const maybeFinish = () => {
    if (state.phase === "draining" && isBufferDrained()) finish();
  };
  const capTimer = setTimeout(finish, Math.max(graceMs, capMs));
  unrefTimer(capTimer);
  if (graceMs > 0) {
    const graceTimer = setTimeout(() => {
      if (state.phase === "grace-hold") {
        state = {
          phase: "draining",
          capTimer: state.capTimer
        };
        maybeFinish();
      }
    }, graceMs);
    unrefTimer(graceTimer);
    state = {
      phase: "grace-hold",
      graceTimer,
      capTimer
    };
  } else state = {
    phase: "draining",
    capTimer
  };
  if (hasEventTarget) {
    try {
      channel.bufferedAmountLowThreshold = 0;
    } catch {
    }
    channel.addEventListener("bufferedamountlow", maybeFinish);
    channel.addEventListener("close", finish);
    channel.addEventListener("error", finish);
  }
  if (graceMs <= 0) maybeFinish();
  return finish;
};
var createDirectPeerTransport = (peer, isCurrent) => ({
  get isOpen() {
    const channelState = peer.channel?.readyState;
    return (!isCurrent || isCurrent()) && !peer.isDead && channelState !== "closing" && channelState !== "closed";
  },
  get bufferedAmount() {
    return typeof peer.channel?.bufferedAmount === "number" ? peer.channel.bufferedAmount : 0;
  },
  get maxBulkFrameBytes() {
    const sctpMax = peer.connection?.sctp?.maxMessageSize;
    return typeof sctpMax === "number" && Number.isFinite(sctpMax) && sctpMax >= 65536 ? maxBulkFrameBytes : maxActionFrameBytes;
  },
  sendFrame: (bytes) => {
    peer.sendData(bytes);
  },
  waitForDrain: (signal) => {
    if (signal?.aborted || isCurrent && !isCurrent() || peer.isDead) return false;
    if (!peer.channel) return true;
    return waitForBufferedAmountLow(peer.channel, signal);
  },
  close: () => peer.destroy()
});

// node_modules/@trystero-p2p/core/dist/signal-handler.mjs
var signalKeys = [
  "offer",
  "answer",
  "candidate"
];
var maxSignalMessageChars = 131072;
var maxSignalOfferIdChars = 64;
var maxSignalSdpChars = 65536;
var maxSignalCandidateChars = 4096;
var maxTrackedSignalPeers = 256;
var decryptErrDedupeTtlMs = 6e4;
var signalPeerIdPattern = /^[0-9A-Za-z]{20}$/;
var signalIdPattern = /^[\w.~:!-]{1,64}$/;
var buildSignalAad = (type, peerId, offerId) => `${type}|${peerId}|${offerId}`;
var isValidSignalId = (value2, maxLen) => typeof value2 === "string" && value2.length > 0 && value2.length <= maxLen && signalIdPattern.test(value2);
var isValidSignalPeerId = (value2) => typeof value2 === "string" && signalPeerIdPattern.test(value2);
var isValidSignalOfferId = (value2) => isValidSignalId(value2, maxSignalOfferIdChars);
var toPayload = (msg) => {
  if (typeof msg === "string") {
    if (msg.length > maxSignalMessageChars) return null;
    try {
      const parsed = fromJson(msg);
      return isObj(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isObj(msg) ? msg : null;
};
var getString = (payload, key) => typeof payload[key] === "string" && payload[key] ? payload[key] : void 0;
var isPeerHandle = (value2) => Boolean(value2 && typeof value2 === "object" && typeof value2.signal === "function" && typeof value2.destroy === "function" && typeof value2.setHandlers === "function");
var parseSignalEnvelope = (msg) => {
  const payload = toPayload(msg);
  if (!payload) return null;
  const isRawString = typeof msg === "string";
  const hasSignalContent = signalKeys.some((k) => k in payload);
  if ("peerId" in payload && !isValidSignalPeerId(payload["peerId"]) || (hasSignalContent || payload["offerId"] !== void 0) && !isValidSignalOfferId(payload["offerId"]) || signalKeys.some((k) => {
    if (!(k in payload)) return false;
    const val = payload[k];
    return typeof val !== "string" || val === "" || val.length > (k === "candidate" ? maxSignalCandidateChars : maxSignalSdpChars);
  }) || "peer" in payload && (isRawString || payload["peer"] !== void 0 && !isPeerHandle(payload["peer"]))) return null;
  return [
    getString(payload, "peerId") ?? "",
    getString(payload, "offer"),
    getString(payload, "answer"),
    getString(payload, "candidate"),
    getString(payload, "offerId"),
    isPeerHandle(payload["peer"]) ? payload["peer"] : void 0
  ];
};
var hasTurnServer = (config) => hasIceUrl([...config.turnConfig ?? [], ...config.rtcConfig?.iceServers ?? []], /^turns?:/i);
var isDeadConnState = (s) => s === "closed" || s === "failed";
var getConnectedPeerHealth = (peer) => {
  const { connection: pc, channel: ch } = peer;
  return peer.isDead || isDeadConnState(pc.connectionState) || isDeadConnState(pc.iceConnectionState) || ch?.readyState === "closing" || ch?.readyState === "closed" ? "stale" : !ch || ch.readyState !== "open" ? "transient" : "live";
};
var offerPostAnswerTtlMs = 23333;
var offerTtl = 57333;
var offerIdSize = 12;
var disconnectedPeerGraceMs = 7533;
var answeringTtlMs = 23333;
var isSlotAnnounceable = (slot2) => !slot2 || slot2.phase === "exhausted";
var hasCandidateSender = (slot2) => slot2?.phase === "retrying" || slot2?.phase === "exhausted";
var clearRelaySlots = (slots2) => {
  for (let i = 0; i < slots2.length; i++) {
    const slot2 = slots2[i];
    if (slot2?.phase === "retrying") resetTimer(slot2.retryTimer);
    slots2[i] = void 0;
  }
  slots2.length = 0;
};
var freezeRelayRetriesKeepSenders = (slots2) => {
  for (let i = 0; i < slots2.length; i++) {
    const slot2 = slots2[i];
    if (!slot2) continue;
    switch (slot2.phase) {
      case "reserved":
        slots2[i] = void 0;
        break;
      case "retrying":
        resetTimer(slot2.retryTimer);
        slots2[i] = {
          phase: "exhausted",
          sendCandidate: slot2.sendCandidate
        };
        break;
      case "exhausted":
        break;
      default:
        unreachable(slot2);
    }
  }
};
var clearOfferRelaySlot = (state, relayId) => {
  const current = state.relaySlots[relayId];
  if (!current) return;
  if (current.phase === "retrying") resetTimer(current.retryTimer);
  state.relaySlots[relayId] = void 0;
};
var clearOfferRelayIfReserved = (state, relayId) => {
  if (state?.relaySlots[relayId]?.phase === "reserved") state.relaySlots[relayId] = void 0;
};
var hasLiveOutboundOffer = (state, peer, offerId) => (state.outbound.phase === "advertising" || state.outbound.phase === "answered") && (!peer || state.outbound.peer === peer) && (offerId === void 0 || state.outbound.offerId === offerId);
var hasOutboundActivity = (state) => {
  switch (state.outbound.phase) {
    case "idle":
      return state.relaySlots.some(Boolean);
    case "allocating":
    case "advertising":
    case "answered":
      return true;
    default:
      return unreachable(state.outbound);
  }
};
var countPendingPeerConnections = (peerStates, excludePeerId) => {
  let count = 0;
  for (const [id, s] of peerStates) {
    if (id === excludePeerId || s.connection.phase === "connected") continue;
    if (s.outbound.phase === "allocating" || hasLiveOutboundOffer(s) && !s.outbound.peer.isDead) count++;
    if (s.inbound.phase === "answering" && !s.inbound.peer.isDead) count++;
  }
  return count;
};
var isPeerStateIdle = (s) => s.connection.phase === "disconnected" && s.inbound.phase === "idle" && !hasOutboundActivity(s);
var prunePeerStates = (peerStates) => {
  for (const [peerId, s] of peerStates) if (isPeerStateIdle(s)) peerStates.delete(peerId);
};
var counterAnnounceTimestamps = /* @__PURE__ */ new WeakMap();
var destroyAlive = (peer) => {
  if (peer && !peer.isDead) peer.destroy();
};
var resetAnsweringState = (state) => {
  counterAnnounceTimestamps.delete(state);
  if (state.inbound.phase === "answering") resetTimer(state.inbound.expiryTimer);
  state.inbound = { phase: "idle" };
};
var clearAnswering = (state, peer) => {
  if (state.inbound.phase === "answering" && state.inbound.peer === peer) {
    resetAnsweringState(state);
    if (state.connectedPeer !== peer) destroyAlive(peer);
  }
};
var markPeerConnected = (state, physical) => {
  if (state.inbound.phase === "answering" && state.inbound.peer !== physical) destroyAlive(state.inbound.peer);
  resetAnsweringState(state);
  state.connection = {
    phase: "connected",
    peer: physical,
    unhealthySince: null
  };
};
var detachConnectedPeer = (state, physical) => {
  if (state?.connection.phase === "connected" && state.connection.peer === physical) state.connection = { phase: "disconnected" };
};
var clearConnectedPeer = (state) => {
  if (state.connection.phase !== "connected") return;
  const { peer } = state.connection;
  state.connection = { phase: "disconnected" };
  destroyAlive(peer);
};
var resetOfferState = (state) => {
  counterAnnounceTimestamps.delete(state);
  clearRelaySlots(state.relaySlots);
  switch (state.outbound.phase) {
    case "idle":
    case "allocating":
      break;
    case "advertising":
    case "answered":
      resetTimer(state.outbound.expiryTimer);
      if (state.outbound.peer !== state.connectedPeer) destroyAlive(state.outbound.peer);
      break;
    default:
      unreachable(state.outbound);
  }
  state.outbound = { phase: "idle" };
  state.didReportFailure = false;
};
var createPeerState = () => ({
  outbound: { phase: "idle" },
  inbound: { phase: "idle" },
  connection: { phase: "disconnected" },
  relaySlots: [],
  didReportFailure: false,
  get offerPeer() {
    return hasLiveOutboundOffer(this) ? this.outbound.peer : null;
  },
  get answeringPeer() {
    return this.inbound.phase === "answering" ? this.inbound.peer : null;
  },
  get connectedPeer() {
    return this.connection.phase === "connected" ? this.connection.peer : null;
  }
});
var getState = (peerStates, peerId) => {
  const existing = peerStates.get(peerId);
  if (existing) return existing;
  if (peerStates.size >= maxTrackedSignalPeers) {
    let evictKey;
    let fallbackKey;
    for (const [k, s] of peerStates) {
      if (isPeerStateIdle(s)) {
        evictKey = k;
        break;
      }
      if (fallbackKey === void 0 && s.connection.phase === "disconnected") fallbackKey = k;
    }
    const targetKey = evictKey ?? fallbackKey;
    if (targetKey !== void 0) {
      const evicted = peerStates.get(targetKey);
      if (evicted) {
        destroyAlive(evicted.answeringPeer);
        resetOfferState(evicted);
        resetAnsweringState(evicted);
      }
      peerStates.delete(targetKey);
    }
  }
  const created = createPeerState();
  peerStates.set(peerId, created);
  return created;
};
var createSignalHandler = (ctx) => {
  const { appId, getRoomId, config, peerStates, getRootTopicPlaintext, rootTopicP, selfTopicP, toPlain, toCipher, isLeaving, onError, checkoutOffers, claimLeasedOffer, reclaimLeasedOffer, encryptOffer, initPeer: initPeerFn, connectPeer, disconnectPeer, announceIntervals, announceIntervalMs: announceIntervalMs2, getSelfIdNow, selfIdP, onPeerDiscovered, shouldConnectPeer } = ctx;
  const relaySignalPeers = [];
  const recentDecryptErrors = createBoundedCache(512);
  const dialBackoffs = createBoundedCache(512);
  const inFlightOfferDecrypts = /* @__PURE__ */ new Map();
  const getSelfId = () => selfIdP;
  const peerTopicOf = (peerId) => hashTopic(topicPath(getRootTopicPlaintext(), peerId));
  const atPendingCap = (peerId) => countPendingPeerConnections(peerStates, peerId) >= 64;
  const reportSdpFailure = (state, peerId) => {
    if (isLeaving() || state.connection.phase === "connected" || state.didReportFailure) return;
    state.didReportFailure = true;
    const turnConfigured = hasTurnServer(config);
    onError?.({
      code: "peer-connect-failed",
      peerId,
      turnConfigured,
      message: `could not connect to peer ${peerId} after exchanging SDP; ${turnConfigured ? "verify TURN server URLs and credentials" : "configure TURN via turnConfig or rtcConfig.iceServers"}`,
      appId,
      roomId: getRoomId()
    });
  };
  const reportDecryptErr = (peerId, stage, cause) => {
    const key = `${peerId}:${stage}`;
    const now2 = Date.now();
    const prev2 = recentDecryptErrors.get(key);
    if (prev2 !== void 0 && now2 - prev2 < decryptErrDedupeTtlMs) return;
    recentDecryptErrors.set(key, now2);
    onError?.({
      code: "decrypt-failed",
      peerId,
      stage,
      message: `failed to decrypt ${stage} (incorrect password or corrupted signal)`,
      appId,
      roomId: getRoomId(),
      cause
    });
  };
  const createAnsweringExpiryTimer = (peerId, peer) => {
    const timer = setTimeout(() => {
      const current = peerStates.get(peerId);
      if (!current || current.connection.phase === "connected" || current.inbound.phase !== "answering" || current.inbound.peer !== peer) return;
      if (current.inbound.didSendAnswer) reportSdpFailure(current, peerId);
      clearAnswering(current, peer);
      prunePeerStates(peerStates);
    }, answeringTtlMs);
    unrefTimer(timer);
    return timer;
  };
  const createOfferExpiryTimer = (peerId, offerId, ttlMs = offerTtl) => {
    const timer = setTimeout(() => {
      const current = peerStates.get(peerId);
      if (!current || current.connection.phase === "connected" || !hasLiveOutboundOffer(current, void 0, offerId)) return;
      if (current.outbound.phase === "answered") reportSdpFailure(current, peerId);
      resetOfferState(current);
      prunePeerStates(peerStates);
    }, ttlMs);
    unrefTimer(timer);
    return timer;
  };
  const bindOfferPeerHandlers = (state, peerId, peer, onSignal) => {
    const onClosedOrError = () => {
      if (state.offerPeer === peer && state.connection.phase !== "connected") {
        if (state.outbound.phase === "answered") reportSdpFailure(state, peerId);
        resetOfferState(state);
      }
      disconnectPeer(peer, peerId);
      prunePeerStates(peerStates);
    };
    peer.setHandlers({
      connect: () => {
        dialBackoffs.delete(peerId);
        connectPeer(peer, peerId);
      },
      ...onSignal ? { signal: onSignal } : {},
      close: onClosedOrError,
      error: onClosedOrError
    });
  };
  const ensureOffer = (state, peerId) => {
    switch (state.outbound.phase) {
      case "advertising":
        return Promise.resolve([
          state.outbound.peer,
          state.outbound.offerSdp,
          state.outbound.offerId
        ]);
      case "allocating":
        return state.outbound.promise;
      case "answered":
        return Promise.resolve(null);
      case "idle":
        break;
      default:
        return unreachable(state.outbound);
    }
    if (atPendingCap(peerId)) return Promise.resolve(null);
    const isAllocCanceled = () => isLeaving() || state.outbound.phase !== "allocating" || state.outbound.promise !== pending2;
    const allocateOffer = async () => {
      const localSelfId = getSelfIdNow() ?? await getSelfId();
      let firstOffer;
      try {
        firstOffer = (await checkoutOffers(1, false, (peer2, oid) => encryptOffer(peer2, localSelfId, oid), offerIdSize))[0];
      } catch (error) {
        if (isAllocCanceled()) return null;
        throw error;
      }
      if (!firstOffer) {
        if (isAllocCanceled()) return null;
        throw mkErr("failed to allocate offer peer");
      }
      const { peer, offer: offer3 } = firstOffer;
      const offerId = firstOffer.offerId || genId(offerIdSize);
      if (isAllocCanceled()) {
        peer.destroy();
        return null;
      }
      const bufferedCandidates = [];
      const expiryTimer = createOfferExpiryTimer(peerId, offerId);
      state.didReportFailure = false;
      state.outbound = {
        phase: "advertising",
        peer,
        offerId,
        offerSdp: offer3,
        expiryTimer,
        bufferedCandidates
      };
      bindOfferPeerHandlers(state, peerId, peer, (signal) => {
        if (state.connection.phase !== "connected" && hasLiveOutboundOffer(state, peer, offerId)) {
          state.outbound.bufferedCandidates.push(signal);
          for (const slot2 of state.relaySlots) if (hasCandidateSender(slot2)) slot2.sendCandidate(signal);
        }
      });
      return [
        peer,
        offer3,
        offerId
      ];
    };
    const pending2 = allocateOffer().finally(() => {
      if (state.outbound.phase === "allocating" && state.outbound.promise === pending2) state.outbound = { phase: "idle" };
    });
    state.outbound = {
      phase: "allocating",
      promise: pending2
    };
    return pending2;
  };
  const transitionOutboundToAnswered = (state, peerId, peer, offerId) => {
    let bufferedCandidates = [];
    if (hasLiveOutboundOffer(state)) {
      resetTimer(state.outbound.expiryTimer);
      if (state.outbound.peer === peer && state.outbound.offerId === offerId) {
        bufferedCandidates = state.outbound.bufferedCandidates;
        freezeRelayRetriesKeepSenders(state.relaySlots);
      } else {
        clearRelaySlots(state.relaySlots);
        if (state.connectedPeer !== state.outbound.peer) destroyAlive(state.outbound.peer);
      }
    } else clearRelaySlots(state.relaySlots);
    state.outbound = {
      phase: "answered",
      peer,
      offerId,
      expiryTimer: createOfferExpiryTimer(peerId, offerId, offerPostAnswerTtlMs),
      bufferedCandidates
    };
  };
  const handleAnnouncement = async (relayId, peerId, signalPeer, retryAttempt = 0) => {
    const state = peerStates.get(peerId);
    if (!state || state.connection.phase === "connected" || state.inbound.phase !== "idle" || state.outbound.phase === "answered") {
      clearOfferRelayIfReserved(state, relayId);
      return;
    }
    if (state.relaySlots[relayId]?.phase !== "reserved") return;
    let peerTopic;
    let offerInfo;
    let localSelfId;
    try {
      [peerTopic, offerInfo, localSelfId] = await all([
        peerTopicOf(peerId),
        ensureOffer(state, peerId),
        getSelfId()
      ]);
    } catch (err) {
      clearOfferRelayIfReserved(state, relayId);
      prunePeerStates(peerStates);
      throw err;
    }
    if (!offerInfo) {
      clearOfferRelayIfReserved(state, relayId);
      return;
    }
    if (isLeaving()) {
      resetOfferState(state);
      return;
    }
    const isStateConnected = (s) => s.connection.phase === "connected";
    if (isStateConnected(state) || state.inbound.phase !== "idle" || state.outbound.phase !== "advertising" || state.relaySlots[relayId]?.phase !== "reserved") {
      clearOfferRelayIfReserved(state, relayId);
      return;
    }
    const [offerPeer, offerSdp, offerId] = offerInfo;
    const sendCandidate = (signal) => {
      if (isLeaving() || state.connection.phase === "connected" || !hasLiveOutboundOffer(state, offerPeer, offerId) || signal.type !== "candidate") return;
      toCipher(signal, localSelfId, offerId).then((enc2) => {
        if (!isLeaving() && state.connection.phase !== "connected" && hasLiveOutboundOffer(state, offerPeer, offerId)) signalPeer(peerTopic, toJson({
          peerId: localSelfId,
          offerId,
          candidate: enc2.sdp
        }));
      }).catch(noOp2);
    };
    const retryTimer = setTimeout(() => {
      if (retryAttempt >= 2 || isLeaving() || state.connection.phase === "connected" || state.inbound.phase !== "idle" || state.outbound.phase !== "advertising" || state.outbound.peer !== offerPeer || state.outbound.offerId !== offerId) {
        const cur = peerStates.get(peerId);
        if (cur && cur.connection.phase !== "connected") {
          if (retryAttempt >= 2 && hasLiveOutboundOffer(cur, offerPeer, offerId)) cur.relaySlots[relayId] = {
            phase: "exhausted",
            sendCandidate
          };
          else clearOfferRelaySlot(cur, relayId);
          prunePeerStates(peerStates);
        }
        return;
      }
      state.relaySlots[relayId] = { phase: "reserved" };
      handleAnnouncement(relayId, peerId, signalPeer, retryAttempt + 1).catch((err) => {
        if (!isLeaving()) logErr("signal", err);
      });
    }, retryAttempt === 0 && announceIntervals[relayId] === void 0 ? 2e3 : (announceIntervals[relayId] ?? announceIntervalMs2) * 0.9);
    unrefTimer(retryTimer);
    signalPeer(peerTopic, toJson({
      peerId: localSelfId,
      offerId,
      offer: offerSdp
    }));
    state.relaySlots[relayId] = {
      phase: "retrying",
      retryTimer,
      sendCandidate
    };
    state.outbound.bufferedCandidates.forEach(sendCandidate);
  };
  const replayExistingAnswerIfMatch = async (state, relayId, peerId, offer3, offerId, signalPeer) => {
    if (state.inbound.phase !== "answering" || state.inbound.peer.isDead || state.inbound.replay.offer !== offer3 || state.inbound.replay.offerId !== offerId) return;
    const { replay } = state.inbound;
    const lastSentAt = replay.lastSentAt[relayId];
    if (lastSentAt !== void 0 && Date.now() - lastSentAt < 1e3) return;
    replay.lastSentAt[relayId] = Date.now();
    const peerTopic = await peerTopicOf(peerId);
    if (!isLeaving() && state.connection.phase !== "connected" && state.inbound.phase === "answering" && state.inbound.replay === replay) {
      const send = (message) => {
        signalPeer(peerTopic, message);
      };
      replay.relays[relayId] = send;
      replay.messages.forEach(send);
    }
  };
  const decryptOfferDeduped = (peerId, offer3, offerId) => {
    const key = `${peerId}|${offerId}|${offer3}`;
    const existing = inFlightOfferDecrypts.get(key);
    if (existing) return existing;
    const task = toPlain({
      type: "offer",
      sdp: offer3
    }, peerId, offerId).catch((err) => {
      reportDecryptErr(peerId, "offer", err);
      return null;
    }).finally(() => {
      inFlightOfferDecrypts.delete(key);
    });
    inFlightOfferDecrypts.set(key, task);
    return task;
  };
  const handleOffer = async (relayId, peerId, offer3, offerId, signalPeer) => {
    if (!offerId) return;
    const localSelfId = getSelfIdNow() ?? await getSelfId();
    if (shouldConnectPeer && !shouldConnectPeer(peerId, "inbound")) return;
    const existingState = peerStates.get(peerId);
    if (existingState && (existingState.inbound.phase === "answering" || existingState.outbound.phase === "answered")) return replayExistingAnswerIfMatch(existingState, relayId, peerId, offer3, offerId, signalPeer);
    if (existingState && hasOutboundActivity(existingState) && localSelfId < peerId) return;
    if (atPendingCap(peerId)) return;
    const plainOffer = await decryptOfferDeduped(peerId, offer3, offerId);
    if (!plainOffer || isLeaving()) return;
    const state = getState(peerStates, peerId);
    if (state.connection.phase === "connected") return;
    if (state.inbound.phase === "answering" || state.outbound.phase === "answered") return replayExistingAnswerIfMatch(state, relayId, peerId, offer3, offerId, signalPeer);
    if (hasOutboundActivity(state)) {
      if (localSelfId < peerId) return;
      resetOfferState(state);
    }
    if (atPendingCap(peerId)) {
      prunePeerStates(peerStates);
      return;
    }
    const answerPeer = initPeerFn(false, config);
    const replay = {
      offer: offer3,
      offerId,
      messages: [],
      lastSentAt: [],
      relays: []
    };
    replay.lastSentAt[relayId] = Date.now();
    const expiryTimer = createAnsweringExpiryTimer(peerId, answerPeer);
    let preAnswerCandidates = [];
    state.didReportFailure = false;
    state.inbound = {
      phase: "answering",
      peer: answerPeer,
      offerId,
      expiryTimer,
      didSendAnswer: false,
      replay
    };
    const isActiveAnswering = (s) => !isLeaving() && s.inbound.phase === "answering" && s.inbound.peer === answerPeer && !answerPeer.isDead;
    const onClosedOrError = () => {
      if (state.inbound.phase === "answering" && state.inbound.peer === answerPeer && state.connection.phase !== "connected" && state.inbound.didSendAnswer) reportSdpFailure(state, peerId);
      clearAnswering(state, answerPeer);
      disconnectPeer(answerPeer, peerId);
      prunePeerStates(peerStates);
    };
    answerPeer.setHandlers({
      connect: () => {
        dialBackoffs.delete(peerId);
        connectPeer(answerPeer, peerId);
      },
      close: onClosedOrError,
      error: onClosedOrError
    });
    if (answerPeer.isDead) {
      clearAnswering(state, answerPeer);
      prunePeerStates(peerStates);
      return;
    }
    const peerTopic = await peerTopicOf(peerId);
    if (!isActiveAnswering(state) || state.inbound.replay !== replay) return;
    replay.relays[relayId] = (message) => {
      signalPeer(peerTopic, message);
    };
    let publishQueue = Promise.resolve();
    const enqueueEncryptedPublish = (signal) => {
      publishQueue = publishQueue.then(async () => {
        const enc2 = await toCipher(signal, localSelfId, offerId);
        if (!isActiveAnswering(state)) return;
        const isAnswer = signal.type === "answer";
        const message = toJson({
          peerId: localSelfId,
          offerId,
          ...isAnswer ? { answer: enc2.sdp } : { candidate: enc2.sdp }
        });
        const now2 = Date.now();
        replay.messages.push(message);
        replay.relays.forEach((send, id) => {
          if (send) {
            replay.lastSentAt[id] = now2;
            send(message);
          }
        });
        if (isAnswer && preAnswerCandidates) {
          state.inbound.didSendAnswer = true;
          const queued = preAnswerCandidates;
          preAnswerCandidates = null;
          queued.forEach(enqueueEncryptedPublish);
        }
      }).catch(noOp2);
    };
    answerPeer.setHandlers({ signal: (signal) => {
      if (!isActiveAnswering(state) || signal.type !== "answer" && signal.type !== "candidate") return;
      if (signal.type === "candidate" && preAnswerCandidates) preAnswerCandidates.push(signal);
      else enqueueEncryptedPublish(signal);
    } });
    await answerPeer.signal(plainOffer);
  };
  const handleCandidate = async (peerId, candidate, offerId, peer) => {
    if (!offerId) return;
    const state = peerStates.get(peerId);
    if (!peer && !state?.offerPeer && !state?.answeringPeer) return;
    let plainCandidate;
    try {
      plainCandidate = await toPlain({
        type: candidateType,
        sdp: candidate
      }, peerId, offerId);
    } catch {
      return;
    }
    const currentState = peerStates.get(peerId);
    const targetPeer = peer && !peer.isDead ? peer : currentState && hasLiveOutboundOffer(currentState, void 0, offerId) ? currentState.outbound.peer : currentState?.inbound.phase === "answering" && currentState.inbound.offerId === offerId ? currentState.inbound.peer : null;
    if (targetPeer && !targetPeer.isDead) targetPeer.signal(plainCandidate);
  };
  const handleAnswer = async (peerId, answer, offerId, peer) => {
    if (!offerId) return;
    if (shouldConnectPeer && !shouldConnectPeer(peerId, peer ? "outbound" : "inbound")) {
      if (peer) {
        reclaimLeasedOffer(peer);
        destroyAlive(peer);
      } else {
        const currentState = peerStates.get(peerId);
        if (currentState && hasLiveOutboundOffer(currentState, void 0, offerId)) resetOfferState(currentState);
      }
      return;
    }
    const localSelfId = getSelfIdNow() ?? await getSelfId();
    let plainAnswer;
    try {
      plainAnswer = await toPlain({
        type: "answer",
        sdp: answer
      }, peerId, offerId);
    } catch (err) {
      if (peer) {
        reclaimLeasedOffer(peer);
        destroyAlive(peer);
      }
      reportDecryptErr(peerId, "answer", err);
      return;
    }
    if (peer) {
      if (!claimLeasedOffer(peer) || peer.isDead) {
        destroyAlive(peer);
        return;
      }
      const state2 = getState(peerStates, peerId);
      if (state2.connection.phase === "connected" || state2.outbound.phase === "answered" || state2.inbound.phase === "answering" && !state2.inbound.peer.isDead && localSelfId > peerId) {
        peer.destroy();
        return;
      }
      if (state2.inbound.phase === "answering") clearAnswering(state2, state2.inbound.peer);
      resetOfferState(state2);
      transitionOutboundToAnswered(state2, peerId, peer, offerId);
      bindOfferPeerHandlers(state2, peerId, peer);
      peer.signal(plainAnswer);
      return;
    }
    const state = peerStates.get(peerId);
    if (!state || state.outbound.phase !== "advertising" || state.outbound.offerId !== offerId || state.outbound.peer.isDead) return;
    const offerPeer = state.outbound.peer;
    transitionOutboundToAnswered(state, peerId, offerPeer, offerId);
    offerPeer.signal(plainAnswer);
  };
  const sendDirectPing = (peerId, localSelfId, state, signalPeer) => peerTopicOf(peerId).then((peerSelfTopic) => {
    if (!isLeaving() && state.connection.phase !== "connected" && state.inbound.phase === "idle" && state.outbound.phase !== "answered") signalPeer(peerSelfTopic, toJson({ peerId: localSelfId }));
  });
  return {
    handleMessage: (relayId) => async (topic, msg, signalPeer) => {
      try {
        if (isLeaving()) return;
        relaySignalPeers[relayId] = signalPeer;
        const parsed = parseSignalEnvelope(msg);
        if (!parsed) return;
        const [peerId, offer3, answer, candidate, offerId, peer] = parsed;
        const knownSelfId = getSelfIdNow();
        if (!peerId || knownSelfId && peerId === knownSelfId) return;
        const [rootTopic, selfTopic, localSelfId] = await all([
          rootTopicP,
          selfTopicP,
          getSelfId()
        ]);
        if (peerId === localSelfId || isLeaving() || topic !== rootTopic && topic !== selfTopic) return;
        onPeerDiscovered?.(peerId, relayId, signalPeer);
        const state = peerStates.get(peerId);
        if (state?.connection.phase === "connected") {
          const health = getConnectedPeerHealth(state.connection.peer);
          if (health === "live") {
            state.connection.unhealthySince = null;
            return;
          }
          if (health === "stale") clearConnectedPeer(state);
          else {
            const nowMs = Date.now();
            if (nowMs - (state.connection.unhealthySince ??= nowMs) < disconnectedPeerGraceMs) return;
            clearConnectedPeer(state);
          }
        }
        if (!offer3 && !answer && !candidate) {
          if (shouldConnectPeer && !shouldConnectPeer(peerId, "outbound") || !peerStates.has(peerId) && atPendingCap(peerId)) return;
          const announceState = getState(peerStates, peerId);
          if (announceState.inbound.phase !== "idle" || announceState.connection.phase === "connected" || announceState.outbound.phase === "answered") return;
          if (localSelfId >= peerId && !announceState.offerPeer) {
            let lastSentByRelay = counterAnnounceTimestamps.get(announceState);
            if (!lastSentByRelay) {
              lastSentByRelay = [];
              counterAnnounceTimestamps.set(announceState, lastSentByRelay);
            }
            const lastSentAt = lastSentByRelay[relayId];
            if (lastSentAt !== void 0 && Date.now() - lastSentAt < 1e3) return;
            lastSentByRelay[relayId] = Date.now();
            await sendDirectPing(peerId, localSelfId, announceState, signalPeer);
            return;
          }
          if (isSlotAnnounceable(announceState.relaySlots[relayId])) {
            announceState.relaySlots[relayId] = { phase: "reserved" };
            await handleAnnouncement(relayId, peerId, signalPeer);
          }
          return;
        }
        if (offer3) {
          await handleOffer(relayId, peerId, offer3, offerId, signalPeer);
          return;
        }
        if (candidate) {
          await handleCandidate(peerId, candidate, offerId, peer);
          return;
        }
        if (answer) await handleAnswer(peerId, answer, offerId, peer);
      } catch (err) {
        if (!isLeaving()) logErr("signal", err);
      }
    },
    dialPeer: (peerId) => {
      if (!isValidSignalPeerId(peerId)) return;
      getSelfId().then((localSelfId) => {
        if (isLeaving() || !peerId || peerId === localSelfId || shouldConnectPeer && !shouldConnectPeer(peerId, "outbound") || !peerStates.has(peerId) && atPendingCap(peerId)) return;
        const state = getState(peerStates, peerId);
        if (state.connection.phase === "connected" || state.inbound.phase !== "idle" || state.outbound.phase !== "idle" || !relaySignalPeers.some(Boolean)) return;
        const now2 = Date.now();
        const backoff = dialBackoffs.get(peerId);
        if (backoff && now2 < backoff[1]) return;
        const attempts = (backoff?.[0] ?? 0) + 1;
        dialBackoffs.set(peerId, [attempts, now2 + Math.min(6e4, 2e3 * 2 ** (attempts - 1))]);
        relaySignalPeers.forEach((signalPeer, relayId) => {
          if (!signalPeer) return;
          if (localSelfId < peerId) {
            if (state.outbound.phase !== "answered" && isSlotAnnounceable(state.relaySlots[relayId])) {
              state.relaySlots[relayId] = { phase: "reserved" };
              handleAnnouncement(relayId, peerId, signalPeer).catch((err) => {
                if (!isLeaving()) logErr("signal", err);
              });
            }
          } else sendDirectPing(peerId, localSelfId, state, signalPeer).catch(noOp2);
        });
      }).catch((err) => {
        if (!isLeaving()) logErr("signal", err);
      });
    }
  };
};

// node_modules/@trystero-p2p/core/dist/offer-manager.mjs
var offerLeaseTtlMs = 18e4;
var defaultOfferIdSize = 20;
var offerRoomLeftErr = /* @__PURE__ */ mkErr("room left while preparing offer");
var createOfferManager = (makeOffer) => {
  const leaseStates = /* @__PURE__ */ new WeakMap();
  const activeLeases = /* @__PURE__ */ new Set();
  let destroyed = false;
  const closeLease = (peer) => {
    const entry = leaseStates.get(peer);
    if (entry?.phase === "leased") resetTimer(entry.timer);
    activeLeases.delete(peer);
    leaseStates.set(peer, { phase: "closed" });
    peer.destroy();
  };
  const claimLeased = (peer) => {
    if (destroyed || peer.isDead) return false;
    const entry = leaseStates.get(peer);
    if (!entry) return true;
    switch (entry.phase) {
      case "leased":
        resetTimer(entry.timer);
        activeLeases.delete(peer);
        leaseStates.set(peer, { phase: "claimed" });
        return true;
      case "claimed":
        return true;
      case "closed":
        return false;
      default:
        return unreachable(entry);
    }
  };
  const reclaimLeased = (peer) => {
    if (leaseStates.get(peer)?.phase === "leased") closeLease(peer);
  };
  const checkout = (n, leaseOffers, encryptOffer, offerIdSize2 = defaultOfferIdSize) => {
    const toRecord = async (didRetry = false) => {
      if (destroyed) throw offerRoomLeftErr;
      const peer = makeOffer();
      const offerId = genId(offerIdSize2);
      try {
        const offer3 = await encryptOffer(peer, offerId);
        if (destroyed) throw offerRoomLeftErr;
        if (leaseOffers) {
          const timer = setTimeout(() => {
            if (leaseStates.get(peer)?.phase === "leased") closeLease(peer);
          }, offerLeaseTtlMs);
          unrefTimer(timer);
          leaseStates.set(peer, {
            phase: "leased",
            timer
          });
          activeLeases.add(peer);
          return {
            peer,
            offer: offer3,
            offerId,
            claim: () => {
              claimLeased(peer);
            },
            reclaim: () => reclaimLeased(peer)
          };
        }
        return {
          peer,
          offer: offer3,
          offerId
        };
      } catch (error) {
        peer.destroy();
        if (!didRetry && !destroyed) return toRecord(true);
        throw error;
      }
    };
    return all(alloc(n, () => toRecord()));
  };
  return {
    checkout,
    getOffers: (n, encryptOffer) => checkout(n, true, encryptOffer),
    claimLeased,
    reclaimLeased,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      for (const peer of Array.from(activeLeases)) closeLease(peer);
    }
  };
};

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
var peer_default = (initiator, config) => {
  const { trickleIce, rtcConfig, rtcPolyfill, turnConfig } = config;
  const iceServers = [...rtcConfig?.iceServers ?? defaultIceServers, ...turnConfig ?? []];
  const pc = new (rtcPolyfill ?? RTCPeerConnection)({
    ...rtcConfig,
    iceServers
  });
  let connectHandler;
  let closeHandler;
  let errorHandler;
  const pendingIceGathering = /* @__PURE__ */ new Set();
  const shouldTrickleIce = trickleIce !== false;
  const pendingRemoteCandidates = [];
  let activeCandidateFlush = null;
  const streamSenders = /* @__PURE__ */ new WeakMap();
  const trackSender = (stream, sender) => {
    let senders = streamSenders.get(stream);
    if (!senders) {
      senders = /* @__PURE__ */ new Set();
      streamSenders.set(stream, senders);
    }
    senders.add(sender);
  };
  let lifecycle = { phase: "open" };
  let negotiation = { phase: "idle" };
  let offerGeneration = 0;
  let dataState = { phase: "unbound-idle" };
  let signalHandler;
  const pendingSignals = [];
  let streamHandler;
  const pendingStreams = [];
  let dataChannel = null;
  let settledOffer;
  let resolveInitialOffer = null;
  const initialOfferP = initiator ? new Promise((resolve3) => {
    resolveInitialOffer = resolve3;
  }) : void 0;
  const settleInitialOffer = (signal) => {
    if (resolveInitialOffer) {
      const resolve3 = resolveInitialOffer;
      resolveInitialOffer = null;
      settledOffer = signal;
      resolve3(signal);
    }
  };
  const clearDisconnectedGrace = () => {
    if (lifecycle.phase === "disconnected-grace") {
      resetTimer(lifecycle.timer);
      lifecycle = { phase: "open" };
    }
  };
  const emitClose = () => {
    if (lifecycle.phase === "closed") return;
    if (lifecycle.phase === "disconnected-grace") resetTimer(lifecycle.timer);
    lifecycle = { phase: "closed" };
    offerGeneration += 1;
    negotiation = { phase: "idle" };
    settleInitialOffer();
    if (dataState.phase === "unbound-buffering") {
      resetTimer(dataState.deadlineTimer);
      dataState.queue.length = 0;
    }
    dataState = { phase: "closed" };
    signalHandler = void 0;
    pendingSignals.length = 0;
    streamHandler = void 0;
    pendingStreams.length = 0;
    pendingRemoteCandidates.length = 0;
    pendingIceGathering.forEach((finish) => finish());
    closeHandler?.();
  };
  const isClosed = () => {
    if (lifecycle.phase !== "closed" && pc.connectionState === "closed") emitClose();
    return lifecycle.phase === "closed";
  };
  const emitSignal = (signal) => {
    if (isClosed()) return;
    if (signal.type === offerType) {
      const wasInitialOfferPending = resolveInitialOffer !== null;
      settleInitialOffer(signal);
      if (wasInitialOfferPending && !signalHandler && !pc.remoteDescription) return;
    }
    if (signalHandler) signalHandler(signal);
    else pendingSignals.push(signal);
  };
  const appendSignalHandler = (handler) => {
    if (isClosed()) return;
    if (signalHandler) {
      const prev2 = signalHandler;
      signalHandler = (sig) => {
        prev2(sig);
        handler(sig);
      };
      return;
    }
    signalHandler = handler;
    for (const queued of pendingSignals.splice(0)) {
      if (isClosed() || !signalHandler) break;
      signalHandler(queued);
    }
  };
  const localDescriptionSignal = (peerConnection) => ({
    type: peerConnection.localDescription?.type ?? offerType,
    sdp: peerConnection.localDescription?.sdp ?? ""
  });
  const getRemoteUfrag = () => pc.remoteDescription?.sdp?.match(/a=ice-ufrag:(\S+)/)?.[1] ?? null;
  const canApplyRemoteCandidate = (candidate) => {
    if (!pc.remoteDescription) return false;
    const remoteMLineCount = (pc.remoteDescription.sdp?.match(/^m=/gm) ?? []).length;
    if (typeof candidate.sdpMLineIndex === "number" && remoteMLineCount > 0 && candidate.sdpMLineIndex >= remoteMLineCount) return false;
    const remoteUfrag = getRemoteUfrag();
    return !(remoteUfrag && candidate.usernameFragment && candidate.usernameFragment !== remoteUfrag);
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
    if (isClosed()) return;
    if (pendingRemoteCandidates.length >= maxPendingRemoteCandidates) pendingRemoteCandidates.shift();
    pendingRemoteCandidates.push(candidate);
  };
  const flushPendingRemoteCandidates = async () => {
    if (isClosed() || !pc.remoteDescription) return;
    if (activeCandidateFlush) {
      await activeCandidateFlush;
      if (isClosed() || !pc.remoteDescription) return;
    }
    if (!pendingRemoteCandidates.length) return;
    const runFlush = (async () => {
      const stillPending = [];
      try {
        while (!isClosed() && pc.remoteDescription && pendingRemoteCandidates.length > 0) {
          const remoteUfrag = getRemoteUfrag();
          for (const candidate of pendingRemoteCandidates.splice(0)) {
            if (isClosed()) return;
            if (remoteUfrag && candidate.usernameFragment && candidate.usernameFragment !== remoteUfrag) continue;
            if (!canApplyRemoteCandidate(candidate) || !await addIceCandidateSafe(candidate)) stillPending.push(candidate);
          }
        }
      } finally {
        if (!isClosed() && stillPending.length > 0) {
          const tail = pendingRemoteCandidates.splice(0);
          for (const item2 of [...stillPending, ...tail]) queueRemoteCandidate(item2);
        }
        activeCandidateFlush = null;
      }
    })();
    activeCandidateFlush = runFlush;
    await runFlush;
  };
  const addRemoteCandidate = async (candidate) => {
    if (activeCandidateFlush || !canApplyRemoteCandidate(candidate)) {
      queueRemoteCandidate(candidate);
      return;
    }
    if (!await addIceCandidateSafe(candidate)) queueRemoteCandidate(candidate);
  };
  const setupDataChannel = (channel) => {
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = 65535;
    const failData = () => {
      warn("excessive pre-handler data; disconnecting peer");
      channel.close();
      pc.close();
      emitClose();
    };
    channel.onmessage = (e) => {
      if (dataChannel !== channel || dataState.phase === "closed") return;
      const data = e.data;
      const maxFrameBytes = dataState.phase === "bound" ? maxBulkFrameBytes : maxRoomFrameBytes;
      if (!(data instanceof ArrayBuffer) && !ArrayBuffer.isView(data) || data.byteLength > maxFrameBytes) {
        failData();
        return;
      }
      switch (dataState.phase) {
        case "bound":
          dataState.handler(data);
          break;
        case "unbound-idle": {
          const deadlineTimer = setTimeout(failData, pendingDataTimeoutMs);
          unrefTimer(deadlineTimer);
          dataState = {
            phase: "unbound-buffering",
            queue: [data],
            deadlineTimer
          };
          break;
        }
        case "unbound-buffering":
          if (dataState.queue.length >= 64) {
            failData();
            return;
          }
          dataState.queue.push(data);
          break;
        default:
          unreachable(dataState);
      }
    };
    channel.onopen = () => {
      if (dataChannel === channel && !isClosed()) connectHandler?.();
    };
    channel.onclose = () => {
      if (dataChannel === channel) emitClose();
    };
    channel.onerror = ({ error }) => {
      if (dataChannel !== channel || isClosed() || error?.errorDetail === "sctp-failure" && (error.sctpCauseCode === 12 || /^User-Initiated Abort\b/.test(error.message))) return;
      errorHandler?.(toError(error, "data channel error"));
    };
  };
  const expectsTurnCandidate = hasIceUrl(iceServers, /^turns?:/i);
  const expectsStunCandidate = !expectsTurnCandidate && hasIceUrl(iceServers, /^stuns?:/i);
  const targetCandidatePattern = expectsTurnCandidate ? /\btyp relay\b/ : expectsStunCandidate ? /\btyp (?:srflx|relay|prflx)\b/ : /\btyp (?:host|srflx|relay|prflx)\b/;
  const waitForIceGathering = async (peerConnection) => {
    await new Promise((resolve3) => {
      let done2 = false;
      let settleTimeout = null;
      const finish = () => {
        if (done2) return;
        done2 = true;
        resetTimer(timeout);
        resetTimer(settleTimeout);
        peerConnection.removeEventListener(iceStateEvent, checkState);
        peerConnection.removeEventListener(iceCandidateEvent, onCandidate);
        pendingIceGathering.delete(finish);
        resolve3();
      };
      const scheduleSettle = (candidateLine = "") => {
        if (done2) return;
        const sdp = `${peerConnection.localDescription?.sdp ?? ""}
${candidateLine}`;
        if (targetCandidatePattern.test(sdp)) {
          resetTimer(settleTimeout);
          settleTimeout = setTimeout(finish, iceCandidateSettleMs);
          unrefTimer(settleTimeout);
        }
      };
      const checkState = () => {
        if (peerConnection.iceGatheringState === "complete" || isClosed()) finish();
        else scheduleSettle();
      };
      const onCandidate = (event) => {
        const { candidate } = event;
        if (candidate) scheduleSettle(candidate.candidate);
        else finish();
      };
      const timeout = setTimeout(finish, iceTimeout);
      unrefTimer(timeout);
      pendingIceGathering.add(finish);
      peerConnection.addEventListener(iceStateEvent, checkState);
      peerConnection.addEventListener(iceCandidateEvent, onCandidate);
      checkState();
    });
    return localDescriptionSignal(peerConnection);
  };
  const readLocalDescription = () => shouldTrickleIce ? localDescriptionSignal(pc) : waitForIceGathering(pc);
  const emitLocalDescriptionSignal = async (expectedGen) => {
    const signal = await readLocalDescription();
    if (isClosed() || expectedGen !== void 0 && offerGeneration !== expectedGen) return;
    emitSignal(signal);
    return signal;
  };
  if (initiator) {
    dataChannel = pc.createDataChannel("data");
    setupDataChannel(dataChannel);
  } else pc.ondatachannel = ({ channel }) => {
    if (dataChannel && dataChannel !== channel) {
      dataChannel.onopen = dataChannel.onclose = dataChannel.onmessage = dataChannel.onerror = null;
      dataChannel.close();
    }
    dataChannel = channel;
    setupDataChannel(channel);
  };
  const createOffer = async () => {
    if (isClosed() || negotiation.phase !== "idle" || pc.signalingState !== "stable") {
      if (isClosed()) settleInitialOffer();
      return;
    }
    const gen = ++offerGeneration;
    negotiation = {
      phase: "making-offer",
      gen
    };
    try {
      await pc.setLocalDescription();
      if (isClosed() || offerGeneration !== gen) return;
      return await emitLocalDescriptionSignal(gen);
    } catch (err) {
      if (offerGeneration !== gen) return;
      settleInitialOffer();
      errorHandler?.(toError(err, "failed to create local offer"));
    } finally {
      if (negotiation.phase === "making-offer" && negotiation.gen === gen) negotiation = { phase: "idle" };
    }
  };
  pc.onnegotiationneeded = () => {
    createOffer();
  };
  pc.onicecandidate = ({ candidate }) => {
    if (!shouldTrickleIce || !candidate || isClosed()) return;
    const candidatePayload = typeof candidate.toJSON === "function" ? candidate.toJSON() : {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment
    };
    emitSignal({
      type: candidateType,
      sdp: JSON.stringify(candidatePayload)
    });
  };
  const isDisconnectedState = () => pc.connectionState === "disconnected" || pc.iceConnectionState === "disconnected";
  const handleConnectionStateChange = () => {
    if (lifecycle.phase === "closed") return;
    const cs = pc.connectionState;
    const is = pc.iceConnectionState;
    if (cs === "failed" || cs === "closed" || is === "failed" || is === "closed") {
      emitClose();
      return;
    }
    if (cs === "connected" || cs === "connecting" || is === "connected" || is === "completed" || is === "checking") {
      clearDisconnectedGrace();
      return;
    }
    if (isDisconnectedState() && lifecycle.phase === "open") {
      const timer = setTimeout(() => {
        if (lifecycle.phase !== "disconnected-grace") return;
        lifecycle = { phase: "open" };
        if (isDisconnectedState()) emitClose();
      }, disconnectedCloseDelayMs);
      unrefTimer(timer);
      lifecycle = {
        phase: "disconnected-grace",
        timer
      };
    }
  };
  pc.onconnectionstatechange = handleConnectionStateChange;
  pc.addEventListener(iceConnectionStateEvent, handleConnectionStateChange);
  pc.ontrack = (e) => {
    const stream = e.streams[0];
    if (stream && !isClosed()) {
      if (streamHandler) streamHandler(stream);
      else pendingStreams.push(stream);
    }
  };
  if (initiator) queueMicrotask(() => {
    if (!isClosed() && negotiation.phase === "idle" && pc.signalingState === "stable" && !pc.localDescription) pc.onnegotiationneeded?.(new Event("negotiationneeded"));
  });
  return {
    connection: pc,
    get channel() {
      return dataChannel;
    },
    get isDead() {
      return isClosed();
    },
    getOffer: async () => {
      if (!initiator) return;
      if (resolveInitialOffer !== null) return initialOfferP;
      if (settledOffer && !pc.remoteDescription) return settledOffer;
      return pc.localDescription?.type === offerType ? readLocalDescription() : settledOffer;
    },
    async signal(sdp) {
      if (isClosed()) return;
      if (sdp.type === "candidate") {
        if (sdp.sdp.length > maxRemoteCandidateSdpLength) return;
        try {
          const candidate = JSON.parse(sdp.sdp);
          if (candidate && typeof candidate === "object") await addRemoteCandidate(candidate);
        } catch (err) {
          errorHandler?.(toError(err, "failed to parse remote candidate"));
        }
        return;
      }
      if (dataChannel?.readyState === "open" && !sdp.sdp?.includes("a=rtpmap")) return;
      try {
        const rtcSdp = { ...sdp };
        if (sdp.type === offerType) {
          const isCollision = negotiation.phase === "making-offer" || pc.signalingState !== "stable" && negotiation.phase !== "applying-remote-answer";
          if (isCollision && initiator) return;
          offerGeneration += 1;
          if (negotiation.phase === "making-offer") negotiation = { phase: "idle" };
          if (isCollision && pc.signalingState !== "stable") await all([pc.setLocalDescription({ type: "rollback" }), pc.setRemoteDescription(rtcSdp)]);
          else await pc.setRemoteDescription(rtcSdp);
          await flushPendingRemoteCandidates();
          await pc.setLocalDescription();
          return await emitLocalDescriptionSignal();
        }
        if (sdp.type === answerType) {
          negotiation = { phase: "applying-remote-answer" };
          try {
            await pc.setRemoteDescription(rtcSdp);
            await flushPendingRemoteCandidates();
          } finally {
            if (negotiation.phase === "applying-remote-answer") negotiation = { phase: "idle" };
          }
        }
      } catch (err) {
        if (!isClosed()) errorHandler?.(toError(err, "failed to apply remote signal"));
      }
    },
    sendData: (data) => {
      if (isClosed() || !dataChannel || dataChannel.readyState === "closing" || dataChannel.readyState === "closed") throw mkErr(peerDisconnectedMsg);
      dataChannel.send(data);
    },
    destroy: () => {
      clearDisconnectedGrace();
      settleInitialOffer();
      dataChannel?.close();
      if (pc.connectionState !== "closed") pc.close();
      emitClose();
    },
    setHandlers: (newHandlers) => {
      if ("connect" in newHandlers) connectHandler = newHandlers.connect;
      if ("close" in newHandlers) closeHandler = newHandlers.close;
      if ("error" in newHandlers) errorHandler = newHandlers.error;
      if ("data" in newHandlers && dataState.phase !== "closed") {
        const nextDataHandler = newHandlers.data;
        if (nextDataHandler) {
          let queuedData = [];
          if (dataState.phase === "unbound-buffering") {
            resetTimer(dataState.deadlineTimer);
            queuedData = dataState.queue.splice(0);
          }
          dataState = {
            phase: "bound",
            handler: nextDataHandler
          };
          for (const frame2 of queuedData) {
            if (dataState.phase !== "bound") break;
            dataState.handler(frame2);
          }
        } else {
          if (dataState.phase === "unbound-buffering") resetTimer(dataState.deadlineTimer);
          dataState = { phase: "unbound-idle" };
        }
      }
      if (newHandlers.signal) appendSignalHandler(newHandlers.signal);
      if ("stream" in newHandlers && !isClosed()) {
        streamHandler = newHandlers.stream;
        if (streamHandler) for (const stream of pendingStreams.splice(0)) {
          if (isClosed() || !streamHandler) break;
          streamHandler(stream);
        }
      }
    },
    addStream: (stream) => {
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        if (sender) trackSender(stream, sender);
      });
    },
    removeStream: (stream) => {
      const senders = streamSenders.get(stream);
      if (senders) {
        streamSenders.delete(stream);
        senders.forEach((sender) => pc.removeTrack(sender));
        return;
      }
      const tracks = stream.getTracks();
      pc.getSenders().forEach((sender) => {
        if (sender.track && tracks.includes(sender.track)) pc.removeTrack(sender);
      });
    },
    addTrack: (track, stream) => {
      const sender = pc.addTrack(track, stream);
      if (sender && stream) trackSender(stream, sender);
    },
    removeTrack: (track, stream) => {
      const sender = pc.getSenders().find((s) => s.track === track);
      if (sender) {
        if (stream) streamSenders.get(stream)?.delete(sender);
        pc.removeTrack(sender);
      }
    },
    replaceTrack: (oldTrack, newTrack) => {
      const sender = pc.getSenders().find((s) => s.track === oldTrack);
      if (sender) return sender.replaceTrack(newTrack);
    }
  };
};
var defaultIceServers = [...alloc(3, (_, i) => `stun:stun${i || ""}.l.google.com:19302`), "stun:stun.cloudflare.com:3478"].map((url) => ({ urls: url }));

// node_modules/@trystero-p2p/core/dist/actions.mjs
var maxConcurrentRequestsPerPeer = 64;
var requestFailedMsg = "request failed";
var getEnvelopeRecord = (metadata) => isObj(metadata) && typeof metadata["r"] === "string" ? metadata : null;
var getRequestMetadata = (metadata) => {
  const record = getEnvelopeRecord(metadata);
  return record ? [record.r, Object.hasOwn(record, "m") ? record.m : void 0] : null;
};
var getResponseMetadata = (metadata) => {
  const record = getEnvelopeRecord(metadata);
  return record ? [record.r, typeof record.e === "string" ? record.e : void 0] : null;
};
var withMetadata = (context, metadata) => metadata === void 0 ? context : {
  ...context,
  metadata
};
var wrapAuthMetadata = (cert, userMetadata) => cert ? {
  [authMetaKey]: cert,
  ...userMetadata === void 0 ? {} : { m: userMetadata }
} : userMetadata;
var extractAuthMetadata = (wireMeta) => {
  if (isObj(wireMeta) && authMetaKey in wireMeta) {
    const rawCert = wireMeta[authMetaKey];
    return [validateRoleCertificateShape(rawCert) ? rawCert : void 0, Object.hasOwn(wireMeta, "m") ? wireMeta["m"] : void 0];
  }
  return [void 0, wireMeta];
};
var normalizeRequiredRoles = (roles2) => {
  if (roles2 === void 0) return [];
  const list2 = [roles2].flat().filter(Boolean);
  if (list2.length === 0) throw mkErr("action roles must contain at least one non-empty role name");
  return [...new Set(list2)].sort();
};
var sameSortedRoles = (a, b) => a.length === b.length && a.every((role, idx) => role === b[idx]);
var createActionManager = (deps) => {
  const resolveTransport = deps.getTransport;
  const userIdOf2 = (peerId) => deps.getPeerUserId ? deps.getPeerUserId(peerId) : peerId;
  const rolesOf = (peerId) => deps.getPeerRoles ? [...deps.getPeerRoles(peerId)] : [];
  const hasActivePeer = (peerId) => Boolean(resolveTransport(peerId, false)?.isOpen);
  const publicActions = /* @__PURE__ */ Object.create(null);
  const internalActions = /* @__PURE__ */ new Map();
  const requestWaiters = /* @__PURE__ */ new Map();
  const activeRequestControllers = /* @__PURE__ */ new Map();
  const { makeWireAction, handleData, clearPeer: clearWirePeer } = createActionWireManager({
    resolveTransport,
    getPeerIds: deps.getPeerIds,
    canReceiveFromPeer: deps.canReceiveFromPeer,
    onPeerError: deps.onPeerError,
    ...deps.broadcastInline ? { broadcastInline: deps.broadcastInline } : {},
    ...deps.onUnknownType ? { onUnknownType: deps.onUnknownType } : {},
    ...deps.maxReceiveBytes === void 0 ? {} : { maxReceiveBytes: deps.maxReceiveBytes }
  });
  const toProgressBridge = (handler, metadata) => handler ? (progress, peerId) => {
    const res = handler(progress, withMetadata({
      peerId,
      userId: userIdOf2(peerId)
    }, metadata));
    if (res && typeof res.then === "function") Promise.resolve(res).catch((err) => logErr("progress handler", err));
  } : void 0;
  const makeInternalAction = (type, options = {}) => {
    const wireType = type.startsWith("@_") ? type : `${"@_"}${type}`;
    const sendToPending = Boolean(options.sendToPending);
    const wireAction = makeWireAction(wireType, options);
    const existing = internalActions.get(wireType);
    if (existing) return existing;
    const [subProgress, emitProgress, , hasProgressListeners] = createEventEmitter("progress handler");
    const [subMessage, emitMessage] = createEventEmitter("internal action handler", (active) => {
      wireAction.onMessage(active ? (payload, peerId, metadata) => {
        emitMessage(payload, withMetadata({
          peerId,
          userId: userIdOf2(peerId)
        }, metadata));
      } : null);
    });
    const [setReceiveGate, getReceiveGate] = initSingleHandler("onReceive", (handler) => {
      wireAction.onReceive(handler ? (ctx) => handler(withMetadata({
        peerId: ctx.peerId,
        userId: userIdOf2(ctx.peerId),
        byteLength: ctx.byteLength,
        signal: ctx.signal
      }, ctx.metadata)) : null);
    });
    wireAction.onProgress((progress, peerId, metadata) => {
      if (hasProgressListeners()) emitProgress(progress, withMetadata({
        peerId,
        userId: userIdOf2(peerId)
      }, metadata));
    });
    const action2 = lockMethods({
      send: (data, sendOpts = {}) => wireAction.send(data, deps.resolveSendTarget ? deps.resolveSendTarget(sendOpts.target, sendToPending) : sendOpts.target, sendOpts.metadata, toProgressBridge(sendOpts.onProgress, sendOpts.metadata), sendOpts.signal),
      onMessage: (handler, listenerOpts) => subMessage(handler, listenerOpts),
      onReceiveProgress: (handler, listenerOpts) => subProgress(handler, listenerOpts),
      onReceive: (handler, listenerOpts) => setReceiveGate(handler ?? getReceiveGate(), listenerOpts)
    }, [
      "onMessage",
      "onReceive",
      "onReceiveProgress"
    ]);
    internalActions.set(wireType, action2);
    return action2;
  };
  const closeWaiter = (waiter) => {
    const prev2 = waiter.state;
    switch (prev2.phase) {
      case "done":
        return false;
      case "preparing":
        waiter.state = { phase: "done" };
        requestWaiters.delete(waiter.requestId);
        prev2.controller.abort();
        return true;
      case "active":
        waiter.state = { phase: "done" };
        resetTimer(prev2.timer);
        requestWaiters.delete(waiter.requestId);
        prev2.controller.abort();
        return true;
      default:
        return unreachable(prev2);
    }
  };
  const isWaiterSettled = (waiter) => waiter.state.phase === "done";
  const activateWaiter = (waiter, timeoutMs) => {
    if (waiter.state.phase !== "preparing") return false;
    let timer = null;
    if (timeoutMs !== void 0) {
      timer = setTimeout(() => {
        if (waiter.state.phase === "active") waiter.reject(makeActionError("timeout", "request timed out"));
      }, timeoutMs);
      unrefTimer(timer);
    }
    waiter.state = {
      phase: "active",
      controller: waiter.state.controller,
      timer
    };
    return true;
  };
  const clearPeer = (id, error) => {
    clearWirePeer(id);
    const controllers = activeRequestControllers.get(id);
    if (controllers) {
      activeRequestControllers.delete(id);
      controllers.forEach((controller) => controller.abort());
    }
    const disconnectedErr = makeActionError("disconnected", toErrorMessage(error, peerDisconnectedMsg));
    for (const waiter of Array.from(requestWaiters.values())) {
      if (waiter.peerId !== id) continue;
      switch (waiter.state.phase) {
        case "preparing":
        case "active":
          waiter.reject(disconnectedErr);
          break;
        case "done":
          break;
        default:
          unreachable(waiter.state);
      }
    }
  };
  const matchResponseWaiter = (peerId, metadata) => {
    const parsed = getResponseMetadata(metadata);
    const waiter = parsed ? requestWaiters.get(parsed[0]) : void 0;
    return parsed && waiter && waiter.state.phase === "active" && waiter.peerId === peerId ? [parsed, waiter] : null;
  };
  const responseAction = makeWireAction(`${"@_"}response`, { receiveScope: (peerId, metadata) => {
    const matched = matchResponseWaiter(peerId, metadata);
    if (!matched) return null;
    const [parsed, waiter] = matched;
    if (waiter.state.phase !== "active") return null;
    const receive = parsed[1] === void 0 ? waiter.getReceive() : null;
    return [
      parsed[0],
      waiter.state.controller.signal,
      receive ? (context) => receive({
        byteLength: context.byteLength,
        peerId: context.peerId,
        userId: userIdOf2(context.peerId),
        kind: "response",
        signal: context.signal,
        roles: rolesOf(context.peerId)
      }) : null,
      (reason) => {
        waiter.reject(makeActionError("rejected", reason));
      }
    ];
  } });
  responseAction.onProgress((progress, id, metadata) => {
    const matched = matchResponseWaiter(id, metadata);
    if (matched && matched[0][1] === void 0) matched[1].emitReceiveProgress(progress, {
      peerId: id,
      userId: userIdOf2(id)
    });
  });
  responseAction.onMessage((payload, id, metadata) => {
    const matched = matchResponseWaiter(id, metadata);
    if (!matched) return;
    const [parsed, waiter] = matched;
    if (parsed[1] !== void 0) waiter.reject(makeActionError("rejected", parsed[1]));
    else waiter.resolve(payload);
  });
  const makeActionCore = (type, config, internal) => {
    if (!internal && type.startsWith("@_")) throw mkErr(`action namespace "${type}" is reserved for internal protocol use`);
    if (config && ("onMessage" in config || "onRequest" in config || "onReceive" in config || "onReceiveProgress" in config)) throw mkErr("makeAction config does not accept event handlers; subscribe via action.on*(fn)");
    const kind = config?.kind ?? "message";
    const requiredRoles = normalizeRequiredRoles(config?.roles);
    const hasRoleGuard = requiredRoles.length > 0;
    const existing = publicActions[type];
    if (existing) {
      if (existing.kind !== kind || existing.internal !== internal || !sameSortedRoles(existing.requiredRoles, requiredRoles)) throw actionRedefinedErr(type);
      return existing.action;
    }
    if (hasRoleGuard) deps.registerActionAuthority?.(type, requiredRoles);
    const rawAction = makeWireAction(type);
    const [subProgress, emitProgress, clearProgress, hasProgressListeners] = createEventEmitter("progress handler");
    const extractWireMeta = (metadata) => extractAuthMetadata(kind === "request" ? getRequestMetadata(metadata)?.[1] : metadata);
    const resolveReqPeer = (target) => (deps.resolveRequestTarget ? deps.resolveRequestTarget(target, false) : target) ?? target;
    const buildPeerContext = (peerId, userMeta) => withMetadata({
      peerId,
      userId: userIdOf2(peerId),
      roles: rolesOf(peerId)
    }, userMeta);
    const buildGateContext = (context, userMeta) => ({
      ...buildPeerContext(context.peerId, userMeta),
      byteLength: context.byteLength,
      signal: context.signal,
      kind
    });
    const syncReceiveGate = () => {
      if (!Boolean(getReceiveGate()) && !hasRoleGuard) {
        rawAction.onReceive(null);
        return;
      }
      rawAction.onReceive((context) => {
        const [inlineCert, userMeta] = extractWireMeta(context.metadata);
        if (!hasRoleGuard) {
          const gate = getReceiveGate();
          return gate ? gate(buildGateContext(context, userMeta)) : true;
        }
        if (!deps.authorizePeerAction) return false;
        const authRes = deps.authorizePeerAction(context.peerId, requiredRoles, inlineCert);
        const afterAuth = (allowed) => {
          if (!allowed) return false;
          const gate = getReceiveGate();
          return gate ? gate(buildGateContext(context, userMeta)) : true;
        };
        return typeof authRes === "boolean" ? afterAuth(authRes) : authRes.then(afterAuth, () => false);
      });
    };
    const [setReceiveGate, getReceiveGate, clearReceiveGate] = initSingleHandler("onReceive", () => syncReceiveGate());
    syncReceiveGate();
    rawAction.onProgress((progress, peerId, metadata) => {
      if (hasProgressListeners()) {
        const [, userMeta] = extractWireMeta(metadata);
        emitProgress(progress, withMetadata({
          peerId,
          userId: userIdOf2(peerId)
        }, userMeta));
      }
    });
    const prepareSendMeta = async (userMeta) => {
      if (!hasRoleGuard) return userMeta;
      if (!deps.getLocalActionCert) throw mkErr(`${insufficientAuthPrefix} for action "${type}": requires [${requiredRoles.join(", ")}]`);
      const cert = await deps.getLocalActionCert(requiredRoles, type);
      return wrapAuthMetadata(cert, userMeta);
    };
    if (kind === "message") {
      const receiveMessage = (payload, peerId, metadata) => {
        if (hasRoleGuard && (!deps.authorizePeerAction || deps.authorizePeerAction(peerId, requiredRoles) !== true)) return;
        const [, userMeta] = extractAuthMetadata(metadata);
        emitMessage(payload, buildPeerContext(peerId, userMeta));
      };
      const [subMessage, emitMessage, clearMessage] = createEventEmitter("action handler", (active) => rawAction.onMessage(active ? receiveMessage : null));
      const action2 = lockMethods({
        send: async (data, options = {}) => {
          throwIfAborted(options.signal);
          const wireMetadata = hasRoleGuard ? await prepareSendMeta(options.metadata) : options.metadata;
          await rawAction.send(data, deps.resolveSendTarget ? deps.resolveSendTarget(options.target, false) : options.target, wireMetadata, toProgressBridge(options.onProgress, options.metadata), options.signal);
        },
        onMessage: (handler, options) => subMessage(handler, options),
        onReceive: (handler, options) => setReceiveGate(handler, options),
        onReceiveProgress: (handler, options) => subProgress(handler, options)
      }, [
        "onMessage",
        "onReceive",
        "onReceiveProgress"
      ]);
      publicActions[type] = {
        kind,
        requiredRoles,
        action: action2,
        internal,
        clear: () => {
          clearMessage();
          clearReceiveGate();
          clearProgress();
        }
      };
      return action2;
    }
    rawAction.onReject((peerId, metadata, reason) => {
      const parsed = getRequestMetadata(metadata);
      if (parsed) responseAction.send(null, peerId, {
        r: parsed[0],
        e: reason
      }).catch(noOp2);
    });
    const receiveRequest = (payload, peerId, metadata) => {
      const parsed = getRequestMetadata(metadata);
      if (!parsed) return;
      const requestId = parsed[0];
      let peerControllers = activeRequestControllers.get(peerId);
      if ((peerControllers?.size ?? 0) >= maxConcurrentRequestsPerPeer) {
        responseAction.send(null, peerId, {
          r: requestId,
          e: "too many concurrent requests"
        }).catch(noOp2);
        return;
      }
      const controller = new AbortController();
      if (!peerControllers) {
        peerControllers = /* @__PURE__ */ new Set();
        activeRequestControllers.set(peerId, peerControllers);
      }
      peerControllers.add(controller);
      const runHandler = async () => {
        if (hasRoleGuard && (!deps.authorizePeerAction || await deps.authorizePeerAction(peerId, requiredRoles) !== true)) throw mkErr(`${insufficientAuthPrefix} for request`);
        const handler = getRequestGate();
        if (!handler) throw mkErr("no active request handler");
        const [, userMeta] = extractAuthMetadata(parsed[1]);
        const response = await handler(payload, {
          ...buildPeerContext(peerId, userMeta),
          signal: controller.signal
        });
        if (response === void 0) throw mkErr("request handler returned undefined");
        return response;
      };
      runHandler().then((response) => controller.signal.aborted ? void 0 : responseAction.send(response, peerId, { r: requestId }, void 0, controller.signal), (error) => controller.signal.aborted ? void 0 : responseAction.send(null, peerId, {
        r: requestId,
        e: toErrorMessage(error, requestFailedMsg).slice(0, 512)
      }, void 0, controller.signal)).catch(noOp2).finally(() => {
        const set2 = activeRequestControllers.get(peerId);
        set2?.delete(controller);
        if (set2 && !set2.size) activeRequestControllers.delete(peerId);
        controller.abort();
      });
    };
    const [setRequestGate, getRequestGate, clearRequestGate] = initSingleHandler("onRequest", (handler) => rawAction.onMessage(handler ? receiveRequest : null));
    const requestToResolvedPeer = async (data, resolvedTarget, displayTarget, options) => {
      const { metadata, onProgress, signal, timeoutMs } = options;
      throwIfAborted(signal);
      if (!hasActivePeer(resolvedTarget)) throw makeActionError("disconnected", noActivePeerMsg(displayTarget));
      const requestId = crypto.randomUUID();
      const controller = new AbortController();
      const { promise: responsePromise, resolve: resolve3, reject } = Promise.withResolvers();
      responsePromise.catch(noOp2);
      const waiter = {
        requestId,
        peerId: resolvedTarget,
        state: {
          phase: "preparing",
          controller
        },
        getReceive: getReceiveGate,
        emitReceiveProgress: emitProgress,
        resolve: (payload) => {
          if (closeWaiter(waiter)) resolve3(payload);
        },
        reject: (err) => {
          if (closeWaiter(waiter)) reject(err);
        }
      };
      requestWaiters.set(requestId, waiter);
      if (signal) {
        const rejectAsAborted = () => {
          waiter.reject(makeActionError("aborted", operationAbortedMsg));
        };
        if (signal.aborted) rejectAsAborted();
        else signal.addEventListener("abort", rejectAsAborted, {
          once: true,
          signal: controller.signal
        });
      }
      if (isWaiterSettled(waiter)) return await responsePromise;
      let innerMeta = metadata;
      if (hasRoleGuard) {
        try {
          innerMeta = await prepareSendMeta(metadata);
        } catch (err) {
          waiter.reject(toError(err, requestFailedMsg));
          return await responsePromise;
        }
        if (isWaiterSettled(waiter)) return await responsePromise;
        if (!hasActivePeer(resolvedTarget)) {
          waiter.reject(makeActionError("disconnected", noActivePeerMsg(displayTarget)));
          return await responsePromise;
        }
      }
      if (!activateWaiter(waiter, timeoutMs)) return await responsePromise;
      try {
        const sendSignal = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal;
        rawAction.send(data, resolvedTarget, innerMeta === void 0 ? { r: requestId } : {
          r: requestId,
          m: innerMeta
        }, toProgressBridge(onProgress, metadata), sendSignal).catch((err) => {
          waiter.reject(toError(err, requestFailedMsg));
        });
        return await responsePromise;
      } finally {
        waiter.reject(makeActionError("aborted", operationAbortedMsg));
      }
    };
    const requestOne = (data, options) => {
      const { target, ...rest } = options;
      return requestToResolvedPeer(data, resolveReqPeer(target), target, rest);
    };
    const lockedAction = lockMethods({
      request: requestOne,
      requestMany: async (data, options) => {
        const { targets, onResult, ...requestOptions } = options;
        throwIfAborted(requestOptions.signal);
        return all(targets.map(async (target) => {
          const resolvedTarget = resolveReqPeer(target);
          const base = {
            peerId: resolvedTarget,
            userId: userIdOf2(resolvedTarget) || target
          };
          let result;
          try {
            result = {
              ...base,
              status: "fulfilled",
              value: await requestToResolvedPeer(data, resolvedTarget, target, requestOptions)
            };
          } catch (err) {
            const error = toError(err, requestFailedMsg);
            if (error.kind === "aborted" || !error.kind) throw error;
            result = error.kind === "timeout" || error.kind === "disconnected" ? {
              ...base,
              status: error.kind
            } : {
              ...base,
              status: "rejected",
              error
            };
          }
          onResult?.(result);
          return result;
        }));
      },
      onRequest: (handler, options) => setRequestGate(handler, options),
      onReceive: (handler, options) => setReceiveGate(handler, options),
      onReceiveProgress: (handler, options) => subProgress(handler, options)
    }, [
      "onRequest",
      "onReceive",
      "onReceiveProgress"
    ]);
    publicActions[type] = {
      kind,
      requiredRoles,
      action: lockedAction,
      internal,
      clear: () => {
        clearRequestGate();
        clearReceiveGate();
        clearProgress();
      }
    };
    return lockedAction;
  };
  return {
    makeAction: ((type, config) => makeActionCore(type, config, false)),
    makeInternalAction,
    makeInternalRequestAction: (type) => {
      const wireType = type.startsWith("@_") ? type : `${"@_"}${type}`;
      return makeActionCore(wireType, { kind: "request" }, true);
    },
    handleData,
    clearPeer,
    clearListeners: () => {
      values(publicActions).forEach((entry) => {
        if (!entry.internal) entry.clear();
      });
    }
  };
};

// node_modules/@trystero-p2p/core/dist/handshake.mjs
var peerIdentityErr = /* @__PURE__ */ mkErr("peer identity verification failed");
var handshakeDisconnectErr = /* @__PURE__ */ mkErr("peer disconnected during handshake");
var defaultHandshakeTimeoutMs = 1e4;
var maxBufferedHandshakeMessages = 16;
var hsStepKey = `__${libId}_id`;
var hsDomain = /* @__PURE__ */ domainTag("id-hs", 2);
var extractDtlsFingerprints = (sdp) => {
  if (!sdp || typeof sdp !== "string") return [];
  const matches = sdp.matchAll(/^a=fingerprint:([^\r\n]+)$/gm);
  const set2 = /* @__PURE__ */ new Set();
  for (const m of matches) {
    const val = m[1]?.trim().toLowerCase();
    if (val) set2.add(val);
  }
  return [...set2].sort();
};
var parseAndVerifyPeerIdentityClaims = async (raw, expectedStep, remotePeerId, expectedRemoteDtls, localDtls = []) => {
  if (!raw || typeof raw !== "object") throw peerIdentityErr;
  const msg = raw;
  if (msg[hsStepKey] !== expectedStep || typeof msg.n !== "string" || msg.n.length < 16 || !Array.isArray(msg.dtls) || !isStr(msg.uid) || typeof msg.pk !== "string" || typeof msg.uk !== "string" || expectedStep === 2 && (typeof msg.ps !== "string" || typeof msg.us !== "string")) throw peerIdentityErr;
  const dtls = msg.dtls.filter((x) => typeof x === "string");
  if (expectedRemoteDtls.length > 0 && expectedRemoteDtls.join(",") !== dtls.join(",") || localDtls.length > 0 && dtls.length === 0) throw mkErr("DTLS fingerprint mismatch");
  const peerPubJwk = compactPubToJwk(msg.pk);
  const userPubJwk = compactPubToJwk(msg.uk);
  if (!peerPubJwk || !userPubJwk) throw peerIdentityErr;
  const [peerOk, userOk] = await all([verifyPeerIdKey(remotePeerId, peerPubJwk), verifyUserIdKey(msg.uid, userPubJwk)]);
  if (!peerOk || !userOk) throw peerIdentityErr;
  return [
    msg.n,
    dtls,
    msg.uid,
    peerPubJwk,
    userPubJwk,
    typeof msg.ps === "string" ? msg.ps : void 0,
    typeof msg.us === "string" ? msg.us : void 0
  ];
};
var verifyTranscriptDualSignatures = async (transcriptBytes, peerSigB64, userSigB64, peerPubJwk, userPubJwk) => {
  const [peerOk, userOk] = await all([verifyWithP256(fromBase64Url(peerSigB64), transcriptBytes, peerPubJwk), verifyWithP256(fromBase64Url(userSigB64), transcriptBytes, userPubJwk)]);
  if (!peerOk || !userOk) throw peerIdentityErr;
};
var createIdentityHandshake = (deps) => {
  const { endpointIdentityP, appId, roomId, getUserIdentity, onVerified } = deps;
  const signTranscript = async (transcriptBytes, localUser) => {
    const localEndpoint = await endpointIdentityP;
    const [psBytes, usBytes] = await all([localEndpoint.sign(transcriptBytes), localUser.sign(transcriptBytes)]);
    return {
      ps: toBase64Url(psBytes),
      us: toBase64Url(new Uint8Array(usBytes))
    };
  };
  const encodeTranscript = (resolvedRoomId, initPeerId, respPeerId, initNonce, respNonce, initDtls, respDtls, initUid, respUid) => encodeBytes(toJson([
    hsDomain,
    appId,
    resolvedRoomId,
    initPeerId,
    respPeerId,
    initNonce,
    respNonce,
    initDtls,
    respDtls,
    initUid,
    respUid
  ]));
  const run2 = async (remotePeerId, send, receive, isInitiator, peerHandle) => {
    const [resolvedRoomId, localUser, localEndpoint] = await all([
      roomId,
      getUserIdentity(),
      endpointIdentityP
    ]);
    const effectiveSelfId = localEndpoint.peerId;
    const peer = peerHandle ?? deps.getPeerHandle?.(remotePeerId);
    const localDtls = extractDtlsFingerprints(peer?.connection?.localDescription?.sdp);
    const remoteDtls = extractDtlsFingerprints(peer?.connection?.remoteDescription?.sdp);
    if (peer?.connection && (!localDtls.length || !remoteDtls.length)) throw mkErr("DTLS fingerprint missing");
    const sendClaims = (step, n, extra) => send({
      [hsStepKey]: step,
      n,
      dtls: localDtls,
      uid: localUser.userId,
      pk: jwkToCompactPub(localEndpoint.signPubJwk),
      uk: jwkToCompactPub(localUser.signPubJwk),
      ...extra
    });
    const verifyStep = (raw, step) => parseAndVerifyPeerIdentityClaims(raw, step, remotePeerId, remoteDtls, localDtls);
    const resolveRemoteDtls = (claimed) => remoteDtls.length > 0 ? remoteDtls : claimed;
    const toVerified = (userId, peerPubKey, userPubKey) => ({
      userId,
      peerPubKey,
      userPubKey
    });
    if (isInitiator) {
      const initNonce = crypto.randomUUID();
      await sendClaims(1, initNonce);
      const { data: step2 } = await receive();
      const [rNonce, rDtls, rUid, rPeerPub, rUserPub, rPs, rUs] = await verifyStep(step2, 2);
      const transcriptBytes2 = encodeTranscript(resolvedRoomId, effectiveSelfId, remotePeerId, initNonce, rNonce, localDtls, resolveRemoteDtls(rDtls), localUser.userId, rUid);
      await verifyTranscriptDualSignatures(transcriptBytes2, rPs, rUs, rPeerPub, rUserPub);
      const sigs = await signTranscript(transcriptBytes2, localUser);
      const sendStep3 = () => send({
        [hsStepKey]: 3,
        ...sigs
      });
      const verified2 = toVerified(rUid, rPeerPub, rUserPub);
      try {
        onVerified?.(remotePeerId, verified2, peer);
      } catch (err) {
        if (err === peerBannedErr) await sendStep3();
        throw err;
      }
      await sendStep3();
      return verified2;
    }
    const { data: step1 } = await receive();
    const [iNonce, iDtls, iUid, iPeerPub, iUserPub] = await verifyStep(step1, 1);
    const respNonce = crypto.randomUUID();
    const transcriptBytes = encodeTranscript(resolvedRoomId, remotePeerId, effectiveSelfId, iNonce, respNonce, resolveRemoteDtls(iDtls), localDtls, iUid, localUser.userId);
    await sendClaims(2, respNonce, await signTranscript(transcriptBytes, localUser));
    const { data: step3 } = await receive();
    if (!step3 || typeof step3 !== "object") throw peerIdentityErr;
    const msg3 = step3;
    if (msg3[hsStepKey] !== 3 || typeof msg3.ps !== "string" || typeof msg3.us !== "string") throw peerIdentityErr;
    await verifyTranscriptDualSignatures(transcriptBytes, msg3.ps, msg3.us, iPeerPub, iUserPub);
    const verified = toVerified(iUid, iPeerPub, iUserPub);
    onVerified?.(remotePeerId, verified, peer);
    return verified;
  };
  return { run: run2 };
};
var clearQueue = (queue, error) => {
  queue.messages.length = 0;
  for (const [, reject] of queue.waiters.splice(0)) reject(error);
};
var clearEntryTimer = (entry) => {
  if ("timer" in entry) resetTimer(entry.timer);
};
var createHandshakeManager = (deps) => {
  const { selfIdP, onPeerHandshake, onHandshakeError, deferResponderReady, sendHandshakeData, sendHandshakeReady, onLocalHandshakePassed, acquireAdmissionSlot, beforeSendHandshakeReady, onActivate, onFailure } = deps;
  const peerStates = /* @__PURE__ */ new Map();
  const getCurrentPending = (id, peer) => {
    const entry = peerStates.get(id);
    if (!entry || entry.phase === "active" || peer && entry.peer !== peer) return;
    return entry;
  };
  const activatePeer = (id, entry) => {
    clearEntryTimer(entry);
    peerStates.set(id, {
      phase: "active",
      peer: entry.peer
    });
    onActivate(id, entry.peer);
  };
  const failPeerHandshake = (id, peer, reason) => {
    const entry = peerStates.get(id);
    if (!entry || entry.peer !== peer) return;
    clearEntryTimer(entry);
    onHandshakeError?.(id, reason);
    onFailure(id, peer, reason);
  };
  const beginPreparingReady = (id, peer, timer, remoteReady) => {
    if (!acquireAdmissionSlot(id, peer)) return;
    const current = getCurrentPending(id, peer);
    if (!current) return;
    const nextRemoteReady = remoteReady || current.phase === "awaiting-remote-ready" || "remoteReady" in current && current.remoteReady;
    peerStates.set(id, {
      phase: "preparing-ready",
      peer,
      timer,
      remoteReady: nextRemoteReady
    });
    const finishReady = (payload) => {
      const preparing = peerStates.get(id);
      if (!preparing || preparing.phase !== "preparing-ready" || preparing.peer !== peer) return;
      const isRemoteReady = preparing.remoteReady;
      if (isRemoteReady) {
        clearEntryTimer(preparing);
        peerStates.set(id, {
          phase: "active",
          peer
        });
      } else peerStates.set(id, {
        phase: "awaiting-peer-ready",
        peer,
        timer: preparing.timer
      });
      sendHandshakeReady(payload || "", id).catch((err) => failPeerHandshake(id, peer, mkErr(`handshake ready send failed: ${toErrorMessage(err, "send failed")}`)));
      if (isRemoteReady) onActivate(id, peer);
    };
    let prep;
    try {
      prep = beforeSendHandshakeReady(id, peer);
    } catch {
      prep = void 0;
    }
    if (prep) {
      prep.then(finishReady, () => finishReady());
      return;
    }
    finishReady();
  };
  const clearPeerInternal = (id, error) => {
    const entry = peerStates.get(id);
    if (!entry) return;
    clearEntryTimer(entry);
    if ("queue" in entry) clearQueue(entry.queue, error);
    peerStates.delete(id);
  };
  return {
    addPeer: (id, peer) => {
      if (peerStates.has(id)) clearPeerInternal(id, handshakeDisconnectErr);
      peerStates.set(id, {
        phase: "added",
        peer,
        queue: {
          messages: [],
          waiters: []
        },
        remoteReady: false
      });
    },
    clearPeer: clearPeerInternal,
    canReceiveFromPeer: (id, receiveWhilePending) => {
      const entry = peerStates.get(id);
      return Boolean(entry && (entry.phase === "active" || receiveWhilePending));
    },
    start: (id, peer) => {
      const existing = peerStates.get(id);
      if (!existing || existing.phase !== "added" || existing.peer !== peer) return;
      const timer = setTimeout(() => failPeerHandshake(id, peer, mkErr(`handshake timed out after ${defaultHandshakeTimeoutMs}ms`)), defaultHandshakeTimeoutMs);
      unrefTimer(timer);
      peerStates.set(id, {
        phase: "running-steps",
        peer,
        timer,
        role: "resolving",
        queue: existing.queue,
        remoteReady: existing.remoteReady
      });
      const sendHandshake = async (data, metadata) => {
        if (peerStates.get(id)?.peer !== peer) throw handshakeDisconnectErr;
        await sendHandshakeData(data, id, metadata);
      };
      const receiveHandshake = () => new Promise((resolve3, reject) => {
        const current = peerStates.get(id);
        if (!current || current.peer !== peer || current.phase !== "running-steps") {
          reject(handshakeDisconnectErr);
          return;
        }
        const buffered = current.queue.messages.shift();
        if (buffered) {
          resolve3(buffered);
          return;
        }
        current.queue.waiters.push([resolve3, reject]);
      });
      selfIdP.then((effectiveSelfId) => {
        const isInitiator = effectiveSelfId < id;
        const current = peerStates.get(id);
        if (current?.phase === "running-steps" && current.peer === peer) peerStates.set(id, {
          ...current,
          role: isInitiator ? "initiator" : "responder"
        });
        return onPeerHandshake(id, sendHandshake, receiveHandshake, isInitiator, peer);
      }).then(() => {
        const current = peerStates.get(id);
        if (!current || current.phase !== "running-steps" || current.peer !== peer) return;
        clearQueue(current.queue, handshakeDisconnectErr);
        if (!onLocalHandshakePassed(id, peer)) return;
        const latest = peerStates.get(id);
        if (!latest || latest.phase !== "running-steps" || latest.peer !== peer) return;
        if (deferResponderReady && latest.role === "responder" && !latest.remoteReady) {
          peerStates.set(id, {
            phase: "awaiting-remote-ready",
            peer,
            timer: latest.timer
          });
          return;
        }
        beginPreparingReady(id, peer, latest.timer, latest.remoteReady);
      }).catch((err) => failPeerHandshake(id, peer, toError(err, "handshake failed")));
    },
    receiveData: (data, id, metadata) => {
      const entry = peerStates.get(id);
      if (!entry || !("queue" in entry)) return;
      const payload = metadata === void 0 ? { data } : {
        data,
        metadata
      };
      const waiter = entry.queue.waiters.shift();
      if (waiter) {
        waiter[0](payload);
        return;
      }
      if (entry.queue.messages.length >= maxBufferedHandshakeMessages) {
        failPeerHandshake(id, entry.peer, mkErr("too many pending handshake messages"));
        return;
      }
      entry.queue.messages.push(payload);
    },
    receiveReady: (id) => {
      const entry = peerStates.get(id);
      if (!entry || entry.phase === "active") return;
      switch (entry.phase) {
        case "added":
        case "running-steps":
        case "preparing-ready":
          peerStates.set(id, {
            ...entry,
            remoteReady: true
          });
          return;
        case "awaiting-remote-ready":
          beginPreparingReady(id, entry.peer, entry.timer, true);
          return;
        case "awaiting-peer-ready":
          activatePeer(id, entry);
          return;
        default:
          unreachable(entry);
      }
    },
    getPeer: (id) => peerStates.get(id)?.peer
  };
};

// node_modules/@trystero-p2p/core/dist/media.mjs
var isStreamTracked = (entry) => entry?.phase === "waiting" || entry?.phase === "active";
var toParsedMediaMeta = (value2) => {
  if (!isObj(value2) || typeof value2["k"] !== "string") return null;
  const rawTrackCount = value2["t"];
  const hasMetadata = Object.hasOwn(value2, "m");
  return {
    key: value2["k"],
    streamId: typeof value2["s"] === "string" ? value2["s"] : void 0,
    expectedTrackCount: typeof rawTrackCount === "number" && Number.isInteger(rawTrackCount) && rawTrackCount >= 0 ? rawTrackCount : void 0,
    hasMetadata,
    metadata: hasMetadata ? value2["m"] : void 0
  };
};
var tracksOf = (stream) => stream?.getTracks?.() ?? [];
var streamIdOf = (stream) => typeof stream.id === "string" ? stream.id : void 0;
var waitingForTracks = (expectedCount, currentTracks) => expectedCount !== void 0 && expectedCount > 0 && currentTracks.length < expectedCount;
var bindTargetEvent = (target, event, listener, cleanups) => {
  if (typeof target.addEventListener === "function" && typeof target.removeEventListener === "function") {
    target.addEventListener(event, listener);
    cleanups.push(() => {
      target.removeEventListener?.(event, listener);
    });
  }
};
var makeStreamKeyGetter = () => {
  const localStreamKeys = /* @__PURE__ */ new WeakMap();
  return (stream) => {
    let key = localStreamKeys.get(stream);
    if (!key) {
      key = crypto.randomUUID();
      localStreamKeys.set(stream, key);
    }
    return key;
  };
};
var createMediaIdentityCache = () => {
  const remoteStreamsByKey = /* @__PURE__ */ new Map();
  const remoteStreamsById = /* @__PURE__ */ new Map();
  const remoteStreamKeys = /* @__PURE__ */ new WeakMap();
  return {
    getStreamKey: makeStreamKeyGetter(),
    rememberRemoteStream: (key, stream, streamId) => {
      const previous = remoteStreamKeys.get(stream);
      if (previous !== void 0 && remoteStreamsByKey.get(previous) === stream) remoteStreamsByKey.delete(previous);
      remoteStreamKeys.set(stream, key);
      remoteStreamsByKey.set(key, stream);
      if (streamId) remoteStreamsById.set(streamId, stream);
    },
    getRemoteStream: (key, streamId) => remoteStreamsByKey.get(key) ?? (streamId ? remoteStreamsById.get(streamId) : void 0),
    hasRemoteMedia: () => remoteStreamsByKey.size > 0,
    clearRemote: () => {
      remoteStreamsByKey.clear();
      remoteStreamsById.clear();
    }
  };
};
var findWaitingStream = (peerState, streamId) => {
  for (const [stream, record] of peerState.streams) if (record.phase === "waiting" && (!streamId || stream.id === streamId)) return stream;
};
var countWaitingStreams = (peerState) => {
  let count = 0;
  for (const record of peerState.streams.values()) if (record.phase === "waiting") count++;
  return count;
};
var createMediaManager = ({ iterate, isActive, preparePeer, getPeerUserId, onPeerError, onPeerMediaPinChange }) => {
  const peerRemoteMedia = /* @__PURE__ */ new Map();
  const peerLocalMedia = /* @__PURE__ */ new Map();
  const [subStream, emitStreamEvt, clearStreamEvt] = createEventEmitter("peer stream handler");
  const getLocalStreamKey = makeStreamKeyGetter();
  const localStreamMetas = /* @__PURE__ */ new WeakMap();
  const localStreamRawTracks = /* @__PURE__ */ new WeakMap();
  const globalReplacedTracks = /* @__PURE__ */ new WeakMap();
  let nextLocalSyncGen = 0;
  const ensurePeerRemoteMedia = (id) => {
    let state = peerRemoteMedia.get(id);
    if (!state) {
      state = {
        identityCache: createMediaIdentityCache(),
        metaQueue: [],
        streams: /* @__PURE__ */ new Map()
      };
      peerRemoteMedia.set(id, state);
    }
    return state;
  };
  const ensurePeerLocalMedia = (id) => {
    let state = peerLocalMedia.get(id);
    if (!state) {
      state = { streams: /* @__PURE__ */ new Map() };
      peerLocalMedia.set(id, state);
    }
    return state;
  };
  const hasActiveRemoteMediaForPeer = (id) => {
    const remote = peerRemoteMedia.get(id);
    if (!remote) return false;
    for (const record of remote.streams.values()) if (record.phase === "active") return true;
    return false;
  };
  const hasSyncedLocalMediaForPeer = (id) => Boolean(peerLocalMedia.get(id)?.streams.size);
  const updatePeerPin = (id) => {
    onPeerMediaPinChange?.(id, hasActiveRemoteMediaForPeer(id) || hasSyncedLocalMediaForPeer(id));
  };
  const getMediaPeer = async (id, directPeer) => {
    const mediaPeer = directPeer ?? (preparePeer ? await preparePeer(id) : void 0);
    if (!mediaPeer) throw peerDisconnectedErr;
    return mediaPeer;
  };
  const resolveTrack = (track) => {
    let current = track;
    const seen3 = /* @__PURE__ */ new Set();
    while (!seen3.has(current)) {
      const next2 = globalReplacedTracks.get(current);
      if (!next2) break;
      seen3.add(current);
      current = next2;
    }
    return current;
  };
  const resolveStreamTracks = (stream) => {
    const rawTracks = tracksOf(stream);
    const prevRaw = localStreamRawTracks.get(stream);
    if (prevRaw) {
      for (const track of rawTracks) if (!prevRaw.has(track)) globalReplacedTracks.delete(track);
    }
    localStreamRawTracks.set(stream, new Set(rawTracks));
    return rawTracks.map(resolveTrack);
  };
  const isRemoteStreamActive = (stream, hadTracks) => {
    if ("active" in stream && stream.active === false) return false;
    const tracks = stream.getTracks?.();
    if (!tracks) return true;
    if (hadTracks && tracks.length === 0) return false;
    return tracks.length === 0 || !tracks.every((t) => t?.readyState === "ended");
  };
  const deactivateRemoteStream = (id, peerState, stream, entry) => {
    if (peerState.streams.get(stream) !== entry) return;
    entry.cleanup();
    peerState.streams.set(stream, {
      phase: "inactive",
      key: entry.key
    });
    updatePeerPin(id);
  };
  const deactivateAllPeerRemoteStreams = (peerState) => {
    for (const [stream, record] of Array.from(peerState.streams.entries())) switch (record.phase) {
      case "waiting":
        record.cleanup();
        peerState.streams.delete(stream);
        break;
      case "active":
        record.cleanup();
        peerState.streams.set(stream, {
          phase: "inactive",
          key: record.key
        });
        break;
      case "inactive":
        break;
      default:
        unreachable(record);
    }
  };
  const toMediaCtx = (id, hasMetadata, metadata) => {
    const userId = getPeerUserId ? getPeerUserId(id) : id;
    return hasMetadata && metadata !== void 0 ? {
      peerId: id,
      userId,
      metadata
    } : {
      peerId: id,
      userId
    };
  };
  const matchQueuedMetaForStream = (peerState, stream) => {
    if (!peerState.metaQueue.length) return null;
    const streamId = streamIdOf(stream);
    const index = streamId ? peerState.metaQueue.findIndex((meta) => !meta.streamId || meta.streamId === streamId) : 0;
    if (index < 0) return null;
    const candidate = peerState.metaQueue[index];
    if (waitingForTracks(candidate.expectedTrackCount, tracksOf(stream))) return null;
    peerState.metaQueue.splice(index, 1);
    return candidate;
  };
  const tryPromoteStreamFromQueuedMeta = (id, stream) => {
    if (!isActive(id)) return false;
    const peerState = peerRemoteMedia.get(id);
    if (!peerState) return false;
    const matched = matchQueuedMetaForStream(peerState, stream);
    if (!matched) return false;
    activateRemoteStream(id, peerState, matched.key, stream, matched.hasMetadata, matched.metadata);
    return true;
  };
  const ensureWaitingStream = (id, peerState, stream) => {
    const existing = peerState.streams.get(stream);
    if (isStreamTracked(existing)) return;
    if (countWaitingStreams(peerState) >= 64) return;
    const cleanups = [];
    bindTargetEvent(stream, "addtrack", () => {
      tryPromoteStreamFromQueuedMeta(id, stream);
    }, cleanups);
    peerState.streams.set(stream, {
      phase: "waiting",
      cleanup: () => {
        while (cleanups.length > 0) cleanups.pop()();
      }
    });
  };
  const activateRemoteStream = (id, peerState, key, stream, hasMetadata, metadata) => {
    if (!isActive(id)) return;
    peerState.identityCache.rememberRemoteStream(key, stream, streamIdOf(stream));
    const prev2 = peerState.streams.get(stream);
    if (isStreamTracked(prev2)) prev2.cleanup();
    const curTracks = tracksOf(stream);
    let hadTracks = Boolean(prev2?.phase === "active" && prev2.hadTracks || curTracks.length > 0);
    if (!isRemoteStreamActive(stream, hadTracks)) {
      peerState.streams.set(stream, {
        phase: "inactive",
        key
      });
      if (prev2?.phase === "active") updatePeerPin(id);
      return;
    }
    const metaSig = hasMetadata && metadata !== void 0 ? `m:${toJson(metadata)}` : "";
    const prevEmittedSig = prev2?.phase === "active" ? prev2.emittedSig : void 0;
    const cleanups = [];
    const observedTracks = /* @__PURE__ */ new Set();
    const cleanup = () => {
      while (cleanups.length > 0) cleanups.pop()();
    };
    let currentEntry = {
      phase: "active",
      key,
      hasMetadata,
      metadata,
      emittedSig: metaSig,
      hadTracks,
      cleanup
    };
    const pruneIfInactive = () => {
      if (!isRemoteStreamActive(stream, hadTracks)) deactivateRemoteStream(id, peerState, stream, currentEntry);
    };
    const observeTrack = (track) => {
      if (!track || observedTracks.has(track)) return;
      observedTracks.add(track);
      if (!hadTracks) {
        hadTracks = true;
        if (peerState.streams.get(stream) === currentEntry) {
          currentEntry = {
            ...currentEntry,
            hadTracks: true
          };
          peerState.streams.set(stream, currentEntry);
        }
      }
      bindTargetEvent(track, "ended", pruneIfInactive, cleanups);
    };
    const onDynamicTrackAdded = () => {
      if (peerState.streams.get(stream) !== currentEntry) return;
      for (const track of tracksOf(stream)) observeTrack(track);
      if (!tryPromoteStreamFromQueuedMeta(id, stream)) pruneIfInactive();
    };
    bindTargetEvent(stream, "removetrack", pruneIfInactive, cleanups);
    bindTargetEvent(stream, "inactive", pruneIfInactive, cleanups);
    bindTargetEvent(stream, "addtrack", onDynamicTrackAdded, cleanups);
    for (const track of curTracks) observeTrack(track);
    currentEntry = {
      ...currentEntry,
      hadTracks
    };
    peerState.streams.set(stream, currentEntry);
    updatePeerPin(id);
    if (prevEmittedSig !== metaSig) emitStreamEvt(stream, toMediaCtx(id, hasMetadata, metadata));
  };
  return {
    addStream: async (stream, options, sendMeta) => {
      const key = getLocalStreamKey(stream);
      const metadata = Object.hasOwn(options, "metadata") ? (localStreamMetas.set(stream, options.metadata), options.metadata) : localStreamMetas.get(stream);
      const initialEffectiveTracks = resolveStreamTracks(stream);
      await all(iterate(options.target, async (id, directPeer) => {
        const opGen = ++nextLocalSyncGen;
        const peerLocal = ensurePeerLocalMedia(id);
        const prevEntry = peerLocal.streams.get(stream);
        peerLocal.streams.set(stream, prevEntry?.phase === "synced" ? {
          phase: "synced",
          syncGen: opGen,
          appliedTracks: prevEntry.appliedTracks
        } : {
          phase: "syncing-initial",
          syncGen: opGen
        });
        updatePeerPin(id);
        const rollbackInitialIfCurrent = () => {
          const curLocal = peerLocalMedia.get(id);
          const cur = curLocal?.streams.get(stream);
          if (cur?.syncGen === opGen && cur.phase === "syncing-initial") {
            curLocal.streams.delete(stream);
            if (!curLocal.streams.size) peerLocalMedia.delete(id);
            updatePeerPin(id);
          }
        };
        let mediaPeer;
        try {
          mediaPeer = await getMediaPeer(id, directPeer);
        } catch (err) {
          rollbackInitialIfCurrent();
          throw err;
        }
        if (peerLocalMedia.get(id)?.streams.get(stream)?.syncGen !== opGen) return;
        try {
          await sendMeta({
            k: key,
            s: stream.id,
            ...initialEffectiveTracks.length > 0 ? { t: initialEffectiveTracks.length } : {},
            ...metadata === void 0 ? {} : { m: metadata }
          }, { target: id });
        } catch (err) {
          rollbackInitialIfCurrent();
          throw err;
        }
        const current = peerLocalMedia.get(id)?.streams.get(stream);
        if (!current || current.syncGen !== opGen) return;
        const latestRawTracks = tracksOf(stream);
        const latestEffectiveTracks = latestRawTracks.map(resolveTrack);
        switch (current.phase) {
          case "syncing-initial":
            peerLocalMedia.get(id)?.streams.set(stream, {
              phase: "synced",
              syncGen: opGen,
              appliedTracks: new Set(latestEffectiveTracks)
            });
            if (latestEffectiveTracks.length !== latestRawTracks.length || latestEffectiveTracks.some((track, index) => track !== latestRawTracks[index])) latestEffectiveTracks.forEach((track) => mediaPeer.addTrack(track, stream));
            else mediaPeer.addStream(stream);
            return;
          case "synced": {
            const nextSet = new Set(latestEffectiveTracks);
            for (const prevTrack of current.appliedTracks.difference(nextSet)) {
              mediaPeer.removeTrack(prevTrack, stream);
              current.appliedTracks.delete(prevTrack);
            }
            for (const nextTrack of nextSet.difference(current.appliedTracks)) {
              mediaPeer.addTrack(nextTrack, stream);
              current.appliedTracks.add(nextTrack);
            }
            return;
          }
          default:
            unreachable(current);
        }
      }));
    },
    removeStream: (stream, target) => {
      if (!target) {
        localStreamMetas.delete(stream);
        localStreamRawTracks.delete(stream);
      }
      iterate(target, (id, directPeer) => {
        const peerLocal = peerLocalMedia.get(id);
        const prevEntry = peerLocal?.streams.get(stream);
        if (peerLocal) {
          peerLocal.streams.delete(stream);
          if (!peerLocal.streams.size) peerLocalMedia.delete(id);
        }
        updatePeerPin(id);
        if (!directPeer || prevEntry?.phase === "syncing-initial") return;
        directPeer.removeStream(stream);
        if (prevEntry?.phase === "synced") for (const track of prevEntry.appliedTracks.difference(new Set(tracksOf(stream)))) directPeer.removeTrack(track, stream);
      });
    },
    replaceTrack: async (oldTrack, newTrack, target) => {
      globalReplacedTracks.set(oldTrack, newTrack);
      globalReplacedTracks.delete(newTrack);
      await all(iterate(target, async (id, directPeer) => {
        const peerLocal = peerLocalMedia.get(id);
        let hasMatchingStream = false;
        if (peerLocal) {
          for (const [stream, streamEntry] of peerLocal.streams.entries()) if (streamEntry.phase === "synced" && streamEntry.appliedTracks.has(oldTrack)) {
            streamEntry.appliedTracks.delete(oldTrack);
            streamEntry.appliedTracks.add(newTrack);
            hasMatchingStream = true;
          } else if (streamEntry.phase === "syncing-initial" && tracksOf(stream).some((raw) => raw === oldTrack || resolveTrack(raw) === newTrack)) hasMatchingStream = true;
        }
        if (!hasMatchingStream && !directPeer) return;
        await (await getMediaPeer(id, directPeer)).replaceTrack(oldTrack, newTrack);
      }));
    },
    receiveStreamMeta: (meta, id) => {
      if (!isActive(id)) return;
      const parsed = toParsedMediaMeta(meta);
      if (!parsed) return;
      const peerState = ensurePeerRemoteMedia(id);
      const waitingStream = findWaitingStream(peerState, parsed.streamId);
      const candidateStream = waitingStream ?? peerState.identityCache.getRemoteStream(parsed.key, parsed.streamId);
      const candidateTracks = tracksOf(candidateStream);
      if (candidateStream && (waitingStream !== void 0 || candidateTracks.length > 0) && !waitingForTracks(parsed.expectedTrackCount, candidateTracks)) {
        const staleMetaIdx = peerState.metaQueue.findIndex((item2) => item2.key === parsed.key);
        if (staleMetaIdx >= 0) peerState.metaQueue.splice(staleMetaIdx, 1);
        activateRemoteStream(id, peerState, parsed.key, candidateStream, parsed.hasMetadata, parsed.metadata);
        return;
      }
      if (candidateStream && waitingForTracks(parsed.expectedTrackCount, candidateTracks)) ensureWaitingStream(id, peerState, candidateStream);
      const existingIdx = peerState.metaQueue.findIndex((item2) => item2.key === parsed.key);
      if (existingIdx >= 0) {
        peerState.metaQueue[existingIdx] = parsed;
        return;
      }
      if (peerState.metaQueue.length >= 64) {
        warn("too many pending stream metadata messages");
        onPeerError(id, mkErr("too many pending media metadata messages"));
        return;
      }
      peerState.metaQueue.push(parsed);
    },
    receiveRemoteStream: (id, stream) => {
      if (!isActive(id)) return;
      const peerState = ensurePeerRemoteMedia(id);
      const matched = matchQueuedMetaForStream(peerState, stream);
      if (matched) {
        activateRemoteStream(id, peerState, matched.key, stream, matched.hasMetadata, matched.metadata);
        return;
      }
      ensureWaitingStream(id, peerState, stream);
    },
    clearPeer: (id) => {
      const remote = peerRemoteMedia.get(id);
      if (remote) {
        deactivateAllPeerRemoteStreams(remote);
        peerRemoteMedia.delete(id);
      }
      peerLocalMedia.delete(id);
      onPeerMediaPinChange?.(id, false);
    },
    clearListeners: () => {
      clearStreamEvt();
      for (const [id, peerState] of peerRemoteMedia) {
        deactivateAllPeerRemoteStreams(peerState);
        updatePeerPin(id);
      }
    },
    onPeerStream: (handler, options) => subStream(handler, options, () => {
      const items = [];
      for (const [id, peerState] of peerRemoteMedia) {
        if (!isActive(id)) {
          deactivateAllPeerRemoteStreams(peerState);
          updatePeerPin(id);
          continue;
        }
        for (const [stream, record] of Array.from(peerState.streams.entries())) {
          if (record.phase !== "active") continue;
          if (!isRemoteStreamActive(stream, record.hadTracks)) {
            deactivateRemoteStream(id, peerState, stream, record);
            continue;
          }
          items.push([stream, toMediaCtx(id, record.hasMetadata, record.metadata)]);
        }
      }
      return items;
    })
  };
};

// node_modules/@trystero-p2p/core/dist/state.mjs
var defaultMaxStateBytes = 16384;
var maxAllowedStateBytes = 65536;
var maxUserStateBytesPerUser = 65536;
var minSlotBroadcastIntervalMs = 40;
var maxLiveRecordsPerSec = 60;
var maxLiveRecordBurst = 120;
var maxSyncRecordsPerBatch = 1024;
var maxPullPages = 16;
var maxSyncChunkBytes = 184320;
var maxHandshakeStateBytes = 61440;
var handshakeStateDeadlineMs = 400;
var offlineStagingTtlMs = 5e3;
var maxFlushRetries = 8;
var tombstoneBytes = 32;
var allowedRecordKeys = /* @__PURE__ */ new Set([
  "v",
  "k",
  "appId",
  "roomId",
  "ns",
  "hlc",
  "peerId",
  "userId",
  "pub",
  "val",
  "del",
  "cert",
  "sig"
]);
var stateRecordPayload = (record, canonVal) => canonTag("state", [
  record.v,
  record.k,
  record.appId,
  record.roomId,
  record.ns,
  record.hlc,
  record.peerId,
  record.userId,
  record.pub,
  record.del === true ? null : canonVal ?? canonicalizeJson(record.val),
  record.del === true ? 1 : 0,
  record.cert?.sig ?? ""
]);
var validateAndMeasureRecord = (raw, maxBytes = Number.POSITIVE_INFINITY) => {
  if (!isObj(raw) || keys(raw).some((k) => !allowedRecordKeys.has(k))) return null;
  if (raw["v"] !== 1 || raw["k"] !== "s" && raw["k"] !== "u" || !isStr(raw["appId"]) || !isStr(raw["roomId"]) || !isStr(raw["ns"]) || raw["ns"].length > 256 || !isValidHlc(raw["hlc"]) || !isValidSignalPeerId(raw["peerId"]) || !isValidUserId(raw["userId"]) || typeof raw["pub"] !== "string" || !compactPubToJwk(raw["pub"]) || !isValidSig(raw["sig"]) || raw["cert"] !== void 0 && !validateRoleCertificateShape(raw["cert"])) return null;
  if (raw["del"] !== void 0) return raw["del"] === true && raw["k"] === "u" && raw["val"] === void 0 ? {
    rec: raw,
    bytes: tombstoneBytes,
    canonVal: void 0
  } : null;
  if (!("val" in raw) || raw["val"] === void 0) return null;
  const measured = canonicalizeAndMeasureJson(raw["val"], maxBytes);
  return Array.isArray(measured) ? {
    rec: raw,
    bytes: measured[1],
    canonVal: measured[0]
  } : null;
};
var signStateRecord = async (signer, pubJwk, params, canonVal) => {
  const hlc = typeof params.hlc === "number" ? [params.hlc, 0] : params.hlc ?? [Date.now(), 0];
  const base = {
    v: 1,
    appId: params.appId,
    roomId: params.roomId,
    ns: params.ns,
    hlc,
    peerId: params.peerId,
    userId: params.userId,
    pub: jwkToCompactPub(pubJwk),
    ...params.cert ? { cert: params.cert } : {}
  };
  const unsigned = params.del === true ? {
    ...base,
    k: "u",
    del: true
  } : {
    ...base,
    k: params.kind ?? "s",
    val: params.val
  };
  const sig = await signWith(signer, stateRecordPayload(unsigned, canonVal));
  return {
    ...unsigned,
    sig
  };
};
var compareStateRecords = (a, b) => compareHlc(a.hlc, b.hlc) || cmpStr(a.userId, b.userId) || cmpStr(a.peerId, b.peerId) || cmpStr(a.sig, b.sig);
var maxHlc = (a, b) => compareHlc(a, b) >= 0 ? a : b;
var toWireRecord = (rec, includePub) => ({
  v: rec.v,
  k: rec.k,
  ns: rec.ns,
  hlc: rec.hlc,
  peerId: rec.peerId,
  userId: rec.userId,
  ...includePub ? { pub: rec.pub } : {},
  ...rec.del === true ? { del: true } : { val: rec.val },
  ...rec.cert !== void 0 ? { cert: rec.cert } : {},
  sig: rec.sig
});
var fromWireRecord = (raw, appId, roomId, pubMap) => {
  if (!isObj(raw) || "appId" in raw || "roomId" in raw) return null;
  const uid = raw["userId"];
  const pub = raw["pub"] === void 0 && isStr(uid) ? pubMap?.[uid] : raw["pub"];
  return {
    ...raw,
    appId,
    roomId,
    pub
  };
};
var validateSlotArgs = (ns, initialValue, maxBytes, rolesOpt, rolesLoaded, defaultClosed, fnName, roleLabel) => {
  if (!isStr(ns) || ns.length > 256) throw mkErr(`${fnName} requires a non-empty namespace string`);
  const measuredInit = canonicalizeAndMeasureJson(initialValue === void 0 ? null : initialValue);
  if (!Array.isArray(measuredInit)) throw mkErr(`state "${ns}" initialValue must be valid JSON`);
  const initVal = fromJson(measuredInit[0]);
  if (maxBytes !== void 0 && (!isPosSafeInt(maxBytes) || maxBytes > maxAllowedStateBytes)) throw mkErr(`state "${ns}" maxBytes must be a positive integer <= ${maxAllowedStateBytes}`);
  if (rolesOpt !== void 0 && !rolesLoaded) throw requiresRolesErr(roleLabel);
  let reqRoles = null;
  if (rolesLoaded) {
    if (rolesOpt === void 0) reqRoles = defaultClosed ? ["admin"] : null;
    else {
      const raw = [rolesOpt].flat();
      if (!raw.includes("*")) {
        const list2 = raw.filter(Boolean);
        if (!list2.length) throw mkErr(`${roleLabel} roles must not be empty; use "*" for open`);
        reqRoles = list2;
      }
    }
  }
  return [
    initVal,
    maxBytes ?? defaultMaxStateBytes,
    reqRoles
  ];
};
var getLiveEntry = (slot2, key) => {
  const entry = slot2.entries.get(key);
  return entry && !entry.rec.del ? entry : void 0;
};
var estimateWireRecordBytes = (wire) => encodeBytes(toJson(wire)).byteLength + 120;
var sig8 = (rec) => rec.sig.slice(0, 8);
var quotaErr = (ns) => mkErr(`state "${ns}" exceeds user quota`);
var createStateManager = ({ appId, getRoomId, getSelfId, getLocalUserId, ensureReady, hasRolesPlugin, getRolesProvider, getScaleProvider, isPeerActive, isPeerPendingHandshake, isDirectPeer, getDirectPeerIds, isUserOnline, getKnownPeerUserId, isPeerBanned, getPeerRoles, makeInternalAction, onInvalidRecord }) => {
  const slots2 = /* @__PURE__ */ new Map();
  const liveRateLimiter = createTokenBucketLimiter(maxLiveRecordsPerSec, maxLiveRecordBurst, 512);
  const [hitSyncQuota] = createWindowCounter(512, 96);
  const [hitFwdSyncQuota] = createWindowCounter(512, 96);
  const stagedHandshake = /* @__PURE__ */ new Map();
  const sentHandshakeSigs = /* @__PURE__ */ new Map();
  const pendingOfflineUserRecs = createBoundedCache(128);
  const onlineEpoch = /* @__PURE__ */ new Map();
  const activeOnlineUsers = /* @__PURE__ */ new Set();
  const pendingJoinWaiters = /* @__PURE__ */ new Map();
  const clock2 = createMonotonicClock();
  let destroyed = false;
  const isDestroyed = () => destroyed;
  const isPeerLiveOrPending = (peerId) => isPeerActive(peerId) || Boolean(isPeerPendingHandshake?.(peerId));
  const getOnlineEpoch = (uid) => onlineEpoch.get(uid) ?? 0;
  const bumpOnlineEpoch = (uid) => {
    if (!uid) return;
    const next2 = getOnlineEpoch(uid) + 1;
    if (!onlineEpoch.has(uid) && onlineEpoch.size >= 4096) {
      for (const k of onlineEpoch.keys()) if (!activeOnlineUsers.has(k) && !isUserOnline(k)) {
        onlineEpoch.delete(k);
        break;
      }
    }
    onlineEpoch.set(uid, next2);
  };
  const setUserPresence = (userId, online) => {
    if (isDestroyed() || !userId) return;
    if (online) {
      if (!activeOnlineUsers.has(userId)) {
        activeOnlineUsers.add(userId);
        bumpOnlineEpoch(userId);
      }
    } else if (activeOnlineUsers.delete(userId)) bumpOnlineEpoch(userId);
  };
  const setSlotOptimistic = (slot2, next2) => {
    slot2.optimistic = next2;
    slot2.snapshot = null;
  };
  const clearSlotOptimistic = (slot2) => {
    if (slot2.optimistic !== null) {
      slot2.optimistic = null;
      slot2.snapshot = null;
    }
  };
  const enqueuePendingOp = (slot2, fields2) => {
    const { promise, resolve: resolve3, reject } = Promise.withResolvers();
    slot2.ops.push({
      ...fields2,
      promise,
      resolve: resolve3,
      reject
    });
    flushSlot(slot2);
    return promise;
  };
  const isScaleActive = () => Boolean(getScaleProvider?.());
  const resolvePendingJoin = (peerId, ok) => {
    const waiter = pendingJoinWaiters.get(peerId);
    if (waiter) {
      pendingJoinWaiters.delete(peerId);
      waiter.resolve(ok);
    }
  };
  const waitPeerReady = (peerId) => {
    if (!isPeerPendingHandshake?.(peerId)) return isPeerActive(peerId) ? null : false;
    let waiter = pendingJoinWaiters.get(peerId);
    if (!waiter) {
      const { promise, resolve: resolve3 } = Promise.withResolvers();
      waiter = {
        promise,
        resolve: resolve3,
        count: 0
      };
      pendingJoinWaiters.set(peerId, waiter);
    }
    if (waiter.count >= 8) return false;
    waiter.count++;
    return waiter.promise;
  };
  const readyRoomForPeer = async (peerId, waitP) => {
    if (waitP && !await waitP) return null;
    let roomId;
    try {
      ({ roomId } = await ensureReady());
    } catch {
      return null;
    }
    return isDestroyed() || !isPeerActive(peerId) || isPeerBanned(peerId) ? null : roomId;
  };
  const withinUserQuota = (uid, target, nextBytes) => {
    let count = 0;
    let bytes = nextBytes;
    for (const slot2 of slots2.values()) {
      if (slot2.kind !== "u" || slot2 === target) continue;
      if (slot2.optimistic && uid === getLocalUserId()) {
        count++;
        bytes += slot2.optimistic.bytes;
        continue;
      }
      const entry = uid ? slot2.entries.get(uid) : void 0;
      if (entry) {
        count++;
        bytes += entry.bytes;
      }
    }
    return count < 32 && bytes <= maxUserStateBytesPerUser;
  };
  const mkCtxBase = (prev2, peerId, userId, roles2, timestamp) => ({
    prev: prev2,
    peerId,
    userId,
    roles: [...roles2],
    timestamp
  });
  const toSharedCtx = (rec, prev2, roles2) => mkCtxBase(prev2, rec.peerId, rec.userId, roles2, rec.hlc[0]);
  const toUserCtx = (rec, prev2, roles2, removed, ts = rec.hlc[0], online = isUserOnline(rec.userId)) => {
    const localUid = getLocalUserId();
    return {
      ...mkCtxBase(prev2, rec.peerId, rec.userId, roles2, ts),
      self: Boolean(localUid && rec.userId === localUid),
      online,
      removed
    };
  };
  const isRecordAuthorizedNow = (rec, reqRoles) => {
    if (isPeerBanned(rec.userId)) return false;
    if (!reqRoles) return true;
    const rp = getRolesProvider();
    if (!rp) return false;
    const active = rp.getPeerRoles(rec.userId);
    if (rec.cert) return reqRoles.some((r) => rec.cert.roles.includes(r) && active.includes(r));
    return reqRoles.some((r) => active.includes(r));
  };
  const evictEntry = (slot2, key, entry, now2, roles2) => {
    slot2.entries.delete(key);
    slot2.snapshot = null;
    if (slot2.kind === "s") slot2.emit(slot2.initialValue, mkCtxBase(entry.value, getSelfId(), entry.rec.userId, roles2, now2));
    else if (!entry.rec.del) slot2.emit(void 0, toUserCtx(entry.rec, entry.value, roles2, true, now2, false));
  };
  const stateAction = makeInternalAction ? makeInternalAction("state", {
    receiveWhilePending: true,
    maxPayloadBytes: 262144
  }) : null;
  const sendState = (msg, targets) => {
    if (stateAction) stateAction.send(msg, targets === void 0 ? void 0 : { target: targets }).catch(noOp2);
  };
  const broadcastLiveRecord = (rec) => {
    sendState({
      t: "rec",
      r: toWireRecord(rec, true)
    });
  };
  const verifyParsedRecord = async ({ rec, bytes, canonVal }, reqRoles, fromPeerId) => {
    const roomId = getRoomId();
    if (rec.appId !== appId || rec.roomId !== roomId || rec.cert && rec.cert.subUserId !== rec.userId) return "invalid";
    const signer = await getVerifiedPubKeyRecord(rec.pub);
    if (!signer || signer.userId !== rec.userId) return "invalid";
    if (!await verifySig(rec.pub, stateRecordPayload(rec, canonVal), rec.sig)) return "invalid";
    const now2 = Date.now();
    const existingWall = slots2.get(`${rec.k}:${rec.ns}`)?.entries.get(rec.k === "s" ? "" : rec.userId)?.rec.hlc[0] ?? 0;
    const maxFutureWall = Math.min(now2 + defaultMaxClockSkewMs, Math.max(now2 + stateMaxFutureSkewMs, rec.cert ? rec.cert.iat + stateMaxFutureSkewMs : 0, existingWall));
    if (rec.hlc[0] > maxFutureWall || rec.cert && rec.hlc[0] < rec.cert.iat) return "drop";
    if (isPeerBanned(rec.userId)) return "drop";
    const rp = getRolesProvider();
    if (rp) {
      const roleRes = await rp.verifyStateRecordRoles(rec, reqRoles, fromPeerId);
      if (!roleRes.valid) return "drop";
      clock2.observe(rec.hlc[0]);
      return {
        rec,
        roles: roleRes.roles,
        bytes
      };
    }
    if (reqRoles && reqRoles.length > 0) return "drop";
    clock2.observe(rec.hlc[0]);
    return {
      rec,
      roles: [],
      bytes
    };
  };
  const stageOfflineUserRecord = (slot2, rec, roles2, bytes) => {
    if (bytes > slot2.maxBytes) return;
    const now2 = Date.now();
    let byNs = pendingOfflineUserRecs.get(rec.userId);
    if (!byNs) {
      byNs = /* @__PURE__ */ new Map();
      pendingOfflineUserRecs.set(rec.userId, byNs);
    } else if (!byNs.has(slot2.namespace) && byNs.size >= 32) return;
    const prev2 = byNs.get(slot2.namespace);
    if (prev2 && now2 - prev2.seenAt < offlineStagingTtlMs && compareStateRecords(rec, prev2.rec) <= 0) return;
    let totalBytes = bytes;
    for (const [ns, entry] of byNs) if (ns !== slot2.namespace) totalBytes += entry.bytes;
    if (totalBytes > maxUserStateBytesPerUser) return;
    byNs.set(slot2.namespace, {
      slot: slot2,
      rec,
      roles: [...roles2],
      bytes,
      seenAt: now2
    });
  };
  const commitEntry = (slot2, rec, roles2, bytes, skipValidate = false, allowStageOffline = false, silentCommit = false) => {
    if (isDestroyed()) return null;
    const key = slot2.kind === "s" ? "" : rec.userId;
    if (slot2.kind === "u" && !isUserOnline(key)) {
      if (allowStageOffline) stageOfflineUserRecord(slot2, rec, roles2, bytes);
      return null;
    }
    const curRaw = slot2.entries.get(key);
    if (curRaw && compareStateRecords(rec, curRaw.rec) <= 0) return null;
    const curLive = curRaw && !curRaw.rec.del ? curRaw : void 0;
    const prevVal = curLive ? curLive.value : slot2.initialValue;
    const isLocalTarget = slot2.kind === "s" || getLocalUserId() !== "" && rec.userId === getLocalUserId();
    const suppressForPendingOptimistic = !skipValidate && isLocalTarget && slot2.optimistic !== null && (slot2.ops.length > 0 || slot2.flushState.phase === "stepping" && compareHlc(rec.hlc, slot2.flushState.signingHlc ?? [slot2.optimistic.timestamp, 0]) <= 0) && rec.hlc[0] <= Date.now() + 1e4;
    if (rec.del) {
      if (slot2.kind !== "u" || !withinUserQuota(key, slot2, bytes)) return null;
      const next3 = {
        rec,
        value: slot2.initialValue,
        prev: prevVal,
        roles: [...roles2],
        bytes
      };
      slot2.entries.set(key, next3);
      if (suppressForPendingOptimistic) {
        slot2.optimistic.prev = slot2.initialValue;
        return next3;
      }
      if (!skipValidate && isLocalTarget) clearSlotOptimistic(slot2);
      slot2.snapshot = null;
      if (!silentCommit && curLive) slot2.emit(void 0, toUserCtx(rec, prevVal, roles2, true));
      return next3;
    }
    if (bytes > slot2.maxBytes || slot2.kind === "u" && !withinUserQuota(key, slot2, bytes)) return null;
    const nextVal = rec.val;
    const next2 = {
      rec,
      value: nextVal,
      prev: prevVal,
      roles: [...roles2],
      bytes
    };
    if (slot2.kind === "s") {
      const emitPrev2 = !skipValidate && slot2.optimistic !== null && !suppressForPendingOptimistic ? slot2.optimistic.value : prevVal;
      const ctx2 = toSharedCtx(rec, prevVal, roles2);
      if (!skipValidate && slot2.validate) {
        let valid = false;
        try {
          valid = slot2.validate(nextVal, ctx2);
        } catch {
          valid = false;
        }
        if (!valid) return null;
      }
      slot2.entries.set(key, next2);
      if (suppressForPendingOptimistic) {
        slot2.optimistic.prev = nextVal;
        return next2;
      }
      if (!skipValidate) clearSlotOptimistic(slot2);
      slot2.snapshot = null;
      if (!silentCommit) slot2.emit(nextVal, emitPrev2 === prevVal ? ctx2 : toSharedCtx(rec, emitPrev2, roles2));
      return next2;
    }
    const emitPrev = !skipValidate && isLocalTarget && slot2.optimistic !== null && !suppressForPendingOptimistic ? slot2.optimistic.value : prevVal;
    const ctx = toUserCtx(rec, prevVal, roles2, false);
    if (!skipValidate && slot2.validate) {
      let valid = false;
      try {
        valid = slot2.validate(nextVal, ctx);
      } catch {
        valid = false;
      }
      if (!valid) return null;
    }
    slot2.entries.set(key, next2);
    if (suppressForPendingOptimistic) {
      slot2.optimistic.prev = nextVal;
      return next2;
    }
    if (!skipValidate && isLocalTarget) clearSlotOptimistic(slot2);
    slot2.snapshot = null;
    if (!silentCommit) slot2.emit(nextVal, emitPrev === prevVal ? ctx : toUserCtx(rec, emitPrev, roles2, false));
    return next2;
  };
  const captureUserIngress = (uid) => ({
    startedOnline: isUserOnline(uid),
    startEpoch: getOnlineEpoch(uid)
  });
  const applyIncoming = async (rawRec, fromPeerId, allowStageOffline = false, ingressSnapshot) => {
    if (isDestroyed()) return null;
    const parsed = validateAndMeasureRecord(rawRec, maxAllowedStateBytes);
    if (!parsed) {
      onInvalidRecord?.(fromPeerId);
      return null;
    }
    if (isPeerBanned(parsed.rec.userId)) return null;
    const slot2 = slots2.get(`${parsed.rec.k}:${parsed.rec.ns}`);
    if (!slot2) return null;
    if (!parsed.rec.del && parsed.bytes > slot2.maxBytes) return null;
    const entryKey = slot2.kind === "s" ? "" : parsed.rec.userId;
    const { startedOnline, startEpoch } = slot2.kind === "u" ? ingressSnapshot ?? captureUserIngress(entryKey) : {
      startedOnline: true,
      startEpoch: 0
    };
    if (slot2.kind === "s" || startedOnline) {
      const curRaw = slot2.entries.get(entryKey);
      if (curRaw && compareStateRecords(parsed.rec, curRaw.rec) <= 0) return null;
      if (!withinUserQuota(entryKey, slot2, parsed.bytes) && slot2.kind === "u") return null;
    }
    const verified = await verifyParsedRecord(parsed, slot2.requiredRoles, fromPeerId);
    if (isDestroyed()) return null;
    if (verified === "invalid") {
      onInvalidRecord?.(fromPeerId);
      return null;
    }
    if (verified === "drop" || isPeerBanned(verified.rec.userId)) return null;
    if (slot2.kind === "u") {
      const curEpoch = getOnlineEpoch(entryKey);
      if (startedOnline) {
        if (curEpoch !== startEpoch) return null;
      } else {
        const joinedOnceWithoutLeaving = isUserOnline(entryKey) && curEpoch === startEpoch + 1;
        if (curEpoch !== startEpoch && !joinedOnceWithoutLeaving) return null;
      }
    }
    return commitEntry(slot2, verified.rec, verified.roles, verified.bytes, false, allowStageOffline && !startedOnline && getOnlineEpoch(entryKey) === startEpoch);
  };
  const getAuthorizedEntriesSorted = () => {
    const list2 = [];
    for (const slot2 of slots2.values()) for (const [entryKey, entry] of slot2.entries) {
      if (slot2.kind === "u" && !isUserOnline(entryKey)) continue;
      if (isRecordAuthorizedNow(entry.rec, slot2.requiredRoles)) list2.push([slot2.kind === "s" ? `s:${slot2.namespace}` : `u:${slot2.namespace}\0${entryKey}`, entry]);
    }
    list2.sort((a, b) => cmpStr(a[0], b[0]));
    return list2;
  };
  const buildDigestMap = (cursor) => {
    const digest = {};
    let count = 0;
    for (const [dKey, entry] of getAuthorizedEntriesSorted()) {
      if (cursor !== void 0 && cmpStr(dKey, cursor) <= 0) continue;
      if (count >= maxSyncRecordsPerBatch) break;
      digest[dKey] = [entry.rec.hlc, sig8(entry.rec)];
      count++;
    }
    return digest;
  };
  const sendSyncBatches = (peerId, records3, nextCursor, forwarded = false) => {
    if (!stateAction || isDestroyed() || !isPeerActive(peerId)) return;
    const sendSyncMsg = (p, r, includeCursor) => sendState({
      t: "sync",
      p,
      r,
      ...includeCursor && nextCursor ? { n: nextCursor } : {},
      ...forwarded ? { f: 1 } : {}
    }, peerId);
    if (!records3.length) {
      if (!forwarded) sendSyncMsg({}, [], true);
      return;
    }
    const chunks = [];
    let curP = {};
    let curR = [];
    let curBytes = 0;
    for (const rec of records3) {
      const wire = toWireRecord(rec, false);
      const est = estimateWireRecordBytes(wire);
      if (curR.length > 0 && curBytes + est > maxSyncChunkBytes) {
        chunks.push([curP, curR]);
        curP = {};
        curR = [];
        curBytes = 0;
      }
      curP[rec.userId] = rec.pub;
      curR.push(wire);
      curBytes += est;
    }
    if (curR.length > 0) chunks.push([curP, curR]);
    chunks.forEach(([p, r], i) => {
      sendSyncMsg(p, r, i === chunks.length - 1);
    });
  };
  const forwardAppliedToDirectOthers = (records3, excludePeerId) => {
    if (!stateAction || !records3.length || !isScaleActive()) return;
    for (const pid of getDirectPeerIds()) if (pid !== excludePeerId && !isPeerBanned(pid)) sendSyncBatches(pid, records3, void 0, true);
  };
  const isDirectSendable = (peerId) => isDirectPeer(peerId) && !isPeerBanned(peerId);
  const antiEntropy = createAntiEntropySync({
    maxPages: maxPullPages,
    canSync: () => Boolean(stateAction) && slots2.size > 0,
    getDirectPeers: getDirectPeerIds,
    isPeerSendable: isDirectSendable,
    sendPull: async (peerId, cursor) => {
      if (!stateAction || isDestroyed() || !isDirectSendable(peerId)) return;
      const msg = {
        t: "pull",
        d: buildDigestMap(cursor),
        ...cursor !== void 0 ? { c: cursor } : {}
      };
      await stateAction.send(msg, { target: peerId });
    }
  });
  if (stateAction) {
    const runWhenReady = (peerId, fn) => {
      const waitP = waitPeerReady(peerId);
      if (waitP === false) return;
      readyRoomForPeer(peerId, waitP).then((rid2) => rid2 !== null ? fn(rid2) : void 0).catch(noOp2);
    };
    stateAction.onMessage((raw, { peerId: fromPeerId }) => {
      if (isDestroyed() || isPeerBanned(fromPeerId) || !isObj(raw)) return;
      const msg = raw;
      if (msg.t === "rec") {
        if (!liveRateLimiter.consume(fromPeerId)) return;
        const rawUid = isObj(msg.r) && isStr(msg.r["userId"]) ? msg.r["userId"] : void 0;
        const ingress = rawUid ? captureUserIngress(rawUid) : void 0;
        runWhenReady(fromPeerId, async (roomId) => {
          const rec = fromWireRecord(msg.r, appId, roomId);
          if (!rec) {
            onInvalidRecord?.(fromPeerId);
            return;
          }
          if (isDirectPeer(fromPeerId) && rec.peerId === fromPeerId) {
            const knownUid = getKnownPeerUserId(fromPeerId);
            if (knownUid && knownUid !== rec.userId) {
              onInvalidRecord?.(fromPeerId);
              return;
            }
          }
          await applyIncoming(rec, fromPeerId, true, ingress);
        });
        return;
      }
      if (msg.t === "pull") {
        if (hitSyncQuota(fromPeerId) || !isObj(msg.d)) return;
        if (!isValidSyncCursor(msg.c)) {
          onInvalidRecord?.(fromPeerId);
          return;
        }
        const dEntries = entries3(msg.d);
        if (dEntries.length > maxSyncRecordsPerBatch) {
          onInvalidRecord?.(fromPeerId);
          return;
        }
        const remoteDigest = /* @__PURE__ */ new Map();
        for (const [k, v] of dEntries) {
          if (!Array.isArray(v) || v.length !== 2 || !isValidHlc(v[0]) || typeof v[1] !== "string" || v[1].length > 16) {
            onInvalidRecord?.(fromPeerId);
            return;
          }
          remoteDigest.set(k, [v[0], v[1]]);
        }
        const cursor = msg.c;
        runWhenReady(fromPeerId, () => {
          const afterCursor = getAuthorizedEntriesSorted().filter(([k]) => cursor === void 0 || cmpStr(k, cursor) > 0);
          const page = afterCursor.slice(0, maxSyncRecordsPerBatch);
          const nextCursor = afterCursor.length > maxSyncRecordsPerBatch ? page[page.length - 1][0] : void 0;
          const isNewerDigest = (hA, sA, hB, sB) => {
            const cmp = compareHlc(hA, hB);
            return cmp > 0 || cmp === 0 && sA !== sB;
          };
          const toSend = [];
          for (const [k, entry] of page) {
            const localRec = entry.rec;
            const rem = remoteDigest.get(k);
            if (!rem || isNewerDigest(localRec.hlc, sig8(localRec), rem[0], rem[1])) toSend.push(localRec);
          }
          sendSyncBatches(fromPeerId, toSend, nextCursor);
          if (cursor === void 0 && !antiEntropy.isPullInFlight(fromPeerId)) for (const [k, rem] of remoteDigest) {
            let slot2;
            let entryKey = "";
            if (k.startsWith("s:")) {
              const candidate = slots2.get(k);
              if (candidate?.kind === "s") slot2 = candidate;
            } else if (k.startsWith("u:")) {
              const sep = k.indexOf("\0");
              if (sep > 2) {
                const uid = k.slice(sep + 1);
                const candidate = slots2.get(k.slice(0, sep));
                if (candidate?.kind === "u" && isUserOnline(uid)) {
                  slot2 = candidate;
                  entryKey = uid;
                }
              }
            }
            if (!slot2) continue;
            const localEntry = slot2.entries.get(entryKey);
            const validLocal = localEntry && isRecordAuthorizedNow(localEntry.rec, slot2.requiredRoles) ? localEntry.rec : void 0;
            if (!validLocal || isNewerDigest(rem[0], rem[1], validLocal.hlc, sig8(validLocal))) {
              antiEntropy.pullPeer(fromPeerId, true);
              break;
            }
          }
        });
        return;
      }
      if (msg.t === "sync") {
        if (msg.f && !isScaleActive() || (msg.f ? hitFwdSyncQuota : hitSyncQuota)(fromPeerId) || !isObj(msg.p) || !Array.isArray(msg.r)) return;
        if (msg.r.length > maxSyncRecordsPerBatch || !isValidSyncCursor(msg.n)) {
          onInvalidRecord?.(fromPeerId);
          return;
        }
        if (!msg.f) antiEntropy.onSyncPage(fromPeerId, msg.n);
        const pubMap = msg.p;
        const ingressByUid = /* @__PURE__ */ new Map();
        for (const wireRec of msg.r) if (isObj(wireRec) && wireRec["k"] === "u" && isStr(wireRec["userId"])) {
          const uid = wireRec["userId"];
          if (!ingressByUid.has(uid)) ingressByUid.set(uid, captureUserIngress(uid));
        }
        runWhenReady(fromPeerId, async (roomId) => {
          const newlyApplied = [];
          for (const wireRec of msg.r) {
            if (isDestroyed() || isPeerBanned(fromPeerId)) return;
            const fullRec = fromWireRecord(wireRec, appId, roomId, pubMap);
            if (!fullRec) {
              onInvalidRecord?.(fromPeerId);
              return;
            }
            const applied = await applyIncoming(fullRec, fromPeerId, true, fullRec.k === "u" ? ingressByUid.get(fullRec.userId) : void 0);
            if (applied) newlyApplied.push(applied.rec);
          }
          forwardAppliedToDirectOthers(newlyApplied, fromPeerId);
        });
      }
    });
  }
  const obtainWriteAuth = async (reqRoles, ns, uid) => {
    const rp = getRolesProvider();
    if (rp) {
      const res = await rp.getStateWriteCert(reqRoles, ns);
      return [res.cert, res.roles];
    }
    if (reqRoles && reqRoles.length > 0) throw mkErr(`${insufficientAuthPrefix} to update state "${ns}": requires [${reqRoles.join(", ")}]`);
    return [null, [...getPeerRoles(uid)]];
  };
  const resolveOps = (ops) => {
    for (const op of ops) op.resolve();
  };
  const rejectOps = (ops, err) => {
    for (const op of ops) op.reject(err);
  };
  const rollbackOptimisticIfIdle = (slot2, uid) => {
    if (!slot2.optimistic || slot2.ops.length > 0) return;
    const prevOpt = slot2.optimistic;
    clearSlotOptimistic(slot2);
    const now2 = Date.now();
    const selfId = getSelfId();
    const roles2 = uid ? [...getPeerRoles(uid)] : [];
    if (slot2.kind === "s") {
      const curVal = slot2.entries.get("")?.value ?? slot2.initialValue;
      if (curVal !== prevOpt.value) slot2.emit(curVal, mkCtxBase(prevOpt.value, selfId, uid, roles2, now2));
    } else {
      const curLive = uid ? getLiveEntry(slot2, uid) : void 0;
      if (curLive) {
        if (prevOpt.del || curLive.value !== prevOpt.value) slot2.emit(curLive.value, {
          ...mkCtxBase(prevOpt.del ? slot2.initialValue : prevOpt.value, selfId, uid, roles2, now2),
          self: true,
          online: true,
          removed: false
        });
      } else if (!prevOpt.del) slot2.emit(void 0, {
        ...mkCtxBase(prevOpt.value, selfId, uid, roles2, now2),
        self: true,
        online: true,
        removed: true
      });
    }
  };
  const settleAbortedOrFailedBatch = (slot2, ops, err, uid) => {
    if (isDestroyed()) {
      resolveOps(ops);
      return;
    }
    rollbackOptimisticIfIdle(slot2, uid);
    rejectOps(ops, err);
  };
  const measureErr = (slot2, cand, code) => code === 1 && Array.isArray(canonicalizeAndMeasureJson(cand)) ? mkErr(`state "${slot2.namespace}" exceeds maxBytes (${slot2.maxBytes})`) : mkErr(`state "${slot2.namespace}" value must contain only finite JSON numbers`);
  const flushSlot = (slot2) => {
    switch (slot2.flushState.phase) {
      case "pacing":
      case "stepping":
        return slot2.flushState.flushPromise;
      case "idle":
        break;
      default:
        return unreachable(slot2.flushState);
    }
    const { promise: flushPromise, resolve: doneFlush } = Promise.withResolvers();
    (async () => {
      try {
        while (!isDestroyed() && slot2.ops.length > 0) {
          if (!(slot2.ops.some((op) => Boolean(op.urgent)) || !Number.isFinite(slot2.lastBroadcastAt) || isDestroyed())) {
            const waitMs = Math.min(minSlotBroadcastIntervalMs, minSlotBroadcastIntervalMs - (performance.now() - slot2.lastBroadcastAt));
            if (waitMs > 0) await new Promise((resolve3) => {
              let finished = false;
              const finish = () => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                resolve3();
              };
              const timer = setTimeout(finish, waitMs);
              unrefTimer(timer);
              slot2.flushState = {
                phase: "pacing",
                flushPromise,
                wake: finish
              };
            });
          }
          if (isDestroyed() || slot2.ops.length === 0) break;
          const { promise: stepPromise, resolve: doneStep } = Promise.withResolvers();
          const stepState = {
            phase: "stepping",
            flushPromise,
            stepPromise,
            signingHlc: null,
            activeOps: []
          };
          slot2.flushState = stepState;
          try {
            let readySelfId;
            let readyUser;
            let readyRoomId;
            let authCert;
            let authRoles;
            try {
              ({ selfId: readySelfId, user: readyUser, roomId: readyRoomId } = await ensureReady());
              if (isDestroyed()) {
                resolveOps(slot2.ops.splice(0));
                break;
              }
              [authCert, authRoles] = await obtainWriteAuth(slot2.requiredRoles, slot2.namespace, readyUser.userId);
            } catch (err) {
              settleAbortedOrFailedBatch(slot2, slot2.ops.splice(0), err, getLocalUserId());
              continue;
            }
            if (isDestroyed()) {
              resolveOps(slot2.ops.splice(0));
              break;
            }
            if (authCert) clock2.observe(authCert.iat);
            let remainingOps = slot2.ops.splice(0);
            if (!remainingOps.length) continue;
            stepState.activeOps.push(...remainingOps);
            const uid = readyUser.userId;
            const entryKey = slot2.kind === "s" ? "" : uid;
            for (let attempt = 0; attempt < maxFlushRetries && remainingOps.length > 0; attempt++) {
              if (isDestroyed()) {
                resolveOps(remainingOps);
                remainingOps = [];
                break;
              }
              const curRaw = slot2.entries.get(entryKey);
              const curLive = curRaw && !curRaw.rec.del ? curRaw : void 0;
              let simVal = curLive ? curLive.value : slot2.initialValue;
              let finalMode = null;
              let finalBytes = 0;
              let finalCanonJson;
              const accepted = [];
              const minHlcVal = maxHlc(curRaw?.rec.hlc ?? zeroHlc, [authCert?.iat ?? 0, 0]);
              const tentativeTs = Math.max(Date.now(), clock2.peek(), minHlcVal[0]);
              for (const op of remainingOps) {
                const baseUnchanged = curRaw?.rec.sig === op.baseSig;
                if (op.optimisticGen !== void 0 && (baseUnchanged || !op.updater)) {
                  if (op.del) {
                    simVal = slot2.initialValue;
                    finalMode = "del";
                    finalBytes = op.prevalidatedBytes ?? tombstoneBytes;
                    finalCanonJson = void 0;
                  } else {
                    simVal = op.next;
                    finalMode = "set";
                    finalBytes = op.prevalidatedBytes ?? 0;
                    finalCanonJson = op.prevalidatedJson;
                  }
                  accepted.push(op);
                  continue;
                }
                if (op.del) {
                  if (!withinUserQuota(uid, slot2, tombstoneBytes)) {
                    op.reject(quotaErr(slot2.namespace));
                    continue;
                  }
                  simVal = slot2.initialValue;
                  finalMode = "del";
                  finalBytes = tombstoneBytes;
                  finalCanonJson = void 0;
                  accepted.push(op);
                  continue;
                }
                const fnOrVal = op.updater ?? op.next;
                let cand;
                try {
                  cand = typeof fnOrVal === "function" ? fnOrVal(simVal) : fnOrVal;
                } catch (err) {
                  op.reject(err);
                  continue;
                }
                const measured = canonicalizeAndMeasureJson(cand, slot2.maxBytes);
                if (typeof measured === "number") {
                  op.reject(measureErr(slot2, cand, measured));
                  continue;
                }
                const [json, bytes] = measured;
                cand = fromJson(json);
                if (slot2.kind === "u" && !withinUserQuota(uid, slot2, bytes)) {
                  op.reject(quotaErr(slot2.namespace));
                  continue;
                }
                if (slot2.validate) {
                  const baseCtx = mkCtxBase(simVal, readySelfId, uid, authRoles, tentativeTs);
                  let isValid = false;
                  try {
                    isValid = slot2.kind === "s" ? slot2.validate(cand, baseCtx) : slot2.validate(cand, {
                      ...baseCtx,
                      self: true,
                      online: true,
                      removed: false
                    });
                  } catch (err) {
                    op.reject(err);
                    continue;
                  }
                  if (!isValid) {
                    op.reject(mkErr(`state validation failed for "${slot2.namespace}"`));
                    continue;
                  }
                }
                simVal = cand;
                finalMode = "set";
                finalBytes = bytes;
                finalCanonJson = json;
                accepted.push(op);
              }
              if (!accepted.length || !finalMode) {
                remainingOps = [];
                break;
              }
              const allowedSkewMs = Math.min(defaultMaxClockSkewMs, Math.max(stateMaxFutureSkewMs, authCert ? authCert.iat - Date.now() + 1e3 : 0, curRaw ? curRaw.rec.hlc[0] - Date.now() + 1e3 : 0));
              let rec;
              try {
                const nextHlcVal = clock2.nextHlc(slot2.namespace, minHlcVal, allowedSkewMs);
                stepState.signingHlc = nextHlcVal;
                rec = await signStateRecord(readyUser.sign, readyUser.signPubJwk, {
                  kind: slot2.kind,
                  appId,
                  roomId: readyRoomId,
                  ns: slot2.namespace,
                  hlc: nextHlcVal,
                  peerId: readySelfId,
                  userId: uid,
                  ...finalMode === "del" ? { del: true } : { val: simVal },
                  cert: authCert
                }, finalCanonJson);
              } catch (err) {
                settleAbortedOrFailedBatch(slot2, accepted, err, uid);
                remainingOps = [];
                break;
              } finally {
                stepState.signingHlc = null;
              }
              if (isDestroyed()) {
                clearSlotOptimistic(slot2);
                resolveOps(accepted);
                remainingOps = [];
                break;
              }
              if (!isRecordAuthorizedNow(rec, slot2.requiredRoles)) {
                rollbackOptimisticIfIdle(slot2, uid);
                rejectOps(accepted, mkErr(`${insufficientAuthPrefix} to update state "${slot2.namespace}"`));
                remainingOps = [];
                break;
              }
              const latestRaw = slot2.entries.get(entryKey);
              if (latestRaw && compareStateRecords(rec, latestRaw.rec) <= 0) {
                clock2.observe(latestRaw.rec.hlc[0]);
                if (accepted.some((op) => Boolean(op.updater))) {
                  remainingOps = accepted;
                  continue;
                }
                rollbackOptimisticIfIdle(slot2, uid);
                resolveOps(accepted);
                remainingOps = [];
                break;
              }
              const lastGen = accepted[accepted.length - 1]?.optimisticGen;
              const wasCurrentOptimistic = lastGen !== void 0 && slot2.optimistic?.gen === lastGen;
              const wasStaleOptimistic = lastGen !== void 0 && slot2.optimistic !== null && slot2.optimistic.gen > lastGen;
              if (wasCurrentOptimistic) clearSlotOptimistic(slot2);
              if (commitEntry(slot2, rec, authRoles, finalBytes, true, false, wasCurrentOptimistic || wasStaleOptimistic)) {
                slot2.lastBroadcastAt = performance.now();
                broadcastLiveRecord(rec);
              }
              resolveOps(accepted);
              remainingOps = [];
              break;
            }
            if (remainingOps.length > 0) settleAbortedOrFailedBatch(slot2, remainingOps, mkErr(`concurrent state contention exceeded for "${slot2.namespace}"`), uid);
          } finally {
            stepState.activeOps.length = 0;
            doneStep();
          }
        }
      } finally {
        slot2.flushState = { phase: "idle" };
        doneFlush();
      }
    })();
    return flushPromise;
  };
  const getEffectiveLocalValue = (slot2) => {
    if (slot2.optimistic) return slot2.optimistic.del ? slot2.initialValue : slot2.optimistic.value;
    if (slot2.kind === "s") return slot2.entries.get("")?.value ?? slot2.initialValue;
    const uid = getLocalUserId();
    return uid ? getLiveEntry(slot2, uid)?.value ?? slot2.initialValue : slot2.initialValue;
  };
  const resolveOptimisticMode = (slot2) => {
    if (isDestroyed()) return "noop";
    const localUid = getLocalUserId();
    if (!localUid) return "defer";
    if (isPeerBanned(localUid)) return mkErr(`${insufficientAuthPrefix} to update state "${slot2.namespace}"`);
    if (slot2.requiredRoles === null || slot2.requiredRoles.length === 0) return "sync";
    const rp = getRolesProvider();
    if (!rp) return hasRolesPlugin() ? "defer" : mkErr(`${insufficientAuthPrefix} to update state "${slot2.namespace}": requires [${slot2.requiredRoles.join(", ")}]`);
    if (!rp.isAuthorityResolved()) return "defer";
    const held = rp.getPeerRoles(localUid);
    if (!slot2.requiredRoles.some((r) => held.includes(r))) return mkErr(`${insufficientAuthPrefix} to update state "${slot2.namespace}": requires [${slot2.requiredRoles.join(", ")}]`);
    return "sync";
  };
  const enqueueSlotOp = (slot2, del2, next2) => {
    const mode = resolveOptimisticMode(slot2);
    if (mode === "noop") return Promise.resolve();
    if (mode instanceof Error) return Promise.reject(mode);
    if (mode === "defer") return enqueuePendingOp(slot2, {
      del: del2,
      next: next2
    });
    const localUid = getLocalUserId();
    const selfId = getSelfId();
    const roles2 = localUid ? [...getPeerRoles(localUid)] : [];
    const prevVal = getEffectiveLocalValue(slot2);
    const now2 = Math.max(Date.now(), clock2.peek());
    if (del2) {
      if (!withinUserQuota(localUid, slot2, tombstoneBytes)) return Promise.reject(quotaErr(slot2.namespace));
      const wasLive = slot2.optimistic ? !slot2.optimistic.del : Boolean(localUid && getLiveEntry(slot2, localUid));
      const gen2 = ++slot2.optGen;
      setSlotOptimistic(slot2, {
        gen: gen2,
        del: true,
        value: slot2.initialValue,
        prev: prevVal,
        bytes: tombstoneBytes,
        timestamp: now2
      });
      if (wasLive && slot2.kind === "u") slot2.emit(void 0, {
        ...mkCtxBase(prevVal, selfId, localUid, roles2, now2),
        self: true,
        online: true,
        removed: true
      });
      return enqueuePendingOp(slot2, {
        del: true,
        next: void 0,
        optimisticGen: gen2,
        prevalidatedBytes: tombstoneBytes
      });
    }
    let cand;
    try {
      cand = typeof next2 === "function" ? next2(prevVal) : next2;
    } catch (err) {
      return Promise.reject(err);
    }
    const measured = canonicalizeAndMeasureJson(cand, slot2.maxBytes);
    if (typeof measured === "number") return Promise.reject(measureErr(slot2, cand, measured));
    const [json, bytes] = measured;
    cand = fromJson(json);
    if (slot2.kind === "u" && !withinUserQuota(localUid, slot2, bytes)) return Promise.reject(quotaErr(slot2.namespace));
    const baseCtx = mkCtxBase(prevVal, selfId, localUid, roles2, now2);
    if (slot2.validate) {
      let isValid = false;
      try {
        isValid = slot2.kind === "s" ? slot2.validate(cand, baseCtx) : slot2.validate(cand, {
          ...baseCtx,
          self: true,
          online: true,
          removed: false
        });
      } catch (err) {
        return Promise.reject(err);
      }
      if (!isValid) return Promise.reject(mkErr(`state validation failed for "${slot2.namespace}"`));
    }
    const gen = ++slot2.optGen;
    setSlotOptimistic(slot2, {
      gen,
      del: false,
      value: cand,
      prev: prevVal,
      bytes,
      timestamp: now2
    });
    if (slot2.kind === "s") slot2.emit(cand, baseCtx);
    else slot2.emit(cand, {
      ...baseCtx,
      self: true,
      online: true,
      removed: false
    });
    const curEntryKey = slot2.kind === "s" ? "" : localUid;
    const baseSig = slot2.entries.get(curEntryKey)?.rec.sig;
    return enqueuePendingOp(slot2, {
      del: false,
      next: cand,
      ...typeof next2 === "function" ? { updater: next2 } : {},
      ...baseSig !== void 0 ? { baseSig } : {},
      optimisticGen: gen,
      prevalidatedJson: json,
      prevalidatedBytes: bytes
    });
  };
  const createSlotBase = (namespace, initialValue, requiredRoles, maxBytes, clearListeners) => ({
    namespace,
    initialValue,
    requiredRoles,
    maxBytes,
    entries: /* @__PURE__ */ new Map(),
    optimistic: null,
    optGen: 0,
    snapshot: null,
    clearListeners,
    api: null,
    ops: [],
    flushState: { phase: "idle" },
    lastBroadcastAt: -Infinity
  });
  const registerSlot = (mapKey, slot2, api) => {
    slot2.api = api;
    if (!isDestroyed()) {
      slots2.set(mapKey, slot2);
      antiEntropy.scheduleRepull();
    }
    return api;
  };
  const makeState = ((namespace, initialValue, config) => {
    const mapKey = `s:${namespace}`;
    const existing = slots2.get(mapKey);
    if (existing) return existing.api;
    const [initVal, maxBytes, reqRoles] = validateSlotArgs(namespace, initialValue, config?.maxBytes, config?.roles, hasRolesPlugin() || Boolean(getRolesProvider()), true, "makeState", "state role gating");
    const [subEmitter, emitEmitter, clearEmitter] = createEventEmitter("state handler");
    const validate = config?.validate;
    const slot2 = {
      ...createSlotBase(namespace, initVal, reqRoles, maxBytes, clearEmitter),
      kind: "s",
      ...validate ? { validate } : {},
      emit: emitEmitter
    };
    const currentMeta = () => {
      if (slot2.optimistic) {
        const uid = getLocalUserId();
        return mkCtxBase(slot2.optimistic.prev, getSelfId(), uid, uid ? [...getPeerRoles(uid)] : [], slot2.optimistic.timestamp);
      }
      const entry = slot2.entries.get("");
      return entry ? toSharedCtx(entry.rec, entry.prev, entry.roles) : null;
    };
    return registerSlot(mapKey, slot2, lockMethods({
      get: () => getEffectiveLocalValue(slot2),
      set: (next2) => enqueueSlotOp(slot2, false, next2),
      getMeta: currentMeta,
      onChange: (handler, options) => subEmitter(handler, options, () => {
        const meta = currentMeta();
        return meta ? [[getEffectiveLocalValue(slot2), meta]] : [];
      })
    }, ["onChange"]));
  });
  const makeUserState = ((namespace, initialValue, config) => {
    const mapKey = `u:${namespace}`;
    const existing = slots2.get(mapKey);
    if (existing) return existing.api;
    const [initVal, maxBytes, reqRoles] = validateSlotArgs(namespace, initialValue, config?.maxBytes, config?.roles, hasRolesPlugin() || Boolean(getRolesProvider()), false, "makeUserState", "user state role gating");
    const [subEmitter, emitEmitter, clearEmitter] = createEventEmitter("user state handler");
    const validate = config?.validate;
    const slot2 = {
      ...createSlotBase(namespace, initVal, reqRoles, maxBytes, clearEmitter),
      kind: "u",
      ...validate ? { validate } : {},
      emit: emitEmitter
    };
    const resolveTarget = (args) => {
      const localUid = getLocalUserId();
      if (args.length === 0) return [true, localUid || void 0];
      const id = args[0];
      if (!id) return [false, void 0];
      const selfId = getSelfId();
      if (selfId !== "" && id === selfId || localUid !== "" && id === localUid) return [true, localUid || void 0];
      const mapped = getLiveEntry(slot2, id) ? id : getKnownPeerUserId(id) ?? id;
      return [localUid !== "" && mapped === localUid, mapped];
    };
    const localOptMeta = () => {
      if (!slot2.optimistic || slot2.optimistic.del) return null;
      const uid = getLocalUserId();
      return {
        ...mkCtxBase(slot2.optimistic.prev, getSelfId(), uid, uid ? [...getPeerRoles(uid)] : [], slot2.optimistic.timestamp),
        self: true,
        online: true,
        removed: false
      };
    };
    return registerSlot(mapKey, slot2, lockMethods({
      get: (...args) => {
        const [isSelf, uid] = resolveTarget(args);
        if (isSelf && slot2.optimistic) return slot2.optimistic.del ? slot2.initialValue : slot2.optimistic.value;
        return uid !== void 0 ? getLiveEntry(slot2, uid)?.value ?? slot2.initialValue : slot2.initialValue;
      },
      getAll: () => {
        if (!slot2.snapshot) {
          const out = {};
          for (const [uid, entry] of slot2.entries) if (!entry.rec.del) out[uid] = entry.value;
          const localUid = getLocalUserId();
          if (slot2.optimistic && localUid) {
            if (slot2.optimistic.del) delete out[localUid];
            else out[localUid] = slot2.optimistic.value;
          }
          slot2.snapshot = Object.freeze(out);
        }
        return slot2.snapshot;
      },
      has: (...args) => {
        const [isSelf, uid] = resolveTarget(args);
        if (isSelf && slot2.optimistic) return !slot2.optimistic.del;
        return Boolean(uid !== void 0 && getLiveEntry(slot2, uid));
      },
      set: (next2) => enqueueSlotOp(slot2, false, next2),
      clear: () => enqueueSlotOp(slot2, true),
      getMeta: (...args) => {
        const [isSelf, uid] = resolveTarget(args);
        if (isSelf && slot2.optimistic) return localOptMeta();
        const entry = uid ? getLiveEntry(slot2, uid) : void 0;
        return entry ? toUserCtx(entry.rec, entry.prev, entry.roles, false) : null;
      },
      onChange: (handler, options) => subEmitter(handler, options, () => {
        const items = [];
        const localUid = getLocalUserId();
        let includedLocalOpt = false;
        for (const [uid, entry] of slot2.entries) {
          if (slot2.optimistic && localUid && uid === localUid) {
            includedLocalOpt = true;
            const optMeta = localOptMeta();
            if (optMeta) items.push([slot2.optimistic.value, optMeta]);
            continue;
          }
          if (!entry.rec.del) items.push([entry.value, toUserCtx(entry.rec, entry.prev, entry.roles, false)]);
        }
        if (slot2.optimistic && !includedLocalOpt) {
          const optMeta = localOptMeta();
          if (optMeta) items.push([slot2.optimistic.value, optMeta]);
        }
        return items;
      })
    }, ["onChange"]));
  });
  const prepareHandshakeReady = (peerId) => {
    if (isDestroyed() || !isPeerLiveOrPending(peerId) || isPeerBanned(peerId)) return;
    const localUid = getLocalUserId();
    let hasUserWork = false;
    for (const slot2 of slots2.values()) if (slot2.kind === "u" && (slot2.flushState.phase !== "idle" || slot2.ops.length > 0 || Boolean(localUid && getLiveEntry(slot2, localUid)))) {
      hasUserWork = true;
      break;
    }
    if (!hasUserWork) return;
    return (async () => {
      try {
        const steps = [];
        for (const slot2 of slots2.values()) {
          if (slot2.kind !== "u") continue;
          const hasQueuedOps = slot2.ops.length > 0;
          if (hasQueuedOps) for (const op of slot2.ops) {
            op.urgent = true;
            steps.push(op.promise.then(noOp2, noOp2));
          }
          switch (slot2.flushState.phase) {
            case "pacing":
              if (hasQueuedOps) slot2.flushState.wake();
              break;
            case "idle":
              if (hasQueuedOps) flushSlot(slot2);
              break;
            case "stepping":
              if (!hasQueuedOps) steps.push(slot2.flushState.stepPromise);
              break;
            default:
              unreachable(slot2.flushState);
          }
        }
        if (steps.length > 0) {
          let timer;
          await Promise.race([Promise.allSettled(steps), new Promise((r2) => {
            timer = setTimeout(r2, handshakeStateDeadlineMs);
            unrefTimer(timer);
          })]);
          if (timer !== void 0) clearTimeout(timer);
        }
        const uid = getLocalUserId();
        if (!uid || isDestroyed() || !isPeerLiveOrPending(peerId) || isPeerBanned(peerId)) return;
        const p = {};
        const r = [];
        const sentSigs = /* @__PURE__ */ new Set();
        let usedBytes = 0;
        for (const slot2 of slots2.values()) {
          if (slot2.kind !== "u") continue;
          const entry = getLiveEntry(slot2, uid);
          if (!entry) continue;
          const wire = toWireRecord(entry.rec, false);
          const est = estimateWireRecordBytes(wire);
          if (usedBytes + est > maxHandshakeStateBytes) continue;
          p[entry.rec.userId] = entry.rec.pub;
          r.push(wire);
          sentSigs.add(entry.rec.sig);
          usedBytes += est;
        }
        if (sentSigs.size > 0) sentHandshakeSigs.set(peerId, sentSigs);
        return r.length > 0 ? {
          ok: true,
          p,
          r
        } : void 0;
      } catch {
        return;
      }
    })();
  };
  const shouldAbortStaging = (peerId) => isDestroyed() || !isPeerLiveOrPending(peerId) || isPeerBanned(peerId);
  const stageHandshakeUserState = async (fromPeerId, payload, onReady) => {
    try {
      const badShape = !isObj(payload.p) || !Array.isArray(payload.r) || payload.r.length > 32;
      if (shouldAbortStaging(fromPeerId) || badShape) {
        if (!isDestroyed() && badShape) onInvalidRecord?.(fromPeerId);
        return;
      }
      let roomId;
      try {
        ({ roomId } = await ensureReady());
      } catch {
        return;
      }
      if (shouldAbortStaging(fromPeerId)) return;
      const pubMap = payload.p;
      const knownUid = getKnownPeerUserId(fromPeerId);
      const staged = [];
      let totalBytes = 0;
      const now2 = Date.now();
      for (const wireRec of payload.r) {
        if (shouldAbortStaging(fromPeerId)) return;
        const rec = fromWireRecord(wireRec, appId, roomId, pubMap);
        const parsed = rec && rec.k === "u" ? validateAndMeasureRecord(rec, maxAllowedStateBytes) : null;
        if (!parsed || knownUid && parsed.rec.userId !== knownUid) {
          onInvalidRecord?.(fromPeerId);
          return;
        }
        const slot2 = slots2.get(`u:${parsed.rec.ns}`);
        if (!slot2 || slot2.kind !== "u") continue;
        if (parsed.bytes > slot2.maxBytes) continue;
        const res = await verifyParsedRecord(parsed, slot2.requiredRoles, fromPeerId);
        if (shouldAbortStaging(fromPeerId)) return;
        if (res === "invalid") {
          onInvalidRecord?.(fromPeerId);
          return;
        }
        if (res === "drop") continue;
        totalBytes += res.bytes;
        if (totalBytes > maxUserStateBytesPerUser) return;
        staged.push({
          slot: slot2,
          rec: res.rec,
          roles: res.roles,
          bytes: res.bytes,
          seenAt: now2
        });
      }
      if (!shouldAbortStaging(fromPeerId) && staged.length > 0) stagedHandshake.set(fromPeerId, staged);
    } finally {
      onReady?.();
    }
  };
  const sendLocalRecordsToPeer = (peerId, alreadySent) => {
    const localUid = getLocalUserId();
    if (!localUid || !stateAction || isDestroyed()) return;
    const localRecords = [];
    for (const slot2 of slots2.values()) {
      const entry = slot2.entries.get(slot2.kind === "s" ? "" : localUid);
      if (entry && entry.rec.userId === localUid && !alreadySent?.has(entry.rec.sig) && isRecordAuthorizedNow(entry.rec, slot2.requiredRoles)) localRecords.push(entry.rec);
    }
    if (localRecords.length === 0) return;
    if (isScaleActive()) sendSyncBatches(peerId, localRecords, void 0, true);
    else for (const rec of localRecords) sendState({
      t: "rec",
      r: toWireRecord(rec, true)
    }, peerId);
  };
  const onPeerJoined = (peerId, userId, isDirect) => {
    if (isDestroyed()) return;
    const alreadySent = sentHandshakeSigs.get(peerId);
    sentHandshakeSigs.delete(peerId);
    const staged = stagedHandshake.get(peerId);
    if (staged) {
      stagedHandshake.delete(peerId);
      const appliedHandshake = [];
      for (const item2 of staged) if (item2.rec.userId === userId) {
        const entry = commitEntry(item2.slot, item2.rec, item2.roles, item2.bytes);
        if (entry) appliedHandshake.push(entry.rec);
      } else onInvalidRecord?.(peerId);
      forwardAppliedToDirectOthers(appliedHandshake, peerId);
    }
    const stagedOffline = pendingOfflineUserRecs.get(userId);
    if (stagedOffline) {
      pendingOfflineUserRecs.delete(userId);
      const now2 = Date.now();
      const appliedOffline = [];
      for (const item2 of stagedOffline.values()) if (now2 - item2.seenAt < offlineStagingTtlMs && slots2.get(`u:${item2.slot.namespace}`) === item2.slot && isRecordAuthorizedNow(item2.rec, item2.slot.requiredRoles)) {
        const entry = commitEntry(item2.slot, item2.rec, item2.roles, item2.bytes);
        if (entry) appliedOffline.push(entry.rec);
      }
      forwardAppliedToDirectOthers(appliedOffline, peerId);
    }
    resolvePendingJoin(peerId, true);
    if (isDirect && stateAction && slots2.size > 0) {
      sendLocalRecordsToPeer(peerId, alreadySent);
      antiEntropy.onPeerJoined(peerId, isScaleActive());
    }
  };
  const clearPeer = (peerId) => {
    stagedHandshake.delete(peerId);
    sentHandshakeSigs.delete(peerId);
    liveRateLimiter.delete(peerId);
    resolvePendingJoin(peerId, false);
    antiEntropy.onPeerDisconnected(peerId);
  };
  const onPeerDisconnected = (peerId) => {
    clearPeer(peerId);
  };
  const onUserLeft = (userId) => {
    if (isDestroyed() || isUserOnline(userId)) return;
    pendingOfflineUserRecs.delete(userId);
    const now2 = Date.now();
    for (const slot2 of slots2.values()) if (slot2.kind === "u") {
      const entry = slot2.entries.get(userId);
      if (entry) evictEntry(slot2, userId, entry, now2, [...entry.roles]);
    }
  };
  const purgeBannedUser = (bannedUid) => {
    if (isDestroyed()) return;
    setUserPresence(bannedUid, false);
    pendingOfflineUserRecs.delete(bannedUid);
    const localUid = getLocalUserId();
    const now2 = Date.now();
    let evictedShared = false;
    for (const slot2 of slots2.values()) {
      if (localUid && bannedUid === localUid) clearSlotOptimistic(slot2);
      const key = slot2.kind === "s" ? "" : bannedUid;
      const entry = slot2.entries.get(key);
      if (entry && (slot2.kind === "u" || entry.rec.userId === bannedUid)) {
        evictEntry(slot2, key, entry, now2, []);
        if (slot2.kind === "s") evictedShared = true;
      }
    }
    if (evictedShared) antiEntropy.scheduleRepull();
  };
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    antiEntropy.destroy();
    stagedHandshake.clear();
    sentHandshakeSigs.clear();
    pendingOfflineUserRecs.clear();
    activeOnlineUsers.clear();
    onlineEpoch.clear();
    liveRateLimiter.clear();
    pendingJoinWaiters.forEach((waiter) => waiter.resolve(false));
    pendingJoinWaiters.clear();
    slots2.forEach((slot2) => {
      clearSlotOptimistic(slot2);
      const queuedOps = slot2.ops.splice(0);
      let inFlightOps = [];
      switch (slot2.flushState.phase) {
        case "pacing":
          slot2.flushState.wake();
          slot2.flushState = { phase: "idle" };
          break;
        case "stepping":
          inFlightOps = slot2.flushState.activeOps.splice(0);
          break;
        case "idle":
          break;
        default:
          unreachable(slot2.flushState);
      }
      resolveOps(inFlightOps);
      resolveOps(queuedOps);
      slot2.clearListeners();
    });
  };
  return {
    makeState,
    makeUserState,
    verifyAndApplyStateRecord: async (rec, fromPeerId) => Boolean(await applyIncoming(rec, fromPeerId)),
    prepareHandshakeReady,
    stageHandshakeUserState,
    setUserPresence,
    onPeerJoined,
    onPeerDisconnected,
    onUserLeft,
    purgeBannedUser,
    clearPeer,
    destroy
  };
};

// node_modules/@trystero-p2p/core/dist/room.mjs
var leaveFlushGraceMs = 50;
var unloadEvent = "beforeunload";
var beforeUnloadRoomCleanups = /* @__PURE__ */ new Set();
var frozenEmptyRoles = Object.freeze([]);
var cleanupActiveRoomsOnBeforeUnload = () => beforeUnloadRoomCleanups.forEach((cleanup) => cleanup());
var registerBeforeUnloadCleanup = (cleanup) => {
  beforeUnloadRoomCleanups.add(cleanup);
  if (beforeUnloadRoomCleanups.size === 1) addEventListener(unloadEvent, cleanupActiveRoomsOnBeforeUnload);
  return () => {
    beforeUnloadRoomCleanups.delete(cleanup);
    if (!beforeUnloadRoomCleanups.size) removeEventListener(unloadEvent, cleanupActiveRoomsOnBeforeUnload);
  };
};
var isPromiseLike = (val) => Boolean(val && typeof val === "object" && typeof val.then === "function");
var extractPluginSlots = (use, initialRoomId, identity) => {
  if (use !== void 0 && !Array.isArray(use)) throw mkErr("use must be an array of room plugins");
  let rolesSlot = null;
  let scaleSlot = null;
  for (const item2 of use ?? []) {
    const slot2 = item2 && typeof item2 === "object" ? item2[pluginSlotSymbol] : void 0;
    if (!slot2) throw mkErr("invalid plugin in use[]; expected roles() or scale()");
    if (slot2.kind === "roles") {
      if (rolesSlot) throw mkErr('duplicate plugin "roles" in use[]');
      rolesSlot = slot2;
    } else {
      if (scaleSlot) throw mkErr('duplicate plugin "scale" in use[]');
      scaleSlot = slot2;
    }
  }
  if (!rolesSlot && selfCertifyingRoomRegex.test(initialRoomId)) throw selfCertRoomRolesErr;
  if (rolesSlot?.selfAsAdmin && isEphemeralIdentityConfig(identity)) warnEphemeralAdmin();
  return [rolesSlot, scaleSlot];
};
var isRoomLeavingOrLeft = (state) => state.phase === "leaving" || state.phase === "left";
var isPendingDirectSession = (session2) => session2.phase === "direct-pending" || session2.phase === "virtual-upgrading";
var hasVirtualSession = (session2) => session2.phase === "virtual-only" || session2.phase === "virtual-upgrading";
var createRoomWithBridge = (onPeer, onPeerLeave, onSelfLeave, roomOptions = {}) => {
  const { endpointIdentity, clientId, appId = "", roomId: initialRoomId = "", password = "", maxUsers, identity, maxReceiveBytes, onBeforeLeave } = roomOptions;
  if (maxUsers !== void 0 && !isPosSafeInt(maxUsers)) throw posSafeIntErr("maxUsers");
  if (identity !== void 0) validateIdentityConfig({ identity });
  const [rolesSlot, scaleSlot] = extractPluginSlots(roomOptions.use, initialRoomId, identity);
  const hasRolesPlugin = Boolean(rolesSlot);
  const syncEndpoint = endpointIdentity && !isPromiseLike(endpointIdentity) ? endpointIdentity : void 0;
  const effectiveClientId = clientId ?? (syncEndpoint ? syncEndpoint.peerId : createIdentityClientId());
  let localSelfId = syncEndpoint ? syncEndpoint.peerId : "";
  let localUserId = "";
  let roomLifecycle = { phase: "active" };
  let didReportSetupError = false;
  let effectiveRoomId = initialRoomId;
  let rolesProvider = null;
  let scaleProvider = null;
  let cachedUsersSnapshot = null;
  const getLocalSelfId = () => localSelfId;
  const getLocalUserId = () => localUserId;
  const isLeavingOrLeft = () => isRoomLeavingOrLeft(roomLifecycle);
  const canAcceptPeers = () => roomLifecycle.phase === "active";
  const invalidateUsersSnapshot = () => {
    cachedUsersSnapshot = null;
  };
  const pendingFlushDestroys = /* @__PURE__ */ new Set();
  const cleanups = [];
  const mkEv = (name2) => {
    const [sub, emit, clear] = createEventEmitter(name2);
    cleanups.push(clear);
    return [sub, emit];
  };
  const [subPeerActivated, emitPeerActivated] = mkEv("onPeerActivated");
  const [subPeerDeactivated, emitPeerDeactivated] = mkEv("onPeerDeactivated");
  const [subRoomIdChanged, emitRoomIdChanged] = mkEv("onRoomIdChanged");
  const [subLeave, emitLeave] = mkEv("onLeave");
  const [subPeerJoin, emitPeerJoin] = mkEv("onPeerJoin");
  const [subPeerLeave, emitPeerLeave] = mkEv("onPeerLeave");
  const [subUserJoin, emitUserJoin] = mkEv("onUserJoin");
  const [subUserLeave, emitUserLeave] = mkEv("onUserLeave");
  const [subError, emitError] = mkEv("onError");
  const emitRoomError = (error) => {
    if (!isLeavingOrLeft()) emitError({
      ...error,
      appId,
      roomId: effectiveRoomId
    });
  };
  const failSetup = (error) => {
    if (didReportSetupError || roomLifecycle.phase !== "active") return;
    didReportSetupError = true;
    roomLifecycle = { phase: "setup-failed" };
    queueMicrotask(() => {
      emitRoomError(error);
      leave();
    });
  };
  const localEndpointP = (endpointIdentity ? Promise.resolve(endpointIdentity) : getDefaultEndpointIdentity(appId, effectiveClientId)).then((ep) => {
    localSelfId = ep.peerId;
    return ep;
  }, (err) => {
    failSetup({
      code: "identity-failed",
      message: toErrorMessage(err, "endpoint identity resolution failed"),
      cause: err
    });
    throw err;
  });
  localEndpointP.catch(noOp2);
  const localSelfIdP = localSelfId ? Promise.resolve(localSelfId) : localEndpointP.then((ep) => ep.peerId);
  localSelfIdP.catch(noOp2);
  const setEffectiveRoomId = (rid2) => {
    if (rid2 && rid2 !== effectiveRoomId) {
      effectiveRoomId = rid2;
      emitRoomIdChanged(rid2);
    }
  };
  const peerEntries = /* @__PURE__ */ new Map();
  const resolvedUserIdentityP = resolveUserIdentity(appId, initialRoomId, identity === void 0 ? void 0 : { identity }, effectiveClientId).then((resolvedId) => {
    localUserId = resolvedId.userId;
    if (!isLeavingOrLeft()) stateMgr?.setUserPresence(localUserId, true);
    invalidateUsersSnapshot();
    return resolvedId;
  }, (err) => {
    failSetup({
      code: "identity-failed",
      message: toErrorMessage(err, "identity resolution failed"),
      cause: err
    });
    throw err;
  });
  resolvedUserIdentityP.catch(noOp2);
  const effectiveRoomIdP = rolesSlot?.selfAsAdmin && !selfCertifyingRoomRegex.test(initialRoomId) ? resolvedUserIdentityP.then((u) => {
    const rid2 = formatSelfCertifyingRoomId(initialRoomId, u.userId);
    if (!isLeavingOrLeft()) setEffectiveRoomId(rid2);
    return rid2;
  }) : void 0;
  effectiveRoomIdP?.catch(noOp2);
  const isActiveEntry = (entry) => Boolean(entry && entry.session.phase !== "direct-pending");
  const hasSessionEntry = (entry, includePending) => includePending ? Boolean(entry) : isActiveEntry(entry);
  const isEntryVerified = (entry) => entry.session.phase === "direct-active" || isPendingDirectSession(entry.session) && entry.session.verified;
  const getPeerUserId = (id) => {
    const selfId = getLocalSelfId();
    return selfId && id === selfId ? getLocalUserId() : peerEntries.get(id)?.userId ?? scaleProvider?.getPeerUserId(id) ?? id;
  };
  const getKnownPeerUserId = (id) => {
    const selfId = getLocalSelfId();
    return selfId && id === selfId ? getLocalUserId() || void 0 : peerEntries.get(id)?.userId ?? scaleProvider?.getPeerUserId(id);
  };
  const countActivePeersForUser = (uid, excludePeerId) => {
    let count = 0;
    for (const [pid, entry] of peerEntries) if (pid !== excludePeerId && isActiveEntry(entry) && getPeerUserId(pid) === uid) count++;
    return count;
  };
  const reconcileUserChangeOnActiveEntry = (peerId, entry, nextUid) => {
    const prevEmitted = entry.emittedUserId;
    if (!prevEmitted || prevEmitted === nextUid) {
      entry.emittedUserId = nextUid;
      if (!prevEmitted && !isLeavingOrLeft()) stateMgr?.setUserPresence(nextUid, true);
      return;
    }
    const localUid = getLocalUserId();
    const wasLastForPrev = countActivePeersForUser(prevEmitted, peerId) === 0;
    const isFirstForNext = countActivePeersForUser(nextUid, peerId) === 0;
    entry.emittedUserId = nextUid;
    if (!isLeavingOrLeft()) {
      if (wasLastForPrev && (!localUid || prevEmitted !== localUid)) {
        emitUserLeave({
          userId: prevEmitted,
          peerId
        });
        stateMgr?.setUserPresence(prevEmitted, false);
        stateMgr?.onUserLeft(prevEmitted);
      }
      if (isFirstForNext && (!localUid || nextUid !== localUid)) {
        stateMgr?.setUserPresence(nextUid, true);
        stateMgr?.onPeerJoined(peerId, nextUid, isDirectPeer(peerId));
        emitUserJoin({
          userId: nextUid,
          peerId,
          roles: getPeerRoles(peerId)
        });
      }
    }
  };
  const setPeerUserId = (id, uid) => {
    if (!uid) return;
    const entry = peerEntries.get(id);
    if (!entry || isEntryVerified(entry)) return;
    if (entry.userId !== uid) {
      entry.userId = uid;
      invalidateUsersSnapshot();
      if (isActiveEntry(entry)) reconcileUserChangeOnActiveEntry(id, entry, uid);
    }
  };
  const isDirectPeer = (id) => peerEntries.get(id)?.session.phase === "direct-active";
  const isPeerActive = (id) => isActiveEntry(peerEntries.get(id));
  const hasAnyPeer = (id) => peerEntries.has(id);
  const getDirectPeer = (id, includePending = false) => {
    const session2 = peerEntries.get(id)?.session;
    if (!session2 || session2.phase === "virtual-only") return;
    if (session2.phase === "direct-active") return session2.peer;
    return includePending ? session2.peer : void 0;
  };
  const getPeerIds = (includePending = false) => {
    const ids = [];
    for (const [id, entry] of peerEntries) if (hasSessionEntry(entry, includePending)) ids.push(id);
    return ids;
  };
  const getDirectPeerEntries = (activeOnly = true) => {
    const list2 = [];
    for (const id of peerEntries.keys()) {
      const peer = getDirectPeer(id, !activeOnly);
      if (peer) list2.push([id, peer]);
    }
    return list2;
  };
  const getDirectPeerIds = (activeOnly = true) => getDirectPeerEntries(activeOnly).map((pair) => pair[0]);
  const resetDirectSessionOnEntry = (id, entry) => {
    delete entry.deferredReady;
    switch (entry.session.phase) {
      case "virtual-upgrading":
        entry.session = {
          phase: "virtual-only",
          virtual: entry.session.virtual
        };
        invalidateUsersSnapshot();
        return;
      case "direct-pending":
      case "direct-active":
        peerEntries.delete(id);
        invalidateUsersSnapshot();
        return;
      case "virtual-only":
        return;
      default:
        unreachable(entry.session);
    }
  };
  const findPeersForUser = (uid, includePending) => {
    const matching = [];
    for (const [pid, entry] of peerEntries) if (hasSessionEntry(entry, includePending) && getPeerUserId(pid) === uid) matching.push(pid);
    return matching;
  };
  const getUserPeerIds = (uid) => {
    const active = findPeersForUser(uid, false);
    return active.length ? active : findPeersForUser(uid, true);
  };
  const resolveSendTarget = (targets, includePending = false) => {
    if (!targets) return;
    const resolved = [];
    const seen3 = /* @__PURE__ */ new Set();
    const addPeer = (pid) => {
      if (!seen3.has(pid)) {
        seen3.add(pid);
        resolved.push(pid);
      }
    };
    for (const id of Array.isArray(targets) ? targets : [targets]) if (hasSessionEntry(peerEntries.get(id), includePending)) addPeer(id);
    else {
      const matched = findPeersForUser(id, includePending);
      if (matched.length) matched.forEach(addPeer);
      else addPeer(id);
    }
    return resolved;
  };
  const resolveRequestTarget = (target, includePending = false) => hasSessionEntry(peerEntries.get(target), includePending) ? target : findPeersForUser(target, includePending).sort((a, b) => {
    const aDirect = isDirectPeer(a);
    return aDirect !== isDirectPeer(b) ? aDirect ? -1 : 1 : cmpStr(a, b);
  })[0];
  const isPeerBanned = (id) => Boolean(id && rolesProvider?.isPeerBanned(id));
  const getPeerRoles = (id = getLocalSelfId()) => rolesProvider?.getPeerRoles(id) ?? frozenEmptyRoles;
  let stateMgr = null;
  const emitActivatedEvents = (peerId, uid, isFirstForUser) => {
    if (isLeavingOrLeft()) return;
    const localUid = getLocalUserId();
    if (isFirstForUser && (!localUid || uid !== localUid)) stateMgr?.setUserPresence(uid, true);
    stateMgr?.onPeerJoined(peerId, uid, isDirectPeer(peerId));
    const roles2 = getPeerRoles(peerId);
    emitPeerJoin({
      peerId,
      userId: uid,
      roles: roles2
    });
    if (isFirstForUser && (!localUid || uid !== localUid)) emitUserJoin({
      userId: uid,
      peerId,
      roles: roles2
    });
  };
  const emitDeactivatedEvents = (peerId, wasActive, isLastForUser, uid) => {
    if (!wasActive) return;
    const localUid = getLocalUserId();
    stateMgr?.onPeerDisconnected(peerId);
    emitPeerDeactivated(peerId);
    if (!isLeavingOrLeft()) {
      emitPeerLeave({
        peerId,
        userId: uid
      });
      if (isLastForUser && (!localUid || uid !== localUid)) {
        emitUserLeave({
          userId: uid,
          peerId
        });
        stateMgr?.setUserPresence(uid, false);
        stateMgr?.onUserLeft(uid);
      }
    }
  };
  let unregisterBeforeUnloadCleanup = noOp2;
  const iterate = (targets, f) => {
    const resolvedTargets = resolveSendTarget(targets);
    return (resolvedTargets ? Array.isArray(resolvedTargets) ? resolvedTargets : [resolvedTargets] : getPeerIds(false)).flatMap((id) => {
      if (!isPeerActive(id)) {
        warnNoPeer(id);
        return [];
      }
      return [Promise.resolve(f(id, getDirectPeer(id, false)))];
    });
  };
  const scheduleFlushDestroy = (peer) => {
    let completed = false;
    const finishNow = () => {
      cancel();
    };
    const cancel = destroyAfterFlush(peer, 40, 150, () => {
      completed = true;
      pendingFlushDestroys.delete(finishNow);
    });
    if (!completed) pendingFlushDestroys.add(finishNow);
  };
  const kickPeer = (id, peer, reason) => {
    const cur = getDirectPeer(id, true);
    if (cur && (!peer || cur === peer || reason === peerBannedErr)) leaveAction.send("", { target: id }).catch(noOp2);
    exitPeer(id, peer, reason);
  };
  const reportPeerError = (id, error) => {
    if (error !== peerBannedErr) emitRoomError({
      code: "peer-error",
      peerId: id,
      message: toErrorMessage(error, "peer error"),
      cause: error
    });
  };
  const onPeerError = (id, error) => {
    if (hasAnyPeer(id)) reportPeerError(id, error);
    kickPeer(id, void 0, error);
  };
  const mediaManager = createMediaManager({
    iterate,
    isActive: isPeerActive,
    onPeerError,
    preparePeer: (id) => {
      const direct = getDirectPeer(id, false);
      return direct ? Promise.resolve(direct) : scaleProvider ? scaleProvider.prepareMediaPeer(id) : Promise.reject(peerDisconnectedErr);
    },
    getPeerUserId,
    onPeerMediaPinChange: (id, pinned) => {
      scaleProvider?.setPeerMediaPinned(id, pinned);
    }
  });
  const getEntryTransport = (id, includePending) => {
    const session2 = peerEntries.get(id)?.session;
    if (!session2) return;
    switch (session2.phase) {
      case "direct-active":
        return session2.transport;
      case "direct-pending":
        return includePending ? session2.transport : void 0;
      case "virtual-upgrading":
        return includePending ? session2.transport : session2.virtual;
      case "virtual-only":
        return session2.virtual;
      default:
        return unreachable(session2);
    }
  };
  const { makeAction, makeInternalAction, makeInternalRequestAction, handleData, clearPeer: clearActionPeer, clearListeners: clearActionListeners } = createActionManager({
    getPeerIds,
    canReceiveFromPeer: (id, receiveWhilePending) => !isPeerBanned(id) && (isPeerActive(id) || hs.canReceiveFromPeer(id, receiveWhilePending)),
    onPeerError,
    getTransport: getEntryTransport,
    broadcastInline: (frame2, onProgress, signal) => scaleProvider ? scaleProvider.broadcastInline(frame2, onProgress, signal) : false,
    registerActionAuthority: (namespace, roles2) => {
      if (!rolesProvider) throw requiresRolesErr("action role gating");
      scaleProvider?.registerActionAuthority(namespace, roles2);
    },
    getLocalActionCert: (requiredRoles, namespace) => rolesProvider ? rolesProvider.getLocalActionCert(requiredRoles, namespace) : Promise.resolve(null),
    authorizePeerAction: (peerId, requiredRoles, inlineCert) => rolesProvider ? rolesProvider.authorizePeerAction(peerId, requiredRoles, inlineCert) : false,
    getPeerRoles: (peerId) => getPeerRoles(peerId),
    getPeerUserId,
    resolveSendTarget,
    resolveRequestTarget,
    onUnknownType: (type) => {
      if (type === "@_state" && !isLeavingOrLeft()) ensureStateManager();
    },
    ...maxReceiveBytes === void 0 ? {} : { maxReceiveBytes }
  });
  const awaitSelfState = async () => {
    await roomReadyP;
    return [await resolvedUserIdentityP, await rolesProvider?.getAuthorityInfo()];
  };
  const [hitStatePenalty, resetStatePenalty] = createWindowCounter(512, 8);
  const ensureStateManager = () => {
    if (!stateMgr) {
      const created = createStateManager({
        appId,
        getRoomId: () => effectiveRoomId,
        getSelfId: getLocalSelfId,
        getLocalUserId,
        ensureReady: async () => {
          const [user, info] = await awaitSelfState();
          return {
            selfId: getLocalSelfId(),
            user,
            roomId: info?.roomId ?? effectiveRoomId
          };
        },
        hasRolesPlugin: () => hasRolesPlugin,
        getRolesProvider: () => rolesProvider,
        getScaleProvider: () => scaleProvider,
        isPeerActive,
        isPeerPendingHandshake: (peerId) => Boolean(hs.getPeer(peerId) && !isDirectPeer(peerId)),
        isDirectPeer,
        getDirectPeerIds: () => getDirectPeerIds(true),
        isUserOnline: (uid) => {
          const localUid = getLocalUserId();
          return Boolean(localUid && uid === localUid || countActivePeersForUser(uid) > 0);
        },
        getKnownPeerUserId,
        isPeerBanned: (peerOrUserId) => Boolean(peerOrUserId && isPeerBanned(peerOrUserId)),
        getPeerRoles: (peerOrUserId) => getPeerRoles(peerOrUserId),
        makeInternalAction,
        onInvalidRecord: (fromPeerId) => {
          const selfId = getLocalSelfId();
          if (!fromPeerId || fromPeerId === selfId) return;
          if (hitStatePenalty(fromPeerId)) {
            resetStatePenalty(fromPeerId);
            onPeerError(fromPeerId, mkViolationErr("excessive invalid state records"));
          }
        }
      });
      if (isLeavingOrLeft()) created.destroy();
      else {
        if (localUserId) created.setUserPresence(localUserId, true);
        for (const [pid, entry] of peerEntries) if (isActiveEntry(entry)) created.setUserPresence(getPeerUserId(pid), true);
      }
      stateMgr = created;
    }
    return stateMgr;
  };
  const removePeerEntry = (id) => {
    const entry = peerEntries.get(id);
    if (!entry) return [
      false,
      false,
      getPeerUserId(id),
      void 0
    ];
    const wasActive = isActiveEntry(entry);
    const uid = entry.emittedUserId ?? entry.userId ?? scaleProvider?.getPeerUserId(id) ?? id;
    const directPeer = entry.session.phase === "virtual-only" ? void 0 : entry.session.peer;
    const virtualTransport = hasVirtualSession(entry.session) ? entry.session.virtual : null;
    peerEntries.delete(id);
    virtualTransport?.close?.();
    const isLast = wasActive && countActivePeersForUser(uid, id) === 0;
    if (wasActive) invalidateUsersSnapshot();
    return [
      wasActive,
      isLast,
      uid,
      directPeer
    ];
  };
  const clearSubsystems = (id, err) => {
    stateMgr?.clearPeer(id);
    clearActionPeer(id, err);
    mediaManager.clearPeer(id);
  };
  const exitPeer = (id, peer, reason) => {
    const err = reason === void 0 ? peerDisconnectedErr : toError(reason, peerDisconnectedMsg);
    const banned = err === peerBannedErr;
    const currentDirect = getDirectPeer(id, true);
    if (peer) {
      if (currentDirect !== peer) {
        if (banned) {
          scaleProvider?.markPeerBanned(id);
          if (!hasAnyPeer(id)) return;
        } else return;
      }
    } else if (!hasAnyPeer(id)) {
      if (banned) scaleProvider?.markPeerBanned(id);
      return;
    }
    const existingEntry = peerEntries.get(id);
    if (!banned && currentDirect && existingEntry?.session.phase === "virtual-upgrading") {
      clearPendingPeer(id, err);
      stateMgr?.clearPeer(id);
      resetDirectSessionOnEntry(id, existingEntry);
      currentDirect.destroy();
      scaleProvider?.removeDirectPeer(id, currentDirect, err);
      onPeerLeave(id, false);
      return;
    }
    if (banned) scaleProvider?.markPeerBanned(id);
    clearPendingPeer(id, err);
    clearSubsystems(id, err);
    const [wasActive, isLast, uid, directPeer] = removePeerEntry(id);
    emitDeactivatedEvents(id, wasActive, isLast, uid);
    if (directPeer) {
      if ((banned || reason === roomFullErr) && !isLeavingOrLeft()) scheduleFlushDestroy(directPeer);
      else directPeer.destroy();
      scaleProvider?.removeDirectPeer(id, directPeer, err);
      onPeerLeave(id, !banned && reason !== roomFullErr);
    } else if (wasActive) scaleProvider?.removeDirectPeer(id, void 0, err);
  };
  const leave = () => {
    if (isRoomLeavingOrLeft(roomLifecycle)) return roomLifecycle.promise;
    const { promise, resolve: resolve3, reject } = Promise.withResolvers();
    roomLifecycle = {
      phase: "leaving",
      promise
    };
    (async () => {
      onBeforeLeave?.();
      reservedAdmissionUsers.clear();
      for (const id of getPeerIds(true)) hs.clearPeer(id, roomLeftErr);
      emitLeave();
      const leaveTargets = scaleProvider ? getDirectPeerIds(false).filter((id) => {
        const session2 = peerEntries.get(id)?.session;
        return session2 && session2.phase !== "virtual-only" && session2.transport.isOpen;
      }) : void 0;
      const hasOpenPeers = peerEntries.size > 0 && (!leaveTargets || leaveTargets.length > 0);
      const controller = new AbortController();
      if (hasOpenPeers) leaveAction.send("", {
        ...leaveTargets ? { target: leaveTargets } : {},
        signal: controller.signal
      }).catch(noOp2);
      if (scaleProvider) await scaleProvider.announceLeave();
      if (hasOpenPeers) await new Promise((res) => {
        setTimeout(res, leaveFlushGraceMs);
      });
      controller.abort();
      try {
        scaleProvider?.destroy();
        for (const flushNow of pendingFlushDestroys) flushNow();
        pendingFlushDestroys.clear();
        const allPeerIds = getPeerIds(true);
        for (const id of allPeerIds) {
          const cur = peerEntries.get(id);
          if (!cur) continue;
          const direct = cur.session.phase === "virtual-only" ? null : cur.session.peer;
          const virtual = hasVirtualSession(cur.session) ? cur.session.virtual : null;
          peerEntries.delete(id);
          direct?.destroy();
          virtual?.close?.();
        }
        peerEntries.clear();
        invalidateUsersSnapshot();
        for (const id of allPeerIds) clearSubsystems(id, roomLeftErr);
      } finally {
        roomLifecycle = {
          phase: "left",
          promise
        };
        for (const fn of [
          ...cleanups,
          mediaManager.clearListeners,
          clearActionListeners,
          () => stateMgr?.destroy()
        ]) fn();
        try {
          unregisterBeforeUnloadCleanup();
        } finally {
          onSelfLeave();
        }
      }
    })().then(resolve3, reject);
    return promise;
  };
  const pingAction = makeInternalRequestAction("ping");
  pingAction.onRequest(() => "");
  const signalAction = makeInternalAction("signal");
  const streamMetaAction = makeInternalAction("stream", { maxPayloadBytes: 65536 });
  const leaveAction = makeInternalAction("leave", {
    sendToPending: true,
    receiveWhilePending: true
  });
  const handshakeDataAction = makeInternalAction("hsdata", {
    sendToPending: true,
    receiveWhilePending: true,
    maxPayloadBytes: 65536
  });
  const handshakeReadyAction = makeInternalAction("hsready", {
    sendToPending: true,
    receiveWhilePending: true,
    maxPayloadBytes: 131072
  });
  const reservedAdmissionUsers = /* @__PURE__ */ new Map();
  const rejectedFullPeerUsers = createBoundedCache(256);
  const getUsersSet = (includeReserved = false, excludePeerId) => {
    const users = /* @__PURE__ */ new Set([getLocalUserId()]);
    for (const [pid, entry] of peerEntries) if (isActiveEntry(entry)) users.add(getPeerUserId(pid));
    if (includeReserved) {
      for (const [pid, uid] of reservedAdmissionUsers) if (pid !== excludePeerId) users.add(uid);
    }
    return users;
  };
  const isFullForPeer = (id, includeReserved = false) => {
    if (maxUsers === void 0 || isPeerActive(id)) return false;
    const users = getUsersSet(includeReserved, id);
    const candidateUid = peerEntries.get(id)?.userId ?? scaleProvider?.getPeerUserId(id) ?? rejectedFullPeerUsers.get(id) ?? id;
    return !users.has(candidateUid) && users.size >= maxUsers;
  };
  const canConnectPeer = (peerId) => {
    const knownUid = peerEntries.get(peerId)?.userId ?? scaleProvider?.getPeerUserId(peerId) ?? rejectedFullPeerUsers.get(peerId);
    return !isPeerBanned(getLocalSelfId()) && !isPeerBanned(peerId) && !(knownUid !== void 0 && isFullForPeer(peerId, true));
  };
  const rejectPeer = (id, peer, err) => {
    if (getDirectPeer(id, true) !== peer) return;
    const isBan = err === peerBannedMsg;
    const errObj = isBan ? peerBannedErr : roomFullErr;
    if (isBan) scaleProvider?.markPeerBanned(id);
    else {
      const knownUid = peerEntries.get(id)?.userId ?? scaleProvider?.getPeerUserId(id);
      if (knownUid) rejectedFullPeerUsers.set(id, knownUid);
    }
    const banReason = isBan ? rolesProvider?.getBanReason(getPeerUserId(id)) ?? rolesProvider?.getBanReason(id) : void 0;
    hs.clearPeer(id, errObj);
    stateMgr?.clearPeer(id);
    reservedAdmissionUsers.delete(id);
    handshakeReadyAction.send({
      ok: false,
      err,
      ...banReason !== void 0 ? { reason: banReason } : {}
    }, { target: id }).catch(noOp2).finally(() => {
      if (getDirectPeer(id, true) !== peer) return;
      exitPeer(id, peer, errObj);
    });
  };
  const tryAdmitPeer = (id, peer) => {
    if (isPeerBanned(id)) {
      rejectPeer(id, peer, peerBannedMsg);
      return false;
    }
    if (maxUsers === void 0 || isPeerActive(id)) return true;
    if (isFullForPeer(id, true)) {
      rejectPeer(id, peer, roomFullMsg);
      return false;
    }
    reservedAdmissionUsers.set(id, getPeerUserId(id));
    return true;
  };
  const clearPendingPeer = (id, reason) => {
    hs.clearPeer(id, reason);
    reservedAdmissionUsers.delete(id);
  };
  const deliverHandshakeReady = (data, id) => {
    if (data && typeof data === "object" && data.ok === true) {
      if (hs.getPeer(id) && !isDirectPeer(id) && !isPeerBanned(id) && !isFullForPeer(id)) {
        ensureStateManager().stageHandshakeUserState(id, data, () => {
          if (!isLeavingOrLeft() && hs.getPeer(id)) processHandshakeReady("", id);
        });
        return;
      }
      processHandshakeReady("", id);
      return;
    }
    processHandshakeReady(data, id);
  };
  const onPeerIdentityVerified = (peerId, verified, peer) => {
    if (peer && getDirectPeer(peerId, true) !== peer) return;
    const entry = peerEntries.get(peerId);
    if (!entry || !isPendingDirectSession(entry.session)) return;
    entry.userId = verified.userId;
    invalidateUsersSnapshot();
    if (isPeerBanned(peerId) || isPeerBanned(verified.userId)) {
      scaleProvider?.markPeerBanned(peerId);
      throw peerBannedErr;
    }
    const deferredReady = entry.deferredReady;
    delete entry.deferredReady;
    entry.session = {
      ...entry.session,
      verified: true
    };
    scaleProvider?.setPeerSignPublicKey(peerId, verified.peerPubKey);
    if (deferredReady !== void 0) queueMicrotask(() => {
      const cur = peerEntries.get(peerId);
      if (cur && isEntryVerified(cur) && (!peer || getDirectPeer(peerId, true) === peer)) deliverHandshakeReady(deferredReady, peerId);
    });
  };
  const internalKernel = {
    get selfId() {
      return getLocalSelfId();
    },
    appId,
    initialRoomId,
    password,
    ...maxUsers === void 0 ? {} : { maxUsers },
    getRoomId: () => effectiveRoomId,
    setEffectiveRoomId,
    getLocalEndpointIdentity: () => localEndpointP,
    getLocalUserIdentity: () => resolvedUserIdentityP,
    getPeerUserId,
    getKnownPeerUserId,
    getUserPeerIds,
    setPeerUserId,
    getActivePeerIds: () => getPeerIds(false),
    getDirectActivePeerIds: () => getDirectPeerIds(true),
    getAllPeerIds: () => getPeerIds(true),
    isPeerActive,
    getPeerHandle: getDirectPeer,
    kickPeer: (peerId, reason) => kickPeer(peerId, void 0, reason),
    emitError: emitRoomError,
    makeInternalAction,
    deliverRawData: (originPeerId, data) => {
      if (isPeerBanned(originPeerId)) return;
      handleData(originPeerId, data);
    },
    getRolesProvider: () => rolesProvider,
    getScaleProvider: () => scaleProvider,
    activateVirtualPeer: (peerId, transport) => {
      if (!canAcceptPeers() || isPeerBanned(peerId) || isFullForPeer(peerId, true)) {
        transport.close?.();
        return false;
      }
      if (isDirectPeer(peerId)) {
        transport.close?.();
        return true;
      }
      const existing = peerEntries.get(peerId);
      const wasActive = isActiveEntry(existing);
      const uid = existing?.userId ?? scaleProvider?.getPeerUserId(peerId) ?? peerId;
      const isFirst = !wasActive && countActivePeersForUser(uid, peerId) === 0;
      if (!existing) peerEntries.set(peerId, {
        session: {
          phase: "virtual-only",
          virtual: transport
        },
        userId: uid,
        emittedUserId: uid
      });
      else {
        existing.userId = uid;
        switch (existing.session.phase) {
          case "virtual-only":
            if (existing.session.virtual !== transport) existing.session.virtual.close?.();
            existing.session = {
              phase: "virtual-only",
              virtual: transport
            };
            break;
          case "virtual-upgrading":
            if (existing.session.virtual !== transport) existing.session.virtual.close?.();
            existing.session = {
              ...existing.session,
              virtual: transport
            };
            break;
          case "direct-pending":
            existing.session = {
              phase: "virtual-upgrading",
              virtual: transport,
              peer: existing.session.peer,
              transport: existing.session.transport,
              verified: existing.session.verified
            };
            existing.emittedUserId = uid;
            break;
          case "direct-active":
            break;
          default:
            unreachable(existing.session);
        }
      }
      invalidateUsersSnapshot();
      if (!wasActive) emitActivatedEvents(peerId, uid, isFirst);
      return true;
    },
    deactivateVirtualPeer: (peerId, reason) => {
      if (isDirectPeer(peerId)) return;
      const entry = peerEntries.get(peerId);
      if (!entry || !hasVirtualSession(entry.session)) return;
      const err = toError(reason, peerDisconnectedMsg);
      const uid = entry.emittedUserId ?? entry.userId ?? scaleProvider?.getPeerUserId(peerId) ?? peerId;
      const vt = entry.session.virtual;
      if (entry.session.phase === "virtual-upgrading") {
        entry.session = {
          phase: "direct-pending",
          peer: entry.session.peer,
          transport: entry.session.transport,
          verified: entry.session.verified
        };
        delete entry.emittedUserId;
      } else peerEntries.delete(peerId);
      vt.close?.();
      const isLast = countActivePeersForUser(uid, peerId) === 0;
      invalidateUsersSnapshot();
      if (!hasAnyPeer(peerId)) clearSubsystems(peerId, err);
      emitDeactivatedEvents(peerId, true, isLast, uid);
    },
    purgeBannedUserState: (userId) => {
      stateMgr?.purgeBannedUser(userId);
    },
    onRolesChanged: invalidateUsersSnapshot,
    onPeerActivated: (cb, options) => subPeerActivated(cb, options, () => getDirectPeerEntries(true)),
    onPeerDeactivated: subPeerDeactivated,
    onRoomIdChanged: subRoomIdChanged,
    onLeave: subLeave
  };
  const identityHandshake = createIdentityHandshake({
    endpointIdentityP: localEndpointP,
    appId,
    roomId: effectiveRoomIdP ?? initialRoomId,
    getUserIdentity: () => resolvedUserIdentityP,
    onVerified: onPeerIdentityVerified
  });
  const hs = createHandshakeManager({
    selfIdP: localSelfIdP,
    onPeerHandshake: identityHandshake.run,
    onHandshakeError: (peerId, reason) => {
      if (reason === peerBannedErr || isPeerBanned(peerId)) return;
      emitRoomError({
        code: "handshake-failed",
        peerId,
        message: toErrorMessage(reason, "handshake failed"),
        cause: reason
      });
    },
    deferResponderReady: maxUsers !== void 0,
    sendHandshakeData: (data, peerId, metadata) => handshakeDataAction.send(data, {
      target: peerId,
      ...metadata === void 0 ? {} : { metadata }
    }),
    sendHandshakeReady: (data, peerId) => handshakeReadyAction.send(data, { target: peerId }),
    onLocalHandshakePassed: (id, peer) => {
      if (isPeerBanned(id)) {
        rejectPeer(id, peer, peerBannedMsg);
        return false;
      }
      if (isFullForPeer(id)) {
        rejectPeer(id, peer, roomFullMsg);
        return false;
      }
      return true;
    },
    acquireAdmissionSlot: (id, peer) => {
      if (getDirectPeer(id, true) !== peer || isLeavingOrLeft()) return false;
      return tryAdmitPeer(id, peer);
    },
    beforeSendHandshakeReady: (id, peer) => getDirectPeer(id, true) === peer && !isPeerBanned(id) && stateMgr ? stateMgr.prepareHandshakeReady(id) : void 0,
    onActivate: (id, peer) => {
      if (isPeerBanned(id)) {
        reservedAdmissionUsers.delete(id);
        kickPeer(id, peer, peerBannedErr);
        return;
      }
      if (isFullForPeer(id)) {
        rejectPeer(id, peer, roomFullMsg);
        return;
      }
      const entry = peerEntries.get(id);
      reservedAdmissionUsers.delete(id);
      if (!entry || !isPendingDirectSession(entry.session) || entry.session.peer !== peer) return;
      const wasActive = entry.session.phase === "virtual-upgrading";
      const prevVirtual = entry.session.phase === "virtual-upgrading" ? entry.session.virtual : null;
      const uid = entry.userId ?? id;
      entry.userId = uid;
      delete entry.deferredReady;
      const isFirst = !wasActive && countActivePeersForUser(uid, id) === 0;
      entry.session = {
        phase: "direct-active",
        peer,
        transport: entry.session.transport
      };
      prevVirtual?.close?.();
      invalidateUsersSnapshot();
      scaleProvider?.addDirectPeer(id, peer);
      emitPeerActivated(id, peer);
      peer.setHandlers({ signal: (sdp) => {
        if (getDirectPeer(id, false) === peer) signalAction.send(sdp, { target: id }).catch(noOp2);
      } });
      if (!wasActive) {
        entry.emittedUserId = uid;
        emitActivatedEvents(id, uid, isFirst);
      } else {
        reconcileUserChangeOnActiveEntry(id, entry, uid);
        stateMgr?.onPeerJoined(id, uid, true);
      }
    },
    onFailure: (id, peer, reason) => {
      reservedAdmissionUsers.delete(id);
      if (reason === peerBannedErr) {
        rejectPeer(id, peer, peerBannedMsg);
        return;
      }
      kickPeer(id, peer, reason);
    }
  });
  let rolesApi;
  let scaleApi;
  let pluginSetupFailure = null;
  if (rolesSlot) try {
    const res = rolesSlot.setup(internalKernel, effectiveRoomIdP);
    rolesProvider = res.provider;
    rolesApi = res.api;
  } catch (err) {
    pluginSetupFailure = { error: err };
    failSetup({
      code: "plugin-failed",
      plugin: "roles",
      message: toErrorMessage(err, "roles setup failed"),
      cause: err
    });
  }
  if (scaleSlot && !pluginSetupFailure) try {
    const res = scaleSlot.setup(internalKernel);
    scaleProvider = res.provider;
    scaleApi = res.api;
  } catch (err) {
    pluginSetupFailure = { error: err };
    failSetup({
      code: "plugin-failed",
      plugin: "scale",
      message: toErrorMessage(err, "scale setup failed"),
      cause: err
    });
  }
  const roomReadyP = pluginSetupFailure ? Promise.reject(pluginSetupFailure.error) : all([
    localEndpointP,
    resolvedUserIdentityP,
    ...effectiveRoomIdP ? [effectiveRoomIdP] : []
  ]).then(noOp2);
  roomReadyP.catch(noOp2);
  if (scaleProvider && !pluginSetupFailure) ensureStateManager();
  const processHandshakeReady = (data, id) => {
    if (isLeavingOrLeft()) return;
    if (data && typeof data === "object" && data.ok === false) {
      if (!hs.getPeer(id) || isDirectPeer(id)) return;
      if (data.err === "room full") {
        hs.clearPeer(id, roomFullErr);
        emitRoomError({
          code: "room-full",
          peerId: id,
          message: roomFullMsg
        });
        exitPeer(id, getDirectPeer(id, true), roomFullErr);
        return;
      }
      if (data.err === "peer banned") {
        const reason = typeof data.reason === "string" && data.reason.length <= 512 ? data.reason : void 0;
        hs.clearPeer(id, peerBannedErr);
        emitRoomError(mkBannedErr(reason, id));
        kickPeer(id, getDirectPeer(id, true), peerBannedErr);
        return;
      }
    }
    hs.receiveReady(id);
  };
  signalAction.onMessage((sdp, { peerId: id }) => {
    getDirectPeer(id, false)?.signal(sdp);
  });
  streamMetaAction.onMessage((meta, { peerId: id }) => {
    mediaManager.receiveStreamMeta(meta, id);
  });
  leaveAction.onMessage((_, { peerId: id }) => exitPeer(id, void 0, peerLeftRoomErr));
  handshakeDataAction.onMessage((data, { peerId: id, metadata }) => {
    if (!isLeavingOrLeft()) hs.receiveData(data, id, metadata);
  });
  handshakeReadyAction.onMessage((data, { peerId: id }) => {
    if (isLeavingOrLeft()) return;
    const entry = peerEntries.get(id);
    if (!entry || !isEntryVerified(entry)) {
      if (entry && isPendingDirectSession(entry.session) && !entry.session.verified && hs.getPeer(id)) entry.deferredReady = data;
      return;
    }
    deliverHandshakeReady(data, id);
  });
  onPeer((peer, id) => {
    if (!canAcceptPeers()) {
      peer.destroy();
      return;
    }
    if (!canConnectPeer(id)) {
      peer.destroy();
      return;
    }
    const existing = peerEntries.get(id);
    if (existing) switch (existing.session.phase) {
      case "virtual-only":
        stateMgr?.clearPeer(id);
        break;
      case "direct-pending":
      case "virtual-upgrading": {
        const existingDirect = existing.session.peer;
        if (existingDirect === peer) return;
        const replacedErr = mkErr("peer replaced");
        existingDirect.destroy();
        clearPendingPeer(id, replacedErr);
        stateMgr?.clearPeer(id);
        const ex = peerEntries.get(id);
        if (ex && getDirectPeer(id, true) === existingDirect) resetDirectSessionOnEntry(id, ex);
        break;
      }
      case "direct-active": {
        const existingDirect = existing.session.peer;
        if (existingDirect === peer) return;
        const replacedErr = mkErr("peer replaced");
        existingDirect.destroy();
        clearPendingPeer(id, replacedErr);
        const [wasActive, isLast, uid] = removePeerEntry(id);
        clearSubsystems(id, replacedErr);
        emitDeactivatedEvents(id, wasActive, isLast, uid);
        scaleProvider?.removeDirectPeer(id, existingDirect, replacedErr);
        break;
      }
      default:
        unreachable(existing.session);
    }
    const transport = createDirectPeerTransport(peer, () => {
      const curSession = peerEntries.get(id)?.session;
      return Boolean(curSession && curSession.phase !== "virtual-only" && curSession.transport === transport);
    });
    const existingEntry = peerEntries.get(id);
    if (existingEntry?.session.phase === "virtual-only") {
      delete existingEntry.deferredReady;
      existingEntry.session = {
        phase: "virtual-upgrading",
        virtual: existingEntry.session.virtual,
        peer,
        transport,
        verified: false
      };
    } else peerEntries.set(id, { session: {
      phase: "direct-pending",
      peer,
      transport,
      verified: false
    } });
    hs.addPeer(id, peer);
    peer.setHandlers({
      data: (d) => {
        if (getDirectPeer(id, true) === peer && !isPeerBanned(id)) {
          if (!scaleProvider?.handleFrame(id, d)) handleData(id, d);
        }
      },
      stream: (stream) => {
        if (!isPeerBanned(id)) mediaManager.receiveRemoteStream(id, stream);
      },
      close: () => exitPeer(id, peer, peerDisconnectedErr),
      error: (err) => {
        logErr("peer", err);
        if (getDirectPeer(id, true) === peer) reportPeerError(id, err);
        exitPeer(id, peer, err);
      }
    });
    hs.start(id, peer);
  });
  if (isBrowser) unregisterBeforeUnloadCleanup = registerBeforeUnloadCleanup(() => {
    leave().catch(noOp2);
  });
  const roomInstance = {
    ready: roomReadyP,
    makeAction,
    makeState: ((namespace, initialValue, config) => ensureStateManager().makeState(namespace, initialValue, config)),
    makeUserState: ((namespace, initialValue, config) => ensureStateManager().makeUserState(namespace, initialValue, config)),
    leave,
    ping: async (target) => {
      const start = Date.now();
      await pingAction.request("", { target });
      return Date.now() - start;
    },
    getSelf: async () => {
      const [user, info] = await awaitSelfState();
      return {
        peerId: getLocalSelfId(),
        userId: user.userId,
        identityPersistence: user.persistence ?? "none",
        roomId: info?.roomId ?? effectiveRoomId,
        baseRoomId: info?.baseRoomId ?? initialRoomId,
        isAdmin: info?.isAdmin ?? false,
        roles: info?.roles ?? []
      };
    },
    getPeers: () => fromEntries(getPeerIds(false).map((id) => {
      const directPeer = getDirectPeer(id, false);
      const direct = Boolean(directPeer);
      return [id, {
        userId: getPeerUserId(id),
        connection: directPeer ? directPeer.connection : null,
        direct,
        hops: direct ? 1 : scaleProvider?.getRoute(id)?.hops ?? 2,
        roles: [...getPeerRoles(id)]
      }];
    })),
    getUsers: () => {
      if (cachedUsersSnapshot) return cachedUsersSnapshot;
      const localUid = getLocalUserId();
      const raw = {};
      for (const peerId of getPeerIds(false)) {
        const userId = getPeerUserId(peerId);
        if (localUid && userId === localUid) continue;
        (raw[userId] ??= {
          peerIds: [],
          roles: getPeerRoles(userId)
        }).peerIds.push(peerId);
      }
      const frozen = {};
      for (const [uid, info] of entries3(raw)) frozen[uid] = Object.freeze({
        peerIds: Object.freeze(info.peerIds),
        roles: Object.isFrozen(info.roles) ? info.roles : Object.freeze([...info.roles])
      });
      cachedUsersSnapshot = Object.freeze(frozen);
      return cachedUsersSnapshot;
    },
    addStream: (stream, options = {}) => mediaManager.addStream(stream, options, streamMetaAction.send),
    removeStream: (stream, options = {}) => {
      mediaManager.removeStream(stream, options.target);
    },
    replaceTrack: (oldTrack, newTrack, options = {}) => mediaManager.replaceTrack(oldTrack, newTrack, options.target),
    ...rolesApi,
    ...scaleApi,
    onPeerJoin: (handler, options) => subPeerJoin(handler, options, () => getPeerIds(false).map((peerId) => [{
      peerId,
      userId: getPeerUserId(peerId),
      roles: [...getPeerRoles(peerId)]
    }])),
    onPeerLeave: subPeerLeave,
    onUserJoin: (handler, options) => subUserJoin(handler, options, () => {
      const localUid = getLocalUserId();
      const items = [];
      const seenUsers = /* @__PURE__ */ new Set();
      for (const peerId of getPeerIds(false)) {
        const userId = getPeerUserId(peerId);
        if ((!localUid || userId !== localUid) && !seenUsers.has(userId)) {
          seenUsers.add(userId);
          items.push([{
            userId,
            peerId,
            roles: [...getPeerRoles(peerId)]
          }]);
        }
      }
      return items;
    }),
    onUserLeave: subUserLeave,
    onPeerStream: mediaManager.onPeerStream,
    onError: subError
  };
  lockMethods(roomInstance, [
    "onPeerJoin",
    "onPeerLeave",
    "onUserJoin",
    "onUserLeave",
    "onPeerStream",
    "onError",
    ...rolesApi ? ["onRoleChange"] : []
  ]);
  return [roomInstance, {
    localEndpointP,
    effectiveRoomIdP,
    hasSetupFailed: () => didReportSetupError,
    getScaleProvider: () => scaleProvider,
    setOnScaleTargetsChanged: (cb) => {
      scaleProvider?.setOnTargetsChanged(cb);
    },
    canConnectPeer,
    emitError: (err) => {
      if (!isLeavingOrLeft()) emitError(err);
    }
  }];
};

// node_modules/@trystero-p2p/core/dist/strategy.mjs
var announceIntervalMs = 5333;
var announceWarmupIntervalsMs = [
  233,
  533,
  1333
];
var mergeDefaultConfig = (defaults, overrides) => {
  const merged = { ...defaults };
  for (const [k, v] of entries3(overrides)) if (v !== void 0) merged[k] = v;
  return merged;
};
var getOrCreateAppMap = (map, appId) => {
  let appMap = map.get(appId);
  if (!appMap) {
    appMap = /* @__PURE__ */ new Map();
    map.set(appId, appMap);
  }
  return appMap;
};
var strategy_default = ({ defaultConfig, init, subscribe, announce }) => {
  const clientId = createIdentityClientId();
  const roomRegistry = /* @__PURE__ */ new Map();
  return ((config, roomId, ...extra) => {
    if (!config) throw mkErr("config map required");
    if (extra.length > 0 && extra[0] !== void 0) throw mkErr("joinRoom takes 2 arguments; register error listeners via room.onError(fn)");
    const effectiveConfig = defaultConfig ? mergeDefaultConfig(defaultConfig, config) : config;
    const { appId } = effectiveConfig;
    if (!appId) throw requiredErr("appId");
    if (!roomId) throw requiredErr("roomId");
    if (effectiveConfig.maxReceiveBytes !== void 0 && !isPosSafeInt(effectiveConfig.maxReceiveBytes)) throw posSafeIntErr("maxReceiveBytes");
    if (effectiveConfig.maxUsers !== void 0 && !isPosSafeInt(effectiveConfig.maxUsers)) throw posSafeIntErr("maxUsers");
    validateIdentityConfig(effectiveConfig);
    const existingSlot = roomRegistry.get(appId)?.get(roomId);
    if (existingSlot?.phase === "occupied") throw mkErr(`already joined room "${roomId}" for appId "${appId}"`);
    if (existingSlot?.phase === "leaving") existingSlot.finalizeCleanup();
    let roomState = { phase: "active" };
    let relayHealthState = "unconfirmed";
    let effectiveRoomId = roomId;
    let resolvedSelfId;
    let onPeerConnect = noOp2;
    let reannounceAfterDisconnect = noOp2;
    let stopRelays = noOp2;
    const isRoomInactive = () => roomState.phase !== "active";
    const peerStates = /* @__PURE__ */ new Map();
    const announceIntervals = [];
    const topicFor = (rid2) => topicPath(libName, appId, rid2);
    const deleteRegistrySlotMatching = (predicate) => {
      const appMap = roomRegistry.get(appId);
      if (!appMap) return;
      const initialSlot = appMap.get(roomId);
      if (initialSlot && predicate(initialSlot)) appMap.delete(roomId);
      if (effectiveRoomId !== roomId) {
        const effectiveSlot = appMap.get(effectiveRoomId);
        if (effectiveSlot && predicate(effectiveSlot)) appMap.delete(effectiveRoomId);
      }
      if (appMap.size === 0) roomRegistry.delete(appId);
    };
    const cleanupRoom = () => {
      if (roomState.phase === "left") return;
      roomState = {
        phase: "left",
        relaysStopped: false
      };
      onPeerConnect = noOp2;
      deleteRegistrySlotMatching((slot2) => slot2.phase === "occupied" && slot2.room === joinedRoom || slot2.phase === "leaving" && slot2.finalizeCleanup === cleanupRoom);
      for (const state of peerStates.values()) {
        if (state.connectedPeer && !state.connectedPeer.isDead) state.connectedPeer.destroy();
        if (state.answeringPeer && !state.answeringPeer.isDead) state.answeringPeer.destroy();
        resetOfferState(state);
        resetAnsweringState(state);
        state.connection = { phase: "disconnected" };
      }
      peerStates.clear();
      stopRelays();
    };
    const cancelAllAnnounceTimers = (slots2) => {
      for (const slot2 of slots2) if (slot2.announce.phase === "active") slot2.announce.timer = resetTimer(slot2.announce.timer);
    };
    let relaySlots = [];
    const [joinedRoom, bridge] = createRoomWithBridge((f) => {
      onPeerConnect = f;
    }, (id, shouldReannounce = true) => {
      if (roomState.phase === "left") return;
      const state = peerStates.get(id);
      if (state?.connectedPeer) detachConnectedPeer(state, state.connectedPeer);
      prunePeerStates(peerStates);
      if (shouldReannounce) reannounceAfterDisconnect();
    }, cleanupRoom, {
      clientId,
      appId,
      roomId,
      ...effectiveConfig.password === void 0 ? {} : { password: effectiveConfig.password },
      ...effectiveConfig.maxUsers === void 0 ? {} : { maxUsers: effectiveConfig.maxUsers },
      ...effectiveConfig.use === void 0 ? {} : { use: effectiveConfig.use },
      ...effectiveConfig.identity === void 0 ? {} : { identity: effectiveConfig.identity },
      ...effectiveConfig.maxReceiveBytes === void 0 ? {} : { maxReceiveBytes: effectiveConfig.maxReceiveBytes },
      onBeforeLeave: () => {
        if (roomState.phase === "active") roomState = { phase: "leaving-flush" };
        cancelAllAnnounceTimers(relaySlots);
        const appSlots = getOrCreateAppMap(roomRegistry, appId);
        const leavingSlot = {
          phase: "leaving",
          finalizeCleanup: cleanupRoom
        };
        const curInitial = appSlots.get(roomId);
        if (!curInitial || curInitial.phase !== "occupied" || curInitial.room === joinedRoom) appSlots.set(roomId, leavingSlot);
        if (effectiveRoomId !== roomId) {
          const curEffective = appSlots.get(effectiveRoomId);
          if (!curEffective || curEffective.phase !== "occupied" || curEffective.room === joinedRoom) appSlots.set(effectiveRoomId, leavingSlot);
        }
      }
    });
    try {
      const selfIdP = bridge.localEndpointP.then((ep) => ep.peerId);
      selfIdP.catch(noOp2);
      const emitError = (error) => {
        if (roomState.phase !== "left") bridge.emitError(error);
      };
      const strategyContext = {
        config: effectiveConfig,
        appId,
        roomId,
        peerId: ""
      };
      const effectiveRoomIdP = bridge.effectiveRoomIdP?.then((rid2) => {
        effectiveRoomId = rid2;
        strategyContext.roomId = rid2;
        if (rid2 !== roomId && roomState.phase === "active") {
          const appSlots = getOrCreateAppMap(roomRegistry, appId);
          const existingEffective = appSlots.get(rid2);
          if (existingEffective?.phase === "leaving") existingEffective.finalizeCleanup();
          if (!appSlots.has(rid2)) appSlots.set(rid2, {
            phase: "occupied",
            room: joinedRoom
          });
        }
        return rid2;
      });
      effectiveRoomIdP?.catch(noOp2);
      const whenRoomId = (fn) => {
        const p = effectiveRoomIdP ? effectiveRoomIdP.then(fn) : fn(roomId);
        p.catch(noOp2);
        return p;
      };
      const rootTopicP = whenRoomId((rid2) => hashTopic(topicFor(rid2)));
      const selfTopicP = all([effectiveRoomIdP ?? Promise.resolve(roomId), selfIdP]).then(([rid2, peerId]) => {
        resolvedSelfId = peerId;
        strategyContext.peerId = peerId;
        return hashTopic(topicPath(topicFor(rid2), peerId));
      });
      selfTopicP.catch(noOp2);
      const key = whenRoomId((rid2) => genKey(effectiveConfig.password ?? "", appId, rid2));
      const withKey = (f) => async (signal, peerId, offerId) => ({
        type: signal.type,
        sdp: await f(key, signal.sdp, buildSignalAad(signal.type, peerId, offerId))
      });
      const toPlain = withKey(decrypt);
      const toCipher = withKey(encrypt);
      let disconnectReannounceEnabled = false;
      let disconnectReannounceQueued = false;
      const { checkout: checkoutOffers, getOffers, claimLeased: claimLeasedOffer, reclaimLeased: reclaimLeasedOffer, destroy: destroyOffers } = createOfferManager(() => peer_default(true, effectiveConfig));
      const encryptOffer = async (peer, peerId, offerId) => {
        const plainOffer = await peer.getOffer();
        if (!plainOffer || plainOffer.type !== "offer") throw mkErr("failed to get offer for peer");
        return (await toCipher(plainOffer, peerId, offerId)).sdp;
      };
      const connectPeer = (peer, peerId) => {
        if (isRoomInactive()) {
          peer.destroy();
          return;
        }
        const state = getState(peerStates, peerId);
        if (state.connectedPeer && state.connectedPeer !== peer) {
          if (getConnectedPeerHealth(state.connectedPeer) !== "stale") {
            peer.destroy();
            return;
          }
          clearConnectedPeer(state);
        }
        markPeerConnected(state, peer);
        onPeerConnect(peer, peerId);
        resetOfferState(state);
        if (peer.isDead && state.connectedPeer === peer) {
          detachConnectedPeer(state, peer);
          prunePeerStates(peerStates);
        }
      };
      const isPassive = Boolean(effectiveConfig.passive);
      let syncOverlayNeighbors = noOp2;
      let requeueAnnounce = noOp2;
      reannounceAfterDisconnect = () => {
        syncOverlayNeighbors();
        if (isPassive || !disconnectReannounceEnabled || disconnectReannounceQueued) return;
        disconnectReannounceQueued = true;
        queueMicrotask(() => {
          disconnectReannounceQueued = false;
          if (roomState.phase === "active") requeueAnnounce();
        });
      };
      const disconnectPeer = (peer, peerId) => {
        if (roomState.phase === "left") return;
        const state = peerStates.get(peerId);
        if (state?.connectedPeer === peer) {
          clearConnectedPeer(state);
          prunePeerStates(peerStates);
          reannounceAfterDisconnect();
        }
      };
      const { handleMessage, dialPeer } = createSignalHandler({
        appId,
        getRoomId: () => effectiveRoomId,
        config: effectiveConfig,
        peerStates,
        getRootTopicPlaintext: () => topicFor(effectiveRoomId),
        rootTopicP,
        selfTopicP,
        toPlain,
        toCipher,
        isLeaving: isRoomInactive,
        onError: emitError,
        checkoutOffers,
        claimLeasedOffer,
        reclaimLeasedOffer,
        encryptOffer,
        initPeer: peer_default,
        connectPeer,
        disconnectPeer,
        announceIntervals,
        announceIntervalMs,
        getSelfIdNow: () => resolvedSelfId,
        selfIdP,
        onPeerDiscovered: (peerId) => {
          if (bridge.canConnectPeer(peerId) && bridge.getScaleProvider()?.notePeerDiscovered(peerId)) syncOverlayNeighbors();
        },
        shouldConnectPeer: (peerId, direction) => bridge.canConnectPeer(peerId) && (bridge.getScaleProvider()?.shouldConnectPeer(peerId, direction) ?? true)
      });
      syncOverlayNeighbors = () => {
        const scaleProvider = bridge.getScaleProvider();
        if (isRoomInactive() || isPassive || !scaleProvider) return;
        for (const targetId of scaleProvider.getTargetNeighbors()) dialPeer(targetId);
      };
      const initRes = init(effectiveConfig);
      relaySlots = (Array.isArray(initRes) ? initRes : [initRes]).map((rawItem) => {
        const relayP = Promise.resolve(rawItem);
        relayP.catch(noOp2);
        return {
          rawItem,
          relayP,
          leaseReleased: false,
          subscription: { phase: "booting" },
          announce: { phase: "waiting" },
          gen: 0,
          intervalMs: announceIntervalMs,
          attempts: 0,
          errors: 0,
          initial: "pending"
        };
      });
      const releaseSlotLease = (slot2) => {
        if (!slot2.leaseReleased) {
          slot2.leaseReleased = true;
          releaseRelayLease(slot2.rawItem);
        }
      };
      stopRelays = () => {
        if (roomState.phase === "left" && roomState.relaysStopped) return;
        roomState = {
          phase: "left",
          relaysStopped: true
        };
        cancelAllAnnounceTimers(relaySlots);
        for (const slot2 of relaySlots) {
          const prevSub = slot2.subscription;
          slot2.subscription = { phase: "closed" };
          slot2.gen += 1;
          slot2.announce = { phase: "closed" };
          if (prevSub.phase === "subscribed") prevSub.unsub();
          if (prevSub.phase !== "subscribing") releaseSlotLease(slot2);
        }
        destroyOffers();
      };
      const totalRelays = relaySlots.length;
      const reportAllRelaysFailed = (cause) => {
        if (relayHealthState === "error-reported" || bridge.hasSetupFailed() || isRoomInactive()) return;
        relayHealthState = "error-reported";
        queueMicrotask(() => {
          if (!isRoomInactive() && !bridge.hasSetupFailed()) emitError({
            code: "relay-failed",
            message: toErrorMessage(cause, "all signaling relays failed"),
            appId,
            roomId: effectiveRoomId,
            ...cause !== void 0 ? { cause } : {}
          });
        });
      };
      const maybeReportAllBootFailed = (err) => {
        if (relayHealthState === "unconfirmed" && totalRelays > 0 && relaySlots.every((s) => s.subscription.phase === "boot-failed")) reportAllRelaysFailed(err);
      };
      const markRelayBootFailed = (slot2, err) => {
        switch (slot2.subscription.phase) {
          case "booting":
          case "subscribing":
            slot2.subscription = { phase: "boot-failed" };
            maybeReportAllBootFailed(err);
            return;
          case "subscribed":
          case "closed":
          case "boot-failed":
            return;
          default:
            unreachable(slot2.subscription);
        }
      };
      relaySlots.forEach((slot2) => {
        const getInitialFailure = slot2.relayP[socketInitialFailureSymbol];
        if (typeof getInitialFailure === "function") getInitialFailure().then((err) => {
          if (err) markRelayBootFailed(slot2, err);
        });
      });
      const unsubFns = relaySlots.map(async (slot2, i) => {
        let rootTopic;
        let selfTopic;
        try {
          [rootTopic, selfTopic] = await all([rootTopicP, selfTopicP]);
        } catch {
          slot2.subscription = { phase: "closed" };
          releaseSlotLease(slot2);
          return noOp2;
        }
        if (isRoomInactive()) {
          slot2.subscription = { phase: "closed" };
          releaseSlotLease(slot2);
          return noOp2;
        }
        let relay;
        try {
          relay = await slot2.relayP;
        } catch (err) {
          markRelayBootFailed(slot2, err);
          releaseSlotLease(slot2);
          return noOp2;
        }
        if (isRoomInactive()) {
          slot2.subscription = { phase: "closed" };
          releaseSlotLease(slot2);
          return noOp2;
        }
        slot2.subscription = { phase: "subscribing" };
        try {
          const unsub = await subscribe(relay, rootTopic, selfTopic, handleMessage(i), (n) => selfIdP.then((sid) => getOffers(n, (peer, offerId) => encryptOffer(peer, sid, offerId))), strategyContext);
          const isClosedAfterAwait = (s) => s.subscription.phase === "closed";
          if (isRoomInactive() || isClosedAfterAwait(slot2)) {
            unsub();
            slot2.subscription = { phase: "closed" };
            releaseSlotLease(slot2);
            return noOp2;
          }
          slot2.subscription = {
            phase: "subscribed",
            unsub
          };
          if (relayHealthState === "unconfirmed") relayHealthState = "healthy";
          return unsub;
        } catch (err) {
          slot2.subscription = { phase: "boot-failed" };
          releaseSlotLease(slot2);
          maybeReportAllBootFailed(err);
          return noOp2;
        }
      });
      if (!isPassive) all([rootTopicP, selfTopicP]).then(([rootTopic, selfTopic]) => {
        if (isRoomInactive()) return;
        const isSlotActive = (slot2, gen) => !isRoomInactive() && slot2.announce.phase === "active" && slot2.gen === gen;
        const queueAnnounce = async (relay, slot2, i, gen) => {
          if (!isSlotActive(slot2, gen)) return;
          let announceResult = void 0;
          const isInitial = slot2.initial === "pending";
          try {
            announceResult = await announce(relay, rootTopic, selfTopic, strategyContext);
            slot2.errors = 0;
            if (isInitial) slot2.initial = "succeeded";
          } catch (error) {
            if (isRoomInactive() || slot2.announce.phase === "closed") return;
            if (slot2.errors === 0 && effectiveConfig.relayConfig?.warnOnRelayFailure !== false) warn(`announce failed - ${toErrorMessage(error, "")}`);
            slot2.errors += 1;
            if (isInitial) {
              slot2.initial = "failed";
              const anyInitialSucceeded = relaySlots.some((s) => s.initial === "succeeded");
              const allSettledOrBootFailed = totalRelays > 0 && relaySlots.every((s) => s.subscription.phase === "boot-failed" || s.announce.phase !== "waiting" && s.initial !== "pending");
              if (!anyInitialSucceeded && allSettledOrBootFailed) reportAllRelaysFailed(error);
            }
          }
          if (!isSlotActive(slot2, gen)) return;
          if (typeof announceResult === "number") {
            announceIntervals[i] = announceResult;
            slot2.intervalMs = announceResult;
          } else if (typeof announceResult === "object" && announceResult !== null) {
            if ("stopAnnouncing" in announceResult) {
              slot2.announce = { phase: "closed" };
              return;
            }
            slot2.intervalMs = announceResult.nextAnnounceMs;
            disconnectReannounceEnabled ||= announceResult.reannounceOnDisconnect === true;
          }
          const attempt = slot2.attempts++;
          const warmupDelay = announceWarmupIntervalsMs[attempt] ?? (attempt === 3 && typeof announceResult === "object" ? announceIntervalMs : void 0);
          const delayMs = typeof warmupDelay === "number" ? Math.min(slot2.intervalMs, warmupDelay) : slot2.intervalMs;
          const timer = setTimeout(() => {
            if (slot2.announce.phase === "active" && slot2.announce.timer === timer) slot2.announce.timer = null;
            queueAnnounce(relay, slot2, i, gen);
          }, delayMs);
          unrefTimer(timer);
          if (slot2.announce.phase === "active") slot2.announce.timer = timer;
          else clearTimeout(timer);
        };
        requeueAnnounce = () => {
          cancelAllAnnounceTimers(relaySlots);
          relaySlots.forEach((slot2, i) => {
            if (slot2.subscription.phase !== "subscribed" || slot2.announce.phase === "closed") return;
            const nextGen = ++slot2.gen;
            slot2.attempts = 0;
            slot2.announce = {
              phase: "active",
              timer: null
            };
            slot2.relayP.then((relay) => {
              if (relay && isSlotActive(slot2, nextGen)) queueAnnounce(relay, slot2, i, nextGen);
            }, noOp2);
          });
        };
        unsubFns.forEach((didSub, i) => {
          const slot2 = relaySlots[i];
          if (!slot2) return;
          didSub.then((cleanup) => {
            if (isRoomInactive() || cleanup === noOp2 || slot2.announce.phase !== "waiting") return;
            const { gen } = slot2;
            slot2.announce = {
              phase: "active",
              timer: null
            };
            slot2.relayP.then((relay) => {
              if (relay && isSlotActive(slot2, gen)) queueAnnounce(relay, slot2, i, gen);
            }, noOp2);
          }, noOp2);
        });
      }, noOp2);
      bridge.setOnScaleTargetsChanged((targetIds) => {
        if (!isRoomInactive() && !isPassive) for (const targetId of targetIds) dialPeer(targetId);
      });
      getOrCreateAppMap(roomRegistry, appId).set(roomId, {
        phase: "occupied",
        room: joinedRoom
      });
      return joinedRoom;
    } catch (err) {
      roomState = {
        phase: "left",
        relaysStopped: false
      };
      stopRelays();
      joinedRoom.leave().catch(noOp2);
      throw err;
    }
  });
};

// node_modules/@trystero-p2p/core/dist/topic-strategy.mjs
var defaultSteadyAnnounceIntervalMs = 6e4;
var makeTopicContext = (context, kind, rootTopic, selfTopic) => ({
  kind,
  appId: context.appId,
  roomId: context.roomId,
  rootTopic,
  selfTopic,
  peerId: context.peerId
});
var topic_strategy_default = ({ defaultConfig, steadyAnnounceIntervalMs: steadyAnnounceIntervalMs2 = defaultSteadyAnnounceIntervalMs, reannounceOnDisconnect = true, init, subscribeTopic, publishTopic }) => strategy_default({
  ...defaultConfig === void 0 ? {} : { defaultConfig },
  init,
  subscribe: async (relay, rootTopic, selfTopic, onMessage, _getOffers, context) => {
    let closed = false;
    const signalPeer = (peerTopic, signal) => {
      if (closed) return;
      try {
        Promise.resolve(publishTopic(relay, peerTopic, signal, makeTopicContext(context, "signal", rootTopic, selfTopic))).catch(noOp2);
      } catch {
      }
    };
    const forwardMessage = (topic, msg) => {
      if (!closed) return onMessage(topic, msg, signalPeer);
    };
    const selfCleanup = await subscribeTopic(relay, selfTopic, forwardMessage, makeTopicContext(context, "self", rootTopic, selfTopic));
    let rootCleanup;
    try {
      rootCleanup = await subscribeTopic(relay, rootTopic, forwardMessage, makeTopicContext(context, "root", rootTopic, selfTopic));
    } catch (err) {
      closed = true;
      selfCleanup();
      throw err;
    }
    return () => {
      if (closed) return;
      closed = true;
      selfCleanup();
      rootCleanup();
    };
  },
  announce: async (relay, rootTopic, selfTopic, context) => {
    const result = await publishTopic(relay, rootTopic, { peerId: context.peerId }, makeTopicContext(context, "announce", rootTopic, selfTopic));
    if (typeof result === "number") return result;
    if (typeof result === "object" && result !== null) {
      if ("stopAnnouncing" in result) return result;
      return {
        nextAnnounceMs: result.nextAnnounceMs ?? steadyAnnounceIntervalMs2,
        reannounceOnDisconnect: result.reannounceOnDisconnect ?? reannounceOnDisconnect
      };
    }
    return {
      nextAnnounceMs: steadyAnnounceIntervalMs2,
      reannounceOnDisconnect
    };
  }
});

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
var secretKeyToScalar = (secretKey) => {
  const num2 = bytesToNumBE(abytes(secretKey, L, "secret key"));
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
var randomSecretKey = (seed2) => {
  seed2 = seed2 === void 0 ? randomBytes(48) : seed2;
  abytes(seed2);
  if (seed2.length < 48 || seed2.length > 1024)
    throw new RangeError("expected 48-1024b");
  const num2 = M(bytesToNumBE(seed2), N2 - 1n);
  return numTo32b(num2 + 1n);
};
var createKeygen = (getPublicKey) => (seed2) => {
  const secretKey = randomSecretKey(seed2);
  return { secretKey, publicKey: getPublicKey(secretKey) };
};
var getTag = (tag) => Uint8Array.from("BIP0340/" + tag, (c) => c.charCodeAt(0));
var taggedHash = (tag, ...messages) => {
  const tagH = callHash("sha256", getTag(tag));
  return callHash("sha256", concatBytes(tagH, tagH, ...messages));
};
var taggedHashAsync = (tag, ...messages) => callHashAsync("sha256Async", getTag(tag)).then((tagH) => callHashAsync("sha256Async", concatBytes(tagH, tagH, ...messages)));
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
var pubSchnorr = (secretKey) => {
  return extpubSchnorr(secretKey).px;
};
var keygenSchnorr = /* @__PURE__ */ createKeygen(pubSchnorr);
var prepSigSchnorr = (message, secretKey, auxRand) => {
  const m = snapshotBytes(message, "message");
  const { px, d } = extpubSchnorr(secretKey);
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
var signSchnorr = (message, secretKey, auxRand = randomBytes(L)) => {
  const { m, px, d, a } = prepSigSchnorr(message, secretKey, auxRand);
  const t = numTo32b(d ^ bytesToNumBE(taggedHash("aux", a)));
  const { rx, k } = extractK(taggedHash("nonce", t, px, m));
  const sig = createSigSchnorr(k, rx, challenge(rx, px, m), d);
  if (!verifySchnorr(sig, m, px))
    throw new Error(E_INVSIG);
  return sig;
};
var signSchnorrAsync = async (message, secretKey, auxRand = randomBytes(L)) => {
  const { m, px, d, a } = prepSigSchnorr(message, secretKey, auxRand);
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
var _verifSchnorr = (signature, message, publicKey, challengeFn) => {
  const sig = abytes(signature, 64, "signature");
  const msg = abytes(message, void 0, "message");
  const pub = abytes(publicKey, L, "publicKey");
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
  const points3 = [];
  let p = G;
  let b = p;
  for (let w = 0; w < 33; w++) {
    b = p;
    points3.push(b);
    for (let i = 1; i < 128; i++) {
      b = b.add(p);
      points3.push(b);
    }
    p = b.double();
  }
  return points3;
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

// node_modules/@trystero-p2p/nostr/dist/protocol.mjs
var eventMsgType = "EVENT";
var subscribeClockSkewSeconds = 60;
var nativeToHex = Uint8Array.prototype.toHex;
var toHex = typeof nativeToHex === "function" ? (bytes) => nativeToHex.call(bytes) : (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
var now = () => Math.floor(Date.now() / 1e3);
var subscribeSince = () => Math.max(0, now() - subscribeClockSkewSeconds);
var createSigner = () => {
  const { secretKey, publicKey } = schnorr.keygen();
  return {
    secretKey,
    pubkey: toHex(publicKey)
  };
};
var topicToKind = (topic) => {
  let h = 2166136261;
  for (let i = 0; i < topic.length; i++) h = Math.imul(h ^ topic.charCodeAt(i), 16777619);
  return (h >>> 0) % 1e4 + 2e4;
};
var createEvent = async (topic, content, signer) => {
  const payload = {
    kind: topicToKind(topic),
    tags: [["x", topic]],
    created_at: now(),
    content,
    pubkey: signer.pubkey
  };
  const id = new Uint8Array(await crypto.subtle.digest("SHA-256", encodeBytes(toJson([
    0,
    payload.pubkey,
    payload.created_at,
    payload.kind,
    payload.tags,
    payload.content
  ]))));
  return toJson([eventMsgType, {
    ...payload,
    id: toHex(id),
    sig: toHex(await schnorr.signAsync(id, signer.secretKey))
  }]);
};

// node_modules/@trystero-p2p/nostr/dist/index.mjs
var unreachable2 = (x) => {
  throw mkErr(`unreachable: ${String(x)}`);
};
var cancelTimer = (timer) => {
  if (timer !== null) clearTimeout(timer);
  return null;
};
var relayManager = /* @__PURE__ */ createRelayManager((client) => client.socket, (client) => {
  cleanupClientBatcher(client);
  client.close?.();
});
var defaultRedundancy = 5;
var maxTopicsPerSubscription = 250;
var steadyAnnounceIntervalMs = 6e4;
var maxRelayBackoffMs = 9e5;
var subscriptionRetryMs = 5333;
var roomSigners = /* @__PURE__ */ new Map();
var relayHealth = /* @__PURE__ */ new WeakMap();
var announcementMessages = /* @__PURE__ */ createRelayScopedStore();
var batchers = /* @__PURE__ */ new WeakMap();
var getRoomKey = (rootTopic, selfTopic) => `${rootTopic}\0${selfTopic}`;
var getRoomSigner = (key) => {
  const entry = roomSigners.get(key);
  if (!entry) return createSigner();
  return entry.signer ??= createSigner();
};
var getRelayHealth = (client) => {
  const state = relayHealth.get(client);
  if (!state) return { phase: "healthy" };
  if (state.phase === "cooldown" && Date.now() >= state.untilMs) {
    const next2 = {
      phase: "probation",
      lastDelayMs: state.delayMs
    };
    relayHealth.set(client, next2);
    return next2;
  }
  return state;
};
var backoffRelay = (client) => {
  const current = getRelayHealth(client);
  switch (current.phase) {
    case "retired":
      return maxRelayBackoffMs;
    case "healthy": {
      const delayMs = steadyAnnounceIntervalMs;
      relayHealth.set(client, {
        phase: "cooldown",
        delayMs,
        untilMs: Date.now() + delayMs
      });
      return delayMs;
    }
    case "cooldown":
    case "probation": {
      const prevDelay = current.phase === "cooldown" ? current.delayMs : current.lastDelayMs;
      const delayMs = Math.min(Math.max(steadyAnnounceIntervalMs, prevDelay * 2), maxRelayBackoffMs);
      relayHealth.set(client, {
        phase: "cooldown",
        delayMs,
        untilMs: Date.now() + delayMs
      });
      return delayMs;
    }
    default:
      return unreachable2(current);
  }
};
var acknowledgeRelaySuccess = (client) => {
  if (getRelayHealth(client).phase === "probation") relayHealth.set(client, { phase: "healthy" });
};
var getRelayCooldownMs = (client) => {
  const current = getRelayHealth(client);
  return current.phase === "cooldown" ? Math.max(0, current.untilMs - Date.now()) : 0;
};
var nextAnnounce = (nextAnnounceMs) => ({ nextAnnounceMs });
var stopAnnouncing = { stopAnnouncing: true };
var retireRelay = (client) => {
  if (getRelayHealth(client).phase === "retired") return false;
  relayHealth.set(client, { phase: "retired" });
  relayManager.evict(client);
  cleanupClientBatcher(client);
  client.close?.();
  return true;
};
var resolveBatchFlush = (batcher) => {
  batcher.flushWaiters.forEach((resolve3) => resolve3());
  batcher.flushWaiters.clear();
};
var cleanupClientBatcher = (client) => {
  const batcher = batchers.get(client);
  if (!batcher) return;
  batcher.flushTimer = cancelTimer(batcher.flushTimer);
  batcher.retryTimer = cancelTimer(batcher.retryTimer);
  batcher.sync = { phase: "unsynced" };
  resolveBatchFlush(batcher);
  batchers.delete(client);
};
var batchAdd = (client, topic, handler) => {
  let batcher = batchers.get(client);
  if (!batcher) {
    batcher = {
      subIds: [],
      topics: /* @__PURE__ */ new Map(),
      flushTimer: null,
      flushWaiters: /* @__PURE__ */ new Set(),
      sync: { phase: "unsynced" },
      retryTimer: null,
      retryMs: subscriptionRetryMs
    };
    batchers.set(client, batcher);
  }
  let handlers = batcher.topics.get(topic);
  const isNewTopic = !handlers;
  if (!handlers) {
    handlers = /* @__PURE__ */ new Set();
    batcher.topics.set(topic, handlers);
  }
  handlers.add(handler);
  if (isNewTopic || batcher.sync.phase === "unsynced") scheduleBatchFlush(client, batcher);
};
var batchRemove = (client, topic, handler) => {
  const batcher = batchers.get(client);
  if (!batcher) return false;
  const handlers = batcher.topics.get(topic);
  if (!handlers || !handlers.delete(handler)) return false;
  if (handlers.size > 0) return true;
  batcher.topics.delete(topic);
  delete announcementMessages.forRelay(client)[topic];
  if (batcher.topics.size === 0) {
    batcher.subIds.forEach((subId) => client.send(toJson(["CLOSE", subId])));
    cleanupClientBatcher(client);
    return true;
  }
  scheduleBatchFlush(client, batcher);
  return true;
};
var scheduleBatchFlush = (client, batcher) => {
  if (batcher.flushTimer !== null) return;
  batcher.flushTimer = setTimeout(() => {
    batcher.flushTimer = null;
    try {
      flushBatch(client);
    } finally {
      resolveBatchFlush(batcher);
    }
  }, 0);
};
var waitForBatchFlush = (client) => {
  const batcher = batchers.get(client);
  if (!batcher || batcher.flushTimer === null) return Promise.resolve();
  return new Promise((resolve3) => {
    batcher.flushWaiters.add(resolve3);
  });
};
var flushBatch = (client) => {
  const batcher = batchers.get(client);
  if (!batcher || batcher.topics.size === 0) return;
  batcher.flushTimer = cancelTimer(batcher.flushTimer);
  batcher.retryTimer = cancelTimer(batcher.retryTimer);
  const topics = [...batcher.topics.keys()];
  const chunks = [];
  const since = subscribeSince();
  for (let i = 0; i < topics.length; i += maxTopicsPerSubscription) chunks.push(topics.slice(i, i + maxTopicsPerSubscription));
  while (batcher.subIds.length > chunks.length) {
    const subId = batcher.subIds.pop();
    if (subId) client.send(toJson(["CLOSE", subId]));
  }
  const pendingSubIds = /* @__PURE__ */ new Set();
  const requestedAt = Date.now();
  chunks.forEach((chunk, i) => {
    const subId = batcher.subIds[i] ??= genId(64);
    pendingSubIds.add(subId);
    client.send(toJson([
      "REQ",
      subId,
      {
        kinds: [...new Set(chunk.map(topicToKind))],
        since,
        ["#x"]: chunk
      }
    ]));
  });
  batcher.sync = {
    phase: "awaiting-eose",
    pendingSubIds,
    requestedAt
  };
  resolveBatchFlush(batcher);
};
var resubscribeOnReconnect = (client) => {
  const batcher = batchers.get(client);
  if (batcher && batcher.topics.size > 0 && !client.isClosed) {
    if (getRelayCooldownMs(client) > 0) {
      retrySubscription(client, true);
      return;
    }
    flushBatch(client);
    replayAnnouncements(client);
  }
};
var replayAnnouncements = (client) => {
  Object.entries(announcementMessages.forRelay(client)).forEach(([topic, { payload, getSigner }]) => {
    publishMessage(client, topic, payload, true, getSigner);
  });
};
var getPublishBlockedResult = (client, isAnnouncement) => {
  const health = getRelayHealth(client);
  if (health.phase === "retired" || client.isClosed) return isAnnouncement ? stopAnnouncing : void 0;
  const remaining = health.phase === "cooldown" ? Math.max(0, health.untilMs - Date.now()) : 0;
  if (remaining > 0 || client.socket?.readyState !== 1) return isAnnouncement ? nextAnnounce(Math.max(steadyAnnounceIntervalMs, remaining)) : void 0;
  return null;
};
var publishMessage = async (client, topic, payload, isAnnouncement, getSigner) => {
  const preBlocked = getPublishBlockedResult(client, isAnnouncement);
  if (preBlocked !== null) return preBlocked;
  const event = await createEvent(topic, isAnnouncement ? toJson({
    ...fromJson(payload),
    nonce: genId(8)
  }) : payload, getSigner());
  const postBlocked = getPublishBlockedResult(client, isAnnouncement);
  if (postBlocked !== null) return postBlocked;
  if (isAnnouncement && !batchers.get(client)?.topics.has(topic)) return nextAnnounce(steadyAnnounceIntervalMs);
  client.send(event);
  return isAnnouncement ? nextAnnounce(steadyAnnounceIntervalMs) : void 0;
};
var retrySubscription = (client, rateLimited) => {
  const batcher = batchers.get(client);
  if (!batcher || batcher.topics.size === 0 || client.isClosed) return;
  if (batcher.retryTimer !== null && !rateLimited) return;
  const delay = rateLimited ? getRelayCooldownMs(client) : batcher.retryMs;
  batcher.retryMs = Math.min(batcher.retryMs * 2, steadyAnnounceIntervalMs);
  if (batcher.sync.phase === "synced") batcher.sync = { phase: "unsynced" };
  batcher.retryTimer = cancelTimer(batcher.retryTimer);
  batcher.retryTimer = setTimeout(() => {
    batcher.retryTimer = null;
    resubscribeOnReconnect(client);
  }, Math.max(delay, subscriptionRetryMs));
  unrefTimer(batcher.retryTimer);
};
var joinRoom = /* @__PURE__ */ topic_strategy_default({
  init: (config) => getRelays(config, defaultRelayUrls, defaultRedundancy, true).map((url) => {
    const client = relayManager.register(url, () => {
      const created = makeSocket(url, (data) => {
        const parsed = fromJson(data);
        if (!Array.isArray(parsed)) return;
        const [msgType, subId, payload, relayMsg] = parsed;
        if (msgType !== "EVENT") {
          if (msgType === "CLOSED" && !batchers.get(created)?.subIds.includes(subId)) return;
          const prefix = `${libName}: relay failure from ${created.url} - `;
          const rejectionReason = msgType === "CLOSED" && typeof payload === "string" ? payload : relayMsg;
          const didRejectEvent = msgType === "OK" && payload === false;
          const isRateLimited = (didRejectEvent || msgType === "CLOSED") && rejectionReason?.startsWith("rate-limited:");
          const isDuplicate = didRejectEvent && rejectionReason?.startsWith("duplicate:");
          const isTerminalRejection = rejectionReason && /^(blocked|restricted|auth-required|pow):/.test(rejectionReason);
          if (msgType === "OK" && payload === true) acknowledgeRelaySuccess(created);
          if ((didRejectEvent || msgType === "CLOSED") && isTerminalRejection && !retireRelay(created)) return;
          if (isRateLimited) backoffRelay(created);
          else if (msgType === "EOSE") {
            const batcher = batchers.get(created);
            if (batcher && batcher.sync.phase === "awaiting-eose" && batcher.sync.pendingSubIds.delete(subId) && batcher.sync.pendingSubIds.size === 0) {
              const { requestedAt } = batcher.sync;
              batcher.retryTimer = cancelTimer(batcher.retryTimer);
              batcher.retryMs = subscriptionRetryMs;
              batcher.sync = { phase: "synced" };
              if (Date.now() - requestedAt >= 1e3) replayAnnouncements(created);
            }
          }
          if (msgType === "CLOSED" && !isTerminalRejection) retrySubscription(created, Boolean(isRateLimited));
          if (!isDuplicate && config.relayConfig?.warnOnRelayFailure !== false) {
            if (msgType === "NOTICE") console.warn(prefix + subId);
            else if (didRejectEvent || msgType === "CLOSED") console.warn(prefix + rejectionReason);
          }
          return;
        }
        if (payload && typeof payload === "object" && "content" in payload) {
          const batcher = batchers.get(created);
          if (batcher?.subIds.includes(subId) && payload.tags) {
            const topicTag = payload.tags.find((t) => Array.isArray(t) && t[0] === "x");
            if (topicTag?.[1]) {
              const matchedTopic = topicTag[1];
              batcher.topics.get(matchedTopic)?.forEach((handler) => {
                handler(matchedTopic, payload.content);
              });
            }
          }
        }
      }, () => resubscribeOnReconnect(created));
      return created;
    });
    return relayManager.lease(client, client.ready);
  }),
  subscribeTopic: (client, topic, onMessage, context) => {
    const key = getRoomKey(context.rootTopic, context.selfTopic);
    const existingSigner = roomSigners.get(key);
    if (existingSigner) existingSigner.refs += 1;
    else roomSigners.set(key, {
      refs: 1,
      signer: null
    });
    let released = false;
    const handler = (receivedTopic, data) => void onMessage(receivedTopic, data);
    batchAdd(client, topic, handler);
    const cleanup = () => {
      if (released) return;
      released = true;
      const entry = roomSigners.get(key);
      if (entry) {
        if (entry.refs <= 1) roomSigners.delete(key);
        else entry.refs -= 1;
      }
      batchRemove(client, topic, handler);
    };
    return context.kind === "root" ? waitForBatchFlush(client).then(() => cleanup) : cleanup;
  },
  publishTopic: (client, topic, msg, { kind, rootTopic, selfTopic }) => {
    const payload = typeof msg === "string" ? msg : toJson(msg);
    const key = getRoomKey(rootTopic, selfTopic);
    const getSigner = () => getRoomSigner(key);
    if (kind === "announce" && batchers.get(client)?.topics.has(topic)) announcementMessages.forRelay(client)[topic] = {
      payload,
      getSigner
    };
    return publishMessage(client, topic, payload, kind === "announce", getSigner);
  }
});
var getRelaySockets = () => relayManager.getSockets();
var defaultRelayUrls = [
  "wss://bucket.coracle.social",
  "wss://fanfares.nostr1.com",
  "wss://no.str.cr",
  "wss://nostr-01.yakihonne.com",
  "wss://nostr-pub.wellorder.net",
  "wss://nostr.azzamo.net",
  "wss://nostr.chaima.info",
  "wss://nostr.data.haus",
  "wss://nostr.hifish.org",
  "wss://nostr.liberty.fans",
  "wss://nostr.overmind.lol",
  "wss://nostr.sathoarder.com",
  "wss://nostrelay.circum.space",
  "wss://relay.angor.io",
  "wss://relay.ditto.pub",
  "wss://relay.dwadziesciajeden.pl",
  "wss://relay.fundstr.me",
  "wss://relay.guggero.org",
  "wss://relay.masize.com",
  "wss://relay.minibolt.info",
  "wss://relay.mostro.network",
  "wss://relay.nostr.com",
  "wss://relay.nostr.net",
  "wss://relay.nostrhub.fr",
  "wss://relay.notoshi.win",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
  "wss://relay.wavlake.com",
  "wss://soloco.nl",
  "wss://yabu.me"
];

// src/net/wire.ts
var APP = "hollow-table";
var RELAYS = ["nos.lol", "nostr.stakey.net", "nostr.rblb.it", "nostr.red5d.dev", "relay.grigic.org", "relay.bitmacro.cloud"].map((h) => `wss://${h}`);
var STUN = ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"];
var MAX_BYTES = 64 * 1024 * 1024;
var BLOB_MAX = 25 * 1024 * 1024;
var BLOB_MS = 6e4;
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
  #hi;
  #img;
  // Seq: seq-join.md#1 | R156: join a room; the relays only introduce.
  constructor(roomName, w) {
    this.tab = w.tab;
    this.#room = joinRoom({
      appId: APP,
      identity: w.identity.trystero(),
      maxReceiveBytes: MAX_BYTES,
      relayConfig: { urls: w.relay ? [w.relay] : RELAYS },
      rtcConfig: { iceServers: STUN.map((urls) => ({ urls })) }
    }, roomName);
    this.#room.onError((e) => {
      if ("peerId" in e && e.peerId) w.refused?.(e.peerId, e.message);
    });
    this.#msg = this.#room.makeAction("e");
    this.#msg.onMessage((data, { peerId }) => this.#heard(data, peerId));
    this.#hi = this.#room.makeAction("hi");
    this.#hi.onMessage((data, { peerId, userId }) => this.#hello(w, data, peerId, userId));
    this.#room.onPeerJoin(({ peerId }) => {
      void this.#hi.send({ key: w.sealer.pub, tab: this.tab }, { target: peerId });
    });
    this.#room.onPeerLeave(({ peerId }) => {
      const p = this.#who.get(peerId);
      this.#who.delete(peerId);
      if (!p) return;
      if (this.#byTab.get(p.tab) === peerId) this.#byTab.delete(p.tab);
      for (const fn of this.#leaves) fn(p);
    });
    this.#img = this.#room.makeAction("img", { kind: "request" });
    this.#img.onRequest(async (hash) => {
      if (typeof hash !== "string" || !HASH.test(hash)) throw new Error("not an image hash");
      const blob = await this.#answer?.(hash);
      if (!blob) throw new Error("not here");
      return blob;
    });
    this.#img.onReceive(({ byteLength }) => byteLength <= BLOB_MAX);
  }
  // Seq: seq-join.md#1.6, seq-join.md#1.7 | R471: a proven peer's `hi`, checked, lets it in: it now
  // speaks for that tab, with that sealing key. A malformed one refuses it; a second is ignored.
  #hello(w, data, peer, browser) {
    if (this.#who.has(peer)) return;
    const hi = data;
    if (!hi || typeof hi.key !== "string" || !PUB.test(hi.key) || typeof hi.tab !== "string" || !TAB.test(hi.tab)) {
      w.refused?.(peer, "bad hello");
      return;
    }
    const p = { tab: hi.tab, browser, sealKey: hi.key };
    this.#who.set(peer, p);
    this.#byTab.set(hi.tab, peer);
    for (const fn of this.#joins) fn(p);
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
    await this.#msg.send(make2(kind, this.tab, body), { target: to ? targets : null });
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
      const none2 = () => done2(null);
      this.#img.requestMany(hash, {
        targets,
        timeoutMs: BLOB_MS,
        onResult: (r) => {
          const v = r.status === "fulfilled" ? r.value : null;
          if (got || !(v instanceof Blob || v instanceof ArrayBuffer || ArrayBuffer.isView(v))) return;
          got = true;
          done2(v instanceof Blob ? v : new Blob([v]));
        }
      }).then(none2, none2);
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

// src/ui/tray.ts
function worldFrom(text) {
  const t = text.trim().replace(/^−/, "-");
  if (!t) return { set: false, total: 0 };
  return /^[-+]?\d{1,3}$/.test(t) ? { set: true, total: Number(t) } : null;
}
var TrayView = class {
  #w;
  #button;
  #tray;
  #value;
  #open = false;
  #ringed = false;
  constructor(slot2, w) {
    this.#w = w;
    const doc = slot2.ownerDocument, gm = !!w.viewer?.gm;
    this.#button = doc.createElement("button");
    this.#button.className = "oppobtn";
    this.#button.textContent = "Opposition";
    this.#button.title = "The world as opposition: click to slide its tray out or back";
    this.#button.addEventListener("click", () => {
      this.#open = !this.#open;
      this.render();
    });
    this.#tray = doc.createElement("div");
    this.#tray.className = "oppotray";
    const label2 = doc.createElement("span");
    label2.className = "who";
    label2.textContent = "The world";
    if (gm) {
      const field2 = doc.createElement("input");
      field2.inputMode = "numeric";
      field2.className = "total";
      field2.title = "The world's Total Influence: what a roll aimed at open table or this tray is against. Blank: no number.";
      field2.addEventListener("change", () => this.#commit(field2));
      field2.addEventListener("keydown", (e) => {
        if (e.key === "Enter") field2.blur();
        if (e.key === "Escape") {
          this.#show(field2);
          field2.blur();
        }
      });
      this.#value = field2;
    } else {
      this.#value = doc.createElement("span");
      this.#value.className = "total";
    }
    this.#tray.append(label2, this.#value);
    slot2.replaceChildren(this.#button, this.#tray);
    w.game.listen(() => this.render());
    this.render();
  }
  // R376, R350: the world's mark: the tray while it is out, else its button.
  /** The element that stands for the world while aiming and aimed. */
  mark() {
    return this.#open ? this.#tray : this.#button;
  }
  /** R350: whether the roll row is aimed at the world; the ring goes on the mark. */
  ring(on) {
    this.#ringed = on;
    this.#paint();
  }
  render() {
    this.#tray.hidden = !this.#open;
    this.#button.classList.toggle("open", this.#open);
    if (this.#value instanceof HTMLInputElement) {
      if (this.#value.ownerDocument.activeElement !== this.#value) this.#show(this.#value);
    } else {
      const set2 = !!this.#world()?.set;
      this.#value.textContent = set2 ? "set by the GM" : "";
      this.#tray.title = set2 ? "The GM has set the world's number" : "The GM hasn't given the world a number yet";
    }
    this.#paint();
  }
  #world() {
    return this.#w.game.get("world");
  }
  #show(field2) {
    const w = this.#world();
    field2.value = w?.set ? String(w.total) : "";
  }
  #commit(field2) {
    const next2 = worldFrom(field2.value), was = this.#world();
    if (!next2) {
      this.#show(field2);
      return;
    }
    if (was?.set === next2.set && (was.total === next2.total || !next2.set)) {
      this.#show(field2);
      return;
    }
    this.#w.game.change((x) => x.put("world", next2));
  }
  #paint() {
    for (const el4 of [this.#button, this.#tray]) el4.classList.toggle("targeted", this.#ringed && el4 === this.mark());
  }
};

// src/ui/actions.ts
function minter(game2, gm, rng = Math.random) {
  const used = new Set(game2.all().map(([rid2]) => rid2).filter(onTable).map(oidOf));
  let top = 0;
  for (const o of used) {
    const n = parseInt(o, 16);
    if (n < PLAYER_OIDS) top = Math.max(top, n);
  }
  return () => {
    let oid;
    do {
      oid = (gm ? ++top : PLAYER_OIDS + Math.floor(rng() * (4294967295 - PLAYER_OIDS))).toString(16).padStart(8, "0");
    } while (used.has(oid));
    used.add(oid);
    return oid;
  };
}
var lookup = (game2) => (oid) => game2.get(ridOf(oid));
var item = (game2, rid2) => {
  const r = game2.get(rid2);
  return r && "kind" in r && (r.kind === "chip" || r.kind === "influence") ? r : void 0;
};
var inSlot2 = (i, owner, slot2) => typeof i.where === "object" && "slot" in i.where && i.where.slot === owner && i.where.name === slot2;
function slotItems(game2, owner, slot2) {
  return game2.all().map(([rid2]) => item(game2, rid2)).filter((i) => !!i && inSlot2(i, owner, slot2));
}
function toSlot(game2, rid2, owner, slot2, _mint, by) {
  const i = item(game2, rid2);
  if (!i || !accepts(slot2, i)) return null;
  const home = i.kind === "influence" && i.mot ? { home: owner } : {};
  const inPool = typeof i.where === "object" && "slot" in i.where && i.where.slot === owner;
  const moved = { ...i, ...home, where: { slot: owner, name: slot2 }, n: slotItems(game2, owner, slot2).length };
  if (moved.kind === "chip" && !inPool) {
    if (by) moved.by = by;
    else delete moved.by;
  }
  return (w) => w.put(ridOf(moved.oid), moved);
}
function drawerCards(game2, owner) {
  return game2.all().map(([, r]) => r).filter((r) => "kind" in r && r.kind === "influence" && r.home === owner && r.where === "drawer").sort((a, b) => a.n - b.n);
}
function toDrawer(game2, rid2, owner, at4) {
  const i = item(game2, rid2);
  if (!i || i.kind !== "influence") return null;
  const order2 = drawerCards(game2, owner).filter((k) => ridOf(k.oid) !== rid2);
  const card2 = { ...i, home: owner, where: "drawer", used: false };
  order2.splice(at4 === void 0 ? order2.length : Math.max(0, Math.min(at4, order2.length)), 0, card2);
  return (w) => order2.forEach((k, n) => {
    if (k === card2 || k.n !== n) w.put(ridOf(k.oid), { ...k, n });
  });
}
function toTable(game2, rid2, at4) {
  const i = item(game2, rid2);
  if (!i) return null;
  if (i.kind === "influence" && !i.tap) return toDrawer(game2, rid2, i.home);
  return (w) => w.put(rid2, { ...i, where: { table: at4 } });
}
function killCard(game2, rid2) {
  const i = item(game2, rid2);
  if (!i || i.kind !== "influence") return null;
  const refunds = kill(lookup(game2), i);
  return (w) => {
    w.del(rid2);
    for (const c of refunds) w.put(ridOf(c.oid), c);
  };
}
function vanish(game2, rid2) {
  const i = item(game2, rid2);
  return i?.kind === "chip" ? (w) => w.del(rid2) : null;
}
function chipClick(game2, rid2, shift, _mint) {
  const c = item(game2, rid2);
  if (c?.kind !== "chip") return null;
  const next2 = shift ? lowerChip(c) : raiseChip(c);
  return (w) => {
    if (next2) w.put(rid2, next2);
    else w.del(rid2);
  };
}
function riderClick(game2, rid2, shift) {
  const c = item(game2, rid2);
  if (c?.kind !== "chip" || !c.rider || !shift) return null;
  return (w) => w.put(rid2, { ...c, rider: false });
}
function addLoose(game2, owner, slot2, shift, mint2, by) {
  const chip2 = {
    kind: "chip",
    oid: mint2(),
    where: { slot: owner, name: slot2 },
    n: slotItems(game2, owner, slot2).length,
    sign: shift ? -1 : 1,
    points: 1,
    rider: false,
    ...by && { by }
  };
  return (w) => w.put(ridOf(chip2.oid), chip2);
}
function cardClick(game2, rid2, shift, mint2) {
  const c = item(game2, rid2);
  if (c?.kind !== "influence") return null;
  if (shift && c.points <= MIN) return killCard(game2, rid2);
  if (c.tap) {
    const t = shift ? unfeed(lookup(game2), c) : feed(lookup(game2), c, void 0, mint2());
    return t ? apply2(t, c) : null;
  }
  const next2 = shift ? lowerCard(c) : raiseCard(c);
  return next2.points === c.points ? null : (w) => w.put(rid2, next2);
}
function ruleFlag(game2, rid2, allow) {
  const c = item(game2, rid2);
  if (c?.kind !== "influence" || !c.flag) return null;
  if (allow) {
    const next2 = allowFlag(c);
    return (w) => w.put(rid2, next2);
  }
  const t = undoFlag(lookup(game2), c);
  return t ? apply2(t, c) : null;
}
function writeCard(game2, owner, sign2, name2, mint2) {
  const n = drawerCards(game2, owner).reduce((m, k) => Math.max(m, k.n + 1), 0);
  const card2 = { kind: "influence", oid: mint2(), home: owner, where: "drawer", n, name: name2, sign: sign2, points: MIN, used: false, crit: false };
  return (w) => w.put(ridOf(card2.oid), card2);
}
function restoreUsed(game2, rid2) {
  const c = item(game2, rid2);
  return c?.kind === "influence" && c.where === "used" ? (w) => w.put(rid2, { ...c, where: "drawer", used: false }) : null;
}
function apply2(t, old) {
  return (w) => {
    if (old && t.card.oid !== old.oid) w.put(ridOf(old.oid), old);
    w.put(ridOf(t.card.oid), t.card);
    for (const c of t.changed) w.put(ridOf(c.oid), c);
  };
}
function tapOut(game2, src, where2, mint2) {
  const t = tap(lookup(game2), src, where2, mint2());
  return t ? apply2(t) : null;
}
function mergeTap(game2, fromRid, intoRid, mint2) {
  const from = item(game2, fromRid), into = item(game2, intoRid);
  if (fromRid === intoRid || from?.kind !== "influence" || into?.kind !== "influence" || !from.tap || !into.tap || from.used) return null;
  const chars = /* @__PURE__ */ new Map();
  const now2 = (oid) => chars.get(oid) ?? lookup(game2)(oid);
  for (const c of kill(now2, from)) chars.set(c.oid, c);
  let card2 = into, fed = false;
  for (const [src, n] of Object.entries(from.tap.ledger)) {
    for (let k = 0; k < n; k++) {
      const t = feed(now2, card2, src, mint2());
      if (!t || t.card.oid !== into.oid) return null;
      card2 = t.card;
      fed = true;
      for (const c of t.changed) chars.set(c.oid, c);
    }
  }
  if (!fed) return null;
  return (w) => {
    w.del(fromRid);
    w.put(intoRid, card2);
    for (const c of chars.values()) w.put(ridOf(c.oid), c);
  };
}

// src/ui/rollrow.ts
function fresh(pool) {
  return { pool, action: "", opponent: null, defend: "mental", row: null, byHand: false, hand: { yellows: 1, bonus: 0 } };
}
function dock(r, pool) {
  return { ...fresh(pool), ...r?.priv && { priv: true } };
}
function typeOf(label2) {
  const w = label2.toLowerCase(), has = (re) => re.test(w);
  if (has(/\b(atk|attack)\b/)) {
    if (has(/\bmental\b/)) return "mental";
    if (has(/\bpsych/)) return "psych";
    if (has(/\bphys(ical)?\b/)) return "phys";
    return null;
  }
  if (has(/\binfer\b/)) return "infer";
  if (has(/\bimpress\b/)) return "impress";
  if (has(/\breq(uest)?\b/)) return "request";
  if (has(/\binfluence\b/)) return "influence";
  return null;
}
function withAction(r, label2, alt, remembered, skill = false) {
  const type = typeOf(alt ?? label2.split("/")[0]) ?? remembered ?? (skill ? "skill" : "?");
  const { alt: _, reaction: _r, ...rest } = r;
  return {
    ...rest,
    action: label2,
    ...alt && { alt },
    type,
    hand: { yellows: 0, bonus: 0 },
    ...!r.opponent && { row: null, byHand: false },
    ...type === "?" && r.opponent && { opponent: null }
  };
}
function typed2(r, type) {
  return { ...r, type, ...type === "?" && { opponent: null } };
}
function defendBase(r, def) {
  if (r.type === "phys" || !def) return 0;
  return def[r.type === "mental" || r.type === "psych" ? r.type : r.defend];
}
function cleared(r) {
  return dock(r, r.pool);
}
function handStep(r, what, by) {
  return { ...r, hand: { ...r.hand, [what]: r.hand[what] + by } };
}
function picked(r, key) {
  return { ...r, row: key, byHand: true };
}
function aimed2(r, opponent2, defend2, against) {
  const { against: _, ...rest } = r;
  return { ...rest, opponent: opponent2, defend: defend2, row: null, byHand: false, ...against && { against } };
}
function unaimed(r) {
  return { ...r, opponent: null, ...!r.byHand && { row: null } };
}
function waits(r) {
  if (!r.action || r.reaction) return null;
  if ((r.type ?? "?") === "?") return "Say what this roll is, then aim it: drag from the action to a character, or to open table for the world";
  return r.opponent ? null : "Aim it first: drag from the action to a character, or to open table for the world";
}
function defendOf(c) {
  return marks(parse(c.front), "def").map((m) => defend(m.text)).find((d) => d) ?? null;
}
var ownerAsViewer = (c) => c.owner === GM ? { name: GM, gm: true } : { name: c.owner, gm: false };
function intentOf(r) {
  const row2 = r.row && (r.byHand || !r.opponent) ? { row: r.row } : {};
  return {
    pool: r.pool,
    action: r.action,
    vs: r.opponent,
    defend: r.defend,
    hand: r.hand,
    ...row2,
    type: r.type ?? "?",
    ...r.alt && { alt: r.alt },
    ...r.against && r.opponent && { against: r.against },
    ...r.reaction && { reaction: r.reaction }
  };
}
function rollsFor(viewer, c) {
  return !!viewer && !!c && c.owner !== OPEN && (viewer.gm || c.owner === viewer.name);
}
function actionOf(c, label2) {
  return marks(parse(c.front), "act").map((m) => action(m.text)).find((a) => a?.label === label2) ?? null;
}
function shown(game2, r, live = true) {
  const c = game2.get(ridOf(r.pool));
  const items = game2.all().map(([, x]) => x).filter((x) => "kind" in x && (x.kind === "chip" || x.kind === "influence"));
  const mine = c ? pools(c.oid, items) : null;
  const act = c && r.action ? actionOf(c, r.action) : null;
  const row2 = ADV.find((x) => x.key === r.row) ?? row(0);
  if (!act || !mine) return { label: "", base: null, total: null, parts: {}, yellows: Math.max(0, r.hand.yellows), bonus: r.hand.bonus, row: row2 };
  const sum2 = total2(act.base, mine), dice = bonus({ yellows: act.yellows, bonus: act.bonus }, mine.bonus, r.hand);
  const out = { label: alternative(act.label, r.alt), base: act.base, total: sum2.total, parts: sum2.parts, yellows: dice.yellows, bonus: dice.bonus, row: row2 };
  if (r.opponent === WORLD) {
    const against2 = game2.get("world")?.total ?? 0, diff2 = sum2.total - against2;
    return { ...out, row: r.byHand || !live ? row2 : row(diff2), vs: { oid: WORLD, name: "the world", total: against2, diff: diff2, sees: !!ownerAsViewer(c)?.gm } };
  }
  const opp = r.opponent ? game2.get(ridOf(r.opponent)) : void 0;
  if (opp?.kind !== "character") return out;
  const point = r.against ? pointed(opp.front, r.against, act.att) : null;
  const against = opposition(point ? point.base : defendBase(r, defendOf(opp)), pools(opp.oid, items)).total, diff = sum2.total - against;
  return {
    ...out,
    row: r.byHand || !live ? row2 : row(diff),
    vs: { oid: opp.oid, name: opp.name, total: against, diff, sees: canSee(ownerAsViewer(c), opp), ...point && { words: point.words } }
  };
}
function onceCard(game2, was, now2, mint2) {
  const c = now2?.action ? game2.get(ridOf(now2.pool)) : void 0;
  const act = c?.kind === "character" ? actionOf(c, now2.action) : null, inf = act ? suffers(c.front, act.label) : null;
  const want = inf && { home: now2.pool, name: inf.name, sign: inf.sign, points: STEP * levelsOf(inf) };
  const cards = game2.all().map(([, x]) => x).filter((x) => "kind" in x && x.kind === "influence" && !!x.once && (x.home === was?.pool || x.home === now2?.pool));
  const keep2 = want && cards.find((i) => i.home === want.home && i.name === want.name && i.sign === want.sign && i.points === want.points && typeof i.where === "object" && "slot" in i.where && i.where.slot === want.home && i.where.name === "main");
  const gone = cards.filter((i) => i !== keep2);
  if (!gone.length && (keep2 || !want)) return null;
  return (w) => {
    for (const i of gone) w.del(ridOf(i.oid));
    if (!want || keep2) return;
    const oid = mint2();
    w.put(ridOf(oid), {
      kind: "influence",
      oid,
      where: { slot: want.home, name: "main" },
      n: slotItems(game2, want.home, "main").length,
      ...want,
      used: false,
      crit: false,
      once: true
    });
  };
}
var ownerWord = (c) => c.owner === GM ? "GM" : c.owner === OPEN ? "open" : c.owner;
var rowsOf = (game2) => game2.get("rows")?.rows ?? {};
function whites(game2) {
  const out = {};
  for (const [oid, r] of Object.entries(rowsOf(game2))) {
    if (!r.opponent || r.byHand) continue;
    const key = shown(game2, r).row.key;
    if (r.row !== key) out[oid] = { ...r, row: key };
  }
  return out;
}
var TYPE_WORDS = {
  "?": "?",
  skill: "Skill",
  influence: "Create Influence",
  phys: "Phys Attack",
  mental: "Mental Attack",
  psych: "Psych Attack",
  infer: "Infer",
  impress: "Impress",
  request: "Request"
};
var TAG_WORDS = { influence: "Influence", phys: "Phys Atk", mental: "Mental Atk", psych: "Psych Atk" };
var SIGN = (n) => n < 0 ? `\u2212${-n}` : `+${n}`;
var RollRowView = class {
  #w;
  #els = /* @__PURE__ */ new Map();
  #waiting = /* @__PURE__ */ new Set();
  constructor(w) {
    this.#w = w;
    document.addEventListener("pointerdown", (e) => {
      if (e.target.closest?.(".advmenu, .white")) return;
      for (const { menu } of this.#els.values()) menu.hidden = true;
    }, true);
    w.game.listen(() => this.render());
    if (w.viewer?.gm) w.game.listen(() => queueMicrotask(() => {
      const changed = whites(w.game);
      if (Object.keys(changed).length) w.game.change((x) => x.put("rows", { rows: { ...rowsOf(w.game), ...changed } }));
    }));
    this.render();
  }
  // R381: a row is the game's; R362, R353: the card its action suffers follows it, in the same change.
  #set(r) {
    const { game: game2 } = this.#w, was = rowsOf(game2)[r.pool] ?? null, card2 = onceCard(game2, was, r, this.#w.mint);
    game2.change((x) => {
      x.put("rows", { rows: { ...rowsOf(game2), [r.pool]: r } });
      card2?.(x);
    });
    this.#w.redraw([r.pool]);
    this.render();
  }
  // R353: a roll that went through used up the card its action suffered, so the row starts fresh.
  /** After a roll of this character's row went through. */
  rolled(oid) {
    const r = rowsOf(this.#w.game)[oid], c = r?.action ? this.#w.game.get(ridOf(oid)) : void 0;
    const act = c?.kind === "character" ? actionOf(c, r.action) : null;
    if (act && suffers(c.front, act.label)) this.#set(cleared(r));
  }
  /** A roll of this character's row is waiting on the GM's page (R102). */
  waiting(oid, on) {
    if (on) this.#waiting.add(oid);
    else this.#waiting.delete(oid);
    this.render();
  }
  // R381: the die toggles the row: up fresh, or away, with the card its action suffered (R353).
  /** The die by a pool's name. */
  dock(oid) {
    const { game: game2 } = this.#w, was = rowsOf(game2)[oid];
    if (!was) {
      this.#set(dock(null, oid));
      return;
    }
    const { [oid]: _, ...rows } = rowsOf(game2), card2 = onceCard(game2, was, null, this.#w.mint);
    game2.change((x) => {
      x.put("rows", { rows });
      card2?.(x);
    });
    this.#w.redraw([oid]);
    this.render();
  }
  // R429: a record's "Reaction ?" die brings the PC's row up as a Reaction from the NPC's card.
  /** A Reaction's die: false when the viewer can't change that character's row. */
  react(pc, npc) {
    const c = this.#w.game.get(ridOf(pc));
    if (!rollsFor(this.#w.viewer, c)) return false;
    this.#set({ ...dock(rowsOf(this.#w.game)[pc] ?? null, pc), reaction: npc });
    return true;
  }
  /** An action's die (R76): false when the viewer can't change that character's row. */
  action(oid, label2, alt) {
    const c = this.#w.game.get(ridOf(oid));
    if (!rollsFor(this.#w.viewer, c)) return false;
    const r = rowsOf(this.#w.game)[oid] ?? dock(null, oid), name2 = alt ?? label2;
    this.#set(withAction(r, label2, alt, this.#w.remembered(oid, name2), skillNamed(c.front, name2)));
    return true;
  }
  /** The action in use on this character, for its swish (R77). */
  inUse(oid) {
    return rowsOf(this.#w.game)[oid]?.action || null;
  }
  render() {
    const { game: game2, viewer } = this.#w, rows = rowsOf(game2), doc = document;
    for (const [oid, els] of this.#els) {
      if (rows[oid] && this.#w.pool(oid)) continue;
      els.row.remove();
      els.info.remove();
      els.menu.remove();
      this.#els.delete(oid);
    }
    for (const p of doc.querySelectorAll(".pool.targeted")) p.classList.remove("targeted");
    let world = false;
    for (const [oid, r] of Object.entries(rows)) {
      const mat = this.#w.pool(oid), c = game2.get(ridOf(oid));
      if (!mat || c?.kind !== "character") continue;
      let els = this.#els.get(oid);
      if (!els) {
        const el4 = (tag, cls) => {
          const e = doc.createElement(tag);
          e.className = cls;
          return e;
        };
        els = { row: el4("div", "roller"), info: el4("span", "rollinfo"), menu: el4("div", "advmenu") };
        els.menu.hidden = true;
        this.#els.set(oid, els);
      }
      const hd = mat.querySelector(".hd");
      if (els.row.parentElement !== mat) {
        hd.after(els.row);
        mat.append(els.menu);
      }
      if (els.info.parentElement !== hd) hd.append(els.info);
      const s = shown(game2, r, !!viewer?.gm);
      this.#draw(r, s, els, rollsFor(viewer, c));
      if (s.vs && s.vs.oid !== WORLD) this.#w.pool(s.vs.oid)?.classList.add("targeted");
      world ||= s.vs?.oid === WORLD;
    }
    this.#w.tray.ring(world);
  }
  // R381: a row's controls answer only its owner and the GM (`mine`); R372: only the GM aims.
  #draw(r, s, els, mine) {
    const doc = els.row.ownerDocument, die3 = (c, title = "") => {
      const d = doc.createElement("span");
      d.className = `rrdie ${c}`;
      if (title) d.title = title;
      return d;
    };
    const step = (r2) => {
      if (mine) this.#set(r2);
    };
    const gm = !!this.#w.viewer?.gm, waiting = this.#waiting.has(r.pool), reacting = !!r.reaction;
    const white = doc.createElement("span");
    white.className = gm && !reacting ? "white" : "white locked";
    white.title = reacting ? "A Reaction: the White die on the Default Reaction table" : gm ? `Difference ${rowWords(s.row)}. Click to choose the row.` : `${diceOnly(s.row)} (set by the GM)`;
    white.append(die3("W"));
    if (s.row.die) white.append(die3(s.row.die));
    if (s.row.mod || s.row.auto) {
      const mod = doc.createElement("span");
      mod.className = s.row.auto ? "mod outclass" : "mod";
      mod.textContent = s.row.auto ? s.row.words : s.row.mod > 0 ? "+1" : "\u22121";
      white.append(mod);
    }
    gesture(white, { click: () => {
      if (gm && !reacting) this.#openMenu(r, s.row.key, els.menu);
    } });
    const ys = doc.createElement("span");
    ys.className = "ydice";
    if (mine) ys.title = "Yellow dice: click to add one, shift-click to remove one";
    ys.append(...s.yellows ? Array.from({ length: s.yellows }, () => die3("Y")) : [die3("ghost")]);
    gesture(ys, { click: () => step(handStep(r, "yellows", 1)), shift: () => step(handStep(r, "yellows", -1)) });
    const b = doc.createElement("span");
    b.className = s.bonus ? "bonus" : "bonus zero";
    b.textContent = SIGN(s.bonus);
    if (mine) b.title = "Success Bonus: click to raise, shift-click to lower";
    gesture(b, { click: () => step(handStep(r, "bonus", 1)), shift: () => step(handStep(r, "bonus", -1)) });
    const parts2 = reacting ? [white] : [white, die3("B", "Blue: always rolled"), ys, b];
    const type = r.type ?? "?", t = doc.createElement("button");
    t.className = type === "?" ? "rtype unsaid" : "rtype";
    t.textContent = TAG_WORDS[type] ?? TYPE_WORDS[type];
    t.title = type === "?" ? "What is this roll? Click to say. A roll that doesn't say can't be aimed at anyone." : `This roll is ${TYPE_WORDS[type]}.${mine ? " Click to change it." : ""}`;
    gesture(t, { click: (e) => {
      if (mine) this.#types(r, e);
    } });
    if (!reacting) parts2.push(t);
    if (gm) {
      const p = doc.createElement("button");
      p.className = r.priv ? "priv on" : "priv";
      p.textContent = r.priv ? "private" : "to table";
      p.title = r.priv ? "Behind the screen: this roll prints on your tape only. Click to show rolls to the table." : "Rolls go to everyone at the table (what they would see: the dice and the result). Click to roll behind the screen.";
      gesture(p, { click: () => step({ ...r, priv: !r.priv }) });
      parts2.push(p);
    }
    if (mine) {
      const roll3 = doc.createElement("button"), eye = !!this.#w.inferring?.(), why3 = waits(r);
      roll3.className = "roll";
      roll3.textContent = waiting ? "GM\u2026" : "Roll";
      roll3.disabled = waiting || eye || !!why3;
      if (waiting) roll3.title = "Waiting for the GM's page to roll";
      else if (eye) roll3.title = "Shut the eye first: a card is open to show the table";
      else if (why3) roll3.title = why3;
      gesture(roll3, { click: () => {
        if (!waiting) this.#w.roll(r);
      } });
      parts2.push(roll3);
    }
    els.row.replaceChildren(...parts2);
    els.info.replaceChildren();
    const npc = reacting ? this.#w.game.get(ridOf(r.reaction)) : void 0;
    const label2 = npc ? `${npc.name}'s Reaction` : s.label || (r.action ? r.alt ?? r.action : "");
    if (label2) {
      const base = doc.createElement("span");
      base.className = "base";
      base.append(label2);
      if (s.label) {
        const n = doc.createElement("b");
        n.textContent = s.total !== s.base ? `${s.base} \u2192 ${s.total}` : String(s.base);
        base.append(n);
        const breakdown = Object.entries(s.parts).filter(([k, v]) => k !== "base" && v).map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${SIGN(v)}`);
        base.title = `Total Influence ${s.total}: Base ${s.base}${breakdown.length ? `, ${breakdown.join(", ")}` : ""}.${mine ? " Click to clear." : ""}${gm ? " Drag to aim." : ""}`;
      }
      const pc = this.#w.game.get(ridOf(r.pool))?.name ?? "them";
      if (npc) base.title = `How ${npc.name} takes to ${pc} on meeting.${mine ? " Click to clear." : ""}`;
      gesture(base, { click: () => step(cleared(r)), ...gm && !reacting && { drag: (d, m) => this.#aim(r, d, m) } });
      els.info.append(base);
    }
    if (s.vs) {
      const vs = doc.createElement("span"), shows = s.vs.sees || gm;
      vs.className = "vs";
      vs.append(`vs ${s.vs.name}`);
      if (shows) {
        const n = doc.createElement("b");
        n.textContent = ` ${s.vs.total < 0 ? `\u2212${-s.vs.total}` : s.vs.total} (${SIGN(s.vs.diff)})`;
        vs.append(n);
      }
      const stop = gm ? " Click to stop aiming." : "";
      if (s.vs.oid === WORLD) vs.title = shows ? `The world: the GM's number in the tray, ${s.vs.total}. Difference ${SIGN(s.vs.diff)}.${stop}` : "Only the GM knows the world's number.";
      else vs.title = shows ? `${s.vs.name}: ${s.vs.words ?? `${r.defend} Defend`}, plus Main, Edge, Bias, Affliction, Injury and Stagger = ${s.vs.total}. Difference ${SIGN(s.vs.diff)}.${stop}` : `Only the GM knows ${s.vs.name}'s numbers.`;
      gesture(vs, { click: () => {
        if (gm) this.#set(unaimed(r));
      } });
      els.info.append(vs);
    }
  }
  // R83, R372, R277: drag from the Base onto another character: the pool under the pointer is outlined,
  // the pointing hand holds; let go to aim, through the Defend chooser when they have two.
  // R326, R336, R329: a line runs from the press to the pointer, and the box goes round the number,
  // Field or Skill under it on the target's card front; a drop there aims at it, with no chooser.
  #aim(r, down, move) {
    const doc = document, body = doc.body;
    const under = (e) => {
      const els = doc.elementsFromPoint?.(e.clientX, e.clientY) ?? [], top = els[0];
      if (top && (top.closest?.(".oppo") || top.id === "table" || top.id === "world")) return { oid: WORLD };
      for (const el4 of els) {
        const hit = el4.closest?.(".pool, .obj.card");
        const rid2 = hit?.dataset.rid;
        if (!rid2) continue;
        const oid = rid2.slice(2), text = hit.matches(".obj.card:not(.flipped)") ? hit.querySelector(".front > .text") : null;
        const c = this.#w.game.get(ridOf(oid));
        const at4 = text && c?.kind === "character" ? caretIn(text, e) : null;
        const point = at4 ? points2(c.front).find((p) => p.line === at4.line && p.start <= at4.offset && at4.offset <= p.end) : void 0;
        return point ? { oid, point, text } : { oid };
      }
      return null;
    };
    const box2 = doc.createElement("div"), svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg"), line = doc.createElementNS(svg.namespaceURI, "line");
    box2.id = "aimbox";
    box2.hidden = true;
    svg.id = "aimline";
    line.setAttribute("x1", String(down.clientX));
    line.setAttribute("y1", String(down.clientY));
    svg.append(line);
    body.append(svg, box2);
    let lit;
    const light = (e) => {
      line.setAttribute("x2", String(e.clientX));
      line.setAttribute("y2", String(e.clientY));
      const t = under(e), oid = t && t.oid !== r.pool ? t.oid : null;
      lit?.classList.remove("aimed");
      lit = void 0;
      box2.hidden = true;
      if (!oid) return;
      const rect = oid === WORLD ? this.#w.tray.mark()?.getBoundingClientRect() : t.point ? rangeOf(t.text, t.point)?.getBoundingClientRect() : void 0;
      if (rect) {
        Object.assign(box2.style, { left: `${rect.left - 3}px`, top: `${rect.top - 2}px`, width: `${rect.width + 6}px`, height: `${rect.height + 4}px` });
        box2.hidden = false;
      } else {
        lit = this.#w.pool(oid);
        lit?.classList.add("aimed");
      }
    };
    body.classList.add("tapping", "dragging");
    doc.getSelection()?.removeAllRanges();
    const onMove = (ev) => light(ev);
    const onUp = (ev) => {
      const e = ev;
      if (e.pointerId !== down.pointerId) return;
      doc.removeEventListener("pointermove", onMove);
      doc.removeEventListener("pointerup", onUp);
      body.classList.remove("tapping", "dragging");
      lit?.classList.remove("aimed");
      box2.remove();
      svg.remove();
      const t = under(e), viewer = this.#w.viewer;
      if (t?.oid === WORLD) {
        if ((r.type ?? "?") === "?") {
          this.#note("Say what this roll is first.", e);
          return;
        }
        if (!this.#w.game.get("world")?.set) {
          this.#note(viewer?.gm ? "Put the world's number in the tray first." : "The GM hasn't given the world a number yet.", e);
          return;
        }
        this.#set(aimed2(r, WORLD, "mental"));
        return;
      }
      const opp = t && t.oid !== r.pool ? this.#w.game.get(ridOf(t.oid)) : void 0;
      if (opp?.kind !== "character") return;
      if ((r.type ?? "?") === "?") {
        this.#note("Say what this roll is first.", e);
        return;
      }
      const byType = r.type === "psych" ? "psych" : "mental";
      const remind = () => {
        if (r.type === "skill") this.#note("A Skill or Attribute normally opposes a Skill.", e);
      };
      if (t.point) {
        const a = t.point.against;
        this.#set(aimed2(r, opp.oid, "def" in a ? a.def : byType, a));
        if ("def" in a) remind();
        return;
      }
      if (isAttack(r.type)) {
        this.#set(aimed2(r, opp.oid, byType));
        return;
      }
      const def = defendOf(opp);
      if (!def || def.mental === def.psych) {
        this.#set(aimed2(r, opp.oid, "mental"));
        remind();
        return;
      }
      this.#choose(opp, def, e, (kind) => {
        this.#set(aimed2(r, opp.oid, kind));
        remind();
      });
    };
    doc.addEventListener("pointermove", onMove);
    doc.addEventListener("pointerup", onUp);
    onMove(move);
  }
  /** A small box at the pointer: a note that goes after about 2 s, or the Defend chooser (R372, R277). */
  #box(at4) {
    const doc = document;
    doc.querySelector("#defchoice")?.remove();
    const box2 = doc.createElement("div");
    box2.id = "defchoice";
    box2.style.left = `${Math.min(at4.clientX + 8, innerWidth - 260)}px`;
    box2.style.top = `${Math.min(at4.clientY + 8, innerHeight - 120)}px`;
    doc.body.append(box2);
    const close = (e) => {
      if (e.type === "keydown" ? e.key !== "Escape" : box2.contains(e.target)) return;
      box2.remove();
      doc.removeEventListener("pointerdown", close, true);
      doc.removeEventListener("keydown", close);
    };
    doc.addEventListener("pointerdown", close, true);
    doc.addEventListener("keydown", close);
    return box2;
  }
  #note(text, at4) {
    const box2 = this.#box(at4), p = box2.ownerDocument.createElement("p");
    p.textContent = text;
    box2.append(p);
    setTimeout(() => box2.remove(), 2200);
  }
  // R319, R364: the list of types at the tag; a choice is kept for this action on this card.
  #types(r, at4) {
    const box2 = this.#box(at4), doc = box2.ownerDocument;
    box2.classList.add("types");
    for (const type of ROLL_TYPES) {
      const b = doc.createElement("button");
      b.textContent = TYPE_WORDS[type];
      if (type === (r.type ?? "?")) b.className = "on";
      b.addEventListener("click", () => {
        box2.remove();
        if (r.action) this.#w.remember(r.pool, r.alt ?? r.action, type);
        this.#set(typed2(r, type));
      });
      box2.append(b);
    }
    box2.querySelector("button.on")?.focus();
  }
  #choose(opp, def, at4, pick) {
    const box2 = this.#box(at4), doc = box2.ownerDocument, p = doc.createElement("p");
    p.textContent = `Against ${opp.name}'s Defend`;
    box2.append(p);
    for (const kind of ["mental", "psych"]) {
      const b = doc.createElement("button");
      b.textContent = `${kind === "mental" ? "Mental" : "Psych"} ${def[kind]}`;
      b.addEventListener("click", () => {
        box2.remove();
        pick(kind);
      });
      box2.append(b);
    }
    box2.querySelector("button")?.focus();
  }
  // R72: each row, its words first and its dice at the right; picking one sets the row.
  #openMenu(r, current, menu) {
    const doc = menu.ownerDocument;
    if (!menu.hidden) {
      menu.hidden = true;
      return;
    }
    menu.replaceChildren(...ADV.map((row2) => {
      const b = doc.createElement("button"), words = doc.createElement("span"), dice = doc.createElement("span");
      b.className = row2.key === current ? "on" : "";
      words.textContent = rowWords(row2).split(": ")[0];
      dice.className = "dice";
      dice.textContent = row2.auto ? `auto ${row2.auto === "success" ? "\u2713" : "\u2717"}` : diceOnly(row2);
      b.append(words, dice);
      gesture(b, { click: () => {
        menu.hidden = true;
        this.#set(picked(r, row2.key));
      } });
      return b;
    }));
    menu.hidden = false;
  }
};
function caretIn(text, e) {
  const doc = text.ownerDocument;
  const pos = doc.caretPositionFromPoint?.(e.clientX, e.clientY);
  const range = pos ? null : doc.caretRangeFromPoint?.(e.clientX, e.clientY);
  const node = pos?.offsetNode ?? range?.startContainer, offset = pos?.offset ?? range?.startOffset;
  if (!node || offset === void 0 || !text.contains(node)) return null;
  const lines2 = [...text.children], line = lines2.findIndex((l) => l.contains(node));
  if (line < 0) return null;
  const upTo = doc.createRange();
  upTo.setStart(lines2[line], 0);
  upTo.setEnd(node, offset);
  return { line, offset: upTo.toString().length };
}
function rangeOf(text, p) {
  const div = text.children[p.line];
  if (!div) return null;
  const doc = text.ownerDocument, walk = doc.createTreeWalker(div, NodeFilter.SHOW_TEXT), range = doc.createRange();
  let seen3 = 0, started = false;
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!started && p.start <= seen3 + n.length) {
      range.setStart(n, p.start - seen3);
      started = true;
    }
    if (started && p.end <= seen3 + n.length) {
      range.setEnd(n, p.end - seen3);
      return range;
    }
    seen3 += n.length;
  }
  return null;
}

// src/ui/tape.ts
var EMPTY = { receipts: [] };
function retitled(tape, id, title) {
  return { ...tape, receipts: tape.receipts.map((r) => r.id === id ? { ...r, title } : r) };
}
function torn2(tape, oid, place3) {
  return { kind: "tornroll", oid, place: place3, receipts: tape.receipts };
}
function mayTake(viewer, r, targetOwner) {
  return !!r.attack && !r.attack.taken && !!viewer && (viewer.gm || targetOwner === viewer.name);
}
function mayName(viewer, r) {
  return !!r.attack?.waiting?.length && !!viewer && (viewer.gm || r.by === viewer.name);
}
var ROW_WORDS = { mild: "Mild", min: "Minor", sig: "Significant", maj: "Major" };
var KIND_WORDS = { bias: "Bias", affliction: "Affliction", injury: "Injury" };
function nameWords(target, damage3, row2) {
  return row2 === "lasting" ? `Name ${target}'s ${OVERFLOW[damage3]}` : `Name ${target}'s ${ROW_WORDS[row2]} ${KIND_WORDS[damage3]}`;
}
function mayChoose(viewer, r) {
  return !!r.crit && !r.crit.locked && !!viewer && (viewer.gm || r.by === viewer.name);
}
var TEAR_PX = 5;
var TapeView = class {
  #w;
  #el;
  #strip;
  #shown = "";
  constructor(root, w) {
    this.#w = w;
    const doc = root.ownerDocument;
    this.#el = doc.createElement("div");
    this.#el.id = "tape";
    this.#strip = doc.createElement("div");
    this.#strip.className = "strip";
    this.#el.append(this.#strip);
    root.prepend(this.#el);
    doc.addEventListener("pointerdown", (e) => {
      const t = e.target;
      if (!t.closest?.("#tape, #paperroll, .roller .roll")) this.#el.classList.remove("raised");
    }, true);
    this.#strip.addEventListener("pointerdown", (e) => this.#press(e));
    this.#strip.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    w.game.listen((rids) => {
      if (rids.has("tape")) this.render();
    });
    this.render();
  }
  /** The paper roll on the register: up to a sliver, and down again (raised as it comes down). */
  toggleUp() {
    const up = !this.#w.up();
    this.#w.setUp(up);
    if (!up) this.#el.classList.add("raised");
    this.render();
  }
  render() {
    const tape = this.#w.game.get("tape") ?? EMPTY, doc = this.#el.ownerDocument;
    this.#el.classList.toggle("empty", !tape.receipts.length);
    this.#el.classList.toggle("up", this.#w.up());
    const key = JSON.stringify(tape.receipts);
    if (key === this.#shown) return;
    const first2 = !this.#shown, was = first2 ? void 0 : JSON.parse(this.#shown)[0]?.id;
    this.#shown = key;
    this.#strip.replaceChildren(...tape.receipts.map((r) => this.#receipt(doc, r)));
    const top = this.#strip.firstElementChild;
    if (!first2 && top && tape.receipts[0].id !== was) {
      top.classList.add("printing");
      this.#el.classList.add("raised");
      this.#strip.scrollTop = 0;
    }
  }
  #receipt(doc, r) {
    const e = receiptEl(doc, r), title = e.querySelector(".title");
    title.contentEditable = "true";
    title.spellcheck = false;
    title.addEventListener("blur", () => {
      const tape = this.#w.game.get("tape") ?? EMPTY, text = title.textContent?.trim() ?? "";
      if (text && text !== r.title) this.#w.game.change((w) => w.put("tape", retitled(tape, r.id, text)));
    });
    if (mayChoose(this.#w.viewer, r)) {
      const chosen = r.crit.chosen, other = chosen === "max" ? "dbl" : "max";
      e.querySelector(".other")?.addEventListener("click", () => this.#w.crit(r.id, other, false));
      const lock = doc.createElement("button");
      lock.className = "lock";
      lock.textContent = "punch";
      lock.title = "Lock this result in";
      lock.addEventListener("click", () => this.#w.crit(r.id, chosen, true));
      e.querySelector(".chosen")?.append(lock);
    }
    if (mayTake(this.#w.viewer, r, this.#w.owner(r.attack?.target ?? ""))) {
      const take2 = doc.createElement("button");
      take2.className = "take";
      take2.textContent = `Take ${r.attack.result}`;
      take2.title = `${r.attack.name} takes this Attack: choose which Slots absorb it`;
      take2.addEventListener("click", () => this.#w.take(r));
      e.append(take2);
    }
    if (this.#w.viewer?.gm && r.transfer && !r.transfer.done) {
      const t = doc.createElement("button");
      t.className = "transfer";
      t.textContent = "Transfer";
      t.title = `Move a Resource from ${r.transfer.name}, up to ${["", "Min", "Sig", "Maj", "Ext", "Exq"][r.transfer.sl]}`;
      t.addEventListener("click", () => {
        e.querySelector(".givable")?.remove();
        const list2 = doc.createElement("div"), names = this.#w.givable(r.id);
        list2.className = "givable";
        if (!names.length) list2.textContent = `${r.transfer.name} has nothing to give at this Level`;
        for (const n of names) {
          const b = doc.createElement("button");
          b.textContent = n;
          b.addEventListener("click", () => {
            list2.remove();
            this.#w.transfer(r.id, n);
          });
          list2.append(b);
        }
        e.append(list2);
      });
      e.append(t);
    }
    if (mayName(this.#w.viewer, r)) {
      for (const { damage: damage3, row: row2 } of r.attack.waiting) {
        const label2 = doc.createElement("label"), input = doc.createElement("input");
        label2.className = "naming";
        label2.append(nameWords(r.attack.name, damage3, row2), input);
        input.spellcheck = false;
        input.addEventListener("keydown", (ev) => {
          if (ev.key !== "Enter" || !input.value.trim()) return;
          this.#w.name(r.id, damage3, row2, input.value.trim());
          input.disabled = true;
        });
        e.append(label2);
      }
    }
    return e;
  }
  // R113, R283: a press on the tape raises it; dragged a few pixels, the whole roll tears off.
  #press(e) {
    if (e.button !== 0) return;
    const t = e.target;
    e.stopPropagation();
    this.#el.classList.add("raised");
    if (t.closest(".title[contenteditable]") || t.closest("button, .other, .naming, .givable")) return;
    const tape = this.#w.game.get("tape") ?? EMPTY;
    if (!tape.receipts.length) return;
    e.preventDefault();
    const doc = this.#el.ownerDocument, box2 = this.#strip.getBoundingClientRect();
    const onMove = (ev) => {
      if (ev.pointerId !== e.pointerId || Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < TEAR_PX) return;
      stop();
      const oid = this.#w.mint(), at4 = this.#w.toWorld(box2.left, box2.top);
      const roll3 = torn2(tape, oid, { x: Math.round(at4.x), y: Math.round(at4.y), z: 0, tilt: 0 }), rid2 = ridFor(roll3);
      this.#w.game.change((w) => {
        w.put(rid2, roll3);
        w.put("tape", { receipts: [], last: newestRoll(tape) });
      });
      this.#el.classList.remove("raised");
      this.#w.carry(rid2, e, ev);
    };
    const stop = () => {
      doc.removeEventListener("pointermove", onMove);
      doc.removeEventListener("pointerup", stop);
    };
    doc.addEventListener("pointermove", onMove);
    doc.addEventListener("pointerup", stop);
  }
};

// src/ui/register.ts
var ROUND_MAX = 99;
var END_MS = 3e3;
function stepped(meta, by) {
  return { ...meta, round: Math.max(0, Math.min(ROUND_MAX, meta.round + by)) };
}
function ended(game2, scene2 = false) {
  return (w) => {
    const meta = game2.get("meta");
    w.put("meta", { ...meta, round: 0 });
    for (const [rid2, r] of game2.all()) {
      const p = r;
      if (!("kind" in p)) continue;
      if (p.kind === "character") {
        const c = mildEnds(recharge(p));
        w.put(rid2, scene2 ? rechargeMotives(c) : c);
        continue;
      }
      if (p.kind !== "influence") continue;
      const was = p;
      if (was.crit || was.where === "used" && was.tap) {
        w.del(rid2);
        continue;
      }
      const k = mildGone(was);
      if (!k) w.del(rid2);
      else if (k.where === "used") w.put(rid2, { ...k, where: "drawer", used: false });
      else if (k.used || k !== was) w.put(rid2, { ...k, used: false });
    }
  };
}
var RegisterView = class {
  #w;
  #el;
  #tab;
  #shown = -1;
  #armed = null;
  /** R492: what the raised tab offers: the scene's end (armed at Round 0) or the Conflict's. */
  #scene = false;
  constructor(bar, w) {
    this.#w = w;
    const doc = bar.ownerDocument, el4 = (tag, cls, text = "") => {
      const e = doc.createElement(tag);
      e.className = cls;
      e.textContent = text;
      return e;
    };
    this.#el = el4("div", "register");
    const win = el4("div", "window"), confirm2 = el4("span", "tab", "End conflict?");
    this.#tab = el4("span", "rtab");
    win.append(el4("small", "label", "Round"), this.#tab, confirm2);
    const keys2 = el4("div", "keys"), up = el4("button", "key up", "\u25B2"), down = el4("button", "key down", "\u25BC"), end = el4("button", "key end", "End");
    const roll3 = el4("button", "paperroll");
    roll3.id = "paperroll";
    roll3.title = "Roll the tape up, or down again";
    up.title = "The next Round";
    down.title = "The Round before";
    end.title = "End the Conflict: Round to 0, Biases, Afflictions and Injuries recharged, the used piles emptied. At Round 0, end the scene: Motivations recharged too (\u25B2 to Round 1 first to end only the Conflict)";
    keys2.append(up, down, end);
    this.#el.append(el4("span", "rslot"), win, keys2, roll3);
    bar.append(this.#el);
    const gm = !!w.viewer?.gm && !!w.checkpoint;
    for (const k of [up, down, end]) k.disabled = !gm;
    const step = (by) => w.game.change((x) => x.put("meta", stepped(w.game.get("meta"), by)));
    gesture(up, { click: () => step(1) });
    gesture(down, { click: () => step(-1) });
    const lower = () => {
      clearTimeout(this.#armed);
      this.#armed = null;
      this.#el.classList.remove("armed");
    };
    confirm2.title = "Shift-click or long-press to cancel";
    gesture(confirm2, { shift: lower });
    gesture(end, { click: () => {
      const round = w.game.get("meta").round;
      if (this.#armed === null) {
        this.#scene = round === 0;
        confirm2.textContent = this.#scene ? "End scene?" : "End conflict?";
        this.#el.classList.add("armed");
        this.#armed = setTimeout(() => {
          this.#armed = null;
          this.#el.classList.remove("armed");
        }, END_MS);
        return;
      }
      lower();
      const scene2 = this.#scene, end2 = () => w.game.change(ended(w.game, scene2));
      void w.checkpoint?.(scene2 ? "End of scene" : `End of conflict, round ${round}`).then(end2, end2);
    } });
    gesture(roll3, { click: () => w.paperRoll() });
    w.game.listen((rids) => {
      if (rids.has("meta")) this.render();
    });
    this.render();
  }
  // R284: a changed Round drops its tab and brings it back up with the new number.
  render() {
    const round = this.#w.game.get("meta")?.round ?? 0;
    if (round === this.#shown) return;
    const first2 = this.#shown < 0;
    this.#shown = round;
    const reduce = this.#el.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (first2 || reduce) {
      this.#tab.textContent = String(round);
      return;
    }
    this.#tab.classList.add("down");
    setTimeout(() => {
      this.#tab.textContent = String(round);
      this.#tab.classList.remove("down");
    }, 110);
  }
  /** The register's left edge on screen, for hanging the tape under it (R282). */
  left() {
    return this.#el.getBoundingClientRect().left;
  }
};

// src/ui/desk.ts
function release(l) {
  if (l.imageOut || l.hole === "image") return "picker";
  if (l.hole) return l.touch ? "below" : "loose";
  if (!l.moved && l.onDesk) return l.open ? "close" : "open";
  return "close";
}
var HOLES = [
  ["character", "supply card", "character", "A new character: card and pool"],
  ["sticky", "supply note", "note", "Sticky note"],
  ["text", "supply aa", "Aa", "Write on the table"],
  ["image", "supply image", "image", "Add an image"],
  ["howto", "supply howto", "how to play", "The reference sheet: how to use the table, the quick reference, quick character creation"],
  // R591, R530: a docket's label on its red tape.
  ["docket", "supply docket", "docket", "A docket: a named bundle of paper, tied in red tape"]
];
var LINKS = ["connections", "supply links", "connections", "The Connection Table: how the characters view each other"];
var ART = `
<path d="M15 40h2l-.5 11h-1zM49 40h2l-.5 11h-1z" fill="#6e4b33"/>
<path d="M5 40h4l-1 16H6zM57 40h4l-1 16h-2z" fill="#7a5337"/>
<path d="M9 7q5-4 11-2t13-2q7 4 13 2t11 2v2H9z" fill="#6e4b33"/>
<rect x="8" y="8" width="50" height="16" rx="1" fill="#8f6444"/>
<rect x="8" y="8" width="50" height="1.5" fill="#a0714b"/>
<g class="holes">
<path d="M10 23V12q3.25-2 6.5 0v11zM18 23V12q3.25-2 6.5 0v11zM41.5 23V12q3.25-2 6.5 0v11zM49.5 23V12q3.25-2 6.5 0v11z"/>
</g>
<rect x="11" y="15" width="4.5" height="8" fill="#fbfaf6"/>
<rect x="19" y="17" width="4.5" height="6" fill="#fff200"/>
<rect x="42.5" y="14" width="4.5" height="9" fill="#ecd9a8"/>
<rect x="50.5" y="16" width="4.5" height="7" fill="#fbfaf6"/>
<g fill="#8a5d3d" stroke="rgba(0,0,0,.4)" stroke-width=".5">
<rect x="27" y="10" width="12" height="4"/><rect x="27" y="15" width="12" height="4"/><rect x="27" y="20" width="12" height="3.5"/>
</g>
<g fill="#d9b45a"><circle cx="33" cy="12" r=".8"/><circle cx="33" cy="17" r=".8"/><circle cx="33" cy="21.8" r=".8"/></g>
<path d="M7 24h52l4 7H3z" fill="#7a5337"/>
<path d="M9 24.6h48l3.5 5.6h-55z" fill="#5f6b2e"/>
<path d="M10.5 25.3h45l3.1 4.2H7.4z" fill="none" stroke="#c9a84a" stroke-width=".5" opacity=".8"/>
<rect x="3" y="31" width="60" height="10" rx="1" fill="#8f6444"/>
<rect x="3" y="31" width="60" height="1.2" fill="#a0714b"/>
<g fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".8"><rect x="5" y="32.5" width="27" height="7"/><rect x="34" y="32.5" width="27" height="7"/></g>
<g fill="none" stroke="#d9b45a" stroke-width=".9"><circle cx="18.5" cy="36" r="1.7"/><circle cx="47.5" cy="36" r="1.7"/></g>
<rect x="3" y="41" width="60" height="1.2" fill="rgba(0,0,0,.3)"/>`;
function deskArt(doc) {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "art");
  svg.setAttribute("viewBox", "0 0 66 58");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = ART;
  return svg;
}
var CLICK = 4;
var BELOW = 110;
var THROW = "Set this desk out: everyone's table switches to its desktop";
var DeskView = class {
  el;
  #w;
  /** The panel below the desk: the pigeonholes, and on the open desk the drawers. */
  #strip;
  #drawers;
  /** R526: the drawer pulled out, if any. */
  #pulled = null;
  /** R546, R547: the search line, and whether its list shows (from its focus until a drawer is pulled or the desk closes). */
  #find;
  #searching = false;
  /** What render redraws: the drawer fronts and the list below them. */
  #body;
  /** R551: the open desk's name, between its arrows (the GM's). */
  #name;
  /** R559, R560: the knife switch beside the open desk's name (the GM's). */
  #knife = null;
  /** R562: the board of desks hung below the desk while a piece would be filed. */
  #board;
  #image;
  #imageSays;
  #file;
  /** Where picked images go, and whether one is carried. */
  #pickAt = null;
  #open = false;
  constructor(doc, w) {
    this.#w = w;
    const el4 = (tag, cls, text = "", title = "") => {
      const e = doc.createElement(tag);
      e.className = cls;
      e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    this.el = el4("div", "desk", "", "The desk: press for paper; click to open it");
    this.el.append(deskArt(doc));
    this.#strip = el4("div", "deskpanel");
    const holes = el4("div", "pigeonholes");
    this.#drawers = el4("div", "drawers");
    this.#find = doc.createElement("input");
    this.#find.className = "search";
    this.#find.placeholder = "Find in the desk";
    this.#find.spellcheck = false;
    const searching = () => {
      this.#searching = true;
      this.#pulled = null;
      this.render();
    };
    this.#find.addEventListener("focus", searching);
    this.#find.addEventListener("input", searching);
    this.#body = el4("div", "drawerbody");
    this.#name = doc.createElement("input");
    this.#name.className = "dname";
    this.#name.spellcheck = false;
    this.#name.placeholder = "Unnamed desk";
    this.#name.setAttribute("aria-label", "Desk name");
    if (w.gm) {
      const nav = el4("div", "desknav");
      const back3 = el4("button", "deskprev", "\u2039", "The desk before"), on = el4("button", "desknext", "\u203A", "The next desk, or a new one");
      const browse = (f) => {
        const b = f(w.filed(), this.#cur());
        w.setDesks(b.desk, b.cur);
        this.render();
      };
      back3.addEventListener("click", () => browse(deskPrev));
      on.addEventListener("click", () => browse(deskNext));
      this.#name.addEventListener("input", () => {
        const d = w.filed(), cur = this.#cur(), n = this.#name.value;
        w.setDesks({ ...d, desks: d.desks.map((x, i) => i === cur ? { ...x, name: n, named: n.trim() !== "" } : x) }, cur);
      });
      this.#name.addEventListener("change", () => browse((d, cur) => deskRename(d, cur, this.#name.value)));
      this.#knife = el4("button", "knife", "", THROW);
      this.#knife.addEventListener("click", () => {
        const cur = this.#cur();
        if (cur !== (w.filed().out ?? 0)) w.setOut(cur);
      });
      nav.append(back3, this.#name, on, this.#knife);
      this.#drawers.append(nav);
    }
    this.#drawers.append(this.#find, this.#body);
    this.#board = el4("div", "deskboard");
    this.#strip.append(holes, this.#drawers);
    let image2 = null;
    for (const [what, cls, text, title] of w.gm ? [...HOLES, LINKS] : HOLES) {
      const hole = el4("div", "hole", "", title), icon = el4("div", cls, text);
      hole.dataset.paper = what;
      hole.append(icon);
      holes.append(hole);
      if (what === "image") image2 = icon;
    }
    this.#image = image2 ?? el4("div", "supply image");
    this.#imageSays = { text: this.#image.textContent ?? "", title: this.#image.title };
    this.#file = doc.createElement("input");
    this.#file.type = "file";
    this.#file.accept = "image/*";
    this.#file.multiple = true;
    this.#file.hidden = true;
    this.#file.addEventListener("change", () => {
      const files = [...this.#file.files ?? []], to = this.#pickAt;
      this.#file.value = "";
      this.#pickAt = null;
      if (files.length) w.images(files, to?.at ?? null, !!to?.carry && files.length === 1);
    });
    this.el.append(this.#strip, this.#board, this.#file);
    this.el.addEventListener("pointerdown", (ev) => {
      if (!this.#drawers.contains(ev.target)) this.#press(ev);
    });
    this.render();
    doc.addEventListener("pointerdown", (ev) => {
      if (this.#open && !this.el.contains(ev.target)) this.#show(false);
    }, true);
  }
  // R517: the image pigeonhole says the browser won't keep an image, and the desk is edged red.
  /** Marks the image pigeonhole refused (`label`, and `why` on hover), or plain again with null. */
  refused(r) {
    this.#image.classList.toggle("refused", !!r);
    this.#image.textContent = r ? r.label : this.#imageSays.text;
    this.#image.title = r ? r.why : this.#imageSays.title;
    this.el.classList.toggle("refused", !!r);
  }
  /** R552: the open desk's index, within the desks there are. */
  #cur() {
    return Math.max(0, Math.min(this.#w.cur(), this.#w.filed().desks.length - 1));
  }
  // R526: the open desk's drawers: a front each, a brass pull and its label; the one pulled out lists
  // what is filed in it, oldest first, by name; an entry dragged out comes back (R527).
  /** Draws the drawers from the page's desk record. */
  render() {
    const doc = this.el.ownerDocument;
    const make4 = (tag, cls, text = "", title = "") => {
      const e = doc.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    const desks = this.#w.filed(), cur = this.#cur(), several = desks.desks.length > 1;
    if (doc.activeElement !== this.#name) this.#name.value = desks.desks[cur]?.name ?? "";
    this.el.classList.toggle("several", several);
    const out = Math.min(desks.out ?? 0, desks.desks.length - 1);
    if (this.#knife) {
      this.#knife.classList.toggle("thrown", cur === out);
      this.#knife.title = cur === out ? "This desk is set out" : THROW;
    }
    const order2 = [out, ...desks.desks.map((_, i) => i).filter((i) => i !== out)];
    this.#board.replaceChildren(...order2.map((i) => {
      const row2 = make4("div", "deskrow"), name2 = deskName(desks.desks[i]);
      row2.dataset.desk = String(i);
      row2.dataset.name = name2;
      const mini = make4("span", "minidesk");
      mini.append(deskArt(doc));
      row2.append(mini, make4("span", "holder", name2));
      if (i === out) row2.append(make4("span", "switch", "", "Set out"));
      return row2;
    }));
    const fronts = make4("div", "fronts");
    for (const d of drawers(this.#w.gm)) {
      const front = make4("button", `drawerfront${this.#pulled === d ? " pulled" : ""}`, "", `${LABEL[d]}: click to pull it out`);
      front.dataset.drawer = d;
      front.append(make4("span", "label", LABEL[d]), make4("span", "pull"));
      front.addEventListener("click", () => {
        this.#pulled = this.#pulled === d ? null : d;
        this.#searching = false;
        this.render();
      });
      fronts.append(front);
    }
    const entry = (at4, k, name2, drawer2) => {
      const b = make4("button", "", name2, "Drag this back onto the table");
      if (drawer2) b.append(make4("span", "where", several ? `${deskName(desks.desks[at4])}: ${LABEL[drawer2]}` : LABEL[drawer2]));
      gesture(b, { drag: (_down, move) => {
        this.#show(false);
        this.#w.takeOut(at4, k, move);
      } });
      return b;
    };
    if (this.#searching) {
      const list3 = make4("div", "filed found"), hits = search(desks, this.#find.value);
      if (!hits.length) list3.append(make4("p", "", this.#find.value.trim() ? "Nothing found." : "Nothing filed here."));
      for (const { at: at4, k, entry: e } of hits) list3.append(entry(at4, k, e.name, e.drawer));
      this.#body.replaceChildren(fronts, list3);
      return;
    }
    if (!this.#pulled) {
      this.#body.replaceChildren(fronts);
      return;
    }
    const list2 = make4("div", "filed"), filed2 = inDrawer(desks, cur, this.#pulled);
    list2.dataset.drawer = this.#pulled;
    if (!filed2.length) list2.append(make4("p", "", "Nothing filed here."));
    for (const { k, entry: e } of filed2) list2.append(entry(cur, k, e.name));
    this.#body.replaceChildren(fronts, list2);
  }
  /** The strip shown (a press or the open desk) or hidden; `open` keeps it until a press elsewhere. */
  #show(on, open = false) {
    this.#open = on && open;
    if (!this.#open && (this.#pulled || this.#searching || this.#find.value)) {
      this.#pulled = null;
      this.#searching = false;
      this.#find.value = "";
      this.render();
    }
    this.el.classList.toggle("pressed", on);
    this.el.classList.toggle("open", this.#open);
  }
  #holeAt(x, y) {
    const e = this.el.ownerDocument.elementFromPoint(x, y);
    const hole = e?.closest(".hole");
    return hole && this.el.contains(hole) ? hole.dataset.paper : null;
  }
  #inside(x, y) {
    return [this.el, this.#strip].some((e) => {
      const r = e.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
  }
  // R530, R512-R516: the press, followed until it is let go or hands its piece over.
  #press(down) {
    if (down.button !== 0) return;
    down.preventDefault();
    const doc = this.el.ownerDocument, open = this.#open;
    this.#show(true, open);
    let moved = false, held = this.#holeAt(down.clientX, down.clientY), imageOut = false;
    let ghost = null;
    const hold = (what, at4) => {
      if (what && ghost?.dataset.paper !== what) {
        ghost?.remove();
        const icon = this.#strip.querySelector(`[data-paper="${what}"] > *`);
        ghost = icon.cloneNode(true);
        ghost.classList.add("ghost");
        ghost.dataset.paper = what;
        this.el.append(ghost);
      }
      if (ghost) {
        ghost.style.left = `${at4.clientX}px`;
        ghost.style.top = `${at4.clientY}px`;
      }
    };
    const stop = () => {
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", up);
      doc.removeEventListener("pointercancel", cancel);
      ghost?.remove();
    };
    const move = (ev) => {
      const e = ev;
      if (e.pointerId !== down.pointerId) return;
      if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) > CLICK) moved = true;
      if (imageOut) {
        hold("image", e);
        return;
      }
      const h = this.#holeAt(e.clientX, e.clientY);
      if (h) held = h;
      if (!this.#inside(e.clientX, e.clientY) && held) {
        if (held === "image") {
          imageOut = true;
          hold("image", e);
          return;
        }
        stop();
        this.#show(false);
        this.#w.take(held, down, e, "press");
        return;
      }
      hold(held, e);
    };
    const up = (ev) => {
      const e = ev;
      if (e.pointerId !== down.pointerId) return;
      stop();
      const hole = imageOut ? null : this.#holeAt(e.clientX, e.clientY);
      const r = release({ moved, onDesk: !hole && this.el.contains(e.target), hole, imageOut, touch: e.pointerType === "touch", open });
      if (r === "open") {
        this.#show(true, true);
        return;
      }
      const under = this.#strip.getBoundingClientRect().bottom;
      this.#show(false);
      const paper = hole;
      if (r === "picker") {
        this.#pickAt = { at: { clientX: e.clientX, clientY: e.clientY }, carry: !imageOut };
        this.#file.click();
      } else if (r === "loose") this.#w.take(paper, e, e, "loose");
      else if (r === "below") {
        const at4 = { clientX: e.clientX, clientY: under + BELOW };
        this.#w.take(paper, at4, at4, "below");
      }
    };
    const cancel = (ev) => {
      if (ev.pointerId === down.pointerId) {
        stop();
        this.#show(false);
      }
    };
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", up);
    doc.addEventListener("pointercancel", cancel);
    hold(held, down);
  }
};

// src/ui/pool.ts
var MAT_W = 430;
var SLOT_W = 72;
var STAGGER_W = 92;
var STRIP_W = 16;
var SLOT_GAP = 6;
var MAT_PAD = 6;
function openSlots(holding, width = MAT_W) {
  const full = (i) => SLOTS[i] === "stagger" ? STAGGER_W : SLOT_W;
  const open = [...holding];
  const used = () => open.reduce((a, o, i) => a + (o ? full(i) : STRIP_W), 0) + SLOT_GAP * (open.length - 1);
  for (let i = 0; i < open.length; i++) {
    if (open[i]) continue;
    open[i] = true;
    if (used() > width - 2 * MAT_PAD) {
      open[i] = false;
      break;
    }
  }
  return open;
}
function insertAt(cards, x, y) {
  const k = cards.findIndex((r) => y < r.top || y <= r.bottom && x < (r.left + r.right) / 2);
  return k < 0 ? cards.length : k;
}
function reachFor(holding, at4, from, width = MAT_W) {
  const open = openSlots(holding, width);
  if (at4 === null || open[at4]) return open;
  open[at4] = true;
  const free2 = (i) => open[i] && !holding[i] && i !== at4;
  let close = from !== null && free2(from) ? from : -1;
  for (let i = (from ?? at4) - 1; close < 0 && i >= 0; i--) if (free2(i)) close = i;
  if (close >= 0) open[close] = false;
  return open;
}
function pops(before2, after) {
  const out = /* @__PURE__ */ new Set();
  if (!before2) return out;
  const lost = /* @__PURE__ */ new Map();
  for (const [k, b] of before2) if (!after.has(k)) lost.set(b.place, (lost.get(b.place) ?? 0) + 1);
  for (const [k, a] of after) {
    const b = before2.get(k);
    if (b ? b.points !== a.points : k.startsWith("pile:") || (lost.get(a.place) ?? 0) >= 2) out.add(k);
  }
  return out;
}
var LABEL2 = {
  bonus: "Bonus",
  main: "Main",
  edge: "Edge",
  stagger: "Stagger",
  bias: "Bias",
  affliction: "Affliction",
  injury: "Injury"
};
var el3 = (doc, tag, cls, text) => {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== void 0) e.textContent = text;
  return e;
};
var run = (game2, c) => {
  if (c) game2.change(c);
};
var isPile2 = (u) => "members" in u;
var at2 = (i, owner, slot2) => typeof i.where === "object" && "slot" in i.where && i.where.slot === owner && (!slot2 || i.where.name === slot2);
function makeMenu(e, oid, w) {
  const was = e.querySelector(":scope > .poolmenu");
  if (was) {
    was.remove();
    return;
  }
  const m = el3(e.ownerDocument, "div", "poolmenu");
  const info = el3(e.ownerDocument, "button", "", "Info card");
  gesture(info, { click: () => {
    m.remove();
    w.addInfo(oid);
  } });
  m.append(info);
  const all2 = w.game.all().map(([, r]) => r), chars = all2.filter((r) => r.kind === "character");
  const t = tableOf(all2) ?? newConnections("", { x: 0, y: 0, z: 0, tilt: 0 });
  const c = chars.find((x) => x.oid === oid), holder = c && rowOf(t, c);
  const offer3 = candidates(t, all2.filter((r) => r.kind === "opinion"), holder?.id ?? "", chars);
  if (offer3.length) m.append(el3(e.ownerDocument, "div", "menuhead", "Opinion of"));
  for (const o of offer3) {
    const b = el3(e.ownerDocument, "button", `opinionof${o.pc ? " pc" : ""}`, o.name);
    gesture(b, { click: () => {
      m.remove();
      w.addOpinion(oid, o.id);
    } });
    m.append(b);
  }
  e.append(m);
}
function drawPool(c, items, old, w) {
  const doc = old?.ownerDocument ?? document, rid2 = ridOf(c.oid);
  const e = old ?? make3(doc, c, w);
  e.style.left = `${c.pool.x}px`;
  e.style.top = `${c.pool.y}px`;
  e.style.zIndex = String(c.pool.z);
  const name2 = e.querySelector(".name");
  name2.contentEditable = mayWrite(w.viewer, c) ? "true" : "false";
  if (doc.activeElement !== name2 && name2.textContent !== c.name) name2.textContent = c.name;
  const die3 = e.querySelector(".die-own");
  die3.textContent = ownerWord(c);
  die3.title = c.owner === OPEN ? "Open: click to claim this character" : "Click to roll for this character; shift-click to open it for someone else";
  e.querySelector(".makemenu").hidden = !(w.viewer?.gm && c.owner === GM);
  e.querySelector(".gather").hidden = c.gathered;
  const opened = w.poolOpen(), shown3 = /* @__PURE__ */ new Map(), drawn = /* @__PURE__ */ new Map();
  const slotEls = [...e.querySelectorAll(".slot")];
  const mine = slotEls.map((slotEl) => items.filter((i) => at2(i, c.oid, slotEl.dataset.slot)));
  holdingOf.set(e, slotEls.map((slotEl, k) => mine[k].length > 0 || opened.slots.has(`${c.oid}:${slotEl.dataset.slot}`)));
  layout(e);
  const pileUp = canSee(w.viewer, c);
  slotEls.forEach((slotEl, k) => units(slotEl, mine[k], w, shown3, drawn, pileUp || slotEl.dataset.slot === "stagger"));
  drawer(e.querySelector(".drawer"), c, items.filter((i) => i.kind === "influence" && i.home === c.oid), w, shown3, drawn);
  for (const k of pops(seen2.get(e), shown3)) pop(drawn.get(k));
  seen2.set(e, shown3);
  e.dataset.rid = rid2;
  return e;
}
var holdingOf = /* @__PURE__ */ new WeakMap();
var reaching = /* @__PURE__ */ new WeakMap();
function layout(e) {
  const holding = holdingOf.get(e), r = reaching.get(e);
  if (!holding) return;
  const ix = (s) => s ? SLOTS.indexOf(s) : null;
  const open = reachFor(holding, ix(r?.at), ix(r?.from));
  e.querySelectorAll(".slot").forEach((slotEl, k) => slotEl.classList.toggle("narrow", !open[k]));
}
function reach(pool, at4, from) {
  const was = reaching.get(pool);
  if (was?.at === at4 && was.from === from) return;
  if (at4) reaching.set(pool, { at: at4, from });
  else reaching.delete(pool);
  layout(pool);
}
var seen2 = /* @__PURE__ */ new WeakMap();
function pop(e) {
  if (!e) return;
  e.classList.remove("rolled");
  void e.offsetWidth;
  e.classList.add("rolled");
  e.addEventListener("animationend", () => e.classList.remove("rolled"), { once: true });
}
function make3(doc, c, w) {
  const e = el3(doc, "div", "obj pool");
  e.dataset.part = "pool";
  const rid2 = ridOf(c.oid);
  const hd = el3(doc, "div", "hd");
  const gather = el3(doc, "button", "gather", "gather");
  gesture(gather, { click: () => {
    const cur = w.game.get(rid2);
    w.game.change((x) => x.put(rid2, { ...cur, gathered: true }));
  } });
  const name2 = el3(doc, "span", "name");
  name2.spellcheck = false;
  name2.addEventListener("pointerdown", (ev) => {
    if (doc.activeElement === name2) ev.stopImmediatePropagation();
  });
  name2.addEventListener("input", () => {
    const cur = w.game.get(rid2);
    if (cur) w.game.change((x) => x.put(rid2, { ...cur, name: (name2.textContent ?? "").slice(0, CAPS.name) }));
  });
  name2.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      name2.blur();
    }
  });
  const die3 = el3(doc, "button", "die-own");
  gesture(die3, { click: () => w.poolDie(c.oid, false, die3), shift: () => w.poolDie(c.oid, true, die3) });
  const menu = el3(doc, "button", "makemenu", "\u25BE");
  menu.title = "Make something on this character";
  gesture(menu, { click: () => makeMenu(e, c.oid, w) });
  hd.append(name2, die3, menu, gather);
  const slots2 = el3(doc, "div", "slots");
  for (const s of SLOTS) {
    const slot2 = el3(doc, "div", `slot slot-${s}`);
    slot2.dataset.slot = s;
    slot2.dataset.owner = c.oid;
    const label2 = el3(doc, "span", "label", LABEL2[s]);
    label2.dataset.letter = LABEL2[s][0];
    if (s === "stagger") label2.append(el3(doc, "small", "", "opposition only"));
    slot2.title = s === "stagger" ? "Stagger (opposition only)" : LABEL2[s];
    slot2.append(label2, el3(doc, "div", "pos"), el3(doc, "div", "neg"));
    gesture(slot2, {
      click: (ev) => {
        if (ev.target.closest(".chip, .pile")) return;
        if (slot2.classList.contains("narrow")) {
          w.toggle("slots", `${c.oid}:${s}`, true);
          return;
        }
        run(w.game, addLoose(w.game, c.oid, s, false, w.mint(), w.viewer?.name));
      },
      shift: (ev) => {
        if (ev.target.closest(".chip, .pile") || slot2.classList.contains("narrow")) return;
        run(w.game, addLoose(w.game, c.oid, s, true, w.mint(), w.viewer?.name));
      }
    });
    slots2.append(slot2);
  }
  const drawer2 = el3(doc, "div", "drawer");
  drawer2.dataset.drawer = c.oid;
  drawer2.append(el3(doc, "div", "cards"), el3(doc, "div", "tools"));
  e.append(hd, slots2, drawer2);
  for (const part of [name2, slots2, drawer2]) gesture(part, { drag: (d, m) => w.dragPool(rid2, d, m) });
  return e;
}
function units(slotEl, items, w, shown3, drawn, pileUp) {
  const doc = slotEl.ownerDocument, units2 = pileUp ? rollUp(items) : items;
  const opened = w.poolOpen(), place3 = slotEl.dataset.slot;
  for (const sign2 of [1, -1]) {
    const box2 = slotEl.querySelector(sign2 > 0 ? ".pos" : ".neg");
    const mine = units2.filter((u) => u.sign === sign2).sort((a, b) => sign2 > 0 ? worthOf(b) - worthOf(a) : worthOf(a) - worthOf(b));
    box2.replaceChildren(...mine.map((u, k) => {
      const piled = isPile2(u);
      const e = piled ? pile2(doc, u, opened.piles, w) : chip(doc, u, w);
      e.style.zIndex = String((!piled && u.kind === "influence" && u.flag ? 100 : 50) - k);
      const key = piled ? `pile:${u.members[0]?.oid ?? ""}` : u.oid;
      shown3.set(key, { points: u.points, place: place3 });
      drawn.set(key, e);
      return e;
    }));
  }
}
var worthOf = (u) => isPile2(u) ? u.points : worth(u);
function chipFace(i) {
  if (i.points === 1) return i.sign < 0 ? "\u22121" : "+1";
  return `${i.sign < 0 ? "\u2212" : ""}${i.points}`;
}
function chip(doc, i, w) {
  const card2 = i.kind === "influence";
  const b = el3(
    doc,
    "button",
    `chip ${i.sign > 0 ? "pos" : "neg"}${card2 ? " card-chip" : ""}${card2 && i.tap ? " res" : ""}${card2 && i.used ? " used" : ""}`,
    chipFace(i)
  );
  const rid2 = ridOf(i.oid);
  b.dataset.rid = rid2;
  if (card2) {
    b.title = i.name;
    b.dataset.name = i.name;
  }
  if (card2 && i.flag) b.append(flagMark(doc, i, rid2, w));
  if (i.kind === "chip" && i.rider) {
    const r = el3(doc, "span", "rider", "+1");
    gesture(r, { click: () => void 0, shift: () => run(w.game, riderClick(w.game, rid2, true)) });
    b.append(r);
  }
  const click2 = i.kind === "chip" ? chipClick : cardClick;
  gesture(b, {
    click: () => run(w.game, click2(w.game, rid2, false, w.mint())),
    shift: () => run(w.game, click2(w.game, rid2, true, w.mint())),
    drag: (d, m) => w.dragItem(rid2, d, m)
  });
  return b;
}
function pile2(doc, p, open, w) {
  const first2 = p.members[0]?.oid ?? "";
  const d = el3(doc, "div", `pile ${p.sign > 0 ? "pos" : "neg"}${open.has(first2) ? " open" : ""}`);
  const disc = el3(doc, "button", "chip disc", `${p.sign < 0 ? "\u2212" : ""}${p.points}`);
  disc.title = `${p.members.length} acting as one`;
  gesture(disc, { click: () => w.toggle("piles", first2) });
  d.append(disc);
  if (open.has(first2)) {
    const list2 = el3(doc, "div", "members");
    for (const m of p.members) list2.append(isPile2(m) ? pile2(doc, m, open, w) : chip(doc, m, w));
    d.append(list2);
  }
  return d;
}
function drawer(box2, c, cards, w, shown3, drawn) {
  const doc = box2.ownerDocument, opened = w.poolOpen();
  const visible = canSee(w.viewer, c);
  const here2 = cards.filter((k) => k.where === "drawer"), used = cards.filter((k) => k.where === "used");
  box2.querySelector(".cards").replaceChildren(...here2.sort((a, b) => a.n - b.n).map((k) => {
    const e = card(doc, k, visible, w);
    shown3.set(k.oid, { points: k.points, place: "drawer" });
    drawn.set(k.oid, e);
    return e;
  }));
  const tools = [];
  for (const sign2 of [1, -1]) {
    const pen = el3(doc, "button", `write ${sign2 > 0 ? "pos" : "neg"}`, sign2 > 0 ? "+" : "\u2212");
    pen.title = sign2 > 0 ? "Write a + card" : "Write a \u2212 card";
    gesture(pen, { click: () => {
      const oid = w.mint()();
      run(w.game, writeCard(w.game, c.oid, sign2, "Influence", () => oid));
      const name2 = box2.querySelector(`.icard[data-rid="${ridOf(oid)}"] .iname`);
      if (!name2) return;
      name2.focus();
      doc.getSelection()?.selectAllChildren(name2);
    } });
    tools.push(pen);
  }
  const pileTile = el3(doc, "div", "usedpile");
  const tag = el3(doc, "button", "used", "used");
  tag.append(el3(doc, "b", "", String(used.length)));
  tag.title = "Used Influence cards: click to see them, click one to put it back";
  gesture(tag, { click: () => w.toggle("used", c.oid) });
  pileTile.append(tag);
  if (opened.used.has(c.oid) && visible) {
    const list2 = el3(doc, "div", "usedlist");
    if (!used.length) list2.append(el3(doc, "p", "", "None used."));
    for (const k of used) {
      const u = card(doc, k, visible, w);
      gesture(u, { click: () => run(w.game, restoreUsed(w.game, ridOf(k.oid))) });
      list2.append(u);
    }
    pileTile.append(list2);
  }
  tools.push(pileTile, Object.assign(el3(doc, "span", "kill", "kill"), { title: "Drop a card here to delete it" }));
  box2.querySelector(".tools").replaceChildren(...tools);
}
function card(doc, k, visible, w) {
  const rid2 = ridOf(k.oid);
  const e = el3(doc, "span", `icard ${k.sign > 0 ? "pos" : "neg"}${k.used ? " isused" : ""}${k.tap ? " tapped" : ""}${k.crit ? " crit" : ""}`);
  e.dataset.rid = rid2;
  const drag = { drag: (d, m) => w.dragItem(rid2, d, m) };
  const mark2 = k.flag ? flagMark(doc, k, rid2, w) : null;
  if (!visible) {
    e.classList.add("facedown");
    if (mark2) e.append(mark2);
    gesture(e, drag);
    return e;
  }
  const name2 = el3(doc, "span", "iname", k.name);
  name2.contentEditable = "true";
  name2.spellcheck = false;
  name2.addEventListener("input", () => {
    const cur = w.game.get(rid2);
    if (cur) w.game.change((x) => x.put(rid2, { ...cur, name: (name2.textContent ?? "").slice(0, 200) }));
  });
  const level2 = el3(doc, "button", "level", `${k.sign > 0 ? "+" : "\u2212"}${levelName(k.points)}`);
  gesture(level2, {
    click: () => run(w.game, cardClick(w.game, rid2, false, w.mint())),
    shift: () => run(w.game, cardClick(w.game, rid2, true, w.mint()))
  });
  e.append(name2, level2, ...mark2 ? [mark2] : []);
  gesture(e, drag);
  return e;
}
function flagMark(doc, k, rid2, w) {
  const gm = !!w.viewer?.gm, f = el3(doc, "span", "flag", "\u2691");
  f.title = `${k.flag.why}: the GM's call${gm ? ". Click to allow it or undo it." : ""}`;
  if (!gm) return f;
  f.setAttribute("role", "button");
  f.tabIndex = 0;
  f.addEventListener("pointerdown", (ev) => ev.stopPropagation());
  gesture(f, { click: () => {
    if (f.querySelector(".flagmenu")) return;
    const menu = el3(doc, "span", "flagmenu");
    const choice = (text, allow) => {
      const b = el3(doc, "button", `flagact ${allow ? "allow" : "undo"}`, text);
      gesture(b, { click: () => run(w.game, ruleFlag(w.game, rid2, allow)) });
      return b;
    };
    menu.append(choice("Allow", true), choice("Undo", false));
    f.append(menu);
  } });
  return f;
}
var drawerCardEls = (cards) => [...cards.querySelectorAll(":scope > .icard")];
function gapAt(drawer2, x, y) {
  const cards = drawer2.querySelector(".cards"), gap = cards.querySelector(".gap"), next2 = gap?.nextSibling ?? null;
  gap?.remove();
  const r = cards.getBoundingClientRect(), k = r.width / cards.offsetWidth || 1;
  const boxes = drawerCardEls(cards).map((e) => {
    const left = e.offsetLeft - cards.offsetLeft, top = e.offsetTop - cards.offsetTop;
    return { left, top, right: left + e.offsetWidth, bottom: top + e.offsetHeight };
  });
  if (gap) cards.insertBefore(gap, next2);
  return insertAt(boxes, (x - r.left) / k, (y - r.top) / k);
}
function showGap(drawer2, at4, animate = true) {
  const cards = drawer2.querySelector(".cards");
  if (!cards) return;
  const els = drawerCardEls(cards);
  let gap = cards.querySelector(".gap");
  const now2 = gap ? [...cards.children].filter((c) => c === gap || c.classList.contains("icard")).indexOf(gap) : -1;
  if (at4 === null ? !gap : now2 === at4) return;
  const before2 = new Map(els.map((e) => [e, e.getBoundingClientRect()]));
  if (at4 === null) gap.remove();
  else {
    gap ??= Object.assign(cards.ownerDocument.createElement("div"), { className: "gap" });
    cards.insertBefore(gap, els[at4] ?? null);
  }
  const reduce = cards.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!animate || reduce) return;
  const k = cards.getBoundingClientRect().width / cards.offsetWidth || 1;
  for (const [e, b] of before2) {
    const a = e.getBoundingClientRect(), dx = (b.left - a.left) / k, dy = (b.top - a.top) / k;
    if (dx || dy) e.animate?.([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 150, easing: "ease-out" });
  }
}

// src/ui/bar.ts
var BarView = class {
  /** R347: where the Opposition button and its tray go (TrayView). */
  oppo;
  /** Where the people's tags go (Presence). */
  folks;
  /** Where the GM's "You are" goes. */
  youAre;
  /** R591: the desk, after the wordmark. */
  desk;
  // R517: an image the browser won't keep is said on the desk's image pigeonhole until one is added.
  /** Marks the image pigeonhole refused (`label`, and `why` on hover), or plain again with null. */
  refused(r) {
    this.desk.refused(r);
  }
  constructor(bar, w) {
    const doc = bar.ownerDocument, el4 = (tag, cls, text = "", title = "") => {
      const e = doc.createElement(tag);
      e.className = cls;
      e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    const mark2 = el4("div", "wordmark", "Hollow");
    mark2.append(el4("span", "stamp version", w.version, "Which version this is: a release's tag, or dev"));
    if (w.date) mark2.append(el4("span", "stamp date", w.date, "When it was released (on the test rig, when it was published)"));
    this.desk = new DeskView(doc, { gm: w.gm, take: w.take, images: w.images, filed: w.filed, takeOut: w.takeOut, cur: w.cur, setDesks: w.setDesks, setOut: w.setOut });
    const chips = el4("div", "supplychips", "", "Influence chips: drag one out");
    for (const sign2 of [1, -1]) for (const points3 of [2, 4, 6, 1]) {
      const c = el4("div", `supply chip ${sign2 > 0 ? "pos" : "neg"}${points3 === 1 ? " one" : ""}`, chipFace({ sign: sign2, points: points3 }));
      c.addEventListener("pointerdown", (ev) => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        w.take({ sign: sign2, points: points3 }, ev, ev, "press");
      });
      chips.append(c);
    }
    this.oppo = el4("div", "oppo");
    this.folks = el4("div", "folks");
    this.youAre = el4("div", "youare");
    bar.replaceChildren(mark2, this.desk.el, chips, this.oppo, this.folks, this.youAre);
  }
};

// src/ui/doom.ts
var DOOM_MS = 3e3;
var Doom = class {
  #armed = null;
  /** What's armed now, if anything. */
  get armed() {
    return this.#armed?.el ?? null;
  }
  /** Forgets what's armed without putting it back (it's about to be drawn again). */
  drop() {
    if (!this.#armed) return;
    clearTimeout(this.#armed.t);
    this.#armed = null;
  }
  /** Arms `el`, saying `says` on it; if it's armed already, puts it back and calls `destroy`. */
  arm(el4, says, destroy) {
    if (this.#armed) {
      const same4 = this.#armed.el === el4;
      this.#armed.undo();
      this.drop();
      if (same4) {
        destroy();
        return;
      }
    }
    const input = el4 instanceof HTMLInputElement, was = input ? el4.value : [...el4.childNodes];
    el4.classList.add("doom");
    if (input) {
      el4.value = says;
      el4.readOnly = true;
    } else el4.textContent = says;
    const undo = () => {
      el4.classList.remove("doom");
      if (input) {
        el4.value = was;
        el4.readOnly = false;
      } else el4.replaceChildren(...was);
    };
    this.#armed = { el: el4, undo, t: setTimeout(() => {
      undo();
      this.#armed = null;
    }, DOOM_MS) };
  }
};

// src/ui/boothill.ts
var BootHillView = class {
  #w;
  #stone;
  #badge;
  #panel;
  #name;
  #prev;
  #items;
  #dooms = new Doom();
  constructor(bar, root, w) {
    this.#w = w;
    const doc = bar.ownerDocument;
    this.#stone = doc.createElement("button");
    this.#stone.id = "boothill";
    this.#stone.title = "Boot Hill: everything put away. Click to see what's buried here.";
    const stone = doc.createElement("span");
    stone.className = "stone";
    stone.append("Boot", doc.createElement("br"), "Hill");
    this.#badge = doc.createElement("span");
    this.#badge.className = "n";
    this.#stone.append(stone, this.#badge);
    bar.append(this.#stone);
    this.#panel = doc.createElement("div");
    this.#panel.id = "graves";
    const nav = doc.createElement("div");
    nav.className = "yard";
    this.#prev = doc.createElement("button");
    this.#prev.textContent = "\u2039";
    this.#prev.setAttribute("aria-label", "The graveyard before");
    const nextB = doc.createElement("button");
    nextB.textContent = "\u203A";
    nextB.setAttribute("aria-label", "The next graveyard, or a new one");
    this.#name = doc.createElement("input");
    this.#name.className = "yname";
    this.#name.spellcheck = false;
    this.#name.placeholder = "Unnamed graveyard";
    this.#name.setAttribute("aria-label", "Graveyard name");
    this.#name.title = "Rename this graveyard. Shift-click twice to delete everything in it.";
    nav.append(this.#prev, this.#name, nextB);
    this.#items = doc.createElement("div");
    this.#items.className = "items";
    this.#panel.append(nav, this.#items);
    root.append(this.#panel);
    const browse = (f, hill) => {
      const b = f(this.#yards(), this.#cur());
      this.#w.game.change((x) => {
        x.put("yards", b.yards);
        if (hill) x.put("hill", hill);
      });
      this.#w.setCur(b.cur);
      this.render();
    };
    gesture(this.#stone, { click: () => {
      this.#w.setOpen(!this.#w.open());
      this.render();
    } });
    gesture(this.#prev, { click: () => browse(prev) });
    gesture(nextB, { click: () => browse(next) });
    this.#name.addEventListener("input", () => {
      const y = this.#yards(), cur = this.#cur(), n = this.#name.value;
      this.#w.game.change((x) => x.put("yards", { yards: y.yards.map((g, i) => i === cur ? { ...g, name: n, named: n.trim() !== "" } : g) }));
    });
    this.#name.addEventListener("change", () => browse((y, cur) => rename(y, cur, this.#name.value)));
    gesture(this.#name, { shift: (e) => {
      e.preventDefault?.();
      if (this.#yards().yards[this.#cur()]?.items.length || this.#own().length) this.#dooms.arm(
        this.#name,
        "Delete everything here? Shift-click again",
        () => browse(forgetAll, forgetOwnIn(this.#hill(), this.#yards(), this.#cur()))
      );
    } });
    doc.addEventListener("pointerdown", (e) => {
      if (!this.#w.open() || e.target.closest?.("#graves, #boothill")) return;
      this.#w.setOpen(false);
      this.render();
    }, true);
    w.game.listen((rids) => {
      if (rids.has("yards") || rids.has("hill")) this.render();
    });
    this.render();
  }
  #yards() {
    return this.#w.game.get("yards") ?? empty();
  }
  #cur() {
    return Math.min(this.#w.cur(), this.#yards().yards.length - 1);
  }
  /** R488: this page's own burials, never sent. */
  #hill() {
    return this.#w.game.get("hill") ?? { hill: [] };
  }
  /** R489: the Hill's indices of those the graveyard browsed shows. */
  #own() {
    return ownIn(this.#hill(), this.#yards(), this.#cur());
  }
  // R289: the badge counts every graveyard; the stone fades when nothing is buried.
  render() {
    const y = this.#yards(), cur = this.#cur(), g = y.yards[cur], doc = this.#panel.ownerDocument;
    const total3 = y.yards.reduce((n, x) => n + x.items.length, 0) + this.#hill().hill.length;
    this.#badge.textContent = total3 ? String(total3) : "";
    this.#stone.classList.toggle("empty", !total3);
    this.#panel.hidden = !this.#w.open();
    this.#prev.disabled = cur === 0;
    if (doc.activeElement !== this.#name && this.#dooms.armed !== this.#name) this.#name.value = g.name;
    if (this.#dooms.armed && this.#dooms.armed !== this.#name) this.#dooms.drop();
    const own2 = this.#own(), hill = this.#hill();
    if (!g.items.length && !own2.length) {
      const p = doc.createElement("p");
      p.textContent = "Nothing is buried here.";
      this.#items.replaceChildren(p);
      return;
    }
    this.#items.replaceChildren(...g.items.map((burial2, item2) => {
      const b = doc.createElement("button");
      b.textContent = burial2.name;
      b.title = "Drag this back onto the table. Shift-click or long-press twice to delete it forever.";
      if (burial2.gm && !burial2.info) b.title = "A card the GM put away";
      gesture(b, {
        drag: (_down, move) => this.#digUp(item2, move),
        shift: () => this.#dooms.arm(b, "Delete forever? Shift-click again", () => {
          const f = forget(this.#yards(), this.#cur(), { yard: this.#cur(), item: item2 });
          this.#w.game.change((x) => x.put("yards", f.yards));
          this.#w.setCur(f.cur);
          this.render();
        })
      });
      return b;
    }), ...own2.map((k) => {
      const b = doc.createElement("button");
      b.textContent = hill.hill[k].burial.name;
      b.title = "Your own: drag this back onto the table. Shift-click or long-press twice to delete it forever.";
      gesture(b, {
        drag: (_down, move) => this.#digUpOwn(k, move),
        shift: () => this.#dooms.arm(b, "Delete forever? Shift-click again", () => {
          this.#w.game.change((x) => x.put("hill", forgetOwn(this.#hill(), k)));
          this.render();
        })
      });
      return b;
    }));
  }
  /** R404, R428: digs up the newest Info card or record buried in this graveyard whose NPC is here; false when none. */
  undoCard() {
    const cur = this.#cur(), at4 = lastCard(this.#yards(), cur, (b) => b.info ? !!this.#npc(b.info.oid) : !!this.#holderCard(b));
    return !!at4 && this.#cardUp(at4);
  }
  /** A buried record's, and a card of its NPC or group on the table. */
  #holderCard(b) {
    const record = b.records[0];
    if (record?.kind !== "opinion") return void 0;
    const all2 = this.#w.game.all().map(([, r]) => r);
    const table = tableOf(all2);
    const card2 = table && all2.find((c) => c.kind === "character" && rowOf(table, c)?.id === record.holder);
    return table && card2 ? { record, table, card: card2 } : void 0;
  }
  #cardUp(at4) {
    const b = this.#yards().yards[at4.yard]?.items[at4.item];
    return b?.info ? this.#infoUp(at4) : this.#recordUp(at4);
  }
  // R428: a record comes back, its Connection written to its cell again, slid out under a card of its
  // NPC or group; while none is on the table it stays buried.
  #recordUp(at4) {
    const b = this.#yards().yards[at4.yard]?.items[at4.item], up = b && this.#holderCard(b);
    if (!up) return false;
    const dug = exhume(this.#yards(), this.#cur(), at4);
    this.#w.game.change((x) => {
      x.put("yards", dug.yards);
      x.put(ridOf(up.record.oid), up.record);
      x.put(ridOf(up.table.oid), synced(up.table, up.record));
    });
    this.#w.setCur(dug.cur);
    this.#w.slideInfo(up.card.oid, `o${up.record.oid}`);
    return true;
  }
  #npc(oid) {
    const c = this.#w.game.get(ridOf(oid));
    return c?.kind === "character" ? c : void 0;
  }
  // R405: an Info card comes up on its NPC, slid out; while its NPC is gone it stays buried.
  #infoUp(at4) {
    const dug = exhume(this.#yards(), this.#cur(), at4), c = dug.info && this.#npc(dug.info.oid);
    if (!dug.info || !c) return false;
    const back3 = withInfo(c, dug.info);
    this.#w.game.change((x) => {
      x.put("yards", dug.yards);
      x.put(ridOf(c.oid), back3.character);
    });
    this.#w.setCur(dug.cur);
    this.#w.slideInfo(c.oid, back3.k);
    return true;
  }
  #digUp(item2, e) {
    const cur = this.#cur();
    if (this.#yards().yards[cur]?.items[item2]?.gm) {
      if (this.#cardUp({ yard: cur, item: item2 })) {
        this.#w.setOpen(false);
        this.render();
      }
      return;
    }
    const dug = exhume(this.#yards(), cur, { yard: cur, item: item2 });
    const recs = raised(dug.records, this.#w.toWorld(e.clientX, e.clientY), this.#w.top());
    if (!recs.length) return;
    this.#w.game.change((x) => {
      x.put("yards", dug.yards);
      for (const r of recs) x.put(ridFor(r), r);
    });
    this.#w.setCur(dug.cur);
    this.#w.setOpen(false);
    this.render();
    this.#w.carry(recs[0], e, e);
  }
  // R488: this page's own buried tape comes up as its torn roll, this page's alone.
  #digUpOwn(k, e) {
    const dug = exhumeOwn(this.#hill(), k);
    const recs = raised(dug.records, this.#w.toWorld(e.clientX, e.clientY), this.#w.top());
    if (!recs.length) return;
    this.#w.game.change((x) => {
      x.put("hill", dug.hill);
      for (const r of recs) x.put(ridFor(r), r);
    });
    this.#w.setOpen(false);
    this.render();
    this.#w.carry(recs[0], e, e);
  }
};
function isPageUndo(ev) {
  if (ev.key.toLowerCase() !== "z" || !(ev.ctrlKey || ev.metaKey) || ev.shiftKey || ev.altKey) return false;
  const t = ev.target;
  return !(t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? ""));
}

// src/ui/folks.ts
function tags(me, people, held = () => void 0) {
  const warn2 = me.why !== void 0 ? "offline" : me.notYours !== void 0 ? "notyours" : me.said !== void 0 ? "said" : void 0;
  const mine = { name: me.name, gm: me.gm, you: true, live: me.live, stale: false, ...warn2 && { warn: warn2 } };
  const others = people.map((p) => {
    const holder = held(p.name), impostor = p.role === "player" && holder !== void 0 && holder !== p.browser;
    return {
      name: p.name,
      gm: p.role === "gm",
      you: false,
      live: !p.stale,
      stale: p.stale,
      tab: p.tab,
      browser: p.browser,
      ...impostor && { impostor: true, ...me.gm && { warn: "impostor" } }
    };
  });
  const gm = others.filter((t) => t.gm), rest = others.filter((t) => !t.gm).sort((a, b) => a.name.localeCompare(b.name));
  return me.gm ? [mine, ...rest] : [...gm, mine, ...rest];
}
var NAME_MAX = 32;
function gmName(answer, was) {
  return answer === null ? was : answer.trim().slice(0, NAME_MAX) || "GM";
}
function arrivalName(answer, held = []) {
  if (answer === null) return "Player";
  const name2 = answer.trim().slice(0, NAME_MAX);
  if (!name2 || name2 === "GM") return null;
  return held.find((h) => h.toLowerCase() === name2.toLowerCase()) ?? name2;
}
function viewAsChoices(present, owners) {
  return [.../* @__PURE__ */ new Set(["GM", ...present, ...owners, "Player 1", "Player 2"])].filter((n) => n !== "open");
}
var FolksView = class {
  #w;
  #folks;
  #youAre;
  #shown = "";
  constructor(folks, youAre, w) {
    this.#w = w;
    this.#folks = folks;
    this.#youAre = youAre;
    setInterval(() => this.render(), 1e3);
    this.render();
  }
  render() {
    const me = this.#w.me(), list2 = tags(me, this.#w.people(), this.#w.held);
    const key = JSON.stringify([list2, this.#w.table?.opened(), this.#w.viewAs?.current()]);
    if (key === this.#shown) return;
    this.#shown = key;
    const doc = this.#folks.ownerDocument;
    this.#folks.replaceChildren(...list2.map((t) => {
      const e = doc.createElement("span");
      e.className = `tag${t.live ? " live" : ""}${t.stale ? " stale" : ""}${t.gm ? " gm" : ""}${t.you ? " you" : ""}${t.warn ? " warn" : ""}${t.impostor ? " impostor" : ""}`;
      e.textContent = t.warn === "offline" ? "offline" : t.warn === "notyours" ? "not yours" : t.name;
      if (t.warn === "offline") e.title = me.why ?? "Offline";
      else if (t.warn === "notyours") e.title = me.notYours;
      else if (t.warn === "said") {
        e.title = me.said;
        if (this.#w.rename) e.addEventListener("click", () => this.#w.rename?.());
      } else if (t.warn === "impostor") {
        e.title = `${t.name}, from another computer than the one that holds ${t.name}. They see only what anyone sees. Click to hand ${t.name} to them.`;
        e.addEventListener("click", () => {
          if (confirm(`${t.name} is held by another computer. Hand ${t.name} to this one?

The other one will see ${t.name}'s things as a stranger does.`)) this.#w.handOver?.(t.name, t.browser);
        });
      } else if (t.impostor) e.title = `${t.name}, from another computer than the one that holds ${t.name}. They see only what anyone sees.`;
      else if (t.you) {
        e.title = me.gm ? "You, the GM. Click to change the name players see." : this.#w.rename ? "You. Click to change your name." : "You";
        if (this.#w.rename) e.addEventListener("click", () => this.#w.rename?.());
      } else e.title = (t.gm ? "The GM" : "A player") + (t.stale ? ", not heard from lately" : "");
      return e;
    }));
    const table = this.#w.table;
    if (table) {
      const b = doc.createElement("button");
      b.className = "invite";
      if (!table.opened()) {
        b.textContent = "Open the table";
        b.title = "Start a room for this game, so players can join";
        b.addEventListener("click", () => {
          table.open();
          this.#shown = "";
          this.render();
        });
      } else {
        const url = table.invite();
        b.textContent = "Copy invite";
        b.title = `Copy the link players open to join:
${url}
Shift-click or long-press to close the table.`;
        gesture(b, {
          click: () => void navigator.clipboard?.writeText(url).then(() => {
            b.textContent = "Copied";
            setTimeout(() => {
              b.textContent = "Copy invite";
            }, 1200);
          }, () => prompt("Copy the invite link", url)),
          // R14: shift-click or a long press closes the table.
          shift: () => {
            table.close();
            this.#shown = "";
            this.render();
          }
        });
      }
      this.#folks.append(b);
    }
    const va = this.#w.viewAs;
    this.#youAre.replaceChildren();
    if (va) {
      const label2 = doc.createElement("small"), b = doc.createElement("button");
      label2.textContent = "You are";
      b.className = "tag viewas";
      b.textContent = va.current();
      b.title = "View the table as this person sees it. Click for the next.";
      b.addEventListener("click", () => {
        const all2 = va.choices(), i = all2.indexOf(va.current());
        va.choose(all2[(i + 1) % all2.length]);
      });
      this.#youAre.append(label2, b);
    }
  }
};

// src/rules/supplies.ts
var place2 = (at4, w, h) => ({ x: Math.round(at4.x - w / 2), y: Math.round(at4.y - h / 2), z: 0, tilt: 0 });
var CARD = { w: 430, h: 316 };
var SHEET = { w: 540, h: 860 };
var STICKY = { w: 230, h: 150 };
var TEXT = { w: 120, h: 30 };
var DOCKET = { w: 130, h: 40 };
var CHIP = 42;
var POOL_H = 230;
var BLANK_FRONT = `<head>Name, Rank _</head>
Cha _   Int _   Wis _

Field _ (_XP)
Skill
Skill
Mental Atk / Req: _
Infer: _
Impress: _
Defend: _
<head>Resources</head>`;
var blankBack2 = () => ({
  damage: damageSlots(() => ({ name: "", boxes: [], spent: [] })),
  absorb: Object.fromEntries(DAMAGE.map((d) => [d, 0])),
  notes: ""
});
function newCharacter(oid, maker, at4) {
  const card2 = place2(at4, CARD.w, CARD.h);
  return {
    kind: "character",
    oid,
    owner: maker?.gm || !maker ? GM : maker.name,
    name: "Name",
    pool: { ...card2, y: card2.y - POOL_H },
    card: card2,
    flipped: false,
    gathered: true,
    front: BLANK_FRONT,
    back: blankBack2()
  };
}
function newSticky(oid, at4, by) {
  return { kind: "sticky", oid, place: place2(at4, STICKY.w, STICKY.h), text: "", ...by && { by } };
}
function newText(oid, at4, by) {
  return { kind: "text", oid, place: place2(at4, TEXT.w, TEXT.h), text: "Write here", ...by && { by } };
}
function newDocket(oid, at4, by) {
  return { kind: "docket", oid, place: place2(at4, DOCKET.w, DOCKET.h), name: "Docket", ...by && { by } };
}
function newHowTo(oid, at4) {
  return { kind: "reference", oid, place: place2(at4, SHEET.w, SHEET.h), which: "howto" };
}
function newChip(oid, sign2, points3, at4) {
  return { kind: "chip", oid, where: { table: place2(at4, CHIP, CHIP) }, n: 0, sign: sign2, points: points3, rider: false };
}

// src/store/blobs.ts
async function sha2562(bytes) {
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
    const blob = await sha2562(file), size = await this.#measure(file);
    await this.#keep(blob, file);
    return { blob, ...size };
  }
  // R449: the bytes are read before the transaction, which would commit at an outside await.
  async #keep(hash, file) {
    const kept = { type: file.type, bytes: await file.arrayBuffer() };
    await this.#db.tx(["blobs"], "readwrite", (t) => t.put("blobs", hash, kept));
  }
  // R449: an image kept as bytes, or one stored whole before.
  async get(hash) {
    const v = await this.#db.tx(["blobs"], "readonly", (t) => t.get("blobs", hash));
    return v === void 0 || v instanceof Blob ? v : new Blob([v.bytes], { type: v.type });
  }
  // R194: bytes from another page are kept only if they hash to the name asked for.
  /** Keeps bytes another page (or an import) sent, if they are what `hash` names. */
  async accept(hash, bytes) {
    if (await sha2562(bytes) !== hash) return false;
    await this.#keep(hash, bytes);
    return true;
  }
  // R459: what nothing uses goes.
  /** Deletes every image not in `inUse`; how many went. */
  async free(inUse) {
    return this.#db.tx(["blobs"], "readwrite", async (t) => {
      let n = 0;
      for (const k of await t.keys("blobs")) if (typeof k === "string" && !inUse.has(k)) {
        await t.del("blobs", k);
        n++;
      }
      return n;
    });
  }
  /** An object URL for showing the image; each url() is paired with a release(). */
  async url(hash) {
    const shown3 = this.#shown.get(hash);
    if (shown3) {
      shown3.n++;
      return shown3.url;
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
    const shown3 = this.#shown.get(hash);
    if (!shown3 || --shown3.n > 0) return;
    this.#urls.revoke(shown3.url);
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
      },
      keys: async (s, prefix) => await done(x.objectStore(s).getAllKeys(range(prefix)))
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

// src/store/playtest.ts
var SAM = "00000001";
var BEAUFORD = "00000002";
var DEVREUX = "00000003";
var at3 = (x, y) => ({ x, y, z: 0, tilt: 0 });
function back2(boxes = {}, notes = "") {
  const damage3 = damageSlots((d, r) => {
    const extra = d === "injury" ? 0 : boxes[r] ?? 0;
    return { name: "", boxes: Array(extra).fill(false), spent: [] };
  });
  return { damage: damage3, absorb: { bias: 0, affliction: 0, injury: 0 }, notes };
}
function character(oid, owner, name2, x, front, b) {
  return { kind: "character", oid, owner, name: name2, pool: at3(x, 20), card: at3(x, 300), flipped: false, gathered: true, front, back: b };
}
var SAM_FRONT = `<head>Samuel Diamond, Rank 3</head>
<att>Cha 2   Int 2   Wis 4</att>
<fld>Private Investigator 2 (5XP)</fld>
<skl>Investigation (x2)</skl>
<skl>Advocacy (x2)</skl>
<skl>Fighting\u2020 (guns)</skl>
<fld>Sparker 2 (6XP)</fld>
<skl>\u2713 Glimmersense (x2) 3</skl>
<skl>Glimmer Lore (x2)</skl>
<skl>Composure</skl>
<skl>Skills 1: Suasion (Detective), Tact, Lock Picking, Fire Starting, Wilderness Survival</skl>
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
<att>Cha 2   Int 3   Wis 1</att>
<fld>Snakeoil Salesman 3 (5XP)</fld>
<skl>Rhetoric (Salesman) (x2)</skl>
<skl>Finesse (x2, Rhetoric)</skl>
<skl>\u2713 Rationalization 4</skl>
<fld>Medicineshow Occultist 2 (6XP)</fld>
<skl>\u2713 Glimmer Lore (x2) 3</skl>
<skl>Medicinals (x2)</skl>
<skl>Composure (x2)</skl>
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
<att>Cha 3   Int 1   Wis 3</att>
<skl>Skills 3: Savvy, Profession (Saloon Keeper), Streetwise</skl>
<skl>Skills 2: Musician, Composure, Gambling, Etiquette, Bargaining, Tact</skl>
<skl>Skills 1: Suasion (Charm)</skl>
<head>Motivations</head>
<mot>Keep the Peace +Sig (0)</mot>
<mot>Self-Preservation +Sig (0)</mot>
<mot>Old Sympathy for Sparkers +Min (0)</mot>
<act>Attack: 4 (Suasion, Charm), +1</act>
<def>Defend: 6 / 5</def>
Slots: Mild, Min \xD73, Sig, Maj
<head>Resources</head>
<res>Saloon Gossip +Maj</res>
<res>Money +Sig</res>
<head>Items</head>
Dead Man's Die
(Free Token, 9 uses)`;
var STICKY2 = `Find: How did Trudy get infected?
Answer: started less than a month ago, before she lost her doll

Level 3

0. Obed found Trudy in the forest as an infant
0. She had her doll at that time and was dressed in rags
0. She's very clever and athletic
0. The doll is wooden, carved, extremely ugly, and disturbing

Q1: What is the doll?
A1: *super* important to Trudy.

Next session: first day in town, late at night at the hotel`;
var infl = (oid, name2, points3, n) => {
  const src = `${DEVREUX}:${name2}`;
  return {
    kind: "influence",
    oid,
    home: DEVREUX,
    where: "drawer",
    n,
    name: name2,
    sign: 1,
    points: points3,
    used: false,
    crit: false,
    tap: { ledger: { [src]: points3 / 2 }, current: src },
    mot: true
  };
};
function scene(sam = "Player 1", beauford = "Player 2") {
  const chip2 = { kind: "chip", oid: "00000007", where: { slot: BEAUFORD, name: "stagger" }, n: 0, sign: -1, points: 2, rider: false, by: "GM" };
  const sticky = { kind: "sticky", oid: "00000008", place: at3(1430, 20), text: STICKY2, big: true };
  return [
    character(SAM, sam, "Sam", 40, SAM_FRONT, back2({ min: 2 }, "Fire tools. Lantern. 6 Candles.\nPocket knife. Bedroll. Canteen.\nRope. Notebook and pencil.")),
    character(BEAUFORD, beauford, "Beauford", 500, BEAUFORD_FRONT, back2({ min: 1 })),
    character(DEVREUX, "GM", "Devreux", 960, DEVREUX_FRONT, back2({ min: 2 })),
    infl("00000004", "Keep the Peace", 4, 0),
    infl("00000005", "Self-Preservation", 4, 1),
    infl("00000006", "Old Sympathy for Sparkers", 2, 2),
    chip2,
    sticky,
    // R418: the Connection Table, put away, holding the adventure's *Connections in Unton*.
    seed("0000000a", at3(1430, 900), DEVREUX)
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
function beforeRestoring(name2) {
  const m = /^Before (?:restoring|undoing) “(.*)”$/.exec(name2);
  return m ? `Before undoing \u201C${m[1]}\u201D` : `Before restoring \u201C${name2}\u201D`;
}
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
  /** Why the last save failed, until one succeeds (R291). */
  #failed = null;
  /** R454: the last checkpoint the store refused, said until one is kept. */
  #lost = null;
  /** R455: asking the browser to keep this origin's storage, once, after the first save; its answer. */
  #keep;
  #kept = null;
  #quiet = false;
  #seq = 0;
  constructor(db, clock2, storage, keep2) {
    this.#db = db;
    this.#clock = clock2;
    this.#storage = storage;
    this.#keep = keep2;
    this.game.listen((rids) => {
      if (this.#quiet) return;
      for (const rid2 of rids) this.#pending.add(rid2);
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
  async add(name2, records3 = singletons(), checkpoints = [], copyOf, id = this.#id("g")) {
    const now2 = this.#clock.now();
    const info = { id, name: name2, made: now2, opened: now2, ...copyOf && { copyOf } };
    await this.#db.tx(["games", "records", "checkpoints"], "readwrite", async (t) => {
      await t.put("games", id, info);
      for (const [rid2, rec] of records3) await t.put("records", [id, rid2], rec);
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
    const { info, records: records3 } = await this.#db.tx(["games", "records"], "readwrite", async (t) => {
      const info2 = await t.get("games", id);
      if (!info2) throw new Error(`no game ${id}`);
      const opened = { ...info2, opened: this.#clock.now() };
      await t.put("games", id, opened);
      return { info: opened, records: await this.#records(t, id) };
    });
    this.#quiet = true;
    try {
      this.game.load(records3);
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
  // R483, R141: a player's copy, per room and name; never listed, never the last game. The name keeping
  // the browser's key (`own`) keeps the copy from before names had their own; any other is keyed by its
  // user id, which a rename keeps. R485: `as` is the name it was joined as, kept up to date.
  /** Opens a name's copy of a room's table, making an empty one the first time. */
  async copyFor(room2, user, own2, as) {
    const id = own2 ? `m-${room2}` : `m-${room2}.${user}`;
    const have = await this.#db.tx(["games"], "readonly", (t) => t.get("games", id));
    if (!have) await this.add(room2, singletons(), [], room2, id);
    const info = await this.open(id);
    if (info.as === as) return info;
    this.current = { ...info, as };
    await this.#db.tx(["games"], "readwrite", (t) => t.put("games", id, this.current));
    return this.current;
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
    const records3 = rids.map((rid2) => [rid2, this.game.get(rid2)]);
    this.#busy++;
    this.#saving = this.#saving.then(() => this.#db.tx(["records"], "readwrite", async (t) => {
      for (const [rid2, rec] of records3) {
        const stored = await t.get("records", [cur.id, rid2]);
        if (same(stored, rec)) continue;
        if (rec === void 0) await t.del("records", [cur.id, rid2]);
        else await t.put("records", [cur.id, rid2], rec);
      }
    })).then(() => {
      this.#savedAt = this.#clock.now();
      this.#failed = null;
      const keep2 = this.#keep;
      this.#keep = void 0;
      if (keep2) void keep2().then((k) => {
        this.#kept = k;
      }, () => {
        this.#kept = false;
      });
    }, (e) => {
      this.#failed = e instanceof Error ? e.message : String(e);
      for (const [rid2] of records3) this.#pending.add(rid2);
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
    try {
      await this.#db.tx(["checkpoints"], "readwrite", async (t) => {
        await t.put("checkpoints", [cur.id, cp.id], cp);
        if (!auto) return;
        const autos = (await this.#checkpoints(t, cur.id)).filter((c) => c.auto);
        for (const old of autos.slice(KEEP_AUTO)) await t.del("checkpoints", [cur.id, old.id]);
      });
    } catch (e) {
      this.#lost = `Checkpoint \u201C${name2}\u201D not kept: ${e instanceof Error ? e.message : String(e)}`;
      throw e;
    }
    this.#lost = null;
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
    await this.checkpoint(beforeRestoring(cp.name), true);
    const book2 = this.game.get("book");
    const records3 = ownedTorn(Object.entries(cp.records).filter(([rid2]) => rid2 !== "book"));
    this.game.load(book2 ? [...records3, ["book", book2]] : records3);
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
  /** For the Ledger: "Saving…" while something is unwritten, "Not saved: " and why, or when it last saved (R291). */
  status() {
    if (this.#busy) return "Saving\u2026";
    if (this.#failed !== null) return `Not saved: ${this.#failed}`;
    if (this.#lost !== null) return this.#lost;
    if (this.#pending.size) return "Saving\u2026";
    return this.#savedAt === null ? "Saved" : `Saved ${new Date(this.#savedAt).toTimeString().slice(0, 8)}`;
  }
  // R485: the copies this browser keeps of tables it joined as a player.
  /** The copies of joined tables, newest opened first. */
  async joined() {
    const all2 = await this.#db.tx(["games"], "readonly", (t) => t.all("games"));
    return all2.map(([, g]) => g).filter((g) => g.copyOf).sort((a, b) => b.opened - a.opened);
  }
  // R457: a game or a copy goes with its records and checkpoints; never the one on the table.
  /** Deletes a game or a copy forever. */
  async forget(id) {
    if (id === this.current?.id) throw new Error("the game on the table can't be deleted");
    await this.#db.tx(["games", "records", "checkpoints"], "readwrite", async (t) => {
      for (const k of await t.keys("records", id)) await t.del("records", k);
      for (const k of await t.keys("checkpoints", id)) await t.del("checkpoints", k);
      await t.del("games", id);
    });
  }
  /** Deletes one of the open game's checkpoints forever (R457). */
  async forgetCheckpoint(id) {
    const cur = this.#open();
    await this.#db.tx(["checkpoints"], "readwrite", (t) => t.del("checkpoints", [cur.id, id]));
  }
  // R459: every image still used, buried ones in Boot Hill's yards included, so nothing is freed that
  // could be dug up or restored.
  /** The hash of every image any game, copy or checkpoint in this browser uses, and the table as it stands. */
  async images() {
    const used = /* @__PURE__ */ new Set();
    const look = (v) => {
      if (Array.isArray(v)) {
        for (const x of v) look(x);
        return;
      }
      if (!v || typeof v !== "object") return;
      const o = v;
      if (o.kind === "image" && typeof o.blob === "string") used.add(o.blob);
      for (const x of Object.values(o)) look(x);
    };
    await this.#db.tx(["records", "checkpoints"], "readonly", async (t) => {
      for (const [, r] of await t.all("records")) look(r);
      for (const [, c] of await t.all("checkpoints")) look(c);
    });
    for (const [, r] of this.game.all()) look(r);
    return [...used];
  }
  /** R455: whether the browser keeps this storage: null until it has been asked. */
  kept() {
    return this.#kept;
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
var seatKey = (game2, viewer) => `hollow.seat.${game2}.${viewer}`;
function fresh2() {
  return {
    view: null,
    viewAs: null,
    tapeUp: false,
    boothill: { cur: 0, open: false },
    desk: { cur: 0 },
    open: { used: [], piles: [], slots: [], columns: [], info: [] },
    types: {}
  };
}
var isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function load(storage, game2, viewer) {
  let saved;
  try {
    saved = JSON.parse(storage.getItem(seatKey(game2, viewer)) ?? "null");
  } catch {
    return fresh2();
  }
  if (!isObject(saved)) return fresh2();
  const base = fresh2();
  return {
    ...base,
    ...saved,
    view: isObject(saved.view) ? { x: 0, y: 0, zoom: 1, ...saved.view } : null,
    boothill: { ...base.boothill, ...isObject(saved.boothill) ? saved.boothill : {} },
    desk: { ...base.desk, ...isObject(saved.desk) ? saved.desk : {} },
    open: { ...base.open, ...isObject(saved.open) ? saved.open : {} },
    types: isObject(saved.types) ? saved.types : {}
  };
}
function save(storage, game2, viewer, seat) {
  try {
    storage.setItem(seatKey(game2, viewer), JSON.stringify(seat));
  } catch {
  }
}
function prune(seat, exists, yards) {
  const here2 = (oid) => exists(ridOf(oid));
  const owner = (s) => here2(s.slice(0, s.indexOf(":")));
  const { roller: _, ...rest } = seat;
  return {
    ...rest,
    boothill: { ...seat.boothill, cur: Math.max(0, Math.min(seat.boothill.cur, yards - 1)) },
    open: {
      used: seat.open.used.filter(here2),
      piles: seat.open.piles.filter(here2),
      slots: seat.open.slots.filter(owner),
      columns: seat.open.columns.filter(owner),
      info: seat.open.info.filter(owner)
    }
  };
}

// src/store/exchange.ts
var FORMAT = "hollow-table-game";
var VERSION2 = 1;
function imagesIn(records3, into = /* @__PURE__ */ new Set()) {
  for (const r of records3) {
    if ("kind" in r && r.kind === "image") into.add(r.blob);
    if ("yards" in r) for (const g of r.yards) for (const b of g.items) imagesIn(b.records, into);
  }
  return into;
}
async function toDataUri(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(bin)}`;
}
function fromDataUri(uri) {
  const m = /^data:([^;,]*);base64,([A-Za-z0-9+/=]*)$/.exec(uri);
  if (!m) return null;
  const bin = atob(m[2]);
  return new Blob([Uint8Array.from(bin, (c) => c.charCodeAt(0))], { type: m[1] });
}
async function exportGame(store, blobs, id) {
  const { info, records: records3, checkpoints } = await store.read(id);
  const used = imagesIn(records3.map(([, r]) => r));
  for (const cp of checkpoints) imagesIn(Object.values(cp.records), used);
  const images = {};
  for (const hash of used) {
    const blob = await blobs.get(hash);
    if (blob) images[hash] = await toDataUri(blob);
  }
  const file = {
    format: FORMAT,
    version: VERSION2,
    name: info.name,
    records: Object.fromEntries(records3),
    checkpoints: checkpoints.map(({ id: _, ...cp }) => cp),
    blobs: images
  };
  return { filename: fileName(info.name), text: JSON.stringify(file, null, 2) };
}
function fileName(name2) {
  return `${name2.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "game"}.glimmer.json`;
}
var BadFile = class extends Error {
};
var isObject2 = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function records2(v, where2) {
  if (!isObject2(v)) throw new BadFile(`${where2}: no records`);
  return Object.entries(v).map(([rid2, rec]) => {
    if (!check(rid2, rec)) throw new BadFile(`${where2}: ${rid2} is not a well-formed record`);
    return [rid2, rec];
  });
}
async function importGame(store, blobs, text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw new BadFile("not JSON");
  }
  if (!isObject2(file) || file.format !== FORMAT) throw new BadFile("not a Hollow Table game");
  if (file.version !== VERSION2) throw new BadFile(`version ${String(file.version)} is not ${VERSION2}`);
  if (typeof file.name !== "string" || !file.name) throw new BadFile("no name");
  const game2 = records2(file.records, "the game");
  if (!Array.isArray(file.checkpoints)) throw new BadFile("no checkpoints");
  const checkpoints = file.checkpoints.map((cp, i) => {
    if (!isObject2(cp) || typeof cp.name !== "string" || typeof cp.at !== "number" || typeof cp.auto !== "boolean") {
      throw new BadFile(`checkpoint ${i + 1} is malformed`);
    }
    return { name: cp.name, at: cp.at, auto: cp.auto, records: Object.fromEntries(records2(cp.records, `checkpoint \u201C${cp.name}\u201D`)) };
  });
  if (!isObject2(file.blobs)) throw new BadFile("no images");
  const images = [];
  for (const [hash, uri] of Object.entries(file.blobs)) {
    const blob = typeof uri === "string" ? fromDataUri(uri) : null;
    if (!blob || await sha2562(blob) !== hash) throw new BadFile(`image ${hash.slice(0, 12)}\u2026 is not what its name says`);
    images.push([hash, blob]);
  }
  const taken = new Set((await store.list()).map((g) => g.name));
  const name2 = taken.has(file.name) ? `${file.name} (imported)` : file.name;
  for (const [hash, blob] of images) await blobs.accept(hash, blob);
  return store.add(name2, game2, checkpoints);
}

// src/ui/ledger.ts
var time = (at4) => new Date(at4).toTimeString().slice(0, 8);
function stamp(at4) {
  return `${new Date(at4).toLocaleString("en-US", { month: "short", day: "numeric" })}, ${time(at4)}`;
}
function offer2(round, now2) {
  return `Round ${round}, ${time(now2)}`;
}
function named3(answer) {
  return answer === null ? null : answer.trim() || "Checkpoint";
}
function newGame(now2) {
  return `New game ${stamp(now2)}`;
}
var LedgerView = class {
  #w;
  #dooms = new Doom();
  #book;
  #page;
  #status;
  #said = null;
  #tick = null;
  constructor(bar, root, w) {
    this.#w = w;
    const doc = bar.ownerDocument;
    this.#book = doc.createElement("button");
    this.#book.id = "ledgerbtn";
    this.#book.title = "The Ledger: this game, its checkpoints, and your other games";
    const spine = doc.createElement("span");
    spine.textContent = "Ledger";
    this.#book.append(spine);
    bar.append(this.#book);
    this.#page = doc.createElement("div");
    this.#page.id = "ledger";
    this.#page.hidden = true;
    this.#status = doc.createElement("p");
    this.#status.className = "status";
    root.append(this.#page);
    gesture(this.#book, { click: () => this.#page.hidden ? this.show() : this.hide() });
    doc.addEventListener("pointerdown", (e) => {
      if (!this.#page.hidden && !e.target.closest?.("#ledger, #ledgerbtn")) this.hide();
    }, true);
  }
  hide() {
    this.#page.hidden = true;
    if (this.#tick !== null) clearInterval(this.#tick);
    this.#tick = null;
  }
  async show() {
    this.#page.hidden = false;
    this.#tick ??= setInterval(() => this.#showStatus(), 1e3);
    await this.render();
  }
  #showStatus() {
    this.#status.textContent = this.#said ?? this.#w.status();
  }
  /** Says something in the status line until the page is drawn again ("Not a game file: …"). */
  #say(words) {
    this.#said = words;
    this.#showStatus();
  }
  async render() {
    const w = this.#w, doc = this.#page.ownerDocument, cur = w.current();
    const [cps, games] = w.player ? [[], []] : await Promise.all([w.checkpoints(), w.games()]);
    const joined = await w.joined();
    const doomable = (b, click2, destroy) => gesture(b, {
      click: click2 ?? void 0,
      shift: () => this.#dooms.arm(b, "Shift-click again to delete forever", () => void destroy().then(() => this.render()))
    });
    const el4 = (tag, cls, text = "", title = "") => {
      const e = doc.createElement(tag);
      e.className = cls;
      e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    const name2 = doc.createElement("input");
    name2.className = "gname";
    name2.spellcheck = false;
    name2.value = cur.name;
    name2.setAttribute("aria-label", "Game name");
    name2.readOnly = w.player;
    name2.addEventListener("change", () => {
      const n = name2.value.trim();
      if (n) void w.rename(n);
      else name2.value = w.current().name;
    });
    const acts = el4("div", "acts");
    const act = (text, title, fn) => {
      const a = el4("button", "act", text, title);
      gesture(a, { click: () => void fn() });
      acts.append(a);
    };
    if (!w.player) act("Checkpoint", "Save a named copy of the table as it is now", async () => {
      const n = named3(prompt("Name this checkpoint", offer2(w.round(), w.now())));
      if (n === null) return;
      await w.checkpoint(n).catch(() => void 0);
      await this.render();
    });
    act("Export", "Download this game, with its checkpoints and images, as one file", async () => {
      const { filename, text } = await w.exported();
      const a = doc.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
    });
    const picker = doc.createElement("input");
    picker.type = "file";
    picker.accept = ".json,application/json";
    picker.hidden = true;
    picker.addEventListener("change", async () => {
      const f = picker.files?.[0];
      picker.value = "";
      if (f) await w.imported(await f.text()).catch(() => this.#say(`Not a game file: ${f.name}`));
    });
    if (!w.player) {
      act("Import", "Open a game file as a new game", () => picker.click());
      act("New game", "Start a new, empty table", () => w.newGame(newGame(w.now())));
    }
    this.#said = null;
    this.#showStatus();
    const parts2 = [name2, acts, this.#status, picker];
    if (w.player) {
      parts2.splice(2, 0, el4("p", "copy", "The GM's page holds this game. This browser keeps a copy so a reload shows the table at once; the GM checkpoints and restores."));
    } else {
      const list2 = el4("div", "entries");
      if (!cps.length) list2.append(el4("p", "none", "None yet. End makes one at the end of every conflict."));
      for (const c of cps) {
        const b = this.#entry(
          c.name,
          c.at,
          `entry${c.auto ? " auto" : ""}`,
          "Restore the table to this checkpoint. The table as it stands is checkpointed first, so this can be undone. Shift-click twice to delete it forever."
        );
        doomable(b, async () => {
          await w.restore(c.id);
          await this.render();
        }, () => w.forgetCheckpoint(c.id));
        list2.append(b);
      }
      const gl = el4("div", "entries");
      for (const g of games) {
        const here2 = g.id === cur.id, b = this.#entry(
          g.name,
          g.opened,
          `entry${here2 ? " current" : ""}`,
          here2 ? "The game on the table" : "Put this game on the table (this one is saved as it is). Shift-click twice to delete it forever."
        );
        if (!here2) doomable(b, () => void w.open(g.id), () => w.forget(g.id));
        else b.disabled = true;
        gl.append(b);
      }
      parts2.push(el4("h4", "", "Checkpoints"), list2, el4("h4", "", "Games"), gl);
    }
    if (joined.length) {
      const jl = el4("div", "entries");
      for (const g of joined) {
        const here2 = g.id === cur.id, b = this.#entry(
          g.as ? `${g.as} at ${g.name}` : g.name,
          g.opened,
          `entry joined${here2 ? " current" : ""}`,
          here2 ? "The table you are playing at" : `This browser's copy of a table it joined (room ${g.name}${g.as ? `, as ${g.as}` : ""}). Shift-click twice to delete it forever.`
        );
        if (!here2) doomable(b, null, () => w.forget(g.id));
        else b.disabled = true;
        jl.append(b);
      }
      parts2.push(el4("h4", "", "Tables joined"), jl);
    }
    this.#page.replaceChildren(...parts2);
  }
  #entry(text, at4, cls, title) {
    const doc = this.#page.ownerDocument, b = doc.createElement("button"), span = doc.createElement("span"), t = doc.createElement("time");
    b.className = cls;
    b.title = title;
    span.textContent = text;
    t.textContent = stamp(at4);
    b.append(span, t);
    return b;
  }
};

// src/ui/drag.ts
var TAP_GLYPH_X = 10;
function leaveWriting(doc) {
  doc.activeElement?.blur?.();
  doc.getSelection?.()?.removeAllRanges();
}
var less = (p, g) => ({ x: Math.round(p.x - g.x), y: Math.round(p.y - g.y) });
var Drag = class {
  #w;
  constructor(w) {
    this.#w = w;
  }
  /** The highest z on the table, so a dropped piece lands on top. */
  #top() {
    let z = 0;
    for (const [, r] of this.#w.game.all()) {
      const at4 = "kind" in r ? placeOf(r) : null;
      if (at4) z = Math.max(z, at4.z);
    }
    return z + 1;
  }
  // Seq: seq-drag.md#1.2, seq-drag.md#1.3, seq-drag.md#1.3.1, seq-drag.md#1.6 | R298, R299, R300, R215,
  // R217, R223, R183: the one carry. Each frame: the place and aim, drawn by Hands here and sent
  // through Moves; at the release, let go everywhere, then the drop's one change.
  #carry(c, down, move) {
    const { game: game2, table, hands, moves, hand } = this.#w;
    const doc = (c.el ?? table.element(c.rid) ?? table.pool(c.rid))?.ownerDocument;
    if (!doc) return;
    leaveWriting(doc);
    const z = this.#top();
    const item2 = (f) => ({ rid: c.rid, x: f.x, y: f.y, z, ...c.part && { part: c.part }, ...f.aim && { aim: f.aim } });
    let last = c.frame(move.clientX, move.clientY);
    if (c.el) table.lift(c.rid, c.el, last);
    moves?.hold(c.rid);
    doc.body.classList.add("dragging");
    if (c.pointing) doc.body.classList.add("tapping");
    const keepOut = () => {
      if (doc.activeElement?.isContentEditable) leaveWriting(doc);
    };
    const pace = paced(this.#w.schedule, ({ cx, cy }) => {
      keepOut();
      last = c.frame(cx, cy);
      const it = item2(last);
      hands.show(hand, [it], true);
      moves?.drag([it]);
      this.#lightBar(doc, cx, cy, c.buries, c.files ?? null);
    });
    let at4 = { cx: move.clientX, cy: move.clientY };
    const to = (e) => pace.to(at4 = { cx: e.clientX, cy: e.clientY });
    to(move);
    pace.flush();
    const off = table.onView(() => {
      pace.to(at4);
      pace.flush();
    });
    const end = (e, put2 = false) => {
      off();
      pace.cancel();
      keepOut();
      last = c.frame(e.clientX, e.clientY);
      const file = !put2 && !!c.files && this.#overDesk(doc, e.clientX, e.clientY), into = file ? this.#deskAt(doc, e.clientX, e.clientY) : null;
      const away = put2 || !file && this.#overBar(doc, e.clientY);
      this.#lightBar(doc, null, null, false, null);
      doc.body.classList.remove("dragging", "tapping");
      hands.drop(hand, [], true);
      moves?.drop([item2(last)]);
      const change3 = c.drop(last, away, z, into);
      table.still(() => {
        if (change3) game2.change(change3);
      });
      moves?.release(c.rid);
      table.render([c.rid]);
      c.done?.();
    };
    if (c.loose) this.#loose(doc, move, to, end);
    else this.#follow(doc, down, to, end);
  }
  // Seq: seq-drag.md#1.2 | R27, R32, R222: paper, or a character's card (what's pinned to it follows,
  // Hands); paper is aimed at the card it would pin to.
  /** Carries a piece from the press that started it (or, `loose`, with no button held), and what's pinned to it. */
  start(rid2, down, move, loose = false) {
    const { game: game2, table } = this.#w;
    const rec = game2.get(rid2), at4 = rec && placeOf(rec), el4 = table.element(rid2);
    if (!rec || !at4 || !el4) return;
    const tied = this.#tiedIn(rec);
    if (tied) {
      this.start(tied, down, move, loose);
      return;
    }
    const named4 = rec.kind === "docket" && this.#fresh.has(rid2);
    const from = rec.kind === "character" && rec.gathered ? { ...at4, x: parseFloat(el4.style.left), y: parseFloat(el4.style.top) } : at4;
    const p0 = table.toWorld(down.clientX, down.clientY), grip = { x: p0.x - from.x, y: p0.y - from.y };
    const pins = isPinnable(rec), held = this.#tackedTo(rec);
    this.#carry({
      rid: rid2,
      ...rec.kind === "character" && { part: "card" },
      // R538, R536, R539: paper is aimed at the card under the pointer, else at the docket on top whose
      // tape, drawn without it, it touches. R572: paper pinned to a card is aimed at nothing, its pin line drawn.
      frame: (cx, cy) => {
        const f = less(table.toWorld(cx, cy), grip);
        if (held) {
          table.pinLine(rid2, f, this.#middle(held), [ridOf(held.oid)]);
          return f;
        }
        const card2 = pins ? this.#cardAt(el4.ownerDocument, cx, cy, el4) : void 0;
        if (card2) return { ...f, aim: { card: ridOf(card2.oid) } };
        const joins = pins || rec.kind === "character" && this.#may(rec);
        const docket = joins ? aimed(table.targets(rid2), { left: f.x, top: f.y, right: f.x + el4.offsetWidth, bottom: f.y + el4.offsetHeight }) : null;
        return docket ? { ...f, aim: { docket: ridOf(docket) } } : f;
      },
      buries: rec.kind !== "reference" && rec.kind !== "connections" && !this.#fresh.has(rid2),
      // R19, R519: a fresh supply is never made, so never filed.
      files: this.#fresh.has(rid2) ? null : drawerOf(rec, this.#w.gm),
      drop: (last, away, z, file) => {
        if (file !== null) return this.#file(rec, file);
        if (away) return this.#putAway(rec);
        return this.#drop(rec, "card", from, last, z, last.aim);
      },
      done: () => {
        if (held) table.pinLine(null);
        const name2 = named4 && game2.get(rid2) ? table.element(rid2)?.querySelector(".dname") : null;
        if (!name2) return;
        name2.focus();
        name2.ownerDocument.getSelection()?.selectAllChildren(name2);
      },
      loose
    }, down, move);
  }
  // R568: the card a paper's tack holds it to, if any (a docket's paper has no tack).
  #tackedTo(rec) {
    if (!isPinnable(rec) || !rec.pin) return null;
    const c = this.#w.game.get(ridOf(rec.pin.card));
    return c?.kind === "character" ? c : null;
  }
  // R543, R588: the tied docket a press on this piece carries instead: the docket a paper or character is
  // pinned to, or the one the character a paper is pinned to is in, when it is tied here.
  /** The rid of the docket tied here that this piece is part of, if any. */
  #tiedIn(rec) {
    const { game: game2, table } = this.#w, tied = tiedHere(game2);
    let pin2 = isPinnable(rec) || rec.kind === "character" ? rec.pin : void 0;
    if (pin2 && isPinnable(rec)) {
      const holder = game2.get(ridOf(pin2.card));
      if (holder?.kind === "character") pin2 = holder.pin;
    }
    return pin2 && tied.has(pin2.card) && table.element(ridOf(pin2.card)) ? ridOf(pin2.card) : null;
  }
  /** R584, R586: whether this page may move a character (Ownership.mayChange). */
  #may(c) {
    const { gm, who } = this.#w;
    return mayChange(gm ? { name: GM, gm: true } : { name: who() ?? "", gm: false }, c, c);
  }
  // R575: a gathered card belongs under its pool (TableView.gatheredAt), which its record may not say yet;
  // a pin is measured from there.
  /** Where a card is, for pinning, in table coordinates. */
  #spot(c) {
    return (c.gathered ? this.#w.table.gatheredAt(ridOf(c.oid)) : null) ?? c.card;
  }
  /** The middle of a card as it is drawn, in table coordinates. */
  #middle(c) {
    const b = this.#w.table.box(ridOf(c.oid));
    return b ? { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 } : { x: c.card.x, y: c.card.y };
  }
  // R571: the tack's drag: the pin line from the tack runs to the pointer, the card under it lit; let go on
  // another card, the paper is pinned there where it lies; anywhere else, or Esc, nothing changes.
  /** Drags a pinned paper's tack. */
  startTack(rid2, down, move) {
    const { game: game2, table } = this.#w;
    const rec = game2.get(rid2), el4 = table.element(rid2), from = rec && this.#tackedTo(rec);
    if (!rec || !isPinnable(rec) || !el4 || !from) return;
    const doc = el4.ownerDocument;
    let over;
    const light = (c) => {
      for (const e of doc.querySelectorAll(".obj.card.over")) e.classList.remove("over");
      if (c) table.element(ridOf(c.oid))?.classList.add("over");
    };
    const to = (e) => {
      over = this.#cardAt(doc, e.clientX, e.clientY, el4);
      light(over);
      table.pinLine(rid2, rec.place, over ? this.#middle(over) : table.toWorld(e.clientX, e.clientY), [ridOf(from.oid), ...over ? [ridOf(over.oid)] : []]);
    };
    const stop = () => {
      doc.removeEventListener("keydown", key, true);
      light(void 0);
      table.pinLine(null);
    };
    let gone = false;
    const key = (ev) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      gone = true;
      stop();
    };
    doc.addEventListener("keydown", key, true);
    to(move);
    this.#follow(doc, down, (e) => {
      if (!gone) to(e);
    }, (e) => {
      if (gone) return;
      to(e);
      stop();
      const card2 = over, now2 = game2.get(rid2);
      if (!card2 || card2.oid === from.oid || !now2) return;
      const at4 = this.#spot(card2);
      game2.change((w) => w.put(rid2, { ...now2, pin: { card: card2.oid, dx: now2.place.x - at4.x, dy: now2.place.y - at4.y } }));
    });
  }
  // R32, R251: dragging a pool brings its card, gathered or not, and what's pinned to it (Hands).
  /** Carries a character's pool. */
  startPool(rid2, down, move, done2, loose = false) {
    const { game: game2, table } = this.#w;
    const c = game2.get(rid2);
    if (!c || c.kind !== "character" || !table.pool(rid2)) return;
    const tied = this.#tiedIn(c);
    if (tied) {
      this.start(tied, down, move, loose);
      return;
    }
    const p0 = table.toWorld(down.clientX, down.clientY), grip = { x: p0.x - c.pool.x, y: p0.y - c.pool.y };
    const spot = this.#spot(c), cardEl = table.element(rid2), may = this.#may(c);
    let away = false;
    this.#carry({
      rid: rid2,
      part: "pool",
      // R584: a pool let go alone decides by where its card lands: its card is aimed at a docket.
      frame: (cx, cy) => {
        const f = less(table.toWorld(cx, cy), grip);
        if (!cardEl || !may) return f;
        const x = spot.x + f.x - c.pool.x, y = spot.y + f.y - c.pool.y;
        const docket = aimed(table.targets(rid2), { left: x, top: y, right: x + cardEl.offsetWidth, bottom: y + cardEl.offsetHeight });
        return docket ? { ...f, aim: { docket: ridOf(docket) } } : f;
      },
      buries: !this.#fresh.has(rid2),
      files: this.#fresh.has(rid2) ? null : drawerOf(c, this.#w.gm),
      drop: (last, over, z, file) => {
        away = over || file !== null;
        if (file !== null) return this.#file(c, file);
        if (over) return this.#putAway(c);
        return this.#drop(c, "pool", c.pool, last, z, last.aim, spot);
      },
      done: () => {
        if (!away) done2?.();
      },
      loose
    }, down, move);
  }
  // Seq: seq-drag.md#1.2 | R220, R287: the chip or card itself, found by its rid when the press was
  // elsewhere (a chip just taken from the bar was pressed on the supply).
  /** Carries a chip or an Influence card (from a slot, a drawer, a pile or the table): the piece itself. */
  startItem(rid2, down, move) {
    const { game: game2, table } = this.#w;
    const i = game2.get(rid2);
    const pressed = down.target?.closest?.("[data-rid]");
    const el4 = pressed?.dataset.rid === rid2 ? pressed : table.loose(rid2) ?? pressed;
    if (!i || !el4) return;
    const r = el4.getBoundingClientRect(), corner = table.toWorld(r.left, r.top), p = table.toWorld(down.clientX, down.clientY);
    const from = typeof i.where === "object" && "slot" in i.where ? { owner: i.where.slot, slot: i.where.name } : null;
    this.#carryItem(rid2, el4, { x: p.x - corner.x, y: p.y - corner.y }, down, move, from);
  }
  // R55, R225: the tap is a card from the first pixel, its Level spent, carried by its glyph; dropped
  // on a resource-made card it merges into it.
  /** Taps a glyph (`<character oid>:<source>`) and carries the card it makes. */
  startGlyph(source2, down, move) {
    const { game: game2, table, mint: mint2 } = this.#w;
    const oid = mint2()(), rid2 = ridOf(oid), p = table.toWorld(down.clientX, down.clientY);
    const change3 = tapOut(game2, source2, { table: { x: Math.round(p.x), y: Math.round(p.y), z: this.#top(), tilt: 0 } }, () => oid);
    if (!change3) return;
    table.still(() => game2.change(change3));
    const el4 = table.loose(rid2);
    if (el4) this.#carryItem(rid2, el4, { x: TAP_GLYPH_X, y: el4.offsetHeight / 2 }, down, move);
  }
  // R216, R243, R221: a chip or card, glued at its grip (in world coordinates, so at any zoom); a card
  // over a pool's slots is a chip centred on the pointer.
  #carryItem(rid2, el4, grip, down, move, from = null) {
    const { game: game2, table, hands, hand, mint: mint2 } = this.#w;
    const doc = el4.ownerDocument, item2 = game2.get(rid2);
    const isCard = item2?.kind === "influence" && el4.classList.contains("icard");
    let strip;
    this.#carry({
      rid: rid2,
      el: el4,
      pointing: true,
      buries: false,
      frame: (cx, cy) => {
        const aim2 = this.#itemAim(rid2, doc, cx, cy, from, isCard, strip);
        strip = aim2.reach;
        if (!!aim2.chip !== hands.chip(rid2) && table.held(rid2)) hands.show(hand, [{ rid: rid2, x: parseFloat(el4.style.left), y: parseFloat(el4.style.top), z: 0, aim: { chip: !!aim2.chip } }], true);
        const g = aim2.chip ? { x: el4.offsetWidth / 2, y: el4.offsetHeight / 2 } : grip;
        return { ...less(table.toWorld(cx, cy), g), aim: aim2 };
      },
      drop: (last, away, z) => this.#itemDrop(rid2, last.aim, away, { x: last.x, y: last.y, z, tilt: 0 }, mint2())
    }, down, move);
  }
  // R299, R222, R240, R243, R244: what a chip or card is aimed at, under the pointer, in this order: a
  // tap's merge, a slot, the kill box, a drawer (and where among its cards); the strip it opens; a
  // card over the slots shows as a chip.
  #itemAim(rid2, doc, x, y, from, isCard, strip) {
    const { game: game2 } = this.#w, i = game2.get(rid2);
    const hits = doc.elementsFromPoint?.(x, y) ?? [];
    const first2 = (sel) => {
      for (const h of hits) {
        const m = h.closest?.(sel);
        if (m) return m;
      }
      return null;
    };
    const aim2 = {};
    const into = i?.kind === "influence" && i.tap ? first2(".tapped[data-rid]") : null;
    const slot2 = first2(".slot"), kill2 = first2(".kill"), drawer2 = first2(".drawer");
    if (into && mergeTap(game2, rid2, into.dataset.rid, () => "")) aim2.merge = into.dataset.rid;
    else if (slot2) aim2.slot = { owner: slot2.dataset.owner, name: slot2.dataset.slot };
    else if (kill2) {
      const pool = kill2.closest(".pool")?.dataset.rid;
      if (pool) aim2.kill = pool.slice(2);
    } else if (drawer2) aim2.drawer = { owner: drawer2.dataset.drawer, ...i?.kind === "influence" && { at: gapAt(drawer2, x, y) } };
    const reach2 = this.#reach(x, y, from, strip);
    if (reach2) aim2.reach = reach2;
    if (isCard && hits.some((h) => h.closest?.(".slots"))) aim2.chip = true;
    return aim2;
  }
  // Seq: seq-drag.md#1.4 | R244: over a pool's slots, the strip under the pointer opens (trading
  // with the slot it came from, or an empty one); it stays open over open slots, and the pool goes
  // back when the carry leaves its slots.
  #reach(x, y, from, was) {
    for (const pool of this.#w.table.pools()) {
      const r = pool.querySelector(".slots")?.getBoundingClientRect();
      if (!r || x < r.left || x >= r.right || y < r.top || y >= r.bottom) continue;
      const owner = pool.dataset.rid.slice(2), kept = was?.owner === owner ? was : void 0;
      const under = [...pool.querySelectorAll(".slot")].find((s) => {
        const b = s.getBoundingClientRect();
        return x >= b.left && x < b.right;
      });
      if (!under?.classList.contains("narrow")) return kept;
      return { owner, at: under.dataset.slot, from: from && from.owner === owner ? from.slot : null };
    }
    return void 0;
  }
  // Seq: seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R21, R48, R268, R60, R211, R463: the
  // drop, from the last aim.
  #itemDrop(rid2, aim2, away, place3, mint2) {
    const { game: game2 } = this.#w, i = game2.get(rid2);
    if (!i) return null;
    if (aim2?.merge) return mergeTap(game2, rid2, aim2.merge, mint2);
    if (aim2?.slot) return toSlot(game2, rid2, aim2.slot.owner, aim2.slot.name, mint2, this.#w.who()) ?? (i.kind === "influence" ? toDrawer(game2, rid2, i.home) : null);
    if (aim2?.kill) return killCard(game2, rid2);
    if (aim2?.drawer) return toDrawer(game2, rid2, aim2.drawer.owner, aim2.drawer.at);
    if (away) return i.kind === "influence" ? toDrawer(game2, rid2, i.home) : vanish(game2, rid2);
    return toTable(game2, rid2, place3);
  }
  /** Pieces just taken from the bar (R19): put back there, they are never made. */
  #fresh = /* @__PURE__ */ new Set();
  fresh(rid2) {
    this.#fresh.add(rid2);
  }
  // R288: over the bar, anything carried turns it red; "→ <graveyard>" when letting go would bury it.
  #overBar(doc, cy) {
    const bar = doc.getElementById("bar");
    return !!bar && cy < bar.getBoundingClientRect().bottom;
  }
  // R519, R562: the desk on the bar, by the pointer, and the board of desks while it hangs below it.
  #overDesk(doc, cx, cy) {
    const inside = (r) => !!r && r.width > 0 && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    return inside(doc.querySelector("#bar .desk")?.getBoundingClientRect()) || inside(doc.querySelector("#bar .deskboard")?.getBoundingClientRect());
  }
  /** This page's desks (its `desk` record). */
  #desks() {
    return desksOf(this.#w.game.get("desk"));
  }
  // R555, R562: the desk a piece let go here is filed in: the board's row under the pointer, else the desk set out.
  #deskAt(doc, cx, cy) {
    const row2 = cx === null || cy === null ? null : doc.elementFromPoint(cx, cy)?.closest(".deskrow");
    const all2 = this.#desks();
    return row2 ? Number(row2.dataset.desk) : Math.max(0, Math.min(all2.out ?? 0, all2.desks.length - 1));
  }
  // R288, R520: over the bar it is red, with the graveyard it would be buried in; over the desk, with
  // the drawer it would be filed in instead.
  #lightBar(doc, cx, cy, buries, files) {
    const bar = doc.getElementById("bar"), desk = doc.querySelector("#bar .desk");
    if (!bar) return;
    const over = cy !== null && this.#overBar(doc, cy), file = !!files && cx !== null && cy !== null && this.#overDesk(doc, cx, cy);
    bar.classList.toggle("toss", over);
    bar.classList.toggle("bury", over && buries && !file);
    bar.dataset.yard = `\u2192 ${this.#w.yard().name || "Unnamed graveyard"}`;
    desk?.classList.toggle("file", file);
    const at4 = file ? this.#deskAt(doc, cx, cy) : -1;
    for (const row2 of doc.querySelectorAll("#bar .deskrow")) row2.classList.toggle("over", Number(row2.dataset.desk) === at4);
    if (desk && files) {
      const all2 = this.#desks(), one = all2.desks[at4];
      desk.dataset.drawer = `\u2192 ${all2.desks.length > 1 && one ? `${deskName(one)}: ` : ""}${LABEL[files]}`;
    }
  }
  // R519, R523: filed in its drawer with what a burial would take, and gone from the table.
  #file(rec, at4) {
    const { game: game2, gm } = this.#w, drawer2 = drawerOf(rec, gm);
    if (!drawer2) return () => {
    };
    const all2 = game2.all().map(([, r]) => r).filter((r) => "kind" in r);
    const chars = gm || rec.kind !== "docket" ? [] : all2.filter((r) => r.kind === "character" && r.pin?.card === rec.oid);
    const buried = new Set(chars.flatMap((c) => burialOf(c, all2)).map(ridFor)), bury2 = this.#bury(chars);
    const { shared: shared2, own: own2 } = putAway(rec, all2), recs = [...shared2, ...own2].filter((r) => !buried.has(ridFor(r)));
    const d = this.#desks();
    return (w) => {
      w.put("desk", filed(d, at4, drawer2, recs, graveName(rec)));
      for (const r of recs) w.del(ridFor(r));
      bury2(w);
    };
  }
  // R119, R122, R288, R290: put away on the bar: the reference card vanishes; anything else is
  // buried in the current graveyard, a character with its cards and pinned paper, under its name.
  #putAway(rec) {
    const rid2 = ridFor(rec);
    if (this.#fresh.delete(rid2) || rec.kind === "reference") return (w) => w.del(rid2);
    if (rec.kind === "connections") return (w) => w.put(rid2, { ...rec, away: true });
    return this.#bury([rec]);
  }
  // R488, R500: a torn roll and `mine` paper are buried on this page alone, in its Hill under the
  // graveyard's name (a character's pinned `mine` paper apart from it); the rest in Boot Hill.
  /** Buries each piece, a burial apiece, in one change. */
  #bury(pieces) {
    const { game: game2 } = this.#w, all2 = game2.all().map(([, r]) => r).filter((r) => "kind" in r);
    let y = game2.get("yards") ?? empty(), h = game2.get("hill") ?? { hill: [] };
    const cur = Math.min(this.#w.yard().cur, y.yards.length - 1), gone = [];
    let shares = false, owns2 = false;
    for (const rec of pieces) {
      const { shared: shared2, own: own2 } = putAway(rec, all2);
      if (shared2.length) {
        y = bury(y, cur, shared2, graveName(rec));
        shares = true;
      }
      for (const r of own2) {
        h = buryOwn(h, this.#w.yard().name, [r], graveName(r));
        owns2 = true;
      }
      gone.push(...shared2, ...own2);
    }
    return (w) => {
      if (shares) w.put("yards", y);
      if (owns2) w.put("hill", h);
      for (const r of gone) w.del(ridFor(r));
    };
  }
  // R513: a loose carry follows every pointer move until the next press, which it takes (no piece under
  // it is picked up, no key under it pressed, nor its click), or Esc, which puts the piece away.
  /** Follows the pointer with no button held until the next press or Esc. */
  #loose(doc, from, onMove, onEnd) {
    let at4 = from;
    const swallow = (ev) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    };
    const stop = () => {
      doc.removeEventListener("pointermove", move, true);
      doc.removeEventListener("pointerdown", press, true);
      doc.removeEventListener("keydown", key, true);
    };
    const move = (ev) => {
      at4 = ev;
      onMove(at4);
    };
    const press = (ev) => {
      swallow(ev);
      stop();
      doc.addEventListener("click", swallow, { capture: true, once: true });
      doc.addEventListener("pointerup", () => setTimeout(() => doc.removeEventListener("click", swallow, true), 0), { capture: true, once: true });
      onEnd(ev);
    };
    const key = (ev) => {
      if (ev.key !== "Escape") return;
      swallow(ev);
      stop();
      onEnd(at4, true);
    };
    doc.addEventListener("pointermove", move, true);
    doc.addEventListener("pointerdown", press, true);
    doc.addEventListener("keydown", key, true);
  }
  /** Follows one pointer on the document until it lets go. */
  #follow(doc, down, onMove, onUp) {
    const move = (ev) => {
      const e = ev;
      if (e.pointerId === down.pointerId) onMove(e);
    };
    const up = (ev) => {
      const e = ev;
      if (e.pointerId !== down.pointerId) return;
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", up);
      doc.removeEventListener("pointercancel", up);
      onUp(e);
    };
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", up);
    doc.addEventListener("pointercancel", up);
  }
  /** The card under the pointer, other than the piece itself. */
  #cardAt(doc, x, y, not) {
    for (const hit of doc.elementsFromPoint?.(x, y) ?? []) {
      const el4 = hit.closest?.(".obj.card");
      const card2 = el4 && el4 !== not ? this.#w.game.get(el4.dataset.rid) : void 0;
      if (card2) return card2;
    }
    return void 0;
  }
  // Seq: seq-drag.md#1.7 | R27, R32: one change: the carried part from where it started (`from`) to
  // where it was let go (`to`); a pool's card comes too (gathered, from where it is drawn, R574); a pool's
  // or card's pinned paper moves with it; loose paper is pinned to the card it was aimed at.
  #drop(rec, part, from, to, z, aim2, cardFrom) {
    const { game: game2 } = this.#w, rid2 = ridFor(rec), dx = to.x - from.x, dy = to.y - from.y;
    this.#fresh.delete(rid2);
    const moved = (p) => ({ ...p, x: Math.round(p.x + dx), y: Math.round(p.y + dy), z });
    const bringPapers = (w, holder) => {
      for (const [r2, o] of game2.all()) {
        const q = o;
        if ("kind" in q && isPinnable(q) && q.pin?.card === holder) w.put(r2, { ...q, place: moved(q.place) });
      }
    };
    const docketed = (c) => {
      const d = aim2?.docket ? game2.get(aim2.docket) : void 0, { pin: _was, ...out } = c;
      return d?.kind === "docket" ? { ...out, pin: { card: d.oid, dx: c.card.x - d.place.x, dy: c.card.y - d.place.y } } : out;
    };
    return (w) => {
      if (rec.kind === "character") {
        if (part === "pool") {
          const s = cardFrom ?? this.#spot(rec);
          const card3 = rec.gathered ? { ...rec.card, x: Math.round(s.x + dx), y: Math.round(s.y + dy) } : moved(rec.card);
          w.put(rid2, docketed({ ...rec, pool: moved(rec.pool), card: card3 }));
          bringPapers(w, rec.oid);
          return;
        }
        w.put(rid2, docketed({ ...rec, card: { ...rec.card, x: to.x, y: to.y, z }, gathered: false }));
        bringPapers(w, rec.oid);
        return;
      }
      if (!("place" in rec)) return;
      const place3 = moved(rec.place);
      if (rec.kind === "docket") {
        w.put(rid2, { ...rec, place: place3 });
        bringPapers(w, rec.oid);
        for (const [r2, o] of game2.all()) {
          const c = o;
          if (c.kind !== "character" || c.pin?.card !== rec.oid || !this.#may(c)) continue;
          w.put(r2, { ...c, card: moved(c.card), pool: moved(c.pool) });
          bringPapers(w, c.oid);
        }
        return;
      }
      if (!isPinnable(rec)) {
        w.put(rid2, { ...rec, place: place3 });
        return;
      }
      const card2 = this.#tackedTo(rec) ?? (aim2?.card ? game2.get(aim2.card) : void 0);
      const docket = aim2?.docket ? game2.get(aim2.docket) : void 0;
      let holder = null;
      if (card2?.kind === "character") holder = { oid: card2.oid, at: this.#spot(card2) };
      else if (docket?.kind === "docket") holder = { oid: docket.oid, at: docket.place };
      const { pin: _old, ...loose } = rec;
      w.put(rid2, holder ? { ...loose, place: place3, pin: { card: holder.oid, dx: place3.x - holder.at.x, dy: place3.y - holder.at.y } } : { ...loose, place: place3 });
    };
  }
};

// src/ui/table.ts
var SVG = "http://www.w3.org/2000/svg";
var GATHER_GAP = 14;
var ZOOM_MIN = 0.25;
var ZOOM_MAX = 2.5;
var ZOOM_RATE = 12e-4;
function pinchView(v, a0, b0, a1, b1) {
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y), d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, d0 ? v.zoom * d1 / d0 : v.zoom));
  const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 }, m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
  const k = zoom / v.zoom;
  return { x: m1.x - (m0.x - v.x) * k, y: m1.y - (m0.y - v.y) * k, zoom };
}
function fitView(b, size) {
  const bw = b.right - b.left, bh = b.bottom - b.top;
  const zoom = Math.max(ZOOM_MIN, Math.min(1, (size.w - 40) / bw, (size.h - 30) / bh));
  return { x: (size.w - bw * zoom) / 2 - b.left * zoom, y: 14 - b.top * zoom, zoom };
}
function pushClear(mat, pieces, gap = GATHER_GAP) {
  return pieces.filter(({ box: b }) => b.left < mat.right && b.right > mat.left && b.top < mat.bottom && b.bottom > mat.top).map(({ rid: rid2, box: box2 }) => ({ rid: rid2, dy: mat.bottom + gap - box2.top }));
}
var TableView = class {
  #root;
  #world;
  #w;
  #els = /* @__PURE__ */ new Map();
  #pools = /* @__PURE__ */ new Map();
  #loose = /* @__PURE__ */ new Map();
  /** What is in a hand (R220), this page's or another's, by rid or `rid#pool`: skipped by redraws. */
  #held = /* @__PURE__ */ new Map();
  /** Run after every redraw (Hands draws its reactions again). */
  after = null;
  /** Inside still(): a redraw that moves a piece doesn't glide (R226). */
  #still = false;
  #sized = new ResizeObserver((entries4) => {
    for (const e of entries4) {
      const rid2 = e.target.dataset.rid;
      if (rid2) {
        this.#snap(rid2);
        this.#push(rid2);
      }
    }
  });
  /** Each mat's height when last seen outside a carry (R241). */
  #heights = /* @__PURE__ */ new Map();
  view;
  /** Called after each placing of the view (R482). */
  #watchers = /* @__PURE__ */ new Set();
  /** R534: the red tapes, one SVG layer under the pieces, a path per docket; a tied docket's bow over its pile. */
  #tapeLayer;
  #tapes = /* @__PURE__ */ new Map();
  #bows = /* @__PURE__ */ new Map();
  /** R539: each piece leading a hand now, and the docket it is aimed at, if any (Hands). */
  #leads = /* @__PURE__ */ new Map();
  /** R271, R594: resolves once the view is settled: fitted on a first visit, else at once. */
  settled;
  #settle;
  constructor(root, world, w) {
    this.settled = new Promise((res) => {
      this.#settle = res;
    });
    this.#root = root;
    this.#world = world;
    this.#w = w;
    this.view = w.view ? { ...w.view } : { x: 0, y: 0, zoom: 1 };
    this.#tapeLayer = world.ownerDocument.createElementNS(SVG, "svg");
    this.#tapeLayer.classList.add("tapes");
    world.prepend(this.#tapeLayer);
    this.#place();
    w.game.listen((rids) => this.render(rids));
    this.render(w.game.all().map(([rid2]) => rid2));
    this.#panZoom();
    this.#images();
    this.#raisePins();
    if (!w.view) w.schedule(() => w.schedule(() => {
      this.#fit();
      this.#settle();
    }));
    else this.#settle();
    world.addEventListener("transitionend", (e) => {
      const t = e.target;
      if (t.parentElement === world && (e.propertyName === "left" || e.propertyName === "top")) t.classList.remove("glide");
    });
  }
  // CRC: crc-TableView.md | R220, R298: the hand, this page's or another's (Hands).
  /** Holds a piece (`rid`, or `rid#pool`): into the world layer at `at`, squared up and raised, skipped by redraws. */
  lift(key, el4, at4) {
    this.#held.set(key, { el: el4, at: at4 });
    if (el4.parentElement !== this.#world) this.#world.append(el4);
    el4.classList.add("obj", "lifted");
    el4.classList.remove("glide");
    el4.style.pointerEvents = "none";
    this.place(key, at4);
    if (!key.endsWith("#pool")) this.render([key]);
  }
  /** Puts a held piece at `at`. */
  place(key, at4) {
    const h = this.#held.get(key);
    if (!h) return;
    h.at = at4;
    h.el.style.left = `${at4.x}px`;
    h.el.style.top = `${at4.y}px`;
  }
  /** What holds `key`, if it's held. */
  held(key) {
    return this.#held.get(key)?.el;
  }
  /**
   * Lets go of a held piece: a chip or card back in the loose layer if it was loose, and gone if it
   * was a hand's own; paper, cards and pools stay, for their record to draw.
   */
  letGo(key) {
    const h = this.#held.get(key);
    this.#held.delete(key);
    if (!h) return;
    const { el: el4 } = h;
    el4.style.pointerEvents = "";
    el4.classList.remove("lifted", "carried");
    const rid2 = key.replace(/#pool$/, "");
    if (this.#loose.get(rid2) !== el4 && this.#els.get(rid2) !== el4 && this.#pools.get(rid2) !== el4) el4.remove();
  }
  /**
   * The element drawing a chip or card, wherever it lies (a slot, a drawer, loose), or a new one
   * shaped as a loose one for a piece drawn only in a pile.
   */
  handFor(rid2, make4 = true) {
    const i = this.#w.game.get(rid2);
    if (!i || i.kind !== "chip" && i.kind !== "influence") return void 0;
    const drawn = this.#loose.get(rid2) ?? this.#world.querySelector(`.pool [data-rid="${rid2}"]`);
    if (drawn || !make4) return drawn ?? void 0;
    const e = this.#world.ownerDocument.createElement("div");
    e.dataset.rid = rid2;
    this.#shape(e, i);
    return e;
  }
  // R226, R217: what this page let go itself is drawn where it landed, without gliding.
  /** Runs `fn` (a change of this page's own) with gliding off. */
  still(fn) {
    const was = this.#still;
    this.#still = true;
    try {
      fn();
    } finally {
      this.#still = was;
    }
  }
  /** The element drawing a piece (a character's card), if any. */
  element(rid2) {
    return this.#els.get(rid2);
  }
  /** A character's pool mat, or a chip or card lying loose on the table. */
  pool(rid2) {
    return this.#pools.get(rid2);
  }
  loose(rid2) {
    return this.#loose.get(rid2);
  }
  /** Every pool mat, for opening the strip a carry is over (R244). */
  pools() {
    return [...this.#pools.values()];
  }
  #items() {
    return this.#w.game.all().map(([, r]) => r).filter((r) => "kind" in r && (r.kind === "chip" || r.kind === "influence"));
  }
  // R33: a gathered card is drawn under its pool's drawer, wherever that ends; the same on every page.
  #snap(rid2) {
    const { game: game2 } = this.#w, c = game2.get(rid2), card2 = this.#els.get(rid2), mat = this.#pools.get(rid2);
    if (!c || c.kind !== "character" || !card2 || !mat || !c.gathered || this.#held.has(rid2)) return;
    card2.style.left = `${c.pool.x}px`;
    card2.style.top = `${c.pool.y + mat.offsetHeight + GATHER_GAP}px`;
    const at4 = this.gatheredAt(rid2);
    if (!at4 || !game2.get("book") || mat.ownerDocument.body.classList.contains("dragging")) return;
    const x = Math.round(at4.x), y = Math.round(at4.y);
    if (x !== c.card.x || y !== c.card.y) game2.change((w) => w.put(rid2, { ...c, card: { ...c.card, x, y } }));
  }
  /** The height of this page's docked roll row in a mat, which is its own alone (R381). */
  #ownRow(mat) {
    const row2 = mat.querySelector(".roller");
    return row2 ? row2.offsetHeight + parseFloat(getComputedStyle(row2).marginBottom || "0") : 0;
  }
  // R575, R576: a gathered card belongs under its pool, a page's own docked roll row left out, so every
  // page puts it in the same place.
  /** Where a gathered card belongs, in table coordinates, or null when it isn't drawn here. */
  gatheredAt(rid2) {
    const c = this.#w.game.get(rid2), mat = this.#pools.get(rid2);
    if (!c || c.kind !== "character" || !mat) return null;
    return { x: c.pool.x, y: c.pool.y + mat.offsetHeight - this.#ownRow(mat) + GATHER_GAP };
  }
  // R241: on the GM's page, a mat that grew pushes the pieces it now covers just clear below it, in
  // one change (they glide on every page). Not mid-carry: a drawer's gap is only there for a moment.
  #push(rid2) {
    const { game: game2, viewer } = this.#w, mat = this.#pools.get(rid2), c = game2.get(rid2);
    if (!mat || !c || c.kind !== "character" || mat.ownerDocument.body.classList.contains("dragging")) return;
    const own2 = this.#ownRow(mat);
    const h = mat.offsetHeight - own2, was = this.#heights.get(rid2);
    this.#heights.set(rid2, h);
    if (was === void 0 || h <= was || !viewer?.gm) return;
    const box2 = (e, less2 = 0) => {
      const left = parseFloat(e.style.left), top = parseFloat(e.style.top);
      return { left, top, right: left + e.offsetWidth, bottom: top + e.offsetHeight - less2 };
    };
    const pieces = [];
    for (const [r, e] of this.#els) {
      const p = game2.get(r);
      if (!p || r === rid2 || (p.kind === "character" ? p.gathered : "pin" in p && !!p.pin)) continue;
      pieces.push({ rid: r, box: box2(e) });
    }
    for (const [r, e] of this.#pools) if (r !== rid2) pieces.push({ rid: `${r}#pool`, box: box2(e) });
    for (const [r, e] of this.#loose) pieces.push({ rid: r, box: box2(e) });
    const moves = pushClear(box2(mat, own2), pieces);
    if (!moves.length) return;
    game2.change((w) => {
      const out = /* @__PURE__ */ new Map();
      const cur = (r) => out.get(r) ?? game2.get(r);
      const down = (p, dy) => ({ ...p, y: Math.round(p.y + dy) });
      for (const { rid: key, dy } of moves) {
        const pool = key.endsWith("#pool"), r = pool ? key.slice(0, -5) : key, p = cur(r);
        if (p.kind === "character" && pool) out.set(r, { ...p, pool: down(p.pool, dy) });
        else if (p.kind === "character") {
          out.set(r, { ...p, card: down(p.card, dy) });
          for (const [r2, o] of game2.all()) {
            const q = o;
            if ("kind" in q && "pin" in q && q.pin?.card === p.oid && "place" in q) out.set(r2, { ...q, place: down(q.place, dy) });
          }
        } else if ("place" in p) out.set(r, { ...p, place: down(p.place, dy) });
        else if ((p.kind === "chip" || p.kind === "influence") && typeof p.where === "object" && "table" in p.where) {
          out.set(r, { ...p, where: { table: down(p.where.table, dy) } });
        }
      }
      for (const [r, p] of out) w.put(r, p);
    });
  }
  #drawPools(rids) {
    const items = this.#items().filter((i) => !this.#held.has(ridOf(i.oid)));
    for (const rid2 of rids) {
      const c = this.#w.game.get(rid2), old = this.#pools.get(rid2);
      if (!c || c.kind !== "character") {
        if (old) {
          this.#sized.unobserve(old);
          old.remove();
          this.#pools.delete(rid2);
        }
        continue;
      }
      const e = drawPool(c, items, old, this.#w);
      if (e !== old) {
        this.#world.append(e);
        this.#pools.set(rid2, e);
        this.#sized.observe(e);
      }
      const held = this.#held.get(`${rid2}#pool`);
      if (held) {
        e.style.left = `${held.at.x}px`;
        e.style.top = `${held.at.y}px`;
      }
      this.#snap(rid2);
    }
  }
  /** A loose chip's or card's look: a chip's face, or a card's name and Level (returned, for its clicks). */
  #shape(e, i) {
    e.className = `obj loose-item ${i.kind === "chip" ? `chip ${i.sign > 0 ? "pos" : "neg"}` : `icard ${i.sign > 0 ? "pos" : "neg"} tapped`}`;
    if (i.kind === "chip") {
      e.textContent = chipFace(i);
      return null;
    }
    const level2 = e.ownerDocument.createElement("button");
    level2.className = "level";
    level2.textContent = `${i.sign > 0 ? "+" : "\u2212"}${levelName(i.points)}`;
    e.replaceChildren(`${i.name} `, level2);
    return level2;
  }
  // R60: a chip or a tap can lie loose on the table.
  #drawLoose(rid2) {
    if (this.#held.has(rid2)) return;
    const i = this.#w.game.get(rid2), old = this.#loose.get(rid2);
    const where2 = i && typeof i.where === "object" && "table" in i.where ? i.where.table : null;
    if (!i || !where2) {
      old?.remove();
      this.#loose.delete(rid2);
      return;
    }
    const doc = this.#world.ownerDocument;
    let e = old;
    if (!e) {
      e = doc.createElement("div");
      e.dataset.rid = rid2;
      const click2 = (shift) => {
        if (this.#w.game.get(rid2)?.kind !== "chip") return;
        const ch = chipClick(this.#w.game, rid2, shift, this.#w.mint());
        if (ch) this.#w.game.change(ch);
      };
      gesture(e, { click: () => click2(false), shift: () => click2(true), drag: (d, m) => this.#w.dragItem(rid2, d, m) });
      this.#world.append(e);
      this.#loose.set(rid2, e);
    }
    const level2 = this.#shape(e, i);
    if (level2) {
      const click2 = (shift) => {
        const ch = cardClick(this.#w.game, rid2, shift, this.#w.mint());
        if (ch) this.#w.game.change(ch);
      };
      gesture(level2, { click: () => click2(false), shift: () => click2(true) });
    }
    e.style.left = `${where2.x}px`;
    e.style.top = `${where2.y}px`;
    e.style.zIndex = String(where2.z);
  }
  // Seq: seq-save.md#1.4: only the changed rids are touched.
  render(rids) {
    const was = /* @__PURE__ */ new Map();
    for (const m of [this.#els, this.#pools, this.#loose]) for (const e of m.values()) was.set(e, `${e.style.left},${e.style.top}`);
    this.#render(rids);
    if (!this.#still) {
      for (const [e, at4] of was) {
        if (e.isConnected && !e.classList.contains("lifted") && at4 !== "," && at4 !== `${e.style.left},${e.style.top}`) e.classList.add("glide");
      }
    }
    this.after?.();
  }
  #render(changed) {
    const characters3 = /* @__PURE__ */ new Set(), game2 = this.#w.game;
    const rids = [...changed], kind = (rid2) => game2.get(rid2)?.kind;
    if (rids.some((rid2) => isPiece(rid2) && (!game2.get(rid2) || kind(rid2) === "opinion" || kind(rid2) === "connections"))) {
      for (const [rid2, r] of game2.all()) if (r.kind === "character" && !rids.includes(rid2)) rids.push(rid2);
    }
    let items = false;
    for (const rid2 of rids) {
      if (!onTable(rid2)) continue;
      const r = this.#w.game.get(rid2);
      if (!r || r.kind === "character") characters3.add(rid2);
      if (!r || r.kind === "chip" || r.kind === "influence") {
        items = true;
        this.#drawLoose(rid2);
        if (r) continue;
      }
      const old = this.#els.get(rid2);
      if (r && this.#held.has(rid2)) continue;
      const e = r ? draw(r, old, this.#w) : null;
      if (!e) {
        if (old) {
          old.remove();
          this.#els.delete(rid2);
          if (old.dataset.blob) this.#w.imageGone(old.dataset.blob);
        }
        continue;
      }
      if (e !== old) {
        old?.remove();
        this.#world.append(e);
        this.#els.set(rid2, e);
      }
    }
    this.#pinZ();
    if (!items) {
      this.#drawPools([...characters3]);
      return;
    }
    const pools2 = /* @__PURE__ */ new Set();
    for (const [rid2, r] of this.#w.game.all()) if (r.kind === "character") pools2.add(rid2);
    for (const rid2 of this.#pools.keys()) pools2.add(rid2);
    this.#drawPools([...pools2]);
  }
  #fit() {
    const els = [...this.#world.children].filter((e) => e instanceof HTMLElement && !e.classList.contains("lifted"));
    if (!els.length) return;
    const b = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
    for (const e of els) {
      b.left = Math.min(b.left, e.offsetLeft);
      b.top = Math.min(b.top, e.offsetTop);
      b.right = Math.max(b.right, e.offsetLeft + e.offsetWidth);
      b.bottom = Math.max(b.bottom, e.offsetTop + e.offsetHeight);
    }
    const r = this.#root.getBoundingClientRect();
    this.view = fitView(b, { w: r.width, h: r.height });
    this.#place();
    this.#w.keepView(this.view);
  }
  // R272: image files dropped from the desktop, each where it was dropped, a step of 24 apart.
  #images() {
    this.#root.addEventListener("dragover", (e) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    });
    this.#root.addEventListener("dragstart", (e) => e.preventDefault());
    this.#root.addEventListener("drop", (e) => {
      const files = [...e.dataTransfer?.files ?? []].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      const p = this.toWorld(e.clientX, e.clientY);
      files.forEach((f, i) => this.#w.addImage(f, { x: Math.round(p.x + i * 24), y: Math.round(p.y + i * 24) }));
    });
  }
  // R273: pinned paper lies on its card: at least one above it, and over it while the card is written on.
  #pinZ() {
    const game2 = this.#w.game;
    for (const [rid2, r] of game2.all()) {
      const p = r, e = this.#els.get(rid2);
      if (!e || !isPinnable(p)) continue;
      const holder = p.pin ? game2.get(ridOf(p.pin.card)) : void 0;
      e.classList.toggle("pinned", !!p.pin);
      e.classList.toggle("tacked", holder?.kind === "character");
      if (!p.pin) {
        delete e.dataset.pin;
        continue;
      }
      e.dataset.pin = p.pin.card;
      let z = null;
      if (holder?.kind === "character") z = holder.card.z;
      else if (holder?.kind === "docket") z = holder.place.z;
      if (z !== null && "place" in p) e.style.zIndex = String(Math.max(p.place.z, z + 1));
    }
  }
  #raisePins() {
    const mark2 = (e, on) => {
      const card2 = e.target.closest?.(".obj.card");
      const oid = card2?.dataset.rid?.slice(2);
      if (oid) for (const p of this.#world.querySelectorAll(`.obj.pinned[data-pin="${oid}"]`)) p.classList.toggle("atop", on);
    };
    this.#root.addEventListener("focusin", (e) => mark2(e, true));
    this.#root.addEventListener("focusout", (e) => mark2(e, false));
  }
  // CRC: crc-TableView.md | R534, R535, R537, R539, R542, R543: the dockets' tapes and tied piles.
  /** A drawn piece's box in table coordinates. */
  box(rid2) {
    const e = this.#els.get(rid2);
    if (!e) return null;
    const left = parseFloat(e.style.left), top = parseFloat(e.style.top);
    return { left, top, right: left + e.offsetWidth, bottom: top + e.offsetHeight };
  }
  /** The dockets drawn here, each with the papers pinned to it that this page holds (R535). */
  #dockets() {
    const all2 = this.#w.game.all(), out = /* @__PURE__ */ new Map();
    for (const [rid2, r] of all2) {
      const p = r;
      if (p.kind === "docket" && this.#els.has(rid2)) out.set(p.oid, { rid: rid2, d: p, papers: [], chars: [] });
    }
    for (const [rid2, r] of all2) {
      const p = r;
      if (isPinnable(p) && p.pin && this.#els.has(rid2)) out.get(p.pin.card)?.papers.push(rid2);
      else if (p.kind === "character" && p.pin && this.#els.has(rid2)) out.get(p.pin.card)?.chars.push(rid2);
    }
    return [...out.values()];
  }
  /** The boxes a docket's tape goes round: its label, its papers and its characters' cards (piled, when
   * tied, pools and all, R588), less `leave`. */
  #boxes(k, leave, tied) {
    const label2 = this.box(k.rid);
    if (!label2) return [];
    const papers = k.papers.filter((r) => r !== leave), chars = k.chars.filter((r) => r !== leave);
    if (!tied) return [label2, ...[...papers, ...chars].flatMap((r) => this.box(r) ?? [])];
    return [label2, ...[...this.#pile(label2, papers, chars)].flatMap(([key, p]) => {
      const e = this.#elOf(key);
      return e ? [{ left: p.x, top: p.y, right: p.x + e.offsetWidth, bottom: p.y + e.offsetHeight }] : [];
    })];
  }
  /** A pile key's element: a pool mat for `rid#pool`, else the piece's. */
  #elOf(key) {
    return key.endsWith("#pool") ? this.#pools.get(key.slice(0, -5)) : this.#els.get(key);
  }
  // R542, R588: where a tied docket's papers and characters lie, piled under its label.
  #pile(label2, papers, chars) {
    const game2 = this.#w.game, all2 = game2.all();
    const items = [
      ...papers.map((r) => ({ rid: r, z: game2.get(r).place.z })),
      ...chars.map((r) => {
        const c = game2.get(r);
        const on = all2.filter(([r2, q]) => isPinnable(q) && q.pin?.card === c.oid && this.#els.has(r2)).map(([r2]) => r2);
        return { rid: r, z: c.card.z, on };
      })
    ];
    return pile(label2, pileKeys(items).map((rid2, z) => ({ rid: rid2, z })));
  }
  // R536, R538, R539, R543: the dockets a carried piece may join, each tape drawn without it.
  /** Every docket on this page as the aim sees it, `carried` left out of each tape. */
  targets(carried) {
    const tied = tiedHere(this.#w.game);
    return this.#dockets().filter((k) => k.rid !== carried).map((k) => ({ oid: k.d.oid, z: k.d.place.z, tape: tapeOf(this.#boxes(k, carried, tied.has(k.d.oid))) }));
  }
  // R534, R539, R542: each docket's tape round its label and papers; a carried paper only while aimed at
  // it. A tied docket's papers lie piled under the label (marked piled), its bow over them.
  /** Draws the tapes, the pieces leading hands now (and their aims) given by Hands. */
  tapes(leads) {
    if (leads) this.#leads = leads;
    const doc = this.#tapeLayer.ownerDocument, tied = tiedHere(this.#w.game), dockets = this.#dockets();
    const piled = /* @__PURE__ */ new Set();
    for (const k of dockets) {
      const isTied = tied.has(k.d.oid), label2 = isTied ? this.box(k.rid) : null;
      this.#els.get(k.rid)?.classList.toggle("tied", isTied);
      if (!label2) continue;
      const free2 = (r) => !this.#leads.has(r) && !this.#held.has(r);
      for (const [key, p] of this.#pile(label2, k.papers.filter(free2), k.chars.filter(free2))) {
        const e = this.#elOf(key);
        if (!e || this.#held.has(key)) continue;
        e.style.left = `${p.x}px`;
        e.style.top = `${p.y}px`;
        piled.add(e);
      }
    }
    for (const e of this.#world.querySelectorAll(".obj.piled")) {
      if (piled.has(e)) continue;
      e.classList.remove("piled");
      const rid2 = e.dataset.rid, r = this.#w.game.get(rid2), pool = e.classList.contains("pool");
      if (!r || this.#held.has(pool ? `${rid2}#pool` : rid2)) continue;
      const at4 = r.kind === "character" ? pool ? r.pool : r.card : "place" in r ? r.place : null;
      if (at4) {
        e.style.left = `${at4.x}px`;
        e.style.top = `${at4.y}px`;
      }
      if (r.kind === "character" && !pool) this.#snap(rid2);
    }
    for (const e of piled) e.classList.add("piled");
    const seen3 = /* @__PURE__ */ new Set();
    for (const k of dockets) {
      seen3.add(k.rid);
      const isTied = tied.has(k.d.oid);
      const back3 = (r) => !this.#leads.has(r) || this.#leads.get(r) === k.rid;
      const boxes = this.#boxes({ ...k, papers: k.papers.filter(back3), chars: k.chars.filter(back3) }, null, isTied);
      for (const [r, at4] of this.#leads) if (at4 === k.rid && !k.papers.includes(r) && !k.chars.includes(r)) {
        const b = this.box(r);
        if (b) boxes.push(b);
      }
      let line = this.#tapes.get(k.rid);
      if (!line) {
        line = doc.createElementNS(SVG, "path");
        this.#tapeLayer.append(line);
        this.#tapes.set(k.rid, line);
      }
      line.setAttribute("d", path(tapeOf(boxes)));
      this.#bow(k.rid, isTied ? boxes.slice(1) : [], [...k.papers, ...k.chars]);
    }
    for (const [rid2, line] of this.#tapes) if (!seen3.has(rid2)) {
      line.remove();
      this.#tapes.delete(rid2);
      this.#bow(rid2, [], []);
    }
  }
  // R542: the red tape crossed over a tied pile in a bow, above its papers.
  #bow(rid2, pileBoxes, papers) {
    let b = this.#bows.get(rid2);
    if (!pileBoxes.length) {
      b?.remove();
      this.#bows.delete(rid2);
      return;
    }
    if (!b) {
      b = this.#world.ownerDocument.createElement("div");
      b.className = "bow";
      this.#world.append(b);
      this.#bows.set(rid2, b);
    }
    const left = Math.min(...pileBoxes.map((x) => x.left)), top = Math.min(...pileBoxes.map((x) => x.top));
    const right = Math.max(...pileBoxes.map((x) => x.right)), bottom = Math.max(...pileBoxes.map((x) => x.bottom));
    const z = Math.max(0, ...papers.map((r) => parseInt(this.#els.get(r)?.style.zIndex || "0", 10)));
    Object.assign(b.style, { left: `${left}px`, top: `${top}px`, width: `${right - left}px`, height: `${bottom - top}px`, zIndex: String(z + 1) });
  }
  // R572, R571: the pin line, from the middle of a paper's tack (its tilt counted) to a card's middle or
  // the pointer, under the paper and over its card: one below the paper's height.
  #pin = null;
  /** Draws the pin line from the tack of paper `rid`, its corner at `at`, to `to`, raising `cards`; or takes it away. */
  pinLine(rid2, at4, to, cards = []) {
    const e = rid2 ? this.#els.get(rid2) : void 0;
    for (const x of this.#world.querySelectorAll(".pinraised, .pinpaper")) x.classList.remove("pinraised", "pinpaper");
    if (!e || !at4 || !to) {
      this.#pin?.ownerSVGElement?.remove();
      this.#pin = null;
      return;
    }
    for (const c of cards) this.#els.get(c)?.classList.add("pinraised");
    e.classList.add("pinpaper");
    if (!this.#pin) {
      const doc = this.#world.ownerDocument, svg = doc.createElementNS(SVG, "svg");
      svg.classList.add("pinline");
      this.#pin = doc.createElementNS(SVG, "line");
      svg.append(this.#pin);
      this.#world.append(svg);
    }
    const m = new DOMMatrix(getComputedStyle(e).transform), turn2 = Math.atan2(m.b, m.a), h = e.offsetHeight / 2;
    const from = { x: at4.x + e.offsetWidth / 2 + h * Math.sin(turn2), y: at4.y + h - h * Math.cos(turn2) };
    const l = this.#pin, f = (n) => String(Math.round(n));
    l.ownerSVGElement.style.zIndex = String((parseInt(getComputedStyle(e).zIndex, 10) || 1) - 1);
    l.setAttribute("x1", f(from.x));
    l.setAttribute("y1", f(from.y));
    l.setAttribute("x2", f(to.x));
    l.setAttribute("y2", f(to.y));
  }
  /** Screen to table coordinates, for drops. */
  toWorld(clientX, clientY) {
    const r = this.#root.getBoundingClientRect();
    return { x: (clientX - r.left - this.view.x) / this.view.zoom, y: (clientY - r.top - this.view.y) / this.view.zoom };
  }
  #place() {
    this.#world.style.transform = `translate(${this.view.x}px, ${this.view.y}px) scale(${this.view.zoom})`;
  }
  // R482: a carry under a pinch re-frames when the view moves beneath its still finger.
  /** Calls `fn` after each move of the view; returns a function that stops it. */
  onView(fn) {
    this.#watchers.add(fn);
    return () => this.#watchers.delete(fn);
  }
  /** Places the view and tells the watchers. */
  #moved() {
    this.#place();
    for (const fn of [...this.#watchers]) fn();
  }
  // R15: drag empty table to pan; the wheel zooms about the pointer. R16: a press that no piece
  // takes (a pool's empty space beside its name included) lands here. R479-R482: two fingers pinch.
  #panZoom() {
    const root = this.#root, doc = root.ownerDocument;
    const fingers = /* @__PURE__ */ new Map();
    let from = null;
    let pinch = null;
    const pan = paced(this.#w.schedule, ({ x, y }) => {
      this.view = { ...this.view, x, y };
      this.#moved();
    });
    const look = paced(this.#w.schedule, (v) => {
      this.view = v;
      this.#moved();
    });
    const zoomed = paced(this.#w.schedule, (v) => {
      this.#moved();
      this.#w.keepView(v);
    });
    const local2 = (e) => {
      const r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const panFrom = (id, at4) => {
      from = { x: at4.x, y: at4.y, vx: this.view.x, vy: this.view.y, id };
      doc.body.classList.add("panning");
    };
    const settle = () => {
      pan.flush();
      look.flush();
      doc.body.classList.remove("panning");
      this.#w.keepView(this.view);
    };
    root.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      fingers.delete(e.pointerId);
      if (fingers.size >= 2) {
        e.stopPropagation();
        return;
      }
      const at4 = local2(e);
      if (fingers.size === 0) {
        fingers.set(e.pointerId, { at: at4, held: true });
        return;
      }
      e.stopPropagation();
      const [id, first2] = [...fingers][0];
      if (first2.held && claim(id)) first2.held = false;
      fingers.set(e.pointerId, { at: at4, held: false });
      if (from) {
        pan.flush();
        from = null;
      }
      pinch = { v: { ...this.view }, a: id, b: e.pointerId, a0: first2.at, b0: at4 };
      doc.body.classList.add("panning");
    }, { capture: true });
    root.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      doc.activeElement?.blur?.();
      const f = fingers.get(e.pointerId);
      if (f) f.held = false;
      panFrom(e.pointerId, local2(e));
    });
    doc.addEventListener("pointermove", (e) => {
      const f = fingers.get(e.pointerId);
      if (f) f.at = local2(e);
      if (pinch && f) {
        look.to(pinchView(pinch.v, pinch.a0, pinch.b0, fingers.get(pinch.a).at, fingers.get(pinch.b).at));
      } else if (from && e.pointerId === from.id) {
        const at4 = local2(e);
        pan.to({ x: from.vx + at4.x - from.x, y: from.vy + at4.y - from.y });
      }
    });
    const end = (e) => {
      if (!fingers.delete(e.pointerId) && !(from && e.pointerId === from.id)) return;
      if (pinch && (e.pointerId === pinch.a || e.pointerId === pinch.b)) {
        const rest = e.pointerId === pinch.a ? pinch.b : pinch.a, f = fingers.get(rest);
        pinch = null;
        settle();
        if (f && !f.held) panFrom(rest, f.at);
      } else if (from && e.pointerId === from.id) {
        from = null;
        settle();
      }
    };
    doc.addEventListener("pointerup", end);
    doc.addEventListener("pointercancel", end);
    root.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = root.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.view.zoom * Math.exp(-e.deltaY * ZOOM_RATE)));
      const k = zoom / this.view.zoom;
      this.view = { x: px - (px - this.view.x) * k, y: py - (py - this.view.y) * k, zoom };
      zoomed.to(this.view);
    }, { passive: false });
  }
};

// src/ui/hands.ts
var LAND_MS = 1e3;
function asChip(el4, i) {
  el4.className = `loose-item chip ${i.sign > 0 ? "pos" : "neg"}`;
  el4.textContent = chipFace(i);
  if (i.kind === "influence") el4.title = i.name;
}
var Hands = class {
  #w;
  /** hand → key → piece. */
  #hands = /* @__PURE__ */ new Map();
  #t = 0;
  /** What is drawn now: lit places, gaps, strips, cards shown as chips (with their own look). */
  #lit = /* @__PURE__ */ new Set();
  #gaps = /* @__PURE__ */ new Set();
  #chips = /* @__PURE__ */ new Map();
  constructor(w) {
    this.#w = w;
    w.game.listen((rids) => {
      for (const [hand, pieces] of this.#hands) for (const [key, p] of pieces) if (!p.own && rids.has(p.rid)) this.#land(hand, key);
    });
  }
  // Seq: seq-move.md#1.4, seq-drag.md#1.3 | R298, R218: each piece lifted at its place, with what follows it.
  /** A hand's pieces are at these places, aimed so. Another page's slide there (`carried`). */
  show(hand, items, own2) {
    const { table, game: game2 } = this.#w;
    const pieces = this.#hands.get(hand) ?? /* @__PURE__ */ new Map();
    this.#hands.set(hand, pieces);
    for (const i of items) {
      const key = i.part === "pool" ? `${i.rid}#pool` : i.rid;
      const old = pieces.get(key);
      if (old?.landing) {
        clearTimeout(old.landing);
        delete old.landing;
      }
      const at4 = { x: i.x, y: i.y };
      const keys2 = this.#hold(key, i.rid, at4, own2);
      if (!keys2.length) continue;
      const r = game2.get(i.rid);
      if (r?.kind === "character") {
        let card2 = at4;
        if (i.part === "pool") {
          const mat = table.pool(i.rid);
          card2 = r.gathered && mat ? { x: at4.x, y: at4.y + mat.offsetHeight + GATHER_GAP } : { x: r.card.x + at4.x - r.pool.x, y: r.card.y + at4.y - r.pool.y };
          keys2.push(...this.#hold(i.rid, i.rid, card2, own2));
        }
        for (const [r2, o] of game2.all()) {
          const q = o;
          if ("kind" in q && isPinnable(q) && q.pin?.card === r.oid) keys2.push(...this.#hold(r2, r2, { x: card2.x + q.pin.dx, y: card2.y + q.pin.dy }, own2));
        }
      } else if (r?.kind === "docket") keys2.push(...this.#papers(r.oid, i.rid, at4, own2));
      pieces.set(key, { rid: i.rid, keys: [...new Set(keys2)], aim: i.aim, t: ++this.#t, own: own2 });
    }
    this.react();
  }
  // R541, R542, R586, R588: a docket brings the papers pinned to it that this page holds, and its characters
  // (each card, its pool mat and the paper on its card), where they lie from its label, or piled under it
  // when it is tied here.
  /** Holds a docket's papers and characters for its label at `at`; the keys. */
  #papers(oid, rid2, at4, own2) {
    const { table, game: game2 } = this.#w, label2 = table.element(rid2), all2 = game2.all();
    const papers = [], chars = [];
    const onCard = (c) => all2.filter(([r2, q]) => isPinnable(q) && q.pin?.card === c && table.element(r2));
    for (const [r2, o] of all2) {
      const q = o;
      if (isPinnable(q) && q.pin?.card === oid && table.element(r2)) papers.push([r2, q]);
      else if (q.kind === "character" && q.pin?.card === oid && table.element(r2)) chars.push([r2, q]);
    }
    const keys2 = [];
    if (label2 && tiedHere(game2).has(oid)) {
      const box2 = { left: at4.x, top: at4.y, right: at4.x + label2.offsetWidth, bottom: at4.y + label2.offsetHeight };
      const items = [...papers.map(([r2, q]) => ({ rid: r2, z: q.place.z })), ...chars.map(([r2, c]) => ({ rid: r2, z: c.card.z, on: onCard(c.oid).map(([r3]) => r3) }))];
      for (const [key, p] of pile(box2, pileKeys(items).map((r2, z) => ({ rid: r2, z })))) {
        keys2.push(...this.#hold(key, key.endsWith("#pool") ? key.slice(0, -5) : key, p, own2));
      }
      return keys2;
    }
    for (const [r2, { pin: pin2 }] of papers) keys2.push(...this.#hold(r2, r2, { x: at4.x + pin2.dx, y: at4.y + pin2.dy }, own2));
    for (const [r2, c] of chars) {
      const card2 = { x: at4.x + c.pin.dx, y: at4.y + c.pin.dy }, spot = (c.gathered ? table.gatheredAt(r2) : null) ?? c.card;
      keys2.push(...this.#hold(r2, r2, card2, own2), ...this.#hold(`${r2}#pool`, r2, { x: card2.x + c.pool.x - spot.x, y: card2.y + c.pool.y - spot.y }, own2));
      for (const [r3, q] of onCard(c.oid)) keys2.push(...this.#hold(r3, r3, { x: card2.x + q.pin.dx, y: card2.y + q.pin.dy }, own2));
    }
    return keys2;
  }
  /** Holds one piece at `at`, lifting it first if it isn't held; the keys it holds. */
  #hold(key, rid2, at4, own2) {
    const { table } = this.#w;
    if (!table.held(key)) {
      const el5 = key.endsWith("#pool") ? table.pool(rid2) : table.element(rid2) ?? table.handFor(rid2);
      if (!el5) return [];
      table.lift(key, el5, at4);
    }
    const el4 = table.held(key);
    el4.classList.toggle("carried", !own2);
    table.place(key, at4);
    return [key];
  }
  // Seq: seq-move.md#2.1 | R300: this page's let go at once; another page's wait for the drop's change.
  /** The hand let go of these pieces, here. */
  drop(hand, items, own2) {
    const pieces = this.#hands.get(hand);
    if (!pieces) return;
    if (own2) {
      for (const key of [...pieces.keys()]) this.#release(hand, key);
      this.react(false);
      return;
    }
    this.show(hand, items.map(({ aim: _, ...i }) => i), false);
    for (const i of items) {
      const key = i.part === "pool" ? `${i.rid}#pool` : i.rid, p = pieces.get(key);
      if (p) p.landing = setTimeout(() => this.#land(hand, key), LAND_MS);
    }
    this.react(false);
  }
  // R301: a page that leaves lets go of what it held.
  /** Lets go of everything `hand` holds. */
  leave(hand) {
    const pieces = this.#hands.get(hand);
    if (!pieces) return;
    for (const key of [...pieces.keys()]) this.#land(hand, key);
    this.#hands.delete(hand);
  }
  // Seq: seq-move.md#2.2: let go, and drawn where its record says.
  #land(hand, key) {
    const p = this.#hands.get(hand)?.get(key);
    if (!p) return;
    this.#release(hand, key);
    this.#w.table.render(p.keys.map((k) => k.replace(/#pool$/, "")));
    this.react(false);
  }
  #release(hand, key) {
    const pieces = this.#hands.get(hand), p = pieces?.get(key);
    if (!p) return;
    if (p.landing) clearTimeout(p.landing);
    pieces.delete(key);
    for (const k of p.keys) {
      const el4 = this.#w.table.held(k);
      if (el4) this.#unchip(el4);
      this.#w.table.letGo(k);
    }
  }
  // Seq: seq-drag.md#1.4 | R299, R222, R240, R244, R243: every hand's aims, latest last; only what
  // differs from what's drawn is drawn.
  /** Draws what the aims do. Run again after every redraw (a drawer's redraw drops its gap). */
  react(animate = true) {
    const { table, game: game2 } = this.#w;
    const lit = /* @__PURE__ */ new Set(), gaps = /* @__PURE__ */ new Map(), strips = /* @__PURE__ */ new Map();
    const chips = /* @__PURE__ */ new Map();
    const all2 = [...this.#hands.values()].flatMap((m) => [...m.values()]).sort((a, b) => a.t - b.t);
    for (const p of all2) {
      const a = p.aim;
      if (!a) continue;
      const pool = (oid) => table.pool(ridOf(oid));
      let target = null;
      if (a.slot) target = pool(a.slot.owner)?.querySelector(`.slot-${a.slot.name}`);
      else if (a.drawer) {
        target = pool(a.drawer.owner)?.querySelector(".drawer");
        if (target && a.drawer.at !== void 0) gaps.set(target, a.drawer.at);
      } else if (a.kill) target = pool(a.kill)?.querySelector(".kill");
      else if (a.merge) target = table.held(a.merge) ? null : table.handFor(a.merge, false);
      else if (a.card) target = table.element(a.card);
      if (target) lit.add(target);
      if (a.reach) {
        const m = pool(a.reach.owner);
        if (m) strips.set(m, { at: a.reach.at, from: a.reach.from });
      }
      const el4 = table.held(p.rid), i = game2.get(p.rid);
      if (a.chip && el4 && i?.kind === "influence") chips.set(el4, i);
    }
    table.tapes(new Map(all2.map((p) => [p.rid, p.aim?.docket])));
    for (const e of this.#lit) if (!lit.has(e)) e.classList.remove("over");
    for (const e of lit) e.classList.add("over");
    this.#lit = lit;
    for (const d of this.#gaps) if (!gaps.has(d)) showGap(d, null, animate);
    for (const [d, at4] of gaps) showGap(d, at4, animate);
    this.#gaps = new Set(gaps.keys());
    for (const m of table.pools()) {
      const s = strips.get(m);
      reach(m, s?.at ?? null, s?.from ?? null);
    }
    for (const e of [...this.#chips.keys()]) if (!chips.has(e)) this.#unchip(e);
    for (const [e, i] of chips) {
      if (this.#chips.has(e)) continue;
      const carried = e.classList.contains("carried");
      this.#chips.set(e, { cls: e.className, kids: [...e.childNodes], title: e.title });
      asChip(e, i);
      e.classList.add("obj", "lifted");
      e.classList.toggle("carried", carried);
    }
  }
  /** Puts a card shown as a chip back to its own look. */
  #unchip(e) {
    const was = this.#chips.get(e);
    if (!was) return;
    this.#chips.delete(e);
    const carried = e.classList.contains("carried");
    e.className = was.cls;
    e.replaceChildren(...was.kids);
    e.title = was.title;
    e.classList.toggle("carried", carried);
  }
  /** Whether `rid` is shown as a chip in a hand now. */
  chip(rid2) {
    const e = this.#w.table.held(rid2);
    return !!e && this.#chips.has(e);
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
function tabId(session2) {
  let tab2 = null;
  try {
    tab2 = session2.getItem("hollow.tab");
  } catch {
  }
  if (!tab2) {
    tab2 = `t-${[...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
    try {
      session2.setItem("hollow.tab", tab2);
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
function session(key, value2) {
  try {
    if (value2 !== void 0) sessionStorage.setItem(key, value2);
    return sessionStorage.getItem(key);
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
function shown2(hands, cs, may = () => true) {
  const by = /* @__PURE__ */ new Map();
  for (const c of cs) {
    if (!may(c)) continue;
    const g = by.get(c.tab) ?? { moved: [], dropped: [] };
    (c.drop ? g.dropped : g.moved).push(c);
    by.set(c.tab, g);
  }
  for (const [tab2, g] of by) {
    if (g.moved.length) hands?.show(tab2, g.moved, false);
    if (g.dropped.length) hands?.drop(tab2, g.dropped, false);
  }
}
function views(game2, gameId, viewer, blobs, moves, hand, missing, ledger, rolling, checkpoint, self, present = () => []) {
  const who = viewer?.name ?? "nobody", gm = !!viewer?.gm;
  let seat = load(localStorage, gameId, who);
  const keep2 = (s) => {
    seat = s;
    save(localStorage, gameId, who, s);
  };
  const redraw = () => table.render(game2.all().map(([rid2]) => rid2));
  const mint2 = () => minter(game2, gm);
  let drag, rollRow;
  const eyes = new Eyes(game2, (oid) => {
    table.render([ridOf(oid)]);
    rollRow?.render();
  });
  const slideInfo = (oid, k) => {
    const mine = `${oid}:`;
    keep2({ ...seat, open: { ...seat.open, info: [...seat.open.info.filter((s) => !s.startsWith(mine)), mine + k] } });
    redraw();
  };
  let taking = null;
  const cancelTake = () => {
    if (!taking) return;
    taking = null;
    removeEventListener("keydown", onTakeKey, true);
    removeEventListener("pointerdown", onTakePress, true);
    removeEventListener("pointerup", onTakeUp, true);
    redraw();
  };
  const onTakeKey = (e) => {
    if (e.key === "Escape") cancelTake();
  };
  let pressedOff = null;
  const onTakePress = (e) => {
    const card2 = taking && document.querySelector(`.obj.card[data-rid="${ridOf(taking.oid)}"]`);
    pressedOff = card2 && !card2.contains(e.target) ? { x: e.clientX, y: e.clientY } : null;
  };
  const onTakeUp = (e) => {
    if (pressedOff && Math.hypot(e.clientX - pressedOff.x, e.clientY - pressedOff.y) < 5) cancelTake();
    pressedOff = null;
  };
  const startTake = (r) => {
    const a = r.attack, c = a && game2.get(ridOf(a.target));
    if (!a || c?.kind !== "character") return;
    cancelTake();
    taking = { oid: c.oid, id: r.id, kind: a.kind, by: a.from, result: a.result, pages: pages(c, a.kind, a.result), k: 0 };
    const col = `${c.oid}:${COLUMN_OF[a.kind]}`;
    keep2({ ...seat, open: { ...seat.open, columns: [...seat.open.columns.filter((k) => !k.startsWith(`${c.oid}:`)), col] } });
    if (!c.flipped) game2.change((w) => w.put(ridOf(c.oid), { ...c, flipped: true }));
    addEventListener("keydown", onTakeKey, true);
    addEventListener("pointerdown", onTakePress, true);
    addEventListener("pointerup", onTakeUp, true);
    redraw();
  };
  const topZ = () => 1 + Math.max(0, ...game2.all().map(([, r]) => ("kind" in r ? placeOf(r) : null)?.z ?? 0));
  const maker = viewer?.gm ? GM : viewer?.name;
  const addImage = (file, at4) => blobs.add(file).then(({ blob, w: iw, h }) => {
    const oid = mint2()();
    const image2 = { kind: "image", oid, place: { ...at4, z: topZ(), tilt: 0 }, blob, w: iw, h, ...maker && { by: maker } };
    game2.change((wr) => wr.put(ridOf(oid), image2));
    bar.refused(null);
    return ridOf(oid);
  }, (e) => {
    const full = e?.name === "QuotaExceededError", said2 = e instanceof Error ? e.message : String(e);
    bar.refused(full ? { label: "storage full", why: `${file.name} not added: this browser's storage is full (${said2})` } : { label: "not added", why: `${file.name} not added: ${said2}` });
    return void 0;
  });
  const made = (what, oid, at4) => {
    switch (what) {
      case "character":
        return newCharacter(oid, viewer, at4);
      case "sticky":
        return newSticky(oid, at4, maker);
      // R498
      case "text":
        return newText(oid, at4, maker);
      case "howto":
        return newHowTo(oid, at4);
      case "docket":
        return newDocket(oid, at4, maker);
      // R532
      default:
        return newChip(oid, what.sign, what.points, at4);
    }
  };
  const takeTable = (e, mode) => {
    const at4 = table.toWorld(e.clientX, e.clientY), place3 = { x: Math.round(at4.x - 40), y: Math.round(at4.y - 20), z: topZ(), tilt: 0 };
    const found = game2.all().find(([, r]) => r.kind === "connections");
    if (found) {
      const { away: _away, ...t2 } = found[1];
      game2.change((w) => w.put(found[0], { ...t2, place: place3 }));
      if (mode !== "below") drag?.start(found[0], e, e, mode === "loose");
      return;
    }
    const oid = mint2()(), rid2 = ridOf(oid);
    let t = newConnections(oid, place3);
    for (const [, r] of game2.all()) if (r.kind === "character") t = keep(t, r, mint2()());
    game2.change((w) => w.put(rid2, t));
    if (mode === "below") return;
    drag?.fresh(rid2);
    drag?.start(rid2, e, e, mode === "loose");
  };
  const clearOfBar = (rid2) => {
    const c = game2.get(rid2), bar2 = document.getElementById("bar");
    if (c?.kind !== "character" || !bar2) return;
    const top = Math.round(table.toWorld(0, bar2.getBoundingClientRect().bottom).y + 10);
    const dy = top - c.pool.y;
    if (dy > 0) game2.change((w) => w.put(rid2, { ...c, pool: { ...c.pool, y: top }, card: { ...c.card, y: c.card.y + dy } }));
  };
  const bar = new BarView(document.getElementById("bar"), {
    version: "dev",
    date: "",
    gm,
    // R512-R514: made at the pointer and carried on the press or loose, or put just below the strip.
    take: (what, down, e, mode) => {
      if (what === "connections") {
        takeTable(e, mode);
        return;
      }
      const oid = mint2()(), rec = made(what, oid, table.toWorld(e.clientX, e.clientY)), rid2 = ridFor(rec);
      game2.change((w) => w.put(rid2, rec));
      if (mode === "below") {
        if (rec.kind === "character") clearOfBar(rid2);
        return;
      }
      drag?.fresh(rid2);
      const loose = mode === "loose";
      if (rec.kind === "character") drag?.startPool(rid2, e, e, () => clearOfBar(rid2), loose);
      else if (rec.kind === "chip") drag?.startItem(rid2, down, e);
      else drag?.start(rid2, e, e, loose);
    },
    // R526, R527: this page's drawers; an entry taken out comes back under the pointer with all it took, carried.
    filed: () => desksOf(game2.get("desk")),
    // R551, R552: the desks browsed as graveyards are; which is open is the GM's seat.
    cur: () => seat.desk.cur,
    setDesks: (desks, cur) => {
      game2.change((w) => w.put("desk", desks));
      keep2({ ...seat, desk: { cur } });
    },
    // R559, R561: one change: the desktop leaving kept in the GM's desk record, the new one laid out.
    setOut: (to) => {
      const c = setOut(desksOf(game2.get("desk")), game2.all().filter(([, r]) => "kind" in r), to);
      if (c) game2.change((w) => {
        w.put("desk", c.desk);
        for (const d of c.dels) w.del(d);
        for (const p of c.puts) w.put(p.rid, p.rec);
      });
    },
    takeOut: (at4, k, move) => {
      const out = takeOut(desksOf(game2.get("desk")), at4, k);
      const recs = raised(out.records, table.toWorld(move.clientX, move.clientY), topZ());
      if (!recs.length) return;
      game2.change((w) => {
        w.put("desk", out.desk);
        for (const r of recs) w.put(ridFor(r), r);
      });
      const lead = recs[0];
      if (lead.kind === "character") drag?.startPool(ridOf(lead.oid), move, move);
      else drag?.start(ridFor(lead), move, move);
    },
    // R515: picked images land at the pointer, a step apart; one alone let go in its pigeonhole is carried loose.
    images: (files, at4, carry) => {
      const r = document.getElementById("table").getBoundingClientRect();
      const to = at4 ?? { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }, c = table.toWorld(to.clientX, to.clientY);
      files.forEach((f, i) => void addImage(f, { x: Math.round(c.x - 120 + i * 24), y: Math.round(c.y - 80 + i * 24) }).then((rid2) => {
        if (!rid2 || !carry || !at4) return;
        const p = { clientX: at4.clientX, clientY: at4.clientY };
        drag?.fresh(rid2);
        drag?.start(rid2, p, p, true);
      }));
    }
  });
  game2.listen((rids) => {
    if (rids.has("desk")) bar.desk.render();
  });
  const table = new TableView(document.getElementById("table"), document.getElementById("world"), {
    game: game2,
    viewer,
    view: seat.view,
    keepView: (v) => keep2({ ...seat, view: v }),
    schedule: frame,
    imageUrl: (hash) => blobs.url(hash),
    imageGone: (hash) => blobs.release(hash),
    missing,
    addImage,
    opened: () => new Set(seat.open.columns),
    setOpened: (o) => {
      keep2({ ...seat, open: { ...seat.open, columns: [...o] } });
      redraw();
    },
    // R397: the Info card slid out of each NPC's card is this viewer's own.
    slid: () => new Set(seat.open.info),
    setSlid: (o) => {
      keep2({ ...seat, open: { ...seat.open, info: [...o] } });
      redraw();
    },
    drag: (rid2, down, move) => drag?.start(rid2, down, move),
    // R259: your own Resources only; anyone's Motivations and Damage.
    dragGlyph: (src, down, move) => {
      const colon = src.indexOf(":"), c = game2.get(ridOf(src.slice(0, colon)));
      if (c?.kind !== "character" || !mayTap(viewer, c, src.slice(colon + 1))) return false;
      drag?.startGlyph(src, down, move);
      return true;
    },
    mint: mint2,
    poolOpen: () => ({ piles: new Set(seat.open.piles), slots: new Set(seat.open.slots), used: new Set(seat.open.used) }),
    // Seat-tier openings: looking never changes the game (R128).
    toggle: (kind, key, on) => {
      const now2 = new Set(seat.open[kind]);
      if (on ?? !now2.has(key)) now2.add(key);
      else now2.delete(key);
      keep2({ ...seat, open: { ...seat.open, [kind]: [...now2] } });
      redraw();
    },
    dragItem: (rid2, down, move) => drag?.startItem(rid2, down, move),
    // R75–R77: an action's die brings the roll row; the action in use gets its swish.
    useAction: (oid, label2, alt) => rollRow?.action(oid, label2, alt) ?? false,
    react: (pc, npc) => rollRow?.react(pc, npc) ?? false,
    // R504: the names claimed at the table (the GM's page holds the claims), for the GM's checklist.
    // R578: the names claimed at the table (the GM's page holds the claims) and the players present.
    players: () => [.../* @__PURE__ */ new Set([...Object.keys(game2.get("book")?.claims ?? {}), ...present()])].sort(),
    inUse: (oid) => rollRow?.inUse(oid) ?? null,
    taking: () => taking,
    turnPage: (k) => {
      if (taking) {
        taking = { ...taking, k: Math.max(0, Math.min(k, taking.pages.length - 1)) };
        redraw();
      }
    },
    takePage: () => {
      const t = taking;
      cancelTake();
      if (t) void rolling().take(t.id, t.pages[t.k]);
    },
    cancelTake,
    eyes,
    // R403: an emptied Info card is buried in the graveyard being browsed, with its own name for the merge.
    buryInfo: (oid, k, text) => {
      const c = game2.get(ridOf(oid)), y = game2.get("yards") ?? empty();
      if (c?.kind !== "character") return;
      const cur = Math.min(seat.boothill.cur, y.yards.length - 1);
      game2.change((w) => w.put("yards", buryInfo(y, cur, c.name, { oid, k, text }, mint2()())));
    },
    // R401: the GM's menu on a pool makes an Info card on it, slid out with the caret in it.
    addInfo: (oid) => {
      const rid2 = ridOf(oid), c = game2.get(rid2);
      if (c?.kind !== "character") return;
      const k = (c.info ?? []).length;
      game2.change((w) => w.put(rid2, { ...c, info: [...c.info ?? [], ""] }));
      slideInfo(oid, k);
      document.querySelector(`.card[data-rid="${rid2}"] .infopaper .text`)?.focus();
    },
    // R422-R426: a record made from the NPC's menu, held by its row (its group's, R426), started as the
    // book's first meeting starts it, its cell in step; the table is made, put away, when there is none.
    addOpinion: (oid, of) => {
      const all2 = game2.all().map(([, r]) => r), chars = all2.filter((r) => r.kind === "character");
      const c = chars.find((x) => x.oid === oid);
      let t = tableOf(all2) ?? { ...newConnections(mint2()(), { x: 0, y: 0, z: 0, tilt: 0 }), away: true };
      if (!c) return;
      t = keep(t, c, mint2()());
      const holder = rowOf(t, c), pc = pcsOf(chars).find((x) => x.oid === of);
      if (!holder) return;
      const rec = {
        kind: "opinion",
        oid: mint2()(),
        holder: holder.id,
        of,
        text: first(t, all2.filter((r) => r.kind === "opinion"), holder.id, of, c, pc)
      };
      game2.change((w) => {
        w.put(ridOf(t.oid), synced(t, rec));
        w.put(ridOf(rec.oid), rec);
      });
      slideInfo(oid, `o${rec.oid}`);
    },
    // R428: an emptied record is buried whole, with its last words, named for its holder and character.
    buryRecord: (oid, words) => {
      const rid2 = ridOf(oid), rec = game2.get(rid2), y = game2.get("yards") ?? empty();
      const all2 = game2.all().map(([, r]) => r), t = tableOf(all2);
      if (rec?.kind !== "opinion" || !t) return;
      const chars = all2.filter((r) => r.kind === "character"), cur = Math.min(seat.boothill.cur, y.yards.length - 1);
      game2.change((w) => {
        w.del(rid2);
        if (words.trim()) w.put("yards", buryRecord(y, cur, nameOf(t, chars, rec.holder), nameOf(t, chars, rec.of), { ...rec, text: words }, mint2()()));
      });
    },
    // R142, R144, R146, R381: the die by a pool's name claims, opens, or docks the roll row.
    poolDie: (oid, shift, die3) => {
      const c = game2.get(ridOf(oid));
      if (c?.kind !== "character") return;
      const r = shift ? shiftClick(viewer, c) : click(viewer, c);
      if ("owner" in r) game2.change((w) => w.put(ridOf(oid), { ...c, owner: r.owner }));
      else if ("dock" in r) rollRow?.dock(oid);
      else {
        die3.title = r.refused;
        die3.animate?.([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "none" }], 200);
      }
    },
    dragPool: (rid2, down, move) => drag?.startPool(rid2, down, move),
    dragTack: (rid2, down, move) => drag?.startTack(rid2, down, move)
    // R571
  });
  const yard = () => {
    const y = game2.get("yards") ?? empty(), cur = Math.min(seat.boothill.cur, y.yards.length - 1);
    return { cur, name: y.yards[cur].name };
  };
  const hands = new Hands({ game: game2, table });
  table.after = () => hands.react();
  hands.react();
  drag = new Drag({ game: game2, table, hands, hand, moves, mint: mint2, schedule: frame, yard, who: () => viewer?.name, gm });
  const tape = new TapeView(document.getElementById("table"), {
    game: game2,
    viewer,
    up: () => seat.tapeUp,
    setUp: (up) => keep2({ ...seat, tapeUp: up }),
    crit: (id, choice, lock) => rolling().crit(id, choice, lock),
    mint: () => mint2()(),
    owner: (oid) => game2.get(ridOf(oid))?.owner,
    take: startTake,
    givable: (id) => rolling().givable(id),
    transfer: (id, resource2) => void rolling().transfer(id, resource2),
    name: (id, damage3, row2, text) => void rolling().name(id, damage3, row2, text),
    toWorld: (x, y) => table.toWorld(x, y),
    carry: (rid2, down, move) => drag?.start(rid2, down, move)
  });
  const register = new RegisterView(document.getElementById("bar"), { game: game2, viewer, checkpoint, paperRoll: () => tape.toggleUp() });
  const hang = () => {
    const t = document.getElementById("tape");
    if (t) {
      t.style.right = "auto";
      t.style.left = `${Math.max(8, Math.min(innerWidth - 258, register.left() + 2))}px`;
    }
  };
  new LedgerView(document.getElementById("bar"), document.body, { ...ledger, restore: async (id) => {
    await ledger.restore(id);
    const yards = game2.get("yards") ?? empty();
    keep2(prune(seat, (rid2) => game2.get(rid2) !== void 0, yards.yards.length));
    redraw();
  } });
  const hill = new BootHillView(document.getElementById("bar"), document.body, {
    game: game2,
    cur: () => seat.boothill.cur,
    setCur: (cur) => keep2({ ...seat, boothill: { ...seat.boothill, cur } }),
    open: () => seat.boothill.open,
    setOpen: (open) => keep2({ ...seat, boothill: { ...seat.boothill, open } }),
    toWorld: (x, y) => table.toWorld(x, y),
    top: topZ,
    slideInfo,
    carry: (lead, down, move) => lead.kind === "character" ? drag?.startPool(ridOf(lead.oid), down, move) : drag?.start(ridFor(lead), down, move)
  });
  if (gm) addEventListener("keydown", (ev) => {
    if (isPageUndo(ev) && hill.undoCard()) ev.preventDefault();
  });
  const deleted = /* @__PURE__ */ new Set();
  const repinned = () => {
    const book2 = game2.get("book");
    const puts = repin(game2.all().filter(([, r]) => "kind" in r), self === GM, (oid) => deleted.has(oid) || !!book2?.tomb[ridOf(oid)]);
    deleted.clear();
    if (puts.length) game2.change((w) => {
      for (const p of puts) w.put(p.rid, p.rec);
    });
  };
  const handed = () => {
    const takes = takeHanded(game2.all().filter(([, r]) => "kind" in r), self);
    if (takes.length) game2.change((w) => {
      for (const t of takes) {
        if (t.rid !== t.from) w.del(t.from);
        w.put(t.rid, t.rec);
      }
    });
  };
  const unshared = () => {
    if (self !== GM) return;
    const old = game2.all().filter(([rid2, r]) => isPiece(rid2) && r.kind === "reference").map(([rid2]) => rid2);
    if (old.length) game2.change((w) => {
      for (const rid2 of old) w.del(rid2);
    });
  };
  game2.listen((rids) => {
    for (const rid2 of rids) if (onTable(rid2) && !game2.get(rid2)) deleted.add(rid2.slice(2));
    queueMicrotask(repinned);
    queueMicrotask(handed);
    queueMicrotask(unshared);
  });
  handed();
  unshared();
  void table.settled.then(() => {
    const own2 = who === self ? seat : load(localStorage, gameId, self);
    if (own2.given) return;
    const at4 = table.toWorld(innerWidth / 2, innerHeight / 2), sheet2 = newHowTo(mint2()(), at4);
    const rec = { ...sheet2, place: { ...sheet2.place, z: topZ() } };
    game2.change((w) => w.put(ridFor(rec), rec));
    if (who === self) keep2({ ...own2, given: true });
    else save(localStorage, gameId, self, { ...own2, given: true });
  });
  if (gm) {
    const sig = (c) => `${c.name.trim()}
${groupOf(c.front) ?? ""}`, seen3 = /* @__PURE__ */ new Map();
    const npc = (r) => {
      const p = r;
      return p?.kind === "character" && p.owner === GM;
    };
    for (const [, r] of game2.all()) if (npc(r)) seen3.set(r.oid, sig(r));
    game2.listen((rids) => queueMicrotask(() => {
      const found = game2.all().find(([, r]) => r.kind === "connections");
      let t = found?.[1];
      for (const rid2 of rids) {
        const c = game2.get(rid2);
        if (!npc(c)) continue;
        const was = seen3.get(c.oid), now2 = sig(c);
        seen3.set(c.oid, now2);
        if (t && was !== void 0 && was !== now2) t = keep(t, c, mint2()());
      }
      if (found && t !== found[1]) game2.change((w) => w.put(found[0], t));
      if (!t) return;
      const all2 = game2.all().map(([, r]) => r), chars = all2.filter((r) => r.kind === "character");
      const moved = all2.flatMap((r) => {
        if (r.kind !== "opinion" || !r.shown?.length) return [];
        const now2 = published(t, chars, r);
        return JSON.stringify(now2) === JSON.stringify(r) ? [] : [now2];
      });
      if (moved.length) game2.change((w) => {
        for (const r of moved) w.put(ridOf(r.oid), r);
      });
    }));
  }
  hang();
  addEventListener("resize", hang);
  void document.fonts?.ready.then(hang);
  const tray2 = new TrayView(bar.oppo, { game: game2, viewer });
  rollRow = new RollRowView({
    game: game2,
    viewer,
    tray: tray2,
    mint: () => mint2()(),
    inferring: () => eyes.any(),
    // R364: the type last chosen for an action on a card, in this viewer's seat.
    remembered: (oid, label2) => seat.types[`${oid}:${label2}`],
    remember: (oid, label2, type) => keep2({ ...seat, types: { ...seat.types, [`${oid}:${label2}`]: type } }),
    pool: (oid) => table.pool(ridOf(oid)),
    redraw: (oids) => table.render(oids.map(ridOf)),
    // R100–R104, R281: the GM's page rolls at once (privately if switched); a player's asks it, Roll
    // reading "GM…" meanwhile; why not prints as a note on the tape.
    roll: (r) => {
      const rolls = rolling(), intent = intentOf(r);
      if (gm) {
        const why3 = rolls.roll(intent, !!r.priv);
        if (why3) rolls.note(why3);
        else rollRow.rolled(r.pool);
        return;
      }
      rollRow.waiting(r.pool, true);
      void rolls.request(intent).then((why3) => {
        rollRow.waiting(r.pool, false);
        if (why3) rolls.note(why3);
        else rollRow.rolled(r.pool);
      });
    }
  });
  return { table, drag, bar, hands };
}
function askName(held, last) {
  const ask = held.length ? `Your name at the table
Yours in this browser: ${held.join(", ")}` : "Your name at the table";
  for (; ; ) {
    const n = arrivalName(prompt(ask, last ?? void 0), held);
    if (n) return n;
  }
}
function meOf(p, name2, gm) {
  return { name: name2, gm, live: p.status.state === "live", ...p.status.state === "offline" && { why: p.status.why } };
}
function here(p) {
  return [...p.people].map(([tab2, person]) => ({ tab: tab2, ...person, stale: p.stale(tab2) }));
}
var keptNote = (k) => k === null ? "" : k ? " \xB7 Storage kept" : " \xB7 The browser may clear this storage";
function ledgerOf(store, blobs, player) {
  const onto = async (id) => {
    await store.open(id);
    location.reload();
  };
  const free2 = async () => {
    await blobs.free(new Set(await store.images()));
  };
  return {
    player,
    now: () => clock.now(),
    round: () => store.game.get("meta").round,
    // R455: and whether the browser keeps this storage, once it has been asked.
    current: () => store.current,
    status: () => store.status() + keptNote(store.kept()),
    rename: (name2) => store.rename(name2),
    checkpoints: () => store.checkpoints(),
    games: () => store.list(),
    checkpoint: (name2) => store.checkpoint(name2, false),
    restore: (id) => store.restore(id),
    open: onto,
    forget: async (id) => {
      await store.forget(id);
      await free2();
    },
    forgetCheckpoint: async (id) => {
      await store.forgetCheckpoint(id);
      await free2();
    },
    joined: () => store.joined(),
    newGame: async (name2) => onto((await store.add(name2)).id),
    exported: () => exportGame(store, blobs, store.current.id),
    imported: async (text) => onto((await importGame(store, blobs, text)).id)
  };
}
function redrawImages(game2, table, hash) {
  table.render(game2.all().filter(([, r]) => r.kind === "image" && r.blob === hash).map(([rid2]) => rid2));
}
var OLD_INVITE = "This invite is from an older version of the table. Ask the GM for a new link.";
async function main() {
  const db = await IdbDb.open();
  const store = new GameStore(db, clock, localStorage, async () => !!navigator.storage?.persist && (await navigator.storage.persisted() || await navigator.storage.persist()));
  const blobs = new BlobStore(db, measure);
  const sealer = await Sealer.make();
  const tab2 = tabId(sessionStorage), invited = fromUrl(location.search);
  const relay = new URLSearchParams(location.search).has("test") ? local("hollow.relay") ?? void 0 : void 0;
  const stamps = new Stamps(sessionStorage);
  const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  addEventListener("pagehide", () => {
    void store.save();
  });
  if (invited === "old") {
    document.body.replaceChildren(Object.assign(document.createElement("p"), { className: "old-invite", textContent: OLD_INVITE }));
    return { version: "dev", date: "", role: "old" };
  }
  if (invited) {
    const last = local("hollow.name"), held = await Identity.held(db, last);
    const name2 = session("hollow.name") ?? session("hollow.name", askName(held, last)) ?? "Player";
    local("hollow.name", name2);
    const identity2 = await Identity.player(db, name2), own2 = identity2.id === (await Identity.load(db)).id;
    const { id: copyId } = await store.copyFor(invited.room, identity2.id, own2, name2);
    const game3 = store.game;
    const wire = new Wire(invited.room, { identity: identity2, sealer, tab: tab2, relay });
    const copy = new Copy({
      game: game3,
      stamps,
      sealer,
      link: wire,
      clock,
      session: sessionStorage,
      local: localStorage,
      room: invited.room,
      copy: copyId,
      gm: invited.gm,
      held: (rid2) => moves2.holds(rid2)
    });
    let hands2;
    const moves2 = new Moves({ stamps, tab: tab2, send: (m) => {
      void wire.send("move", m);
    }, shared: shared(game3), place: (cs) => shown2(hands2, cs), timers: clock, schedule: frame });
    wire.on("move", (b, from) => moves2.receive(from.tab, b));
    const presence = new Presence({ net: wire, clock, role: "player", name: name2, gone: (tab3) => {
      rolls2.left(tab3);
      hands2?.leave(tab3);
    } });
    let notYours = null;
    wire.on("claim", (b, from) => {
      if (from.browser === invited.gm) notYours = b.why;
    });
    let claims = {};
    wire.on("claims", (b, from) => {
      if (from.browser === invited.gm) claims = b.claims;
    });
    let said2 = null, saidUntil = 0;
    const say = (why3) => {
      said2 = why3;
      saidUntil = clock.now() + 4e3;
    };
    wire.on("rename", (b, from) => {
      if (from.browser !== invited.gm || b.why === void 0) return;
      if (b.why) {
        say(b.why);
        return;
      }
      const to = b.to.trim(), id = store.current.id;
      save(localStorage, id, to, load(localStorage, id, name2));
      session("hollow.name", to);
      local("hollow.name", to);
      void Identity.renamed(db, name2, to).then(() => location.reload());
    });
    const rename3 = () => {
      const answer = prompt("Your name at the table", name2);
      if (answer === null || answer.trim() === name2) return;
      const gmTab = here(presence).find((p) => p.role === "gm" && !p.stale)?.tab;
      if (!gmTab) {
        say("The GM's page must be at the table to rename");
        return;
      }
      void wire.send("rename", { to: answer.trim() }, gmTab);
    };
    const rolls2 = new Rolls({ game: game3, sealer, clock, rng, link: wire, session: sessionStorage, gm: false, gmBrowser: invited.gm });
    const images = new ImageExchange(wire, blobs, clock);
    images.watch(game3);
    images.changed((hash) => redrawImages(game3, table2, hash));
    images.start();
    presence.start();
    copy.start();
    const v = views(
      game3,
      store.current.id,
      { name: name2, gm: false },
      blobs,
      moves2,
      tab2,
      (hash) => images.missing.get(hash),
      ledgerOf(store, blobs, true),
      () => rolls2,
      void 0,
      name2,
      () => [name2, ...[...presence.people.values()].filter((p) => p.role === "player").map((p) => p.name)]
    );
    const { table: table2, drag: drag2, bar: bar2 } = v;
    hands2 = v.hands;
    new FolksView(bar2.folks, bar2.youAre, { me: () => ({
      ...meOf(presence, name2, false),
      ...notYours !== null && { notYours },
      ...said2 !== null && clock.now() < saidUntil && { said: said2 }
    }), people: () => here(presence), held: (n) => claims[n], rename: rename3 });
    return { version: "dev", date: "", role: "player", tab: tab2, identity: identity2, store, blobs, wire, presence, copy, rolls: rolls2, images, moves: moves2, view: table2, drag: drag2 };
  }
  const identity = await Identity.load(db);
  await store.start();
  const game2 = store.game;
  const older = markOlder(game2);
  if (older) game2.change(older);
  const stale = oldClaims(game2);
  if (stale) game2.change(stale);
  const torn3 = ownTorn(game2.all(), game2.get("yards"), game2.get("hill"));
  if (torn3.puts.length || torn3.dels.length) game2.change((w) => {
    for (const rid2 of torn3.dels) w.del(rid2);
    for (const [rid2, r] of torn3.puts) w.put(rid2, r);
  });
  let gmShown = local("hollow.gmname") ?? GM;
  let table = null;
  let rolls = new Rolls({ game: game2, sealer, clock, rng, link: null, session: sessionStorage, gm: true });
  const moves = new Moves({
    stamps,
    tab: tab2,
    send: (m) => {
      void table?.wire.send("move", m);
    },
    shared: shared(game2),
    place: (cs) => shown2(hands, cs, (c) => !!table?.authority.mayMove(c.tab, c.rid)),
    timers: clock,
    schedule: frame
  });
  const open = () => {
    if (table) return table;
    const key = `hollow.room.${store.current.id}`;
    const room2 = local(key) ?? local(key, newRoom(store.current.name));
    const wire = new Wire(room2, { identity, sealer, tab: tab2, relay });
    const presence = new Presence({
      net: wire,
      clock,
      role: "gm",
      name: gmShown,
      here: (p, from) => {
        if (p.role === "player") authority.join(from.tab, p.name, from.browser, from.sealKey);
      },
      gone: (tab3) => hands.leave(tab3)
    });
    const authority = new Authority({ game: game2, stamps, sealer, link: wire, schedule: queueMicrotask });
    const whoIs2 = (from) => {
      const p = presence.people.get(from.tab), held = p && game2.get("book").claims[p.name];
      return p && held === from.browser ? p.name : null;
    };
    rolls = new Rolls({ game: game2, sealer, clock, rng, link: wire, session: sessionStorage, gm: true, whoIs: whoIs2 });
    const images = new ImageExchange(wire, blobs, clock);
    images.watch(game2);
    images.changed((hash) => redrawImages(game2, view, hash));
    images.start();
    presence.start();
    wire.on("move", (b, from) => moves.receive(from.tab, b));
    table = { room: room2, wire, presence, authority, rolls, images };
    return table;
  };
  const link = () => invite(location.href, open().room, identity.id);
  const close = () => {
    if (!table) return;
    void table.presence.close();
    table = null;
    rolls = new Rolls({ game: game2, sealer, clock, rng, link: null, session: sessionStorage, gm: true });
  };
  const gmSeat = load(localStorage, store.current.id, GM), viewer = gmSeat.viewAs ? { name: gmSeat.viewAs, gm: false } : { name: GM, gm: true };
  const { table: view, drag, bar, hands } = views(
    game2,
    store.current.id,
    viewer,
    blobs,
    moves,
    tab2,
    (hash) => table?.images.missing.get(hash),
    ledgerOf(store, blobs, false),
    () => rolls,
    // R459: End's checkpoint may prune old ones, so images nothing uses go after it.
    (name2) => store.checkpoint(name2, true).finally(() => void store.images().then((i) => blobs.free(new Set(i))).catch(() => void 0)),
    GM
  );
  new FolksView(bar.folks, bar.youAre, {
    me: () => table ? meOf(table.presence, gmShown, true) : { name: gmShown, gm: true, live: false },
    people: () => table ? here(table.presence) : [],
    held: (name2) => game2.get("book").claims[name2],
    rename: () => {
      gmShown = gmName(prompt("Your name, as players see it", gmShown), gmShown);
      local("hollow.gmname", gmShown);
      table?.presence.rename(gmShown);
    },
    handOver: (name2, browser) => {
      handOver2(game2, name2, browser);
      table?.authority.handedOver(name2);
    },
    table: { opened: () => !!table, open: () => void open(), invite: link, close },
    viewAs: {
      current: () => gmSeat.viewAs ?? GM,
      choices: () => viewAsChoices(
        [...table?.presence.people.values() ?? []].filter((p) => p.role === "player").map((p) => p.name),
        game2.all().map(([, r]) => r).filter((c) => c.kind === "character").map((c) => c.owner)
      ),
      choose: (name2) => {
        save(localStorage, store.current.id, GM, { ...gmSeat, viewAs: name2 === GM ? null : name2 });
        location.reload();
      }
    }
  });
  return {
    version: "dev",
    date: "",
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
    },
    // R361: for the browser specs, the records someone who owns nothing may see at all.
    forNobody: () => game2.all().map(([rid2]) => rid2).filter(shared(game2))
  };
}
var shared = (game2) => (rid2) => {
  if (isLocal(rid2)) return false;
  const r = game2.get(rid2);
  return !r || !!redact(r, null, (oid) => game2.get(ridOf(oid)));
};
var ready = main();
if (new URLSearchParams(location.search).has("test")) {
  window.hollow = { version: "dev", date: "", ready };
}
/*! Bundled license information:

@noble/secp256k1/index.js:
  (*! noble-secp256k1 - MIT License (c) 2019 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=app.js.map
