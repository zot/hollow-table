// Rolls through the GM's page: a player's Roll sends an intent; the GM's page looks both sides up in
// its own records, picks the row from the Difference it alone can see, rolls, and answers. The roller
// gets their own numbers on their receipt, the GM gets everything, and nothing hidden travels.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const out = process.argv[2] || '/tmp';
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const gmCtx = await b.newContext(), plCtx = await b.newContext();
  const gm = await gmCtx.newPage(), pl = await plCtx.newPage();
  for (const p of [gm, pl]) await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; gm.on('pageerror', e => errs.push('gm: ' + e.message)); pl.on('pageerror', e => errs.push('player: ' + e.message));
  pl.on('dialog', d => d.accept('Dana'));
  const log = (k, v) => console.log(k.padEnd(48), JSON.stringify(v));
  const top = p => p.evaluate(() => { const r = document.querySelector('#tape .receipt'); return r && { who: r.querySelector('.who')?.textContent,
    by: r.querySelector('.by')?.textContent || '', sent: r.classList.contains('sent'), text: r.innerText.replace(/\s+/g, ' ').slice(0, 300) }; });
  const count = p => p.evaluate(() => document.querySelectorAll('#tape .receipt').length);

  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  await gm.click('#folks .invite'); await gm.waitForTimeout(2500);
  const invite = await gm.evaluate(() => presence.inviteUrl());
  log('the invite names the GM\'s browser', /&gm=[\w-]{20}$/.test(invite));
  await pl.goto(invite); await pl.waitForFunction(() => tableNet.synced, null, { timeout: 30000 }).catch(() => {});
  // The GM gives Sam to Dana; his sheet reaches her page
  await gm.evaluate(() => { document.getElementById('mat1').dataset.owner = 'Dana'; applyVisibility(); });
  await pl.waitForFunction(() => document.querySelector('.card[data-mat="mat1"] .actbtn'), null, { timeout: 15000 }).catch(() => {});

  // Dana: Sam's Mental Atk against Devreux, who is hidden from her
  await pl.evaluate(() => { useAction(document.querySelector('.card[data-mat="mat1"] .actbtn')); act.vs = { mat: 'mat3', kind: 'mental', name: 'Devreux' }; refreshRoll(); });
  const before = await count(gm);
  await pl.click('#roll');
  log('Dana\'s button waits for the GM', await pl.evaluate(() => document.getElementById('roll').textContent));
  await pl.waitForTimeout(2500);
  const d = await top(pl), g = await top(gm);
  log('Dana\'s receipt: her numbers, no Devreux numbers', { who: d.who, sent: d.sent, mine: /Total Influence/.test(d.text), hidden: !/Difference|\(\d/.test(d.text.split('vs Devreux')[1] || '') });
  log('  text', d.text);
  log('GM\'s receipt: rolled by Dana, with the Difference', { who: g.who, by: g.by, diff: /Difference/.test(g.text), oneNew: (await count(gm)) === before + 1 });
  log('  text', g.text);
  log('  the GM\'s page picked the row', await gm.evaluate(() => { const t = document.querySelector('#tape .receipt .row').textContent; return t; }));

  // Refused: Beauford isn't Dana's on the GM's table
  await pl.evaluate(() => { document.getElementById('mat2').dataset.owner = 'Dana'; applyVisibility(); });
  await pl.click('#mat2 .die-own'); await pl.click('#roll'); await pl.waitForTimeout(2500);
  log('Beauford isn\'t hers on the GM\'s table', (await top(pl)).who);

  // The GM leaves: nobody can roll
  await gm.close(); await pl.waitForTimeout(1500);
  await pl.click('#mat1 .die-own'); await pl.click('#roll'); await pl.waitForTimeout(800);
  log('no GM at the table', (await top(pl)).who);
  log('  the button is back', await pl.evaluate(() => document.getElementById('roll').textContent));
  await pl.screenshot({ path: out + '/gmrolls.png' });
  log('errors', errs);
  await gmCtx.close(); await plCtx.close(); await b.close();
})();
