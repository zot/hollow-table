// CRC: crc-TableView.md | Test: test-Table.md | R18, R19, R20, R31, R32, R33, R34, R35, R118, R119, R120, R244, R251, R287
// The table as a person uses it, on the GM's page: characters made from the bar, pools and cards
// carried together or apart, put away and dug up, and the strips a pool keeps narrow.
import { expect, test, type Page } from '@playwright/test';
import { at, barMiddle, dragFromTo, kinds, open, rec } from './page.ts';

const SAM = 'o:00000001', BEAUFORD = 'o:00000002', STICKY = 'o:00000008', CHIP = 'o:00000007';

const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!;
/** Moves a record by game change, the way the page's own tools would. */
const put = (page: Page, rid: string, f: string) => page.evaluate(async ([rid, f]) => {
  const g = (await (window as any).hollow.ready).store.game, r = g.get(rid);
  g.change((w: any) => w.put(rid, (0, eval)(`(${f})`)(r)));
}, [rid, f]);

test.beforeEach(async ({ page }) => { await open(page); });

test('the bar holds the supplies', async ({ page }) => {
  // R18, R20, R287.
  for (const s of ['.supply.card', '.supply.note', '.supply.aa', '.supply.image', '.supply.howto']) await expect(page.locator(`#bar ${s}`)).toBeVisible();
  await expect(page.locator('#bar .supplychips .chip')).toHaveCount(8);
  await expect(page.locator('#bar #boothill')).toBeVisible();
  await expect(page.locator('#bar .register')).toBeVisible();
});

test('a new character from the bar', async ({ page }) => {
  const before = (await kinds(page, 'character')).length, supply = await at(page, '#bar .supply.card', 30, 20);
  // R34: dropped on the table, a pool pops out above its card, gathered, owned by the maker.
  await dragFromTo(page, supply.x, supply.y, 700, 560);
  const made = (await kinds(page, 'character')).filter(([rid]) => ![SAM, BEAUFORD, 'o:00000003'].includes(rid));
  expect(made).toHaveLength(1);
  const [rid, c] = made[0]!;
  expect(c.owner).toBe('GM');
  expect(c.gathered).toBe(true);
  const pool = await box(page, `.obj.pool[data-rid="${rid}"]`), card = await box(page, `.obj.card[data-rid="${rid}"]`);
  expect(pool.y + pool.height).toBeLessThanOrEqual(card.y + 1);
  // R35: one dropped near the top is moved clear of the bar.
  await dragFromTo(page, supply.x, supply.y, 300, 100);
  const bar = await box(page, '#bar');
  const top = (await kinds(page, 'character')).length;
  expect(top).toBe(before + 2);
  const newest = (await kinds(page, 'character')).find(([r]) => r !== rid && ![SAM, BEAUFORD, 'o:00000003'].includes(r))![0];
  expect((await box(page, `.obj.pool[data-rid="${newest}"]`)).y).toBeGreaterThanOrEqual(bar.y + bar.height);
  // R19: taken from the bar and dropped back on it, nothing is made.
  const mid = await barMiddle(page);
  await dragFromTo(page, supply.x, supply.y, mid.x, mid.y);
  expect((await kinds(page, 'character')).length).toBe(before + 2);
});

test('a pool carries its gathered card; a card alone leaves it, and Gather brings it back', async ({ page }) => {
  // R251: pressing a pool's name carries the pool and its gathered card by the same offset.
  const was = await rec(page, SAM), name = await at(page, `.obj.pool[data-rid="${SAM}"] .name`);
  const p0 = await box(page, `.obj.pool[data-rid="${SAM}"]`), c0 = await box(page, `.obj.card[data-rid="${SAM}"]`);
  await dragFromTo(page, name.x, name.y, name.x + 120, name.y + 60);
  const now = await rec(page, SAM);
  expect(now.pool.x - was.pool.x).toBeGreaterThan(0);
  expect(now.gathered).toBe(true);
  // A gathered card is drawn under its drawer, wherever its own place says: it moved with the pool.
  // (Measured once the dropped pool has settled from its lifted look.)
  const offset = async () => {
    const p1 = await box(page, `.obj.pool[data-rid="${SAM}"]`), c1 = await box(page, `.obj.card[data-rid="${SAM}"]`);
    return Math.round(Math.abs((c1.x - p1.x) - (c0.x - p0.x)) + Math.abs((c1.y - p1.y) - (c0.y - p0.y)));
  };
  await expect.poll(offset).toBeLessThanOrEqual(1);   // whole table units at the zoom
  // R32: the card dragged alone stays where it is put, ungathered.
  const cardAt = await at(page, `.obj.card[data-rid="${SAM}"]`, 4, 4);
  await dragFromTo(page, cardAt.x, cardAt.y, cardAt.x + 200, cardAt.y + 40);
  const alone = await rec(page, SAM);
  expect(alone.gathered).toBe(false);
  expect(alone.pool).toEqual(now.pool);
  // R33: Gather snaps it back under the drawer.
  await page.locator(`.obj.pool[data-rid="${SAM}"] .gather`).click();
  expect((await rec(page, SAM)).gathered).toBe(true);
  const pool = await box(page, `.obj.pool[data-rid="${SAM}"]`), card = await box(page, `.obj.card[data-rid="${SAM}"]`);
  await expect.poll(async () => Math.round(Math.abs((await box(page, `.obj.card[data-rid="${SAM}"]`)).x - (await box(page, `.obj.pool[data-rid="${SAM}"]`)).x - (c0.x - p0.x)))).toBe(0);
  void pool; void card;
});

test('put away and dug up', async ({ page }) => {
  // R119: a pool put away buries it with its card and its chip; Boot Hill lists it.
  const name = await at(page, `.obj.pool[data-rid="${BEAUFORD}"] .name`), mid = await barMiddle(page);
  await dragFromTo(page, name.x, name.y, mid.x, mid.y);
  expect(await rec(page, BEAUFORD)).toBeUndefined();
  expect(await rec(page, CHIP)).toBeUndefined();
  await page.locator('#boothill').click();
  const item = page.locator('#graves .items button', { hasText: 'Beauford' });
  await expect(item).toBeVisible();
  // R120, R295: dragged out, the pool comes up under the pointer, the card following, the chip kept.
  const i = await at(page, '#graves .items button >> text=Beauford', 20, 10);
  await dragFromTo(page, i.x, i.y, 600, 400);
  const back = await rec(page, BEAUFORD);
  expect(back.gathered).toBe(true);
  expect((await rec(page, CHIP)).where).toEqual({ slot: '00000002', name: 'stagger' });
  const pool = await box(page, `.obj.pool[data-rid="${BEAUFORD}"]`);
  expect(Math.abs(pool.x - 600)).toBeLessThan(40);
  expect(Math.abs(pool.y - 400)).toBeLessThan(40);
  // A sticky put away comes back with its text.
  // (Its top edge lies under the bar and it is tilted, so it is taken well inside its bottom left.)
  const text = (await rec(page, STICKY)).text, sb = await box(page, `[data-rid="${STICKY}"]`), s = { x: sb.x + sb.width * 0.1, y: sb.y + sb.height * 0.9 };
  await dragFromTo(page, s.x, s.y, mid.x, mid.y);
  expect(await rec(page, STICKY)).toBeUndefined();
  await page.locator('#boothill').click();
  const n = await at(page, '#graves .items button >> text=/^Note: /', 20, 10);
  await dragFromTo(page, n.x, n.y, 500, 500);
  expect((await rec(page, STICKY)).text).toBe(text);
});

test("an empty pool's strips, and a chip opening one", async ({ page }) => {
  // R31, R227: an empty pool opens Bonus, Main, Edge and Stagger; Bias, Affliction and Injury are strips.
  const supply = await at(page, '#bar .supply.card', 30, 20);
  await dragFromTo(page, supply.x, supply.y, 700, 560);
  const rid = (await kinds(page, 'character')).find(([r]) => ![SAM, BEAUFORD, 'o:00000003'].includes(r))![0];
  const pool = `.obj.pool[data-rid="${rid}"]`;
  const narrow = () => page.locator(`${pool} .slot.narrow`).evaluateAll(es => es.map(e => (e as HTMLElement).dataset.slot));
  expect(await narrow()).toEqual(['bias', 'affliction', 'injury']);
  // R244: a chip carried over the Bias strip opens it; dropped there, it stays open.
  const chip = await at(page, '#bar .supplychips .chip.pos', 12, 12), bias = await at(page, `${pool} .slot-bias`, 6, 20);
  await dragFromTo(page, chip.x, chip.y, bias.x, bias.y, 20);
  // ...and the first empty slot to its left, Stagger, closes to pay for it.
  await expect.poll(narrow).toEqual(['stagger', 'affliction', 'injury']);
  expect((await kinds(page, 'chip')).find(([, c]) => c.where?.slot === rid.slice(2))![1].where.name).toBe('bias');
});

test('a press beside the name pans; on the name it moves the pool', async ({ page }) => {
  // R251: the empty space beside a pool's name pans the table.
  const was = await rec(page, SAM), hd = await box(page, `.obj.pool[data-rid="${SAM}"] .hd`), nm = await box(page, `.obj.pool[data-rid="${SAM}"] .name`);
  const world = () => page.locator('#world').evaluate(e => (e as HTMLElement).style.transform);
  const t0 = await world();
  const x = nm.x + nm.width + 30;
  expect(x).toBeLessThan(hd.x + hd.width - 60);
  await dragFromTo(page, x, hd.y + hd.height / 2, x + 80, hd.y + hd.height / 2 + 50);
  expect(await rec(page, SAM)).toEqual(was);
  expect(await world()).not.toBe(t0);
  void put;
});

// ---- Influence in the browser ----
const DEVREUX = 'o:00000003', DPOOL = `.obj.pool[data-rid="${DEVREUX}"]`, SPOOL = `.obj.pool[data-rid="${SAM}"]`;
const influences = (page: Page) => kinds(page, 'influence');

test("Devreux's drawer, a pile of three 4s, and the kill box", async ({ page }) => {
  // R50, R229: the drawer holds Devreux's three Motivation cards.
  await expect(page.locator(`${DPOOL} .drawer .cards .icard .iname`)).toHaveText(['Keep the Peace', 'Self-Preservation', 'Old Sympathy for Sparkers']);
  await expect(page.locator(`${DPOOL} .drawer .cards .icard .level`)).toHaveText(['+Sig', '+Sig', '+Min']);
  // R237: three 4-chips in Beauford's Main Roll Up into one 6 (the book's Roll Up).
  const BPOOL = `.obj.pool[data-rid="${BEAUFORD}"]`, four = () => at(page, '#bar .supplychips .chip.pos >> nth=1', 12, 12);
  for (let k = 0; k < 3; k++) { const c = await four(), m = await at(page, `${BPOOL} .slot-main`, 20, 40); await dragFromTo(page, c.x, c.y, m.x, m.y, 15); }
  await expect(page.locator(`${BPOOL} .slot-main .chip`)).toHaveText(['6']);
  // R39, R236: Devreux's two +Sig cards and a 4-chip in his Main, which can't Roll Up, stack as a
  // pile acting as one: 6.
  for (let k = 0; k < 2; k++) { const c = await at(page, `${DPOOL} .drawer .cards .icard >> nth=0`, 8, 8), m = await at(page, `${DPOOL} .slot-main`, 20, 40); await dragFromTo(page, c.x, c.y, m.x, m.y, 15); }
  { const c = await four(), m = await at(page, `${DPOOL} .slot-main`, 20, 40); await dragFromTo(page, c.x, c.y, m.x, m.y, 15); }
  const pile = page.locator(`${DPOOL} .slot-main .pile`);
  await expect(pile).toHaveCount(1);
  await expect(pile.locator('.disc').first()).toHaveAttribute('title', '3 acting as one');
  await expect(pile.locator('.disc').first()).toHaveText('6');
  // An open pile shows its members.
  await pile.locator('.disc').first().click();
  await expect(pile.locator('.members > *')).toHaveCount(3);
  // R229: a card dropped on the kill box is deleted.
  const before = (await influences(page)).length, card = await at(page, `${DPOOL} .drawer .cards .icard >> nth=0`, 8, 8), kill = await at(page, `${DPOOL} .kill`, 8, 8);
  await dragFromTo(page, card.x, card.y, kill.x, kill.y);
  expect((await influences(page)).length).toBe(before - 1);
});

test('taps merge into the card a Resource made, not into a plain one', async ({ page }) => {
  // R54, R55, R225: a tap from Sam's Money glyph into his drawer makes a card.
  const before = (await influences(page)).length;
  // (Pressed at its middle: the glyph is a tiny tilted card, and its corners are the card's face.)
  const glyph = async () => { const b = await box(page, `.obj.card[data-rid="${SAM}"] .glyph >> nth=0`); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const drawer = await at(page, `${SPOOL} .drawer .cards`, 20, 12);
  let g = await glyph();
  await dragFromTo(page, g.x, g.y, drawer.x, drawer.y, 15);
  const made = (await influences(page)).filter(([, k]) => k.home === '00000001');
  expect(made).toHaveLength(1);
  const [rid, card] = made[0]!;
  // R57: a second tap dropped on that card merges into it.
  g = await glyph();
  const onCard = await at(page, `${SPOOL} [data-rid="${rid}"]`, 10, 8);
  await dragFromTo(page, g.x, g.y, onCard.x, onCard.y, 15);
  const after = (await influences(page)).filter(([, k]) => k.home === '00000001');
  expect(after).toHaveLength(1);
  expect(after[0]![1].points).toBeGreaterThan(card.points);
  expect((await influences(page)).length).toBe(before + 1);
});

test("as Player 1: others' cards face-down, Devreux's chips nameless", async ({ page }) => {
  // R150, R151: viewing as Player 1, Beauford's and Devreux's drawers are face-down.
  for (let i = 0; i < 6 && await page.locator('.tag.viewas').textContent() !== 'Player 1'; i++) {
    await page.locator('.tag.viewas').click();
    await open(page);
  }
  await expect(page.locator('.tag.viewas')).toHaveText('Player 1');
  await expect(page.locator(`${DPOOL} .drawer .icard`).first()).toHaveClass(/\bfacedown\b/);
  await expect(page.locator(`${DPOOL} .drawer .iname`)).toHaveCount(0);
  await expect(page.locator(`${SPOOL} .drawer .icard.facedown`)).toHaveCount(0);
  for (let i = 0; i < 6 && await page.locator('.tag.viewas').textContent() !== 'GM'; i++) {
    await page.locator('.tag.viewas').click();
    await open(page);
  }
});

test('a chip answers clicks in a slot and loose on the table', async ({ page }) => {
  // R40: click raises a chip by 2, shift-click lowers it, in a slot and loose on the table alike.
  const value = async (rid: string) => { const r = await rec(page, rid); return r.sign * r.points; };
  const slot = page.locator(`.obj.pool[data-rid="${BEAUFORD}"] .slot-stagger .chip`).first();
  await slot.click();
  expect(await value(CHIP)).toBe(-4);
  await slot.click({ modifiers: ['Shift'] });
  expect(await value(CHIP)).toBe(-2);
  await page.evaluate(async () => {
    const g = (await (window as any).hollow.ready).store.game;
    g.change((w: any) => w.put('o:0000c001', { kind: 'chip', oid: '0000c001', where: { table: { x: 700, y: 650, z: 9, tilt: 0 } }, n: 0, sign: 1, points: 2, rider: false }));
  });
  const loose = page.locator('.loose-item[data-rid="o:0000c001"]');
  await loose.click();
  expect(await value('o:0000c001')).toBe(4);
  await loose.click({ modifiers: ['Shift'] });
  expect(await value('o:0000c001')).toBe(2);
});
