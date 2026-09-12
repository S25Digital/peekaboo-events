# Peekaboo Analytics Demo App

A fully interactive demo application to test the Peekaboo Analytics hook with a configurable backend URL.

## Quick Start

### 1. Install Dependencies

From the project root:

```bash
npm install
```

### 2a. Start the Backend Server (Simple - No Dependencies)

```bash
node examples/simple-backend.js
```

This backend uses only Node.js built-in modules, no external dependencies!

### 2b. (Optional) Start with Auth Example

To test authentication:

```bash
# Example 1: Session Token validation
EXAMPLE=1 node examples/auth-examples.js

# Example 2: API Key validation
EXAMPLE=2 node examples/auth-examples.js

# Example 3: HMAC Signature validation
EXAMPLE=3 node examples/auth-examples.js

# Example 4: Multi-Factor authentication
EXAMPLE=4 node examples/auth-examples.js
```

See [AUTHENTICATION.md](../AUTHENTICATION.md) for complete setup instructions.

### 3. Start the Demo App

```bash
npm run demo
```

This will start a Vite dev server on `http://localhost:5173` and open it in your browser.

### 3. Configure & Test

1. **Set your backend URL** - Enter the endpoint where you want events to be sent
2. **Set Instance ID & API Key** - Use your app's credentials
3. **Click "Initialize Analytics"** - This starts the tracking
4. **Fire Events** - Use the buttons to trigger different types of events
5. **View the Log** - See all fired events and their properties in real-time

## Features

### Configuration Section
- **Backend URL**: The endpoint that receives your analytics events
- **Instance ID**: Unique identifier for your app instance
- **API Key**: Authentication key from your backend

### Event Firing Options

- **Simple Event**: Basic `button_clicked` event
- **Event with Properties**: `form_submitted` with custom data
- **Screen Override**: `modal_opened` with custom screen name
- **Multiple Events**: Fire 3 events at once to test batching
- **Manual Flush**: Immediately send queued events to your backend

### Event Log

Real-time view of all events fired during the session, showing:
- Event name
- Timestamp
- Custom properties
- Auto-collected data (browser, device, OS, etc.)

## What Gets Sent to Your Backend

Each event includes:
- **Auto-collected properties**:
  - `browser` & `browserVersion`
  - `os` & `osVersion`
  - `deviceType` (Mobile/Tablet/Desktop)
  - `screenWidth`
  - `sessionId` (per session)
  - `distinctId` (per user)
  - `timestamp`
  
- **Custom properties**: Anything you pass to `trackEvent()`

## Example Backend Request

When events are flushed, your backend receives:

```json
{
  "instanceId": "demo-app-001",
  "events": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "event": "button_clicked",
      "timestamp": "2026-09-12T17:36:23.456Z",
      "properties": {
        "action": "fire_simple_event",
        "browser": "Chrome",
        "browserVersion": "148.0.0.0",
        "os": "macOS",
        "deviceType": "Desktop",
        "sessionId": "abc123...",
        "distinctId": "xyz789...",
        "screenWidth": 1920,
        "timestamp": "2026-09-12T17:36:23.456Z",
        "key": "test-key-12345",
        "onScreen": "DemoApp",
        "appVersion": "1.0.0",
        "environment": "demo"
      }
    }
  ]
}
```

## User Identification

1. Enter a user ID in the "User Identification" section
2. Click **Identify** to associate subsequent events with that user
3. Click **Reset** to switch back to anonymous tracking

## Event Batching & Flushing

- Events are **automatically flushed every 3 seconds**
- Or when the queue reaches **10 events**
- Use **Manual Flush** to send events immediately
- Events use `navigator.sendBeacon` for reliable delivery even on page unload

## Development

### Build for Production

```bash
npm run demo:build
```

### Run Tests

```bash
npm test
```

### Test the Full Suite

```bash
npm test:watch
```

## Testing Your Backend

You can use this demo to:

1. **Test your API endpoint** - Point it to your backend URL and watch requests come in
2. **Verify event structure** - Check that your backend receives all expected properties
3. **Test batching logic** - Verify multiple events are batched together
4. **Monitor flush behavior** - Ensure events are sent reliably
5. **Test user identification** - Switch between identified and anonymous users

## Example: Local Backend

If you're running a local server on port 3000:

```
Backend URL: http://localhost:3000/api/analytics
Instance ID: my-app
API Key: your-secret-key
```

Then initialize and fire events. Your backend should receive POST requests with the event payload.

## Authentication Examples

This directory includes complete authentication implementation examples:

### Frontend Examples
See `auth-frontend-examples.tsx` for 7 complete examples:

1. **Session Token Auth** - Using session tokens from login
2. **API Key Auth** - Using API keys from environment
3. **JWT Token Auth** - Using JWT from auth provider
4. **Multi-Tenant** - Different tenant IDs per user
5. **OAuth with Refresh** - Token refresh handling
6. **Environment Config** - Different config per environment
7. **With Consent** - Middleware for consent gates

### Backend Examples
Run any of the 4 backend auth patterns:

```bash
EXAMPLE=1 node auth-examples.js  # Session token validation
EXAMPLE=2 node auth-examples.js  # API key validation
EXAMPLE=3 node auth-examples.js  # HMAC signature validation
EXAMPLE=4 node auth-examples.js  # Multi-factor authentication
```

## Troubleshooting

- **"document is not defined"**: Make sure you're running this in a browser, not Node.js
- **Events not sending**: Check CORS headers on your backend
- **401 Unauthorized**: Check your authentication credentials
- **No events in log**: Make sure to click "Initialize Analytics" first
- **Backend not receiving events**: Check your firewall and ensure the URL is correct
- **Auth failing**: See [AUTHENTICATION.md](../AUTHENTICATION.md) for complete auth guide

## Learn More

- [AUTHENTICATION.md](../AUTHENTICATION.md) - Complete authentication guide with 6 methods
- [ARCHITECTURE.md](../ARCHITECTURE.md) - How data flows through the system
- [SECURITY.md](../SECURITY.md) - Security best practices
- [README.md](../README.md) - Main package documentation
