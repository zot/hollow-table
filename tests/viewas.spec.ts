// CRC: crc-Folks.md, crc-PieceView.md, crc-TableView.md | Test: test-Network.md | R153, R599, R600, R603
// "You are" on the GM's page: switching redraws the table as the person chosen without leaving it, and
// leaves nothing of the views before acting.
import { expect, test, type Page } from '@playwright/test';
import { gmTable, hook, join, open, person } from './page.ts';

const viewAs = async (page: Page, name: string) => {
  for (let i = 0; i < 8 && await page.locator('.tag.viewas').textContent() !== name; i++) await page.locator('.tag.viewas').click();
  await expect(page.locator('.tag.viewas')).toHaveText(name);
};

test('"You are" switches without leaving the table', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  // Dana's page counts every moment it doesn't see the GM at the table.
  await dana.evaluate(() => {
    const w = window as unknown as { gmGone: number; hollow: { ready: Promise<{ presence: { people: Map<string, { role: string }> } }> } };
    w.gmGone = 0;
    void w.hollow.ready.then(h => setInterval(() => { if (![...h.presence.people.values()].some(p => p.role === 'gm')) w.gmGone++; }, 50));
  });
  await gm.evaluate(async () => {
    const w = window as unknown as { kept: unknown; hollow: { ready: Promise<{ table: { wire: unknown } }> } };
    w.kept = (await w.hollow.ready).table.wire;
  });
  const sameWire = () => gm.evaluate(async () => {
    const w = window as unknown as { kept?: unknown; hollow: { ready: Promise<{ table: { wire: unknown } }> } };
    return w.kept !== undefined && w.kept === (await w.hollow.ready).table.wire;
  });
  const listening = () => hook(gm, h => h.store.game.listening as number);
  const before = await listening();
  await expect(gm.locator('#bar .hole')).toHaveCount(7);

  // R599: as Dana, the GM's page draws her desk (no Connection Table pigeonhole), on the same page and
  // the same connection.
  await viewAs(gm, 'Dana');
  await expect(gm.locator('#bar .hole')).toHaveCount(6);
  expect(await sameWire()).toBe(true);
  // R600: back as the GM, the GM's desk again, and as many hear the game's changes as before.
  await viewAs(gm, 'GM');
  await expect(gm.locator('#bar .hole')).toHaveCount(7);
  expect(await sameWire()).toBe(true);
  expect(await listening()).toBe(before);
  expect(await gm.locator('#bar').count()).toBe(1);
  // R599: Dana's page never saw the GM go.
  await gm.waitForTimeout(500);
  expect(await dana.evaluate(() => (window as unknown as { gmGone: number }).gmGone)).toBe(0);
});

test('viewing as a player shows the table as it reaches them', async ({ browser }) => {
  const gm = await person(browser, 'GM');
  await open(gm);
  // Devreux's row holds a record of Sam with one line revealed, published on Devreux's card, and one of
  // Beauford revealed to no one; the Connection Table is out, and a note is the GM's alone.
  await hook(gm, h => {
    const g = h.store.game, t = g.get('o:0000000a'), row = t.rows.find((r: any) => r.oid === '00000003').id;
    g.change((w: any) => {
      const { away: _away, ...out } = t;
      w.put('o:0000000a', { ...out, place: { ...t.place, x: 1500, y: 200 } });
      w.put('o:0000f001', { kind: 'opinion', oid: '0000f001', holder: row, of: '00000001', text: 'Reputation +Sig\nGrudge -Min',
        shown: ['Grudge -Min'], on: ['00000003'], name: 'Sam' });
      w.put('o:0000f002', { kind: 'opinion', oid: '0000f002', holder: row, of: '00000002', text: 'Old Debt -Maj' });
      w.put('o:0000f003', { kind: 'sticky', oid: '0000f003', place: { x: 1500, y: 600, z: 40, tilt: 0 }, text: 'only the GM', by: 'GM', to: [] });
      // On Boot Hill: a note anyone reads, and one the GM's alone.
      const y = g.get('yards') ?? { yards: [{ name: 'Boot Hill', named: false, items: [] }] }, note = (oid: string, text: string, to?: string[]) =>
        ({ name: text, records: [{ kind: 'sticky', oid, place: { x: 0, y: 0, z: 1, tilt: 0 }, text, by: 'GM', ...(to && { to }) }] });
      w.put('yards', { yards: [{ ...y.yards[0], items: [...y.yards[0].items, note('0000f004', 'buried for all'), note('0000f005', 'buried for the GM', [])] }, ...y.yards.slice(1)] });
    });
  });
  const card = gm.locator('.obj.card[data-rid="o:00000003"]'), tabs = card.locator('.infotab.opinion');
  // The GM: both records, the table and the note.
  await expect(tabs).toHaveCount(2);
  await expect(gm.locator('.obj[data-rid="o:0000000a"]')).toHaveCount(1);
  await expect(gm.locator('.obj[data-rid="o:0000f003"]')).toHaveCount(1);
  await gm.locator('#boothill').click();
  const graves = gm.locator('#graves .items button');
  await expect(graves.filter({ hasText: /^buried for/ })).toHaveText(['buried for all', 'buried for the GM']);
  // R603: as Player 1, the record revealed alone, its revealed line alone; no table, no note.
  await viewAs(gm, 'Player 1');
  await expect(tabs).toHaveText(['Sam']);
  await tabs.click();
  const paper = card.locator('.infopaper.opinion');
  await expect(paper.locator('.text > .torn')).toHaveText(['Grudge -Min']);
  await expect(paper).not.toContainText('Reputation');
  await expect(gm.locator('.obj[data-rid="o:0000000a"]')).toHaveCount(0);
  await expect(gm.locator('.obj[data-rid="o:0000f003"]')).toHaveCount(0);
  // R603: Boot Hill lists only the burial they would see.
  if (!(await gm.locator('#graves').isVisible())) await gm.locator('#boothill').click();
  await expect(graves.filter({ hasText: /^buried for/ })).toHaveText(['buried for all']);
  // Back as the GM, all of it again.
  await viewAs(gm, 'GM');
  await expect(tabs).toHaveCount(2);
  await expect(gm.locator('.obj[data-rid="o:0000000a"]')).toHaveCount(1);
  await expect(gm.locator('.obj[data-rid="o:0000f003"]')).toHaveCount(1);
});

