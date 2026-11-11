const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const box = async sel => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const dragTo = async (from, to) => { await p.mouse.move(from.x, from.y); await p.mouse.down(); await p.mouse.move(from.x+10, from.y+10, {steps:3}); await p.mouse.move(to.x, to.y, {steps:8}); await p.mouse.up(); };
  const supply = (c, v) => box(`.supply.chip.${c}[data-v="${v}"]`);
  const slot = (mat, pool) => box(`.mat >> nth=${mat} >> [data-pool=${pool}]`);
  const read = (mat, pool) => p.evaluate(([m, pl]) => { const s = document.querySelectorAll('.mat')[m].querySelector(`[data-pool=${pl}]`);
    const f = st => [...s.querySelector(st).children].map(c => c.dataset.v + (c.querySelector('.odd') ? '+1' : '')); return { pos: f('.pos'), neg: f('.neg') }; }, [mat, pool]);
  // Case 1: chain in Sam's Bonus: 4, 4, then 2(+1), 2, 2  ->  6
  for (const v of ['4', '4', '2']) await dragTo(await supply('g', v), await slot(0, 'Bonus'));
  await dragTo(await supply('g', '+1'), await box('.mat >> nth=0 >> [data-pool=Bonus] .pos .chip[data-v="2"]'));
  for (const v of ['2', '2']) await dragTo(await supply('g', v), await slot(0, 'Bonus'));
  console.log('case 1 (expect pos [6]):', JSON.stringify(await read(0, 'Bonus')));
  // Case 2: Sam's Edge: 2(+1), 2, 2, 2  ->  4 and the 2+1 survives
  await dragTo(await supply('g', '2'), await slot(0, 'Edge'));
  await dragTo(await supply('g', '+1'), await box('.mat >> nth=0 >> [data-pool=Edge] .pos .chip[data-v="2"]'));
  console.log('case 2 after +1:', JSON.stringify(await read(0, 'Edge')), await p.evaluate(() => [...document.querySelectorAll('#world > .chip.odd')].length + ' loose +1 on table'));
  for (const v of ['2', '2', '2']) await dragTo(await supply('g', v), await slot(0, 'Edge'));
  console.log('case 2 (expect pos [4, 2]: the +1 was spent when the third 2 arrived):', JSON.stringify(await read(0, 'Edge')));
  // Case 3: red chip into Sam's Main -> neg; plus a green -> pos
  await dragTo(await supply('r', '4'), await slot(0, 'Main'));
  await dragTo(await supply('g', '2'), await slot(0, 'Main'));
  console.log('case 3 (expect pos [2], neg [4]):', JSON.stringify(await read(0, 'Main')));
  await p.waitForTimeout(600);
  await p.screenshot({ path: process.argv[2] + '/r1.png', clip: { x: 0, y: 0, width: 520, height: 230 } });
  console.log('errors:', JSON.stringify(errs));
  await p.close(); process.exit(0);
})();
