// CRC: crc-ImageExchange.md | Test: test-Network.md | R26, R194, R195, R287, R297
// Images go page to page by their hash: added on one page, every page at the table gets the bytes;
// one nobody at the table has shows missing, and says why.
import { expect, test, type Page } from '@playwright/test';
import { gmTable, hook, join } from './page.ts';

const NOBODY = 'Nobody at the table has sent this image yet (the page that has it may be closed); trying again';

/** A small PNG of one colour, drawn by the page. */
const png = (page: Page, colour: string) => page.evaluate(async colour => {
  const c = document.createElement('canvas');
  c.width = 24; c.height = 16;
  const g = c.getContext('2d')!;
  g.fillStyle = colour; g.fillRect(0, 0, 24, 16);
  return c.toDataURL('image/png').split(',')[1]!;
}, colour).then(b64 => ({ name: `${colour}.png`, mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') }));

/** The image supply's file picker, given a file. */
async function addImage(page: Page, colour: string) {
  await page.locator('#bar input[type=file]').first().setInputFiles(await png(page, colour));
}

const hashes = (page: Page) => hook(page, h => h.store.game.all().filter(([, r]: [string, any]) => r.kind === 'image').map(([, r]: [string, any]) => r.blob).sort());
const has = (page: Page, hash: string) => page.evaluate(async hash => !!(await (await (window as any).hollow.ready).blobs.get(hash)), hash);

test('images', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);

  // The GM adds one: Dana's page fetches it by its hash and keeps it.
  await addImage(gm, 'red');
  await expect.poll(() => hashes(gm)).toHaveLength(1);
  const [red] = await hashes(gm);
  await expect.poll(() => has(dana, red!), { timeout: 20_000 }).toBe(true);
  // ...and draws it (R195): the piece is no longer fetching.
  await expect(dana.locator(`[data-blob="${red}"] img`)).toHaveAttribute('src', /^blob:/, { timeout: 10_000 });

  // Dana adds one: the GM's page has it.
  await addImage(dana, 'blue');
  await expect.poll(() => hashes(gm), { timeout: 15_000 }).toHaveLength(2);
  const blue = (await hashes(gm) as string[]).find(h => h !== red)!;
  await expect.poll(() => has(gm, blue), { timeout: 20_000 }).toBe(true);

  // Ann joins later and gets both.
  const ann = await join(browser, invite, 'Ann', gm);
  await expect.poll(async () => [await has(ann, red!), await has(ann, blue)], { timeout: 20_000 }).toEqual([true, true]);

  // An image nobody at the table has: shown missing, saying why.
  const nobody = 'ab'.repeat(32);
  await gm.evaluate(async blob => {
    const g = (await (window as any).hollow.ready).store.game;
    g.change((w: any) => w.put('o:0000ab0e', { kind: 'image', oid: '0000ab0e', place: { x: 200, y: 400, z: 5, tilt: 0 }, blob, w: 24, h: 16 }));
  }, nobody);
  const missing = dana.locator('[data-rid="o:0000ab0e"]');
  await expect(missing).toHaveClass(/\bmissing\b/, { timeout: 30_000 });
  await expect(missing).toHaveAttribute('title', NOBODY);
});
