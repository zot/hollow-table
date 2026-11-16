// CRC: crc-Rolls.md | Test: test-Network.md | R100, R101, R102, R103, R104, R105, R110, R297, R348, R376, R351, R371, R372, R373, R374, R375
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
  // R371: Dana picks Sam's Infer; the row is the table's, so the GM's page shows it on Sam's pool.
  await dana.locator(`.obj.card[data-rid="${SAM}"] .front .text > div`, { hasText: 'Infer:' }).locator('.actdie').click();
  const head = (page: Page) => page.locator(`.pool[data-rid="${SAM}"] .rollinfo`);
  await expect(head(gm).locator('.base')).toContainText('Infer', { timeout: 15_000 });
  // R372: Dana can't aim; the GM aims from Sam's header, and a blank tray reminds the GM.
  const dBase = await at(dana, `.pool[data-rid="${SAM}"] .rollinfo .base`, 8, 6), dTable = await openTable(dana);
  await dragFromTo(dana, dBase.x, dBase.y, dTable.x, dTable.y, 15);
  await expect(dana.locator('#defchoice')).toHaveCount(0);
  const base = await at(gm, `.pool[data-rid="${SAM}"] .rollinfo .base`, 8, 6), table = await openTable(gm);
  await dragFromTo(gm, base.x, base.y, table.x, table.y, 15);
  await expect(gm.locator('#defchoice')).toHaveText("Put the world's number in the tray first.");
  await gm.keyboard.press('Escape');
  // R348: the GM sets it; Dana's page learns only that it is set.
  await hook(gm, h => (h as any).store.game.change((w: any) => w.put('world', { set: true, total: 5 })));
  await expect.poll(() => dana.evaluate(async () => (await (window as any).hollow.ready).store.game.get('world')), { timeout: 15_000 })
    .toEqual({ set: true, total: 0 });
  await dana.locator('#bar .oppobtn').click();
  await expect(dana.locator('#bar .oppotray')).toContainText('set by the GM');
  await expect(dana.locator('#bar .oppotray input')).toHaveCount(0);
  // R373, R374: the GM aims; Dana's row shows the world without its number, and the GM's White, locked.
  await dragFromTo(gm, base.x, base.y, table.x, table.y, 15);
  await expect(head(gm).locator('.vs')).toContainText('vs the world 5');
  await expect(head(dana).locator('.vs')).toHaveText('vs the world', { timeout: 15_000 });
  await expect(dana.locator(`.pool[data-rid="${SAM}"] .roller .white`)).toHaveClass(/\blocked\b/);
  const whiteOf = (page: Page) => page.locator(`.pool[data-rid="${SAM}"] .roller .white`).innerHTML();
  await expect.poll(async () => await whiteOf(dana), { timeout: 15_000 }).toBe(await whiteOf(gm));
  // R351, R375: her receipt says the world; the GM's has its number and the Difference.
  await dana.locator(`.pool[data-rid="${SAM}"] .roller .roll`).click();
  await expect(receipts(dana).first()).toContainText('vs the world', { timeout: 15_000 });
  await expect(receipts(dana).first()).not.toContainText('Difference');
  await expect(receipts(gm).first()).toContainText('vs the world (5), Difference');
});
