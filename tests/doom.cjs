// Boot Hill: two shift-clicks delete an item forever; on the name, everything in the graveyard.
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const p = await (await b.newContext()).newPage(); await p.setViewportSize({ width: 1600, height: 950 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html?' + Date.now()); await p.waitForTimeout(900);
  const log = (k, v) => console.log(k.padEnd(46), JSON.stringify(v));
  const yd = () => p.evaluate(() => yards.map(y => `${y.name}[${y.items.map(i => i.name).join(',')}]`));
  await p.evaluate(() => { bury(document.getElementById('mat1')); bury(document.getElementById('mat2')); bury(document.querySelector('.sticky')); });
  log('buried Sam, Beauford, the note', await yd());
  await p.click('#boothill');
  const shiftDown = async sel => { await p.keyboard.down('Shift'); const r = await p.locator(sel).first().boundingBox(); await p.mouse.click(r.x + 20, r.y + 10); await p.keyboard.up('Shift'); await p.waitForTimeout(40); };
  await shiftDown('#graves .items button:has-text("Sam")');
  log('one shift-click: armed, nothing gone', [await yd(), await p.evaluate(() => document.querySelector('#graves .doom')?.textContent)]);
  await p.waitForTimeout(3200);
  log('3 s later: reverted', [await yd(), await p.evaluate(() => !!document.querySelector('#graves .doom'))]);
  await shiftDown('#graves .items button:has-text("Sam")'); await shiftDown('#graves .items button.doom');
  log('two shift-clicks: Sam gone forever', await yd());
  log('  Sam not on the table either', await p.evaluate(() => !!document.getElementById('mat1')));
  await shiftDown('#graves .yname');
  log('shift-click the name: armed', await p.evaluate(() => [document.querySelector('#graves .yname').value, document.querySelector('#graves .yname').readOnly]));
  await shiftDown('#graves .yname');
  log('again: everything here deleted', await yd());
  log('errors', errs);
  await p.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
