// Rolls print on the paper tape (newest first); roll it up; tear one off onto the table; bury it.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const log = (k, v) => console.log(k.padEnd(44), JSON.stringify(v));
  const st = () => p.evaluate(() => ({ shown: getComputedStyle(document.getElementById('tape')).display !== 'none', up: document.getElementById('tape').classList.contains('up'), raised: document.getElementById('tape').classList.contains('raised'),
    tape: [...document.querySelectorAll('#tape .receipt .who')].map(w => w.textContent), table: document.querySelectorAll('#world > .receipt').length }));
  log('start: no tape', await st());
  await p.click('#mat3 .die-own');
  for (let i = 0; i < 5; i++) await p.click('#roll');
  await p.waitForTimeout(400);
  log('five rolls: on the tape, newest first', await st());
  log('  under the register, nothing on the table', await p.evaluate(() => { const t = document.getElementById('tape').getBoundingClientRect(), r = document.querySelector('.register').getBoundingClientRect(); return { tapeTop: Math.round(t.top), barBottom: 92, tapeLeft: Math.round(t.left), registerLeft: Math.round(r.left), tapeHeight: Math.round(t.height) }; }));
  log('  scrolls (about three visible)', await p.evaluate(() => { const s = document.querySelector('#tape .strip'); return s.scrollHeight > s.clientHeight; }));
  await p.click('#paperroll');
  log('paper roll: rolled up', await st());
  await p.click('#paperroll');
  log('paper roll again: down', await st());
  await p.mouse.click(300, 700);
  log('click on the table: lowered under the pools', await st());
  log('  what\'s on top where the tape crosses a pool', await p.evaluate(() => { const t = document.getElementById('tape').getBoundingClientRect();
    for (let y = t.top + 20; y < t.bottom; y += 15) { const el = document.elementFromPoint(t.left + 60, y); const m = el.closest('.mat, .card'); if (m) return [Math.round(y), m.className.split(' ')[0]]; } return 'no pool or card under the tape'; }));
  const free = await p.evaluate(() => { const t = document.getElementById('tape').getBoundingClientRect();
    for (let y = t.top + 20; y < t.bottom; y += 10) for (let x = t.left + 10; x < t.right; x += 20) { const el = document.elementFromPoint(x, y); if (el.closest('#tape')) return { x, y }; } return null; });
  await p.mouse.click(free.x, free.y);
  log('click a visible bit of tape: raised', await st());
  // tear the whole roll off onto the table
  const r = await p.locator('#tape .receipt').first().boundingBox();
  await p.mouse.move(r.x + 60, r.y + 30); await p.mouse.down(); await p.mouse.move(r.x + 40, r.y + 80, { steps: 4 }); await p.mouse.move(400, 520, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(80);
  log('whole roll torn off', [await st(), await p.evaluate(() => [...document.querySelectorAll('#world > .tornroll .receipt .who')].map(w => w.textContent))]);
  // the wheel scrolls the torn roll instead of zooming
  const tr = await p.locator('#world > .tornroll').boundingBox(), z0 = await p.evaluate(() => view.z);
  await p.evaluate(() => { const r = document.querySelector('.tornroll .rolls'); r.style.maxHeight = '200px'; });
  await p.mouse.move(tr.x + 100, tr.y + 60); await p.mouse.wheel(0, 120); await p.waitForTimeout(100);
  log('  wheel over it: scrolls, no zoom', await p.evaluate(z0 => [document.querySelector('.tornroll .rolls').scrollTop > 0, view.z === z0], z0));
  await p.click('#roll'); await p.waitForTimeout(400);
  log('next roll starts a fresh tape', await st());
  const t = await p.locator('#world > .tornroll').boundingBox();
  await p.mouse.move(t.x + 60, t.y + 20); await p.mouse.down(); await p.mouse.move(t.x + 70, t.y + 10, { steps: 3 }); await p.mouse.move(800, 40, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(80);
  log('torn roll dropped on the bar: buried', await p.evaluate(() => [document.querySelectorAll('#world > .tornroll').length, yards[cur].items.map(i => i.name)]));
  // labels are not selectable
  log('pool labels not selectable', await p.evaluate(() => getComputedStyle(document.querySelector('.slot .lbl')).userSelect));
  await p.screenshot({ path: process.argv[2] + '/tape.png' });
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
