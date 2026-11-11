// The roll row docks on your pool; rolls use Influence cards; sweeps, restores, and End.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const box = async sel => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(60); };
  const log = (k, v) => console.log(k.padEnd(50), JSON.stringify(v));
  const row = () => p.evaluate(() => { const r = document.getElementById('roller'); return { at: r.closest('.mat') ? r.closest('.mat').querySelector('.who').textContent : 'nowhere',
    adv: r.querySelector('.res-dice').title.split('.')[0], extra: r.querySelector('.extra').className, mod: r.querySelector('.mod').textContent, y: r.querySelectorAll('.ydice .die').length, bonus: r.querySelector('.bonus').textContent }; });
  const pool = m => p.evaluate(m => [...document.querySelectorAll(`#${m} .row .infl`)].map(c => c.dataset.name + (c.dataset.used ? '(used)' : '') + (c.dataset.keep ? '(kept)' : '')), m);
  const used = m => p.evaluate(m => [...document.querySelectorAll(`#${m} .usedpile .infl`)].map(c => c.dataset.name), m);

  log('bar: no roll controls, has register', await p.evaluate(() => [!!document.querySelector('#drawer .roller'), !!document.querySelector('#drawer .register'), document.getElementById('rtab').textContent]));
  log('roll row before any die click', await row());
  await p.click('#mat3 .die-own');
  log('GM clicks Devreux\'s die: row docks', await row());
  await p.click('#roller .res-dice');
  log('White opens the Difference menu', await p.evaluate(() => [...document.querySelectorAll('.advmenu button')].map(b => b.textContent.trim())));
  await p.click('.advmenu button:has-text("+7 to +9")');
  log('pick +7 to +9: Green + 1', await row());
  await p.click('#roller .res-dice'); await p.click('.advmenu button:has-text("Outclassed")');
  log('pick Outclassed', await row());
  await p.click('#roller .res-dice'); await p.mouse.click(700, 880);
  log('click away closes the menu', await p.evaluate(() => document.querySelector('.advmenu').hidden));
  await p.click('#roller .res-dice'); await p.click('.advmenu button:has-text("−2 to +2")');
  await p.click('#roller .ydice'); await p.click('#roller .bonus'); await p.click('#roller .bonus'); await p.click('#roller .bonus', { modifiers: ['Shift'] });
  log('back to White, 2 Yellows, bonus +1', await row());
  // put two Devreux cards in her pool, roll: they are used
  await dragTo(await box('.infl[data-name="Keep the Peace"] .nm'), await box('#mat3 [data-pool=Main]'));
  await dragTo(await box('.infl[data-name="Old Sympathy for Sparkers"] .nm'), await box('#mat3 [data-pool=Edge]'));
  await p.click('#roll'); await p.waitForTimeout(100);
  log('rolled: receipt', await p.evaluate(() => { const r = document.querySelector('#tape .receipt'); return [r.querySelector('.who').textContent, r.querySelector('.outcome').textContent]; }));
  log('  pool cards used', await pool('mat3'));
  // a tap from Saloon Gossip can't merge into a used card; a used card's click is plain
  log('  Saloon Gossip before', await p.evaluate(() => [...document.querySelectorAll('.rent')].find(r => /Saloon/.test(r.textContent)).textContent));
  await p.click('#mat3 [data-pool=Main] .infl');
  log('  click on used plain card: +2 (Create Influence)', await p.evaluate(() => document.querySelector('#mat3 [data-pool=Main] .infl').dataset.v));
  // next roll sweeps the used cards into the used pile
  await p.click('#roll'); await p.waitForTimeout(100);
  log('second roll: swept to used pile', { pool: await pool('mat3'), used: await used('mat3'), count: await p.evaluate(() => document.querySelector('#mat3 .uhead b').textContent) });
  await p.click('#mat3 .uhead'); await p.click('#mat3 .usedpile .infl[data-name="Keep the Peace"]');
  log('restore Keep the Peace from used pile', { pool: await pool('mat3'), used: await used('mat3') });
  await p.click('#roll'); await p.waitForTimeout(100);
  log('third roll: kept card stays for this roll', { pool: await pool('mat3'), used: await used('mat3') });
  // register
  await p.click('#rup'); await p.click('#rup'); await p.click('#rup'); await p.click('#rdown'); await p.waitForTimeout(200);
  log('register ▲▲▲▼', await p.evaluate(() => document.getElementById('rtab').textContent));
  // spend a Bias, then End
  await p.click('.card[data-mat="mat1"] .front .flipcorner'); await p.waitForTimeout(600);
  await p.click('.card[data-mat="mat1"] .line.bias[data-row="Sig"] .lt'); await p.keyboard.type('Uncertain'); await p.mouse.click(700, 900);
  await dragTo(await box('.card[data-mat="mat1"] .line.bias[data-row="Sig"] .glyph'), { x: 800, y: 800 });
  log('Bias spent', await p.evaluate(() => document.querySelector('.card[data-mat="mat1"] .line.bias[data-row="Sig"] .spent').textContent));
  await p.click('#rend');
  log('End once: tab up, nothing happens', await p.evaluate(() => [document.querySelector('.register').classList.contains('armed'), getComputedStyle(document.querySelector('.register .tab')).transform, document.getElementById('rtab').textContent]));
  await p.click('#rend'); await p.waitForTimeout(200);
  log('End twice: round 00', await p.evaluate(() => document.getElementById('rtab').textContent));
  log('  Bias recharged', await p.evaluate(() => document.querySelector('.card[data-mat="mat1"] .line.bias[data-row="Sig"] .spent').textContent || '(none)'));
  log('  used piles empty, plain cards home', { used: await used('mat3'), drawer: await p.evaluate(() => [...document.querySelectorAll('#mat3 .tray .cards > .infl')].map(c => c.dataset.name)), pool: await pool('mat3') });
  // as Player 1: Devreux's die claims (unclaimed); roll row leaves when you lose a pool
  await p.selectOption('#me', 'Player 1');
  log('as Player 1: row left Devreux (not mine)', await row());
  await p.click('#mat1 .die-own');
  log('P1 clicks Sam\'s die: docks on Sam', await row());
  await p.screenshot({ path: process.argv[2] + '/ro.png' });
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
