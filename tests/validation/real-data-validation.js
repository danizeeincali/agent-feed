#!/usr/bin/env node
/**
 * 100% Real Data Validation - Zero Mocks
 *
 * Validates the entire system with real connections and real data:
 * - Backend SSE streaming
 * - Database telemetry tracking
 * - WebSocket connections (via Socket.IO client library)
 * - Real-time event flow
 */

import { EventSource } from 'eventsource';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../database.db');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(70)}${colors.reset}\n${colors.cyan}${msg}${colors.reset}\n${colors.cyan}${'='.repeat(70)}${colors.reset}\n`),
};

// Validation results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  checks: [],
};

function addCheck(name, passed, message = '', isWarning = false) {
  results.total++;
  if (passed) {
    results.passed++;
    log.success(`${name}: ${message || 'PASS'}`);
  } else if (isWarning) {
    results.warnings++;
    log.warn(`${name}: ${message || 'WARNING'}`);
  } else {
    results.failed++;
    log.error(`${name}: ${message || 'FAIL'}`);
  }
  results.checks.push({ name, passed, message, isWarning });
}

// Database validation
async function validateDatabase() {
  log.section('DATABASE VALIDATION');

  try {
    const db = new Database(DB_PATH, { readonly: true });
    addCheck('Database Connection', true, 'Connected to database.db');

    // Check tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tableNames = tables.map(t => t.name);

    addCheck('activity_events table', tableNames.includes('activity_events'));
    addCheck('session_metrics table', tableNames.includes('session_metrics'));
    addCheck('tool_executions table', tableNames.includes('tool_executions'));
    addCheck('agent_executions table', tableNames.includes('agent_executions'));

    // Check for data
    const eventCount = db.prepare('SELECT COUNT(*) as count FROM activity_events').get();
    const sessionCount = db.prepare('SELECT COUNT(*) as count FROM session_metrics').get();
    const toolCount = db.prepare('SELECT COUNT(*) as count FROM tool_executions').get();

    log.info(`Activity events: ${eventCount.count}`);
    log.info(`Session metrics: ${sessionCount.count}`);
    log.info(`Tool executions: ${toolCount.count}`);

    addCheck('Session metrics tracked', sessionCount.count > 0, `${sessionCount.count} sessions recorded`);

    // Check recent session
    if (sessionCount.count > 0) {
      const recentSession = db.prepare('SELECT * FROM session_metrics ORDER BY start_time DESC LIMIT 1').get();
      log.info(`Most recent session: ${recentSession.session_id}`);
      log.info(`  Status: ${recentSession.status}`);
      log.info(`  Duration: ${recentSession.duration}ms`);
      log.info(`  Start time: ${recentSession.start_time}`);
      addCheck('Recent session found', true, `Session ${recentSession.session_id}`);
    }

    db.close();
  } catch (error) {
    addCheck('Database Connection', false, error.message);
  }
}

// Backend health validation
async function validateBackend() {
  log.section('BACKEND HEALTH VALIDATION');

  try {
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();

    addCheck('Backend health endpoint', data.success, `Status: ${data.data?.status}`);
    addCheck('Database connected', data.data?.resources?.databaseConnected);
    addCheck('Agent pages DB connected', data.data?.resources?.agentPagesDbConnected);

    log.info(`Uptime: ${data.data?.uptime?.formatted}`);
    log.info(`Memory usage: ${data.data?.memory?.heapUsed}MB / ${data.data?.memory?.heapTotal}MB (${data.data?.memory?.heapPercentage}%)`);
    log.info(`SSE connections: ${data.data?.resources?.sseConnections}`);

    addCheck('Memory usage acceptable', data.data?.memory?.heapPercentage < 95,
      `${data.data?.memory?.heapPercentage}% heap usage`,
      data.data?.memory?.heapPercentage >= 90);

    if (data.data?.warnings?.length > 0) {
      data.data.warnings.forEach(w => log.warn(w));
    }
  } catch (error) {
    addCheck('Backend health endpoint', false, error.message);
  }
}

// SSE streaming validation
async function validateSSE() {
  log.section('SSE STREAMING VALIDATION');

  return new Promise((resolve) => {
    const eventSource = new EventSource('http://localhost:3001/api/streaming-ticker/stream');
    const events = [];
    let connectionEstablished = false;
    let heartbeatReceived = false;

    const timeout = setTimeout(() => {
      eventSource.close();
      addCheck('SSE connection timeout', false, 'Did not receive events within 10 seconds');
      resolve();
    }, 10000);

    eventSource.onopen = () => {
      connectionEstablished = true;
      log.info('SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        events.push(data);

        log.info(`Received SSE event: ${data.type} - ${data.data?.message || 'no message'}`);

        if (data.type === 'connected') {
          addCheck('SSE connection message', true, 'Received connection confirmation');
        }

        if (data.type === 'heartbeat') {
          heartbeatReceived = true;
          addCheck('SSE heartbeat received', true, 'Heartbeat mechanism working');
        }

        // If we've received enough events, finish
        if (events.length >= 5) {
          clearTimeout(timeout);
          eventSource.close();

          addCheck('SSE connection established', connectionEstablished);
          addCheck('SSE events received', events.length >= 3, `Received ${events.length} events`);

          resolve();
        }
      } catch (error) {
        log.error(`Error parsing SSE event: ${error.message}`);
      }
    };

    eventSource.onerror = (error) => {
      clearTimeout(timeout);
      eventSource.close();
      addCheck('SSE connection error', false, 'Connection error occurred');
      resolve();
    };
  });
}

// WebSocket validation using Socket.IO
async function validateWebSocket() {
  log.section('WEBSOCKET VALIDATION (Socket.IO)');

  return new Promise((resolve) => {
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    const timeout = setTimeout(() => {
      socket.close();
      addCheck('WebSocket connection timeout', false, 'Did not connect within 5 seconds');
      resolve();
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      log.info(`Socket.IO connected with transport: ${socket.io.engine.transport.name}`);
      addCheck('Socket.IO connection', true, `Transport: ${socket.io.engine.transport.name}`);

      // Listen for activity events
      socket.on('activity', (data) => {
        log.info(`Received activity event: ${JSON.stringify(data).substring(0, 100)}...`);
        addCheck('Socket.IO activity event', true, 'Received activity broadcast');
      });

      // Close after a short delay
      setTimeout(() => {
        socket.close();
        resolve();
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      addCheck('Socket.IO connection', false, error.message);
      socket.close();
      resolve();
    });
  });
}

// API endpoints validation
async function validateAPIEndpoints() {
  log.section('API ENDPOINTS VALIDATION');

  try {
    // Test streaming ticker history
    const historyResponse = await fetch('http://localhost:3001/api/streaming-ticker/history?limit=5');
    const historyData = await historyResponse.json();
    addCheck('SSE history endpoint', historyData.success, `${historyData.data?.length || 0} messages in history`);

    // Test posts endpoint
    try {
      const postsResponse = await fetch('http://localhost:3001/api/posts?limit=5');
      const postsData = await postsResponse.json();
      addCheck('Posts API endpoint', postsData.success !== false, `${postsData.data?.length || 0} posts available`);
    } catch (error) {
      addCheck('Posts API endpoint', false, error.message);
    }
  } catch (error) {
    addCheck('API endpoints', false, error.message);
  }
}

// Network inspection simulation
async function validateNetworkConnections() {
  log.section('NETWORK CONNECTIONS VALIDATION');

  try {
    // Check frontend is serving
    const frontendResponse = await fetch('http://localhost:5173');
    const frontendHtml = await frontendResponse.text();
    addCheck('Frontend serving', frontendHtml.includes('<title>'), 'Frontend HTML loaded');
    addCheck('Frontend title correct', frontendHtml.includes('Agent Feed'), 'Correct page title');

    // Check backend is responding
    const backendResponse = await fetch('http://localhost:3001/health');
    addCheck('Backend responding', backendResponse.ok, `Status: ${backendResponse.status}`);
  } catch (error) {
    addCheck('Network connections', false, error.message);
  }
}

// Main validation runner
async function runValidation() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║            100% REAL DATA VALIDATION - ZERO MOCKS                  ║
║                                                                    ║
║  Validating: Backend, Database, SSE, WebSocket, APIs, Frontend    ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Run all validations
  await validateDatabase();
  await validateBackend();
  await validateAPIEndpoints();
  await validateNetworkConnections();
  await validateSSE();
  await validateWebSocket();

  // Print summary
  log.section('VALIDATION SUMMARY');

  console.log(`
${colors.cyan}Results:${colors.reset}
  Total checks: ${results.total}
  ${colors.green}✓ Passed: ${results.passed}${colors.reset}
  ${colors.red}✗ Failed: ${results.failed}${colors.reset}
  ${colors.yellow}⚠ Warnings: ${results.warnings}${colors.reset}

${colors.cyan}Pass Rate: ${((results.passed / results.total) * 100).toFixed(1)}%${colors.reset}
`);

  // Detailed check results
  if (results.failed > 0) {
    console.log(`\n${colors.red}Failed Checks:${colors.reset}`);
    results.checks.filter(c => !c.passed && !c.isWarning).forEach(c => {
      console.log(`  ✗ ${c.name}: ${c.message}`);
    });
  }

  if (results.warnings > 0) {
    console.log(`\n${colors.yellow}Warnings:${colors.reset}`);
    results.checks.filter(c => c.isWarning).forEach(c => {
      console.log(`  ⚠ ${c.name}: ${c.message}`);
    });
  }

  // Exit code
  const exitCode = results.failed === 0 ? 0 : 1;

  console.log(`
${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}
${exitCode === 0 ? colors.green + '✓ VALIDATION PASSED - System is healthy!' : colors.red + '✗ VALIDATION FAILED - Issues detected'}${colors.reset}
${colors.cyan}═══════════════════════════════════════════════════════════════════${colors.reset}
`);

  process.exit(exitCode);
}

// Run validation
runValidation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
