export default function Home() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <a
        href="/portfolio"
        className="rounded-lg border border-slate-200 bg-white p-6 hover:shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="text-lg font-semibold mb-1">Live Portfolio</div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          View real-time positions, equity and P&L.
        </div>
      </a>
      <a
        href="/analysis"
        className="rounded-lg border border-slate-200 bg-white p-6 hover:shadow-sm transition dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="text-lg font-semibold mb-1">Analysis</div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Charts and metrics for strategy performance.
        </div>
      </a>
    </div>
  );
}
