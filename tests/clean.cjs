// cleanPiece: a piece from another page can't run anything
const { chromium } = require('/home/deck/work/HollowStuff/HollowWorld/node_modules/playwright');
(async () => {
  const b = await chromium.connectOverCDP('http://localhost:9333');
  const ctx = await b.newContext(); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(1000);
  const r = await p.evaluate(() => {
    window.pwned = 0;
    const bad = `<div class="sticky obj" data-oid="oabc12345" style="left:10px;top:10px;background:url(https://evil.example/x)" onclick="pwned++">
      <script>pwned++</script><img src="x" onerror="pwned++"><a href="javascript:pwned++">a</a><iframe srcdoc="<script>parent.pwned++</script>"></iframe>
      <svg onload="pwned++"></svg><div class="txt" contenteditable onfocus="pwned++">hello</div></div>`;
    const el = cleanPiece(bad, 'oabc12345');
    world.append(el); el.querySelector('a')?.click(); el.click(); el.querySelector('.txt').focus();
    return { kept: !!el, html: el.outerHTML.replace(/\s+/g, ' '), wrongOid: cleanPiece(bad, 'oother'), notObj: cleanPiece('<div data-oid="oabc12345"></div>'),
      two: cleanPiece('<div class="obj" data-oid="oabc12345"></div><div></div>') };
  });
  await p.waitForTimeout(500);
  console.log(JSON.stringify(r, null, 1));
  console.log('ran nothing', await p.evaluate(() => window.pwned === 0), 'errors', errs);
  await ctx.close(); await b.close();
})();
