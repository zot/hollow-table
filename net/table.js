// The table over the wire: moves, and the GM's page's pieces (slice 3, Bill, 11-10).
//
// The GM's page holds the game. After each save it sends the pieces that changed (`recs`), and a
// player's page shows them. A player's own changes go to the GM's page as `edit`s; it checks them,
// takes them, and they come back to everyone as `recs`. A page that joins, or notices a lost batch,
// asks for the whole table (`sync`). Pieces are HTML records, cleaned on arrival (index.html,
// cleanPiece).
//
// Moves (Bill's design). Every page sends its drags straight to the room: a piece's place about
// every 100 ms while it's in hand, and once more on the drop. Messages from different pages can cross, so each
// command carries its sender's sequence number (one counter per tab, shared by moves and edits). A
// receiver numbers the senders it hears with small integers, so it compares ints rather than peer
// ids, and each piece keeps the highest number it has applied from each sender; anything lower is
// discarded. Received moves are appended to a buffer, and a move actor works through them in
// passes: a pass swaps the two buffers and runs through the one that was filling, newest first. The
// first command to reach a piece in a pass places it; a later (older-arrived) one changes it only if
// it is from the same sender with a higher number. If more arrived meanwhile, the next pass runs on
// the next animation frame, so the network, the user's own events, and the compression all get a
// turn. A hidden tab gets no animation frames, so a timer stands in.
//
// The same per-piece numbers settle the GM's pieces: each one carries who made the change and their
// number, so a slow echo of your own move can't pull a piece back out of your hand.
//
// Uses the page's globals (realMe, world, game, saved, flush, saveSoon, applyPieces, adopt, mayTouch,
// mayBecome, placePiece, objEl, cleanPiece, ownerOf, newOid, inHand) -- this is a sketch.

import { seal, open, ready as keyReady, pub } from './seal.js';

const P = window.presence;
const GM = realMe === 'GM';
const MOVE_MS = 100, PART = 20000, ASK_SYNC_MS = 3000, GAP_WAIT_MS = 1500, RESEND_MS = 3000, TRIES = 5, GM_AWAY_MS = 25000;
const OID = /^o[\w-]{1,16}$/, TAB = /^[\w-]{1,40}$/, RID = /^(o:o[\w-]{1,16}|yards|meta)$/;

/* ---------- numbering ---------- */
// This tab's commands, numbered; a reload continues the count.
let seq = +(sessionStorage.getItem('glimmer.mseq') || 0);
function nextSeq() { seq++; sessionStorage.setItem('glimmer.mseq', String(seq)); return seq; }
// Senders as small local integers.
const peerNo = new Map();
const peerOf = tab => { let n = peerNo.get(tab); if (n === undefined) peerNo.set(tab, n = peerNo.size + 1); return n; };
// rid -> Map(peer int -> highest number applied)
const highest = new Map();
const hi = (rid, peer) => highest.get(rid)?.get(peer) ?? 0;
function mark(rid, peer, s) { let m = highest.get(rid); if (!m) highest.set(rid, m = new Map()); if (s > (m.get(peer) ?? 0)) m.set(peer, s); }
const me = () => peerOf(P.tabId);

/* ---------- sending moves ---------- */
let moveTimer = null, held = [];
const live = () => P.status === 'live';
function sendMoves(els, s = nextSeq()) {
  const items = els.filter(el => el.parentElement === world).map(el => {
    el.dataset.oid ||= newOid();
    return { o: el.dataset.oid, x: Math.round(parseFloat(el.style.left) * 10) / 10, y: Math.round(parseFloat(el.style.top) * 10) / 10, z: +el.style.zIndex || 0 };
  }).filter(i => isFinite(i.x) && isFinite(i.y));
  if (!items.length) return;
  items.forEach(i => mark('o:' + i.o, me(), s));
  if (live()) P.send('move', { move: { s, items } });
}
window.onDragMove = els => {
  held = els;
  if (!moveTimer) moveTimer = setTimeout(() => { moveTimer = null; sendMoves(held); }, MOVE_MS);
};
// A drop is a move too, and gets its number now. What it changed beyond places (a chip into a pool,
// a sticky pinned to a card, a character buried) goes out at once as well, numbered after it.
window.onDragEnd = els => {
  clearTimeout(moveTimer); moveTimer = null;
  sendMoves(els);
  flush();
};

/* ---------- the move actor ---------- */
let filling = [], spare = [], acting = false;
function onMove(p, body, mine, from) {
  const m = body.move;
  if (mine || !m || !Number.isInteger(m.s) || m.s < 1 || !Array.isArray(m.items) || m.items.length > 8) return;
  const peer = peerOf(p.id);
  for (const i of m.items) {
    if (!i || !OID.test(i.o) || ![i.x, i.y].every(v => Number.isFinite(v) && Math.abs(v) < 1e6) || !Number.isInteger(i.z) || i.z < 0 || i.z > 1e7) return;
  }
  const who = GM ? { id: p.id, name: whoIs(p, from) } : p;   // on the GM's page, the name its browser holds
  for (const i of m.items) filling.push({ peer, s: m.s, o: i.o, x: i.x, y: i.y, z: i.z, who });
  if (!acting) { acting = true; nextPass(); }
}
function nextPass() {
  let done = false, raf = 0, t = 0;
  const go = () => { if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(t); pass(); };
  raf = requestAnimationFrame(go);
  t = setTimeout(go, MOVE_MS);                          // a hidden tab gets no frames
}
function pass() {
  const run = filling; filling = spare; spare = run;    // moves arriving now go to the other buffer
  const placed = new Map();                             // oid -> the command that placed it this pass
  for (let k = run.length - 1; k >= 0; k--) {
    const c = run[k], rid = 'o:' + c.o, first = placed.get(c.o);
    if (c.s < hi(rid, c.peer)) continue;                // lower than one already processed from them
    mark(rid, c.peer, c.s);                             // processed, whether or not it wins this pass
    if (first && (first.peer !== c.peer || c.s <= first.s)) continue;
    if (GM && !first && (!c.who.name || !mayTouch(c.who.name, objEl(c.o)))) { mark(rid, c.peer, c.s); refused(rid, c.who.id, c.s); continue; }
    placed.set(c.o, c);
  }
  run.length = 0;
  const changed = [];
  for (const [oid, c] of placed) {
    if (placePiece(oid, c.x, c.y, c.z)) {
      changed.push('o:' + oid);
      if (GM) origin.set('o:' + oid, { t: c.who.id, s: c.s });
    }
  }
  if (!GM) adopt(changed);                              // the GM's page saves (and so sends) them; a player's only keeps them
  if (filling.length) nextPass(); else acting = false;
}

/* ---------- big messages in parts ---------- */
function sendParts(kind, body, target) {             // target: one peer (a Trystero peer id), or everyone
  const text = JSON.stringify(body), k = Math.random().toString(36).slice(2, 10), n = Math.ceil(text.length / PART) || 1;
  for (let i = 0; i < n; i++) P.send(kind, { part: { k, i, n, d: text.slice(i * PART, (i + 1) * PART) } }, target);
}
const partial = new Map();                              // sender tab + k -> { n, got: [], at }
function joinParts(p, part) {
  if (!part || typeof part.k !== 'string' || !Number.isInteger(part.i) || !Number.isInteger(part.n) || part.n < 1 || part.n > 200
    || part.i < 0 || part.i >= part.n || typeof part.d !== 'string') return null;
  if (part.n === 1) { try { return JSON.parse(part.d); } catch { return null; } }
  const key = p.id + '/' + part.k;
  let e = partial.get(key);
  if (!e) partial.set(key, e = { n: part.n, got: new Array(part.n), have: 0, at: Date.now() });
  if (e.got[part.i] === undefined) { e.got[part.i] = part.d; e.have++; }
  for (const [k2, e2] of partial) if (Date.now() - e2.at > 30000) partial.delete(k2);
  if (e.have < e.n) return null;
  partial.delete(key);
  try { return JSON.parse(e.got.join('')); } catch { return null; }
}
function checkBatch(b) {                                // { puts: [{ rid, ..., o: { t, s } }], dels: [{ rid, o }] }
  if (!b || !Array.isArray(b.puts) || !Array.isArray(b.dels)) return null;
  const ok = r => r && RID.test(r.rid) && r.o && TAB.test(r.o.t) && Number.isInteger(r.o.s) && r.o.s >= 0;
  return b.puts.every(ok) && b.dels.every(ok) ? b : null;
}

/* ---------- the GM's page: send pieces, take edits ---------- */
const origin = new Map();       // rid -> { t, s }: who made the latest change, and their number
const LOCAL = new Set(['tape', 'book']);                // each page's own: never sent
let outQ = Promise.resolve();                           // batches leave in order, sealing or not
// Secrets (11-10): every batch carries each piece as someone who owns nothing sees it, and seals,
// for each player's tab, the pieces that tab sees differently. pubHas is what went out to everyone;
// tabs[tab].has is what that tab holds now. Each save compares every piece against both, so a
// character changing hands sends its sheet and cards to whoever may now read them (and the redacted
// ones to whoever may no longer).
const pubHas = new Map(), tabs = new Map();             // tab -> { claimed, peer, key, has: Map(rid -> view) }
function viewOf(rid, j, who, owners) {
  if (rid === 'meta') return j;
  const rec = JSON.parse(j);
  if (rid === 'yards') {
    let changed = false;
    const ys = rec.yards.map(y => ({ ...y, items: y.items.map(i => ({ ...i, html: i.html.map(x => { const r = redact(x, hiddenOf(who, pieceRefs(x), owners)); changed ||= r !== x; return r; }) })) }));
    return changed ? JSON.stringify({ ...rec, yards: ys }) : j;
  }
  const hid = hiddenOf(who, pieceRefs(rec.html), owners);
  return hid.length ? JSON.stringify({ ...rec, html: redact(rec.html, hid) }) : j;
}

/* Who's who (11-10, Bill: "sign claims with peer keys and the GM can arbitrate"; 11-11: the keys are
   each browser's own, net/ident.js). Every connection proves its browser's identity in the
   handshake (net/wire.js), so a message's `from` can't be forged. The first browser to claim a name
   holds it (book.claims, saved with the game); a tab claiming it from another browser is nobody: it
   gets what someone who owns nothing gets, its changes are refused, and the GM's strip marks it, so
   the GM can hand the name over. A tab's sealing key is vouched for in that same handshake, so a
   sealed box reaches only a tab whose browser holds the name. */
const RESERVED = new Set(['GM', '']);
function claimOf(name) {                                // a claim from the Kubo days (a daemon's id) is let go
  const c = book.claims[name];
  if (c !== undefined && !/^[\w-]{20}$/.test(c)) { delete book.claims[name]; return undefined; }
  return c;
}
function whoIs(p, from) {
  if (!GM || p.role !== 'player' || !from || RESERVED.has(p.name)) return null;
  const c = claimOf(p.name);
  if (c === undefined) { book.claims[p.name] = from; saveSoon(); return p.name; }   // first come
  return c === from ? p.name : null;
}
const tabName = t => claimOf(t.claimed) === t.peer ? t.claimed : null;
window.tableClaim = m => { if (m.role !== 'player' || !m.from) return null; const c = claimOf(m.name); return c === undefined ? null : c === m.from ? 'ok' : 'taken'; };
window.tableWho = (p, from) => whoIs(p, from);
window.handOver = m => {
  if (!GM || !m.from || !confirm(`${m.name} is already played from another computer. Hand ${m.name} to this one?\n\nThe other one will see ${m.name}'s things as a stranger does.`)) return;
  book.claims[m.name] = m.from;
  for (const [tab, t] of tabs) if (t.claimed === m.name) P.send('claim', { claim: { forTab: tab, name: m.name, ok: t.peer === m.from } }, P.peerOfTab(tab));
  kick();
};
function onHeard(p, body, mine, from) { if (GM && !mine) whoIs(p, from); }

/* Versions (11-10, Bill: "GM's DB has final say and can re-entomb those"). The GM's page numbers its
   batches with the table's version (book.gv, saved with the game, so it carries on across reloads).
   A player's page says, with each change, the version it has seen everything up to. A piece deleted
   after that, put back by a copy that never saw it go, is deleted again; a change to Boot Hill made
   from a copy that missed a later one is refused whole (a burial is a delete and a Boot Hill change
   together, and half of one would lose the piece). */
function batchOut(puts, dels, sealFor, extra = {}) {   // sealFor: [{ tab, key, puts }]
  const g = extra.full ? book.gv : ++book.gv;           // a catch-up is for one tab: it doesn't move the version
  if (!extra.full) saveSoon();
  outQ = outQ.then(async () => {
    const sealed = {};
    for (const f of sealFor) { try { sealed[f.tab] = await seal(f.key, `recs:${P.tabId}>${f.tab}`, { g, puts: f.puts }); } catch {} }
    sendParts('recs', { recs: { g, ...extra, puts, dels, sealed } }, extra.full ? P.peerOfTab(extra.forTab) : undefined);   // a catch-up goes only to the tab that asked
  });
}
function stampOf(rid, fresh) {
  if (fresh.has(rid)) return fresh.get(rid);
  const o = origin.get(rid);
  if (o?.fresh) return takeOrigin(rid);
  return o ? { t: o.t, s: o.s } : takeOrigin(rid);
}
const recOut = (rid, view, stamp) => ({ ...JSON.parse(view), o: { t: stamp.t, s: stamp.s } });
const answerDel = new Set();                            // deletions to say again (the answer to a player's)
// Every save on the GM's page: every piece compared with what everyone, and each tab, holds.
function gmRecords(puts, dels) {
  const fresh = new Map(), next = book.gv + 1;
  puts.forEach(r => { if (!LOCAL.has(r.rid)) { fresh.set(r.rid, takeOrigin(r.rid)); delete book.tomb[r.rid]; } });
  if (puts.some(r => r.rid === 'yards')) book.yardsGv = next;
  dels.forEach(rid => { if (rid.startsWith('o:')) book.tomb[rid] = next; });
  if (!live()) return;
  const gone = [];
  for (const rid of new Set([...[...pubHas.keys()].filter(rid => !saved.has(rid)), ...answerDel])) {
    if (saved.has(rid)) continue;
    pubHas.delete(rid); tabs.forEach(t => t.has.delete(rid));
    gone.push({ rid, o: stampOf(rid, fresh) });
  }
  answerDel.clear();
  const owners = matOwners(), out = [], sealFor = new Map();
  for (const [rid, j] of saved) {
    if (LOCAL.has(rid)) continue;
    const pv = viewOf(rid, j, null, owners), pubChanged = pubHas.get(rid) !== pv;
    if (pubChanged) { pubHas.set(rid, pv); out.push(recOut(rid, pv, stampOf(rid, fresh))); }
    for (const [tab, t] of tabs) {
      const tv = viewOf(rid, j, tabName(t), owners), holds = pubChanged ? pv : t.has.get(rid);
      t.has.set(rid, t.key ? tv : holds);
      if (tv !== holds && t.key) { let f = sealFor.get(tab); if (!f) sealFor.set(tab, f = { tab, key: t.key, puts: [] }); f.puts.push(recOut(rid, tv, stampOf(rid, fresh))); }
    }
  }
  if (out.length || gone.length || sealFor.size) batchOut(out, gone, [...sealFor.values()]);
  if (Object.keys(book.tomb).length > 3000) for (const k of Object.keys(book.tomb).slice(0, 1000)) delete book.tomb[k];
}
// Send what changed now, after anything waiting to be saved.
let kicking = false;
function kick() { if (kicking) return; kicking = true; setTimeout(() => { kicking = false; flush().then(() => gmRecords([], [])); }); }
// A change the GM's page took from someone keeps their stamp for one save; after that, a change to
// the piece is the GM's page's own.
function takeOrigin(rid) {
  const o = origin.get(rid);
  if (o && o.fresh) { o.fresh = false; return { t: o.t, s: o.s }; }
  const mine = { t: P.tabId, s: nextSeq() };
  origin.set(rid, mine);
  return mine;
}
function setOrigin(rid, t, s) { origin.set(rid, { t, s, fresh: true }); }
// The answer to a player's change, under their own number, so their page takes it as the answer
// and not as stale: the GM's version if it was refused (or changed nothing), the deletion if the
// piece is gone. Everyone is told they hold something else, so it goes to all of them again.
function answer(rid, t, s) {
  setOrigin(rid, t, s); pubHas.delete(rid); tabs.forEach(x => x.has.delete(rid));
  if (!saved.has(rid)) answerDel.add(rid);
  kick();
}
const refused = answer;
// A tab's whole table: everyone's view in the clear (it's no secret), its own sealed.
function fullTable(p, from) {
  const t = { claimed: p.name, peer: from, key: p.key, has: new Map() }, who = tabName(t);
  const owners = matOwners(), puts = [], mine = [];
  for (const [rid, j] of saved) {
    if (LOCAL.has(rid)) continue;
    const o = origin.get(rid), st = o ? { t: o.t, s: o.s } : takeOrigin(rid), pv = viewOf(rid, j, null, owners), tv = viewOf(rid, j, who, owners);
    puts.push(recOut(rid, pv, st));
    if (tv !== pv && p.key) mine.push(recOut(rid, tv, st));
    t.has.set(rid, p.key ? tv : pv);
  }
  tabs.set(p.id, t);
  batchOut(puts, [], mine.length ? [{ tab: p.id, key: p.key, puts: mine }] : [], { full: true, forTab: p.id });
  if (!who) P.send('claim', { claim: { forTab: p.id, name: p.name, ok: false } }, P.peerOfTab(p.id));
}
function onSync(p, body, mine, from) {
  if (!GM || mine || p.role !== 'player' || !game) return;
  whoIs(p, from);
  flush().then(() => fullTable(p, from));
}
function onBye(p) { if (GM) tabs.delete(p.id); }
// Does this piece carry secrets `who` can't read? Then what their page has is a redacted copy, and
// it mustn't overwrite the real one.
const blindTo = (who, html, owners) => hiddenOf(who, pieceRefs(html), owners).length > 0;
// Boot Hill from a player: what they can only see redacted is put back as the GM's page has it. If
// they left out a piece they couldn't read, the whole change is refused.
function mergeYards(who, ys, owners) {
  const real = new Map(), secret = new Set();
  yards.forEach(y => y.items.forEach(g => g.els.forEach(el => { const x = freeze(el); if (el.dataset.oid) real.set(el.dataset.oid, x); if (blindTo(who, x, owners)) secret.add(el.dataset.oid || '?'); })));
  const seen = new Set();
  const out = ys.map(y => ({ ...y, items: (Array.isArray(y.items) ? y.items : []).map(i => ({ ...i, html: (Array.isArray(i.html) ? i.html : []).map(x => {
    if (typeof x !== 'string' || !blindTo(who, x, owners)) return x;
    const oid = (x.match(/data-oid="([\w-]+)"/) || [])[1];
    if (oid) seen.add(oid);
    return oid && real.has(oid) ? real.get(oid) : null;
  }).filter(Boolean) })) }));
  return [...secret].every(o => seen.has(o)) ? out : null;
}
let inQ = Promise.resolve();
function onEdit(p, body, mine, from) {
  if (!GM || mine || p.role !== 'player') return;
  const b = joinParts(p, body.part);
  if (!b || !b.edit) return;
  inQ = inQ.then(async () => { let e; try { e = await open(p.key, `edit:${p.id}>${P.tabId}`, b.edit); } catch { return; } takeEdit(p, e, whoIs(p, from)); });
}
function takeEdit(p, e, who) {
  if (!e || !Number.isInteger(e.s) || e.s < 1 || !Array.isArray(e.puts) || !Array.isArray(e.dels)) return;
  if (!e.puts.every(r => r && RID.test(r.rid)) || !e.dels.every(rid => typeof rid === 'string' && RID.test(rid))) return;
  const seen = Number.isInteger(e.seen) ? e.seen : 0;
  const peer = peerOf(p.id), puts = [], dels = [], owners = matOwners();
  const no = rid => { mark(rid, peer, e.s); answer(rid, p.id, e.s); };
  const rids = [...e.dels, ...e.puts.map(r => r.rid)].filter(rid => rid !== 'meta' && e.s >= hi(rid, peer));
  // nobody (a name held from another browser), or a Boot Hill change from a copy that missed a later one: all of it refused
  if (!who || (e.puts.some(r => r.rid === 'yards') && seen < book.yardsGv)) { rids.forEach(no); return; }
  for (const rid of e.dels) {
    if (!rid.startsWith('o:') || e.s < hi(rid, peer)) continue;
    const old = objEl(rid.slice(2));
    if (!mayTouch(who, old) || (old && blindTo(who, freeze(old), owners))) { no(rid); continue; }
    mark(rid, peer, e.s); dels.push(rid); setOrigin(rid, p.id, e.s);
  }
  for (let r of e.puts) {
    if (r.rid === 'meta' || e.s < hi(r.rid, peer)) continue;          // the round is the GM's
    if (r.rid.startsWith('o:')) {
      if (book.tomb[r.rid] > seen) { no(r.rid); continue; }          // deleted since their copy: it stays buried
      const el = cleanPiece(r.html, r.rid.slice(2)), old = objEl(r.rid.slice(2));
      if (!el || !mayTouch(who, old) || !mayBecome(who, el) || blindTo(who, r.html, owners) || (old && blindTo(who, freeze(old), owners))) { no(r.rid); continue; }
    }
    if (r.rid === 'yards') {
      const ys = Array.isArray(r.yards) ? mergeYards(who, r.yards, owners) : null;
      if (!ys) { no(r.rid); continue; }
      r = { ...r, yards: ys };
    }
    mark(r.rid, peer, e.s); puts.push(r); setOrigin(r.rid, p.id, e.s);
  }
  // The GM's page saves them, and its save sends them on: that's the answer the player's page waits
  // for. One that changed nothing (it already had it: a resend whose answer was lost) is answered anyway.
  const done = new Set(applyPieces(puts, dels));
  puts.forEach(r => done.has(r.rid) || answer(r.rid, p.id, e.s));
  dels.forEach(rid => done.has(rid) || answer(rid, p.id, e.s));
  saveSoon();
}

/* ---------- a player's page: show the GM's pieces, send its own changes ---------- */
let synced = false, lastG = new Map(), askTimer = null, gapTimer = null, deferred = new Map();
let gm = null, recsQ = Promise.resolve();               // gm: the GM's tab and key, from the GM's browser (the invite's gm=)
const fromGm = (p, from) => p.role === 'gm' && (!P.gmPeer || from === P.gmPeer);
// The GM's page came back (a new key: it was reopened or reloaded; or a long silence: it was cut off):
// what this page holds may be behind, and the GM's page may not know what this tab holds. Ask for
// the whole table; your pending changes go again once it's here.
let gmLast = 0;
function heardGm(p, body, mine, from) {
  if (GM || mine || !fromGm(p, from) || !p.key) return;
  const back = gm && (gm.key !== p.key || Date.now() - gmLast > GM_AWAY_MS);
  gm = { tab: p.id, key: p.key }; gmLast = Date.now();
  if (back) { synced = false; lastG.clear(); askSync(); }
}
function onRecs(p, body, mine, from) {
  if (GM || mine || !fromGm(p, from)) return;
  const b = joinParts(p, body.part), r = checkBatch(b && b.recs);
  if (!r || !Number.isInteger(r.g)) return;
  if (r.full && r.forTab !== P.tabId) return;           // someone else's catch-up
  heardGm(p, body, mine, from);
  recsQ = recsQ.then(async () => {                      // in arrival order, though opening a seal takes a moment
    let puts = r.puts;
    const box = r.sealed && typeof r.sealed === 'object' ? r.sealed[P.tabId] : null;
    if (box) {
      try {
        const mine = await open(p.key, `recs:${p.id}>${P.tabId}`, box);
        if (mine.g === r.g && checkBatch({ puts: mine.puts, dels: [] })) {
          const ids = new Set(mine.puts.map(x => x.rid));
          puts = [...puts.filter(x => !ids.has(x.rid)), ...mine.puts];
        }
      } catch {}
    }
    const last = lastG.get(p.id);
    if (r.full) { lastG.set(p.id, r.g); synced = true; clearTimeout(gapTimer); gapTimer = null; }
    else if (last === undefined || r.g > last) {
      if (last !== undefined && r.g > last + 1 && !gapTimer) gapTimer = setTimeout(() => { gapTimer = null; askSync(); }, GAP_WAIT_MS);
      lastG.set(p.id, r.g);
    }
    take(puts, r.dels, r.full);
    if (synced && (r.full || r.g === last + 1)) setSeen(r.g);   // everything up to here: no gap
    if (r.full && pending.size) resend([...pending.keys()]);
  });
}
// Apply what is newer than what this page has seen for each piece; a piece in your hand, or one
// you're writing in, waits until you let go (and is checked again then).
function take(puts, dels, full) {
  const busy = rid => { const el = rid.startsWith('o:') && objEl(rid.slice(2)); return el && (inHand().includes(el) || el.contains(document.activeElement)); };
  const now = [], gone = [];
  for (const d of dels) if (newer(d)) { if (busy(d.rid)) deferred.set(d.rid, { ...d, del: true }); else { mark(d.rid, peerOf(d.o.t), d.o.s); gone.push(d.rid); } }
  for (const r of puts) if (newer(r)) { if (busy(r.rid)) deferred.set(r.rid, r); else { mark(r.rid, peerOf(r.o.t), r.o.s); now.push(r); } }
  if (full) {                                            // what the GM's table doesn't have, this copy shouldn't
    const have = new Set(puts.map(r => r.rid));
    for (const el of [...world.children]) {
      const rid = 'o:' + el.dataset.oid;
      if (el.dataset.oid && !have.has(rid) && !hi(rid, me()) && !pending.has(rid) && !inHand().includes(el)) gone.push(rid);
    }
  }
  const changed = applyPieces(now, gone);
  adopt([...changed, ...gone]);
}
// Your changes the GM's page hasn't taken yet: rid -> { s, at, tries, base, grp } (base: the version of
// the copy the change was made on, which goes with it: the GM's page checks it; grp: the change it
// was first sent in). While one is pending, the GM's
// version of that piece is older than yours and is skipped. It's taken when the GM's page sends the
// piece back under your number (its answer, whether it took the change or refused it). Pending
// changes go again every few seconds, and after the GM's table arrives (it was away, or you
// reloaded: they're kept for this tab and room). After TRIES the GM's version wins.
const PKEY = 'glimmer.pending.' + (new URLSearchParams(location.search).get('room') || '');
const pending = new Map((() => { try { return JSON.parse(sessionStorage.getItem(PKEY) || '[]'); } catch { return []; } })());
const keepPending = () => sessionStorage.setItem(PKEY, JSON.stringify([...pending]));
function newer(r) {
  if (r.o.s < hi(r.rid, peerOf(r.o.t))) return false;   // older than one already applied from them
  const f = pending.get(r.rid);
  if (!f) return true;
  if (r.o.t === P.tabId && r.o.s >= f.s) { pending.delete(r.rid); keepPending(); return true; }   // the answer to yours
  return false;
}
function retryDeferred() {
  if (!deferred.size) return;
  const rs = [...deferred.values()]; deferred.clear();
  take(rs.filter(r => !r.del), rs.filter(r => r.del), false);
}
addEventListener('pointerup', () => setTimeout(retryDeferred, 0));
addEventListener('focusout', () => setTimeout(retryDeferred, 0));
// Every save on a player's page: its own changes to the pieces go to the GM's page, sealed (your own
// character's secrets ride in them). They're pending until it answers; while it's away, or before
// its table has arrived, they wait.
function playerRecords(puts, dels) {
  const mineP = puts.filter(r => r.rid.startsWith('o:') || r.rid === 'yards'), mineD = dels.filter(rid => rid.startsWith('o:'));
  if (!mineP.length && !mineD.length) return;
  const s = nextSeq();
  for (const rid of [...mineP.map(r => r.rid), ...mineD]) { mark(rid, me(), s); pending.set(rid, { s, at: Date.now(), tries: 0, base: seen, grp: s }); }
  keepPending();
  sendEdit({ s, puts: mineP, dels: mineD, seen });
}
function sendEdit(edit) {
  const to = gm;
  if (!to || !synced || !live()) return;
  outQ = outQ.then(async () => { try { sendParts('edit', { edit: await seal(to.key, `edit:${P.tabId}>${to.tab}`, edit) }); } catch {} });
}
// The table's version this copy has seen everything up to, kept with the copy (it outlives the tab).
const SKEY = 'glimmer.seen.' + (new URLSearchParams(location.search).get('room') || '');
let seen = +(lsGet(SKEY) || 0);
function setSeen(g) { if (g !== seen) { seen = g; lsSet(SKEY, String(g)); } }
// The GM's page says whether the name you came as is yours (it is, unless another computer holds it).
function onClaim(p, body, mine, from) {
  const c = body.claim;
  if (GM || mine || !fromGm(p, from) || !c || c.forTab !== P.tabId || typeof c.name !== 'string') return;
  P.note(c.ok ? '' : `${c.name} is played from another computer, so the GM's page shows you only what anyone sees, and doesn't take your changes. The GM can hand ${c.name} to you (by clicking your name in their strip).`);
  if (c.ok) askSync();
}
// Send these pending pieces again as they are now, under a new number. Each change goes again as it
// went the first time: with what was changed together (a burial is a delete and a Boot Hill change),
// and as old as the copy it was made on. So one refused as stale doesn't take another down with it.
function resend(rids) {
  const groups = new Map(), now = Date.now();
  for (const rid of rids) {
    const f = pending.get(rid); if (!f) continue;
    const k = f.grp ?? f.s; if (!groups.has(k)) groups.set(k, { base: f.base ?? 0, rids: [] });
    groups.get(k).rids.push(rid);
  }
  for (const { base, rids: group } of groups.values()) {
    const s = nextSeq(), puts = [], dels = [];
    for (const rid of group) {
      const f = pending.get(rid), j = saved.get(rid);
      if (j) puts.push(JSON.parse(j)); else if (rid.startsWith('o:')) dels.push(rid); else { pending.delete(rid); continue; }
      mark(rid, me(), s); f.s = s; f.at = now;
    }
    if (puts.length || dels.length) sendEdit({ s, puts, dels, seen: base });
  }
  keepPending();
}
setInterval(() => {
  if (GM || !synced || !gm || !live() || !pending.size) return;
  const now = Date.now(), due = [...pending].filter(([, f]) => now - f.at > RESEND_MS).map(([rid]) => rid);
  if (!due.length) return;
  const gaveUp = due.filter(rid => ++pending.get(rid).tries > TRIES);
  gaveUp.forEach(rid => pending.delete(rid));
  resend(due.filter(rid => pending.has(rid)));
  if (gaveUp.length) askSync();                         // the GM's version, then
}, 1000);
// Asked with this tab's key in hand, so the answer can carry what only this tab may read.
function askSync() { if (live() && pub()) P.send('sync', {}); }
// Until the GM's table arrives, ask every few seconds (the GM's page may not be open yet).
setInterval(() => { if (!GM && !synced && live()) askSync(); }, ASK_SYNC_MS);

/* ---------- images, peer to peer (11-11) ---------- */
// An image's bytes stay in the blob store of each page that has them, under their SHA-256. A page
// missing one asks the room (net/wire.js), and whoever has it answers; the asker keeps it, so it can
// answer next time. The GM's page holds every image on the table it has seen.
window.blobFor = hash => idb.ready ? idb.get('blobs', hash) : null;
window.askBlob = hash => P.askBlob(hash);
// Images that haven't arrived: try again (a fetch that failed is forgotten after 30 s).
setInterval(() => { if (world.querySelector('img.missing')) showBlobs(world); }, 10000);

window.onRecords = (puts, dels) => GM ? gmRecords(puts, dels) : playerRecords(puts, dels);

P.handle('move', onMove);
P.handle('recs', onRecs);
P.handle('edit', onEdit);
P.handle('sync', onSync);
P.handle('bye', onBye);
P.handle('hello', (...a) => GM ? onHeard(...a) : heardGm(...a));
P.handle('here', (...a) => GM ? onHeard(...a) : heardGm(...a));
P.handle('claim', onClaim);

window.tableNet = { get synced() { return synced; }, peerOf, hi, highest, get seq() { return seq; },   // tests
  get gmKnown() { return !!gm; }, pending, get seen() { return seen; }, _tabs: tabs, _pubHas: pubHas, _onMove: onMove, _pass: () => { if (!acting) pass(); }, get acting() { return acting; } };
