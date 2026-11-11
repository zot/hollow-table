// Two players: a catch-up for one isn't a missed batch for the other (it used to be, so with two or
// more players each one's catch-up set off the other's, and they could ask without end). Counts
// the syncs on the topic while both players play, and checks both tables match the GM's.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const ctx = [await b.newContext(), await b.newContext(), await b.newContext()];
  const [gm, dana, ann] = await Promise.all(ctx.map(c => c.newPage()));
  const errs = [];
  for (const [p, n] of [[gm, 'gm'], [dana, 'Dana'], [ann, 'Ann']]) { await p.setViewportSize({ width: 1600, height: 950 }); p.on('pageerror', e => errs.push(n + ': ' + e.message)); p.on('dialog', d => d.accept(n)); }
  const log = (k, v) => console.log(k.padEnd(52), JSON.stringify(v));
  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  await gm.click('#folks .invite'); await gm.waitForTimeout(2500);
  const invite = await gm.evaluate(() => presence.inviteUrl());
  // count the batches the GM's page sends (a catch-up storm would show as many more than the changes)
  await gm.evaluate(() => { const s = presence.send; presence.send = (k, e) => { if (k === 'recs') window.sent = (window.sent || 0) + 1; return s(k, e); }; });
  await dana.goto(invite); await dana.waitForTimeout(4000);
  await ann.goto(invite); await ann.waitForTimeout(4000);
  const before = await gm.evaluate(() => window.sent);
  for (let i = 0; i < 5; i++) {
    await gm.evaluate(i => { const x = document.querySelector('#world > .sticky'); x.style.left = (300 + 40 * i) + 'px'; }, i);
    await gm.waitForTimeout(1500);
  }
  await gm.waitForTimeout(6000);
  const after = await gm.evaluate(() => window.sent);
  const at = p => p.evaluate(() => document.querySelector('#world > .sticky').style.left);
  log('5 GM changes, two players: batch parts sent', after - before);
  log('  both players synced, same sticky', { dana: await dana.evaluate(() => tableNet.synced), ann: await ann.evaluate(() => tableNet.synced), gm: await at(gm), danaAt: await at(dana), annAt: await at(ann) });
  log('errors', errs);
  for (const c of ctx) await c.close(); await b.close();
})();
