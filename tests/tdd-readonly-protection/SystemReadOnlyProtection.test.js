/**
 * TDD London School Test Suite - System Instructions Read-Only Protection
 * 
 * This test suite follows the London School (mockist) TDD approach to test
 * the read-only protection mechanisms for system instructions and configurations.
 * 
 * Focus: Outside-in development with behavior verification through mocks
 */

const fs = require('fs');
const path = require('path');

// Mock all file system dependencies
jest.mock('fs');
jest.mock('path');

describe('System Instructions Read-Only Protection Suite', () => {
  let mockFileSystem;
  let mockPermissionChecker;
  let mockDirectoryValidator;
  let mockContentIntegrityChecker;
  let mockAuditLogger;
  let systemProtector;

  beforeEach(() => {
    // Create mock collaborators - London School approach
    mockFileSystem = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      access: jest.fn(),
      chmod: jest.fn(),
      stat: jest.fn(),
      readdir: jest.fn()
    };

    mockPermissionChecker = {
      checkReadPermission: jest.fn(),
      checkWritePermission: jest.fn(),
      enforceReadOnlyMode: jest.fn(),
      validatePermissions: jest.fn()
    };

    mockDirectoryValidator = {
      validateStructure: jest.fn(),
      checkIntegrity: jest.fn(),
      verifyReadOnlyStatus: jest.fn()
    };

    mockContentIntegrityChecker = {
      calculateChecksum: jest.fn(),
      verifyChecksum: jest.fn(),
      detectUnauthorizedChanges: jest.fn()
    };

    mockAuditLogger = {
      logAccessAttempt: jest.fn(),
      logModificationAttempt: jest.fn(),
      logProtectionViolation: jest.fn()
    };

    // Initialize system under test with mock dependencies
    const SystemProtector = require('./SystemProtector');
    systemProtector = new SystemProtector(
      mockFileSystem,
      mockPermissionChecker,
      mockDirectoryValidator,
      mockContentIntegrityChecker,
      mockAuditLogger
    );
  });

  describe('Read-Only File System Permissions', () => {
    it('should verify CLAUDE.md is read-only in production', async () => {
      // Arrange - setup mock expectations
      const claudeFilePath = '/prod/CLAUDE.md';
      mockPermissionChecker.checkWritePermission
        .mockResolvedValue(false);
      mockPermissionChecker.checkReadPermission
        .mockResolvedValue(true);

      // Act
      const result = await systemProtector.verifyReadOnlyAccess(claudeFilePath);

      // Assert - behavior verification
      expect(mockPermissionChecker.checkReadPermission)
        .toHaveBeenCalledWith(claudeFilePath);
      expect(mockPermissionChecker.checkWritePermission)
        .toHaveBeenCalledWith(claudeFilePath);
      expect(result.canRead).toBe(true);
      expect(result.canWrite).toBe(false);
      expect(mockAuditLogger.logAccessAttempt)
        .toHaveBeenCalledWith(claudeFilePath, 'read', 'success');
    });

    it('should enforce read-only permissions on system configuration files', async () => {
      // Arrange
      const configFiles = [
        '/prod/config/claude.config.js',
        '/prod/config/structure-protection.js',
        '/prod/PRODUCTION_CLAUDE.md'
      ];
      
      mockPermissionChecker.enforceReadOnlyMode
        .mockResolvedValue({ success: true, filesProtected: configFiles.length });

      // Act
      const result = await systemProtector.enforceSystemProtection(configFiles);

      // Assert - verify interaction with permission system
      expect(mockPermissionChecker.enforceReadOnlyMode)
        .toHaveBeenCalledWith(configFiles);
      expect(result.success).toBe(true);
      expect(result.filesProtected).toBe(3);
    });

    it('should prevent modification of system instruction files', async () => {
      // Arrange
      const protectedFile = '/prod/CLAUDE.md';
      const modificationAttempt = { content: 'modified content', user: 'test' };
      
      mockPermissionChecker.checkWritePermission
        .mockResolvedValue(false);
      mockAuditLogger.logModificationAttempt
        .mockResolvedValue({ logged: true, alertSent: true });

      // Act & Assert - should throw protection error
      await expect(
        systemProtector.attemptModification(protectedFile, modificationAttempt)
      ).rejects.toThrow('File modification denied: Read-only protection active');

      // Verify security logging behavior
      expect(mockAuditLogger.logModificationAttempt)
        .toHaveBeenCalledWith(protectedFile, modificationAttempt.user, 'denied');
      expect(mockAuditLogger.logProtectionViolation)
        .toHaveBeenCalledWith(protectedFile, 'write_attempt_blocked');
    });
  });

  describe('Production Environment Read/Write Verification', () => {
    it('should allow production environment to read system files', async () => {
      // Arrange
      const prodContext = { environment: 'production', process: 'claude-prod' };
      const systemFile = '/prod/CLAUDE.md';
      
      mockPermissionChecker.validatePermissions
        .mockResolvedValue({ read: true, write: false, context: 'production' });
      mockFileSystem.readFile
        .mockResolvedValue('# Claude Code Configuration');

      // Act
      const result = await systemProtector.verifyProdAccess(systemFile, prodContext);

      // Assert - production should be able to read
      expect(mockPermissionChecker.validatePermissions)
        .toHaveBeenCalledWith(systemFile, prodContext);
      expect(mockFileSystem.readFile)
        .toHaveBeenCalledWith(systemFile, 'utf8');
      expect(result.canRead).toBe(true);
      expect(result.canWrite).toBe(false);
    });

    it('should deny write access even to production processes', async () => {
      // Arrange
      const prodContext = { environment: 'production', process: 'claude-prod' };
      const systemFile = '/prod/config/claude.config.js';
      const writeAttempt = { data: 'modified config' };

      mockPermissionChecker.validatePermissions
        .mockResolvedValue({ read: true, write: false, context: 'production' });

      // Act & Assert
      await expect(
        systemProtector.attemptProdWrite(systemFile, writeAttempt, prodContext)
      ).rejects.toThrow('Write access denied: System files are read-only');

      // Verify audit trail
      expect(mockAuditLogger.logModificationAttempt)
        .toHaveBeenCalledWith(systemFile, prodContext.process, 'denied_production_write');
    });

    it('should verify development environment has appropriate restricted access', async () => {
      // Arrange
      const devContext = { environment: 'development', process: 'claude-dev' };
      const systemFile = '/workspaces/agent-feed/CLAUDE.md';

      mockPermissionChecker.validatePermissions
        .mockResolvedValue({ read: true, write: false, context: 'development_restricted' });

      // Act
      const result = await systemProtector.verifyDevAccess(systemFile, devContext);

      // Assert - dev should have read but not write to system files
      expect(mockPermissionChecker.validatePermissions)
        .toHaveBeenCalledWith(systemFile, devContext);
      expect(result.canRead).toBe(true);
      expect(result.canWrite).toBe(false);
      expect(result.context).toBe('development_restricted');
    });
  });

  describe('Directory Structure Validation', () => {
    it('should validate prod directory structure integrity', async () => {
      // Arrange
      const expectedStructure = {
        '/prod/CLAUDE.md': { required: true, readonly: true },
        '/prod/PRODUCTION_CLAUDE.md': { required: true, readonly: true },
        '/prod/config/': { type: 'directory', readonly: true },
        '/prod/agent_workspace/': { type: 'directory', readonly: false }
      };

      mockDirectoryValidator.validateStructure
        .mockResolvedValue({ 
          valid: true, 
          violations: [], 
          protectedFiles: 4,
          readOnlyDirectories: 2
        });

      // Act
      const result = await systemProtector.validateProdStructure(expectedStructure);

      // Assert - structure validation behavior
      expect(mockDirectoryValidator.validateStructure)
        .toHaveBeenCalledWith('/prod', expectedStructure);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.protectedFiles).toBe(4);
    });

    it('should detect unauthorized directory modifications', async () => {
      // Arrange
      const structureViolations = [
        { path: '/prod/CLAUDE.md', issue: 'permission_changed', severity: 'high' },
        { path: '/prod/config/claude.config.js', issue: 'content_modified', severity: 'critical' }
      ];

      mockDirectoryValidator.validateStructure
        .mockResolvedValue({ 
          valid: false, 
          violations: structureViolations,
          protectedFiles: 2
        });

      // Act
      const result = await systemProtector.validateProdStructure();

      // Assert - should detect and log violations
      expect(result.valid).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(mockAuditLogger.logProtectionViolation)
        .toHaveBeenCalledWith('/prod/CLAUDE.md', 'permission_changed');
      expect(mockAuditLogger.logProtectionViolation)
        .toHaveBeenCalledWith('/prod/config/claude.config.js', 'content_modified');
    });

    it('should verify read-only status of critical configuration directories', async () => {
      // Arrange
      const criticalDirs = ['/prod/config', '/prod/security', '/prod/scripts'];
      
      mockDirectoryValidator.verifyReadOnlyStatus
        .mockResolvedValue({
          '/prod/config': { readonly: true, verified: true },
          '/prod/security': { readonly: true, verified: true },
          '/prod/scripts': { readonly: true, verified: true }
        });

      // Act
      const result = await systemProtector.verifyCriticalDirectories(criticalDirs);

      // Assert - all directories should be read-only
      expect(mockDirectoryValidator.verifyReadOnlyStatus)
        .toHaveBeenCalledWith(criticalDirs);
      
      criticalDirs.forEach(dir => {
        expect(result[dir].readonly).toBe(true);
        expect(result[dir].verified).toBe(true);
      });
    });
  });

  describe('Content Integrity Checks', () => {
    it('should calculate and verify checksums for system files', async () => {
      // Arrange
      const systemFiles = [
        '/prod/CLAUDE.md',
        '/prod/PRODUCTION_CLAUDE.md',
        '/prod/config/claude.config.js'
      ];
      
      const expectedChecksums = {
        '/prod/CLAUDE.md': 'sha256:abc123...',
        '/prod/PRODUCTION_CLAUDE.md': 'sha256:def456...',
        '/prod/config/claude.config.js': 'sha256:ghi789...'
      };

      mockContentIntegrityChecker.calculateChecksum
        .mockImplementation((file) => expectedChecksums[file]);
      mockContentIntegrityChecker.verifyChecksum
        .mockResolvedValue({ valid: true, matches: true });

      // Act
      const result = await systemProtector.verifyContentIntegrity(systemFiles);

      // Assert - checksums should be calculated and verified
      systemFiles.forEach(file => {
        expect(mockContentIntegrityChecker.calculateChecksum)
          .toHaveBeenCalledWith(file);
        expect(mockContentIntegrityChecker.verifyChecksum)
          .toHaveBeenCalledWith(file, expectedChecksums[file]);
      });

      expect(result.valid).toBe(true);
      expect(result.verifiedFiles).toBe(3);
    });

    it('should detect unauthorized content modifications', async () => {
      // Arrange
      const compromisedFile = '/prod/CLAUDE.md';
      const originalChecksum = 'sha256:original123';
      const currentChecksum = 'sha256:modified456';

      mockContentIntegrityChecker.calculateChecksum
        .mockReturnValue(currentChecksum);
      mockContentIntegrityChecker.verifyChecksum
        .mockResolvedValue({ valid: false, matches: false });
      mockContentIntegrityChecker.detectUnauthorizedChanges
        .mockResolvedValue({
          file: compromisedFile,
          changes: ['line 25: instruction modified', 'line 30: rule deleted'],
          severity: 'critical'
        });

      // Act
      const result = await systemProtector.detectContentTampering(compromisedFile, originalChecksum);

      // Assert - unauthorized changes should be detected and logged
      expect(mockContentIntegrityChecker.verifyChecksum)
        .toHaveBeenCalledWith(compromisedFile, originalChecksum);
      expect(mockContentIntegrityChecker.detectUnauthorizedChanges)
        .toHaveBeenCalledWith(compromisedFile, originalChecksum, currentChecksum);
      expect(result.tampered).toBe(true);
      expect(result.changes).toHaveLength(2);
      expect(mockAuditLogger.logProtectionViolation)
        .toHaveBeenCalledWith(compromisedFile, 'content_tampering_detected');
    });

    it('should maintain baseline checksums for comparison', async () => {
      // Arrange
      const baselineFile = '/prod/.checksums/baseline.json';
      const systemFiles = ['/prod/CLAUDE.md', '/prod/PRODUCTION_CLAUDE.md'];
      const baseline = {
        '/prod/CLAUDE.md': { checksum: 'sha256:baseline123', created: '2025-01-01' },
        '/prod/PRODUCTION_CLAUDE.md': { checksum: 'sha256:baseline456', created: '2025-01-01' }
      };

      mockFileSystem.readFile
        .mockResolvedValue(JSON.stringify(baseline));
      mockContentIntegrityChecker.verifyChecksum
        .mockResolvedValue({ valid: true, matches: true });

      // Act
      const result = await systemProtector.verifyAgainstBaseline(systemFiles, baselineFile);

      // Assert - should compare against stored baseline
      expect(mockFileSystem.readFile)
        .toHaveBeenCalledWith(baselineFile, 'utf8');
      
      systemFiles.forEach(file => {
        expect(mockContentIntegrityChecker.verifyChecksum)
          .toHaveBeenCalledWith(file, baseline[file].checksum);
      });

      expect(result.allValid).toBe(true);
      expect(result.verifiedFiles).toBe(2);
    });
  });

  describe('Agent Workspace Migration Validation', () => {
    it('should validate agent_workspace move from root to prod/', async () => {
      // Arrange
      const oldPath = '/workspaces/agent-feed/agent_workspace';
      const newPath = '/workspaces/agent-feed/prod/agent_workspace';
      
      mockDirectoryValidator.validateStructure
        .mockResolvedValue({
          sourceMissing: true,
          targetExists: true,
          migrationComplete: true,
          permissions: { read: true, write: true }
        });

      // Act
      const result = await systemProtector.validateWorkspaceMigration(oldPath, newPath);

      // Assert - migration should be verified
      expect(mockDirectoryValidator.validateStructure)
        .toHaveBeenCalledWith(newPath, expect.objectContaining({
          migrationValidation: true,
          sourcePath: oldPath
        }));
      expect(result.migrationComplete).toBe(true);
      expect(result.sourceMissing).toBe(true);
      expect(result.targetExists).toBe(true);
    });

    it('should verify agent_workspace remains writable after migration', async () => {
      // Arrange
      const workspacePath = '/workspaces/agent-feed/prod/agent_workspace';
      const testFiles = ['agents/', 'data/', 'logs/', 'shared/'];

      mockPermissionChecker.validatePermissions
        .mockResolvedValue({
          read: true,
          write: true,
          context: 'agent_workspace_writable'
        });

      // Act
      const result = await systemProtector.verifyWorkspaceWritability(workspacePath, testFiles);

      // Assert - workspace should remain writable
      testFiles.forEach(file => {
        expect(mockPermissionChecker.validatePermissions)
          .toHaveBeenCalledWith(`${workspacePath}/${file}`, expect.objectContaining({
            requireWrite: true
          }));
      });

      expect(result.allWritable).toBe(true);
      expect(result.verifiedPaths).toBe(4);
    });

    it('should ensure migration preserves data integrity', async () => {
      // Arrange
      const sourcePath = '/workspaces/agent-feed/agent_workspace';
      const targetPath = '/workspaces/agent-feed/prod/agent_workspace';
      const dataFiles = ['data/tickets/', 'shared/customer-responses/'];

      mockContentIntegrityChecker.calculateChecksum
        .mockImplementation((path) => `checksum_${path.split('/').pop()}`);
      mockDirectoryValidator.checkIntegrity
        .mockResolvedValue({
          sourceChecksum: 'checksum_source',
          targetChecksum: 'checksum_source',
          filesCount: 208,
          integrity: true
        });

      // Act
      const result = await systemProtector.validateMigrationIntegrity(sourcePath, targetPath, dataFiles);

      // Assert - data integrity should be preserved
      expect(mockDirectoryValidator.checkIntegrity)
        .toHaveBeenCalledWith(targetPath, expect.objectContaining({
          verifyMigration: true,
          dataFiles: dataFiles
        }));
      expect(result.integrity).toBe(true);
      expect(result.filesCount).toBe(208);
    });
  });

  describe('Protection Mechanisms Integration', () => {
    it('should coordinate all protection mechanisms together', async () => {
      // Arrange - complex scenario with multiple protection layers
      const protectionRequest = {
        files: ['/prod/CLAUDE.md', '/prod/config/claude.config.js'],
        directories: ['/prod/config', '/prod/security'],
        environment: 'production',
        enforceReadOnly: true,
        verifyIntegrity: true
      };

      // Setup comprehensive mock expectations
      mockPermissionChecker.enforceReadOnlyMode
        .mockResolvedValue({ success: true, filesProtected: 2 });
      mockDirectoryValidator.validateStructure
        .mockResolvedValue({ valid: true, violations: [] });
      mockContentIntegrityChecker.verifyChecksum
        .mockResolvedValue({ valid: true, matches: true });
      mockAuditLogger.logAccessAttempt
        .mockResolvedValue({ logged: true });

      // Act
      const result = await systemProtector.enforceComprehensiveProtection(protectionRequest);

      // Assert - all protection mechanisms should work together
      expect(mockPermissionChecker.enforceReadOnlyMode)
        .toHaveBeenCalledWith(protectionRequest.files);
      expect(mockDirectoryValidator.validateStructure)
        .toHaveBeenCalledWith('/prod');
      expect(mockContentIntegrityChecker.verifyChecksum)
        .toHaveBeenCalledTimes(2);
      expect(mockAuditLogger.logAccessAttempt)
        .toHaveBeenCalledWith(expect.any(String), 'protection_enforcement', 'success');

      expect(result.success).toBe(true);
      expect(result.protectionLayers).toEqual({
        permissions: true,
        structure: true,
        integrity: true,
        audit: true
      });
    });

    it('should handle protection failures gracefully with rollback', async () => {
      // Arrange - simulate protection failure
      const protectionRequest = {
        files: ['/prod/CLAUDE.md'],
        rollbackOnFailure: true
      };

      mockPermissionChecker.enforceReadOnlyMode
        .mockResolvedValue({ success: true });
      mockDirectoryValidator.validateStructure
        .mockResolvedValue({ 
          valid: false, 
          violations: [{ severity: 'critical', path: '/prod/CLAUDE.md', issue: 'tampering' }] 
        });

      // Act & Assert - should handle failures and attempt rollback
      await expect(
        systemProtector.enforceComprehensiveProtection(protectionRequest)
      ).rejects.toThrow('Critical structure validation failed');

      // Verify rollback attempt was logged
      expect(mockAuditLogger.logProtectionViolation)
        .toHaveBeenCalledWith(expect.any(String), 'protection_enforcement_failed');
    });
  });

  describe('Contract Verification - Swarm Coordination', () => {
    it('should define clear contracts for swarm agent interaction', () => {
      // Contract definition for other swarm agents
      const protectionContract = {
        enforceReadOnlyMode: {
          input: { files: 'Array<string>' },
          output: { success: 'boolean', filesProtected: 'number' },
          collaborators: ['PermissionChecker', 'AuditLogger']
        },
        validateContentIntegrity: {
          input: { files: 'Array<string>' },
          output: { valid: 'boolean', verifiedFiles: 'number' },
          collaborators: ['ContentIntegrityChecker', 'AuditLogger']
        }
      };

      // Verify contract adherence through mock interactions
      expect(protectionContract.enforceReadOnlyMode.collaborators)
        .toContain('PermissionChecker');
      expect(protectionContract.validateContentIntegrity.collaborators)
        .toContain('ContentIntegrityChecker');
    });

    it('should share protection status with other swarm agents', async () => {
      // Arrange - mock swarm coordination
      const swarmCoordinator = {
        notifyProtectionStatus: jest.fn(),
        shareSecurityContext: jest.fn()
      };

      const protectionStatus = {
        systemProtected: true,
        lastVerified: new Date(),
        threatLevel: 'low'
      };

      mockAuditLogger.logAccessAttempt
        .mockResolvedValue({ logged: true });

      // Act
      await systemProtector.reportToSwarm(swarmCoordinator, protectionStatus);

      // Assert - should coordinate with swarm
      expect(swarmCoordinator.notifyProtectionStatus)
        .toHaveBeenCalledWith(protectionStatus);
      expect(swarmCoordinator.shareSecurityContext)
        .toHaveBeenCalledWith(expect.objectContaining({
          readOnlyEnforced: true,
          integrityVerified: true
        }));
    });
  });
});