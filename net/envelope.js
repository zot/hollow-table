// Copied from ~/work/ipfs-test/src/envelope.js at 5455c3e for the Glimmer mockup (11-09); the CRC/R refs are ipfs-test's.
// CRC: crc-Envelope.md | Seq: seq-message.md#1.4 | R12, R33, R34, R44
//
// Kubo carries opaque bytes; this envelope is entirely our own convention.
// A topic is public and anything may publish to it, so `parse` treats every
// input as hostile: it never throws, and never returns a partly-valid object.

const VERSION = 1;
const MAX_NICK = 32;
// Glimmer: 60000, not 2000. A piece of the table is HTML; net/table.js splits a big batch into parts.
const MAX_TEXT = 60000;

// R44
// The per-sender counter is what turns "pubsub feels flaky" into a number:
// a receiver seeing 4 then 6 knows message 5 was lost, which no amount of
// watching a chat window would reveal.
export function create(nick, text, seq, kind = 'chat') {
  return JSON.stringify({
    v: VERSION,
    id: newId(),
    kind,
    nick: String(nick).slice(0, MAX_NICK),
    text: String(text).slice(0, MAX_TEXT),
    ts: Date.now(),
    seq,
  });
}

// Glimmer adds presence (hello on joining, here as a heartbeat and a reply to newcomers, bye on
// leaving); roll, the table view of a roll; intent, a player asking the GM's page to roll; and
// refuse, the GM's page saying why it won't.
// Then the table itself (net/table.js): move, a piece dragged on another page; recs, the GM's page's
// saved pieces; edit, a player's own changes sent to the GM's page; sync, asking for the whole table.
const KINDS = new Set(['chat', 'beat', 'hello', 'here', 'bye', 'roll', 'intent', 'refuse', 'move', 'recs', 'edit', 'sync', 'claim']);

// R12, R34
export function parse(raw) {
  let o;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object' || o.v !== VERSION) return null;
  if (typeof o.id !== 'string' || !o.id) return null;
  if (!KINDS.has(o.kind)) return null;
  if (typeof o.nick !== 'string' || typeof o.text !== 'string') return null;
  if (!Number.isFinite(o.ts) || !Number.isInteger(o.seq) || o.seq < 0) return null;
  return {
    v: o.v,
    id: o.id,
    kind: o.kind,
    // Length caps are enforced on the way in as well as out: the sender is
    // not trusted to have honoured them.
    nick: o.nick.slice(0, MAX_NICK),
    text: o.text.slice(0, MAX_TEXT),
    ts: o.ts,
    seq: o.seq,
  };
}

// R33
export function newId() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export const limits = { VERSION, MAX_NICK, MAX_TEXT };
