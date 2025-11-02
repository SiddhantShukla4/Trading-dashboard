"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";

type EquityPoint = { t: number; equity: number };

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function AnalysisPage() {
  const [data, setData] = useState<EquityPoint[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const res = await fetch("/api/analysis/equity");
      const json = await res.json();
      if (mounted) setData(json);
    };
    load();
    const id = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const last = data[data.length - 1];
  const start = data[0];
  const perf =
    last && start ? ((last.equity - start.equity) / start.equity) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Current Equity
          </div>
          <div className="text-2xl font-semibold">
            {last ? formatCurrency(last.equity) : "-"}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Start Equity
          </div>
          <div className="text-2xl font-semibold">
            {start ? formatCurrency(start.equity) : "-"}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Return
          </div>
          <div
            className={`text-2xl font-semibold ${
              perf >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {perf.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 font-medium">Equity Curve</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ left: 8, right: 16, bottom: 8, top: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                tickFormatter={(v) => format(new Date(v), "HH:mm:ss")}
                domain={["auto", "auto"]}
                type="number"
              />
              <YAxis domain={["auto", "auto"]} />
              <Tooltip
                labelFormatter={(v) => format(new Date(Number(v)), "HH:mm:ss")}
                formatter={(value) => [formatCurrency(Number(value)), "Equity"]}
              />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#6366F1"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
