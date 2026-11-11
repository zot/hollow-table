// The roll row is live: action + Bonus pool, recomputed on pool changes, with hand adjustments kept.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const box = async sel => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(60); };
  const log = (k, v) => console.log(k.padEnd(48), JSON.stringify(v));
  const row = () => p.evaluate(() => { const r = document.getElementById('roller'); return `${document.querySelector('#rollinfo .base').textContent} | ${r.querySelectorAll('.ydice .die').length}d ${r.querySelector('.bonus').textContent}`; });
  const chip = (c, v) => box(`.supply.chip.${c}[data-v="${v}"]`);
  const bonus = () => box('#mat1 [data-pool=Bonus]');
  await p.selectOption('#me', 'Player 1');
  await p.click('.card[data-mat="mat1"] .actbtn[data-label="Infer"]');
  log('Sam clicks Infer (4, +2), empty Bonus pool', await row());
  await dragTo(await chip('g', '2'), await bonus());
  log('+2 chip in Bonus pool: 4 points → 1d +1', await row());
  await dragTo(await chip('g', '4'), await bonus());
  log('+4 chip too (best is 4): 6 points → 2d +0', await row());
  await p.click('#roller .ydice');
  log('hand: one more Yellow', await row());
  await dragTo(await box('#mat1 [data-pool=Bonus] .chip[data-v="4"]'), { x: 700, y: 40 });
  log('remove the 4: back to 2 → 1d+1, plus hand 1d', await row());
  await dragTo(await chip('r', '4'), await bonus());
  log('a −4 too: pool −2 → total 0, plus hand', await row());
  // Total Influence: Base + Main + Edge + Bias
  await dragTo(await chip('g', '4'), await box('#mat1 [data-pool=Main]'));
  await dragTo(await chip('g', '2'), await box('#mat1 [data-pool=Edge]'));
  await dragTo(await chip('r', '2'), await box('#mat1 [data-pool=Bias]'));
  await dragTo(await chip('r', '6'), await box('#mat1 [data-pool=Stagger]'));
  log('Main +4, Edge +2, Bias −2, Stagger −6: 4 → 8', [await row(), await p.evaluate(() => document.querySelector('#rollinfo .base').title)]);
  await p.click('#mat1 [data-pool=Bonus] .neg .chip');
  log('click raises the −4 to −6: pool −4, no dice', await row());
  await p.click('.card[data-mat="mat1"] .actbtn[data-label="Mental Atk / Req"]');
  log('new action resets the hand adjustment', await row());
  // a card written 2d+3 stays as written with an empty pool
  await p.selectOption('#me', 'Player 2');
  await p.click('.card[data-mat="mat2"] .col >> nth=1'); await p.keyboard.press('Control+End'); await p.keyboard.press('Enter'); await p.keyboard.type('Big Lie: 5, 2d+3'); await p.mouse.click(700, 900);
  await p.click('.card[data-mat="mat2"] .actbtn[data-label="Big Lie"]');
  log('Beauford "Big Lie: 5, 2d+3", empty pool', await row());
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
