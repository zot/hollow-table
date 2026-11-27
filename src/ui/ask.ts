// CRC: crc-Ask.md | R601
// The table's question card: what the browser's prompt() and confirm() did, asked on a small card laid
// in the middle of the table, so a browser without dialogs still asks (the Claude Desktop browser has
// none). One question at a time; a second waits behind the first.

let turn: Promise<unknown> = Promise.resolve();

/** Runs `f` once every question before it is answered. */
function next<T>(f: () => Promise<T>): Promise<T> {
  const mine = turn.then(f);
  turn = mine.catch(() => undefined);
  return mine;
}

/** The card: the question, a line to write in when `value` isn't null, then `no` and `yes`. */
function card(doc: Document, question: string, value: string | null, yes: string, no: string): Promise<string | null> {
  return new Promise(done => {
    const veil = doc.createElement('div'), form = doc.createElement('form');
    veil.className = 'askveil';
    form.className = 'askcard';
    const q = doc.createElement('p');
    q.className = 'question';
    q.textContent = question;
    form.append(q);
    let line: HTMLInputElement | null = null;
    if (value !== null) {
      line = doc.createElement('input');
      line.className = 'line';
      line.value = value;
      line.spellcheck = false;
      form.append(line);
    }
    const keys = doc.createElement('div'), cancel = doc.createElement('button'), ok = doc.createElement('button');
    keys.className = 'keys';
    cancel.type = 'button';
    cancel.textContent = no;
    ok.type = 'submit';
    ok.textContent = yes;
    keys.append(cancel, ok);
    form.append(keys);
    veil.append(form);
    const win = doc.defaultView!, off = new AbortController(), { signal } = off;
    const end = (answer: string | null) => { off.abort(); veil.remove(); done(answer); };
    // A press on the card is the card's alone: the window hears it first and keeps it from the page's own
    // "a press elsewhere closes it" (the Ledger asking a checkpoint's name stays open).
    win.addEventListener('pointerdown', e => { if (veil.contains(e.target as Node)) e.stopPropagation(); }, { capture: true, signal });
    // Escape cancels; heard first by the window, so the table's own keys (a carry's Escape, undo) don't
    // hear what the card answers.
    win.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(null); }
      else if (e.key === 'Enter' && !line) { e.preventDefault(); e.stopPropagation(); end(''); }
      else if (!form.contains(e.target as Node)) e.stopPropagation();
    }, { capture: true, signal });
    form.addEventListener('submit', e => { e.preventDefault(); end(line ? line.value : ''); });
    cancel.addEventListener('click', () => end(null));
    doc.body.append(veil);
    if (line) { line.focus(); line.select(); } else ok.focus();
  });
}

/** R601: asks for a line of text, offering `value`; null when cancelled. */
export function ask(doc: Document, question: string, value = ''): Promise<string | null> {
  return next(() => card(doc, question, value, 'OK', 'Cancel'));
}

/** R601: asks yes or no; true on Yes. */
export function askYes(doc: Document, question: string): Promise<boolean> {
  return next(() => card(doc, question, null, 'Yes', 'No')).then(a => a !== null);
}
