// Graveyards: bury into the current one, navigate, create, rename, and reclaim.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  let p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(80); };
  const log = (k, v) => console.log(k.padEnd(50), JSON.stringify(v));
  const yardsNow = () => p.evaluate(() => ({ cur: yards[cur].name, all: yards.map(y => `${y.name}[${y.items.map(i => i.name).join(',')}]`) }));
  const open = async () => { if (await p.evaluate(() => document.getElementById('graves').hidden)) await p.click('#boothill'); };
  const putAway = async sel => { const r = await p.locator(sel).first().boundingBox(); await dragTo({ x: r.x + 10, y: r.y + 8 }, { x: 700, y: 40 }); };
  const dragOut = async name => { await open(); const r = await p.locator(`#graves .items button:has-text("${name}")`).boundingBox(); await p.mouse.move(r.x + 20, r.y + 10); await p.mouse.down(); await p.mouse.move(600, 600, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(80); };

  await putAway('#mat1 .who');
  log('Sam buried', await yardsNow());
  // the reported case: Graveyard 2 in use, Graveyard 1 emptied away -> next is 3, not 1
  await p.evaluate(() => { yards.push({ name: 'Graveyard 2', named: false, items: [{ els: [], name: 'x' }] }); yards[0].items = []; prune(0); cur = 0; });
  log('  setup: only Graveyard 2 in use', await yardsNow());
  await open(); await p.click('#graves .next');
  log('  › makes Graveyard 3 (not 1)', await yardsNow());
  await p.click('#graves .prev'); await p.click('#graves .next');
  log('  ‹ › again: still 3', await yardsNow());
  // fresh table for the main sequence: a new context, since a reload now brings back the saved game
  p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 }); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  await putAway('#mat1 .who');
  await open(); await p.click('#graves .next');
  log('› with Sam in Graveyard 1: new Graveyard 2', await yardsNow());
  await p.click('#graves .next');
  log('› again on empty Graveyard 2: nothing', await yardsNow());
  // while holding Beauford over the bar, the target shows
  const bc = await p.locator('#mat2 .who').boundingBox();
  await p.mouse.move(bc.x + 10, bc.y + 8); await p.mouse.down(); await p.mouse.move(bc.x + 20, bc.y + 18, { steps: 3 }); await p.mouse.move(700, 40, { steps: 8 });
  log('  target shown while over the bar', await p.evaluate(() => [getComputedStyle(document.querySelector('#boothill .to')).display, document.querySelector('#boothill .to').textContent]));
  await p.mouse.up(); await p.waitForTimeout(80);
  log('Beauford buried into Graveyard 2', await yardsNow());
  await open(); await p.fill('#graves .yname', 'Old timers'); await p.press('#graves .yname', 'Enter');
  log('renamed', await yardsNow());
  await p.click('#graves .prev');
  log('‹ to Graveyard 1', await yardsNow());
  await dragOut('Sam');
  log('Sam dragged out: empty, default name → gone', await yardsNow());
  await open(); await p.click('#graves .next');
  log('› on Old timers: no Graveyard N in use → 1', await yardsNow());
  await p.click('#graves .prev');
  log('‹ leaves the new empty one: reclaimed', await yardsNow());
  for (let i = 0; i < 3; i++) { await p.click('#graves .next'); await p.click('#graves .prev'); }
  await p.click('#graves .next');
  log('› ‹ three times, then ›: same number', await yardsNow());
  await p.click('#graves .prev');
  await dragOut('Beauford');
  log('Beauford out: Old timers kept (it has a name)', await yardsNow());
  await open(); await p.fill('#graves .yname', ''); await p.press('#graves .yname', 'Enter');
  log('name erased, but it is the only one: kept', await yardsNow());
  log('  label and placeholder', await p.evaluate(() => [document.querySelector('#boothill .to').textContent, document.querySelector('#graves .yname').placeholder]));
  // fill the graveyard past the panel's height: the list scrolls, the header stays put
  for (let i = 0; i < 30; i++) await p.evaluate(() => { const t = makeText(100, 600, 'Note ' + Math.random().toString(36).slice(2, 6)); bury(t); });
  await open();
  const hdr1 = await p.locator('#graves .yard').boundingBox();
  await p.evaluate(() => { document.querySelector('#graves .items').scrollTop = 9999; });
  const hdr2 = await p.locator('#graves .yard').boundingBox();
  log('header first, fixed while the list scrolls', await p.evaluate(() => { const g = document.getElementById('graves'), it = g.querySelector('.items');
    return { headerFirst: g.firstElementChild.classList.contains('yard'), listScrolls: it.scrollHeight > it.clientHeight, scrolled: it.scrollTop > 0, panelFits: g.getBoundingClientRect().bottom <= innerHeight }; }));
  log('  header did not move', [Math.round(hdr1.y), Math.round(hdr2.y)]);
  await p.screenshot({ path: process.argv[2] + '/y1.png' });
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
