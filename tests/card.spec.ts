// CRC: crc-PieceView.md | Test: test-Table.md | R252, R253, R255, R256, R260, R268, R269, R270, R271, R272
// The character card and the table's view, measured: a flat card that flips; the damage columns
// rotating; the notes' ruled lines; Levels clicked; the Motivation slot rule; zoom, fit and drop.
import { expect, test, type Page } from '@playwright/test';
import { at, dragFromTo, open, rec } from './page.ts';

const SAM = 'o:00000001', DEVREUX = 'o:00000003', PEACE = 'o:00000004';
const CARD = `.obj.card[data-rid="${SAM}"]`, DPOOL = `.obj.pool[data-rid="${DEVREUX}"]`, SPOOL = `.obj.pool[data-rid="${SAM}"]`;

test.beforeEach(async ({ page }) => { await open(page); });

const order = (page: Page) => page.locator(`${CARD} .damage .column`).evaluateAll(es =>
  es.map(e => [(e as HTMLElement).dataset.damage, getComputedStyle(e).order]).sort((a, b) => Number(a[1]) - Number(b[1])).map(([d]) => d));

test('a flat card that flips', async ({ page }) => {
  // R252: no 3D anywhere in a card (it blurs text in Chrome); the flip turns it to its back.
  const flat = await page.locator(CARD).evaluate(e => [e, ...e.querySelectorAll('*')].every(x => {
    const s = getComputedStyle(x as Element);
    return s.transformStyle !== 'preserve-3d' && s.perspective === 'none' && s.backfaceVisibility !== 'hidden';
  }));
  expect(flat).toBe(true);
  await page.locator(`${CARD} .flip`).click();
  await expect(page.locator(CARD)).toHaveClass(/\bflipped\b/);
  expect((await rec(page, SAM)).flipped).toBe(true);
});

test('the damage columns rotate, and blanks are one length', async ({ page }) => {
  await page.locator(`${CARD} .flip`).click();
  // R253: a column's name brings it to the front, the others following in turn.
  expect(await order(page)).toEqual(['bias', 'affliction', 'injury']);
  await page.locator(`${CARD} .col-affliction .hd`).click({ position: { x: 4, y: 4 } });
  expect(await order(page)).toEqual(['affliction', 'injury', 'bias']);
  await page.locator(`${CARD} .col-affliction .hd`).click({ position: { x: 4, y: 4 } });
  // (Clicking the second twice cycles through all three.)
  await page.locator(`${CARD} .col-injury .hd`).click({ position: { x: 4, y: 4 } });
  expect(await order(page)).toEqual(['injury', 'bias', 'affliction']);
  // R256: the blanks are the same length whichever column is open.
  const widths: number[] = [];
  for (const d of ['bias', 'affliction', 'injury']) {
    await page.locator(`${CARD} .col-${d} .hd`).click({ position: { x: 4, y: 4 } });
    widths.push(Math.round((await page.locator(`${CARD} .col-${d} .slotline[data-row="min"] .name`).boundingBox())!.width));
  }
  expect(new Set(widths).size).toBe(1);
});

test("the notes' lines are one screen pixel and follow the writing", async ({ page }) => {
  // R255: the ruled lines don't scale their stroke, and move with the notes when they scroll.
  await page.locator(`${CARD} .flip`).click();
  const strokes = await page.locator(`${CARD} .ruled svg line`).evaluateAll(ls => [...new Set(ls.map(l => getComputedStyle(l).vectorEffect || l.getAttribute('vector-effect')))]);
  expect(strokes).toEqual(['non-scaling-stroke']);
  const before = await page.locator(`${CARD} .ruled svg`).evaluate(e => getComputedStyle(e).transform);
  await page.locator(`${CARD} .notes`).evaluate(n => { (n as HTMLElement).textContent = Array.from({ length: 40 }, (_, k) => `line ${k}`).join('\n'); n.scrollTop = 40; n.dispatchEvent(new Event('scroll')); });
  await expect.poll(() => page.locator(`${CARD} .ruled svg`).evaluate(e => getComputedStyle(e).transform)).not.toBe(before);
});

test("a card's Level answers clicks; shift-click at Min deletes it", async ({ page }) => {
  // R269: a click raises a plain card from Sig to Maj; a shift-click lowers it back. (Devreux's own
  // cards are tapped in full from his Motivations, so they have nothing to rise by.)
  await page.evaluate(async () => {
    const g = (await (window as any).hollow.ready).store.game;
    g.change((w: any) => w.put('o:0000e001', { kind: 'influence', oid: '0000e001', home: '00000003', where: 'drawer', n: 3, name: 'Hunch', sign: 1, points: 4, used: false, crit: false }));
  });
  const level = page.locator(`${DPOOL} .drawer [data-rid="o:0000e001"] .level`);
  await expect(level).toHaveText('+Sig');
  await level.click();
  await expect(level).toHaveText('+Maj');
  await level.click({ modifiers: ['Shift'] });
  await expect(level).toHaveText('+Sig');
  // R268: lowered to Min and shift-clicked again, it's gone.
  const old = page.locator(`${DPOOL} .drawer [data-rid="o:00000006"] .level`);
  await expect(old).toHaveText('+Min');
  await old.click({ modifiers: ['Shift'] });
  expect(await rec(page, 'o:00000006')).toBeUndefined();
});

test('a Motivation card goes only to Main', async ({ page }) => {
  // R260: Devreux's Keep the Peace dropped on Edge goes home; on Main it stays.
  const card = () => at(page, `${DPOOL} .drawer [data-rid="${PEACE}"]`, 8, 8);
  let c = await card(), edge = await at(page, `${DPOOL} .slot-edge`, 20, 40);
  await dragFromTo(page, c.x, c.y, edge.x, edge.y, 12);
  expect((await rec(page, PEACE)).where).toBe('drawer');
  c = await card();
  const main = await at(page, `${DPOOL} .slot-main`, 20, 40);
  await dragFromTo(page, c.x, c.y, main.x, main.y, 12);
  expect((await rec(page, PEACE)).where).toEqual({ slot: '00000003', name: 'main' });
  void SPOOL;
});

test('zoom, a first visit fitted, and an image dropped from the desktop', async ({ page }) => {
  // R271: a first visit fits the table: every pool is in view.
  const view = page.locator('#table');
  const tb = (await view.boundingBox())!;
  for (const p of await page.locator('.obj.pool').all()) {
    const b = (await p.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(tb.x - 1);
    expect(b.x + b.width).toBeLessThanOrEqual(tb.x + tb.width + 1);
  }
  // R270: the wheel zooms, within a quarter and two and a half times.
  const zoom = () => page.evaluate(async () => (await (window as any).hollow.ready).view.view.zoom as number);
  await page.mouse.move(700, 500);
  for (let k = 0; k < 30; k++) await page.mouse.wheel(0, -400);
  await expect.poll(zoom).toBeCloseTo(2.5, 2);
  for (let k = 0; k < 60; k++) await page.mouse.wheel(0, 400);
  await expect.poll(zoom).toBeCloseTo(0.25, 2);
  // R272: an image file dropped from the desktop lands where it's dropped.
  const n = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 20; c.height = 10;
    c.getContext('2d')!.fillRect(0, 0, 20, 10);
    const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'dot.png', { type: 'image/png' }));
    const t = document.getElementById('table')!;
    for (const type of ['dragenter', 'dragover', 'drop']) t.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, clientX: 600, clientY: 500, dataTransfer: dt }));
    return 1;
  });
  void n;
  await expect.poll(async () => (await page.evaluate(async () => (await (window as any).hollow.ready).store.game.all().filter(([, r]: [string, any]) => r.kind === 'image').length))).toBe(1);
  const img = (await page.locator('.obj.image').first().boundingBox())!;
  expect(Math.abs(img.x - 600)).toBeLessThan(40);
  expect(Math.abs(img.y - 500)).toBeLessThan(40);
});
