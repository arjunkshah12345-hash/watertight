"use client";

import { useEffect, useState } from "react";

import { DitherGradient as Wash } from "@/components/dither-kit/gradient";
import { ScrambleText } from "@/components/asciicn/scramble-text";

const COMPARTMENTS = [
  {
    n: "01",
    name: "Vault",
    line: "A fresh AES-256-GCM key per deal",
    body: "Every file is encrypted at rest under a key made for this deal alone. The key lives in memory, never on disk.",
    stat: "256-bit",
  },
  {
    n: "02",
    name: "Compartment",
    line: "One isolated process per deal",
    body: "Each investor gets their own process (a Boat.dev VM in production). The key arrives over IPC, so plaintext exists in exactly one place.",
    stat: "1 deal : 1 process",
  },
  {
    n: "03",
    name: "Seals",
    line: "Redacted before the model sees a byte",
    body: "Customer names become stable pseudonyms like C-07. Salaries collapse to department totals for groups of three or more. Cap-table holders roll up by share class.",
    stat: "133 values sealed",
  },
  {
    n: "04",
    name: "Precheck",
    line: "Refuses sealed questions in the room",
    body: "“Who are the top 5 customers?” is refused before inference, with the founder's policy quoted back. Zero bytes leave.",
    stat: "0 bytes out",
  },
  {
    n: "05",
    name: "Leak scan",
    line: "Every payload checked, every answer checked",
    body: "Outbound requests and model answers are scanned against every sealed literal. An answer that contains one never reaches the investor.",
    stat: "0 of 133 sent",
  },
  {
    n: "06",
    name: "Revoke",
    line: "Sink access in one click",
    body: "The process is killed, the key is zeroed and the ciphertext is shredded. The investor's next question has nothing left to read.",
    stat: "key → 0x00",
  },
] as const;

export function Hull() {
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);

  // Flood one compartment at a time until someone takes the helm.
  useEffect(() => {
    if (hovering) return;
    const id = setInterval(() => setActive((a) => (a + 1) % COMPARTMENTS.length), 3200);
    return () => clearInterval(id);
  }, [hovering]);

  const c = COMPARTMENTS[active];

  return (
    <section id="hull" className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-7xl px-6 py-28 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-faint uppercase">02 · How it holds water</p>
            <h2 className="mt-4 max-w-[40rem] text-[clamp(2.2rem,4.2vw,3.4rem)] leading-[1] font-semibold tracking-[-0.03em]">
              Six bulkheads. A breach in one never floods the next.
            </h2>
          </div>
          <p className="max-w-[22rem] text-[0.98rem] leading-relaxed text-ink-2">
            Ships survive hull breaches because they&apos;re built in sealed compartments. Watertight treats
            your data room the same way.
          </p>
        </div>

        {/* Cross-section */}
        <div
          className="relative mt-16 grid grid-cols-3 rounded-t-sm bg-ink p-[3px] md:grid-cols-6"
          onMouseLeave={() => setHovering(false)}
        >
          {COMPARTMENTS.map((x, i) => {
            const on = i === active;
            return (
              <button
                key={x.n}
                type="button"
                onMouseEnter={() => {
                  setHovering(true);
                  setActive(i);
                }}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-pressed={on}
                className="group relative isolate h-56 overflow-hidden border-r-[3px] border-ink bg-paper text-left last:border-r-0 max-md:border-b-[3px] md:h-72"
              >
                <div className="water absolute inset-x-0 bottom-0 -z-10" style={{ height: on ? "74%" : "9%" }}>
                  <div className="absolute inset-0 bg-[oklch(0.83_0.045_232)]" />
                  <Wash from={222} to="transparent" direction="up" cell={3} opacity={0.4} />
                </div>
                <div className={`flex h-full flex-col justify-between p-4 md:p-5`}>
                  <span className="font-mono text-[11px] text-faint">{x.n}</span>
                  <div className="pb-3">
                    <div className="text-[1.05rem] font-semibold tracking-[-0.01em]">{x.name}</div>
                    <div className="mt-1 hidden text-[12.5px] leading-snug text-ink-2 md:block">{x.line}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <svg viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden="true" className="block h-8 w-full text-ink md:h-10">
          <path d="M0 0 H1000 L955 34 Q948 40 938 40 H62 Q52 40 45 34 Z" fill="currentColor" />
          <path d="M120 20 H880" stroke="var(--paper)" strokeWidth="1.5" strokeDasharray="6 8" opacity="0.35" />
        </svg>

        {/* Readout for the flooded compartment */}
        <div className="mt-10 grid gap-8 border-t border-rule pt-8 md:grid-cols-[12rem_1fr_auto] md:items-baseline">
          <div className="font-mono text-[12px] text-faint">
            compartment {c.n} / 06
          </div>
          <div>
            <h3 className="text-[1.5rem] font-semibold tracking-[-0.02em]">{c.name}</h3>
            <p className="mt-2 max-w-[38rem] leading-relaxed text-ink-2">{c.body}</p>
          </div>
          <ScrambleText key={c.n} as="div" trigger="mount" className="font-mono text-[1.35rem] text-ink" glyphs="blocks">
            {c.stat}
          </ScrambleText>
        </div>
      </div>
    </section>
  );
}
