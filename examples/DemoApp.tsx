import React, { useState, useEffect, useRef } from 'react';
import { initAnalytics, useAnalytics, identify, reset, flush, type TrackedEvent } from '../src';

interface EventLog {
  id: string;
  event: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

export default function DemoApp() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [trackingUrl, setTrackingUrl] = useState('http://localhost:3000/api/analytics');
  const [instanceId, setInstanceId] = useState('demo-app-001');
  const [apiKey, setApiKey] = useState('test-key-12345');
  const [userId, setUserId] = useState('');
  const [userIdInput, setUserIdInput] = useState('');
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [corsNote, setCorsNote] = useState('');
  const { trackEvent } = useAnalytics('DemoApp');
  const eventCountRef = useRef(0);

  useEffect(() => {
    // Monitor for CORS issues
    const handleError = (event: Event) => {
      const errorEvent = event as ErrorEvent;
      if (errorEvent.message?.includes('CORS') || errorEvent.message?.includes('Network')) {
        setCorsNote('⚠️ CORS Issue: Check DevTools Console (F12) → Network tab');
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const handleInitialize = () => {
    try {
      initAnalytics({
        trackingUrl,
        instanceId,
        key: apiKey,
        flushIntervalMs: 3000,
        maxQueueSize: 10,
        defaultProperties: {
          appVersion: '1.0.0',
          environment: 'demo',
        },
      });
      setIsInitialized(true);
      setCorsNote('');
      logEvent('analytics_initialized', {
        trackingUrl,
        instanceId,
      });
      console.log('✅ Analytics initialized. Open DevTools Network tab to see requests.');
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleIdentify = () => {
    if (!userIdInput.trim()) {
      alert('Please enter a user ID');
      return;
    }
    identify(userIdInput);
    setUserId(userIdInput);
    logEvent('user_identified', { userId: userIdInput });
  };

  const handleReset = () => {
    reset();
    setUserId('');
    logEvent('user_reset', {});
  };

  const logEvent = (eventName: string, properties: Record<string, unknown>) => {
    const newLog: EventLog = {
      id: `event-${++eventCountRef.current}`,
      event: eventName,
      timestamp: new Date().toLocaleTimeString(),
      properties,
    };
    setEventLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  const fireSimpleEvent = () => {
    trackEvent({ event: 'button_clicked' });
    logEvent('button_clicked', { action: 'fire_simple_event' });
  };

  const fireEventWithProperties = () => {
    trackEvent({
      event: 'form_submitted',
      properties: {
        formId: 'demo-form',
        formName: 'Test Form',
        fieldCount: 5,
        meta: { variant: 'A', timestamp: Date.now() },
      },
    });
    logEvent('form_submitted', {
      formId: 'demo-form',
      fieldCount: 5,
    });
  };

  const fireEventWithScreenOverride = () => {
    trackEvent({
      event: 'modal_opened',
      onScreen: 'CustomModalScreen',
      properties: {
        modalName: 'Upgrade Modal',
        modalId: 'upgrade-v2',
      },
    });
    logEvent('modal_opened', {
      onScreen: 'CustomModalScreen',
      modalName: 'Upgrade Modal',
    });
  };

  const fireMultipleEvents = () => {
    const events = [
      { event: 'page_viewed', properties: { pageName: 'Demo' } },
      { event: 'feature_used', properties: { featureName: 'Analytics' } },
      { event: 'interaction_logged', properties: { type: 'demo' } },
    ];

    events.forEach((e) => {
      trackEvent(e);
      logEvent(e.event, e.properties);
    });
  };

  const handleFlush = () => {
    flush();
    logEvent('flush_called', { eventCount: eventLogs.length });
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>📊 Peekaboo Analytics Demo</h1>

      {/* Configuration Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Configuration</h2>
        <div style={styles.configGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Backend URL:</label>
            <input
              type="text"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              disabled={isInitialized}
              placeholder="http://localhost:3000/api/analytics"
              style={styles.input}
            />
            <small style={styles.helper}>
              The endpoint where events will be sent via sendBeacon/fetch
            </small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Instance ID:</label>
            <input
              type="text"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              disabled={isInitialized}
              placeholder="demo-app-001"
              style={styles.input}
            />
            <small style={styles.helper}>Unique identifier for this app instance</small>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>API Key:</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isInitialized}
              placeholder="test-key-12345"
              style={styles.input}
            />
            <small style={styles.helper}>Encrypted key from your backend</small>
          </div>
        </div>

        {isInitialized ? (
          <div style={styles.status}>
            <span style={styles.statusGreen}>✓ Initialized</span>
            {corsNote && <div style={{ ...styles.helper, marginTop: '10px', color: '#ff9800' }}>{corsNote}</div>}
          </div>
        ) : (
          <button onClick={handleInitialize} style={styles.buttonPrimary}>
            Initialize Analytics
          </button>
        )}
      </div>

      {/* User Identification Section */}
      {isInitialized && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>2. User Identification</h2>
          <div style={styles.formGroup}>
            <label style={styles.label}>User ID:</label>
            <div style={styles.inputGroup}>
              <input
                type="text"
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                placeholder="Enter user ID (e.g., user@example.com)"
                style={{ ...styles.input, flex: 1 }}
              />
              <button
                onClick={handleIdentify}
                style={{
                  ...styles.button,
                  marginLeft: '8px',
                  backgroundColor: '#4CAF50',
                }}
              >
                Identify
              </button>
              {userId && (
                <button
                  onClick={handleReset}
                  style={{
                    ...styles.button,
                    marginLeft: '8px',
                    backgroundColor: '#ff9800',
                  }}
                >
                  Reset
                </button>
              )}
            </div>
            {userId && (
              <small style={{ ...styles.helper, color: '#4CAF50' }}>
                Current user: <strong>{userId}</strong>
              </small>
            )}
          </div>
        </div>
      )}

      {/* Event Firing Section */}
      {isInitialized && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>3. Fire Events</h2>
          <div style={styles.buttonGrid}>
            <button
              onClick={fireSimpleEvent}
              style={{
                ...styles.button,
                backgroundColor: '#2196F3',
              }}
            >
              Simple Event<br/>
              <small>(button_clicked)</small>
            </button>

            <button
              onClick={fireEventWithProperties}
              style={{
                ...styles.button,
                backgroundColor: '#FF6200',
              }}
            >
              Event with Properties<br/>
              <small>(form_submitted)</small>
            </button>

            <button
              onClick={fireEventWithScreenOverride}
              style={{
                ...styles.button,
                backgroundColor: '#9C27B0',
              }}
            >
              Screen Override<br/>
              <small>(modal_opened)</small>
            </button>

            <button
              onClick={fireMultipleEvents}
              style={{
                ...styles.button,
                backgroundColor: '#00BCD4',
              }}
            >
              Multiple Events<br/>
              <small>(3 events)</small>
            </button>

            <button
              onClick={handleFlush}
              style={{
                ...styles.button,
                backgroundColor: '#4CAF50',
              }}
            >
              Manual Flush<br/>
              <small>(send now)</small>
            </button>
          </div>
          <small style={styles.helper}>
            Events are automatically flushed every 3 seconds or when queue reaches 10 events
          </small>
        </div>
      )}

      {/* Event Log Section */}
      {isInitialized && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            4. Event Log ({eventLogs.length} events)
          </h2>
          <div style={styles.logContainer}>
            {eventLogs.length === 0 ? (
              <div style={styles.emptyLog}>No events fired yet. Try firing some events above!</div>
            ) : (
              <div style={styles.logList}>
                {eventLogs.map((log) => (
                  <div key={log.id} style={styles.logEntry}>
                    <div style={styles.logHeader}>
                      <strong style={styles.logEvent}>{log.event}</strong>
                      <span style={styles.logTime}>{log.timestamp}</span>
                    </div>
                    <div style={styles.logProperties}>
                      <pre>{JSON.stringify(log.properties, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>ℹ️ How It Works</h2>
        <ul style={styles.infoList}>
          <li>
            <strong>Initialize:</strong> Configure your backend URL and authentication key
          </li>
          <li>
            <strong>Track:</strong> Use the <code>trackEvent()</code> hook to fire events
          </li>
          <li>
            <strong>Auto-collect:</strong> Device info, browser, OS, and session data sent automatically
          </li>
          <li>
            <strong>Queue & Flush:</strong> Events are queued and sent in batches using sendBeacon/fetch
          </li>
          <li>
            <strong>Non-blocking:</strong> Uses Navigator.sendBeacon for reliable delivery even on page unload
          </li>
        </ul>
      </div>

      {/* CORS Troubleshooting */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>🔧 Debugging & CORS Issues</h2>
        <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
          <strong>📋 Check Network Requests:</strong>
          <ol style={{ marginLeft: '20px', marginTop: '10px', lineHeight: '1.8' }}>
            <li>Open Browser DevTools: <code>F12</code></li>
            <li>Go to <strong>Network</strong> tab</li>
            <li>Fire an event in the demo app</li>
            <li>Look for POST requests to your backend URL</li>
            <li>If you only see OPTIONS requests, you have a CORS issue</li>
          </ol>
        </div>

        <div style={{ backgroundColor: '#f8d7da', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
          <strong>⚠️ CORS Problem - Only OPTIONS Showing?</strong>
          <p style={{ marginTop: '10px' }}>
            If you only see OPTIONS requests and no POST, your backend needs CORS headers:
          </p>
          <code style={{ display: 'block', padding: '10px', backgroundColor: '#fff', marginTop: '10px' }}>
            Access-Control-Allow-Origin: *<br/>
            Access-Control-Allow-Methods: POST, OPTIONS<br/>
            Access-Control-Allow-Headers: Content-Type
          </code>
        </div>

        <div style={{ backgroundColor: '#d1ecf1', padding: '15px', borderRadius: '4px' }}>
          <strong>✅ Solutions for Beeceptor:</strong>
          <ul style={{ marginLeft: '20px', marginTop: '10px', lineHeight: '1.8' }}>
            <li>Beeceptor should automatically handle CORS - verify in request details</li>
            <li>Try using <code>http://localhost:3000/api/analytics</code> with the backend example server</li>
            <li>Or modify your Beeceptor endpoint rules to explicitly allow CORS</li>
            <li>Inspect the OPTIONS response headers in DevTools to see what's being sent</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  } as React.CSSProperties,
  title: {
    fontSize: '2rem',
    marginBottom: '30px',
    color: '#333',
  } as React.CSSProperties,
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '1.2rem',
    marginBottom: '15px',
    color: '#333',
    borderBottom: '2px solid #2196F3',
    paddingBottom: '10px',
  } as React.CSSProperties,
  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  } as React.CSSProperties,
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  label: {
    fontWeight: '600',
    marginBottom: '5px',
    color: '#333',
  } as React.CSSProperties,
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
  } as React.CSSProperties,
  helper: {
    color: '#999',
    marginTop: '5px',
    fontSize: '12px',
  } as React.CSSProperties,
  inputGroup: {
    display: 'flex',
    gap: '10px',
  } as React.CSSProperties,
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    marginBottom: '20px',
  } as React.CSSProperties,
  button: {
    padding: '12px 20px',
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  } as React.CSSProperties,
  buttonPrimary: {
    padding: '12px 20px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  } as React.CSSProperties,
  status: {
    padding: '10px 15px',
    backgroundColor: '#e8f5e9',
    borderRadius: '4px',
    display: 'inline-block',
  } as React.CSSProperties,
  statusGreen: {
    color: '#4CAF50',
    fontWeight: '600',
  } as React.CSSProperties,
  logContainer: {
    maxHeight: '600px',
    overflowY: 'auto',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
    padding: '10px',
  } as React.CSSProperties,
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  } as React.CSSProperties,
  logEntry: {
    backgroundColor: 'white',
    borderLeft: '4px solid #2196F3',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
  } as React.CSSProperties,
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  } as React.CSSProperties,
  logEvent: {
    color: '#2196F3',
  } as React.CSSProperties,
  logTime: {
    color: '#999',
    fontSize: '11px',
  } as React.CSSProperties,
  logProperties: {
    backgroundColor: '#f5f5f5',
    padding: '8px',
    borderRadius: '3px',
    overflow: 'auto',
  } as React.CSSProperties,
  emptyLog: {
    textAlign: 'center',
    color: '#999',
    padding: '20px',
  } as React.CSSProperties,
  infoList: {
    listStyle: 'none',
    padding: 0,
  } as React.CSSProperties,
};
