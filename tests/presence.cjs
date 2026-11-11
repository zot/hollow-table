// Presence: the GM opens the table, a player joins by the invite link, each sees the other live,
// and a player who leaves drops off. Over Trystero (net/wire.js): needs the internet for the
// signalling relays; the pages connect to each other directly.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const out = process.argv[2] || '/tmp';
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const gmCtx = await b.newContext(), plCtx = await b.newContext();
  const gm = await gmCtx.newPage(); await gm.setViewportSize({ width: 1600, height: 950 });
  const errs = []; gm.on('pageerror', e => errs.push('gm: ' + e.message));
  const log = (k, v) => console.log(k.padEnd(44), JSON.stringify(v));
  const who = pg => pg.evaluate(() => ({ status: presence.status, room: presence.room && presence.room.slice(0, 12) + '…',
    strip: [...document.querySelectorAll('#folks .folk')].map(f => f.textContent + (f.classList.contains('live') ? '●' : '○')) }));
  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  log('GM, no room yet', await who(gm));
  await gm.click('#folks .invite'); await gm.waitForTimeout(3000);
  log('GM opens the table', await who(gm));
  const invite = await gm.evaluate(() => presence.inviteUrl());
  if ((await who(gm)).status !== 'live') { log('not live; offline detail', await gm.evaluate(() => document.querySelector('#folks .warn')?.title)); await gm.screenshot({ path: out + '/presence.png' }); log('errors', errs); process.exit(0); }

  const pl = await plCtx.newPage(); await pl.setViewportSize({ width: 1600, height: 950 });
  pl.on('pageerror', e => errs.push('player: ' + e.message));
  pl.on('dialog', d => d.accept('Dana'));                 // the name prompt
  await pl.goto(invite); await pl.waitForTimeout(4000);
  log('player joins as Dana', await who(pl));
  log('GM sees Dana', await who(gm));
  log('GM\'s "You are" offers Dana', await gm.evaluate(() => [...document.getElementById('me').options].map(o => o.value)));
  log('player has no chooser', await pl.evaluate(() => document.querySelector('label.me').hidden));
  await gm.screenshot({ path: out + '/presence.png', clip: { x: 0, y: 0, width: 1600, height: 95 } });

  await gm.reload(); await gm.waitForTimeout(4000);
  log('GM reloads: same room, still GM', await who(gm));
  await pl.close(); await gm.waitForTimeout(1500);
  log('Dana leaves (bye)', await who(gm));
  log('errors', errs);
  await gmCtx.close(); await plCtx.close(); await b.close();
})();
