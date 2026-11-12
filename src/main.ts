// CRC: crc-Build.md | R155, R196, R201
// The page's entry point: the store, this browser's identity, and, at a table, the network. The
// plain page is the GM's and opens a table on demand; an invite makes a player, who joins with a
// copy of the GM's table. The views attach here as they land. With `?test` the page exposes one
// object, `window.hollow`, for Playwright, and nothing otherwise.

import { Game } from './model/game.ts';
import { GM, ridOf, type Book, type Character, type Image, type Meta, type PieceRecord, type Yards } from './model/records.ts';
import { empty as emptyYards } from './rules/yards.ts';
import { placeOf } from './ui/piece.ts';
import { Authority } from './net/authority.ts';
import { Copy } from './net/copy.ts';
import { Identity } from './net/identity.ts';
import { ImageExchange } from './net/images.ts';
import { Moves, type Move } from './net/moves.ts';
import { Presence, fromUrl, invite, newRoom } from './net/presence.ts';
import { Rolls } from './net/rolls.ts';
import { Sealer } from './net/seal.ts';
import { Stamps } from './net/stamps.ts';
import { Wire } from './net/wire.ts';
import { mayTap } from './rules/tap.ts';
import { click, shiftClick } from './rules/ownership.ts';
import { RollRowView, intentOf } from './ui/rollrow.ts';
import { TapeView } from './ui/tape.ts';
import { RegisterView } from './ui/register.ts';
import { BarView, type Supply } from './ui/bar.ts';
import { BootHillView } from './ui/boothill.ts';
import { FolksView, arrivalName, gmName, viewAsChoices, type Here, type Me } from './ui/folks.ts';
import { newCharacter, newChip, newHowTo, newSticky, newText } from './rules/supplies.ts';
import { handOver } from './net/claims.ts';
import type { Viewer } from './rules/visibility.ts';
import { BlobStore, type Size } from './store/blobs.ts';
import { IdbDb } from './store/db.ts';
import { GameStore, type Clock, type KeyValue } from './store/gamestore.ts';
import { load as loadSeat, prune as pruneSeat, save as saveSeat, type Seat } from './store/seat.ts';
import { exportGame, importGame } from './store/exchange.ts';
import { LedgerView, type LedgerWith } from './ui/ledger.ts';
import { minter } from './ui/actions.ts';
import { Drag } from './ui/drag.ts';
import { TableView } from './ui/table.ts';

declare const HOLLOW_STAMP: string;

const clock: Clock = { now: () => Date.now(), setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: h => clearTimeout(h as number) };

async function measure(blob: Blob): Promise<Size> {
  const image = await createImageBitmap(blob);
  const size = { w: image.width, h: image.height };
  image.close();
  return size;
}

/** This tab's id: new for each tab, kept across its reloads. */
function tabId(session: KeyValue): string {
  let tab = null;
  try { tab = session.getItem('hollow.tab'); } catch { /* blocked */ }
  if (!tab) {
    tab = `t-${[...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('')}`;
    try { session.setItem('hollow.tab', tab); } catch { /* this load only */ }
  }
  return tab;
}

/** A localStorage value, set first when given; null when storage is blocked. */
function local(key: string, value?: string): string | null {
  try { if (value !== undefined) localStorage.setItem(key, value); return localStorage.getItem(key); } catch { return null; }
}

/** The move actor's next pass: the next animation frame, or 100 ms, whichever comes first (a hidden tab gets no frames). */
function frame(fn: () => void): void {
  let done = false, raf = 0;
  const go = () => { if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(t); fn(); };
  raf = requestAnimationFrame(go);
  const t = setTimeout(go, 100);
}

/** The table's views for this page: drawn from the game, the view kept in this viewer's seat. */
function views(game: Game, gameId: string, viewer: Viewer, blobs: BlobStore, moves: Moves, missing: (hash: string) => string | undefined, ledger: LedgerWith,
  rolling: () => Rolls, checkpoint?: (name: string) => Promise<unknown>): { table: TableView; drag: Drag; bar: BarView } {
  const who = viewer?.name ?? 'nobody', gm = !!viewer?.gm;
  let seat: Seat = loadSeat(localStorage, gameId, who);
  const keep = (s: Seat) => { seat = s; saveSeat(localStorage, gameId, who, s); };
  const redraw = () => table.render(game.all().map(([rid]) => rid));
  const mint = () => minter(game, gm);
  let drag: Drag | undefined, rollRow: RollRowView | undefined;
  /** The height that puts a piece on top of everything. */
  const topZ = () => 1 + Math.max(0, ...game.all().map(([, r]) => ('kind' in r ? placeOf(r as PieceRecord) : null)?.z ?? 0));
  // R272, R287: an image's bytes kept, and an Image put on top where it goes.
  const addImage = (file: File, at: { x: number; y: number }) => void blobs.add(file).then(({ blob, w: iw, h }) => {
    const oid = mint()();
    const image: Image = { kind: 'image', oid, place: { ...at, z: topZ(), tilt: 0 }, blob, w: iw, h };
    game.change(wr => wr.put(ridOf(oid), image));
  });
  // R18, R19, R287, R34: a supply is made at the press and carried; a new character's pool pops out
  // above its card.
  const made = (what: Supply, oid: string, at: { x: number; y: number }): PieceRecord => {
    switch (what) {
      case 'character': return newCharacter(oid, viewer, at);
      case 'sticky': return newSticky(oid, at);
      case 'text': return newText(oid, at);
      case 'howto': return newHowTo(oid, at);
      default: return newChip(oid, what.sign, what.points, at);
    }
  };
  // R35: a new pool never lies under the bar; with no room above, it and its card slide down.
  const clearOfBar = (rid: string) => {
    const c = game.get(rid) as Character | undefined, bar = document.getElementById('bar');
    if (c?.kind !== 'character' || !bar) return;
    const top = Math.round(table.toWorld(0, bar.getBoundingClientRect().bottom).y + 10);
    const dy = top - c.pool.y;
    if (dy > 0) game.change(w => w.put(rid, { ...c, pool: { ...c.pool, y: top }, card: { ...c.card, y: c.card.y + dy } }));
  };
  const bar = new BarView(document.getElementById('bar')!, {
    stamp: HOLLOW_STAMP,
    take: (what, e) => {
      const oid = mint()(), rid = ridOf(oid), rec = made(what, oid, table.toWorld(e.clientX, e.clientY));
      game.change(w => w.put(rid, rec));
      drag?.fresh(rid);
      if (rec.kind === 'character') drag?.startPool(rid, e, e, () => clearOfBar(rid));
      else if (rec.kind === 'chip') drag?.startItem(rid, e, e);
      else drag?.start(rid, e, e);
    },
    images: files => {
      const r = document.getElementById('table')!.getBoundingClientRect(), c = table.toWorld(r.left + r.width / 2, r.top + r.height / 2);
      files.forEach((f, i) => addImage(f, { x: Math.round(c.x - 120 + i * 24), y: Math.round(c.y - 100 + i * 24) }));
    },
  });
  const table = new TableView(document.getElementById('table')!, document.getElementById('world')!, {
    game, viewer, view: seat.view, keepView: v => keep({ ...seat, view: v }), schedule: frame,
    imageUrl: hash => blobs.url(hash), imageGone: hash => blobs.release(hash), missing,
    addImage,
    opened: () => new Set(seat.open.columns), setOpened: o => { keep({ ...seat, open: { ...seat.open, columns: [...o] } }); redraw(); },
    drag: (rid, down, move) => drag?.start(rid, down, move),
    // R259: your own Resources only; anyone's Motivations and Damage.
    dragGlyph: (src, down, move) => {
      const colon = src.indexOf(':'), c = game.get(ridOf(src.slice(0, colon))) as Character | undefined;
      if (c?.kind !== 'character' || !mayTap(viewer, c, src.slice(colon + 1))) return false;
      drag?.startGlyph(src, down, move);
      return true;
    },
    mint,
    poolOpen: () => ({ piles: new Set(seat.open.piles), slots: new Set(seat.open.slots), used: new Set(seat.open.used) }),
    // Seat-tier openings: looking never changes the game (R128).
    toggle: (kind, key, on) => {
      const now = new Set(seat.open[kind]);
      if (on ?? !now.has(key)) now.add(key); else now.delete(key);
      keep({ ...seat, open: { ...seat.open, [kind]: [...now] } });
      redraw();
    },
    dragItem: (rid, down, move) => drag?.startItem(rid, down, move),
    // R75–R77: an action's die brings the roll row; the action in use gets its swish.
    useAction: (oid, label) => rollRow?.action(oid, label) ?? false,
    inUse: oid => rollRow?.inUse(oid) ?? null,
    // R142, R144, R146, R68: the die by a pool's name claims, opens, or docks the roll row.
    poolDie: (oid, shift, die) => {
      const c = game.get(ridOf(oid)) as Character | undefined;
      if (c?.kind !== 'character') return;
      const r = shift ? shiftClick(viewer, c) : click(viewer, c);
      if ('owner' in r) game.change(w => w.put(ridOf(oid), { ...c, owner: r.owner }));
      else if ('dock' in r) rollRow?.dock(oid);
      else { die.title = r.refused; die.animate?.([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], 200); }
    },
    dragPool: (rid, down, move) => drag?.startPool(rid, down, move),
  });
  // R122: the graveyard being browsed, where a put-away piece goes.
  const yard = () => {
    const y = (game.get('yards') as Yards | undefined) ?? emptyYards(), cur = Math.min(seat.boothill.cur, y.yards.length - 1);
    return { cur, name: y.yards[cur]!.name };
  };
  drag = new Drag({ game, table, moves, mint, schedule: frame, yard });
  // R110–R113: this page's tape, under the pieces; a torn roll is carried off like any piece.
  const tape = new TapeView(document.getElementById('table')!, {
    game, viewer, up: () => seat.tapeUp, setUp: up => keep({ ...seat, tapeUp: up }),
    crit: (id, choice, lock) => rolling().crit(id, choice, lock), mint: () => mint()(),
    toWorld: (x, y) => table.toWorld(x, y), carry: (rid, down, move) => drag?.start(rid, down, move),
  });
  // R115–R117: the register at the bar's right end; the tape hangs under it (R282).
  const register = new RegisterView(document.getElementById('bar')!, { game, viewer, checkpoint, paperRoll: () => tape.toggleUp() });
  const hang = () => {
    const t = document.getElementById('tape');
    if (t) { t.style.right = 'auto'; t.style.left = `${Math.max(8, Math.min(innerWidth - 258, register.left() + 2))}px`; }
  };
  // R132, R291: the Ledger between the register and Boot Hill; a restore keeps the seat, skipping
  // whatever has vanished (R136).
  new LedgerView(document.getElementById('bar')!, document.body, { ...ledger, restore: async id => {
    await ledger.restore(id);
    const yards = (game.get('yards') as Yards | undefined) ?? emptyYards();
    keep(pruneSeat(seat, rid => game.get(rid) !== undefined, yards.yards.length));
    redraw();
  } });
  // R118–R125, R289: Boot Hill after the register; a dug-up piece is carried from the press.
  new BootHillView(document.getElementById('bar')!, document.body, {
    game, cur: () => seat.boothill.cur, setCur: cur => keep({ ...seat, boothill: { ...seat.boothill, cur } }),
    open: () => seat.boothill.open, setOpen: open => keep({ ...seat, boothill: { ...seat.boothill, open } }),
    toWorld: (x, y) => table.toWorld(x, y), top: topZ,
    carry: (lead, e) => lead.kind === 'character' ? drag?.startPool(ridOf(lead.oid), e, e) : drag?.start(ridOf(lead.oid), e, e),
  });
  hang();
  addEventListener('resize', hang);
  void document.fonts?.ready.then(hang);
  rollRow = new RollRowView({
    game, viewer, roller: () => seat.roller, keep: r => keep({ ...seat, roller: r }),
    pool: oid => table.pool(ridOf(oid)), redraw: oids => table.render(oids.map(ridOf)),
    // R100–R104, R281: the GM's page rolls at once (privately if switched); a player's asks it, Roll
    // reading "GM…" meanwhile; why not prints as a note on the tape.
    roll: r => {
      const rolls = rolling(), intent = intentOf(r);
      if (gm) { const why = rolls.roll(intent, !!r.priv); if (why) rolls.note(why); return; }
      rollRow!.waiting(true);
      void rolls.request(intent).then(why => { rollRow!.waiting(false); if (why) rolls.note(why); });
    },
  });
  return { table, drag, bar };
}

// R294: arriving by an invite asks for a name until one that isn't "GM" is given; cancel is "Player".
function askName(): string {
  for (;;) { const n = arrivalName(prompt('Your name at the table')); if (n) return n; }
}

// R163, R293: this page's tag: lit while live, "offline" with why.
function meOf(p: Presence, name: string, gm: boolean): Me {
  return { name, gm, live: p.status.state === 'live', ...(p.status.state === 'offline' && { why: p.status.why }) };
}

// R293: the others at the table, dimmed when unheard.
function here(p: Presence): Here[] {
  return [...p.people].map(([tab, person]) => ({ tab, ...person, stale: p.stale(tab) }));
}

// R132–R135, R138, R139, R141: what the Ledger does with this browser's games; another game, a new
// one or an imported one is opened by reloading onto it.
function ledgerOf(store: GameStore, blobs: BlobStore, player: boolean): LedgerWith {
  const onto = async (id: string) => { await store.open(id); location.reload(); };
  return {
    player, now: () => clock.now(), round: () => (store.game.get('meta') as Meta).round,
    current: () => store.current!, status: () => store.status(), rename: name => store.rename(name),
    checkpoints: () => store.checkpoints(), games: () => store.list(),
    checkpoint: name => store.checkpoint(name, false), restore: id => store.restore(id), open: onto,
    newGame: async name => onto((await store.add(name)).id),
    exported: () => exportGame(store, blobs, store.current!.id),
    imported: async text => onto((await importGame(store, blobs, text)).id),
  };
}

async function main() {
  const db = await IdbDb.open();
  const store = new GameStore(db, clock, localStorage);
  const blobs = new BlobStore(db, measure);
  const [identity, sealer] = await Promise.all([Identity.load(db), Sealer.make()]);
  const tab = tabId(sessionStorage), invited = fromUrl(location.search);
  const loopback = !!local('hollow.loopback');
  const stamps = new Stamps(sessionStorage);
  const rng = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
  addEventListener('pagehide', () => { void store.save(); });

  if (invited) {
    // R155, R140: a player, joining with a copy of the GM's table, kept per room.
    await store.copyFor(invited.room);
    const game: Game = store.game, name = local('hollow.name') ?? local('hollow.name', askName())!;
    const wire = new Wire(invited.room, { identity, sealer, tab, loopback });
    // Copy only asks what's held when a message arrives, after Moves is made.
    const copy = new Copy({ game, stamps, sealer, link: wire, clock, session: sessionStorage, local: localStorage, room: invited.room, gm: invited.gm,
      held: rid => moves.holds(rid) });
    const moves = new Moves({ stamps, tab, send: m => { void wire.send('move', m); }, place: cs => copy.place(cs), timers: clock, schedule: frame });
    wire.on('move', (b: Move, from) => moves.receive(from.tab, b));
    const presence = new Presence({ net: wire, clock, role: 'player', name });
    const rolls = new Rolls({ game, sealer, clock, rng, link: wire, session: sessionStorage, gm: false, gmBrowser: invited.gm });
    const images = new ImageExchange(wire, blobs, clock);
    images.watch(game);
    images.start();
    presence.start();
    copy.start();
    const { table, drag, bar } = views(game, store.current!.id, { name, gm: false }, blobs, moves, hash => images.missing.get(hash), ledgerOf(store, blobs, true), () => rolls);
    new FolksView(bar.folks, bar.youAre, { me: () => meOf(presence, name, false), people: () => here(presence), held: () => undefined });
    return { stamp: HOLLOW_STAMP, role: 'player' as const, tab, identity, store, blobs, wire, presence, copy, rolls, images, moves, view: table, drag };
  }

  // The GM's page: the game is here; a table opens on demand, in the room remembered for this game.
  await store.start();
  const game: Game = store.game;
  let gmShown = local('hollow.gmname') ?? GM;
  let table: { room: string; wire: Wire; presence: Presence; authority: Authority; rolls: Rolls; images: ImageExchange } | null = null;
  let rolls = new Rolls({ game, sealer, clock, rng, link: null, session: sessionStorage, gm: true });
  // Drags go to the room once there is one; players' drags are judged like their changes.
  const moves = new Moves({ stamps, tab, send: m => { void table?.wire.send('move', m); },
    place: cs => table?.authority.moved(cs), timers: clock, schedule: frame });

  // R157: Open the table makes the room (or reopens this game's); the GM's URL is never rewritten.
  const open = () => {
    if (table) return table;
    const key = `hollow.room.${store.current!.id}`;
    const room = local(key) ?? local(key, newRoom(store.current!.name))!;
    const wire = new Wire(room, { identity, sealer, tab, loopback });
    const presence = new Presence({ net: wire, clock, role: 'gm', name: gmShown,
      here: (p, from) => { if (p.role === 'player') authority.join(from.tab, p.name, from.browser, from.sealKey); } });
    const authority = new Authority({ game, stamps, sealer, link: wire, schedule: queueMicrotask });
    const whoIs = (from: { tab: string; browser: string }) => {
      const p = presence.people.get(from.tab), held = p && (game.get('book') as Book).claims[p.name];
      return p && held === from.browser ? p.name : null;
    };
    rolls = new Rolls({ game, sealer, clock, rng, link: wire, session: sessionStorage, gm: true, whoIs });
    const images = new ImageExchange(wire, blobs, clock);
    images.start();
    presence.start();
    wire.on('move', (b: Move, from) => moves.receive(from.tab, b));
    table = { room, wire, presence, authority, rolls, images };
    return table;
  };
  // R158: the invite carries the room and the GM's browser id; shift-click closes the table.
  const link = () => invite(location.href, open().room, identity.id);
  const close = () => {
    if (!table) return;
    void table.presence.close();
    table = null;
    rolls = new Rolls({ game, sealer, clock, rng, link: null, session: sessionStorage, gm: true });
  };
  // R153: the real GM views as someone else from the seat's viewAs; the page reloads to change it.
  const gmSeat = loadSeat(localStorage, store.current!.id, GM), viewer: Viewer = gmSeat.viewAs ? { name: gmSeat.viewAs, gm: false } : { name: GM, gm: true };
  const { table: view, drag, bar } = views(game, store.current!.id, viewer, blobs, moves, hash => table?.images.missing.get(hash), ledgerOf(store, blobs, false), () => rolls,
    name => store.checkpoint(name, true));
  new FolksView(bar.folks, bar.youAre, {
    me: () => table ? meOf(table.presence, gmShown, true) : { name: gmShown, gm: true, live: false },
    people: () => table ? here(table.presence) : [],
    held: name => (game.get('book') as Book).claims[name],
    rename: () => {
      gmShown = gmName(prompt('Your name, as players see it', gmShown), gmShown);
      local('hollow.gmname', gmShown);
      table?.presence.rename(gmShown);
    },
    handOver: (name, browser) => handOver(game, name, browser),
    table: { opened: () => !!table, open: () => void open(), invite: link, close },
    viewAs: {
      current: () => gmSeat.viewAs ?? GM,
      choices: () => viewAsChoices([...(table?.presence.people.values() ?? [])].filter(p => p.role === 'player').map(p => p.name),
        game.all().map(([, r]) => r as Character).filter(c => c.kind === 'character').map(c => c.owner)),
      choose: name => { saveSeat(localStorage, store.current!.id, GM, { ...gmSeat, viewAs: name === GM ? null : name }); location.reload(); },
    },
  });
  return { stamp: HOLLOW_STAMP, role: 'gm' as const, tab, identity, store, blobs, open, invite: link, moves, view, drag,
    get table() { return table; }, get rolls() { return rolls; } };
}

const ready = main();
if (new URLSearchParams(location.search).has('test')) {
  (window as unknown as { hollow: unknown }).hollow = { stamp: HOLLOW_STAMP, ready };
}
