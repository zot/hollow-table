// CRC: crc-RollRow.md | R321, R306, R316, R319, R364, R68, R69, R70, R71, R72, R73, R76, R78, R79, R80, R81, R82, R274, R275, R276, R83, R84, R85, R86, R87, R88, R277, R345, R346, R349, R350, R362, R353, R355, R363, R364, R365
// The dice you're about to roll, docked on the pool you roll for, in your view only (the Seat).
// The decisions are pure (dock, action, hand, row, numbers); the view below draws them.

import type { Game, Writer } from '../model/game.ts';
import { GM, OPEN, ROLL_TYPES, WORLD, isAttack, ridOf, type Character, type Influence, type Oid, type Opponent, type RollType, type World } from '../model/records.ts';
import { ADV, bonus, opposition, row as rowFor, total, type Row } from '../rules/odds.ts';
import { pools, type Item } from '../rules/pool.ts';
import { action as readAction, defend as readDefend, levelsOf, pointed, points, skillNamed, suffers, type Action, type Against, type Defend, type Point } from '../rules/readmarks.ts';
import { canSee, type Viewer } from '../rules/visibility.ts';
import type { Roller } from '../store/seat.ts';
import { alternative, diceOnly, rowWords, type Intent } from '../net/rolls.ts';
import { STEP } from '../rules/influence.ts';
import { slotItems } from './actions.ts';
import { gesture, type PointerLike } from './gesture.ts';
import { marks, parse } from '../text/marks.ts';

// R69: fresh is no action, no opponent, White, one Yellow, +0. With no action the hand is the dice.
export function fresh(pool: Oid): Roller {
  return { pool, action: '', opponent: null, defend: 'mental', row: null, byHand: false, hand: { yellows: 1, bonus: 0 }, dice: [] };
}

// R68, R69: docking on a pool starts it fresh, and so does that pool's die again; the GM's private
// switch stays as it was.
export function dock(r: Roller | null, pool: Oid): Roller {
  return { ...fresh(pool), ...(r?.priv && { priv: true }) };
}

// R364: what a label's words say the roll is, or null when they don't say (Shoot, a plain Attack).
/** The roll type a label (or one alternative of it) names. */
export function typeOf(label: string): RollType | null {
  const w = label.toLowerCase(), has = (re: RegExp) => re.test(w);
  if (has(/\b(atk|attack)\b/)) {
    if (has(/\bmental\b/)) return 'mental';
    if (has(/\bpsych/)) return 'psych';
    if (has(/\bphys(ical)?\b/)) return 'phys';
    return null;
  }
  if (has(/\binfer\b/)) return 'infer';
  if (has(/\bimpress\b/)) return 'impress';
  if (has(/\breq(uest)?\b/)) return 'request';
  if (has(/\binfluence\b/)) return 'influence';
  return null;
}

// R76, R82, R276: an action fills the row; the hand adjustment starts over, and the row starts at
// White unless it is aiming at someone. R316, R364: the alternative clicked names it, and its type
// starts as the label says, else as last chosen for it (`remembered`), else `?`.
// R364: else Skill, when the label names a Field or Skill on the card (`skill`).
export function withAction(r: Roller, label: string, alt?: string, remembered?: RollType, skill = false): Roller {
  const type = typeOf(alt ?? label.split('/')[0]!) ?? remembered ?? (skill ? 'skill' : '?');
  const { alt: _, ...rest } = r;
  return { ...rest, action: label, ...(alt && { alt }), type, hand: { yellows: 0, bonus: 0 },
    ...(!r.opponent && { row: null, byHand: false }), ...(type === '?' && r.opponent && { opponent: null }) };
}

// R319: the type tag; a roll turned to `?` stops aiming (R346).
export function typed(r: Roller, type: RollType): Roller {
  return { ...r, type, ...(type === '?' && { opponent: null }) };
}

/** The Defend an Attack goes at (R346): its own kind, a Phys Attack at none; other rolls as aimed. */
export function defendBase(r: Roller, def: Defend | null): number {
  if (r.type === 'phys' || !def) return 0;
  return def[r.type === 'mental' || r.type === 'psych' ? r.type : r.defend];
}

// R78: clicking the Base clears the action (and with it the opponent): the row starts fresh.
export function cleared(r: Roller): Roller {
  return dock(r, r.pool);
}

// R73: Yellows click adds, shift-click removes; the bonus raises and lowers.
export function handStep(r: Roller, what: 'yellows' | 'bonus', by: 1 | -1): Roller {
  return { ...r, hand: { ...r.hand, [what]: r.hand[what] + by } };
}

// R72: a row picked by hand, held until the next aim (R85).
export function picked(r: Roller, key: string): Roller {
  return { ...r, row: key, byHand: true };
}

// R83, R85: aiming at someone picks the row from the Difference again; stopping keeps a picked row.
// R326–R328: what was pointed at holds until the next aim; a drop on no number aims as before.
export function aimed(r: Roller, opponent: Opponent, defend: 'mental' | 'psych', against?: Against): Roller {
  return { ...r, opponent, defend, row: null, byHand: false, against };
}
export function unaimed(r: Roller): Roller {
  return { ...r, opponent: null, ...(!r.byHand && { row: null }) };
}

// R345, R346: a roll with an action waits until it is aimed, and a `?` one can't be; plain dice don't wait.
/** Why Roll waits, or null when it can be pressed. */
export function waits(r: Roller): string | null {
  if (!r.action) return null;
  if ((r.type ?? '?') === '?') return 'Say what this roll is, then aim it: drag from the action to a character, or to open table for the world';
  return r.opponent ? null : 'Aim it first: drag from the action to a character, or to open table for the world';
}

/** A character's Defend from its `<def>` mark, or null. */
export function defendOf(c: Character): Defend | null {
  return marks(parse(c.front), 'def').map(m => readDefend(m.text)).find(d => d) ?? null;
}

/** The viewer a character's owner is: what the roll row's numbers follow (R88). */
export const ownerAsViewer = (c: Character): Viewer => c.owner === GM ? { name: GM, gm: true } : { name: c.owner, gm: false };

// R100: a Roll asks by names, never numbers: the row only when picked (by hand, or set with no opponent).
export function intentOf(r: Roller): Omit<Intent, 'n'> {
  const row = r.row && (r.byHand || !r.opponent) ? { row: r.row } : {};
  return { pool: r.pool, action: r.action, vs: r.opponent, defend: r.defend, hand: r.hand, ...row,
    type: r.type ?? '?', ...(r.alt && { alt: r.alt }), ...(r.against && r.opponent && { against: r.against }) };
}

/** Whether `viewer` may roll for this character: its owner, or the GM for anyone (R68, R71). */
export function rollsFor(viewer: Viewer, c: Character | undefined): boolean {
  return !!viewer && !!c && c.owner !== OPEN && (viewer.gm || c.owner === viewer.name);
}

/** The character's action by its label, read from its `<act>` marks. */
export function actionOf(c: Character, label: string): Action | null {
  return marks(parse(c.front), 'act').map(m => readAction(m.text)).find(a => a?.label === label) ?? null;
}

export type Shown = {
  label: string; base: number | null; total: number | null; parts: Record<string, number>;
  yellows: number; bonus: number; row: Row;
  /** R84, R86, R88: the opponent, their total and the Difference; whether the rolling character's owner sees them. */
  vs?: { oid: Opponent; name: string; total: number; diff: number; sees: boolean; words?: string };
};

// R79, R80, R81, R82: what the row shows: the action's Base and Total Influence, the Yellows and
// bonus (the Bonus pool regrouping them, the hand on top), and the White row.
export function shown(game: Game, r: Roller): Shown {
  const c = game.get(ridOf(r.pool)) as Character | undefined;
  const items = game.all().map(([, x]) => x).filter((x): x is Item => 'kind' in x && (x.kind === 'chip' || x.kind === 'influence'));
  const mine = c ? pools(c.oid, items) : null;
  const act = c && r.action ? actionOf(c, r.action) : null;
  const row = ADV.find(x => x.key === r.row) ?? rowFor(0);
  if (!act || !mine) return { label: '', base: null, total: null, parts: {}, yellows: Math.max(0, r.hand.yellows), bonus: r.hand.bonus, row };
  const sum = total(act.base, mine), dice = bonus({ yellows: act.yellows, bonus: act.bonus }, mine.bonus, r.hand);
  // R316: the alternative clicked names the action; R355: a variant, typed by its action's alternative, names itself.
  const out: Shown = { label: alternative(act.label, r.alt), base: act.base, total: sum.total, parts: sum.parts, yellows: dice.yellows, bonus: dice.bonus, row };
  // R84, R85: against an opponent, the Difference picks the row unless one was picked by hand.
  // R350: against the world, the tray's number and nothing else, seen only when the owner is the GM.
  if (r.opponent === WORLD) {
    const against = (game.get('world') as World | undefined)?.total ?? 0, diff = sum.total - against;
    return { ...out, row: r.byHand ? row : rowFor(diff), vs: { oid: WORLD, name: 'the world', total: against, diff, sees: !!ownerAsViewer(c!)?.gm } };
  }
  const opp = r.opponent ? game.get(ridOf(r.opponent)) as Character | undefined : undefined;
  if (opp?.kind !== 'character') return out;
  // R326, R336, R330: a number, Field or Skill pointed at is the base; else Defend as before (R328).
  // R337: a Field or Skill adds the target's attribute the action uses.
  const point = r.against ? pointed(opp.front, r.against, act.att) : null;
  const against = opposition(point ? point.base : defendBase(r, defendOf(opp)), pools(opp.oid, items)).total, diff = sum.total - against;
  return { ...out, row: r.byHand ? row : rowFor(diff),
    vs: { oid: opp.oid, name: opp.name, total: against, diff, sees: canSee(ownerAsViewer(c!), opp), ...(point && { words: point.words }) } };
}

// R362, R353: the row's action, when its label is an Influence, keeps one `once` card of it in the
// actor's Main pool: put when the row comes to it (the one there kept), taken away, wherever it lies,
// when the row leaves it.
/** The change that leaves the `once` cards as `now`'s action wants them, or null when they already are. */
export function onceCard(game: Game, was: Roller | null, now: Roller | null, mint: () => Oid): ((w: Writer) => void) | null {
  const c = now?.action ? game.get(ridOf(now.pool)) as Character | undefined : undefined;
  const act = c?.kind === 'character' ? actionOf(c, now!.action) : null, inf = act ? suffers(c!.front, act.label) : null;
  const want = inf && { home: now!.pool, name: inf.name, sign: inf.sign!, points: STEP * levelsOf(inf) };
  const cards = game.all().map(([, x]) => x).filter((x): x is Influence =>
    'kind' in x && x.kind === 'influence' && !!x.once && (x.home === was?.pool || x.home === now?.pool));
  const keep = want && cards.find(i => i.home === want.home && i.name === want.name && i.sign === want.sign && i.points === want.points
    && typeof i.where === 'object' && 'slot' in i.where && i.where.slot === want.home && i.where.name === 'main');
  const gone = cards.filter(i => i !== keep);
  if (!gone.length && (keep || !want)) return null;
  return w => {
    for (const i of gone) w.del(ridOf(i.oid));
    if (!want || keep) return;
    const oid = mint();
    w.put(ridOf(oid), { kind: 'influence', oid, where: { slot: want.home, name: 'main' },
      n: slotItems(game, want.home, 'main').length, ...want, used: false, crit: false, once: true } satisfies Influence);
  };
}

/** The die's word for a character's owner (R142): GM, open, or the player. */
export const ownerWord = (c: Character) => c.owner === GM ? 'GM' : c.owner === OPEN ? 'open' : c.owner;

// ---- the view ----


export type RollRowWith = {
  game: Game; viewer: Viewer;
  /** The docked row, kept in the Seat (R68: in your view only). */
  roller: () => Roller | null;
  keep: (r: Roller | null) => void;
  /** A character's pool mat, to dock in. */
  pool: (oid: Oid) => HTMLElement | undefined;
  /** R362: new oids, for the card an action suffers. */
  mint: () => Oid;
  /** Redraws these characters' cards (the swish, R77). */
  redraw: (oids: Oid[]) => void;
  /** Rolls what the row shows: at once on the GM's page; a request from a player's (R100). */
  roll: (r: Roller) => void;
  /** R349, R350: the world's mark in the bar (the tray, or its button while the tray is in), and its ring. */
  tray: { mark(): HTMLElement | undefined; ring(on: boolean): void };
  /** R364: the type last chosen for an action on a card, and keeping a new choice. */
  remembered: (oid: Oid, label: string) => RollType | undefined;
  remember: (oid: Oid, label: string, type: RollType) => void;
};

// R319: the type tag's words.
export const TYPE_WORDS: Record<RollType, string> = {
  '?': '?', skill: 'Skill', influence: 'Create Influence', phys: 'Phys Attack', mental: 'Mental Attack',
  psych: 'Psych Attack', infer: 'Infer', impress: 'Impress', request: 'Request',
};
/** The tag's own short words, as the cards spell them, so the row's dice keep their room. */
const TAG_WORDS: Partial<Record<RollType, string>> = { influence: 'Influence', phys: 'Phys Atk', mental: 'Mental Atk', psych: 'Psych Atk' };

const SIGN = (n: number) => n < 0 ? `−${-n}` : `+${n}`;

export class RollRowView {
  #w: RollRowWith;
  #row: HTMLElement;
  #info: HTMLElement;
  #menu: HTMLElement;
  #waiting = false;

  constructor(w: RollRowWith) {
    this.#w = w;
    const doc = document;
    this.#row = doc.createElement('div');
    this.#row.className = 'roller';
    this.#info = doc.createElement('span');
    this.#info.className = 'rollinfo';
    this.#menu = doc.createElement('div');
    this.#menu.className = 'advmenu';
    this.#menu.hidden = true;
    doc.addEventListener('pointerdown', e => {
      if (!this.#menu.hidden && !(e.target as HTMLElement).closest?.('.advmenu, .white')) this.#menu.hidden = true;
    }, true);
    w.game.listen(() => this.render());
    this.render();
  }

  #set(r: Roller | null): void {
    const was = this.#w.roller();
    this.#w.keep(r);
    // R362, R353: the card the row's action suffers follows the row.
    const card = onceCard(this.#w.game, was, r, this.#w.mint);
    if (card) this.#w.game.change(card);
    this.#w.redraw([...new Set([was?.pool, r?.pool].filter((x): x is Oid => !!x))]);
    this.render();
  }

  // R353: a roll that went through used up the card its action suffered, so the row starts fresh.
  /** After a roll that went through. */
  rolled(): void {
    const r = this.#w.roller(), c = r?.action ? this.#w.game.get(ridOf(r.pool)) as Character | undefined : undefined;
    const act = c?.kind === 'character' ? actionOf(c, r!.action) : null;
    if (act && suffers(c!.front, act.label)) this.#set(cleared(r!));
  }

  /** A player's roll is waiting on the GM's page (R102). */
  waiting(on: boolean): void { this.#waiting = on; this.render(); }

  /** The die by a pool's name docked here (R68, R69). */
  dock(oid: Oid): void { this.#set(dock(this.#w.roller(), oid)); }

  /** An action's die (R76): false when the viewer can't roll for that character. */
  action(oid: Oid, label: string, alt?: string): boolean {
    const c = this.#w.game.get(ridOf(oid)) as Character | undefined;
    if (!rollsFor(this.#w.viewer, c)) return false;
    const r = this.#w.roller(), name = alt ?? label;
    this.#set(withAction(r?.pool === oid ? r : dock(r, oid), label, alt, this.#w.remembered(oid, name), skillNamed(c!.front, name)));
    return true;
  }

  /** The action in use on this character, for its swish (R77). */
  inUse(oid: Oid): string | null {
    const r = this.#w.roller();
    return r?.pool === oid && r.action ? r.action : null;
  }

  render(): void {
    const { game, viewer } = this.#w;
    let r = this.#w.roller();
    const c = r ? game.get(ridOf(r.pool)) as Character | undefined : undefined;
    // R70: the row leaves a pool its viewer stops owning.
    if (r && !rollsFor(viewer, c)) { this.#w.keep(null); this.#w.redraw([r.pool]); r = null; }
    const mat = r ? this.#w.pool(r.pool) : undefined;
    if (!r || !mat) { this.#row.remove(); this.#info.remove(); this.#menu.remove(); return; }
    const hd = mat.querySelector('.hd')!;
    if (this.#row.parentElement !== mat) { hd.after(this.#row); mat.append(this.#menu); }
    if (this.#info.parentElement !== hd) hd.append(this.#info);
    this.#draw(r, shown(game, r));
  }

  #draw(r: Roller, s: Shown): void {
    const doc = this.#row.ownerDocument, die = (c: string, title = '') => {
      const d = doc.createElement('span');
      d.className = `rrdie ${c}`;
      if (title) d.title = title;
      return d;
    };
    const step = (r2: Roller) => this.#set(r2);
    // R72: the White die, with Green or Red and the row's ±1; it opens the Difference menu.
    // R88: the numbers follow the rolling character's owner: a hidden opponent's row is dice only, locked
    // for a player ("set by the GM"); the GM's hover still shows the Difference.
    const hidden = !!s.vs && !s.vs.sees, gm = !!this.#w.viewer?.gm, locked = hidden && !gm;
    const white = doc.createElement('span');
    white.className = locked ? 'white locked' : 'white';
    white.title = locked ? `${diceOnly(s.row)} (set by the GM)` : `Difference ${rowWords(s.row)}. Click to choose the row.`;
    white.append(die('W'));
    if (s.row.die) white.append(die(s.row.die));
    if (s.row.mod || s.row.auto) {
      const mod = doc.createElement('span');
      mod.className = s.row.auto ? 'mod outclass' : 'mod';
      mod.textContent = s.row.auto ? s.row.words : (s.row.mod > 0 ? '+1' : '−1');
      white.append(mod);
    }
    gesture(white, { click: () => { if (!locked) this.#openMenu(r, s.row.key); } });
    // R73: Yellows and bonus; with none, a dashed ghost and a faint +0 (R274).
    const ys = doc.createElement('span');
    ys.className = 'ydice';
    ys.title = 'Yellow dice: click to add one, shift-click to remove one';
    ys.append(...(s.yellows ? Array.from({ length: s.yellows }, () => die('Y')) : [die('ghost')]));
    gesture(ys, { click: () => step(handStep(r, 'yellows', 1)), shift: () => step(handStep(r, 'yellows', -1)) });
    const b = doc.createElement('span');
    b.className = s.bonus ? 'bonus' : 'bonus zero';
    b.textContent = SIGN(s.bonus);
    b.title = 'Success Bonus: click to raise, shift-click to lower';
    gesture(b, { click: () => step(handStep(r, 'bonus', 1)), shift: () => step(handStep(r, 'bonus', -1)) });
    const parts: HTMLElement[] = [white, die('B', 'Blue: always rolled'), ys, b];
    // R319, R321: the type tag, before Roll: what the roll is; a click opens the list.
    const type = r.type ?? '?', t = doc.createElement('button');
    t.className = type === '?' ? 'rtype unsaid' : 'rtype';
    t.textContent = TAG_WORDS[type] ?? TYPE_WORDS[type];
    t.title = type === '?' ? "What is this roll? Click to say. A roll that doesn't say can't be aimed at anyone."
      : `This roll is ${TYPE_WORDS[type]}. Click to change it.`;
    gesture(t, { click: e => this.#types(r, e) });
    parts.push(t);
    // R275: the GM's private switch.
    if (this.#w.viewer?.gm) {
      const p = doc.createElement('button');
      p.className = r.priv ? 'priv on' : 'priv';
      p.textContent = r.priv ? 'private' : 'to table';
      p.title = r.priv ? 'Behind the screen: this roll prints on your tape only. Click to show rolls to the table.'
        : 'Rolls go to everyone at the table (what they would see: the dice and the result). Click to roll behind the screen.';
      gesture(p, { click: () => step({ ...r, priv: !r.priv }) });
      parts.push(p);
    }
    // R102: while a player's roll waits on the GM's page, Roll reads "GM…".
    // R345: a roll with an action waits until it is aimed.
    const roll = doc.createElement('button'), why = waits(r);
    roll.className = 'roll';
    roll.textContent = this.#waiting ? 'GM…' : 'Roll';
    roll.disabled = this.#waiting || !!why;
    if (this.#waiting) roll.title = "Waiting for the GM's page to roll";
    else if (why) roll.title = why;
    gesture(roll, { click: () => { if (!this.#waiting) this.#w.roll(r); } });
    parts.push(roll);
    this.#row.replaceChildren(...parts);
    // R78, R79: the action in the header, its Base and Total Influence; the breakdown on hover; a click clears it.
    this.#info.replaceChildren();
    if (s.label) {
      const base = doc.createElement('span'), n = doc.createElement('b');
      base.className = 'base';
      n.textContent = s.total !== s.base ? `${s.base} → ${s.total}` : String(s.base);
      base.append(s.label, n);
      const breakdown = Object.entries(s.parts).filter(([k, v]) => k !== 'base' && v).map(([k, v]) => `${k[0]!.toUpperCase()}${k.slice(1)} ${SIGN(v)}`);
      base.title = `Total Influence ${s.total}: Base ${s.base}${breakdown.length ? `, ${breakdown.join(', ')}` : ''}. Click to clear.`;
      gesture(base, { click: () => step(cleared(r)), drag: (d, m) => this.#aim(r, d, m) });
      this.#info.append(base);
    }
    // R86, R88: the opponent; the numbers only for whoever the owner's view allows; a click stops aiming.
    if (s.vs) {
      const vs = doc.createElement('span'), shows = s.vs.sees || this.#w.viewer?.gm;
      vs.className = 'vs';
      vs.append(`vs ${s.vs.name}`);
      if (s.vs.sees) { const n = doc.createElement('b'); n.textContent = ` ${s.vs.total < 0 ? `−${-s.vs.total}` : s.vs.total} (${SIGN(s.vs.diff)})`; vs.append(n); }
      if (s.vs.oid === WORLD) vs.title = shows ? `The world: the GM's number in the tray, ${s.vs.total}. Difference ${SIGN(s.vs.diff)}. Click to stop aiming.`
        : "Only the GM knows the world's number. Click to stop aiming.";
      else vs.title = shows ? `${s.vs.name}: ${s.vs.words ?? `${r.defend} Defend`}, plus Main, Edge, Bias, Affliction, Injury and Stagger = ${s.vs.total}. Difference ${SIGN(s.vs.diff)}. Click to stop aiming.`
        : `Only the GM knows ${s.vs.name}'s numbers. Click to stop aiming.`;
      gesture(vs, { click: () => step(unaimed(r)) });
      this.#info.append(vs);
    }
    // R86: the current opponent's pool is ringed, with ⌖ by their name.
    // R350: aimed at the world, its mark in the bar wears the ring.
    for (const p of doc.querySelectorAll('.pool.targeted')) p.classList.remove('targeted');
    if (s.vs && s.vs.oid !== WORLD) this.#w.pool(s.vs.oid)?.classList.add('targeted');
    this.#w.tray.ring(s.vs?.oid === WORLD);
  }

  // R83, R87, R277: drag from the Base onto another character: the pool under the pointer is outlined,
  // the pointing hand holds; let go to aim, through the Defend chooser when they have two.
  // R326, R336, R329: a line runs from the press to the pointer, and the box goes round the number,
  // Field or Skill under it on the target's card front; a drop there aims at it, with no chooser.
  #aim(r: Roller, down: PointerLike, move: PointerLike): void {
    const doc = this.#row.ownerDocument, body = doc.body;
    const under = (e: PointerLike): { oid: Opponent; point?: Point; text?: HTMLElement } | null => {
      const els = doc.elementsFromPoint?.(e.clientX, e.clientY) ?? [], top = els[0] as HTMLElement | undefined;
      // R349: the tray, or open table (nothing but the table and its layer under the pointer), is the world.
      if (top && (top.closest?.('.oppo') || top.id === 'table' || top.id === 'world')) return { oid: WORLD };
      for (const el of els) {
        const hit = (el as HTMLElement).closest?.<HTMLElement>('.pool, .obj.card');
        const rid = hit?.dataset.rid;
        if (!rid) continue;
        const oid = rid.slice(2), text = hit!.matches('.obj.card:not(.flipped)') ? hit!.querySelector<HTMLElement>('.front > .text') : null;
        const c = this.#w.game.get(ridOf(oid)) as Character | undefined;
        const at = text && c?.kind === 'character' ? caretIn(text, e) : null;
        const point = at ? points(c!.front).find(p => p.line === at.line && p.start <= at.offset && at.offset <= p.end) : undefined;
        return point ? { oid, point, text: text! } : { oid };
      }
      return null;
    };
    const box = doc.createElement('div'), svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'), line = doc.createElementNS(svg.namespaceURI, 'line');
    box.id = 'aimbox';
    box.hidden = true;
    svg.id = 'aimline';
    line.setAttribute('x1', String(down.clientX));
    line.setAttribute('y1', String(down.clientY));
    svg.append(line);
    body.append(svg, box);
    let lit: HTMLElement | undefined;
    const light = (e: PointerLike) => {
      line.setAttribute('x2', String(e.clientX));
      line.setAttribute('y2', String(e.clientY));
      const t = under(e), oid = t && t.oid !== r.pool ? t.oid : null;
      lit?.classList.remove('aimed');
      lit = undefined;
      box.hidden = true;
      if (!oid) return;
      const rect = oid === WORLD ? this.#w.tray.mark()?.getBoundingClientRect()
        : t!.point ? rangeOf(t!.text!, t!.point)?.getBoundingClientRect() : undefined;
      if (rect) {
        Object.assign(box.style, { left: `${rect.left - 3}px`, top: `${rect.top - 2}px`, width: `${rect.width + 6}px`, height: `${rect.height + 4}px` });
        box.hidden = false;
      } else {
        lit = this.#w.pool(oid);
        lit?.classList.add('aimed');
      }
    };
    body.classList.add('tapping', 'dragging');
    doc.getSelection()?.removeAllRanges();
    const onMove = (ev: Event) => light(ev as PointerLike);
    const onUp = (ev: Event) => {
      const e = ev as PointerLike;
      if (e.pointerId !== down.pointerId) return;
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      body.classList.remove('tapping', 'dragging');
      lit?.classList.remove('aimed');
      box.remove();
      svg.remove();
      const t = under(e), viewer = this.#w.viewer;
      // R349: at the world: not a `?` roll, and not while the tray is blank.
      if (t?.oid === WORLD) {
        if ((r.type ?? '?') === '?') { this.#note('Say what this roll is first.', e); return; }
        if (!(this.#w.game.get('world') as World | undefined)?.set) {
          this.#note(viewer?.gm ? "Put the world's number in the tray first." : "The GM hasn't given the world a number yet.", e);
          return;
        }
        this.#set(aimed(r, WORLD, 'mental'));
        return;
      }
      const opp = t && t.oid !== r.pool ? this.#w.game.get(ridOf(t.oid)) as Character | undefined : undefined;
      if (opp?.kind !== 'character') return;
      if (!viewer?.gm && !canSee(viewer, opp)) { this.#note(`Only the GM can aim at ${opp.name}.`, e); return; }
      // R346: a roll that doesn't say what it is can't be aimed; an Attack goes at its own Defend.
      if ((r.type ?? '?') === '?') { this.#note('Say what this roll is first.', e); return; }
      // R326, R336: pointed at, it is the opposition; a Defend number also sets the Defend kind.
      const byType = r.type === 'psych' ? 'psych' : 'mental';
      // R365: a Skill roll at a Defend aims as asked, with a reminder at the pointer.
      const remind = () => { if (r.type === 'skill') this.#note('A Skill or Attribute normally opposes a Skill.', e); };
      if (t!.point) {
        const a = t!.point.against;
        this.#set(aimed(r, opp.oid, 'def' in a ? a.def : byType, a));
        if ('def' in a) remind();
        return;
      }
      if (isAttack(r.type!)) { this.#set(aimed(r, opp.oid, byType)); return; }
      const def = defendOf(opp);
      if (!def || def.mental === def.psych) { this.#set(aimed(r, opp.oid, 'mental')); remind(); return; }
      this.#choose(opp, def, e, kind => { this.#set(aimed(r, opp.oid, kind)); remind(); });
    };
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    onMove(move);
  }

  /** A small box at the pointer: a note that goes after about 2 s, or the Defend chooser (R87, R277). */
  #box(at: PointerLike): HTMLElement {
    const doc = this.#row.ownerDocument;
    doc.querySelector('#defchoice')?.remove();
    const box = doc.createElement('div');
    box.id = 'defchoice';
    box.style.left = `${Math.min(at.clientX + 8, innerWidth - 260)}px`;
    box.style.top = `${Math.min(at.clientY + 8, innerHeight - 120)}px`;
    doc.body.append(box);
    const close = (e: Event) => {
      if (e.type === 'keydown' ? (e as KeyboardEvent).key !== 'Escape' : box.contains(e.target as Node)) return;
      box.remove();
      doc.removeEventListener('pointerdown', close, true);
      doc.removeEventListener('keydown', close);
    };
    doc.addEventListener('pointerdown', close, true);
    doc.addEventListener('keydown', close);
    return box;
  }

  #note(text: string, at: PointerLike): void {
    const box = this.#box(at), p = box.ownerDocument.createElement('p');
    p.textContent = text;
    box.append(p);
    setTimeout(() => box.remove(), 2200);
  }

  // R319, R364: the list of types at the tag; a choice is kept for this action on this card.
  #types(r: Roller, at: PointerLike): void {
    const box = this.#box(at), doc = box.ownerDocument;
    box.classList.add('types');
    for (const type of ROLL_TYPES) {
      const b = doc.createElement('button');
      b.textContent = TYPE_WORDS[type];
      if (type === (r.type ?? '?')) b.className = 'on';
      b.addEventListener('click', () => {
        box.remove();
        if (r.action) this.#w.remember(r.pool, r.alt ?? r.action, type);
        this.#set(typed(r, type));
      });
      box.append(b);
    }
    box.querySelector<HTMLElement>('button.on')?.focus();
  }

  #choose(opp: Character, def: Defend, at: PointerLike, pick: (kind: 'mental' | 'psych') => void): void {
    const box = this.#box(at), doc = box.ownerDocument, p = doc.createElement('p');
    p.textContent = `Against ${opp.name}'s Defend`;
    box.append(p);
    for (const kind of ['mental', 'psych'] as const) {
      const b = doc.createElement('button');
      b.textContent = `${kind === 'mental' ? 'Mental' : 'Psych'} ${def[kind]}`;
      b.addEventListener('click', () => { box.remove(); pick(kind); });
      box.append(b);
    }
    box.querySelector('button')?.focus();
  }

  // R72: each row, its words first and its dice at the right; picking one sets the row.
  #openMenu(r: Roller, current: string): void {
    const doc = this.#menu.ownerDocument;
    if (!this.#menu.hidden) { this.#menu.hidden = true; return; }
    this.#menu.replaceChildren(...ADV.map(row => {
      const b = doc.createElement('button'), words = doc.createElement('span'), dice = doc.createElement('span');
      b.className = row.key === current ? 'on' : '';
      words.textContent = rowWords(row).split(': ')[0]!;
      dice.className = 'dice';
      dice.textContent = row.auto ? `auto ${row.auto === 'success' ? '✓' : '✗'}` : diceOnly(row);
      b.append(words, dice);
      gesture(b, { click: () => { this.#menu.hidden = true; this.#set(picked(r, row.key)); } });
      return b;
    }));
    this.#menu.hidden = false;
  }
}


// R326, R336: where the pointer is in a card's text: which line (each is a div) and how far into its text.
function caretIn(text: HTMLElement, e: PointerLike): { line: number; offset: number } | null {
  const doc = text.ownerDocument as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  const pos = doc.caretPositionFromPoint?.(e.clientX, e.clientY);
  const range = pos ? null : doc.caretRangeFromPoint?.(e.clientX, e.clientY);
  const node = pos?.offsetNode ?? range?.startContainer, offset = pos?.offset ?? range?.startOffset;
  if (!node || offset === undefined || !text.contains(node)) return null;
  const lines = [...text.children], line = lines.findIndex(l => l.contains(node));
  if (line < 0) return null;
  const upTo = doc.createRange();
  upTo.setStart(lines[line]!, 0);
  upTo.setEnd(node, offset);
  return { line, offset: upTo.toString().length };
}

// R329: the run of a card's text a point covers, as a Range, for the box round it.
function rangeOf(text: HTMLElement, p: Point): Range | null {
  const div = text.children[p.line];
  if (!div) return null;
  const doc = text.ownerDocument, walk = doc.createTreeWalker(div, NodeFilter.SHOW_TEXT), range = doc.createRange();
  let seen = 0, started = false;
  for (let n = walk.nextNode() as globalThis.Text | null; n; n = walk.nextNode() as globalThis.Text | null) {
    if (!started && p.start <= seen + n.length) { range.setStart(n, p.start - seen); started = true; }
    if (started && p.end <= seen + n.length) { range.setEnd(n, p.end - seen); return range; }
    seen += n.length;
  }
  return null;
}
