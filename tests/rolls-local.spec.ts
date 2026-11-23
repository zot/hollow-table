// CRC: crc-RollRow.md | Test: test-Table.md | R381, R72, R316, R76, R78, R79, R83, R86, R372, R374, R110, R112, R113, R115, R116, R117, R274, R277, R282, R283, R284, R306, R307, R319, R364, R326, R327, R329, R345, R346, R347, R376, R350, R351, R362, R353, R354, R355, R363, R365
// One page: the roll row docked and filled from a card, aiming through the Defend chooser, the
// Difference as pools change, the tape and the register.
import { expect, test, type Page } from '@playwright/test';
import { at, barMiddle, dragFromTo, dragVia, hook, kinds, open, openTable, rec } from './page.ts';

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
/** The roll row's type set from its tag's list (R319). */
async function typed(page: Page, words: string) {
  await page.locator(`${DPOOL} .roller .rtype`).click();
  await page.locator('#defchoice button', { hasText: new RegExp(`^${words.replace('?', '\\?')}$`) }).click();
}

async function aimed(page: Page) {
  // R364, R346: Devreux's plain Attack doesn't say what it is, so it starts at ? and can't be aimed;
  // as a Skill roll it can, through the Defend chooser.
  await page.locator(`.obj.card[data-rid="${DEVREUX}"] .actdie`).first().click();
  await expect(page.locator(`${DPOOL} .roller .rtype`)).toHaveText('?');
  const base = await at(page, `${DPOOL} .rollinfo .base`, 8, 6), sam = await at(page, `${SPOOL} .slots`, 60, 30);
  await dragFromTo(page, base.x, base.y, sam.x, sam.y, 15);
  await expect(page.locator('#defchoice')).toContainText('Say what this roll is first.');
  await page.keyboard.press('Escape');
  await typed(page, 'Skill');
  await dragFromTo(page, base.x, base.y, sam.x, sam.y, 15);
  await expect(page.locator('#defchoice button')).toHaveCount(2);
  await expect(page.locator('#defchoice')).toContainText('2');
  await page.locator('#defchoice button', { hasText: /ental/ }).click();
}

test.beforeEach(async ({ page }) => { await open(page); });

test('the roll row docks, and the Difference menu', async ({ page }) => {
  // R381: no roll controls in the bar; Devreux's die docks the row on his pool.
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
  // R316, R76, R83, R372: Devreux's Attack (4) dragged onto Sam offers Mental 2 / Psych 4.
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
  // R79, R317: the receipt records Total Influence and the Difference.
  await page.locator(`${DPOOL} .roller .roll`).click();
  const receipt = page.locator('#tape .strip .receipt').first();
  await expect(receipt).toContainText('Total Influence 8');
  await expect(receipt).toContainText('Difference');
});

test('an Attack aims at its own Defend', async ({ page }) => {
  // R346: a Psych Attack goes straight at Psych Defend (Sam's 4), with no chooser; R307: its kind on the receipt.
  await page.locator(`.obj.card[data-rid="${DEVREUX}"] .actdie`).first().click();
  await typed(page, 'Psych Attack');
  const base = await at(page, `${DPOOL} .rollinfo .base`, 8, 6), sam = await at(page, `${SPOOL} .slots`, 60, 30);
  await dragFromTo(page, base.x, base.y, sam.x, sam.y, 15);
  await expect(page.locator('#defchoice')).toHaveCount(0);
  await expect(page.locator(`${DPOOL} .rollinfo .vs`)).toHaveText('vs Sam 4 (+0)');
  await page.locator(`${DPOOL} .roller .roll`).click();
  await expect(page.locator('#tape .strip .receipt').first()).toContainText('vs Sam (psych 4)');
});

/** The middle of a run of text on a card's front: the `nth` match of `re` in the line that matches `line`. */
async function textAt(page: Page, card: string, line: RegExp, re: RegExp) {
  return page.evaluate(([card, line, re]) => {
    const div = [...document.querySelector(`.obj.card[data-rid="${card}"] .front > .text`)!.children]
      .find(l => new RegExp(line).test(l.textContent ?? ''))!;
    const m = new RegExp(re).exec(div.textContent ?? '')!, walk = document.createTreeWalker(div, NodeFilter.SHOW_TEXT), r = document.createRange();
    let seen = 0;
    for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
      if (m.index < seen + n.length) { r.setStart(n, m.index - seen); r.setEnd(n, m.index - seen + m[0].length); break; }
      seen += n.length;
    }
    const b = r.getBoundingClientRect();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }, [card, line.source, re.source] as const);
}

test('pointing at the opposing number', async ({ page }) => {
  // R326, R329: Devreux's Attack as a Skill roll, dragged onto the 4 of Sam's psych Defend: a line and
  // the box while dragging, then aimed at psych 4 with no chooser; R327: onto Sam's Investigation, Level + Cha.
  await page.locator(`.obj.card[data-rid="${DEVREUX}"] .actdie`).first().click();
  await typed(page, 'Skill');
  const base = await at(page, `${DPOOL} .rollinfo .base`, 8, 6), four = await textAt(page, SAM, /^Defend/, /4/);
  await page.mouse.move(base.x, base.y);
  await page.mouse.down();
  await page.mouse.move(base.x + 8, base.y + 8, { steps: 2 });
  await page.mouse.move(four.x, four.y, { steps: 10 });
  await expect(page.locator('#aimline line')).toHaveCount(1);
  await expect(page.locator('#aimbox')).toBeVisible();
  const box = (await page.locator('#aimbox').boundingBox())!;
  expect(box.width).toBeLessThan(40);
  await page.mouse.up();
  await expect(page.locator('#aimbox')).toHaveCount(0);
  await expect(page.locator('#defchoice')).toHaveCount(0);
  await expect(page.locator(`${DPOOL} .rollinfo .vs`)).toHaveAttribute('title', /^Sam: psych 4,/);
  const skill = await textAt(page, SAM, /^Investigation/, /Investigation/);
  await dragFromTo(page, base.x, base.y, skill.x, skill.y, 15);
  await expect(page.locator(`${DPOOL} .rollinfo .vs`)).toHaveAttribute('title', /^Sam: Investigation 2 \+ Cha 2,/);
  await page.locator(`${DPOOL} .roller .roll`).click();
  await expect(page.locator('#tape .strip .receipt').first()).toContainText('vs Sam (Investigation 2 + Cha 2');
});

test('a player cannot aim', async ({ page }) => {
  // R372: only the GM aims: viewing as Player 1, Sam's Infer dragged onto Devreux does nothing.
  for (let i = 0; i < 6 && await page.locator('.tag.viewas').textContent() !== 'Player 1'; i++) { await page.locator('.tag.viewas').click(); await open(page); }
  await page.locator(`.obj.card[data-rid="${SAM}"] .actdie`).first().click();
  const base = await at(page, `${SPOOL} .rollinfo .base`, 8, 6), dev = await at(page, `${DPOOL} .slots`, 60, 30);
  await dragFromTo(page, base.x, base.y, dev.x, dev.y, 15);
  // Nor at the world: a drag to open table opens nothing (a GM's would be reminded of the blank tray).
  const table = await openTable(page);
  await dragFromTo(page, base.x, base.y, table.x, table.y, 15);
  await expect(page.locator('#defchoice')).toHaveCount(0);
  await expect(page.locator(`${SPOOL} .rollinfo .vs`)).toHaveCount(0);
  // R374: a player's White is the GM's, locked.
  await expect(page.locator(`${SPOOL} .roller .white`)).toHaveClass(/\blocked\b/);
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
  // R488: on this page's own Hill.
  expect(JSON.stringify(await rec(page, 'hill'))).toContain('Tape: 5 rolls, last Devreux, roll 5');
  // R495: the Round's card is shaped like a register's number flag: shoulders 5.5 px down, a tip at the middle.
  expect(await page.locator('.register .rtab').evaluate(e => getComputedStyle(e).clipPath)).toMatch(/^path\(.*5\.5 3 5\.5 .*19 -0\.4 /);
  // R115, R116, R284: ▲ steps the Round; End once raises the tab and changes nothing; twice ends
  // the Conflict: Round 0.
  await page.locator('.register .key.up').click();
  await page.locator('.register .key.up').click();
  expect((await rec(page, 'meta')).round).toBe(2);
  await page.locator('.register .key.end').click();
  await expect(page.locator('.register')).toHaveClass(/\barmed\b/);
  expect((await rec(page, 'meta')).round).toBe(2);
  await expect(page.locator('.register .tab')).toHaveText('End conflict?');
  // R494: shift-clicked, the raised tab lowers at once and ends nothing; End again is a fresh first press.
  await page.locator('.register .tab').click({ modifiers: ['Shift'] });
  await expect(page.locator('.register')).not.toHaveClass(/\barmed\b/, { timeout: 1000 });   // well before End's 3 s
  expect((await rec(page, 'meta')).round).toBe(2);
  await page.locator('.register .key.end').click();
  await expect(page.locator('.register')).toHaveClass(/\barmed\b/);
  expect((await rec(page, 'meta')).round).toBe(2);
  await page.locator('.register .key.end').click();
  await expect.poll(async () => (await rec(page, 'meta')).round).toBe(0);
  await expect(page.locator('.register .rtab')).toHaveText('0');
  // R492: at Round 0, End offers to end the scene, and ends it after an "End of scene" checkpoint; R493: its
  // tooltip says how to end only the Conflict.
  await expect(page.locator('.register .key.end')).toHaveAttribute('title', /Round 1 first to end only the Conflict/);
  await expect(page.locator('.register')).not.toHaveClass(/\barmed\b/);
  await page.locator('.register .key.end').click();
  await expect(page.locator('.register .tab')).toHaveText('End scene?');
  await page.locator('.register .key.end').click();
  await expect.poll(() => hook(page, async h => (await h.store.checkpoints()).map((c: { name: string }) => c.name)))
    .toContain('End of scene');
});

test('the world as opposition', async ({ page }) => {
  // R345, R346: an action waits: first to say what it is, then to be aimed; plain dice never wait.
  const roll = page.locator(`${DPOOL} .roller .roll`), vs = page.locator(`${DPOOL} .rollinfo .vs`);
  await page.locator(`${DPOOL} .die-own`).click();
  await expect(roll).toBeEnabled();
  await page.locator(`.obj.card[data-rid="${DEVREUX}"] .actdie`).first().click();
  await expect(roll).toBeDisabled();
  await expect(roll).toHaveAttribute('title', /^Say what this roll is/);
  // R346: a `?` roll can't aim at the world either.
  const base = await at(page, `${DPOOL} .rollinfo .base`, 8, 6), table = await openTable(page);
  await dragFromTo(page, base.x, base.y, table.x, table.y, 15);
  await expect(page.locator('#defchoice')).toHaveText('Say what this roll is first.');
  await page.keyboard.press('Escape');
  await typed(page, 'Skill');
  await expect(roll).toHaveAttribute('title', /^Aim it first/);
  // R376: open table is the world, but not while the tray is blank: a reminder at the pointer.
  await dragFromTo(page, base.x, base.y, table.x, table.y, 15);
  await expect(page.locator('#defchoice')).toHaveText("Put the world's number in the tray first.");
  await expect(vs).toHaveCount(0);
  await page.keyboard.press('Escape');
  // R347: the Opposition button slides the tray out; the GM types the world's number.
  const tray = page.locator('#bar .oppotray'), field = tray.locator('input.total');
  await expect(tray).toBeHidden();
  await page.locator('#bar .oppobtn').click();
  await expect(tray).toBeVisible();
  await expect(tray).toContainText('The world');
  await field.fill('3');
  await field.press('Enter');
  expect(await rec(page, 'world')).toEqual({ set: true, total: 3 });
  // R350: aimed at the world: its numbers (Devreux is the GM's), the ring on the tray, Roll free.
  await dragFromTo(page, base.x, base.y, table.x, table.y, 15);
  await expect(vs).toHaveText('vs the world 3 (+1)');
  await expect(tray).toHaveClass(/\btargeted\b/);
  await expect(roll).toBeEnabled();
  // Live until the roll: a new number moves the White row.
  await field.fill('9');
  await field.press('Enter');
  await expect(vs).toHaveText('vs the world 9 (−5)');
  await expect(page.locator(`${DPOOL} .roller .white .rrdie.R`)).toHaveCount(1);
  // Clicking vs stops aiming; a drop on the tray aims again, and the tray in, the ring is on its button.
  await vs.click();
  await expect(roll).toBeDisabled();
  await expect(tray).not.toHaveClass(/\btargeted\b/);
  const onTray = await at(page, '#bar .oppotray', 20, 20);
  await dragFromTo(page, base.x, base.y, onTray.x, onTray.y, 15);
  await expect(vs).toHaveText('vs the world 9 (−5)');
  await page.locator('#bar .oppobtn').click();
  await expect(page.locator('#bar .oppobtn')).toHaveClass(/\btargeted\b/);
  // R351: the receipt names the world and its number.
  await roll.click();
  await expect(page.locator('#tape .strip .receipt').first()).toContainText('vs the world (9), Difference −5');
});

test('a Finesse variant suffers its Tricky', async ({ page }) => {
  const BEAU = 'o:00000002', BPOOL = `.obj.pool[data-rid="${BEAU}"]`, card = page.locator(`.obj.card[data-rid="${BEAU}"]`);
  const once = async () => (await kinds(page, 'influence')).map(([, r]) => r).filter(r => r.once);
  // R354: Tricky -Min indents under Mental Atk / Req; R355: a die per alternative of that action.
  const tricky = card.locator('.front .text > div', { hasText: 'Tricky -Min' });
  await expect(tricky).toHaveClass(/\bvarpad\b/);
  await expect(tricky.locator('.actdie')).toHaveCount(2);
  await expect(tricky.locator('.actdie').first()).toHaveAttribute('title', 'Roll this: Tricky -Min as Mental Atk');
  await expect(tricky.locator('.actdie').nth(1)).toHaveAttribute('title', 'Roll this: Tricky -Min as Req');
  // R362: choosing it puts one Tricky -Min card in Beauford's Main; the row names the variant, typed Mental Atk.
  await tricky.locator('.actdie').first().click();
  await expect(page.locator(`${BPOOL} .rollinfo .base`)).toContainText('Tricky -Min');
  await expect(page.locator(`${BPOOL} .roller .rtype`)).toHaveText('Mental Atk');
  await expect.poll(once).toEqual([expect.objectContaining({ name: 'Tricky', sign: -1, points: 2, home: '00000002', where: { slot: '00000002', name: 'main' } })]);
  await tricky.locator('.actdie').first().click();
  expect(await once()).toHaveLength(1);
  // R353: a cleared Base takes it away.
  await page.locator(`${BPOOL} .rollinfo .base`).click();
  await expect.poll(once).toEqual([]);
  // Chosen again and aimed at Sam, the roll uses it up and the row starts fresh.
  await tricky.locator('.actdie').first().click();
  await expect.poll(once).toHaveLength(1);
  const base = await at(page, `${BPOOL} .rollinfo .base`, 8, 6), sam = await at(page, `${SPOOL} .slots`, 60, 30);
  await dragFromTo(page, base.x, base.y, sam.x, sam.y, 15);
  await expect(page.locator(`${BPOOL} .rollinfo .vs`)).toContainText('vs Sam');
  await page.locator(`${BPOOL} .roller .roll`).click();
  await expect(page.locator('#tape .strip .receipt').first()).toContainText('Tricky -Min');
  await expect.poll(once).toEqual([]);
  await expect(page.locator(`${BPOOL} .rollinfo .base`)).toHaveCount(0);
});

test('a Skill action, its Audience variant, and a lone Influence', async ({ page }) => {
  // R363, R364: Sam gets Tact as an action, Audience -Sig under it, and a lone Audience -Min after a plain line.
  await page.evaluate(async rid => {
    const h = await (window as any).hollow.ready, sam = h.store.game.get(rid);
    h.store.game.change((w: any) => w.put(rid, { ...sam, front: `${sam.front}\n<act>Tact: 3, 1d</act>\n<act>Audience -Sig: 3, 1d</act>\nnotes\n<act>Audience -Min: 2, 1d</act>` }));
  }, SAM);
  const card = page.locator(`.obj.card[data-rid="${SAM}"]`), line = (t: string) => card.locator('.front .text > div', { hasText: t });
  await expect(line('Audience -Sig')).toHaveClass(/\bvarpad\b/);
  await expect(line('Audience -Sig').locator('.actdie')).toHaveAttribute('title', 'Roll this: Audience -Sig as Tact');
  await expect(line('Audience -Min').locator('.actdie')).toHaveCount(0);
  // R364: Tact names a Skill on Sam's card, so its roll starts at Skill.
  await line('Tact:').locator('.actdie').click();
  await expect(page.locator(`${SPOOL} .roller .rtype`)).toHaveText('Skill');
  // R365: dropped on Devreux's pool it falls back to his Defend, through the chooser, with a reminder.
  const base = await at(page, `${SPOOL} .rollinfo .base`, 8, 6), dev = await at(page, `${DPOOL} .slots`, 60, 30);
  await dragFromTo(page, base.x, base.y, dev.x, dev.y, 15);
  await page.locator('#defchoice button').first().click();
  await expect(page.locator(`${SPOOL} .rollinfo .vs`)).toContainText('vs Devreux');
  await expect(page.locator('#defchoice')).toHaveText('A Skill or Attribute normally opposes a Skill.');
});

test('the die toggles the roll row', async ({ page }) => {
  // R381, R382: Beauford's die brings his row up; clicking the Base starts it fresh; the die again puts
  // it away, the card his variant suffered with it (R353).
  const BEAU = 'o:00000002', BPOOL = `.obj.pool[data-rid="${BEAU}"]`, row = page.locator(`${BPOOL} .roller`);
  const once = async () => (await kinds(page, 'influence')).map(([, r]) => r).filter(r => r.once);
  await page.locator(`${BPOOL} .die-own`).click();
  await expect(row).toHaveCount(1);
  const tricky = page.locator(`.obj.card[data-rid="${BEAU}"] .front .text > div`, { hasText: 'Tricky -Min' });
  await tricky.locator('.actdie').first().click();
  await expect.poll(once).toHaveLength(1);
  await page.locator(`${BPOOL} .rollinfo .base`).click();
  await expect(page.locator(`${BPOOL} .rollinfo .base`)).toHaveCount(0);
  await expect(row).toHaveCount(1);
  await expect.poll(once).toEqual([]);
  await tricky.locator('.actdie').first().click();
  await expect.poll(once).toHaveLength(1);
  await page.locator(`${BPOOL} .die-own`).click();
  await expect(row).toHaveCount(0);
  await expect.poll(once).toEqual([]);
  expect((await rec(page, 'rows')).rows['00000002']).toBeUndefined();
});
