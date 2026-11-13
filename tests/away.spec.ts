// CRC: crc-Claims.md | Test: test-Network.md | R166, R167, R168, R189, R190, R296, R297
// Names are held by browsers: a second browser coming as Dana is nobody until the GM hands the name
// over. And a page that was away can't bring back what the table has since buried.
import { expect, test, type Page } from '@playwright/test';
import { gmTable, hook, join, open, synced } from './page.ts';

const SAM = 'o:00000001', BEAUFORD = 'o:00000002', STICKY = 'o:00000008';
const recOf = (page: Page, rid: string) => page.evaluate(async rid => (await (window as any).hollow.ready).store.game.get(rid), rid);
const give = (gm: Page, rid: string, owner: string) => gm.evaluate(async ([rid, owner]) => {
  const g = (await (window as any).hollow.ready).store.game, c = g.get(rid);
  g.change((w: any) => w.put(rid, { ...c, owner }));
}, [rid, owner]);
const moveBy = (page: Page, rid: string, dx: number) => page.evaluate(async ([rid, dx]) => {
  const g = (await (window as any).hollow.ready).store.game, r = g.get(rid);
  g.change((w: any) => w.put(rid, r.kind === 'character' ? { ...r, pool: { ...r.pool, x: r.pool.x + dx } } : { ...r, place: { ...r.place, x: r.place.x + dx } }));
}, [rid, dx] as const);

test('names held by browsers', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);
  await give(gm, SAM, 'Dana');
  await expect.poll(async () => (await recOf(dana, SAM)).front, { timeout: 15_000 }).toContain('Glimmersense');

  // A second browser comes as Dana: told it isn't hers, Sam's sheet blank, its change refused.
  const imp = await join(browser, invite, 'Dana', gm);
  await expect(imp.locator('#bar .folks .tag.you')).toHaveText('not yours');
  expect((await recOf(imp, SAM)).front).not.toContain('Glimmersense');
  const sam = await recOf(gm, SAM);
  await moveBy(imp, SAM, 150);
  await expect.poll(async () => (await recOf(imp, SAM)).pool.x, { timeout: 15_000 }).toBe(sam.pool.x);
  expect((await recOf(gm, SAM)).pool).toEqual(sam.pool);

  // The GM hands Dana over (its dialog answered yes): the new page gets the sheet and its change is
  // taken; the old page is now the one told (R296).
  await gm.locator('#bar .folks .tag.warn').click();
  await expect(imp.locator('#bar .folks .tag.you')).toHaveText('Dana', { timeout: 15_000 });
  await expect(dana.locator('#bar .folks .tag.you')).toHaveText('not yours', { timeout: 15_000 });
  await expect.poll(async () => (await recOf(imp, SAM)).front, { timeout: 15_000 }).toContain('Glimmersense');
  await moveBy(imp, SAM, 150);
  await expect.poll(async () => (await recOf(gm, SAM)).pool.x, { timeout: 15_000 }).toBe(sam.pool.x + 150);
  await imp.context().close();
  await gm.locator('#bar .folks .tag', { hasText: 'Dana' }).first().waitFor();
});

test('a page that was away cannot bring back what was buried', async ({ browser }) => {
  const { gm, invite } = await gmTable(browser);
  const dana = await join(browser, invite, 'Dana', gm);

  // Dana's page leaves the room; meanwhile the GM buries the big sticky.
  await hook(dana, h => h.wire.leave());
  const sticky = gm.locator(`[data-rid="${STICKY}"]`), s = (await sticky.boundingBox())!, bar = (await gm.locator('#bar').boundingBox())!;
  await gm.mouse.move(s.x + 6, s.y + 6);
  await gm.mouse.down();
  await gm.mouse.move(bar.x + 400, bar.y + 30, { steps: 10 });
  await gm.mouse.up();
  expect(await recOf(gm, STICKY)).toBeUndefined();

  // Away, Dana drags the sticky the GM buried, puts Beauford away, and adds a sticky of her own.
  await moveBy(dana, STICKY, 50);
  await dana.evaluate(async ([b]) => {
    const g = (await (window as any).hollow.ready).store.game;
    g.change((w: any) => {
      w.del(b);
      w.put('o:0000da1a', { kind: 'sticky', oid: '0000da1a', place: { x: 300, y: 300, z: 9, tilt: 0 }, text: 'Dana away' });
    });
  }, [BEAUFORD]);
  await dana.waitForTimeout(800);   // saved, so the reload shows the copy as she left it

  // Back: the GM's sticky stays buried, Beauford is back on both tables, Dana's sticky is kept.
  await open(dana, invite);
  await expect.poll(async () => (await recOf(gm, 'o:0000da1a'))?.text, { timeout: 20_000 }).toBe('Dana away');
  await synced(dana, gm);
  expect(await recOf(gm, STICKY)).toBeUndefined();
  expect(await recOf(dana, STICKY)).toBeUndefined();
  expect(await recOf(gm, BEAUFORD)).toBeTruthy();
  expect(await recOf(dana, BEAUFORD)).toBeTruthy();
  await expect.poll(() => hook(dana, h => h.copy.pending().length), { timeout: 20_000 }).toBe(0);
});
