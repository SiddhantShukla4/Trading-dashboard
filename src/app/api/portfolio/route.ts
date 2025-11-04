import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DHAN_API_BASE = "https://api.dhan.co";

interface DhanHolding {
  exchange?: string;
  tradingSymbol?: string;
  securityId?: string;
  isin?: string;
  totalQty?: number;
  dpQty?: number;
  t1Qty?: number;
  availableQty?: number;
  collateralQty?: number;
  avgCostPrice?: number;
  lastTradedPrice?: number;
  SecurityId?: string;
  symbol?: string;
  Symbol?: string;
  quantity?: number;
  Quantity?: number;
  qty?: number;
  averagePrice?: number;
  AveragePrice?: number;
  avgPrice?: number;
  LastTradedPrice?: number;
  ltp?: number;
  currentPrice?: number;
  pnl?: number;
  PnL?: number;
  investedAmount?: number;
  currentValue?: number;
}

async function fetchDhanHoldings(): Promise<DhanHolding[]> {
  const token = process.env.DHAN_ACCESS_TOKEN;
  if (!token) {
    console.error("[Dhan API] DHAN_ACCESS_TOKEN not configured");
    throw new Error("DHAN_ACCESS_TOKEN not configured");
  }

  const endpoints = [
    { url: `${DHAN_API_BASE}/v2/portfolio`, headers: { "Access-Token": token } },
    { url: `${DHAN_API_BASE}/v2/holdings`, headers: { "Access-Token": token } },
    { url: `${DHAN_API_BASE}/portfolio`, headers: { "Access-Token": token } },
    { url: `${DHAN_API_BASE}/holdings`, headers: { Authorization: `Bearer ${token}` } },
  ];

  for (const { url, headers } of endpoints) {
    try {
      console.log(`[Dhan API] Trying endpoint: ${url}`);
      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      Object.entries(headers).forEach(([key, value]) => {
        if (value) requestHeaders[key] = value;
      });
      const response = await fetch(url, {
        method: "GET",
        headers: requestHeaders,
        cache: "no-store",
      });

      const responseText = await response.text();
      console.log(`[Dhan API] Response status: ${response.status}, URL: ${url}`);
      
      if (!response.ok) {
        console.error(`[Dhan API] Error response: ${responseText}`);
        continue;
      }

      const data = JSON.parse(responseText);
      console.log(`[Dhan API] Success! Data keys:`, Object.keys(data));

      let holdings: DhanHolding[] = [];
      if (Array.isArray(data)) holdings = data;
      else if (data.holdings && Array.isArray(data.holdings)) holdings = data.holdings;
      else if (data.data && Array.isArray(data.data)) holdings = data.data;
      else if (data.data?.holdings && Array.isArray(data.data.holdings)) holdings = data.data.holdings;
      else {
        const numericKeys = Object.keys(data).filter(k => /^\d+$/.test(k));
        if (numericKeys.length > 0)
          holdings = numericKeys.map(k => data[k]).filter(i => i && typeof i === "object");
      }

      holdings = holdings.filter(h => {
        if (!h || typeof h !== "object") return false;
        const symbol = h.tradingSymbol || h.symbol || h.securityId || h.SecurityId;
        const quantity = h.totalQty || h.quantity || h.Quantity || h.qty || h.availableQty;
        const avgPrice = h.avgCostPrice || h.averagePrice || h.AveragePrice || h.avgPrice;
        return symbol && typeof quantity === "number" && typeof avgPrice === "number";
      });

      if (holdings.length > 0) {
        console.log(`[Dhan API] Found ${holdings.length} valid holdings`);
        return holdings;
      }
    } catch (error) {
      console.error(`[Dhan API] Fetch error for ${url}:`, error);
      continue;
    }
  }

  throw new Error("All Dhan API endpoints failed - check server logs for details");
}

async function fetchLiveQuotes(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};

  const token = process.env.DHAN_ACCESS_TOKEN;
  if (!token) {
    console.warn("[Dhan Quotes] No access token");
    return {};
  }

  try {
    console.log(`[Dhan Quotes] Fetching quotes for ${symbols.length} symbols:`, symbols);
    const quotePromises = symbols.map(async (symbol) => {
      const endpoints = [
        `${DHAN_API_BASE}/v2/quote/${symbol}`,
        `${DHAN_API_BASE}/v2/quotes?symbol=${symbol}`,
        `${DHAN_API_BASE}/quote/${symbol}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              "Access-Token": token,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          });

          if (response.ok) {
            const data = await response.json();
            const price = data.lastPrice || data.ltp || data.price || data.close || data.ltpPrice || 0;
            if (price > 0) return { symbol, price };
          }
        } catch {
          continue;
        }
      }
      return { symbol, price: 0 };
    });

    const results = await Promise.all(quotePromises);
    return Object.fromEntries(results.map((r) => [r.symbol, r.price]));
  } catch (error) {
    console.error("[Dhan Quotes] Error:", error);
    return {};
  }
}

export async function GET() {
  console.log("[Portfolio API] Request received");
  
  const token = process.env.DHAN_ACCESS_TOKEN;
  if (!token) {
    console.warn("[Portfolio API] No DHAN_ACCESS_TOKEN, returning mock data");
  } else {
    try {
      const holdings = await fetchDhanHoldings();
      console.log(`[Portfolio API] Fetched ${holdings.length} holdings`);
      
      const allHavePrices = holdings.every(h => h.lastTradedPrice && h.lastTradedPrice > 0);
      let quotes: Record<string, number> = {};

      if (!allHavePrices) {
        const symbols = [...new Set(
          holdings
            .filter(h => !h.lastTradedPrice || h.lastTradedPrice <= 0)
            .map(h => h.tradingSymbol || h.symbol || h.securityId || h.SecurityId || "")
            .filter(Boolean)
        )];
        if (symbols.length > 0) quotes = await fetchLiveQuotes(symbols);
      }

      const positions = holdings.map(h => {
        const symbol = h.tradingSymbol || h.symbol || h.securityId || h.SecurityId || "";
        const qty = h.totalQty || h.quantity || h.Quantity || h.qty || h.availableQty || 0;
        const avgPrice = h.avgCostPrice || h.averagePrice || h.AveragePrice || h.avgPrice || 0;
        const lastPrice =
          h.lastTradedPrice ||
          quotes[symbol] ||
          h.LastTradedPrice ||
          h.ltp ||
          h.currentPrice ||
          avgPrice;
        const pnl = (lastPrice - avgPrice) * qty;

        return { symbol, qty, avgPrice, lastPrice, pnl };
      });

      const equity = positions.reduce((sum, p) => sum + p.lastPrice * p.qty, 0);

      let cash = 0;
      try {
        const fundUrl = `${DHAN_API_BASE}/v2/fundlimit`;
        console.log(`[Portfolio API] Fetching cash from ${fundUrl}`);

        const fundResponse = await fetch(fundUrl, {
          method: "GET",
          headers: {
            "access-token": token, // lowercase as per Dhan docs
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        const fundText = await fundResponse.text();
        console.log(`[Portfolio API] Cash response status: ${fundResponse.status}`);

        if (fundResponse.ok) {
          const fundData = JSON.parse(fundText);
          console.log(`[Portfolio API] Fundlimit data:`, fundData);

          cash =
            (typeof fundData.withdrawableBalance === "number" && fundData.withdrawableBalance > 0
              ? fundData.withdrawableBalance
              : 0) ||
            (typeof fundData.availabelBalance === "number" && fundData.availabelBalance > 0
              ? fundData.availabelBalance
              : 0) ||
            (typeof fundData.availableBalance === "number" && fundData.availableBalance > 0
              ? fundData.availableBalance
              : 0);

          console.log(`[Portfolio API] Found cash balance: ${cash}`);
        } else {
          console.error(`[Portfolio API] Fundlimit API error: ${fundText}`);
        }
      } catch (err) {
        console.error(`[Portfolio API] Cash fetch failed:`, err);
      }

      return NextResponse.json({
        cash,
        equity: equity + cash,
        positions,
        source: "dhan",
      });
    } catch (error) {
      console.error("[Portfolio API] Dhan API error:", error);
    }
  }

  // 🧩 Fallback mock data
  console.log("[Portfolio API] Returning mock data");
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
    source: "mock",
    message: "Using mock data - check server logs for Dhan API errors",
  });
}
