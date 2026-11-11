// Pointing at an opponent: Defend chooser, opposition total with Stagger, auto row, live, manual hold, hidden.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const box = async sel => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(80); };
  const log = (k, v) => console.log(k.padEnd(50), JSON.stringify(v));
  const row = () => p.evaluate(() => { const r = document.getElementById('roller'); return `${document.querySelector('#rollinfo .base').textContent} | ${document.querySelector('#rollinfo .vs').textContent} | ${r.querySelector('.res-dice').title.split('.')[0].replace('Difference ', '')}`; });
  // GM: Devreux attacks Sam
  await p.click('.card[data-mat="mat3"] .actbtn[data-label="Attack"]');
  log('GM picks Devreux\'s Attack (4)', await row());
  await dragTo(await box('#rollinfo .base'), await box('#mat1 .row'));
  log('dragged onto Sam: chooser', await p.evaluate(() => [...document.querySelectorAll('#defchoice button')].map(b => b.textContent)));
  await p.click('#defchoice button:has-text("Mental")');
  log('Mental (2): Difference +2 → White', await row());
  await dragTo(await box('.supply.chip.r[data-v="6"]'), await box('#mat1 [data-pool=Stagger]'));
  log('Sam gets Stagger −6: +8 → Green + 1', await row());
  await dragTo(await box('.supply.chip.g[data-v="4"]'), await box('#mat3 [data-pool=Main]'));
  log('Devreux Main +4: 8 vs −4 = +12 → Outclass', await row());
  await p.click('#roller .res-dice'); await p.click('.advmenu button:has-text("+5 to +6")');
  log('GM picks +5 to +6 by hand', await row());
  await dragTo(await box('.supply.chip.g[data-v="2"]'), await box('#mat1 [data-pool=Main]'));
  log('Sam Main +2: hand pick holds', await row());
  await p.click('#roll'); await p.waitForTimeout(80);
  log('receipt', await p.evaluate(() => document.querySelector('#tape .receipt').innerText.split('\n').filter(l => /vs|Total/.test(l))));
  log('Sam marked as the opponent', await p.evaluate(() => [...document.querySelectorAll('.mat.targeted')].map(m => m.id)));
  await p.click('#mat3 .die-own');
  log('click Devreux\'s die (row is here): fresh', [await row(), await p.evaluate(() => document.querySelectorAll('.mat.targeted').length), await p.evaluate(() => document.querySelectorAll('#roller .ydice .die').length + 'd ' + document.querySelector('#roller .bonus').textContent)]);
  await p.click('.card[data-mat="mat3"] .actbtn[data-label="Attack"]');
  await dragTo(await box('#rollinfo .base'), await box('#mat1 .row'));
  await p.click('#defchoice button:has-text("Mental")');
  await p.click('#rollinfo .vs');
  log('click vs: stop aiming', await row());
  // dragging onto own pool does nothing; a plain click on the Base still clears
  await dragTo(await box('#rollinfo .base'), await box('#mat3 .row'));
  log('dragged onto own pool: nothing', await row());
  // P1 tries to aim Sam at Devreux (hidden from P1): refused
  await p.selectOption('#me', 'Player 1');
  await p.click('.card[data-mat="mat1"] .actbtn[data-label="Mental Atk / Req"]');
  await dragTo(await box('#rollinfo .base'), await box('#mat3 .row'));
  log('P1 → hidden Devreux: refused', [await p.evaluate(() => document.querySelector('#defchoice').textContent), await row()]);
  // the GM works Sam's roll row (still P1's) and aims it at Devreux
  await p.selectOption('#me', 'GM');
  await p.click('#mat1 .die-own');
  log('GM clicks P1\'s die: docks, Sam stays P1\'s', [await p.evaluate(() => document.getElementById('roller').closest('.mat')?.id), await p.evaluate(() => document.getElementById('mat1').dataset.owner)]);
  await p.click('.card[data-mat="mat1"] .actbtn[data-label="Mental Atk / Req"]');
  await dragTo(await box('#rollinfo .base'), await box('#mat3 .row'));
  await p.click('#defchoice button:has-text("Mental")');
  log('GM aims Sam\'s Mental Atk at Devreux (mental 6)', await row());
  await p.click('#rollinfo .base');
  log('click Base: action cleared', await row());
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
