import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = '../assets/site'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { const st = window.setTimeout; window.setTimeout = (fn, ms, ...a) => st(fn, ms === 170 ? 1600 : ms, ...a); });
const p = await ctx.newPage();
await p.goto('https://arjunkshah12345-hash.github.io/watertight/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/hero.png` });
await p.evaluate(() => { const el = document.querySelector('#verify'); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 40, behavior: 'instant' }); });
const t0 = Date.now();
const log = [];
for (let i = 0; i < 20; i++) {
  const t = Date.now() - t0;
  await p.screenshot({ path: `${OUT}/verify-${String(i).padStart(2,'0')}.png` });
  const txt = await p.evaluate(() => { const s = [...document.querySelectorAll('#verify span')].find(e => /of 8/.test(e.textContent)); return s ? s.textContent : document.querySelector('#verify').innerText.match(/\d of 8/)?.[0]; });
  log.push({ i, t, txt }); console.log(i, t, txt);
  await p.waitForTimeout(700);
}
const box = await p.evaluate(() => { const s = [...document.querySelectorAll('#verify *')].find(e => e.textContent.trim() === 'hull inspection'); let el = s; for (let k = 0; k < 4 && el; k++) { const r = el.getBoundingClientRect(); if (r.height > 300) break; el = el.parentElement; } const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
console.log(JSON.stringify(box));
fs.writeFileSync(`${OUT}/verify-log.json`, JSON.stringify({ log, box }, null, 1));
await b.close();
