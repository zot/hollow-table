// The wire (11-11): two pages find each other through Trystero, prove who they are, and the table
// syncs. LOOPBACK=1 sets the test-only flag for pages in one headless browser that can't resolve
// each other's mDNS host names.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const gmCtx = await b.newContext(), plCtx = await b.newContext();
  const gm = await gmCtx.newPage(), pl = await plCtx.newPage();
  const errs = [];
  for (const [p, who] of [[gm, 'gm'], [pl, 'player']]) {
    await p.setViewportSize({ width: 1600, height: 950 });
    p.on('pageerror', e => errs.push(who + ': ' + e.message));
    p.on('console', m => m.type() === 'error' && errs.push(who + ' console: ' + m.text().slice(0, 160)));
    p.on('dialog', d => d.accept('Dana'));
  }
  const log = (k, v) => console.log(k.padEnd(44), JSON.stringify(v));
  if (process.env.LOOPBACK) for (const p of [gm, pl]) await p.addInitScript(() => localStorage.setItem('glimmer.loopback', '1'));
  const t0 = Date.now();
  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  await gm.click('#folks .invite');
  await gm.waitForFunction(() => presence.status === 'live', null, { timeout: 20000 }).catch(() => {});
  log('GM: status, id', await gm.evaluate(() => [presence.status, presence.myId, document.querySelector('#folks .me')?.title]));
  const invite = await gm.evaluate(() => presence.inviteUrl());
  log('invite', invite.replace(/room=[^&]+/, 'room=…'));
  await pl.goto(invite);
  const ok = await pl.waitForFunction(() => tableNet.synced, null, { timeout: 30000 }).then(() => true, () => false);
  log('player synced', { ok, secs: ((Date.now() - t0) / 1000).toFixed(1) });
  log('player sees', await pl.evaluate(() => presence.members.map(m => [m.name, m.role, m.from])));
  log('GM sees', await gm.evaluate(() => presence.members.map(m => [m.name, m.role, m.from, tableClaim(m)])));
  log('GM claims', await gm.evaluate(() => book.claims));
  log('player\'s own id', await pl.evaluate(() => presence.myId));
  log('errors', errs);
  await gmCtx.close(); await plCtx.close(); await b.close();
})();
