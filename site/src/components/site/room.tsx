"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import { Loader } from "@/components/asciicn/loader";
import { StatusDot } from "@/components/asciicn/status-dot";
import { DitherGradient as Wash } from "@/components/dither-kit/gradient";

type Reply =
  | { kind: "refused"; label: string; quote: string }
  | { kind: "answer"; text: string; bytes: number };

// Responses captured from the Watertight app (offline rehearsal mode) on the Halyard demo room.
const QUESTIONS: { q: string; r: Reply }[] = [
  {
    q: "Who are the top 5 customers?",
    r: {
      kind: "refused",
      label: "Customer identities",
      quote: "Customer identities are sealed. Analysts see stable pseudonyms (C-01, C-02, …), never names.",
    },
  },
  {
    q: "What is net revenue retention?",
    r: {
      kind: "answer",
      text: "Net revenue retention for the Jan to Oct 2026 cohort is 91.6%, with gross retention at 82.0% [derived_metrics.md]. The deck claims 131% [pitch_deck.md], which the customer data does not support.",
      bytes: 6512,
    },
  },
  {
    q: "What does the CTO make?",
    r: {
      kind: "refused",
      label: "Individual compensation",
      quote: "Individual compensation is sealed. Only department totals for groups of 3 or more leave the vault.",
    },
  },
  {
    q: "What is ARR?",
    r: {
      kind: "answer",
      text: "Contracted ARR is $3,067,000 as of Oct 2026, down from $3,347,000 in January [derived_metrics.md]. The deck's $4.2M ARR is not supported.",
      bytes: 6543,
    },
  },
  {
    q: "What is the gross margin?",
    r: {
      kind: "answer",
      text: "Gross margin is 76.0% [derived_metrics.md]. Latest month (2026-10) net income is -$198,257, so monthly burn is about $198,257.",
      bytes: 6498,
    },
  },
];

type Entry = { id: number; q: string; state: "pending" | "done"; r: Reply | { kind: "gone" } };
type Log = { id: number; kind: "refused" | "inference" | "revoked"; bytes: number };

const KEY = "3f9a1c07e2b84d5a96c0f13e7b2a8d41c5e09f6a2b7d3c18e4f05a9b6c2d7e10";

function Cited({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/).map((part, i) =>
        part.startsWith("[") ? (
          <span key={i} className="mx-0.5 rounded-[3px] bg-foam/8 px-1.5 py-0.5 font-mono text-[11px] text-foam/60">
            {part.slice(1, -1)}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function Room() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [log, setLog] = useState<Log[]>([]);
  const [revoked, setRevoked] = useState(false);
  const [flood, setFlood] = useState(0); // 0 idle, 1 rising, 2 steps shown, 3 drained
  const [busy, setBusy] = useState(false);
  const thread = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const seq = useRef(0);

  const ask = useCallback(
    async (i: number) => {
      if (busy) return;
      setBusy(true);
      const id = ++seq.current;
      const { q, r } = QUESTIONS[i];
      setEntries((e) => [...e, { id, q, state: "pending", r }]);
      if (revoked) {
        await new Promise((res) => setTimeout(res, 350));
        setEntries((e) => e.map((x) => (x.id === id ? { ...x, state: "done", r: { kind: "gone" } } : x)));
      } else {
        await new Promise((res) => setTimeout(res, r.kind === "refused" ? 450 : 1300));
        setEntries((e) => e.map((x) => (x.id === id ? { ...x, state: "done" } : x)));
        setLog((l) => [...l, { id, kind: r.kind === "refused" ? "refused" : "inference", bytes: r.kind === "answer" ? r.bytes : 0 }]);
      }
      setBusy(false);
    },
    [busy, revoked],
  );

  const revoke = async () => {
    if (revoked || busy) return;
    setBusy(true);
    setFlood(1);
    await new Promise((r) => setTimeout(r, 900));
    setFlood(2);
    await new Promise((r) => setTimeout(r, 2600));
    setRevoked(true);
    setLog((l) => [...l, { id: ++seq.current, kind: "revoked", bytes: 0 }]);
    setFlood(3);
    setBusy(false);
  };

  const reset = () => {
    setEntries([]);
    setLog([]);
    setRevoked(false);
    setFlood(0);
  };

  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" });
  }, [entries]);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          void ask(0);
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ask]);

  const out = log.reduce((s, l) => s + l.bytes, 0);
  const asked = new Set(entries.map((e) => e.q));

  return (
    <section id="room" className="night relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 py-28 md:px-10">
        <div className="grid grid-cols-1 gap-8 [&>*]:min-w-0 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-foam/55 uppercase">02 · Try the room</p>
            <h2 className="mt-4 max-w-[44rem] text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1] font-semibold tracking-[-0.03em] text-foam">
              Ask Halyard&apos;s data room anything. Then sink it.
            </h2>
          </div>
          <p className="max-w-[24rem] text-[0.98rem] leading-relaxed text-foam/65">
            You&apos;re the investor. Sealed questions are refused before anything leaves. Allowed ones are answered
            with sources, and every byte that leaves shows up on the right.
          </p>
        </div>

        <div ref={frame} className="relative mt-14 overflow-hidden rounded-lg border border-foam/12 bg-night-2 shadow-[0_40px_120px_-40px_oklch(0_0_0/0.7)]">
          {/* Title bar */}
          <div className="flex items-center justify-between gap-4 border-b border-foam/10 px-5 py-3 font-mono text-[11.5px] text-foam/55">
            <div className="flex items-center gap-3">
              <span className="flex gap-1.5">
                <i className="size-2.5 rounded-full bg-foam/15" />
                <i className="size-2.5 rounded-full bg-foam/15" />
                <i className="size-2.5 rounded-full bg-foam/15" />
              </span>
              <span className="hidden sm:inline">watertight · Halyard × Klamath Ventures</span>
            </div>
            <span className="flex items-center gap-2">
              <StatusDot status={revoked ? "error" : "online"} label={revoked ? "revoked" : "open"} showLabel={false} size="sm" />
              {revoked ? "compartment sealed · key destroyed" : "compartment open · pid 36089"}
            </span>
          </div>

          <div className="grid grid-cols-1 [&>*]:min-w-0 lg:grid-cols-[17rem_1fr_19rem]">
            {/* Questions */}
            <div className="flex flex-col border-b border-foam/10 p-5 lg:border-r lg:border-b-0">
              <div className="font-mono text-[10.5px] tracking-[0.18em] text-foam/45 uppercase">Investor asks</div>
              <div className="mt-3 flex flex-col gap-1.5">
                {QUESTIONS.map((x, i) => (
                  <button
                    key={x.q}
                    type="button"
                    onClick={() => ask(i)}
                    disabled={busy}
                    className={`group rounded-md border px-3 py-2.5 text-left text-[13.5px] leading-snug transition-colors disabled:cursor-wait ${
                      asked.has(x.q)
                        ? "border-foam/8 text-foam/50"
                        : "border-foam/14 text-foam hover:border-beacon/60 hover:bg-beacon/6"
                    }`}
                  >
                    {x.q}
                    <span className="float-right font-mono text-[11px] text-foam/30 transition-colors group-hover:text-beacon">↵</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 border-t border-foam/10 pt-5 lg:mt-auto">
                <div className="font-mono text-[10.5px] tracking-[0.18em] text-foam/45 uppercase">Founder</div>
                {revoked ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-3 w-full rounded-md border border-foam/20 px-3 py-2.5 text-[13.5px] text-foam/80 transition-colors hover:bg-foam/6"
                  >
                    Open a fresh room
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={revoke}
                    disabled={busy}
                    className="mt-3 w-full rounded-md bg-ember px-3 py-2.5 text-[13.5px] font-semibold text-night transition-[filter] hover:brightness-110 disabled:opacity-60"
                  >
                    Revoke access
                  </button>
                )}
              </div>
            </div>

            {/* Thread */}
            <div ref={thread} className="h-[26rem] overflow-y-auto scroll-smooth p-5 md:h-[30rem] md:p-7">
              {entries.length === 0 && (
                <div className="flex h-full items-center justify-center font-mono text-[12px] text-foam/35">
                  pick a question on the left
                </div>
              )}
              <div className="space-y-6">
                {entries.map((e) => (
                  <div key={e.id} className="animate-rise">
                    <div className="font-mono text-[12px] text-foam/45">
                      investor › <span className="text-foam/85">{e.q}</span>
                    </div>
                    <div className="mt-2.5">
                      {e.state === "pending" ? (
                        <Loader variant="dots" label="Asking the room" size="sm" />
                      ) : e.r.kind === "gone" ? (
                        <div className="border-l-2 border-ember pl-4 font-mono text-[13px] text-ember">
                          410 · Access revoked. Nothing left to read.
                        </div>
                      ) : e.r.kind === "refused" ? (
                        <div className="border-l-2 border-ember pl-4">
                          <div className="font-mono text-[11px] tracking-[0.12em] text-ember uppercase">
                            Sealed · {e.r.label}
                          </div>
                          <p className="mt-1.5 text-[14.5px] leading-relaxed text-foam/80">{e.r.quote}</p>
                          <div className="mt-1.5 font-mono text-[11.5px] text-foam/40">refused inside the room · 0 bytes left</div>
                        </div>
                      ) : (
                        <div className="border-l-2 border-mint/70 pl-4">
                          <p className="text-[15px] leading-relaxed text-foam">
                            <Cited text={e.r.text} />
                          </p>
                          <div className="mt-2 font-mono text-[11.5px] text-foam/40">
                            GLM 5.3 Flash · min_privacy=confidential · attested
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ledger */}
            <div className="border-t border-foam/10 p-5 lg:border-t-0 lg:border-l">
              <div className="font-mono text-[10.5px] tracking-[0.18em] text-foam/45 uppercase">What left the room</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-foam/5 px-3 py-2.5">
                  <div className="font-mono text-[20px] text-foam tabular-nums">{(out / 1024).toFixed(1)} KB</div>
                  <div className="text-[11.5px] text-foam/45">to confidential inference</div>
                </div>
                <div className="rounded-md bg-mint/10 px-3 py-2.5">
                  <div className="font-mono text-[20px] text-mint tabular-nums">0</div>
                  <div className="text-[11.5px] text-foam/45">sealed values sent</div>
                </div>
              </div>
              <ol className="mt-5 space-y-2.5 font-mono text-[11.5px] leading-snug">
                {log.length === 0 && <li className="text-foam/30">nothing yet</li>}
                {log.map((l) => (
                  <li key={l.id} className="animate-rise border-b border-foam/8 pb-2.5 last:border-0">
                    {l.kind === "refused" && (
                      <>
                        <span className="text-ember">refused in room</span>
                        <div className="text-foam/40">0 B · no request made</div>
                      </>
                    )}
                    {l.kind === "inference" && (
                      <>
                        <span className="text-foam/80">→ confidential inference</span>
                        <div className="text-foam/40">
                          {(l.bytes / 1024).toFixed(1)} KB · <span className="text-mint">0 / 133 sealed</span> · attested
                        </div>
                      </>
                    )}
                    {l.kind === "revoked" && (
                      <>
                        <span className="text-ember">revoked · key zeroed</span>
                        <div className="text-foam/40">5 files shredded</div>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* The flood */}
          <div
            aria-hidden={flood === 0}
            className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden transition-[height] duration-[900ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
            style={{ height: flood === 1 || flood === 2 ? "100%" : "0%" }}
          >
            <div className="absolute inset-0 bg-[oklch(0.3_0.06_235)]" />
            <Wash from={205} to="transparent" direction="down" cell={4} opacity={0.5} />
            <div className="relative flex h-full flex-col items-center justify-center gap-2.5 font-mono text-[15px] text-foam">
              {flood === 2 && (
                <>
                  <div className="animate-rise">SIGKILL → pid 36089</div>
                  <div className="animate-rise [animation-delay:350ms]">
                    key {KEY.slice(0, 16)}… → <span className="text-beacon">{"0".repeat(16)}…</span>
                  </div>
                  <div className="animate-rise [animation-delay:700ms]">5 files shredded · .vault/deal_3e40e004bb</div>
                  <div className="animate-rise mt-3 text-[11px] tracking-[0.25em] text-beacon uppercase [animation-delay:1050ms]">
                    Compartment sealed
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="mt-5 font-mono text-[11.5px] text-foam/40">
          Replies are captured from the real app running the Halyard demo room. Clone the repo and add a key to run it live.
        </p>
      </div>
    </section>
  );
}
