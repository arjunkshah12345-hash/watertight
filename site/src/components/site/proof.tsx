"use client";

import { TerminalWindow } from "@/components/asciicn/terminal-window";
import type { TerminalStep } from "@/components/asciicn/terminal-window";
import { DitherNumber } from "@/components/dithercn/dither-number";
import { Divider } from "@/components/dithercn/divider";

const SCRIPT: readonly TerminalStep[] = [
  { kind: "command", text: 'watertight ask "Who are the top 5 customers?"' },
  { kind: "output", text: "SEALED · Customer identities", tone: "error" },
  { kind: "output", text: "  refused inside the room · 0 bytes left", tone: "muted" },
  { kind: "wait", duration: 0.6 },
  { kind: "command", text: 'watertight ask "What is net revenue retention?"' },
  { kind: "task", text: "Sealing the room", duration: 0.6, done: "133 values sealed · 34 pseudonyms" },
  { kind: "task", text: "→ api.confidential.nytokenexchange.com", duration: 1.4, done: "attested · min_privacy=confidential" },
  { kind: "output", text: "NRR is 91.6% (GRR 82.0%) [derived_metrics.md].", tone: "plain" },
  { kind: "output", text: "The deck claims 131% [pitch_deck.md]; the data doesn't support it.", tone: "warn" },
  { kind: "output", text: "  egress 5.7 KB · 0 of 133 sealed values present", tone: "ok" },
  { kind: "wait", duration: 0.6 },
  { kind: "command", text: "watertight revoke deal_3e40e004bb" },
  { kind: "progress", label: "Flooding compartment", duration: 1.2 },
  { kind: "output", text: "pid 36089 killed · 32-byte key zeroed · 5 files shredded", tone: "ok" },
  { kind: "command", text: 'watertight ask "ARR?"' },
  { kind: "output", text: "410 · Access revoked. Nothing left to read.", tone: "error" },
  { kind: "wait", duration: 2.5 },
];

const STATS = [
  { value: 0, label: "sealed values sent to the model" },
  { value: 8, suffix: "/8", label: "attestation checks, verified client-side" },
  { value: 133, label: "literals sealed in the demo room" },
  { value: 1, label: "click to shred an investor's access" },
];

export function Proof() {
  return (
    <section id="proof" className="night relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-28 md:px-10">
        <p className="font-mono text-[11px] tracking-[0.2em] text-foam/55 uppercase">03 · Proof</p>
        <div className="mt-4 grid grid-cols-1 gap-14 [&>*]:min-w-0 lg:grid-cols-[1fr_1.15fr] lg:items-start">
          <div>
            <h2 className="text-[clamp(2.2rem,4.2vw,3.4rem)] leading-[1] font-semibold tracking-[-0.03em] text-foam">
              It says no before anything leaves the room.
            </h2>
            <p className="mt-6 max-w-[30rem] leading-relaxed text-foam/70">
              Sealed questions are refused in the room. Allowed ones go to attested confidential inference with the
              room already redacted. Every byte that leaves is listed, and you can open the exact payload.
            </p>
            <Divider className="mt-12 text-foam/40" fade={0.3} />
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-10">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dd>
                    <DitherNumber
                      value={s.value}
                      suffix={s.suffix}
                      trigger="in-view"
                      size="xl"
                      effect="roll"
                      color={s.value === 0 ? "green" : "orange"}
                      className="text-foam"
                    />
                  </dd>
                  <dt className="mt-2 max-w-[14rem] text-[13px] leading-snug text-foam/60">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>
          <TerminalWindow
            script={SCRIPT}
            title="watertight · deal room"
            prompt="investor@klamath"
            loop
            rows={18}
            size="md"
            frame="rounded"
            speed={1}
          />
        </div>
      </div>
    </section>
  );
}
