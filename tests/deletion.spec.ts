// CRC: crc-Authority.md | Test: test-Network.md | R113, R125, R171, R188, R192, R297
// A deletion reaches a player at the table, and one who was away: the GM rolls, tears the tape off,
// buries the roll and empties the graveyard; the player's table never keeps the torn roll.
import { expect, test, type Page } from '@playwright/test';
import { gmTable, hook, join, open, synced } from './page.ts';

const tornRolls = (page: Page) => hook(page, h => h.store.game.all().filter(([, r]: [string, any]) => r.kind === 'tornroll').length);
const yards = (page: Page) => hook(page, h => JSON.stringify(h.store.game.get('yards')));

/** The GM rolls three times, tears the tape off onto the bar, and empties the graveyard. */
async function rollTearBury(gm: Page) {
  await hook(gm, h => { for (let i = 0; i < 3; i++) h.rolls.roll({ pool: '00000003', action: '', vs: null, defend: 'mental', hand: { yellows: 0, bonus: 0 } }); });
  await expect(gm.locator('#tape .strip > *')).toHaveCount(3);
  const strip = (await gm.locator('#tape .strip').boundingBox())!, bar = (await gm.locator('#bar').boundingBox())!;
  await gm.mouse.move(strip.x + 40, strip.y + 20);
  await gm.mouse.down();
  await gm.mouse.move(strip.x + 40, strip.y + 120, { steps: 5 });
  await gm.mouse.move(bar.x + 400, bar.y + 30, { steps: 10 });
  await gm.mouse.up();
  expect(await tornRolls(gm)).toBe(0);
  await expect.poll(() => yards(gm)).toContain('Tape: 3 rolls');
  // Deleting forever: two shift-clicks on the graveyard's name.
  await gm.locator('#boothill').click();
  await gm.locator('#graves .yname').click({ modifiers: ['Shift'] });
  await gm.locator('#graves .yname').click({ modifiers: ['Shift'] });
  await expect(gm.locator('#graves .items')).toHaveText('Nothing is buried here.');
}

test('a deletion reaches a player who is at the table, and one who was away', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);

  await rollTearBury(gm);
  await expect.poll(() => yards(dana), { timeout: 15_000 }).toBe(await yards(gm));
  expect(await tornRolls(dana)).toBe(0);

  // Again with Dana away, and back.
  await hook(dana, h => h.wire.leave());
  await rollTearBury(gm);
  await open(dana, invite);
  await synced(dana, gm);
  await expect.poll(() => yards(dana), { timeout: 15_000 }).toBe(await yards(gm));
  expect(await tornRolls(dana)).toBe(0);
});
