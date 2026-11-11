// While the GM's page is away: a player's changes wait, pending, and reach the GM's page when it's
// back (closed and reopened: a new key, so the player's page asks for the whole table and sends
// them again). A lost edit goes again on its own. A player who reloads while the GM's page is away
// keeps their pending changes too.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const gmCtx = await b.newContext(), plCtx = await b.newContext();
  let gm = await gmCtx.newPage(); const pl = await plCtx.newPage();
  for (const p of [gm, pl]) await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; const watch = (p, who) => p.on('pageerror', e => errs.push(who + ': ' + e.message));
  watch(gm, 'gm'); watch(pl, 'player');
  pl.on('dialog', d => d.accept('Dana'));
  const log = (k, v) => console.log(k.padEnd(52), JSON.stringify(v));
  const sticky = p => p.evaluate(() => document.querySelector('#world > .sticky .txt').textContent);
  const write = (p, t) => p.evaluate(t => { const x = document.querySelector('#world > .sticky .txt'); x.focus(); x.textContent = t; x.blur(); }, t);
  const at = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return [Math.round(parseFloat(e.style.left)), Math.round(parseFloat(e.style.top))]; }, sel);
  const state = p => p.evaluate(() => ({ synced: tableNet.synced, pending: [...tableNet.pending.keys()] }));
  async function openGm() {
    gm = await gmCtx.newPage(); watch(gm, 'gm'); await gm.setViewportSize({ width: 1600, height: 950 });
    await gm.goto('http://127.0.0.1:8765/index.html');
  }

  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  await gm.click('#folks .invite'); await gm.waitForTimeout(2500);
  await pl.goto(await gm.evaluate(() => presence.inviteUrl())); await pl.waitForTimeout(5000);
  await gm.evaluate(() => { document.getElementById('mat1').dataset.owner = 'Dana'; applyVisibility(); });
  await pl.waitForTimeout(2000);
  log('Dana at the table, Sam is hers', { ...(await state(pl)), owner: await pl.evaluate(() => mat1.dataset.owner) });

  // a lost edit goes again
  await pl.evaluate(() => { const send = presence.send; let drop = 1; presence.send = (k, e) => (k === 'edit' && drop-- > 0) ? undefined : send(k, e); });
  await write(pl, 'first, lost on the way');
  await pl.waitForTimeout(1500);
  log('Dana\'s edit is lost: the GM has', { gm: await sticky(gm), pending: (await state(pl)).pending });
  await pl.waitForTimeout(4500);
  log('  sent again: the GM has', { gm: await sticky(gm), pending: (await state(pl)).pending });

  // the GM's page closes; Dana carries on
  await gm.close(); await pl.waitForTimeout(1500);
  await write(pl, 'while you were out');
  const r = await pl.locator('#mat1').boundingBox();
  await pl.mouse.move(r.x + 6, r.y + 6); await pl.mouse.down();
  for (let i = 1; i <= 10; i++) { await pl.mouse.move(r.x + 6 + 12 * i, r.y + 6 + 9 * i); await pl.waitForTimeout(30); }
  await pl.mouse.up(); await pl.waitForTimeout(800);
  const sam = await at(pl, '#mat1');
  log('GM\'s page gone; Dana writes and drags Sam', await state(pl));

  await openGm(); await gm.waitForTimeout(9000);
  log('GM\'s page reopened: it has Dana\'s changes', { sticky: await sticky(gm), sam: await at(gm, '#mat1'), dana: sam });
  log('  Dana\'s page', { ...(await state(pl)), sticky: await sticky(pl) });

  // Dana reloads while the GM's page is away: her pending change survives
  await gm.close(); await pl.waitForTimeout(1000);
  await write(pl, 'written, then reloaded');
  await pl.waitForTimeout(800);
  await pl.reload(); await pl.waitForTimeout(1500);
  log('GM away, Dana writes and reloads', { ...(await state(pl)), sticky: await sticky(pl) });
  await openGm(); await gm.waitForTimeout(9000);
  log('  GM\'s page back: it has it', { gm: await sticky(gm), player: await sticky(pl), pending: (await state(pl)).pending });

  log('errors', errs);
  await gmCtx.close(); await plCtx.close(); await b.close();
})();
