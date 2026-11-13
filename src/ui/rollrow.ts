// CRC: crc-RollRow.md | R67, R68, R69, R70, R71, R72, R73, R76, R78, R79, R80, R81, R82, R274, R275, R276, R83, R84, R85, R86, R87, R88, R277
// The dice you're about to roll, docked on the pool you roll for, in your view only (the Seat).
// The decisions are pure (dock, action, hand, row, numbers); the view below draws them.

import type { Game } from '../model/game.ts';
import { GM, OPEN, ridOf, type Character, type Oid } from '../model/records.ts';
import { ADV, bonus, opposition, row as rowFor, total, type Row } from '../rules/odds.ts';
import { pools, type Item } from '../rules/pool.ts';
import { action as readAction, defend as readDefend, type Action, type Defend } from '../rules/readmarks.ts';
import { canSee, type Viewer } from '../rules/visibility.ts';
import type { Roller } from '../store/seat.ts';
import { diceOnly, rowWords, type Intent } from '../net/rolls.ts';
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

// R76, R82, R276: an action fills the row; the hand adjustment starts over, and the row starts at
// White unless it is aiming at someone.
export function withAction(r: Roller, label: string): Roller {
  return { ...r, action: label, hand: { yellows: 0, bonus: 0 }, ...(!r.opponent && { row: null, byHand: false }) };
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
export function aimed(r: Roller, opponent: Oid, defend: 'mental' | 'psych'): Roller {
  return { ...r, opponent, defend, row: null, byHand: false };
}
export function unaimed(r: Roller): Roller {
  return { ...r, opponent: null, ...(!r.byHand && { row: null }) };
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
  return { pool: r.pool, action: r.action, vs: r.opponent, defend: r.defend, hand: r.hand, ...row };
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
  vs?: { oid: Oid; name: string; total: number; diff: number; sees: boolean };
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
  const out: Shown = { label: act.label, base: act.base, total: sum.total, parts: sum.parts, yellows: dice.yellows, bonus: dice.bonus, row };
  // R84, R85: against an opponent, the Difference picks the row unless one was picked by hand.
  const opp = r.opponent ? game.get(ridOf(r.opponent)) as Character | undefined : undefined;
  if (opp?.kind !== 'character') return out;
  const against = opposition(defendOf(opp)?.[r.defend] ?? 0, pools(opp.oid, items)).total, diff = sum.total - against;
  return { ...out, row: r.byHand ? row : rowFor(diff), vs: { oid: opp.oid, name: opp.name, total: against, diff, sees: canSee(ownerAsViewer(c!), opp) } };
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
  /** Redraws these characters' cards (the swish, R77). */
  redraw: (oids: Oid[]) => void;
  /** Rolls what the row shows: at once on the GM's page; a request from a player's (R100). */
  roll: (r: Roller) => void;
};

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
    this.#w.redraw([...new Set([was?.pool, r?.pool].filter((x): x is Oid => !!x))]);
    this.render();
  }

  /** A player's roll is waiting on the GM's page (R102). */
  waiting(on: boolean): void { this.#waiting = on; this.render(); }

  /** The die by a pool's name docked here (R68, R69). */
  dock(oid: Oid): void { this.#set(dock(this.#w.roller(), oid)); }

  /** An action's die (R76): false when the viewer can't roll for that character. */
  action(oid: Oid, label: string): boolean {
    const c = this.#w.game.get(ridOf(oid)) as Character | undefined;
    if (!rollsFor(this.#w.viewer, c)) return false;
    const r = this.#w.roller();
    this.#set(withAction(r?.pool === oid ? r : dock(r, oid), label));
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
    const roll = doc.createElement('button');
    roll.className = 'roll';
    roll.textContent = this.#waiting ? 'GM…' : 'Roll';
    roll.disabled = this.#waiting;
    if (this.#waiting) roll.title = "Waiting for the GM's page to roll";
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
      vs.title = shows ? `${s.vs.name}: ${r.defend} Defend, plus Main, Edge, Bias, Affliction, Injury and Stagger = ${s.vs.total}. Difference ${SIGN(s.vs.diff)}. Click to stop aiming.`
        : `Only the GM knows ${s.vs.name}'s numbers. Click to stop aiming.`;
      gesture(vs, { click: () => step(unaimed(r)) });
      this.#info.append(vs);
    }
    // R86: the current opponent's pool is ringed, with ⌖ by their name.
    for (const p of doc.querySelectorAll('.pool.targeted')) p.classList.remove('targeted');
    if (s.vs) this.#w.pool(s.vs.oid)?.classList.add('targeted');
  }

  // R83, R87, R277: drag from the Base onto another character: the pool under the pointer is outlined,
  // the pointing hand holds; let go to aim, through the Defend chooser when they have two.
  #aim(r: Roller, down: PointerLike, move: PointerLike): void {
    const doc = this.#row.ownerDocument, body = doc.body;
    const under = (e: PointerLike): Oid | null => {
      for (const el of doc.elementsFromPoint?.(e.clientX, e.clientY) ?? []) {
        const rid = (el as HTMLElement).closest?.<HTMLElement>('.pool, .obj.card')?.dataset.rid;
        if (rid) return rid.slice(2);
      }
      return null;
    };
    let lit: HTMLElement | undefined;
    const light = (oid: Oid | null) => {
      lit?.classList.remove('aimed');
      lit = oid && oid !== r.pool ? this.#w.pool(oid) : undefined;
      lit?.classList.add('aimed');
    };
    body.classList.add('tapping', 'dragging');
    doc.getSelection()?.removeAllRanges();
    const onMove = (ev: Event) => light(under(ev as PointerLike));
    const onUp = (ev: Event) => {
      const e = ev as PointerLike;
      if (e.pointerId !== down.pointerId) return;
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      body.classList.remove('tapping', 'dragging');
      light(null);
      const oid = under(e), opp = oid && oid !== r.pool ? this.#w.game.get(ridOf(oid)) as Character | undefined : undefined;
      if (opp?.kind !== 'character') return;
      const viewer = this.#w.viewer;
      if (!viewer?.gm && !canSee(viewer, opp)) { this.#note(`Only the GM can aim at ${opp.name}.`, e); return; }
      const def = defendOf(opp);
      if (!def || def.mental === def.psych) { this.#set(aimed(r, opp.oid, 'mental')); return; }
      this.#choose(opp, def, e, kind => this.#set(aimed(r, opp.oid, kind)));
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

