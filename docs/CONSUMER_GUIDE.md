# Consumer Guide - How to Use Peekaboo Events

A complete guide for anyone who wants to use peekaboo-events in their application.

## 📦 Installation

```bash
npm install peekaboo-events
```

## 🚀 Quick Start (5 minutes)

### Step 1: Initialize in Your App

```typescript
import { initAnalytics } from 'peekaboo-events';

// Call this ONCE at app startup
initAnalytics({
  trackingUrl: 'https://your-backend.com/api/analytics',
  instanceId: 'my-app',
  sessionProperties: {
    userId: 'user-123',           // Include user identifiers
    sessionKey: 'session-abc',    // Include session tokens
    environment: 'production',    // Include context
  },
  defaultProperties: {
    appVersion: '1.0.0',
  },
});
```

### Step 2: Track Events in Components

```typescript
import { useAnalytics } from 'peekaboo-events';

function MyComponent() {
  const { trackEvent } = useAnalytics('MyComponent');

  return (
    <button
      onClick={() => {
        trackEvent({ event: 'button_clicked' });
        // Your business logic...
      }}
    >
      Click Me
    </button>
  );
}
```

### Step 3: Implement Backend Validation

```javascript
// Your backend - validate the request
app.post('/api/analytics', (req, res) => {
  const { events } = req.body;
  
  // Validate session data
  const sessionKey = events[0]?.properties?.sessionKey;
  if (!isValidSession(sessionKey)) {
    return res.status(401).end();
  }

  // Save events
  saveEvents(events);
  res.json({ success: true });
});
```

**Done!** Events are now flowing to your backend. 🎉

---

## 📚 Documentation by Use Case

| I Want To... | Read This |
|---|---|
| **Try it locally** | [DEMO_SETUP.md](./DEMO_SETUP.md) |
| **Integrate into my app** | [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) |
| **Set up authentication** | [AUTHENTICATION.md](./AUTHENTICATION.md) ⭐ |
| **Understand the architecture** | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **Implement security best practices** | [SECURITY.md](./SECURITY.md) |
| **Debug issues** | [CORS_TROUBLESHOOTING.md](./CORS_TROUBLESHOOTING.md) |
| **See auth examples** | `examples/auth-examples.js` and `examples/auth-frontend-examples.tsx` |

---

## 🔐 Authentication (Most Important!)

**Key Point:** The package does NOT handle authentication. Your backend does.

### Simple Approach: Use Session Properties

**Frontend:**
```typescript
initAnalytics({
  trackingUrl: 'https://your-backend.com/api/analytics',
  instanceId: 'my-app',
  sessionProperties: {
    userId: 'user-123',
    sessionToken: 'token-abc',    // ← Include your auth token
  },
});
```

**Backend:**
```javascript
app.post('/api/analytics', (req, res) => {
  const token = req.body.events[0]?.properties?.sessionToken;
  
  if (!isValidToken(token)) {
    return res.status(401).end();  // ← Reject invalid requests
  }
  
  saveEvents(req.body.events);
  res.json({ success: true });
});
```

**That's it!** See [AUTHENTICATION.md](./AUTHENTICATION.md) for 6 different auth methods.

---

## 🎯 Core Concepts

### Session Properties

Properties you set ONCE at initialization that are added to EVERY event:

```typescript
initAnalytics({
  sessionProperties: {
    userId: 'user-123',           // ← Added to every event
    sessionKey: 'abc',            // ← Added to every event
    environment: 'production',    // ← Added to every event
  },
});
```

**Use for:**
- User identification
- Session tokens
- Environment context
- Tenant IDs
- Any request-level metadata

### Default Properties

Fallback properties merged into events:

```typescript
initAnalytics({
  defaultProperties: {
    appVersion: '1.0.0',          // ← Added unless overridden
    region: 'us-west',            // ← Added unless overridden
  },
});
```

**Use for:**
- App version
- Region/location
- Build number
- Feature flags

### Per-Call Properties

Event-specific data (most specific, always wins):

```typescript
trackEvent({
  event: 'purchase',
  properties: {
    amount: 99.99,                // ← Only this event
    currency: 'USD',              // ← Only this event
  },
});
```

### Merge Order

```
auto-collected (browser, OS, device, etc.)
    ↓
sessionProperties (set once)
    ↓
defaultProperties (fallback)
    ↓
per-call properties (most specific, wins)
```

Later values override earlier ones.

---

## 🛠️ Common Patterns

### Pattern 1: User Login/Logout

```typescript
// On login
function handleLogin(user) {
  // Reinitialize with new user
  initAnalytics({
    trackingUrl: 'https://your-backend.com/api/analytics',
    sessionProperties: {
      userId: user.id,
      sessionToken: user.sessionToken,
    },
  });
}

// On logout
function handleLogout() {
  // Reinitialize as anonymous
  initAnalytics({
    trackingUrl: 'https://your-backend.com/api/analytics',
    sessionProperties: {
      userId: 'anonymous',
    },
  });
}
```

### Pattern 2: A/B Testing

```typescript
initAnalytics({
  sessionProperties: {
    userId: user.id,
    experimentId: 'exp-123',      // ← Which experiment
    experimentVariant: 'variant-B', // ← Which variant
  },
});

// All events now tagged with experiment info
trackEvent({ event: 'page_viewed' });
```

### Pattern 3: Multi-Tenant

```typescript
const tenant = getTenantContext();

initAnalytics({
  instanceId: `tenant-${tenant.id}`,    // ← Different per tenant
  sessionProperties: {
    tenantId: tenant.id,
    tenantPlan: tenant.plan,
  },
});
```

### Pattern 4: Feature Flags

```typescript
const features = getFeatureFlags();

initAnalytics({
  sessionProperties: {
    userId: user.id,
  },
  defaultProperties: {
    features: JSON.stringify(features), // ← Track which flags active
  },
});
```

### Pattern 5: Environment-Specific

```typescript
const config = {
  development: {
    trackingUrl: 'http://localhost:3000/api/analytics',
    instanceId: 'my-app-dev',
  },
  production: {
    trackingUrl: 'https://analytics.example.com/api/analytics',
    instanceId: 'my-app-prod',
  },
};

initAnalytics({
  ...config[process.env.NODE_ENV],
  sessionProperties: {
    environment: process.env.NODE_ENV,
  },
});
```

---

## 🔐 Authentication Methods (6 Approaches)

Choose ONE method for your backend. Examples below show both frontend and backend code.

### Method 1: Session Token (Simplest ⭐)

```typescript
// Frontend
initAnalytics({
  trackingUrl: 'https://your-backend.com/api/analytics',
  sessionProperties: {
    userId: 'user-123',
    sessionToken: userToken,  // ← Include token
  },
});

// Backend
app.post('/api/analytics', (req, res) => {
  const token = req.body.events[0]?.properties?.sessionToken;
  if (!isValidToken(token)) return res.status(401).end();
  saveEvents(req.body.events);
  res.json({ success: true });
});
```

### Method 2: HMAC Signature (Most Secure 🔐)

```typescript
// Frontend
const SECRET = 'your-backend-secret';
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const payload = args[1]?.body;
  if (payload && payload.includes('instanceId')) {
    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('hex');
    args[1].headers = { ...args[1].headers, 'X-Signature': signature };
  }
  return originalFetch.apply(window, args);
};

// Backend
const crypto = require('crypto');
const SECRET = 'your-backend-secret';

app.post('/api/analytics', (req, res) => {
  const signature = req.get('X-Signature');
  const expected = crypto.createHmac('sha256', SECRET).update(req.rawBody).digest('hex');
  if (signature !== expected) return res.status(401).end();
  saveEvents(req.body.events);
  res.json({ success: true });
});
```

### Method 3: API Key (Simple 🔑)

```typescript
// Frontend
initAnalytics({
  trackingUrl: 'https://your-backend.com/api/analytics',
  sessionProperties: {
    apiKey: 'sk_live_abc123xyz789',
    userId: 'user-123',
  },
});

// Backend
const VALID_KEYS = new Set(['sk_live_abc123xyz789', 'sk_live_def456uvw012']);
app.post('/api/analytics', (req, res) => {
  const apiKey = req.body.events[0]?.properties?.apiKey;
  if (!VALID_KEYS.has(apiKey)) return res.status(401).end();
  saveEvents(req.body.events);
  res.json({ success: true });
});
```

### Method 4: OAuth/JWT Token (Enterprise 🎫)

```typescript
// Frontend
initAnalytics({
  trackingUrl: 'https://your-backend.com/api/analytics',
  sessionProperties: {
    jwtToken: getOAuthToken(),
    userId: 'user-123',
  },
});

// Backend
const jwt = require('jsonwebtoken');
app.post('/api/analytics', (req, res) => {
  const token = req.body.events[0]?.properties?.jwtToken;
  try {
    const decoded = jwt.verify(token, 'your-secret');
    saveEvents(req.body.events);
    res.json({ success: true });
  } catch (err) {
    return res.status(401).end();
  }
});
```

### Method 5: IP Allowlist (Restrictive 🌐)

```javascript
// Backend only
const ALLOWED_IPS = new Set(['192.168.1.100', '10.0.0.50']);
app.post('/api/analytics', (req, res) => {
  if (!ALLOWED_IPS.has(req.ip)) return res.status(403).end();
  saveEvents(req.body.events);
  res.json({ success: true });
});
```

### Method 6: Multi-Factor (Best Practice 🛡️)

```javascript
// Backend
app.post('/api/analytics', (req, res) => {
  const { instanceId, events } = req.body;
  
  // Check 1: IP allowlist
  if (!isAllowedIp(req.ip)) return res.status(403).end();
  
  // Check 2: Instance ID
  if (!isValidInstance(instanceId)) return res.status(403).end();
  
  // Check 3: HMAC signature
  if (!verifySignature(req.get('X-Signature'), req.rawBody)) return res.status(401).end();
  
  // Check 4: Session token
  const token = events[0]?.properties?.sessionToken;
  if (!isValidSession(token)) return res.status(401).end();
  
  saveEvents(events);
  res.json({ success: true });
});
```

See `examples/auth-examples.js` for runnable implementations of all 6 methods.

---

## 🔄 What Happens to Events

```
1. Event fires in component
   trackEvent({ event: 'click' })
   
2. Properties merged
   { browser: 'Chrome', userId: 'u-123', ... }
   
3. Middlewares run (optional filtering)
   // Check consent, scrub PII, etc.
   
4. Event queued in memory
   // Batched with others
   
5. Auto-flush (every 5s or 20 events)
   // sendBeacon to your backend
   
6. Your backend receives
   POST /api/analytics
   { instanceId: 'my-app', events: [...] }
   
7. Your backend validates
   // Check token, rate limits, etc.
   
8. Your backend processes
   // Save to database, analytics, etc.
```

---

## 🧪 Testing

### Test Locally (No Backend)

```typescript
// Comment out initialization or use a fake URL
// Events won't send, but library still works
initAnalytics({
  trackingUrl: 'http://localhost:9999/never-reaches', // Invalid
  sessionProperties: { userId: 'test' },
});

// Events queue but never send
trackEvent({ event: 'test' });
```

### Test with Demo Backend

```bash
# Terminal 1: Run demo backend
node examples/simple-backend.js

# Terminal 2: Run demo app
npm run demo
```

### Test with Auth Backend

```bash
# Terminal 1: Run auth validation backend
EXAMPLE=1 node examples/auth-examples.js

# Terminal 2: Run your app pointing to localhost:3000
```

---

## ✅ Checklist for Production

- [ ] Read [AUTHENTICATION.md](./AUTHENTICATION.md)
- [ ] Choose authentication method
- [ ] Implement backend validation
- [ ] Use HTTPS for `trackingUrl`
- [ ] Test with invalid credentials (should reject)
- [ ] Implement rate limiting on backend
- [ ] Add error logging/monitoring
- [ ] Document your auth method for team
- [ ] Test with real traffic (small % first)
- [ ] Monitor for errors/issues
- [ ] Set up dashboards/analysis
- [ ] Document your analytics schema

---

## 🤔 FAQ

**Q: Do I need to implement authentication?**
A: Yes, on your backend. The package doesn't provide it. See [AUTHENTICATION.md](./AUTHENTICATION.md).

**Q: Can I send sensitive data (PII)?**
A: Yes, but use middleware to scrub it first. See [SECURITY.md](./SECURITY.md).

**Q: What happens if my backend is down?**
A: Events queue in memory and try again. If app closes, they're lost. This is expected for analytics.

**Q: How do I identify users?**
A: Set `userId` in `sessionProperties`. It's added to every event automatically.

**Q: Can I change `sessionProperties` after init?**
A: No, reinitialize to change them. Or use `defaultProperties` for changeable data.

**Q: What if I want to stop tracking?**
A: Use middleware to filter events based on consent. See examples.

**Q: How much data is collected?**
A: Browser, OS, device, screen width, session ID, + whatever you add. No IP or location by default.

**Q: What attacks should I protect against?**
A: Common analytics attacks:
- **Fake Events**: Forge events from wrong origin → Validate `instanceId` & origin
- **Replay Attack**: Resend old events repeatedly → Check event `timestamp` is recent
- **Rate Limit Bypass**: Flood endpoint → Implement rate limiting (max X/minute)
- **Wrong App**: Send to wrong instance → Whitelist allowed `instanceId` values
- **PII Leakage**: Send personal data → Use middleware to scrub before sending
- **Man-in-the-Middle**: Intercept unencrypted → Always use HTTPS

**Q: What's the production checklist?**
A:
- [ ] Read [AUTHENTICATION.md](#authentication-methods-6-approaches) above
- [ ] Choose authentication method (1-6)
- [ ] Implement backend validation
- [ ] Use HTTPS for `trackingUrl`
- [ ] Test with invalid credentials (should reject)
- [ ] Implement rate limiting
- [ ] Add error logging
- [ ] Set up monitoring
- [ ] Test with real traffic (small % first)
- [ ] Monitor for errors/anomalies

---

## 🚀 Next Steps

1. **Try locally**: Follow [DEMO_SETUP.md](./DEMO_SETUP.md)
2. **Read auth guide**: [AUTHENTICATION.md](./AUTHENTICATION.md) ⭐
3. **Integrate into app**: [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
4. **Add to production**: Use chosen auth method, test, deploy
5. **Monitor**: Set up dashboards, alerts, analysis

---

## 📞 Common Issues

### "Events not reaching backend"
1. Check backend is running
2. Check `trackingUrl` is correct
3. Open DevTools → Network tab
4. Look for POST to your analytics endpoint

### "401 Unauthorized errors"
1. Check auth credential is in `sessionProperties`
2. Check backend validation logic
3. Check credential format is correct
4. See [AUTHENTICATION.md](./AUTHENTICATION.md) for examples

### "CORS errors"
1. See [CORS_TROUBLESHOOTING.md](./CORS_TROUBLESHOOTING.md)
2. Or use `simple-backend.js` for local testing

---

## 📊 Example Event

Here's what your backend receives:

```json
{
  "instanceId": "my-app",
  "events": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "event": "button_clicked",
      "timestamp": "2026-09-12T18:00:00.000Z",
      "properties": {
        "browser": "Chrome",
        "browserVersion": "120.0.0.0",
        "os": "macOS",
        "osVersion": "14.1",
        "deviceType": "Desktop",
        "screenWidth": 1920,
        "sessionId": "session-abc123",
        "distinctId": "user-distinct-xyz",
        "userId": "user-123",
        "sessionToken": "token-abc",
        "environment": "production",
        "appVersion": "1.0.0"
      }
    }
  ]
}
```

---

## ✨ You're Ready!

Everything you need is documented. Start with [AUTHENTICATION.md](./AUTHENTICATION.md) if you're building a new backend. 🚀
