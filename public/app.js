const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const kb = (n) => (n >= 1024 ? (n / 1024).toFixed(1) + " KB" : n + " B");
const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status });
  return data;
}

let cfg, deal, hull, busy = false;

const CHIPS = [
  { q: "What's net revenue retention?" },
  { q: "How concentrated is revenue across customers?" },
  { q: "What's the monthly burn and gross margin?" },
  { q: "Does the deck's traction slide match the data?" },
  { q: "Who are the top 5 customers?", sealed: true },
  { q: "What does the CTO make?", sealed: true },
];

const LOCK = `<svg class="lock" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;

/* ---------- boot ---------- */
async function boot() {
  cfg = await api("/api/config");
  $("#companyName").textContent = `${cfg.company} data room`;
  $("#companyTag").textContent = cfg.tagline;
  $("#chips").innerHTML = CHIPS.map((c, i) => `<button class="chip ${c.sealed ? "sealed" : ""}" data-i="${i}" type="button">${c.sealed ? "🔒 " : ""}${esc(c.q)}</button>`).join("");
  await openDeal();
  inspectHull(false);
}

async function openDeal() {
  deal = await api("/api/deals", { investor: "Demo investor" });
  $("#thread").innerHTML = `<div class="empty" id="empty"><p>Ask anything about the company. Answers come from the founder's files and cite them. Sealed details never reach the model or you.</p></div>`;
  $("#flooded").classList.add("hidden");
  $("#revokeBtn").classList.remove("hidden");
  $("#reopenBtn").classList.add("hidden");
  setComposer(true);
  render();
}

function render() {
  renderMeta();
  renderFounder();
  renderLog(deal.log);
}

function renderMeta() {
  const inf = cfg.inference;
  $("#dealMeta").innerHTML = [
    `<span><b>deal</b>${esc(deal.id)}</span>`,
    `<span><b>model</b>${esc(inf.model)}</span>`,
    `<span><b>route</b>min_privacy=confidential</span>`,
    `<span><b>mode</b>${inf.live ? "live" : "offline rehearsal"}</span>`,
  ].join("");
}

/* ---------- founder ---------- */
function renderFounder() {
  const v = deal.view;
  const withheld = new Map((v?.withheld || []).map((w) => [w.name, w]));
  $("#vaultNote").textContent = `${deal.sealedFiles.length} files · AES-256-GCM · per-deal key`;
  $("#files").innerHTML = deal.sealedFiles
    .map((f) => {
      const w = withheld.get(f.name);
      const tag = w ? `<span class="tag">summary only</span>` : `<span class="size">${kb(f.bytes)}</span>`;
      return `<li>${LOCK}<span>${esc(f.name)}</span>${tag}<span class="cipher">${esc(f.preview)}…</span></li>`;
    })
    .join("");

  const pol = v?.policy || cfg.defaultPolicy;
  $("#seals").innerHTML = Object.entries(cfg.policies)
    .map(([id, p]) => `<label class="seal"><input type="checkbox" data-policy="${id}" ${pol[id] ? "checked" : ""} ${deal.status !== "open" ? "disabled" : ""}/><span class="switch"></span><span class="seal-text">${esc(p.label)}<small>${esc(p.quote)}</small></span></label>`)
    .join("");

  const open = deal.status === "open";
  $("#compartment").innerHTML = `<div class="block-title">Compartment <span class="muted">${open ? "one isolated process per deal" : "sealed"}</span></div>
    <dl>
      <dt>status</dt><dd>${open ? "open" : "flooded and sealed"}</dd>
      <dt>process</dt><dd>${open ? "pid " + deal.pid : "pid " + deal.revoked.pid + " (killed)"}</dd>
      <dt>data key</dt><dd>${open ? "256-bit, in that process's memory only" : "zeroed"}</dd>
      ${open ? `<dt>sealed values</dt><dd>${v.stats.sealedLiterals} literals, ${v.stats.pseudonymized} pseudonyms</dd>` : `<dt>vault</dt><dd>${deal.revoked.shredded} files shredded</dd>`}
    </dl>`;
}

$("#seals").addEventListener("change", async (e) => {
  const id = e.target.dataset.policy;
  if (!id) return;
  try {
    deal = await api(`/api/deals/${deal.id}/policy`, { policy: { [id]: e.target.checked } });
    render();
    note(`Seal "${cfg.policies[id].label}" ${e.target.checked ? "engaged" : "lifted"}. The room was resealed.`);
  } catch (err) {
    e.target.checked = !e.target.checked;
    note(err.message, true);
  }
});

$("#revokeBtn").addEventListener("click", async () => {
  const btn = $("#revokeBtn");
  btn.disabled = true;
  try {
    deal = await api(`/api/deals/${deal.id}/revoke`, {});
    render();
    flood();
  } finally {
    btn.disabled = false;
  }
});
$("#reopenBtn").addEventListener("click", openDeal);

function flood() {
  const r = deal.revoked;
  const el = $("#flooded");
  el.innerHTML = `<h3>Compartment sealed</h3>
    <p>The founder revoked access. The investor's next question has nothing to read, and no copy exists to leak later.</p>
    <dl>
      <dt>process</dt><dd>pid ${r.pid} killed</dd>
      <dt>data key</dt><dd>${r.keyBytesZeroed} bytes zeroed</dd>
      <dt>vault</dt><dd>${r.shredded} ciphertext files shredded</dd>
      <dt>at</dt><dd>${time(r.at)}</dd>
    </dl>`;
  el.classList.remove("hidden");
  setComposer(false);
  $("#revokeBtn").classList.add("hidden");
  $("#reopenBtn").classList.remove("hidden");
}

/* ---------- investor ---------- */
function setComposer(on) {
  $("#q").disabled = !on;
  $("#composer button").disabled = !on;
  document.querySelectorAll(".chip").forEach((c) => (c.disabled = !on));
  $("#claimsBtn").disabled = !on;
}

function push(html, cls = "a") {
  $("#empty")?.remove();
  const el = document.createElement("div");
  el.className = `msg ${cls}`;
  el.innerHTML = html;
  $("#thread").appendChild(el);
  el.scrollIntoView({ behavior: "smooth", block: "end" });
  return el;
}

function note(text, bad = false) {
  push(`<div class="card" style="font-size:13px;${bad ? "border-color:var(--signal)" : ""}"><span class="muted">${esc(text)}</span></div>`);
}

function bulkhead(title, quote, extra = "") {
  return `<div class="bulkhead"><div class="stripe"></div><div class="body"><h4>${esc(title)}</h4>${extra}<blockquote>${esc(quote)}</blockquote></div></div>`;
}

function renderAnswer(r) {
  if (r.kind === "refused")
    return bulkhead(`Sealed: ${r.label}`, r.quote, `<div class="muted" style="font-size:13px">Refused inside the room. Nothing was sent to the model.</div>`);
  if (r.kind === "blocked")
    return bulkhead(`Answer withheld: ${r.label}`, r.quote, `<div class="muted" style="font-size:13px">The answer contained a sealed value, so the leak scanner stopped it before it reached you.</div>`);
  if (r.kind === "sealed")
    return bulkhead("The model declined: sealed data needed", r.text);
  if (r.kind === "error")
    return bulkhead(r.failClosed ? "Failed closed: no confidential route" : "Inference error", r.message, `<div class="muted" style="font-size:13px">${r.failClosed ? "TrustedRouter refused to fall back to a non-confidential provider." : ""}</div>`);
  const cites = (r.sources || []).map((s) => `<span class="cite">${esc(s)}</span>`).join("");
  const text = esc(r.text).replace(/\[([^\]]+?)\]/g, '<span class="cite">$1</span>');
  return `<div class="card"><div class="text">${text}</div><div class="meta">
    ${r.simulated ? `<span class="badge brass">rehearsal</span>` : `<span class="badge sea">confidential inference</span>`}
    ${r.ms ? `<span>${(r.ms / 1000).toFixed(1)}s</span>` : ""}${cites ? "" : ""}</div></div>`;
}

async function ask(q) {
  if (busy || !q.trim()) return;
  busy = true;
  setComposer(false);
  push(esc(q), "q");
  const t = push(`<div class="thinking">Reading the sealed room…</div>`);
  try {
    const { result, log } = await api(`/api/deals/${deal.id}/ask`, { question: q });
    t.innerHTML = renderAnswer(result);
    renderLog(log);
  } catch (err) {
    t.innerHTML = bulkhead(err.status === 410 ? "Access revoked" : "Error", err.message);
  } finally {
    busy = false;
    if (deal.status === "open") setComposer(true);
    $("#q").focus();
  }
}

$("#composer").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#q").value;
  $("#q").value = "";
  ask(q);
});
$("#chips").addEventListener("click", (e) => {
  const b = e.target.closest(".chip");
  if (b) ask(CHIPS[b.dataset.i].q);
});

$("#claimsBtn").addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  setComposer(false);
  push("Check the deck's claims", "q");
  const t = push(`<div class="thinking">Checking claims against the room and the public web…</div>`);
  try {
    const { result, log } = await api(`/api/deals/${deal.id}/claims`, {});
    t.innerHTML = `<div class="card"><div class="claims">${result.claims.map(renderClaim).join("")}</div></div>`;
    renderLog(log);
  } catch (err) {
    t.innerHTML = bulkhead("Error", err.message);
  } finally {
    busy = false;
    if (deal.status === "open") setComposer(true);
  }
});

function renderClaim(c) {
  const src = (c.sources || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(new URL(s.url).hostname)}</a>`).join("");
  const rm = c.removed?.length ? `<div class="rm">egress filter removed ${c.removed.length} private value(s) from the search query</div>` : "";
  return `<div class="claim"><div class="v ${esc(c.verdict)}">${esc(c.verdict)}</div><div>
    <div class="c">${esc(c.text)}</div>
    <div class="f">${esc(c.finding || "")}</div>
    <div class="muted" style="font-size:11.5px;margin-top:2px">${c.source === "public web" ? "checked against the public web via Context.dev" : c.kind === "internal" ? "checked inside the room" : ""}</div>
    ${src ? `<div class="src">${src}</div>` : ""}${rm}</div></div>`;
}

/* ---------- egress log ---------- */
function renderLog(log) {
  deal.log = log;
  const out = log.filter((e) => e.kind === "inference" || e.kind === "search");
  const bytes = out.reduce((s, e) => s + (e.bytes || 0), 0);
  const leaks = out.reduce((s, e) => s + (e.sealedFound || 0), 0);
  const held = log.filter((e) => e.kind === "held" || e.kind === "blocked").length;
  $("#tally").innerHTML = `<div><b>${out.length}</b><span>outbound requests · ${kb(bytes)}</span></div>
    <div class="${leaks === 0 ? "zero" : ""}"><b>${leaks}</b><span>sealed values sent</span></div>
    <div><b>${held}</b><span>held in the room</span></div>`;

  $("#log").innerHTML = log.length
    ? log.map(renderEvent).join("")
    : `<li class="muted" style="padding:12px 4px;font-size:13px">Nothing has left the room yet.</li>`;
}

function renderEvent(e) {
  const cls = e.kind === "held" || e.kind === "blocked" ? "held" : e.kind === "revoked" ? "revoked" : e.error ? "err" : "";
  const badges = [];
  if (e.kind === "inference") {
    badges.push(`<span class="badge sea">attested gateway</span>`, `<span class="badge ink">min_privacy: confidential</span>`);
    if (e.simulated) badges.push(`<span class="badge brass">rehearsal, not sent</span>`);
  }
  if (e.kind === "search") {
    badges.push(`<span class="badge ink">public query only</span>`);
    if (e.simulated) badges.push(`<span class="badge brass">rehearsal, not sent</span>`);
  }
  if (e.sealedChecked != null) badges.push(`<span class="badge ${e.sealedFound ? "sig" : "sea"}">${e.sealedFound} of ${e.sealedChecked} sealed values</span>`);
  if (e.kind === "held") badges.push(`<span class="badge sea">0 bytes left</span>`);
  if (e.kind === "blocked") badges.push(`<span class="badge sig">answer stopped</span>`);

  const q = e.query
    ? `<div class="ev-q">query: "${esc(e.query)}"${e.removed?.length ? `<br>removed: ${e.removed.map((r) => `<s>${esc(r)}</s>`).join(" ")}` : ""}</div>`
    : "";
  return `<li class="ev ${cls}">
    <div class="ev-top"><span class="ev-to">${e.kind === "held" || e.kind === "blocked" || e.kind === "revoked" ? esc(e.kind.toUpperCase()) : "→ " + esc(e.to)}</span><span class="ev-time">${time(e.at)}</span></div>
    ${e.note ? `<div class="ev-note">${esc(e.note)}</div>` : ""}
    ${e.bytes ? `<div class="ev-note mono" style="font-size:11px">${esc(e.path || "")} · ${kb(e.bytes)}${e.ms ? " · " + (e.ms / 1000).toFixed(1) + "s" : ""}${e.model ? " · " + esc(e.model) : ""}</div>` : ""}
    ${e.error ? `<div class="ev-note" style="color:var(--signal)">${esc(e.error)}</div>` : ""}
    ${q}
    ${badges.length ? `<div class="ev-badges">${badges.join("")}</div>` : ""}
    ${e.payload ? `<button class="link" data-n="${e.n}" type="button">View exact payload →</button>` : ""}
  </li>`;
}

const highlight = (s) => esc(s).replace(/\bC-\d{2}\b|\[SEALED\]/g, (m) => `<mark>${m}</mark>`);

$("#log").addEventListener("click", (e) => {
  const n = e.target.dataset?.n;
  if (!n) return;
  const ev = deal.log.find((x) => String(x.n) === n);
  let pretty = ev.payload;
  try {
    const obj = JSON.parse(ev.payload);
    pretty = JSON.stringify(obj, null, 2).replace(/\\n/g, "\n");
  } catch {}
  $("#payloadRole").textContent = `Outbound payload · ${ev.sealedFound} of ${ev.sealedChecked} sealed values present`;
  $("#payloadTitle").textContent = `${ev.to}${ev.path || ""}`;
  $("#payloadDoc").innerHTML = highlight(pretty);
  $("#payloadDlg").showModal();
});

/* ---------- inspect ---------- */
$("#inspectBtn").addEventListener("click", () => {
  const docs = deal.view?.modelDocs || [];
  if (!docs.length) return;
  const show = (i) => {
    document.querySelectorAll("#inspectTabs .tab").forEach((t, j) => t.classList.toggle("on", i === j));
    $("#inspectDoc").innerHTML = highlight(docs[i].text);
  };
  $("#inspectTabs").innerHTML = docs.map((d, i) => `<button class="tab" data-i="${i}" type="button">${esc(d.name)}</button>`).join("");
  $("#inspectTabs").onclick = (e) => e.target.dataset.i && show(Number(e.target.dataset.i));
  show(docs.findIndex((d) => d.name === "customers.csv") >= 0 ? docs.findIndex((d) => d.name === "customers.csv") : 0);
  $("#inspectDlg").showModal();
});

/* ---------- hull ---------- */
async function inspectHull(showDialog, fresh = false) {
  const btn = $("#hullBtn");
  btn.classList.remove("ok", "bad");
  btn.classList.add("busy");
  $("#hullLabel").textContent = "Inspecting hull…";
  if (showDialog) {
    $("#checks").innerHTML = `<li style="opacity:1" class="muted"><span></span><span>Sending a fresh nonce to ${esc(cfg.inference.host)}…</span></li>`;
    $("#workload").innerHTML = "";
    document.querySelector("#hullDlg .verdict")?.remove();
    if (!$("#hullDlg").open) $("#hullDlg").showModal();
  }
  try {
    hull = await api(`/api/hull${fresh ? "?fresh=1" : ""}`);
    btn.classList.add(hull.ok ? "ok" : "bad");
    $("#hullLabel").textContent = hull.ok ? `Hull verified · ${hull.checks.find((c) => c.id === "hardware").detail.replace("GCP_", "").replace("_", " ")} · ${hull.checks.filter((c) => c.ok).length}/${hull.checks.length}` : "Hull check failed";
    if (showDialog) renderHull();
  } catch (err) {
    btn.classList.add("bad");
    $("#hullLabel").textContent = "Hull unreachable";
    if (showDialog) $("#checks").innerHTML = `<li style="opacity:1" class="bad"><span class="ic">✗</span><span>${esc(err.message)}</span></li>`;
  } finally {
    btn.classList.remove("busy");
  }
}

function renderHull() {
  $("#checks").innerHTML = hull.checks
    .map((c, i) => `<li class="${c.ok ? "ok" : "bad"}" style="animation-delay:${i * 140}ms"><span class="ic">${c.ok ? "✓" : "✗"}</span><span>${esc(c.label)}<small>${esc(c.detail)}</small></span></li>`)
    .join("");
  const w = hull.workload;
  $("#workload").innerHTML = `<dt>gateway</dt><dd>${esc(hull.host)}</dd><dt>image</dt><dd>${esc(w.image)}</dd><dt>digest</dt><dd>${esc(w.digest)}</dd><dt>instance</dt><dd>${esc(w.instance)} (${esc(w.zone)})</dd><dt>checked</dt><dd>${time(hull.checkedAt)} · ${hull.ms} ms</dd>`;
  const v = document.createElement("div");
  v.className = `verdict ${hull.ok ? "ok" : "bad"}`;
  v.style.opacity = 0;
  v.style.transition = "opacity .3s";
  v.textContent = hull.ok
    ? "Watertight. The gateway that handles our prompts is running attested code on confidential hardware, and this proof was minted for us just now."
    : "Leak detected. At least one check failed, so do not send sealed data through this route.";
  $("#workload").after(v);
  setTimeout(() => (v.style.opacity = 1), hull.checks.length * 140 + 100);
}

$("#hullBtn").addEventListener("click", () => inspectHull(true, true));
$("#hullAgain").addEventListener("click", () => inspectHull(true, true));
document.querySelectorAll("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
document.querySelectorAll("dialog").forEach((d) => d.addEventListener("click", (e) => e.target === d && d.close()));

boot().catch((err) => note(`Failed to start: ${err.message}`, true));
