import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DHAN_API_BASE = "https://api.dhan.co";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol parameter required" }, { status: 400 });
  }

  const token = process.env.DHAN_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "DHAN_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  try {
    const endpoints = [
      `${DHAN_API_BASE}/v2/quote/${symbol}`,
      `${DHAN_API_BASE}/quote/${symbol}`,
      `${DHAN_API_BASE}/v2/quotes?symbol=${symbol}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Access-Token": token,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            symbol,
            price: data.lastPrice || data.ltp || data.price || data.close || 0,
            data,
          });
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  } catch (error) {
    console.error("Quote API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

