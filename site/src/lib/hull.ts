// Verify TrustedRouter's confidential gateway from the visitor's own browser.
// The gateway signs a Google Confidential Space token that must contain a nonce
// we just generated; we check the RS256 signature against Google's JWKS with
// WebCrypto. No Watertight server is involved.
export const GATEWAY = "https://api.confidential.nytokenexchange.com";
const ISSUER = "https://confidentialcomputing.googleapis.com";
const JWKS =
  "https://www.googleapis.com/service_accounts/v1/metadata/jwk/signer@confidentialspace-sign.iam.gserviceaccount.com";

export type HullCheck = { id: string; label: string; ok: boolean; detail: string };
export type HullResult = {
  ok: boolean;
  ms: number;
  checks: HullCheck[];
  image?: string;
  digest?: string;
  instance?: string;
  zone?: string;
  nonce: string;
};

export const CHECK_LABELS: { id: string; label: string }[] = [
  { id: "signature", label: "Signed by Google Confidential Computing" },
  { id: "issuer", label: "Issuer is Google's attestation service" },
  { id: "fresh", label: "Token is current" },
  { id: "nonce", label: "Our nonce is sealed inside" },
  { id: "hardware", label: "Hardware TEE" },
  { id: "debug", label: "Debugging disabled since boot" },
  { id: "secboot", label: "Secure boot" },
  { id: "image", label: "Confidential Space production image" },
];

const b64url = (s: string) => {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
};
const json = (s: string) => JSON.parse(new TextDecoder().decode(b64url(s)));

type Claims = {
  iss?: string;
  iat: number;
  nbf: number;
  exp: number;
  eat_nonce?: string[];
  hwmodel?: string;
  dbgstat?: string;
  secboot?: boolean;
  swname?: string;
  swversion?: string[];
  sub?: string;
  submods?: {
    container?: { image_reference?: string; image_digest?: string };
    confidential_space?: { support_attributes?: string[] };
  };
};

export async function inspectHull(): Promise<HullResult> {
  const t0 = performance.now();
  const nonce = [...crypto.getRandomValues(new Uint8Array(32))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const [tokenRes, jwksRes] = await Promise.all([
    fetch(`${GATEWAY}/attestation?nonce=${nonce}`, { cache: "no-store" }),
    fetch(JWKS),
  ]);
  if (!tokenRes.ok) throw new Error(`Gateway answered ${tokenRes.status}`);
  const token = (await tokenRes.text()).trim();
  const { keys } = (await jwksRes.json()) as { keys: (JsonWebKey & { kid: string })[] };

  const [h, p, s] = token.split(".");
  const header = json(h) as { kid: string; alg: string };
  const c = json(p) as Claims;

  let sigOk = false;
  const jwk = keys.find((k) => k.kid === header.kid);
  if (jwk && header.alg === "RS256") {
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    sigOk = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      b64url(s),
      new TextEncoder().encode(`${h}.${p}`),
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const container = c.submods?.container ?? {};
  const support = c.submods?.confidential_space?.support_attributes ?? [];
  const results: Record<string, [boolean, string]> = {
    signature: [sigOk, `RS256 · key ${header.kid.slice(0, 10)}…`],
    issuer: [c.iss === ISSUER, c.iss ?? "missing"],
    fresh: [c.nbf <= now + 60 && c.exp > now, `issued ${Math.max(0, now - c.iat)}s ago`],
    nonce: [(c.eat_nonce ?? []).includes(nonce), `${nonce.slice(0, 16)}…`],
    hardware: [/^GCP_(INTEL_TDX|AMD_SEV|AMD_SEV_SNP)$/.test(c.hwmodel ?? ""), c.hwmodel ?? "missing"],
    debug: [c.dbgstat === "disabled-since-boot", c.dbgstat ?? "missing"],
    secboot: [c.secboot === true, String(c.secboot)],
    image: [
      c.swname === "CONFIDENTIAL_SPACE" && support.includes("STABLE"),
      `${c.swname ?? "?"} ${c.swversion?.[0] ?? ""}`,
    ],
  };
  const checks = CHECK_LABELS.map(({ id, label }) => ({
    id,
    label,
    ok: results[id][0],
    detail: results[id][1],
  }));
  return {
    ok: checks.every((x) => x.ok),
    ms: Math.round(performance.now() - t0),
    checks,
    image: container.image_reference,
    digest: container.image_digest,
    instance: c.sub?.split("/").at(-1),
    zone: c.sub?.match(/zones\/([^/]+)/)?.[1],
    nonce,
  };
}
