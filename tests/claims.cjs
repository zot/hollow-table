// Who's who, and the GM's database has the final say.
// 1. A name another daemon holds: the GM's book says "Dana" belongs to another browser, so this
//    Dana is nobody: told so, shown only what anyone sees, her changes refused, the GM's strip marks
//    her. The GM hands Dana over; then Sam's sheet arrives and her changes are taken.
//    (The other browser is a made-up identity id, net/ident.js.)
// 2. A stale copy: Dana's page closes; the GM buries the sticky and closes too. Dana opens her copy
//    from before, drags the sticky and buries the reference card. The GM's page comes back: the
//    sticky is buried again (re-entombed), and her Boot Hill change, made from a copy that missed
//    the GM's, is refused whole (the card comes back to her table).
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const gmCtx = await b.newContext(), plCtx = await b.newContext();
  let gm = await gmCtx.newPage(), pl = await plCtx.newPage();
  const errs = [];
  const setup = async (p, who) => { await p.setViewportSize({ width: 1600, height: 950 }); p.on('pageerror', e => errs.push(who + ': ' + e.message)); p.on('dialog', d => d.type() === 'prompt' ? d.accept('Dana') : d.accept()); };
  await setup(gm, 'gm'); await setup(pl, 'player');
  const log = (k, v) => console.log(k.padEnd(52), JSON.stringify(v));
  const sticky = p => p.evaluate(() => document.querySelector('#world > .sticky .txt')?.textContent ?? '(none)');
  const write = (p, t) => p.evaluate(t => { const x = document.querySelector('#world > .sticky .txt'); x.focus(); x.textContent = t; x.blur(); }, t);
  const card = p => p.evaluate(() => document.querySelector('.card[data-mat="mat1"]').textContent.replace(/\s+/g, ' ').trim().slice(0, 30));

  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  await gm.click('#folks .invite'); await gm.waitForTimeout(2500);
  const invite = await gm.evaluate(() => presence.inviteUrl());
  await gm.evaluate(() => { book.claims.Dana = 'SomeoneElsesBrowser0'; document.getElementById('mat1').dataset.owner = 'Dana'; applyVisibility(); saveSoon(); });
  await gm.waitForTimeout(800);

  // 1. Dana from the wrong computer
  await pl.goto(invite); await pl.waitForTimeout(6000);
  log('Dana joins from "another computer"', {
    told: await pl.evaluate(() => !!document.querySelector('#folks .folk.warn')),
    gmStripMarks: await gm.evaluate(() => [...document.querySelectorAll('#folks .folk.warn')].map(c => c.textContent)),
    samSheet: await card(pl) });
  const was = await sticky(gm);
  await write(pl, 'an impostor was here'); await pl.waitForTimeout(3000);
  log('  her change is refused', { gm: (await sticky(gm)) === was, player: (await sticky(pl)) === was });
  await gm.click('#folks .folk.warn'); await gm.waitForTimeout(3000);
  log('GM hands Dana over', { told: await pl.evaluate(() => !!document.querySelector('#folks .folk.warn')), samSheet: await card(pl),
    claim: await gm.evaluate(() => book.claims.Dana === presence.members.find(m => m.name === 'Dana')?.from) });
  await write(pl, 'Dana, for real'); await pl.waitForTimeout(2500);
  log('  her change is taken', await sticky(gm));

  // 2. A stale copy
  await pl.close(); await gm.waitForTimeout(1000);
  const old = await gm.evaluate(() => { const x = document.querySelector('#world > .sticky'); bury(x); return x.dataset.oid; });
  await gm.waitForTimeout(1500);
  log('Dana gone; the GM buries the sticky', { gm: await sticky(gm), graves: await gm.evaluate(() => yards.flatMap(y => y.items.map(i => i.name))), tomb: await gm.evaluate(() => Object.keys(book.tomb).length) });
  await gm.close(); await new Promise(r => setTimeout(r, 1000));

  pl = await plCtx.newPage(); await setup(pl, 'player'); await pl.goto(invite); await pl.waitForTimeout(1500);
  log('Dana opens her copy from before', { sticky: await sticky(pl), seen: await pl.evaluate(() => tableNet.seen) });
  const sb = await pl.locator('#world > .sticky').boundingBox();
  await pl.mouse.move(sb.x + 10, sb.y + 10); await pl.mouse.down();
  for (let i = 1; i <= 8; i++) { await pl.mouse.move(sb.x + 10 + 15 * i, sb.y + 10 + 10 * i); await pl.waitForTimeout(30); }
  await pl.mouse.up();
  const ref = await pl.evaluate(() => { const r = document.querySelector('#world > .refcard'); bury(r); saveSoon(); return r.dataset.oid; });
  await pl.waitForTimeout(800);
  const fresh = await pl.evaluate(() => { const n = makeSticky(300, 640, 'new while the GM was away'); n.dataset.oid = newOid(); return n.dataset.oid; });
  await pl.waitForTimeout(800);
  log('  drags the sticky, buries the card, adds a sticky', await pl.evaluate(() => [...tableNet.pending.keys()]));

  gm = await gmCtx.newPage(); await setup(gm, 'gm'); await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(12000);
  const where = (p, oid) => p.evaluate(o => ({ table: !!objEl(o), hill: yards.some(y => y.items.some(i => i.els.some(e => e.dataset.oid === o))) }), oid);
  log('GM\'s page back: the sticky stays buried', { gm: await where(gm, old), player: await where(pl, old) });
  log('  the stale burial is refused: the card is back', { gm: await where(gm, ref), player: await where(pl, ref) });
  log('  her new sticky is kept', { gm: await where(gm, fresh), player: await where(pl, fresh) });
  log('  Dana\'s page', await pl.evaluate(() => ({ pending: [...tableNet.pending.keys()], seen: tableNet.seen, synced: tableNet.synced })));
  log('errors', errs);
  await gmCtx.close(); await plCtx.close(); await b.close();
})();
