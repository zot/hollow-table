// The table over the wire (slice 3): a player's page gets the GM's table; drags on either page
// show on the other; a player's edit reaches the GM's page; a change the GM's page refuses is put
// back; the move actor's rules (newest arrival first, highest number per peer); and a reload shows
// the copy at once.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const out = process.argv[2] || '/tmp';
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const gmCtx = await b.newContext(), plCtx = await b.newContext();
  const gm = await gmCtx.newPage(), pl = await plCtx.newPage();
  for (const p of [gm, pl]) await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; gm.on('pageerror', e => errs.push('gm: ' + e.message)); pl.on('pageerror', e => errs.push('player: ' + e.message));
  pl.on('dialog', d => d.accept('Dana'));
  const log = (k, v) => console.log(k.padEnd(50), JSON.stringify(v));
  const table = p => p.evaluate(() => [...world.children].filter(c => c.dataset.oid).map(c => ({ oid: c.dataset.oid, cls: c.className.split(' ')[0],
    at: [Math.round(parseFloat(c.style.left)), Math.round(parseFloat(c.style.top))], owner: c.dataset.owner, text: c.textContent.replace(/\s+/g, ' ').slice(0, 40) }))
    .sort((a, b) => a.oid.localeCompare(b.oid)));
  // the same table, but for what Dana may not read: those pieces reach her redacted (tests/secret.cjs)
  const blind = async () => new Set(await pl.evaluate(() => [...world.children].filter(c => c.classList.contains('secret')).map(c => c.dataset.oid)));
  const seen = async p => { const bl = await blind(); return (await table(p)).map(x => bl.has(x.oid) ? { ...x, text: '(secret)' } : x); };
  const same = async () => JSON.stringify(await seen(gm)) === JSON.stringify(await seen(pl));
  const at = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return [Math.round(parseFloat(e.style.left)), Math.round(parseFloat(e.style.top))]; }, sel);
  async function dragBy(p, sel, dx, dy, off = [8, 8]) {
    const r = await p.locator(sel).boundingBox();
    await p.mouse.move(r.x + off[0], r.y + off[1]); await p.mouse.down();
    for (let i = 1; i <= 12; i++) { await p.mouse.move(r.x + off[0] + dx * i / 12, r.y + off[1] + dy * i / 12); await p.waitForTimeout(40); }
    await p.mouse.up();
  }

  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  await gm.click('#folks .invite'); await gm.waitForTimeout(2500);
  await pl.goto(await gm.evaluate(() => presence.inviteUrl())); await pl.waitForTimeout(5000);
  const diff = async () => { const [a, b] = [await seen(gm), await seen(pl)]; return a.map((x, i) => JSON.stringify(x) !== JSON.stringify(b[i]) ? [x, b[i]] : null).filter(Boolean); };
  log('player\'s page: the GM\'s table arrived', { synced: await pl.evaluate(() => tableNet.synced), objects: (await table(pl)).length, same: await same() });
  if (!(await same())) log('  differ', await diff());
  await pl.click('#ledgerbtn'); await pl.waitForTimeout(500);
  log('  the Ledger is a copy', await pl.evaluate(() => ({ copy: !!document.querySelector('#ledger .copy'), checkpoint: !!document.querySelector('#ledger .cp'), games: !!document.querySelector('#ledger .games') })));
  await pl.click('#ledgerbtn');

  // The GM drags the sticky; the player's slides after it
  await dragBy(gm, '#world > .sticky', 220, 90);
  await pl.waitForTimeout(1200);
  log('GM drags the sticky: the player\'s follows', { gm: await at(gm, '#world > .sticky'), player: await at(pl, '#world > .sticky') });

  // The GM gives Sam to Dana; the player's page learns it from the GM's save
  await gm.evaluate(() => { document.getElementById('mat1').dataset.owner = 'Dana'; applyVisibility(); });
  await pl.waitForTimeout(1500);
  log('GM gives Sam to Dana', await pl.evaluate(() => ({ owner: document.getElementById('mat1').dataset.owner, mine: !document.getElementById('mat1').classList.contains('secret') })));

  // Dana drops a chip from the drawer into Sam's Main pool: a drop counts as a move, and goes out at once
  const chips = p => p.evaluate(() => document.querySelectorAll('#mat1 [data-pool=Main] .chip').length);
  const c0 = await chips(gm);
  const sup = await pl.locator('#drawer .supply[data-make=chip]').first().boundingBox(), slot = await pl.locator('#mat1 [data-pool=Main]').boundingBox();
  await pl.mouse.move(sup.x + sup.width / 2, sup.y + sup.height / 2); await pl.mouse.down();
  for (let i = 1; i <= 10; i++) { await pl.mouse.move(sup.x + (slot.x + 30 - sup.x) * i / 10, sup.y + (slot.y + slot.height / 2 - sup.y) * i / 10); await pl.waitForTimeout(30); }
  await pl.mouse.up(); await gm.waitForTimeout(1200);
  log('Dana drops a chip into Sam\'s Main', { player: await chips(pl), gm: await chips(gm), before: c0 });

  // Dana drags Sam (his card follows); the GM's page moves both
  const card = '.card[data-mat="mat1"]';
  await dragBy(pl, '#mat1', -160, 120, [6, 6]);
  await gm.waitForTimeout(1500);
  log('Dana drags Sam: the GM\'s page has him there', { player: [await at(pl, '#mat1'), await at(pl, card)], gm: [await at(gm, '#mat1'), await at(gm, card)] });

  // Dana writes on the sticky
  await pl.evaluate(() => { const t = document.querySelector('#world > .sticky .txt'); t.focus(); t.textContent = 'Dana was here'; t.blur(); });
  await gm.waitForTimeout(1800);
  log('Dana writes on the sticky: the GM sees it', await gm.evaluate(() => document.querySelector('#world > .sticky .txt').textContent));

  // Dana's page moves Devreux, the GM's NPC: refused, and put back
  const dev0 = await at(gm, '#mat3');
  await pl.evaluate(() => { document.getElementById('mat3').style.left = '40px'; });
  await pl.waitForTimeout(2500);
  log('Dana moves the GM\'s Devreux: refused, put back', { gm: await at(gm, '#mat3'), was: dev0, player: await at(pl, '#mat3') });
  log('  both tables the same', await same()); if (!(await same())) log('  differ', await diff());

  // The move actor, on the player's page, fed by hand: two peers, out of order
  const actor = await pl.evaluate(async () => {
    const oid = document.querySelector('#world > .sticky').dataset.oid, A = { id: 'peerA', name: 'A', role: 'player' }, B = { id: 'peerB', name: 'B', role: 'player' };
    const mv = (p, s, x) => tableNet._onMove(p, { move: { s, items: [{ o: oid, x, y: 300, z: 1 }] } }, false);
    const where = () => Math.round(parseFloat(objEl(oid).style.left));
    const frame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
    const res = {};
    [7, 3, 9, 1, 5].forEach(s => mv(A, 100 + s, 1000 + s)); await frame();
    res.shuffledA = where();                              // highest number wins, whatever the order
    mv(A, 120, 600); mv(B, 1, 700); await frame();
    res.twoPeersNewestArrival = where();                  // B arrived last
    mv(A, 115, 650); await frame();
    res.lowerFromA = where();                             // lower than A's 120: discarded
    mv(A, 121, 610); await frame();
    res.higherFromA = where();
    res.peerInts = [tableNet.peerOf('peerA'), tableNet.peerOf('peerB')];
    return res;
  });
  log('the move actor', actor);

  // A reload: the copy shows at once, then the GM's table arrives again
  await pl.reload(); await pl.waitForTimeout(400);
  log('player reloads: the copy shows at once', { objects: (await table(pl)).length, synced: await pl.evaluate(() => tableNet.synced) });
  await pl.waitForTimeout(5000);
  log('  and syncs', { synced: await pl.evaluate(() => tableNet.synced), same: await same() });
  await gm.screenshot({ path: out + '/sync-gm.png' }); await pl.screenshot({ path: out + '/sync-player.png' });
  log('errors', errs);
  await gmCtx.close(); await plCtx.close(); await b.close();
})();
