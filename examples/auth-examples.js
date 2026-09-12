/**
 * Authentication Examples for Backend
 * Shows different ways to validate analytics events
 *
 * Choose the example that matches your use case
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');

// ============================================
// EXAMPLE 1: Simple Session Token Validation
// ============================================

function createExample1Server() {
  return http.createServer((req, res) => {
    const pathname = url.parse(req.url, true).pathname;

    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (pathname === '/api/analytics' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { events } = data;

          if (!events?.length) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No events' }));
            return;
          }

          // VALIDATION: Check session token
          const sessionToken = events[0].properties?.sessionToken;
          const userId = events[0].properties?.userId;

          // Mock: Check if token is valid (in real app, validate against DB/cache)
          if (!sessionToken || !isValidSession(sessionToken, userId)) {
            console.warn(`❌ [AUTH] Invalid token: ${sessionToken}`);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
          }

          console.log(`✅ [AUTH] Valid session for user: ${userId}`);
          console.log(`📊 Received ${events.length} event(s)`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, method: 'session-token' }));
        } catch (err) {
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });
}

// Mock validation
function isValidSession(token, userId) {
  const validTokens = {
    'token-user-123': 'user-123',
    'token-user-456': 'user-456',
  };
  return validTokens[token] === userId;
}

// ============================================
// EXAMPLE 2: API Key Validation
// ============================================

function createExample2Server() {
  const VALID_KEYS = new Set([
    'sk_live_abc123xyz789',
    'sk_live_def456uvw012',
    'sk_test_demo123',
  ]);

  return http.createServer((req, res) => {
    const pathname = url.parse(req.url, true).pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (pathname === '/api/analytics' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { events } = data;

          if (!events?.length) {
            res.writeHead(400);
            res.end();
            return;
          }

          // VALIDATION: Check API key
          const apiKey = events[0].properties?.apiKey;

          if (!VALID_KEYS.has(apiKey)) {
            console.warn(`❌ [AUTH] Invalid API key: ${apiKey}`);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid API key' }));
            return;
          }

          console.log(`✅ [AUTH] Valid API key: ${apiKey}`);
          console.log(`📊 Received ${events.length} event(s)`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, method: 'api-key' }));
        } catch (err) {
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });
}

// ============================================
// EXAMPLE 3: HMAC Signature Validation
// ============================================

function createExample3Server() {
  const SECRET = 'your-shared-secret-key';

  return http.createServer((req, res) => {
    const pathname = url.parse(req.url, true).pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Signature');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (pathname === '/api/analytics' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          // VALIDATION: Check HMAC signature
          const signature = req.get?.('X-Signature') || req.headers['x-signature'];
          const expectedSignature = crypto
            .createHmac('sha256', SECRET)
            .update(body)
            .digest('hex');

          if (signature !== expectedSignature) {
            console.warn(`❌ [AUTH] Invalid signature`);
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid signature' }));
            return;
          }

          const data = JSON.parse(body);
          const { events } = data;

          if (!events?.length) {
            res.writeHead(400);
            res.end();
            return;
          }

          console.log(`✅ [AUTH] Valid signature`);
          console.log(`📊 Received ${events.length} event(s)`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, method: 'hmac' }));
        } catch (err) {
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });
}

// ============================================
// EXAMPLE 4: Multi-Factor Authentication
// ============================================

function createExample4Server() {
  const ALLOWED_IPS = new Set(['127.0.0.1', 'localhost', '::1']);
  const VALID_INSTANCES = new Set(['my-app-v1', 'my-app-v2']);
  const VALID_TOKENS = new Map([
    ['token-123', 'user-123'],
    ['token-456', 'user-456'],
  ]);

  return http.createServer((req, res) => {
    const pathname = url.parse(req.url, true).pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (pathname === '/api/analytics' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { instanceId, events } = data;
          const clientIp = req.socket?.remoteAddress || 'unknown';

          // Check 1: IP Allowlist
          if (!ALLOWED_IPS.has(clientIp)) {
            console.warn(`❌ [AUTH] IP not allowed: ${clientIp}`);
            res.writeHead(403);
            res.end();
            return;
          }

          // Check 2: Instance ID
          if (!VALID_INSTANCES.has(instanceId)) {
            console.warn(`❌ [AUTH] Invalid instance: ${instanceId}`);
            res.writeHead(403);
            res.end();
            return;
          }

          if (!events?.length) {
            res.writeHead(400);
            res.end();
            return;
          }

          // Check 3: Session Token
          const token = events[0].properties?.sessionToken;
          const userId = events[0].properties?.userId;
          const expectedUser = VALID_TOKENS.get(token);

          if (expectedUser !== userId) {
            console.warn(`❌ [AUTH] Invalid token or user mismatch`);
            res.writeHead(401);
            res.end();
            return;
          }

          // All checks passed
          console.log(`✅ [AUTH] All validations passed`);
          console.log(`   • IP: ${clientIp}`);
          console.log(`   • Instance: ${instanceId}`);
          console.log(`   • User: ${userId}`);
          console.log(`📊 Received ${events.length} event(s)`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({ success: true, method: 'multi-factor' })
          );
        } catch (err) {
          res.writeHead(400);
          res.end();
        }
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });
}

// ============================================
// Server Selection
// ============================================

const EXAMPLE = process.env.EXAMPLE || '1';
let server;

switch (EXAMPLE) {
  case '1':
    server = createExample1Server();
    console.log('🔐 Running: Example 1 - Session Token Validation');
    console.log(
      'Test: sessionToken=token-user-123, userId=user-123\n'
    );
    break;

  case '2':
    server = createExample2Server();
    console.log('🔐 Running: Example 2 - API Key Validation');
    console.log(
      'Valid keys: sk_live_abc123xyz789, sk_live_def456uvw012, sk_test_demo123\n'
    );
    break;

  case '3':
    server = createExample3Server();
    console.log('🔐 Running: Example 3 - HMAC Signature Validation');
    console.log('Secret: your-shared-secret-key\n');
    break;

  case '4':
    server = createExample4Server();
    console.log('🔐 Running: Example 4 - Multi-Factor Authentication');
    console.log('IP allowlist: 127.0.0.1, localhost, ::1');
    console.log('Valid instances: my-app-v1, my-app-v2\n');
    break;

  default:
    console.error('Unknown example:', EXAMPLE);
    console.log('Usage: EXAMPLE=1|2|3|4 node auth-examples.js');
    process.exit(1);
}

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`📍 Listening on http://localhost:${PORT}/api/analytics`);
  console.log(`\n📝 To test, use one of the example backends:`);
  console.log(`   EXAMPLE=1 node auth-examples.js  # Session Token`);
  console.log(`   EXAMPLE=2 node auth-examples.js  # API Key`);
  console.log(`   EXAMPLE=3 node auth-examples.js  # HMAC`);
  console.log(`   EXAMPLE=4 node auth-examples.js  # Multi-Factor\n`);
});

process.on('SIGINT', () => {
  console.log('\n\nShutting down...');
  process.exit(0);
});
