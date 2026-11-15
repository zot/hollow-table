// CRC: crc-MarkReader.md | R205, R258, R261, R267, R323, R324, R326, R336, R337, R352, R354, R355
// Reads the game inside marks, and only there. Each grammar also offers a pen for a plain line
// that fits it.

import { parse, plain, type Line, type MarkName } from '../text/marks.ts';

/** The attribute an action's roll uses (R337): Cha, Int, or none. */
export type Att = 'Cha' | 'Int' | null;
export type Action = { label: string; base: number; yellows: number; bonus: number; att: Att };
export type Reading = { name: string; sign: 1 | -1 | null; level: string | null };
export type Defend = { mental: number; psych: number };

const MINUS = '-−–';
const signed = (s: string) => Number(s.replace(/\s/g, '').replace(/[−–]/, '-'));

/** Split at the first comma outside parentheses, or null when there is none. */
function splitComma(s: string): [string, string] | null {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ',' && depth === 0) return [s.slice(0, i), s.slice(i + 1)];
  }
  return null;
}

const BASE = new RegExp(`^\\s*([${MINUS}]?\\d+)(?:\\s|\\(|$)`);
const DICE = new RegExp(`^\\s*(?:(\\d+)d)?\\s*([+${MINUS}]\\s*\\d+)?(?:\\s|\\(|$)`);

// R74: `LABEL: N [stuff], [Nd][±N] [stuff]`, split at the first comma outside parentheses.
/** An action line: Base, Yellows and bonus as written, or null. */
export function action(text: string): Action | null {
  const colon = text.indexOf(':');
  if (colon <= 0) return null;
  const label = text.slice(0, colon).trim();
  const parts = splitComma(text.slice(colon + 1));
  if (!label || !parts) return null;
  const b = BASE.exec(parts[0]), d = DICE.exec(parts[1]);
  if (!b || !d || (d[1] === undefined && d[2] === undefined)) return null;
  return { label, base: signed(b[1]!), yellows: d[1] ? Number(d[1]) : 0, bonus: d[2] ? signed(d[2]) : 0, att: actionAtt(text.slice(colon + 1)) };
}

// R337: an action names its attribute as an entry in its parentheses, `(no att)` none, `(Int)` Int; else Cha.
function actionAtt(text: string): Att {
  const entries = [...text.matchAll(/\(([^)]*)\)/g)].flatMap(m => m[1]!.split(',').map(e => e.trim().toLowerCase()));
  return entries.includes('no att') ? null : entries.includes('int') ? 'Int' : 'Cha';
}

export const LEVEL_WORDS = ['Min', 'Sig', 'Maj', 'Ext', 'Exq'] as const;
/** A Level as written: one of LEVEL_WORDS, or a number of points. */
const LEVEL = `(${LEVEL_WORDS.join('|')}|\\d+)`;
const INFLUENCE = new RegExp(`^(.*?)\\s*([+${MINUS}])\\s*${LEVEL}\\b(.*)$`, 'is');

// R54: only `Name ±Level` inside the mark is read.
/** `Name ±Level` (Level a word or a number of points), or a bare name with no Level. */
export function influence(text: string): Reading | null {
  const t = text.trim(), m = INFLUENCE.exec(t);
  const name = m?.[1]!.trim();
  if (m && name) {
    const w = m[3]!, word = LEVEL_WORDS.find(x => x.toLowerCase() === w.toLowerCase());
    return { name, sign: m[2] === '+' ? 1 : -1, level: word ?? w };
  }
  return t ? { name: t, sign: null, level: null } : null;
}

// R352: an action whose label is an Influence suffers it: `Tricky -Min` is Tricky, −1, Min.
/** The Influence an action's label is, or null when the label has no sign and Level. */
export function suffered(label: string): Reading | null {
  const r = influence(label);
  return r?.sign && r.level ? r : null;
}

// R354, R355: an action line whose label is an Influence, right under another action line (or under
// that action's other variants), is that action's variant.
export type Variant = { line: number; label: string; of: string };
/** The front's variants, each with the label of the action it varies. */
export function variants(front: string): Variant[] {
  const out: Variant[] = [];
  let of: string | null = null;
  parse(front).forEach((runs, line) => {
    const marked = runs.filter(r => typeof r !== 'string' || r.trim());
    const only = marked.length === 1 && typeof marked[0] !== 'string' ? marked[0] : null;
    const act = only?.mark === 'act' ? action(only.text) : null;
    if (!act) { of = null; return; }
    if (of && suffered(act.label)) out.push({ line, label: act.label, of });
    else of = act.label;
  });
  return out;
}

const N = '(\\d+)';
const DEF_ONE = new RegExp(`^${N}$`);
const DEF_TWO = new RegExp(`^${N}\\s*/\\s*${N}$`);
const DEF_NAMED = new RegExp(`^(mental|psych)\\s*${N}\\s*/\\s*(mental|psych)\\s*${N}$`, 'i');

// R83: `N`, `mental N / psych M`, or `N / M` (mental / psych).
/** The Defend line: mental and psych, equal for a single number; or null. */
export function defend(text: string): Defend | null {
  const t = text.trim().replace(/^defend\s*:\s*/i, '');
  let m = DEF_ONE.exec(t);
  if (m) return { mental: Number(m[1]), psych: Number(m[1]) };
  m = DEF_TWO.exec(t);
  if (m) return { mental: Number(m[1]), psych: Number(m[2]) };
  m = DEF_NAMED.exec(t);
  if (m && m[1]!.toLowerCase() !== m[3]!.toLowerCase()) {
    const v = { [m[1]!.toLowerCase()]: Number(m[2]), [m[3]!.toLowerCase()]: Number(m[4]) };
    return { mental: v.mental!, psych: v.psych! };
  }
  return null;
}

// R207, R323, R324: a plain line matching a mark's grammar is offered that mark's pen: a Field by
// its Level and XP, a Skill by a `Skills N:` line or by sitting under a Field.
/** The mark a plain line fits, given the heading it sits under and whether it sits under a Field, or null. */
export function offer(line: string, heading: string | null = null, underField = false): MarkName | null {
  if (SKILLS.test(line)) return 'skl';
  if (field(line)) return 'fld';
  if (action(line)) return 'act';
  if (ATT_LINE.test(line)) return 'att';
  const r = influence(line);
  if (r?.level && r.sign === 1 && heading && /^\s*resources\b/i.test(heading)) return 'res';
  if (r?.level && heading && /^\s*motivations?\b/i.test(heading)) return 'mot';
  if (underField && line.trim()) return 'skl';
  return null;
}

/** Influence Levels by word; a number of points is half as many Levels. */
export const LEVELS: Record<string, number> = { Min: 1, Sig: 2, Maj: 3, Ext: 4, Exq: 5 };
const WORD_OF = ['0', 'Min', 'Sig', 'Maj', 'Ext', 'Exq'];

/** How many Levels a reading's Level is worth (a bare name is worth none). */
export function levelsOf(r: Reading): number {
  if (!r.level) return 0;
  if (/^\d+$/.test(r.level)) return Math.floor(Number(r.level) / 2);
  return LEVELS[r.level] ?? 0;
}

/** A number of Levels as written: a word up to Exquisite, then points. */
export function levelWord(levels: number): string {
  return WORD_OF[levels] ?? String(levels * 2);
}

const LEVEL_AT = new RegExp(`^(.*?[+${MINUS}]\\s*)${LEVEL}\\b(.*)$`, 'is');

/**
 * The same Influence text with its Level moved down by `by` Levels (up when negative): *Money +Maj
 * (bank)* spent by 1 is *Money +Sig (bank)*. Everything else stays as written. Null when the text
 * has no Level, or when it would drop below zero.
 */
export function spend(text: string, by: number): string | null {
  const r = influence(text), m = LEVEL_AT.exec(text);
  if (!r?.level || !m) return null;
  const left = levelsOf(r) - by;
  return left < 0 ? null : m[1] + levelWord(left) + m[3];
}

// R261: a Motivation's spending is temporary: its written Level stays, and the Levels left follow
// it in parentheses, as Bunkum writes an adjusted value (`Keep the Peace +Sig (+Min)`, `(0)`).
const ADJUSTED = new RegExp(`\\s*\\((?:[+${MINUS}]\\s*)?${LEVEL}\\)\\s*$`, 'i');

/** A Motivation's text without its parentheses: as written, unspent. */
export function unadjusted(text: string): string {
  return text.replace(ADJUSTED, '');
}

/** The Levels a Motivation has left: its parentheses when it has them, else its written Level. */
export function motiveLeft(text: string): number {
  const a = ADJUSTED.exec(text);
  if (!a) return levelsOf(influence(text) ?? { name: '', sign: null, level: null });
  const w = a[1]!, word = LEVEL_WORDS.find(x => x.toLowerCase() === w.toLowerCase());
  return levelsOf({ name: '', sign: null, level: word ?? w });
}

/**
 * A Motivation's text with `by` more Levels spent (back when negative): its written Level kept and
 * the Levels left in parentheses, which go when it is back to full. Null when it would drop below 0.
 */
export function adjust(text: string, by: number): string | null {
  const base = unadjusted(text), r = influence(base);
  if (!r?.level) return null;
  const left = motiveLeft(text) - by;
  if (left < 0) return null;
  if (left >= levelsOf(r)) return base;
  if (!left) return `${base} (0)`;
  const sign = r.sign === -1 ? '-' : '+';
  return `${base} (${sign}${levelWord(left)})`;
}

// R267: a character's attributes, `Name N` pairs (`Cha 2  Int 2  Wis 4`).
const ATT = new RegExp(`\\b([A-Z][a-z]{2})\\s*([+${MINUS}]?\\d+)\\b`, 'g');
const ATT_LINE = new RegExp(`^\\s*(?:[A-Z][a-z]{2}\\s*[+${MINUS}]?\\d+\\s*){2,}$`);

/** The attributes an `<att>` mark's text names, by name. */
export function attributes(text: string): Record<string, number> {
  return Object.fromEntries([...text.matchAll(ATT)].map(m => [m[1]!, signed(m[2]!)]));
}

// R323: a Field, `Name N (nXP)`: its Level N (Bill, 11-14). A ✓ marks a Skill, never a Field.
const FIELD = /^\s*([^✓\s].*?)\s+(\d+)\s*\(\s*\d+\s*XP\s*\)\s*$/i;
/** A Field's name and Level from a `<fld>` mark's text (or a plain line of that shape), or null. */
export function field(text: string): { name: string; level: number } | null {
  const m = FIELD.exec(text);
  return m ? { name: m[1]!.trim(), level: Number(m[2]) } : null;
}

// R324: `Skills N: a, b (c), d`: each Skill, split at commas outside parentheses, at Level N.
const SKILLS = /^\s*Skills\s+(\d+)\s*:/i;
/** A `Skills N:` line's Level and each Skill with its start and end in the text; null for any other line. */
export function skillsLine(text: string): { level: number; skills: { name: string; start: number; end: number }[] } | null {
  const m = SKILLS.exec(text);
  if (!m) return null;
  const skills: { name: string; start: number; end: number }[] = [];
  let depth = 0, from = m[0].length;
  const take = (to: number) => {
    const raw = text.slice(from, to), lead = raw.length - raw.trimStart().length, name = raw.trim();
    if (name) skills.push({ name, start: from + lead, end: from + lead + name.length });
  };
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ',' && !depth) { take(i); from = i + 1; }
  }
  take(text.length);
  return { level: Number(m[1]), skills };
}

/** A Field Skill line's name: its ✓, its XP-cost note (`(x2)`, `(x2, Rhetoric)`) and any written Level after it set aside. */
const skillName = (text: string) => text.replace(/^\s*✓\s*/, '').replace(/\s+\d+\s*$/, '').replace(/\s*\(x\d+[^)]*\)/gi, '').trim();

// R326, R336: what a drop can point at on a card, by name, so a roll carries names and never numbers
// (R100) and the GM's page looks the number up on its own copy.
export type Against = { def: 'mental' | 'psych' } | { act: string } | { fld: string } | { skl: string };
/** One thing on a card's front a drop can point at: where it is, what it is, its base and its words. */
export type Point = { line: number; start: number; end: number; against: Against; base: number; words: string };

/**
 * Everything on a card's front a drop can point at: Defend numbers, actions' Bases, Fields and Skills
 * (Level plus the card's `att`, the attribute the acting action uses; none when null, 0 when unlisted).
 */
export function points(front: string, att: Att = 'Cha'): Point[] {
  const lines: Line[] = parse(front), out: Point[] = [], attrs: Record<string, number> = {};
  for (const l of lines) for (const r of l) if (typeof r !== 'string' && r.mark === 'att') Object.assign(attrs, attributes(r.text));
  // R336: the attribute the acting action uses, from the target's card.
  const value = att ? attrs[att] ?? 0 : 0;
  const plus = (level: number) => ` ${level}` + (att ? ` + ${att} ${value}` : '');
  let fieldLevel: number | null = null;
  lines.forEach((l, line) => {
    let at = 0, onlySkills = true, sawField = false;
    for (const r of l) {
      const len = (typeof r === 'string' ? r : r.text).length;
      if (typeof r === 'string') { if (r.trim()) onlySkills = false; at += len; continue; }
      const t = r.text;
      if (r.mark === 'def') {
        const d = defend(t), colon = t.indexOf(':') + 1, nums = [...t.slice(colon).matchAll(/\d+/g)];
        if (d) nums.forEach((n, k) => {
          const before = t.slice(0, colon + n.index!);
          const which = /mental\s*$/i.test(before) ? 'mental' : /psych\s*$/i.test(before) ? 'psych' : k === 0 ? 'mental' : 'psych';
          const start = at + colon + n.index!;
          out.push({ line, start, end: start + n[0].length, against: { def: which }, base: d[which],
            words: nums.length === 1 ? `Defend ${d[which]}` : `${which} ${d[which]}` });
        });
      } else if (r.mark === 'act') {
        const a = action(t), colon = t.indexOf(':') + 1, b = a && /[+\-−–]?\d+/.exec(t.slice(colon));
        if (a && b) out.push({ line, start: at + colon + b.index, end: at + colon + b.index + b[0].length,
          against: { act: a.label }, base: a.base, words: `${a.label} ${a.base}` });
      } else if (r.mark === 'fld') {
        const f = field(t);
        if (f) { out.push({ line, start: at, end: at + len, against: { fld: f.name }, base: f.level + value, words: f.name + plus(f.level) }); fieldLevel = f.level; sawField = true; }
      } else if (r.mark === 'skl') {
        const many = skillsLine(t);
        if (many) {
          for (const k of many.skills) out.push({ line, start: at + k.start, end: at + k.end, against: { skl: k.name }, base: many.level + value, words: k.name + plus(many.level) });
          fieldLevel = null;
        } else if (fieldLevel !== null) {
          const level = fieldLevel + (/^\s*✓/.test(t) ? 1 : 0), name = skillName(t);
          if (name) out.push({ line, start: at, end: at + len, against: { skl: name }, base: level + value, words: name + plus(level) });
        }
      } else onlySkills = false;
      at += len;
    }
    // A Field's Skills run on while lines hold only Skills; anything else ends them.
    if (!sawField && !onlySkills && plain(l).trim()) fieldLevel = null;
  });
  return out;
}

/** The point on a card's front that a roll's `against` names, or null when it names nothing there. */
export function pointed(front: string, against: Against, att: Att = 'Cha'): Point | null {
  const key = JSON.stringify(against);
  return points(front, att).find(p => JSON.stringify(p.against) === key) ?? null;
}
