// CRC: crc-Build.md | R155, R196, R201
// The page's entry point: the store, this browser's identity, and, at a table, the network. The
// plain page is the GM's and opens a table on demand; an invite makes a player, who joins with a
// copy of the GM's table. The views attach here as they land. With `?test` the page exposes one
// object, `window.hollow`, for Playwright, and nothing otherwise.

import { Game } from './model/game.ts';
import { ridOf, type Book, type Character } from './model/records.ts';
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
import type { Viewer } from './rules/visibility.ts';
import { BlobStore, type Size } from './store/blobs.ts';
import { IdbDb } from './store/db.ts';
import { GameStore, type Clock, type KeyValue } from './store/gamestore.ts';
import { load as loadSeat, save as saveSeat, type Seat } from './store/seat.ts';
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
function views(game: Game, gameId: string, viewer: Viewer, blobs: BlobStore, moves: Moves, missing: (hash: string) => string | undefined): { table: TableView; drag: Drag } {
  const who = viewer?.name ?? 'nobody', gm = !!viewer?.gm;
  let seat: Seat = loadSeat(localStorage, gameId, who);
  const keep = (s: Seat) => { seat = s; saveSeat(localStorage, gameId, who, s); };
  const redraw = () => table.render(game.all().map(([rid]) => rid));
  const mint = () => minter(game, gm);
  let drag: Drag | undefined;
  const table = new TableView(document.getElementById('table')!, document.getElementById('world')!, {
    game, viewer, view: seat.view, keepView: v => keep({ ...seat, view: v }), schedule: frame,
    imageUrl: hash => blobs.url(hash), imageGone: hash => blobs.release(hash), missing,
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
    dragPool: (rid, down, move) => drag?.startPool(rid, down, move),
  });
  drag = new Drag({ game, table, moves, mint, schedule: frame });
  return { table, drag };
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
    const game: Game = store.game, name = local('hollow.name') ?? 'Player';
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
    const { table, drag } = views(game, store.current!.id, { name, gm: false }, blobs, moves, hash => images.missing.get(hash));
    return { stamp: HOLLOW_STAMP, role: 'player' as const, tab, identity, store, blobs, wire, presence, copy, rolls, images, moves, view: table, drag };
  }

  // The GM's page: the game is here; a table opens on demand, in the room remembered for this game.
  await store.start();
  const game: Game = store.game;
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
    const presence = new Presence({ net: wire, clock, role: 'gm', name: 'GM',
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
  // R158: the invite carries the room and the GM's browser id.
  const link = () => invite(location.href, open().room, identity.id);
  const { table: view, drag } = views(game, store.current!.id, { name: 'GM', gm: true }, blobs, moves, hash => table?.images.missing.get(hash));
  return { stamp: HOLLOW_STAMP, role: 'gm' as const, tab, identity, store, blobs, open, invite: link, moves, view, drag,
    get table() { return table; }, get rolls() { return rolls; } };
}

const ready = main();
if (new URLSearchParams(location.search).has('test')) {
  (window as unknown as { hollow: unknown }).hollow = { stamp: HOLLOW_STAMP, ready };
}
