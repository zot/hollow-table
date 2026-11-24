// CRC: crc-PieceView.md | Test: test-Table.md | R252, R253, R255, R256, R463, R268, R269, R270, R271, R272, R334, R335, R341, R342, R496, R565, R566, R567, R568, R572, R570, R571, R573, R574, R575, R576
// The character card and the table's view, measured: a flat card that flips; the damage columns
// rotating; the notes' ruled lines; Levels clicked; the Motivation slot rule; zoom, fit and drop.
import { expect, test, type Page } from '@playwright/test';
import { at, dragFromTo, hook, open, rec } from './page.ts';

const SAM = 'o:00000001', DEVREUX = 'o:00000003', PEACE = 'o:00000004';
const CARD = `.obj.card[data-rid="${SAM}"]`, DPOOL = `.obj.pool[data-rid="${DEVREUX}"]`, SPOOL = `.obj.pool[data-rid="${SAM}"]`;

test.beforeEach(async ({ page }) => { await open(page); });

const order = (page: Page) => page.locator(`${CARD} .damage .column`).evaluateAll(es =>
  es.map(e => [(e as HTMLElement).dataset.damage, getComputedStyle(e).order]).sort((a, b) => Number(a[1]) - Number(b[1])).map(([d]) => d));

test('a flat card that flips', async ({ page }) => {
  // R252: no 3D anywhere in a card (it blurs text in Chrome); the flip turns it to its back.
  const flat = await page.locator(CARD).evaluate(e => [e, ...e.querySelectorAll('*')].every(x => {
    const s = getComputedStyle(x as Element);
    return s.transformStyle !== 'preserve-3d' && s.perspective === 'none' && s.backfaceVisibility !== 'hidden';
  }));
  expect(flat).toBe(true);
  await page.locator(`${CARD} .flip`).click();
  await expect(page.locator(CARD)).toHaveClass(/\bflipped\b/);
  expect((await rec(page, SAM)).flipped).toBe(true);
});

test('the damage columns rotate, and blanks are one length', async ({ page }) => {
  await page.locator(`${CARD} .flip`).click();
  // R253: a column's name brings it to the front, the others following in turn.
  expect(await order(page)).toEqual(['bias', 'affliction', 'injury']);
  await page.locator(`${CARD} .col-affliction .hd`).click({ position: { x: 4, y: 4 } });
  expect(await order(page)).toEqual(['affliction', 'injury', 'bias']);
  await page.locator(`${CARD} .col-affliction .hd`).click({ position: { x: 4, y: 4 } });
  // (Clicking the second twice cycles through all three.)
  await page.locator(`${CARD} .col-injury .hd`).click({ position: { x: 4, y: 4 } });
  expect(await order(page)).toEqual(['injury', 'bias', 'affliction']);
  // R256: the blanks are the same length whichever column is open.
  const widths: number[] = [];
  for (const d of ['bias', 'affliction', 'injury']) {
    await page.locator(`${CARD} .col-${d} .hd`).click({ position: { x: 4, y: 4 } });
    widths.push(Math.round((await page.locator(`${CARD} .col-${d} .slotline[data-row="min"] .name`).boundingBox())!.width));
  }
  expect(new Set(widths).size).toBe(1);
});

test("the notes' lines are one screen pixel and follow the writing", async ({ page }) => {
  // R255: the ruled lines don't scale their stroke, and move with the notes when they scroll.
  await page.locator(`${CARD} .flip`).click();
  const strokes = await page.locator(`${CARD} .ruled svg line`).evaluateAll(ls => [...new Set(ls.map(l => getComputedStyle(l).vectorEffect || l.getAttribute('vector-effect')))]);
  expect(strokes).toEqual(['non-scaling-stroke']);
  const before = await page.locator(`${CARD} .ruled svg`).evaluate(e => getComputedStyle(e).transform);
  await page.locator(`${CARD} .notes`).evaluate(n => { (n as HTMLElement).textContent = Array.from({ length: 40 }, (_, k) => `line ${k}`).join('\n'); n.scrollTop = 40; n.dispatchEvent(new Event('scroll')); });
  await expect.poll(() => page.locator(`${CARD} .ruled svg`).evaluate(e => getComputedStyle(e).transform)).not.toBe(before);
});

test("a card's Level answers clicks; shift-click at Min deletes it", async ({ page }) => {
  // R269: a click raises a plain card from Sig to Maj; a shift-click lowers it back. (Devreux's own
  // cards are tapped in full from his Motivations, so they have nothing to rise by.)
  await page.evaluate(async () => {
    const g = (await (window as any).hollow.ready).store.game;
    g.change((w: any) => w.put('o:0000e001', { kind: 'influence', oid: '0000e001', home: '00000003', where: 'drawer', n: 3, name: 'Hunch', sign: 1, points: 4, used: false, crit: false }));
  });
  const level = page.locator(`${DPOOL} .drawer [data-rid="o:0000e001"] .level`);
  await expect(level).toHaveText('+Sig');
  await level.click();
  await expect(level).toHaveText('+Maj');
  await level.click({ modifiers: ['Shift'] });
  await expect(level).toHaveText('+Sig');
  // R268: lowered to Min and shift-clicked again, it's gone.
  const old = page.locator(`${DPOOL} .drawer [data-rid="o:00000006"] .level`);
  await expect(old).toHaveText('+Min');
  await old.click({ modifiers: ['Shift'] });
  expect(await rec(page, 'o:00000006')).toBeUndefined();
});

test('a Motivation card goes only to Main', async ({ page }) => {
  // R463: Devreux's Keep the Peace dropped on Edge goes home; on Main it stays.
  const card = () => at(page, `${DPOOL} .drawer [data-rid="${PEACE}"]`, 8, 8);
  let c = await card(), edge = await at(page, `${DPOOL} .slot-edge`, 20, 40);
  await dragFromTo(page, c.x, c.y, edge.x, edge.y, 12);
  expect((await rec(page, PEACE)).where).toBe('drawer');
  c = await card();
  const main = await at(page, `${DPOOL} .slot-main`, 20, 40);
  await dragFromTo(page, c.x, c.y, main.x, main.y, 12);
  expect((await rec(page, PEACE)).where).toEqual({ slot: '00000003', name: 'main' });
  void SPOOL;
});

test('zoom, a first visit fitted, and an image dropped from the desktop', async ({ page }) => {
  // R271: a first visit fits the table: every pool is in view.
  const view = page.locator('#table');
  const tb = (await view.boundingBox())!;
  for (const p of await page.locator('.obj.pool').all()) {
    const b = (await p.boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(tb.x - 1);
    expect(b.x + b.width).toBeLessThanOrEqual(tb.x + tb.width + 1);
  }
  // R270: the wheel zooms, within a quarter and two and a half times.
  const zoom = () => page.evaluate(async () => (await (window as any).hollow.ready).view.view.zoom as number);
  await page.mouse.move(700, 500);
  for (let k = 0; k < 30; k++) await page.mouse.wheel(0, -400);
  await expect.poll(zoom).toBeCloseTo(2.5, 2);
  for (let k = 0; k < 60; k++) await page.mouse.wheel(0, 400);
  await expect.poll(zoom).toBeCloseTo(0.25, 2);
  // R272: an image file dropped from the desktop lands where it's dropped.
  const n = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 20; c.height = 10;
    c.getContext('2d')!.fillRect(0, 0, 20, 10);
    const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'dot.png', { type: 'image/png' }));
    const t = document.getElementById('table')!;
    for (const type of ['dragenter', 'dragover', 'drop']) t.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, clientX: 600, clientY: 500, dataTransfer: dt }));
    return 1;
  });
  void n;
  await expect.poll(async () => (await page.evaluate(async () => (await (window as any).hollow.ready).store.game.all().filter(([, r]: [string, any]) => r.kind === 'image').length))).toBe(1);
  const img = (await page.locator('.obj.image').first().boundingBox())!;
  expect(Math.abs(img.x - 600)).toBeLessThan(40);
  expect(Math.abs(img.y - 500)).toBeLessThan(40);
});

test('ghost checks on a Field Skill', async ({ page }) => {
  // R334: a ghost ✓ before an unchecked Field Skill only while the card is written on; R335: a press in
  // its margin writes the ✓ and saves it, a press on the name is no check, and the margin takes it out.
  const line = page.locator(`${CARD} .front > .text > div`, { hasText: /^✓?\s*Investigation/ });
  const ghost = () => line.evaluate(e => getComputedStyle(e, '::before').content);
  const front = async () => (await rec(page, SAM)).front as string;
  expect(await ghost()).toBe('none');
  const margin = async () => { const b = (await line.boundingBox())!; await page.mouse.click(b.x + 4, b.y + b.height / 2); };
  // Alarm 8: at rest there is no ghost, and a press in the margin only starts the writing.
  await margin();
  expect(await front()).toContain('<skl>Investigation (x2)</skl>');
  await line.click({ position: { x: 60, y: 6 } });
  expect(await ghost()).toBe('"✓"');
  await margin();
  await expect.poll(front).toContain('<skl>✓ Investigation (x2)</skl>');
  await expect(line).toHaveClass(/\bsklhang\b/);
  // Alarm 7: a click on the name places the caret, nothing more.
  await line.click({ position: { x: 60, y: 6 } });
  expect(await front()).toContain('<skl>✓ Investigation (x2)</skl>');
  await margin();
  await expect.poll(front).toContain('<skl>Investigation (x2)</skl>');
  expect(await ghost()).toBe('"✓"');
});


test('a Conviction under Biases', async ({ page }) => {
  // R341: Sam's Conviction draws on its own line under Biases: its glyph, name, Level and points over
  // its top; he has no Burden, so that line is hidden. R342: its points and name are written in
  // place, and written away, it is gone.
  await hook(page, h => {
    const rid = 'o:00000001', sam = h.store.game.get(rid);
    h.store.game.change((w: any) => w.put(rid, { ...sam, back: { ...sam.back, lasting: { bias: { name: 'Cheats win', points: 7, spent: 0 } } } }));
  });
  await page.locator(`${CARD} .flip`).click();
  const line = page.locator(`${CARD} .col-bias .lastline`);
  await expect(line).toBeVisible();
  await expect(line.locator('.kind')).toHaveText('Conviction');
  await expect(line.locator('.name')).toHaveText('Cheats win');
  await expect(line.locator('.glyph')).toHaveCount(1);
  await expect(page.locator(`${CARD} .col-bias`)).not.toHaveClass(/\bempty\b/);
  // The column is too narrow for all of it on one line: the name gets a blank of its own.
  expect((await line.locator('.name').evaluate(e => (e as HTMLElement).offsetWidth))).toBeGreaterThan(100);
  expect(await line.evaluate(e => e.textContent!.replace(/\s+/g, ' ').trim())).toBe('ConvictionCheats winMaj7/12');
  await expect(page.locator(`${CARD} .col-affliction .lastline`)).toBeHidden();

  await line.locator('.pts').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('5');
  await expect(line.locator('.lvl')).toHaveText('Sig');
  await expect(line.locator('.top')).toHaveText('/6');
  expect((await rec(page, SAM)).back.lasting.bias.points).toBe(5);

  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await line.locator('.name').click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Backspace');
  await expect.poll(async () => (await rec(page, SAM)).back.lasting).toBeUndefined();
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await expect(line).toBeHidden();
});

test('a slot worth only 1 reads "Mild (1)"', async ({ page }) => {
  // R496: at Wis −1 the Bias Mild slot is worth only 1, and says so; the Min isn't.
  await hook(page, h => {
    const sam = h.store.game.get('o:00000001');
    h.store.game.change((w: any) => w.put('o:00000001', { ...sam, front: sam.front.replace('<att>Cha 2   Int 2   Wis 4</att>', '<att>Cha 2   Int 2   Wis −1</att>') }));
  });
  await page.locator(`${CARD} .flip`).click();
  await expect(page.locator(`${CARD} .col-bias .slotline[data-row="mild"] .lvl`)).toHaveText('Mild (1)');
  await expect(page.locator(`${CARD} .col-bias .slotline[data-row="min"] .lvl`)).toHaveText('Min');
});

test('the name above a pool: set by the card, or written as a nickname', async ({ page }) => {
  await open(page);
  const DCARD = `.obj.card[data-rid="${DEVREUX}"]`, name = page.locator(`${DPOOL} .hd .name`);
  const front = async () => (await rec(page, DEVREUX)).front as string;
  /** Puts the caret at the end of the card's first line and types `s`. */
  const onFirstLine = async (s: string) => {
    await page.locator(`${DCARD} .front .text`).click();
    await page.evaluate(sel => {
      const t = document.querySelector(sel)!, line = t.firstElementChild ?? t, r = document.createRange();
      r.selectNodeContents(line);
      r.collapse(false);
      getSelection()!.removeAllRanges();
      getSelection()!.addRange(r);
    }, `${DCARD} .front .text`);
    await page.keyboard.type(s);
  };
  // R566: writing the name on the card resets the name above the pool, in full.
  await onFirstLine(' Jr');
  await expect.poll(async () => (await rec(page, DEVREUX)).name).toBe('Mistress Devreux Jr');
  await expect(name).toHaveText('Mistress Devreux Jr');
  // R565: written above the pool, a nickname; the card keeps its first line.
  const kept = await front();
  await name.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Madam');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await rec(page, DEVREUX)).name).toBe('Madam');
  expect(await front()).toBe(kept);
  // An edit elsewhere on the card keeps the nickname; the next change to the card's name replaces it.
  await page.locator(`${DCARD} .front .text`).click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type(' x');
  await expect.poll(front).not.toBe(kept);
  expect((await rec(page, DEVREUX)).name).toBe('Madam');
  await onFirstLine('r');
  await expect.poll(async () => (await rec(page, DEVREUX)).name).toBe('Mistress Devreux Jrr');
});

test("a player can't write a name or card that isn't theirs", async ({ browser }) => {
  const { gmTable, join } = await import('./page.ts');
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  // R567: the GM writes Devreux; Dana, who doesn't own it, can't write its name.
  await expect(gm.locator(`${DPOOL} .hd .name`)).toHaveAttribute('contenteditable', 'true');
  await expect(dana.locator(`${DPOOL} .hd .name`)).toHaveAttribute('contenteditable', 'false');
  // An open character's card and name are the GM's alone.
  await hook(gm, h => h.store.game.change((w: any) => w.put('o:00000001', { ...h.store.game.get('o:00000001'), owner: 'open' })));
  await expect(dana.locator(`${SPOOL} .hd .name`)).toHaveAttribute('contenteditable', 'false', { timeout: 15_000 });
  await expect(dana.locator(`${CARD} .front .text`)).toHaveAttribute('contenteditable', 'false');
  await expect(gm.locator(`${SPOOL} .hd .name`)).toHaveAttribute('contenteditable', 'true');
});

test('the thumbtack: pinned paper moves without coming off, and the tack moves the pin', async ({ page }) => {
  const { fromDesk, openTable } = await import('./page.ts');
  await open(page);
  const SAMCARD = `.obj.card[data-rid="${SAM}"]`, DEVCARD = `.obj.card[data-rid="${DEVREUX}"]`;
  const mid = async (sel: string) => { const b = (await page.locator(sel).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  // R568: a sticky let go on Sam's card pins to it and shows its tack.
  const sam = await mid(SAMCARD);
  await fromDesk(page, 'sticky', sam.x, sam.y + 40);
  const S = await page.evaluate(async () => {
    const h = await (window as any).hollow.ready;
    return h.store.game.all().filter(([, r]: [string, any]) => r.kind === 'sticky').at(-1)[0] as string;
  });
  const pin = async () => (await rec(page, S))?.pin;
  await expect.poll(async () => (await pin())?.card).toBe('00000001');
  await expect(page.locator(`[data-rid="${S}"].tacked .tack`)).toBeVisible();
  // R572: dragged off the card it stays pinned to Sam, at its new offset, the pin line showing while carried.
  const before = await pin(), s = await mid(`[data-rid="${S}"] .text`), to = await openTable(page);
  await page.mouse.move(s.x, s.y);
  await page.mouse.down();
  await page.mouse.move(s.x + 20, s.y + 20, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await expect(page.locator('.pinline line')).toHaveCount(1);
  // R572: under the paper, over its card.
  const z = await page.evaluate((sels: string[]) => sels.map(sel => Number(getComputedStyle(document.querySelector(sel)!).zIndex)), [`[data-rid="${S}"]`, SAMCARD, '.pinline']);
  expect(z[2]).toBeLessThan(z[0]!);
  expect(z[2]).toBeGreaterThanOrEqual(z[1]!);
  await page.mouse.up();
  await expect.poll(async () => { const p = await pin(); return [p?.card, p?.dx === before.dx]; }).toEqual(['00000001', false]);
  await expect(page.locator('.pinline')).toHaveCount(0);
  // R571: its tack dragged to Devreux's card moves the pin there; the sticky stays where it lies.
  const lay = (await rec(page, S)).place, tack = async () => mid(`[data-rid="${S}"] .tack`);
  let t = await tack();
  const dev = await mid(DEVCARD);
  await dragFromTo(page, t.x, t.y, dev.x, dev.y);
  await expect.poll(async () => (await pin())?.card).toBe('00000003');
  expect((await rec(page, S)).place).toEqual(lay);
  // Let go on the table, or Esc mid-drag: nothing changes.
  t = await tack();
  const open2 = await openTable(page);
  await dragFromTo(page, t.x, t.y, open2.x, open2.y);
  expect((await pin())?.card).toBe('00000003');
  t = await tack();
  await page.mouse.move(t.x, t.y);
  await page.mouse.down();
  await page.mouse.move(sam.x, sam.y, { steps: 8 });
  // R573: its own card and the card pointed at raised, the paper above them; down again after Esc.
  await expect(page.locator(`${DEVCARD}.pinraised`)).toHaveCount(1);
  await expect(page.locator(`${SAMCARD}.pinraised`)).toHaveCount(1);
  await expect(page.locator(`[data-rid="${S}"].pinpaper`)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.pinraised, .pinpaper')).toHaveCount(0);
  await page.mouse.up();
  expect((await pin()).card).toBe('00000003');
  await expect(page.locator('.pinline')).toHaveCount(0);
  // R570: a click takes the tack out; the sticky lies loose where it is.
  t = await tack();
  await page.mouse.click(t.x, t.y);
  await expect.poll(pin).toBeUndefined();
  expect((await rec(page, S)).place).toEqual(lay);
  await expect(page.locator(`[data-rid="${S}"]`)).not.toHaveClass(/\btacked\b/);
});

test("paper pinned to a gathered card keeps its place on the card through the pool's drag", async ({ page }) => {
  const { fromDesk } = await import('./page.ts');
  await open(page);
  const SAMCARD = `.obj.card[data-rid="${SAM}"]`, box = async (sel: string) => (await page.locator(sel).boundingBox())!;
  expect((await rec(page, SAM)).gathered).toBe(true);
  const c = await box(SAMCARD);
  await fromDesk(page, 'sticky', c.x + c.width / 2, c.y + c.height / 2 + 40);
  const S = await page.evaluate(async () => (await (window as any).hollow.ready).store.game.all().filter(([, r]: any) => r.kind === 'sticky').at(-1)[0] as string);
  await expect.poll(async () => (await rec(page, S))?.pin?.card).toBe('00000001');
  // The paper dragged a little on its card, then the pool carried: the paper keeps its place on the card.
  const p = await box(`[data-rid="${S}"] .text`);
  await dragFromTo(page, p.x + 20, p.y + 20, p.x + 60, p.y + 40);
  const rel = async () => { const s = await box(`[data-rid="${S}"]`), k = await box(SAMCARD); return [Math.round(s.x - k.x), Math.round(s.y - k.y)]; };
  const on = await rel();
  const pool = await box(`${SPOOL} .slots`);
  await page.mouse.move(pool.x + 10, pool.y + 10);
  await page.mouse.down();
  await page.mouse.move(pool.x + 40, pool.y + 30, { steps: 5 });
  // R575: mid-carry, no jump.
  const mid = await rel();
  // (Carried pieces are drawn 3% larger, which shifts their boxes a few pixels; the jump was 16 or more.)
  expect(Math.abs(mid[0]! - on[0]!)).toBeLessThan(8);
  expect(Math.abs(mid[1]! - on[1]!)).toBeLessThan(8);
  await page.mouse.move(pool.x + 70, pool.y + 50, { steps: 5 });
  await page.mouse.up();
  // R574: let go, the card's record and the paper's moved with the pool: nothing left behind.
  await expect.poll(async () => { const r = await rel(); return Math.abs(r[0]! - on[0]!) < 3 && Math.abs(r[1]! - on[1]!) < 3; }).toBe(true);
  const sam = await rec(page, SAM), s = await rec(page, S), drawn = await page.evaluate(sel => { const e = document.querySelector(sel) as HTMLElement; return [parseFloat(e.style.left), parseFloat(e.style.top)]; }, SAMCARD);
  expect([sam.card.x, sam.card.y]).toEqual(drawn);
  expect([s.place.x - sam.card.x, s.place.y - sam.card.y]).toEqual([s.pin.dx, s.pin.dy]);
});

test("Gather, and a drawer that grows, bring a gathered card's paper with it", async ({ page }) => {
  const { fromDesk } = await import('./page.ts');
  await open(page);
  const SAMCARD = `.obj.card[data-rid="${SAM}"]`, box = async (sel: string) => (await page.locator(sel).boundingBox())!;
  const c = await box(SAMCARD);
  await fromDesk(page, 'sticky', c.x + c.width / 2, c.y + c.height / 2 + 40);
  const S = await page.evaluate(async () => (await (window as any).hollow.ready).store.game.all().filter(([, r]: any) => r.kind === 'sticky').at(-1)[0] as string);
  await expect.poll(async () => (await rec(page, S))?.pin?.card).toBe('00000001');
  const rel = async () => { const s = await box(`[data-rid="${S}"]`), k = await box(SAMCARD); return [Math.round(s.x - k.x), Math.round(s.y - k.y)]; };
  const near = (a: number[], b: number[]) => Math.abs(a[0]! - b[0]!) < 3 && Math.abs(a[1]! - b[1]!) < 3;
  // The card dragged off its pool, its sticky with it; then Gather.
  const k = await box(SAMCARD);
  await dragFromTo(page, k.x + 6, k.y + 6, k.x + 206, k.y + 46);
  await expect.poll(async () => (await rec(page, SAM)).gathered).toBe(false);
  const on = await rel();
  await page.locator(`${SPOOL} .gather`).click();
  // R576: the card goes back under its pool, its record with it, and its sticky by the same delta.
  await expect.poll(async () => (await rec(page, SAM)).gathered).toBe(true);
  await expect.poll(async () => near(await rel(), on)).toBe(true);
  const recs = async () => { const sam = await rec(page, SAM), s = await rec(page, S); return [s.place.x - sam.card.x - s.pin.dx, s.place.y - sam.card.y - s.pin.dy]; };
  await expect.poll(recs).toEqual([0, 0]);
  // A drawer that grows moves the gathered card down, and its sticky with it.
  const y0 = (await rec(page, SAM)).card.y;
  await hook(page, h => h.store.game.change((w: any) => {
    for (let i = 0; i < 8; i++) w.put(`o:c00000${10 + i}`, { kind: 'influence', oid: `c00000${10 + i}`, home: '00000001', where: 'drawer', n: 100 + i, name: `Grown ${i}`, sign: 1, points: 2, used: false, crit: false });
  }));
  await expect.poll(async () => (await rec(page, SAM)).card.y).toBeGreaterThan(y0);
  await expect.poll(async () => near(await rel(), on)).toBe(true);
  await expect.poll(recs).toEqual([0, 0]);
});
