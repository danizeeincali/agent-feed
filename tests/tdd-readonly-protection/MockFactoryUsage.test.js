/**
 * Mock Factory Usage Tests - London School TDD
 * 
 * Tests to verify MockFactory usage and achieve 100% code coverage
 */

const MockFactory = require('./MockFactory');

describe('Mock Factory Usage and Coverage', () => {
  describe('File System Mock Creation', () => {
    it('should create file system mock with all required methods', () => {
      const fileSystemMock = MockFactory.createFileSystemMock();
      
      // Verify all required methods exist
      expect(fileSystemMock.readFile).toBeDefined();
      expect(fileSystemMock.writeFile).toBeDefined();
      expect(fileSystemMock.access).toBeDefined();
      expect(fileSystemMock.chmod).toBeDefined();
      expect(fileSystemMock.stat).toBeDefined();
      expect(fileSystemMock.readdir).toBeDefined();
      
      // Test setup methods
      expect(fileSystemMock.setupReadOnlyFile).toBeDefined();
      expect(fileSystemMock.setupSuccessfulRead).toBeDefined();
    });

    it('should configure read-only file behavior', () => {
      const fileSystemMock = MockFactory.createFileSystemMock();
      const testFile = '/prod/test.md';
      
      // Setup read-only behavior
      fileSystemMock.setupReadOnlyFile(testFile);
      
      // Verify read-only setup
      expect(() => {
        fileSystemMock.access(testFile, require('fs').constants.W_OK);
      }).toThrow('EACCES: permission denied');
    });

    it('should configure successful read behavior', async () => {
      const fileSystemMock = MockFactory.createFileSystemMock();
      const testFile = '/prod/test.md';
      const testContent = 'test content';
      
      // Setup successful read
      fileSystemMock.setupSuccessfulRead(testFile, testContent);
      
      // Verify read setup
      const result = await fileSystemMock.readFile(testFile, 'utf8');
      expect(result).toBe(testContent);
    });
  });

  describe('Permission Checker Mock Creation', () => {
    it('should create permission checker with security behaviors', () => {
      const permissionMock = MockFactory.createPermissionCheckerMock();
      
      // Verify all required methods
      expect(permissionMock.checkReadPermission).toBeDefined();
      expect(permissionMock.checkWritePermission).toBeDefined();
      expect(permissionMock.enforceReadOnlyMode).toBeDefined();
      expect(permissionMock.validatePermissions).toBeDefined();
      
      // Test setup methods
      expect(permissionMock.setupSystemFileProtection).toBeDefined();
      expect(permissionMock.setupProductionEnvironment).toBeDefined();
    });

    it('should setup system file protection', async () => {
      const permissionMock = MockFactory.createPermissionCheckerMock();
      const systemFiles = ['/prod/CLAUDE.md', '/prod/config.js'];
      
      // Setup protection
      permissionMock.setupSystemFileProtection(systemFiles);
      
      // Verify system files are protected
      for (const file of systemFiles) {
        const canWrite = await permissionMock.checkWritePermission(file);
        expect(canWrite).toBe(false);
      }
      
      // Verify non-system files are writable
      const nonSystemFile = '/data/test.txt';
      const canWrite = await permissionMock.checkWritePermission(nonSystemFile);
      expect(canWrite).toBe(true);
    });

    it('should setup production environment behavior', async () => {
      const permissionMock = MockFactory.createPermissionCheckerMock();
      
      // Setup production environment
      permissionMock.setupProductionEnvironment();
      
      // Test system file in production
      const result = await permissionMock.validatePermissions(
        '/prod/CLAUDE.md',
        { environment: 'production' }
      );
      
      expect(result.read).toBe(true);
      expect(result.write).toBe(false);
      expect(result.context).toBe('production_system_file');
    });
  });

  describe('Directory Validator Mock Creation', () => {
    it('should create directory validator with structure validation', () => {
      const validatorMock = MockFactory.createDirectoryValidatorMock();
      
      // Verify methods exist
      expect(validatorMock.validateStructure).toBeDefined();
      expect(validatorMock.checkIntegrity).toBeDefined();
      expect(validatorMock.verifyReadOnlyStatus).toBeDefined();
      
      // Test setup methods
      expect(validatorMock.setupValidStructure).toBeDefined();
      expect(validatorMock.setupMigrationValidation).toBeDefined();
    });

    it('should setup valid structure behavior', async () => {
      const validatorMock = MockFactory.createDirectoryValidatorMock();
      const basePath = '/prod';
      
      // Setup valid structure
      validatorMock.setupValidStructure(basePath);
      
      // Test structure validation
      const result = await validatorMock.validateStructure(basePath, {});
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should setup migration validation behavior', async () => {
      const validatorMock = MockFactory.createDirectoryValidatorMock();
      const oldPath = '/old/workspace';
      const newPath = '/new/workspace';
      
      // Setup migration validation
      validatorMock.setupMigrationValidation(oldPath, newPath);
      
      // Test migration validation
      const result = await validatorMock.validateStructure(newPath, {
        migrationValidation: true
      });
      
      expect(result.sourceMissing).toBe(true);
      expect(result.targetExists).toBe(true);
      expect(result.migrationComplete).toBe(true);
    });
  });

  describe('Content Integrity Checker Mock Creation', () => {
    it('should create content integrity checker with checksum behaviors', () => {
      const integrityMock = MockFactory.createContentIntegrityCheckerMock();
      
      // Verify methods exist
      expect(integrityMock.calculateChecksum).toBeDefined();
      expect(integrityMock.verifyChecksum).toBeDefined();
      expect(integrityMock.detectUnauthorizedChanges).toBeDefined();
      
      // Test setup methods
      expect(integrityMock.setupValidChecksums).toBeDefined();
      expect(integrityMock.setupTamperingDetection).toBeDefined();
    });

    it('should setup valid checksums behavior', async () => {
      const integrityMock = MockFactory.createContentIntegrityCheckerMock();
      const checksumMap = {
        '/prod/file1.md': 'checksum1',
        '/prod/file2.md': 'checksum2'
      };
      
      // Setup valid checksums
      integrityMock.setupValidChecksums(checksumMap);
      
      // Test checksum calculation
      const checksum1 = integrityMock.calculateChecksum('/prod/file1.md');
      expect(checksum1).toBe('checksum1');
      
      // Test checksum verification
      const verification = await integrityMock.verifyChecksum('/prod/file1.md', 'checksum1');
      expect(verification.valid).toBe(true);
      expect(verification.matches).toBe(true);
    });

    it('should setup tampering detection behavior', async () => {
      const integrityMock = MockFactory.createContentIntegrityCheckerMock();
      const compromisedFile = '/prod/compromised.md';
      const changes = ['line 1: modified', 'line 5: deleted'];
      
      // Setup tampering detection
      integrityMock.setupTamperingDetection(compromisedFile, changes);
      
      // Test tampering detection
      const result = await integrityMock.detectUnauthorizedChanges(
        compromisedFile, 
        'original', 
        'modified'
      );
      
      expect(result.file).toBe(compromisedFile);
      expect(result.changes).toEqual(changes);
      expect(result.severity).toBe('critical');
    });
  });

  describe('Audit Logger Mock Creation', () => {
    it('should create audit logger with security logging', () => {
      const auditMock = MockFactory.createAuditLoggerMock();
      
      // Verify methods exist
      expect(auditMock.logAccessAttempt).toBeDefined();
      expect(auditMock.logModificationAttempt).toBeDefined();
      expect(auditMock.logProtectionViolation).toBeDefined();
      
      // Test setup methods
      expect(auditMock.setupSuccessfulLogging).toBeDefined();
      expect(auditMock.getLoggedViolations).toBeDefined();
    });

    it('should setup successful logging behavior', async () => {
      const auditMock = MockFactory.createAuditLoggerMock();
      
      // Setup successful logging
      auditMock.setupSuccessfulLogging();
      
      // Test access attempt logging
      const accessResult = await auditMock.logAccessAttempt('/prod/test.md', 'read', 'success');
      expect(accessResult.logged).toBe(true);
      
      // Test modification attempt logging
      const modResult = await auditMock.logModificationAttempt('/prod/test.md', 'user', 'denied');
      expect(modResult.logged).toBe(true);
      expect(modResult.alertSent).toBe(true);
      
      // Test violation logging
      const violationResult = await auditMock.logProtectionViolation('/prod/test.md', 'tampering');
      expect(violationResult.logged).toBe(true);
      expect(violationResult.severity).toBe('high');
    });

    it('should track logged violations', async () => {
      const auditMock = MockFactory.createAuditLoggerMock();
      auditMock.setupSuccessfulLogging();
      
      // Log some violations
      await auditMock.logProtectionViolation('/prod/file1.md', 'tampering');
      await auditMock.logProtectionViolation('/prod/file2.md', 'permission_change');
      
      // Get logged violations
      const violations = auditMock.getLoggedViolations();
      expect(violations).toHaveLength(2);
      expect(violations[0].file).toBe('/prod/file1.md');
      expect(violations[0].violation).toBe('tampering');
    });
  });

  describe('Swarm Coordinator Mock Creation', () => {
    it('should create swarm coordinator with coordination behaviors', () => {
      const swarmMock = MockFactory.createSwarmCoordinatorMock();
      
      // Verify methods exist
      expect(swarmMock.notifyProtectionStatus).toBeDefined();
      expect(swarmMock.shareSecurityContext).toBeDefined();
      expect(swarmMock.requestProtectionValidation).toBeDefined();
      
      // Test setup method
      expect(swarmMock.setupCoordinationSuccess).toBeDefined();
    });

    it('should setup coordination success behavior', async () => {
      const swarmMock = MockFactory.createSwarmCoordinatorMock();
      
      // Setup coordination success
      swarmMock.setupCoordinationSuccess();
      
      // Test protection status notification
      const statusResult = await swarmMock.notifyProtectionStatus({ protected: true });
      expect(statusResult.acknowledged).toBe(true);
      
      // Test security context sharing
      const contextResult = await swarmMock.shareSecurityContext({ secure: true });
      expect(contextResult.shared).toBe(true);
      
      // Test protection validation request
      const validationResult = await swarmMock.requestProtectionValidation();
      expect(validationResult.validated).toBe(true);
    });
  });

  describe('Complete Mock Set Creation', () => {
    it('should create complete mock set with all components', () => {
      const completeMocks = MockFactory.createCompleteMockSet();
      
      // Verify all mocks are created
      expect(completeMocks.fileSystem).toBeDefined();
      expect(completeMocks.permissionChecker).toBeDefined();
      expect(completeMocks.directoryValidator).toBeDefined();
      expect(completeMocks.contentIntegrityChecker).toBeDefined();
      expect(completeMocks.auditLogger).toBeDefined();
      expect(completeMocks.swarmCoordinator).toBeDefined();
    });
  });

  describe('Scenario Setup Methods', () => {
    it('should setup production protection scenario', () => {
      const mocks = MockFactory.createCompleteMockSet();
      
      // Setup production scenario
      const scenario = MockFactory.setupProductionProtectionScenario(mocks);
      
      // Verify scenario configuration
      expect(scenario.systemFiles).toContain('/prod/CLAUDE.md');
      expect(scenario.systemFiles).toContain('/prod/PRODUCTION_CLAUDE.md');
      expect(scenario.checksums['/prod/CLAUDE.md']).toBeDefined();
      expect(scenario.checksums['/prod/PRODUCTION_CLAUDE.md']).toBeDefined();
    });

    it('should setup migration scenario', () => {
      const mocks = MockFactory.createCompleteMockSet();
      
      // Setup migration scenario
      const scenario = MockFactory.setupMigrationScenario(mocks);
      
      // Verify scenario configuration
      expect(scenario.oldPath).toBe('/workspaces/agent-feed/agent_workspace');
      expect(scenario.newPath).toBe('/workspaces/agent-feed/prod/agent_workspace');
    });
  });
});