// Secrets on the wire: a character's sheet and Influence cards reach only its owner and the GM.
// An eavesdropper at the table (Eve: she has the invite, owns nothing) looks for the secret words in
// everything that reaches her page. Dana's page shows others' characters redacted,
// gets Sam's whole sheet once he's hers (and loses it when he's taken back), and her change to a
// piece she can only see redacted is refused. Boot Hill is redacted too.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const gmCtx = await b.newContext(), plCtx = await b.newContext();
  const gm = await gmCtx.newPage(), pl = await plCtx.newPage();
  for (const p of [gm, pl]) await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; gm.on('pageerror', e => errs.push('gm: ' + e.message)); pl.on('pageerror', e => errs.push('player: ' + e.message));
  pl.on('dialog', d => d.accept('Dana'));
  const log = (k, v) => console.log(k.padEnd(52), JSON.stringify(v));

  await gm.goto('http://127.0.0.1:8765/index.html'); await gm.waitForTimeout(2500);
  await gm.click('#folks .invite'); await gm.waitForTimeout(2500);
  
  // the eavesdropper: Eve, at the table with the invite, owning nothing. Everything that reaches her
  // page, parts joined back into whole messages. (Nobody outside the room hears anything now.)
  const wire = [], parts = new Map();
  const evCtx = await b.newContext(), eve = await evCtx.newPage();
  eve.on('dialog', d => d.accept('Eve'));
  await eve.exposeFunction('record', m => {
    wire.push({ kind: m.kind, text: m.text });
    try { const pt = JSON.parse(m.text).part;
      if (pt) { const k = m.kind + pt.k; const e = parts.get(k) || []; e[pt.i] = pt.d; parts.set(k, e); if (e.filter(x => x !== undefined).length === pt.n) wire.push({ kind: m.kind + ' (joined)', text: e.join('') }); } } catch {}
  });
  await eve.goto(await gm.evaluate(() => presence.inviteUrl()), { waitUntil: 'domcontentloaded' });
  await eve.waitForFunction(() => window.presence, null, { timeout: 10000 });
  await eve.evaluate(() => { presence._tap = m => window.record(m); });
  await eve.waitForFunction(() => tableNet.synced, null, { timeout: 30000 }).catch(() => {});

  await pl.goto(await gm.evaluate(() => presence.inviteUrl())); await pl.waitForTimeout(5000);
  const cardText = (p, mat) => p.evaluate(m => document.querySelector(`.card[data-mat="${m}"]`)?.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), mat);
  const drawer = (p, mat) => p.evaluate(m => [...document.querySelectorAll(`#${m} .tray .infl`)].map(c => c.querySelector('.nm').textContent + ' ' + c.dataset.v), mat);
  log('Dana joins: synced', await pl.evaluate(() => tableNet.synced));
  log('  Devreux (GM\'s): drawer, sheet', { drawer: await drawer(pl, 'mat3'), sheet: await cardText(pl, 'mat3'), gm: (await drawer(gm, 'mat3')).slice(0, 2) });
  log('  Sam (Player 1\'s) sheet', await cardText(pl, 'mat1'));
  log('  Dana\'s pools still show values', await pl.evaluate(() => [...document.querySelectorAll('#mat2 .slot .chip')].map(c => c.textContent.trim())));

  await gm.evaluate(() => { document.getElementById('mat1').dataset.owner = 'Dana'; applyVisibility(); });
  await pl.waitForTimeout(2000);
  log('GM gives Sam to Dana: his sheet arrives', await cardText(pl, 'mat1'));

  await pl.evaluate(() => { const n = document.querySelector('.card[data-mat="mat1"] .notes'); n.focus(); n.textContent = 'Dana\'s secret plan'; n.blur(); });
  await gm.waitForTimeout(2000);
  log('Dana writes on Sam\'s sheet: the GM has it', await gm.evaluate(() => document.querySelector('.card[data-mat="mat1"] .notes').textContent));

  // one of Devreux's Influences, loose on the table
  const oid = await gm.evaluate(() => { const c = document.querySelector('#mat3 .tray .infl'); c.classList.remove('home'); c.style.left = '700px'; c.style.top = '700px'; c.style.zIndex = ++zTop; world.append(c); c.dataset.oid = newOid(); return c.dataset.oid; });
  await pl.waitForTimeout(2000);
  const loose = p => p.evaluate(o => { const c = objEl(o); return c && { name: c.querySelector('.nm').textContent, v: c.dataset.v, title: c.title }; }, oid);
  log('Devreux\'s Influence loose: Dana sees', await loose(pl));
  await pl.evaluate(o => { objEl(o).querySelector('.nm').textContent = 'hacked'; }, oid);
  await pl.waitForTimeout(2500);
  log('  Dana renames it: refused', { gm: await loose(gm), player: await loose(pl) });

  await gm.evaluate(() => { document.getElementById('mat1').dataset.owner = 'Player 1'; applyVisibility(); });
  await pl.waitForTimeout(2000);
  log('GM takes Sam back: his sheet goes blank', await cardText(pl, 'mat1'));

  await gm.evaluate(() => { bury(document.getElementById('mat3')); });
  await pl.waitForTimeout(2000);
  log('GM buries Devreux: Dana\'s Boot Hill', await pl.evaluate(() => yards.flatMap(y => y.items.map(g => ({ name: g.name, text: g.els.map(e => e.textContent.replace(/\s+/g, ' ').trim()).join(' | ').slice(0, 60) })))));

  await gm.waitForTimeout(500);
  const secrets = ['Saloon Proprietor', 'Keep the Peace', 'Self-Preservation', 'Winkums', 'Samuel Diamond', 'Dana\'s secret plan', 'Dana\\\'s secret plan'];
  const kinds = {}; wire.forEach(w => { kinds[w.kind] = (kinds[w.kind] || 0) + 1; });
  log('Eve\'s page heard', kinds);
  log('  secrets in the clear', secrets.filter(s => wire.some(w => w.text.includes(s))));
  log('  sealed boxes seen', wire.filter(w => /"sealed":\{"[\w-]+"/.test(w.text) || /"edit":\{"iv"/.test(w.text)).length);
  log('errors', errs);
  await gmCtx.close(); await plCtx.close(); await evCtx.close(); await b.close();
})();
