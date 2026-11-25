// CRC: crc-Drag.md, crc-TableView.md, crc-PieceView.md, crc-Dockets.md | Test: test-Dockets.md | R591, R530, R531, R532, R535, R536, R538, R539, R541, R542, R543, R544, R545, R584, R585, R586, R587, R588, R589, R596, R534
// Dockets: a label from the desk, the paper in its red tape pinned to it, moved within and taken out,
// carried by its label, tied up, filed and brought back; across pages, paper the carrier can't read.
import { expect, test, type Page } from '@playwright/test';
import { barMiddle, dragFromTo, fromDesk, gmTable, hook, join, kinds, open, rec } from './page.ts';

const box = async (page: Page, sel: string) => (await page.locator(sel).boundingBox())!;
const middle = async (page: Page, sel: string) => { const b = await box(page, sel); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
/** A press on a docket's label clear of its knot, name and corner. */
const grip = async (page: Page, rid: string) => { const b = await box(page, `[data-rid="${rid}"]`); return { x: b.x + b.width - 9, y: b.y + b.height - 7 }; };
const pinOf = async (page: Page, rid: string) => (await rec(page, rid))?.pin;
const newest = async (page: Page, kind: string) => `o:${(await kinds(page, kind)).at(-1)![1].oid}`;

/** The GM's table with nothing on it. */
async function clear(gm: Page): Promise<void> {
  await hook(gm, h => h.store.game.change((w: any) => { for (const [rid] of h.store.game.all()) if (rid.startsWith('o:')) w.del(rid); }));
}

test('a docket: made, filled, moved within, taken out, tied and filed', async ({ page }) => {
  await open(page);
  await clear(page);
  // R532: from its pigeonhole, named by typing at once.
  await fromDesk(page, 'docket', 420, 300);
  await expect.poll(() => kinds(page, 'docket').then(d => d.length)).toBe(1);
  const D = await newest(page, 'docket'), oid = D.slice(2);
  await page.keyboard.type('Clues');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await rec(page, D)).name).toBe('Clues');
  await expect(page.locator('.tapes path')).toHaveCount(1);

  // R536: a sticky let go overlapping the label joins; one let go far off doesn't.
  const lb = await box(page, `[data-rid="${D}"]`);
  await fromDesk(page, 'sticky', lb.x + 80, lb.y + lb.height + 55);
  const A = await newest(page, 'sticky');
  await expect.poll(() => pinOf(page, A).then(p => p?.card)).toBe(oid);
  await fromDesk(page, 'sticky', 1150, 650);
  const far = await newest(page, 'sticky');
  expect(await pinOf(page, far)).toBeUndefined();

  // R539: dragged within the tape it stays in, at its new place; dragged clear it comes off.
  const was = (await pinOf(page, A)).dx, a = await middle(page, `[data-rid="${A}"] .text`);
  await dragFromTo(page, a.x, a.y, a.x + 40, a.y + 10);
  await expect.poll(() => pinOf(page, A).then(p => p?.dx)).toBeGreaterThan(was);
  expect((await pinOf(page, A)).card).toBe(oid);
  const a2 = await middle(page, `[data-rid="${A}"] .text`);
  await dragFromTo(page, a2.x, a2.y, a2.x + 500, a2.y + 200);
  await expect.poll(() => pinOf(page, A)).toBeUndefined();
  // ...and let go touching the tape again, it joins again.
  const a3 = await middle(page, `[data-rid="${A}"] .text`), l2 = await box(page, `[data-rid="${D}"]`);
  await dragFromTo(page, a3.x, a3.y, l2.x + 80, l2.y + l2.height + 55);
  await expect.poll(() => pinOf(page, A).then(p => p?.card)).toBe(oid);

  // R541: carried by its label, its paper comes along, where it lay from the label.
  const before = { d: (await rec(page, D)).place, a: (await rec(page, A)).place };
  const g = await grip(page, D);
  await dragFromTo(page, g.x, g.y, g.x + 60, g.y + 40);
  await expect.poll(async () => (await rec(page, D)).place.x).not.toBe(before.d.x);
  const after = { d: (await rec(page, D)).place, a: (await rec(page, A)).place };
  expect([after.a.x - after.d.x, after.a.y - after.d.y]).toEqual([before.a.x - before.d.x, before.a.y - before.d.y]);

  // R542, R543: the knot ties it: the paper piles under the label; a press on the pile carries the docket.
  await page.locator(`[data-rid="${D}"] .knot`).click();
  await expect(page.locator('.obj.piled')).toHaveCount(1);
  await expect(page.locator('.bow')).toHaveCount(1);
  await expect(page.locator(`[data-rid="${D}"]`)).toHaveClass(/\btied\b/);
  const pinned = await pinOf(page, A), p = await middle(page, `[data-rid="${A}"]`);
  await dragFromTo(page, p.x, p.y, p.x - 50, p.y + 30);
  await expect.poll(async () => (await rec(page, D)).place.x).toBeLessThan(after.d.x);
  expect(await pinOf(page, A)).toEqual(pinned);
  expect(await rec(page, 'tied')).toEqual({ tied: [oid] });
  await page.locator(`[data-rid="${D}"] .knot`).click();
  await expect(page.locator('.obj.piled')).toHaveCount(0);

  // R544: filed, it goes with its paper, named "Docket: Clues"; taken out, they come back as they lay.
  const offset = { dx: pinned.dx, dy: pinned.dy };
  const g2 = await grip(page, D), desk = await middle(page, '#bar .desk');
  await dragFromTo(page, g2.x, g2.y, desk.x, desk.y);
  await expect.poll(() => rec(page, D)).toBeUndefined();
  expect(await rec(page, A)).toBeUndefined();
  expect((await rec(page, 'desk')).desks[0].items.map((e: any) => [e.name, e.records.length])).toEqual([['Docket: Clues', 2]]);
  await page.mouse.click(desk.x, desk.y);
  await page.locator('#bar .drawerfront[data-drawer="papers"]').click();
  await expect(page.locator('#bar .filed button')).toHaveText(['Docket: Clues']);
  const entry = await middle(page, '#bar .filed button');
  await dragFromTo(page, entry.x, entry.y, 500, 450);
  await expect.poll(() => rec(page, D).then(r => !!r)).toBe(true);
  expect(await pinOf(page, A)).toMatchObject({ card: oid, ...offset });
  const back = { d: (await rec(page, D)).place, a: (await rec(page, A)).place };
  expect([back.a.x - back.d.x, back.a.y - back.d.y]).toEqual([offset.dx, offset.dy]);
});

test('a card is more specific than a docket', async ({ page }) => {
  await open(page);
  // R538: Sam's card under a docket's label: a sticky let go on the card, touching the tape, pins to the card.
  const SAM = '00000001', card = (await rec(page, `o:${SAM}`)).card;
  await hook(page, h => h.store.game.change((w: any) => {
    const c = h.store.game.get('o:00000001').card;
    w.put('o:dd000001', { kind: 'docket', oid: 'dd000001', place: { x: c.x + 20, y: c.y + 20, z: c.z + 5, tilt: 0 }, name: 'On Sam' });
  }));
  expect(card).toBeTruthy();
  const lb = await box(page, '[data-rid="o:dd000001"]');
  await fromDesk(page, 'sticky', lb.x + 60, lb.y + lb.height + 50);
  const S = await newest(page, 'sticky');
  await expect.poll(() => pinOf(page, S).then(p => p?.card)).toBe(SAM);
});

test("across pages: a note the carrier can't read follows the docket, and stays when it's buried", async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  await clear(gm);
  // The GM's docket holds a public note and one the GM keeps to the GM alone.
  await hook(gm, h => h.store.game.change((w: any) => {
    const P = (x: number, y: number, z: number) => ({ x, y, z, tilt: 0 });
    w.put('o:dd000001', { kind: 'docket', oid: 'dd000001', place: P(300, 200, 10), name: 'Clues', by: 'GM' });
    w.put('o:aa000001', { kind: 'sticky', oid: 'aa000001', place: P(280, 260, 11), text: 'public', pin: { card: 'dd000001', dx: -20, dy: 60 } });
    w.put('o:aa000002', { kind: 'sticky', oid: 'aa000002', place: P(540, 240, 12), text: 'secret', by: 'GM', to: [], pin: { card: 'dd000001', dx: 240, dy: 40 } });
  }));
  const sam = await join(browser, invite, 'Sam', gm);
  // R535: Sam's page has the docket and the public note, and its tape, but nothing of the secret.
  await expect(sam.locator('[data-rid="o:aa000001"]')).toBeVisible();
  expect(await rec(sam, 'o:aa000002')).toBeUndefined();
  await expect(sam.locator('.tapes path')).toHaveCount(1);
  // R541, R531: Sam carries it by its label; on the GM's page the secret note follows.
  const g = await grip(sam, 'o:dd000001');
  await dragFromTo(sam, g.x, g.y, g.x + 150, g.y + 90);
  await expect.poll(async () => (await rec(gm, 'o:dd000001')).place.x, { timeout: 15_000 }).toBeGreaterThan(300);
  const d = (await rec(gm, 'o:dd000001')).place;
  await expect.poll(async () => { const s = (await rec(gm, 'o:aa000002')).place; return [s.x - d.x, s.y - d.y]; }, { timeout: 15_000 }).toEqual([240, 40]);
  // R544, R545: Sam buries it; the public note goes with it, the secret stays on the table, loose where it lay.
  const lay = (await rec(gm, 'o:aa000002')).place, g2 = await grip(sam, 'o:dd000001'), bar = await barMiddle(sam);
  await dragFromTo(sam, g2.x, g2.y, bar.x, bar.y);
  await expect.poll(() => rec(gm, 'o:dd000001'), { timeout: 15_000 }).toBeUndefined();
  expect(await rec(gm, 'o:aa000001')).toBeUndefined();
  await expect.poll(() => pinOf(gm, 'o:aa000002'), { timeout: 15_000 }).toBeUndefined();
  expect((await rec(gm, 'o:aa000002')).place).toMatchObject({ x: lay.x, y: lay.y });
});

const P = (x: number, y: number, z = 5) => ({ x, y, z, tilt: 0 });
/** Clears the GM's table and puts these pieces: a character is the table's first, copied with what's given. */
async function seed(gm: Page, pieces: Record<string, unknown>[]): Promise<void> {
  await gm.evaluate(async ps => {
    const g = (await (window as any).hollow.ready).store.game;
    const { shown: _s, info: _i, pin: _p, ...tpl } = g.all().map(([, r]: any) => r).find((r: any) => r.kind === 'character');
    g.change((w: any) => {
      for (const [rid] of g.all()) if (rid.startsWith('o:')) w.del(rid);
      for (const p of ps) w.put(`o:${p.oid}`, p.kind === 'character' ? { ...tpl, gathered: false, ...p } : p);
    });
  }, pieces);
}
/** An element's box once it has stopped moving (a drop's glide done). */
async function settled(page: Page, sel: string) {
  let last = '';
  await expect.poll(async () => { const b = JSON.stringify(await box(page, sel)), same = b === last; last = b; return same; }, { intervals: [100] }).toBe(true);
  return box(page, sel);
}
const cardOf = (rid: string) => `.obj.card[data-rid="${rid}"]`, poolOf = (rid: string) => `.obj.pool[data-rid="${rid}"]`;

test('characters in a docket: in by the card, out by the pool, carried whole, tied, buried with it', async ({ page }) => {
  await open(page);
  const D = 'o:dd000001', C = 'o:cc000001';
  await seed(page, [
    { kind: 'docket', oid: 'dd000001', place: P(300, 120, 10), name: 'NPCs', by: 'GM' },
    { kind: 'character', oid: 'cc000001', owner: 'GM', name: 'Gant', card: P(300, 480), pool: P(800, 430) },
  ]);
  await expect(page.locator(cardOf(C))).toBeVisible();

  // R584: the card let go just under the label puts the character in.
  const lb = await box(page, `[data-rid="${D}"]`), cb = await box(page, cardOf(C));
  await dragFromTo(page, cb.x + 6, cb.y + 6, lb.x + 6, lb.y + lb.height + 4);
  await expect.poll(() => pinOf(page, C).then(p => p?.card)).toBe('dd000001');
  // R585: the tape goes round the card.
  const tape = await box(page, '.tapes path'), card = await box(page, cardOf(C));
  expect(tape.y + tape.height).toBeGreaterThan(card.y + card.height);

  // R584: its pool dragged a little, the card still in the tape, it stays in; dragged far, it comes out.
  const dx0 = (await pinOf(page, C)).dx, pn = await middle(page, `${poolOf(C)} .name`);
  await dragFromTo(page, pn.x, pn.y, pn.x + 20, pn.y + 10);
  await expect.poll(() => pinOf(page, C).then(p => p?.dx)).toBeGreaterThan(dx0);
  expect((await pinOf(page, C)).card).toBe('dd000001');
  const pn2 = await middle(page, `${poolOf(C)} .name`);
  await dragFromTo(page, pn2.x, pn2.y, pn2.x + 300, pn2.y + 260);
  await expect.poll(() => pinOf(page, C)).toBeUndefined();
  const lb2 = await box(page, `[data-rid="${D}"]`), cb2 = await settled(page, cardOf(C));
  await dragFromTo(page, cb2.x + 6, cb2.y + 6, lb2.x + 6, lb2.y + lb2.height + 4);
  await expect.poll(() => pinOf(page, C).then(p => p?.card)).toBe('dd000001');

  // R586: carried by its label, card and pool come along by the same amount.
  const was = await rec(page, C), g = await grip(page, D);
  await dragFromTo(page, g.x, g.y, g.x + 60, g.y + 40);
  await expect.poll(async () => (await rec(page, C)).card.x).not.toBe(was.card.x);
  const now = await rec(page, C);
  expect([now.card.x - was.card.x, now.card.y - was.card.y]).toEqual([now.pool.x - was.pool.x, now.pool.y - was.pool.y]);

  // R588: tied, its pool mat and card pile under the label; untied, back where they lie.
  await page.locator(`[data-rid="${D}"] .knot`).click();
  await expect(page.locator('.obj.piled')).toHaveCount(2);
  await page.locator(`[data-rid="${D}"] .knot`).click();
  await expect(page.locator('.obj.piled')).toHaveCount(0);

  // R589: buried, the docket takes the character with it.
  const g2 = await grip(page, D), bar = await barMiddle(page);
  await dragFromTo(page, g2.x, g2.y, bar.x, bar.y);
  await expect.poll(() => rec(page, C)).toBeUndefined();
  const burial = (await rec(page, 'yards')).yards.flatMap((y: any) => y.items).find((i: any) => i.name === 'Docket: NPCs');
  expect(burial.records.map((r: any) => r.oid)).toContain('cc000001');
});

test("across pages: a docket's NPC follows a player's carry; a player's desk buries their character", async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  await seed(gm, [
    { kind: 'docket', oid: 'dd000001', place: P(300, 120, 10), name: 'NPCs', by: 'GM' },
    { kind: 'character', oid: 'cc000001', owner: 'GM', name: 'Gant', card: P(300, 200), pool: P(800, 200), pin: { card: 'dd000001', dx: 0, dy: 80 } },
    { kind: 'docket', oid: 'dd000002', place: P(300, 560, 10), name: 'Mine', by: 'Dana' },
    { kind: 'character', oid: 'cc000002', owner: 'Dana', name: 'Wren', card: P(300, 640), pool: P(800, 600), pin: { card: 'dd000002', dx: 0, dy: 80 } },
  ]);
  const dana = await join(browser, invite, 'Dana', gm);
  await expect(dana.locator(cardOf('o:cc000001'))).toBeVisible();
  // R586, R587: Dana carries the GM's docket; the GM's page brings its NPC, card and pool, to the label.
  const g = await grip(dana, 'o:dd000001');
  await dragFromTo(dana, g.x, g.y, g.x + 150, g.y + 90);
  await expect.poll(async () => (await rec(gm, 'o:dd000001')).place.x, { timeout: 15_000 }).toBeGreaterThan(300);
  const d = (await rec(gm, 'o:dd000001')).place;
  await expect.poll(async () => { const c = await rec(gm, 'o:cc000001'); return [c.card.x - d.x, c.card.y - d.y, c.pool.x - c.card.x]; }, { timeout: 15_000 })
    .toEqual([0, 80, 500]);
  // R589: Dana files her docket on her desk: the docket is filed, her character buried.
  const g2 = await grip(dana, 'o:dd000002'), desk = await middle(dana, '#bar .desk');
  await dragFromTo(dana, g2.x, g2.y, desk.x, desk.y);
  await expect.poll(() => rec(gm, 'o:cc000002'), { timeout: 15_000 }).toBeUndefined();
  expect((await rec(dana, 'desk')).desks[0].items.map((e: any) => [e.name, e.records.map((r: any) => r.oid)])).toEqual([['Docket: Mine', ['dd000002']]]);
  await expect.poll(async () => (await rec(gm, 'yards')).yards.flatMap((y: any) => y.items).map((i: any) => i.name), { timeout: 15_000 }).toContain('Wren');
});


test("a docket's open menu lies over the paper pinned to it", async ({ page }) => {
  await open(page);
  const D = 'o:dd000002';
  await seed(page, [
    { kind: 'docket', oid: 'dd000002', place: P(300, 120, 10), name: 'Clues', by: 'GM' },
    { kind: 'sticky', oid: 'aa000003', place: P(300, 140, 11), text: 'under the menu', pin: { card: 'dd000002', dx: 0, dy: 20 } },
  ]);
  await page.locator(`[data-rid="${D}"] > .foldpick`).click();
  // R596: the sticky lies where the menu opens, and the menu is on top there.
  const m = await box(page, `[data-rid="${D}"] > .readmenu`), s = await box(page, '[data-rid="o:aa000003"]');
  const x = Math.max(m.x, s.x) + 4, y = Math.max(m.y, s.y) + 4;
  expect(x < Math.min(m.x + m.width, s.x + s.width) && y < Math.min(m.y + m.height, s.y + s.height)).toBe(true);
  expect(await page.evaluate(([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('.readmenu'), [x, y])).toBe(true);
});

test('untied, the tape goes round the papers where they lie again', async ({ page }) => {
  await open(page);
  const D = 'o:dd000003';
  await seed(page, [
    { kind: 'docket', oid: 'dd000003', place: P(300, 120, 10), name: 'Leads', by: 'GM' },
    { kind: 'sticky', oid: 'aa000004', place: P(320, 400, 11), text: 'far below', pin: { card: 'dd000003', dx: 20, dy: 280 } },
    { kind: 'sticky', oid: 'aa000005', place: P(600, 200, 12), text: 'off right', pin: { card: 'dd000003', dx: 300, dy: 80 } },
  ]);
  const tape = () => page.locator('.tapes path').first().getAttribute('d');
  await expect.poll(tape).toBeTruthy();
  const before = await tape();
  // R534, R542: tied, the tape goes round the pile; untied, round the papers where their records say again.
  await page.locator(`[data-rid="${D}"] .knot`).click();
  await expect(page.locator('.bow')).toHaveCount(1);
  expect(await tape()).not.toBe(before);
  await page.locator(`[data-rid="${D}"] .knot`).click();
  await expect(page.locator('.bow')).toHaveCount(0);
  expect(await tape()).toBe(before);
});
