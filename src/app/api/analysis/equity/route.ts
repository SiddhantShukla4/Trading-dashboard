import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let base = 100000;
let series: { t: number; equity: number }[] = [];

function ensureSeries() {
  const now = Date.now();
  if (series.length === 0) {
    series = Array.from({ length: 60 }, (_, i) => {
      base += (Math.random() - 0.5) * 200;
      return { t: now - (60 - i) * 1000, equity: Math.max(1000, Math.round(base)) };
    });
  } else {
    // advance one point
    base = series[series.length - 1].equity + (Math.random() - 0.5) * 200;
    series.push({ t: now, equity: Math.max(1000, Math.round(base)) });
    if (series.length > 600) series.shift();
  }
}

export async function GET() {
  ensureSeries();
  return NextResponse.json(series);
}


