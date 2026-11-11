// Your seat: the view, the docked roll row (action, opponent, White row, dice), the tape rolled up,
// Boot Hill's open yard, an open used pile. All of it survives a reload, and none of it touches the
// game's records (which are what get checkpointed, exported, and later sent to the other players).
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const ctx = await b.newContext();
  const p = await ctx.newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(1000);
  const log = (k, v) => console.log(k.padEnd(44), JSON.stringify(v));
  const st = () => p.evaluate(() => ({
    view: [view.x, view.y, view.z].map(n => Math.round(n * 100) / 100),
    docked: roller.closest('.mat')?.id || null, action: act?.label || null, vs: act?.vs?.name || null,
    row: advI, dice: [...steps.y !== undefined ? [steps.y, steps.b] : []], marked: document.querySelector('.actline.on .actbtn')?.dataset.label || null,
    targeted: [...document.querySelectorAll('.mat.targeted')].map(m => m.id),
    tapeUp: tape.classList.contains('up'), graves: !graveList.hidden, usedOpen: [...document.querySelectorAll('.usedpile .list:not([hidden])')].map(l => l.closest('.mat').id) }));
  const records = () => p.evaluate(async () => { await flush(); return JSON.stringify([...saved].sort()); });

  await p.click('#mat3 .die-own');
  await p.click('#roll');                          // something on the tape to roll up
  await p.waitForTimeout(800);
  const game0 = await records();
  log('start', await st());

  // seat-only things
  await p.evaluate(() => {
    useAction(document.querySelector('.card[data-mat="mat3"] .actbtn'));
    act.vs = { mat: 'mat1', kind: 'mental', name: 'Sam' }; refreshRoll();
    advI = 2; act.advManual = true; adj.y += 1; refreshRoll();
    view.x += 120; view.y -= 40; view.z = 0.8; applyView();
  });
  await p.click('#paperroll');
  await p.click('#mat2 .uhead');
  await p.click('#boothill');
  await p.waitForTimeout(800);
  const before = await st();
  log('seat set up', before);
  log('  the game\'s records unchanged', game0 === await records());
  log('  kept in localStorage, not the database', await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('glimmer.seat'))));

  await p.reload(); await p.waitForTimeout(1300);
  const after = await st();
  log('reload', after);
  log('  just like it was', JSON.stringify(before) === JSON.stringify(after));

  // a player's page on the same browser keeps a seat of its own
  await p.goto('http://127.0.0.1:8765/index.html?as=Player%202'); await p.waitForTimeout(1300);
  log('Player 2\'s page: its own seat', await st());
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(1300);
  log('back as GM: the GM\'s seat again', JSON.stringify(before) === JSON.stringify(await st()));

  // a checkpoint restore keeps your seat
  await p.evaluate(async () => { await checkpoint('seat test'); const c = (await idb.byGame('checkpoints', game)).find(c => c.name === 'seat test'); await restoreCheckpoint(c.id); });
  log('restore a checkpoint: seat kept', JSON.stringify(before) === JSON.stringify(await st()));
  await p.screenshot({ path: (process.argv[2] || '/tmp') + '/seat.png' });
  log('errors', errs);
  await ctx.close(); await b.close();
})();
