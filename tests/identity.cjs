// Only a real GM sees the "You are" chooser; a player's page is fixed to that player.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const log = (k, v) => console.log(k.padEnd(40), JSON.stringify(v));
  const state = () => p.evaluate(() => ({ chooser: !document.querySelector('.me').hidden, me: me(), secret: [...document.querySelectorAll('.mat.secret')].map(m => m.querySelector('.who').textContent) }));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(800);
  log('GM page', await state());
  await p.selectOption('#me', 'Player 1');
  log('GM viewing as Player 1: chooser stays', await state());
  await p.goto('http://127.0.0.1:8765/index.html?as=Player%201&' + Date.now()); await p.waitForTimeout(800);
  log('Player 1\'s page', await state());
  await p.goto('http://127.0.0.1:8765/index.html?as=Player%202&' + Date.now()); await p.waitForTimeout(800);
  log('Player 2\'s page', await state());
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
