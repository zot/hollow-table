// CRC: crc-Desk.md, crc-Bar.md, crc-Drag.md, crc-Drawers.md | Test: test-Desk.md | R529, R510, R530, R512, R513, R514, R515, R516, R518, R519, R520, R521, R524, R525, R526, R527, R546, R547, R548, R549, R551, R552, R553, R554, R555, R556
// The desk on the bar: its pigeonholes hold the paper supplies; a press takes one out, small while
// over the strip; let go in a pigeonhole it follows the pointer until the next press.
import { expect, test, type Page } from '@playwright/test';
import { barMiddle, fromDesk, gmTable, hook, join, kinds, open, openTable, rec, records } from './page.ts';

const PNG = { name: 'dot.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') };

const middle = async (page: Page, sel: string) => { const b = (await page.locator(sel).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const hole = (page: Page, paper: string) => middle(page, `#bar .hole[data-paper="${paper}"]`);
const count = async (page: Page, kind: string) => (await kinds(page, kind)).length;

test('the desk holds the paper supplies', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  // R529, R510, R518: the desk and the chips; no paper on the bar itself; the Connection Table's pigeonhole the GM's alone.
  for (const p of [gm, dana]) {
    await expect(p.locator('#bar .desk')).toBeVisible();
    await expect(p.locator('#bar > .supply, #bar > .refs')).toHaveCount(0);
    await expect(p.locator('#bar .supplychips .chip')).toHaveCount(8);
  }
  await expect(gm.locator('#bar .hole')).toHaveCount(7);
  await expect(dana.locator('#bar .hole')).toHaveCount(6);

  // R530: pressed, the pigeonholes open; across them, each one's piece is held small.
  const desk = await middle(gm, '#bar .desk');
  await gm.mouse.move(desk.x, desk.y);
  await gm.mouse.down();
  await expect(gm.locator('#bar .pigeonholes')).toBeVisible();
  const note = await hole(gm, 'sticky'), aa = await hole(gm, 'text');
  await gm.mouse.move(note.x, note.y, { steps: 4 });
  await expect(gm.locator('#bar .ghost')).toHaveAttribute('data-paper', 'sticky');
  await gm.mouse.move(aa.x, aa.y, { steps: 4 });
  await expect(gm.locator('#bar .ghost')).toHaveAttribute('data-paper', 'text');
  await gm.mouse.move(note.x, note.y, { steps: 4 });
  await expect(gm.locator('#bar .ghost')).toHaveAttribute('data-paper', 'sticky');
  // R512: dragged out, the sticky held last is made with its middle under the pointer, and the strip closes.
  const before = await count(gm, 'sticky'), texts = await count(gm, 'text'), to = await openTable(gm);
  await gm.mouse.move(to.x, to.y, { steps: 10 });
  await gm.mouse.up();
  await expect.poll(() => count(gm, 'sticky')).toBe(before + 1);
  expect(await count(gm, 'text')).toBe(texts);
  await expect(gm.locator('#bar .pigeonholes')).toBeHidden();
  const made = (await kinds(gm, 'sticky')).at(-1)![1];
  const b = (await gm.locator(`[data-rid="o:${made.oid}"]`).boundingBox())!;
  expect(Math.abs(b.x + b.width / 2 - to.x)).toBeLessThan(40);
});

test('let go in a pigeonhole, and it follows until the next press', async ({ page }) => {
  await open(page);
  const SAM = 'o:00000001', sam = (await rec(page, SAM)).card;
  const desk = await middle(page, '#bar .desk');
  const letGo = async () => {
    await page.mouse.move(desk.x, desk.y);
    await page.mouse.down();
    const n = await hole(page, 'sticky');
    await page.mouse.move(n.x, n.y, { steps: 4 });
    await page.mouse.up();
  };
  // R513: it follows with no button held; the press puts it down on Sam's flip corner, and the card
  // neither moves nor turns over: the press was the carry's, not the card's.
  const before = await count(page, 'sticky');
  await letGo();
  await expect.poll(() => count(page, 'sticky')).toBe(before + 1);
  const card = await middle(page, `.obj.card[data-rid="${SAM}"] > .flip`);
  await page.mouse.move(card.x, card.y, { steps: 8 });
  await expect(page.locator('body')).toHaveClass(/dragging/);
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('body')).not.toHaveClass(/dragging/);
  expect((await rec(page, SAM)).card).toEqual(sam);
  expect((await rec(page, SAM)).flipped).toBe(false);
  const put = (await kinds(page, 'sticky')).at(-1)![1];
  const s = (await page.locator(`[data-rid="o:${put.oid}"]`).boundingBox())!;
  expect(Math.abs(s.x + s.width / 2 - card.x)).toBeLessThan(40);
  // R513: a press on the bar, or Esc, takes it back unmade.
  await letGo();
  const bar = await barMiddle(page);
  await page.mouse.move(bar.x, bar.y, { steps: 6 });
  await page.mouse.down();
  await page.mouse.up();
  await letGo();
  await page.mouse.move(600, 500, { steps: 6 });
  await page.keyboard.press('Escape');
  await expect.poll(() => count(page, 'sticky')).toBe(before + 1);
  await expect(page.locator('body')).not.toHaveClass(/dragging/);
  // R516: a click opens the whole desk; a press elsewhere closes it.
  await page.mouse.click(desk.x, desk.y);
  await expect(page.locator('#bar .desk')).toHaveClass(/\bopen\b/);
  await expect(page.locator('#bar .pigeonholes')).toBeVisible();
  const t = await openTable(page);
  await page.mouse.click(t.x, t.y);
  await expect(page.locator('#bar .pigeonholes')).toBeHidden();
});

test('the image pigeonhole opens the picker, let go in or dragged out', async ({ page }) => {
  await open(page);
  const desk = await middle(page, '#bar .desk');
  // R515: let go in the image pigeonhole: the picker, then the image carried until a press.
  await page.mouse.move(desk.x, desk.y);
  await page.mouse.down();
  const img = await hole(page, 'image');
  await page.mouse.move(img.x, img.y, { steps: 4 });
  let chooser = page.waitForEvent('filechooser');
  await page.mouse.up();
  await (await chooser).setFiles(PNG);
  await expect.poll(() => count(page, 'image')).toBe(1);
  const t = await openTable(page);
  await page.mouse.move(t.x, t.y, { steps: 6 });
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator('body')).not.toHaveClass(/dragging/);
  // Dragged out: the picker on the drop, the image landing there. The browser opens a picker only for a
  // while after the press (R515), so the drag is quick and nothing waits between press and release.
  await page.mouse.move(desk.x, desk.y);
  await page.mouse.down();
  await page.mouse.move(img.x, img.y, { steps: 2 });
  await page.mouse.move(t.x + 150, t.y - 60, { steps: 3 });
  const held = await page.locator('#bar .ghost').getAttribute('data-paper');
  chooser = page.waitForEvent('filechooser');
  await page.mouse.up();
  expect(held).toBe('image');
  await (await chooser).setFiles(PNG);
  await expect.poll(() => count(page, 'image')).toBe(2);
});

test('on touch, a piece let go in its pigeonhole lands below the strip', async ({ browser }) => {
  // R514: tapped open, then a tap on the sticky's pigeonhole puts a sticky just below the strip.
  const ctx = await browser.newContext({ baseURL: 'http://127.0.0.1:8781/', viewport: { width: 1400, height: 840 }, hasTouch: true });
  const touch = await ctx.newPage();
  await open(touch);
  const desk = await middle(touch, '#bar .desk');
  await touch.touchscreen.tap(desk.x, desk.y);
  await expect(touch.locator('#bar .pigeonholes')).toBeVisible();
  const before = await count(touch, 'sticky'), n = await hole(touch, 'sticky');
  // The open desk's whole panel, its drawers and search line too: the piece lands below it.
  const strip = (await touch.locator('#bar .deskpanel').boundingBox())!;
  await touch.touchscreen.tap(n.x, n.y);
  await expect.poll(() => count(touch, 'sticky')).toBe(before + 1);
  const made = (await kinds(touch, 'sticky')).at(-1)![1];
  const s = (await touch.locator(`[data-rid="o:${made.oid}"]`).boundingBox())!;
  expect(s.y).toBeGreaterThan(strip.y + strip.height);
  expect(s.y).toBeLessThan(strip.y + strip.height + 120);
  await expect(touch.locator('body')).not.toHaveClass(/dragging/);
  await ctx.close();
});

const DEVREUX = 'o:00000003';

/** Presses at `from`, nudges past the drag threshold and carries to `to`, still held. */
async function lift(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, nudge = { x: 20, y: -20 }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + nudge.x, from.y + nudge.y, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 10 });
}

test('the GM files an NPC, and Dana loses it', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const cards = async (p: Page) => (await kinds(p, 'influence')).filter(([, r]) => r.home === '00000003').length;
  const had = await cards(gm);
  expect(had).toBeGreaterThan(0);
  // R519, R520: over the desk the hint names the drawer; let go, Devreux is filed in NPCs with its cards.
  const name = await middle(gm, `.obj.pool[data-rid="${DEVREUX}"] .name`), desk = await middle(gm, '#bar .desk');
  await lift(gm, name, desk);
  await expect(gm.locator('#bar .desk')).toHaveClass(/\bfile\b/);
  await expect(gm.locator('#bar .desk')).toHaveAttribute('data-drawer', '→ NPCs');
  await expect(gm.locator('#bar')).not.toHaveClass(/\bbury\b/);
  await gm.mouse.up();
  await expect.poll(() => rec(gm, DEVREUX)).toBeUndefined();
  const desk1 = await rec(gm, 'desk');
  expect(desk1.desks[0].items.map((e: any) => [e.drawer, e.records.length])).toEqual([['npcs', had + 1]]);
  expect(await cards(gm)).toBe(0);
  // R524: Dana's page holds nothing of it, and no desk.
  await expect.poll(() => rec(dana, DEVREUX), { timeout: 15_000 }).toBeUndefined();
  expect(await cards(dana)).toBe(0);
  expect(await rec(dana, 'desk')).toBeUndefined();
  // R526: the open desk's NPCs drawer lists it.
  await gm.mouse.click(desk.x, desk.y);
  await gm.locator('#bar .drawerfront[data-drawer="npcs"]').click();
  await expect(gm.locator('#bar .filed button')).toHaveText(['Devreux']);
  // R527: dragged out, it comes back with its cards, on both pages.
  const entry = await middle(gm, '#bar .filed button'), to = await openTable(gm);
  await lift(gm, entry, to, { x: 10, y: 10 });
  await gm.mouse.up();
  await expect.poll(() => rec(gm, DEVREUX).then(r => !!r)).toBe(true);
  expect(await cards(gm)).toBe(had);
  expect((await rec(gm, 'desk')).desks[0].items).toEqual([]);
  await expect.poll(() => rec(dana, DEVREUX).then(r => !!r), { timeout: 15_000 }).toBe(true);
  await expect.poll(() => cards(dana), { timeout: 15_000 }).toBe(had);
});

test("a player's drawer is her own", async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  // R521: Papers alone.
  const desk = await middle(dana, '#bar .desk');
  await dana.mouse.click(desk.x, desk.y);
  await expect(dana.locator('#bar .drawerfront')).toHaveCount(1);
  await expect(dana.locator('#bar .drawerfront')).toHaveAttribute('data-drawer', 'papers');
  // R553: one desk, no arrows and no name.
  await expect(dana.locator('#bar .desknav')).toHaveCount(0);
  await dana.mouse.click(5, 300);
  // R525: her sticky, filed, leaves every table and is in her desk alone, through a reload.
  const to = await openTable(dana);
  await fromDesk(dana, 'sticky', to.x, to.y);
  const oid = (await kinds(dana, 'sticky')).at(-1)![1].oid as string;
  await expect.poll(() => rec(gm, `o:${oid}`).then(r => !!r), { timeout: 15_000 }).toBe(true);
  const s = await middle(dana, `[data-rid="o:${oid}"]`);
  await lift(dana, s, desk);
  await expect(dana.locator('#bar .desk')).toHaveAttribute('data-drawer', '→ Papers');
  await dana.mouse.up();
  await expect.poll(() => rec(gm, `o:${oid}`), { timeout: 15_000 }).toBeUndefined();
  expect((await rec(dana, 'desk')).desks[0].items.map((e: any) => e.records[0].oid)).toEqual([oid]);
  expect(await rec(gm, 'desk')).toBeUndefined();
  await expect.poll(async () => (await records(dana)).saved, { timeout: 5_000 }).toContain('"desk"');
  await dana.reload();
  await expect.poll(async () => (await rec(dana, 'desk'))?.desks[0].items.length, { timeout: 15_000 }).toBe(1);
  // R521: her character over her desk is buried, as anywhere on the bar.
  await fromDesk(dana, 'character', 700, 560);
  const mine = (await kinds(dana, 'character')).find(([, r]) => r.owner === 'Dana')![0];
  // Buried only once the GM's page holds it (R442: a burial keeps what the GM's page deletes).
  await expect.poll(() => rec(gm, mine).then(r => !!r), { timeout: 15_000 }).toBe(true);
  const pool = await middle(dana, `.obj.pool[data-rid="${mine}"] .name`);
  await lift(dana, pool, desk);
  await expect(dana.locator('#bar .desk')).not.toHaveClass(/\bfile\b/);
  await dana.mouse.up();
  await expect.poll(() => rec(dana, mine)).toBeUndefined();
  expect((await rec(dana, 'desk')).desks[0].items).toHaveLength(1);
  await expect.poll(async () => JSON.stringify(await rec(gm, 'yards')), { timeout: 15_000 }).toContain(mine.slice(2));
});

test('the search line finds what is filed, and lists every name', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  // The GM's desk holds Devreux and a note: filed straight into the record, as filing would.
  await hook(gm, h => h.store.game.change((w: any) => {
    const g = h.store.game, dev = g.get('o:00000003');
    const note = { kind: 'sticky', oid: 'aa000001', place: { x: 900, y: 500, z: 1, tilt: 0 }, text: 'buy rope\nthe coach left at dawn' };
    w.put('desk', { desk: [{ drawer: 'npcs', name: 'Devreux', records: [dev] }, { drawer: 'papers', name: 'Note: buy rope', records: [note] }] });
    w.del('o:00000003');
  }));
  const desk = await middle(gm, '#bar .desk');
  await gm.mouse.click(desk.x, desk.y);
  // R547, R548: with nothing typed, every name, alphabetical, each with its drawer.
  await gm.locator('#bar .search').click();
  await expect(gm.locator('#bar .filed button')).toHaveText(['DevreuxNPCs', 'Note: buy ropePapers']);
  // R546: as it is typed, by the words filed; none says so; cleared, the whole list again.
  await gm.keyboard.type('COACH');
  await expect(gm.locator('#bar .filed button')).toHaveText(['Note: buy ropePapers']);
  await gm.keyboard.type(' nobody');
  await expect(gm.locator('#bar .filed p')).toHaveText('Nothing found.');
  await gm.locator('#bar .search').fill('');
  await expect(gm.locator('#bar .filed button')).toHaveCount(2);
  await gm.locator('#bar .search').fill('dev');
  // R548: dragged out, it comes back as from its drawer.
  const entry = await middle(gm, '#bar .filed button'), to = await openTable(gm);
  await lift(gm, entry, to, { x: 10, y: 10 });
  await gm.mouse.up();
  await expect.poll(() => rec(gm, DEVREUX).then(r => !!r)).toBe(true);
  expect((await rec(gm, 'desk')).desks[0].items.map((e: any) => e.name)).toEqual(['Note: buy rope']);
  // R549: Dana's search reads her own desk, which holds nothing.
  const dd = await middle(dana, '#bar .desk');
  await dana.mouse.click(dd.x, dd.y);
  await dana.locator('#bar .search').click();
  await expect(dana.locator('#bar .filed button')).toHaveCount(0);
  await expect(dana.locator('#bar .filed p')).toHaveText('Nothing filed here.');
});

test("the GM's desks: browsed, named, and filed into by the board", async ({ page }) => {
  await open(page);
  const desk = await middle(page, '#bar .desk');
  // R551, R552: the open desk shows its name between arrows; › past a named desk makes one numbered past
  // the highest "Desk N" in use: none is left once Desk 1 is Act 1, so it is Desk 1 again.
  await page.mouse.click(desk.x, desk.y);
  await expect(page.locator('#bar .desknav .dname')).toHaveValue('Desk 1');
  await page.locator('#bar .desknav .dname').fill('Act 1');
  await page.locator('#bar .desknav .dname').press('Enter');
  await page.locator('#bar .desknext').click();
  await expect(page.locator('#bar .desknav .dname')).toHaveValue('Desk 1');
  await page.locator('#bar .desknav .dname').fill('Act 2');
  await page.locator('#bar .desknav .dname').press('Enter');
  await expect.poll(async () => (await rec(page, 'desk')).desks.map((d: any) => d.name)).toEqual(['Act 1', 'Act 2']);
  await page.mouse.click(5, 400);
  // R554, R555: carried over the desk, the board hangs below it, the open desk first; over the desk the
  // hint names it, and dragged down onto Act 1's row, that one.
  const name = await middle(page, `.obj.pool[data-rid="${DEVREUX}"] .name`);
  await lift(page, name, desk);
  await expect(page.locator('#bar .deskboard')).toBeVisible();
  await expect(page.locator('#bar .deskrow .holder')).toHaveText(['Act 2', 'Act 1']);
  await expect(page.locator('#bar .desk')).toHaveAttribute('data-drawer', '→ Act 2: NPCs');
  const row = await middle(page, '#bar .deskrow[data-desk="0"]');
  await page.mouse.move(desk.x, row.y - 30, { steps: 4 });
  await page.mouse.move(row.x, row.y, { steps: 6 });
  await expect(page.locator('#bar .deskrow[data-desk="0"]')).toHaveClass(/\bover\b/);
  await expect(page.locator('#bar .desk')).toHaveAttribute('data-drawer', '→ Act 1: NPCs');
  await page.mouse.up();
  await expect.poll(() => rec(page, DEVREUX)).toBeUndefined();
  expect((await rec(page, 'desk')).desks.map((d: any) => d.items.map((e: any) => e.name))).toEqual([['Devreux'], []]);
  await expect(page.locator('#bar .deskboard')).toBeHidden();
  // R552: Act 2 is still the one open; its NPCs drawer is empty. R556: search finds Devreux in Act 1.
  await page.mouse.click(desk.x, desk.y);
  await expect(page.locator('#bar .desknav .dname')).toHaveValue('Act 2');
  await page.locator('#bar .search').click();
  await expect(page.locator('#bar .filed button')).toHaveText(['DevreuxAct 1: NPCs']);
  // R551: ‹ goes back to Act 1, whose NPCs drawer holds it.
  await page.locator('#bar .deskprev').click();
  await expect(page.locator('#bar .desknav .dname')).toHaveValue('Act 1');
  await page.locator('#bar .drawerfront[data-drawer="npcs"]').click();
  await expect(page.locator('#bar .filed button')).toHaveText(['Devreux']);
});

