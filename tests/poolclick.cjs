// Clicking a pool adds +1 (shift −1); +1 → 2 → 4 on click; 2 → +1 → gone on shift-click.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const log = (k, v) => console.log(k.padEnd(46), JSON.stringify(v));
  const pool = (m, pl) => p.evaluate(([m, pl]) => { const s = document.querySelector(`#${m} [data-pool=${pl}]`); const f = st => [...s.querySelector(st).children].map(u => u.dataset.v + (rider(u) ? '+1' : '')); return { pos: f('.pos'), neg: f('.neg') }; }, [m, pl]);
  const at = async (m, pl, dy = 40) => { const r = await p.locator(`#${m} [data-pool=${pl}]`).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 + dy }; };
  const click = async (pt, shift) => { if (shift) await p.keyboard.down('Shift'); await p.mouse.click(pt.x, pt.y); if (shift) await p.keyboard.up('Shift'); await p.waitForTimeout(30); };
  const chip = (m, pl, st) => p.locator(`#${m} [data-pool=${pl}] .${st} > .chip`).first();
  await click(await at('mat1', 'Main'));
  log('click Main: +1', await pool('mat1', 'Main'));
  await click(await at('mat1', 'Main'), true);
  log('shift-click: −1', await pool('mat1', 'Main'));
  await chip('mat1', 'Main', 'pos').click();
  log('click the +1: becomes 2', await pool('mat1', 'Main'));
  await chip('mat1', 'Main', 'pos').click();
  log('click the 2: becomes 4', await pool('mat1', 'Main'));
  await chip('mat1', 'Main', 'pos').click({ modifiers: ['Shift'] }); await chip('mat1', 'Main', 'pos').click({ modifiers: ['Shift'] });
  log('shift-click twice: 4 → 2 → +1', await pool('mat1', 'Main'));
  await chip('mat1', 'Main', 'pos').click({ modifiers: ['Shift'] });
  log('shift-click the +1: gone', await pool('mat1', 'Main'));
  // a rider stays with its chip: click does nothing, shift-click removes it
  await click(await at('mat1', 'Edge')); await chip('mat1', 'Edge', 'pos').click(); await chip('mat1', 'Edge', 'pos').click();
  const sup = await p.locator('.supply.chip.g.odd').boundingBox(), host = await chip('mat1', 'Edge', 'pos').boundingBox();
  await p.mouse.move(sup.x + 10, sup.y + 10); await p.mouse.down(); await p.mouse.move(sup.x + 30, sup.y + 30, { steps: 3 }); await p.mouse.move(host.x + 20, host.y + 20, { steps: 8 }); await p.mouse.up();
  log('Edge: 4 with a +1 rider', await pool('mat1', 'Edge'));
  await p.locator('#mat1 [data-pool=Edge] .pos > .chip > .chip.odd').click({ force: true });
  log('click the rider: nothing', await pool('mat1', 'Edge'));
  await p.locator('#mat1 [data-pool=Edge] .pos > .chip > .chip.odd').click({ modifiers: ['Shift'], force: true });
  log('shift-click the rider: removed', await pool('mat1', 'Edge'));
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
