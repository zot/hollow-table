// CRC: crc-MarkReader.md | R205
// Reads the game inside marks, and only there. Each grammar also offers a pen for a plain line
// that fits it.

import type { MarkName } from '../text/marks.ts';

export type Action = { label: string; base: number; yellows: number; bonus: number };
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
  return { label, base: signed(b[1]!), yellows: d[1] ? Number(d[1]) : 0, bonus: d[2] ? signed(d[2]) : 0 };
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

// R207: a plain line matching a mark's grammar is offered that mark's pen.
/** The mark a plain line fits, given the heading it sits under, or null. */
export function offer(line: string, heading: string | null = null): MarkName | null {
  if (action(line)) return 'act';
  const r = influence(line);
  if (r?.level && r.sign === 1 && heading && /^\s*resources\b/i.test(heading)) return 'res';
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
