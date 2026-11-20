"use client";

import { useEffect, useRef, useState } from "react";

import { ScrambleText } from "@/components/asciicn/scramble-text";

type Cell = string | { raw: string; sealed: string | null };

// Real rows from the Halyard demo room and what the seals turn them into.
const CUSTOMERS: { header: string[]; rows: Cell[][] } = {
  header: ["customer", "segment", "arr_oct_2026", "champion"],
  rows: [
    [{ raw: "Pelican Maritime", sealed: "C-01" }, "Enterprise", "106000", { raw: "Rae Chen", sealed: null }],
    [{ raw: "Northwind Cargo", sealed: "C-02" }, "Enterprise", "101000", { raw: "Luis Haas", sealed: null }],
    [{ raw: "Bluefin Logistics", sealed: "C-03" }, "Enterprise", "113000", { raw: "Ines Ortiz", sealed: null }],
  ],
};

const PAYROLL_RAW = [
  ["employee", "title", "base_salary"],
  ["Ava Abara", "Head of Engineering", "210000"],
  ["Ben Brandt", "Software Engineer", "168000"],
  ["Caro Costa", "Software Engineer", "225000"],
];
const PAYROLL_SEALED = [
  ["department", "headcount", "total_base"],
  ["Engineering", "8", "1600000"],
  ["Sales", "4", "595000"],
  ["Customer Success", "3", "315000"],
];

function Pane({
  sealed,
  on,
}: {
  sealed: boolean;
  on: boolean;
}) {
  const header = sealed ? CUSTOMERS.header.slice(0, 3) : CUSTOMERS.header;
  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-md border ${
        sealed ? "border-ink bg-ink text-paper" : "border-rule bg-card"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-4 border-b px-5 py-3 font-mono text-[11px] tracking-[0.08em] uppercase ${
          sealed ? "border-paper/10 text-paper/60" : "border-rule text-faint"
        }`}
      >
        <span>{sealed ? "What Watertight sends" : "What a chatbot gets"}</span>
        <span className={sealed ? "text-mint" : "text-signal"}>
          {sealed ? "● sealed" : "● raw"}
        </span>
      </div>

      <div className="space-y-5 overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-[1.75]">
        <div>
          <div className={sealed ? "text-paper/45" : "text-faint"}>
            {"<document name=\"customers.csv\">"}
          </div>
          <div className={sealed ? "text-paper/55" : "text-ink-2"}>{header.join(",")}</div>
          {CUSTOMERS.rows.map((row, i) => (
            <div key={i} className="whitespace-nowrap">
              {row
                .map((c, j) => ({ c, j }))
                .filter(({ c }) => !(sealed && typeof c !== "string" && c.sealed === null))
                .map(({ c, j }, k) => (
                  <span key={j}>
                    {k > 0 && ","}
                    {typeof c === "string" ? (
                      c
                    ) : sealed ? (
                      <mark className="rounded-[2px] bg-mint/15 px-0.5 text-mint">
                        {on ? (
                          <ScrambleText as="span" trigger="mount" glyphs="blocks">
                            {c.sealed!}
                          </ScrambleText>
                        ) : (
                          c.raw
                        )}
                      </mark>
                    ) : (
                      <mark className="rounded-[2px] bg-signal/12 px-0.5 text-signal">{c.raw}</mark>
                    )}
                  </span>
                ))}
            </div>
          ))}
        </div>

        <div>
          <div className={sealed ? "text-paper/45" : "text-faint"}>
            {sealed ? "<document name=\"payroll.csv (department summary)\">" : "<document name=\"payroll.csv\">"}
          </div>
          {(sealed ? PAYROLL_SEALED : PAYROLL_RAW).map((row, i) => (
            <div key={i} className={`whitespace-nowrap ${i === 0 ? (sealed ? "text-paper/55" : "text-ink-2") : ""}`}>
              {row.map((v, j) => (
                <span key={j}>
                  {j > 0 && ","}
                  {i > 0 && !sealed && (j === 0 || j === 2) ? (
                    <mark className="rounded-[2px] bg-signal/12 px-0.5 text-signal">{v}</mark>
                  ) : (
                    v
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div
        className={`mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-5 py-3 font-mono text-[11.5px] ${
          sealed ? "border-paper/10 text-paper/60" : "border-rule text-faint"
        }`}
      >
        <span>{sealed ? "→ api.confidential.nytokenexchange.com" : "→ a model provider nobody in the deal can audit"}</span>
        <span className={sealed ? "text-mint" : "text-signal"}>
          {sealed ? "0 of 133 sealed values" : "names, champions, salaries"}
        </span>
      </div>
    </div>
  );
}

export function Leak() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="leak" className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-7xl px-6 py-28 md:px-10">
        <p className="font-mono text-[11px] tracking-[0.2em] text-faint uppercase">01 · The leak</p>
        <h2 className="mt-4 max-w-[52rem] text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1] font-semibold tracking-[-0.03em]">
          Every diligence question pasted into a chatbot ships the data room with it.
        </h2>
        <p className="mt-6 max-w-[40rem] text-[1.05rem] leading-relaxed text-ink-2">
          Watertight seals the room before a model sees a byte. Customers become stable pseudonyms, the people
          drop out, and salaries collapse to department totals. The model still answers the question.
        </p>

        <div ref={ref} className="mt-14 grid grid-cols-1 items-stretch gap-4 [&>*]:min-w-0 lg:grid-cols-[1fr_auto_1fr]">
          <Pane sealed={false} on={on} />
          <div className="flex items-center justify-center font-mono text-[11px] tracking-[0.2em] text-faint uppercase lg:flex-col lg:gap-3">
            <span className="hidden h-16 w-px bg-rule lg:block" />
            <span className="rounded-full border border-ink px-3 py-1.5 text-ink">seal</span>
            <span className="hidden h-16 w-px bg-rule lg:block" />
          </div>
          <Pane sealed on={on} />
        </div>
      </div>
    </section>
  );
}
