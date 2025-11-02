# Troubleshooting Real-Time Dhan Data

## Quick Fixes

### 1. Create `.env.local` file

Create a file named `.env.local` in the root directory (`trading-dashboard/`) with:

```
DHAN_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJkaGFuIiwicGFydG5lcklkIjoiIiwiZXhwIjoxNzYyMTU5NDk5LCJpYXQiOjE3NjIwNzMwOTksInRva2VuQ29uc3VtZXJUeXBlIjoiU0VMRiIsIndlYmhvb2tVcmwiOiIiLCJkaGFuQ2xpZW50SWQiOiIxMTAwNjQxOTIwIn0.QxVFEufS7Aj-hyeUhTSwpd7CbhVY2A95TRXfRLqtV5mmUe7FXlJ_A656b36og4BCb_YaNaWx8tIcooQuyww-8A
```

### 2. Restart the Dev Server

After creating `.env.local`, **restart your Next.js dev server**:
- Stop the server (Ctrl+C)
- Run `npm run dev` again

## Debugging Steps

### Check Browser Console
Open browser DevTools (F12) and check the Console tab. You should see:
- `✅ Real Dhan data loaded` - if working correctly
- `⚠️ Using mock data` - if API calls are failing

### Check Server Logs
Look at your terminal where `npm run dev` is running. You'll see detailed logs:
- `[Portfolio API]` - API request logs
- `[Dhan API]` - Holdings API calls
- `[Dhan Quotes]` - Quote API calls

### Common Issues

#### Issue: "Using mock data" message
**Possible causes:**
1. `.env.local` file doesn't exist
2. Token expired (tokens are valid for limited time)
3. Wrong API endpoints
4. Network/CORS issues

**Solution:**
- Verify `.env.local` exists and has the token
- Check server logs for specific error messages
- Regenerate token from Dhan Web dashboard if expired

#### Issue: "No holdings found"
**Possible causes:**
1. You have no positions in your Dhan account
2. API endpoint returning empty array
3. Different response format

**Solution:**
- Check your Dhan account to see if you have holdings
- Look at server logs to see what the API actually returned

#### Issue: Prices showing as 0 or not updating
**Possible causes:**
1. Quote API endpoints not working
2. Rate limiting (1 quote per second)
3. Symbol format mismatch (e.g., "RELIANCE" vs "RELIANCE-EQ")

**Solution:**
- Check server logs for quote API errors
- Verify symbol names match Dhan's format
- Reduce polling frequency if hitting rate limits

## Real-Time Data Requirements

**Note:** For truly real-time data (WebSocket feed), you need:
1. DhanHQ Data API subscription (₹499/month)
2. WebSocket connection to `wss://api-feed.dhan.co`

Current implementation uses REST API polling (every 1 second), which:
- ✅ Gets current prices
- ✅ Updates frequently
- ❌ Not true real-time (1-second delay)
- ❌ Subject to API rate limits

## API Endpoints Being Tried

The code tries these endpoints in order:

**Holdings:**
- `https://api.dhan.co/v2/portfolio`
- `https://api.dhan.co/v2/holdings`
- `https://api.dhan.co/portfolio`
- `https://api.dhan.co/holdings`

**Quotes:**
- `https://api.dhan.co/v2/quote/{symbol}`
- `https://api.dhan.co/v2/quotes?symbol={symbol}`
- `https://api.dhan.co/quote/{symbol}`

**Margin:**
- `https://api.dhan.co/v2/margin`

If one fails, it automatically tries the next one.

## Need More Help?

1. Check server logs - they show exactly what's happening
2. Check browser console - shows client-side issues
3. Verify token is not expired
4. Check Dhan API documentation: https://docs.dhanhq.co

