// The action in use is highlighted on its card; the highlight follows, survives edits, and clears.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const log = (k, v) => console.log(k.padEnd(44), JSON.stringify(v));
  const on = () => p.evaluate(() => [...document.querySelectorAll('.actline.on')].map(l => l.textContent.trim()));
  await p.selectOption('#me', 'Player 1');
  log('nothing chosen', await on());
  await p.click('.card[data-mat="mat1"] .actbtn[data-label="Infer"]');
  log('Infer chosen', await on());
  await p.click('.card[data-mat="mat1"] .actbtn[data-label="Psych Atk / Req"]');
  log('Psych Atk chosen: highlight moves', await on());
  await p.click('.card[data-mat="mat1"] .col >> nth=1'); await p.keyboard.press('Control+End'); await p.keyboard.type(' (edited)'); await p.mouse.click(700, 900);
  log('after editing the card: still there', await on());
  await p.click('#rollinfo .base');
  log('Base cleared: gone', await on());
  await p.click('.card[data-mat="mat1"] .actbtn[data-label="Shoot"]');
  await p.selectOption('#me', 'Player 2');
  log('roll row leaves Sam (P2 view): gone', await on());
  await p.selectOption('#me', 'Player 1'); await p.click('.card[data-mat="mat1"] .actbtn[data-label="Shoot"]');
  const c = await p.locator('.card[data-mat="mat1"]').boundingBox();
  await p.screenshot({ path: process.argv[2] + '/hl.png', clip: { x: c.x, y: c.y, width: c.width, height: c.height } });
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
