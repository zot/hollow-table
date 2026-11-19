// CRC: crc-Build.md | R452
// Which relays answer: each in the page's pinned list (Wire's RELAYS) and in Trystero's own defaults,
// asked for one event. The list is tended by hand from this report; it never changes by itself (R160).
// Run with `npm run relays`.

/** As much of a WebSocket as the probe uses, so a test can fake one. */
export type Socket = {
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: { message?: string }) => void) | null;
  onclose: ((ev: { code?: number }) => void) | null;
  send(m: string): void;
  close(): void;
};
export type Answer = { url: string; ok: boolean; ms: number; why?: string };

/** Whether the relay at `url` answers a request for one event within `wait` ms. */
export function probe(url: string, open: (url: string) => Socket, wait = 8000): Promise<Answer> {
  return new Promise(done => {
    const t0 = Date.now();
    let s: Socket | undefined, opened = false, over = false;
    const end = (ok: boolean, why?: string) => {
      if (over) return;
      over = true;
      clearTimeout(timer);
      if (s) { s.onopen = s.onmessage = s.onerror = s.onclose = null; try { s.close(); } catch { /* already gone */ } }
      done({ url, ok, ms: Date.now() - t0, ...(why && { why }) });
    };
    const timer = setTimeout(() => end(false, opened ? `connected, no answer in ${wait / 1000} s` : `no connection in ${wait / 1000} s`), wait);
    try { s = open(url); } catch (e) { end(false, `refused: ${(e as Error).message}`); return; }
    s.onopen = () => { opened = true; s!.send(JSON.stringify(['REQ', 'probe', { kinds: [1], limit: 1 }])); };
    s.onmessage = ev => {
      let m: unknown;
      try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (!Array.isArray(m)) return;
      if (m[0] === 'EOSE' || m[0] === 'EVENT') end(true);
      else if (m[0] === 'NOTICE' || m[0] === 'CLOSED') end(false, `${m[0]}: ${String(m.at(-1)).slice(0, 60)}`);
    };
    s.onerror = ev => end(false, opened ? `failed after connecting: ${ev.message ?? ''}` : `refused: ${ev.message ?? ''}`);
    s.onclose = ev => end(false, `closed (${ev.code ?? '?'})`);
  });
}

/** One line a relay, the pinned (`*`) first, answering ones first within each. */
export function report(answers: Answer[], pinned: string[]): string[] {
  const mine = new Set(pinned), w = Math.max(...answers.map(a => a.url.length));
  return [...answers]
    .sort((a, b) => Number(mine.has(b.url)) - Number(mine.has(a.url)) || Number(b.ok) - Number(a.ok) || a.url.localeCompare(b.url))
    .map(a => `${mine.has(a.url) ? '*' : ' '} ${a.url.padEnd(w)}  ${a.ok ? `answers in ${a.ms} ms` : a.why}`);
}

if (import.meta.main) {
  const { RELAYS } = await import('../src/net/wire.ts');
  const { defaultRelayUrls } = await import('@trystero-p2p/nostr');
  const urls = [...new Set([...RELAYS, ...defaultRelayUrls])];
  const answers = await Promise.all(urls.map(u => probe(u, url => new WebSocket(url) as unknown as Socket)));
  console.log(report(answers, RELAYS).join('\n'));
  const dead = answers.filter(a => !a.ok && RELAYS.includes(a.url));
  console.log(dead.length ? `\n${dead.length} pinned relay(s) don't answer: swap each for an answering default in src/net/wire.ts.` : '\nEvery pinned relay answers.');
}
