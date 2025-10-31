import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Mock portfolio snapshot
  const positions = [
    { symbol: "AAPL", qty: 20, avgPrice: 187.5, lastPrice: 189.1 },
    { symbol: "MSFT", qty: 10, avgPrice: 414.2, lastPrice: 418.7 },
    { symbol: "NVDA", qty: 4, avgPrice: 110.0, lastPrice: 114.3 },
  ].map((p) => ({ ...p, pnl: (p.lastPrice - p.avgPrice) * p.qty }));

  const equity = positions.reduce((a, p) => a + p.lastPrice * p.qty, 0) + 10000;

  return NextResponse.json({
    cash: 10000,
    equity,
    positions,
  });
}


