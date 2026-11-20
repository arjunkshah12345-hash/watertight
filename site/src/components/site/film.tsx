const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function Film() {
  return (
    <section id="film" className="night border-b border-foam/10 bg-night">
      <div className="mx-auto max-w-6xl px-6 py-28 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-foam/50 uppercase">06 · The 90-second cut</p>
            <h2 className="mt-4 max-w-[40rem] text-[clamp(2.2rem,4.2vw,3.4rem)] leading-[1] font-semibold tracking-[-0.03em] text-foam">
              Refuse, answer, verify, sink.
            </h2>
          </div>
          <p className="max-w-[24rem] font-mono text-[12px] leading-relaxed text-foam/55">
            Recorded from the real app in offline rehearsal mode, plus the live hull check from this site.
          </p>
        </div>
        <div className="mt-12 overflow-hidden rounded-md border border-foam/15 bg-black shadow-[0_40px_120px_-50px_oklch(0.75_0.15_75/0.35)]">
          <video
            className="block aspect-video w-full"
            src={`${BASE}/demo.mp4`}
            poster={`${BASE}/demo-poster.jpg`}
            controls
            playsInline
            preload="none"
          />
        </div>
      </div>
    </section>
  );
}
