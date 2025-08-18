/**
 * Phase 4 Security Tests: Production Security & Monitoring
 * London School TDD - Mock-driven security and monitoring validation
 */

import { MockFactory } from '../../factories/mock-factory.js';
import { SecurityManager } from '../../../src/security/manager.js';
import { MonitoringService } from '../../../src/monitoring/service.js';
import { AuthenticationService } from '../../../src/auth/service.js';

describe('Phase 4 Security: Production Security & Monitoring', () => {
  let mockFactory;
  let mockEncryption;
  let mockAuditLogger;
  let mockMetricsCollector;
  let mockAlertManager;
  let mockTokenValidator;
  let mockRateLimiter;

  beforeEach(() => {
    mockFactory = new MockFactory();
    
    mockEncryption = {
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      generateKey: jest.fn(),
      hash: jest.fn(),
      compare: jest.fn()
    };
    
    mockAuditLogger = {
      logAccess: jest.fn(),
      logFailure: jest.fn(),
      logDataAccess: jest.fn(),
      logPrivilegeEscalation: jest.fn()
    };
    
    mockMetricsCollector = {
      recordMetric: jest.fn(),
      getMetrics: jest.fn(),
      createCounter: jest.fn(),
      createGauge: jest.fn(),
      createHistogram: jest.fn()
    };
    
    mockAlertManager = {
      sendAlert: jest.fn(),
      createRule: jest.fn(),
      evaluateRules: jest.fn()
    };
    
    mockTokenValidator = {
      validateJWT: jest.fn(),
      checkExpiration: jest.fn(),
      verifySignature: jest.fn(),
      extractClaims: jest.fn()
    };
    
    mockRateLimiter = {
      checkLimit: jest.fn(),
      recordRequest: jest.fn(),
      getQuota: jest.fn(),
      resetLimit: jest.fn()
    };
  });

  describe('Authentication and Authorization Security', () => {
    it('should validate JWT tokens with proper signature verification', async () => {
      // Arrange
      const authService = new AuthenticationService(
        mockTokenValidator,
        mockAuditLogger
      );
      
      const validToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTcwMDA5NjMwMH0.signature';
      const tokenClaims = {
        sub: 'user-123',
        exp: 1700096300,
        iat: 1700009900,
        roles: ['agent-user'],
        permissions: ['agent:execute', 'file:read']
      };

      mockTokenValidator.validateJWT.mockResolvedValue({
        valid: true,
        claims: tokenClaims
      });
      mockTokenValidator.verifySignature.mockResolvedValue(true);
      mockTokenValidator.checkExpiration.mockResolvedValue(false);

      // Act
      const authResult = await authService.authenticateRequest({
        headers: { authorization: `Bearer ${validToken}` }
      });

      // Assert - Verify token validation process
      expect(mockTokenValidator.validateJWT).toHaveBeenCalledWith(validToken);
      expect(mockTokenValidator.verifySignature).toHaveBeenCalledWith(validToken);
      expect(mockTokenValidator.checkExpiration).toHaveBeenCalledWith(tokenClaims);

      expect(authResult).toEqual({
        authenticated: true,
        userId: 'user-123',
        roles: ['agent-user'],
        permissions: ['agent:execute', 'file:read']
      });

      // Verify audit logging
      expect(mockAuditLogger.logAccess).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'authenticate',
        result: 'success',
        timestamp: expect.any(String)
      });
    });

    it('should handle token tampering attempts with security logging', async () => {
      // Arrange
      const authService = new AuthenticationService(
        mockTokenValidator,
        mockAuditLogger
      );
      
      const tamperedToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.invalid_signature';

      mockTokenValidator.validateJWT.mockResolvedValue({ valid: false });
      mockTokenValidator.verifySignature.mockResolvedValue(false);

      // Act
      const authResult = await authService.authenticateRequest({
        headers: { authorization: `Bearer ${tamperedToken}` }
      });

      // Assert - Verify security response
      expect(authResult).toEqual({
        authenticated: false,
        error: 'Invalid token signature',
        securityIncident: true
      });

      // Verify security audit logging
      expect(mockAuditLogger.logFailure).toHaveBeenCalledWith({
        action: 'authenticate',
        reason: 'token_tampering',
        token: expect.stringContaining('eyJ0eXAi'), // Partial token for audit
        timestamp: expect.any(String),
        severity: 'high'
      });
    });

    it('should enforce role-based access control for agent operations', async () => {
      // Arrange
      const authService = new AuthenticationService(
        mockTokenValidator,
        mockAuditLogger
      );
      
      const userClaims = {
        sub: 'user-456',
        roles: ['viewer'],
        permissions: ['file:read']
      };

      const privilegedOperation = {
        action: 'agent:spawn',
        resource: 'production-agents',
        requiredPermissions: ['agent:admin', 'system:modify']
      };

      // Act
      const authResult = await authService.authorizeOperation(
        userClaims,
        privilegedOperation
      );

      // Assert - Verify access denial
      expect(authResult).toEqual({
        authorized: false,
        reason: 'insufficient_permissions',
        required: ['agent:admin', 'system:modify'],
        current: ['file:read']
      });

      // Verify privilege escalation attempt logging
      expect(mockAuditLogger.logPrivilegeEscalation).toHaveBeenCalledWith({
        userId: 'user-456',
        attemptedAction: 'agent:spawn',
        requiredPermissions: ['agent:admin', 'system:modify'],
        userPermissions: ['file:read'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('Data Security and Encryption', () => {
    it('should encrypt sensitive agent data at rest', async () => {
      // Arrange
      const securityManager = new SecurityManager(mockEncryption, mockAuditLogger);
      const sensitiveData = {
        agentConfig: {
          name: 'sensitive-agent',
          apiKeys: ['key1', 'key2'],
          environment: { DATABASE_URL: 'postgres://user:pass@localhost/db' }
        },
        userContext: {
          userId: 'user-789',
          sessionData: { preferences: { theme: 'dark' } }
        }
      };

      const encryptionKey = 'base64-encoded-key';
      const encryptedData = 'encrypted-blob-data';

      mockEncryption.generateKey.mockResolvedValue(encryptionKey);
      mockEncryption.encrypt.mockResolvedValue({
        data: encryptedData,
        iv: 'initialization-vector',
        tag: 'auth-tag'
      });

      // Act
      const secureData = await securityManager.encryptSensitiveData(sensitiveData);

      // Assert - Verify encryption process
      expect(mockEncryption.generateKey).toHaveBeenCalled();
      expect(mockEncryption.encrypt).toHaveBeenCalledWith(
        JSON.stringify(sensitiveData),
        encryptionKey
      );

      expect(secureData).toEqual({
        encrypted: true,
        data: encryptedData,
        metadata: {
          algorithm: 'AES-256-GCM',
          iv: 'initialization-vector',
          tag: 'auth-tag'
        }
      });

      // Verify data access logging
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith({
        action: 'encrypt',
        dataType: 'agent-config',
        classification: 'sensitive',
        timestamp: expect.any(String)
      });
    });

    it('should handle encryption key rotation securely', async () => {
      // Arrange
      const securityManager = new SecurityManager(mockEncryption, mockAuditLogger);
      const oldKey = 'old-encryption-key';
      const newKey = 'new-encryption-key';
      const encryptedData = 'data-encrypted-with-old-key';

      mockEncryption.generateKey.mockResolvedValue(newKey);
      mockEncryption.decrypt.mockResolvedValue('decrypted-plaintext-data');
      mockEncryption.encrypt.mockResolvedValue({
        data: 'data-encrypted-with-new-key',
        iv: 'new-iv',
        tag: 'new-tag'
      });

      // Act
      const rotationResult = await securityManager.rotateEncryptionKey({
        currentKey: oldKey,
        encryptedData: encryptedData
      });

      // Assert - Verify key rotation process
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(encryptedData, oldKey);
      expect(mockEncryption.generateKey).toHaveBeenCalled();
      expect(mockEncryption.encrypt).toHaveBeenCalledWith(
        'decrypted-plaintext-data',
        newKey
      );

      expect(rotationResult).toEqual({
        success: true,
        newEncryptedData: 'data-encrypted-with-new-key',
        keyRotated: true,
        timestamp: expect.any(String)
      });

      // Verify security audit
      expect(mockAuditLogger.logAccess).toHaveBeenCalledWith({
        action: 'key_rotation',
        oldKeyId: expect.any(String),
        newKeyId: expect.any(String),
        timestamp: expect.any(String)
      });
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    it('should enforce rate limits on agent execution endpoints', async () => {
      // Arrange
      const securityManager = new SecurityManager(
        mockEncryption,
        mockAuditLogger,
        mockRateLimiter
      );

      const clientId = 'client-123';
      const endpoint = '/api/agents/execute';
      const rateLimit = {
        requests: 100,
        windowMs: 60000, // 1 minute
        burst: 10
      };

      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        retryAfter: 30
      });

      // Act
      const rateLimitResult = await securityManager.checkRateLimit(
        clientId,
        endpoint,
        rateLimit
      );

      // Assert - Verify rate limiting
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        clientId,
        endpoint,
        rateLimit
      );

      expect(rateLimitResult).toEqual({
        allowed: false,
        remaining: 0,
        retryAfter: 30,
        error: 'Rate limit exceeded'
      });

      // Verify rate limit violation logging
      expect(mockAuditLogger.logFailure).toHaveBeenCalledWith({
        action: 'rate_limit_exceeded',
        clientId: 'client-123',
        endpoint: '/api/agents/execute',
        limit: rateLimit,
        timestamp: expect.any(String)
      });
    });

    it('should detect and block suspicious traffic patterns', async () => {
      // Arrange
      const securityManager = new SecurityManager(
        mockEncryption,
        mockAuditLogger,
        mockRateLimiter
      );

      const suspiciousRequests = [
        { clientId: 'client-456', endpoint: '/api/agents/execute', timestamp: Date.now() },
        { clientId: 'client-456', endpoint: '/api/agents/execute', timestamp: Date.now() + 100 },
        { clientId: 'client-456', endpoint: '/api/agents/execute', timestamp: Date.now() + 200 },
        { clientId: 'client-456', endpoint: '/api/agents/status', timestamp: Date.now() + 300 },
        { clientId: 'client-456', endpoint: '/api/activities', timestamp: Date.now() + 400 }
      ];

      mockRateLimiter.getQuota.mockResolvedValue({
        current: 150,
        limit: 100,
        suspicious: true
      });

      // Act
      const threatResult = await securityManager.analyzeThreatPattern(suspiciousRequests);

      // Assert - Verify threat detection
      expect(threatResult).toEqual({
        threatDetected: true,
        patterns: ['burst_requests', 'endpoint_scanning'],
        riskScore: expect.any(Number),
        action: 'block_client',
        duration: 3600000 // 1 hour block
      });

      // Verify security incident logging
      expect(mockAuditLogger.logFailure).toHaveBeenCalledWith({
        action: 'threat_detected',
        clientId: 'client-456',
        patterns: ['burst_requests', 'endpoint_scanning'],
        riskScore: expect.any(Number),
        timestamp: expect.any(String),
        severity: 'high'
      });
    });
  });

  describe('Production Monitoring and Alerting', () => {
    it('should monitor agent execution metrics and trigger alerts', async () => {
      // Arrange
      const monitoringService = new MonitoringService(
        mockMetricsCollector,
        mockAlertManager
      );

      const agentMetrics = {
        executionTime: 30000, // 30 seconds
        memoryUsage: 512 * 1024 * 1024, // 512MB
        errorRate: 0.15, // 15% error rate
        throughput: 5 // 5 operations per second
      };

      const alertThresholds = {
        maxExecutionTime: 20000, // 20 seconds
        maxMemoryUsage: 256 * 1024 * 1024, // 256MB
        maxErrorRate: 0.10, // 10%
        minThroughput: 10 // 10 ops/sec
      };

      mockMetricsCollector.recordMetric.mockResolvedValue({ recorded: true });
      mockAlertManager.evaluateRules.mockResolvedValue([
        {
          rule: 'execution_time_exceeded',
          triggered: true,
          severity: 'warning',
          threshold: 20000,
          actual: 30000
        },
        {
          rule: 'memory_usage_exceeded',
          triggered: true,
          severity: 'critical',
          threshold: 256 * 1024 * 1024,
          actual: 512 * 1024 * 1024
        },
        {
          rule: 'error_rate_exceeded',
          triggered: true,
          severity: 'warning',
          threshold: 0.10,
          actual: 0.15
        }
      ]);

      mockAlertManager.sendAlert.mockResolvedValue({ sent: true, alertId: 'alert-123' });

      // Act
      await monitoringService.recordAgentMetrics('agent-123', agentMetrics);
      const alertResults = await monitoringService.evaluateAlerts(alertThresholds);

      // Assert - Verify metrics recording
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
        'agent_execution_time',
        30000,
        { agentId: 'agent-123' }
      );

      // Verify alert evaluation and triggering
      expect(mockAlertManager.evaluateRules).toHaveBeenCalledWith(alertThresholds);
      expect(mockAlertManager.sendAlert).toHaveBeenCalledTimes(3); // 3 thresholds exceeded

      expect(alertResults).toEqual({
        alertsTriggered: 3,
        criticalAlerts: 1,
        warningAlerts: 2,
        alertIds: expect.arrayContaining(['alert-123'])
      });
    });

    it('should track agent workflow health and dependencies', async () => {
      // Arrange
      const monitoringService = new MonitoringService(
        mockMetricsCollector,
        mockAlertManager
      );

      const workflowHealth = {
        workflowId: 'workflow-456',
        steps: [
          { agentId: 'agent-researcher', status: 'completed', duration: 5000, healthy: true },
          { agentId: 'agent-coder', status: 'running', duration: 15000, healthy: true },
          { agentId: 'agent-tester', status: 'failed', duration: 2000, healthy: false, error: 'Timeout' }
        ],
        dependencies: [
          { service: 'database', status: 'healthy', responseTime: 50 },
          { service: 'file-system', status: 'healthy', responseTime: 10 },
          { service: 'claude-code-api', status: 'degraded', responseTime: 1500 }
        ]
      };

      mockMetricsCollector.getMetrics.mockResolvedValue({
        workflow_success_rate: 0.85,
        avg_workflow_duration: 25000,
        dependency_health_score: 0.75
      });

      // Act
      const healthReport = await monitoringService.generateHealthReport(workflowHealth);

      // Assert - Verify health reporting
      expect(healthReport).toEqual({
        workflowId: 'workflow-456',
        overallHealth: 'degraded',
        completedSteps: 1,
        failedSteps: 1,
        runningSteps: 1,
        dependencyIssues: 1,
        recommendations: [
          'Investigate agent-tester timeout issues',
          'Monitor claude-code-api performance'
        ]
      });

      // Verify metrics collection
      expect(mockMetricsCollector.recordMetric).toHaveBeenCalledWith(
        'workflow_health_score',
        expect.any(Number),
        { workflowId: 'workflow-456' }
      );
    });

    it('should implement real-time security event monitoring', async () => {
      // Arrange
      const monitoringService = new MonitoringService(
        mockMetricsCollector,
        mockAlertManager
      );

      const securityEvents = [
        {
          type: 'authentication_failure',
          userId: 'user-789',
          attempts: 5,
          timeWindow: 60000,
          severity: 'medium'
        },
        {
          type: 'privilege_escalation_attempt',
          userId: 'user-456',
          targetPermission: 'admin:system',
          severity: 'high'
        },
        {
          type: 'data_access_anomaly',
          userId: 'user-123',
          accessedFiles: ['/etc/passwd', '/var/log/auth.log'],
          severity: 'critical'
        }
      ];

      mockAlertManager.createRule.mockResolvedValue({ ruleId: 'security-rule-123' });
      mockAlertManager.sendAlert.mockResolvedValue({ sent: true, alertId: 'security-alert-456' });

      // Act
      const securityReport = await monitoringService.processSecurityEvents(securityEvents);

      // Assert - Verify security monitoring
      expect(securityReport).toEqual({
        processedEvents: 3,
        criticalEvents: 1,
        highSeverityEvents: 1,
        mediumSeverityEvents: 1,
        alertsGenerated: 3,
        immediateActions: [
          'Block user-456 pending investigation',
          'Quarantine user-123 access to sensitive files'
        ]
      });

      // Verify critical alert for data access anomaly
      expect(mockAlertManager.sendAlert).toHaveBeenCalledWith({
        type: 'security_incident',
        severity: 'critical',
        event: expect.objectContaining({
          type: 'data_access_anomaly',
          userId: 'user-123'
        }),
        immediateAction: true
      });
    });
  });

  describe('Compliance and Audit Logging', () => {
    it('should maintain comprehensive audit trail for agent operations', async () => {
      // Arrange
      const securityManager = new SecurityManager(mockEncryption, mockAuditLogger);
      const agentOperations = [
        {
          agentId: 'agent-123',
          operation: 'file_write',
          file: '/workspace/sensitive-data.json',
          user: 'user-456',
          timestamp: new Date().toISOString()
        },
        {
          agentId: 'agent-456',
          operation: 'database_query',
          query: 'SELECT * FROM users WHERE role = admin',
          user: 'user-789',
          timestamp: new Date().toISOString()
        }
      ];

      mockAuditLogger.logDataAccess.mockResolvedValue({
        logged: true,
        auditId: 'audit-123'
      });

      // Act
      for (const operation of agentOperations) {
        await securityManager.auditAgentOperation(operation);
      }

      // Assert - Verify comprehensive audit logging
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledTimes(2);
      
      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith({
        agentId: 'agent-123',
        operation: 'file_write',
        resource: '/workspace/sensitive-data.json',
        user: 'user-456',
        classification: 'sensitive',
        timestamp: expect.any(String),
        checksum: expect.any(String)
      });

      expect(mockAuditLogger.logDataAccess).toHaveBeenCalledWith({
        agentId: 'agent-456',
        operation: 'database_query',
        resource: 'users_table',
        user: 'user-789',
        classification: 'privileged',
        timestamp: expect.any(String),
        queryHash: expect.any(String)
      });
    });

    it('should generate compliance reports for regulatory requirements', async () => {
      // Arrange
      const securityManager = new SecurityManager(mockEncryption, mockAuditLogger);
      const complianceRequirements = {
        standard: 'SOC2',
        controls: ['access_control', 'data_encryption', 'audit_logging', 'monitoring'],
        period: { start: '2024-01-01', end: '2024-12-31' }
      };

      mockAuditLogger.getMetrics = jest.fn().mockResolvedValue({
        totalAccesses: 10000,
        failedAuthentications: 25,
        privilegeEscalations: 2,
        dataBreaches: 0,
        encryptionCoverage: 0.98,
        auditLogIntegrity: 1.0
      });

      // Act
      const complianceReport = await securityManager.generateComplianceReport(
        complianceRequirements
      );

      // Assert - Verify compliance reporting
      expect(complianceReport).toEqual({
        standard: 'SOC2',
        period: { start: '2024-01-01', end: '2024-12-31' },
        overallCompliance: 0.95,
        controls: {
          access_control: { compliant: true, score: 0.98, findings: [] },
          data_encryption: { compliant: true, score: 0.98, findings: [] },
          audit_logging: { compliant: true, score: 1.0, findings: [] },
          monitoring: { compliant: true, score: 0.90, findings: ['Improve alert response time'] }
        },
        recommendations: [
          'Address 2 privilege escalation incidents',
          'Improve monitoring alert response time',
          'Increase encryption coverage to 100%'
        ],
        certificationReady: true
      });
    });
  });
});