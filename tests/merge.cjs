// A tap merges into a resource-made card wherever it sits: on the table, in a pool, at home in a drawer.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const box = async sel => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(60); };
  const log = (k, v) => console.log(k.padEnd(50), JSON.stringify(v));
  const glyph = name => `.rent:has-text("${name}") .glyph`;
  const devRes = () => p.evaluate(() => [...document.querySelectorAll('.card[data-mat="mat3"] .rent')].map(r => r.textContent.trim()));
  const card = () => p.evaluate(() => { const c = document.querySelector('.infl[data-name="Saloon Gossip"]'); return c && { lv: c.querySelector('.lv').textContent, ledger: c.dataset.ledger, where: c.classList.contains('home') ? 'drawer' : c.closest('.stack') ? 'pool' : 'table' }; });
  // tap Saloon Gossip straight into Devreux's drawer
  await dragTo(await box(glyph('Saloon Gossip')), await box('#mat3 .tray .cards'));
  log('Saloon Gossip tapped into the drawer', [await card(), await devRes()]);
  await dragTo(await box(glyph('Money +Sig')), await box('.infl[data-name="Saloon Gossip"]'));
  log('Money dropped on it in the drawer: merged', [await card(), await devRes()]);
  await p.click('.infl[data-name="Saloon Gossip"] .lv');
  log('click its Level: another from Money', [await card(), await devRes()]);
  // in a pool too
  await dragTo(await box('.infl[data-name="Saloon Gossip"] .nm'), await box('#mat3 [data-pool=Main]'));
  await dragTo(await box(glyph('Saloon Gossip')), await box('#mat3 [data-pool=Main] .infl'));
  log('Saloon Gossip again onto it in the pool', [await card(), await devRes()]);
  // another character's Money is allowed too (Bill: sometimes it is, e.g. Money)
  await dragTo(await box(glyph('Money +Maj')), await box('#mat3 [data-pool=Main] .infl'));
  log('Sam\'s Money onto Devreux\'s card', [await card(), await p.evaluate(() => document.querySelector('.card[data-mat="mat1"] .rent').textContent.trim())]);
  // a plain card in a drawer still doesn't take Resources: the tap just goes into the drawer
  await dragTo(await box(glyph('Ammo')), await box('.infl[data-name="Keep the Peace"]'));
  log('tap onto plain Keep the Peace: no merge', await p.evaluate(() => [document.querySelector('.infl[data-name="Keep the Peace"]').dataset.v, !!document.querySelector('.infl[data-name="Ammo"]')]));
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
