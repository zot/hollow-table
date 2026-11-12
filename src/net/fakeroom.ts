// CRC: crc-Wire.md | Test: test-Authority.md, test-Copy.md
// A room in memory standing in for Wire: pages join with a tab, a browser and a sealing key; what
// one sends reaches the others (or one tab) through Envelope's check, unless the room is told to
// drop it. Delivery waits for `settle()`, so a test decides when the wire moves.

import { check, make, type Kind } from './envelope.ts';
import type { Link, Peer } from './link.ts';

type Handler = (body: never, from: Peer) => void | Promise<void>;
type Sent = { kind: Kind; body: unknown; from: Peer; to?: string };

export class FakeRoom {
  #pages = new Map<string, { peer: Peer; handlers: Map<Kind, Handler[]>; online: boolean }>();
  #queue: Sent[] = [];
  #busy: Promise<unknown>[] = [];
  /** Every message delivered or dropped, in order. */
  log: (Sent & { dropped: boolean })[] = [];
  #watched: (() => Promise<unknown>)[] = [];
  /** Return true to drop a message on the way. */
  drop: (m: Sent) => boolean = () => false;

  /** A page's Link. A page rejoining under the same tab replaces the old one (a reload). */
  link(peer: Peer): Link {
    const page = { peer, handlers: new Map<Kind, Handler[]>(), online: true };
    this.#pages.set(peer.tab, page);
    return {
      tab: peer.tab,
      send: (kind, body, to) => { if (page.online && this.#pages.get(peer.tab) === page) this.#queue.push({ kind, body, from: peer, ...(to && { to }) }); },
      on: (kind, fn) => { page.handlers.set(kind, [...(page.handlers.get(kind) ?? []), fn as Handler]); },
    };
  }

  /** Work a page does in the background (sealing, opening) that settle() should wait for. */
  watch(idle: () => Promise<unknown>): void { this.#watched.push(idle); }

  /** A page goes away or comes back; while away it hears nothing and sends nothing. */
  online(tab: string, on: boolean): void {
    const p = this.#pages.get(tab);
    if (p) p.online = on;
  }

  /** Delivers everything, including what the deliveries cause, until the room is quiet. */
  async settle(rounds = 200): Promise<void> {
    for (let i = 0; i < rounds; i++) {
      await new Promise(r => setTimeout(r, 0));
      const queue = this.#queue;
      this.#queue = [];
      for (const m of queue) this.#deliver(m);
      const busy = this.#busy;
      this.#busy = [];
      await Promise.all(busy);
      await Promise.all(this.#watched.map(w => w()));
      await new Promise(r => setTimeout(r, 0));
      if (!queue.length && !busy.length && !this.#queue.length) return;
    }
    throw new Error('the room never settled');
  }

  #deliver(m: Sent): void {
    const dropped = this.drop(m);
    this.log.push({ ...m, dropped });
    if (dropped) return;
    const env = check(JSON.parse(JSON.stringify(make(m.kind, m.from.tab, m.body))));
    if (!env) throw new Error(`a ${m.kind} from ${m.from.tab} failed Envelope.check`);
    for (const [tab, page] of this.#pages) {
      if (tab === m.from.tab || !page.online || (m.to && m.to !== tab)) continue;
      for (const fn of page.handlers.get(m.kind) ?? []) {
        const r = fn(env.body as never, m.from);
        if (r) this.#busy.push(r);
      }
    }
  }
}
