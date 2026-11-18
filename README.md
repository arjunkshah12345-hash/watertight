# Watertight

A private AI data room. Investors ask questions about a startup's data room and get answers with sources. Sealed details never reach the model or the investor, every outbound byte is logged and checked, and the founder can revoke access instantly.

**Site:** https://arjunkshah12345-hash.github.io/watertight/ (verifies the inference hull from your browser) · **Submission:** [SUBMISSION.md](SUBMISSION.md)

Built for Boat Hackathon SF (Nov 2026). Halyard, the demo company, and all of its data are fictional.

## Run

```bash
cp .env.example .env   # add TRUSTEDROUTER_API_KEY (and optionally CONTEXT_DEV_API_KEY)
npm start              # http://localhost:4310
npm test
```

There are no dependencies. You need Node 20 or later. Without keys the app runs in **offline rehearsal** mode: canned answers, and nothing is sent anywhere. Hull verification is always live because it needs no key.

## How it holds water

| Layer | What happens |
|---|---|
| **Vault** | Each deal gets a fresh AES-256-GCM key. Files are encrypted at rest under `.vault/<deal>/`. |
| **Compartment** | One OS process per deal (one Boat.dev VM in production). The key arrives over IPC, and plaintext exists only in that process's memory. |
| **Seals** | Before any model call, customer names become stable pseudonyms (`C-07`), named people are dropped, salaries collapse to department totals (k≥3), and cap-table holders collapse to share-class totals. |
| **Precheck** | Questions that target a sealed category are refused inside the room. Zero bytes leave. |
| **Leak scan** | Every outbound payload and every answer is scanned against every sealed literal. The UI shows the count, which is always 0. |
| **Confidential inference** | GLM 5.3 Flash via `api.confidential.nytokenexchange.com` with `provider.min_privacy: "confidential"`. That means verified TEE compute, end-to-end encryption and zero retention, and it **fails closed** when no route qualifies. |
| **Verify the hull** | The app sends a fresh nonce to `/attestation`, checks the Google Confidential Space JWT signature against Google's JWKS, confirms our nonce is inside, and checks the Intel TDX, debug-off, secure-boot and image claims. |
| **Egress filter** | Public-claim checks go to Context.dev web search only after sealed literals and private numbers are stripped from the query. |
| **Revoke** | Kills the process, zeroes the key and shreds the ciphertext. The next question gets a 410. |

## Honest scope

Attestation proves the TrustedRouter gateway that handles our prompts is running the stated image on confidential hardware. Provider-side confidentiality comes from TrustedRouter's `confidential` routing floor. The app does not encrypt prompts on the client. The claim is "attested confidential inference."

## Layout

- `server.mjs`: HTTP API, deal lifecycle, revoke
- `lib/compartment.mjs`: per-deal process (Q&A, claim checks)
- `lib/policy.mjs`: seals, precheck, leak scan, egress filter, derived metrics
- `lib/vault.mjs`: AES-256-GCM vault and crypto-shredding
- `lib/attest.mjs`: hull verification
- `lib/inference.mjs`, `lib/context.mjs`: TrustedRouter and Context.dev clients
- `rooms/halyard/`: synthetic data room (`scripts/gen-halyard.py` regenerates it)
