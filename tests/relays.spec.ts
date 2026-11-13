// CRC: crc-Wire.md | Test: test-Network.md | R156, R160, R297
// The one spec that meets through the public relays (opt-in: HOLLOW_PUBLIC=1, npm run spec:public),
// so the relay list in use still introduces pages.
import { expect, test } from '@playwright/test';
import { gmTable, join } from './page.ts';

test.skip(!process.env.HOLLOW_PUBLIC, 'meets through the public relays: run with HOLLOW_PUBLIC=1');

test('pages meet through the public relays', async ({ browser }) => {
  test.setTimeout(120_000);
  const { gm, invite } = await gmTable(browser, true);
  const dana = await join(browser, invite, 'Dana', gm, true);
  await expect(gm.locator('#bar .folks .tag', { hasText: 'Dana' })).toHaveClass(/\blive\b/, { timeout: 30_000 });
  await expect(dana.locator('#bar .folks .tag.gm')).toHaveClass(/\blive\b/);
});
