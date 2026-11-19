// CRC: crc-Authority.md | Test: test-Network.md | R150, R167, R172, R185, R193, R297, R358, R378, R360, R361, R379, R377, R392, R393, R388, R394, R390, R395, R396, R397, R398, R399, R408, R410, R427
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

test("an NPC's Info cards reach players only as torn clues", async ({ browser }) => {
  // R396–R400: the GM's Info card on Devreux; Dana has no tab until a clue is torn out; then one tab,
  // and slid out, only that clue; the ANY and unknown clues light with Motivations.
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const card = gm.locator(`.obj.card[data-rid="${DEVREUX}"]`), danaCard = dana.locator(`.obj.card[data-rid="${DEVREUX}"]`);
  const clues = ['ANY: she watches the door', "MOTIVATION: she wants the town quiet", 'WHAT SHE KNOWS ABOUT SAM: he cheats at faro'];
  await hook(gm, new Function('h', `const d = h.store.game.get('${DEVREUX}'); h.store.game.change(w => w.put('${DEVREUX}', { ...d, info: [${JSON.stringify(clues.join('\n'))}] }));`) as (h: any) => void);
  await expect(card.locator('.infotab', { hasText: 'Info' })).toHaveCount(1);
  await expect.poll(async () => (await recOf(dana, DEVREUX)).info?.length, { timeout: 15_000 }).toBe(1);
  await expect(danaCard.locator('.infotab')).toHaveCount(0);

  await card.locator('.infotab', { hasText: 'Info' }).click();
  await card.locator('.eyecat').click();
  await card.locator('.eyemenu button', { hasText: 'Motivations' }).click();
  await expect(card.locator('.infopaper .entry.lit')).toHaveCount(3);
  await card.locator('.infopaper .entry', { hasText: 'MOTIVATION' }).click();
  await card.locator('.eye').click();

  await expect.poll(async () => (await recOf(dana, DEVREUX)).info?.[0], { timeout: 15_000 }).toBe('\nMOTIVATION: she wants the town quiet\n');
  expect(await held(dana)).not.toContain('watches');
  expect(await held(dana)).not.toContain('faro');
  await danaCard.locator('.infotab').click();
  await expect(danaCard.locator('.infopaper .text > div.torn')).toHaveText(['MOTIVATION: she wants the town quiet']);

  // R403, R406: the GM empties the card and it is buried; Dana's Boot Hill shows a "GM card" and her
  // page holds none of its unrevealed words, nor whose it was. (The revealed clue stays in Devreux's
  // `shown`: she has seen it, and it is shown again if the card comes back.)
  await card.locator('.infopaper .text').click();
  await gm.keyboard.press('ControlOrMeta+a');
  await gm.keyboard.press('Backspace');
  await gm.locator('#table').click({ position: { x: 5, y: 5 } });
  await dana.locator('#boothill').click();
  await expect(dana.locator('#graves .items button')).toHaveText(['GM card'], { timeout: 15_000 });
  for (const word of ['watches', 'faro', 'Info card', 'Devreux:']) expect(await held(dana)).not.toContain(word);
});

test('the Connection Table never reaches a player', async ({ browser }) => {
  // R408, R410: Dana's bar has no supply; with the GM's table out, her page holds no Connection Table,
  // and her forged change to it is refused.
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  await expect(dana.locator('#bar .supply.links')).toHaveCount(0);
  const TABLE = 'o:0000000a';
  await hook(gm, new Function('h', `const t = h.store.game.get('${TABLE}'); const { away, ...out } = t; h.store.game.change(w => w.put('${TABLE}', out));`) as (h: any) => void);
  await expect(gm.locator('.obj.connections')).toHaveCount(1);
  // A change Dana can see reaches her after the table's, so by then the table would have too.
  await hook(gm, new Function('h', `const d = h.store.game.get('${DEVREUX}'); h.store.game.change(w => w.put('${DEVREUX}', { ...d, name: 'Devreux the Elder' }));`) as (h: any) => void);
  await expect.poll(async () => (await recOf(dana, DEVREUX)).name, { timeout: 15_000 }).toBe('Devreux the Elder');
  expect(await held(dana)).not.toContain('"connections"');
  expect(await held(dana)).not.toContain('Jephthah');
  await expect(dana.locator('.obj.connections')).toHaveCount(0);
  await hook(dana, h => h.store.game.change((w: any) => w.put('o:0000000a', { kind: 'connections', oid: '0000000a', place: { x: 0, y: 0, z: 0, tilt: 0 }, rows: [], cells: {} })));
  await gm.waitForTimeout(1500);
  expect((await recOf(gm, TABLE)).rows).toHaveLength(8);
});

test('Opinion Records never reach a player', async ({ browser }) => {
  // R427: the GM's record of Sam under Devreux never reaches Dana; her forged one is refused.
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  const RECORD = 'o:00000030';
  await hook(gm, h => h.store.game.change((w: any) => w.put('o:00000030', { kind: 'opinion', oid: '00000030', holder: 'c0000005', of: '00000001', text: 'Old Grudge -Sig' })));
  await hook(gm, new Function('h', `const d = h.store.game.get('${DEVREUX}'); h.store.game.change(w => w.put('${DEVREUX}', { ...d, name: 'Devreux the Elder' }));`) as (h: any) => void);
  await expect.poll(async () => (await recOf(dana, DEVREUX)).name, { timeout: 15_000 }).toBe('Devreux the Elder');
  expect(await held(dana)).not.toContain('"opinion"');
  expect(await held(dana)).not.toContain('Old Grudge');
  await hook(dana, h => h.store.game.change((w: any) => w.put('o:00000031', { kind: 'opinion', oid: '00000031', holder: 'c0000005', of: '00000001', text: 'Forged +Exq' })));
  await gm.waitForTimeout(1500);
  expect(await recOf(gm, 'o:00000031')).toBeUndefined();
  expect((await recOf(gm, RECORD)).text).toBe('Old Grudge -Sig');
});

test('a player rolls a Reaction', async ({ browser }) => {
  // R429-R431: the GM calls Sam's Reaction from Devreux's record; Dana rolls it, both tapes hear it,
  // and the record stays the GM's.
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  await hook(gm, new Function('h', `const s = h.store.game.get('${SAM}'); h.store.game.change(w => w.put('${SAM}', { ...s, owner: 'Dana' }));`) as (h: any) => void);
  const pool = gm.locator(`.obj.pool[data-rid="${DEVREUX}"]`), paper = gm.locator(`.obj.card[data-rid="${DEVREUX}"] .infopaper.opinion`);
  await pool.locator('.makemenu').click();
  await pool.locator('.poolmenu .opinionof', { hasText: 'Sam' }).click();
  await gm.locator('#table').click({ position: { x: 5, y: 300 } });
  await paper.locator('.reactdie').click();
  const row = dana.locator(`.obj.pool[data-rid="${SAM}"] .roller`);
  await expect(row.locator('.rrdie.W')).toHaveCount(1, { timeout: 15_000 });
  await row.locator('.roll').click();
  const outcome = (p: typeof gm) => p.locator('#tape .strip .receipt').first();
  await expect(outcome(dana)).toContainText("Devreux's Reaction: ", { timeout: 15_000 });
  await expect(outcome(gm)).toContainText("Devreux's Reaction: ");
  const said = (await outcome(gm).textContent())!.match(/Reaction: ([+-](?:Min|Sig)|0)/)![1]!;
  await expect(paper.locator('.text')).toContainText(`Reaction ${said}`);
  expect(await held(dana)).not.toContain('"opinion"');
});

test('a player sees a revealed Opinion', async ({ browser }) => {
  // R435-R438: Unton folk's record of Sam, one line revealed, shows under Devreux and Hank on Dana's page,
  // face-down with that line alone.
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  await hook(gm, new Function('h', `
    const g = h.store.game, d = g.get('${DEVREUX}');
    const front = d.front.replace('<head>Mistress Devreux</head>', '<head>Mistress Devreux (Unton folk)</head>');
    const { info: _i, shown: _s, ...base } = d;
    g.change(w => {
      w.put('${DEVREUX}', { ...d, front });
      w.put('o:00000020', { ...base, oid: '00000020', name: 'Hank', front: '<head>Hank (Unton folk)</head>',
        card: { ...d.card, x: 500, y: 650 }, pool: { ...d.pool, x: 500, y: 650 } });
    });`) as (h: any) => void);
  const pool = gm.locator(`.obj.pool[data-rid="${DEVREUX}"]`), card = gm.locator(`.obj.card[data-rid="${DEVREUX}"]`);
  await pool.locator('.makemenu').click();
  await pool.locator('.poolmenu .opinionof', { hasText: 'Sam' }).click();
  const paper = card.locator('.infopaper.opinion');
  await paper.locator('.text').click();
  await gm.keyboard.press('ControlOrMeta+a');
  await gm.keyboard.type('Reputation +Sig\nGrudge -Min');
  await gm.locator('#table').click({ position: { x: 5, y: 300 } });
  await card.locator('.eye').click();
  await paper.locator('.entry', { hasText: 'Grudge -Min' }).click();
  await card.locator('.eye').click();
  // Dana: a tab "Sam" under both members; slid out under Hank, "➔ Sam" and the one torn line.
  const hank = dana.locator('.obj.card[data-rid="o:00000020"]');
  await expect(hank.locator('.infotab.opinion')).toHaveText(['Sam'], { timeout: 15_000 });
  await expect(dana.locator(`.obj.card[data-rid="${DEVREUX}"] .infotab.opinion`)).toHaveText(['Sam']);
  await hank.locator('.infotab.opinion').click();
  const theirs = hank.locator('.infopaper.opinion');
  await expect(theirs.locator('.connhead')).toHaveText('➔ Sam');
  await expect(theirs.locator('.text > .torn')).toHaveText(['Grudge -Min']);
  expect(await held(dana)).not.toContain('Reputation');
});
