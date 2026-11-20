"use client";

import { AsciiBadge } from "@/components/asciicn/ascii-badge";
import { OceanWaves } from "@/components/asciicn/ocean-waves";
import { TypewriterText } from "@/components/asciicn/typewriter-text";
import { DitherButton } from "@/components/dithercn/dither-button";
import { Mark } from "@/components/site/mark";

const REPO = "https://github.com/arjunkshah12345-hash/watertight";

const STACK = [
  "TrustedRouter · confidential routing",
  "NY Token Exchange gateway",
  "GLM 5.3 Flash",
  "Context.dev",
  "Boat.dev",
];

export function Closing() {
  return (
    <>
      <section className="night relative isolate overflow-hidden">
        <OceanWaves className="absolute inset-0 -z-10 h-full w-full opacity-70" moon swell={0.6} wind={0.4} />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,color-mix(in_oklch,var(--night)_80%,transparent),transparent_70%)]" />
        <div className="mx-auto flex min-h-[78svh] max-w-4xl flex-col items-center justify-center px-6 py-28 text-center">
          <TypewriterText
            className="font-mono text-[13px] text-foam/70"
            prompt="$"
            phrases={[
              "watertight seal --customers --salaries --cap-table",
              "watertight verify-hull --nonce fresh",
              "watertight revoke --shred",
            ]}
            loop
          />
          <h2 className="mt-8 text-[clamp(2.8rem,6.5vw,5.4rem)] leading-[0.95] font-semibold tracking-[-0.035em] text-foam">
            Share the answers.
            <br />
            <span className="text-beacon">Keep the room.</span>
          </h2>
          <p className="mt-6 max-w-[32rem] leading-relaxed text-foam/70">
            An NDA tells you what happens after a leak. Watertight stops the leak from happening.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <DitherButton asChild size="lg" color="orange">
              <a href="#room">Try the room</a>
            </DitherButton>
            <DitherButton asChild size="lg" variant="outline">
              <a href={REPO}>Read the code</a>
            </DitherButton>
          </div>
          <div className="mt-14 flex flex-wrap justify-center gap-2.5 rounded-md bg-night/85 px-4 py-3 backdrop-blur-sm">
            {STACK.map((s) => (
              <AsciiBadge key={s} shape="pipe" size="sm" tone="neutral">
                {s}
              </AsciiBadge>
            ))}
          </div>
        </div>
      </section>

      <footer className="night border-t border-foam/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 py-8 font-mono text-[12px] text-foam/55 md:px-10">
          <div className="flex items-center gap-2.5 text-foam/80">
            <Mark className="size-5" />
            Watertight
          </div>
          <p>Committed aboard the Historic Klamath, Pier 9 · Boat Hackathon SF 2026</p>
          <p>
            Claim on stage: attested confidential inference, not client-side encryption.{" "}
            <a className="underline underline-offset-4 hover:text-foam" href={`${REPO}#honest-scope`}>
              Scope
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
