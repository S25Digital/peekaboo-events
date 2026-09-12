/**
 * Simple Express backend example for receiving Peekaboo Analytics events
 *
 * To use this:
 * 1. Install Express: npm install express cors
 * 2. Run: node backend-example.js
 * 3. In the demo app, set Backend URL to: http://localhost:3000/api/analytics
 * 4. Fire events and see them logged in your terminal
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Track incoming events
let totalEventsReceived = 0;

// Analytics endpoint
app.post('/api/analytics', (req, res) => {
  const { instanceId, events } = req.body;

  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ error: 'Invalid payload: events array required' });
  }

  console.log('\n========================================');
  console.log(`📊 Received ${events.length} event(s) from instance: ${instanceId}`);
  console.log('========================================');

  events.forEach((event, index) => {
    totalEventsReceived++;

    console.log(`\n[Event ${index + 1}/${events.length}]`);
    console.log(`  Event Name: ${event.event}`);
    console.log(`  UUID: ${event.uuid}`);
    console.log(`  Timestamp: ${event.timestamp}`);
    console.log(`  Properties:`);

    const props = event.properties || {};
    Object.entries(props).forEach(([key, value]) => {
      let displayValue = value;

      // Pretty print objects and arrays
      if (typeof value === 'object' && value !== null) {
        displayValue = JSON.stringify(value);
      }

      console.log(`    ${key}: ${displayValue}`);
    });
  });

  console.log(`\n✅ Total events received this session: ${totalEventsReceived}\n`);

  // Respond with success
  res.json({
    success: true,
    processedCount: events.length,
    totalReceived: totalEventsReceived,
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', eventsReceived: totalEventsReceived });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Peekaboo Analytics Backend Server');
  console.log(`📍 Listening on http://localhost:${PORT}`);
  console.log(`📊 Analytics endpoint: http://localhost:${PORT}/api/analytics`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log('\nConfigure the demo app with:');
  console.log(`  Backend URL: http://localhost:${PORT}/api/analytics`);
  console.log(`  Instance ID: demo-app-001 (or any ID)`);
  console.log(`  API Key: test-key-12345 (or any key)`);
  console.log('\nEvents will be logged here as they arrive...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\n📈 Session Summary`);
  console.log(`   Total events received: ${totalEventsReceived}`);
  console.log(`   Shutting down...\n`);
  process.exit(0);
});
