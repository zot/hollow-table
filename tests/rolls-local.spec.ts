// CRC: crc-RollRow.md | Test: test-Table.md | R68, R72, R75, R76, R78, R79, R83, R86, R87, R88, R110, R112, R113, R115, R116, R117, R274, R277, R282, R283, R284
// One page: the roll row docked and filled from a card, aiming through the Defend chooser, the
// Difference as pools change, the tape and the register.
import { expect, test, type Page } from '@playwright/test';
import { at, barMiddle, dragFromTo, dragVia, kinds, open, rec } from './page.ts';

const SAM = 'o:00000001', DEVREUX = 'o:00000003';
const SPOOL = `.obj.pool[data-rid="${SAM}"]`, DPOOL = `.obj.pool[data-rid="${DEVREUX}"]`;

/** A chip from the bar into a pool's slot: `n` picks the chip (0 to 3 are 2, 4, 6, +1). */
// (It comes up from under the pool: crossing a narrow strip on the way would open it, and close the
// slot aimed at to pay for it, R244.)
async function chipInto(page: Page, sign: 'pos' | 'neg', n: number, pool: string, slot: string) {
  const c = await at(page, `#bar .supplychips .chip.${sign} >> nth=${n}`, 10, 10), s = await at(page, `${pool} .slot-${slot}`, 20, 40);
  const p = (await page.locator(pool).boundingBox())!, below = { x: s.x, y: p.y + p.height + 40 };
  await dragVia(page, [c, { x: c.x, y: c.y + 10 }, { x: p.x + p.width + 60, y: below.y }, below, s]);
}

/** Devreux's Attack, aimed at Sam's Mental Defend. */
async function aimed(page: Page) {
  await page.locator(`.obj.card[data-rid="${DEVREUX}"] .actdie`).first().click();
  const base = await at(page, `${DPOOL} .rollinfo .base`, 8, 6), sam = await at(page, `${SPOOL} .slots`, 60, 30);
  await dragFromTo(page, base.x, base.y, sam.x, sam.y, 15);
  await expect(page.locator('#defchoice button')).toHaveCount(2);
  await expect(page.locator('#defchoice')).toContainText('2');
  await page.locator('#defchoice button', { hasText: /ental/ }).click();
}

test.beforeEach(async ({ page }) => { await open(page); });

test('the roll row docks, and the Difference menu', async ({ page }) => {
  // R68: no roll controls in the bar; Devreux's die docks the row on his pool.
  await expect(page.locator('#bar .roller')).toHaveCount(0);
  await page.locator(`${DPOOL} .die-own`).click();
  await expect(page.locator(`${DPOOL} .roller`)).toBeVisible();
  // R72: White opens the nine-row menu, words first, dice at the right; a click away closes it.
  await page.locator(`${DPOOL} .roller .white`).click();
  const menu = page.locator('.advmenu');
  await expect(menu).toBeVisible();
  await expect(menu.locator('button')).toHaveCount(9);
  await expect(menu.locator('button >> nth=4 >> span.dice')).toBeVisible();
  await page.mouse.click(700, 760);
  await expect(menu).toBeHidden();
});

test('aiming, and the Difference as pools change', async ({ page }) => {
  // R75, R76, R83, R87: Devreux's Attack (4) dragged onto Sam offers Mental 2 / Psych 4.
  await aimed(page);
  // R86: Mental gives vs Sam 2 (+2), White.
  const vs = page.locator(`${DPOOL} .rollinfo .vs`), white = page.locator(`${DPOOL} .roller .white`);
  await expect(vs).toHaveText('vs Sam 2 (+2)');
  await expect(white.locator('.mod')).toHaveCount(0);
  await expect(page.locator(SPOOL)).toHaveClass(/\btargeted\b/);
  // A Stagger −6 on Sam: +8, Green + 1.
  await chipInto(page, 'neg', 2, SPOOL, 'stagger');
  await expect(vs).toHaveText('vs Sam −4 (+8)');
  await expect(white.locator('.rrdie.G')).toHaveCount(1);
  await expect(white.locator('.mod')).toHaveText('+1');
  // Main +4 on Devreux: 8 vs −4, +12, Outclass.
  await chipInto(page, 'pos', 1, DPOOL, 'main');
  await expect(page.locator(`${DPOOL} .rollinfo .base b`)).toHaveText('4 → 8');
  await expect(vs).toHaveText('vs Sam −4 (+12)');
  await expect(white.locator('.mod.outclass')).toBeVisible();
  // R72: a row picked by hand holds as the pools change.
  await white.click();
  await page.locator('.advmenu button >> nth=4').click();
  const picked = await white.getAttribute('title');
  await chipInto(page, 'neg', 0, SPOOL, 'main');
  await expect(white).toHaveAttribute('title', picked!);
  // R79, R279: the receipt records Total Influence and the Difference.
  await page.locator(`${DPOOL} .roller .roll`).click();
  const receipt = page.locator('#tape .strip .receipt').first();
  await expect(receipt).toContainText('Total Influence 8');
  await expect(receipt).toContainText('Difference');
});

test('a player cannot aim at someone hidden from them', async ({ page }) => {
  // R88: viewing as Player 1, Sam's Infer dragged onto Devreux is refused, saying so.
  for (let i = 0; i < 6 && await page.locator('.tag.viewas').textContent() !== 'Player 1'; i++) { await page.locator('.tag.viewas').click(); await open(page); }
  await page.locator(`.obj.card[data-rid="${SAM}"] .actdie`).first().click();
  const base = await at(page, `${SPOOL} .rollinfo .base`, 8, 6), dev = await at(page, `${DPOOL} .slots`, 60, 30);
  await dragFromTo(page, base.x, base.y, dev.x, dev.y, 15);
  await expect(page.locator('#defchoice')).toHaveText('Only the GM can aim at Devreux.');
  await expect(page.locator(`${SPOOL} .rollinfo .vs`)).toHaveCount(0);
  for (let i = 0; i < 6 && await page.locator('.tag.viewas').textContent() !== 'GM'; i++) { await page.locator('.tag.viewas').click(); await open(page); }
});

test('the tape, and the register', async ({ page }) => {
  // R110, R282: rolls print newest first on the tape under the register.
  await page.locator(`${DPOOL} .die-own`).click();
  for (let k = 0; k < 5; k++) await page.locator(`${DPOOL} .roller .roll`).click();
  const receipts = page.locator('#tape .strip .receipt');
  await expect(receipts).toHaveCount(5);
  await expect(receipts.first().locator('.title')).toHaveText('Devreux, roll 5');
  // R112: the paper roll rolls the tape up, and down again; a press on the table lowers it.
  await page.locator('#paperroll').click();
  await expect(page.locator('#tape')).toHaveClass(/\bup\b/);
  await page.locator('#paperroll').click();
  await expect(page.locator('#tape')).not.toHaveClass(/\bup\b/);
  await page.mouse.click(700, 760);
  await expect(page.locator('#tape')).not.toHaveClass(/\braised\b/);
  // R113, R283: dragged, the whole roll tears off; the next roll starts a fresh tape; the torn roll
  // buries as "Tape: 5 rolls, last Devreux, roll 5".
  // (Lowered, the tape lies under the pools: it is pressed where it shows.)
  const showing = await page.evaluate(() => {
    const r = document.querySelector('#tape .strip')!.getBoundingClientRect();
    for (let y = r.top + 10; y < r.bottom - 5; y += 8) for (let x = r.left + 10; x < r.right - 10; x += 8) {
      if ((document.elementFromPoint(x, y) as HTMLElement | null)?.closest('#tape')) return { x, y };
    }
    throw new Error('the tape is covered');
  });
  await dragFromTo(page, showing.x, showing.y, 600, 500);
  const torn = await kinds(page, 'tornroll');
  expect(torn).toHaveLength(1);
  expect(torn[0]![1].receipts).toHaveLength(5);
  await expect(receipts).toHaveCount(0);
  await page.locator(`${DPOOL} .roller .roll`).click();
  await expect(receipts).toHaveCount(1);
  const t = await at(page, `[data-rid="${torn[0]![0]}"]`, 20, 20), mid = await barMiddle(page);
  await dragFromTo(page, t.x, t.y, mid.x, mid.y);
  expect(JSON.stringify(await rec(page, 'yards'))).toContain('Tape: 5 rolls, last Devreux, roll 5');
  // R115, R116, R284: ▲ steps the Round; End once raises the tab and changes nothing; twice ends
  // the Conflict: Round 0.
  await page.locator('.register .key.up').click();
  await page.locator('.register .key.up').click();
  expect((await rec(page, 'meta')).round).toBe(2);
  await page.locator('.register .key.end').click();
  await expect(page.locator('.register')).toHaveClass(/\barmed\b/);
  expect((await rec(page, 'meta')).round).toBe(2);
  await page.locator('.register .key.end').click();
  await expect.poll(async () => (await rec(page, 'meta')).round).toBe(0);
  await expect(page.locator('.register .rtab')).toHaveText('0');
});
