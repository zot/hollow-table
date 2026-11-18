// CRC: crc-Connections.md | R407, R411, R414, R415, R416, R417
// The Connection Table's sheet, drawn on the GM's page, and the chooser that writes an NPC's group.

import type { Game } from '../model/game.ts';
import { GM, OPEN, ridOf, type Character, type Connections, type PieceRecord } from '../model/records.ts';
import { LEVELS, cell, groupOf, level, order, rename, set } from '../rules/connections.ts';

type With = { game: Game };

const el = (doc: Document, tag: string, cls?: string, text?: string): HTMLElement => {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const characters = (game: Game) => game.all().map(([, r]) => r as PieceRecord).filter((r): r is Character => r.kind === 'character');
const tableOf = (game: Game, rid: string) => game.get(rid) as Connections | undefined;

/** Sets up the sheet's controls once: a row's name written in place, a cell's Levels. */
export function connections(e: HTMLElement, rid: string, w: With): void {
  const doc = e.ownerDocument;
  // R415: a row's name, written in place, renames it on leaving; cleared, the row goes.
  e.addEventListener('focusout', ev => {
    const th = (ev.target as HTMLElement).closest<HTMLElement>('th.rowname');
    const t = tableOf(w.game, rid);
    if (!th || !t) return;
    const { table, changed } = rename(t, th.dataset.id!, th.textContent ?? '', characters(w.game));
    w.game.change(wr => { wr.put(rid, table); for (const c of changed) wr.put(ridOf(c.oid), c); });
    delete e.dataset.drawn;
    sheet(e, table, w);
  });
  e.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && (ev.target as HTMLElement).closest('th.rowname')) { ev.preventDefault(); (ev.target as HTMLElement).blur(); }
  });
  // R411: a cell opens the Levels, -Exq to +Exq.
  e.addEventListener('click', ev => {
    const td = (ev.target as HTMLElement).closest<HTMLElement>('td.cell');
    e.querySelector('.levels')?.remove();
    if (!td) return;
    const pick = el(doc, 'div', 'levels');
    for (const n of LEVELS) {
      const b = el(doc, 'button', n === 0 ? 'zero' : n > 0 ? 'pos' : 'neg', level(n));
      b.addEventListener('click', ev2 => {
        ev2.stopPropagation();
        const t = tableOf(w.game, rid);
        pick.remove();
        if (t) w.game.change(wr => wr.put(rid, set(t, td.dataset.row!, td.dataset.col!, n)));
      });
      pick.append(b);
    }
    pick.style.left = `${td.offsetLeft}px`;
    pick.style.top = `${td.offsetTop + td.offsetHeight}px`;
    e.append(pick);
  });
}

// R407, R416, R417: a header of names, a row per row by name, an X where a row meets itself, each cell
// its Level; after a thick line, a column for each PC, by name, filled by Opinion Records (none yet).
/** Draws the sheet, unless a row's name is being written. */
export function sheet(e: HTMLElement, t: Connections, w: With): void {
  const doc = e.ownerDocument, key = JSON.stringify([t.rows, t.cells, pcs(w.game).map(c => c.name)]);
  if (e.dataset.drawn === key || (doc.activeElement && e.contains(doc.activeElement))) return;
  e.dataset.drawn = key;
  const rows = order(t.rows), players = pcs(w.game);
  const grid = el(doc, 'table', 'conn'), head = el(doc, 'tr');
  head.append(el(doc, 'th', 'corner'), ...rows.map(r => el(doc, 'th', `col${r.group ? ' group' : ''}`, r.name)),
    ...players.map((c, k) => el(doc, 'th', `col pc${k ? '' : ' first'}`, c.name)));
  grid.append(head);
  for (const r of rows) {
    const tr = el(doc, 'tr'), name = el(doc, 'th', `rowname${r.group ? ' group' : ''}`, r.name);
    name.contentEditable = 'true';
    name.spellcheck = false;
    name.dataset.id = r.id;
    tr.append(name);
    for (const c of rows) {
      if (c === r) { tr.append(el(doc, 'td', 'self', 'X')); continue; }
      const n = cell(t, r.id, c.id), td = el(doc, 'td', `cell${n > 0 ? ' pos' : n < 0 ? ' neg' : ''}`, level(n));
      td.dataset.row = r.id;
      td.dataset.col = c.id;
      tr.append(td);
    }
    tr.append(...players.map((_, k) => el(doc, 'td', `pc${k ? '' : ' first'}`)));
    grid.append(tr);
  }
  const old = e.querySelector('table.conn');
  if (old) old.replaceWith(grid); else e.prepend(grid);
}

/** The PCs: players' characters, by name. */
const pcs = (game: Game) => order(characters(game).filter(c => c.owner !== GM && c.owner !== OPEN));

/** The game's groups: the table's group rows and the groups written on GM cards, by name. */
function groups(game: Game): string[] {
  const names = new Set<string>();
  for (const [, r] of game.all()) {
    const p = r as PieceRecord;
    if (p.kind === 'connections') for (const row of p.rows) if (row.group) names.add(row.name);
    if (p.kind === 'character' && p.owner === GM) { const g = groupOf(p.front); if (g) names.add(g); }
  }
  return order([...names].map(name => ({ name }))).map(g => g.name);
}

/** What has been typed after an open `(` on the first line, or none when no `(` is open. */
function typed(text: HTMLElement): string | undefined {
  const line = (text.innerText.split('\n')[0] ?? ''), open = line.lastIndexOf('(');
  return open >= 0 && !line.slice(open).includes(')') ? line.slice(open + 1) : undefined;
}

// R414: `(` typed on a GM card's first line opens the game's groups under the caret; typing narrows
// them; Enter or a click writes the group, or the name typed when none matches, and closes the `)`.
/** Hooks the group chooser onto a GM card's front. */
export function groupChooser(text: HTMLElement, w: With, gmCard: () => boolean): void {
  const doc = text.ownerDocument;
  let list: HTMLElement | null = null, at = 0;
  const close = () => { list?.remove(); list = null; };
  const choices = () => {
    const so = typed(text) ?? '', all = groups(w.game).filter(g => g.toLowerCase().includes(so.trim().toLowerCase()));
    return { so, all };
  };
  const choose = (name: string) => {
    const { so } = choices();
    close();
    text.focus();
    for (let k = 0; k < so.length; k++) doc.execCommand('delete');
    doc.execCommand('insertText', false, `${name.trim()})`);
  };
  const show = () => {
    if (typed(text) === undefined) { close(); return; }
    const { so, all } = choices(), obj = text.closest('.obj') as HTMLElement;
    if (!list) { list = el(doc, 'div', 'groups'); obj.append(list); }
    at = Math.min(at, Math.max(0, all.length - 1));
    list.replaceChildren(...all.map((g, k) => {
      const b = el(doc, 'button', k === at ? 'on' : '', g);
      b.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); });
      b.addEventListener('click', ev => { ev.stopPropagation(); choose(g); });
      return b;
    }));
    const typedName = so.trim();
    if (typedName && !all.some(g => g.toLowerCase() === typedName.toLowerCase())) list.append(el(doc, 'div', 'new', `New group: ${typedName}`));
    // The list hangs under the caret; a caret at a line's start has no box, so fall back to a corner.
    const box = obj.getBoundingClientRect(), k = box.width / obj.offsetWidth || 1;
    const sel = doc.getSelection(), r = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    const caret = r && r.width + r.height ? r : null;
    list.style.left = `${caret ? (caret.left - box.left) / k : 20}px`;
    list.style.top = `${caret ? (caret.bottom - box.top) / k + 4 : 40}px`;
  };
  text.addEventListener('input', ev => {
    if (!gmCard()) return;
    if ((ev as InputEvent).data === '(' || list) { if ((ev as InputEvent).data === '(') at = 0; show(); }
  });
  text.addEventListener('keydown', ev => {
    if (!list) return;
    const { so, all } = choices();
    if (ev.key === 'Escape') { ev.preventDefault(); close(); }
    else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); at = Math.max(0, Math.min(all.length - 1, at + (ev.key === 'ArrowDown' ? 1 : -1))); show(); }
    else if (ev.key === 'Enter') {
      ev.preventDefault();
      const name = all.length ? all[at] : so;
      if (name?.trim()) choose(name); else close();
    }
  });
  text.addEventListener('focusout', () => close());
}
