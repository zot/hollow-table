// CRC: crc-TableView.md | Test: test-Table.md | R18, R19, R20, R31, R32, R33, R34, R35, R118, R119, R120, R244, R251, R287, R366, R369, R380, R407-409, R411, R412, R414-417, R419, R421, R422, R424-426, R428
// The table as a person uses it, on the GM's page: characters made from the bar, pools and cards
// carried together or apart, put away and dug up, and the strips a pool keeps narrow.
import { expect, test, type Page } from '@playwright/test';
import { at, barMiddle, dragFromTo, kinds, open, rec, records } from './page.ts';

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
  // R305: a page built locally says just "dev" under the wordmark, with no date.
  await expect(page.locator('#bar .wordmark .stamp')).toHaveText(['dev']);
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
  // R237, R366: three 4-chips in Beauford's Main Roll Up into one 6 (the book's Roll Up), as a pile:
  // the chips stay as they were put.
  const BPOOL = `.obj.pool[data-rid="${BEAUFORD}"]`, four = () => at(page, '#bar .supplychips .chip.pos >> nth=1', 12, 12);
  for (let k = 0; k < 3; k++) { const c = await four(), m = await at(page, `${BPOOL} .slot-main`, 20, 40); await dragFromTo(page, c.x, c.y, m.x, m.y, 15); }
  const bpile = page.locator(`${BPOOL} .slot-main .pile`);
  await expect(bpile.locator('.disc')).toHaveText('6');
  const inMain = async () => (await kinds(page, 'chip')).map(([, c]) => c).filter(c => c.where?.slot === '00000002' && c.where.name === 'main').map(c => c.points).sort();
  expect(await inMain()).toEqual([4, 4, 4]);
  // R369: opened, its members are chips; raising one raises that chip itself, and the pile breaks.
  await bpile.locator('.disc').click();
  await expect(bpile.locator('.members .chip')).toHaveText(['4', '4', '4']);
  await bpile.locator('.members .chip').first().click();
  await expect.poll(inMain).toEqual([4, 4, 6]);
  await expect(page.locator(`${BPOOL} .slot-main .pile`)).toHaveCount(0);
  await expect(page.locator(`${BPOOL} .slot-main .chip`)).toHaveText(['6', '4', '4']);
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

test("an older game's Fields are marked and bold when the GM opens it", async ({ page }) => {
  // R380, R332: Sam's front without its Field and Skill marks, and meta never marked: opened again, the
  // GM's page marks them, so "Private Investigator 2 (5XP)" is a Field, drawn bold.
  await page.evaluate(async rid => {
    const h = await (window as any).hollow.ready, sam = h.store.game.get(rid), meta = h.store.game.get('meta');
    const { marked: _, ...old } = meta;
    h.store.game.change((w: any) => { w.put(rid, { ...sam, front: sam.front.replace(/<\/?(fld|skl)>/g, '') }); w.put('meta', old); });
  }, SAM);
  await page.waitForTimeout(600);
  await open(page);
  const field = page.locator(`.obj.card[data-rid="${SAM}"] .front .text .fld`, { hasText: 'Private Investigator' });
  await expect(field).toHaveCount(1);
  expect(await field.evaluate(e => getComputedStyle(e).fontWeight)).toBe('700');
  expect((await rec(page, 'meta')).marked).toBe(true);
});

test('writing shows the text cursor', async ({ page }) => {
  // R384: text holding the caret takes the I-beam, over its words and marks; the controls in it keep
  // the pointing hand; without the caret a press carries the piece, so the open hand.
  const cursor = (sel: string) => page.locator(sel).first().evaluate(e => getComputedStyle(e).cursor);
  const SAM = '.obj.card[data-rid="o:00000001"] .front .writes';
  expect(await cursor(SAM)).toBe('grab');
  await page.locator(SAM).focus();
  expect(await cursor(SAM)).toBe('text');
  expect(await cursor(`${SAM} .act`)).toBe('text');
  expect(await cursor(`${SAM} .glyph`)).toBe('pointer');
  expect(await cursor(`${SAM} .actdie`)).toBe('pointer');
  expect(await cursor('.obj.card[data-rid="o:00000001"] .pen')).toBe('pointer');
  const STICKY = '.obj.sticky .writes';
  await page.locator(STICKY).first().focus();
  expect(await cursor(STICKY)).toBe('text');
  // A slot is written on with the card turned over and its column open, as a player would.
  const CARD = '.obj.card[data-rid="o:00000001"]', SLOT = `${CARD} .col-bias .slotline .name`;
  await page.locator(`${CARD} .flip`).first().click();
  await page.locator(`${CARD} .col-bias .hd`).click();
  await page.locator(SLOT).first().focus();
  expect(await page.locator(SLOT).first().evaluate(e => e === document.activeElement)).toBe(true);
  expect(await cursor(SLOT)).toBe('text');
});

test('the GM adds, writes, buries and gets back an Info card', async ({ page }) => {
  // R401, R397: the pool's menu (a GM-owned character's alone) makes a card slid out with the caret in
  // it; written, it stays, and stays slid out across a reload (the seat). R403: emptied, it is buried
  // once the caret leaves; R404: undo outside the text digs it up, slid out; R405: so does dragging it
  // out of Boot Hill's list.
  await expect(page.locator(`.obj.pool[data-rid="${SAM}"] .makemenu`)).toBeHidden();
  const card = page.locator('.obj.card[data-rid="o:00000003"]'), pool = page.locator('.obj.pool[data-rid="o:00000003"]');
  await pool.locator('.makemenu').click();
  await pool.locator('.poolmenu button', { hasText: 'Info card' }).click();
  await expect(pool.locator('.poolmenu')).toHaveCount(0);
  await expect(card.locator('.infopaper .text')).toBeFocused();
  await page.keyboard.type('ANY: she watches the door');
  await page.locator('#table').click({ position: { x: 5, y: 5 } });
  await expect(card.locator('.infotab', { hasText: 'Info' })).toHaveCount(1);
  // One card; a fresh writing area may keep a trailing empty line, which is no clue.
  const clues = async () => ((await rec(page, 'o:00000003')).info as string[] | undefined)?.map(t => t.trim());
  expect(await clues()).toEqual(['ANY: she watches the door']);
  // The game is saved a moment after it changes: reload once it is.
  await expect.poll(async () => (await records(page)).saved).toContain('she watches the door');
  await page.reload();
  await expect(card.locator('.infopaper .text')).toHaveText('ANY: she watches the door');
  const empty = async () => {
    await card.locator('.infopaper .text').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.locator('#table').click({ position: { x: 5, y: 5 } });
    await expect(card.locator('.infopaper')).toHaveCount(0);
    expect(await clues()).toBeUndefined();
  };
  await empty();
  await expect(card.locator('.infotab', { hasText: 'Info' })).toHaveCount(0);
  await expect(page.locator('#boothill .n')).toHaveText('1');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(card.locator('.infopaper .text')).toHaveText('ANY: she watches the door');
  expect(await clues()).toEqual(['ANY: she watches the door']);
  await expect(page.locator('#boothill .n')).toHaveText('');
  // Nothing more is buried, so a second undo does nothing.
  await page.keyboard.press('ControlOrMeta+z');
  await expect(card.locator('.infotab', { hasText: 'Info' })).toHaveCount(1);
  await empty();
  await page.locator('#boothill').click();
  const grave = page.locator('#graves .items button', { hasText: 'Devreux: Info card' });
  const g = (await grave.boundingBox())!;
  await dragFromTo(page, g.x + 20, g.y + g.height / 2, 400, 500);
  await expect(card.locator('.infopaper .text')).toHaveText('ANY: she watches the door');
  await expect(page.locator('#graves')).toBeHidden();
  await expect(page.locator('#boothill .n')).toHaveText('');
});

test('the GM keeps the Connection Table', async ({ page }) => {
  // R408: the GM's bar has the supply; R407, R416, R417: the seeded rows by name, an X where a row
  // meets itself, the book's Levels, and the PCs' columns after the thick line.
  const supply = await at(page, '#bar .supply.links', 20, 10);
  await dragFromTo(page, supply.x, supply.y, 500, 420);
  const sheet = page.locator('.obj.connections');
  await expect(sheet).toHaveCount(1);
  await expect(sheet.locator('th.rowname')).toHaveText(['Beatrice', 'Devreux', 'Eliza', 'Jake', 'Jameson', 'Jephthah', 'Maggie', 'Obed']);
  await expect(sheet.locator('th.col.pc')).toHaveText(['Beauford', 'Sam']);
  const row = (name: string) => sheet.locator('tr', { has: page.locator('th.rowname', { hasText: name }) });
  const under = (name: string, col: string) => row(name).locator(`td:nth-child(${['Beatrice', 'Devreux', 'Eliza', 'Jake', 'Jameson', 'Jephthah', 'Maggie', 'Obed'].indexOf(col) + 2})`);
  await expect(under('Obed', 'Obed')).toHaveText('X');
  await expect(under('Obed', 'Beatrice')).toHaveText('+Sig');
  await expect(row('Obed').locator('td.pc')).toHaveText(['', '']);
  // R411: a cell set from its chooser.
  await under('Eliza', 'Obed').click();
  await sheet.locator('.levels button', { hasText: '+Sig' }).click();
  await expect(under('Eliza', 'Obed')).toHaveText('+Sig');
  await expect(sheet.locator('.levels')).toHaveCount(0);
  // R414, R412: `(` on Devreux's first line opens the chooser; a new group is written and closed, and
  // its row appears.
  const front = page.locator('.obj.card[data-rid="o:00000003"] .front .text');
  await front.locator('.head').first().click();
  await page.keyboard.press('End');
  await page.keyboard.type(' (');
  await expect(page.locator('.obj.card[data-rid="o:00000003"] .groups')).toBeVisible();
  await page.keyboard.type('Unton folk');
  await expect(page.locator('.obj.card .groups .new')).toHaveText('New group: Unton folk');
  await page.keyboard.press('Enter');
  await expect(page.locator('.obj.card .groups')).toHaveCount(0);
  await expect.poll(async () => (await rec(page, 'o:00000003')).front.split('\n')[0]).toContain('Mistress Devreux (Unton folk)');
  await page.locator('#table').click({ position: { x: 5, y: 300 } });
  await expect(sheet.locator('th.rowname.group')).toHaveText(['Unton folk']);
  // R415: renaming the group's row renames the group on Devreux's card.
  await sheet.locator('th.rowname.group').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Unton');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await rec(page, 'o:00000003')).front.split('\n')[0]).toContain('Mistress Devreux (Unton)');
  await expect(sheet.locator('th.rowname.group')).toHaveText(['Unton']);
  // R409: dropped on the bar it is put away, not buried; the supply brings the same table back.
  const corner = await at(page, '.obj.connections th.corner', 10, 10), bar = await barMiddle(page);
  await dragFromTo(page, corner.x, corner.y, bar.x, bar.y);
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('#boothill .n')).toHaveText('');
  const [rid, t] = (await kinds(page, 'connections'))[0]!;
  expect(t.away).toBe(true);
  await dragFromTo(page, supply.x, supply.y, 450, 380);
  await expect(sheet).toHaveCount(1);
  await expect(under('Eliza', 'Obed')).toHaveText('+Sig');
  // R408: taken again while it is out, the same table moves.
  const before = (await rec(page, rid)).place;
  await dragFromTo(page, supply.x, supply.y, 600, 450);
  await expect(sheet).toHaveCount(1);
  expect(await kinds(page, 'connections')).toHaveLength(1);
  await expect.poll(async () => (await rec(page, rid)).place.x).not.toBe(before.x);
});

test('the GM keeps Opinion Records', async ({ page }) => {
  // R426: Devreux and a second GM card, Hank, both in Unton folk, share the group's records.
  await page.evaluate(async () => {
    const g = (await (window as any).hollow.ready).store.game, d = g.get('o:00000003');
    const front = d.front.replace('<head>Mistress Devreux</head>', '<head>Mistress Devreux (Unton folk)</head>');
    g.change((w: any) => {
      w.put('o:00000003', { ...d, front });
      const { info: _i, shown: _s, ...base } = d;
      w.put('o:00000020', { ...base, oid: '00000020', name: 'Hank', front: '<head>Hank (Unton folk)</head>',
        card: { ...d.card, x: 500, y: 650 }, pool: { ...d.pool, x: 500, y: 650 } });
    });
  });
  // R422: the menu's "Opinion of" lists the PCs first; picking Sam makes the record, slid out.
  const card = page.locator('.obj.card[data-rid="o:00000003"]'), pool = page.locator('.obj.pool[data-rid="o:00000003"]');
  await pool.locator('.makemenu').click();
  await expect(pool.locator('.poolmenu .menuhead')).toHaveText('Opinion of');
  await expect(pool.locator('.poolmenu .opinionof').first()).toHaveText('Beauford');
  await pool.locator('.poolmenu .opinionof', { hasText: 'Sam' }).click();
  // R419, R424, R425: a pink record of Sam, Reaction (no Connection in common) and Professional Respect.
  await expect(card.locator('.infotab.opinion')).toHaveText(['Sam']);
  const paper = card.locator('.infopaper.opinion');
  await expect(paper.locator('.text')).toHaveText('Reaction ?Professional Respect (Composure, Suasion, Tact) +Maj');
  await expect(paper.locator('.connhead')).toHaveText('➔ Sam (Connection +Maj)');
  // R425: Composure deleted; leaving the record works the Level out again.
  await paper.locator('.text').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Reaction ?\nProfessional Respect (Suasion, Tact) +Maj');
  await page.locator('#table').click({ position: { x: 5, y: 300 } });
  await expect(paper.locator('.text')).toHaveText('Reaction ?Professional Respect (Suasion, Tact) +Min');
  await expect(paper.locator('.connhead')).toHaveText('➔ Sam (Connection +Min)');
  // R426: Hank's card shows the group's record too.
  await expect(page.locator('.obj.card[data-rid="o:00000020"] .infotab.opinion')).toHaveText(['Sam']);
  // R421: the Connection Table's cell for the group and Sam follows the record.
  const supply = await at(page, '#bar .supply.links', 20, 10);
  await dragFromTo(page, supply.x, supply.y, 300, 600);
  const row = page.locator('.obj.connections tr', { has: page.locator('th.rowname', { hasText: 'Unton folk' }) });
  await expect(row.locator('td.pc')).toHaveText(['', '+Min']);
  // R428: emptied, the record is buried once the GM leaves it; undo digs it up.
  await paper.locator('.text').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await page.locator('#table').click({ position: { x: 5, y: 300 } });
  await expect(card.locator('.infotab.opinion')).toHaveCount(0);
  await expect(page.locator('#boothill .n')).toHaveText('1');
  expect(JSON.stringify((await rec(page, 'yards')).yards)).toContain('Unton folk: Opinion of Sam');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(card.locator('.infopaper.opinion .text')).toHaveText('Reaction ?Professional Respect (Suasion, Tact) +Min');
  await expect(page.locator('#boothill .n')).toHaveText('');
});

test('the GM calls a Reaction', async ({ page }) => {
  // R429: Devreux's record of Sam waits for a Reaction; its die brings Sam's row up, the White die alone.
  const pool = page.locator('.obj.pool[data-rid="o:00000003"]'), card = page.locator('.obj.card[data-rid="o:00000003"]');
  await pool.locator('.makemenu').click();
  await pool.locator('.poolmenu .opinionof', { hasText: 'Sam' }).click();
  const paper = card.locator('.infopaper.opinion');
  await expect(paper.locator('.text')).toContainText('Reaction ?');
  await page.locator('#table').click({ position: { x: 5, y: 300 } });
  await paper.locator('.reactdie').click();
  const sam = page.locator('.obj.pool[data-rid="o:00000001"]'), row = sam.locator('.roller');
  await expect(row.locator('.rrdie.W')).toHaveCount(1);
  await expect(row.locator('.rrdie.B, .rrdie.Y, .rrdie.ghost, .rtype, .bonus')).toHaveCount(0);
  await expect(sam.locator('.rollinfo .base')).toHaveText("Devreux's Reaction");
  // R430, R431: Roll writes the line and prints the receipt; the row goes away.
  await row.locator('.roll').click();
  const receipt = page.locator('#tape .strip .receipt').first();
  await expect(receipt).toContainText("Devreux's Reaction: ");
  const said = (await receipt.textContent())!.match(/Reaction: ([+-](?:Min|Sig)|0)/)![1]!;
  await expect(paper.locator('.text')).toContainText(`Reaction ${said}`);
  await expect(paper.locator('.reactdie')).toHaveCount(0);
  await expect(row).toHaveCount(0);
});

test('the GM taps an Opinion', async ({ page }) => {
  // R432: Devreux's record of Sam, written "Reputation +Sig", has a glyph on that line.
  const pool = page.locator('.obj.pool[data-rid="o:00000003"]'), card = page.locator('.obj.card[data-rid="o:00000003"]');
  await pool.locator('.makemenu').click();
  await pool.locator('.poolmenu .opinionof', { hasText: 'Sam' }).click();
  const paper = card.locator('.infopaper.opinion');
  await paper.locator('.text').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Reputation +Sig');
  await page.locator('#table').click({ position: { x: 5, y: 300 } });
  await expect(paper.locator('.glyph')).toHaveCount(1);
  const supply = await at(page, '#bar .supply.links', 20, 10);
  await dragFromTo(page, supply.x, supply.y, 300, 600);
  const row = page.locator('.obj.connections tr', { has: page.locator('th.rowname', { hasText: 'Devreux' }) });
  await expect(row.locator('td.pc')).toHaveText(['', '+Sig']);
  // R433: dragged onto Sam's Main, it is "Devreux: Reputation", and the record spends into parentheses.
  const g = await at(page, '.obj.card[data-rid="o:00000003"] .infopaper.opinion .glyph', 5, 5);
  const main = await at(page, '.obj.pool[data-rid="o:00000001"] .slot-main', 20, 40);
  await dragFromTo(page, g.x, g.y, main.x, main.y);
  await expect.poll(() => page.evaluate(async () => {
    const g = (await (window as any).hollow.ready).store.game;
    return g.all().map(([, r]: any) => r).filter((r: any) => r.kind === 'influence' && r.name === 'Devreux: Reputation')
      .map((r: any) => `${r.where.slot}/${r.where.name}`);
  })).toEqual(['00000001/main']);
  await expect(paper.locator('.text')).toHaveText('Reputation +Sig (+Min)');
  // R434: the cell counts the fixed Level only.
  await expect(row.locator('td.pc')).toHaveText(['', '+Sig']);
});

test('the GM reveals an Opinion', async ({ page }) => {
  // R436: with the eye open and Devreux's record of Sam slid out, its lines are targets; Opinions lights them.
  const pool = page.locator('.obj.pool[data-rid="o:00000003"]'), card = page.locator('.obj.card[data-rid="o:00000003"]');
  await pool.locator('.makemenu').click();
  await pool.locator('.poolmenu .opinionof', { hasText: 'Sam' }).click();
  const paper = card.locator('.infopaper.opinion');
  await paper.locator('.text').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Reputation +Sig\nGrudge -Min');
  await page.locator('#table').click({ position: { x: 5, y: 300 } });
  await card.locator('.eyecat').click();
  await card.locator('.eyemenu button', { hasText: 'Opinions' }).click();
  await expect(paper.locator('.entry.lit')).toHaveText(['Reputation +Sig', 'Grudge -Min']);
  await paper.locator('.entry', { hasText: 'Grudge -Min' }).click();
  await expect(paper.locator('.entry.torn')).toHaveText(['Grudge -Min']);
  await card.locator('.eye').click();
  // Shut, the record holds its revealed line, its card and its name.
  const r = await page.evaluate(async () => {
    const g = (await (window as any).hollow.ready).store.game;
    const o = g.all().map(([, x]: any) => x).find((x: any) => x.kind === 'opinion');
    return { shown: o.shown, on: o.on, name: o.name };
  });
  expect(r).toEqual({ shown: ['Grudge -Min'], on: ['00000003'], name: 'Sam' });
});
