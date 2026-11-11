const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(800);
  const st = () => p.evaluate(() => ({ mat: document.querySelector('.mat').style.left, view: document.getElementById('world').style.transform }));
  const drag = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 60, y + 40, { steps: 6 }); await p.mouse.up(); };
  const who = await p.locator('.mat .who').first().boundingBox();
  const row = await p.locator('.mat .row').first().boundingBox();
  let a = await st(); await drag(who.x + who.width + 120, who.y + who.height / 2); let b2 = await st();
  console.log('empty beside name -> mat moved?', a.mat !== b2.mat, ' view panned?', a.view !== b2.view);
  a = b2; const w2 = await p.locator(".mat .who").first().boundingBox(); await drag(w2.x + 10, w2.y + w2.height / 2); b2 = await st();
  console.log('on the name -> mat moved?', a.mat !== b2.mat);
  a = b2; const r2 = await p.locator('.mat .row').first().boundingBox(); await drag(r2.x + 3, r2.y + 3); b2 = await st();
  console.log('on the white row edge -> mat moved?', a.mat !== b2.mat);
  await p.close(); process.exit(0);
})();
