"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { create } from "zustand";

type Position = {
  symbol: string;
  qty: number;
  avgPrice: number;
  lastPrice: number;
  pnl: number;
};

type PortfolioState = {
  cash: number;
  equity: number;
  positions: Position[];
  updateFromTick: (tick: Partial<PortfolioState> & { positions?: Position[] }) => void;
};

const usePortfolioStore = create<PortfolioState>((set) => ({
  cash: 0,
  equity: 0,
  positions: [],
  updateFromTick: (tick) =>
    set((prev) => ({
      cash: tick.cash ?? prev.cash,
      equity: tick.equity ?? prev.equity,
      positions: tick.positions ?? prev.positions,
    })),
}));

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function usePortfolioStream() {
  const updateFromTick = usePortfolioStore((s) => s.updateFromTick);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (wsUrl) {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const tick = JSON.parse(ev.data);
          updateFromTick(tick);
        } catch {}
      };
      ws.onerror = () => {
      };
      return () => ws.close();
    }

    // Poll API for real-time updates (faster polling for live data)
    let id: number | undefined;
    const poll = async () => {
      try {
        const res = await fetch("/api/portfolio", { 
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        });
        const data = await res.json();
        if (!data.error) {
          updateFromTick(data);
          // Log source for debugging
          if (data.source === "mock") {
            console.warn("Using mock data. Check .env.local file and server logs.");
          } else if (data.source === "dhan") {
            console.log("Real Dhan data loaded");
          }
        } else {
          console.error("API error:", data.error);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      }
      id = window.setTimeout(poll, 1000); 
    };
    poll();
    return () => {
      if (id) window.clearTimeout(id);
    };
  }, [updateFromTick]);
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { 
    style: "currency", 
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function PortfolioPage() {
  usePortfolioStream();
  const cash = usePortfolioStore((s) => s.cash);
  const equity = usePortfolioStore((s) => s.equity);
  const positions = usePortfolioStore((s) => s.positions);

  const totalPnl = useMemo(() => positions.reduce((a, p) => a + p.pnl, 0), [positions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400">Cash</div>
          <div className="text-2xl font-semibold">{formatCurrency(cash)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400">Equity</div>
          <div className="text-2xl font-semibold">{formatCurrency(equity)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total P&L</div>
          <div className={`text-2xl font-semibold ${totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {formatCurrency(totalPnl)}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="px-4 py-3 border-b border-slate-200 font-medium dark:border-slate-800">Open Positions</div>
        <table className="min-w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/40">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Symbol</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Qty</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Avg Price</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Last Price</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">P&L</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>No positions</td>
              </tr>
            ) : (
              positions.map((p) => (
                <tr key={p.symbol} className="odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-900/60">
                  <td className="px-4 py-2 font-medium">{p.symbol}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{p.qty}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.avgPrice)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(p.lastPrice)}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${p.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {formatCurrency(p.pnl)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


