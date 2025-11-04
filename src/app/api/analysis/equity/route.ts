import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

let equityHistory: { t: number; equity: number }[] = [];

async function fetchRealEquity(): Promise<number | null> {
  try {
    const { GET: getPortfolio } = await import("../../portfolio/route");
    const response = await getPortfolio();
    const data = await response.json();
    
    if (data.equity && typeof data.equity === 'number') {
      return data.equity;
    }
  } catch (error) {
    console.error("[Equity API] Error fetching portfolio:", error);
  }
  return null;
}

function updateEquitySeries(currentEquity: number) {
  const now = Date.now();
  
  if (equityHistory.length === 0) {
    equityHistory = [{ t: now, equity: currentEquity }];
    return;
  }

  const lastPoint = equityHistory[equityHistory.length - 1];
  const timeDiff = now - lastPoint.t;
  const equityDiff = Math.abs(currentEquity - lastPoint.equity);

  if (equityDiff > (lastPoint.equity * 0.001) || timeDiff >= 5000) {
    equityHistory.push({ t: now, equity: currentEquity });
    
    if (equityHistory.length > 600) {
      equityHistory.shift();
    }
  }
}

export async function GET() {

  const realEquity = await fetchRealEquity();
  
  if (realEquity !== null) {
    updateEquitySeries(realEquity);
    
    if (equityHistory.length > 0) {
      console.log(`[Equity API] Returning ${equityHistory.length} points, latest equity: ${realEquity}`);
      return NextResponse.json(equityHistory);
    }
  }

  // Fallback: Generate mock data if no real data available yet
  const now = Date.now();
  if (equityHistory.length === 0) {
    // Create a simple baseline starting from a reasonable value
    const baseEquity = realEquity || 10000;
    equityHistory = Array.from({ length: 60 }, (_, i) => ({
      t: now - (60 - i) * 1000,
      equity: baseEquity,
    }));
    console.log("[Equity API] Using fallback data");
  }

  return NextResponse.json(equityHistory);
}




