# Watertight site

The landing page for Watertight. It's a static Next.js export built from these shadcn registries:

- [gradients.sh](https://gradients.sh): `GrainGradient`, `GradientText`
- [dithercn](https://dithercn.dev): `DitherButton`, `DissolveText`, `DitherNumber`, `StatCard`, `BarChart`, `Divider`
- [asciicn](https://asciicn.dev): `Lighthouse`, `OceanWaves`, `TerminalWindow`, `AsciiBox`, `StatusDot`, `ProgressBar`, `TypewriterText`, `ScrambleText`
- [dither-kit](https://tripwire.sh/dither-kit): `DitherGradient` (the flooding compartments)

The "Verify the hull" panel (`src/lib/hull.ts`) runs entirely in the visitor's browser. It sends a fresh nonce to the confidential gateway's `/attestation` endpoint, then checks the Google Confidential Space JWT signature against Google's JWKS with WebCrypto.

```bash
pnpm install
pnpm dev           # http://localhost:3000
pnpm exec next build   # static export in out/
```

`.github/workflows/pages.yml` deploys `out/` to GitHub Pages and sets `NEXT_PUBLIC_BASE_PATH` to `/<repo>`.
