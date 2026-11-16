// One compartment = one deal = one OS process (one Boat.dev VM in production).
// The decryption key arrives over IPC, never via argv or env. Plaintext exists only
// in this process's memory, and the parent kills the process on revoke.
import { openVault } from "./vault.mjs";
import { seal, precheck, scanOutput, egressFilter, POLICIES, DEFAULT_POLICY } from "./policy.mjs";
import { chat, live as inferenceLive, config as trConfig } from "./inference.mjs";
import { search, live as searchLive } from "./context.mjs";

let key = null, dealId = null, files = [], room = null, policy = { ...DEFAULT_POLICY }, S = null;
const history = [];

const emit = (event) => process.send?.({ type: "egress", event: { at: new Date().toISOString(), ...event } });

function reseal() {
  S = seal(files, policy);
}

function egressEvent(kind, e, extra = {}) {
  const payload = JSON.stringify(e.body);
  const leaks = scanOutput(payload, S.sealed);
  emit({
    kind,
    to: e.to,
    path: e.path,
    bytes: e.bytes,
    simulated: e.simulated,
    attested: kind === "inference",
    sealedChecked: S.sealed.size,
    sealedFound: leaks.length,
    payload: payload.length > 6000 ? payload.slice(0, 6000) + "…" : payload,
    ...extra,
  });
}

const SYSTEM = (company) => `You are Watertight, a due-diligence analyst working inside a sealed data room for ${company}.
Rules:
- Answer only from the documents below. If they don't contain the answer, say so.
- Cite every fact with its source file in square brackets, e.g. [derived_metrics.md] or [pnl_2026.csv].
- Prefer the figures in derived_metrics.md; they were computed exactly from the raw files. Don't redo that math.
- Customer pseudonyms such as C-07 are deliberate. Never guess at real identities.
- If answering would require sealed information, reply with a single line starting "SEALED:" naming the category.
- Be crisp: 2-5 sentences or a short list. Plain text, no markdown headings.
- When the pitch deck and the data disagree, say so plainly and give both numbers.`;

function docsBlock() {
  return S.modelDocs.map((d) => `<document name="${d.name}">\n${d.text}\n</document>`).join("\n\n");
}

const fmtPct = (x) => (Math.round(x * 1000) / 10).toFixed(1) + "%";
const fmt$ = (x) => (x < 0 ? "-$" : "$") + Math.abs(Math.round(x)).toLocaleString("en-US");

// Used only when no TrustedRouter key is configured, so the UI can be rehearsed offline.
function simAnswer(q) {
  const m = S.metrics;
  const s = q.toLowerCase();
  if (/nrr|net revenue retention|retention/.test(s))
    return `Net revenue retention for the Jan to Oct 2026 cohort is ${fmtPct(m.nrr)}, with gross retention at ${fmtPct(m.grr)} [derived_metrics.md]. The deck claims 131% [pitch_deck.md], which the customer data does not support.`;
  if (/concentrat|top|largest|biggest/.test(s))
    return `The top 5 customers make up ${fmtPct(m.top5Share)} of ARR, and the largest single customer is ${fmtPct(m.largestShare)} [derived_metrics.md]. Identities are pseudonymized (C-01…) [customers.csv].`;
  if (/arr|revenue|run.?rate/.test(s))
    return `Contracted ARR is ${fmt$(m.arrOct)} as of Oct 2026, down from ${fmt$(m.arrJan)} in January [derived_metrics.md]. The P&L run-rate is ${fmt$(m.runRate)} [pnl_2026.csv]. The deck's $4.2M ARR is not supported.`;
  if (/enterprise|customers|logos/.test(s))
    return `There are ${m.activeEnterprise} active Enterprise customers (${m.enterpriseEver} ever signed) and ${m.activeCustomers} active customers overall [derived_metrics.md]. The deck claims 40+ [pitch_deck.md].`;
  if (/burn|net income|loss|margin/.test(s))
    return `Latest month (${m.latestMonth}) net income is ${fmt$(m.monthlyNet)}, so monthly burn is about ${fmt$(-m.monthlyNet)}; gross margin is ${fmtPct(m.grossMargin)} [derived_metrics.md].`;
  if (/payroll|headcount|team|people/.test(s))
    return `Headcount is ${m.headcount} [derived_metrics.md]. Payroll is visible only as department totals [payroll.csv (department summary)].`;
  return `(Offline rehearsal mode: add TRUSTEDROUTER_API_KEY for real answers.) The room covers the deck, the 2026 P&L, customers, payroll and the cap table.`;
}

async function ask({ question }) {
  const pre = precheck(question, policy, S.sealed);
  if (pre) {
    emit({ kind: "held", to: "nowhere", bytes: 0, note: `Refused before inference: ${POLICIES[pre.policy].label}` });
    return { kind: "refused", policy: pre.policy, label: POLICIES[pre.policy].label, quote: POLICIES[pre.policy].quote, reason: pre.reason };
  }
  const messages = [
    { role: "system", content: `${SYSTEM(room.company)}\n\n${docsBlock()}` },
    ...history.slice(-6),
    { role: "user", content: question },
  ];
  let r;
  try {
    r = await chat(messages);
  } catch (err) {
    if (err.egress) egressEvent("inference", err.egress, { error: err.message });
    return { kind: "error", failClosed: !!err.failClosed, message: err.message };
  }
  egressEvent("inference", r.egress, { model: r.model || trConfig.model, provider: r.provider, ms: r.ms });
  const text = r.simulated ? simAnswer(question) : r.text;

  if (/^SEALED:/i.test(text)) return { kind: "sealed", text: text.replace(/^SEALED:\s*/i, ""), simulated: !!r.simulated };
  const hits = scanOutput(text, S.sealed);
  if (hits.length) {
    const pid = hits[0].policy;
    emit({ kind: "blocked", to: "investor", bytes: 0, note: `Answer blocked: contained ${hits.length} sealed value(s) (${POLICIES[pid].label})` });
    return { kind: "blocked", policy: pid, label: POLICIES[pid].label, quote: POLICIES[pid].quote };
  }
  history.push({ role: "user", content: question }, { role: "assistant", content: text });
  const sources = [...new Set([...text.matchAll(/\[([^\]]+?)\]/g)].map((x) => x[1]))];
  return { kind: "answer", text, sources, simulated: !!r.simulated, model: r.model || trConfig.model, ms: r.ms };
}

function extractJSON(text) {
  const m = text.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

function simInternal(claim) {
  const m = S.metrics;
  const table = {
    "ent-customers": () => [m.activeEnterprise >= 40, `${m.activeEnterprise} active Enterprise customers in customers.csv (${m.enterpriseEver} ever signed).`],
    arr: () => [m.arrOct >= 4.2e6 * 0.95, `Contracted ARR is ${fmt$(m.arrOct)}; P&L run-rate ${fmt$(m.runRate)}.`],
    nrr: () => [m.nrr >= 1.25, `Cohort NRR is ${fmtPct(m.nrr)} (GRR ${fmtPct(m.grr)}).`],
    margin: () => [Math.abs(m.grossMargin - 0.76) < 0.015, `Latest-month gross margin is ${fmtPct(m.grossMargin)} in pnl_2026.csv.`],
  };
  const f = table[claim.id];
  if (!f) return { verdict: "unverifiable", finding: "No matching data in the room." };
  const [ok, finding] = f();
  return { verdict: ok ? "supported" : "contradicted", finding };
}

async function checkClaims({ claims, custom }) {
  const list = [...(claims || room.claims || [])];
  if (custom) list.push({ id: "custom", kind: "public", text: custom });
  const out = [];

  const internal = list.filter((c) => c.kind === "internal");
  if (internal.length) {
    const prompt = `Check each pitch-deck claim against the data room. Respond with JSON only:
{"claims":[{"id":"...","verdict":"supported|contradicted|unverifiable","finding":"one sentence with the actual figure and source file"}]}
Claims:
${internal.map((c) => `- id=${c.id}: ${c.text}`).join("\n")}`;
    let parsed = null;
    try {
      const r = await chat([{ role: "system", content: `${SYSTEM(room.company)}\n\n${docsBlock()}` }, { role: "user", content: prompt }], { json: true, maxTokens: 900 });
      egressEvent("inference", r.egress, { model: r.model || trConfig.model, ms: r.ms, note: "Internal claim check" });
      if (!r.simulated) parsed = extractJSON(r.text);
    } catch (err) {
      if (err.egress) egressEvent("inference", err.egress, { error: err.message });
    }
    for (const c of internal) {
      const hit = parsed?.claims?.find((x) => x.id === c.id);
      const base = hit && !scanOutput(hit.finding || "", S.sealed).length ? hit : { ...simInternal(c), simulated: !parsed };
      out.push({ ...c, ...base, id: c.id, source: "data room" });
    }
  }

  for (const c of list.filter((x) => x.kind === "public")) {
    const { clean, removed } = egressFilter(c.text, S.sealed, S.privateNumbers);
    if (!clean) {
      out.push({ ...c, verdict: "held", finding: "Nothing public left to search after removing sealed values.", removed });
      continue;
    }
    let results = [], simulated = false;
    try {
      const r = await search(clean);
      egressEvent("search", r.egress, { query: clean, removed });
      results = r.results;
      simulated = !!r.simulated;
    } catch (err) {
      if (err.egress) egressEvent("search", err.egress, { query: clean, removed, error: err.message });
      out.push({ ...c, verdict: "unverifiable", finding: err.message, removed });
      continue;
    }
    if (simulated || !results.length) {
      out.push({ ...c, verdict: "unverifiable", finding: simulated ? "Offline rehearsal: add CONTEXT_DEV_API_KEY to search the public web." : "No public sources found.", removed, query: clean, simulated });
      continue;
    }
    const evidence = results.map((x, i) => `[${i + 1}] ${x.title} (${x.url})\n${x.snippet}`).join("\n\n");
    let verdict = { verdict: "unverifiable", finding: "Model unavailable to judge sources." };
    try {
      const r = await chat(
        [
          { role: "system", content: "You check public claims against web search results. Respond with JSON only." },
          { role: "user", content: `Claim: "${clean}"\n\nSources:\n${evidence}\n\nReturn {"verdict":"supported|contradicted|unverifiable","finding":"one sentence citing source numbers like [2]"}` },
        ],
        { json: true, maxTokens: 400 }
      );
      egressEvent("inference", r.egress, { model: r.model || trConfig.model, ms: r.ms, note: "Public claim judgement (public data only)" });
      if (!r.simulated) verdict = extractJSON(r.text) || verdict;
    } catch (err) {
      if (err.egress) egressEvent("inference", err.egress, { error: err.message });
    }
    out.push({ ...c, ...verdict, removed, query: clean, sources: results.slice(0, 3).map(({ url, title }) => ({ url, title })), source: "public web" });
  }
  return { claims: out };
}

function view() {
  return {
    policy,
    stats: S.stats,
    withheld: S.withheld,
    modelDocs: S.modelDocs.map((d) => ({ name: d.name, bytes: Buffer.byteLength(d.text), text: d.text })),
    live: { inference: inferenceLive(), search: searchLive() },
  };
}

const handlers = {
  async init(msg) {
    key = Buffer.from(msg.key, "hex");
    dealId = msg.dealId;
    room = msg.room;
    policy = { ...DEFAULT_POLICY, ...(msg.policy || {}) };
    files = await openVault(dealId, key);
    reseal();
    return view();
  },
  async policy(msg) {
    policy = { ...policy, ...msg.policy };
    reseal();
    history.length = 0;
    return view();
  },
  view: async () => view(),
  ask,
  claims: checkClaims,
};

process.on("message", async (msg) => {
  try {
    const result = await handlers[msg.type](msg);
    process.send({ id: msg.id, ok: true, result });
  } catch (err) {
    process.send({ id: msg.id, ok: false, error: err.message });
  }
});
process.on("disconnect", () => process.exit(0));
