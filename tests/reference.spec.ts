// CRC: crc-PieceView.md, crc-Records.md, crc-Desktops.md | Test: test-Table.md | R590, R591, R592, R593, R594, R595
// The reference sheet: given once to every page, turned, kept through a reload, put away for good, given
// again by the desk; each page's own; older games' shared cards deleted by the GM's page.
import { expect, test, type Page } from '@playwright/test';
import { barMiddle, dragFromTo, fromDesk, hook, open, person, rec, records, synced } from './page.ts';

/** This page's reference sheets: [rid, page]. */
const sheets = (page: Page): Promise<[string, string][]> =>
  hook(page, h => h.store.game.all().filter(([, r]: [string, any]) => r.kind === 'reference').map(([rid, r]: [string, any]) => [rid, r.which]));
const turn = (page: Page, label: 'Next page' | 'Previous page') => page.locator(`.obj.reference .turn[aria-label="${label}"]`).click();

test('a reference sheet: given once, turned, kept, put away, given again', async ({ page }) => {
  await open(page, '/', true);
  // R594, R593: one sheet, this page's own under m:, open at How to use the table.
  await expect.poll(() => sheets(page)).toHaveLength(1);
  const [rid, at] = (await sheets(page))[0]!;
  expect(rid.startsWith('m:') && at === 'howto').toBe(true);
  const sheet = page.locator('.obj.reference');
  await expect(sheet.locator('.rhd')).toHaveText(/How to use the table/i);
  await expect(sheet.locator('.rfoot')).toHaveText(/1 of 3/);

  // R592: turned, the Quick Reference, its die read as the dice read it; then Quick Character Creation.
  await turn(page, 'Next page');
  await expect(sheet.locator('.rhd')).toHaveText(/Quick reference/i);
  await expect(sheet.locator('p.in', { hasText: /^4-6:/ })).toHaveText('4-6: Clean Success');
  await expect(sheet.locator('p.in', { hasText: /^3:/ })).toHaveText('3: Success with cost, like +1 Stagger');
  await expect(sheet.locator('p.in', { hasText: /^1-2:/ })).toHaveText('1-2: Fail, may cause +1 Stagger and Level -1 Fumble');
  await turn(page, 'Next page');
  await expect(sheet.locator('.rhd')).toHaveText(/Quick character creation/i);
  await expect(sheet.locator('td').first()).toHaveText('Smart');
  await expect(sheet.locator('.turn[aria-label="Next page"]')).toBeDisabled();

  // R593, R594: through a reload it is kept, at its page, and no other is given. Saved a moment after the
  // change (SAVE_PAUSE); the reload comes once it is (gap O12).
  await expect.poll(async () => (await records(page)).saved).toContain('"which":"creation"');
  await open(page, '/', true);
  expect(await sheets(page)).toEqual([[rid, 'creation']]);

  // R593: put away, it vanishes, and a reload gives no other.
  const b = (await sheet.boundingBox())!, bar = await barMiddle(page);
  await dragFromTo(page, b.x + b.width / 2, b.y + 40, bar.x, bar.y);
  await expect.poll(() => sheets(page)).toEqual([]);
  await expect.poll(async () => (await records(page)).saved).not.toContain(rid);
  await open(page, '/', true);
  expect(await sheets(page)).toEqual([]);

  // R591: the desk gives another, open at How to use the table.
  await fromDesk(page, 'howto', 500, 400);
  await expect.poll(() => sheets(page).then(s => s.map(([r, w]) => [r.slice(0, 2), w]))).toEqual([['m:', 'howto']]);

  // R595: a shared card from an older game is deleted by the GM's page.
  await hook(page, h => h.store.game.load([...h.store.game.all(),
    ['o:0000c0de', { kind: 'reference', oid: '0000c0de', place: { x: 0, y: 0, z: 1, tilt: 0 }, which: 'howto' }]]));
  await expect.poll(() => rec(page, 'o:0000c0de')).toBeUndefined();
});

test("each page's own sheet: never sent, turned alone", async ({ browser }) => {
  const gm = await person(browser, 'GM');
  await open(gm, '/', true);
  await gm.locator('#bar .invite').click();
  const url = new URL(await hook(gm, h => h.invite() as string));
  const dana = await person(browser, 'Dana');
  await open(dana, `/${url.search}`, true);
  await synced(dana, gm);
  // R593, R594: each has one, its own, and holds no other's.
  await expect.poll(() => sheets(dana)).toHaveLength(1);
  const mine = (await sheets(dana))[0]![0], theirs = (await sheets(gm))[0]![0];
  expect(mine).not.toBe(theirs);
  expect(await rec(dana, theirs)).toBeUndefined();
  // R593: Dana turns hers; the GM's stays at How to use the table.
  await turn(dana, 'Next page');
  await expect.poll(() => sheets(dana).then(s => s[0]![1])).toBe('quick');
  await synced(dana, gm);
  expect((await sheets(gm))[0]![1]).toBe('howto');
});
