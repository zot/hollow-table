// CRC: crc-Tape.md | R105, R106, R107, R109, R279, R280, R281
// One receipt, built from text only: whatever a receipt says arrives as text, never as markup.

import type { Die, Receipt } from '../model/records.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n: number) => String(n).padStart(2, '0');

// R105: the date and time at the upper right, 24-hour with seconds ("Nov 9, 17:57:16").
export function when(at: number): string {
  const d = new Date(at);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

const DIE = { W: 'White', G: 'Green', R: 'Red', B: 'Blue', Y: 'Yellow' } as const;
const CRIT = { max: 'maximize', dbl: 'double' } as const;

// R280: a die drawn as a die: its number in its colour; an exploded Yellow dashed, a die removed on a
// Failure faded and struck; titled with its colour and fate; tumbling in after the one before it.
function dieEl(doc: Document, d: Die, k: number): HTMLElement {
  const e = doc.createElement('span');
  e.className = `rdie ${d.c}${d.added ? ' added' : ''}${d.dropped ? ' dropped' : ''}`;
  e.textContent = String(d.v);
  e.title = DIE[d.c] + (d.added ? ', exploded' : '') + (d.dropped ? ', removed on a Failure' : '');
  e.style.animationDelay = `${k * 60}ms`;
  return e;
}

/** A receipt as a slim block of lines in R279's order (R109: textContent only). A lost roll or an
 * error (outcome `missing`) is a short red note with the time (R281). */
export function receiptEl(doc: Document, r: Receipt): HTMLElement {
  const el = doc.createElement('div');
  el.className = r.outcome === 'missing' ? 'receipt note' : 'receipt';
  el.dataset.id = r.id;
  const line = (text: string, cls?: string) => {
    const div = doc.createElement('div');
    if (cls) div.className = cls;
    div.textContent = text;
    el.append(div);
  };
  const head = doc.createElement('div'), title = doc.createElement('span'), time = doc.createElement('span');
  head.className = 'rhead';
  title.className = 'title';
  title.textContent = r.title;
  time.className = 'when';
  time.textContent = when(r.at) + (r.ok ? ' ✓' : '');
  head.append(title, time);
  el.append(head);
  if (r.outcome === 'missing') return el;
  if (r.by) line(`rolled by ${r.by === 'GM' ? 'the GM' : r.by}`, 'by');
  const dice = doc.createElement('div');
  dice.className = 'rdice';
  dice.append(...r.dice.map((d, k) => dieEl(doc, d, k)));
  el.append(dice);
  if (r.influence !== undefined) line(`${r.action ? `${r.action}: ` : ''}Total Influence ${r.influence}${r.base !== undefined ? ` (base ${r.base})` : ''}`);
  else if (r.action) line(r.action);
  if (r.vs) line(`vs ${r.vs}`);
  if (r.row) line(r.row);
  if (r.resolution) line(`Resolution: ${r.resolution}`);
  if (r.level) line(`Level: ${r.level}`);
  if (r.crit) {
    for (const k of ['max', 'dbl'] as const) {
      const chosen = r.crit.chosen === k;
      if (r.crit.locked && !chosen) continue;
      let cls = 'other';
      if (chosen) cls = r.crit.locked ? 'chosen punched' : 'chosen';
      line(`${CRIT[k]}: ${r.crit[k]}`, cls);
    }
  }
  line(r.outcome, 'outcome');
  if (r.priv) line('Private: not shown to the table', 'privnote');
  return el;
}
