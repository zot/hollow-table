// CRC: crc-Rolls.md | Test: test-Network.md | R100, R101, R102, R103, R104, R105, R110, R297, R348, R349, R351
// Rolls resolve on the GM's page, and each page prints what it may know.
import { expect, test, type Page } from '@playwright/test';
import { at, dragFromTo, gmTable, hook, join, openTable } from './page.ts';

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
  // R317: the outcome with its Level and how it adds up, "Failure −Sig: 2 + 5".
  await expect(receipts(dana).first().locator('.outcome')).toHaveText(/^(Success|Success at cost|Failure) [+−]\w+: \d/);
  await expect(receipts(gm).first().locator('.by')).toHaveText('rolled by Dana');

  // Beauford isn't Dana's: refused, saying why.
  expect(await hook(dana, new Function('h', `return h.rolls.request(${JSON.stringify(intent('00000002'))})`) as (h: unknown) => Promise<string | null>))
    .toBe("Beauford isn't yours to roll.");

  // With the GM gone, nobody can roll.
  await gm.context().close();
  await expect.poll(() => hook(dana, new Function('h', `return h.rolls.request(${JSON.stringify(intent('00000001'))})`) as (h: unknown) => Promise<string | null>), { timeout: 70_000 })
    .toBe("Nobody can roll: the GM isn't at the table.");
});

test('the world at the table: its number stays on the GM\'s page', async ({ browser }) => {
  test.setTimeout(120_000);
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  await hook(gm, h => { const s = (h as any).store.game.get('o:00000001'); (h as any).store.game.change((w: any) => w.put('o:00000001', { ...s, owner: 'Dana' })); });
  await expect.poll(async () => (await dana.evaluate(async rid => (await (window as any).hollow.ready).store.game.get(rid), SAM)).owner, { timeout: 15_000 }).toBe('Dana');
  // R349: Dana aims Sam's Infer at open table before the GM has set the world: the player's reminder.
  await dana.locator(`.obj.card[data-rid="${SAM}"] .front .text > div`, { hasText: 'Infer:' }).locator('.actdie').click();
  const base = await at(dana, `.pool[data-rid="${SAM}"] .rollinfo .base`, 8, 6), table = await openTable(dana);
  await dragFromTo(dana, base.x, base.y, table.x, table.y, 15);
  await expect(dana.locator('#defchoice')).toHaveText("The GM hasn't given the world a number yet.");
  await dana.keyboard.press('Escape');
  // R348: the GM sets it; Dana's page learns only that it is set.
  await hook(gm, h => (h as any).store.game.change((w: any) => w.put('world', { set: true, total: 5 })));
  await expect.poll(() => dana.evaluate(async () => (await (window as any).hollow.ready).store.game.get('world')), { timeout: 15_000 })
    .toEqual({ set: true, total: 0 });
  await dana.locator('#bar .oppobtn').click();
  await expect(dana.locator('#bar .oppotray')).toContainText('set by the GM');
  await expect(dana.locator('#bar .oppotray input')).toHaveCount(0);
  // R350: aimed, her row has no number for the world, and the White is the GM's.
  await dragFromTo(dana, base.x, base.y, table.x, table.y, 15);
  await expect(dana.locator(`.pool[data-rid="${SAM}"] .rollinfo .vs`)).toHaveText('vs the world');
  await expect(dana.locator(`.pool[data-rid="${SAM}"] .roller .white`)).toHaveClass(/\blocked\b/);
  // R351: her receipt says the world; the GM's has its number and the Difference.
  await dana.locator(`.pool[data-rid="${SAM}"] .roller .roll`).click();
  await expect(receipts(dana).first()).toContainText('vs the world', { timeout: 15_000 });
  await expect(receipts(dana).first()).not.toContainText('Difference');
  await expect(receipts(gm).first()).toContainText('vs the world (5), Difference');
});
