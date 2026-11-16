// Confidential inference through TrustedRouter's attested gateway.
// provider.min_privacy = "confidential" requires verified provider-side confidential
// compute, end-to-end encryption and zero retention, and fails closed: if no route
// qualifies, the request errors instead of falling back to an ordinary provider.
export const config = {
  key: process.env.TRUSTEDROUTER_API_KEY || "",
  base: (process.env.TR_BASE_URL || "https://api.confidential.nytokenexchange.com/v1").replace(/\/$/, ""),
  model: process.env.TR_MODEL || "z-ai/glm-5.3-flash",
};
export const live = () => !!config.key;

export async function chat(messages, { maxTokens = 1200, json = false } = {}) {
  const body = {
    model: config.model,
    messages,
    temperature: 0.1,
    max_tokens: maxTokens,
    provider: { min_privacy: "confidential" },
  };
  if (json) body.response_format = { type: "json_object" };
  const payload = JSON.stringify(body);
  const egress = { to: new URL(config.base).host, path: "/v1/chat/completions", bytes: Buffer.byteLength(payload), body, simulated: !live() };

  if (!live()) return { text: null, simulated: true, egress };

  const t0 = Date.now();
  const res = await fetch(`${config.base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", "X-Title": "Watertight" },
    body: payload,
  });
  const raw = await res.text();
  if (!res.ok) {
    let msg = raw.slice(0, 400);
    try { msg = JSON.parse(raw).error?.message || msg; } catch {}
    const err = new Error(`TrustedRouter ${res.status}: ${msg}`);
    err.egress = egress;
    err.failClosed = res.status !== 401 && res.status !== 402;
    throw err;
  }
  const data = JSON.parse(raw);
  const m = data.choices?.[0]?.message || {};
  return {
    text: (m.content || "").trim(),
    model: data.model,
    provider: data.provider,
    usage: data.usage,
    ms: Date.now() - t0,
    egress,
  };
}
