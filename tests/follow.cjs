// Pools bring their character cards; cards move alone; gathered cards track drawer growth.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(60); };
  const log = (k, v) => console.log(k.padEnd(50), JSON.stringify(v));
  const pos = m => p.evaluate(m => { const mat = document.getElementById(m), c = document.querySelector(`.card[data-mat="${m}"]`);
    const r = (el) => [Math.round(parseFloat(el.style.left)), Math.round(parseFloat(el.style.top))];
    return { mat: r(mat), card: r(c), gathered: !!c.dataset.gathered, gap: Math.round(parseFloat(c.style.top) - parseFloat(mat.style.top) - mat.offsetHeight) }; }, m);
  log('start: Sam gathered under its drawer', await pos('mat1'));
  const who = await p.locator('#mat1 .who').boundingBox();
  await dragTo({ x: who.x + 10, y: who.y + 8 }, { x: who.x + 110, y: who.y + 48 });
  log('pool dragged: card came along', await pos('mat1'));
  // grow Sam's drawer: add cards until it wraps
  for (let i = 0; i < 6; i++) await p.click('#mat1 .newinf.g');
  await p.mouse.click(5, 940); await p.waitForTimeout(100);
  log('drawer grew: card still snapped (gap 14)', await pos('mat1'));
  const cb = await p.locator('.card[data-mat="mat1"]').boundingBox();
  await dragTo({ x: cb.x + cb.width / 2, y: cb.y + 10 }, { x: cb.x + cb.width / 2 + 40, y: cb.y + 10 + 200 });
  log('card dragged alone: pool stayed, not gathered', await pos('mat1'));
  await p.click('#mat1 .newinf.r'); await p.mouse.click(5, 940); await p.waitForTimeout(100);
  log('drawer grows again: free card does not move', await pos('mat1'));
  await p.click('#mat1 .gather'); await p.waitForTimeout(50);
  log('gather: snapped again', await pos('mat1'));
  await p.screenshot({ path: process.argv[2] + '/f1.png' });
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
