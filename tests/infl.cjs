const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && !/404/.test(m.text()) && errs.push(m.text()));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const box = async (sel) => { const r = await p.locator(sel).first().boundingBox(); if (!r) throw new Error('no box: ' + sel); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(30); };
  const card = name => `.infl[data-name="${name}"] >> nth=0`;
  const pool = (m, pl) => `#mat${m} [data-pool=${pl}]`;
  const read = (m, pl) => p.evaluate(sel => { const f = st => [...document.querySelector(sel + ' ' + st).children].map(u => u.classList.contains('pile') ? `pile(${u.dataset.v}:${[...u.querySelector('.members').children].map(x => x.dataset.name || x.dataset.v).join('|')})` : (u.dataset.name || u.dataset.v)); return { pos: f('.pos'), neg: f('.neg') }; }, pool(m, pl));
  const tray = m => p.evaluate(m => [...document.querySelectorAll(`#mat${m} .tray .cards > .infl`)].map(c => c.dataset.name + ' ' + c.querySelector('.lv').textContent), m);
  const log = (k, v) => console.log(k.padEnd(48), JSON.stringify(v));

  log('Devreux drawer at start', await tray(3));
  await dragTo(await box(card('Keep the Peace') + ' >> .nm'), await box(pool(3, 'Main')));
  await dragTo(await box(card('Self-Preservation') + ' >> .nm'), await box(pool(3, 'Main')));
  log('two +Sig cards in Main (chips)', await read(3, 'Main'));
  // write a new card, raise it to Sig, add it: three 4s -> pile of 6
  await p.click('#mat3 .newinf.g'); await p.keyboard.type('Saloon Gossip'); await p.mouse.click(5, 5);
  await p.click(card('Saloon Gossip') + ' >> .lv');
  log('new card raised to Sig', await tray(3));
  await dragTo(await box(card('Saloon Gossip') + ' >> .nm'), await box(pool(3, 'Main')));
  log('three 4s -> pile', await read(3, 'Main'));
  await p.click(pool(3, 'Main') + ' .pile > .disc');
  log('pile open?', await p.evaluate(() => !!document.querySelector('.pile.open')));
  await p.screenshot({ path: process.argv[2] + '/i1.png' });
  // drag a member out to the table -> card goes home, pile breaks
  const m = await p.locator('.pile.open .members > .infl').first().boundingBox();
  await dragTo({ x: m.x + 20, y: m.y + 20 }, { x: 700, y: 640 });
  log('member dragged to table: Main', await read(3, 'Main'));
  log('  and the drawer', await tray(3));
  // card dropped on the supply drawer goes home, not destroyed
  const main0 = await box(pool(3, 'Main') + ' .pos > .infl');
  await dragTo(main0, { x: 300, y: 40 });
  log('card dropped on supply drawer -> home', await tray(3));
  // rehome: drag Old Sympathy onto Sam's drawer
  await dragTo(await box(card('Old Sympathy for Sparkers') + ' >> .nm'), await box('#mat1 .tray .cards'));
  log('rehomed to Sam', await tray(1));
  // kill box
  await dragTo(await box(card('Old Sympathy for Sparkers') + ' >> .nm'), await box('#mat1 .killbox'));
  log('killed: Sam drawer', await tray(1));
  // plain chip click / shift-click
  await p.click('#mat2 [data-pool=Stagger] .neg .chip'); log('Beauford red 2 click', await read(2, 'Stagger'));
  await p.click('#mat2 [data-pool=Stagger] .neg .chip', { modifiers: ['Shift'] }); log('  shift-click', await read(2, 'Stagger'));
  // anonymous merge still works
  for (let i = 0; i < 3; i++) await dragTo(await box('.supply.chip.g[data-v="2"]'), await box(pool(1, 'Bonus')));
  log('three plain 2s merge', await read(1, 'Bonus'));
  // card at Min can't go below Min
  await p.click(card('Self-Preservation') + ' >> .lv', { modifiers: ['Shift'] }); await p.click(card('Self-Preservation') + ' >> .lv', { modifiers: ['Shift'] });
  log('card floor at Min', await tray(3));
  await p.screenshot({ path: process.argv[2] + '/i2.png' });
  // a plain chip dropped on the top bar is put away
  await dragTo(await box('#mat1 [data-pool=Bonus] .chip'), { x: 300, y: 40 });
  log('plain chip tossed on top bar: Sam Bonus', await read(1, 'Bonus'));
  log('chips on table', await p.evaluate(() => document.querySelectorAll('#world > .chip').length));
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
