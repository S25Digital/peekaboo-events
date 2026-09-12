# 🚀 Quick Demo Setup

Get up and running with the Peekaboo Analytics demo in 2 minutes.

## Terminal 1: Start the Backend Server

```bash
node examples/simple-backend.js
```

**Expected output:**
```
🚀 Peekaboo Analytics Backend Server
📍 Listening on http://localhost:3000
📊 Analytics endpoint: http://localhost:3000/api/analytics
⏳ Waiting for events...
```

✅ **No external dependencies required!** Uses only Node.js built-in modules.

## Terminal 2: Start the Demo App

```bash
npm run demo
```

**Expected:**
- Browser opens to `http://localhost:5173`
- Demo app loads with configuration form

## Terminal 3: Run Tests (Optional)

```bash
npm test
```

**Expected:**
```
Test Files  1 passed (1)
Tests  7 passed (7)
```

## Using the Demo App

### Step 1: Initialize
- **Backend URL**: `http://localhost:3000/api/analytics` (auto-filled)
- **Instance ID**: `demo-app-001`
- **API Key**: `test-key-12345`
- Click **"Initialize Analytics"** ✅

### Step 2: Fire Events
Choose from:
- **Simple Event** - Basic tracking
- **Event with Properties** - Custom data
- **Screen Override** - Track screen context
- **Multiple Events** - Test batching
- **Manual Flush** - Send immediately

### Step 3: Watch Backend
Check Terminal 1 to see events arrive in real-time:
```
========================================
📊 Received 1 event(s) from instance: demo-app-001
========================================

[Event 1/1]
  Event Name: button_clicked
  UUID: 550e8400-e29b-41d4-a716-446655440000
  Timestamp: 2026-09-12T17:36:23.456Z
  Properties:
    browser: Chrome
    os: macOS
    deviceType: Desktop
    ...
```

## Features to Try

✅ **Simple Event** - See basic event tracking
✅ **Properties** - Send custom data with events
✅ **Screen Context** - Override the screen name
✅ **Batch Multiple** - Fire 3 events at once
✅ **User ID** - Identify and track specific users
✅ **Reset User** - Switch back to anonymous
✅ **Manual Flush** - Force send queued events
✅ **Auto Properties** - See auto-collected browser/device info
✅ **Event Log** - Real-time view of all events
✅ **Event Batching** - Watch events combine in requests

## What Gets Sent?

Each event includes automatically:
- 🌐 Browser name & version
- 💻 Operating system & version
- 📱 Device type (Desktop/Mobile/Tablet)
- 📐 Screen width
- 🔑 Session ID (same per session)
- 👤 Distinct ID (per user)
- ⏰ Timestamp
- 🏷️ Custom properties you add

## Demo App Sections

### 1️⃣ Configuration
Set backend URL, instance ID, and API key

### 2️⃣ User Identification
Identify users and track with their ID

### 3️⃣ Fire Events
Various buttons to trigger different event types

### 4️⃣ Event Log
Real-time view of fired events and their data

## Architecture

```
Browser (Demo App)
       ↓ (events)
   React Hook
       ↓ (batched)
   Event Queue
       ↓ (5s or 10 events)
   sendBeacon/Fetch
       ↓
   Backend Server
       ↓
   Event Processing
```

## Backend Example

The `backend-example.js` shows how to:
- Receive analytics POST requests
- Parse event batches
- Log event details
- Respond with success

Adapt this for your real backend!

## Next Steps

1. ✅ Start backend
2. ✅ Start demo app
3. ✅ Fire some events
4. ✅ Check backend terminal
5. 📖 Read [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for production use
6. 📦 Run `npm test` to verify everything works

## Troubleshooting

**Demo won't load?**
- Check if port 5173 is available
- Try: `npm run demo`

**Events not reaching backend?**
- Verify backend is running on port 3000
- Check "Backend URL" in demo app
- Open DevTools → Network tab

**Backend not starting?**
- Install dependencies: `npm install express cors`
- Verify port 3000 is free
- Check Node.js version: `node -v`

## Cleanup

Stop servers with **Ctrl+C** in each terminal.

## Success! 🎉

You now have a fully functional analytics system running locally.
- Frontend demo firing events
- Backend receiving and logging them
- Tests passing ✓

Ready to integrate into your real app!
