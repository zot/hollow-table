// Images peer to peer (11-11): an image the GM adds shows on the player's page (asked of the room
// by hash, checked against it, kept); an image the player adds reaches the GM's page the same way;
// a third page that joins later gets it from whoever has it, even with the page that added it gone;
// an image nobody has is marked missing, with why, and shows once someone with it is back.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const gmCtx = await b.newContext(), plCtx = await b.newContext();
  const gm = await gmCtx.newPage(), pl = await plCtx.newPage();
  for (const p of [gm, pl]) await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; gm.on('pageerror', e => errs.push('gm: ' + e.message)); pl.on('pageerror', e => errs.push('player: ' + e.message));
  pl.on('dialog', d => d.accept('Dana'));
  const log = (k, v) => console.log(k.padEnd(50), JSON.stringify(v));
  // a fresh PNG each run, so no page has it yet
  const png = async p => Buffer.from((await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 64; c.height = 48;
    const x = c.getContext('2d'); x.fillStyle = `hsl(${Math.random() * 360} 60% 50%)`; x.fillRect(0, 0, 64, 48);
    x.fillStyle = '#fff'; x.fillText(String(Math.random()).slice(2, 8), 4, 28); return c.toDataURL('image/png'); })).split(',')[1], 'base64');
  const images = p => p.evaluate(() => [...document.querySelectorAll('#world .image img')].map(i => ({ hash: i.dataset.blob?.slice(0, 8), w: i.naturalWidth })));

  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  await gm.click('#folks .invite'); await gm.waitForTimeout(2500);
  await pl.goto(await gm.evaluate(() => presence.inviteUrl())); await pl.waitForTimeout(5000);
  log('to start', { gm: await images(gm), player: await images(pl) });

  const a = await png(gm);
  await gm.setInputFiles('#file', { name: 'gm.png', mimeType: 'image/png', buffer: a });
  await gm.waitForTimeout(4000);
  log('GM adds an image', (await images(gm)).pop());
  log('  the player\'s page fetched it', (await images(pl)).pop());
  const gh = await gm.evaluate(() => [...document.querySelectorAll('#world .image img')].pop().dataset.blob);
  log('  and kept it', await pl.evaluate(async h => !!(await idb.get('blobs', h)), gh));

  const c = await png(pl);
  await pl.setInputFiles('#file', { name: 'dana.png', mimeType: 'image/png', buffer: c });
  await pl.waitForTimeout(5000);
  log('Dana adds an image', { player: (await images(pl)).pop(), gm: (await images(gm)).pop() });

  // a latecomer: Ann joins; Dana's page (where her image came from) is gone, the GM's page has it
  const dh = await pl.evaluate(() => [...document.querySelectorAll('#world .image img')].pop().dataset.blob);
  const anCtx = await b.newContext(), an = await anCtx.newPage(); await an.setViewportSize({ width: 1600, height: 950 });
  an.on('dialog', d => d.accept('Ann')); an.on('pageerror', e => errs.push('ann: ' + e.message));
  await pl.close();
  await an.goto(await gm.evaluate(() => presence.inviteUrl()));
  await an.waitForFunction(() => tableNet.synced, null, { timeout: 30000 }).catch(() => {});
  await an.waitForTimeout(4000);
  log('Ann joins later: she has both', await an.evaluate(hs => hs.map(h => { const i = document.querySelector(`#world img[data-blob="${h}"]`); return i && { w: i.naturalWidth, missing: i.classList.contains('missing') }; }), [gh, dh]));

  // nobody has it: the GM's page forgets Dana's image; Ann's too. Marked missing, then back once the GM's page has it again
  await an.evaluate(async h => { blobUrls.delete(h); fetching.delete(h); await idb.run(['blobs'], s => s('blobs').delete(h)); const i = document.querySelector(`#world img[data-blob="${h}"]`); i.removeAttribute('src'); }, dh);
  const keep = await gm.evaluate(async h => { const b = await idb.get('blobs', h); window._kept = b; await idb.run(['blobs'], s => s('blobs').delete(h)); return !!b; }, dh);
  await an.evaluate(() => showBlobs(world)); await an.waitForTimeout(3000);
  log('an image nobody has: marked, and why', await an.evaluate(h => { const i = document.querySelector(`#world img[data-blob="${h}"]`); return { missing: i.classList.contains('missing'), why: i.title }; }, dh));
  await gm.evaluate(async h => idb.run(['blobs'], s => s('blobs').put(window._kept, h)), dh);
  await an.waitForTimeout(12000);
  log('  the GM\'s page has it again: it shows', { kept: keep, ...(await an.evaluate(h => { const i = document.querySelector(`#world img[data-blob="${h}"]`); return { missing: i.classList.contains('missing'), w: i.naturalWidth }; }, dh)) });
  await an.screenshot({ path: (process.argv[2] || '/tmp') + '/images-ann.png' });
  await anCtx.close();
  log('errors', errs);
  await gmCtx.close(); await plCtx.close(); await b.close();
})();
