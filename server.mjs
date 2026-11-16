import { createServer } from "node:http";
import { fork } from "node:child_process";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { newKey, sealRoomIntoVault, shredVault } from "./lib/vault.mjs";
import { verifyHull } from "./lib/attest.mjs";
import { config as tr, live as trLive } from "./lib/inference.mjs";
import { live as ctxLive } from "./lib/context.mjs";
import { POLICIES, DEFAULT_POLICY } from "./lib/policy.mjs";

const ROOT = new URL(".", import.meta.url).pathname;
const PORT = Number(process.env.PORT || 4310);
const MAX_UPLOAD = 2_000_000;

// The founder's room as uploaded. In-memory only; the vault holds the encrypted copies.
const room = JSON.parse(await readFile(join(ROOT, "rooms/halyard/room.json"), "utf8"));
const roomFiles = await Promise.all(room.files.map(async (name) => ({ name, data: await readFile(join(ROOT, "rooms/halyard", name)) })));

const deals = new Map();

function spawnCompartment(deal) {
  const child = fork(join(ROOT, "lib/compartment.mjs"), [], { stdio: ["ignore", "inherit", "inherit", "ipc"] });
  const pending = new Map();
  let seq = 0;
  child.on("message", (m) => {
    if (m.type === "egress") return void deal.log.unshift({ n: ++deal.logSeq, ...m.event });
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    m.ok ? p.resolve(m.result) : p.reject(new Error(m.error));
  });
  child.on("exit", () => {
    for (const p of pending.values()) p.reject(new Error("Compartment sealed"));
    pending.clear();
  });
  deal.call = (type, msg = {}) =>
    new Promise((resolve, reject) => {
      if (!child.connected) return reject(new Error("Compartment sealed"));
      const id = ++seq;
      pending.set(id, { resolve, reject });
      child.send({ id, type, ...msg });
    });
  deal.child = child;
}

async function openDeal({ investor = "Demo investor", policy } = {}) {
  const id = "deal_" + randomBytes(5).toString("hex");
  const key = newKey();
  const sealedFiles = await sealRoomIntoVault(id, key, roomFiles);
  const deal = { id, investor, key, status: "open", openedAt: new Date().toISOString(), log: [], logSeq: 0, sealedFiles };
  spawnCompartment(deal);
  deal.view = await deal.call("init", { key: key.toString("hex"), dealId: id, room, policy });
  deals.set(id, deal);
  return deal;
}

async function revokeDeal(deal) {
  const pid = deal.child.pid;
  deal.child.kill("SIGKILL");
  deal.key.fill(0);
  const shredded = await shredVault(deal.id);
  deal.status = "revoked";
  deal.revoked = { at: new Date().toISOString(), pid, shredded, keyBytesZeroed: 32 };
  deal.log.unshift({ n: ++deal.logSeq, at: deal.revoked.at, kind: "revoked", to: "nowhere", bytes: 0, note: `Process ${pid} killed, 256-bit key zeroed, ${shredded} encrypted files shredded` });
  return deal.revoked;
}

const publicDeal = (d) => ({
  id: d.id,
  investor: d.investor,
  status: d.status,
  openedAt: d.openedAt,
  pid: d.child?.pid,
  revoked: d.revoked,
  sealedFiles: d.sealedFiles,
  view: d.status === "open" ? d.view : null,
  log: d.log.slice(0, 60),
});

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_UPLOAD) throw Object.assign(new Error("Payload too large"), { status: 413 });
    chunks.push(c);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

let hullCache = null;

const routes = [
  ["GET", /^\/api\/config$/, () => ({
    company: room.company,
    tagline: room.tagline,
    files: roomFiles.map((f) => ({ name: f.name, bytes: f.data.length })),
    claims: room.claims,
    policies: POLICIES,
    defaultPolicy: DEFAULT_POLICY,
    inference: { live: trLive(), host: new URL(tr.base).host, model: tr.model, privacy: "confidential" },
    search: { live: ctxLive(), host: "api.context.dev" },
  })],
  ["GET", /^\/api\/hull$/, async (req) => {
    const fresh = new URL(req.url, "http://x").searchParams.has("fresh");
    if (!fresh && hullCache && Date.now() - hullCache.t < 60_000) return hullCache.v;
    const v = await verifyHull(tr.base);
    hullCache = { t: Date.now(), v };
    return v;
  }],
  ["POST", /^\/api\/deals$/, async (req) => publicDeal(await openDeal(await body(req)))],
  ["GET", /^\/api\/deals\/([\w]+)$/, (req, [, id]) => publicDeal(need(id))],
  ["POST", /^\/api\/deals\/([\w]+)\/policy$/, async (req, [, id]) => {
    const d = need(id, true);
    d.view = await d.call("policy", { policy: (await body(req)).policy || {} });
    return publicDeal(d);
  }],
  ["POST", /^\/api\/deals\/([\w]+)\/ask$/, async (req, [, id]) => {
    const d = need(id, true);
    const { question } = await body(req);
    if (!question?.trim()) throw Object.assign(new Error("Empty question"), { status: 400 });
    const result = await d.call("ask", { question: String(question).slice(0, 2000) });
    return { result, log: d.log.slice(0, 60) };
  }],
  ["POST", /^\/api\/deals\/([\w]+)\/claims$/, async (req, [, id]) => {
    const d = need(id, true);
    const { custom } = await body(req);
    const result = await d.call("claims", { custom: custom ? String(custom).slice(0, 500) : undefined });
    return { result, log: d.log.slice(0, 60) };
  }],
  ["POST", /^\/api\/deals\/([\w]+)\/revoke$/, async (req, [, id]) => {
    const d = need(id);
    if (d.status !== "open") return publicDeal(d);
    await revokeDeal(d);
    return publicDeal(d);
  }],
];

function need(id, mustBeOpen = false) {
  const d = deals.get(id);
  if (!d) throw Object.assign(new Error("No such deal"), { status: 404 });
  if (mustBeOpen && d.status !== "open") throw Object.assign(new Error("Access revoked. This compartment has been sealed and its key destroyed."), { status: 410 });
  return d;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    for (const [method, re, fn] of routes) {
      const m = url.pathname.match(re);
      if (m && req.method === method) return send(res, 200, await fn(req, m));
    }
    if (url.pathname.startsWith("/api/")) return send(res, 404, { error: "Not found" });
    const rel = normalize(url.pathname === "/" ? "/index.html" : url.pathname).replace(/^(\.\.[/\\])+/, "");
    const file = join(ROOT, "public", rel);
    if (!file.startsWith(join(ROOT, "public"))) return send(res, 403, { error: "Forbidden" });
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch (err) {
    if (err.code === "ENOENT") return send(res, 404, { error: "Not found" });
    send(res, err.status || 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Watertight on http://localhost:${PORT}`);
  console.log(`  inference: ${trLive() ? "LIVE" : "offline rehearsal"} → ${tr.base} (${tr.model}, min_privacy=confidential)`);
  console.log(`  search:    ${ctxLive() ? "LIVE" : "offline rehearsal"} → api.context.dev`);
});

const shutdown = async () => {
  for (const d of deals.values()) if (d.status === "open") await revokeDeal(d).catch(() => {});
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
