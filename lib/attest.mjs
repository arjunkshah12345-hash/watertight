// "Verify the hull": fetch the inference gateway's attestation token with a fresh
// nonce, then check it ourselves. The token is a Google Confidential Space JWT that
// says which container image runs inside which TEE. We verify the RS256 signature against
// Google's published JWKS, confirm our nonce is bound inside it, and check the hardware
// claims. Nothing here trusts TrustedRouter's word.
import { randomBytes, createPublicKey, verify } from "node:crypto";

const ISSUER = "https://confidentialcomputing.googleapis.com";
let jwksCache = { at: 0, keys: [] };

async function jwks() {
  if (Date.now() - jwksCache.at < 10 * 60_000 && jwksCache.keys.length) return jwksCache.keys;
  const conf = await (await fetch(`${ISSUER}/.well-known/openid-configuration`)).json();
  const { keys } = await (await fetch(conf.jwks_uri)).json();
  jwksCache = { at: Date.now(), keys };
  return keys;
}

const b64json = (s) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

export function attestationHost(baseUrl) {
  return new URL(baseUrl).origin;
}

export async function verifyHull(baseUrl) {
  const host = attestationHost(baseUrl);
  const nonce = randomBytes(32).toString("hex");
  const t0 = Date.now();
  const res = await fetch(`${host}/attestation?nonce=${nonce}`);
  if (!res.ok) throw new Error(`attestation endpoint returned ${res.status}`);
  const token = (await res.text()).trim();
  const [h, p, s] = token.split(".");
  const header = b64json(h);
  const claims = b64json(p);

  const keys = await jwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  const sigOk =
    !!jwk && header.alg === "RS256" &&
    verify("RSA-SHA256", Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(s, "base64url"));

  const now = Math.floor(Date.now() / 1000);
  const container = claims.submods?.container || {};
  const cs = claims.submods?.confidential_space || {};
  const checks = [
    { id: "signature", label: "Signed by Google Confidential Computing", ok: sigOk, detail: `RS256, key ${header.kid?.slice(0, 12)}…` },
    { id: "issuer", label: "Issuer is Google's attestation service", ok: claims.iss === ISSUER, detail: claims.iss },
    { id: "fresh", label: "Token is current", ok: claims.nbf <= now + 60 && claims.exp > now, detail: `issued ${now - claims.iat}s ago` },
    { id: "nonce", label: "Our nonce is sealed inside the token", ok: (claims.eat_nonce || []).includes(nonce), detail: `${nonce.slice(0, 16)}…` },
    { id: "hardware", label: "Hardware TEE", ok: /^GCP_(INTEL_TDX|AMD_SEV|AMD_SEV_SNP)$/.test(claims.hwmodel || ""), detail: claims.hwmodel },
    { id: "debug", label: "Debugging disabled since boot", ok: claims.dbgstat === "disabled-since-boot", detail: claims.dbgstat },
    { id: "secboot", label: "Secure boot", ok: claims.secboot === true, detail: String(claims.secboot) },
    { id: "image", label: "Confidential Space production image", ok: claims.swname === "CONFIDENTIAL_SPACE" && (cs.support_attributes || []).includes("STABLE"), detail: `${claims.swname} ${claims.swversion?.[0] ?? ""}` },
  ];
  return {
    ok: checks.every((c) => c.ok),
    host,
    checkedAt: new Date().toISOString(),
    ms: Date.now() - t0,
    checks,
    workload: {
      image: container.image_reference,
      digest: container.image_digest,
      instance: claims.sub?.split("/").slice(-1)[0],
      zone: claims.sub?.match(/zones\/([^/]+)/)?.[1],
    },
    token: `${h}.${p}.${s.slice(0, 24)}…`,
  };
}
