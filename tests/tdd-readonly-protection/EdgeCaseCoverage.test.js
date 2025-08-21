/**
 * Edge Case Coverage Tests - London School TDD
 * 
 * Tests to cover remaining edge cases and achieve 100% coverage
 */

const MockFactory = require('./MockFactory');

describe('Edge Case Coverage for 100% Test Coverage', () => {
  let mocks;
  let systemProtector;
  
  beforeEach(() => {
    mocks = MockFactory.createCompleteMockSet();
    const SystemProtector = require('./SystemProtector');
    systemProtector = new SystemProtector(
      mocks.fileSystem,
      mocks.permissionChecker,
      mocks.directoryValidator,
      mocks.contentIntegrityChecker,
      mocks.auditLogger
    );
  });

  describe('Mock Factory Coverage', () => {
    it('should test all unused mock factory methods', async () => {
      // Test file system mock edge cases
      const fileSystemMock = MockFactory.createFileSystemMock();
      
      // Test invalid file read
      await expect(
        fileSystemMock.readFile('/nonexistent/file.txt')
      ).rejects.toThrow('File not found');
    });

    it('should test permission checker edge cases', async () => {
      const permissionMock = MockFactory.createPermissionCheckerMock();
      
      // Test non-production environment
      permissionMock.setupProductionEnvironment();
      
      const result = await permissionMock.validatePermissions(
        '/data/regular.txt',
        { environment: 'development' }
      );
      
      expect(result.read).toBe(true);
      expect(result.write).toBe(true);
      expect(result.context).toBe('development');
    });

    it('should test directory validator edge cases', async () => {
      const validatorMock = MockFactory.createDirectoryValidatorMock();
      
      // Test invalid path
      const result = await validatorMock.validateStructure('/invalid/path');
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('path_not_found');
    });

    it('should test content integrity checker edge cases', async () => {
      const integrityMock = MockFactory.createContentIntegrityCheckerMock();
      
      // Test non-compromised file
      const result = await integrityMock.detectUnauthorizedChanges(
        '/safe/file.txt',
        'same_checksum',
        'same_checksum'
      );
      
      expect(result.changes).toHaveLength(0);
      expect(result.severity).toBe('none');
    });
  });

  describe('System Protector Edge Cases', () => {
    it('should handle successful file modification when allowed', async () => {
      // Setup writable file scenario
      const writableFile = '/data/writable.txt';
      const modificationAttempt = { content: 'new content', user: 'authorized' };
      
      mocks.permissionChecker.checkWritePermission.mockResolvedValue(true);
      mocks.auditLogger.logModificationAttempt.mockResolvedValue({ logged: true });
      mocks.fileSystem.writeFile.mockResolvedValue(true);

      // Should succeed for writable files
      const result = await systemProtector.attemptModification(writableFile, modificationAttempt);
      
      expect(result).toBe(true);
      expect(mocks.fileSystem.writeFile)
        .toHaveBeenCalledWith(writableFile, modificationAttempt.content);
      expect(mocks.auditLogger.logModificationAttempt)
        .toHaveBeenCalledWith(writableFile, 'authorized', 'allowed');
    });

    it('should handle successful production write when allowed', async () => {
      // Setup writable production file scenario
      const writableFile = '/prod/data/writable.txt';
      const writeAttempt = { data: 'production data' };
      const prodContext = { environment: 'production', process: 'claude-prod' };
      
      mocks.permissionChecker.validatePermissions.mockResolvedValue({
        read: true,
        write: true,
        context: 'production_data_file'
      });
      mocks.auditLogger.logModificationAttempt.mockResolvedValue({ logged: true });
      mocks.fileSystem.writeFile.mockResolvedValue(true);

      // Should succeed for writable production files
      const result = await systemProtector.attemptProdWrite(writableFile, writeAttempt, prodContext);
      
      expect(result).toBe(true);
      expect(mocks.fileSystem.writeFile)
        .toHaveBeenCalledWith(writableFile, writeAttempt.data);
      expect(mocks.auditLogger.logModificationAttempt)
        .toHaveBeenCalledWith(writableFile, 'claude-prod', 'allowed_production_write');
    });

    it('should handle successful content tampering verification', async () => {
      // Setup non-tampered file scenario
      const filePath = '/prod/CLAUDE.md';
      const validChecksum = 'sha256:valid';
      
      mocks.contentIntegrityChecker.calculateChecksum.mockReturnValue(validChecksum);
      mocks.contentIntegrityChecker.verifyChecksum.mockResolvedValue({
        valid: true,
        matches: true
      });

      // Should verify successfully for non-tampered files
      const result = await systemProtector.detectContentTampering(filePath, validChecksum);
      
      expect(result.tampered).toBe(false);
      expect(result.verified).toBe(true);
    });

    it('should handle missing baseline file gracefully', async () => {
      // Setup missing baseline scenario
      const systemFiles = ['/prod/CLAUDE.md'];
      const missingBaselineFile = '/prod/.checksums/missing.json';
      
      mocks.fileSystem.readFile.mockRejectedValue(new Error('File not found'));

      // Should handle missing baseline gracefully
      await expect(
        systemProtector.verifyAgainstBaseline(systemFiles, missingBaselineFile)
      ).rejects.toThrow('File not found');

      expect(mocks.fileSystem.readFile)
        .toHaveBeenCalledWith(missingBaselineFile, 'utf8');
    });

    it('should handle comprehensive protection without optional features', async () => {
      // Setup minimal protection request
      const minimalRequest = {
        files: ['/prod/CLAUDE.md'],
        enforceReadOnly: false,  // Skip permission enforcement
        verifyIntegrity: false   // Skip integrity checks
      };

      mocks.directoryValidator.validateStructure.mockResolvedValue({
        valid: true,
        violations: []
      });
      mocks.auditLogger.logAccessAttempt.mockResolvedValue({ logged: true });

      // Should handle minimal protection request
      const result = await systemProtector.enforceComprehensiveProtection(minimalRequest);
      
      expect(result.success).toBe(true);
      expect(result.protectionLayers.structure).toBe(true);
      expect(result.protectionLayers.audit).toBe(true);
      expect(result.protectionLayers.permissions).toBeUndefined();
      expect(result.protectionLayers.integrity).toBeUndefined();
    });

    it('should handle invalid protection request', async () => {
      // Setup invalid request
      const invalidRequest = {
        files: null  // Invalid files array
      };

      mocks.auditLogger.logProtectionViolation.mockResolvedValue({ logged: true });

      // Should throw validation error
      await expect(
        systemProtector.enforceComprehensiveProtection(invalidRequest)
      ).rejects.toThrow('Invalid protection request: files must be an array');

      expect(mocks.auditLogger.logProtectionViolation)
        .toHaveBeenCalledWith('comprehensive_protection', 'protection_enforcement_failed');
    });

    it('should handle integrity check failure in loop', async () => {
      // Setup integrity failure scenario
      const protectionRequest = {
        files: ['/prod/file1.md', '/prod/file2.md'],
        verifyIntegrity: true
      };

      mocks.directoryValidator.validateStructure.mockResolvedValue({
        valid: true,
        violations: []
      });
      mocks.contentIntegrityChecker.verifyChecksum
        .mockResolvedValueOnce({ valid: true })   // First file passes
        .mockResolvedValueOnce({ valid: false }); // Second file fails
      mocks.auditLogger.logAccessAttempt.mockResolvedValue({ logged: true });

      // Should handle integrity failure
      const result = await systemProtector.enforceComprehensiveProtection(protectionRequest);
      
      expect(result.success).toBe(false);
      expect(result.protectionLayers.integrity).toBe(false);
      expect(mocks.contentIntegrityChecker.verifyChecksum)
        .toHaveBeenCalledTimes(2);
    });
  });

  describe('Full Coverage Test Scenarios', () => {
    it('should exercise all MockFactory setup methods', () => {
      const completeMocks = MockFactory.createCompleteMockSet();
      
      // Exercise production protection scenario
      const prodScenario = MockFactory.setupProductionProtectionScenario(completeMocks);
      expect(prodScenario.systemFiles).toHaveLength(2);
      expect(Object.keys(prodScenario.checksums)).toHaveLength(2);
      
      // Exercise migration scenario
      const migrationScenario = MockFactory.setupMigrationScenario(completeMocks);
      expect(migrationScenario.oldPath).toContain('agent_workspace');
      expect(migrationScenario.newPath).toContain('prod/agent_workspace');
    });

    it('should test all permission checker setup combinations', async () => {
      const permissionMock = MockFactory.createPermissionCheckerMock();
      
      // Test system file protection
      permissionMock.setupSystemFileProtection(['/prod/CLAUDE.md']);
      let canWrite = await permissionMock.checkWritePermission('/prod/CLAUDE.md');
      expect(canWrite).toBe(false);
      
      canWrite = await permissionMock.checkWritePermission('/data/normal.txt');
      expect(canWrite).toBe(true);
      
      // Test read permission (always true)
      const canRead = await permissionMock.checkReadPermission('/any/file.txt');
      expect(canRead).toBe(true);
    });

    it('should test all directory validator setup combinations', async () => {
      const validatorMock = MockFactory.createDirectoryValidatorMock();
      
      // Test valid structure setup
      validatorMock.setupValidStructure('/prod');
      let result = await validatorMock.validateStructure('/prod', {});
      expect(result.valid).toBe(true);
      
      // Test migration validation setup
      validatorMock.setupMigrationValidation('/old', '/new');
      result = await validatorMock.validateStructure('/new', { migrationValidation: true });
      expect(result.migrationComplete).toBe(true);
      
      // Test non-migration validation
      result = await validatorMock.validateStructure('/new', {});
      expect(result.valid).toBe(false);
    });

    it('should test all content integrity checker setup combinations', () => {
      const integrityMock = MockFactory.createContentIntegrityCheckerMock();
      
      // Test checksum validation with different checksums
      integrityMock.setupValidChecksums({
        '/file1.txt': 'checksum1',
        '/file2.txt': 'checksum2'
      });
      
      const checksum1 = integrityMock.calculateChecksum('/file1.txt');
      const checksum2 = integrityMock.calculateChecksum('/file2.txt');
      const checksumUnknown = integrityMock.calculateChecksum('/unknown.txt');
      
      expect(checksum1).toBe('checksum1');
      expect(checksum2).toBe('checksum2');
      expect(checksumUnknown).toMatch(/^checksum_\d+$/);
    });
  });
});