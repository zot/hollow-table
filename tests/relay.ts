// CRC: crc-Build.md | R297
// A small Nostr relay for the specs, so pages meet without the internet. It does what Trystero asks
// of a relay and no more: EVENT is acknowledged and handed to every subscription it matches (by kind,
// `#x` tag and since), REQ subscribes and answers EOSE (nothing is stored), CLOSE unsubscribes.
// Usage: node tests/relay.ts [port]
import { WebSocketServer, type WebSocket } from 'ws';

type Filter = { kinds?: number[]; since?: number; '#x'?: string[] };
type Event = { id: string; kind: number; created_at: number; tags: string[][] };

const matches = (f: Filter, e: Event) =>
  (!f.kinds || f.kinds.includes(e.kind))
  && (f.since === undefined || e.created_at >= f.since)
  && (!f['#x'] || e.tags.some(([k, v]) => k === 'x' && f['#x']!.includes(v!)));

const port = Number(process.argv[2] ?? 8782);
const subs = new Map<WebSocket, Map<string, Filter[]>>();
const server = new WebSocketServer({ host: '127.0.0.1', port });

server.on('connection', ws => {
  subs.set(ws, new Map());
  ws.on('close', () => subs.delete(ws));
  ws.on('message', raw => {
    let msg: unknown[];
    try { msg = JSON.parse(String(raw)); } catch { return; }
    const [type, a, ...filters] = msg as [string, unknown, ...Filter[]];
    if (type === 'REQ') {
      subs.get(ws)!.set(a as string, filters);
      ws.send(JSON.stringify(['EOSE', a]));
    } else if (type === 'CLOSE') {
      subs.get(ws)!.delete(a as string);
    } else if (type === 'EVENT') {
      const e = a as Event;
      ws.send(JSON.stringify(['OK', e.id, true, '']));
      for (const [to, mine] of subs) for (const [id, fs] of mine) if (fs.some(f => matches(f, e))) to.send(JSON.stringify(['EVENT', id, e]));
    }
  });
});
server.on('listening', () => console.log(`relay on ws://127.0.0.1:${port}`));
