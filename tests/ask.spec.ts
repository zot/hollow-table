// CRC: crc-Ask.md, crc-Ledger.md, crc-Folks.md | Test: test-Table.md | R601, R602
// The table asks on a card of its own, never in the browser's dialogs; when the clipboard refuses, the
// invite link shows under its button.
import { expect, test } from '@playwright/test';
import { answer, gmTable, hook, open, person } from './page.ts';

test('a checkpoint is named on the table\'s question card, or cancelled', async ({ browser }) => {
  const page = await person(browser, 'GM');
  await open(page);
  await page.locator('#ledgerbtn').click();
  // The checkpoints are the Ledger's first list (the games the second), drawn once it has read them.
  const list = page.locator('#ledger .entries').first(), names = list.locator('.entry span');
  await expect(list).toBeVisible();
  const before = await names.count();
  // R601: the card offers "Round N, hh:mm:ss", selected; a name written and OK makes the checkpoint.
  await page.locator('#ledger .act', { hasText: 'Checkpoint' }).click();
  const card = page.locator('.askcard');
  await expect(card.locator('.question')).toHaveText('Name this checkpoint');
  await expect(card.locator('.line')).toHaveValue(/^Round \d+, \d\d:\d\d:\d\d$/);
  expect(await card.locator('.line').evaluate(l => (l as HTMLInputElement).selectionEnd! - (l as HTMLInputElement).selectionStart!))
    .toBe((await card.locator('.line').inputValue()).length);
  await answer(page, 'Before the duel');
  await expect(names.first()).toHaveText('Before the duel');
  await expect(names).toHaveCount(before + 1);
  // Escape cancels: no checkpoint, and the card goes.
  await page.locator('#ledger .act', { hasText: 'Checkpoint' }).click();
  await expect(card).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);
  await expect(names).toHaveCount(before + 1);
});

test('when the clipboard refuses, the invite shows under its button', async ({ browser }) => {
  const { gm } = await gmTable(browser);
  // R602: the clipboard refusing, as the Claude Desktop browser does.
  await gm.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new DOMException('refused', 'NotAllowedError')); });
  await gm.locator('#bar .invite').click();
  const link = gm.locator('#bar .invitelink');
  await expect(link).toBeVisible();
  await expect(link).toHaveValue(await hook(gm, h => h.invite() as string));
  expect(await link.evaluate(l => document.activeElement === l && (l as HTMLInputElement).selectionStart === 0
    && (l as HTMLInputElement).selectionEnd === (l as HTMLInputElement).value.length)).toBe(true);
  await expect(gm.locator('#bar .invite')).toHaveText('Copy invite');
  // A press elsewhere puts it away; shown again, Escape does.
  await gm.mouse.click(5, 400);
  await expect(link).toHaveCount(0);
  await gm.locator('#bar .invite').click();
  await expect(link).toBeVisible();
  await gm.keyboard.press('Escape');
  await expect(link).toHaveCount(0);
});
