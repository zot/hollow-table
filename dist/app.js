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
var DICE = ["W", "G", "R", "B", "Y"];
var ROLL_TYPES = ["?", "skill", "influence", "phys", "mental", "psych", "infer", "impress", "request"];
var ATTACKS = ["phys", "mental", "psych"];
var isAttack = (t) => ATTACKS.includes(t);
var WORLD = "world";
var KEPT = 200;
var TOMBS = 3e3;
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
    )
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
    { tap: fields({ ledger: dict(int(0, 100)), current: str(CAPS.name) }), damage: oneOf(...DAMAGE), mot: oneOf(true), once: oneOf(true) }
  ),
  chip: fields({ kind: oneOf("chip"), oid: isOid, where, n: int(0, CAPS.list), sign, points, rider: bool }, { by: str(CAPS.name) }),
  sticky: fields({ kind: oneOf("sticky"), oid: isOid, place, text: marked }, { pin, big: bool }),
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
  meta: fields({ round: int(0, 1e4), rolls: int(0, 1e9) }, { counts: dict(int(0, 1e9), 1e4) }),
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
    { priv: bool, type: oneOf(...ROLL_TYPES), alt: str(CAPS.name), against: (v) => [
      fields({ def: oneOf("mental", "psych") }),
      fields({ act: str(CAPS.name) }),
      fields({ fld: str(CAPS.name) }),
      fields({ skl: str(CAPS.name) })
    ].some((f) => f(v)) }
  ), 1e3) }),
  book: fields(
    { claims: dict(str(CAPS.id)), gv: int(0, Number.MAX_SAFE_INTEGER), tomb: dict(int(0, Number.MAX_SAFE_INTEGER), TOMBS) },
    {
      hillGv: int(0, Number.MAX_SAFE_INTEGER),
      kept: list(fields(
        { character: isOid, n: int(0, Number.MAX_SAFE_INTEGER), full: receipt, roller: receipt, table: receipt },
        { tab: str(CAPS.id), sealKey: str(CAPS.text), priv: oneOf(true) }
      ), KEPT)
    }
  ),
  tape: fields({ receipts: list(receipt, 1e4) })
};
function check(rid2, value2) {
  if (isPiece(rid2)) return piece(value2) && value2.oid === oidOf(rid2);
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
  load(records2) {
    const changed = new Set(this.#records.keys());
    this.#records = new Map(records2);
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
function serialize(lines) {
  return lines.map((l) => l.map(runSource).join("")).join("\n");
}
function plain(line) {
  return line.map((r) => typeof r === "string" ? r : r.text).join("");
}
function marks(lines, tag2) {
  const out = [];
  lines.forEach((l, line) => l.forEach((r, run2) => {
    if (typeof r !== "string" && (!tag2 || r.mark === tag2)) out.push({ line, run: run2, mark: r.mark, text: r.text });
  }));
  return out;
}
var fits = (mark2, text) => !text.includes("\n") && !text.includes(`</${mark2}>`);
function replaceLine(lines, i, line) {
  return lines.map((l, j) => j === i ? line : l);
}
function setMark(lines, at3, text) {
  const r = lines[at3.line]?.[at3.run];
  if (!r || typeof r === "string" || !fits(r.mark, text)) return lines;
  return replaceLine(lines, at3.line, lines[at3.line].map((x, k) => k === at3.run ? { mark: r.mark, text } : x));
}
function mark(lines, range, tag2) {
  const r = lines[range.line]?.[range.run];
  if (typeof r !== "string" || range.start < 0 || range.end > r.length || range.start >= range.end) return lines;
  const text = r.slice(range.start, range.end);
  if (!fits(tag2, text)) return lines;
  const parts = [r.slice(0, range.start), { mark: tag2, text }, r.slice(range.end)].filter((x) => x !== "");
  const line = lines[range.line];
  return replaceLine(lines, range.line, [...line.slice(0, range.run), ...parts, ...line.slice(range.run + 1)]);
}
function unmark(lines, at3) {
  const line = lines[at3.line], r = line?.[at3.run];
  if (!line || !r || typeof r === "string") return lines;
  const out = [];
  line.forEach((x, k) => {
    const run2 = k === at3.run ? r.text : x, last = out[out.length - 1];
    if (typeof run2 === "string" && typeof last === "string") out[out.length - 1] = last + run2;
    else out.push(run2);
  });
  return replaceLine(lines, at3.line, out);
}
function labelEnd(mark2, text) {
  return mark2 === "act" || mark2 === "def" ? text.indexOf(":") + 1 : 0;
}
function render(lines, el3) {
  const doc = el3.ownerDocument;
  el3.replaceChildren(...lines.map((l) => {
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
function read(el3) {
  return scan(el3).lines;
}
function locate(el3, node, offset) {
  return scan(el3, { node, offset }).pos;
}
function scan(el3, at3) {
  const lines = [[]];
  let pos = null;
  const cur = () => lines[lines.length - 1];
  const here2 = (extra = 0) => {
    const line = cur(), last = line[line.length - 1];
    return typeof last === "string" ? { line: lines.length - 1, run: line.length - 1, offset: last.length + extra } : { line: lines.length - 1, run: line.length, offset: extra };
  };
  const push = (r) => {
    const line = cur(), last = line[line.length - 1];
    if (typeof r === "string" && typeof last === "string") line[line.length - 1] = last + r;
    else if (r !== "") line.push(r);
  };
  const walk = (n, top) => {
    const kids = Array.from(n.childNodes);
    kids.forEach((c, k) => {
      if (c.nodeType === 1 && c.tagName === "DIV" && top && k > 0) lines.push([]);
      if (at3?.node === n && at3.offset === k) pos ??= here2();
      if (c.nodeType === 3) {
        if (at3?.node === c) pos = here2(at3.offset);
        return push(c.textContent ?? "");
      }
      if (c.nodeType !== 1) return;
      const e = c, cls = e.className;
      if (e.tagName === "BR") return void (k < kids.length - 1 && lines.push([]));
      if (e.tagName === "SPAN" && isMark(cls) && fits(cls, e.textContent ?? "")) {
        if (at3 && e.contains(at3.node)) pos = { line: lines.length - 1, run: cur().length, offset: offsetIn(e, at3.node, at3.offset) };
        return push({ mark: cls, text: e.textContent ?? "" });
      }
      walk(e, false);
    });
    if (at3?.node === n && at3.offset >= kids.length) pos ??= here2();
  };
  walk(el3, true);
  return { lines: lines.map((l) => l.length ? l : [""]), pos };
}
function offsetIn(el3, node, offset) {
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
  walk(el3);
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
  const label = text.slice(0, colon).trim();
  const parts = splitComma(text.slice(colon + 1));
  if (!label || !parts) return null;
  const b = BASE.exec(parts[0]), d = DICE2.exec(parts[1]);
  if (!b || !d || d[1] === void 0 && d[2] === void 0) return null;
  return { label, base: signed(b[1]), yellows: d[1] ? Number(d[1]) : 0, bonus: d[2] ? signed(d[2]) : 0, att: actionAtt(text.slice(colon + 1)) };
}
function actionAtt(text) {
  const entries3 = [...text.matchAll(/\(([^)]*)\)/g)].flatMap((m) => m[1].split(",").map((e) => e.trim().toLowerCase()));
  return entries3.includes("no att") ? null : entries3.includes("int") ? "Int" : "Cha";
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
function suffered(label) {
  const r = influence(label);
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
function suffers(front, label) {
  const comma = label.lastIndexOf(",");
  if (comma > 0 && label.slice(0, comma).trim()) return suffered(label.slice(comma + 1));
  return variants(front).some((v) => v.label === label) ? suffered(label) : null;
}
function skillNamed(front, label) {
  const name2 = label.split(",")[0].trim().toLowerCase();
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
  const left2 = levelsOf(r) - by;
  return left2 < 0 ? null : m[1] + levelWord(left2) + m[3];
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
  const left2 = motiveLeft(text) - by;
  if (left2 < 0) return null;
  if (left2 >= levelsOf(r)) return base;
  if (!left2) return `${base} (0)`;
  const sign2 = r.sign === -1 ? "-" : "+";
  return `${base} (${sign2}${levelWord(left2)})`;
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
  if (!m) return null;
  const skills = [];
  let depth = 0, from = m[0].length;
  const take2 = (to) => {
    const raw = text.slice(from, to), lead = raw.length - raw.trimStart().length, name2 = raw.trim();
    if (name2) skills.push({ name: name2, start: from + lead, end: from + lead + name2.length });
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
  return { level: Number(m[1]), skills };
}
var skillName = (text) => text.replace(/^\s*✓\s*/, "").replace(/\s+\d+\s*$/, "").replace(/\s*\(x\d+[^)]*\)/gi, "").trim();
function points2(front, att = "Cha") {
  const lines = parse(front), out = [], attrs = {};
  for (const l of lines) for (const r of l) if (typeof r !== "string" && r.mark === "att") Object.assign(attrs, attributes(r.text));
  const value2 = att ? attrs[att] ?? 0 : 0;
  const plus = (level) => ` ${level}` + (att ? ` + ${att} ${value2}` : "");
  let fieldLevel = null;
  lines.forEach((l, line) => {
    let at3 = 0, onlySkills = true, sawField = false;
    for (const r of l) {
      const len = (typeof r === "string" ? r : r.text).length;
      if (typeof r === "string") {
        if (r.trim()) onlySkills = false;
        at3 += len;
        continue;
      }
      const t = r.text;
      if (r.mark === "def") {
        const d = defend(t), colon = t.indexOf(":") + 1, nums = [...t.slice(colon).matchAll(/\d+/g)];
        if (d) nums.forEach((n, k) => {
          const before2 = t.slice(0, colon + n.index);
          const which = /mental\s*$/i.test(before2) ? "mental" : /psych\s*$/i.test(before2) ? "psych" : k === 0 ? "mental" : "psych";
          const start = at3 + colon + n.index;
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
          start: at3 + colon + b.index,
          end: at3 + colon + b.index + b[0].length,
          against: { act: a.label },
          base: a.base,
          words: `${a.label} ${a.base}`
        });
      } else if (r.mark === "fld") {
        const f = field(t);
        if (f) {
          out.push({ line, start: at3, end: at3 + len, against: { fld: f.name }, base: f.level + value2, words: f.name + plus(f.level) });
          fieldLevel = f.level;
          sawField = true;
        }
      } else if (r.mark === "skl") {
        const many = skillsLine(t);
        if (many) {
          for (const k of many.skills) out.push({ line, start: at3 + k.start, end: at3 + k.end, against: { skl: k.name }, base: many.level + value2, words: k.name + plus(many.level) });
          fieldLevel = null;
        } else if (fieldLevel !== null) {
          const level = fieldLevel + (/^\s*✓/.test(t) ? 1 : 0), name2 = skillName(t);
          if (name2) out.push({ line, start: at3, end: at3 + len, against: { skl: name2 }, base: level + value2, words: name2 + plus(level) });
        }
      } else onlySkills = false;
      at3 += len;
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
function room(level) {
  const [, mild, min2, sig, absorb2] = ROOM.find((r) => level >= r[0]) ?? [0, 0, 0, 0, 0];
  return { boxes: { mild, min: min2, sig, maj: 0 }, absorb: absorb2 };
}
function columnRoom(char, d) {
  const name2 = d === "injury" ? "Con" : "Wis";
  for (const m of marks(parse(char.front), "att")) {
    const level = attributes(m.text)[name2];
    if (level !== void 0) return room(level);
  }
  return null;
}

// src/rules/absorb.ts
var SIZE = { mild: 2, min: 2, sig: 4, maj: 6 };
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
var total = (use) => ROWS.reduce((a, r) => a + use[r] * SIZE[r], 0);
var slots = (use) => ROWS.reduce((a, r) => a + use[r], 0);
function pages(char, kind, result) {
  const d = COLUMN_OF[kind], left2 = result - (columnRoom(char, d)?.absorb ?? 0);
  if (left2 <= 0) return [{ use: none(), overflow: 0 }];
  const avail = free(char, d), found = [];
  const walk = (i, use) => {
    if (i === ROWS.length) {
      const used = ROWS.filter((r) => use[r] > 0);
      if (!used.length) return;
      const sum2 = total(use), smallest = Math.min(...used.map((r) => SIZE[r]));
      if (sum2 >= left2 && sum2 - smallest < left2) found.push({ use: { ...use }, overflow: 0 });
      return;
    }
    const row2 = ROWS[i];
    for (let n = 0; n <= avail[row2]; n++) walk(i + 1, { ...use, [row2]: n });
  };
  walk(0, none());
  if (!found.length) return [{ use: avail, overflow: left2 - total(avail) }];
  return found.sort((a, b) => total(a.use) - total(b.use) || slots(a.use) - slots(b.use));
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
function sweep(y, at3, cur) {
  if (y.yards.length < 2 || !vacant(y.yards[at3])) return { yards: y, cur };
  const yards = { yards: y.yards.filter((_, i) => i !== at3) };
  return { yards, cur: Math.min(cur > at3 ? cur - 1 : cur, yards.yards.length - 1) };
}
var withYard = (y, at3, g) => ({ yards: y.yards.map((x, i) => i === at3 ? g : x) });
function burialOf(piece2, all2) {
  if (piece2.kind !== "character") return [piece2];
  const oid = piece2.oid;
  const inSlot3 = (r) => (r.kind === "chip" || r.kind === "influence") && typeof r.where === "object" && "slot" in r.where && r.where.slot === oid;
  return [piece2, ...all2.filter((r) => r.kind === "influence" && r.home === oid || inSlot3(r) || (r.kind === "sticky" || r.kind === "text" || r.kind === "image") && r.pin?.card === oid)];
}
function bury(y, cur, records2, name2) {
  const g = y.yards[cur];
  return withYard(y, cur, { ...g, items: [...g.items, { name: name2, records: records2 }] });
}
function take(y, cur, at3) {
  const g = y.yards[at3.yard], burial = g?.items[at3.item];
  if (!g || !burial) return { yards: y, cur, burial: void 0 };
  return { ...sweep(withYard(y, at3.yard, { ...g, items: g.items.filter((_, i) => i !== at3.item) }), at3.yard, cur), burial };
}
function exhume(y, cur, at3) {
  const { burial, ...b } = take(y, cur, at3);
  return { ...b, records: burial?.records ?? [] };
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
function forget(y, cur, at3) {
  const { burial: _gone, ...b } = take(y, cur, at3);
  return b;
}
function forgetAll(y, cur) {
  return sweep(withYard(y, cur, { ...y.yards[cur], items: [] }), cur, cur);
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
    case "tornroll": {
      const n = piece2.receipts.length;
      return `Tape: ${n} roll${n === 1 ? "" : "s"}${n ? `, last ${piece2.receipts[0].title}` : ""}`;
    }
    default:
      return "Image";
  }
}
function raised(records2, at3, z) {
  const lead = records2[0];
  if (!lead) return [];
  const anchor = lead.kind === "character" ? lead.pool : "place" in lead ? lead.place : null;
  if (!anchor) return records2;
  const grab = lead.kind === "character" ? GRAB_POOL : GRAB_PIECE;
  const dx = Math.round(at3.x - grab.x - anchor.x), dy = Math.round(at3.y - grab.y - anchor.y);
  const moved = (p) => ({ ...p, x: p.x + dx, y: p.y + dy, z });
  return records2.map((r) => r.kind === "character" ? { ...r, pool: moved(r.pool), card: moved(r.card) } : "place" in r ? { ...r, place: moved(r.place) } : r);
}
var GRAB_POOL = { x: 30, y: 14 };
var GRAB_PIECE = { x: 20, y: 14 };

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
var poolOf = (i, chars) => typeof i.where === "object" && "slot" in i.where ? chars(i.where.slot) : void 0;
function contribution(i, chars) {
  const pool = poolOf(i, chars);
  if (!pool) return false;
  if (i.kind === "chip") return !!i.by && i.by !== pool.owner;
  const home = chars(i.home);
  return !!home && home.owner !== pool.owner;
}
function redactPiece(r, viewer, chars) {
  if (r.kind === "character") return canSee(viewer, r) ? r : { ...r, front: blank(r.front), back: blankBack(r.back) };
  if (r.kind === "chip" || r.kind === "influence") {
    const pool = poolOf(r, chars);
    const stagger = typeof r.where === "object" && "slot" in r.where && r.where.name === "stagger";
    if (pool && !stagger && !canSee(viewer, pool) && !contribution(r, chars)) return void 0;
  }
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
  if ("rows" in record) return viewer?.gm ? record : { rows: Object.fromEntries(Object.entries(record.rows).filter(([, r]) => !r.priv)) };
  if ("set" in record && !viewer?.gm) return { set: record.set, total: 0 };
  return record;
}
function redactYards(y, viewer, chars) {
  return {
    yards: y.yards.map((g) => ({
      ...g,
      items: g.items.map((b) => {
        const buried = new Map(b.records.filter((r) => r.kind === "character").map((c) => [c.oid, c]));
        const look = (oid) => buried.get(oid) ?? chars(oid);
        return { ...b, records: b.records.map((r) => redactPiece(r, viewer, look)).filter((r) => !!r) };
      })
    }))
  };
}

// src/rules/tap.ts
function inFront(char, name2) {
  const lines = parse(char.front);
  for (const m of [...marks(lines, "res"), ...marks(lines, "mot")]) {
    const r = influence(m.text), mot = m.mark === "mot";
    if (r?.name !== name2 || !r.level) continue;
    const write = (n) => (mot ? adjust(m.text, n) : spend(m.text, n)) ?? m.text;
    return {
      char,
      name: name2,
      sign: r.sign ?? 1,
      left: mot ? motiveLeft(m.text) : levelsOf(r),
      ...mot && { mot: true },
      spend: (n) => ({ ...char, front: serialize(setMark(lines, m, write(n))) })
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
  return { char, name: slot2.name, sign: -1, left: rowLevels(row2) - (slot2.spent[k] ?? 0), damage: damage3, spend: spend2 };
}
function mayTap(viewer, char, rest) {
  const s = inBack(char, rest) ?? inFront(char, rest);
  if (!s) return false;
  return !!s.damage || !!s.mot || !!viewer?.gm || char.owner === viewer?.name;
}
function left(char, rest) {
  return (inBack(char, rest) ?? inFront(char, rest))?.left ?? 0;
}
function source(chars, id) {
  const colon = id.indexOf(":");
  if (colon < 0) return null;
  const char = chars(id.slice(0, colon));
  if (!char) return null;
  const rest = id.slice(colon + 1);
  return inBack(char, rest) ?? inFront(char, rest);
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
    points: MIN,
    used: false,
    crit: false,
    tap: { ledger: { [src]: 1 }, current: src },
    ...s.damage && { damage: s.damage },
    ...s.mot && { mot: true }
  };
  return { card: card2, changed: [s.spend(1)] };
}
function feed(chars, card2, src, oid) {
  if (!card2.tap) return null;
  const id = src ?? card2.tap.current;
  if (card2.used) return tap(chars, id, card2.where, oid);
  const s = source(chars, id);
  if (!s || s.left < 1 || s.damage !== card2.damage || !!s.mot !== !!card2.mot) return null;
  const ledger = { ...card2.tap.ledger, [id]: (card2.tap.ledger[id] ?? 0) + 1 };
  return { card: { ...card2, points: card2.points + STEP, tap: { ledger, current: id } }, changed: [s.spend(1)] };
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
    if (s) out.set(s.char.oid, s.spend(-n));
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
  const keep = Object.fromEntries(rest), current = card2.tap.current in keep ? card2.tap.current : rest[0][0];
  return { ...card2, points: Math.max(MIN, card2.points - STEP * lost), tap: { ledger: keep, current } };
}

// src/ui/gesture.ts
var LONG_MS = 500;
var DRAG_PX = 5;
var real = { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (h) => clearTimeout(h) };
var shifty = /* @__PURE__ */ new Set();
var shifted = (e) => !!(e.shiftKey || e.ctrlKey || e.altKey);
var clickOf = (h, e) => shifted(e) ? h.shift ?? h.click : h.click;
function gesture(el3, h, timers = real) {
  if (h.shift) shifty.add(el3);
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
  const target = el3.ownerDocument ?? globalThis.document ?? el3;
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
    if (e.target !== el3) return;
    e.preventDefault();
    clickOf(h, e)?.(e);
  };
  el3.addEventListener("pointerdown", onDown);
  if (h.click || h.shift) el3.addEventListener("keydown", onKey);
  return () => {
    reset();
    shifty.delete(el3);
    el3.removeEventListener("pointerdown", onDown);
    el3.removeEventListener("keydown", onKey);
  };
}
function paced(schedule, apply3) {
  let pending = null;
  const pass = () => {
    if (!pending) return;
    const { target } = pending;
    pending = null;
    apply3(target);
  };
  return {
    to(target) {
      if (!pending) schedule(pass);
      pending = { target };
    },
    flush: pass,
    cancel() {
      pending = null;
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
function apply(lines, a, b, tag2) {
  const [from, to] = before(a, b) ? [a, b] : [b, a];
  for (const p of [from, to]) {
    const r2 = lines[p.line]?.[p.run];
    if (r2 && typeof r2 !== "string") return unmark(lines, p);
  }
  const line = lines[from.line] ?? [];
  if (from.line === to.line && from.run === to.run && from.offset === to.offset) {
    const r2 = line[from.run], prev2 = line[from.run - 1], next2 = line[from.run + 1];
    if (from.offset === 0 && prev2 && typeof prev2 !== "string") return unmark(lines, { line: from.line, run: from.run - 1 });
    if (typeof r2 === "string" && from.offset === r2.length && next2 && typeof next2 !== "string") return unmark(lines, { line: from.line, run: from.run + 1 });
  }
  if (from.line !== to.line || from.run !== to.run) return lines;
  const r = line[from.run];
  if (typeof r !== "string") return lines;
  if (from.offset !== to.offset) return mark(lines, { line: from.line, run: from.run, start: from.offset, end: to.offset }, tag2);
  if (tag2 === "res" || tag2 === "mot") {
    const each = entries(r, tag2);
    if (each) return replaceRun(lines, from.line, from.run, each);
  }
  const start = r.length - r.trimStart().length, end = r.trimEnd().length;
  return mark(lines, { line: from.line, run: from.run, start, end }, tag2);
}
function entries(run2, tag2 = "res") {
  const parts = run2.split(",");
  if (!parts.every((p) => {
    const r = influence(p);
    return !!r?.level && (tag2 === "mot" || r.sign === 1);
  })) return null;
  const out = [];
  const plainRun = (s) => {
    if (!s) return;
    const last = out[out.length - 1];
    if (typeof last === "string") out[out.length - 1] = last + s;
    else out.push(s);
  };
  parts.forEach((p, k) => {
    if (k > 0) plainRun(",");
    const t = p.trim(), at3 = p.indexOf(t);
    plainRun(p.slice(0, at3));
    out.push({ mark: tag2, text: t });
    plainRun(p.slice(at3 + t.length));
  });
  return out;
}
function replaceRun(lines, line, run2, runs) {
  return lines.map((l, i) => i === line ? [...l.slice(0, run2), ...runs, ...l.slice(run2 + 1)] : l);
}
function heading(lines, line) {
  for (let i = line - 1; i >= 0; i--) {
    const h = lines[i].find((r) => typeof r !== "string" && r.mark === "head");
    if (h && typeof h !== "string") return h.text;
  }
  return null;
}
function offered(lines, line) {
  const l = lines[line];
  if (!l || l.some((r) => typeof r !== "string")) return null;
  const text = plain(l).trim();
  return text ? offer(text, heading(lines, line), underField(lines, line)) : null;
}
function underField(lines, line) {
  for (let k = line - 1; k >= 0; k--) {
    const marks2 = lines[k].filter((r) => typeof r !== "string" && !!r.text.trim());
    if (marks2.some((r) => r.mark === "fld")) return true;
    if (marks2.some((r) => r.mark !== "skl")) return false;
  }
  return false;
}
function places(count, k, at3, step) {
  let y = 0;
  return Array.from({ length: count }, (_, i) => {
    if (i === k) return at3;
    if (y + step > at3 && y < at3 + step) y = at3 + step;
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
  const area = (n) => (n?.nodeType === 1 ? n : n?.parentElement)?.closest(".writes") ?? null;
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
  function use(b, tag2) {
    const t = last;
    const ends = t && selection(t);
    if (!t || !ends) return shake(b);
    const lines = read(t), out = apply(lines, ends[0], ends[1], tag2);
    if (out === lines) return shake(b);
    render(out, t);
    t.dispatchEvent(new Event("input", { bubbles: true }));
    caretAt(t, Math.min(ends[0].line, ends[1].line));
    raise();
  }
  function shake(b) {
    b.animate?.([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }], 200);
  }
  function raise() {
    const t = last, ends = t && t.contains(doc.getSelection()?.anchorNode ?? null) ? selection(t) : null;
    let k = -1, div;
    if (t && ends) {
      const line = ends[1].line, tag2 = offered(read(t), line);
      k = pens.findIndex((p) => p.dataset.mark === tag2);
      if (k >= 0) div = t.children[line];
    }
    pens.forEach((p, i) => p.classList.toggle("offered", i === k && !!div));
    if (!div) {
      for (const p of pens) p.style.removeProperty("--dy");
      return;
    }
    const scale = piece2.getBoundingClientRect().height / piece2.offsetHeight || 1;
    const at3 = (div.getBoundingClientRect().top - box2.getBoundingClientRect().top) / scale;
    const step = pens[1].offsetTop - pens[0].offsetTop;
    places(pens.length, k, at3, step).forEach((y, i) => pens[i].style.setProperty("--dy", `${y - pens[i].offsetTop}px`));
  }
  piece2.addEventListener("focusin", (ev) => {
    const t = area(ev.target);
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

// src/ui/receipt.ts
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var two = (n) => String(n).padStart(2, "0");
function when(at3) {
  const d = new Date(at3);
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
  const el3 = doc.createElement("div");
  el3.className = r.outcome === "missing" ? "receipt note" : "receipt";
  el3.dataset.id = r.id;
  const line = (text, cls) => {
    const div = doc.createElement("div");
    if (cls) div.className = cls;
    div.textContent = text;
    el3.append(div);
  };
  const head = doc.createElement("div"), title = doc.createElement("span"), time2 = doc.createElement("span");
  head.className = "rhead";
  title.className = "title";
  title.textContent = r.title;
  time2.className = "when";
  time2.textContent = when(r.at) + (r.ok ? " \u2713" : "");
  head.append(title, time2);
  el3.append(head);
  if (r.outcome === "missing") return el3;
  if (r.by) line(`rolled by ${r.by === "GM" ? "the GM" : r.by}`, "by");
  const dice = doc.createElement("div");
  dice.className = "rdice";
  dice.append(...r.dice.map((d, k) => dieEl(doc, d, k)));
  el3.append(dice);
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
  if (r.priv) line("Private: not shown to the table", "privnote");
  return el3;
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
function writable(doc, cls, source2, save2) {
  const t = el(doc, "div", `${cls} writes`);
  t.contentEditable = "true";
  t.spellcheck = false;
  render(parse(source2), t);
  t.dataset.source = source2;
  t.addEventListener("input", () => {
    const s = serialize(read(t));
    t.dataset.source = s;
    save2(s);
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
  const wrap = el(doc, "div", "ruled");
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
  if ("place" in r) return r.place;
  return null;
}
function draw(r, old, w) {
  const at3 = placeOf(r);
  if (!at3) return null;
  const doc = old?.ownerDocument ?? document;
  const e = old?.dataset.kind === r.kind ? old : make(doc, r, w);
  e.style.left = `${at3.x}px`;
  e.style.top = `${at3.y}px`;
  e.style.zIndex = String(at3.z);
  e.style.setProperty("--tilt", tilt(r.oid));
  update(e, r, w);
  return e;
}
function make(doc, r, w) {
  const rid2 = ridOf(r.oid);
  const e = el(doc, "div", `obj ${CLASS[r.kind] ?? r.kind}`);
  e.dataset.kind = r.kind;
  e.dataset.rid = rid2;
  e.addEventListener("pointerdown", (ev) => {
    const t = ev.target;
    if (t.isContentEditable && t.ownerDocument.activeElement === t.closest("[contenteditable]")) ev.stopPropagation();
  }, true);
  gesture(e, { drag: (down, move) => {
    doc.activeElement?.blur?.();
    w.drag(rid2, down, move);
  } });
  switch (r.kind) {
    case "character": {
      const flipper = el(doc, "div", "flipper");
      const front = el(doc, "div", "face front"), back3 = el(doc, "div", "face back");
      const text = writable(doc, "text", r.front, (s) => change(w, rid2, (c) => ({ ...c, front: s })));
      front.append(text);
      e.addEventListener("pointerdown", (ev) => checkPress(ev, text), true);
      back3.append(
        el(doc, "div", "damage"),
        el(doc, "div", "notes-hd", "Notes"),
        ruled(doc, writable(doc, "notes", r.back.notes, (s) => change(w, rid2, (c) => ({ ...c, back: { ...c.back, notes: s } }))))
      );
      flipper.append(front, back3);
      const flip = el(doc, "button", "flip");
      flip.setAttribute("aria-label", "Flip the card");
      gesture(flip, { click: () => change(w, rid2, (c) => ({ ...c, flipped: !c.flipped })) });
      e.append(flipper, flip, tray(e));
      break;
    }
    case "sticky":
    case "text":
      e.append(writable(doc, "text", r.text, (s) => change(w, rid2, (c) => ({ ...c, text: s }))), tray(e));
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
      e.classList.toggle("secret", !canSee(w.viewer, r));
      const front = e.querySelector(".front > .text");
      rewrite(front, r.front);
      frontGlyphs(front, r, w);
      rewrite(e.querySelector(".back .notes"), r.back.notes);
      damage2(e.querySelector(".damage"), r, w);
      dry(e, r);
      break;
    }
    case "sticky":
    case "text":
      rewrite(e.querySelector(".text"), r.text);
      if (r.kind === "sticky") e.classList.toggle("big", !!r.big);
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
      const col = el(doc, "div", `column col-${d}`);
      col.dataset.damage = d;
      const hd = el(doc, "div", "hd");
      hd.append(`${COLUMN[d].name} `, el(doc, "span", "absorb"));
      col.append(hd);
      gesture(hd, { click: () => {
        const mine2 = `${c.oid}:`;
        w.setOpened(new Set([...w.opened()].filter((k) => !k.startsWith(mine2)).concat(mine2 + d)));
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
      if (isLasting(d)) col.append(lastLine(doc, d, put2));
      box2.append(col);
    }
  }
  const taking = w.taking(), mine = taking?.oid === c.oid ? taking : null, page = mine?.pages[mine.k];
  const preview = mine && page ? fill(c, mine.kind, page, { name: mine.by, id: mine.id }) : null;
  const order = frontOrder(DAMAGE.find((d) => opened.has(`${c.oid}:${d}`)) ?? null);
  for (const col of box2.children) {
    const d = col.dataset.damage, slots2 = c.back.damage[d], room2 = columnRoom(c, d), absorb2 = room2?.absorb ?? 0;
    const empty2 = !ROWS.some((r) => filled(slots2[r])) && !absorb2 && !(isLasting(d) && c.back.lasting?.[d]);
    col.classList.toggle("empty", empty2);
    col.classList.toggle("open", opened.has(`${c.oid}:${d}`));
    col.style.order = String(order.indexOf(d));
    col.querySelector(".absorb").textContent = absorb2 ? `(absorb ${absorb2})` : "";
    for (const line of col.querySelectorAll(".slotline")) {
      const row2 = line.dataset.row, s = slots2[row2];
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
          const b = el(doc, "button", "box");
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
  const keep = now2.name || now2.points > 0 || now2.naming;
  const lasting2 = keep ? { ...others, [d]: now2 } : others;
  const { lasting: __, ...back3 } = ch.back;
  return { ...ch, back: Object.keys(lasting2).length ? { ...back3, lasting: lasting2 } : back3 };
}
function lastLine(doc, d, put2) {
  const line = el(doc, "div", "lastline");
  line.dataset.damage = d;
  const name2 = el(doc, "span", `name ${COLUMN[d].mark}`), pts = el(doc, "span", "pts");
  for (const e of [name2, pts]) {
    e.contentEditable = "true";
    e.spellcheck = false;
  }
  name2.addEventListener("input", () => put2((ch) => editLasting(ch, d, { name: name2.textContent ?? "" })));
  pts.addEventListener("input", () => put2((ch) => editLasting(ch, d, { points: Math.min(Number((pts.textContent ?? "").replace(/\D/g, "")) || 0, 1e4) })));
  line.append(el(doc, "span", "kind", OVERFLOW[d]), name2, el(doc, "span", "lvl"), pts, el(doc, "span", "top"), el(doc, "span", "spent"));
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
    strip = el(doc, "div", "takestrip");
    box2.after(strip);
  }
  const page = mine.pages[mine.k], n = mine.pages.length, empty2 = ROWS.every((r) => !page.use[r]);
  const button = (text, cls, title, go, off = false) => {
    const b = el(doc, "button", cls, text);
    b.title = title;
    b.disabled = off;
    gesture(b, { click: () => {
      if (!off) go();
    } });
    return b;
  };
  const head = el(doc, "div", "takehd", `${mine.by}'s Attack, ${mine.result}`);
  const pager = el(doc, "div", "pager");
  pager.append(
    button("\u2039", "turn", "The page before", () => w.turnPage(mine.k - 1), mine.k === 0),
    el(doc, "span", "of", empty2 ? "all absorbed" : `${mine.k + 1} of ${n}`),
    button("\u203A", "turn", "The next page", () => w.turnPage(mine.k + 1), mine.k >= n - 1),
    button("Take", "take", "Fill these Slots", () => w.takePage()),
    button("Cancel", "cancel", "Back out: nothing changes", () => w.cancelTake())
  );
  strip.replaceChildren(head, pager);
  if (page.overflow) strip.append(el(doc, "div", "over", `${page.overflow} left over: a ${OVERFLOW[COLUMN_OF[mine.kind]]}`));
}
function glyph(doc, source2, w) {
  const g = el(doc, "span", "glyph");
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
function dry(e, c) {
  for (const g of e.querySelectorAll(".glyph")) {
    const s = g.dataset.source ?? "";
    g.classList.toggle("dry", left(c, s.slice(s.indexOf(":") + 1)) < 1);
  }
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
    const label = action(span.textContent ?? "")?.label;
    if (!label || suffered(label) && !suffers(c.front, label)) continue;
    const alts = label.split("/").map((a) => a.trim()).filter(Boolean);
    const die3 = (alt, title = `Roll this: ${alt ?? label}`) => {
      const d = doc.createElement("span");
      d.className = "actdie";
      d.contentEditable = "false";
      d.title = title;
      d.addEventListener("pointerdown", (ev) => ev.preventDefault());
      gesture(d, { click: () => {
        if (!w.useAction(c.oid, label, alt)) d.animate?.([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "none" }], 200);
      } });
      return d;
    };
    let line = span;
    while (line.parentElement && line.parentElement !== text) line = line.parentElement;
    const v = vars.get([...text.children].indexOf(line));
    if (v) {
      for (const alt of v.of.split("/").map((a) => a.trim()).filter(Boolean)) span.before(die3(alt, `Roll this: ${label} as ${alt}`));
      continue;
    }
    if (alts.length < 2) {
      span.before(die3());
      continue;
    }
    span.before(die3(alts[0]));
    let from = 0;
    for (const alt of alts.slice(1)) {
      const at3 = atText(span, alt, from);
      if (!at3) break;
      from = at3.offset;
      const rest = at3.node.splitText(at3.local);
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
function toggleCheck(lines, line) {
  if (!skillIndents(serialize(lines)).has(line)) return lines;
  const runs = lines[line], k = runs.findIndex((r2) => typeof r2 !== "string" && r2.mark === "skl"), r = runs[k];
  const text = /^\s*✓/.test(r.text) ? r.text.replace(/^(\s*)✓\s*/, "$1") : r.text.replace(/^(\s*)/, "$1\u2713 ");
  return lines.map((l, i) => i === line ? l.map((x, j) => j === k ? { ...r, text } : x) : l);
}
function checkPress(ev, t) {
  if (t.ownerDocument.activeElement !== t) return;
  const line = ev.target.closest("div");
  if (line?.parentElement !== t || !line.classList.contains("sklpad")) return;
  const box2 = line.getBoundingClientRect(), scale = box2.width / line.offsetWidth || 1;
  if (ev.clientX >= box2.left + parseFloat(getComputedStyle(line).paddingLeft) * scale) return;
  const k = [...t.children].indexOf(line), lines = read(t), out = toggleCheck(lines, k);
  if (out === lines) return;
  ev.preventDefault();
  render(out, t);
  t.dispatchEvent(new Event("input", { bubbles: true }));
  caretAt(t, k);
}
function atText(el3, needle, from) {
  const whole = el3.textContent ?? "", slash = whole.indexOf("/", from);
  if (slash < 0) return null;
  const offset = whole.indexOf(needle, slash);
  if (offset < 0) return null;
  const walk = el3.ownerDocument.createTreeWalker(el3, NodeFilter.SHOW_TEXT);
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
function reference(doc, r) {
  const p = (bold, rest = "") => {
    const e = el(doc, "p");
    e.append(el(doc, "b", "", bold), rest);
    return e;
  };
  const hd = (left2, right) => {
    const e = el(doc, "div", "rhd");
    e.append(el(doc, "span", "", left2), el(doc, "em", "", right));
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
function handOver(game, name2, browser) {
  const b = book(game);
  game.change((w) => w.put("book", { ...b, claims: { ...b.claims, [name2]: browser } }));
}
function why(name2) {
  return `${name2} is played from another browser, so the GM's page shows you only what anyone sees and doesn't take your changes. The GM can hand ${name2} to you by clicking your name in their strip.`;
}

// src/net/envelope.ts
var VERSION = 1;
var KINDS = ["hello", "here", "bye", "recs", "sync", "edit", "move", "intent", "roll", "crit", "take", "name", "refuse", "claim"];
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
    ].some((f) => f(v)) }
  ),
  roll,
  crit: fields({ id: str(CAPS.id), choice: oneOf("max", "dbl"), lock: bool }),
  // R314: a take names a page, a count per row; a name is for one waiting Slot (R340: or a Conviction or Burden).
  take: fields({ id: str(CAPS.id), page: fields({ use: fields(Object.fromEntries(ROWS.map((r) => [r, int(0, 20)]))), overflow: int(0, 1e4) }) }),
  name: fields({ id: str(CAPS.id), damage: oneOf(...DAMAGE), row: oneOf(...ROWS, "lasting"), name }),
  refuse: fields({ why: why2 }, { n: seq }),
  claim: fields({ name, why: whyOrNull })
};
var sealedRoll = (v) => fields({ re: seq, receipt })(v) && fewDice(v.receipt);
var sealedRecs = fields({ g: seq, puts: list(put, LIMITS.batch) }, { dels: list(del, LIMITS.batch) });
var change2 = (v) => fields({ rid: str(CAPS.id), rec: () => true })(v) && check(v.rid, v.rec);
var editBody = fields({ s: seq, base: seq, puts: list(change2, LIMITS.batch), dels: list(str(CAPS.id), LIMITS.batch) });
var header = fields({ v: oneOf(VERSION), kind: oneOf(...KINDS), tab, at: num(0, 1e15), body: () => true });
function make2(kind, from, body, at3 = Date.now()) {
  return { v: VERSION, kind, tab: from, at: at3, body };
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
var forged = (old, rec, who) => "kind" in rec && rec.kind === "chip" && rec.by !== void 0 && rec.by !== who && rec.by !== (old && "kind" in old && old.kind === "chip" ? old.by : void 0);
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
function mergeRows(real2, mine, who, chars) {
  const rows = { ...real2?.rows };
  for (const [oid, r] of Object.entries(mine.rows)) {
    if (chars(oid)?.owner !== who) continue;
    const { alt: _a, type: _t, ...gms } = rows[oid] ?? { pool: oid, action: "", opponent: null, defend: "mental", row: null, byHand: false, hand: { yellows: 1, bonus: 0 } };
    rows[oid] = { ...gms, action: r.action, hand: r.hand, ...r.alt && { alt: r.alt }, ...r.type && { type: r.type } };
  }
  return { rows };
}
function judge(game, edit, who) {
  const all2 = [...edit.puts.map((p) => p.rid), ...edit.dels].filter((rid2) => rid2 !== "meta" && !LOCAL.has(rid2));
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
  for (const rid2 of edit.dels) {
    if (!all2.includes(rid2)) continue;
    if (isPiece(rid2) && mine(game.get(rid2), void 0)) dels.push(rid2);
    else refused.push(rid2);
  }
  for (const { rid: rid2, rec } of edit.puts) {
    if (!all2.includes(rid2)) continue;
    if (rid2 === "yards") {
      const merged = mergeYards(game.get("yards"), rec, viewer, chars);
      if (merged) puts.push({ rid: rid2, rec: merged });
      else refused.push(rid2);
    } else if (rid2 === "rows") puts.push({ rid: rid2, rec: mergeRows(game.get("rows"), rec, who, chars) });
    else if (!isPiece(rid2) || (book2.tomb[rid2] ?? 0) > edit.base) refused.push(rid2);
    else if (forged(game.get(rid2), rec, who)) refused.push(rid2);
    else if (mine(game.get(rid2), rec)) puts.push({ rid: rid2, rec });
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
    this.#queue(new Set(this.#w.game.all().map(([rid2]) => rid2)));
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
    const { game } = this.#w, chars = characters(game);
    let rids = [...this.#pending].filter((rid2) => !LOCAL.has(rid2));
    this.#pending.clear();
    if (rids.some((rid2) => kindOf(game.get(rid2)) === "character" || kindOf(this.#public.get(rid2)) === "character")) {
      rids = [...game.all().map(([rid2]) => rid2).filter((rid2) => !LOCAL.has(rid2)), ...rids.filter((rid2) => !game.get(rid2))];
    }
    const puts = [], dels = [], sealFor = /* @__PURE__ */ new Map();
    const gone = [];
    for (const rid2 of /* @__PURE__ */ new Set([...rids, ...this.#answerDel])) {
      const rec = game.get(rid2);
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
    const book2 = game.get("book"), g = book2.gv + 1;
    const tomb = { ...book2.tomb };
    for (const rid2 of gone) if (isPiece(rid2)) tomb[rid2] = g;
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
    const { game } = this.#w, chars = characters(game), viewer = this.#viewer(t);
    const puts = [], mine = [];
    t.holds.clear();
    for (const [rid2, rec] of game.all()) {
      if (LOCAL.has(rid2)) continue;
      const stamp2 = this.#current(rid2), pv = redact(rec, null, chars), tv = redact(rec, viewer, chars);
      if (pv) puts.push({ rid: rid2, ...stamp2, rec: pv });
      if (pv && !this.#public.has(rid2)) this.#public.set(rid2, pv);
      if (tv && !same(tv, pv)) mine.push({ rid: rid2, ...stamp2, rec: tv });
      if (tv) t.holds.set(rid2, tv);
    }
    const g = game.get("book").gv;
    this.#send({ g, full: true, puts, dels: [] }, mine.length ? /* @__PURE__ */ new Map([[tab2, { puts: mine, dels: [] }]]) : /* @__PURE__ */ new Map(), tab2);
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
    return judge(this.#w.game, { s: 0, base: gv, puts: [{ rid: rid2, rec: r }], dels: [] }, this.#viewer(t)?.name ?? null).refused.length === 0;
  }
  // Seq: seq-edit.md#1.4, seq-edit.md#1.5, seq-edit.md#1.7: judge, take what's allowed, answer the rest.
  #take(edit, tab2) {
    const t = this.#tabs.get(tab2), { game, stamps } = this.#w;
    if (!t) return;
    const fresh3 = (rid2) => stamps.fresh(rid2, tab2, edit.s);
    const current = { ...edit, puts: edit.puts.filter((p) => fresh3(p.rid)), dels: edit.dels.filter(fresh3) };
    const verdict = judge(game, current, this.#viewer(t)?.name ?? null);
    for (const rid2 of [...current.puts.map((p) => p.rid), ...current.dels]) stamps.mark(rid2, tab2, edit.s);
    const theirs = (rid2) => {
      this.#origin.set(rid2, { s: edit.s, by: tab2, fresh: true });
    };
    const answer = (rid2) => {
      theirs(rid2);
      this.#public.delete(rid2);
      for (const x of this.#tabs.values()) x.holds.delete(rid2);
      if (!game.get(rid2)) this.#answerDel.add(rid2);
    };
    const taken = [...verdict.puts.map((p) => p.rid), ...verdict.dels];
    for (const rid2 of taken) theirs(rid2);
    const changed = game.change((w) => {
      for (const p of verdict.puts) w.put(p.rid, p.rec);
      for (const rid2 of verdict.dels) w.del(rid2);
    });
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
    const s = this.#w.stamps.next(), at3 = this.#w.clock.now();
    for (const rid2 of mine) {
      this.#w.stamps.mark(rid2, this.#w.link.tab, s);
      this.#pending.set(rid2, { s, at: at3, tries: 0, base: this.#seen, group: s });
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
    for (const rid2 of rids) {
      const rec = game.get(rid2);
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
    const groups = /* @__PURE__ */ new Map();
    for (const rid2 of rids) {
      const p = this.#pending.get(rid2);
      if (!p) continue;
      const g = groups.get(p.group) ?? { base: p.base, rids: [] };
      g.rids.push(rid2);
      groups.set(p.group, g);
    }
    const now2 = this.#w.clock.now();
    for (const { base, rids: group } of groups.values()) {
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
          if (!blob || !await this.#blobs.accept(hash, blob)) {
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
  watch(game) {
    const check3 = (rids) => {
      for (const rid2 of rids) {
        const r = game.get(rid2);
        if (r && "kind" in r && r.kind === "image") void this.want(r.blob);
      }
    };
    game.listen(check3);
    check3(game.all().map(([rid2]) => rid2));
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
      const first = placed.get(c.rid);
      if (first && (first.tab !== c.tab || c.s <= first.s)) continue;
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
    const w = this.#waiting.get(c.rid), same3 = !!w && w.c.tab === c.tab;
    const newer = !w || (w.pass === this.#pass ? same3 && c.s > w.c.s : !(same3 && w.c.s > c.s));
    if (newer) this.#waiting.set(c.rid, { c, pass: this.#pass });
  }
};

// src/net/presence.ts
var OFFLINE_MS = 15e3;
var CHECK_MS = 1e3;
var HEART_MS = 1e4;
var STALE_MS = 25e3;
var GONE_MS = 6e4;
function newRoom(label = "table") {
  const hex = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "table"}-${hex}`;
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
var BROWSER = /^[\w-]{20}$/;
function fromUrl(search) {
  const q = new URLSearchParams(search), room2 = q.get("room"), gm = q.get("gm");
  return room2 && gm && ROOM2.test(room2) && BROWSER.test(gm) ? { room: room2, gm } : null;
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
    const at3 = this.#heard.get(tab2);
    return at3 !== void 0 && this.#w.clock.now() - at3 >= STALE_MS;
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
    for (const [tab2, at3] of this.#heard) if (now2 - at3 >= GONE_MS) this.#gone(tab2);
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
  const parts = dice.filter((d) => (d.c === "B" || d.c === "Y") && !d.dropped).map((d) => String(d.v));
  const b = failure || !bonus2 ? "" : ` ${bonus2 > 0 ? "+" : "\u2212"} ${Math.abs(bonus2)} bonus`;
  return parts.join(" + ") + b;
}
var SHORT = { Minor: "Min", Significant: "Sig", Major: "Maj", Extreme: "Ext", Exquisite: "Exq" };
function outcomeWords(outcome, result, attack = false) {
  if (attack && outcome !== "failure") return `${OUTCOME[outcome]} ${result}`;
  return `${OUTCOME[outcome]} ${outcome === "failure" ? "\u2212" : "+"}${SHORT[levelName2(result)] ?? "0"}`;
}
function diceOnly(r) {
  if (r.auto) return r.auto === "success" ? "\u2713" : "\u2717";
  const die3 = r.die ? DIE_NAME[r.die] : "White";
  return r.mod ? `${die3} ${r.mod > 0 ? "+" : "\u2212"} 1` : die3;
}
function mint(game) {
  let top = 0;
  for (const [rid2] of game.all()) {
    if (!isPiece(rid2)) continue;
    const n = parseInt(oidOf(rid2), 16);
    if (n < PLAYER_OIDS) top = Math.max(top, n);
  }
  return (top + 1).toString(16).padStart(8, "0");
}
function resolve2(game, intent, rng, at3) {
  const character2 = game.get(ridOf(intent.pool));
  if (character2?.kind !== "character") return { refused: "That character is not on the table." };
  const act = intent.action ? marks(parse(character2.front), "act").map((m) => action(m.text)).find((a) => a?.label === intent.action) : null;
  if (intent.action && !act) return { refused: `${character2.name} has no action \u201C${intent.action}\u201D.` };
  const items = game.all().map(([, r2]) => r2).filter((r2) => "kind" in r2 && (r2.kind === "chip" || r2.kind === "influence"));
  const mine = pools(character2.oid, items), sum2 = act ? total2(act.base, mine) : null;
  const type = intent.type ?? "?";
  if (act && type === "?") return { refused: "Say what this roll is first." };
  if (act && !intent.vs) return { refused: "Aim it first." };
  const kind = isAttack(type) ? type : intent.defend;
  let opp, world, against, point = null;
  if (intent.vs === WORLD && sum2) {
    world = game.get("world");
    if (!world?.set) return { refused: "The world has no number yet." };
    against = world.total;
  } else if (intent.vs && sum2) {
    opp = game.get(ridOf(intent.vs));
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
  const meta = game.get("meta"), n = (meta.counts?.[character2.oid] ?? 0) + 1;
  const by = character2.owner === GM ? "GM" : character2.owner, outcome = r.crit ? "success" : r.outcome;
  const attack = isAttack(type) && opp && outcome !== "failure" ? { attack: { target: opp.oid, name: opp.name, from: character2.name, kind: type, result: r.result } } : {};
  const id = `roll-${character2.oid}-${n}`;
  const base = {
    id,
    at: at3,
    title: `${character2.name}, roll ${n}`,
    by,
    ...act && { action: alternative(act.label, intent.alt) },
    dice: r.dice,
    resolution: resolutionWords(row2, r.dice),
    level: levelWords(r.dice, dice.bonus, r.outcome === "failure"),
    outcome: outcomeWords(outcome, r.result, isAttack(type)),
    ...r.crit && { crit: r.crit },
    ...attack
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
  return { full, roller, table, apply: apply3, character: character2 };
}
function choose(r, choice, lock) {
  if (!r.crit) return r;
  const value2 = choice === "max" ? r.crit.max : r.crit.dbl;
  return {
    ...r,
    outcome: outcomeWords("success", value2, !!r.attack),
    crit: { ...r.crit, chosen: choice, locked: lock },
    ...r.attack && !r.attack.taken && { attack: { ...r.attack, result: value2 } }
  };
}
function alternative(label, alt) {
  const alts = label.split("/").map((a) => a.trim());
  return alt && alts.includes(alt) ? alt : label;
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
  // R308, R313: kept rolls live in the GM's own book (never sent), so a take or a name still works
  // after the GM's page reloads.
  /** The kept roll by its receipt's id. */
  #kept(id) {
    const k = (this.#w.game.get("book")?.kept ?? []).find((x) => x.full.id === id);
    return k && { ...k };
  }
  /** Keeps a roll (replacing it by id), the newest KEPT. */
  #keep(k) {
    const { game } = this.#w, book2 = game.get("book") ?? { claims: {}, gv: 0, tomb: {} };
    const kept = [...(book2.kept ?? []).filter((x) => x.full.id !== k.full.id), k].slice(-KEPT);
    game.change((w) => w.put("book", { ...book2, kept }));
  }
  // R103: a page that has left (Presence) can't roll for anyone; if it was the GM's, nobody can.
  /** Told by Presence that a tab has gone. */
  left(tab2) {
    if (this.#gmPeer?.tab === tab2) this.#gmPeer = void 0;
  }
  // R281: an error or a lost roll, as a short red note on this page's tape.
  note(text) {
    const at3 = this.#w.clock.now();
    this.#print({ id: `note-${at3}`, at: at3, title: text, dice: [], resolution: "", level: "", outcome: "missing" });
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
    const at3 = tape.receipts.findIndex((x) => x.id === r.id);
    const receipts = tape.receipts.filter((x) => x.id !== r.id);
    receipts.splice(Math.max(at3, 0), 0, r);
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
    const held = game.get("rows")?.rows[intent.pool];
    const aimed2 = {
      ...intent,
      vs: held?.opponent ?? null,
      defend: held?.defend ?? intent.defend,
      against: held?.against,
      row: held?.byHand ? held.row ?? void 0 : void 0
    };
    const done2 = resolve2(game, aimed2, rng, clock2.now());
    if ("refused" in done2) {
      refuse(done2.refused);
      return this.#work;
    }
    game.change(done2.apply);
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
    const k = this.#kept(body.id), { game } = this.#w;
    if (!k || k.full.crit?.locked) return this.#work;
    const c = game.get(ridOf(k.character));
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
    const { game } = this.#w, k = this.#kept(body.id), a = k?.full.attack;
    if (!k || !a || a.taken) return this.#work;
    const c = game.get(ridOf(a.target)), by = game.get(ridOf(k.character));
    if (c?.kind !== "character" || by?.kind !== "character") return this.#work;
    if (from && c.owner !== this.#w.whoIs?.(from)) return this.#work;
    if (!pages(c, a.kind, a.result).some((p) => same2(p, body.page))) return this.#work;
    const next2 = fill(c, a.kind, body.page, { name: by.name, id: body.id }), d = COLUMN_OF[a.kind];
    const named2 = (ch, r) => waitsIn(ch, d, r)?.naming?.id === body.id;
    const waiting = [...ROWS, "lasting"].filter((r) => named2(next2, r) && !named2(c, r)).map((row2) => ({ damage: d, row: row2 }));
    game.change((w) => w.put(ridOf(c.oid), next2));
    this.#attack(k, (x) => ({ ...x, taken: true, ...waiting.length && { waiting } }));
    return this.#resend(k);
  }
  // Seq: seq-take.md#2.1, seq-take.md#2.2, seq-take.md#2.3 | R313, R314, R340
  // The attacking character's owner or the GM names a Slot (or a Conviction or Burden) this Attack left waiting.
  #name(body, from) {
    const { game } = this.#w, k = this.#kept(body.id), a = k?.full.attack, text = body.name.trim();
    if (!k || !a || !text || !a.waiting?.some((x) => x.damage === body.damage && x.row === body.row)) return this.#work;
    const by = game.get(ridOf(k.character)), c = game.get(ridOf(a.target));
    if (by?.kind !== "character" || c?.kind !== "character") return this.#work;
    if (from && by.owner !== this.#w.whoIs?.(from)) return this.#work;
    const slot2 = waitsIn(c, body.damage, body.row);
    if (slot2?.naming?.id !== body.id) return this.#work;
    const { naming: _, ...named2 } = { ...slot2, name: text };
    const back3 = body.row === "lasting" ? { ...c.back, lasting: { ...c.back.lasting, [body.damage]: named2 } } : { ...c.back, damage: { ...c.back.damage, [body.damage]: { ...c.back.damage[body.damage], [body.row]: named2 } } };
    game.change((w) => w.put(ridOf(c.oid), { ...c, back: back3 }));
    this.#attack(k, (x) => {
      const rest = x.waiting.filter((w) => w.damage !== body.damage || w.row !== body.row);
      const { waiting: __, ...left2 } = x;
      return rest.length ? { ...left2, waiting: rest } : left2;
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

// node_modules/@trystero-p2p/core/dist/utils.mjs
var { floor, min, sin } = Math;
var libName = "Trystero";
var alloc = (n, f) => Array(n).fill(void 0).map(f);
var charSet = "0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz";
var genId = (n) => alloc(n, () => charSet[floor(Math.random() * 62)] ?? "").join("");
var selfId = genId(20);
var all = Promise.all.bind(Promise);
var isBrowser = typeof window !== "undefined";
var { entries: entries2, fromEntries, keys, values } = Object;
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
    getSockets: () => fromEntries(entries2(relays).flatMap(([key, relay]) => {
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
        const offer4 = await encryptOffer(peer);
        if (this.destroyed) throw mkErr("room left while preparing offer");
        if (leaseOffers) {
          this.leased.set(peer, setTimeout(() => {
            this.leased.delete(peer);
            peer.destroy();
          }, offerLeaseTtlMs));
          return {
            peer,
            offer: offer4,
            claim: () => this.claimLeased(peer),
            reclaim: () => this.reclaimLeased(peer)
          };
        }
        return {
          peer,
          offer: offer4
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
  const run2 = async (send, receive, isInitiator) => {
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
    await run2(send, receive, isInitiator);
    await userHandshake?.(peerId, send, receive, isInitiator);
  } : void 0;
  return {
    run: run2,
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
var offer2 = 1;
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
          let source2 = isBlob ? data : data instanceof ArrayBuffer ? new Uint8Array(data) : ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : encodeBytes(format === 0 ? data : toJson(data));
          const size = source2 instanceof Blob ? source2.size : source2.byteLength;
          const meta = metadata === void 0 ? /* @__PURE__ */ new Uint8Array() : encodeBytes(toJson(metadata));
          if (meta.length > 16336) throw mkErr("action metadata is too large");
          const small = inlineHeaderSize + meta.length + size <= maxActionFrameBytes;
          if (!small && binary && !(source2 instanceof Blob)) source2 = source2.slice();
          const id = small ? 0 : nextId++ >>> 0;
          const headerSize = small ? inlineHeaderSize : offerHeaderSize;
          const start = new Uint8Array(headerSize + meta.length + (small ? size : 0));
          start[0] = version;
          start[1] = (small ? inline : offer2) | format << 4;
          start.set(typeBytes, 2);
          const view = new DataView(start.buffer);
          view.setUint16(34, meta.length);
          if (!small) {
            view.setUint32(36, id);
            view.setFloat64(40, size);
          }
          start.set(meta, headerSize);
          if (small) start.set(source2 instanceof Blob ? new Uint8Array(await source2.arrayBuffer()) : source2, headerSize + meta.length);
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
                bytes.set(source2 instanceof Blob ? new Uint8Array(await source2.slice(offset, offset + length).arrayBuffer()) : source2.subarray(offset, offset + length), chunkHeaderSize);
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
    if (kind > cancelled || format > 2 || kind > offer2 && format !== 0) {
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
    const id = kind === offer2 ? view.getUint32(36) : 0;
    if (!type || payloadIndex > bytes.length || !Number.isSafeInteger(size) || size < 0 || kind === offer2 && (size === 0 || payloadIndex !== bytes.length)) {
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
    entries2(pendingRequestWaiters).forEach(([requestId, waiter]) => {
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
var makeKeyGetter = (map) => (item2) => {
  let key = map.get(item2);
  if (!key) {
    key = genId(20);
    map.set(item2, key);
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
      const next2 = takePendingMeta(pendingStreamMetas[id], typeof stream.id === "string" ? stream.id : void 0, (meta) => meta.streamId);
      if (!next2) return;
      emitStream(id, next2.key, stream, next2.metadata);
    },
    receiveRemoteTrack: (id, track, stream) => {
      if (!isActive(id)) return;
      const queue = pendingTrackMetas[id];
      const trackId = typeof track.id === "string" ? track.id : void 0;
      const streamId = typeof stream.id === "string" ? stream.id : void 0;
      const byTrackIdx = queue && trackId ? queue.findIndex((meta) => meta.trackId === trackId) : -1;
      const next2 = byTrackIdx >= 0 ? queue?.splice(byTrackIdx, 1)[0] : takePendingMeta(queue, streamId, (meta) => meta.streamId);
      if (!next2) return;
      emitTrack(id, next2.key, track, stream, next2.metadata);
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
      entries2(peerMap).forEach(([id, peer]) => {
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
    getPeers: () => fromEntries(entries2(activePeerMap).map(([id, peer]) => [id, peer.connection])),
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
      for (const shared2 of values(this.byApp[appId] ?? {})) try {
        this.sendRoomPresence(shared2, registration.token, present);
      } catch {
      }
    };
    tokenPromise.then((token) => {
      if (!current()) return;
      registration.token = token;
      for (const shared2 of values(this.byApp[appId] ?? {})) {
        if (shared2.remoteRoomTokens.has(token)) this.attachRoom(appId, roomId, registration, shared2);
        this.discardUnboundData(shared2);
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
        const shared2 = existing ?? this.register(appId, peerId, peer, idleMs);
        this.attachRoom(appId, roomId, registration, shared2);
        if (!existing) {
          for (const room2 of rooms.values()) if (room2.active && room2.token) this.sendRoomPresence(shared2, room2.token, true);
        }
      },
      reuse: (peerId) => {
        if (!current()) return false;
        const shared2 = this.reusable(appId, peerId);
        if (!shared2) return false;
        this.attachRoom(appId, roomId, registration, shared2);
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
        for (const shared2 of values(this.byApp[appId] ?? {})) {
          const binding = shared2.bindings[roomId];
          binding?.handlers.close?.();
          binding?.detach();
          this.discardUnboundData(shared2);
        }
      }
    };
  }
  owns(appId, peerId, peer) {
    return this.byApp[appId]?.[peerId]?.peer === peer;
  }
  reusable(appId, peerId) {
    const shared2 = this.byApp[appId]?.[peerId];
    if (shared2 && isPeerUnderlyingStale(shared2.peer)) {
      this.clear(appId, peerId, { destroyPeer: true });
      return;
    }
    return shared2;
  }
  attachRoom(appId, roomId, registration, shared2) {
    if (this.rooms.get(appId)?.get(roomId) !== registration || shared2.isClosing || this.get(appId, shared2.peerId) !== shared2) return;
    const { proxy, isNew } = this.bind(roomId, registration.tokenPromise, shared2, { onDetach: () => registration.onDetach(shared2.peerId, shared2.peer) });
    if (isNew) registration.onPeer(proxy, shared2.peerId, shared2.peer);
  }
  get(appId, peerId) {
    return this.byApp[appId]?.[peerId];
  }
  sendRoomPresence(shared2, roomToken, isPresent) {
    if (shared2.isClosing || isPeerUnderlyingStale(shared2.peer)) return;
    shared2.peer.sendData(wrapRoomPresenceFrame(roomToken, isPresent));
  }
  clear(appId, peerId, { destroyPeer }) {
    const map = this.byApp[appId];
    const shared2 = map?.[peerId];
    if (!shared2 || shared2.isClosing) return;
    shared2.idleTimer = resetTimer(shared2.idleTimer);
    this.clearDataTimers(shared2);
    shared2.isClosing = true;
    if (destroyPeer && !shared2.peer.isDead) shared2.peer.destroy();
    const bindings = values(shared2.bindings);
    shared2.bindings = {};
    shared2.bindingsByToken = {};
    shared2.controlRoomId = null;
    delete map[peerId];
    bindings.forEach((binding) => {
      binding.handlers.close?.();
      binding.pendingData.length = 0;
      binding.pendingSendData.length = 0;
      binding.pendingTracks.length = 0;
    });
    shared2.media.clearRemote();
    shared2.pendingDataByToken.clear();
    shared2.remoteRoomTokens.clear();
    if (keys(map).length === 0) delete this.byApp[appId];
  }
  register(appId, peerId, peer, idleMs) {
    const existing = this.byApp[appId]?.[peerId];
    if (existing) {
      existing.idleTimer = resetTimer(existing.idleTimer);
      if (existing.peer === peer) return existing;
      this.clear(appId, peerId, { destroyPeer: true });
    }
    const shared2 = {
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
    (this.byApp[appId] ??= {})[peerId] = shared2;
    const clearCurrent = () => {
      if (this.owns(appId, peerId, peer)) this.clear(appId, peerId, { destroyPeer: true });
    };
    peer.setHandlers({
      data: (data) => this.dispatchData(shared2, data),
      signal: (signal) => this.dispatchSignal(shared2, signal),
      close: clearCurrent,
      error: (err) => {
        console.error(`${libName} peer error:`, err);
        clearCurrent();
      },
      track: (track, stream) => this.dispatchTrack(shared2, track, stream)
    });
    return shared2;
  }
  bind(roomId, roomTokenPromise, shared2, { onDetach }) {
    const existingBinding = shared2.bindings[roomId];
    if (existingBinding) {
      shared2.idleTimer = resetTimer(shared2.idleTimer);
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
      if (shared2.bindings[roomId] !== binding) return;
      const shouldDestroy = keys(shared2.bindings).length === 1 && (shared2.streamOwners.size > 0 || shared2.trackOwners.size > 0 || shared2.media.hasRemoteMedia());
      if (!shouldDestroy) this.pruneRoomOwnership(shared2, roomId);
      delete shared2.bindings[roomId];
      if (binding.roomToken && shared2.bindingsByToken[binding.roomToken] === binding) delete shared2.bindingsByToken[binding.roomToken];
      if (shared2.controlRoomId === roomId) shared2.controlRoomId = keys(shared2.bindings)[0] ?? null;
      this.discardUnboundData(shared2);
      onDetach();
      if (shouldDestroy) this.clear(shared2.appId, shared2.peerId, { destroyPeer: true });
      else this.scheduleIdleTimer(shared2);
    };
    const proxy = {
      get connection() {
        return shared2.peer.connection;
      },
      get channel() {
        return shared2.peer.channel;
      },
      get isDead() {
        return shared2.peer.isDead;
      },
      getOffer: (restartIce) => shared2.peer.getOffer(restartIce),
      signal: (sdp) => shared2.peer.signal(sdp),
      sendData: (data) => {
        if (!binding.roomToken) {
          binding.pendingSendData.push(data);
          return;
        }
        shared2.peer.sendData(wrapRoomFrame(binding.roomToken, data));
      },
      destroy: () => detachBinding(),
      setHandlers: (newHandlers) => {
        Object.assign(binding.handlers, newHandlers);
        this.flushBindingQueues(shared2, binding);
      },
      addStream: (stream) => {
        const owners = shared2.streamOwners.get(stream) ?? /* @__PURE__ */ new Set();
        const shouldAttach = owners.size === 0;
        owners.add(roomId);
        shared2.streamOwners.set(stream, owners);
        if (shouldAttach) shared2.peer.addStream(stream);
      },
      removeStream: (stream) => this.releaseStreamOwner(shared2, stream, roomId),
      addTrack: (track, stream) => {
        const entry = shared2.trackOwners.get(track) ?? {
          stream,
          rooms: /* @__PURE__ */ new Set()
        };
        const shouldAttach = entry.rooms.size === 0;
        entry.stream = stream;
        entry.rooms.add(roomId);
        shared2.trackOwners.set(track, entry);
        if (shouldAttach) return shared2.peer.addTrack(track, stream);
        return shared2.peer.connection.getSenders().find((s) => s.track === track) ?? shared2.peer.addTrack(track, stream);
      },
      removeTrack: (track) => this.releaseTrackOwner(shared2, track, roomId),
      replaceTrack: async (oldTrack, newTrack) => {
        const oldEntry = shared2.trackOwners.get(oldTrack);
        await shared2.peer.replaceTrack(oldTrack, newTrack);
        if (oldEntry && shared2.trackOwners.get(oldTrack) === oldEntry) {
          shared2.trackOwners.delete(oldTrack);
          const nextEntry = shared2.trackOwners.get(newTrack) ?? {
            stream: oldEntry.stream,
            rooms: /* @__PURE__ */ new Set()
          };
          oldEntry.rooms.forEach((room2) => nextEntry.rooms.add(room2));
          shared2.trackOwners.set(newTrack, nextEntry);
        }
      },
      __trysteroMedia: shared2.media
    };
    binding.proxy = proxy;
    binding.detach = detachBinding;
    shared2.bindings[roomId] = binding;
    shared2.controlRoomId ??= roomId;
    shared2.idleTimer = resetTimer(shared2.idleTimer);
    roomTokenPromise.then((roomToken) => {
      if (shared2.isClosing || shared2.bindings[roomId] !== binding) return;
      binding.roomToken = roomToken;
      shared2.bindingsByToken[roomToken] = binding;
      const pendingData = shared2.pendingDataByToken.get(roomToken);
      if (pendingData?.length) {
        binding.pendingData.push(...pendingData);
        shared2.pendingDataByToken.delete(roomToken);
      }
      const pendingSendData = binding.pendingSendData.splice(0);
      if (!isPeerUnderlyingStale(shared2.peer)) pendingSendData.forEach((payload) => {
        try {
          shared2.peer.sendData(wrapRoomFrame(roomToken, payload));
        } catch {
        }
      });
      this.flushBindingQueues(shared2, binding);
      this.discardUnboundData(shared2);
    });
    return {
      proxy,
      isNew: true
    };
  }
  releaseStreamOwner(shared2, stream, roomIdToRemove) {
    const rooms = shared2.streamOwners.get(stream);
    if (!rooms) return;
    rooms.delete(roomIdToRemove);
    if (rooms.size === 0) {
      shared2.streamOwners.delete(stream);
      shared2.peer.removeStream(stream);
    }
  }
  releaseTrackOwner(shared2, track, roomIdToRemove) {
    const entry = shared2.trackOwners.get(track);
    if (!entry) return;
    entry.rooms.delete(roomIdToRemove);
    if (entry.rooms.size === 0) {
      shared2.trackOwners.delete(track);
      shared2.peer.removeTrack(track);
    }
  }
  pruneRoomOwnership(shared2, roomIdToRemove) {
    shared2.streamOwners.forEach((_, stream) => this.releaseStreamOwner(shared2, stream, roomIdToRemove));
    shared2.trackOwners.forEach((_, track) => this.releaseTrackOwner(shared2, track, roomIdToRemove));
  }
  scheduleIdleTimer(shared2) {
    if (shared2.isClosing || keys(shared2.bindings).length > 0) return;
    shared2.idleTimer = resetTimer(shared2.idleTimer);
    shared2.idleTimer = setTimeout(() => {
      const current = this.byApp[shared2.appId]?.[shared2.peerId];
      if (!current || keys(current.bindings).length > 0) return;
      this.clear(shared2.appId, shared2.peerId, { destroyPeer: true });
    }, shared2.idleMs);
  }
  getSignalBinding(shared2) {
    if (shared2.controlRoomId) {
      const selected = shared2.bindings[shared2.controlRoomId];
      if (selected?.handlers.signal) return selected;
    }
    const fallback = values(shared2.bindings).find((binding) => Boolean(binding.handlers.signal));
    if (!fallback) return null;
    shared2.controlRoomId = fallback.roomId;
    return fallback;
  }
  flushBindingQueues(shared2, binding) {
    const { handlers } = binding;
    if (handlers.data && binding.pendingData.length > 0) {
      const queued = binding.pendingData.splice(0);
      this.syncDataTimers(shared2);
      queued.forEach((payload) => handlers.data?.(payload));
    } else this.syncDataTimers(shared2);
    if ((handlers.track || handlers.stream) && binding.pendingTracks.length) binding.pendingTracks.splice(0).forEach(({ track, stream }) => {
      handlers.track?.(track, stream);
      handlers.stream?.(stream);
    });
  }
  unclaimedBufferedFrameCount(shared2) {
    let count = 0;
    for (const queue of shared2.pendingDataByToken.values()) count += queue.length;
    return count;
  }
  boundBufferedFrameCount(shared2) {
    let count = 0;
    for (const binding of values(shared2.bindings)) count += binding.pendingData.length;
    return count;
  }
  bufferedFrameCount(shared2) {
    return this.unclaimedBufferedFrameCount(shared2) + this.boundBufferedFrameCount(shared2);
  }
  clearDataTimers(shared2) {
    resetTimer(this.unclaimedDataTimers.get(shared2));
    this.unclaimedDataTimers.delete(shared2);
    resetTimer(this.pendingDataTimers.get(shared2));
    this.pendingDataTimers.delete(shared2);
  }
  syncDataTimers(shared2) {
    if (shared2.isClosing) {
      this.clearDataTimers(shared2);
      return;
    }
    if (this.unclaimedBufferedFrameCount(shared2) === 0) {
      resetTimer(this.unclaimedDataTimers.get(shared2));
      this.unclaimedDataTimers.delete(shared2);
    } else if (!this.unclaimedDataTimers.has(shared2)) this.unclaimedDataTimers.set(shared2, setTimeout(() => {
      this.unclaimedDataTimers.delete(shared2);
      shared2.pendingDataByToken.clear();
    }, pendingDataTimeoutMs));
    if (this.boundBufferedFrameCount(shared2) === 0) {
      resetTimer(this.pendingDataTimers.get(shared2));
      this.pendingDataTimers.delete(shared2);
    } else if (!this.pendingDataTimers.has(shared2)) this.pendingDataTimers.set(shared2, setTimeout(() => {
      this.pendingDataTimers.delete(shared2);
      if (this.boundBufferedFrameCount(shared2) > 0) this.failData(shared2, "room data handler timed out");
    }, pendingDataTimeoutMs));
  }
  canBindRoomToken(shared2, token) {
    return values(shared2.bindings).some((binding) => !binding.roomToken) || [...this.rooms.get(shared2.appId)?.values() ?? []].some((room2) => !room2.token || room2.token === token);
  }
  discardUnboundData(shared2) {
    for (const token of shared2.pendingDataByToken.keys()) if (!this.canBindRoomToken(shared2, token)) shared2.pendingDataByToken.delete(token);
    this.syncDataTimers(shared2);
  }
  failData(shared2, reason) {
    console.warn(`${libName}: ${reason}; disconnecting peer ${shared2.peerId}`);
    this.clear(shared2.appId, shared2.peerId, { destroyPeer: true });
  }
  dispatchData(shared2, data) {
    if (shared2.isClosing) return;
    const decoded = unwrapFrame(data);
    if (!decoded) {
      this.failData(shared2, "invalid or incompatible room frame");
      return;
    }
    if (decoded.type === "presence") {
      if (decoded.isPresent) {
        if (!shared2.remoteRoomTokens.has(decoded.roomToken) && shared2.remoteRoomTokens.size >= 64) {
          this.failData(shared2, "too many advertised rooms");
          return;
        }
        shared2.remoteRoomTokens.add(decoded.roomToken);
        for (const [roomId, registration] of this.rooms.get(shared2.appId) ?? []) if (registration.token === decoded.roomToken) this.attachRoom(shared2.appId, roomId, registration, shared2);
      } else {
        shared2.remoteRoomTokens.delete(decoded.roomToken);
        shared2.pendingDataByToken.delete(decoded.roomToken);
        const binding2 = shared2.bindingsByToken[decoded.roomToken];
        binding2?.handlers.close?.();
        binding2?.detach();
        this.syncDataTimers(shared2);
      }
      return;
    }
    const binding = shared2.bindingsByToken[decoded.roomToken];
    if (!binding) {
      if (!this.canBindRoomToken(shared2, decoded.roomToken) || this.bufferedFrameCount(shared2) >= 64) return;
      const pending = shared2.pendingDataByToken.get(decoded.roomToken) ?? [];
      pending.push(decoded.payload);
      shared2.pendingDataByToken.set(decoded.roomToken, pending);
      this.syncDataTimers(shared2);
      return;
    }
    if (binding.handlers.data) binding.handlers.data(decoded.payload);
    else {
      if (this.bufferedFrameCount(shared2) >= 64) {
        this.failData(shared2, "too much data waiting for a room handler");
        return;
      }
      binding.pendingData.push(decoded.payload);
      this.syncDataTimers(shared2);
    }
  }
  dispatchSignal(shared2, signal) {
    const binding = this.getSignalBinding(shared2);
    if (binding) binding.handlers.signal?.(signal);
    else if (signal.type === "offer") this.clear(shared2.appId, shared2.peerId, { destroyPeer: true });
  }
  dispatchTrack(shared2, track, stream) {
    values(shared2.bindings).forEach((binding) => {
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
    const { peer, offer: offer4 } = firstOffer;
    if (ctx.isLeaving() || state.offerInitPromise !== pending) {
      peer.destroy();
      return null;
    }
    state.offerPeer = peer;
    state.offerId = genId(offerIdSize);
    state.offerSdp = offer4;
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
      offer: offer4,
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
var handleOffer = async (ctx, relayId, peerId, offer4, offerId, signalPeer) => {
  const state = getState(ctx.peerStates, peerId);
  if (state.answeringPeer || state.offerAnswered) {
    const replay2 = state.answerReplay;
    const lastSentAt = replay2?.lastSentAt[relayId];
    if (state.answeringPeer && !state.answeringPeer.isDead && replay2 && replay2.offer === offer4 && replay2.offerId === offerId && (lastSentAt === void 0 || Date.now() - lastSentAt >= 1e3)) {
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
    offer: offer4,
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
      sdp: offer4
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
  const offer4 = getString(payload, "offer");
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
  if (Boolean(peerId && !offer4 && !answer && !candidate)) {
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
  if (offer4) return handleOffer(ctx, relayId, peerId, offer4, offerId, signalPeer);
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
      entries2(ctx.peerStates).forEach(([peerId, state]) => {
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
      entries2(ctx.peerStates).forEach(([peerId, state]) => {
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
      relayConfig: { urls: w.relay ? [w.relay] : RELAYS },
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
    const label = doc.createElement("span");
    label.className = "who";
    label.textContent = "The world";
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
    this.#tray.append(label, this.#value);
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
      const set = !!this.#world()?.set;
      this.#value.textContent = set ? "set by the GM" : "";
      this.#tray.title = set ? "The GM has set the world's number" : "The GM hasn't given the world a number yet";
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
    for (const el3 of [this.#button, this.#tray]) el3.classList.toggle("targeted", this.#ringed && el3 === this.mark());
  }
};

// src/ui/actions.ts
function minter(game, gm, rng = Math.random) {
  const used = new Set(game.all().map(([rid2]) => rid2).filter(isPiece).map(oidOf));
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
var lookup = (game) => (oid) => game.get(ridOf(oid));
var item = (game, rid2) => {
  const r = game.get(rid2);
  return r && "kind" in r && (r.kind === "chip" || r.kind === "influence") ? r : void 0;
};
var inSlot2 = (i, owner, slot2) => typeof i.where === "object" && "slot" in i.where && i.where.slot === owner && i.where.name === slot2;
function slotItems(game, owner, slot2) {
  return game.all().map(([rid2]) => item(game, rid2)).filter((i) => !!i && inSlot2(i, owner, slot2));
}
function toSlot(game, rid2, owner, slot2, _mint, by) {
  const i = item(game, rid2);
  if (!i || !accepts(slot2, i)) return null;
  const home = i.kind === "influence" && i.mot ? { home: owner } : {};
  const inPool = typeof i.where === "object" && "slot" in i.where && i.where.slot === owner;
  const moved = { ...i, ...home, where: { slot: owner, name: slot2 }, n: slotItems(game, owner, slot2).length };
  if (moved.kind === "chip" && !inPool) {
    if (by) moved.by = by;
    else delete moved.by;
  }
  return (w) => w.put(ridOf(moved.oid), moved);
}
function drawerCards(game, owner) {
  return game.all().map(([, r]) => r).filter((r) => "kind" in r && r.kind === "influence" && r.home === owner && r.where === "drawer").sort((a, b) => a.n - b.n);
}
function toDrawer(game, rid2, owner, at3) {
  const i = item(game, rid2);
  if (!i || i.kind !== "influence") return null;
  const order = drawerCards(game, owner).filter((k) => ridOf(k.oid) !== rid2);
  const card2 = { ...i, home: owner, where: "drawer", used: false };
  order.splice(at3 === void 0 ? order.length : Math.max(0, Math.min(at3, order.length)), 0, card2);
  return (w) => order.forEach((k, n) => {
    if (k === card2 || k.n !== n) w.put(ridOf(k.oid), { ...k, n });
  });
}
function toTable(game, rid2, at3) {
  const i = item(game, rid2);
  if (!i) return null;
  if (i.kind === "influence" && !i.tap) return toDrawer(game, rid2, i.home);
  return (w) => w.put(rid2, { ...i, where: { table: at3 } });
}
function killCard(game, rid2) {
  const i = item(game, rid2);
  if (!i || i.kind !== "influence") return null;
  const refunds = kill(lookup(game), i);
  return (w) => {
    w.del(rid2);
    for (const c of refunds) w.put(ridOf(c.oid), c);
  };
}
function vanish(game, rid2) {
  const i = item(game, rid2);
  return i?.kind === "chip" ? (w) => w.del(rid2) : null;
}
function chipClick(game, rid2, shift, _mint) {
  const c = item(game, rid2);
  if (c?.kind !== "chip") return null;
  const next2 = shift ? lowerChip(c) : raiseChip(c);
  return (w) => {
    if (next2) w.put(rid2, next2);
    else w.del(rid2);
  };
}
function riderClick(game, rid2, shift) {
  const c = item(game, rid2);
  if (c?.kind !== "chip" || !c.rider || !shift) return null;
  return (w) => w.put(rid2, { ...c, rider: false });
}
function addLoose(game, owner, slot2, shift, mint2, by) {
  const chip2 = {
    kind: "chip",
    oid: mint2(),
    where: { slot: owner, name: slot2 },
    n: slotItems(game, owner, slot2).length,
    sign: shift ? -1 : 1,
    points: 1,
    rider: false,
    ...by && { by }
  };
  return (w) => w.put(ridOf(chip2.oid), chip2);
}
function cardClick(game, rid2, shift, mint2) {
  const c = item(game, rid2);
  if (c?.kind !== "influence") return null;
  if (shift && c.points <= MIN) return killCard(game, rid2);
  if (c.tap) {
    const t = shift ? unfeed(lookup(game), c) : feed(lookup(game), c, void 0, mint2());
    return t ? apply2(t, c) : null;
  }
  const next2 = shift ? lowerCard(c) : raiseCard(c);
  return next2.points === c.points ? null : (w) => w.put(rid2, next2);
}
function writeCard(game, owner, sign2, name2, mint2) {
  const n = drawerCards(game, owner).reduce((m, k) => Math.max(m, k.n + 1), 0);
  const card2 = { kind: "influence", oid: mint2(), home: owner, where: "drawer", n, name: name2, sign: sign2, points: MIN, used: false, crit: false };
  return (w) => w.put(ridOf(card2.oid), card2);
}
function restoreUsed(game, rid2) {
  const c = item(game, rid2);
  return c?.kind === "influence" && c.where === "used" ? (w) => w.put(rid2, { ...c, where: "drawer", used: false }) : null;
}
function apply2(t, old) {
  return (w) => {
    if (old && t.card.oid !== old.oid) w.put(ridOf(old.oid), old);
    w.put(ridOf(t.card.oid), t.card);
    for (const c of t.changed) w.put(ridOf(c.oid), c);
  };
}
function tapOut(game, src, where2, mint2) {
  const t = tap(lookup(game), src, where2, mint2());
  return t ? apply2(t) : null;
}
function mergeTap(game, fromRid, intoRid, mint2) {
  const from = item(game, fromRid), into = item(game, intoRid);
  if (fromRid === intoRid || from?.kind !== "influence" || into?.kind !== "influence" || !from.tap || !into.tap || from.used) return null;
  const chars = /* @__PURE__ */ new Map();
  const now2 = (oid) => chars.get(oid) ?? lookup(game)(oid);
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
function typeOf(label) {
  const w = label.toLowerCase(), has = (re) => re.test(w);
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
function withAction(r, label, alt, remembered, skill = false) {
  const type = typeOf(alt ?? label.split("/")[0]) ?? remembered ?? (skill ? "skill" : "?");
  const { alt: _, ...rest } = r;
  return {
    ...rest,
    action: label,
    ...alt && { alt },
    type,
    hand: { yellows: 0, bonus: 0 },
    ...!r.opponent && { row: null, byHand: false },
    ...type === "?" && r.opponent && { opponent: null }
  };
}
function typed(r, type) {
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
function aimed(r, opponent2, defend2, against) {
  const { against: _, ...rest } = r;
  return { ...rest, opponent: opponent2, defend: defend2, row: null, byHand: false, ...against && { against } };
}
function unaimed(r) {
  return { ...r, opponent: null, ...!r.byHand && { row: null } };
}
function waits(r) {
  if (!r.action) return null;
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
    ...r.against && r.opponent && { against: r.against }
  };
}
function rollsFor(viewer, c) {
  return !!viewer && !!c && c.owner !== OPEN && (viewer.gm || c.owner === viewer.name);
}
function actionOf(c, label) {
  return marks(parse(c.front), "act").map((m) => action(m.text)).find((a) => a?.label === label) ?? null;
}
function shown(game, r, live = true) {
  const c = game.get(ridOf(r.pool));
  const items = game.all().map(([, x]) => x).filter((x) => "kind" in x && (x.kind === "chip" || x.kind === "influence"));
  const mine = c ? pools(c.oid, items) : null;
  const act = c && r.action ? actionOf(c, r.action) : null;
  const row2 = ADV.find((x) => x.key === r.row) ?? row(0);
  if (!act || !mine) return { label: "", base: null, total: null, parts: {}, yellows: Math.max(0, r.hand.yellows), bonus: r.hand.bonus, row: row2 };
  const sum2 = total2(act.base, mine), dice = bonus({ yellows: act.yellows, bonus: act.bonus }, mine.bonus, r.hand);
  const out = { label: alternative(act.label, r.alt), base: act.base, total: sum2.total, parts: sum2.parts, yellows: dice.yellows, bonus: dice.bonus, row: row2 };
  if (r.opponent === WORLD) {
    const against2 = game.get("world")?.total ?? 0, diff2 = sum2.total - against2;
    return { ...out, row: r.byHand || !live ? row2 : row(diff2), vs: { oid: WORLD, name: "the world", total: against2, diff: diff2, sees: !!ownerAsViewer(c)?.gm } };
  }
  const opp = r.opponent ? game.get(ridOf(r.opponent)) : void 0;
  if (opp?.kind !== "character") return out;
  const point = r.against ? pointed(opp.front, r.against, act.att) : null;
  const against = opposition(point ? point.base : defendBase(r, defendOf(opp)), pools(opp.oid, items)).total, diff = sum2.total - against;
  return {
    ...out,
    row: r.byHand || !live ? row2 : row(diff),
    vs: { oid: opp.oid, name: opp.name, total: against, diff, sees: canSee(ownerAsViewer(c), opp), ...point && { words: point.words } }
  };
}
function onceCard(game, was, now2, mint2) {
  const c = now2?.action ? game.get(ridOf(now2.pool)) : void 0;
  const act = c?.kind === "character" ? actionOf(c, now2.action) : null, inf = act ? suffers(c.front, act.label) : null;
  const want = inf && { home: now2.pool, name: inf.name, sign: inf.sign, points: STEP * levelsOf(inf) };
  const cards = game.all().map(([, x]) => x).filter((x) => "kind" in x && x.kind === "influence" && !!x.once && (x.home === was?.pool || x.home === now2?.pool));
  const keep = want && cards.find((i) => i.home === want.home && i.name === want.name && i.sign === want.sign && i.points === want.points && typeof i.where === "object" && "slot" in i.where && i.where.slot === want.home && i.where.name === "main");
  const gone = cards.filter((i) => i !== keep);
  if (!gone.length && (keep || !want)) return null;
  return (w) => {
    for (const i of gone) w.del(ridOf(i.oid));
    if (!want || keep) return;
    const oid = mint2();
    w.put(ridOf(oid), {
      kind: "influence",
      oid,
      where: { slot: want.home, name: "main" },
      n: slotItems(game, want.home, "main").length,
      ...want,
      used: false,
      crit: false,
      once: true
    });
  };
}
var ownerWord = (c) => c.owner === GM ? "GM" : c.owner === OPEN ? "open" : c.owner;
var rowsOf = (game) => game.get("rows")?.rows ?? {};
function whites(game) {
  const out = {};
  for (const [oid, r] of Object.entries(rowsOf(game))) {
    if (!r.opponent || r.byHand) continue;
    const key = shown(game, r).row.key;
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
  // R371: a row is the game's; R362, R353: the card its action suffers follows it, in the same change.
  #set(r) {
    const { game } = this.#w, was = rowsOf(game)[r.pool] ?? null, card2 = onceCard(game, was, r, this.#w.mint);
    game.change((x) => {
      x.put("rows", { rows: { ...rowsOf(game), [r.pool]: r } });
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
  /** The die by a pool's name: its row comes up there, fresh (R371, R69). */
  dock(oid) {
    this.#set(dock(rowsOf(this.#w.game)[oid] ?? null, oid));
  }
  /** An action's die (R76): false when the viewer can't change that character's row. */
  action(oid, label, alt) {
    const c = this.#w.game.get(ridOf(oid));
    if (!rollsFor(this.#w.viewer, c)) return false;
    const r = rowsOf(this.#w.game)[oid] ?? dock(null, oid), name2 = alt ?? label;
    this.#set(withAction(r, label, alt, this.#w.remembered(oid, name2), skillNamed(c.front, name2)));
    return true;
  }
  /** The action in use on this character, for its swish (R77). */
  inUse(oid) {
    return rowsOf(this.#w.game)[oid]?.action || null;
  }
  render() {
    const { game, viewer } = this.#w, rows = rowsOf(game), doc = document;
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
      const mat = this.#w.pool(oid), c = game.get(ridOf(oid));
      if (!mat || c?.kind !== "character") continue;
      let els = this.#els.get(oid);
      if (!els) {
        const el3 = (tag2, cls) => {
          const e = doc.createElement(tag2);
          e.className = cls;
          return e;
        };
        els = { row: el3("div", "roller"), info: el3("span", "rollinfo"), menu: el3("div", "advmenu") };
        els.menu.hidden = true;
        this.#els.set(oid, els);
      }
      const hd = mat.querySelector(".hd");
      if (els.row.parentElement !== mat) {
        hd.after(els.row);
        mat.append(els.menu);
      }
      if (els.info.parentElement !== hd) hd.append(els.info);
      const s = shown(game, r, !!viewer?.gm);
      this.#draw(r, s, els, rollsFor(viewer, c));
      if (s.vs && s.vs.oid !== WORLD) this.#w.pool(s.vs.oid)?.classList.add("targeted");
      world ||= s.vs?.oid === WORLD;
    }
    this.#w.tray.ring(world);
  }
  // R371: a row's controls answer only its owner and the GM (`mine`); R372: only the GM aims.
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
    const gm = !!this.#w.viewer?.gm, waiting = this.#waiting.has(r.pool);
    const white = doc.createElement("span");
    white.className = gm ? "white" : "white locked";
    white.title = gm ? `Difference ${rowWords(s.row)}. Click to choose the row.` : `${diceOnly(s.row)} (set by the GM)`;
    white.append(die3("W"));
    if (s.row.die) white.append(die3(s.row.die));
    if (s.row.mod || s.row.auto) {
      const mod = doc.createElement("span");
      mod.className = s.row.auto ? "mod outclass" : "mod";
      mod.textContent = s.row.auto ? s.row.words : s.row.mod > 0 ? "+1" : "\u22121";
      white.append(mod);
    }
    gesture(white, { click: () => {
      if (gm) this.#openMenu(r, s.row.key, els.menu);
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
    const parts = [white, die3("B", "Blue: always rolled"), ys, b];
    const type = r.type ?? "?", t = doc.createElement("button");
    t.className = type === "?" ? "rtype unsaid" : "rtype";
    t.textContent = TAG_WORDS[type] ?? TYPE_WORDS[type];
    t.title = type === "?" ? "What is this roll? Click to say. A roll that doesn't say can't be aimed at anyone." : `This roll is ${TYPE_WORDS[type]}.${mine ? " Click to change it." : ""}`;
    gesture(t, { click: (e) => {
      if (mine) this.#types(r, e);
    } });
    parts.push(t);
    if (gm) {
      const p = doc.createElement("button");
      p.className = r.priv ? "priv on" : "priv";
      p.textContent = r.priv ? "private" : "to table";
      p.title = r.priv ? "Behind the screen: this roll prints on your tape only. Click to show rolls to the table." : "Rolls go to everyone at the table (what they would see: the dice and the result). Click to roll behind the screen.";
      gesture(p, { click: () => step({ ...r, priv: !r.priv }) });
      parts.push(p);
    }
    if (mine) {
      const roll3 = doc.createElement("button"), why3 = waits(r);
      roll3.className = "roll";
      roll3.textContent = waiting ? "GM\u2026" : "Roll";
      roll3.disabled = waiting || !!why3;
      if (waiting) roll3.title = "Waiting for the GM's page to roll";
      else if (why3) roll3.title = why3;
      gesture(roll3, { click: () => {
        if (!waiting) this.#w.roll(r);
      } });
      parts.push(roll3);
    }
    els.row.replaceChildren(...parts);
    els.info.replaceChildren();
    const label = s.label || (r.action ? r.alt ?? r.action : "");
    if (label) {
      const base = doc.createElement("span");
      base.className = "base";
      base.append(label);
      if (s.label) {
        const n = doc.createElement("b");
        n.textContent = s.total !== s.base ? `${s.base} \u2192 ${s.total}` : String(s.base);
        base.append(n);
        const breakdown = Object.entries(s.parts).filter(([k, v]) => k !== "base" && v).map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${SIGN(v)}`);
        base.title = `Total Influence ${s.total}: Base ${s.base}${breakdown.length ? `, ${breakdown.join(", ")}` : ""}.${mine ? " Click to clear." : ""}${gm ? " Drag to aim." : ""}`;
      }
      gesture(base, { click: () => step(cleared(r)), ...gm && { drag: (d, m) => this.#aim(r, d, m) } });
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
      for (const el3 of els) {
        const hit = el3.closest?.(".pool, .obj.card");
        const rid2 = hit?.dataset.rid;
        if (!rid2) continue;
        const oid = rid2.slice(2), text = hit.matches(".obj.card:not(.flipped)") ? hit.querySelector(".front > .text") : null;
        const c = this.#w.game.get(ridOf(oid));
        const at3 = text && c?.kind === "character" ? caretIn(text, e) : null;
        const point = at3 ? points2(c.front).find((p) => p.line === at3.line && p.start <= at3.offset && at3.offset <= p.end) : void 0;
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
        this.#set(aimed(r, WORLD, "mental"));
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
        this.#set(aimed(r, opp.oid, "def" in a ? a.def : byType, a));
        if ("def" in a) remind();
        return;
      }
      if (isAttack(r.type)) {
        this.#set(aimed(r, opp.oid, byType));
        return;
      }
      const def = defendOf(opp);
      if (!def || def.mental === def.psych) {
        this.#set(aimed(r, opp.oid, "mental"));
        remind();
        return;
      }
      this.#choose(opp, def, e, (kind) => {
        this.#set(aimed(r, opp.oid, kind));
        remind();
      });
    };
    doc.addEventListener("pointermove", onMove);
    doc.addEventListener("pointerup", onUp);
    onMove(move);
  }
  /** A small box at the pointer: a note that goes after about 2 s, or the Defend chooser (R372, R277). */
  #box(at3) {
    const doc = document;
    doc.querySelector("#defchoice")?.remove();
    const box2 = doc.createElement("div");
    box2.id = "defchoice";
    box2.style.left = `${Math.min(at3.clientX + 8, innerWidth - 260)}px`;
    box2.style.top = `${Math.min(at3.clientY + 8, innerHeight - 120)}px`;
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
  #note(text, at3) {
    const box2 = this.#box(at3), p = box2.ownerDocument.createElement("p");
    p.textContent = text;
    box2.append(p);
    setTimeout(() => box2.remove(), 2200);
  }
  // R319, R364: the list of types at the tag; a choice is kept for this action on this card.
  #types(r, at3) {
    const box2 = this.#box(at3), doc = box2.ownerDocument;
    box2.classList.add("types");
    for (const type of ROLL_TYPES) {
      const b = doc.createElement("button");
      b.textContent = TYPE_WORDS[type];
      if (type === (r.type ?? "?")) b.className = "on";
      b.addEventListener("click", () => {
        box2.remove();
        if (r.action) this.#w.remember(r.pool, r.alt ?? r.action, type);
        this.#set(typed(r, type));
      });
      box2.append(b);
    }
    box2.querySelector("button.on")?.focus();
  }
  #choose(opp, def, at3, pick) {
    const box2 = this.#box(at3), doc = box2.ownerDocument, p = doc.createElement("p");
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
  const lines = [...text.children], line = lines.findIndex((l) => l.contains(node));
  if (line < 0) return null;
  const upTo = doc.createRange();
  upTo.setStart(lines[line], 0);
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
  return { receipts: tape.receipts.map((r) => r.id === id ? { ...r, title } : r) };
}
function torn(tape, oid, place3) {
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
    const first = !this.#shown, was = first ? void 0 : JSON.parse(this.#shown)[0]?.id;
    this.#shown = key;
    this.#strip.replaceChildren(...tape.receipts.map((r) => this.#receipt(doc, r)));
    const top = this.#strip.firstElementChild;
    if (!first && top && tape.receipts[0].id !== was) {
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
    if (mayName(this.#w.viewer, r)) {
      for (const { damage: damage3, row: row2 } of r.attack.waiting) {
        const label = doc.createElement("label"), input = doc.createElement("input");
        label.className = "naming";
        label.append(nameWords(r.attack.name, damage3, row2), input);
        input.spellcheck = false;
        input.addEventListener("keydown", (ev) => {
          if (ev.key !== "Enter" || !input.value.trim()) return;
          this.#w.name(r.id, damage3, row2, input.value.trim());
          input.disabled = true;
        });
        e.append(label);
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
    if (t.closest(".title[contenteditable]") || t.closest("button, .other, .naming")) return;
    const tape = this.#w.game.get("tape") ?? EMPTY;
    if (!tape.receipts.length) return;
    e.preventDefault();
    const doc = this.#el.ownerDocument, box2 = this.#strip.getBoundingClientRect();
    const onMove = (ev) => {
      if (ev.pointerId !== e.pointerId || Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < TEAR_PX) return;
      stop();
      const oid = this.#w.mint(), at3 = this.#w.toWorld(box2.left, box2.top);
      this.#w.game.change((w) => {
        w.put(ridOf(oid), torn(tape, oid, { x: Math.round(at3.x), y: Math.round(at3.y), z: 0, tilt: 0 }));
        w.put("tape", EMPTY);
      });
      this.#el.classList.remove("raised");
      this.#w.carry(ridOf(oid), e, ev);
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
function ended(game) {
  return (w) => {
    const meta = game.get("meta");
    w.put("meta", { ...meta, round: 0 });
    for (const [rid2, r] of game.all()) {
      const p = r;
      if (!("kind" in p)) continue;
      if (p.kind === "character") {
        w.put(rid2, mildEnds(recharge(p)));
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
  constructor(bar, w) {
    this.#w = w;
    const doc = bar.ownerDocument, el3 = (tag2, cls, text = "") => {
      const e = doc.createElement(tag2);
      e.className = cls;
      e.textContent = text;
      return e;
    };
    this.#el = el3("div", "register");
    const win = el3("div", "window"), confirm2 = el3("span", "tab", "End conflict?");
    this.#tab = el3("span", "rtab");
    win.append(el3("small", "label", "Round"), this.#tab, confirm2);
    const keys2 = el3("div", "keys"), up = el3("button", "key up", "\u25B2"), down = el3("button", "key down", "\u25BC"), end = el3("button", "key end", "End");
    const roll3 = el3("button", "paperroll");
    roll3.id = "paperroll";
    roll3.title = "Roll the tape up, or down again";
    up.title = "The next Round";
    down.title = "The Round before";
    end.title = "End the Conflict: Round to 0, Biases, Afflictions and Injuries recharged, the used piles emptied";
    keys2.append(up, down, end);
    this.#el.append(el3("span", "rslot"), win, keys2, roll3);
    bar.append(this.#el);
    const gm = !!w.viewer?.gm && !!w.checkpoint;
    for (const k of [up, down, end]) k.disabled = !gm;
    const step = (by) => w.game.change((x) => x.put("meta", stepped(w.game.get("meta"), by)));
    gesture(up, { click: () => step(1) });
    gesture(down, { click: () => step(-1) });
    gesture(end, { click: () => {
      if (this.#armed === null) {
        this.#el.classList.add("armed");
        this.#armed = setTimeout(() => {
          this.#armed = null;
          this.#el.classList.remove("armed");
        }, END_MS);
        return;
      }
      clearTimeout(this.#armed);
      this.#armed = null;
      this.#el.classList.remove("armed");
      const round = w.game.get("meta").round;
      void w.checkpoint?.(`End of conflict, round ${round}`).then(() => w.game.change(ended(w.game)));
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
    const first = this.#shown < 0;
    this.#shown = round;
    const reduce = this.#el.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (first || reduce) {
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
function reachFor(holding, at3, from, width = MAT_W) {
  const open = openSlots(holding, width);
  if (at3 === null || open[at3]) return open;
  open[at3] = true;
  const free2 = (i) => open[i] && !holding[i] && i !== at3;
  let close = from !== null && free2(from) ? from : -1;
  for (let i = (from ?? at3) - 1; close < 0 && i >= 0; i--) if (free2(i)) close = i;
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
var LABEL = {
  bonus: "Bonus",
  main: "Main",
  edge: "Edge",
  stagger: "Stagger",
  bias: "Bias",
  affliction: "Affliction",
  injury: "Injury"
};
var el2 = (doc, tag2, cls, text) => {
  const e = doc.createElement(tag2);
  if (cls) e.className = cls;
  if (text !== void 0) e.textContent = text;
  return e;
};
var run = (game, c) => {
  if (c) game.change(c);
};
var isPile2 = (u) => "members" in u;
var at = (i, owner, slot2) => typeof i.where === "object" && "slot" in i.where && i.where.slot === owner && (!slot2 || i.where.name === slot2);
function drawPool(c, items, old, w) {
  const doc = old?.ownerDocument ?? document, rid2 = ridOf(c.oid);
  const e = old ?? make3(doc, c, w);
  e.style.left = `${c.pool.x}px`;
  e.style.top = `${c.pool.y}px`;
  e.style.zIndex = String(c.pool.z);
  e.querySelector(".name").textContent = c.name;
  const die3 = e.querySelector(".die-own");
  die3.textContent = ownerWord(c);
  die3.title = c.owner === OPEN ? "Open: click to claim this character" : "Click to roll for this character; shift-click to open it for someone else";
  e.querySelector(".gather").hidden = c.gathered;
  const opened = w.poolOpen(), shown3 = /* @__PURE__ */ new Map(), drawn = /* @__PURE__ */ new Map();
  const slotEls = [...e.querySelectorAll(".slot")];
  const mine = slotEls.map((slotEl) => items.filter((i) => at(i, c.oid, slotEl.dataset.slot)));
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
function reach(pool, at3, from) {
  const was = reaching.get(pool);
  if (was?.at === at3 && was.from === from) return;
  if (at3) reaching.set(pool, { at: at3, from });
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
  const e = el2(doc, "div", "obj pool");
  e.dataset.part = "pool";
  const rid2 = ridOf(c.oid);
  const hd = el2(doc, "div", "hd");
  const gather = el2(doc, "button", "gather", "gather");
  gesture(gather, { click: () => {
    const cur = w.game.get(rid2);
    w.game.change((x) => x.put(rid2, { ...cur, gathered: true }));
  } });
  const name2 = el2(doc, "span", "name");
  const die3 = el2(doc, "button", "die-own");
  gesture(die3, { click: () => w.poolDie(c.oid, false, die3), shift: () => w.poolDie(c.oid, true, die3) });
  hd.append(name2, die3, gather);
  const slots2 = el2(doc, "div", "slots");
  for (const s of SLOTS) {
    const slot2 = el2(doc, "div", `slot slot-${s}`);
    slot2.dataset.slot = s;
    slot2.dataset.owner = c.oid;
    const label = el2(doc, "span", "label", LABEL[s]);
    label.dataset.letter = LABEL[s][0];
    if (s === "stagger") label.append(el2(doc, "small", "", "opposition only"));
    slot2.title = s === "stagger" ? "Stagger (opposition only)" : LABEL[s];
    slot2.append(label, el2(doc, "div", "pos"), el2(doc, "div", "neg"));
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
  const drawer2 = el2(doc, "div", "drawer");
  drawer2.dataset.drawer = c.oid;
  drawer2.append(el2(doc, "div", "cards"), el2(doc, "div", "tools"));
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
      const e = piled ? pile(doc, u, opened.piles, w) : chip(doc, u, w);
      e.style.zIndex = String(50 - k);
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
  const b = el2(
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
  if (i.kind === "chip" && i.rider) {
    const r = el2(doc, "span", "rider", "+1");
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
function pile(doc, p, open, w) {
  const first = p.members[0]?.oid ?? "";
  const d = el2(doc, "div", `pile ${p.sign > 0 ? "pos" : "neg"}${open.has(first) ? " open" : ""}`);
  const disc = el2(doc, "button", "chip disc", `${p.sign < 0 ? "\u2212" : ""}${p.points}`);
  disc.title = `${p.members.length} acting as one`;
  gesture(disc, { click: () => w.toggle("piles", first) });
  d.append(disc);
  if (open.has(first)) {
    const list2 = el2(doc, "div", "members");
    for (const m of p.members) list2.append(isPile2(m) ? pile(doc, m, open, w) : chip(doc, m, w));
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
    const pen = el2(doc, "button", `write ${sign2 > 0 ? "pos" : "neg"}`, sign2 > 0 ? "+" : "\u2212");
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
  const pileTile = el2(doc, "div", "usedpile");
  const tag2 = el2(doc, "button", "used", "used");
  tag2.append(el2(doc, "b", "", String(used.length)));
  tag2.title = "Used Influence cards: click to see them, click one to put it back";
  gesture(tag2, { click: () => w.toggle("used", c.oid) });
  pileTile.append(tag2);
  if (opened.used.has(c.oid) && visible) {
    const list2 = el2(doc, "div", "usedlist");
    if (!used.length) list2.append(el2(doc, "p", "", "None used."));
    for (const k of used) {
      const u = card(doc, k, visible, w);
      gesture(u, { click: () => run(w.game, restoreUsed(w.game, ridOf(k.oid))) });
      list2.append(u);
    }
    pileTile.append(list2);
  }
  tools.push(pileTile, Object.assign(el2(doc, "span", "kill", "kill"), { title: "Drop a card here to delete it" }));
  box2.querySelector(".tools").replaceChildren(...tools);
}
function card(doc, k, visible, w) {
  const rid2 = ridOf(k.oid);
  const e = el2(doc, "span", `icard ${k.sign > 0 ? "pos" : "neg"}${k.used ? " isused" : ""}${k.tap ? " tapped" : ""}${k.crit ? " crit" : ""}`);
  e.dataset.rid = rid2;
  const drag = { drag: (d, m) => w.dragItem(rid2, d, m) };
  if (!visible) {
    e.classList.add("facedown");
    gesture(e, drag);
    return e;
  }
  const name2 = el2(doc, "span", "iname", k.name);
  name2.contentEditable = "true";
  name2.spellcheck = false;
  name2.addEventListener("input", () => {
    const cur = w.game.get(rid2);
    if (cur) w.game.change((x) => x.put(rid2, { ...cur, name: (name2.textContent ?? "").slice(0, 200) }));
  });
  const level = el2(doc, "button", "level", `${k.sign > 0 ? "+" : "\u2212"}${levelName(k.points)}`);
  gesture(level, {
    click: () => run(w.game, cardClick(w.game, rid2, false, w.mint())),
    shift: () => run(w.game, cardClick(w.game, rid2, true, w.mint()))
  });
  e.append(name2, level);
  gesture(e, drag);
  return e;
}
var drawerCardEls = (cards) => [...cards.querySelectorAll(":scope > .icard")];
function gapAt(drawer2, x, y) {
  const cards = drawer2.querySelector(".cards"), gap = cards.querySelector(".gap"), next2 = gap?.nextSibling ?? null;
  gap?.remove();
  const r = cards.getBoundingClientRect(), k = r.width / cards.offsetWidth || 1;
  const boxes = drawerCardEls(cards).map((e) => {
    const left2 = e.offsetLeft - cards.offsetLeft, top = e.offsetTop - cards.offsetTop;
    return { left: left2, top, right: left2 + e.offsetWidth, bottom: top + e.offsetHeight };
  });
  if (gap) cards.insertBefore(gap, next2);
  return insertAt(boxes, (x - r.left) / k, (y - r.top) / k);
}
function showGap(drawer2, at3, animate = true) {
  const cards = drawer2.querySelector(".cards");
  if (!cards) return;
  const els = drawerCardEls(cards);
  let gap = cards.querySelector(".gap");
  const now2 = gap ? [...cards.children].filter((c) => c === gap || c.classList.contains("icard")).indexOf(gap) : -1;
  if (at3 === null ? !gap : now2 === at3) return;
  const before2 = new Map(els.map((e) => [e, e.getBoundingClientRect()]));
  if (at3 === null) gap.remove();
  else {
    gap ??= Object.assign(cards.ownerDocument.createElement("div"), { className: "gap" });
    cards.insertBefore(gap, els[at3] ?? null);
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
var PAPER = [
  ["character", "supply card", "character", "A new character: card and pool"],
  ["sticky", "supply note", "note", "Sticky note"],
  ["text", "supply aa", "Aa", "Write on the table"],
  ["howto", "supply howto", "how to play", 'The "How to play the table" card']
];
var BarView = class {
  /** R347: where the Opposition button and its tray go (TrayView). */
  oppo;
  /** Where the people's tags go (Presence). */
  folks;
  /** Where the GM's "You are" goes. */
  youAre;
  constructor(bar, w) {
    const doc = bar.ownerDocument, el3 = (tag2, cls, text = "", title = "") => {
      const e = doc.createElement(tag2);
      e.className = cls;
      e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    const mark2 = el3("div", "wordmark", "Hollow");
    mark2.append(el3("span", "stamp version", w.version, "Which version this is: a release's tag, or dev"));
    if (w.date) mark2.append(el3("span", "stamp date", w.date, "When it was released (on the test rig, when it was published)"));
    const take2 = (e, what) => e.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      w.take(what, ev);
    });
    const papers = PAPER.map(([what, cls, text, title]) => {
      const e = el3("div", cls, text, title);
      take2(e, what);
      return e;
    });
    const image2 = el3("div", "supply image", "image", "Add an image"), file = doc.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.multiple = true;
    file.hidden = true;
    file.addEventListener("change", () => {
      w.images([...file.files ?? []]);
      file.value = "";
    });
    image2.addEventListener("click", () => file.click());
    const chips = el3("div", "supplychips", "", "Influence chips: drag one out");
    for (const sign2 of [1, -1]) for (const points3 of [2, 4, 6, 1]) {
      const c = el3("div", `supply chip ${sign2 > 0 ? "pos" : "neg"}${points3 === 1 ? " one" : ""}`, chipFace({ sign: sign2, points: points3 }));
      take2(c, { sign: sign2, points: points3 });
      chips.append(c);
    }
    this.oppo = el3("div", "oppo");
    this.folks = el3("div", "folks");
    this.youAre = el3("div", "youare");
    bar.replaceChildren(mark2, ...papers, image2, file, chips, this.oppo, this.folks, this.youAre);
  }
};

// src/ui/boothill.ts
var DOOM_MS = 3e3;
var BootHillView = class {
  #w;
  #stone;
  #badge;
  #panel;
  #name;
  #prev;
  #items;
  #doomed = null;
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
    const browse = (f) => {
      const b = f(this.#yards(), this.#cur());
      this.#w.game.change((x) => x.put("yards", b.yards));
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
      if (this.#yards().yards[this.#cur()]?.items.length) this.#doom(this.#name, "Delete everything here? Shift-click again", () => browse(forgetAll));
    } });
    doc.addEventListener("pointerdown", (e) => {
      if (!this.#w.open() || e.target.closest?.("#graves, #boothill")) return;
      this.#w.setOpen(false);
      this.render();
    }, true);
    w.game.listen((rids) => {
      if (rids.has("yards")) this.render();
    });
    this.render();
  }
  #yards() {
    return this.#w.game.get("yards") ?? empty();
  }
  #cur() {
    return Math.min(this.#w.cur(), this.#yards().yards.length - 1);
  }
  // R289: the badge counts every graveyard; the stone fades when nothing is buried.
  render() {
    const y = this.#yards(), cur = this.#cur(), g = y.yards[cur], doc = this.#panel.ownerDocument;
    const total3 = y.yards.reduce((n, x) => n + x.items.length, 0);
    this.#badge.textContent = total3 ? String(total3) : "";
    this.#stone.classList.toggle("empty", !total3);
    this.#panel.hidden = !this.#w.open();
    this.#prev.disabled = cur === 0;
    if (doc.activeElement !== this.#name && this.#doomed?.el !== this.#name) this.#name.value = g.name;
    if (this.#doomed && this.#doomed.el !== this.#name) {
      clearTimeout(this.#doomed.t);
      this.#doomed = null;
    }
    if (!g.items.length) {
      const p = doc.createElement("p");
      p.textContent = "Nothing is buried here.";
      this.#items.replaceChildren(p);
      return;
    }
    this.#items.replaceChildren(...g.items.map((burial, item2) => {
      const b = doc.createElement("button");
      b.textContent = burial.name;
      b.title = "Drag this back onto the table. Shift-click or long-press twice to delete it forever.";
      gesture(b, {
        drag: (_down, move) => this.#digUp(item2, move),
        shift: () => this.#doom(b, "Delete forever? Shift-click again", () => {
          const f = forget(this.#yards(), this.#cur(), { yard: this.#cur(), item: item2 });
          this.#w.game.change((x) => x.put("yards", f.yards));
          this.#w.setCur(f.cur);
          this.render();
        })
      });
      return b;
    }));
  }
  #digUp(item2, e) {
    const cur = this.#cur(), dug = exhume(this.#yards(), cur, { yard: cur, item: item2 });
    const recs = raised(dug.records, this.#w.toWorld(e.clientX, e.clientY), this.#w.top());
    if (!recs.length) return;
    this.#w.game.change((x) => {
      x.put("yards", dug.yards);
      for (const r of recs) x.put(ridOf(r.oid), r);
    });
    this.#w.setCur(dug.cur);
    this.#w.setOpen(false);
    this.render();
    this.#w.carry(recs[0], e, e);
  }
  // R125: the first shift-click arms it red and says so; a second within 3 s deletes; else it reverts.
  #doom(el3, says, destroy) {
    if (this.#doomed?.el === el3) {
      clearTimeout(this.#doomed.t);
      this.#doomed.undo();
      this.#doomed = null;
      destroy();
      return;
    }
    if (this.#doomed) {
      this.#doomed.undo();
      clearTimeout(this.#doomed.t);
    }
    const input = el3 instanceof HTMLInputElement, was = input ? el3.value : el3.textContent ?? "";
    el3.classList.add("doom");
    if (input) {
      el3.value = says;
      el3.readOnly = true;
    } else el3.textContent = says;
    const undo = () => {
      el3.classList.remove("doom");
      if (input) {
        el3.value = was;
        el3.readOnly = false;
      } else el3.textContent = was;
    };
    this.#doomed = { el: el3, undo, t: setTimeout(() => {
      undo();
      this.#doomed = null;
    }, DOOM_MS) };
  }
};

// src/ui/folks.ts
function tags(me, people, held = () => void 0) {
  const warn = me.why !== void 0 ? "offline" : me.notYours !== void 0 ? "notyours" : void 0;
  const mine = { name: me.name, gm: me.gm, you: true, live: me.live, stale: false, ...warn && { warn } };
  const others = people.map((p) => {
    const holder = held(p.name), impostor = me.gm && p.role === "player" && holder !== void 0 && holder !== p.browser;
    return {
      name: p.name,
      gm: p.role === "gm",
      you: false,
      live: !p.stale,
      stale: p.stale,
      tab: p.tab,
      browser: p.browser,
      ...impostor && { warn: "impostor" }
    };
  });
  const gm = others.filter((t) => t.gm), rest = others.filter((t) => !t.gm).sort((a, b) => a.name.localeCompare(b.name));
  return me.gm ? [mine, ...rest] : [...gm, mine, ...rest];
}
var NAME_MAX = 32;
function gmName(answer, was) {
  return answer === null ? was : answer.trim().slice(0, NAME_MAX) || "GM";
}
function arrivalName(answer) {
  if (answer === null) return "Player";
  const name2 = answer.trim().slice(0, NAME_MAX);
  return name2 && name2 !== "GM" ? name2 : null;
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
      e.className = `tag${t.live ? " live" : ""}${t.stale ? " stale" : ""}${t.gm ? " gm" : ""}${t.you ? " you" : ""}${t.warn ? " warn" : ""}`;
      e.textContent = t.warn === "offline" ? "offline" : t.warn === "notyours" ? "not yours" : t.name;
      if (t.warn === "offline") e.title = me.why ?? "Offline";
      else if (t.warn === "notyours") e.title = me.notYours;
      else if (t.warn === "impostor") {
        e.title = `${t.name}, from another computer than the one that holds ${t.name}. They see only what anyone sees. Click to hand ${t.name} to them.`;
        e.addEventListener("click", () => {
          if (confirm(`${t.name} is held by another computer. Hand ${t.name} to this one?

The other one will see ${t.name}'s things as a stranger does.`)) this.#w.handOver?.(t.name, t.browser);
        });
      } else if (t.you) {
        e.title = me.gm ? "You, the GM. Click to change the name players see." : "You";
        if (me.gm) e.addEventListener("click", () => this.#w.rename?.());
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
      const label = doc.createElement("small"), b = doc.createElement("button");
      label.textContent = "You are";
      b.className = "tag viewas";
      b.textContent = va.current();
      b.title = "View the table as this person sees it. Click for the next.";
      b.addEventListener("click", () => {
        const all2 = va.choices(), i = all2.indexOf(va.current());
        va.choose(all2[(i + 1) % all2.length]);
      });
      this.#youAre.append(label, b);
    }
  }
};

// src/rules/supplies.ts
var place2 = (at3, w, h) => ({ x: Math.round(at3.x - w / 2), y: Math.round(at3.y - h / 2), z: 0, tilt: 0 });
var CARD = { w: 430, h: 316 };
var STICKY = { w: 230, h: 150 };
var TEXT = { w: 120, h: 30 };
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
function newCharacter(oid, maker, at3) {
  const card2 = place2(at3, CARD.w, CARD.h);
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
function newSticky(oid, at3) {
  return { kind: "sticky", oid, place: place2(at3, STICKY.w, STICKY.h), text: "" };
}
function newText(oid, at3) {
  return { kind: "text", oid, place: place2(at3, TEXT.w, TEXT.h), text: "Write here" };
}
function newHowTo(oid, at3) {
  return { kind: "reference", oid, place: place2(at3, CARD.w, CARD.h), which: "howto" };
}
function newChip(oid, sign2, points3, at3) {
  return { kind: "chip", oid, where: { table: place2(at3, CHIP, CHIP) }, n: 0, sign: sign2, points: points3, rider: false };
}

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

// src/store/playtest.ts
var SAM = "00000001";
var BEAUFORD = "00000002";
var DEVREUX = "00000003";
var at2 = (x, y) => ({ x, y, z: 0, tilt: 0 });
function back2(boxes = {}, notes = "") {
  const damage3 = damageSlots((d, r) => {
    const extra = d === "injury" ? 0 : boxes[r] ?? 0;
    return { name: "", boxes: Array(extra).fill(false), spent: [] };
  });
  return { damage: damage3, absorb: { bias: 0, affliction: 0, injury: 0 }, notes };
}
function character(oid, owner, name2, x, front, b) {
  return { kind: "character", oid, owner, name: name2, pool: at2(x, 20), card: at2(x, 300), flipped: false, gathered: true, front, back: b };
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
  const sticky = { kind: "sticky", oid: "00000008", place: at2(1430, 20), text: STICKY2, big: true };
  const ref = { kind: "reference", oid: "00000009", place: at2(1430, 650), which: "actions" };
  return [
    character(SAM, sam, "Sam", 40, SAM_FRONT, back2({ min: 2 }, "Fire tools. Lantern. 6 Candles.\nPocket knife. Bedroll. Canteen.\nRope. Notebook and pencil.")),
    character(BEAUFORD, beauford, "Beauford", 500, BEAUFORD_FRONT, back2({ min: 1 })),
    character(DEVREUX, "GM", "Devreux", 960, DEVREUX_FRONT, back2({ min: 2 })),
    infl("00000004", "Keep the Peace", 4, 0),
    infl("00000005", "Self-Preservation", 4, 1),
    infl("00000006", "Old Sympathy for Sparkers", 2, 2),
    chip2,
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
  #quiet = false;
  #seq = 0;
  constructor(db, clock2, storage) {
    this.#db = db;
    this.#clock = clock2;
    this.#storage = storage;
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
  async add(name2, records2 = singletons(), checkpoints = [], copyOf, id = this.#id("g")) {
    const now2 = this.#clock.now();
    const info = { id, name: name2, made: now2, opened: now2, ...copyOf && { copyOf } };
    await this.#db.tx(["games", "records", "checkpoints"], "readwrite", async (t) => {
      await t.put("games", id, info);
      for (const [rid2, rec] of records2) await t.put("records", [id, rid2], rec);
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
    const { info, records: records2 } = await this.#db.tx(["games", "records"], "readwrite", async (t) => {
      const info2 = await t.get("games", id);
      if (!info2) throw new Error(`no game ${id}`);
      const opened = { ...info2, opened: this.#clock.now() };
      await t.put("games", id, opened);
      return { info: opened, records: await this.#records(t, id) };
    });
    this.#quiet = true;
    try {
      this.game.load(records2);
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
  async copyFor(room2) {
    const id = `m-${room2}`;
    const have = await this.#db.tx(["games"], "readonly", (t) => t.get("games", id));
    if (!have) await this.add(room2, singletons(), [], room2, id);
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
    const records2 = rids.map((rid2) => [rid2, this.game.get(rid2)]);
    this.#busy++;
    this.#saving = this.#saving.then(() => this.#db.tx(["records"], "readwrite", async (t) => {
      for (const [rid2, rec] of records2) {
        const stored = await t.get("records", [cur.id, rid2]);
        if (same(stored, rec)) continue;
        if (rec === void 0) await t.del("records", [cur.id, rid2]);
        else await t.put("records", [cur.id, rid2], rec);
      }
    })).then(() => {
      this.#savedAt = this.#clock.now();
      this.#failed = null;
    }, (e) => {
      this.#failed = e instanceof Error ? e.message : String(e);
      for (const [rid2] of records2) this.#pending.add(rid2);
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
    await this.checkpoint(beforeRestoring(cp.name), true);
    const book2 = this.game.get("book");
    const records2 = Object.entries(cp.records).filter(([rid2]) => rid2 !== "book");
    this.game.load(book2 ? [...records2, ["book", book2]] : records2);
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
    if (this.#pending.size) return "Saving\u2026";
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
function fresh2() {
  return {
    view: null,
    viewAs: null,
    tapeUp: false,
    boothill: { cur: 0, open: false },
    open: { used: [], piles: [], slots: [], columns: [] },
    types: {}
  };
}
var isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function load(storage, game, viewer) {
  let saved;
  try {
    saved = JSON.parse(storage.getItem(seatKey(game, viewer)) ?? "null");
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
    open: { ...base.open, ...isObject(saved.open) ? saved.open : {} },
    types: isObject(saved.types) ? saved.types : {}
  };
}
function save(storage, game, viewer, seat) {
  try {
    storage.setItem(seatKey(game, viewer), JSON.stringify(seat));
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
      columns: seat.open.columns.filter(owner)
    }
  };
}

// src/store/exchange.ts
var FORMAT = "hollow-table-game";
var VERSION2 = 1;
function imagesIn(records2, into = /* @__PURE__ */ new Set()) {
  for (const r of records2) {
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
  const { info, records: records2, checkpoints } = await store.read(id);
  const used = imagesIn(records2.map(([, r]) => r));
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
    records: Object.fromEntries(records2),
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
function records(v, where2) {
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
  const game = records(file.records, "the game");
  if (!Array.isArray(file.checkpoints)) throw new BadFile("no checkpoints");
  const checkpoints = file.checkpoints.map((cp, i) => {
    if (!isObject2(cp) || typeof cp.name !== "string" || typeof cp.at !== "number" || typeof cp.auto !== "boolean") {
      throw new BadFile(`checkpoint ${i + 1} is malformed`);
    }
    return { name: cp.name, at: cp.at, auto: cp.auto, records: Object.fromEntries(records(cp.records, `checkpoint \u201C${cp.name}\u201D`)) };
  });
  if (!isObject2(file.blobs)) throw new BadFile("no images");
  const images = [];
  for (const [hash, uri] of Object.entries(file.blobs)) {
    const blob = typeof uri === "string" ? fromDataUri(uri) : null;
    if (!blob || await sha256(blob) !== hash) throw new BadFile(`image ${hash.slice(0, 12)}\u2026 is not what its name says`);
    images.push([hash, blob]);
  }
  const taken = new Set((await store.list()).map((g) => g.name));
  const name2 = taken.has(file.name) ? `${file.name} (imported)` : file.name;
  for (const [hash, blob] of images) await blobs.accept(hash, blob);
  return store.add(name2, game, checkpoints);
}

// src/ui/ledger.ts
var time = (at3) => new Date(at3).toTimeString().slice(0, 8);
function stamp(at3) {
  return `${new Date(at3).toLocaleString("en-US", { month: "short", day: "numeric" })}, ${time(at3)}`;
}
function offer3(round, now2) {
  return `Round ${round}, ${time(now2)}`;
}
function named(answer) {
  return answer === null ? null : answer.trim() || "Checkpoint";
}
function newGame(now2) {
  return `New game ${stamp(now2)}`;
}
var LedgerView = class {
  #w;
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
    const el3 = (tag2, cls, text = "", title = "") => {
      const e = doc.createElement(tag2);
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
    const acts = el3("div", "acts");
    const act = (text, title, fn) => {
      const a = el3("button", "act", text, title);
      gesture(a, { click: () => void fn() });
      acts.append(a);
    };
    if (!w.player) act("Checkpoint", "Save a named copy of the table as it is now", async () => {
      const n = named(prompt("Name this checkpoint", offer3(w.round(), w.now())));
      if (n === null) return;
      await w.checkpoint(n);
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
    const parts = [name2, acts, this.#status, picker];
    if (w.player) {
      parts.splice(2, 0, el3("p", "copy", "The GM's page holds this game. This browser keeps a copy so a reload shows the table at once; the GM checkpoints and restores."));
    } else {
      const list2 = el3("div", "entries");
      if (!cps.length) list2.append(el3("p", "none", "None yet. End makes one at the end of every conflict."));
      for (const c of cps) {
        const b = this.#entry(
          c.name,
          c.at,
          `entry${c.auto ? " auto" : ""}`,
          "Restore the table to this checkpoint. The table as it stands is checkpointed first, so this can be undone."
        );
        gesture(b, { click: async () => {
          await w.restore(c.id);
          await this.render();
        } });
        list2.append(b);
      }
      const gl = el3("div", "entries");
      for (const g of games) {
        const here2 = g.id === cur.id, b = this.#entry(
          g.name,
          g.opened,
          `entry${here2 ? " current" : ""}`,
          here2 ? "The game on the table" : "Put this game on the table (this one is saved as it is)"
        );
        if (!here2) gesture(b, { click: () => void w.open(g.id) });
        else b.disabled = true;
        gl.append(b);
      }
      parts.push(el3("h4", "", "Checkpoints"), list2, el3("h4", "", "Games"), gl);
    }
    this.#page.replaceChildren(...parts);
  }
  #entry(text, at3, cls, title) {
    const doc = this.#page.ownerDocument, b = doc.createElement("button"), span = doc.createElement("span"), t = doc.createElement("time");
    b.className = cls;
    b.title = title;
    span.textContent = text;
    t.textContent = stamp(at3);
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
var pinnable = (r) => r.kind === "sticky" || r.kind === "text" || r.kind === "image";
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
      const at3 = "kind" in r ? placeOf(r) : null;
      if (at3) z = Math.max(z, at3.z);
    }
    return z + 1;
  }
  // Seq: seq-drag.md#1.2, seq-drag.md#1.3, seq-drag.md#1.3.1, seq-drag.md#1.6 | R298, R299, R300, R215,
  // R217, R223, R183: the one carry. Each frame: the place and aim, drawn by Hands here and sent
  // through Moves; at the release, let go everywhere, then the drop's one change.
  #carry(c, down, move) {
    const { game, table, hands, moves, hand } = this.#w;
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
    const pace = paced(this.#w.schedule, ({ cx, cy }) => {
      last = c.frame(cx, cy);
      const it = item2(last);
      hands.show(hand, [it], true);
      moves?.drag([it]);
      this.#lightBar(doc, cy, c.buries);
    });
    const to = (e) => pace.to({ cx: e.clientX, cy: e.clientY });
    to(move);
    pace.flush();
    this.#follow(doc, down, to, (e) => {
      pace.cancel();
      last = c.frame(e.clientX, e.clientY);
      const away = this.#overBar(doc, e.clientY);
      this.#lightBar(doc, null, false);
      doc.body.classList.remove("dragging", "tapping");
      hands.drop(hand, [], true);
      moves?.drop([item2(last)]);
      const change3 = c.drop(last, away, z);
      table.still(() => {
        if (change3) game.change(change3);
      });
      moves?.release(c.rid);
      table.render([c.rid]);
      c.done?.();
    });
  }
  // Seq: seq-drag.md#1.2 | R27, R32, R222: paper, or a character's card (what's pinned to it follows,
  // Hands); paper is aimed at the card it would pin to.
  /** Carries a piece from the press that started it, and what's pinned to it. */
  start(rid2, down, move) {
    const { game, table } = this.#w;
    const rec = game.get(rid2), at3 = rec && placeOf(rec), el3 = table.element(rid2);
    if (!rec || !at3 || !el3) return;
    const from = rec.kind === "character" && rec.gathered ? { ...at3, x: parseFloat(el3.style.left), y: parseFloat(el3.style.top) } : at3;
    const p0 = table.toWorld(down.clientX, down.clientY), grip = { x: p0.x - from.x, y: p0.y - from.y };
    const pins = pinnable(rec);
    this.#carry({
      rid: rid2,
      ...rec.kind === "character" && { part: "card" },
      frame: (cx, cy) => {
        const f = less(table.toWorld(cx, cy), grip), card2 = pins ? this.#cardAt(el3.ownerDocument, cx, cy, el3) : void 0;
        return card2 ? { ...f, aim: { card: ridOf(card2.oid) } } : f;
      },
      buries: rec.kind !== "reference" && !this.#fresh.has(rid2),
      drop: (last, away, z) => away ? this.#putAway(rec) : this.#drop(rec, "card", from, last, z, last.aim)
    }, down, move);
  }
  // R32, R251: dragging a pool brings its card, gathered or not, and what's pinned to it (Hands).
  /** Carries a character's pool. */
  startPool(rid2, down, move, done2) {
    const { game, table } = this.#w;
    const c = game.get(rid2);
    if (!c || c.kind !== "character" || !table.pool(rid2)) return;
    const p0 = table.toWorld(down.clientX, down.clientY), grip = { x: p0.x - c.pool.x, y: p0.y - c.pool.y };
    let away = false;
    this.#carry({
      rid: rid2,
      part: "pool",
      frame: (cx, cy) => less(table.toWorld(cx, cy), grip),
      buries: !this.#fresh.has(rid2),
      drop: (last, over, z) => {
        away = over;
        return over ? this.#putAway(c) : this.#drop(c, "pool", c.pool, last, z);
      },
      done: () => {
        if (!away) done2?.();
      }
    }, down, move);
  }
  // Seq: seq-drag.md#1.2 | R220, R287: the chip or card itself, found by its rid when the press was
  // elsewhere (a chip just taken from the bar was pressed on the supply).
  /** Carries a chip or an Influence card (from a slot, a drawer, a pile or the table): the piece itself. */
  startItem(rid2, down, move) {
    const { game, table } = this.#w;
    const i = game.get(rid2);
    const pressed = down.target?.closest?.("[data-rid]");
    const el3 = pressed?.dataset.rid === rid2 ? pressed : table.loose(rid2) ?? pressed;
    if (!i || !el3) return;
    const r = el3.getBoundingClientRect(), corner = table.toWorld(r.left, r.top), p = table.toWorld(down.clientX, down.clientY);
    const from = typeof i.where === "object" && "slot" in i.where ? { owner: i.where.slot, slot: i.where.name } : null;
    this.#carryItem(rid2, el3, { x: p.x - corner.x, y: p.y - corner.y }, down, move, from);
  }
  // R55, R225: the tap is a card from the first pixel, its Level spent, carried by its glyph; dropped
  // on a resource-made card it merges into it.
  /** Taps a glyph (`<character oid>:<source>`) and carries the card it makes. */
  startGlyph(source2, down, move) {
    const { game, table, mint: mint2 } = this.#w;
    const oid = mint2()(), rid2 = ridOf(oid), p = table.toWorld(down.clientX, down.clientY);
    const change3 = tapOut(game, source2, { table: { x: Math.round(p.x), y: Math.round(p.y), z: this.#top(), tilt: 0 } }, () => oid);
    if (!change3) return;
    table.still(() => game.change(change3));
    const el3 = table.loose(rid2);
    if (el3) this.#carryItem(rid2, el3, { x: TAP_GLYPH_X, y: el3.offsetHeight / 2 }, down, move);
  }
  // R216, R243, R221: a chip or card, glued at its grip (in world coordinates, so at any zoom); a card
  // over a pool's slots is a chip centred on the pointer.
  #carryItem(rid2, el3, grip, down, move, from = null) {
    const { game, table, hands, hand, mint: mint2 } = this.#w;
    const doc = el3.ownerDocument, item2 = game.get(rid2);
    const isCard = item2?.kind === "influence" && el3.classList.contains("icard");
    let strip;
    this.#carry({
      rid: rid2,
      el: el3,
      pointing: true,
      buries: false,
      frame: (cx, cy) => {
        const aim2 = this.#itemAim(rid2, doc, cx, cy, from, isCard, strip);
        strip = aim2.reach;
        if (!!aim2.chip !== hands.chip(rid2) && table.held(rid2)) hands.show(hand, [{ rid: rid2, x: parseFloat(el3.style.left), y: parseFloat(el3.style.top), z: 0, aim: { chip: !!aim2.chip } }], true);
        const g = aim2.chip ? { x: el3.offsetWidth / 2, y: el3.offsetHeight / 2 } : grip;
        return { ...less(table.toWorld(cx, cy), g), aim: aim2 };
      },
      drop: (last, away, z) => this.#itemDrop(rid2, last.aim, away, { x: last.x, y: last.y, z, tilt: 0 }, mint2())
    }, down, move);
  }
  // R299, R222, R240, R243, R244: what a chip or card is aimed at, under the pointer, in this order: a
  // tap's merge, a slot, the kill box, a drawer (and where among its cards); the strip it opens; a
  // card over the slots shows as a chip.
  #itemAim(rid2, doc, x, y, from, isCard, strip) {
    const { game } = this.#w, i = game.get(rid2);
    const hits = doc.elementsFromPoint?.(x, y) ?? [];
    const first = (sel) => {
      for (const h of hits) {
        const m = h.closest?.(sel);
        if (m) return m;
      }
      return null;
    };
    const aim2 = {};
    const into = i?.kind === "influence" && i.tap ? first(".tapped[data-rid]") : null;
    const slot2 = first(".slot"), kill2 = first(".kill"), drawer2 = first(".drawer");
    if (into && mergeTap(game, rid2, into.dataset.rid, () => "")) aim2.merge = into.dataset.rid;
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
  // Seq: seq-drag.md#1.5, seq-drag.md#1.6, seq-drag.md#1.7 | R21, R48, R268, R60, R211, R260: the
  // drop, from the last aim.
  #itemDrop(rid2, aim2, away, place3, mint2) {
    const { game } = this.#w, i = game.get(rid2);
    if (!i) return null;
    if (aim2?.merge) return mergeTap(game, rid2, aim2.merge, mint2);
    if (aim2?.slot) return toSlot(game, rid2, aim2.slot.owner, aim2.slot.name, mint2, this.#w.who()) ?? (i.kind === "influence" ? toDrawer(game, rid2, i.home) : null);
    if (aim2?.kill) return killCard(game, rid2);
    if (aim2?.drawer) return toDrawer(game, rid2, aim2.drawer.owner, aim2.drawer.at);
    if (away) return i.kind === "influence" ? toDrawer(game, rid2, i.home) : vanish(game, rid2);
    return toTable(game, rid2, place3);
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
  #lightBar(doc, cy, buries) {
    const bar = doc.getElementById("bar");
    if (!bar) return;
    const over = cy !== null && this.#overBar(doc, cy);
    bar.classList.toggle("toss", over);
    bar.classList.toggle("bury", over && buries);
    bar.dataset.yard = `\u2192 ${this.#w.yard().name || "Unnamed graveyard"}`;
  }
  // R119, R122, R288, R290: put away on the bar: the reference card vanishes; anything else is
  // buried in the current graveyard, a character with its cards and pinned paper, under its name.
  #putAway(rec) {
    const { game } = this.#w, rid2 = ridOf(rec.oid);
    if (this.#fresh.delete(rid2) || rec.kind === "reference") return (w) => w.del(rid2);
    const all2 = game.all().map(([, r]) => r).filter((r) => "kind" in r);
    const recs = burialOf(rec, all2), y = game.get("yards") ?? empty();
    const cur = Math.min(this.#w.yard().cur, y.yards.length - 1);
    return (w) => {
      w.put("yards", bury(y, cur, recs, graveName(rec)));
      for (const r of recs) w.del(ridOf(r.oid));
    };
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
      const el3 = hit.closest?.(".obj.card");
      const card2 = el3 && el3 !== not ? this.#w.game.get(el3.dataset.rid) : void 0;
      if (card2) return card2;
    }
    return void 0;
  }
  // Seq: seq-drag.md#1.7 | R27, R32: one change: the carried part from where it started (`from`) to
  // where it was let go (`to`); a pool's card comes too unless gathered; a card's pinned paper moves
  // with it; paper is pinned to the card it was aimed at, or let go of one.
  #drop(rec, part, from, to, z, aim2) {
    const { game } = this.#w, rid2 = ridOf(rec.oid), dx = to.x - from.x, dy = to.y - from.y;
    this.#fresh.delete(rid2);
    const moved = (p) => ({ ...p, x: Math.round(p.x + dx), y: Math.round(p.y + dy), z });
    return (w) => {
      if (rec.kind === "character") {
        if (part === "pool") {
          w.put(rid2, { ...rec, pool: moved(rec.pool), card: rec.gathered ? rec.card : moved(rec.card) });
          return;
        }
        w.put(rid2, { ...rec, card: { ...rec.card, x: to.x, y: to.y, z }, gathered: false });
        for (const [r2, o] of game.all()) {
          const q = o;
          if ("kind" in q && pinnable(q) && q.pin?.card === rec.oid) w.put(r2, { ...q, place: moved(q.place) });
        }
        return;
      }
      if (!("place" in rec)) return;
      const place3 = moved(rec.place);
      if (!pinnable(rec)) {
        w.put(rid2, { ...rec, place: place3 });
        return;
      }
      const card2 = aim2?.card ? game.get(aim2.card) : void 0;
      const { pin: _old, ...loose } = rec;
      w.put(rid2, card2?.kind === "character" ? { ...loose, place: place3, pin: { card: card2.oid, dx: place3.x - card2.card.x, dy: place3.y - card2.card.y } } : { ...loose, place: place3 });
    };
  }
};

// src/ui/table.ts
var GATHER_GAP = 14;
var ZOOM_MIN = 0.25;
var ZOOM_MAX = 2.5;
var ZOOM_RATE = 12e-4;
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
  #sized = new ResizeObserver((entries3) => {
    for (const e of entries3) {
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
  constructor(root, world, w) {
    this.#root = root;
    this.#world = world;
    this.#w = w;
    this.view = w.view ? { ...w.view } : { x: 0, y: 0, zoom: 1 };
    this.#place();
    w.game.listen((rids) => this.render(rids));
    this.render(w.game.all().map(([rid2]) => rid2));
    this.#panZoom();
    this.#images();
    this.#raisePins();
    if (!w.view) w.schedule(() => w.schedule(() => this.#fit()));
    world.addEventListener("transitionend", (e) => {
      const t = e.target;
      if (t.parentElement === world && (e.propertyName === "left" || e.propertyName === "top")) t.classList.remove("glide");
    });
  }
  // CRC: crc-TableView.md | R220, R298: the hand, this page's or another's (Hands).
  /** Holds a piece (`rid`, or `rid#pool`): into the world layer at `at`, squared up and raised, skipped by redraws. */
  lift(key, el3, at3) {
    this.#held.set(key, { el: el3, at: at3 });
    if (el3.parentElement !== this.#world) this.#world.append(el3);
    el3.classList.add("obj", "lifted");
    el3.classList.remove("glide");
    el3.style.pointerEvents = "none";
    this.place(key, at3);
    if (!key.endsWith("#pool")) this.render([key]);
  }
  /** Puts a held piece at `at`. */
  place(key, at3) {
    const h = this.#held.get(key);
    if (!h) return;
    h.at = at3;
    h.el.style.left = `${at3.x}px`;
    h.el.style.top = `${at3.y}px`;
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
    const { el: el3 } = h;
    el3.style.pointerEvents = "";
    el3.classList.remove("lifted", "carried");
    const rid2 = key.replace(/#pool$/, "");
    if (this.#loose.get(rid2) !== el3 && this.#els.get(rid2) !== el3 && this.#pools.get(rid2) !== el3) el3.remove();
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
    const c = this.#w.game.get(rid2), card2 = this.#els.get(rid2), mat = this.#pools.get(rid2);
    if (!c || c.kind !== "character" || !card2 || !mat || !c.gathered || this.#held.has(rid2)) return;
    card2.style.left = `${c.pool.x}px`;
    card2.style.top = `${c.pool.y + mat.offsetHeight + GATHER_GAP}px`;
  }
  // R241: on the GM's page, a mat that grew pushes the pieces it now covers just clear below it, in
  // one change (they glide on every page). Not mid-carry: a drawer's gap is only there for a moment.
  #push(rid2) {
    const { game, viewer } = this.#w, mat = this.#pools.get(rid2), c = game.get(rid2);
    if (!mat || !c || c.kind !== "character" || mat.ownerDocument.body.classList.contains("dragging")) return;
    const row2 = mat.querySelector(".roller"), own2 = row2 ? row2.offsetHeight + parseFloat(getComputedStyle(row2).marginBottom || "0") : 0;
    const h = mat.offsetHeight - own2, was = this.#heights.get(rid2);
    this.#heights.set(rid2, h);
    if (was === void 0 || h <= was || !viewer?.gm) return;
    const box2 = (e, less2 = 0) => {
      const left2 = parseFloat(e.style.left), top = parseFloat(e.style.top);
      return { left: left2, top, right: left2 + e.offsetWidth, bottom: top + e.offsetHeight - less2 };
    };
    const pieces = [];
    for (const [r, e] of this.#els) {
      const p = game.get(r);
      if (!p || r === rid2 || (p.kind === "character" ? p.gathered : "pin" in p && !!p.pin)) continue;
      pieces.push({ rid: r, box: box2(e) });
    }
    for (const [r, e] of this.#pools) if (r !== rid2) pieces.push({ rid: `${r}#pool`, box: box2(e) });
    for (const [r, e] of this.#loose) pieces.push({ rid: r, box: box2(e) });
    const moves = pushClear(box2(mat, own2), pieces);
    if (!moves.length) return;
    game.change((w) => {
      const out = /* @__PURE__ */ new Map();
      const cur = (r) => out.get(r) ?? game.get(r);
      const down = (p, dy) => ({ ...p, y: Math.round(p.y + dy) });
      for (const { rid: key, dy } of moves) {
        const pool = key.endsWith("#pool"), r = pool ? key.slice(0, -5) : key, p = cur(r);
        if (p.kind === "character" && pool) out.set(r, { ...p, pool: down(p.pool, dy) });
        else if (p.kind === "character") {
          out.set(r, { ...p, card: down(p.card, dy) });
          for (const [r2, o] of game.all()) {
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
    const level = e.ownerDocument.createElement("button");
    level.className = "level";
    level.textContent = `${i.sign > 0 ? "+" : "\u2212"}${levelName(i.points)}`;
    e.replaceChildren(`${i.name} `, level);
    return level;
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
    const level = this.#shape(e, i);
    if (level) {
      const click2 = (shift) => {
        const ch = cardClick(this.#w.game, rid2, shift, this.#w.mint());
        if (ch) this.#w.game.change(ch);
      };
      gesture(level, { click: () => click2(false), shift: () => click2(true) });
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
      for (const [e, at3] of was) {
        if (e.isConnected && !e.classList.contains("lifted") && at3 !== "," && at3 !== `${e.style.left},${e.style.top}`) e.classList.add("glide");
      }
    }
    this.after?.();
  }
  #render(rids) {
    const characters2 = /* @__PURE__ */ new Set();
    let items = false;
    for (const rid2 of rids) {
      if (!isPiece(rid2)) continue;
      const r = this.#w.game.get(rid2);
      if (!r || r.kind === "character") characters2.add(rid2);
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
      this.#drawPools([...characters2]);
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
    const game = this.#w.game;
    for (const [rid2, r] of game.all()) {
      const p = r, e = this.#els.get(rid2);
      if (!e || !("pin" in p)) continue;
      e.classList.toggle("pinned", !!p.pin);
      if (!p.pin) {
        delete e.dataset.pin;
        continue;
      }
      const card2 = game.get(ridOf(p.pin.card));
      e.dataset.pin = p.pin.card;
      if (card2?.kind === "character" && "place" in p) e.style.zIndex = String(Math.max(p.place.z, card2.card.z + 1));
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
    const pan = paced(this.#w.schedule, ({ x, y }) => {
      this.view = { ...this.view, x, y };
      this.#place();
    });
    const zoomed = paced(this.#w.schedule, (v) => {
      this.#place();
      this.#w.keepView(v);
    });
    root.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      doc.activeElement?.blur?.();
      from = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y, id: e.pointerId };
      doc.body.classList.add("panning");
    });
    doc.addEventListener("pointermove", (e) => {
      if (!from || e.pointerId !== from.id) return;
      pan.to({ x: from.vx + e.clientX - from.x, y: from.vy + e.clientY - from.y });
    });
    const end = (e) => {
      if (!from || e.pointerId !== from.id) return;
      from = null;
      pan.flush();
      doc.body.classList.remove("panning");
      this.#w.keepView(this.view);
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
function asChip(el3, i) {
  el3.className = `loose-item chip ${i.sign > 0 ? "pos" : "neg"}`;
  el3.textContent = chipFace(i);
  if (i.kind === "influence") el3.title = i.name;
}
var pinnable2 = (r) => r.kind === "sticky" || r.kind === "text" || r.kind === "image";
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
    const { table, game } = this.#w;
    const pieces = this.#hands.get(hand) ?? /* @__PURE__ */ new Map();
    this.#hands.set(hand, pieces);
    for (const i of items) {
      const key = i.part === "pool" ? `${i.rid}#pool` : i.rid;
      const old = pieces.get(key);
      if (old?.landing) {
        clearTimeout(old.landing);
        delete old.landing;
      }
      const at3 = { x: i.x, y: i.y };
      const keys2 = this.#hold(key, i.rid, at3, own2);
      if (!keys2.length) continue;
      const r = game.get(i.rid);
      if (r?.kind === "character") {
        let card2 = at3;
        if (i.part === "pool") {
          const mat = table.pool(i.rid);
          card2 = r.gathered && mat ? { x: at3.x, y: at3.y + mat.offsetHeight + GATHER_GAP } : { x: r.card.x + at3.x - r.pool.x, y: r.card.y + at3.y - r.pool.y };
          keys2.push(...this.#hold(i.rid, i.rid, card2, own2));
        }
        for (const [r2, o] of game.all()) {
          const q = o;
          if ("kind" in q && pinnable2(q) && q.pin?.card === r.oid) keys2.push(...this.#hold(r2, r2, { x: card2.x + q.pin.dx, y: card2.y + q.pin.dy }, own2));
        }
      }
      pieces.set(key, { rid: i.rid, keys: [...new Set(keys2)], aim: i.aim, t: ++this.#t, own: own2 });
    }
    this.react();
  }
  /** Holds one piece at `at`, lifting it first if it isn't held; the keys it holds. */
  #hold(key, rid2, at3, own2) {
    const { table } = this.#w;
    if (!table.held(key)) {
      const el4 = key.endsWith("#pool") ? table.pool(rid2) : table.element(rid2) ?? table.handFor(rid2);
      if (!el4) return [];
      table.lift(key, el4, at3);
    }
    const el3 = table.held(key);
    el3.classList.toggle("carried", !own2);
    table.place(key, at3);
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
      const el3 = this.#w.table.held(k);
      if (el3) this.#unchip(el3);
      this.#w.table.letGo(k);
    }
  }
  // Seq: seq-drag.md#1.4 | R299, R222, R240, R244, R243: every hand's aims, latest last; only what
  // differs from what's drawn is drawn.
  /** Draws what the aims do. Run again after every redraw (a drawer's redraw drops its gap). */
  react(animate = true) {
    const { table, game } = this.#w;
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
      const el3 = table.held(p.rid), i = game.get(p.rid);
      if (a.chip && el3 && i?.kind === "influence") chips.set(el3, i);
    }
    for (const e of this.#lit) if (!lit.has(e)) e.classList.remove("over");
    for (const e of lit) e.classList.add("over");
    this.#lit = lit;
    for (const d of this.#gaps) if (!gaps.has(d)) showGap(d, null, animate);
    for (const [d, at3] of gaps) showGap(d, at3, animate);
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
function views(game, gameId, viewer, blobs, moves, hand, missing, ledger, rolling, checkpoint) {
  const who = viewer?.name ?? "nobody", gm = !!viewer?.gm;
  let seat = load(localStorage, gameId, who);
  const keep = (s) => {
    seat = s;
    save(localStorage, gameId, who, s);
  };
  const redraw = () => table.render(game.all().map(([rid2]) => rid2));
  const mint2 = () => minter(game, gm);
  let drag, rollRow;
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
    const a = r.attack, c = a && game.get(ridOf(a.target));
    if (!a || c?.kind !== "character") return;
    cancelTake();
    taking = { oid: c.oid, id: r.id, kind: a.kind, by: a.from, result: a.result, pages: pages(c, a.kind, a.result), k: 0 };
    const col = `${c.oid}:${COLUMN_OF[a.kind]}`;
    keep({ ...seat, open: { ...seat.open, columns: [...seat.open.columns.filter((k) => !k.startsWith(`${c.oid}:`)), col] } });
    if (!c.flipped) game.change((w) => w.put(ridOf(c.oid), { ...c, flipped: true }));
    addEventListener("keydown", onTakeKey, true);
    addEventListener("pointerdown", onTakePress, true);
    addEventListener("pointerup", onTakeUp, true);
    redraw();
  };
  const topZ = () => 1 + Math.max(0, ...game.all().map(([, r]) => ("kind" in r ? placeOf(r) : null)?.z ?? 0));
  const addImage = (file, at3) => void blobs.add(file).then(({ blob, w: iw, h }) => {
    const oid = mint2()();
    const image2 = { kind: "image", oid, place: { ...at3, z: topZ(), tilt: 0 }, blob, w: iw, h };
    game.change((wr) => wr.put(ridOf(oid), image2));
  });
  const made = (what, oid, at3) => {
    switch (what) {
      case "character":
        return newCharacter(oid, viewer, at3);
      case "sticky":
        return newSticky(oid, at3);
      case "text":
        return newText(oid, at3);
      case "howto":
        return newHowTo(oid, at3);
      default:
        return newChip(oid, what.sign, what.points, at3);
    }
  };
  const clearOfBar = (rid2) => {
    const c = game.get(rid2), bar2 = document.getElementById("bar");
    if (c?.kind !== "character" || !bar2) return;
    const top = Math.round(table.toWorld(0, bar2.getBoundingClientRect().bottom).y + 10);
    const dy = top - c.pool.y;
    if (dy > 0) game.change((w) => w.put(rid2, { ...c, pool: { ...c.pool, y: top }, card: { ...c.card, y: c.card.y + dy } }));
  };
  const bar = new BarView(document.getElementById("bar"), {
    version: "dev",
    date: "",
    take: (what, e) => {
      const oid = mint2()(), rid2 = ridOf(oid), rec = made(what, oid, table.toWorld(e.clientX, e.clientY));
      game.change((w) => w.put(rid2, rec));
      drag?.fresh(rid2);
      if (rec.kind === "character") drag?.startPool(rid2, e, e, () => clearOfBar(rid2));
      else if (rec.kind === "chip") drag?.startItem(rid2, e, e);
      else drag?.start(rid2, e, e);
    },
    images: (files) => {
      const r = document.getElementById("table").getBoundingClientRect(), c = table.toWorld(r.left + r.width / 2, r.top + r.height / 2);
      files.forEach((f, i) => addImage(f, { x: Math.round(c.x - 120 + i * 24), y: Math.round(c.y - 100 + i * 24) }));
    }
  });
  const table = new TableView(document.getElementById("table"), document.getElementById("world"), {
    game,
    viewer,
    view: seat.view,
    keepView: (v) => keep({ ...seat, view: v }),
    schedule: frame,
    imageUrl: (hash) => blobs.url(hash),
    imageGone: (hash) => blobs.release(hash),
    missing,
    addImage,
    opened: () => new Set(seat.open.columns),
    setOpened: (o) => {
      keep({ ...seat, open: { ...seat.open, columns: [...o] } });
      redraw();
    },
    drag: (rid2, down, move) => drag?.start(rid2, down, move),
    // R259: your own Resources only; anyone's Motivations and Damage.
    dragGlyph: (src, down, move) => {
      const colon = src.indexOf(":"), c = game.get(ridOf(src.slice(0, colon)));
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
      keep({ ...seat, open: { ...seat.open, [kind]: [...now2] } });
      redraw();
    },
    dragItem: (rid2, down, move) => drag?.startItem(rid2, down, move),
    // R75–R77: an action's die brings the roll row; the action in use gets its swish.
    useAction: (oid, label, alt) => rollRow?.action(oid, label, alt) ?? false,
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
    // R142, R144, R146, R371: the die by a pool's name claims, opens, or docks the roll row.
    poolDie: (oid, shift, die3) => {
      const c = game.get(ridOf(oid));
      if (c?.kind !== "character") return;
      const r = shift ? shiftClick(viewer, c) : click(viewer, c);
      if ("owner" in r) game.change((w) => w.put(ridOf(oid), { ...c, owner: r.owner }));
      else if ("dock" in r) rollRow?.dock(oid);
      else {
        die3.title = r.refused;
        die3.animate?.([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "none" }], 200);
      }
    },
    dragPool: (rid2, down, move) => drag?.startPool(rid2, down, move)
  });
  const yard = () => {
    const y = game.get("yards") ?? empty(), cur = Math.min(seat.boothill.cur, y.yards.length - 1);
    return { cur, name: y.yards[cur].name };
  };
  const hands = new Hands({ game, table });
  table.after = () => hands.react();
  drag = new Drag({ game, table, hands, hand, moves, mint: mint2, schedule: frame, yard, who: () => viewer?.name });
  const tape = new TapeView(document.getElementById("table"), {
    game,
    viewer,
    up: () => seat.tapeUp,
    setUp: (up) => keep({ ...seat, tapeUp: up }),
    crit: (id, choice, lock) => rolling().crit(id, choice, lock),
    mint: () => mint2()(),
    owner: (oid) => game.get(ridOf(oid))?.owner,
    take: startTake,
    name: (id, damage3, row2, text) => void rolling().name(id, damage3, row2, text),
    toWorld: (x, y) => table.toWorld(x, y),
    carry: (rid2, down, move) => drag?.start(rid2, down, move)
  });
  const register = new RegisterView(document.getElementById("bar"), { game, viewer, checkpoint, paperRoll: () => tape.toggleUp() });
  const hang = () => {
    const t = document.getElementById("tape");
    if (t) {
      t.style.right = "auto";
      t.style.left = `${Math.max(8, Math.min(innerWidth - 258, register.left() + 2))}px`;
    }
  };
  new LedgerView(document.getElementById("bar"), document.body, { ...ledger, restore: async (id) => {
    await ledger.restore(id);
    const yards = game.get("yards") ?? empty();
    keep(prune(seat, (rid2) => game.get(rid2) !== void 0, yards.yards.length));
    redraw();
  } });
  new BootHillView(document.getElementById("bar"), document.body, {
    game,
    cur: () => seat.boothill.cur,
    setCur: (cur) => keep({ ...seat, boothill: { ...seat.boothill, cur } }),
    open: () => seat.boothill.open,
    setOpen: (open) => keep({ ...seat, boothill: { ...seat.boothill, open } }),
    toWorld: (x, y) => table.toWorld(x, y),
    top: topZ,
    carry: (lead, down, move) => lead.kind === "character" ? drag?.startPool(ridOf(lead.oid), down, move) : drag?.start(ridOf(lead.oid), down, move)
  });
  hang();
  addEventListener("resize", hang);
  void document.fonts?.ready.then(hang);
  const tray2 = new TrayView(bar.oppo, { game, viewer });
  rollRow = new RollRowView({
    game,
    viewer,
    tray: tray2,
    mint: () => mint2()(),
    // R364: the type last chosen for an action on a card, in this viewer's seat.
    remembered: (oid, label) => seat.types[`${oid}:${label}`],
    remember: (oid, label, type) => keep({ ...seat, types: { ...seat.types, [`${oid}:${label}`]: type } }),
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
function askName() {
  for (; ; ) {
    const n = arrivalName(prompt("Your name at the table"));
    if (n) return n;
  }
}
function meOf(p, name2, gm) {
  return { name: name2, gm, live: p.status.state === "live", ...p.status.state === "offline" && { why: p.status.why } };
}
function here(p) {
  return [...p.people].map(([tab2, person]) => ({ tab: tab2, ...person, stale: p.stale(tab2) }));
}
function ledgerOf(store, blobs, player) {
  const onto = async (id) => {
    await store.open(id);
    location.reload();
  };
  return {
    player,
    now: () => clock.now(),
    round: () => store.game.get("meta").round,
    current: () => store.current,
    status: () => store.status(),
    rename: (name2) => store.rename(name2),
    checkpoints: () => store.checkpoints(),
    games: () => store.list(),
    checkpoint: (name2) => store.checkpoint(name2, false),
    restore: (id) => store.restore(id),
    open: onto,
    newGame: async (name2) => onto((await store.add(name2)).id),
    exported: () => exportGame(store, blobs, store.current.id),
    imported: async (text) => onto((await importGame(store, blobs, text)).id)
  };
}
function redrawImages(game, table, hash) {
  table.render(game.all().filter(([, r]) => r.kind === "image" && r.blob === hash).map(([rid2]) => rid2));
}
async function main() {
  const db = await IdbDb.open();
  const store = new GameStore(db, clock, localStorage);
  const blobs = new BlobStore(db, measure);
  const [identity, sealer] = await Promise.all([Identity.load(db), Sealer.make()]);
  const tab2 = tabId(sessionStorage), invited = fromUrl(location.search);
  const loopback = !!local("hollow.loopback");
  const relay = new URLSearchParams(location.search).has("test") ? local("hollow.relay") ?? void 0 : void 0;
  const stamps = new Stamps(sessionStorage);
  const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  addEventListener("pagehide", () => {
    void store.save();
  });
  if (invited) {
    await store.copyFor(invited.room);
    const game2 = store.game, name2 = local("hollow.name") ?? local("hollow.name", askName());
    const wire = new Wire(invited.room, { identity, sealer, tab: tab2, loopback, relay });
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
      held: (rid2) => moves2.holds(rid2)
    });
    let hands2;
    const moves2 = new Moves({ stamps, tab: tab2, send: (m) => {
      void wire.send("move", m);
    }, shared: shared(game2), place: (cs) => shown2(hands2, cs), timers: clock, schedule: frame });
    wire.on("move", (b, from) => moves2.receive(from.tab, b));
    const presence = new Presence({ net: wire, clock, role: "player", name: name2, gone: (tab3) => {
      rolls2.left(tab3);
      hands2?.leave(tab3);
    } });
    let notYours = null;
    wire.on("claim", (b) => {
      notYours = b.why;
    });
    const rolls2 = new Rolls({ game: game2, sealer, clock, rng, link: wire, session: sessionStorage, gm: false, gmBrowser: invited.gm });
    const images = new ImageExchange(wire, blobs, clock);
    images.watch(game2);
    images.changed((hash) => redrawImages(game2, table2, hash));
    images.start();
    presence.start();
    copy.start();
    const v = views(game2, store.current.id, { name: name2, gm: false }, blobs, moves2, tab2, (hash) => images.missing.get(hash), ledgerOf(store, blobs, true), () => rolls2);
    const { table: table2, drag: drag2, bar: bar2 } = v;
    hands2 = v.hands;
    new FolksView(bar2.folks, bar2.youAre, { me: () => ({ ...meOf(presence, name2, false), ...notYours !== null && { notYours } }), people: () => here(presence), held: () => void 0 });
    return { version: "dev", date: "", role: "player", tab: tab2, identity, store, blobs, wire, presence, copy, rolls: rolls2, images, moves: moves2, view: table2, drag: drag2 };
  }
  await store.start();
  const game = store.game;
  let gmShown = local("hollow.gmname") ?? GM;
  let table = null;
  let rolls = new Rolls({ game, sealer, clock, rng, link: null, session: sessionStorage, gm: true });
  const moves = new Moves({
    stamps,
    tab: tab2,
    send: (m) => {
      void table?.wire.send("move", m);
    },
    shared: shared(game),
    place: (cs) => shown2(hands, cs, (c) => !!table?.authority.mayMove(c.tab, c.rid)),
    timers: clock,
    schedule: frame
  });
  const open = () => {
    if (table) return table;
    const key = `hollow.room.${store.current.id}`;
    const room2 = local(key) ?? local(key, newRoom(store.current.name));
    const wire = new Wire(room2, { identity, sealer, tab: tab2, loopback, relay });
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
    const authority = new Authority({ game, stamps, sealer, link: wire, schedule: queueMicrotask });
    const whoIs2 = (from) => {
      const p = presence.people.get(from.tab), held = p && game.get("book").claims[p.name];
      return p && held === from.browser ? p.name : null;
    };
    rolls = new Rolls({ game, sealer, clock, rng, link: wire, session: sessionStorage, gm: true, whoIs: whoIs2 });
    const images = new ImageExchange(wire, blobs, clock);
    images.watch(game);
    images.changed((hash) => redrawImages(game, view, hash));
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
    rolls = new Rolls({ game, sealer, clock, rng, link: null, session: sessionStorage, gm: true });
  };
  const gmSeat = load(localStorage, store.current.id, GM), viewer = gmSeat.viewAs ? { name: gmSeat.viewAs, gm: false } : { name: GM, gm: true };
  const { table: view, drag, bar, hands } = views(
    game,
    store.current.id,
    viewer,
    blobs,
    moves,
    tab2,
    (hash) => table?.images.missing.get(hash),
    ledgerOf(store, blobs, false),
    () => rolls,
    (name2) => store.checkpoint(name2, true)
  );
  new FolksView(bar.folks, bar.youAre, {
    me: () => table ? meOf(table.presence, gmShown, true) : { name: gmShown, gm: true, live: false },
    people: () => table ? here(table.presence) : [],
    held: (name2) => game.get("book").claims[name2],
    rename: () => {
      gmShown = gmName(prompt("Your name, as players see it", gmShown), gmShown);
      local("hollow.gmname", gmShown);
      table?.presence.rename(gmShown);
    },
    handOver: (name2, browser) => {
      handOver(game, name2, browser);
      table?.authority.handedOver(name2);
    },
    table: { opened: () => !!table, open: () => void open(), invite: link, close },
    viewAs: {
      current: () => gmSeat.viewAs ?? GM,
      choices: () => viewAsChoices(
        [...table?.presence.people.values() ?? []].filter((p) => p.role === "player").map((p) => p.name),
        game.all().map(([, r]) => r).filter((c) => c.kind === "character").map((c) => c.owner)
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
    forNobody: () => game.all().map(([rid2]) => rid2).filter(shared(game))
  };
}
var shared = (game) => (rid2) => {
  const r = game.get(rid2);
  return !r || !!redact(r, null, (oid) => game.get(ridOf(oid)));
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
