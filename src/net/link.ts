// CRC: crc-Wire.md | R160, R165
// The face Wire shows the rest of the page: send to everyone or to one tab, and hear checked
// messages with the sender's proven identity. Wire is the only code that knows Trystero; Authority,
// Copy, Presence and Rolls see only this, so their tests run over a fake room.

import type { Kind } from './envelope.ts';

/** Who a message came from: its tab, the browser that proved itself in the handshake, and the
 * sealing key that browser vouched for. */
export type Peer = { tab: string; browser: string; sealKey: string };

export interface Link {
  /** This page's tab id. */
  readonly tab: string;
  /** To every page at the table, or to one tab. Nothing echoes back. */
  send(kind: Kind, body: unknown, to?: string): void;
  /** Checked messages of a kind (Envelope), with who sent them. */
  on(kind: Kind, fn: (body: never, from: Peer) => void | Promise<void>): void;
}
