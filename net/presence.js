// Presence: who is at the table. The first networking slice (Bill, 11-09).
//
// Roles come from the URL. Whoever opens the page without ?room= is the GM: their browser holds the
// game. An invite link (?room=<label>-<random>) makes you a player, under a name your browser
// remembers. The GM's own URL is never rewritten -- reloading a ?room= URL would turn the GM into a
// player -- so the GM's room is remembered per game in the GM's browser (seat tier, never sent).
//
// Messages ride ipfs-test's envelope over the wire (net/wire.js: Trystero, browser to browser,
// 11-11). hello on joining; here every 10 s, and to each peer as it connects, so a latecomer learns
// who was already there; bye on leaving (and a peer whose connection drops leaves too). You're live
// while a signalling relay or a peer is reachable. A message's `from` is the browser identity its
// connection proved in the handshake (net/ident.js), and its `key` the sealing key it vouched for.
//
// Uses the page's globals (realMe, game, lsGet, lsSet, applyVisibility, h) -- this is a sketch.

import { connect } from './wire.js';
import { identity, ID } from './ident.js';

const HEARTBEAT_MS = 10000, STALE_MS = 25000, GONE_MS = 60000;
const params = new URLSearchParams(location.search);
const tabId = sessionStorage.getItem('glimmer.tab') || crypto.randomUUID().slice(0, 8);
sessionStorage.setItem('glimmer.tab', tabId);   // a reload keeps your place; another tab is someone else
const role = realMe === 'GM' ? 'gm' : 'player';
const members = new Map();                      // tabId -> { name, role, last, mine, peer, from }
const handlers = {};                            // kind -> fn(sender, body, mine, from): net/table.js's (from: the sender's browser id)
let note = '';                                   // what this page must be told (net/table.js: a name held elsewhere)
let room = null, roomName = null, myId = null, status = 'off', statusDetail = '', beat = null, lastHereTo = new Map();
identity.then(me => { myId = me.id; render(); });

const el = document.getElementById('folks');
const myName = () => role === 'gm' ? (lsGet('glimmer.gmname') || 'GM') : realMe;
const roomKey = () => `glimmer.room.${game}`;

/* ---------- the wire ---------- */
function payload(extra) { return JSON.stringify({ id: tabId, name: myName(), role, ...extra }); }
function parse(text, key) {                      // hostile input: anyone with the invite is in the room
  let o; try { o = JSON.parse(text); } catch { return null; }
  if (!o || typeof o.id !== 'string' || !/^[\w-]{1,40}$/.test(o.id)) return null;
  if (typeof o.name !== 'string' || !['gm', 'player'].includes(o.role)) return null;
  return { id: o.id, name: o.name.trim().slice(0, 32) || '?', role: o.role, key };   // key: from the handshake, never the message
}
// To everyone, or to one peer (target: a Trystero peer id). Resolves to how many peers it went to.
const send = (kind, extra, target) => room ? room.send(kind, payload(extra), target).catch(err => { setStatus('error', err.message); return 0; }) : Promise.resolve(0);

/* ---------- rolls: the table view of each roll ---------- */
// Your rolls are numbered per tab (a reload continues the count) so a receiver can tell a lost one.
let rseq = +(sessionStorage.getItem('glimmer.rseq') || 0);
const lastRseq = new Map();                      // sender tabId -> last roll number seen
window.tableRoll = r => {
  if (!room) return;
  sessionStorage.setItem('glimmer.rseq', String(++rseq));
  send('roll', { roll: { ...r, rseq } }).then(n => n && rollEchoed(r.rid));   // it went out (nothing comes back to the sender)
};
const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : null;
function parseRoll(r) {                          // every field checked; anything off and the roll is dropped
  if (!r || typeof r !== 'object' || !Array.isArray(r.dice) || r.dice.length > 40) return null;
  const dice = r.dice.map(d => d && 'WGRBY'.includes(d.c) && d.c.length === 1 && Number.isInteger(d.v) && d.v >= 1 && d.v <= 6
    ? { c: d.c, v: d.v, added: d.added === true, dropped: d.dropped === true } : null);
  if (dice.some(d => !d) || !Number.isInteger(r.rseq) || r.rseq < 1) return null;
  const out = { rid: str(r.rid, 40), character: str(r.character, 60), action: str(r.action, 60), vs: str(r.vs, 60), row: str(r.row, 60),
    resolution: str(r.resolution, 120), level: str(r.level, 160), outcome: str(r.outcome, 80), at: str(r.at, 40), rseq: r.rseq, dice,
    req: r.req === undefined ? '' : str(r.req, 40), forTab: r.forTab === undefined ? '' : str(r.forTab, 40), by: r.by === undefined ? '' : str(r.by, 32) };
  if (Object.values(out).some(v => v === null) || !/^[\w-]+$/.test(out.rid) || isNaN(Date.parse(out.at))) return null;
  return out;
}
function onRoll(p, raw, mine, from) {
  const r = parseRoll(raw);
  if (!r) return;
  // Rolls are the GM's page's to make: a player takes them only from the GM's browser, and the GM's
  // page takes none at all.
  if (role === 'gm' || p.role !== 'gm' || (gmPeer && from !== gmPeer)) return;
  const who = p.role !== 'gm' ? p.name : p.name === 'GM' ? 'the GM' : `${p.name} (GM)`;
  const last = lastRseq.get(p.id);
  if (last !== undefined && r.rseq > last + 1) printMissed(r.rseq - last - 1, who);
  if (last === undefined || r.rseq > last) lastRseq.set(p.id, r.rseq);   // a lower number: a reload elsewhere, or reordering
  // our own roll, made by the GM's page: the roller's page prints it with what its owner may know
  if (r.forTab === tabId && pending.has(r.req)) { const w = pending.get(r.req); pending.delete(r.req); clearTimeout(w.timer); return w.ok(r); }
  printTableRoll(r, r.by || who);               // a player's roll, made by the GM's page, is still theirs
}

function onMessage(env, peer) {
  const m = { kind: env.kind, text: env.text, from: room?.idOf(peer) ?? null };
  window.presence._tap?.(m);                     // tests: what a member of the room receives
  const p = parse(m.text, room?.keyOf(peer) ?? null);
  if (!p) return;
  const mine = false;                            // nothing comes back to its sender
  if (m.kind === 'bye') { members.delete(p.id); handlers.bye?.(p, {}, mine, m.from); return render(); }
  members.set(p.id, { ...p, last: Date.now(), mine, from: m.from, peer });   // from: the browser its connection proved (set first: a handler may answer this tab alone)
  if (m.kind === 'roll') { try { onRoll(p, JSON.parse(m.text).roll, mine, m.from); } catch {} }
  if (m.kind === 'intent' && role === 'gm' && !mine && p.role === 'player') { try { onIntent(p, JSON.parse(m.text).intent, m.from); } catch {} }
  if (handlers[m.kind]) { let body = null; try { body = JSON.parse(m.text); } catch {} if (body) handlers[m.kind](p, body, mine, m.from); }
  if (m.kind === 'refuse' && role === 'player' && p.role === 'gm' && (!gmPeer || m.from === gmPeer)) { try { onRefuse(JSON.parse(m.text).refuse); } catch {} }
  // A hello means "I just arrived, who's here?" -- even from someone known (a reload keeps the tab's
  // id), so answer at once rather than at the next beat; at most once a second each.
  if (m.kind === 'hello' && Date.now() - (lastHereTo.get(peer) || 0) > 1000) { lastHereTo.set(peer, Date.now()); send('here', {}, peer); }
  render();
}
// A connection that closes is a bye from whoever was on it.
function onLeave(peer) {
  for (const [id, m] of members) if (m.peer === peer) { members.delete(id); handlers.bye?.(m, {}, false, m.from); }
  lastHereTo.delete(peer);
  render();
}

async function join(name) {
  await leave();
  roomName = name;
  setStatus('connecting');
  const since = Date.now();
  let r;
  try { r = await connect(name, { message: onMessage, leave: onLeave, join: peer => send('hello', {}, peer), blob: hash => window.blobFor?.(hash) }); }
  catch (e) { roomName = null; return setStatus('error', `Couldn't start the connection: ${e.message}`); }
  if (roomName !== name) return r.leave();       // left (or went elsewhere) meanwhile
  room = r;
  const check = () => {
    const peers = room.peers().length, relays = room.relaysOpen();
    const detail = `${peers} other page${peers === 1 ? '' : 's'} connected; ${relays} signalling relay${relays === 1 ? '' : 's'} reachable`;
    if (peers || relays) setStatus('live', detail);
    else setStatus(Date.now() - since > 15000 ? 'offline' : 'connecting', Date.now() - since > 15000
      ? 'No signalling relay answers and no other page is connected. Is this computer online? Some networks block the relays (secure websockets to public Nostr relays).' : detail);
  };
  beat = setInterval(() => { check(); send('here'); }, HEARTBEAT_MS);
  check(); setTimeout(check, 1500);
  send('hello');
}
async function leave() {
  clearInterval(beat); beat = null;
  const r = room; room = null;
  if (r) { await r.send('bye', payload()).catch(() => {}); await r.leave(); }
  members.clear(); roomName = null; lastHereTo.clear();
  setStatus('off');
}
addEventListener('pagehide', () => { if (room) send('bye'); });

/* ---------- rolls through the GM's page (Bill, 11-09) ---------- */
// A player's page asks; the GM's page resolves from its own records and answers to the room.
const pending = new Map();                       // req -> { ok, no, timer }
const ASK_MS = 10000;
function askGm(intent) {
  return new Promise((ok, no) => {
    if (status !== 'live') return no(new Error('Not at the table: rolls go through the GM\'s page'));
    if (![...members.values()].some(m => m.role === 'gm' && Date.now() - m.last < STALE_MS)) return no(new Error('The GM isn\'t at the table, so nobody can roll'));
    const req = crypto.randomUUID().slice(0, 12);
    const timer = setTimeout(() => { pending.delete(req); no(new Error('The GM\'s page didn\'t answer that roll')); }, ASK_MS);
    pending.set(req, { ok, no, timer });
    send('intent', { intent: { ...intent, req } });
  });
}
if (role === 'player') window.askGm = askGm;
function onRefuse(f) {
  if (!f || f.forTab !== tabId || typeof f.req !== 'string' || !pending.has(f.req)) return;
  const w = pending.get(f.req); pending.delete(f.req); clearTimeout(w.timer);
  w.no(new Error(str(f.reason, 120) || 'The GM\'s page refused that roll'));
}
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
function parseIntent(i) {                        // names and small numbers only; every field checked
  if (!i || typeof i !== 'object' || typeof i.req !== 'string' || !/^[\w-]{1,40}$/.test(i.req)) return null;
  if (typeof i.mat !== 'string' || !/^mat\d{1,6}$/.test(i.mat)) return null;
  if (!int(i.y, 0, 9) || !int(i.b, -9, 9) || !int(i.row, 0, ADV.length - 1) || typeof i.rowManual !== 'boolean') return null;
  if (!i.adj || !int(i.adj.y, -9, 9) || !int(i.adj.b, -9, 9)) return null;
  let act = null;
  if (i.act !== null) {
    if (!i.act || typeof i.act.label !== 'string' || i.act.label.length > 60) return null;
    let vs = null;
    if (i.act.vs !== null) {
      if (!i.act.vs || typeof i.act.vs.mat !== 'string' || !/^mat\d{1,6}$/.test(i.act.vs.mat) || !['mental', 'psych', 'any', ''].includes(i.act.vs.kind)) return null;
      vs = { mat: i.act.vs.mat, kind: i.act.vs.kind };
    }
    act = { label: i.act.label, vs };
  }
  return { req: i.req, mat: i.mat, act, adj: { y: i.adj.y, b: i.adj.b }, y: i.y, b: i.b, row: i.row, rowManual: i.rowManual };
}
const handled = new Map();                       // req -> what we answered (a repeat gets the same answer)
function onIntent(p, raw, from) {
  const i = parseIntent(raw);
  if (!i) return;
  if (handled.has(i.req)) return;
  const out = resolveIntent(i, window.tableWho?.(p, from) ?? null);   // the name its browser holds (net/table.js)
  handled.set(i.req, out);
  if (handled.size > 500) handled.delete(handled.keys().next().value);
  if (out.refused) return send('refuse', { refuse: { req: i.req, forTab: p.id, reason: out.refused } });
  window.tableRoll({ ...out.roll, req: i.req, forTab: p.id, by: p.name });   // to everyone, marked for the roller
}

/* ---------- the GM's invite ---------- */
function mintRoom() {
  const label = (lsGet('glimmer.gmname') || 'table').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20) || 'table';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return label + '-' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
// The invite names the GM's browser (its identity, net/ident.js), and players take rolls and the
// table only from it. Every connection proves its identity in the handshake, so `from` can't be
// forged by someone else in the room.
const inviteUrl = () => location.origin + location.pathname + '?room=' + roomName + (myId ? '&gm=' + myId : '');
const gmPeer = ID.test(params.get('gm') || '') ? params.get('gm') : null;   // on a player's page: the GM's browser, if the invite said (an old daemon id is ignored)

/* ---------- the strip in the bar ---------- */
function setStatus(s, detail = '') { status = s; statusDetail = detail; render(); }
function render() {
  const now = Date.now();
  for (const [id, m] of members) if (!m.mine && now - m.last > GONE_MS) members.delete(id);
  const list = [...members.values()].sort((a, b) => (b.role === 'gm') - (a.role === 'gm') || (b.mine - a.mine) || a.name.localeCompare(b.name));
  if (!list.some(m => m.mine)) list.unshift({ name: myName(), role, mine: true, last: 0 });
  el.replaceChildren();
  el.dataset.status = status;
  for (const m of list) {
    const live = m.mine ? status === 'live' : now - m.last < STALE_MS;
    const c = h(`<span class="folk${m.role === 'gm' ? ' gm' : ''}${m.mine ? ' me' : ''}${live ? ' live' : ''}"></span>`);
    c.textContent = m.name;
    c.title = m.mine ? (role === 'gm' ? 'You, the GM. Click to change the name players see.' : 'You') +
      (status === 'live' ? ` (at the table: ${statusDetail})` : status === 'off' ? ' (not at a table yet)' : ` (${status}${statusDetail ? ': ' + statusDetail : ''})`)
      : `${m.role === 'gm' ? 'The GM' : 'A player'}${live ? '' : ', not heard from lately'}`;
    if (m.mine && role === 'gm') c.addEventListener('click', renameGm);
    if (!m.mine && role === 'gm' && window.tableClaim?.(m) === 'taken') {   // someone came as a name another computer holds
      c.classList.add('warn');
      c.title = `${m.name}, from another computer than the one that holds ${m.name}. They see only what anyone sees. Click to hand ${m.name} to them.`;
      c.addEventListener('click', () => { window.handOver(m); render(); });
    }
    el.append(c);
  }
  if (role === 'gm') {
    const b = h(`<button class="invite"></button>`);
    b.textContent = roomName ? 'Copy invite' : 'Open the table';
    b.title = roomName ? `Copy the link players open to join:\n${inviteUrl()}\nShift-click to close the table.` : 'Start a room for this game, so players can join';
    b.addEventListener('click', e => {
      if (!roomName) { const r = mintRoom(); lsSet(roomKey(), r); join(r); return; }
      if (e.shiftKey) { try { localStorage.removeItem(roomKey()); } catch {} leave(); return; }
      navigator.clipboard?.writeText(inviteUrl()).then(() => { b.textContent = 'Copied'; setTimeout(render, 1200); }, () => prompt('Copy the invite link', inviteUrl()));
    });
    el.append(b);
  }
  if (note) { const w = h(`<span class="folk warn">not yours</span>`); w.title = note; el.append(w); }
  if (status === 'offline' || status === 'error') {
    const w = h(`<span class="folk warn">offline</span>`);
    w.title = statusDetail; el.append(w);
  }
  syncYouAre();
}
function renameGm() {
  const n = prompt('Your name at the table (players see it)', myName());
  if (n === null) return;
  lsSet('glimmer.gmname', n.trim().slice(0, 32) || 'GM');
  send('here'); render();
}
// "You are" (the GM's chooser) offers everyone present, plus anyone who already owns something.
function syncYouAre() {
  const sel = document.getElementById('me');
  if (!sel || role !== 'gm') return;
  const names = new Set(['GM', 'Player 1', 'Player 2']);
  members.forEach(m => { if (m.role === 'player') names.add(m.name); });
  document.querySelectorAll('.mat[data-owner]').forEach(m => m.dataset.owner && names.add(m.dataset.owner));
  const have = new Set([...sel.options].map(o => o.value));
  names.forEach(n => { if (!have.has(n)) sel.add(new Option(n)); });
}

/* ---------- start ---------- */
// A player arrives by invite. The GM rejoins this game's room if one was opened before (and again
// when another game is put on the table, since each game has its own room).
export function start() {
  if (role === 'player') { const r = params.get('room'); if (r && /^[\w-]{8,80}$/.test(r)) join(r); else render(); return; }
  const r = lsGet(roomKey());
  if (r) join(r); else render();
}
// The page opens its game asynchronously, so the GM's side waits for one (and follows a switch).
let lastGame = null;
function tick() {
  if (role === 'gm' && game && game !== lastGame) { lastGame = game; start(); } else render();
}
window.presence = { get members() { return [...members.values()]; }, get status() { return status; }, get room() { return roomName; }, join, leave, inviteUrl, _send: send,   // _send: tests only
  tabId, role, get gmPeer() { return gmPeer; }, get myId() { return myId; }, send, note: t => { note = t; render(); }, handle: (kind, fn) => { handlers[kind] = fn; },
  peerOfTab: tab => members.get(tab)?.peer ?? null, askBlob: hash => room ? room.askBlob(hash) : Promise.resolve(null), _tap: null };
if (role === 'player') start();
setInterval(tick, 1000);
tick();
