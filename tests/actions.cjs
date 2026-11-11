// Action lines on cards: parsing, die buttons, and filling in the roll row.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const log = (k, v) => console.log(k.padEnd(46), JSON.stringify(v));
  const cases = ['Mental Atk / Req: 5, 2d+3', 'Mental Atk / Req: 2, +2', 'Mental Atk / Req: 5, 1d', 'Tricky -Min: 5, 2d', 'Shoot: 4, +2 (unfr, x 2)',
    'Attack: 4 (Suasion, Charm), +1', 'Attack: -1, -1', 'With Finesse: 4, 1d+1', 'Attack: 1, +0', 'Defend: mental 2 / psych 4', 'Defend: 6 / 5',
    'Sparked: 46  Grains: 14', 'Slots: Mild, Min ×3, Sig, Maj', 'Infer: 4, +2'];
  for (const c of cases) log(c, await p.evaluate(c => parseAction(c), c));
  log('die buttons on Sam / Beauford / Devreux', await p.evaluate(() => ['mat1', 'mat2', 'mat3'].map(m => [...document.querySelectorAll(`.card[data-mat="${m}"] .actbtn`)].map(b => b.dataset.label))));
  const row = () => p.evaluate(() => { const r = document.getElementById('roller'); return { at: r.closest('.mat')?.id || 'nowhere', base: document.querySelector('#rollinfo .base').textContent, y: r.querySelectorAll('.ydice .die').length, bonus: r.querySelector('.bonus').textContent }; });
  await p.click('.card[data-mat="mat2"] .actbtn[data-label="Tricky -Min"]');
  log('GM clicks Beauford\'s Tricky line (P2\'s)', await row());
  await p.selectOption('#me', 'Player 2');
  await p.click('.card[data-mat="mat2"] .actbtn[data-label="Tricky -Min"]');
  log('P2 clicks it: row docks and fills in', await row());
  await p.click('.card[data-mat="mat2"] .actbtn[data-label="Infer"]');
  log('P2 clicks Infer', await row());
  await p.click('#roll'); await p.waitForTimeout(80);
  log('receipt names the action', await p.evaluate(() => document.querySelector('#tape .receipt').innerText.split('\n').slice(0, 3)));
  await p.mouse.click(5, 940);                       // go back to the table: the tape rolls up
  await p.click('#rollinfo .base');
  log('click the Base: cleared', await row());
  // editing a line updates its button
  await p.click('.card[data-mat="mat2"] .col >> nth=1'); await p.keyboard.press('Control+End'); await p.keyboard.press('Enter'); await p.keyboard.type('Bluff: 3, 1d+2'); await p.mouse.click(700, 900);
  log('typed a new line: it gets a button', await p.evaluate(() => [...document.querySelectorAll('.card[data-mat="mat2"] .actbtn')].map(b => b.dataset.label + ' ' + b.dataset.base + ' ' + b.dataset.y + 'd ' + b.dataset.b)));
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
