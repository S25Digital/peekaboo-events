/**
 * Frontend Authentication Examples
 * Shows how to initialize peekaboo-events with different auth methods
 */

import { initAnalytics, useAnalytics } from '../src';

// ============================================
// EXAMPLE 1: Session Token Authentication
// ============================================

export function Example1_SessionToken() {
  // Get auth token from your login system
  const authToken = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');

  React.useEffect(() => {
    initAnalytics({
      trackingUrl: 'http://localhost:3000/api/analytics',
      instanceId: 'my-app-v1',
      sessionProperties: {
        // Include session-level auth data
        sessionToken: authToken,
        userId: userId,
      },
      defaultProperties: {
        appVersion: '1.0.0',
        environment: 'production',
      },
    });
  }, [authToken, userId]);

  return (
    <div>
      <h2>Session Token Auth</h2>
      <p>Token: {authToken?.slice(0, 10)}...</p>
      <p>User: {userId}</p>
      <EventTracker />
    </div>
  );
}

// ============================================
// EXAMPLE 2: API Key Authentication
// ============================================

export function Example2_ApiKey() {
  const API_KEY = process.env.REACT_APP_ANALYTICS_KEY;

  React.useEffect(() => {
    initAnalytics({
      trackingUrl: 'http://localhost:3000/api/analytics',
      instanceId: 'my-app-v1',
      sessionProperties: {
        // Include API key
        apiKey: API_KEY,
        userId: getCurrentUserId(),
      },
    });
  }, []);

  return (
    <div>
      <h2>API Key Auth</h2>
      <p>Using API key from environment</p>
      <EventTracker />
    </div>
  );
}

// ============================================
// EXAMPLE 3: JWT Token Authentication
// ============================================

export function Example3_JwtToken() {
  const [jwtToken, setJwtToken] = React.useState<string>('');

  React.useEffect(() => {
    // Get JWT from auth provider
    const token = getJwtToken();
    setJwtToken(token);

    initAnalytics({
      trackingUrl: 'http://localhost:3000/api/analytics',
      instanceId: 'my-app-v1',
      sessionProperties: {
        // Include JWT token
        jwtToken: token,
        userId: getCurrentUserId(),
      },
    });
  }, []);

  return (
    <div>
      <h2>JWT Token Auth</h2>
      <p>Using JWT from auth provider</p>
      <EventTracker />
    </div>
  );
}

// ============================================
// EXAMPLE 4: Multi-Tenant with Instance ID
// ============================================

export function Example4_MultiTenant() {
  const tenantId = getTenantId();
  const authToken = getAuthToken();

  React.useEffect(() => {
    initAnalytics({
      trackingUrl: 'http://localhost:3000/api/analytics',
      instanceId: `tenant-${tenantId}`, // ← Different per tenant
      sessionProperties: {
        tenantId: tenantId,
        authToken: authToken,
        userId: getCurrentUserId(),
      },
    });
  }, [tenantId, authToken]);

  return (
    <div>
      <h2>Multi-Tenant Auth</h2>
      <p>Tenant: {tenantId}</p>
      <EventTracker />
    </div>
  );
}

// ============================================
// EXAMPLE 5: OAuth Token with Refresh
// ============================================

export function Example5_OAuthWithRefresh() {
  const [accessToken, setAccessToken] = React.useState<string>('');

  React.useEffect(() => {
    // Get initial OAuth token
    const token = getOAuthAccessToken();
    setAccessToken(token);

    // Refresh token before it expires
    const refreshInterval = setInterval(() => {
      const newToken = getOAuthAccessToken();
      setAccessToken(newToken);
    }, 50 * 60 * 1000); // Refresh every 50 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  React.useEffect(() => {
    if (!accessToken) return;

    initAnalytics({
      trackingUrl: 'http://localhost:3000/api/analytics',
      instanceId: 'my-app-v1',
      sessionProperties: {
        // OAuth token refreshes automatically
        oauthToken: accessToken,
        userId: getCurrentUserId(),
        tokenRefresh: new Date().toISOString(),
      },
    });
  }, [accessToken]);

  return (
    <div>
      <h2>OAuth Token Auth</h2>
      <p>Token refreshed at: {new Date().toLocaleTimeString()}</p>
      <EventTracker />
    </div>
  );
}

// ============================================
// EXAMPLE 6: Auth with Environment-Specific Config
// ============================================

export function Example6_EnvironmentConfig() {
  React.useEffect(() => {
    const environment = process.env.NODE_ENV;
    const authToken = localStorage.getItem('authToken');

    const config = {
      // Different backend per environment
      trackingUrl:
        environment === 'production'
          ? 'https://analytics.example.com/api/analytics'
          : 'http://localhost:3000/api/analytics',

      instanceId:
        environment === 'production'
          ? 'my-app-prod'
          : `my-app-${environment}`,

      sessionProperties: {
        authToken: authToken,
        userId: getCurrentUserId(),
        environment: environment,
        buildNumber: process.env.REACT_APP_BUILD_NUMBER,
        region: getCurrentRegion(),
      },
    };

    initAnalytics(config);
  }, []);

  return (
    <div>
      <h2>Environment-Based Auth</h2>
      <p>Environment: {process.env.NODE_ENV}</p>
      <EventTracker />
    </div>
  );
}

// ============================================
// EXAMPLE 7: Auth with Consent Management
// ============================================

export function Example7_WithConsent() {
  const [userConsent, setUserConsent] = React.useState<boolean>(false);

  // Consent gate middleware
  const consentGate = (event) => {
    if (!userConsent) {
      return null; // Drop event if no consent
    }
    return event;
  };

  React.useEffect(() => {
    const authToken = localStorage.getItem('authToken');

    initAnalytics({
      trackingUrl: 'http://localhost:3000/api/analytics',
      instanceId: 'my-app-v1',
      sessionProperties: {
        sessionToken: authToken,
        userId: getCurrentUserId(),
        consentGiven: userConsent,
      },
      middlewares: [consentGate], // Only track if consent given
    });
  }, [userConsent]);

  const handleConsentChange = (consent: boolean) => {
    setUserConsent(consent);
    if (consent) {
      console.log('✅ Analytics enabled');
    } else {
      console.log('❌ Analytics disabled');
    }
  };

  return (
    <div>
      <h2>Auth with Consent</h2>
      <button onClick={() => handleConsentChange(!userConsent)}>
        {userConsent ? 'Disable' : 'Enable'} Analytics
      </button>
      <EventTracker />
    </div>
  );
}

// ============================================
// Helper: Event Tracker Component
// ============================================

function EventTracker() {
  const { trackEvent } = useAnalytics('AuthExample');

  const handleTrackEvent = (eventName: string) => {
    trackEvent({
      event: eventName,
      properties: {
        timestamp: new Date().toISOString(),
      },
    });
    console.log(`✅ Tracked: ${eventName}`);
  };

  return (
    <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
      <h3>Track Events</h3>
      <button onClick={() => handleTrackEvent('button_clicked')}>
        Track Button Click
      </button>
      <button onClick={() => handleTrackEvent('page_viewed')}>
        Track Page View
      </button>
      <p style={{ fontSize: '12px', color: '#666' }}>
        Open browser console to see events
      </p>
    </div>
  );
}

// ============================================
// Helper Functions (Implement These)
// ============================================

function getCurrentUserId(): string {
  return localStorage.getItem('userId') || 'anonymous';
}

function getAuthToken(): string {
  return localStorage.getItem('authToken') || '';
}

function getJwtToken(): string {
  // Implement: Get JWT from your auth provider
  return '';
}

function getTenantId(): string {
  // Implement: Get tenant ID from your app context
  return '';
}

function getOAuthAccessToken(): string {
  // Implement: Get OAuth token from your provider
  return '';
}

function getCurrentRegion(): string {
  // Implement: Get region from your app
  return 'us-west';
}

// ============================================
// Usage in App
// ============================================

/**
 * Choose ONE example based on your auth method
 *
 * Usage in your main App.tsx:
 *
 * import { Example1_SessionToken } from './auth-frontend-examples';
 *
 * function App() {
 *   return <Example1_SessionToken />;
 * }
 */
