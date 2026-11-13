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
