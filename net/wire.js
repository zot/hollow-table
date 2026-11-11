// The wire (11-11): browser to browser over WebRTC, with Trystero finding the peers through public
// Nostr relays. Replaces Kubo pubsub (net/kubo.js, net/room.js; kept in .scratch/retired/). ipfs-test measured it:
// different homes connect directly in about a second, with nothing to install. The relays only
// carry the introductions; the table's messages go peer to peer.
//
// What changes from pubsub:
// - Nobody outside the room hears anything, and a message can go to one peer (target) rather than
//   to everyone. Nothing comes back to the sender, so there is no echo to wait for.
// - A Trystero peer id lasts one page load. Who a peer is comes from a handshake each connection
//   makes before it's let in: both sides send their browser's identity key (net/ident.js), their
//   sealing key (net/seal.js), and a fresh nonce, then sign the other's nonce with both peer ids
//   and both keys. A peer whose signature doesn't check out is refused. So `idOf(peer)` names the
//   browser behind a connection, and `keyOf(peer)` is a sealing key that browser vouched for.
// - Images ride here too, as requests: ask the room for a hash; whoever has the bytes answers.

import { joinRoom, selfId, getRelaySockets } from 'https://cdn.jsdelivr.net/npm/@trystero-p2p/nostr@0.26.0/+esm';
import { identity, verify, PUB } from './ident.js';
import { pub, ready as keyReady } from './seal.js';
import * as Envelope from './envelope.js';

const APP = 'glimmer-online-mockup';
const STUN = ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'];
// Trystero picks 5 of its ~30 default relays by app id, and on 11-11 three of ours were dead. These
// six answered a subscription that day (kaleidoswap and layer.systems answer but refuse Trystero's
// events: ipfs-test; nostr.stakey.net rate-limited two pages joining). Every page uses the same list, so any two share all six.
const RELAYS = ['nos.lol', 'nostr.chaima.info', 'nostr.rblb.it', 'nostr.red5d.dev', 'relay.grigic.org', 'relay.bitmacro.cloud'].map(h => 'wss://' + h);
const BLOB_MAX = 25 * 1024 * 1024, BLOB_MS = 60000;
const b64n = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
const said = (room, nonce, signer, other, ik, key) => ['glimmer-hello', room, nonce, signer, other, ik, key].join('|');

export { selfId };

// Join a room. on: { message(env, peer), join(peer), leave(peer), refused(peer, why), blob(hash) -> Blob|null }
export async function connect(roomName, on) {
  const me = await identity; await keyReady;
  const who = new Map();                                // peer -> { id, key }
  const handshake = async (peer, send, receive) => {
    const nonce = b64n();
    await send({ ik: me.pub, key: pub(), nonce });
    const { data: hi } = await receive();
    if (!hi || !PUB.test(hi.ik || '') || !PUB.test(hi.key || '') || typeof hi.nonce !== 'string' || hi.nonce.length > 40) throw new Error('bad hello');
    await send({ sig: await me.sign(said(roomName, hi.nonce, selfId, peer, me.pub, pub())) });
    const { data: back } = await receive();
    const id = await verify(hi.ik, back?.sig, said(roomName, nonce, peer, selfId, hi.ik, hi.key));
    if (!id) throw new Error('signature');
    who.set(peer, { id, key: hi.key });
  };
  const room = joinRoom({ appId: APP, rtcConfig: { iceServers: STUN.map(urls => ({ urls })) }, maxReceiveBytes: 64 * 1024 * 1024, relayConfig: { urls: RELAYS },
    ...(localStorage.getItem('glimmer.loopback') ? { _test_only_mdnsHostFallbackToLoopback: true } : {}) },   // tests: pages in one headless browser
    roomName, { onPeerHandshake: handshake, handshakeTimeoutMs: 15000, onJoinError: d => on.refused?.(d.peerId, d.error) });

  const msg = room.makeAction('g');
  let seq = 0;
  msg.onMessage = (text, { peerId }) => {
    if (typeof text !== 'string' || !who.has(peerId)) return;
    const env = Envelope.parse(text);
    if (env) on.message(env, peerId);
  };
  room.onPeerJoin = peer => on.join?.(peer);
  room.onPeerLeave = peer => { on.leave?.(peer); who.delete(peer); };

  const img = room.makeAction('img', {
    kind: 'request',
    onRequest: async hash => {
      if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) throw new Error('bad hash');
      const b = await on.blob?.(hash);
      if (!b) throw new Error('not here');
      return b;
    },
  });
  img.onReceive = ({ byteLength }) => byteLength <= BLOB_MAX;

  const peers = () => Object.keys(room.getPeers()).filter(p => who.has(p));
  return {
    selfId, me,
    peers, idOf: p => who.get(p)?.id ?? null, keyOf: p => who.get(p)?.key ?? null,
    relaysOpen: () => { try { return Object.values(getRelaySockets() || {}).filter(ws => ws?.readyState === 1).length; } catch { return 0; } },
    // A message to everyone, or to one peer. Resolves to how many peers it went to.
    send: async (kind, text, target) => {
      const to = target ? [target].filter(p => who.has(p)) : peers();
      if (!to.length) return 0;
      await msg.send(Envelope.create('', text, ++seq, kind), { target: target ? to : null });
      return to.length;
    },
    // Ask everyone for an image's bytes; the first good answer wins.
    askBlob: hash => new Promise(ok => {
      const ts = peers();
      if (!ts.length) return ok(null);
      let done = false;
      img.requestMany(hash, { targets: ts, timeoutMs: BLOB_MS, onResult: r => {
        const v = r.status === 'fulfilled' ? r.value : null;   // a Blob sent arrives as bytes
        if (!done && (v instanceof Blob || v instanceof ArrayBuffer || ArrayBuffer.isView(v))) { done = true; ok(v instanceof Blob ? v : new Blob([v])); }
      } }).then(() => { if (!done) ok(null); }, () => { if (!done) ok(null); });
    }),
    leave: () => room.leave(),
  };
}
