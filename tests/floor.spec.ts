// CRC: crc-Gesture.md | Test: test-Table.md | R12, R13, R14, R17
// The quality floor: a long press does what shift-click does; focus shows; reduced motion stills the
// page; the bar's text doesn't select.
import { expect, test, type Page } from '@playwright/test';
import { at, open, rec } from './page.ts';

const DEVREUX = 'o:00000003', DPOOL = `.obj.pool[data-rid="${DEVREUX}"]`;

/** Presses and holds without moving, long enough to count as a long press (Gesture.LONG_MS). */
async function longPress(page: Page, selector: string) {
  const p = await at(page, selector, 6, 6);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => { await open(page); });

test('a long press does what shift-click does', async ({ page }) => {
  // R14, R73: Yellows and the Success Bonus: click adds, a long press takes away.
  await page.locator(`${DPOOL} .die-own`).click();
  const roller = `${DPOOL} .roller`;
  const ys = page.locator(`${roller} .ydice .rrdie.Y`), y0 = await ys.count();
  await page.locator(`${roller} .ydice`).click();
  await page.locator(`${roller} .ydice`).click();
  await expect(ys).toHaveCount(y0 + 2);
  await longPress(page, `${roller} .ydice`);
  await expect(ys).toHaveCount(y0 + 1);
  await page.locator(`${roller} .bonus`).click();
  await expect(page.locator(`${roller} .bonus`)).toHaveText('+1');
  await longPress(page, `${roller} .bonus`);
  await expect(page.locator(`${roller} .bonus`)).toHaveText('+0');
  // R41: a long press on a wide slot's empty space adds a loose −1, as shift-click does.
  const chips = async () => (await page.evaluate(async () => (await (window as any).hollow.ready).store.game.all()))
    .filter(([, r]: [string, any]) => r.kind === 'chip' && r.where?.slot === '00000003' && r.where.name === 'edge');
  await longPress(page, `${DPOOL} .slot-edge`);
  await expect.poll(async () => (await chips()).map(([, c]: [string, any]) => c.sign)).toEqual([-1]);
  // R125: a long press on the graveyard's name arms it, as shift-click does.
  await page.locator('#boothill').click();
  const before = await rec(page, 'yards');
  await longPress(page, '#graves .yname');
  expect(await rec(page, 'yards')).toEqual(before);   // nothing to delete in an empty graveyard
});

test('focus shows', async ({ page }) => {
  // R12: tabbing reaches the bar's controls, each with a visible focus outline.
  const seen: string[] = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      if (!e || e === document.body) return null;
      const s = getComputedStyle(e);
      if (e.isContentEditable) return 'writing';   // a writing surface shows its caret
      return { what: e.id || e.className, outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, deco: s.textDecorationLine !== 'none' };
    });
    if (!f || f === 'writing') continue;
    expect(f.outline || f.deco, `${f.what} shows focus`).toBe(true);
    seen.push(f.what);
  }
  expect(seen).toEqual(expect.arrayContaining(['boothill', 'ledgerbtn']));
});

test('reduced motion stills the page', async ({ browser }) => {
  // R13: with reduced motion asked for, nothing transitions or animates.
  const ctx = await browser.newContext({ baseURL: 'http://127.0.0.1:8781/', reducedMotion: 'reduce', viewport: { width: 1400, height: 840 } });
  const page = await ctx.newPage();
  await open(page);
  const moving = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('*')].filter(e => {
    const s = getComputedStyle(e), n = (v: string) => v.split(',').some(x => parseFloat(x) > 0);
    return n(s.transitionDuration) || (s.animationName !== 'none' && n(s.animationDuration));
  }).map(e => e.id || `${e.tagName.toLowerCase()}.${e.className}`));
  expect([...new Set(moving)]).toEqual([]);
  await ctx.close();
});

test("the bar's text doesn't select", async ({ page }) => {
  // R17: the bar, the register and the pools' labels are not text to select (the build stamp is).
  const selectable = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('#bar *, .pool .label, .pool .hd, .register *')]
    .filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim()))
    // (Firefox reports "auto" under a parent that says "none", and still won't select it.)
    .filter(e => { if (e.closest('.stamp')) return false; for (let a: HTMLElement | null = e; a; a = a.parentElement) if (getComputedStyle(a).userSelect === 'none') return false; return true; })
    .map(e => e.className || e.tagName));
  expect(selectable).toEqual([]);
});
