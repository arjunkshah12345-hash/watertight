"use client";

import { AsciiBadge } from "@/components/asciicn/ascii-badge";
import { Lighthouse } from "@/components/asciicn/lighthouse";
import { DissolveText } from "@/components/dithercn/dissolve-text";
import { DitherButton } from "@/components/dithercn/dither-button";
import { Mark } from "@/components/site/mark";

const REPO = "https://github.com/arjunkshah12345-hash/watertight";

export function Hero() {
  return (
    <section className="night relative isolate min-h-[100svh] overflow-hidden">
      {/* The beacon: a lighthouse you can check for yourself */}
      <div className="absolute inset-0 -z-10">
        <Lighthouse className="absolute inset-0 h-full w-full" stars clouds intensity={0.9} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--night)_0%,color-mix(in_oklch,var(--night)_88%,transparent)_34%,transparent_68%)]" />
        <div className="absolute inset-0 bg-night/65 md:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(0deg,var(--night),transparent)]" />
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <a href="#" className="flex items-center gap-2.5 text-foam">
          <Mark className="size-7" />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">Watertight</span>
        </a>
        <nav className="hidden items-center gap-7 font-mono text-[12px] text-foam/70 md:flex">
          <a className="transition-colors hover:text-foam" href="#verify">Verify</a>
          <a className="transition-colors hover:text-foam" href="#hull">How it works</a>
          <a className="transition-colors hover:text-foam" href="#proof">Proof</a>
          <a className="transition-colors hover:text-foam" href={REPO}>Code</a>
        </nav>
      </header>

      <div className="mx-auto flex min-h-[calc(100svh-5rem)] max-w-7xl flex-col justify-center px-6 pb-24 md:px-10">
        <div className="animate-rise max-w-[40rem]">
          <AsciiBadge tone="accent" shape="square" dot size="sm" color="orange">
            Private AI data room
          </AsciiBadge>
          <h1 className="mt-6 text-[clamp(3rem,7.2vw,6rem)] leading-[0.92] font-semibold tracking-[-0.035em] text-foam">
            Due diligence
            <br />
            <DissolveText as="span" by="char" trigger="mount" delay={350} color="orange" className="text-beacon">
              that doesn&apos;t leak.
            </DissolveText>
          </h1>
          <p className="mt-7 max-w-[34rem] text-[1.12rem] leading-relaxed text-foam/75">
            Investors ask an AI anything about a startup&apos;s data room. Sealed details never reach the model,
            every byte that leaves is checked, and the founder can sink access in one click.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <DitherButton asChild size="lg" color="orange">
              <a href="#verify">Verify the hull</a>
            </DitherButton>
            <a
              href="#proof"
              className="font-mono text-[13px] text-foam/70 underline-offset-4 transition-colors hover:text-foam hover:underline"
            >
              Watch it refuse →
            </a>
          </div>
        </div>

        <dl className="mt-16 grid max-w-[44rem] grid-cols-1 sm:grid-cols-3 gap-6 border-t border-foam/15 pt-6 font-mono text-[12px] text-foam/60">
          <div>
            <dt>Inference</dt>
            <dd className="mt-1 text-foam">Attested · confidential</dd>
          </div>
          <div>
            <dt>Sealed values sent</dt>
            <dd className="mt-1 text-foam">0</dd>
          </div>
          <div>
            <dt>Revoke</dt>
            <dd className="mt-1 text-foam">1 click · key shredded</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
