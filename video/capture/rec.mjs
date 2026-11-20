import { chromium } from 'playwright';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const OUT = '../assets/footage';
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();

async function record(name, url, prep, secs, action) {
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  if (prep) await prep(p);
  const cdp = await ctx.newCDPSession(p);
  const dir = `/tmp/rec-${name}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const frames = [];
  cdp.on('Page.screencastFrame', async (f) => {
    const i = frames.length; const file = `${dir}/f${String(i).padStart(5,'0')}.jpg`;
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(()=>{});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const t0 = Date.now() / 1000;
  if (action) await action(p);
  await p.waitForTimeout(secs * 1000);
  await cdp.send('Page.stopScreencast');
  const tEnd = Date.now() / 1000;
  // concat list with durations
  let list = '';
  for (let i = 0; i < frames.length; i++) {
    const next = i + 1 < frames.length ? frames[i+1].t : tEnd;
    list += `file '${frames[i].file}'\nduration ${Math.max(0.001, next - frames[i].t).toFixed(4)}\n`;
  }
  list += `file '${frames.at(-1).file}'\n`;
  fs.writeFileSync(`${dir}/list.txt`, list);
  execFileSync('ffmpeg', ['-y','-loglevel','error','-f','concat','-safe','0','-i',`${dir}/list.txt`,'-vf','fps=30,format=yuv420p,scale=1920:1080','-c:v','libx264','-crf','14','-preset','slow','-movflags','+faststart', `${OUT}/${name}.mp4`]);
  console.log(name, frames.length, 'frames', (tEnd - frames[0].t).toFixed(2), 's');
  await ctx.close();
}

const SITE = 'https://arjunkshah12345-hash.github.io/watertight/';
const job = process.argv[2];
const scrollTo = (sel) => async (p) => { await p.waitForLoadState('networkidle'); await p.waitForTimeout(800); };

if (!job || job === 'hero') await record('site-hero', SITE, async (p) => { await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500); }, 6);
if (!job || job === 'verify') await record('site-verify', SITE, async (p) => { await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500); }, 9, async (p) => {
  await p.evaluate(() => { const el = document.querySelector('#verify'); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) / 2, behavior: 'instant' }); });
});
if (!job || job === 'proof') await record('site-proof', SITE, async (p) => { await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500); }, 9, async (p) => {
  await p.evaluate(() => { const el = document.querySelector('#proof'); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) / 2, behavior: 'instant' }); });
});
if (!job || job === 'deck') await record('site-deck', SITE, async (p) => { await p.waitForLoadState('networkidle'); await p.waitForTimeout(1500); }, 6, async (p) => {
  await p.evaluate(() => { const el = [...document.querySelectorAll('section')][4]; window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + (el.offsetHeight - innerHeight) / 2, behavior: 'instant' }); });
});
await b.close();
