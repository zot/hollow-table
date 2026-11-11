const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(800);
  const box = async sel => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); };
  const read = pl => p.evaluate(pl => [...document.querySelectorAll('.mat')[0].querySelector(`[data-pool=${pl}] .pos`).children].map(c => c.dataset.v + (c.querySelector('.odd') ? '+1' : '')), pl);
  const slot = pl => box(`.mat >> nth=0 >> [data-pool=${pl}]`);
  // Beauford's Stagger red 2 -> dblclick x2 -> 6
  await p.dblclick('.mat >> nth=1 >> [data-pool=Stagger] .neg .chip'); await p.dblclick('.mat >> nth=1 >> [data-pool=Stagger] .neg .chip');
  console.log('Beauford stagger after 2 dblclicks (expect 6):', await p.evaluate(() => document.querySelectorAll('.mat')[1].querySelector('[data-pool=Stagger] .neg .chip').dataset.v));
  // Sam Bonus: 4, 4, 2 ; give the 2 a +1 ; dblclick the 2 -> 4+1 -> three 4s roll up -> 6
  for (const v of ['4','4','2']) await dragTo(await box(`.supply.chip.g[data-v="${v}"]`), await slot('Bonus'));
  await dragTo(await box('.supply.chip.g[data-v="+1"]'), await box('.mat >> nth=0 >> [data-pool=Bonus] .chip[data-v="2"]'));
  console.log('before:', JSON.stringify(await read('Bonus')));
  await p.dblclick('.mat >> nth=0 >> [data-pool=Bonus] .chip[data-v="2"] >> nth=0', { position: { x: 8, y: 21 } });
  console.log('after dblclick on the 2+1 (expect [6]):', JSON.stringify(await read('Bonus')));
  // 10 + dblclick -> 12 (no ceiling)
  await dragTo(await box('.supply.chip.g[data-v="8"]'), await slot('Edge'));
  await p.dblclick('.mat >> nth=0 >> [data-pool=Edge] .chip'); await p.dblclick('.mat >> nth=0 >> [data-pool=Edge] .chip');
  console.log('8 + two dblclicks (expect [12]):', JSON.stringify(await read('Edge')), 'selection:', JSON.stringify(await p.evaluate(() => String(getSelection()))));
  console.log('errors:', JSON.stringify(errs));
  await p.close(); process.exit(0);
})();
