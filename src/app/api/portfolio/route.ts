import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DHAN_API_BASE = "https://api.dhan.co";

interface DhanHolding {
  // Dhan API actual field names
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
  // Alternative field names for compatibility
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

  // Try portfolio/holdings endpoint - multiple variations
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
      // Add auth header (either Access-Token or Authorization)
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

      try {
        const data = JSON.parse(responseText);
        console.log(`[Dhan API] Success! Data keys:`, Object.keys(data));
        console.log(`[Dhan API] Data type:`, Array.isArray(data) ? 'array' : typeof data);
        console.log(`[Dhan API] Full response:`, JSON.stringify(data).substring(0, 500));
        
        // Handle different response formats
        let holdings: DhanHolding[] = [];
        
        if (Array.isArray(data)) {
          // Response is directly an array
          holdings = data;
          console.log(`[Dhan API] Response is array with ${holdings.length} items`);
        } else if (data.holdings && Array.isArray(data.holdings)) {
          // Standard format: { holdings: [...] }
          holdings = data.holdings;
        } else if (data.data && Array.isArray(data.data)) {
          // Nested format: { data: [...] }
          holdings = data.data;
        } else if (data.data && data.data.holdings && Array.isArray(data.data.holdings)) {
          // Deep nested: { data: { holdings: [...] } }
          holdings = data.data.holdings;
        } else {
          // Check if it's an object with numeric string keys (like { '0': {...}, '1': {...} })
          const numericKeys = Object.keys(data).filter(k => /^\d+$/.test(k));
          if (numericKeys.length > 0) {
            holdings = numericKeys.map(key => data[key]).filter(item => item && typeof item === 'object');
            console.log(`[Dhan API] Found ${holdings.length} holdings in numeric keys format`);
          }
        }
        
        // Validate holdings structure - check for various field name formats
        holdings = holdings.filter(h => {
          if (!h || typeof h !== 'object') return false;
          // Check for Dhan API format (tradingSymbol + totalQty + avgCostPrice)
          const symbol = h.tradingSymbol || h.symbol || h.securityId || h.SecurityId;
          const quantity = h.totalQty || h.quantity || h.Quantity || h.qty || h.availableQty;
          const avgPrice = h.avgCostPrice || h.averagePrice || h.AveragePrice || h.avgPrice;
          return symbol && 
                 (typeof quantity === 'number') && 
                 (typeof avgPrice === 'number');
        });
        
        if (holdings.length > 0) {
          console.log(`[Dhan API] Found ${holdings.length} valid holdings`);
          console.log(`[Dhan API] First holding:`, JSON.stringify(holdings[0]));
          return holdings;
        } else {
          console.log(`[Dhan API] No valid holdings found after parsing`);
          console.log(`[Dhan API] Raw data structure:`, JSON.stringify(data).substring(0, 1000));
          return [];
        }
      } catch (parseError) {
        console.error(`[Dhan API] JSON parse error:`, parseError);
        console.error(`[Dhan API] Response text:`, responseText);
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
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
            if (price > 0) {
              console.log(`[Dhan Quotes] ${symbol}: ${price}`);
              return { symbol, price };
            }
          } else {
            const errorText = await response.text();
            console.warn(`[Dhan Quotes] Failed for ${symbol} at ${endpoint}: ${response.status} - ${errorText}`);
          }
        } catch {
          continue;
        }
      }
      console.warn(`[Dhan Quotes] No price found for ${symbol}`);
      return { symbol, price: 0 };
    });

    const results = await Promise.all(quotePromises);
    const quotes = Object.fromEntries(results.map((r) => [r.symbol, r.price]));
    console.log(`[Dhan Quotes] Fetched ${Object.keys(quotes).filter(k => quotes[k] > 0).length} quotes`);
    return quotes;
  } catch (error) {
    console.error("[Dhan Quotes] Error:", error);
    return {};
  }
}

// Direct Dhan API integration - falls back to mock if token not configured
export async function GET() {
  console.log("[Portfolio API] Request received");
  
  // Check if Dhan token is configured
  const token = process.env.DHAN_ACCESS_TOKEN;
  if (!token) {
    console.warn("[Portfolio API] No DHAN_ACCESS_TOKEN, returning mock data");
  } else {
    console.log("[Portfolio API] DHAN_ACCESS_TOKEN found, attempting real API call");
    
    try {
      const holdings = await fetchDhanHoldings();
      console.log(`[Portfolio API] Fetched ${holdings.length} holdings`);
      
      if (holdings.length === 0) {
        return NextResponse.json({
          cash: 0,
          equity: 0,
          positions: [],
          message: "No holdings found in your Dhan account",
        });
      }

      // Check if all holdings have lastTradedPrice (skip quote API if so)
      const allHavePrices = holdings.every(h => h.lastTradedPrice && h.lastTradedPrice > 0);
      
      let quotes: Record<string, number> = {};
      
      if (!allHavePrices) {
        // Only fetch quotes if some holdings are missing prices
        const symbolsNeedingQuotes = [...new Set(holdings
          .filter(h => !h.lastTradedPrice || h.lastTradedPrice <= 0)
          .map((h) => h.tradingSymbol || h.symbol || h.securityId || h.SecurityId || '')
          .filter(s => s))];
        
        if (symbolsNeedingQuotes.length > 0) {
          console.log(`[Portfolio API] Some holdings missing prices, fetching quotes for:`, symbolsNeedingQuotes);
          quotes = await fetchLiveQuotes(symbolsNeedingQuotes);
        } else {
          console.log(`[Portfolio API] All holdings have lastTradedPrice, skipping quote API`);
        }
      } else {
        console.log(`[Portfolio API] All holdings have lastTradedPrice, skipping quote API`);
      }

      const positions = holdings.map((holding) => {
        // Use Dhan API actual field names first, then fallbacks
        const symbol = holding.tradingSymbol || holding.symbol || holding.securityId || holding.SecurityId || '';
        const quantity = holding.totalQty || holding.quantity || holding.Quantity || holding.qty || holding.availableQty || 0;
        const avgPrice = holding.avgCostPrice || holding.averagePrice || holding.AveragePrice || holding.avgPrice || 0;
        
        // Prefer lastTradedPrice from holdings (already available!), then quotes, then avgPrice
        const lastPrice = holding.lastTradedPrice || 
                         quotes[symbol] || 
                         quotes[holding.securityId || ''] ||
                         holding.LastTradedPrice || 
                         holding.ltp || 
                         holding.currentPrice ||
                         avgPrice;
        
        const pnl = (lastPrice - avgPrice) * quantity;

        console.log(`[Portfolio API] Position: ${symbol} - Qty: ${quantity}, Avg: ${avgPrice}, Last: ${lastPrice}, PnL: ${pnl}`);

        return {
          symbol,
          qty: quantity,
          avgPrice,
          lastPrice,
          pnl,
        };
      });

      const equity = positions.reduce((sum, p) => sum + p.lastPrice * p.qty, 0);
      let cash = 0;
      
      // Try multiple endpoints to get cash/margin/balance
      const cashEndpoints = [
        `${DHAN_API_BASE}/v2/limits`,
        `${DHAN_API_BASE}/v2/user/fund`,
        `${DHAN_API_BASE}/v2/user/balance`,
        `${DHAN_API_BASE}/v2/user/margin`,
        `${DHAN_API_BASE}/v2/funds`,
        `${DHAN_API_BASE}/v2/margin`,
        `${DHAN_API_BASE}/v2/balance`,
        `${DHAN_API_BASE}/v2/fund`,
        `${DHAN_API_BASE}/limits`,
        `${DHAN_API_BASE}/funds`,
        `${DHAN_API_BASE}/margin`,
        `${DHAN_API_BASE}/balance`,
        `${DHAN_API_BASE}/fund`,
        `${DHAN_API_BASE}/v2/account`,
        `${DHAN_API_BASE}/account`,
      ];

      for (const endpoint of cashEndpoints) {
        try {
          const marginResponse = await fetch(endpoint, {
            method: "GET",
            headers: {
              "Access-Token": token,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          });

          if (marginResponse.ok) {
            const marginData = await marginResponse.json();
            console.log(`[Portfolio API] Cash API success (${endpoint}):`, JSON.stringify(marginData).substring(0, 500));
            
            // Try various field names for available cash/margin (including nested paths)
            const extractCash = (obj: unknown): number => {
              if (!obj || typeof obj !== 'object') return 0;
              
              // Type guard for Record<string, unknown>
              const record = obj as Record<string, unknown>;
              
              // Direct fields - check if property exists and is a number
              const getNumericField = (key: string): number => {
                const val = record[key];
                return (typeof val === 'number' && val > 0) ? val : 0;
              };
              
              const direct = getNumericField('availableMargin') || 
                            getNumericField('available') || 
                            getNumericField('netAvailable') ||
                            getNumericField('cash') || 
                            getNumericField('cashBalance') ||
                            getNumericField('availableBalance') ||
                            getNumericField('freeCash') ||
                            getNumericField('fundBalance') ||
                            getNumericField('balance') ||
                            getNumericField('availableFunds') ||
                            getNumericField('netCash') ||
                            getNumericField('usableMargin') ||
                            getNumericField('availableMarginAmount') ||
                            getNumericField('freeMargin') ||
                            getNumericField('limit') ||
                            0;
              
              if (direct > 0) return direct;
              
              // Nested paths
              if (record.data) return extractCash(record.data);
              if (record.result) return extractCash(record.result);
              if (record.funds) return extractCash(record.funds);
              if (record.margin) return extractCash(record.margin);
              
              // Array with first element
              if (Array.isArray(obj) && obj.length > 0) {
                return extractCash(obj[0]);
              }
              
              return 0;
            };
            
            cash = extractCash(marginData);
            
            if (cash > 0) {
              console.log(`[Portfolio API] Found cash: ${cash} from ${endpoint}`);
              break; // Found it, stop trying other endpoints
            }
          } else {
            const errorText = await marginResponse.text();
            console.log(`[Portfolio API] Cash endpoint ${endpoint} failed: ${marginResponse.status} - ${errorText.substring(0, 100)}`);
          }
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          console.log(`[Portfolio API] Cash endpoint ${endpoint} error: ${error}`);
          continue;
        }
      }

      if (cash === 0) {
        console.warn("[Portfolio API] Could not fetch cash from any endpoint, showing 0");
      }

      console.log(`[Portfolio API] Returning real data: ${positions.length} positions`);
      return NextResponse.json({
        cash,
        equity: equity + cash,
        positions,
        source: "dhan",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[Portfolio API] Dhan API error, falling back to mock:", message);
      // Don't return error, fall through to mock data
    }
  }

  // Fallback: Mock portfolio snapshot
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




