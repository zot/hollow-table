// CRC: crc-Seat.md | Test: test-Seat.md | R126, R127, R128, R136, R153, R381
// The seat in the browser: everything done for looking stays in this viewer's seat, never in the
// game; a reload brings it back; each viewer has their own; a restore keeps it.
import { expect, test, type Page } from '@playwright/test';
import { hook, open, records, storage } from './page.ts';

const DEVREUX = '.pool[data-rid="o:00000003"]';

const seatOf = async (page: Page, viewer: string) => {
  const { id } = await records(page);
  return (await storage(page))[`hollow.seat.${id}.${viewer}`];
};

/** Pans by dragging an empty stretch of the table, and zooms with the wheel there. */
async function look(page: Page) {
  const { x, y } = await page.evaluate(() => {
    const t = document.getElementById('table')!.getBoundingClientRect();
    for (let y = t.bottom - 30; y > t.top + 100; y -= 20) for (let x = t.right - 30; x > t.left + 150; x -= 20) {
      const hit = document.elementFromPoint(x, y) as HTMLElement | null;
      if (hit && (hit.id === 'table' || hit.id === 'world')) return { x, y };
    }
    throw new Error('no empty stretch of table');
  });
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 120, y - 60, { steps: 5 });
  await page.mouse.up();
  await page.mouse.wheel(0, -200);
}

test('the seat is not the game', async ({ page }) => {
  await open(page);
  const before = await records(page);

  // 1. Looking: dock the roll row on Devreux, roll the tape up, open Devreux's used pile, pan and
  // zoom, and open Boot Hill.
  await page.locator(`${DEVREUX} .die-own`).click();
  await expect(page.locator(`${DEVREUX} .roller`)).toBeVisible();
  await page.locator('#paperroll').click();
  await page.locator(`${DEVREUX} .usedpile .used`).click();
  await expect(page.locator(`${DEVREUX} .usedlist`)).toBeVisible();
  await look(page);
  // A press on the table closes Boot Hill's list (R289), so it opens last.
  await page.locator('#boothill').click();
  await expect(page.locator('#graves')).toBeVisible();

  // 2. The game, held and saved, is as it was; the seat is one key for this game and viewer.
  await page.waitForTimeout(600);
  // R381: the roll row it brought up is the game's; nothing else changed.
  const without = (r: { held: string; saved: string; id: string }) => ({ ...r, held: JSON.stringify(JSON.parse(r.held).filter(([rid]: [string]) => rid !== 'rows')),
    saved: JSON.stringify(JSON.parse(r.saved).filter(([rid]: [string]) => rid !== 'rows')) });
  const after = await records(page);
  expect(without(after)).toEqual(without(before));
  expect(JSON.parse(after.held).find(([rid]: [string]) => rid === 'rows')[1].rows['00000003']).toBeTruthy();
  const seat = JSON.parse((await seatOf(page, 'GM'))!);
  expect(seat.view).not.toBeNull();
  // R381: the roll row is the game's, not the seat's.
  expect(seat.roller).toBeUndefined();
  expect(seat.tapeUp).toBe(true);
  expect(seat.boothill.open).toBe(true);
  expect(seat.open.used).toEqual(['00000003']);

  // 3. A reload brings the seat back exactly.
  const kept = await seatOf(page, 'GM');
  await open(page);   // a reload
  expect(await seatOf(page, 'GM')).toBe(kept);
  await expect(page.locator(`${DEVREUX} .roller`)).toBeVisible();
  await expect(page.locator(`${DEVREUX} .usedlist`)).toBeVisible();
  await expect(page.locator('#tape')).toHaveClass(/\bup\b/);
  await expect(page.locator('#graves')).toBeVisible();

  // 4. Viewing as a player (R153): that viewer's own seat; the row the GM brought up on Devreux is the
  // table's (R381), so it shows, but isn't theirs to roll; 5. back as the GM, the GM's seat again.
  await page.locator('.tag.viewas').click();
  await page.waitForURL(/./);
  await open(page);
  const as = await page.locator('.tag.viewas').textContent();
  expect(as).not.toBe('GM');
  await expect(page.locator('.roller')).toHaveCount(1);
  await expect(page.locator('.roller .roll')).toHaveCount(0);
  await expect(page.locator('#graves')).toBeHidden();
  for (let i = 0; i < 8 && await page.locator('.tag.viewas').textContent() !== 'GM'; i++) {
    await page.locator('.tag.viewas').click();
    await open(page);
  }
  // The press on "You are" was a press outside Boot Hill's list, which closes it (R289); the rest of the
  // GM's seat is as it was (R599: a switch keeps the seat, never an older copy of it).
  const closed = JSON.parse(kept!);
  closed.boothill.open = false;
  expect(JSON.parse((await seatOf(page, 'GM'))!)).toEqual(closed);
  await expect(page.locator(`${DEVREUX} .roller`)).toBeVisible();

  // 6. A restore keeps the seat (R136).
  await page.evaluate(async () => {
    const h = await (window as unknown as { hollow: { ready: Promise<{ store: { checkpoint(n: string, a: boolean): Promise<unknown> } }> } }).hollow.ready;
    await h.store.checkpoint('Seat check', false);
  });
  await page.locator('#ledgerbtn').click();   // a press elsewhere: Boot Hill's list closes
  const beforeRestore = await seatOf(page, 'GM');
  await page.locator('#ledger .entry', { hasText: 'Seat check' }).click();
  await expect(page.locator('#ledger .entry', { hasText: 'Before restoring “Seat check”' })).toBeVisible();
  expect(await seatOf(page, 'GM')).toBe(beforeRestore);
  await expect(page.locator(`${DEVREUX} .roller`)).toBeVisible();
});

test('the Ledger deletes a checkpoint and another game with two shift-clicks, never the game on the table', async ({ page }) => {
  // R457: armed red and said, reverting after 3 s; a second deletes forever.
  await open(page);
  await hook(page, async h => { await h.store.checkpoint('Doomed', false); await h.store.add('Spare'); });
  await page.locator('#ledgerbtn').click();
  // By place, not by text: arming replaces the text.
  const entries = page.locator('#ledger .entry'), at = async (text: string) => entries.nth((await entries.allTextContents()).findIndex(t => t.includes(text)));
  // The Ledger draws its lists from the database: wait for them before reading where things are.
  await expect(entries.filter({ hasText: 'Doomed' })).toHaveCount(1);
  await expect(entries.filter({ hasText: 'Spare' })).toHaveCount(1);
  const cp = await at('Doomed');
  await cp.click({ modifiers: ['Shift'] });
  await expect(cp).toHaveText('Shift-click again to delete forever');
  await expect(cp).toHaveClass(/\bdoom\b/);
  await cp.click({ modifiers: ['Shift'] });
  await expect(page.locator('#ledger .entry', { hasText: 'Doomed' })).toHaveCount(0);
  const spare = await at('Spare');
  await spare.click({ modifiers: ['Shift'] });
  await spare.click({ modifiers: ['Shift'] });
  await expect(page.locator('#ledger .entry', { hasText: 'Spare' })).toHaveCount(0);
  await expect(page.locator('#ledger .entry.current')).toBeDisabled();
});
