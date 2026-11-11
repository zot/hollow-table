// A player sees their own side, the opponent's name, and the dice; not the Difference.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const box = async sel => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; };
  const dragTo = async (f, t) => { await p.mouse.move(f.x, f.y); await p.mouse.down(); await p.mouse.move(f.x+10, f.y+10, {steps:3}); await p.mouse.move(t.x, t.y, {steps:8}); await p.mouse.up(); await p.waitForTimeout(80); };
  const log = (k, v) => console.log(k.padEnd(46), JSON.stringify(v));
  const view = () => p.evaluate(() => { const r = document.getElementById('roller'); return { base: document.querySelector('#rollinfo .base').textContent, vs: document.querySelector('#rollinfo .vs').textContent, white: r.querySelector('.res-dice').title, dice: r.querySelector('.extra').className.replace('die extra', '').trim() || 'none' }; });
  // the GM works Sam's roll row and aims at Devreux (hidden from P1)
  await p.click('#mat1 .die-own');
  await p.click('.card[data-mat="mat1"] .actbtn[data-label="Mental Atk / Req"]');
  await dragTo(await box('#rollinfo .base'), await box('#mat3 .row'));
  await p.click('#defchoice button:has-text("Mental")');
  log('GM view of Sam\'s row: no numbers, row auto-picked', await view());
  await p.selectOption('#me', 'Player 1');
  log('Player 1 view: no Difference', await view());
  await p.click('#roller .res-dice');
  log('  White menu locked', await p.evaluate(() => document.querySelector('.advmenu').hidden));
  await p.click('#roll'); await p.waitForTimeout(80);
  log('  receipt', await p.evaluate(() => document.querySelector('#tape .receipt').innerText.split('\n').filter(l => l.trim() && !/^\d$/.test(l.trim())).slice(0, 5)));
  // against a visible opponent the receipt keeps the Difference
  await p.selectOption('#me', 'GM');
  await dragTo(await box('#rollinfo .base'), await box('#mat2 .row'));
  await p.click('#defchoice button:has-text("Mental")');
  await p.click('#roll'); await p.waitForTimeout(80);
  log('Sam vs Beauford (P1 can\'t see P2): no Difference', await p.evaluate(() => document.querySelector('#tape .receipt').innerText.split('\n').filter(l => /vs|:/.test(l)).slice(0, 3)));
  // the GM's own NPC against a PC shows numbers
  await p.click('#mat3 .die-own');
  await p.click('.card[data-mat="mat3"] .actbtn[data-label="Attack"]');
  await dragTo(await box('#rollinfo .base'), await box('#mat1 .row'));
  await p.click('#defchoice button:has-text("Mental")');
  log('GM\'s Devreux vs Sam: numbers shown', await view());
  await p.click('#mat1 .die-own', { modifiers: ['Shift'] });   // Sam open: everyone sees Sam; but can open-Sam's owner see Beauford?
  await p.click('#mat3 .die-own', { modifiers: ['Shift'] });   // open Devreux too
  await p.click('#mat1 .die-own');                              // GM claims Sam
  await p.click('.card[data-mat="mat1"] .actbtn[data-label="Mental Atk / Req"]');
  await dragTo(await box('#rollinfo .base'), await box('#mat3 .row'));
  await p.click('#defchoice button:has-text("Mental")');
  await p.click('#roll'); await p.waitForTimeout(80);
  log('GM-owned Sam vs open Devreux: Difference shown', await p.evaluate(() => document.querySelector('#tape .receipt').innerText.split('\n').filter(l => /vs|:/.test(l)).slice(0, 3)));
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
