// CRC: crc-TableView.md | Test: test-Table.md | R479, R480, R481, R482
// Two fingers on a phone: the table pinches as a sheet stuck to them, hands off between one finger
// and two without a jump, takes a second finger from a press on a piece, and pinches under a carry.
import { expect, test, type Page } from '@playwright/test';
import { open, openTable, rec } from './page.ts';

const STICKY = 'o:00000008';
type Pt = { x: number; y: number };

test.beforeEach(async ({ page }) => { await open(page); });

/** A touch pointer event at (x, y), sent to what is there, as a finger would. */
async function touch(page: Page, type: 'pointerdown' | 'pointermove' | 'pointerup', id: number, p: Pt): Promise<void> {
  await page.evaluate(({ type, id, p }) => {
    const t = document.elementFromPoint(p.x, p.y) ?? document.body;
    t.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true, pointerId: id, pointerType: 'touch', isPrimary: id === 1,
      clientX: p.x, clientY: p.y, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' ? 0 : 1,
    }));
  }, { type, id, p });
  await page.waitForTimeout(120);   // a frame: moves are placed once a frame, or every 100 ms
}

const view = (page: Page) => page.evaluate(async () => ({ ...(await (window as any).hollow.ready).view.view }));
const world = (page: Page, p: Pt): Promise<Pt> => page.evaluate(async p => (await (window as any).hollow.ready).view.toWorld(p.x, p.y), p);
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const near = (a: Pt, b: Pt, by = 1) => { expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(by); expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(by); };

/** A second open spot of table, at least `far` from `a`. */
const openFrom = (page: Page, a: Pt, far = 120) => page.evaluate(({ a, far }) => {
  for (let y = innerHeight - 40; y > 140; y -= 23) for (let x = 40; x < innerWidth - 40; x += 29) {
    const e = document.elementFromPoint(x, y);
    if (e && (e.id === 'table' || e.id === 'world') && Math.hypot(x - a.x, y - a.y) >= far) return { x, y };
  }
  throw new Error('no second open spot');
}, { a, far });

test('two fingers pinch the table as a sheet stuck to them, and hand off to one', async ({ page }) => {
  // R479: the point under the midpoint stays under it, the zoom follows the spacing.
  const a = await openTable(page), b = await openFrom(page, a);
  const v0 = await view(page), w = await world(page, mid(a, b));
  await touch(page, 'pointerdown', 1, a);
  await touch(page, 'pointerdown', 2, b);
  const a1 = { x: a.x - (b.x - a.x) / 4 + 15, y: a.y - (b.y - a.y) / 4 + 10 }, b1 = { x: b.x + (b.x - a.x) / 4 + 15, y: b.y + (b.y - a.y) / 4 + 10 };
  await touch(page, 'pointermove', 1, a1);
  await touch(page, 'pointermove', 2, b1);
  const v1 = await view(page);
  expect(v1.zoom).toBeCloseTo(Math.min(2.5, v0.zoom * 1.5), 2);
  near(await world(page, mid(a1, b1)), w);
  // R480: lift one finger; the other pans on from where it is, with no jump.
  await touch(page, 'pointerup', 2, b1);
  const v2 = await view(page), one = { x: a1.x + 25, y: a1.y + 15 };
  await touch(page, 'pointermove', 1, one);
  const v3 = await view(page);
  expect([Math.round(v3.x - v2.x), Math.round(v3.y - v2.y), v3.zoom]).toEqual([25, 15, v2.zoom]);
  // A second finger during the pan makes it a pinch, even on a piece, which isn't picked up.
  const { on } = await page.evaluate(() => {
    for (let y = 160; y < innerHeight - 20; y += 17) for (let x = 20; x < innerWidth - 20; x += 17) {
      const p = document.elementFromPoint(x, y)?.closest<HTMLElement>('.obj[data-rid]');
      if (p) return { on: { x, y }, rid: p.dataset.rid! };
    }
    throw new Error('no piece in view');
  });
  await touch(page, 'pointerdown', 3, on);
  await touch(page, 'pointermove', 3, { x: on.x - (on.x - one.x) / 2, y: on.y - (on.y - one.y) / 2 });
  expect((await view(page)).zoom).toBeCloseTo(Math.max(0.25, v3.zoom / 2), 2);   // fingers half as far apart
  expect(await page.locator('.lifted').count()).toBe(0);
  // A third finger does nothing.
  const v4 = await view(page);
  await touch(page, 'pointerdown', 4, { x: one.x - 60, y: one.y });
  await touch(page, 'pointermove', 4, { x: one.x - 160, y: one.y + 50 });
  expect(await view(page)).toEqual(v4);
  await touch(page, 'pointerup', 4, one);
  await touch(page, 'pointerup', 3, on);
  // At the limit the zoom stops, and the midpoint still pans.
  const c = await openFrom(page, one), w2 = await world(page, mid(one, c));
  await touch(page, 'pointerdown', 5, c);
  const c2 = { x: c.x + (c.x - one.x) * 12, y: c.y + (c.y - one.y) * 12 };
  await touch(page, 'pointermove', 5, c2);
  expect((await view(page)).zoom).toBeCloseTo(2.5, 5);
  near(await world(page, mid(one, c2)), w2);
  await touch(page, 'pointerup', 5, c2);
  await touch(page, 'pointerup', 1, one);
});

test('a second finger turns a press on a piece into a pinch', async ({ page }) => {
  // R481: the press hasn't moved, so nothing is picked up or clicked; the table pinches.
  const before = await rec(page, STICKY), v0 = await view(page);
  const s = (await page.locator(`[data-rid="${STICKY}"]`).boundingBox())!, on = { x: s.x + s.width / 2, y: s.y + s.height / 2 };
  const b = await openFrom(page, on);
  await touch(page, 'pointerdown', 1, on);
  await touch(page, 'pointerdown', 2, b);
  await touch(page, 'pointermove', 2, { x: b.x + (b.x - on.x) / 2, y: b.y + (b.y - on.y) / 2 });
  await touch(page, 'pointermove', 1, { x: on.x - 20, y: on.y - 10 });
  await expect(page.locator(`[data-rid="${STICKY}"]`)).not.toHaveClass(/\blifted\b/);
  expect((await view(page)).zoom).not.toBeCloseTo(v0.zoom, 3);
  await touch(page, 'pointerup', 2, b);
  await touch(page, 'pointerup', 1, { x: on.x - 20, y: on.y - 10 });
  await page.waitForTimeout(600);   // past a long press
  expect(await rec(page, STICKY)).toEqual(before);
  expect(await page.evaluate(() => !!document.activeElement?.closest?.('.obj'))).toBe(false);
});

test('a piece in hand can be pinched under, and stays glued to its finger', async ({ page }) => {
  // R482: the sheet follows both fingers, the piece glued to its own (R216); lifting the second
  // finger carries on the drag.
  const r0 = await rec(page, STICKY);
  const s = (await page.locator(`[data-rid="${STICKY}"]`).boundingBox())!, on = { x: s.x + s.width * 0.3, y: s.y + s.height * 0.8 };
  const p0 = await world(page, on), grip = { x: p0.x - r0.place.x, y: p0.y - r0.place.y };
  const held = () => page.evaluate(rid => { const e = document.querySelector<HTMLElement>(`.lifted[data-rid="${rid}"]`); return e && { x: parseFloat(e.style.left), y: parseFloat(e.style.top) }; }, STICKY);
  const glued = async (f: Pt) => { const w = await world(page, f), h = (await held())!; near({ x: w.x - h.x, y: w.y - h.y }, grip); };
  await touch(page, 'pointerdown', 1, on);
  const f1 = { x: on.x + 20, y: on.y + 10 };
  await touch(page, 'pointermove', 1, f1);
  await expect(page.locator(`[data-rid="${STICKY}"]`)).toHaveClass(/\blifted\b/);
  // A second finger pinches far past the limit, so the fingers slide over the table and the view
  // moves under the still carrying finger: the piece follows it.
  const b = await openFrom(page, f1, 150), z0 = (await view(page)).zoom;
  await touch(page, 'pointerdown', 2, b);
  await touch(page, 'pointermove', 2, { x: b.x + (b.x - f1.x) * 6, y: b.y + (b.y - f1.y) * 6 });
  expect((await view(page)).zoom).toBeGreaterThan(z0);
  await glued(f1);
  await expect(page.locator(`[data-rid="${STICKY}"]`)).toHaveClass(/\blifted\b/);
  // Lifting the second finger, the drag carries on; the drop lands under the finger.
  await touch(page, 'pointerup', 2, b);
  const f2 = { x: f1.x - 30, y: f1.y - 20 };
  await touch(page, 'pointermove', 1, f2);
  await glued(f2);
  await touch(page, 'pointerup', 1, f2);
  const w = await world(page, f2), r1 = await rec(page, STICKY);
  near({ x: w.x - r1.place.x, y: w.y - r1.place.y }, grip);
});
