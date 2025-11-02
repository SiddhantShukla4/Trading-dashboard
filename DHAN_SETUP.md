# Dhan API Integration Setup

## Environment Variable Setup

Create a `.env.local` file in the root of your project with your Dhan access token:

```bash
DHAN_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzYyMTU5NDk5LCJpYXQiOjE3NjIwNzMwOTksInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAwNjQxOTIwIn0.QxVFEufS7Aj-hyeUhTSwpd7CbhVY2A95TRXfRLqtV5mmUe7FXlJ_A656b36og4BCb_YaNaWx8tIcooQuyww-8A
```

## Features

- **Real-time Portfolio Data**: Fetches live holdings from your Dhan account
- **Live Price Updates**: Polls every 1 second for real-time stock prices
- **P&L Calculation**: Automatically calculates profit/loss for each position
- **INR Currency Format**: Displays all amounts in Indian Rupees

## API Endpoints Used

The integration tries multiple Dhan API endpoints:

1. Portfolio/Holdings:
   - `/v2/portfolio`
   - `/portfolio`
   - `/holdings`

2. Live Quotes:
   - `/v2/quote/{symbol}`
   - `/quote/{symbol}`

3. Margin/Cash:
   - `/v2/margin`

## How It Works

1. The portfolio page polls `/api/portfolio` every 1 second
2. The API route checks for `DHAN_ACCESS_TOKEN` environment variable
3. If found, it fetches your real holdings from Dhan API
4. Fetches live quotes for all symbols in your portfolio
5. Calculates P&L and returns formatted data
6. Falls back to mock data if token is not configured or API fails

## Rate Limits

Be aware of Dhan's API rate limits:
- Non-Trading APIs: Up to 20 requests per second
- Data APIs: Up to 10 requests per second
- Quote APIs: 1 request per second

The current implementation polls every 1 second, which is within limits.

## Troubleshooting

If you're seeing mock data instead of real data:
1. Check that `.env.local` exists and contains `DHAN_ACCESS_TOKEN`
2. Restart the Next.js dev server after adding the env variable
3. Check the browser console and server logs for API errors
4. Verify your access token hasn't expired

