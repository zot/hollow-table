// CRC: crc-Wire.md | Test: test-Network.md | R140, R141, R155, R156, R157, R158, R159, R161, R162, R166, R172, R173, R297
// Two pages find each other through the local relay, prove who they are, and sync both ways.
import { expect, test, type Page } from '@playwright/test';
import { gmTable, hook, join, open, records, synced } from './page.ts';

const STICKY = 'o:00000008', SAM = 'o:00000001', DEVREUX = 'o:00000003';

/** A record as a page holds it. */
const recOf = (page: Page, rid: string) => page.evaluate(async rid => {
  const h = await (window as any).hollow.ready;
  return h.store.game.get(rid);
}, rid);

/** Drags a piece by a point near its top left, by `dx`, `dy` screen pixels. */
async function drag(page: Page, selector: string, dx: number, dy: number) {
  const b = (await page.locator(selector).first().boundingBox())!, x = b.x + 6, y = b.y + 6;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

/** Waits until both pages hold the same record. */
async function agree(a: Page, b: Page, rid: string) {
  await expect.poll(async () => JSON.stringify(await recOf(b, rid)), { timeout: 15_000 }).toBe(JSON.stringify(await recOf(a, rid)));
}

test('join and sync', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  expect(invite).toMatch(/\?room=the-11-08-playtest-[0-9a-f]{32}&gm=[\w-]{20}$/);
  const dana = await join(browser, invite, 'Dana', gm);

  // Each sees the other; the GM's claims hold Dana's browser.
  await expect(gm.locator('#bar .folks .tag', { hasText: 'Dana' })).toHaveClass(/\blive\b/);
  await expect(dana.locator('#bar .folks .tag.gm')).toHaveClass(/\blive\b/);
  expect(await hook(gm, h => h.store.game.get('book').claims.Dana)).toBe(await hook(dana, h => h.identity.id));

  // The player's Ledger is a copy: no checkpoints, no game list (R141).
  await dana.locator('#ledgerbtn').click();
  await expect(dana.locator('#ledger .copy')).toBeVisible();
  await expect(dana.locator('#ledger .entries')).toHaveCount(0);
  await dana.locator('#table').click({ position: { x: 5, y: 400 } });

  // The GM drags the sticky: Dana's follows to the same place.
  const was = (await recOf(gm, STICKY)).place;
  await drag(gm, `[data-rid="${STICKY}"]`, 90, 40);
  expect((await recOf(gm, STICKY)).place).not.toEqual(was);
  await agree(gm, dana, STICKY);

  // The GM gives Sam to Dana; Dana drags Sam's pool and writes on the sticky: the GM's page has both.
  await hook(gm, h => { const s = h.store.game.get('o:00000001'); h.store.game.change((w: any) => w.put('o:00000001', { ...s, owner: 'Dana' })); });
  await expect.poll(async () => (await recOf(dana, SAM)).owner, { timeout: 15_000 }).toBe('Dana');
  await drag(dana, `[data-rid="${SAM}"].pool .name`, 60, 30);
  await agree(dana, gm, SAM);
  await hook(dana, h => { const s = h.store.game.get('o:00000008'); h.store.game.change((w: any) => w.put('o:00000008', { ...s, text: 'Dana was here' })); });
  await expect.poll(async () => (await recOf(gm, STICKY)).text, { timeout: 15_000 }).toBe('Dana was here');

  // Dana moves the GM's Devreux: refused, and put back on her page too.
  const devreux = await recOf(gm, DEVREUX);
  await hook(dana, h => { const d = h.store.game.get('o:00000003'); h.store.game.change((w: any) => w.put('o:00000003', { ...d, pool: { ...d.pool, x: d.pool.x + 200 } })); });
  // (Dana holds Devreux redacted, so it's where he is that's compared.)
  await expect.poll(async () => JSON.stringify((await recOf(dana, DEVREUX)).pool), { timeout: 15_000 }).toBe(JSON.stringify(devreux.pool));
  expect(await recOf(gm, DEVREUX)).toEqual(devreux);

  // Dana reloads: her copy shows at once, then syncs (R140).
  await expect.poll(async () => (await records(dana)).saved.includes(`"${STICKY}"`), { timeout: 5_000, message: "Dana's copy is saved" }).toBe(true);
  await open(dana, invite);
  expect(await recOf(dana, STICKY), await hook(dana, h => `held: ${h.store.game.all().map(([r]: [string]) => r).join()} game ${h.store.current.id}`)).toBeTruthy();
  await synced(dana, gm);

  // The GM reloads: the same room, still the GM; Dana leaves: gone from the GM's strip.
  const room = invite;
  await open(gm);
  await gm.locator('#bar .invite').click();
  expect(`/${new URL(await hook(gm, h => h.invite())).search}`).toBe(room);
  await expect(gm.locator('#bar .folks .tag', { hasText: 'Dana' })).toBeVisible({ timeout: 20_000 });
  await dana.context().close();
  await expect(gm.locator('#bar .folks .tag', { hasText: 'Dana' })).toHaveCount(0, { timeout: 70_000 });
});
