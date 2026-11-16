// Context.dev web search for public-claim checks. Callers must pass queries through
// policy.egressFilter() first; this module only ever sees the cleaned query.
const KEY = process.env.CONTEXT_DEV_API_KEY || "";
export const live = () => !!KEY;

export async function search(query, { numResults = 5 } = {}) {
  const body = {
    query,
    numResults,
    highlightsOptions: { enabled: true, maxCharacters: 900 },
    descriptionMaxCharacters: 300,
  };
  const egress = { to: "api.context.dev", path: "/v1/web/search", bytes: Buffer.byteLength(JSON.stringify(body)), body, simulated: !live() };
  if (!live()) return { results: [], simulated: true, egress };

  const res = await fetch("https://api.context.dev/v1/web/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`Context.dev ${res.status}: ${(await res.text()).slice(0, 300)}`);
    err.egress = egress;
    throw err;
  }
  const data = await res.json();
  return {
    egress,
    results: (data.results || []).map((r) => ({
      url: r.url,
      title: r.title,
      snippet: (r.highlights?.highlights || []).join(" … ").slice(0, 900) || r.description || "",
    })),
  };
}
