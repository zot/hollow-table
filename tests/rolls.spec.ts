// CRC: crc-Rolls.md | Test: test-Network.md | R100, R101, R102, R103, R104, R105, R110, R297
// Rolls resolve on the GM's page, and each page prints what it may know.
import { expect, test, type Page } from '@playwright/test';
import { gmTable, hook, join } from './page.ts';

const SAM = 'o:00000001';
const intent = (pool: string) => ({ pool, action: '', vs: null, defend: 'mental', hand: { yellows: 0, bonus: 0 } });
const receipts = (page: Page) => page.locator('#tape .strip .receipt');

test('rolls at the table', async ({ browser }) => {
  test.setTimeout(120_000);
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);

  // The GM's own roll: full, with a ✓, on the GM's tape; Dana's says "rolled by the GM", without
  // the GM's numbers.
  await hook(gm, new Function('h', `h.rolls.roll(${JSON.stringify(intent('00000003'))})`) as (h: unknown) => void);
  await expect(receipts(gm).first().locator('.when')).toContainText('✓');
  await expect(receipts(dana)).toHaveCount(1, { timeout: 15_000 });
  await expect(receipts(dana).first().locator('.by')).toHaveText('rolled by the GM');
  await expect(receipts(dana).first()).not.toContainText('Total Influence');

  // A private roll: the GM's receipt says so and has no ✓; Dana's tape gets nothing (R104).
  await hook(gm, new Function('h', `h.rolls.roll(${JSON.stringify(intent('00000003'))}, true)`) as (h: unknown) => void);
  await expect(receipts(gm).first().locator('.privnote')).toHaveText('Private: not shown to the table');
  await expect(receipts(gm).first().locator('.when')).not.toContainText('✓');
  await gm.waitForTimeout(1500);
  await expect(receipts(dana)).toHaveCount(1);

  // Dana rolls for Sam, hers now: Roll shows "GM…" while it waits; her receipt has her numbers; the
  // GM's says who rolled it.
  await hook(gm, h => { const s = (h as any).store.game.get('o:00000001'); (h as any).store.game.change((w: any) => w.put('o:00000001', { ...s, owner: 'Dana' })); });
  await expect.poll(async () => (await dana.evaluate(async rid => (await (window as any).hollow.ready).store.game.get(rid), SAM)).owner, { timeout: 15_000 }).toBe('Dana');
  await dana.locator(`.pool[data-rid="${SAM}"] .die-own`).click();
  const roll = dana.locator('.roller .roll');
  await dana.evaluate(() => {
    const said: string[] = (window as any).said = [];
    new MutationObserver(() => said.push(document.querySelector('.roller .roll')?.textContent ?? '')).observe(document.body, { childList: true, characterData: true, subtree: true });
  });
  await roll.click();
  await expect(receipts(dana)).toHaveCount(2, { timeout: 15_000 });
  expect(await dana.evaluate(() => (window as any).said)).toContain('GM…');
  // A roll with no action (R69): her numbers are its resolution and Level.
  await expect(receipts(dana).first()).toContainText('Resolution:');
  await expect(receipts(dana).first()).toContainText('Level:');
  await expect(receipts(gm).first().locator('.by')).toHaveText('rolled by Dana');

  // Beauford isn't Dana's: refused, saying why.
  expect(await hook(dana, new Function('h', `return h.rolls.request(${JSON.stringify(intent('00000002'))})`) as (h: unknown) => Promise<string | null>))
    .toBe("Beauford isn't yours to roll.");

  // With the GM gone, nobody can roll.
  await gm.context().close();
  await expect.poll(() => hook(dana, new Function('h', `return h.rolls.request(${JSON.stringify(intent('00000001'))})`) as (h: unknown) => Promise<string | null>), { timeout: 70_000 })
    .toBe("Nobody can roll: the GM isn't at the table.");
});
