// CRC: crc-Desk.md, crc-Bar.md, crc-Drag.md | Test: test-Desk.md | R509, R510, R511, R512, R513, R514, R515, R516, R518
// The desk on the bar: its pigeonholes hold the paper supplies; a press takes one out, small while
// over the strip; let go in a pigeonhole it follows the pointer until the next press.
import { expect, test, type Page } from '@playwright/test';
import { barMiddle, gmTable, join, kinds, open, openTable, rec } from './page.ts';

const PNG = { name: 'dot.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') };

const middle = async (page: Page, sel: string) => { const b = (await page.locator(sel).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const hole = (page: Page, paper: string) => middle(page, `#bar .hole[data-paper="${paper}"]`);
const count = async (page: Page, kind: string) => (await kinds(page, kind)).length;

test('the desk holds the paper supplies', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  // R509, R510, R518: the desk and the chips; no paper on the bar itself; the Connection Table's pigeonhole the GM's alone.
  for (const p of [gm, dana]) {
    await expect(p.locator('#bar .desk')).toBeVisible();
    await expect(p.locator('#bar > .supply, #bar > .refs')).toHaveCount(0);
    await expect(p.locator('#bar .supplychips .chip')).toHaveCount(8);
  }
  await expect(gm.locator('#bar .hole')).toHaveCount(6);
  await expect(dana.locator('#bar .hole')).toHaveCount(5);

  // R511: pressed, the pigeonholes open; across them, each one's piece is held small.
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
  const strip = (await touch.locator('#bar .pigeonholes').boundingBox())!;
  await touch.touchscreen.tap(n.x, n.y);
  await expect.poll(() => count(touch, 'sticky')).toBe(before + 1);
  const made = (await kinds(touch, 'sticky')).at(-1)![1];
  const s = (await touch.locator(`[data-rid="o:${made.oid}"]`).boundingBox())!;
  expect(s.y).toBeGreaterThan(strip.y + strip.height);
  expect(s.y).toBeLessThan(strip.y + strip.height + 120);
  await expect(touch.locator('body')).not.toHaveClass(/dragging/);
  await ctx.close();
});
