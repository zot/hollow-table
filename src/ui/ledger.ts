// CRC: crc-Ledger.md | R132, R133, R134, R139, R141, R291
// The Ledger: a green cloth-bound book between the register and Boot Hill, opening to a ruled page
// with the game's name, the save status, the actions written on it, the checkpoints and the games.
// The words are pure (stamp, offer, named, newGame); the view draws the page and does the asking.

import type { CheckpointInfo, GameInfo } from '../store/gamestore.ts';
import { gesture } from './gesture.ts';

const time = (at: number) => new Date(at).toTimeString().slice(0, 8);

/** A ledger entry's date: "Nov 12, 14:03:22". */
export function stamp(at: number): string {
  return `${new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric' })}, ${time(at)}`;
}

// R291: Checkpoint offers "Round N, hh:mm:ss"; blank is "Checkpoint"; cancel makes none.
export function offer(round: number, now: number): string { return `Round ${round}, ${time(now)}`; }
export function named(answer: string | null): string | null {
  return answer === null ? null : answer.trim() || 'Checkpoint';
}

// R133, R291: New game asks nothing.
export function newGame(now: number): string { return `New game ${stamp(now)}`; }

export type LedgerWith = {
  /** A player's copy: only the name, the status and Export (R141). */
  player: boolean;
  now: () => number;
  round: () => number;
  current: () => GameInfo;
  status: () => string;
  rename: (name: string) => Promise<void>;
  checkpoints: () => Promise<CheckpointInfo[]>;
  games: () => Promise<GameInfo[]>;
  checkpoint: (name: string) => Promise<unknown>;
  restore: (id: string) => Promise<void>;
  /** Puts another game on the table (this one is saved first). */
  open: (id: string) => Promise<void>;
  newGame: (name: string) => Promise<void>;
  /** The export's file name and text. */
  exported: () => Promise<{ filename: string; text: string }>;
  /** Imports a file as a new game and opens it; throws when it isn't a game file. */
  imported: (text: string) => Promise<void>;
};

export class LedgerView {
  #w: LedgerWith;
  #book: HTMLButtonElement;
  #page: HTMLElement;
  #status: HTMLElement;
  #said: string | null = null;
  #tick: ReturnType<typeof setInterval> | null = null;

  constructor(bar: HTMLElement, root: HTMLElement, w: LedgerWith) {
    this.#w = w;
    const doc = bar.ownerDocument;
    // R291: green cloth with "Ledger" up the spine.
    this.#book = doc.createElement('button');
    this.#book.id = 'ledgerbtn';
    this.#book.title = 'The Ledger: this game, its checkpoints, and your other games';
    const spine = doc.createElement('span');
    spine.textContent = 'Ledger';
    this.#book.append(spine);
    bar.append(this.#book);
    this.#page = doc.createElement('div');
    this.#page.id = 'ledger';
    this.#page.hidden = true;
    this.#status = doc.createElement('p');
    this.#status.className = 'status';
    root.append(this.#page);
    gesture(this.#book, { click: () => this.#page.hidden ? this.show() : this.hide() });
    // R291: a press anywhere else closes it.
    doc.addEventListener('pointerdown', e => {
      if (!this.#page.hidden && !(e.target as HTMLElement).closest?.('#ledger, #ledgerbtn')) this.hide();
    }, true);
  }

  hide(): void {
    this.#page.hidden = true;
    if (this.#tick !== null) clearInterval(this.#tick);
    this.#tick = null;
  }

  async show(): Promise<void> {
    this.#page.hidden = false;
    this.#tick ??= setInterval(() => this.#showStatus(), 1000);
    await this.render();
  }

  #showStatus(): void { this.#status.textContent = this.#said ?? this.#w.status(); }

  /** Says something in the status line until the page is drawn again ("Not a game file: …"). */
  #say(words: string): void { this.#said = words; this.#showStatus(); }

  async render(): Promise<void> {
    const w = this.#w, doc = this.#page.ownerDocument, cur = w.current();
    const [cps, games] = w.player ? [[], []] : await Promise.all([w.checkpoints(), w.games()]);
    const el = (tag: string, cls: string, text = '', title = '') => {
      const e = doc.createElement(tag);
      e.className = cls;
      e.textContent = text;
      if (title) e.title = title;
      return e;
    };
    const name = doc.createElement('input');
    name.className = 'gname';
    name.spellcheck = false;
    name.value = cur.name;
    name.setAttribute('aria-label', 'Game name');
    name.readOnly = w.player;
    name.addEventListener('change', () => { const n = name.value.trim(); if (n) void w.rename(n); else name.value = w.current().name; });
    // R132: the actions are written on the page.
    const acts = el('div', 'acts');
    const act = (text: string, title: string, fn: () => unknown) => {
      const a = el('button', 'act', text, title);
      gesture(a, { click: () => void fn() });
      acts.append(a);
    };
    if (!w.player) act('Checkpoint', 'Save a named copy of the table as it is now', async () => {
      const n = named(prompt('Name this checkpoint', offer(w.round(), w.now())));
      if (n === null) return;
      await w.checkpoint(n);
      await this.render();
    });
    act('Export', 'Download this game, with its checkpoints and images, as one file', async () => {
      const { filename, text } = await w.exported();
      const a = doc.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    const picker = doc.createElement('input');
    picker.type = 'file';
    picker.accept = '.json,application/json';
    picker.hidden = true;
    picker.addEventListener('change', async () => {
      const f = picker.files?.[0];
      picker.value = '';
      if (f) await w.imported(await f.text()).catch(() => this.#say(`Not a game file: ${f.name}`));
    });
    if (!w.player) {
      act('Import', 'Open a game file as a new game', () => picker.click());
      act('New game', 'Start a new, empty table', () => w.newGame(newGame(w.now())));
    }
    this.#said = null;
    this.#showStatus();
    const parts: Node[] = [name, acts, this.#status, picker];
    if (w.player) {
      parts.splice(2, 0, el('p', 'copy', "The GM's page holds this game. This browser keeps a copy so a reload shows the table at once; the GM checkpoints and restores."));
    } else {
      // R134, R291: checkpoints newest first, the automatic ones in grey; clicking restores.
      const list = el('div', 'entries');
      if (!cps.length) list.append(el('p', 'none', 'None yet. End makes one at the end of every conflict.'));
      for (const c of cps) {
        const b = this.#entry(c.name, c.at, `entry${c.auto ? ' auto' : ''}`,
          'Restore the table to this checkpoint. The table as it stands is checkpointed first, so this can be undone.');
        gesture(b, { click: async () => { await w.restore(c.id); await this.render(); } });
        list.append(b);
      }
      // The games, the one on the table greyed.
      const gl = el('div', 'entries');
      for (const g of games) {
        const here = g.id === cur.id, b = this.#entry(g.name, g.opened, `entry${here ? ' current' : ''}`,
          here ? 'The game on the table' : 'Put this game on the table (this one is saved as it is)');
        if (!here) gesture(b, { click: () => void w.open(g.id) });
        else (b as HTMLButtonElement).disabled = true;
        gl.append(b);
      }
      parts.push(el('h4', '', 'Checkpoints'), list, el('h4', '', 'Games'), gl);
    }
    this.#page.replaceChildren(...parts);
  }

  #entry(text: string, at: number, cls: string, title: string): HTMLElement {
    const doc = this.#page.ownerDocument, b = doc.createElement('button'), span = doc.createElement('span'), t = doc.createElement('time');
    b.className = cls;
    b.title = title;
    span.textContent = text;
    t.textContent = stamp(at);
    b.append(span, t);
    return b;
  }
}
