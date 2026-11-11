// The write-through store: the table survives a reload; images keep their bytes; checkpoints
// restore (and the restore can be undone); export then import makes a second, identical game.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const out = process.argv[2] || '/tmp';
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const ctx = await b.newContext({ acceptDownloads: true });
  const p = await ctx.newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const url = 'http://127.0.0.1:8765/index.html';
  await p.goto(url); await p.waitForTimeout(900);
  const log = (k, v) => console.log(k.padEnd(48), JSON.stringify(v));
  const st = () => p.evaluate(() => ({
    game: game, objs: world.children.length,
    devreux: (document.querySelector('#mat3') || {}).style?.left,
    chips: document.querySelectorAll('#world .chip:not(.infl)').length,
    tape: document.querySelectorAll('#tape .receipt').length, round: document.getElementById('rtab').textContent,
    images: [...document.querySelectorAll('#world .image img')].map(i => i.naturalWidth),
    buried: yards.reduce((n, y) => n + y.items.length, 0) }));
  log('first visit: the playtest scene, saved as a game', await st());

  // change things: move Devreux, click a pool (+1), roll twice, round up, add an image, bury the sticky
  await p.evaluate(() => { document.querySelector('#mat3').style.left = '1000px'; });
  const slot = await p.locator('#mat1 [data-pool=Main]').boundingBox();
  await p.mouse.click(slot.x + slot.width / 2, slot.y + slot.height - 6);
  await p.click('#mat3 .die-own'); await p.click('#roll'); await p.click('#roll');
  await p.click('#rup'); await p.click('#rup');
  const png = path.join(out, 'persist-dot.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC', 'base64'));
  await p.setInputFiles('#file', png);
  await p.evaluate(() => bury(document.querySelector('#world .sticky')));
  await p.waitForTimeout(900);
  const before = await st();
  log('after changes', before);

  await p.reload(); await p.waitForTimeout(1200);
  const after = await st();
  log('reload: the same table', after);
  log('  identical', JSON.stringify(before) === JSON.stringify(after));

  // checkpoint, change, restore, then undo the restore
  await p.evaluate(() => checkpoint('Two rolls in'));
  await p.click('#mat3 .die-own'); await p.click('#roll'); await p.waitForTimeout(600);
  log('third roll', (await st()).tape);
  const cps = async () => p.evaluate(async () => (await idb.byGame('checkpoints', game)).sort((a, b) => b.at - a.at).map(c => c.name));
  await p.evaluate(async () => { const c = (await idb.byGame('checkpoints', game)).find(c => c.name === 'Two rolls in'); await restoreCheckpoint(c.id); });
  log('restore "Two rolls in": two rolls again', (await st()).tape);
  log('  checkpoints, newest first', await cps());
  await p.evaluate(async () => { const c = (await idb.byGame('checkpoints', game)).find(c => c.name.startsWith('Before restoring')); await restoreCheckpoint(c.id); });
  log('undo the restore: three rolls', (await st()).tape);

  // End makes a checkpoint of the conflict before resetting
  await p.click('#rend'); await p.click('#rend'); await p.waitForTimeout(600);
  log('End twice: round reset, checkpointed', { round: (await st()).round, newest: (await cps())[0] });

  // the ledger panel
  await p.click('#ledgerbtn'); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(out, 'persist-ledger.png') });
  log('ledger: name, status, checkpoints, games', await p.evaluate(() => ({ name: document.querySelector('#ledger .gname').value,
    status: document.querySelector('#ledger .status').textContent, cps: document.querySelectorAll('#ledger .cps button').length,
    games: [...document.querySelectorAll('#ledger .games button span')].map(s => s.textContent) })));

  // export, then import as a new game
  // flatpak Chrome saves downloads inside its sandbox, so catch the file in the page instead
  const text = await p.evaluate(async () => {
    const real = HTMLAnchorElement.prototype.click; let got;
    HTMLAnchorElement.prototype.click = function () { got = { href: this.href, name: this.download }; };
    document.querySelector('#ledger .ex').click();
    for (let i = 0; i < 50 && !got; i++) await new Promise(r => setTimeout(r, 50));
    HTMLAnchorElement.prototype.click = real;
    return { name: got.name, body: await (await fetch(got.href)).text() };
  });
  const file = path.join(out, text.name); fs.writeFileSync(file, text.body);
  const j = JSON.parse(text.body);
  log('export: file', { name: text.name, format: j.format, records: Object.keys(j.records).length, checkpoints: j.checkpoints.length, blobs: Object.keys(j.blobs).length, kb: Math.round(text.body.length / 1024) });
  const orig = await st();
  await p.setInputFiles('#ledger input[type=file]', { name: text.name, mimeType: 'application/json', buffer: Buffer.from(text.body) }); await p.waitForTimeout(1500);
  const imported = await st();
  log('import: a new game', { was: orig.game, now: imported.game });
  delete orig.game; delete imported.game;
  log('  same table', JSON.stringify(orig) === JSON.stringify(imported));
  await p.click('#ledgerbtn'); await p.click('#ledgerbtn'); await p.waitForTimeout(400);
  log('  games listed', await p.evaluate(() => [...document.querySelectorAll('#ledger .games button span')].map(s => s.textContent)));

  // a new, empty game; then switch back
  await p.click('#ledger .nw'); await p.waitForTimeout(800);
  log('new game: empty table', await st());
  await p.click('#ledger .games button:not(.current) >> nth=-1'); await p.waitForTimeout(1000);
  log('open the first game again', await st());
  log('errors', errs);
  await ctx.close(); await b.close();
})();
