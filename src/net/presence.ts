// CRC: crc-Presence.md | Seq: seq-join.md#1.8, seq-join.md#1.9 | R155, R157, R158, R159, R161, R162, R163
// Who's at the table, and the room itself. The room's name is the capability: whoever has the
// invite can join, and nobody else hears anything.

import type { Clock } from '../store/gamestore.ts';
import type { Net, Peer } from './link.ts';

export const OFFLINE_MS = 15_000, CHECK_MS = 1000;

export type Role = 'gm' | 'player';
export type Person = { name: string; role: Role; browser: string };
export type Status = { state: 'live' } | { state: 'offline'; why: string };

// R157: the room is random, about 128 bits, after a readable label.
/** A new room name. */
export function newRoom(label = 'table'): string {
  const hex = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'table'}-${hex}`;
}

// R158: the invite carries the room and the GM's browser id.
/** The link a player joins by. */
export function invite(base: string, room: string, gm: string): string {
  const u = new URL(base);
  u.search = '';
  u.hash = '';
  u.searchParams.set('room', room);
  u.searchParams.set('gm', gm);
  return u.toString();
}

const ROOM = /^[a-z0-9-]{1,40}-[0-9a-f]{32}$/, BROWSER = /^[\w-]{20}$/;

// R155: the plain page is the GM's; an invite makes a player.
/** What a page's URL makes it: a player, with the room and the GM's browser; or null (the GM). */
export function fromUrl(search: string): { room: string; gm: string } | null {
  const q = new URLSearchParams(search), room = q.get('room'), gm = q.get('gm');
  return room && gm && ROOM.test(room) && BROWSER.test(gm) ? { room, gm } : null;
}

export type PresenceWith = {
  net: Net; clock: Clock; role: Role; name: string;
  /** Someone said who they are (the GM's page hands players to Authority.join). */
  here?: (person: Person, from: Peer) => void;
  /** Someone left. */
  gone?: (tab: string) => void;
};

export class Presence {
  /** tab → who is there. */
  people = new Map<string, Person>();
  status: Status = { state: 'live' };
  #w: PresenceWith;
  #name: string;
  #lastLive: number;
  #tick: unknown = null;

  constructor(w: PresenceWith) {
    this.#w = w;
    this.#name = w.name;
    this.#lastLive = w.clock.now();
    // Seq: seq-join.md#1.8 | R161: a page that connects is greeted, and answers that page only.
    w.net.onJoin(p => { w.net.send('hello', {}, p.tab); });
    w.net.on('hello', (_: never, from: Peer) => { w.net.send('here', { name: this.#name, role: w.role }, from.tab); });
    w.net.on('here', (body: { name: string; role: Role }, from: Peer) => {
      const person = { name: body.name, role: body.role, browser: from.browser };
      this.people.set(from.tab, person);
      w.here?.(person, from);
    });
    // R162: a connection that closes is a goodbye.
    const gone = (tab: string) => { if (this.people.delete(tab)) w.gone?.(tab); };
    w.net.onLeave(p => gone(p.tab));
    w.net.on('bye', (_: never, from: Peer) => gone(from.tab));
  }

  get name(): string { return this.#name; }

  /** Starts watching whether this page can reach anyone. */
  start(): void {
    const tick = () => { this.#check(); this.#tick = this.#w.clock.setTimeout(tick, CHECK_MS); };
    this.#tick = this.#w.clock.setTimeout(tick, CHECK_MS);
  }

  // R163: live while a relay or a peer is reachable; offline after 15 s with neither, with why.
  #check(): void {
    const now = this.#w.clock.now(), r = this.#w.net.reachable();
    if (r.relays || r.peers) { this.#lastLive = now; this.status = { state: 'live' }; return; }
    if (now - this.#lastLive >= OFFLINE_MS) {
      this.status = { state: 'offline', why: 'No relay or other page has been reachable for 15 seconds; still trying.' };
    }
  }

  // R159: the GM's own name tag renames.
  /** This page's name, told to everyone. */
  rename(name: string): void {
    this.#name = name;
    this.#w.net.send('here', { name, role: this.#w.role });
  }

  /** Leaves the room (the GM's shift-click on Copy invite closes the table). */
  async close(): Promise<void> {
    if (this.#tick !== null) this.#w.clock.clearTimeout(this.#tick);
    this.#tick = null;
    this.#w.net.send('bye', {});
    await this.#w.net.leave();
    this.people.clear();
  }
}
