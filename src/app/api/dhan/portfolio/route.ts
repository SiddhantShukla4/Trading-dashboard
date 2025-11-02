import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DHAN_API_BASE = "https://api.dhan.co";

interface DhanHolding {
  securityId: string;
  symbol: string;
  exchangeSegment: string;
  quantity: number;
  averagePrice: number;
  lastTradedPrice?: number;
  pnl?: number;
  investedAmount?: number;
  currentValue?: number;
}

interface DhanPortfolioResponse {
  holdings?: DhanHolding[];
  data?: {
    holdings?: DhanHolding[];
  };
  availableMargin?: number;
  usedMargin?: number;
  totalMargin?: number;
}

async function fetchDhanHoldings(): Promise<DhanHolding[]> {
  const token = process.env.DHAN_ACCESS_TOKEN;
  if (!token) {
    throw new Error("DHAN_ACCESS_TOKEN not configured");
  }

  try {
    // Try portfolio/holdings endpoint
    const response = await fetch(`${DHAN_API_BASE}/v2/portfolio`, {
      method: "GET",
      headers: {
        "Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Try alternative endpoint
      const altResponse = await fetch(`${DHAN_API_BASE}/holdings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!altResponse.ok) {
        throw new Error(`Dhan API error: ${altResponse.status}`);
      }

      const altData = await altResponse.json();
      return altData.holdings || altData.data || [];
    }

    const data: DhanPortfolioResponse = await response.json();
    return data.holdings || data.data?.holdings || [];
  } catch (error) {
    console.error("Error fetching Dhan holdings:", error);
    throw error;
  }
}

async function fetchLiveQuotes(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};

  const token = process.env.DHAN_ACCESS_TOKEN;
  if (!token) return {};

  try {
    // Fetch quotes for all symbols
    const quotePromises = symbols.map(async (symbol) => {
      try {
        // Try quote endpoint - format may vary
        const response = await fetch(`${DHAN_API_BASE}/v2/quote/${symbol}`, {
          method: "GET",
          headers: {
            "Access-Token": token,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          return { symbol, price: data.lastPrice || data.ltp || data.price || 0 };
        }
      } catch {
        // Continue with other symbols
      }
      return { symbol, price: 0 };
    });

    const results = await Promise.all(quotePromises);
    return Object.fromEntries(results.map((r) => [r.symbol, r.price]));
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return {};
  }
}

export async function GET() {
  try {
    const holdings = await fetchDhanHoldings();

    // Extract unique symbols for quote fetching
    const symbols = [...new Set(holdings.map((h) => h.symbol))];
    
    // Fetch live prices
    const quotes = await fetchLiveQuotes(symbols);

    // Transform to our format
    const positions = holdings.map((holding) => {
      const lastPrice = quotes[holding.symbol] || holding.lastTradedPrice || holding.averagePrice;
      const pnl = (lastPrice - holding.averagePrice) * holding.quantity;

      return {
        symbol: holding.symbol,
        qty: holding.quantity,
        avgPrice: holding.averagePrice,
        lastPrice,
        pnl,
      };
    });

    // Calculate total equity (sum of current positions + cash)
    const equity = positions.reduce((sum, p) => sum + p.lastPrice * p.qty, 0);
    
    // Try to get cash/margin info
    const token = process.env.DHAN_ACCESS_TOKEN;
    let cash = 0;
    
    try {
      const marginResponse = await fetch(`${DHAN_API_BASE}/v2/margin`, {
        method: "GET",
        headers: {
          "Access-Token": token!,
          "Content-Type": "application/json",
        },
      });

      if (marginResponse.ok) {
        const marginData = await marginResponse.json();
        cash = marginData.availableMargin || marginData.cash || 0;
      }
    } catch {
      // Use equity as fallback for cash estimation
      cash = equity * 0.1; // Rough estimate
    }

    return NextResponse.json({
      cash,
      equity: equity + cash,
      positions,
    });
  } catch (error) {
    console.error("Portfolio API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch portfolio";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

