/**
 * Mock Factory for TDD London School Tests
 * 
 * Centralized mock creation and management for consistent behavior verification
 */

class MockFactory {
  /**
   * Create file system mock with common behaviors
   */
  static createFileSystemMock() {
    return {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      access: jest.fn(),
      chmod: jest.fn(),
      stat: jest.fn(),
      readdir: jest.fn(),
      
      // Pre-configured behaviors
      setupReadOnlyFile: function(filePath) {
        this.access.mockImplementation((path, mode) => {
          if (path === filePath && mode === require('fs').constants.W_OK) {
            const error = new Error('EACCES: permission denied');
            error.code = 'EACCES';
            throw error;
          }
          return Promise.resolve();
        });
      },
      
      setupSuccessfulRead: function(filePath, content) {
        this.readFile.mockImplementation((path, encoding) => {
          if (path === filePath) {
            return Promise.resolve(content);
          }
          return Promise.reject(new Error('File not found'));
        });
      }
    };
  }

  /**
   * Create permission checker mock with security behaviors
   */
  static createPermissionCheckerMock() {
    return {
      checkReadPermission: jest.fn(),
      checkWritePermission: jest.fn(),
      enforceReadOnlyMode: jest.fn(),
      validatePermissions: jest.fn(),
      
      // Security-focused behaviors
      setupSystemFileProtection: function(systemFiles) {
        this.checkWritePermission.mockImplementation((filePath) => {
          return Promise.resolve(!systemFiles.includes(filePath));
        });
        
        this.checkReadPermission.mockImplementation(() => {
          return Promise.resolve(true); // Always allow read
        });
      },
      
      setupProductionEnvironment: function() {
        this.validatePermissions.mockImplementation((filePath, context) => {
          const isSystemFile = filePath.includes('/prod/') && 
                             (filePath.includes('CLAUDE.md') || filePath.includes('config/'));
          
          if (context.environment === 'production' && isSystemFile) {
            return Promise.resolve({
              read: true,
              write: false,
              context: 'production_system_file'
            });
          }
          
          return Promise.resolve({
            read: true,
            write: !isSystemFile,
            context: context.environment
          });
        });
      }
    };
  }

  /**
   * Create directory validator mock with structure validation
   */
  static createDirectoryValidatorMock() {
    return {
      validateStructure: jest.fn(),
      checkIntegrity: jest.fn(),
      verifyReadOnlyStatus: jest.fn(),
      
      // Structure validation behaviors
      setupValidStructure: function(basePath) {
        this.validateStructure.mockImplementation((path, expectedStructure) => {
          if (path === basePath) {
            return Promise.resolve({
              valid: true,
              violations: [],
              protectedFiles: Object.keys(expectedStructure || {}).length,
              readOnlyDirectories: 2
            });
          }
          return Promise.resolve({ valid: false, violations: ['path_not_found'] });
        });
      },
      
      setupMigrationValidation: function(oldPath, newPath) {
        this.validateStructure.mockImplementation((path, options) => {
          if (options && options.migrationValidation && path === newPath) {
            return Promise.resolve({
              sourceMissing: true,  // Old path should not exist
              targetExists: true,   // New path should exist
              migrationComplete: true,
              permissions: { read: true, write: true }
            });
          }
          return Promise.resolve({ valid: false });
        });
      }
    };
  }

  /**
   * Create content integrity checker mock
   */
  static createContentIntegrityCheckerMock() {
    return {
      calculateChecksum: jest.fn(),
      verifyChecksum: jest.fn(),
      detectUnauthorizedChanges: jest.fn(),
      
      // Integrity checking behaviors
      setupValidChecksums: function(fileChecksumMap) {
        this.calculateChecksum.mockImplementation((filePath) => {
          return fileChecksumMap[filePath] || `checksum_${Date.now()}`;
        });
        
        this.verifyChecksum.mockImplementation((filePath, expectedChecksum) => {
          const currentChecksum = fileChecksumMap[filePath];
          return Promise.resolve({
            valid: currentChecksum === expectedChecksum,
            matches: currentChecksum === expectedChecksum
          });
        });
      },
      
      setupTamperingDetection: function(compromisedFile, changes) {
        this.detectUnauthorizedChanges.mockImplementation((filePath, originalChecksum, currentChecksum) => {
          if (filePath === compromisedFile && originalChecksum !== currentChecksum) {
            return Promise.resolve({
              file: filePath,
              changes: changes || ['content_modified'],
              severity: 'critical'
            });
          }
          return Promise.resolve({ changes: [], severity: 'none' });
        });
      }
    };
  }

  /**
   * Create audit logger mock with security logging
   */
  static createAuditLoggerMock() {
    return {
      logAccessAttempt: jest.fn(),
      logModificationAttempt: jest.fn(),
      logProtectionViolation: jest.fn(),
      
      // Audit behaviors
      setupSuccessfulLogging: function() {
        this.logAccessAttempt.mockResolvedValue({ logged: true, timestamp: new Date() });
        this.logModificationAttempt.mockResolvedValue({ logged: true, alertSent: true });
        this.logProtectionViolation.mockResolvedValue({ logged: true, severity: 'high' });
      },
      
      getLoggedViolations: function() {
        return this.logProtectionViolation.mock.calls.map(call => ({
          file: call[0],
          violation: call[1],
          timestamp: new Date()
        }));
      }
    };
  }

  /**
   * Create swarm coordinator mock for integration tests
   */
  static createSwarmCoordinatorMock() {
    return {
      notifyProtectionStatus: jest.fn(),
      shareSecurityContext: jest.fn(),
      requestProtectionValidation: jest.fn(),
      
      // Swarm coordination behaviors
      setupCoordinationSuccess: function() {
        this.notifyProtectionStatus.mockResolvedValue({ acknowledged: true });
        this.shareSecurityContext.mockResolvedValue({ shared: true });
        this.requestProtectionValidation.mockResolvedValue({ validated: true });
      }
    };
  }

  /**
   * Create complete mock set for comprehensive testing
   */
  static createCompleteMockSet() {
    return {
      fileSystem: this.createFileSystemMock(),
      permissionChecker: this.createPermissionCheckerMock(),
      directoryValidator: this.createDirectoryValidatorMock(),
      contentIntegrityChecker: this.createContentIntegrityCheckerMock(),
      auditLogger: this.createAuditLoggerMock(),
      swarmCoordinator: this.createSwarmCoordinatorMock()
    };
  }

  /**
   * Setup common scenarios for testing
   */
  static setupProductionProtectionScenario(mocks) {
    const systemFiles = ['/prod/CLAUDE.md', '/prod/PRODUCTION_CLAUDE.md'];
    
    // Setup file system
    mocks.fileSystem.setupSuccessfulRead('/prod/CLAUDE.md', '# Claude Code Configuration');
    mocks.fileSystem.setupReadOnlyFile('/prod/CLAUDE.md');
    
    // Setup permissions
    mocks.permissionChecker.setupSystemFileProtection(systemFiles);
    mocks.permissionChecker.setupProductionEnvironment();
    
    // Setup directory validation
    mocks.directoryValidator.setupValidStructure('/prod');
    
    // Setup content integrity
    const checksums = {
      '/prod/CLAUDE.md': 'sha256:claude_config_checksum',
      '/prod/PRODUCTION_CLAUDE.md': 'sha256:prod_config_checksum'
    };
    mocks.contentIntegrityChecker.setupValidChecksums(checksums);
    
    // Setup audit logging
    mocks.auditLogger.setupSuccessfulLogging();
    
    return {
      systemFiles,
      checksums
    };
  }

  /**
   * Setup migration testing scenario
   */
  static setupMigrationScenario(mocks) {
    const oldPath = '/workspaces/agent-feed/agent_workspace';
    const newPath = '/workspaces/agent-feed/prod/agent_workspace';
    
    // Setup migration validation
    mocks.directoryValidator.setupMigrationValidation(oldPath, newPath);
    
    // Setup workspace writability
    mocks.permissionChecker.validatePermissions.mockImplementation((path, options) => {
      if (path.includes('agent_workspace') && options.requireWrite) {
        return Promise.resolve({
          read: true,
          write: true,
          context: 'agent_workspace_writable'
        });
      }
      return Promise.resolve({ read: true, write: false });
    });
    
    return {
      oldPath,
      newPath
    };
  }
}

module.exports = MockFactory;