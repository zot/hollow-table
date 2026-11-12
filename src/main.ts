// CRC: crc-Build.md | R155, R196, R201
// The page's entry point: the store, this browser's identity, and, at a table, the network. The
// plain page is the GM's and opens a table on demand; an invite makes a player, who joins with a
// copy of the GM's table. The views attach here as they land. With `?test` the page exposes one
// object, `window.hollow`, for Playwright, and nothing otherwise.

import { Game } from './model/game.ts';
import type { Book } from './model/records.ts';
import { Authority } from './net/authority.ts';
import { Copy } from './net/copy.ts';
import { Identity } from './net/identity.ts';
import { ImageExchange } from './net/images.ts';
import { Presence, fromUrl, invite, newRoom } from './net/presence.ts';
import { Rolls } from './net/rolls.ts';
import { Sealer } from './net/seal.ts';
import { Stamps } from './net/stamps.ts';
import { Wire } from './net/wire.ts';
import { BlobStore, type Size } from './store/blobs.ts';
import { IdbDb } from './store/db.ts';
import { GameStore, type Clock, type KeyValue } from './store/gamestore.ts';

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
    const copy = new Copy({ game, stamps, sealer, link: wire, clock, session: sessionStorage, local: localStorage, room: invited.room, gm: invited.gm });
    const presence = new Presence({ net: wire, clock, role: 'player', name });
    const rolls = new Rolls({ game, sealer, clock, rng, link: wire, session: sessionStorage, gm: false, gmBrowser: invited.gm });
    const images = new ImageExchange(wire, blobs, clock);
    images.watch(game);
    images.start();
    presence.start();
    copy.start();
    return { stamp: HOLLOW_STAMP, role: 'player' as const, tab, identity, store, blobs, wire, presence, copy, rolls, images };
  }

  // The GM's page: the game is here; a table opens on demand, in the room remembered for this game.
  await store.start();
  const game: Game = store.game;
  let table: { room: string; wire: Wire; presence: Presence; authority: Authority; rolls: Rolls; images: ImageExchange } | null = null;
  let rolls = new Rolls({ game, sealer, clock, rng, link: null, session: sessionStorage, gm: true });

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
    table = { room, wire, presence, authority, rolls, images };
    return table;
  };
  // R158: the invite carries the room and the GM's browser id.
  const link = () => invite(location.href, open().room, identity.id);
  return { stamp: HOLLOW_STAMP, role: 'gm' as const, tab, identity, store, blobs, open, invite: link,
    get table() { return table; }, get rolls() { return rolls; } };
}

const ready = main();
if (new URLSearchParams(location.search).has('test')) {
  (window as unknown as { hollow: unknown }).hollow = { stamp: HOLLOW_STAMP, ready };
}
