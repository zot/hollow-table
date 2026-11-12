// CRC: crc-Tape.md | R105, R106, R107, R109
// One receipt, built from text only: whatever a receipt says arrives as text, never as markup.

import type { Receipt } from '../model/records.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n: number) => String(n).padStart(2, '0');

// R105: the date and time at the upper right, 24-hour with seconds ("Nov 9, 17:57:16").
export function when(at: number): string {
  const d = new Date(at);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}

const DIE = { W: 'White', G: 'Green', R: 'Red', B: 'Blue', Y: 'Yellow' } as const;
const CRIT = { max: 'maximize', dbl: 'double' } as const;

/** A receipt as a slim block of text lines (R109: textContent only). */
export function receiptEl(doc: Document, r: Receipt): HTMLElement {
  const el = doc.createElement('div');
  el.className = 'receipt';
  el.dataset.id = r.id;
  const line = (text: string, cls?: string) => {
    const div = doc.createElement('div');
    if (cls) div.className = cls;
    div.textContent = text;
    el.append(div);
  };
  const head = doc.createElement('div');
  const time = doc.createElement('span');
  time.className = 'when';
  time.textContent = when(r.at);
  head.append(time, `${r.title}${r.ok ? ' ✓' : ''}`);
  el.append(head);
  if (r.outcome === 'missing') return el;
  if (r.priv) line('Private: not shown to the table');
  if (r.by) line(`rolled by ${r.by}`);
  if (r.influence !== undefined) line(`Total Influence ${r.influence}${r.base !== undefined ? ` (base ${r.base})` : ''}`);
  if (r.vs) line(`vs ${r.vs}`);
  if (r.row) line(`row ${r.row}`);
  line(r.dice.map(d => `${DIE[d.c]} ${d.v}${d.dropped ? ' (dropped)' : ''}${d.added ? ' +' : ''}`).join(', '));
  line(r.resolution);
  if (r.crit) {
    for (const k of ['max', 'dbl'] as const) {
      const chosen = r.crit.chosen === k;
      if (r.crit.locked && !chosen) continue;
      let cls = 'other';
      if (chosen) cls = r.crit.locked ? 'chosen punched' : 'chosen';
      line(`${CRIT[k]}: ${r.crit[k]}`, cls);
    }
  }
  line(r.level);
  line(r.outcome, 'outcome');
  return el;
}
