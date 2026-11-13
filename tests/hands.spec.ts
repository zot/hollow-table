// CRC: crc-Hands.md | Test: test-Network.md | R298, R299, R300, R301
// One carry, shown alike: what the GM's page carries shows lifted on a player's page, at the same
// place, with its aim drawn there (a strip opened, a card as a chip, a drawer's gap), and nothing
// saved until the drop; a drop that changes nothing goes back; a page that leaves lets go.
import { expect, test, type Page } from '@playwright/test';
import { at, gmTable, hook, join, rec } from './page.ts';

const SAM = 'o:00000001', BEAUFORD = 'o:00000002', DEVREUX = 'o:00000003', PEACE = 'o:00000004', STAGGER = 'o:00000007';
const pool = (rid: string) => `.obj.pool[data-rid="${rid}"]`;

/** Where the piece held as `sel` lies in the world, or null if nothing is held so. */
const heldAt = (page: Page, sel: string) => page.evaluate(sel => {
  const e = document.querySelector<HTMLElement>(sel);
  return e?.classList.contains('lifted') ? `${Math.round(parseFloat(e.style.left))},${Math.round(parseFloat(e.style.top))}` : null;
}, sel);

/** Moves the pointer there in steps and waits a little over two sends. */
async function to(page: Page, p: { x: number; y: number }) {
  await page.mouse.move(p.x, p.y, { steps: 6 });
  await page.waitForTimeout(250);
}

test("another page's carry shows in hand, aimed, and is saved only by the drop", async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const chip = `.lifted[data-rid="${STAGGER}"]`;

  // R298: the GM takes Beauford's Stagger chip: Dana's page shows it lifted, where the GM holds it.
  const c = await at(gm, `${pool(BEAUFORD)} .slot-stagger .chip`, 10, 10);
  await gm.mouse.move(c.x, c.y);
  await gm.mouse.down();
  await to(gm, { x: c.x + 60, y: c.y + 300 });
  const here = await heldAt(gm, chip);
  await expect.poll(() => heldAt(dana, chip), { timeout: 10_000 }).toBe(here);
  await expect(dana.locator(chip)).toHaveClass(/\bcarried\b/);
  // R300: nothing saved moved: the chip is still in Stagger on both pages.
  expect((await rec(dana, STAGGER)).where).toEqual({ slot: '00000002', name: 'stagger' });
  expect((await rec(gm, STAGGER)).where).toEqual({ slot: '00000002', name: 'stagger' });

  // R299, R244: over Sam's Bias strip it opens, on both pages.
  const bias = await at(gm, `${pool(SAM)} .slot-bias`, 4, 40);
  await to(gm, bias);
  await expect(gm.locator(`${pool(SAM)} .slot-bias`)).not.toHaveClass(/\bnarrow\b/);
  await expect(dana.locator(`${pool(SAM)} .slot-bias`)).not.toHaveClass(/\bnarrow\b/, { timeout: 10_000 });
  await expect(dana.locator(`${pool(SAM)} .slot-bias`)).toHaveClass(/\bover\b/);

  // Let go there: Bias holds it on both pages, and nothing is left in a hand.
  await gm.mouse.up();
  await expect.poll(async () => (await rec(dana, STAGGER))?.where, { timeout: 10_000 }).toEqual({ slot: '00000001', name: 'bias' });
  await expect(dana.locator('.lifted')).toHaveCount(0);
  await expect(dana.locator(`${pool(SAM)} .over`)).toHaveCount(0);
});

test("a card in another page's hand: a chip over the slots, a gap in a drawer; a drop that changes nothing goes back", async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const card = `.lifted[data-rid="${PEACE}"]`;

  // R243: Devreux's Keep the Peace carried over Sam's slots is a chip on Dana's page too.
  const p = await at(gm, `${pool(DEVREUX)} .drawer [data-rid="${PEACE}"]`, 8, 8);
  await gm.mouse.move(p.x, p.y);
  await gm.mouse.down();
  await to(gm, { x: p.x + 20, y: p.y + 300 });
  await expect(dana.locator(card)).toHaveClass(/\bicard\b/, { timeout: 10_000 });
  await to(gm, await at(gm, `${pool(SAM)} .slot-main`, 20, 40));
  await expect(dana.locator(card)).toHaveClass(/\bchip\b/, { timeout: 10_000 });

  // R240: over Sam's drawer, the gap opens in Sam's drawer on Dana's page, and closes when it leaves.
  await to(gm, await at(gm, `${pool(SAM)} .drawer .cards`, 10, 10));
  await expect(dana.locator(`${pool(SAM)} .drawer .cards .gap`)).toHaveCount(1, { timeout: 10_000 });
  await to(gm, { x: p.x + 20, y: p.y + 300 });
  await expect(dana.locator(`${pool(SAM)} .drawer .cards .gap`)).toHaveCount(0, { timeout: 10_000 });

  // Let go in Sam's drawer: it moves there on both pages.
  await to(gm, await at(gm, `${pool(SAM)} .drawer .cards`, 10, 10));
  await gm.mouse.up();
  await expect.poll(async () => (await rec(dana, PEACE))?.home, { timeout: 10_000 }).toBe('00000001');
  await expect(dana.locator('.lifted')).toHaveCount(0);

  // R300: Beauford's Stagger chip dropped on the kill box: a chip isn't killed, nothing changes, and
  // Dana's page puts it back in Stagger by itself.
  const was = await rec(gm, STAGGER);
  const c = await at(gm, `${pool(BEAUFORD)} .slot-stagger .chip`, 10, 10);
  await gm.mouse.move(c.x, c.y);
  await gm.mouse.down();
  await to(gm, { x: c.x + 60, y: c.y + 300 });
  await to(gm, await at(gm, `${pool(DEVREUX)} .kill`, 6, 6));
  await expect(dana.locator(`.lifted[data-rid="${STAGGER}"]`)).toHaveCount(1, { timeout: 10_000 });
  await gm.mouse.up();
  await expect(dana.locator('.lifted')).toHaveCount(0, { timeout: 5_000 });
  await expect(dana.locator(`${pool(BEAUFORD)} .slot-stagger .chip[data-rid="${STAGGER}"]`)).toHaveCount(1);
  expect(await rec(gm, STAGGER)).toEqual(was);
  expect(await rec(dana, STAGGER)).toEqual(was);
});

test('a page that leaves lets go; a carry the GM would refuse is not shown', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  await hook(gm, h => { const s = h.store.game.get('o:00000001'); h.store.game.change((w: any) => w.put('o:00000001', { ...s, owner: 'Dana' })); });
  await expect.poll(async () => (await rec(dana, SAM)).owner, { timeout: 15_000 }).toBe('Dana');

  // R300: Dana carries Devreux's pool: the GM's page doesn't show it.
  const d = await at(dana, `${pool(DEVREUX)} .name`, 4, 4);
  await dana.mouse.move(d.x, d.y);
  await dana.mouse.down();
  await to(dana, { x: d.x + 40, y: d.y + 200 });
  await dana.waitForTimeout(500);
  await expect(gm.locator('.lifted')).toHaveCount(0);
  await dana.mouse.up();

  // R298, R301: Dana carries Sam's pool, and leaves while holding it: the GM's page lets it go.
  const s = await at(dana, `${pool(SAM)} .name`, 4, 4);
  await dana.mouse.move(s.x, s.y);
  await dana.mouse.down();
  await to(dana, { x: s.x + 40, y: s.y + 250 });
  await expect(gm.locator(`.lifted${pool(SAM)}`)).toHaveCount(1, { timeout: 10_000 });
  await dana.close();
  await expect(gm.locator('.lifted')).toHaveCount(0, { timeout: 15_000 });
});
