// The "character" supply: dropping a new character pops its pool out above it.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(450); };
  const log = (k, v) => console.log(k.padEnd(50), JSON.stringify(v));
  const sup = async () => { const r = await p.locator('.supply[data-make="card"]').boundingBox(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const count = () => p.evaluate(() => ({ mats: document.querySelectorAll('.mat').length, cards: document.querySelectorAll('.card').length }));
  log('bar supplies', await p.evaluate(() => [...document.querySelectorAll('.supply:not(.chip)')].map(s => s.textContent.trim() || s.dataset.make)));
  log('start', await count());
  await dragTo(await sup(), { x: 600, y: 720 });
  const st = await p.evaluate(() => { const c = [...document.querySelectorAll('.card')].pop(), m = document.getElementById(c.dataset.mat);
    return { linked: !!m, owner: m && (m.dataset.owner || 'GM'), gathered: !!c.dataset.gathered, gap: m && Math.round(parseFloat(c.style.top) - parseFloat(m.style.top) - m.offsetHeight) }; });
  log('dropped on table: pool popped out', { ...(await count()), ...st });
  await p.selectOption('#me', 'Player 2');
  await dragTo(await sup(), { x: 1150, y: 760 });
  log('as Player 2: new pool is P2\'s', await p.evaluate(() => { const c = [...document.querySelectorAll('.card')].pop(); return document.getElementById(c.dataset.mat).dataset.owner; }));
  await p.selectOption('#me', 'GM');
  await dragTo(await sup(), { x: 300, y: 130 });   // near the top: its pool must stay below the bar
  const top = await p.evaluate(() => [...document.querySelectorAll('.mat')].pop().id);
  log('pool popped near the top is visible', await p.evaluate(top => { const m = document.getElementById(top).getBoundingClientRect(); return { poolTop: Math.round(m.top), barBottom: Math.round(document.getElementById('drawer').getBoundingClientRect().bottom) }; }, top));
  await dragTo(await sup(), { x: 800, y: 40 });
  log('dropped back on the bar: nothing made', await count());
  await p.screenshot({ path: process.argv[2] + '/n1.png' });
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
