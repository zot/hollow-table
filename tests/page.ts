// CRC: crc-Build.md | R201, R297
// What every browser spec needs: a page opened with the test hook, ready, and its game read back.
import type { Browser, Page } from '@playwright/test';

/** The local relay the spec run starts (playwright.config.ts). */
export const RELAY = 'ws://127.0.0.1:8782';

/** Opens the page (the GM's, or an invite) with the test hook and waits until it is assembled. */
export async function open(page: Page, path = '/'): Promise<void> {
  const url = new URL(path, 'http://x/');
  url.searchParams.set('test', '');
  await page.goto(`${url.pathname}${url.search}`);
  await page.waitForFunction(() => (window as unknown as { hollow?: { ready: Promise<unknown> } }).hollow?.ready);
  await page.evaluate(() => (window as unknown as { hollow: { ready: Promise<unknown> } }).hollow.ready);
  // The hand-drawn fonts reflow the cards when they arrive: measure only after.
  await page.evaluate(() => document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))));
}

type Hook = { ready: Promise<{ store: { current: { id: string }; game: { all(): [string, unknown][] }; read(id: string): Promise<{ records: [string, unknown][] }> } }> };

/** The open game's records, as the page holds them and as its database does. */
export function records(page: Page): Promise<{ held: string; saved: string; id: string }> {
  return page.evaluate(async () => {
    const h = await (window as unknown as { hollow: Hook }).hollow.ready, id = h.store.current.id;
    const sorted = (rs: [string, unknown][]) => JSON.stringify([...rs].sort(([a], [b]) => a.localeCompare(b)));
    return { held: sorted(h.store.game.all()), saved: sorted((await h.store.read(id)).records), id };
  });
}

/** Every localStorage key and value on the page's origin. */
export function storage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)!])));
}

type Hooked = { hollow: { ready: Promise<Record<string, unknown>> } };

/** A page of its own (its own context, so its own identity and database), meeting through the
 * local relay, or the public ones when `publicRelays`; `name` is what it answers when asked. */
export async function person(browser: Browser, name = 'Player', publicRelays = false): Promise<Page> {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:8781/', viewport: { width: 1400, height: 840 } });
  await context.addInitScript(([relay, n]) => {
    if (relay) localStorage.setItem('hollow.relay', relay);
    localStorage.setItem('hollow.loopback', '1');
    localStorage.setItem('hollow.name', n);
  }, [publicRelays ? '' : RELAY, name] as const);
  const page = await context.newPage();
  page.on('dialog', d => void d.accept());
  return page;
}

/** Runs `fn` on the page's assembled parts (the test hook). */
export function hook<T>(page: Page, fn: (h: any) => T | Promise<T>): Promise<T> {
  return page.evaluate(async src => {
    const h = await (window as unknown as Hooked).hollow.ready;
    return (0, eval)(`(${src})`)(h);
  }, fn.toString());
}

/** The GM's page with the table open, and the invite. */
export async function gmTable(browser: Browser, publicRelays = false): Promise<{ gm: Page; invite: string }> {
  const gm = await person(browser, 'GM', publicRelays);
  await open(gm);
  await gm.locator('#bar .invite').click();
  const url = new URL(await hook(gm, h => h.invite() as string));
  return { gm, invite: `/${url.search}` };
}

/** A player joining by the invite, synced: holding as many records as the GM's page. */
export async function join(browser: Browser, invite: string, name: string, gm: Page, publicRelays = false): Promise<Page> {
  const p = await person(browser, name, publicRelays);
  await open(p, invite);
  await synced(p, gm);
  return p;
}

/** Waits until the player's page holds what anyone may see of the GM's table: the same rids. */
export async function synced(player: Page, gm: Page, timeout = 20_000): Promise<void> {
  const rids = (p: Page) => hook(p, h => h.store.game.all().map(([rid]: [string]) => rid).filter((r: string) => r !== 'book' && r !== 'tape').sort().join());
  const want = await rids(gm), start = Date.now();
  while (await rids(player) !== want) {
    if (Date.now() - start > timeout) throw new Error(`not synced: ${await rids(player)} vs ${want}`);
    await player.waitForTimeout(200);
  }
}

/** A record as the page holds it. */
export function rec(page: Page, rid: string): Promise<any> {
  return page.evaluate(async rid => (await (window as any).hollow.ready).store.game.get(rid), rid);
}

/** Every record of a kind the page holds, as [rid, record]. */
export function kinds(page: Page, kind: string): Promise<[string, any][]> {
  return page.evaluate(async kind => (await (window as any).hollow.ready).store.game.all().filter(([, r]: [string, any]) => r.kind === kind), kind);
}

/** Presses at (x, y), moves to (x2, y2) in steps, and lets go: a person's drag. */
export async function dragFromTo(page: Page, x: number, y: number, x2: number, y2: number, steps = 10): Promise<void> {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + Math.sign(x2 - x) * 8, y + Math.sign(y2 - y) * 8, { steps: 2 });
  await page.mouse.move(x2, y2, { steps });
  await page.mouse.up();
}

/** A point inside an element, `dx`, `dy` in from its top left. */
export async function at(page: Page, selector: string, dx = 6, dy = 6): Promise<{ x: number; y: number }> {
  const b = (await page.locator(selector).first().boundingBox())!;
  return { x: b.x + dx, y: b.y + dy };
}

/** The bar's middle, where a carried thing is put away. */
export async function barMiddle(page: Page): Promise<{ x: number; y: number }> {
  const b = (await page.locator('#bar').boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** A drag through waypoints: pressed at the first point, let go at the last. */
export async function dragVia(page: Page, points: { x: number; y: number }[], steps = 8): Promise<void> {
  const [first, ...rest] = points;
  await page.mouse.move(first!.x, first!.y);
  await page.mouse.down();
  for (const p of rest) await page.mouse.move(p.x, p.y, { steps });
  await page.mouse.up();
}
