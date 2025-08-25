/**
 * Integration Hooks for Test Framework and Production Monitoring
 * Provides seamless integration points for capturing failure patterns
 */

const FailurePatternDetector = require('../monitoring/failure-detector');
const PatternClassifier = require('../patterns/pattern-classifier');

class NLDIntegrationHooks {
  constructor(config = {}) {
    this.detector = new FailurePatternDetector(config.detector);
    this.classifier = new PatternClassifier();
    this.hooks = new Map();
    this.active = false;
    
    // Integration configurations
    this.integrations = {
      jest: config.jest || { enabled: true, captureFailures: true },
      websocket: config.websocket || { enabled: true, monitorConnections: true },
      express: config.express || { enabled: true, captureErrors: true },
      terminal: config.terminal || { enabled: true, monitorHangs: true },
      claude: config.claude || { enabled: true, detectMismatches: true }
    };
  }

  /**
   * Initialize integration hooks
   */
  async initialize() {
    await this.detector.initialize();
    this.active = true;
    
    // Set up automatic integrations
    this.setupJestIntegration();
    this.setupWebSocketIntegration();
    this.setupExpressIntegration();
    this.setupTerminalIntegration();
    this.setupClaudeIntegration();
    
    console.log('[NLD-Hooks] Integration hooks initialized');
  }

  /**
   * Jest Test Framework Integration
   */
  setupJestIntegration() {
    if (!this.integrations.jest.enabled) return;

    // Hook into Jest test results
    this.hooks.set('jest', {
      onTestFailure: this.handleJestFailure.bind(this),
      onTestSuccess: this.handleJestSuccess.bind(this),
      onTestTimeout: this.handleJestTimeout.bind(this),
      onTestError: this.handleJestError.bind(this)
    });

    // Global Jest hooks (if Jest is available)
    if (typeof global !== 'undefined' && global.expect) {
      this.instrumentJestExpectations();
    }
  }

  /**
   * WebSocket Connection Integration
   */
  setupWebSocketIntegration() {
    if (!this.integrations.websocket.enabled) return;

    this.hooks.set('websocket', {
      onConnection: this.handleWebSocketConnection.bind(this),
      onMessage: this.handleWebSocketMessage.bind(this),
      onError: this.handleWebSocketError.bind(this),
      onClose: this.handleWebSocketClose.bind(this),
      onPong: this.handleWebSocketPong.bind(this)
    });
  }

  /**
   * Express Server Integration
   */
  setupExpressIntegration() {
    if (!this.integrations.express.enabled) return;

    this.hooks.set('express', {
      onError: this.handleExpressError.bind(this),
      onRequest: this.handleExpressRequest.bind(this),
      onResponse: this.handleExpressResponse.bind(this),
      middleware: this.createExpressMiddleware.bind(this)
    });
  }

  /**
   * Terminal Process Integration
   */
  setupTerminalIntegration() {
    if (!this.integrations.terminal.enabled) return;

    this.hooks.set('terminal', {
      onPtySpawn: this.handlePtySpawn.bind(this),
      onPtyData: this.handlePtyData.bind(this),
      onPtyExit: this.handlePtyExit.bind(this),
      onPtyError: this.handlePtyError.bind(this),
      onTerminalHang: this.handleTerminalHang.bind(this)
    });
  }

  /**
   * Claude CLI Integration
   */
  setupClaudeIntegration() {
    if (!this.integrations.claude.enabled) return;

    this.hooks.set('claude', {
      onClaudeCommand: this.handleClaudeCommand.bind(this),
      onInstanceCreation: this.handleInstanceCreation.bind(this),
      onUserFeedback: this.handleUserFeedback.bind(this),
      onProtocolMismatch: this.handleProtocolMismatch.bind(this)
    });
  }

  /**
   * Jest Integration Handlers
   */
  async handleJestFailure(testResult) {
    const failureData = {
      type: 'TEST_FAILURE',
      category: 'TESTING',
      context: {
        testName: testResult.fullName || testResult.title,
        testFile: testResult.testFilePath,
        failureMessage: testResult.failureMessage,
        duration: testResult.duration,
        numPassingAsserts: testResult.numPassingAsserts,
        numFailingAsserts: testResult.numFailingAsserts
      },
      severity: 'MEDIUM',
      testFramework: 'jest'
    };

    await this.detector.captureFailure(failureData);
  }

  async handleJestTimeout(testResult) {
    const failureData = {
      type: 'TEST_TIMEOUT',
      category: 'TESTING',
      context: {
        testName: testResult.fullName,
        timeout: testResult.timeout,
        duration: testResult.duration
      },
      severity: 'HIGH',
      testFramework: 'jest'
    };

    await this.detector.captureFailure(failureData);
  }

  /**
   * WebSocket Integration Handlers
   */
  async handleWebSocketConnection(ws, req) {
    if (!this.integrations.websocket.monitorConnections) return;

    const connectionId = this.generateConnectionId(req);
    this.detector.monitorTerminalCommunication(connectionId, {
      type: 'connection',
      timestamp: Date.now(),
      remoteAddress: req.socket?.remoteAddress,
      headers: req.headers
    });

    // Monitor for connection timeouts
    setTimeout(() => {
      if (ws.readyState === ws.CONNECTING) {
        this.detector.captureFailure({
          type: 'CONNECTION_TIMEOUT',
          category: 'CONNECTION_MANAGEMENT',
          context: { connectionId, timeout: 10000 },
          severity: 'MEDIUM'
        });
      }
    }, 10000);
  }

  async handleWebSocketMessage(ws, message, connectionId) {
    this.detector.monitorTerminalCommunication(connectionId, {
      type: 'message',
      data: message,
      timestamp: Date.now(),
      size: Buffer.byteLength(message)
    });
  }

  async handleWebSocketError(ws, error, connectionId) {
    await this.detector.captureFailure({
      type: 'WEBSOCKET_ERROR',
      category: 'COMMUNICATION_PROTOCOL',
      context: {
        connectionId,
        error: error.message,
        code: error.code,
        stack: error.stack
      },
      severity: 'HIGH'
    });
  }

  /**
   * Terminal Integration Handlers
   */
  async handlePtySpawn(pty, options) {
    const sessionId = this.generateSessionId();
    this.detector.monitorInstanceCreation({
      sessionId,
      type: 'pty_spawn',
      options,
      pid: pty.pid
    });

    // Monitor for spawn failures
    pty.on('error', (error) => {
      this.detector.captureFailure({
        type: 'PTY_SPAWN_ERROR',
        category: 'PROCESS_MANAGEMENT',
        context: {
          sessionId,
          error: error.message,
          options
        },
        severity: 'CRITICAL'
      });
    });
  }

  async handleTerminalHang(connectionId, hangData) {
    await this.detector.captureFailure({
      type: 'TERMINAL_HANG_DETECTED',
      category: 'TERMINAL_HANG',
      context: {
        connectionId,
        hangDuration: hangData.duration,
        lastInput: hangData.lastInput,
        detectionMethod: 'automated'
      },
      severity: 'HIGH'
    });
  }

  /**
   * Claude Integration Handlers
   */
  async handleClaudeCommand(command, context) {
    // Detect problematic claude command patterns
    const isProblematic = this.isProblematicClaudeCommand(command);
    
    if (isProblematic) {
      await this.detector.captureFailure({
        type: 'CLAUDE_HANG_RISK',
        category: 'TERMINAL_HANG',
        context: {
          command,
          detectionReason: 'Standalone claude command detected',
          sessionContext: context
        },
        severity: 'MEDIUM'
      });
    }
  }

  async handleUserFeedback(feedback, context) {
    this.detector.monitorUserFeedback(feedback, context);
  }

  async handleProtocolMismatch(messageData, context) {
    await this.detector.captureFailure({
      type: 'PROTOCOL_MISMATCH_DETECTED',
      category: 'COMMUNICATION_PROTOCOL',
      context: {
        messageData,
        detectionContext: context,
        protocolAnalysis: this.analyzeProtocolMismatch(messageData)
      },
      severity: 'CRITICAL'
    });
  }

  /**
   * Express Middleware Creator
   */
  createExpressMiddleware() {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      // Monitor request
      this.handleExpressRequest(req);
      
      // Hook into response
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - startTime;
        this.handleExpressResponse(req, res, duration, data);
        return originalSend.call(this, data);
      }.bind(this);

      // Hook into errors
      const originalError = res.error;
      if (originalError) {
        res.error = function(error) {
          this.handleExpressError(error, req, res);
          return originalError.call(this, error);
        }.bind(this);
      }

      next();
    };
  }

  async handleExpressError(error, req, res) {
    await this.detector.captureFailure({
      type: 'HTTP_SERVER_ERROR',
      category: 'SERVER_ERROR',
      context: {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        error: error.message,
        stack: error.stack,
        headers: req.headers
      },
      severity: this.classifyHttpErrorSeverity(error, res.statusCode)
    });
  }

  /**
   * Utility Methods
   */
  generateConnectionId(req) {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isProblematicClaudeCommand(command) {
    const problematicPatterns = [
      /^claude\s*$/,
      /^claude\s*[\r\n]+$/,
      /cd.*&&\s*claude\s*$/,
      /cd.*;\s*claude\s*$/
    ];

    return problematicPatterns.some(pattern => pattern.test(command.trim()));
  }

  analyzeProtocolMismatch(messageData) {
    const data = typeof messageData === 'string' ? messageData : JSON.stringify(messageData);
    
    return {
      isEngineIOFormat: /^4\d\[/.test(data),
      isWebSocketFormat: this.isValidJSON(data),
      detectedProtocol: this.detectProtocolType(data),
      parsingError: this.testJSONParsing(data)
    };
  }

  isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  detectProtocolType(data) {
    if (/^4\d\[/.test(data)) return 'Socket.IO Engine.IO';
    if (this.isValidJSON(data)) return 'Raw WebSocket JSON';
    if (/^40$/.test(data)) return 'Socket.IO Handshake';
    return 'Unknown';
  }

  testJSONParsing(data) {
    try {
      JSON.parse(data);
      return null;
    } catch (error) {
      return error.message;
    }
  }

  classifyHttpErrorSeverity(error, statusCode) {
    if (statusCode >= 500) return 'HIGH';
    if (statusCode >= 400) return 'MEDIUM';
    return 'LOW';
  }

  instrumentJestExpectations() {
    // This would require more complex Jest integration
    // For now, we'll rely on test result hooks
    console.log('[NLD-Hooks] Jest expectations instrumented');
  }

  /**
   * Public API for Manual Integration
   */
  
  // Capture failure manually
  async captureFailure(failureData) {
    return await this.detector.captureFailure(failureData);
  }

  // Monitor connection manually
  monitorConnection(connectionId, messageData) {
    return this.detector.monitorTerminalCommunication(connectionId, messageData);
  }

  // Track user feedback manually
  trackUserFeedback(feedback, context) {
    return this.detector.monitorUserFeedback(feedback, context);
  }

  // Get hook for specific integration
  getHook(integration) {
    return this.hooks.get(integration);
  }

  // Enable/disable specific integration
  toggleIntegration(integration, enabled) {
    if (this.integrations[integration]) {
      this.integrations[integration].enabled = enabled;
      console.log(`[NLD-Hooks] ${integration} integration ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  // Get integration status
  getIntegrationStatus() {
    return {
      active: this.active,
      integrations: Object.entries(this.integrations).map(([name, config]) => ({
        name,
        enabled: config.enabled,
        hasHooks: this.hooks.has(name)
      }))
    };
  }

  /**
   * Event Emitter Integration
   */
  setupEventListeners(eventEmitter) {
    // Listen for failure detection events
    this.detector.on('failureDetected', (data) => {
      eventEmitter.emit('nld:failure', data);
    });

    this.detector.on('criticalFailure', (data) => {
      eventEmitter.emit('nld:critical', data);
    });

    this.detector.on('monitoringReport', (report) => {
      eventEmitter.emit('nld:report', report);
    });
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    this.active = false;
    await this.detector.shutdown();
    this.hooks.clear();
    console.log('[NLD-Hooks] Integration hooks shutdown');
  }
}

module.exports = NLDIntegrationHooks;