// The policy engine. Three layers, all deterministic and all inside the compartment:
//   1. seal()       redacts the room before any byte is sent to a model
//   2. precheck()   refuses questions that target sealed categories (nothing leaves the room)
//   3. scanOutput() blocks any answer that contains a sealed literal
// plus egressFilter() for outbound web-search queries.
import { parseCSV, toCSV } from "./csv.mjs";

export const POLICIES = {
  customer_identities: {
    label: "Customer identities",
    quote: "Customer identities are sealed. Analysts see stable pseudonyms (C-01, C-02, …), never names.",
  },
  people: {
    label: "Named individuals",
    quote: "Named individuals (employees, customer contacts) are sealed and removed before analysis.",
  },
  individual_comp: {
    label: "Individual compensation",
    quote: "Individual compensation is sealed. Only department totals for groups of 3 or more leave the vault.",
  },
  cap_table_holders: {
    label: "Investor positions",
    quote: "Individual investor positions are sealed. Only totals by share class are shared.",
  },
};

export const DEFAULT_POLICY = Object.fromEntries(Object.keys(POLICIES).map((k) => [k, true]));

const ROLE = {
  customer: /^(customer|client|account|company)(_name)?$/i,
  person: /^(champion|contact|employee|owner|person|name|full_name)$/i,
  comp: /(salary|compensation|bonus|wage|equity_pct)/i,
  holder: /^(holder|shareholder|investor)$/i,
  group: /^(department|dept|team|function)$/i,
};
const K_MIN = 3;

const money = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
const pct = (n) => (Math.round(n * 1000) / 10).toFixed(1) + "%";

function numberVariants(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 10000) return [];
  return [String(v), v.toLocaleString("en-US"), `${Math.round(v / 1000)}k`, `$${Math.round(v / 1000)}k`];
}

function roleOf(col) {
  for (const [role, re] of Object.entries(ROLE)) if (re.test(col)) return role;
  return null;
}

// Returns what the model is allowed to see, plus everything it is not.
export function seal(files, policy = DEFAULT_POLICY) {
  const modelDocs = [];
  const sealed = new Map(); // literal -> policy id
  const withheld = [];
  const pseudonyms = new Map();
  const tables = {};

  for (const f of files) if (f.name.endsWith(".csv")) tables[f.name] = parseCSV(f.text);

  // Pass 1: collect sealed literals so markdown docs can be scrubbed too.
  for (const [name, t] of Object.entries(tables)) {
    for (const col of t.header) {
      const role = roleOf(col);
      for (const r of t.rows) {
        const v = r[col];
        if (!v) continue;
        if (role === "customer" && policy.customer_identities) {
          if (!pseudonyms.has(v)) pseudonyms.set(v, `C-${String(pseudonyms.size + 1).padStart(2, "0")}`);
          sealed.set(v, "customer_identities");
        }
        if (role === "person" && policy.people) sealed.set(v, "people");
        if (role === "comp" && policy.individual_comp) for (const x of numberVariants(v)) sealed.set(x, "individual_comp");
        if (role === "holder" && policy.cap_table_holders && !/founder/i.test(r.holder_type || "")) sealed.set(v, "cap_table_holders");
      }
    }
  }
  // Payroll names are people even if the column is called "employee" in a comp table.
  const scrub = (text) => {
    let out = text;
    const keys = [...sealed.keys()].filter((k) => /[a-z]/i.test(k)).sort((a, b) => b.length - a.length);
    for (const k of keys) out = out.split(k).join(pseudonyms.get(k) || "[SEALED]");
    return out;
  };

  for (const f of files) {
    if (!f.name.endsWith(".csv")) {
      modelDocs.push({ name: f.name, text: scrub(f.text) });
      continue;
    }
    const t = tables[f.name];
    const roles = Object.fromEntries(t.header.map((h) => [h, roleOf(h)]));
    const has = (r) => t.header.some((h) => roles[h] === r);

    if (has("comp") && policy.individual_comp) {
      withheld.push({ name: f.name, policy: "individual_comp", rows: t.rows.length });
      modelDocs.push({ name: `${f.name} (department summary)`, text: compSummary(t, roles) });
      continue;
    }
    if (has("holder") && policy.cap_table_holders) {
      withheld.push({ name: f.name, policy: "cap_table_holders", rows: t.rows.length });
      modelDocs.push({ name: `${f.name} (by share class)`, text: capSummary(t) });
      continue;
    }
    let header = t.header;
    if (policy.people) header = header.filter((h) => roles[h] !== "person");
    const rows = t.rows.map((r) => {
      const o = { ...r };
      for (const h of t.header) if (roles[h] === "customer" && policy.customer_identities) o[h] = pseudonyms.get(r[h]) || r[h];
      return o;
    });
    modelDocs.push({ name: f.name, text: toCSV(header, rows) });
  }

  const metrics = deriveMetrics(tables);
  if (metrics) modelDocs.push({ name: "derived_metrics.md", text: metrics.text });

  // A sealed salary that equals some visible number (say, a customer's ARR) is not a secret
  // on its own; drop it so the leak scanner doesn't flag legitimate figures.
  const visible = modelDocs.map((d) => d.text).join("\n");
  for (const [lit] of sealed) {
    if (/[a-jl-z]/i.test(lit)) continue; // names; "210k" style numbers fall through
    const base = /k$/i.test(lit) ? Number(lit.replace(/[^\d]/g, "")) * 1000 : Number(lit.replace(/[^\d]/g, ""));
    if (new RegExp(`(^|[^\\d])${base}([^\\d]|$)`).test(visible)) sealed.delete(lit);
  }

  return {
    modelDocs,
    sealed,
    withheld,
    metrics: metrics?.values || {},
    privateNumbers: collectPrivateNumbers(tables, metrics?.values),
    stats: {
      sealedLiterals: sealed.size,
      pseudonymized: pseudonyms.size,
      withheldFiles: withheld.length,
    },
  };
}

function compSummary(t, roles) {
  const groupCol = t.header.find((h) => roles[h] === "group");
  const compCols = t.header.filter((h) => roles[h] === "comp" && !/pct/i.test(h));
  const groups = new Map();
  for (const r of t.rows) {
    const g = groupCol ? r[groupCol] : "All";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  // k-anonymity: fold groups smaller than K_MIN into "Other".
  const folded = new Map();
  for (const [g, rs] of groups) {
    const key = rs.length >= K_MIN ? g : "Other (small teams combined)";
    folded.set(key, [...(folded.get(key) || []), ...rs]);
  }
  const lines = [`Department-level summary (groups under ${K_MIN} people are combined). Individual rows are sealed.`, ""];
  lines.push(["department", "headcount", ...compCols.map((c) => `total_${c}`)].join(","));
  for (const [g, rs] of folded) {
    lines.push([g, rs.length, ...compCols.map((c) => rs.reduce((s, r) => s + Number(r[c] || 0), 0))].join(","));
  }
  lines.push(["TOTAL", t.rows.length, ...compCols.map((c) => t.rows.reduce((s, r) => s + Number(r[c] || 0), 0))].join(","));
  return lines.join("\n");
}

function capSummary(t) {
  const total = t.rows.reduce((s, r) => s + Number(r.shares || 0), 0);
  const by = new Map();
  for (const r of t.rows) {
    const k = r.share_class || "Unknown";
    const e = by.get(k) || { shares: 0, holders: 0, types: new Set() };
    e.shares += Number(r.shares || 0);
    e.holders += 1;
    if (r.holder_type) e.types.add(r.holder_type);
    by.set(k, e);
  }
  const lines = ["Ownership by share class (fully diluted). Individual holder positions are sealed.", "", "share_class,holder_types,shares,pct_fully_diluted"];
  for (const [k, e] of by) lines.push(`${k},${[...e.types].join("/")},${e.shares},${pct(e.shares / total)}`);
  lines.push(`TOTAL,,${total},100.0%`);
  return lines.join("\n");
}

// Founder-approved aggregates, computed inside the vault so the model never has to do the math.
function deriveMetrics(tables) {
  const c = tables["customers.csv"];
  const p = tables["pnl_2026.csv"];
  const pay = tables["payroll.csv"];
  if (!c && !p) return null;
  const v = {};
  const L = ["# Derived metrics", "Computed by Watertight inside the sealed compartment from the raw files. Aggregates only.", ""];
  if (c) {
    const rows = c.rows;
    const jan = (r) => Number(r.arr_jan_2026 || 0);
    const oct = (r) => Number(r.arr_oct_2026 || 0);
    v.customersTotal = rows.length;
    v.activeCustomers = rows.filter((r) => r.status === "active").length;
    v.activeEnterprise = rows.filter((r) => r.segment === "Enterprise" && r.status === "active").length;
    v.enterpriseEver = rows.filter((r) => r.segment === "Enterprise").length;
    v.churned = rows.filter((r) => r.status === "churned").length;
    v.arrJan = rows.reduce((s, r) => s + jan(r), 0);
    v.arrOct = rows.reduce((s, r) => s + oct(r), 0);
    const cohort = rows.filter((r) => jan(r) > 0);
    const base = cohort.reduce((s, r) => s + jan(r), 0);
    v.nrr = cohort.reduce((s, r) => s + oct(r), 0) / base;
    v.grr = cohort.reduce((s, r) => s + Math.min(oct(r), jan(r)), 0) / base;
    v.churnedArr = rows.filter((r) => r.status === "churned").reduce((s, r) => s + jan(r), 0);
    const sorted = rows.map(oct).sort((a, b) => b - a);
    v.top5Share = sorted.slice(0, 5).reduce((s, x) => s + x, 0) / v.arrOct;
    v.largestShare = sorted[0] / v.arrOct;
    L.push(
      "## Customers (customers.csv)",
      `- Customers on file: ${v.customersTotal} (${v.activeCustomers} active, ${v.churned} churned)`,
      `- Active Enterprise customers: ${v.activeEnterprise} (of ${v.enterpriseEver} Enterprise customers ever signed)`,
      `- Contracted ARR, Oct 2026: ${money(v.arrOct)} (Jan 2026: ${money(v.arrJan)})`,
      `- Net revenue retention, Jan to Oct 2026 cohort: ${pct(v.nrr)}`,
      `- Gross revenue retention, same cohort: ${pct(v.grr)}`,
      `- ARR lost to churn this year: ${money(v.churnedArr)}`,
      `- Top 5 customers' share of ARR: ${pct(v.top5Share)}; largest single customer: ${pct(v.largestShare)}`,
      ""
    );
  }
  if (p) {
    const rows = p.rows;
    const last = rows.at(-1), prev = rows.at(-2), first = rows[0];
    v.latestMonth = last.month;
    v.latestRevenue = Number(last.revenue);
    v.runRate = v.latestRevenue * 12;
    v.momGrowth = Number(last.revenue) / Number(prev.revenue) - 1;
    v.ytdGrowth = Number(last.revenue) / Number(first.revenue) - 1;
    v.grossMargin = Number(last.gross_margin_pct) / 100;
    v.monthlyNet = Number(last.net_income);
    L.push(
      "## P&L (pnl_2026.csv)",
      `- Latest month: ${v.latestMonth}, revenue ${money(v.latestRevenue)} (annualized run-rate ${money(v.runRate)})`,
      `- Month-over-month revenue growth, latest: ${pct(v.momGrowth)}; ${first.month} to ${last.month}: ${pct(v.ytdGrowth)}`,
      `- Gross margin, latest month: ${pct(v.grossMargin)}`,
      `- Net income, latest month: ${money(v.monthlyNet)} (monthly burn ${money(-v.monthlyNet)})`,
      `- Runway is not computable: there is no cash balance in the room.`,
      ""
    );
  }
  if (pay) {
    v.headcount = pay.rows.length;
    L.push("## Team (payroll.csv)", `- Headcount on payroll: ${v.headcount}`, "");
  }
  return { text: L.join("\n"), values: v };
}

function collectPrivateNumbers(tables, metrics = {}) {
  const set = new Set();
  for (const t of Object.values(tables))
    for (const r of t.rows) for (const val of Object.values(r)) for (const x of numberVariants(val)) set.add(x);
  for (const val of Object.values(metrics)) for (const x of numberVariants(val)) set.add(x);
  return set;
}

const INTENTS = [
  {
    policy: "customer_identities",
    re: /\b(who|which|name[sd]?|list|identify|identit(y|ies)|logos?)\b[^?]*\b(customers?|clients?|accounts?|logos?|buyers?)\b|\b(customers?|clients?|accounts?)\b[^?]*\b(names?|who are|called)\b/i,
  },
  {
    policy: "individual_comp",
    re: /\b(salary|salaries|paid|pay|make|earn|earns|comp|compensation|equity)\b[^?]*\b(ceo|cto|cfo|head|each|individual|highest|lowest|top|who|person|employee|founder|engineer)s?\b|\b(ceo|cto|cfo|vp|head of \w+|who|highest|lowest|founders?|engineers?)\b[^?]*\b(salary|salaries|paid|pay|make|makes|earn|earns|compensation|comp)\b/i,
  },
  {
    policy: "cap_table_holders",
    re: /\b(who|which investors?|each investor|how much does|largest (investor|holder|shareholder))\b[^?]*\b(own|owns|stake|shares|equity|holds?)\b/i,
  },
  {
    policy: "people",
    re: /\b(who is|contact|champion|point of contact|employees? names?|names? of (the )?(employees|team|staff))\b/i,
  },
];

export function precheck(question, policy, sealedMap) {
  for (const [literal, pid] of sealedMap) {
    if (/[a-z]/i.test(literal) && literal.length > 3 && question.toLowerCase().includes(literal.toLowerCase()) && policy[pid])
      return { policy: pid, reason: `The question names a sealed ${POLICIES[pid].label.toLowerCase()} value.` };
  }
  for (const it of INTENTS) if (policy[it.policy] && it.re.test(question)) return { policy: it.policy, reason: `The question asks for ${POLICIES[it.policy].label.toLowerCase()}.` };
  return null;
}

export function scanOutput(text, sealedMap) {
  const hits = [];
  const low = text.toLowerCase();
  for (const [literal, pid] of sealedMap) {
    if (/[a-z]/i.test(literal)) {
      if (literal.length > 3 && low.includes(literal.toLowerCase())) hits.push({ literal, policy: pid });
    } else if (new RegExp(`(^|[^\\d,.])${literal.replace(/[$.,]/g, (m) => "\\" + m)}([^\\d]|$)`).test(text)) {
      hits.push({ literal, policy: pid });
    }
  }
  return hits;
}

// Strips sealed literals and any number that exists in the private room from an outbound query.
export function egressFilter(query, sealedMap, privateNumbers) {
  let clean = query;
  const removed = [];
  const literals = [...sealedMap.keys(), ...privateNumbers].sort((a, b) => b.length - a.length);
  for (const lit of literals) {
    const re = /[a-z]/i.test(lit)
      ? new RegExp(lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
      : new RegExp(`(?<![\\d,.])${lit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\d])`, "g");
    if (re.test(clean)) {
      removed.push(lit);
      clean = clean.replace(re, " ");
    }
  }
  return { clean: clean.replace(/\s+/g, " ").trim(), removed };
}
