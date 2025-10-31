# Trading Dashboard (Next.js)

A Next.js App Router site for viewing live portfolio and strategy analysis for an algorithmic trading platform.

## Getting Started

```bash
npm run dev
```

Open `http://localhost:3000`.

- Live Portfolio: `/portfolio`
- Analysis: `/analysis`

## Realtime Integration

Set a websocket endpoint to push live portfolio ticks:

- Env: `NEXT_PUBLIC_WS_URL` (e.g. `wss://your-broker-stream.example/ws`)
- Message format (example):

```json
{
  "cash": 10000,
  "equity": 112345,
  "positions": [
    { "symbol": "AAPL", "qty": 10, "avgPrice": 187.5, "lastPrice": 189.1, "pnl": 16.0 }
  ]
}
```

If `NEXT_PUBLIC_WS_URL` is not set, the app will poll mock endpoints under `/api`.

## Mock Endpoints

- GET /api/portfolio — snapshot of positions, equity, cash
- GET /api/analysis/equity — rolling equity series for the chart

## Project Structure

- src/app — App Router routes
- src/app/portfolio — Live portfolio page
- src/app/analysis — Charts/metrics page
- src/app/api — Mock API handlers

## Tech

- Next.js (App Router, TypeScript)
- Tailwind CSS
- Zustand for client state
- SWR for data fetching
- Recharts for charts
- date-fns for formatting

## Notes

Replace mocks with your real broker/exchange APIs. Keep sensitive keys server-side; never expose creds via `NEXT_PUBLIC_*`.
