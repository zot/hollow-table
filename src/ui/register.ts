// CRC: crc-Register.md | R99, R112, R115, R116, R117, R262, R284, R338, R344, R492
// The cash register in the bar: the Round in its glass, ▲ ▼, End, and the tape's paper roll. The
// decisions are pure (stepped, ended); the view draws the register and asks before End.

import type { Game, Writer } from '../model/game.ts';
import type { Character, Influence, Meta, PieceRecord } from '../model/records.ts';
import { mildEnds } from '../rules/absorb.ts';
import { mildGone, recharge, rechargeMotives } from '../rules/tap.ts';
import type { Viewer } from '../rules/visibility.ts';
import { gesture } from './gesture.ts';

/** The highest Round (R284). */
export const ROUND_MAX = 99;
/** How long End waits for its second press (R116). */
export const END_MS = 3000;

// R115, R284: ▲ ▼ step the Round, from 0 to 99.
export function stepped(meta: Meta, by: 1 | -1): Meta {
  return { ...meta, round: Math.max(0, Math.min(ROUND_MAX, meta.round + by)) };
}

// R117, R99: End ends the Conflict: the Round to 0, Biases, Afflictions and Injuries recharged, the
// used piles emptied (plain cards home, tapped cards spent and gone), used marks cleared, and CRIT!
// Influences cleared wherever they are; R344: cards tapped from Mild slots lose those Levels. The
// checkpoint comes first, outside this change. R492, R262: a scene's end does all that, and every
// character's Motivations recharge.
export function ended(game: Game, scene = false): (w: Writer) => void {
  return w => {
    const meta = game.get('meta') as Meta;
    w.put('meta', { ...meta, round: 0 });
    for (const [rid, r] of game.all()) {
      const p = r as PieceRecord;
      if (!('kind' in p)) continue;
      // R338: and its Mild slots emptied.
      if (p.kind === 'character') {
        const c = mildEnds(recharge(p as Character));
        w.put(rid, scene ? rechargeMotives(c) : c);
        continue;
      }
      if (p.kind !== 'influence') continue;
      const was = p as Influence;
      if (was.crit || (was.where === 'used' && was.tap)) { w.del(rid); continue; }
      // R344: and what was tapped from a Mild slot goes with it.
      const k = mildGone(was);
      if (!k) w.del(rid);
      else if (k.where === 'used') w.put(rid, { ...k, where: 'drawer', used: false });
      else if (k.used || k !== was) w.put(rid, { ...k, used: false });
    }
  };
}

export type RegisterWith = {
  game: Game; viewer: Viewer;
  /** The GM's page checkpoints before End (R117); players' pages can't press the keys. */
  checkpoint?: (name: string) => Promise<unknown>;
  /** The paper roll: the tape up to a sliver and back (R112). */
  paperRoll: () => void;
};

export class RegisterView {
  #w: RegisterWith;
  #el: HTMLElement;
  #tab: HTMLElement;
  #shown = -1;
  #armed: unknown = null;
  /** R492: what the raised tab offers: the scene's end (armed at Round 0) or the Conflict's. */
  #scene = false;

  constructor(bar: HTMLElement, w: RegisterWith) {
    this.#w = w;
    const doc = bar.ownerDocument, el = (tag: string, cls: string, text = '') => {
      const e = doc.createElement(tag);
      e.className = cls;
      e.textContent = text;
      return e;
    };
    this.#el = el('div', 'register');
    const win = el('div', 'window'), confirm = el('span', 'tab', 'End conflict?');
    this.#tab = el('span', 'rtab');
    win.append(el('small', 'label', 'Round'), this.#tab, confirm);
    const keys = el('div', 'keys'), up = el('button', 'key up', '▲'), down = el('button', 'key down', '▼'), end = el('button', 'key end', 'End');
    const roll = el('button', 'paperroll');
    roll.id = 'paperroll';
    roll.title = 'Roll the tape up, or down again';
    up.title = 'The next Round';
    down.title = 'The Round before';
    end.title = 'End the Conflict: Round to 0, Biases, Afflictions and Injuries recharged, the used piles emptied. At Round 0, end the scene: Motivations recharged too';
    keys.append(up, down, end);
    this.#el.append(el('span', 'rslot'), win, keys, roll);
    bar.append(this.#el);
    const gm = !!w.viewer?.gm && !!w.checkpoint;
    for (const k of [up, down, end]) (k as HTMLButtonElement).disabled = !gm;
    const step = (by: 1 | -1) => w.game.change(x => x.put('meta', stepped(w.game.get('meta') as Meta, by)));
    gesture(up, { click: () => step(1) });
    gesture(down, { click: () => step(-1) });
    // R116: End asks first: the orange tab rises; a second press within 3 s ends the Conflict, or, R492,
    // at Round 0, the scene.
    gesture(end, { click: () => {
      const round = (w.game.get('meta') as Meta).round;
      if (this.#armed === null) {
        this.#scene = round === 0;
        confirm.textContent = this.#scene ? 'End scene?' : 'End conflict?';
        this.#el.classList.add('armed');
        this.#armed = setTimeout(() => { this.#armed = null; this.#el.classList.remove('armed'); }, END_MS);
        return;
      }
      clearTimeout(this.#armed as number);
      this.#armed = null;
      this.#el.classList.remove('armed');
      // R454: End ends whether or not its checkpoint is kept; a refused one is said in the Ledger.
      const scene = this.#scene, end = () => w.game.change(ended(w.game, scene));
      void w.checkpoint?.(scene ? 'End of scene' : `End of conflict, round ${round}`).then(end, end);
    } });
    gesture(roll, { click: () => w.paperRoll() });
    w.game.listen(rids => { if (rids.has('meta')) this.render(); });
    this.render();
  }

  // R284: a changed Round drops its tab and brings it back up with the new number.
  render(): void {
    const round = (this.#w.game.get('meta') as Meta | undefined)?.round ?? 0;
    if (round === this.#shown) return;
    const first = this.#shown < 0;
    this.#shown = round;
    const reduce = this.#el.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (first || reduce) { this.#tab.textContent = String(round); return; }
    this.#tab.classList.add('down');
    setTimeout(() => { this.#tab.textContent = String(round); this.#tab.classList.remove('down'); }, 110);
  }

  /** The register's left edge on screen, for hanging the tape under it (R282). */
  left(): number { return this.#el.getBoundingClientRect().left; }
}

