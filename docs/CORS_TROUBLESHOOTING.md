# CORS Troubleshooting Guide

If you're only seeing **OPTIONS requests** reaching your backend (and no POST), this guide will help.

## What's Happening?

1. Browser fires event
2. Event is queued in demo app (you see it in the event log ✓)
3. Flush happens (automatically or manual)
4. Browser sends **OPTIONS preflight request** to your backend
5. Backend responds (or doesn't)
6. Browser should then send **POST request** with the actual event data
7. **But**: If CORS headers are wrong, POST never happens ❌

## How to Debug

### Step 1: Open DevTools Network Tab

```
1. Press F12 (or Cmd+Option+I on Mac)
2. Click "Network" tab
3. Fire an event in the demo app
4. Look for requests to your backend URL
```

### Step 2: Inspect the OPTIONS Request

Click on the OPTIONS request and check:

**Request Headers:**
```
Request URL: https://beeceptor.com/api/analytics
Request Method: OPTIONS
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type
```

**Response Headers (the critical part):**
```
Access-Control-Allow-Origin: <your-frontend-url>
Access-Control-Allow-Methods: POST, OPTIONS, GET
Access-Control-Allow-Headers: Content-Type
```

If these headers are **missing**, the POST won't happen.

## Solutions by Backend Type

### Option 1: Local Backend (Node.js + Express)

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for analytics endpoint
app.use(cors({
  origin: 'http://localhost:5173', // Your demo app URL
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

app.post('/api/analytics', (req, res) => {
  console.log('Events received:', req.body.events.length);
  res.json({ success: true });
});

app.listen(3000);
```

**Use in demo app:**
```
Backend URL: http://localhost:3000/api/analytics
Instance ID: demo-app-001
API Key: test-key-12345
```

### Option 2: Beeceptor

Beeceptor has CORS enabled by default, but:

1. **Check the actual request**
   - Does your Beeceptor URL show OPTIONS requests?
   - If yes, check the response headers in Beeceptor dashboard

2. **Beeceptor CORS headers**
   - Beeceptor should automatically send CORS headers
   - If not, you may need to use Beeceptor's rules feature

3. **Verify the URL format**
   - Make sure you're using the exact URL (with protocol, no trailing slash)
   - Example: `https://your-endpoint.free.beeceptor.com/api/analytics`

### Option 3: Any Backend (Generic Fix)

If you control the backend, add CORS middleware before the analytics route:

**Express:**
```javascript
app.post('/api/analytics', (req, res) => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  // Handle actual POST
  console.log('Events:', req.body.events);
  res.json({ success: true });
});
```

**Node.js (no framework):**
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.writeHead(200).end();
  }

  if (req.method === 'POST' && req.url === '/api/analytics') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('Events:', JSON.parse(body));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  }
});

server.listen(3000);
```

## Testing Checklist

- [ ] Open DevTools (F12)
- [ ] Go to Network tab
- [ ] Filter for your backend URL
- [ ] Fire an event in demo app
- [ ] See OPTIONS request? ✓
- [ ] See POST request? ✓ (if not, CORS is blocked)
- [ ] POST has status 200-299? ✓
- [ ] Event appears in backend logs? ✓

## Common Issues & Fixes

### "Only OPTIONS requests reach backend"

**Cause:** CORS headers missing in OPTIONS response

**Fix:** Add these response headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### "Got 403 or 401 error"

**Cause:** Authentication/authorization issue

**Fix:** 
- Check your API key in demo app matches backend expectation
- Verify Beeceptor doesn't have IP restrictions
- Check firewall/security settings

### "Event log shows events but backend gets nothing"

**Cause:** Events are queued but not flushed

**Fix:**
- Wait 3 seconds (auto-flush interval)
- Or click "Manual Flush" button
- Check DevTools Network tab during flush

### "Beeceptor shows no requests"

**Cause 1:** Wrong URL
- Verify exact Beeceptor endpoint URL
- No trailing slash
- Check spelling

**Cause 2:** Content-Type header issue
- The package now retries without Content-Type if first attempt fails
- Check browser console (F12) for debug logs

**Cause 3:** Browser blocked request
- Check DevTools Console for errors
- CORS errors show as red text

## Advanced Debugging

### Check Browser Console Logs

The package logs debug info:

```javascript
// Open DevTools Console (F12)
// You should see messages like:

// ✓ "[peekaboo-events] sendBeacon succeeded"
// or
// "[peekaboo-events] sendBeacon failed, falling back to fetch"
// or  
// "[peekaboo-events] fetch failed: CORS error"
```

### Capture Network Waterfall

1. Open DevTools → Network
2. Check "Preserve log"
3. Fire event
4. Look at waterfall timing

```
OPTIONS request (preflight) ---- [wait for response]
  ├─ Status: 200 ✓
  ├─ Access-Control-Allow-Origin: * ✓
  └─ Access-Control-Allow-Methods: POST ✓
        ↓
POST request (actual data) ---- [should happen immediately after]
  ├─ Status: 200 ✓
  └─ Response: {success: true} ✓
```

## Quick Fix: Use Local Backend (Recommended)

For testing, the simplest solution is to use the simple backend that handles CORS correctly:

```bash
# Terminal 1
node examples/simple-backend.js

# Terminal 2 (demo app)
npm run demo
```

Then in demo app:
```
Backend URL: http://localhost:3000/api/analytics
Instance ID: demo-app-001
API Key: test-key-12345
```

✅ This backend:
- Handles CORS correctly for localhost
- Echoes back the exact origin (required for local development)
- No external dependencies required
- No CORS preflight issues!

## Still Not Working?

1. Check DevTools Console for errors (F12)
2. Check DevTools Network tab for OPTIONS/POST requests
3. Look at response headers for CORS headers
4. Compare with examples in this guide
5. Try local backend to confirm system works
6. Check backend logs to see if ANY request arrives

## References

- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [CORS Explained](https://www.codecademy.com/articles/what-is-cors)
- Browser DevTools: F12 → Network tab
