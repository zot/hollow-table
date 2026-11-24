// CRC: crc-PieceView.md, crc-Authority.md, crc-Copy.md, crc-Records.md, crc-Drag.md | Test: test-Network.md | R498, R499, R500, R501, R503, R504, R505, R506
// Private paper across pages: a player's note to the GM, the GM's answer on it, the GM's handout to
// one player, and a note a player keeps to herself through a reload.
import { expect, test, type Page } from '@playwright/test';
import { at, barMiddle, fromDesk, gmTable, join, kinds, openTable, rec, records, dragFromTo } from './page.ts';

const round = (page: Page) => rec(page, 'meta').then(m => m?.round ?? 0);

/** The GM's change reached a player: the Round, stepped on the GM's page, is theirs too. */
async function heard(gm: Page, ...players: Page[]) {
  await gm.locator('.register .key.up').click();
  const want = await round(gm);
  for (const p of players) await expect.poll(() => round(p), { timeout: 15_000 }).toBe(want);
}

/** Takes a sticky from the bar onto open table; its oid. */
async function sticky(page: Page): Promise<string> {
  const before = new Set((await kinds(page, 'sticky')).map(([, r]) => r.oid));
  const to = await openTable(page);
  await fromDesk(page, 'sticky', to.x, to.y);
  await expect.poll(async () => (await kinds(page, 'sticky')).filter(([, r]) => !before.has(r.oid)).length).toBe(1);
  return (await kinds(page, 'sticky')).find(([, r]) => !before.has(r.oid))![1].oid;
}

const tags = (page: Page, rid: string) => page.locator(`[data-rid="${rid}"] > .readers .tag`);

test('a note to the GM, a handout, and a note kept to oneself', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const sam = await join(browser, invite, 'Sam', gm);

  // R498, R503, R504: Dana's sticky has her as its maker, a flat fold, and her ▾; she sends it to the GM.
  const note = await sticky(dana), rid = `o:${note}`;
  expect((await rec(dana, rid)).by).toBe('Dana');
  await expect(dana.locator(`[data-rid="${rid}"] > .fold`)).toBeVisible();
  await dana.locator(`[data-rid="${rid}"] > .foldpick`).click();
  await dana.locator(`[data-rid="${rid}"] > .readmenu button`, { hasText: 'GM' }).click();
  await expect.poll(async () => (await rec(gm, rid))?.to, { timeout: 15_000 }).toEqual([]);
  await expect(dana.locator(`[data-rid="${rid}"]`)).toHaveClass(/folded/);

  // R505: tags by the fold. R506: the GM writes an answer on it, and Dana reads it.
  await expect(tags(dana, rid)).toHaveText(['GM']);
  await expect(tags(gm, rid)).toHaveText(['Dana']);
  await expect(gm.locator(`[data-rid="${rid}"] > .foldpick`)).toHaveCount(0);
  await gm.locator(`[data-rid="${rid}"] .text`).click();
  await gm.keyboard.type('No, he is not');
  await gm.locator('#bar .wordmark, #bar').first().click({ position: { x: 5, y: 5 } });
  await expect.poll(async () => (await rec(dana, rid))?.text ?? '', { timeout: 15_000 }).toContain('No, he is not');

  // R501: Sam's page never gets it.
  await heard(gm, dana, sam);
  expect(await rec(sam, rid)).toBeUndefined();
  expect(JSON.stringify(await kinds(sam, 'sticky'))).not.toContain('he is not');

  // R504: the GM's handout, to Sam alone.
  const handout = await sticky(gm), hid = `o:${handout}`;
  await gm.locator(`[data-rid="${hid}"] > .foldpick`).click();
  await gm.locator(`[data-rid="${hid}"] > .readmenu label`, { hasText: 'Sam' }).locator('input').check();
  await expect.poll(async () => (await rec(sam, hid))?.to, { timeout: 15_000 }).toEqual(['Sam']);
  await expect(tags(sam, hid)).toHaveText(['GM']);
  await expect(tags(gm, hid)).toHaveText(['Sam']);
  await heard(gm, dana, sam);
  expect(await rec(dana, hid)).toBeUndefined();

  // R500: a note Dana keeps to herself leaves the table, and stays hers through a reload.
  const own = await sticky(dana);
  await expect.poll(async () => !!(await rec(gm, `o:${own}`)), { timeout: 15_000 }).toBe(true);
  await dana.locator(`[data-rid="o:${own}"] > .foldpick`).click();
  await dana.locator(`[data-rid="o:${own}"] > .readmenu button`, { hasText: 'Just me' }).click();
  await expect.poll(async () => !!(await rec(gm, `o:${own}`)), { timeout: 15_000 }).toBe(false);
  expect(await rec(dana, `m:${own}`)).toMatchObject({ mine: true, by: 'Dana' });
  // Saved a moment after the change (SAVE_PAUSE); the reload comes once it is (gap O12).
  await expect.poll(async () => (await records(dana)).saved, { timeout: 5_000 }).toContain(`m:${own}`);
  await dana.reload();
  await expect.poll(async () => (await rec(dana, `m:${own}`))?.mine, { timeout: 15_000 }).toBe(true);
  await expect(tags(dana, `m:${own}`)).toHaveText(['me']);
  await heard(gm, dana, sam);
  for (const p of [gm, sam]) expect(await rec(p, `m:${own}`)).toBeUndefined();

  // R500: put away, it is buried in Dana's own Hill, never the table's Boot Hill.
  await dana.locator(`[data-rid="m:${own}"] .text`).click();
  await dana.keyboard.type('my secret plan');
  await dana.locator('#bar').click({ position: { x: 5, y: 5 } });
  const n = await at(dana, `[data-rid="m:${own}"]`, 30, 60), mid = await barMiddle(dana);
  await dragFromTo(dana, n.x, n.y, mid.x, mid.y);
  await expect.poll(async () => JSON.stringify(await rec(dana, 'hill') ?? {})).toContain('my secret plan');
  expect(await rec(dana, `m:${own}`)).toBeUndefined();
  await heard(gm, dana, sam);
  for (const p of [gm, dana, sam]) expect(JSON.stringify(await rec(p, 'yards') ?? {})).not.toContain('my secret plan');
});
