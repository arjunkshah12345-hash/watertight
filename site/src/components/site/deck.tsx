"use client";

import { BarChart } from "@/components/dithercn/bar-chart";
import { StatCard } from "@/components/dithercn/stat-card";

const CLAIMS = [
  { metric: "Enterprise customers", deck: "40+", room: "21", pct: 52.5, trend: [26, 25, 24, 23, 22, 21] },
  { metric: "ARR", deck: "$4.2M", room: "$3.07M", pct: 73.1, trend: [3.35, 3.31, 3.26, 3.2, 3.13, 3.07] },
  { metric: "Net revenue retention", deck: "131%", room: "91.6%", pct: 69.9, trend: [104, 101, 98, 95, 93, 91.6] },
] as const;

const BARS = CLAIMS.map((c) => ({ metric: c.metric, claim: 100, data: c.pct }));

export function Deck() {
  return (
    <section className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-7xl px-6 py-28 md:px-10">
        <div className="grid grid-cols-1 gap-14 [&>*]:min-w-0 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-faint uppercase">04 · Check the deck</p>
            <h2 className="mt-4 text-[clamp(2.2rem,4.2vw,3.4rem)] leading-[1] font-semibold tracking-[-0.03em]">
              The deck says one thing. The room says another.
            </h2>
            <p className="mt-6 max-w-[30rem] leading-relaxed text-ink-2">
              Watertight checks every traction claim against the founder&apos;s own files, privately. Public claims
              go to the open web through Context.dev, after an egress filter strips anything sealed from the query.
            </p>
          </div>
          <div className="rounded-lg border border-rule bg-card p-5">
            <p className="mb-3 font-mono text-[11px] text-faint">room&apos;s figure as % of the deck&apos;s claim</p>
            <BarChart
              data={BARS}
              x="metric"
              series={[
                { value: "claim", label: "Deck claim", color: "grey" },
                { value: "data", label: "Data room", color: "red" },
              ]}
              layout="grouped"
              height={240}
              legend
              tooltip
              format={(v: number) => `${v}%`}
            />
          </div>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {CLAIMS.map((c) => (
            <div key={c.metric}>
              <StatCard
                label={`${c.metric} · deck says ${c.deck}`}
                value={c.room}
                delta={-(Math.round((100 - c.pct) * 10) / 10)}
                deltaLabel="vs the deck"
                good="up"
                trend={c.trend}
                color="red"
              />
            </div>
          ))}
        </div>
        <p className="mt-6 font-mono text-[11.5px] text-faint">
          Halyard is a synthetic demo company. Every number here is made up, and the gaps are on purpose.
        </p>
      </div>
    </section>
  );
}
