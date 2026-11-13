// CRC: crc-Authority.md | Test: test-Network.md | R150, R167, R172, R185, R193, R297
// Eve sits at the table owning nothing: no secret word reaches her page in the clear, though she
// hears the sealed boxes meant for others. Dana sees what she owns, and nothing more.
import { expect, test, type Page } from '@playwright/test';
import { gmTable, hook, join } from './page.ts';

const SAM = 'o:00000001', DEVREUX = 'o:00000003', PEACE = 'o:00000004';
/** Words on the GM's and Player 1's sheets and in Devreux's drawer: no one else may read them. */
const SECRETS = ['Saloon Gossip', 'Keep the Peace', 'Self-Preservation', 'Old Sympathy', "Dead Man's Die", 'Glimmersense', 'Private Investigator'];
const leaks = (text: string) => SECRETS.filter(w => text.includes(w) || text.includes(JSON.stringify(w).slice(1, -1)));

const held = (page: Page) => hook(page, h => JSON.stringify(h.store.game.all()));
const recOf = (page: Page, rid: string) => page.evaluate(async rid => (await (window as any).hollow.ready).store.game.get(rid), rid);

test('secrets', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const eve = await join(browser, invite, 'Eve', gm);
  // From here on, everything Eve's page hears is kept.
  await hook(eve, h => { (window as any).heard = []; for (const k of ['recs', 'edit', 'roll', 'refuse', 'claim']) h.wire.on(k, (b: unknown) => { (window as any).heard.push(JSON.stringify(b)); }); });

  // Dana and Eve hold Devreux's sheet and drawer redacted.
  expect(leaks(await held(dana))).toEqual([]);
  expect(leaks(await held(eve))).toEqual([]);

  // Sam's sheet reaches Dana when he is given to her, and blanks when taken back (R193).
  const owner = (who: string) => hook(gm, new Function('h', `const s = h.store.game.get('${SAM}'); h.store.game.change(w => w.put('${SAM}', { ...s, owner: '${who}' }));`) as (h: any) => void);
  await owner('Dana');
  await expect.poll(async () => (await recOf(dana, SAM)).front, { timeout: 15_000 }).toContain('Glimmersense');
  await owner('Player 1');
  await expect.poll(async () => (await recOf(dana, SAM)).front, { timeout: 15_000 }).not.toContain('Glimmersense');

  // Dana's rename of Devreux's Influence card is refused: the GM's keeps its name.
  await hook(dana, h => { const k = h.store.game.get('o:00000004'); h.store.game.change((w: any) => w.put('o:00000004', { ...k, name: 'Mine now' })); });
  await gm.waitForTimeout(1500);
  expect((await recOf(gm, PEACE)).name).toBe('Keep the Peace');
  await expect.poll(async () => (await recOf(dana, PEACE)).name, { timeout: 15_000 }).not.toBe('Mine now');

  // Devreux put away: buried, and redacted in Dana's Boot Hill.
  const name = gm.locator(`.pool[data-rid="${DEVREUX}"] .name`), bar = (await gm.locator('#bar').boundingBox())!;
  const b = (await name.boundingBox())!;
  await gm.mouse.move(b.x + 6, b.y + 6);
  await gm.mouse.down();
  await gm.mouse.move(bar.x + 400, bar.y + 30, { steps: 10 });
  await gm.mouse.up();
  await expect.poll(async () => JSON.stringify(await recOf(dana, 'yards')), { timeout: 15_000 }).toContain('Devreux');
  expect(leaks(JSON.stringify(await recOf(dana, 'yards')))).toEqual([]);

  // Nothing Eve heard, or holds, has a secret in the clear; she did hear boxes sealed to others.
  const heard: string[] = await eve.evaluate(() => (window as any).heard);
  expect(heard.length).toBeGreaterThan(0);
  expect(heard.flatMap(leaks)).toEqual([]);
  expect(leaks(await held(eve))).toEqual([]);
  expect(heard.some(m => { const s = JSON.parse(m).sealed; return s && Object.keys(s).some(tab => tab !== 'eve'); })).toBe(true);
});
