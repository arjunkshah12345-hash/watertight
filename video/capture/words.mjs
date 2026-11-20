import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
await p.goto('http://localhost:4310/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.addStyleTag({ content: '*{animation-duration:0s!important;transition:none!important;scroll-behavior:auto!important}' });
await p.click('.chip.sealed >> nth=0'); await p.waitForTimeout(300);
await p.click('.chip >> nth=0'); await p.waitForTimeout(600);
const find = (needle, root) => p.evaluate(([needle, root]) => {
  const el = document.querySelector(root); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode())) { const i = n.textContent.indexOf(needle); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + needle.length); const b = r.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; } }
  return null; }, [needle, root]);
console.log('91.6', await find('91.6%', '.msg.a:last-child'));
console.log('131', await find('131%', '.msg.a:last-child'));
await p.click('#log .link >> nth=0'); await p.waitForTimeout(300);
console.log('role0of133', await find('0 of 133', '#payloadRole'));
await b.close();
