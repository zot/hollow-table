// CRC: crc-Wire.md | Seq: seq-join.md#1, seq-join.md#1.1, seq-join.md#1.2, seq-join.md#1.3, seq-join.md#1.4, seq-join.md#1.5, seq-join.md#1.6, seq-join.md#1.7 | R156, R160, R162, R165
// The only code that knows Trystero. Pages meet in a room through public Nostr relays, which carry
// only the introductions; the table's messages go peer to peer over WebRTC. A peer is let in only
// after the identity handshake, so every message's sender is the browser behind that connection.

import { getRelaySockets, joinRoom, selfId, type DataPayload, type JsonValue, type MessageAction, type Room } from '@trystero-p2p/nostr';
import { check, make, type Kind } from './envelope.ts';
import { Identity, PUB, verify } from './identity.ts';
import type { Net, Peer } from './link.ts';
import type { Sealer } from './seal.ts';
import { b64 } from './b64.ts';

export const APP = 'hollow-table';
// R160: Trystero picks a few of its default relays by app id, and on 11-11 three of the mockup's
// were dead. These six answered that day; every page uses the same list, so any two share them all.
export const RELAYS = ['nos.lol', 'nostr.chaima.info', 'nostr.rblb.it', 'nostr.red5d.dev', 'relay.grigic.org', 'relay.bitmacro.cloud']
  .map(h => `wss://${h}`);
const STUN = ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'];
/** The largest message (Trystero chunks it on the way) and the largest image. */
export const MAX_BYTES = 64 * 1024 * 1024, BLOB_MAX = 25 * 1024 * 1024;
const BLOB_MS = 60_000, HANDSHAKE_MS = 15_000;
const HASH = /^[0-9a-f]{64}$/, TAB = /^[\w-]{1,64}$/;

type Hi = { ik: string; key: string; nonce: string; tab: string };
type Handler = (body: never, from: Peer) => void | Promise<void>;

export type WireWith = {
  identity: Identity; sealer: Sealer;
  /** This page's tab id (sessionStorage), the same across reloads. */
  tab: string;
  /** Tests only: pages in one headless browser need Trystero's loopback fallback. */
  loopback?: boolean;
  /** Tests only (R297): the local relay the spec run starts, in place of the public ones. */
  relay?: string;
  /** A peer the handshake refused, and why. */
  refused?: (peer: string, why: string) => void;
};

export class Wire implements Net {
  readonly tab: string;
  #room: Room;
  #who = new Map<string, Peer>();
  #byTab = new Map<string, string>();
  #handlers = new Map<Kind, Handler[]>();
  #joins: ((p: Peer) => void)[] = [];
  #leaves: ((p: Peer) => void)[] = [];
  #answer: ((hash: string) => Promise<Blob | undefined>) | undefined;
  #msg: MessageAction<DataPayload>;
  #img;

  // Seq: seq-join.md#1 | R156: join a room; the relays only introduce.
  constructor(roomName: string, w: WireWith) {
    this.tab = w.tab;
    this.#room = joinRoom({
      appId: APP, maxReceiveBytes: MAX_BYTES, relayConfig: { urls: w.relay ? [w.relay] : RELAYS },
      rtcConfig: { iceServers: STUN.map(urls => ({ urls })) },
      ...(w.loopback && { _test_only_mdnsHostFallbackToLoopback: true }),
    }, roomName, {
      onPeerHandshake: (peer, send, receive) => this.#handshake(w, peer, send, receive),
      handshakeTimeoutMs: HANDSHAKE_MS,
      onJoinError: d => w.refused?.(d.peerId, d.error),
    });
    this.#msg = this.#room.makeAction<DataPayload>('e');
    this.#msg.onMessage = (data, { peerId }) => this.#heard(data, peerId);
    this.#room.onPeerJoin = peer => { const p = this.#who.get(peer); if (p) for (const fn of this.#joins) fn(p); };
    // R162: a closed connection counts as leaving.
    this.#room.onPeerLeave = peer => {
      const p = this.#who.get(peer);
      this.#who.delete(peer);
      if (!p) return;
      if (this.#byTab.get(p.tab) === peer) this.#byTab.delete(p.tab);
      for (const fn of this.#leaves) fn(p);
    };
    this.#img = this.#room.makeAction<string, Blob>('img', {
      kind: 'request',
      onRequest: async hash => {
        if (typeof hash !== 'string' || !HASH.test(hash)) throw new Error('not an image hash');
        const blob = await this.#answer?.(hash);
        if (!blob) throw new Error('not here');
        return blob;
      },
      onReceive: ({ byteLength }) => byteLength <= BLOB_MAX,
    });
  }

  // Seq: seq-join.md#1.2 to seq-join.md#1.6 | R165: both sides prove their browsers' keys and vouch
  // for their sealing keys; a bad proof refuses the peer, which never joins.
  async #handshake(w: WireWith, peer: string, send: (d: JsonValue) => Promise<void>, receive: () => Promise<{ data: unknown }>): Promise<void> {
    const nonce = b64(crypto.getRandomValues(new Uint8Array(16)));
    await send({ ik: w.identity.pub, key: w.sealer.pub, nonce, tab: this.tab } satisfies Hi);
    const hi = (await receive()).data as Partial<Hi> | null;
    if (!hi || typeof hi.ik !== 'string' || !PUB.test(hi.ik) || typeof hi.key !== 'string' || !PUB.test(hi.key)
      || typeof hi.nonce !== 'string' || hi.nonce.length > 40 || typeof hi.tab !== 'string' || !TAB.test(hi.tab)) throw new Error('bad hello');
    await send({ sig: await w.identity.prove(hi.nonce, { from: selfId, to: peer }, w.sealer.pub) });
    const back = (await receive()).data as { sig?: unknown } | null;
    const browser = await verify(back?.sig, nonce, { from: peer, to: selfId }, hi.ik, hi.key);
    if (!browser) throw new Error('the proof did not check out');
    this.#who.set(peer, { tab: hi.tab, browser, sealKey: hi.key });
    this.#byTab.set(hi.tab, peer);
  }

  // R177: checked before anyone reads it, and only from a proven peer speaking for its own tab.
  #heard(data: unknown, peer: string): void {
    const p = this.#who.get(peer), env = p && check(data);
    if (!p || !env || env.tab !== p.tab) return;
    for (const fn of this.#handlers.get(env.kind) ?? []) void fn(env.body as never, p);
  }

  #peers(): string[] { return Object.keys(this.#room.getPeers()).filter(p => this.#who.has(p)); }

  /** To everyone, or to one tab; resolves with how many peers it reached. Nothing echoes back. */
  async send(kind: Kind, body: unknown, to?: string): Promise<number> {
    const targets = to ? [this.#byTab.get(to)].filter((p): p is string => !!p && this.#who.has(p)) : this.#peers();
    if (!targets.length) return 0;
    await this.#msg.send(make(kind, this.tab, body) as unknown as JsonValue, { target: to ? targets : null });
    return targets.length;
  }

  on(kind: Kind, fn: Handler): void {
    this.#handlers.set(kind, [...(this.#handlers.get(kind) ?? []), fn]);
  }

  onJoin(fn: (p: Peer) => void): void { this.#joins.push(fn); }
  onLeave(fn: (p: Peer) => void): void { this.#leaves.push(fn); }
  answer(fn: (hash: string) => Promise<Blob | undefined>): void { this.#answer = fn; }

  /** Asks every peer for an image's bytes; the first answer wins. */
  request(hash: string): Promise<Blob | null> {
    const targets = this.#peers();
    if (!targets.length) return Promise.resolve(null);
    return new Promise(done => {
      let got = false;
      const none = () => done(null);   // a no-op once an answer has resolved it
      this.#img.requestMany(hash, {
        targets, timeoutMs: BLOB_MS,
        onResult: r => {
          const v: unknown = r.status === 'fulfilled' ? r.value : null;
          if (got || !(v instanceof Blob || v instanceof ArrayBuffer || ArrayBuffer.isView(v))) return;
          got = true;
          done(v instanceof Blob ? v : new Blob([v as ArrayBuffer]));
        },
      }).then(none, none);
    });
  }

  reachable(): { relays: number; peers: number } {
    let relays = 0;
    try { relays = Object.values((getRelaySockets() ?? {}) as Record<string, WebSocket>).filter(s => s?.readyState === 1).length; } catch { /* none */ }
    return { relays, peers: this.#peers().length };
  }

  leave(): Promise<void> { return this.#room.leave(); }
}
