// CRC: crc-Tape.md, crc-Drag.md, crc-BootHillView.md, crc-Authority.md, crc-Copy.md, crc-Build.md | Test: test-Network.md | R486, R487, R488, R489
// A torn tape is the page's own: torn, buried, dug up and deleted on that page alone; and torn rolls
// shared by builds before this become the GM's own when the GM's page loads the game.
import { expect, test, type Page } from '@playwright/test';
import { at, barMiddle, dragFromTo, gmTable, hook, join, kinds, openTable, rec } from './page.ts';

const roll = (page: Page) => hook(page, h => h.rolls.roll({ pool: '00000003', action: '', vs: null, defend: 'mental', hand: { yellows: 0, bonus: 0 } }));
const round = (page: Page) => rec(page, 'meta').then(m => m?.round ?? 0);

/** Tears the page's tape off onto open table, pressed where the tape shows. */
async function tear(page: Page) {
  await page.locator('#tape .strip').evaluate(t => Promise.all(t.getAnimations({ subtree: true }).map(a => a.finished)));
  const { x, y } = await page.evaluate(() => {
    const r = document.querySelector('#tape .strip')!.getBoundingClientRect();
    for (let y = r.top + 10; y < r.bottom - 5; y += 6) for (let x = r.left + 10; x < r.right - 10; x += 6) {
      const e = document.elementFromPoint(x, y) as HTMLElement | null;
      if (e?.closest('#tape') && !e.closest('.title, button, .other')) return { x, y };
    }
    throw new Error('the tape is covered');
  });
  const to = await openTable(page);
  await dragFromTo(page, x, y, to.x, to.y);
}

/** The GM's change reached Dana: the Round, stepped on the GM's page, is hers too. */
async function heard(gm: Page, dana: Page) {
  await gm.locator('.register .key.up').click();
  const want = await round(gm);
  await expect.poll(() => round(dana), { timeout: 15_000 }).toBe(want);
}

test('a torn tape and its burial stay on the page that tore it', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  await roll(gm);
  await roll(gm);
  await expect(gm.locator('#tape .strip > *')).toHaveCount(2);
  await expect(dana.locator('#tape .strip > *')).toHaveCount(2, { timeout: 15_000 });

  // R486: each page tears its own tape, and holds only its own torn roll, under t:.
  await tear(gm);
  await tear(dana);
  await heard(gm, dana);
  for (const page of [gm, dana]) {
    const torn = await kinds(page, 'tornroll');
    expect(torn.map(([rid]) => rid.slice(0, 2))).toEqual(['t:']);
  }
  const gmRid = (await kinds(gm, 'tornroll'))[0]![0];

  // R488: buried, the GM's is listed and counted on the GM's Boot Hill alone.
  const t = await at(gm, `[data-rid="${gmRid}"]`, 20, 20), mid = await barMiddle(gm);
  await dragFromTo(gm, t.x, t.y, mid.x, mid.y);
  expect(await kinds(gm, 'tornroll')).toHaveLength(0);
  await expect(gm.locator('#boothill .n')).toHaveText('1');
  await gm.locator('#boothill').click();
  await expect(gm.locator('#graves .items button')).toHaveText([/^Tape: 2 rolls/]);
  await heard(gm, dana);
  await expect(dana.locator('#boothill .n')).toHaveText('');
  expect(JSON.stringify(await rec(dana, 'yards') ?? {})).not.toContain('Tape:');
  expect(await rec(dana, 'hill')).toBeUndefined();

  // Dug up, it is the GM's torn roll again; buried again, emptying the graveyard deletes it (R489).
  await gm.locator('#boothill').click();   // the press on the register closed the list
  const b = await at(gm, '#graves .items button', 20, 8), to = await openTable(gm);
  await dragFromTo(gm, b.x, b.y, to.x, to.y);
  const back = await kinds(gm, 'tornroll');
  expect(back.map(([rid]) => rid)).toEqual([gmRid]);
  expect((await rec(gm, 'hill')).hill).toHaveLength(0);
  const t2 = await at(gm, `[data-rid="${gmRid}"]`, 20, 20);
  await dragFromTo(gm, t2.x, t2.y, mid.x, mid.y);
  await gm.locator('#boothill').click();
  await gm.locator('#graves .yname').click({ modifiers: ['Shift'] });
  await gm.locator('#graves .yname').click({ modifiers: ['Shift'] });
  await expect(gm.locator('#graves .items')).toHaveText('Nothing is buried here.');
  expect((await rec(gm, 'hill')).hill).toHaveLength(0);
});

test("torn rolls shared before leave the players' pages", async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  // As builds before this did: a torn roll on the table under o:, and a tape buried in the shared Boot Hill.
  await hook(gm, h => {
    const receipt = (title: string) => ({ id: title, at: 1, title, dice: [], resolution: '', level: '', outcome: '' });
    const roll = (oid: string, title: string) => ({ kind: 'tornroll', oid, place: { x: 300, y: 300, z: 1, tilt: 0 }, receipts: [receipt(title)] });
    const y = h.store.game.get('yards');
    h.store.game.change((w: any) => {
      w.put('o:0000a0f1', roll('0000a0f1', 'Devreux, old roll'));
      w.put('yards', { yards: y.yards.map((g: any, i: number) => i ? g : { ...g, items: [...g.items, { name: 'Tape: 1 rolls, last old', records: [roll('0000a0f2', 'Devreux, old buried')] }] }) });
    });
  });
  await expect.poll(async () => (await kinds(dana, 'tornroll')).map(([rid]) => rid), { timeout: 15_000 }).toEqual(['o:0000a0f1']);
  await expect.poll(async () => JSON.stringify(await rec(dana, 'yards')), { timeout: 15_000 }).toContain('Devreux, old buried');

  // R487: the GM's page loads the game again, and opens the table.
  await hook(gm, h => h.store.save());
  await gm.reload();
  await gm.locator('#bar .invite').click();
  await expect.poll(async () => (await kinds(dana, 'tornroll')).length, { timeout: 20_000 }).toBe(0);
  await expect.poll(async () => JSON.stringify(await rec(dana, 'yards')), { timeout: 15_000 }).not.toContain('Devreux, old buried');
  expect((await kinds(gm, 'tornroll')).map(([rid]) => rid)).toEqual(['t:0000a0f1']);
  expect(JSON.stringify(await rec(gm, 'hill'))).toContain('Devreux, old buried');
  expect(JSON.stringify(await rec(gm, 'yards'))).not.toContain('Devreux, old buried');
});
