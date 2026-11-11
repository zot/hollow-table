const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/404/.test(m.text()) && errs.push(m.text()));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const box = async (sel) => { const r = await p.locator(sel).first().boundingBox(); if (!r) throw new Error('no box: ' + sel); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(30); };
  const log = (k, v) => console.log(k.padEnd(52), JSON.stringify(v));
  const rents = () => p.evaluate(() => [...document.querySelectorAll('.card .rent')].map(r => r.textContent.trim()));
  const loose = () => p.evaluate(() => [...document.querySelectorAll('#world > .infl')].map(c => `${c.dataset.name} ${c.querySelector('.lv').textContent} ${c.dataset.ledger}`));
  const glyph = name => `.rent:has-text("${name}") .glyph`;

  log('resources decorated', await rents());
  // tap Sam's Money onto the table
  const g = await box(glyph('Money +Maj'));
  await dragTo(g, { x: 700, y: 640 });
  log('tapped Money: card on table', await loose());
  log('  Sam resources', (await rents()).slice(0, 2));
  // where is the card's glyph relative to the drop point?
  log('  card glyph centred at drop (700,640)?', await p.evaluate(() => { const r = document.querySelector('#world > .infl .cg').getBoundingClientRect(); return [Math.round(r.left + r.width/2), Math.round(r.top + r.height/2)]; }));
  const cardSel = '#world > .infl >> nth=0';
  await p.click(cardSel, { position: { x: 4, y: 20 } });
  log('click: +1 Level from Money', await loose()); log('  ', (await rents()).slice(0, 2));
  await p.click(cardSel, { position: { x: 4, y: 20 }, modifiers: ['Shift'] });
  log('shift-click: back to Money', await loose()); log('  ', (await rents()).slice(0, 2));
  // merge a tap from Ammo onto it
  await dragTo(await box(glyph('Ammo +Sig')), await box(cardSel));
  log('Ammo tapped onto the Money card', await loose()); log('  ', (await rents()).slice(0, 2));
  await p.click(cardSel, { position: { x: 4, y: 20 } });
  log('click: takes Ammo (current source)', await loose()); log('  ', (await rents()).slice(0, 2));
  await p.click(cardSel, { position: { x: 4, y: 20 } });
  log('click with Ammo dry: no change', await loose());
  for (let i = 0; i < 3; i++) await p.click(cardSel, { position: { x: 4, y: 20 }, modifiers: ['Shift'] });
  log('3 shift-clicks: only Ammo\'s 2 come back', await loose()); log('  ', (await rents()).slice(0, 2));
  // card into Sam's Main pool -> chip; click transfers from Ammo
  await dragTo(await box(cardSel), await box('#mat1 [data-pool=Main]'));
  log('into the pool', await p.evaluate(() => [...document.querySelectorAll('#mat1 [data-pool=Main] .pos > *')].map(c => c.dataset.name + ' ' + c.dataset.v)));
  // a tap onto a plain card does not merge
  await dragTo(await box('.infl[data-name="Keep the Peace"] .nm'), await box('#mat3 [data-pool=Main]'));
  await dragTo(await box(glyph('Liquid Courage')), await box('#mat3 [data-pool=Main] .infl'));
  log('tap onto plain chip in a pool: no merge', await p.evaluate(() => [...document.querySelectorAll('#mat3 [data-pool=Main] .pos > *')].map(c => c.dataset.name + ' ' + c.dataset.v)));
  log('  Beauford resources', (await rents()).slice(2, 4));
  await dragTo(await box('#mat3 [data-pool=Main] .infl[data-name="Liquid Courage"]'), await box('#mat2 .killbox'));
  log('killed Liquid Courage tap: refunded', (await rents()).slice(2, 4));
  // Bias: box gating, then a named Bias and its tap
  await p.click('.card[data-mat="mat1"] .front .flipcorner');
  await p.waitForTimeout(600);
  await p.click('.card[data-mat="mat1"] .boxes[data-row="Min"] .box >> nth=0');
  log('box before the Bias has a name: checked?', await p.evaluate(() => document.querySelector('.card[data-mat="mat1"] .boxes[data-row="Min"] .box').classList.contains('on')));
  await p.click('.card[data-mat="mat1"] .line.bias[data-row="Sig"] .lt'); await p.keyboard.type('Uncertain');
  await p.click('.card[data-mat="mat1"] .line.bias[data-row="Min"] .lt'); await p.keyboard.type('Suspicious of Jake');
  await p.mouse.click(700, 800);
  await p.click('.card[data-mat="mat1"] .boxes[data-row="Min"] .box >> nth=0');
  log('box after naming: checked?', await p.evaluate(() => document.querySelector('.card[data-mat="mat1"] .boxes[data-row="Min"] .box').classList.contains('on')));
  await dragTo(await box('.card[data-mat="mat1"] .line.bias[data-row="Sig"] .glyph'), { x: 900, y: 700 });
  log('tapped Uncertain (Sig row)', await loose());
  await p.click(cardSel, { position: { x: 4, y: 20 } });
  log('click: second Level of Uncertain', await loose());
  log('  line shows', await p.evaluate(() => document.querySelector('.card[data-mat="mat1"] .line.bias[data-row="Sig"] .spent').textContent));
  await dragTo(await box('.card[data-mat="mat1"] .boxes[data-row="Min"] .box.on'), await box(cardSel));
  log('checked box tapped onto it', await loose());
  // secrecy
  await p.selectOption('#me', 'Player 1');
  log('as Player 1: secret mats', await p.evaluate(() => [...document.querySelectorAll('.mat.secret')].map(m => m.querySelector('.who').textContent)));
  log('  secret cards', await p.evaluate(() => [...document.querySelectorAll('.card.secret')].map(c => c.dataset.mat)));
  log('  Devreux chip names on hover', await p.evaluate(() => [...document.querySelectorAll('.infl[data-home="mat3"]')].map(c => c.title)));
  await p.click('#mat2 .die-own');
  log('P1 tries to claim Beauford (P2 owns)', await p.evaluate(() => document.getElementById('mat2').dataset.owner));
  await p.click('#mat1 .die-own', { modifiers: ['Shift'] });
  log('P1 releases Sam', [await p.evaluate(() => document.getElementById('mat1').dataset.owner), await p.evaluate(() => document.getElementById('mat1').classList.contains('secret'))]);
  await p.click('#mat1 .die-own');
  log('P1 claims Sam again', await p.evaluate(() => document.getElementById('mat1').dataset.owner));
  await p.screenshot({ path: process.argv[2] + '/t1.png' });
  await p.selectOption('#me', 'GM');
  // card drags its mat; mat moves alone; gather
  const before = await p.evaluate(() => [document.getElementById('mat2').style.left, document.querySelector('.card[data-mat="mat2"]').style.left]);
  const cb = await p.locator('.card[data-mat="mat2"]').boundingBox();
  await dragTo({ x: cb.x + cb.width/2, y: cb.y + 10 }, { x: cb.x + cb.width/2 + 80, y: cb.y + 10 + 60 });
  const after = await p.evaluate(() => [document.getElementById('mat2').style.left, document.querySelector('.card[data-mat="mat2"]').style.left]);
  log('card drag moved mat too', { before, after });
  const mh = await box('#mat2 .row');
  await dragTo({ x: mh.x - 150, y: mh.y - 50 }, { x: mh.x - 150 + 100, y: mh.y - 50 });
  const mb = await p.locator('#mat2 .who').boundingBox();
  await dragTo({ x: mb.x + 10, y: mb.y + 8 }, { x: mb.x + 110, y: mb.y + 8 });
  const sep = await p.evaluate(() => [document.getElementById('mat2').style.left, document.querySelector('.card[data-mat="mat2"]').style.left]);
  log('mat dragged alone', sep);
  await p.click('#mat2 .gather');
  log('gather: card left = mat left', await p.evaluate(() => [document.getElementById('mat2').style.left, document.querySelector('.card[data-mat="mat2"]').style.left]));
  await p.screenshot({ path: process.argv[2] + '/t2.png' });
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
