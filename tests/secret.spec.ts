// CRC: crc-Authority.md | Test: test-Network.md | R150, R167, R172, R185, R193, R297, R358, R378, R360, R361, R379, R377, R392, R393, R388, R394, R390
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

test('two mats: a pool hidden from you shows only what others put in it', async ({ browser }) => {
  test.setTimeout(120_000);
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const eve = await join(browser, invite, 'Eve', gm);
  const C = 'o:000000c1', has = async (page: Page) => !!(await recOf(page, C));
  const put = (page: Page, rec: object) => hook(page, new Function('h', `h.store.game.change(w => w.put('${C}', ${JSON.stringify(rec)}))`) as (h: any) => void);
  const onTable = { kind: 'chip', oid: '000000c1', where: { table: { x: 600, y: 600, z: 1, tilt: 0 } }, n: 0, sign: -1, points: 2, rider: false };
  const inPool = (oid: string, by: string) => ({ ...onTable, where: { slot: oid, name: 'main' }, by });
  // R361: on the table everyone has it; the GM moves it into Devreux's Main and it leaves the players' pages.
  await put(gm, onTable);
  await expect.poll(() => has(dana), { timeout: 15_000 }).toBe(true);
  await put(gm, inPool('00000003', 'GM'));
  await expect.poll(() => has(dana), { timeout: 15_000 }).toBe(false);
  await expect.poll(() => has(eve), { timeout: 15_000 }).toBe(false);
  // Back on the table it comes back.
  await put(gm, onTable);
  await expect.poll(() => has(eve), { timeout: 15_000 }).toBe(true);
  // R358, R360: Dana's contribution to Devreux is public, hers by name.
  await put(dana, inPool('00000003', 'Dana'));
  await expect.poll(async () => (await recOf(gm, C))?.by, { timeout: 15_000 }).toBe('Dana');
  await expect.poll(async () => (await recOf(eve, C))?.by, { timeout: 15_000 }).toBe('Dana');
  // R378: Sam given to Dana, her own chip on him is private: it stays on her page, sealed over the
  // public removal, and leaves Eve's; a reload's catch-up brings it back to her only.
  await hook(gm, new Function('h', `const s = h.store.game.get('${SAM}'); h.store.game.change(w => w.put('${SAM}', { ...s, owner: 'Dana' }));`) as (h: any) => void);
  await expect.poll(async () => (await recOf(dana, SAM)).owner, { timeout: 15_000 }).toBe('Dana');
  await put(dana, inPool('00000001', 'Dana'));
  await expect.poll(async () => (await recOf(gm, C))?.where?.slot, { timeout: 15_000 }).toBe('00000001');
  await expect.poll(() => has(eve), { timeout: 15_000 }).toBe(false);
  await gm.waitForTimeout(1000);
  expect(await has(dana)).toBe(true);
  await dana.reload();
  await expect.poll(() => has(dana), { timeout: 15_000 }).toBe(true);
  await eve.reload();
  await gm.waitForTimeout(2000);
  expect(await has(eve)).toBe(false);
});

test("a hidden pool's contributions are never piled for players", async ({ browser }) => {
  // R379: Dana's three −2s in Devreux's Main: piled on the GM's page, as put on hers.
  test.setTimeout(120_000);
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  for (const oid of ['000000d1', '000000d2', '000000d3']) {
    await hook(dana, new Function('h', `h.store.game.change(w => w.put('o:${oid}', { kind: 'chip', oid: '${oid}', where: { slot: '00000003', name: 'main' }, n: 0, sign: -1, points: 2, rider: false, by: 'Dana' }))`) as (h: any) => void);
  }
  const main = (page: Page) => page.locator(`.obj.pool[data-rid="${DEVREUX}"] .slot-main`);
  await expect(main(gm).locator('.pile .disc')).toHaveText('−4', { timeout: 15_000 });
  await expect(main(dana).locator('.chip')).toHaveText(['−2', '−2', '−2'], { timeout: 15_000 });
  await expect(main(dana).locator('.pile')).toHaveCount(0);
});

test('Stagger is seen, and piled, by everyone', async ({ browser }) => {
  // R377: the GM's three −2s on Devreux's Stagger reach Dana as the GM sees them, a −4 pile; one in
  // his Main doesn't reach her at all.
  test.setTimeout(120_000);
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  for (const [oid, slot] of [['000000e1', 'stagger'], ['000000e2', 'stagger'], ['000000e3', 'stagger'], ['000000e4', 'main']]) {
    await hook(gm, new Function('h', `h.store.game.change(w => w.put('o:${oid}', { kind: 'chip', oid: '${oid}', where: { slot: '00000003', name: '${slot}' }, n: 0, sign: -1, points: 2, rider: false, by: 'GM' }))`) as (h: any) => void);
  }
  const pool = (page: Page) => page.locator(`.obj.pool[data-rid="${DEVREUX}"]`);
  await expect(pool(dana).locator('.slot-stagger .pile .disc')).toHaveText('−4', { timeout: 15_000 });
  await expect(pool(dana).locator('.slot-main .chip')).toHaveCount(0);
});

test("the GM's eye tears an NPC's entries out for the table", async ({ browser }) => {
  // R388, R390, R392–R394: entries torn out with the eye open reach no one until it shuts; then Dana's
  // page holds only them, each line as its label and its revealed entries; one mended leaves her page.
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const card = gm.locator(`.obj.card[data-rid="${DEVREUX}"]`), danaCard = dana.locator(`.obj.card[data-rid="${DEVREUX}"]`);
  const entry = (t: string) => card.locator('.front .entry', { hasText: t });
  const front = async () => (await recOf(dana, DEVREUX)).front as string;
  const others = (text: string) => leaks(text).filter(w => w !== 'Keep the Peace' && w !== "Dead Man's Die");

  await card.locator('.eyecat').click();
  await card.locator('.eyemenu button', { hasText: 'Motivations' }).click();
  await expect(card).toHaveClass(/inferring/);
  await expect(card.locator('.front .entry.lit')).toHaveCount(3);
  await entry('Keep the Peace').click();
  await expect(card.locator('.front .entry.lit')).toHaveCount(2);
  await entry('Savvy').click();
  await entry('Streetwise').click();
  await expect(card.locator('.front .label.torn')).toHaveText(['Skills 3:']);
  await card.locator('.eyecat').click();
  await card.locator('.eyemenu button', { hasText: 'Items' }).click();
  await expect(card.locator('.front .entry.lit')).toHaveText(["Dead Man's Die", '(Free Token, 9 uses)']);
  await entry("Dead Man's Die").click();
  // R388: no roll while the eye is open.
  await gm.locator(`.obj.pool[data-rid="${SAM}"] .die-own`).click();
  await expect(gm.locator('.roller .roll')).toBeDisabled();
  await gm.waitForTimeout(1500);
  expect(await front()).not.toContain('Savvy');

  await card.locator('.eye').click();
  await expect(gm.locator('.roller .roll')).toBeEnabled();
  await expect.poll(front, { timeout: 15_000 }).toContain('Savvy');
  const held_ = await held(dana);
  expect(others(held_)).toEqual([]);
  for (const w of ['Profession', 'Free Token']) expect(held_).not.toContain(w);
  await expect(danaCard.locator('.front .text > div.torn')).toHaveText(
    ['Devreux', 'Skills 3: Savvy, Streetwise', 'Keep the Peace +Sig (0)', 'Items', "Dead Man's Die"]);

  // Taken back: the players roleplay their ignorance.
  await card.locator('.eye').click();
  await entry('Savvy').click();
  await card.locator('.eye').click();
  await expect.poll(front, { timeout: 15_000 }).not.toContain('Savvy');
  await expect(danaCard.locator('.front .text > div.torn').nth(1)).toHaveText('Skills 3: Streetwise');
});
