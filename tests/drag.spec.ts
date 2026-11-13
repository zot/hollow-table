// CRC: crc-Drag.md | Test: test-Table.md | R215, R216, R217, R220, R221, R222, R225, R226, R240, R241, R243
// The feel of carrying, measured: a piece stays glued where it was taken hold of, lands where it was
// let go without gliding, isn't redrawn under the hand, lights where it would land; a card stays a
// card in hand until it's over the slots; the drawer opens a gap for it; a growing drawer pushes.
import { expect, test, type Page } from '@playwright/test';
import { at, dragFromTo, kinds, open, rec } from './page.ts';

const SAM = 'o:00000001', DEVREUX = 'o:00000003', STICKY = 'o:00000008';
const SPOOL = `.obj.pool[data-rid="${SAM}"]`, DPOOL = `.obj.pool[data-rid="${DEVREUX}"]`;
const box = async (page: Page, sel: string) => (await page.locator(sel).first().boundingBox())!;
/** How far apart two "x,y" offsets are, in whole pixels. */
const apart = (a: string, b: string) => { const [p, q] = [a, b].map(s => s.split(',').map(Number)); return Math.max(Math.abs(p![0]! - q![0]!), Math.abs(p![1]! - q![1]!)); };

test.beforeEach(async ({ page }) => { await open(page); });

/** Takes hold of the big sticky well inside it, and moves in steps, checking it stays glued. */
async function glued(page: Page) {
  const b = await box(page, `[data-rid="${STICKY}"]`), x = b.x + b.width * 0.3, y = b.y + b.height * 0.8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const offsets: string[] = [];
  for (let k = 1; k <= 6; k++) {
    await page.mouse.move(x - 40 * k, y + 20 * k, { steps: 3 });
    await page.waitForTimeout(60);
    const now = await box(page, `[data-rid="${STICKY}"]`);
    offsets.push(`${Math.round(x - 40 * k - now.x)},${Math.round(y + 20 * k - now.y)}`);
  }
  return { offsets, x: x - 240, y: y + 120, first: `${Math.round(x - b.x)},${Math.round(y - b.y)}` };
}

test('a carried piece is glued where it was taken hold of, at any zoom', async ({ page }) => {
  // R216: the pointer keeps its place on the piece, at the fitted zoom and zoomed in.
  let g = await glued(page);
  for (const o of g.offsets) expect(apart(o, g.offsets[0]!)).toBeLessThanOrEqual(1);
  await page.mouse.up();
  await page.mouse.move(700, 700);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(200);
  g = await glued(page);
  for (const o of g.offsets) expect(apart(o, g.offsets[0]!)).toBeLessThanOrEqual(1);
  await page.mouse.up();
});

test('a drop is drawn where it was let go, without gliding', async ({ page }) => {
  // R217, R226: right after the release the piece is where it was let go, and stays.
  const g = await glued(page);
  await page.mouse.up();
  const now = await box(page, `[data-rid="${STICKY}"]`);
  await expect(page.locator(`[data-rid="${STICKY}"]`)).not.toHaveClass(/\bglide\b/);
  await page.waitForTimeout(400);
  const later = await box(page, `[data-rid="${STICKY}"]`);
  // (Its size eases back from the lift, about its middle: the middle stays put.)
  expect([Math.round(later.x + later.width / 2), Math.round(later.y + later.height / 2)]).toEqual([Math.round(now.x + now.width / 2), Math.round(now.y + now.height / 2)]);
  void g;
});

test('a held piece is lifted, and not redrawn under the hand', async ({ page }) => {
  // R220: while held it is lifted; a change to its record doesn't move it from the hand.
  const b = await box(page, `[data-rid="${STICKY}"]`), x = b.x + b.width * 0.3, y = b.y + b.height * 0.8;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 60, y + 30, { steps: 4 });
  await page.waitForTimeout(60);
  await expect(page.locator(`[data-rid="${STICKY}"]`)).toHaveClass(/\blifted\b/);
  const held = await box(page, `[data-rid="${STICKY}"]`);
  await page.evaluate(async rid => {
    const g = (await (window as any).hollow.ready).store.game, r = g.get(rid);
    g.change((w: any) => w.put(rid, { ...r, place: { ...r.place, x: r.place.x + 300 } }));
  }, STICKY);
  await page.waitForTimeout(150);
  const still = await box(page, `[data-rid="${STICKY}"]`);
  expect([Math.round(still.x), Math.round(still.y)]).toEqual([Math.round(held.x), Math.round(held.y)]);
  await page.mouse.up();
});

test('an Influence card: a card in hand, a chip over the slots, the place lit, a gap in a drawer', async ({ page }) => {
  // R243: carried over the table it stays a card; over a pool's slots it is a chip.
  const c = await at(page, `${DPOOL} .drawer .cards .icard >> nth=0`, 8, 8);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(700, 700, { steps: 8 });
  await page.waitForTimeout(80);
  const carried = page.locator('.lifted').first();
  await expect(carried).toHaveClass(/\bicard\b/);
  const main = await at(page, `${SPOOL} .slot-main`, 20, 40);
  await page.mouse.move(main.x, main.y, { steps: 10 });
  await page.waitForTimeout(80);
  await expect(page.locator('.lifted').first()).toHaveClass(/\bchip\b/);
  // R222: the slot it would land in is lit.
  await expect(page.locator(`${SPOOL} .slot-main`)).toHaveClass(/\bover\b/);
  // R240: over Sam's drawer, a gap opens where it would go.
  const drawer = await at(page, `${SPOOL} .drawer .cards`, 10, 10);
  await page.mouse.move(drawer.x, drawer.y, { steps: 10 });
  await page.waitForTimeout(80);
  await expect(page.locator(`${SPOOL} .drawer .cards .gap`)).toHaveCount(1);
  await page.mouse.move(700, 700, { steps: 6 });
  await page.waitForTimeout(80);
  await expect(page.locator(`${SPOOL} .drawer .cards .gap`)).toHaveCount(0);
  await page.mouse.up();
});

test('a tap is born at the start of the drag, its glyph under the pointer', async ({ page }) => {
  // R225: the moment Sam's Money glyph is dragged, a card is in hand, held by its left end where the
  // glyph was (TAP_GLYPH_X in), the pointing hand on it (R221).
  const g = await box(page, `.obj.card[data-rid="${SAM}"] .glyph`), x = g.x + g.width / 2, y = g.y + g.height / 2;
  const before = (await kinds(page, 'influence')).length;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 12, y + 12, { steps: 2 });
  await expect.poll(async () => (await kinds(page, 'influence')).length).toBe(before + 1);
  const held = page.locator('.lifted.tapped');
  await expect(held).toHaveCount(1);
  const h = (await held.boundingBox())!;
  expect(x + 12 - h.x).toBeGreaterThanOrEqual(0);
  expect(x + 12 - h.x).toBeLessThan(30);
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).toBe('pointer');
  await page.mouse.up();
});

test("a growing drawer pushes what it would cover (the GM's page)", async ({ page }) => {
  // R241: with Devreux's card moved aside, a sticky laid just under his mat is pushed down when his
  // drawer grows.
  await page.evaluate(async () => {
    const g = (await (window as any).hollow.ready).store.game, d = g.get('o:00000003');
    g.change((w: any) => w.put('o:00000003', { ...d, gathered: false, card: { ...d.card, x: d.card.x + 500 } }));
  });
  const pool = await box(page, DPOOL);
  await page.evaluate(async ([rid, y]) => {
    const h = await (window as any).hollow.ready, g = h.store.game, r = g.get(rid), at = h.view.toWorld(0, y);
    g.change((w: any) => w.put(rid, { ...r, big: false, place: { ...r.place, x: 980, y: Math.round(at.y) + 4 } }));
  }, [STICKY, pool.y + pool.height] as const);
  const placed = await rec(page, STICKY);
  // Eight more Influence cards in Devreux's drawer grow it.
  await page.evaluate(async () => {
    const g = (await (window as any).hollow.ready).store.game;
    g.change((w: any) => { for (let k = 0; k < 8; k++) w.put(`o:0000d00${k}`, { kind: 'influence', oid: `0000d00${k}`, home: '00000003', where: 'drawer', n: 3 + k, name: `Grudge ${k}`, sign: 1, points: 2, used: false, crit: false }); });
  });
  expect((await box(page, DPOOL)).height).toBeGreaterThan(pool.height);
  await expect.poll(async () => (await rec(page, STICKY)).place.y, { timeout: 5000 }).toBeGreaterThan(placed.place.y);
});

test('a chip is carried where it was taken, and loose chips lie where they are', async ({ page }) => {
  // R216: a chip from a slot stays glued where it was pressed (it hung a chip's height below).
  const b = await box(page, '.obj.pool[data-rid="o:00000002"] .slot-stagger .chip'), x = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 150, y + 250, { steps: 6 });
  await page.waitForTimeout(80);
  const h = await box(page, '.lifted');
  expect(Math.abs(h.x + h.width / 2 - (x + 150))).toBeLessThanOrEqual(1);
  expect(Math.abs(h.y + h.height / 2 - (y + 250))).toBeLessThanOrEqual(1);
  await page.mouse.up();
  // R60: two loose chips, each drawn at its own place (not below the one before it).
  const placed = await page.evaluate(async () => {
    const h = await (window as any).hollow.ready, g = h.store.game;
    g.change((w: any) => {
      w.put('o:0000c001', { kind: 'chip', oid: '0000c001', where: { table: { x: 700, y: 650, z: 9, tilt: 0 } }, n: 0, sign: 1, points: 2, rider: false });
      w.put('o:0000c002', { kind: 'chip', oid: '0000c002', where: { table: { x: 760, y: 650, z: 9, tilt: 0 } }, n: 0, sign: 1, points: 4, rider: false });
    });
    await new Promise(r => requestAnimationFrame(() => r(0)));
    return ['o:0000c001', 'o:0000c002'].map(rid => Math.round((document.querySelector(`.loose-item[data-rid="${rid}"]`) as HTMLElement).getBoundingClientRect().top));
  });
  expect(placed[0]).toBe(placed[1]);
});
