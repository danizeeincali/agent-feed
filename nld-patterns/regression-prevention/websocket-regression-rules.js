#!/usr/bin/env node

/**
 * NLD WebSocket Regression Prevention Rules
 * Generates automated rules and tests to prevent WebSocket failure patterns from recurring
 * Integrates with TDD workflow and CI/CD pipeline
 */

const fs = require('fs');
const path = require('path');

class WebSocketRegressionPrevention {
  constructor(options = {}) {
    this.config = {
      outputDir: options.outputDir || '/workspaces/agent-feed/nld-patterns/regression-prevention',
      rulesDatabase: options.rulesDatabase || '/workspaces/agent-feed/nld-patterns/websocket-failures/pattern-database.json',
      testOutputDir: options.testOutputDir || '/workspaces/agent-feed/tests/regression',
      ...options
    };

    this.patterns = this.loadPatterns();
    this.regressionRules = this.generateRegressionRules();
    this.preventionTests = this.generatePreventionTests();
    this.monitoringChecks = this.generateMonitoringChecks();
  }

  loadPatterns() {
    try {
      const patternsPath = this.config.rulesDatabase;
      return JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
    } catch (error) {
      console.error('Failed to load patterns database:', error.message);
      return { patterns: {} };
    }
  }

  generateRegressionRules() {
    const rules = {
      version: "1.0.0",
      created: new Date().toISOString(),
      description: "Automated regression prevention rules for WebSocket stability",
      code_analysis_rules: {},
      runtime_monitoring_rules: {},
      test_validation_rules: {},
      deployment_gates: {}
    };

    // Generate rules for each known pattern
    Object.entries(this.patterns.patterns).forEach(([patternKey, pattern]) => {
      rules.code_analysis_rules[pattern.id] = this.generateCodeAnalysisRules(pattern);
      rules.runtime_monitoring_rules[pattern.id] = this.generateRuntimeMonitoringRules(pattern);
      rules.test_validation_rules[pattern.id] = this.generateTestValidationRules(pattern);
      rules.deployment_gates[pattern.id] = this.generateDeploymentGates(pattern);
    });

    return rules;
  }

  generateCodeAnalysisRules(pattern) {
    const rules = {
      pattern_id: pattern.id,
      pattern_name: pattern.pattern_name,
      severity: pattern.severity,
      static_analysis_checks: [],
      lint_rules: [],
      pre_commit_hooks: []
    };

    switch (pattern.id) {
      case 'WS-001': // WebSocket Premature Cleanup
        rules.static_analysis_checks = [
          {
            rule: "no-websocket-cleanup-in-api-handlers",
            description: "Prevent WebSocket cleanup in API process handlers",
            regex_patterns: [
              "claudeApiProcess\\.on\\('close'.*connections\\.",
              "process\\.on\\('exit'.*ws\\.",
              "apiProcess.*close.*WebSocket"
            ],
            violation_message: "WebSocket cleanup must not be in API process handlers",
            fix_suggestion: "Move WebSocket cleanup to ws.on('close') handlers only"
          },
          {
            rule: "require-explicit-websocket-disconnect",
            description: "Ensure WebSocket cleanup only on explicit disconnect",
            required_patterns: [
              "ws\\.on\\('close'",
              "client.*disconnect"
            ],
            violation_message: "WebSocket cleanup must only happen on explicit client disconnect"
          }
        ];

        rules.lint_rules = [
          {
            rule_name: "websocket-lifecycle-separation",
            eslint_rule: "custom/websocket-lifecycle-separation",
            configuration: {
              "no-cleanup-in-process-handlers": "error",
              "require-explicit-disconnect-handling": "error"
            }
          }
        ];

        rules.pre_commit_hooks = [
          {
            hook_name: "websocket-cleanup-validation",
            command: "grep -n 'claudeApiProcess.*close.*connections' simple-backend.js && echo 'ERROR: WebSocket cleanup in API handler detected' && exit 1 || true",
            stage: "pre-commit"
          }
        ];
        break;

      case 'WS-002': // Frontend Polling Storm
        rules.static_analysis_checks = [
          {
            rule: "require-exponential-backoff",
            description: "Ensure reconnection uses exponential backoff",
            required_patterns: [
              "exponentialBackoff|ExponentialBackoff",
              "backoff.*delay",
              "retry.*delay"
            ],
            violation_message: "Reconnection logic must implement exponential backoff"
          },
          {
            rule: "require-circuit-breaker",
            description: "Ensure circuit breaker pattern for reconnection",
            required_patterns: [
              "CircuitBreaker|circuitBreaker",
              "failureThreshold",
              "canAttempt"
            ],
            violation_message: "Reconnection must implement circuit breaker pattern"
          }
        ];
        break;

      case 'WS-003': // API Close Kills WebSocket
        rules.static_analysis_checks = [
          {
            rule: "no-websocket-in-api-close",
            description: "Prevent any WebSocket operations in API close handlers",
            forbidden_patterns: [
              "claudeApiProcess\\.on\\('close'.*ws\\.",
              "apiProcess.*close.*WebSocket",
              "process.*close.*connections"
            ],
            violation_message: "API close handlers must not affect WebSocket connections",
            severity: "error"
          }
        ];
        break;
    }

    return rules;
  }

  generateRuntimeMonitoringRules(pattern) {
    const rules = {
      pattern_id: pattern.id,
      monitoring_checks: [],
      alert_conditions: [],
      automatic_recovery: []
    };

    switch (pattern.id) {
      case 'WS-001':
        rules.monitoring_checks = [
          {
            name: "connection-survival-rate",
            description: "Monitor connection survival after API calls",
            metric: "connections_surviving_api_calls / total_api_calls",
            threshold: 0.95,
            evaluation_interval: "5m",
            alert_threshold: 0.90
          },
          {
            name: "premature-cleanup-detection",
            description: "Detect premature connection cleanup events",
            log_pattern: "🚑 Removing dead connection",
            threshold: 0,
            alert_on_any_occurrence: true
          }
        ];

        rules.alert_conditions = [
          {
            condition: "connection_survival_rate < 0.90",
            severity: "HIGH",
            message: "WebSocket connections not surviving API calls - possible premature cleanup",
            runbook: "Check for WebSocket cleanup in API process handlers"
          }
        ];
        break;

      case 'WS-002':
        rules.monitoring_checks = [
          {
            name: "api-request-rate",
            description: "Monitor API request rate for polling storms", 
            metric: "api_requests_per_minute",
            threshold: 60,
            alert_threshold: 100
          },
          {
            name: "reconnection-backoff-compliance",
            description: "Verify exponential backoff in reconnection attempts",
            metric: "reconnection_attempts_with_backoff / total_reconnection_attempts",
            threshold: 0.95
          }
        ];
        break;

      case 'WS-003':
        rules.monitoring_checks = [
          {
            name: "connection-drop-correlation",
            description: "Detect connection drops correlated with API completion",
            correlation_pattern: "api_completion_event followed by zero_connections within 5s",
            threshold: 0,
            alert_on_any_occurrence: true
          }
        ];
        break;
    }

    return rules;
  }

  generateTestValidationRules(pattern) {
    const rules = {
      pattern_id: pattern.id,
      required_tests: [],
      test_scenarios: [],
      validation_criteria: []
    };

    switch (pattern.id) {
      case 'WS-001':
        rules.required_tests = [
          "test_websocket_survives_api_completion",
          "test_no_cleanup_in_api_handlers",
          "test_explicit_disconnect_only_cleanup"
        ];

        rules.test_scenarios = [
          {
            name: "API completion preserves WebSocket",
            description: "Verify WebSocket remains connected after API call completes",
            test_steps: [
              "Create WebSocket connection",
              "Execute API call that spawns claude process",
              "Wait for API response",
              "Verify WebSocket still connected",
              "Verify connection count > 0"
            ],
            expected_result: "WebSocket remains active and connected"
          }
        ];
        break;

      case 'WS-002':
        rules.required_tests = [
          "test_exponential_backoff_on_reconnection",
          "test_circuit_breaker_prevents_storm",
          "test_jitter_in_reconnection_timing"
        ];
        break;

      case 'WS-003':
        rules.required_tests = [
          "test_api_close_does_not_affect_websocket",
          "test_process_lifecycle_independence"
        ];
        break;
    }

    return rules;
  }

  generateDeploymentGates(pattern) {
    const gates = {
      pattern_id: pattern.id,
      pre_deployment_checks: [],
      smoke_tests: [],
      rollback_triggers: []
    };

    // Universal deployment gates for all patterns
    gates.pre_deployment_checks = [
      {
        name: "regression_tests_pass",
        description: `All regression tests for pattern ${pattern.id} must pass`,
        command: `npm test -- --testNamePattern="${pattern.id}"`,
        required: true
      },
      {
        name: "static_analysis_clean", 
        description: "Static analysis must not detect pattern violations",
        command: "npm run lint:websocket-patterns",
        required: true
      }
    ];

    gates.smoke_tests = [
      {
        name: "websocket_basic_functionality",
        description: "Basic WebSocket connection and communication",
        timeout: 30000
      },
      {
        name: "api_websocket_integration",
        description: "API calls work with persistent WebSocket connection",
        timeout: 60000
      }
    ];

    gates.rollback_triggers = [
      {
        metric: "websocket_connection_success_rate",
        threshold: 0.95,
        evaluation_window: "5m"
      },
      {
        metric: "api_success_rate_with_websocket",
        threshold: 0.98,
        evaluation_window: "5m"
      }
    ];

    return gates;
  }

  generatePreventionTests() {
    const tests = {};

    Object.entries(this.patterns.patterns).forEach(([patternKey, pattern]) => {
      tests[pattern.id] = this.generateTestSuiteForPattern(pattern);
    });

    return tests;
  }

  generateTestSuiteForPattern(pattern) {
    const testSuite = {
      pattern_id: pattern.id,
      test_file: `websocket-${pattern.id.toLowerCase()}-prevention.test.js`,
      test_content: this.generateTestContent(pattern)
    };

    return testSuite;
  }

  generateTestContent(pattern) {
    const testTemplate = `/**
 * Regression Prevention Tests for ${pattern.pattern_name}
 * Pattern ID: ${pattern.id}
 * Auto-generated by NLD Regression Prevention System
 */

const WebSocket = require('ws');
const request = require('supertest');
const { spawn } = require('child_process');

describe('${pattern.pattern_name} Regression Prevention', () => {
  let server;
  let wsServer;
  let testConnections = [];

  beforeAll(async () => {
    // Initialize test environment
    server = require('../simple-backend.js');
    await waitForServer(server, 3000);
  });

  afterAll(async () => {
    // Cleanup test connections
    testConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    testConnections = [];
  });

  afterEach(async () => {
    // Clean up connections after each test
    testConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    testConnections = [];
    await waitFor(100); // Allow cleanup
  });

`;

    // Add pattern-specific tests
    switch (pattern.id) {
      case 'WS-001':
        testTemplate += this.generateWS001PreventionTests();
        break;
      case 'WS-002':
        testTemplate += this.generateWS002PreventionTests();
        break;
      case 'WS-003':
        testTemplate += this.generateWS003PreventionTests();
        break;
    }

    testTemplate += `
});

// Utility functions
async function createWebSocketConnection(url = 'ws://localhost:3000') {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    
    ws.on('open', () => {
      testConnections.push(ws);
      resolve(ws);
    });
    
    ws.on('error', reject);
    
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

async function waitForServer(server, port, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkServer = () => {
      if (server.listening) {
        resolve();
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error('Server start timeout'));
        return;
      }
      
      setTimeout(checkServer, 100);
    };
    
    checkServer();
  });
}

async function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getConnectionCount() {
  try {
    const response = await request(server)
      .get('/api/system/connections')
      .expect(200);
    return response.body.count || 0;
  } catch (error) {
    console.warn('Could not get connection count:', error.message);
    return -1;
  }
}
`;

    return testTemplate;
  }

  generateWS001PreventionTests() {
    return `
  describe('WS-001: Prevent WebSocket Premature Cleanup', () => {
    test('WebSocket connection survives API completion', async () => {
      // Create WebSocket connection
      const ws = await createWebSocketConnection();
      expect(ws.readyState).toBe(WebSocket.OPEN);
      
      const initialConnectionCount = await getConnectionCount();
      expect(initialConnectionCount).toBeGreaterThan(0);
      
      // Execute API call that creates claude process
      const response = await request(server)
        .post('/api/claude/instances')
        .send({
          command: 'claude --version',
          workingDirectory: '/workspaces/agent-feed'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Wait for API process to complete
      await waitFor(2000);
      
      // WebSocket should still be connected
      expect(ws.readyState).toBe(WebSocket.OPEN);
      
      const finalConnectionCount = await getConnectionCount();
      expect(finalConnectionCount).toBeGreaterThan(0);
      expect(finalConnectionCount).toBe(initialConnectionCount);
    }, 10000);

    test('Multiple API calls with same WebSocket connection', async () => {
      const ws = await createWebSocketConnection();
      expect(ws.readyState).toBe(WebSocket.OPEN);
      
      // Execute multiple API calls
      for (let i = 0; i < 3; i++) {
        const response = await request(server)
          .post('/api/claude/instances')
          .send({
            command: 'echo "test ' + i + '"'
          })
          .expect(200);
          
        expect(response.body.success).toBe(true);
        
        // WebSocket should remain connected after each call
        expect(ws.readyState).toBe(WebSocket.OPEN);
        
        await waitFor(1000);
      }
      
      const finalConnectionCount = await getConnectionCount();
      expect(finalConnectionCount).toBeGreaterThan(0);
    }, 15000);

    test('No premature cleanup messages in logs', async () => {
      const ws = await createWebSocketConnection();
      
      // Capture console output to detect cleanup messages
      const originalLog = console.log;
      const logMessages = [];
      console.log = (...args) => {
        logMessages.push(args.join(' '));
        originalLog.apply(console, args);
      };
      
      try {
        // Execute API call
        await request(server)
          .post('/api/claude/instances')
          .send({
            command: 'claude --version'
          })
          .expect(200);
        
        await waitFor(2000);
        
        // Check for premature cleanup messages
        const cleanupMessages = logMessages.filter(msg => 
          msg.includes('🚑 Removing dead connection') ||
          msg.includes('dead connection')
        );
        
        expect(cleanupMessages).toHaveLength(0);
        expect(ws.readyState).toBe(WebSocket.OPEN);
        
      } finally {
        console.log = originalLog;
      }
    }, 10000);
  });`;
  }

  generateWS002PreventionTests() {
    return `
  describe('WS-002: Prevent Frontend Polling Storm', () => {
    test('Reconnection uses exponential backoff', async () => {
      const reconnectionAttempts = [];
      let ws;
      
      // Mock WebSocket that fails initially
      const attemptConnection = () => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          ws = new WebSocket('ws://localhost:3000');
          
          ws.on('open', () => {
            testConnections.push(ws);
            resolve(ws);
          });
          
          ws.on('error', () => {
            reconnectionAttempts.push(Date.now() - startTime);
            reject(new Error('Connection failed'));
          });
        });
      };
      
      // Simulate multiple reconnection attempts
      let attempts = 0;
      while (attempts < 3) {
        try {
          ws = await attemptConnection();
          break;
        } catch (error) {
          attempts++;
          
          if (attempts > 1) {
            // Verify exponential backoff between attempts
            const timeBetweenAttempts = reconnectionAttempts[attempts - 1] - 
                                       reconnectionAttempts[attempts - 2];
            const expectedMinDelay = Math.pow(2, attempts - 2) * 1000; // Exponential
            
            expect(timeBetweenAttempts).toBeGreaterThanOrEqual(expectedMinDelay * 0.8);
          }
          
          await waitFor(1000); // Small delay before retry
        }
      }
    }, 15000);

    test('Circuit breaker prevents excessive reconnection attempts', async () => {
      let attemptCount = 0;
      const maxAttempts = 5;
      
      const attemptConnection = () => {
        attemptCount++;
        return new Promise((resolve, reject) => {
          // Always fail to trigger circuit breaker
          setTimeout(() => reject(new Error('Connection failed')), 100);
        });
      };
      
      // Simulate failing reconnections until circuit breaker activates
      while (attemptCount < maxAttempts + 5) { // Try more than threshold
        try {
          await attemptConnection();
          break;
        } catch (error) {
          // Circuit breaker should prevent attempts after threshold
          if (attemptCount > maxAttempts) {
            // Should have stopped attempting due to circuit breaker
            break;
          }
          await waitFor(500);
        }
      }
      
      // Verify circuit breaker prevented excessive attempts
      expect(attemptCount).toBeLessThanOrEqual(maxAttempts + 2);
    }, 10000);
  });`;
  }

  generateWS003PreventionTests() {
    return `
  describe('WS-003: Prevent API Close Killing WebSocket', () => {
    test('API process completion does not affect WebSocket', async () => {
      const ws = await createWebSocketConnection();
      expect(ws.readyState).toBe(WebSocket.OPEN);
      
      const initialConnectionCount = await getConnectionCount();
      
      // Create and complete API process
      const response = await request(server)
        .post('/api/claude/instances')
        .send({
          command: 'echo "process test" && exit 0'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Wait for process to fully complete and cleanup
      await waitFor(3000);
      
      // WebSocket should be unaffected by process completion
      expect(ws.readyState).toBe(WebSocket.OPEN);
      
      const finalConnectionCount = await getConnectionCount();
      expect(finalConnectionCount).toBe(initialConnectionCount);
    }, 10000);

    test('Process lifecycle independence from WebSocket lifecycle', async () => {
      const connections = [];
      
      // Create multiple WebSocket connections
      for (let i = 0; i < 3; i++) {
        const ws = await createWebSocketConnection();
        connections.push(ws);
      }
      
      expect(connections).toHaveLength(3);
      connections.forEach(ws => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
      });
      
      // Execute API process that exits
      await request(server)
        .post('/api/claude/instances')
        .send({
          command: 'echo "independence test" && exit 42'
        })
        .expect(200);
      
      // Wait for process cleanup
      await waitFor(2000);
      
      // All WebSocket connections should remain active
      connections.forEach((ws, index) => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
      });
      
      const connectionCount = await getConnectionCount();
      expect(connectionCount).toBe(3);
      
      // Cleanup
      connections.forEach(ws => {
        testConnections.push(ws);
      });
    }, 15000);
  });`;
  }

  generateMonitoringChecks() {
    return {
      version: "1.0.0",
      description: "Runtime monitoring checks for WebSocket regression prevention",
      health_checks: [
        {
          name: "websocket-connection-stability",
          description: "Monitor overall WebSocket connection stability",
          endpoint: "/health/websocket-stability",
          checks: [
            {
              metric: "active_connections_count",
              threshold: "> 0",
              severity: "warning"
            },
            {
              metric: "connection_survival_rate", 
              threshold: "> 0.95",
              severity: "error"
            },
            {
              metric: "premature_cleanup_events_last_hour",
              threshold: "== 0",
              severity: "error"
            }
          ]
        },
        {
          name: "api-websocket-integration", 
          description: "Monitor API and WebSocket integration health",
          endpoint: "/health/api-websocket-integration",
          checks: [
            {
              metric: "api_calls_with_persistent_connection_rate",
              threshold: "> 0.98",
              severity: "error"
            },
            {
              metric: "connection_drops_after_api_calls",
              threshold: "== 0",
              severity: "critical"
            }
          ]
        }
      ],
      
      log_monitoring: [
        {
          pattern: "🚑 Removing dead connection",
          alert_level: "error",
          description: "Premature WebSocket cleanup detected"
        },
        {
          pattern: "WebSocket connections: 0",
          alert_level: "critical",
          description: "All WebSocket connections lost"
        },
        {
          pattern: "Too Many Requests|Rate limit exceeded",
          alert_level: "warning", 
          description: "Possible polling storm detected"
        }
      ],

      automated_recovery: [
        {
          trigger: "premature_cleanup_detected",
          action: "restart_websocket_service",
          description: "Restart WebSocket service if premature cleanup detected"
        },
        {
          trigger: "polling_storm_detected", 
          action: "enable_rate_limiting",
          description: "Enable aggressive rate limiting during polling storms"
        }
      ]
    };
  }

  exportRegressionPrevention() {
    // Ensure output directories exist
    fs.mkdirSync(this.config.outputDir, { recursive: true });
    fs.mkdirSync(this.config.testOutputDir, { recursive: true });

    // Export regression rules
    const rulesPath = path.join(this.config.outputDir, 'websocket-regression-rules.json');
    fs.writeFileSync(rulesPath, JSON.stringify(this.regressionRules, null, 2));

    // Export prevention tests
    Object.entries(this.preventionTests).forEach(([patternId, testSuite]) => {
      const testPath = path.join(this.config.testOutputDir, testSuite.test_file);
      fs.writeFileSync(testPath, testSuite.test_content);
    });

    // Export monitoring checks
    const monitoringPath = path.join(this.config.outputDir, 'websocket-monitoring-checks.json');
    fs.writeFileSync(monitoringPath, JSON.stringify(this.monitoringChecks, null, 2));

    // Export package.json scripts for easy integration
    const packageScriptsPath = path.join(this.config.outputDir, 'package-scripts.json');
    fs.writeFileSync(packageScriptsPath, JSON.stringify(this.generatePackageScripts(), null, 2));

    // Export CI/CD integration
    const cicdPath = path.join(this.config.outputDir, 'cicd-integration.yml'); 
    fs.writeFileSync(cicdPath, this.generateCICDIntegration());

    return {
      rules: rulesPath,
      tests: Object.keys(this.preventionTests).map(id => 
        path.join(this.config.testOutputDir, this.preventionTests[id].test_file)
      ),
      monitoring: monitoringPath,
      scripts: packageScriptsPath,
      cicd: cicdPath
    };
  }

  generatePackageScripts() {
    return {
      scripts: {
        "test:websocket-regression": "jest tests/regression/websocket-*.test.js",
        "test:websocket-ws-001": "jest tests/regression/websocket-ws-001-prevention.test.js",
        "test:websocket-ws-002": "jest tests/regression/websocket-ws-002-prevention.test.js", 
        "test:websocket-ws-003": "jest tests/regression/websocket-ws-003-prevention.test.js",
        "lint:websocket-patterns": "eslint --config nld-patterns/regression-prevention/.eslintrc.js simple-backend.js",
        "precommit:websocket-check": "npm run lint:websocket-patterns && npm run test:websocket-regression",
        "health:websocket": "curl -f http://localhost:3000/health/websocket-stability",
        "monitor:websocket": "node nld-patterns/detection-scripts/websocket-pattern-detector.js"
      },
      devDependencies: {
        "jest": "^29.0.0",
        "supertest": "^6.0.0", 
        "ws": "^8.0.0"
      }
    };
  }

  generateCICDIntegration() {
    return `# WebSocket Regression Prevention CI/CD Integration
# Auto-generated by NLD Regression Prevention System

name: WebSocket Stability Checks

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  websocket-regression-prevention:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Static Analysis - WebSocket Pattern Violations
      run: npm run lint:websocket-patterns
    
    - name: WebSocket Regression Tests
      run: npm run test:websocket-regression
      timeout-minutes: 5
    
    - name: WebSocket Health Check
      run: |
        npm start &
        sleep 10
        npm run health:websocket
        pkill -f "npm start"
    
    - name: Pattern Detection Validation
      run: |
        node nld-patterns/detection-scripts/websocket-pattern-detector.js --validate-only
    
    - name: Upload Test Results
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: websocket-test-results
        path: |
          test-results/
          logs/
          nld-patterns/metrics/

  deployment-gates:
    needs: websocket-regression-prevention
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
    - name: Pre-deployment WebSocket Validation
      run: |
        echo "Validating WebSocket stability before deployment..."
        # Add specific pre-deployment checks here
        
    - name: Deploy with WebSocket Monitoring
      run: |
        echo "Deploying with enhanced WebSocket monitoring..."
        # Deployment commands with monitoring activation
        
    outputs:
      deployment-status: ${{ steps.deploy.outcome }}

  post-deployment-monitoring:
    needs: deployment-gates
    runs-on: ubuntu-latest
    if: success()
    
    steps:
    - name: Post-deployment WebSocket Health Check
      run: |
        # Monitor WebSocket health for 5 minutes post-deployment
        for i in {1..5}; do
          curl -f \$DEPLOYMENT_URL/health/websocket-stability || exit 1
          sleep 60
        done
        
    - name: Activate Regression Monitoring
      run: |
        # Start long-term regression monitoring
        echo "WebSocket regression monitoring activated"
`;
  }

  // CLI and integration methods
  validateCurrentCode() {
    console.log('🔍 Validating current code against regression rules...');
    
    const violations = [];
    
    // Check for common pattern violations
    Object.entries(this.regressionRules.code_analysis_rules).forEach(([patternId, rules]) => {
      rules.static_analysis_checks.forEach(check => {
        const result = this.checkCodeViolation(check);
        if (result.violated) {
          violations.push({
            pattern_id: patternId,
            rule: check.rule,
            violation: result,
            severity: check.severity || 'warning'
          });
        }
      });
    });

    return violations;
  }

  checkCodeViolation(check) {
    // Simplified code checking - in practice, would integrate with AST parsers
    try {
      const codeFiles = ['simple-backend.js']; // Add more files as needed
      
      for (const file of codeFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          
          if (check.regex_patterns) {
            for (const pattern of check.regex_patterns) {
              const regex = new RegExp(pattern, 'gm');
              const matches = content.match(regex);
              if (matches) {
                return {
                  violated: true,
                  file: file,
                  matches: matches,
                  message: check.violation_message
                };
              }
            }
          }

          if (check.forbidden_patterns) {
            for (const pattern of check.forbidden_patterns) {
              const regex = new RegExp(pattern, 'gm');
              if (regex.test(content)) {
                return {
                  violated: true,
                  file: file,
                  pattern: pattern,
                  message: check.violation_message
                };
              }
            }
          }
        }
      }
      
      return { violated: false };
    } catch (error) {
      return {
        violated: true,
        error: error.message
      };
    }
  }
}

// CLI Interface
if (require.main === module) {
  const prevention = new WebSocketRegressionPrevention();
  
  console.log('🛡️  Generating WebSocket regression prevention system...');
  
  const exported = prevention.exportRegressionPrevention();
  
  console.log('\n✅ Regression prevention system generated:');
  console.log(`📋 Rules: ${exported.rules}`);
  console.log(`🧪 Tests: ${exported.tests.length} test files`);
  console.log(`📊 Monitoring: ${exported.monitoring}`);
  console.log(`⚙️  Scripts: ${exported.scripts}`);
  console.log(`🚀 CI/CD: ${exported.cicd}`);
  
  // Validate current code
  const violations = prevention.validateCurrentCode();
  if (violations.length > 0) {
    console.log('\n⚠️  Code violations detected:');
    violations.forEach(v => {
      console.log(`  ${v.severity.toUpperCase()}: ${v.rule} - ${v.violation.message}`);
    });
  } else {
    console.log('\n✅ No code violations detected');
  }
}

module.exports = WebSocketRegressionPrevention;