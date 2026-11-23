// CRC: crc-Authority.md | Test: test-Network.md | R125, R171, R188, R192, R297
// A deletion reaches a player at the table, and one who was away: the GM buries a sticky and empties
// the graveyard; the player's table never keeps the sticky.
import { expect, test, type Page } from '@playwright/test';
import { at, barMiddle, dragFromTo, gmTable, hook, join, open, rec, synced } from './page.ts';

const ONE = 'o:0000b001', TWO = 'o:0000b002';
const yards = (page: Page) => hook(page, h => JSON.stringify(h.store.game.get('yards')));

/** The GM buries the sticky on the bar, and empties the graveyard. */
async function buryAndForget(gm: Page, rid: string) {
  const s = await at(gm, `[data-rid="${rid}"]`, 10, 10), bar = await barMiddle(gm);
  await dragFromTo(gm, s.x, s.y, bar.x, bar.y);
  expect(await rec(gm, rid)).toBeUndefined();
  await expect.poll(() => yards(gm)).toContain('Note: Bury me');
  // Deleting forever: two shift-clicks on the graveyard's name.
  await gm.locator('#boothill').click();
  await gm.locator('#graves .yname').click({ modifiers: ['Shift'] });
  await gm.locator('#graves .yname').click({ modifiers: ['Shift'] });
  await expect(gm.locator('#graves .items')).toHaveText('Nothing is buried here.');
  await gm.locator('#boothill').click();
}

test('a deletion reaches a player who is at the table, and one who was away', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  await hook(gm, h => h.store.game.change((w: any) => {
    w.put('o:0000b001', { kind: 'sticky', oid: '0000b001', place: { x: 420, y: 420, z: 50, tilt: 0 }, text: 'Bury me' });
    w.put('o:0000b002', { kind: 'sticky', oid: '0000b002', place: { x: 620, y: 420, z: 51, tilt: 0 }, text: 'Bury me' });
  }));
  await expect.poll(async () => !!(await rec(dana, ONE)) && !!(await rec(dana, TWO)), { timeout: 15_000 }).toBe(true);

  await buryAndForget(gm, ONE);
  await expect.poll(() => yards(dana), { timeout: 15_000 }).toBe(await yards(gm));
  expect(await rec(dana, ONE)).toBeUndefined();

  // Again with Dana away, and back.
  await hook(dana, h => h.wire.leave());
  await buryAndForget(gm, TWO);
  await open(dana, invite);
  await synced(dana, gm);
  await expect.poll(() => yards(dana), { timeout: 15_000 }).toBe(await yards(gm));
  expect(await rec(dana, TWO)).toBeUndefined();
});
