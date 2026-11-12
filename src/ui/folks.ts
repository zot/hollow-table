// CRC: crc-Folks.md | R14, R153, R154, R158, R161, R163, R168, R293, R294
// The people at the table, in the bar: a name tag each, the GM's invite, and the real GM's "You are".
// Who is shown and in what order is pure (tags); the view draws it once a second and on changes.

import type { Role } from '../net/presence.ts';
import { gesture } from './gesture.ts';

export type Tag = {
  name: string; gm: boolean; you: boolean; live: boolean; stale: boolean;
  /** R293: red, no dot: someone came as a name another browser holds; or this page is offline. */
  warn?: 'impostor' | 'offline';
  tab?: string; browser?: string;
};

/** This page: its dot lit while live; offline, with why, after 15 s unreachable (R163). */
export type Me = { name: string; gm: boolean; live: boolean; why?: string };

export type Here = { tab: string; name: string; role: Role; browser: string; stale: boolean };

// R293: the GM first, then you, then everyone else alphabetically; on the GM's page someone holding
// a name another browser holds is red; an offline page says so.
export function tags(me: Me, people: Here[], held: (name: string) => string | undefined = () => undefined): Tag[] {
  const mine: Tag = { name: me.name, gm: me.gm, you: true, live: me.live, stale: false, ...(me.why !== undefined && { warn: 'offline' as const }) };
  const others: Tag[] = people.map(p => {
    const holder = held(p.name), impostor = me.gm && p.role === 'player' && holder !== undefined && holder !== p.browser;
    return { name: p.name, gm: p.role === 'gm', you: false, live: !p.stale, stale: p.stale, tab: p.tab, browser: p.browser,
      ...(impostor && { warn: 'impostor' as const }) };
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

// R294: arriving by an invite asks until the name isn't "GM" (or blank); cancel is "Player".
/** The name an answer gives, or null to ask again. */
export function arrivalName(answer: string | null): string | null {
  if (answer === null) return 'Player';
  const name = answer.trim().slice(0, NAME_MAX);
  return name && name !== 'GM' ? name : null;
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
      e.className = `tag${t.live ? ' live' : ''}${t.stale ? ' stale' : ''}${t.gm ? ' gm' : ''}${t.you ? ' you' : ''}${t.warn ? ' warn' : ''}`;
      e.textContent = t.warn === 'offline' ? 'offline' : t.name;
      if (t.warn === 'offline') e.title = me.why ?? 'Offline';
      else if (t.warn === 'impostor') {
        e.title = `${t.name}, from another computer than the one that holds ${t.name}. They see only what anyone sees. Click to hand ${t.name} to them.`;
        e.addEventListener('click', () => {
          if (confirm(`${t.name} is held by another computer. Hand ${t.name} to this one?\n\nThe other one will see ${t.name}'s things as a stranger does.`)) this.#w.handOver?.(t.name, t.browser!);
        });
      } else if (t.you) {
        e.title = me.gm ? 'You, the GM. Click to change the name players see.' : 'You';
        if (me.gm) e.addEventListener('click', () => this.#w.rename?.());
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
