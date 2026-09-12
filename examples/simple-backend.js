/**
 * Simple Node.js backend for receiving Peekaboo Analytics events
 * NO external dependencies required - uses only Node.js built-in modules
 *
 * Usage:
 * 1. node simple-backend.js
 * 2. In demo app, set Backend URL to: http://localhost:3000/api/analytics
 * 3. Fire events and watch them appear in the terminal
 */

const http = require('http');
const url = require('url');

const PORT = 3000;
let totalEventsReceived = 0;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Get the origin from request
  const origin = req.headers.origin || '*';

  // Add CORS headers to every response
  // Use the exact origin for local development, wildcard for production
  const allowOrigin = origin.includes('localhost') || origin.includes('127.0.0.1')
    ? origin
    : '*';

  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Handle health check
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', eventsReceived: totalEventsReceived }));
    return;
  }

  // Handle analytics POST
  if (pathname === '/api/analytics' && req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { instanceId, events } = data;

        if (!events || !Array.isArray(events)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid payload' }));
          return;
        }

        console.log('\n========================================');
        console.log(`📊 Received ${events.length} event(s) from: ${instanceId}`);
        console.log('========================================');

        // Print raw JSON
        console.log('\n📋 Raw JSON Payload:');
        console.log(JSON.stringify(data, null, 2));

        events.forEach((event, index) => {
          totalEventsReceived++;

          console.log(`\n[Event ${index + 1}/${events.length}]`);
          console.log(`  Name: ${event.event}`);
          console.log(`  UUID: ${event.uuid}`);
          console.log(`  Time: ${event.timestamp}`);
          console.log(`  Properties:`);

          const props = event.properties || {};
          const sortedKeys = Object.keys(props).sort();

          sortedKeys.forEach((key) => {
            const value = props[key];
            let displayValue = value;

            if (typeof value === 'object' && value !== null) {
              displayValue = JSON.stringify(value);
            }

            console.log(`    • ${key}: ${displayValue}`);
          });
        });

        console.log(`\n✅ Total events this session: ${totalEventsReceived}\n`);

        // Send success response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            processedCount: events.length,
            totalReceived: totalEventsReceived,
          })
        );
      } catch (err) {
        console.error('❌ Error parsing request:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });

    req.on('error', (err) => {
      console.error('❌ Request error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    });

    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('\n🚀 Peekaboo Analytics Backend Server');
  console.log(`📍 Listening on http://localhost:${PORT}`);
  console.log(`📊 Analytics endpoint: http://localhost:${PORT}/api/analytics`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log('\n📋 Demo App Configuration:');
  console.log(`   Backend URL: http://localhost:${PORT}/api/analytics`);
  console.log(`   Instance ID: demo-app-001`);
  console.log(`   API Key: test-key-12345`);
  console.log('\n⏳ Waiting for events...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n\n📈 Session Summary`);
  console.log(`   Total events received: ${totalEventsReceived}`);
  console.log(`   Shutting down...\n`);
  process.exit(0);
});
