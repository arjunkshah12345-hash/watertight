"use client";

import { useEffect, useRef, useState } from "react";

// The Traction slide from Halyard's (synthetic) deck, marked up against its own data room.
const CLAIMS = [
  { claim: "40+ enterprise customers", note: "21", src: "customers.csv", ok: false },
  { claim: "$4.2M ARR", note: "$3.07M", src: "pnl_2026.csv", ok: false },
  { claim: "131% net revenue retention", note: "91.6%", src: "derived_metrics.md", ok: false },
  { claim: "76% gross margin", note: "76.0%, checks out", src: "pnl_2026.csv", ok: true },
];

function Strike({ on, delay }: { on: boolean; delay: number }) {
  return (
    <svg
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 -left-1 h-3 w-[calc(100%+0.5rem)] -translate-y-1/2 overflow-visible"
    >
      <path
        d="M0 6 C 20 3, 45 7, 70 4.5 S 95 5, 100 3.5"
        fill="none"
        stroke="var(--signal)"
        strokeWidth="1.6"
        strokeLinecap="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: on ? 0 : 1,
          transition: `stroke-dashoffset 0.55s cubic-bezier(0.65,0,0.35,1) ${delay}ms`,
        }}
      />
    </svg>
  );
}

export function Redline() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="deck" className="border-b border-rule bg-paper">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-6 py-28 [&>*]:min-w-0 md:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-faint uppercase">03 · Check the deck</p>
          <h2 className="mt-4 text-[clamp(2.2rem,4.2vw,3.4rem)] leading-[1] font-semibold tracking-[-0.03em]">
            The deck says one thing. The room says another.
          </h2>
          <p className="mt-6 max-w-[30rem] text-[1.02rem] leading-relaxed text-ink-2">
            One click checks every traction claim against the founder&apos;s own files, inside the sealed room, with a
            source for each number. Public claims like market size go to the web through Context.dev, after an egress
            filter strips anything sealed from the query.
          </p>
          <p className="mt-8 font-mono text-[11.5px] leading-relaxed text-faint">
            Halyard is a synthetic demo company. Every number is made up, and the gaps are on purpose.
          </p>
        </div>

        <div ref={ref} className="relative">
          {/* the slide */}
          <div className="relative rounded-md border border-rule bg-card px-[6%] pt-[5%] pb-[7%] shadow-[0_30px_80px_-40px_oklch(0.2_0.035_255/0.45)]">
            <div className="flex items-center justify-between font-mono text-[10.5px] tracking-[0.18em] text-faint uppercase">
              <span>Halyard · Series A</span>
              <span>pitch_deck.md · 03</span>
            </div>
            <h3 className="mt-[5%] text-[clamp(1.4rem,2.6vw,2.2rem)] font-semibold tracking-[-0.02em]">Traction</h3>
            <ul className="mt-6 space-y-4">
              {CLAIMS.map((c, i) => (
                <li key={c.claim} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="relative text-[clamp(0.95rem,1.7vw,1.35rem)] font-medium text-ink">
                    {c.claim}
                    {!c.ok && <Strike on={on} delay={300 + i * 380} />}
                  </span>
                  <span
                    className={`font-mono text-[clamp(0.75rem,1.15vw,0.9rem)] transition-all duration-500 ${
                      c.ok ? "text-sea" : "text-signal"
                    } ${on ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"}`}
                    style={{ transitionDelay: `${650 + i * 380}ms` }}
                  >
                    {c.ok ? "✓ " : "→ "}
                    {c.note} <span className="text-faint">[{c.src}]</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* reviewer's stamp */}
          <div
            className={`absolute -right-2 -bottom-6 rotate-[-4deg] rounded-sm border-2 border-signal bg-paper px-4 py-2 font-mono text-[12px] leading-tight tracking-[0.12em] text-signal uppercase transition-all duration-500 md:-right-6 ${
              on ? "scale-100 opacity-100" : "scale-110 opacity-0"
            }`}
            style={{ transitionDelay: `${700 + CLAIMS.length * 380}ms` }}
          >
            3 of 4 claims
            <br />
            not supported
          </div>
        </div>
      </div>
    </section>
  );
}
