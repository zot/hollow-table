// Putting away a pool or its character buries both on Boot Hill; clicking a name restores them.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(80); };
  const log = (k, v) => console.log(k.padEnd(50), JSON.stringify(v));
  const state = () => p.evaluate(() => ({ pools: [...document.querySelectorAll('.mat')].map(m => m.querySelector('.who').textContent), cards: document.querySelectorAll('.card').length, grave: document.querySelector('#boothill .n').textContent }));
  // put a chip in Sam's pool and a note on his card, so there is work to lose
  const sup = await p.locator('.supply.chip.g[data-v="4"]').boundingBox(), slot = await p.locator('#mat1 [data-pool=Main]').boundingBox();
  await dragTo({ x: sup.x + 15, y: sup.y + 15 }, { x: slot.x + slot.width/2, y: slot.y + slot.height/2 });
  await p.click('.card[data-mat="mat1"] .col >> nth=1'); await p.keyboard.press('End'); await p.keyboard.type(' (owes Jake)'); await p.mouse.click(700, 900);
  const before = await p.evaluate(() => document.getElementById('mat1').style.left + ',' + document.getElementById('mat1').style.top);
  log('start', await state());
  const who = await p.locator('#mat1 .who').boundingBox();
  await dragTo({ x: who.x + 10, y: who.y + 8 }, { x: 700, y: 40 });
  log('Sam\'s pool put away: both buried', await state());
  const cb = await p.locator('.card[data-mat="mat2"]').boundingBox();
  await dragTo({ x: cb.x + cb.width/2, y: cb.y + 10 }, { x: 700, y: 40 });
  log('Beauford\'s card put away: both buried', await state());
  await p.click('#boothill');
  log('Boot Hill lists', await p.evaluate(() => [...document.querySelectorAll('#graves button')].map(b => b.textContent)));
  const sam = await p.locator('#graves button:has-text("Sam")').boundingBox();
  await p.mouse.move(sam.x + 20, sam.y + 10); await p.mouse.down(); await p.mouse.move(500, 520, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(80);
  log('Sam dragged out', await state());
  log('  pool at the drop, card follows, chip and note kept', await p.evaluate(() => { const m = document.getElementById('mat1'), c = document.querySelector('.card[data-mat="mat1"]');
    const r = m.getBoundingClientRect(); return { poolNearDrop: [Math.round(r.left), Math.round(r.top)], cardBelowPool: Math.round(parseFloat(c.style.top) - parseFloat(m.style.top) - m.offsetHeight),
      main: [...m.querySelectorAll('[data-pool=Main] .chip')].map(c => c.dataset.v), note: /owes Jake/.test(c.textContent), listOpen: !document.getElementById('graves').hidden }; }));
  // a sticky thrown on the bar is buried too
  const st = await p.locator('.sticky').first().boundingBox();
  await dragTo({ x: st.x + st.width/2, y: st.y + 6 }, { x: 700, y: 40 });
  log('sticky on the bar: buried', await p.evaluate(() => [document.querySelectorAll('.sticky').length + ' stickies left', [...document.querySelectorAll('#graves button')].map(b => b.textContent)]));
  await p.click('#boothill'); await p.waitForTimeout(50);
  const nb = await p.locator('#graves button:has-text("Note:")').boundingBox();
  await p.mouse.move(nb.x + 20, nb.y + 10); await p.mouse.down(); await p.mouse.move(900, 600, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(80);
  log('sticky dragged out, text intact', await p.evaluate(() => { const s = document.querySelector('.sticky'); const r = s.getBoundingClientRect(); return [[Math.round(r.left), Math.round(r.top)], /Trudy/.test(s.textContent)]; }));
  // drag Beauford out and straight back onto the bar: buried again
  await p.click('#boothill'); await p.waitForTimeout(50);
  const bb = await p.locator('#graves button:has-text("Beauford")').boundingBox();
  await p.mouse.move(bb.x + 20, bb.y + 10); await p.mouse.down(); await p.mouse.move(700, 400, { steps: 6 }); await p.mouse.move(700, 40, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(80);
  log('Beauford out and back onto the bar: reburied', await state());
  await p.screenshot({ path: process.argv[2] + '/bh.png' });
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
