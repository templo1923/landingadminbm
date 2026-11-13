export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-8 py-8 animate-pulse">
      <section className="overflow-hidden rounded-[32px] border border-emerald-500/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.05),transparent_38%),linear-gradient(180deg,#0e1012_0%,#09090b_100%)] p-8 shadow-[0_24px_120px_rgba(0,0,0,0.2)]">
        <div className="grid gap-10 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col justify-center space-y-6">
            <div className="h-6 w-32 rounded-full bg-emerald-500/10"></div>
            <div className="h-12 w-3/4 rounded-lg bg-white/5"></div>
            <div className="h-16 w-full rounded-lg bg-white/5"></div>
            <div className="flex gap-3 pt-2">
              <div className="h-11 w-36 rounded-full bg-emerald-500/10"></div>
              <div className="h-11 w-44 rounded-full bg-white/5"></div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-[28px] border border-white/5 bg-black/20 p-5 flex flex-col justify-between h-36">
                <div className="h-4 w-28 rounded bg-white/5"></div>
                <div className="space-y-3">
                  <div className="h-8 w-16 rounded bg-white/10"></div>
                  <div className="h-3 w-5/6 rounded bg-white/5"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[30px] border border-white/5 bg-[#0b0b0d] p-6 h-[400px] flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-2">
              <div className="h-6 w-40 rounded bg-white/10"></div>
              <div className="h-4 w-64 rounded bg-white/5"></div>
            </div>
            <div className="h-6 w-20 rounded-full bg-emerald-500/10"></div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 flex-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-[24px] border border-white/5 bg-black/20 p-4 space-y-3">
                <div className="h-4 w-12 rounded bg-white/5"></div>
                <div className="h-6 w-24 rounded bg-white/10"></div>
                <div className="h-10 w-full rounded bg-white/5"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/5 bg-[#0b0b0d] p-6 h-[400px] flex flex-col">
          <div className="space-y-2 mb-6">
            <div className="h-6 w-48 rounded bg-white/10"></div>
            <div className="h-4 w-72 rounded bg-white/5"></div>
          </div>
          <div className="space-y-3 flex-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-[22px] border border-white/5 bg-black/20 p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/5"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 rounded bg-white/10"></div>
                    <div className="h-3 w-20 rounded bg-white/5"></div>
                  </div>
                </div>
                <div className="h-7 w-20 rounded-full bg-white/5"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
