// CRC: crc-PieceView.md, crc-Authority.md, crc-Copy.md, crc-Records.md, crc-Drag.md | Test: test-Network.md | R499, R500, R501, R503, R505, R577, R578, R579, R580, R581, R582, R583
// Private paper across pages: a player's note to the GM, the GM's answer on it, the GM's handout to
// one player, and a note a player keeps to herself through a reload.
import { expect, test, type Page } from '@playwright/test';
import { at, barMiddle, fromDesk, gmTable, hook, join, kinds, openTable, rec, records, dragFromTo } from './page.ts';

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
/** A choice in a note's ▾: who reads it, or (`give`) who to hand it to. */
const pick = (page: Page, rid: string, label: string, give = false) =>
  page.locator(`[data-rid="${rid}"] > .readmenu button${give ? '.give' : ':not(.give)'}`, { hasText: new RegExp(`^${label}$`) });

test('a note to the GM, a handout, and a note kept to oneself', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const sam = await join(browser, invite, 'Sam', gm);

  // R577, R503, R578: Dana's sticky has her as its maker, a flat fold, and her ▾; she sends it to the GM.
  const note = await sticky(dana), rid = `o:${note}`;
  expect((await rec(dana, rid)).by).toBe('Dana');
  await expect(dana.locator(`[data-rid="${rid}"] > .fold`)).toBeVisible();
  await dana.locator(`[data-rid="${rid}"] > .foldpick`).click();
  await pick(dana, rid, 'GM').click();
  await expect.poll(async () => (await rec(gm, rid))?.to, { timeout: 15_000 }).toEqual([]);
  await expect(dana.locator(`[data-rid="${rid}"]`)).toHaveClass(/folded/);

  // R505: tags by the fold. R582: the GM writes an answer on it, and Dana reads it; R580: the GM's ▾ only
  // gives it away.
  await expect(tags(dana, rid)).toHaveText(['GM']);
  await expect(tags(gm, rid)).toHaveText(['Dana']);
  await gm.locator(`[data-rid="${rid}"] > .foldpick`).click();
  await expect(gm.locator(`[data-rid="${rid}"] > .readmenu button`)).toHaveText(['GM', 'Sam']);
  // R583: a press outside the menu closes it, and still does its own work: dragged on open table, it pans.
  const was = (await gm.locator(`[data-rid="${rid}"]`).boundingBox())!, open = await openTable(gm);
  await dragFromTo(gm, open.x, open.y, open.x + 60, open.y + 40);
  await expect(gm.locator(`[data-rid="${rid}"] > .readmenu`)).toHaveCount(0);
  await expect.poll(async () => (await gm.locator(`[data-rid="${rid}"]`).boundingBox())!.x).toBeGreaterThan(was.x + 30);
  await gm.locator(`[data-rid="${rid}"] .text`).click();
  await gm.keyboard.type('No, he is not');
  await gm.locator('#bar .wordmark, #bar').first().click({ position: { x: 5, y: 5 } });
  await expect.poll(async () => (await rec(dana, rid))?.text ?? '', { timeout: 15_000 }).toContain('No, he is not');

  // R501: Sam's page never gets it.
  await heard(gm, dana, sam);
  expect(await rec(sam, rid)).toBeUndefined();
  expect(JSON.stringify(await kinds(sam, 'sticky'))).not.toContain('he is not');

  // R578: the GM's handout, to Sam alone.
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
  await pick(dana, `o:${own}`, 'Just me').click();
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

test('handing notes over, and paper from before', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const sam = await join(browser, invite, 'Sam', gm);

  // R578: a player shares with another player too: Dana's note to Sam.
  const note = await sticky(dana), rid = `o:${note}`;
  await dana.locator(`[data-rid="${rid}"] > .foldpick`).click();
  await expect(dana.locator(`[data-rid="${rid}"] > .readmenu button:not(.give)`)).toHaveText(['Everyone', 'GM', 'Just me']);
  await dana.locator(`[data-rid="${rid}"] > .readmenu label`, { hasText: 'Sam' }).locator('input').check();
  await expect.poll(async () => (await rec(sam, rid))?.to, { timeout: 15_000 }).toEqual(['Sam']);
  await expect(tags(sam, rid)).toHaveText(['GM', 'Dana']);

  // R579: Dana hands it to Sam: his now, and gone from her hand.
  await pick(dana, rid, 'Sam', true).click();
  await expect.poll(async () => (await rec(sam, rid))?.by, { timeout: 15_000 }).toBe('Sam');
  expect(await rec(sam, rid)).toMatchObject({ to: [] });
  await expect.poll(async () => await rec(dana, rid), { timeout: 15_000 }).toBeUndefined();
  await expect(tags(sam, rid)).toHaveText(['GM']);
  await expect(sam.locator(`[data-rid="${rid}"] > .foldpick`)).toHaveCount(1);

  // R580: the GM hands Sam's note to Dana, from a ▾ that only gives.
  await gm.locator(`[data-rid="${rid}"] > .foldpick`).click();
  await expect(gm.locator(`[data-rid="${rid}"] > .readmenu button`)).toHaveText(['Dana', 'GM']);
  await pick(gm, rid, 'Dana', true).click();
  await expect.poll(async () => (await rec(dana, rid))?.by, { timeout: 15_000 }).toBe('Dana');
  await expect.poll(async () => await rec(sam, rid), { timeout: 15_000 }).toBeUndefined();

  // R581: Dana's "just me" note handed to Sam becomes his "just me": on his page alone, under m:.
  const own = await sticky(dana);
  await expect.poll(async () => !!(await rec(gm, `o:${own}`)), { timeout: 15_000 }).toBe(true);
  await dana.locator(`[data-rid="o:${own}"] > .foldpick`).click();
  await pick(dana, `o:${own}`, 'Just me').click();
  await expect.poll(async () => !!(await rec(gm, `o:${own}`)), { timeout: 15_000 }).toBe(false);
  await dana.locator(`[data-rid="m:${own}"] > .foldpick`).click();
  await pick(dana, `m:${own}`, 'Sam', true).click();
  await expect.poll(async () => await rec(sam, `m:${own}`), { timeout: 15_000 }).toMatchObject({ by: 'Sam', mine: true });
  expect(await rec(sam, `o:${own}`)).toBeUndefined();
  expect(await rec(dana, `m:${own}`)).toBeUndefined();
  await expect(tags(sam, `m:${own}`)).toHaveText(['me']);
  await heard(gm, dana, sam);
  for (const p of [gm, dana]) expect(await rec(p, `o:${own}`)).toBeUndefined();

  // R577: paper with no maker is the GM's: a flat fold everywhere, the GM's ▾, and none for a player.
  await hook(gm, h => h.store.game.change((w: any) => w.put('o:0000aa01',
    { kind: 'sticky', oid: '0000aa01', place: { x: 300, y: 300, z: 50, tilt: 0 }, text: 'from before' })));
  await expect(sam.locator('[data-rid="o:0000aa01"] > .fold')).toBeVisible({ timeout: 15_000 });
  await expect(sam.locator('[data-rid="o:0000aa01"] > .foldpick')).toHaveCount(0);
  await gm.locator('[data-rid="o:0000aa01"] > .foldpick').click();
  await pick(gm, 'o:0000aa01', 'Sam', true).click();
  await expect.poll(async () => (await rec(sam, 'o:0000aa01'))?.by, { timeout: 15_000 }).toBe('Sam');
  await expect(sam.locator('[data-rid="o:0000aa01"] > .foldpick')).toHaveCount(1);
  expect((await rec(dana, 'o:0000aa01'))?.text).toBe('from before');
});
