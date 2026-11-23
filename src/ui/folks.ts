// CRC: crc-Folks.md | R14, R153, R154, R158, R161, R163, R167, R168, R293, R294, R296, R445, R469
// The people at the table, in the bar: a name tag each, the GM's invite, and the real GM's "You are".
// Who is shown and in what order is pure (tags); the view draws it once a second and on changes.

import type { Role } from '../net/presence.ts';
import { gesture } from './gesture.ts';

export type Tag = {
  name: string; gm: boolean; you: boolean; live: boolean; stale: boolean;
  /** R293: red, no dot: someone came as a name another browser holds; or this page is offline. */
  warn?: 'impostor' | 'offline' | 'notyours' | 'said';
  /** R445: someone using a name another browser holds, barred on every page (red only on the GM's). */
  impostor?: true;
  tab?: string; browser?: string;
};

/** This page: its dot lit while live; offline, with why, after 15 s unreachable (R163). */
export type Me = { name: string; gm: boolean; live: boolean; why?: string; notYours?: string; /** R469: a refused rename, said on the tag. */ said?: string };

export type Here = { tab: string; name: string; role: Role; browser: string; stale: boolean };

// R293, R445: the GM first, then you, then everyone else alphabetically; someone holding a name
// another browser holds is an impostor on every page, and red on the GM's; an offline page says so.
export function tags(me: Me, people: Here[], held: (name: string) => string | undefined = () => undefined): Tag[] {
  // R167, R296: a page that is nobody says "not yours"; being offline says more.
  const warn = me.why !== undefined ? 'offline' as const : me.notYours !== undefined ? 'notyours' as const : me.said !== undefined ? 'said' as const : undefined;
  const mine: Tag = { name: me.name, gm: me.gm, you: true, live: me.live, stale: false, ...(warn && { warn }) };
  const others: Tag[] = people.map(p => {
    const holder = held(p.name), impostor = p.role === 'player' && holder !== undefined && holder !== p.browser;
    return { name: p.name, gm: p.role === 'gm', you: false, live: !p.stale, stale: p.stale, tab: p.tab, browser: p.browser,
      ...(impostor && { impostor: true as const, ...(me.gm && { warn: 'impostor' as const }) }) };
  });
  const gm = others.filter(t => t.gm), rest = others.filter(t => !t.gm).sort((a, b) => a.name.localeCompare(b.name));
  return me.gm ? [mine, ...rest] : [...gm, mine, ...rest];
}

/** Names are at most 32 characters. */
export const NAME_MAX = 32;

// R293: the GM's rename: blank is "GM", cancel keeps the name.
export function gmName(answer: string | null, was: string): string {
  return answer === null ? was : answer.trim().slice(0, NAME_MAX) || 'GM';
}

// R294: arriving by an invite asks until the name isn't "GM" (or blank); cancel is "Player". R476: a
// name this browser holds, in any case, is that name as held.
/** The name an answer gives, or null to ask again. */
export function arrivalName(answer: string | null, held: string[] = []): string | null {
  if (answer === null) return 'Player';
  const name = answer.trim().slice(0, NAME_MAX);
  if (!name || name === 'GM') return null;
  return held.find(h => h.toLowerCase() === name.toLowerCase()) ?? name;
}

// R153: the GM's "You are" cycles through the GM, the players present and the defaults.
export function viewAsChoices(present: string[], owners: string[]): string[] {
  return [...new Set(['GM', ...present, ...owners, 'Player 1', 'Player 2'])].filter(n => n !== 'open');
}

export type FolksWith = {
  me: () => Me;
  people: () => Here[];
  held: (name: string) => string | undefined;
  /** R161, R293: the GM renames by clicking their own tag. */
  rename?: () => void;
  /** R168: the GM hands a name to the browser now using it. */
  handOver?: (name: string, browser: string) => void;
  /** R157, R158, R294: the GM's table: open it, copy the invite, close it. */
  table?: { opened: () => boolean; open: () => void; invite: () => string; close: () => void };
  /** R153: the real GM's "You are": who this page is viewing as, and changing it. */
  viewAs?: { current: () => string; choices: () => string[]; choose: (name: string) => void };
};

export class FolksView {
  #w: FolksWith;
  #folks: HTMLElement;
  #youAre: HTMLElement;
  #shown = '';

  constructor(folks: HTMLElement, youAre: HTMLElement, w: FolksWith) {
    this.#w = w;
    this.#folks = folks;
    this.#youAre = youAre;
    setInterval(() => this.render(), 1000);
    this.render();
  }

  render(): void {
    const me = this.#w.me(), list = tags(me, this.#w.people(), this.#w.held);
    const key = JSON.stringify([list, this.#w.table?.opened(), this.#w.viewAs?.current()]);
    if (key === this.#shown) return;
    this.#shown = key;
    const doc = this.#folks.ownerDocument;
    this.#folks.replaceChildren(...list.map(t => {
      const e = doc.createElement('span');
      e.className = `tag${t.live ? ' live' : ''}${t.stale ? ' stale' : ''}${t.gm ? ' gm' : ''}${t.you ? ' you' : ''}${t.warn ? ' warn' : ''}${t.impostor ? ' impostor' : ''}`;
      e.textContent = t.warn === 'offline' ? 'offline' : t.warn === 'notyours' ? 'not yours' : t.name;
      if (t.warn === 'offline') e.title = me.why ?? 'Offline';
      else if (t.warn === 'notyours') e.title = me.notYours!;
      else if (t.warn === 'said') { e.title = me.said!; if (this.#w.rename) e.addEventListener('click', () => this.#w.rename?.()); }
      else if (t.warn === 'impostor') {
        e.title = `${t.name}, from another computer than the one that holds ${t.name}. They see only what anyone sees. Click to hand ${t.name} to them.`;
        e.addEventListener('click', () => {
          if (confirm(`${t.name} is held by another computer. Hand ${t.name} to this one?\n\nThe other one will see ${t.name}'s things as a stranger does.`)) this.#w.handOver?.(t.name, t.browser!);
        });
      } else if (t.impostor) e.title = `${t.name}, from another computer than the one that holds ${t.name}. They see only what anyone sees.`;
      else if (t.you) {
        // R293, R469: the GM's tag renames what players see; a player's renames them, everything following.
        e.title = me.gm ? 'You, the GM. Click to change the name players see.' : this.#w.rename ? 'You. Click to change your name.' : 'You';
        if (this.#w.rename) e.addEventListener('click', () => this.#w.rename?.());
      } else e.title = (t.gm ? 'The GM' : 'A player') + (t.stale ? ', not heard from lately' : '');
      return e;
    }));
    const table = this.#w.table;
    if (table) {
      // R157, R158, R294: Open the table, then Copy invite ("Copied"); shift-click closes the table.
      const b = doc.createElement('button');
      b.className = 'invite';
      if (!table.opened()) {
        b.textContent = 'Open the table';
        b.title = 'Start a room for this game, so players can join';
        b.addEventListener('click', () => { table.open(); this.#shown = ''; this.render(); });
      } else {
        const url = table.invite();
        b.textContent = 'Copy invite';
        b.title = `Copy the link players open to join:\n${url}\nShift-click or long-press to close the table.`;
        gesture(b, {
          click: () => void navigator.clipboard?.writeText(url).then(() => {
            b.textContent = 'Copied';
            setTimeout(() => { b.textContent = 'Copy invite'; }, 1200);
          }, () => prompt('Copy the invite link', url)),
          // R14: shift-click or a long press closes the table.
          shift: () => { table.close(); this.#shown = ''; this.render(); },
        });
      }
      this.#folks.append(b);
    }
    // R153: the real GM's "You are", a tag that cycles; a player's page has none (R154).
    const va = this.#w.viewAs;
    this.#youAre.replaceChildren();
    if (va) {
      const label = doc.createElement('small'), b = doc.createElement('button');
      label.textContent = 'You are';
      b.className = 'tag viewas';
      b.textContent = va.current();
      b.title = 'View the table as this person sees it. Click for the next.';
      b.addEventListener('click', () => {
        const all = va.choices(), i = all.indexOf(va.current());
        va.choose(all[(i + 1) % all.length]!);
      });
      this.#youAre.append(label, b);
    }
  }
}
