import { chromium } from 'playwright';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const OUT = '../assets/footage';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto('http://localhost:4310/', { waitUntil: 'networkidle' });
await p.waitForFunction(() => document.querySelector('#hullBtn').classList.contains('ok'), null, { timeout: 30000 });
await p.waitForTimeout(800);
await p.screenshot({ path: `${OUT}/app-start.png` });
// inspect dialog still
await p.click('#inspectBtn'); await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/app-inspect.png` });
await p.click('#inspectDlg [data-close]'); await p.waitForTimeout(400);

const cdp = await ctx.newCDPSession(p);
const dir = `/tmp/rec-app`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
const frames = [];
cdp.on('Page.screencastFrame', async (f) => {
  const file = `${dir}/f${String(frames.length).padStart(5,'0')}.jpg`;
  fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
  frames.push({ file, t: f.metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(()=>{});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 3840, maxHeight: 2160 });
const t0 = Date.now() / 1000;
const marks = {};
const mark = async (name, sel) => {
  const box = sel ? await p.locator(sel).first().boundingBox() : null;
  marks[name] = { t: +(Date.now()/1000 - t0).toFixed(3), box };
};
const wait = (ms) => p.waitForTimeout(ms);
await wait(1500);
await mark('clickSealed', '.chip.sealed'); await p.click('.chip.sealed >> nth=0');
await wait(4500);
await mark('clickNRR', '.chip >> nth=0'); await p.click('.chip >> nth=0');
await wait(5000);
await mark('clickPayload', '#log .link'); await p.click('#log .link >> nth=0');
await wait(4500);
await mark('closePayload', '#payloadDlg [data-close]'); await p.click('#payloadDlg [data-close]');
await wait(1200);
await mark('clickClaims', '#claimsBtn'); await p.click('#claimsBtn');
await wait(6000);
await mark('clickRevoke', '#revokeBtn'); await p.click('#revokeBtn');
await wait(5000);
await mark('end');
await cdp.send('Page.stopScreencast');
const tEnd = Date.now()/1000;
const first = frames[0].t;
marks.firstFrameOffset = +(first - t0).toFixed(3);
let list = '';
for (let i = 0; i < frames.length; i++) {
  const next = i + 1 < frames.length ? frames[i+1].t : tEnd;
  list += `file '${frames[i].file}'\nduration ${Math.max(0.001, next - frames[i].t).toFixed(4)}\n`;
}
list += `file '${frames.at(-1).file}'\n`;
fs.writeFileSync(`${dir}/list.txt`, list);
// pad start so video t matches t0
execFileSync('ffmpeg', ['-y','-loglevel','error','-f','concat','-safe','0','-i',`${dir}/list.txt`,'-vf',`tpad=start_duration=${Math.max(0,first-t0)}:start_mode=clone,fps=30,format=yuv420p`,'-c:v','libx264','-crf','18','-preset','medium','-movflags','+faststart', `${OUT}/app-flow.mp4`]);
await p.screenshot({ path: `${OUT}/app-revoked.png` });
// real 410 from the server
const res = await p.evaluate(async () => {
  const id = document.querySelector('#dealMeta').innerText.match(/deal_[a-z0-9]+/)[0];
  const r = await fetch(`/api/deals/${id}/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: "What's net revenue retention?" }) });
  return { id, status: r.status, statusText: r.statusText, body: await r.text() };
});
fs.writeFileSync(`${OUT}/revoke-410.json`, JSON.stringify(res, null, 2));
fs.writeFileSync(`${OUT}/app-marks.json`, JSON.stringify(marks, null, 2));
console.log(frames.length, 'frames', JSON.stringify(marks, null, 1), JSON.stringify(res));
await b.close();
