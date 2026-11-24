// CRC: crc-Desk.md, crc-Desktops.md | Test: test-Desktops.md | R557, R558, R559, R560, R561, R563
// The knife switch: setting a desk out switches everyone's table to its desktop; the players and their
// paper travel, the rest waits on the GM's page until its desk is set out again.
import { expect, test, type Page } from '@playwright/test';
import { gmTable, join, rec } from './page.ts';

const SAM = 'o:00000001', DEVREUX = 'o:00000003';
const middle = async (page: Page, sel: string) => { const b = (await page.locator(sel).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

test('the knife switch sets a desk out on every table, and back', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const devreux = await rec(gm, DEVREUX), round = (await rec(gm, 'meta'))?.round;
  expect(devreux).toBeTruthy();
  const desk = await middle(gm, '#bar .desk');
  await gm.mouse.click(desk.x, desk.y);
  // R560: the desk set out shows its switch thrown.
  await expect(gm.locator('#bar .knife')).toHaveClass(/\bthrown\b/);
  await gm.locator('#bar .desknav .dname').fill('Act 1');
  await gm.locator('#bar .desknav .dname').press('Enter');
  await gm.locator('#bar .desknext').click();
  await gm.locator('#bar .desknav .dname').fill('Act 2');
  await gm.locator('#bar .desknav .dname').press('Enter');
  await expect(gm.locator('#bar .knife')).not.toHaveClass(/\bthrown\b/);
  // R559, R561: thrown, Act 2's empty desktop: Devreux leaves both tables, kept on the GM's page alone; Sam stays.
  await gm.locator('#bar .knife').click();
  await expect(gm.locator('#bar .knife')).toHaveClass(/\bthrown\b/);
  await expect.poll(() => rec(gm, DEVREUX)).toBeUndefined();
  await expect.poll(() => rec(dana, DEVREUX), { timeout: 15_000 }).toBeUndefined();
  expect(await rec(gm, SAM)).toBeTruthy();
  expect(await rec(dana, SAM)).toBeTruthy();
  const kept = await rec(gm, 'desk');
  expect(kept.out).toBe(1);
  expect(kept.desks[0].top.map((r: any) => r.oid)).toContain('00000003');
  expect(await rec(dana, 'desk')).toBeUndefined();
  // R563: nothing ended.
  expect((await rec(gm, 'meta'))?.round).toBe(round);
  // R559: back to Act 1: Devreux returns, as he was, on both pages.
  await gm.locator('#bar .deskprev').click();
  await gm.locator('#bar .knife').click();
  await expect.poll(() => rec(gm, DEVREUX)).toEqual(devreux);
  await expect.poll(() => rec(dana, DEVREUX).then(r => !!r), { timeout: 15_000 }).toBe(true);
  expect((await rec(gm, 'desk')).out).toBe(0);
});
