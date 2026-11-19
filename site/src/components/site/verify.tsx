"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AsciiBadge } from "@/components/asciicn/ascii-badge";
import { AsciiBox } from "@/components/asciicn/ascii-box";
import { Loader } from "@/components/asciicn/loader";
import { ProgressBar } from "@/components/asciicn/progress-bar";
import { StatusDot } from "@/components/asciicn/status-dot";
import { DitherButton } from "@/components/dithercn/dither-button";
import { CHECK_LABELS, GATEWAY, inspectHull, type HullResult } from "@/lib/hull";

type State =
  | { phase: "idle" }
  | { phase: "running"; shown: number }
  | { phase: "done"; result: HullResult; shown: number }
  | { phase: "error"; message: string };

export function Verify() {
  const [state, setState] = useState<State>({ phase: "idle" });
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setState({ phase: "running", shown: 0 });
    try {
      const result = await inspectHull();
      // Reveal checks one at a time so the inspection reads as an inspection.
      for (let i = 1; i <= result.checks.length; i++) {
        setState({ phase: "done", result, shown: i });
        await new Promise((r) => setTimeout(r, 170));
      }
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          void run();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [run]);

  const result = state.phase === "done" ? state.result : null;
  const shown = state.phase === "done" ? state.shown : 0;
  const complete = result && shown === result.checks.length;
  const passed = result ? result.checks.slice(0, shown).filter((c) => c.ok).length : 0;

  return (
    <section id="verify" className="night relative isolate overflow-hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 [&>*]:min-w-0 px-6 py-28 md:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-foam/50 uppercase">04 · Verify the hull</p>
          <h2 className="mt-4 text-[clamp(2.2rem,4.2vw,3.4rem)] leading-[1] font-semibold tracking-[-0.03em] text-foam">
            Don&apos;t trust us.
            <br />
            Check it from this page.
          </h2>
          <p className="mt-6 max-w-[30rem] text-[1.02rem] leading-relaxed text-foam/70">
            Your browser just sent a random nonce to the gateway that runs Watertight&apos;s model calls. It answered
            with a token signed by Google Confidential Computing that has to contain that nonce. Your browser checked
            the signature and the hardware claims itself. No Watertight server was involved.
          </p>
          <ul className="mt-7 space-y-2 font-mono text-[12.5px] text-foam/70">
            <li>→ Intel TDX enclave, debugging off since boot</li>
            <li>→ <span className="text-foam">min_privacy: &quot;confidential&quot;</span> on every request, failing closed</li>
            <li>→ fresh proof per click, so it can&apos;t be replayed</li>
          </ul>
        </div>

        <div ref={ref}>
          <AsciiBox
            frame="double"
            title=" hull inspection "
            footer={complete ? ` ${result.ms} ms · ${new URL(GATEWAY).host} ` : ` ${new URL(GATEWAY).host} `}
            shadow="light"
            filled
            padding={2}
            className="bg-night-2"
          >
            <div className="font-mono text-[13px]">
              <div className="flex items-center justify-between gap-4 pb-3">
                <span className="text-foam/50">
                  nonce{" "}
                  <span className="text-foam">
                    {result ? `${result.nonce.slice(0, 24)}…` : state.phase === "running" ? "generating…" : "—"}
                  </span>
                </span>
                {state.phase === "running" && <Loader variant="dots" label="Inspecting" size="sm" />}
                {complete && (
                  <AsciiBadge tone={result.ok ? "ok" : "error"} shape="inverse" size="sm">
                    {result.ok ? "WATERTIGHT" : "LEAK"}
                  </AsciiBadge>
                )}
              </div>

              <ul className="divide-y divide-foam/10 border-y border-foam/10">
                {CHECK_LABELS.map((c, i) => {
                  const r = result && i < shown ? result.checks[i] : null;
                  return (
                    <li key={c.id} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-3 py-2.5">
                      <StatusDot
                        status={r ? (r.ok ? "online" : "error") : state.phase === "running" ? "busy" : "offline"}
                        label={r ? (r.ok ? "passed" : "failed") : "pending"}
                        animate={state.phase === "running"}
                        showLabel={false}
                        size="sm"
                      />
                      <span className={r ? "text-foam" : "text-foam/50"}>{c.label}</span>
                      <span className="max-w-[13rem] truncate text-right text-[11.5px] text-foam/50">{r?.detail ?? ""}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="pt-4">
                <ProgressBar
                  label="Checks passed"
                  value={passed}
                  max={CHECK_LABELS.length}
                  valueText={`${passed} of ${CHECK_LABELS.length}`}
                  color={result && !result.ok ? "red" : "green"}
                  track="shade"
                  size="md"
                />
              </div>

              {complete && result.digest && (
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[11.5px]">
                  <dt className="text-foam/50">image</dt>
                  <dd className="truncate">{result.image}</dd>
                  <dt className="text-foam/50">digest</dt>
                  <dd className="truncate">{result.digest}</dd>
                  <dt className="text-foam/50">enclave</dt>
                  <dd className="truncate">
                    {result.instance} · {result.zone}
                  </dd>
                </dl>
              )}
              {state.phase === "error" && (
                <p className="mt-4 text-signal">Couldn&apos;t reach the gateway: {state.message}</p>
              )}
            </div>
          </AsciiBox>
          <div className="mt-5 flex justify-end">
            <DitherButton variant="outline" size="sm" onClick={run} disabled={state.phase === "running"}>
              Re-inspect with a new nonce
            </DitherButton>
          </div>
        </div>
      </div>
    </section>
  );
}
