// Rolls on the shared tape: each page's rolls print on the others' tapes as the TABLE VIEW (no Total
// Influence, base, or Difference); your own receipt gets a check mark when the roll comes back through
// the daemon; a skipped roll number prints a "didn't arrive" note; hostile rolls are text or dropped.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const out = process.argv[2] || '/tmp';
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const gmCtx = await b.newContext(), plCtx = await b.newContext();
  const gm = await gmCtx.newPage(), pl = await plCtx.newPage();
  for (const p of [gm, pl]) await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; gm.on('pageerror', e => errs.push('gm: ' + e.message)); pl.on('pageerror', e => errs.push('player: ' + e.message));
  pl.on('dialog', d => d.accept('Dana'));
  const log = (k, v) => console.log(k.padEnd(46), JSON.stringify(v));
  const tape = p => p.evaluate(() => [...document.querySelectorAll('#tape .receipt')].map(r => ({
    who: r.querySelector('.who')?.textContent, by: r.querySelector('.by')?.textContent, sent: r.classList.contains('sent'),
    text: r.innerText.replace(/\s+/g, ' ').slice(0, 400), imgs: r.querySelectorAll('img').length })));

  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  await gm.click('#folks .invite'); await gm.waitForTimeout(2500);
  await pl.goto(await gm.evaluate(() => presence.inviteUrl())); await pl.waitForTimeout(3500);
  log('both live', [await gm.evaluate(() => presence.status), await pl.evaluate(() => presence.status)]);

  // The GM rolls Devreux's Attack against Sam
  await gm.evaluate(() => { useAction(document.querySelector('.card[data-mat="mat3"] .actbtn')); act.vs = { mat: 'mat1', kind: 'mental', name: 'Sam' }; refreshRoll(); });
  await gm.click('#roll'); await gm.waitForTimeout(2000);
  const g = (await tape(gm))[0], d = (await tape(pl))[0];
  log('GM\'s own receipt: full, with the check', { who: g.who, sent: g.sent, hasTotal: /Total Influence/.test(g.text) });
  log('Dana\'s tape: the table view', d);
  log('  no hidden numbers', !/Total Influence|base|Difference|\(\+|\(−/.test(d.text));

  // Behind the screen: the GM's private roll stays on the GM's tape; players never see the switch
  // Sam is Dana's on both tables (her rolls now go through the GM's page, which checks)
  for (const p of [gm, pl]) await p.evaluate(() => { document.getElementById('mat1').dataset.owner = 'Dana'; applyVisibility(); });
  const before = (await tape(pl)).length;
  await gm.click('#roller .priv');
  log('switch reads', await gm.evaluate(() => document.querySelector('#roller .priv').textContent));
  await gm.click('#roll'); await gm.waitForTimeout(2000);
  log('GM: private receipt, no check', (({ who, sent, text }) => ({ who, sent, note: /Private/.test(text) }))((await tape(gm))[0]));
  log('Dana: nothing new', (await tape(pl)).length === before);
  await gm.reload(); await gm.waitForTimeout(2500);
  log('the switch is in the GM\'s seat: still private', await gm.evaluate(() => privateRoll));
  await gm.evaluate(() => { privateRoll = false; renderRoller(); });

  // Dana rolls (her page gives her Sam), and the GM gets it
  await pl.click('#mat1 .die-own');
  log('  Dana\'s row has no private switch', await pl.evaluate(() => document.querySelector('#roller .priv').hidden)); await pl.click('#roll'); await pl.waitForTimeout(2000);
  log('Dana\'s receipt: sent', (await tape(pl))[0].sent);
  log('GM\'s tape: Dana\'s roll', (await tape(gm))[0]);

  // Loss: the GM's page skips two roll numbers; Dana's tape says so
  await gm.evaluate(() => presence._send('roll', { roll: { rid: 'skiptest', character: 'Devreux', action: '', vs: '', row: 'White', dice: [{ c: 'W', v: 4 }, { c: 'B', v: 3 }],
    resolution: 'White 4', level: '3', outcome: 'Success 3, Minor', at: new Date().toISOString(), rseq: +sessionStorage.getItem('glimmer.rseq') + 3 } }));
  await gm.waitForTimeout(1500);
  log('a skipped number: noted, then the roll', (await tape(pl)).slice(0, 2).map(r => r.who));

  // Hostile: markup in a name stays text; a seventh face is refused
  await gm.evaluate(() => presence._send('roll', { roll: { rid: 'evil1', character: '<img src=x onerror=alert(1)>', action: '', vs: '', row: 'White', dice: [{ c: 'W', v: 4 }],
    resolution: '', level: '', outcome: 'x', at: new Date().toISOString(), rseq: 999 } }));
  await gm.evaluate(() => presence._send('roll', { roll: { rid: 'evil2', character: 'Bad die', action: '', vs: '', row: 'White', dice: [{ c: 'W', v: 7 }],
    resolution: '', level: '', outcome: 'x', at: new Date().toISOString(), rseq: 1000 } }));
  await gm.waitForTimeout(1500);
  const t = await tape(pl);
  log('markup arrives as text, no <img>', { who: t[0].who, imgs: t.reduce((n, r) => n + r.imgs, 0) });
  log('a die showing 7 is dropped', !t.some(r => r.who === 'Bad die'));
  await pl.screenshot({ path: out + '/tablerolls.png' });
  log('errors', errs);
  await gmCtx.close(); await plCtx.close(); await b.close();
})();
