/**
 * System Instructions Read-Only Protection Service
 * 
 * This is the implementation class driven by the TDD tests.
 * Following London School approach - focus on collaborations between objects.
 */

class SystemProtector {
  constructor(
    fileSystem,
    permissionChecker,
    directoryValidator,
    contentIntegrityChecker,
    auditLogger
  ) {
    this.fileSystem = fileSystem;
    this.permissionChecker = permissionChecker;
    this.directoryValidator = directoryValidator;
    this.contentIntegrityChecker = contentIntegrityChecker;
    this.auditLogger = auditLogger;
  }

  /**
   * Verify read-only access permissions for system files
   */
  async verifyReadOnlyAccess(filePath) {
    const canRead = await this.permissionChecker.checkReadPermission(filePath);
    const canWrite = await this.permissionChecker.checkWritePermission(filePath);
    
    await this.auditLogger.logAccessAttempt(
      filePath, 
      'read', 
      canRead ? 'success' : 'denied'
    );

    return {
      canRead,
      canWrite,
      isReadOnly: canRead && !canWrite
    };
  }

  /**
   * Enforce system-wide read-only protection
   */
  async enforceSystemProtection(configFiles) {
    try {
      const result = await this.permissionChecker.enforceReadOnlyMode(configFiles);
      
      await this.auditLogger.logAccessAttempt(
        'system_protection',
        'enforcement',
        'success'
      );

      return result;
    } catch (error) {
      await this.auditLogger.logProtectionViolation(
        'system_protection',
        'enforcement_failed'
      );
      throw error;
    }
  }

  /**
   * Attempt to modify a protected file - should fail
   */
  async attemptModification(filePath, modificationAttempt) {
    const canWrite = await this.permissionChecker.checkWritePermission(filePath);
    
    await this.auditLogger.logModificationAttempt(
      filePath,
      modificationAttempt.user,
      canWrite ? 'allowed' : 'denied'
    );

    if (!canWrite) {
      await this.auditLogger.logProtectionViolation(
        filePath,
        'write_attempt_blocked'
      );
      throw new Error('File modification denied: Read-only protection active');
    }

    // If we reach here, modification would be allowed (shouldn't happen for protected files)
    return await this.fileSystem.writeFile(filePath, modificationAttempt.content);
  }

  /**
   * Verify production environment access permissions
   */
  async verifyProdAccess(systemFile, prodContext) {
    const permissions = await this.permissionChecker.validatePermissions(systemFile, prodContext);
    
    if (permissions.read) {
      const content = await this.fileSystem.readFile(systemFile, 'utf8');
    }

    return {
      canRead: permissions.read,
      canWrite: permissions.write,
      context: permissions.context
    };
  }

  /**
   * Attempt production write - should fail for system files
   */
  async attemptProdWrite(systemFile, writeAttempt, prodContext) {
    const permissions = await this.permissionChecker.validatePermissions(systemFile, prodContext);
    
    await this.auditLogger.logModificationAttempt(
      systemFile,
      prodContext.process,
      permissions.write ? 'allowed_production_write' : 'denied_production_write'
    );

    if (!permissions.write) {
      throw new Error('Write access denied: System files are read-only');
    }

    return await this.fileSystem.writeFile(systemFile, writeAttempt.data);
  }

  /**
   * Verify development environment access
   */
  async verifyDevAccess(systemFile, devContext) {
    const permissions = await this.permissionChecker.validatePermissions(systemFile, devContext);
    
    return {
      canRead: permissions.read,
      canWrite: permissions.write,
      context: permissions.context
    };
  }

  /**
   * Validate production directory structure
   */
  async validateProdStructure(expectedStructure = null) {
    const result = await this.directoryValidator.validateStructure('/prod', expectedStructure);
    
    if (!result.valid && result.violations) {
      for (const violation of result.violations) {
        await this.auditLogger.logProtectionViolation(violation.path, violation.issue);
      }
    }

    return result;
  }

  /**
   * Verify critical directories are read-only
   */
  async verifyCriticalDirectories(criticalDirs) {
    const result = await this.directoryValidator.verifyReadOnlyStatus(criticalDirs);
    return result;
  }

  /**
   * Verify content integrity using checksums
   */
  async verifyContentIntegrity(systemFiles) {
    const results = {};
    let validCount = 0;

    for (const file of systemFiles) {
      const checksum = await this.contentIntegrityChecker.calculateChecksum(file);
      const verification = await this.contentIntegrityChecker.verifyChecksum(file, checksum);
      
      results[file] = verification;
      if (verification.valid) validCount++;
    }

    return {
      valid: validCount === systemFiles.length,
      verifiedFiles: validCount,
      results
    };
  }

  /**
   * Detect content tampering
   */
  async detectContentTampering(filePath, originalChecksum) {
    const currentChecksum = await this.contentIntegrityChecker.calculateChecksum(filePath);
    const verification = await this.contentIntegrityChecker.verifyChecksum(filePath, originalChecksum);
    
    if (!verification.valid) {
      const changes = await this.contentIntegrityChecker.detectUnauthorizedChanges(
        filePath,
        originalChecksum,
        currentChecksum
      );
      
      await this.auditLogger.logProtectionViolation(filePath, 'content_tampering_detected');
      
      return {
        tampered: true,
        changes: changes.changes,
        severity: changes.severity
      };
    }

    return {
      tampered: false,
      verified: true
    };
  }

  /**
   * Verify against baseline checksums
   */
  async verifyAgainstBaseline(systemFiles, baselineFile) {
    const baselineData = JSON.parse(await this.fileSystem.readFile(baselineFile, 'utf8'));
    const results = {};
    let validCount = 0;

    for (const file of systemFiles) {
      const baseline = baselineData[file];
      const verification = await this.contentIntegrityChecker.verifyChecksum(file, baseline.checksum);
      
      results[file] = verification;
      if (verification.valid) validCount++;
    }

    return {
      allValid: validCount === systemFiles.length,
      verifiedFiles: validCount,
      results
    };
  }

  /**
   * Validate agent workspace migration
   */
  async validateWorkspaceMigration(oldPath, newPath) {
    const result = await this.directoryValidator.validateStructure(newPath, {
      migrationValidation: true,
      sourcePath: oldPath
    });

    return result;
  }

  /**
   * Verify workspace remains writable after migration
   */
  async verifyWorkspaceWritability(workspacePath, testFiles) {
    const results = {};
    let writableCount = 0;

    for (const file of testFiles) {
      const fullPath = `${workspacePath}/${file}`;
      const permissions = await this.permissionChecker.validatePermissions(fullPath, {
        requireWrite: true
      });
      
      results[file] = permissions;
      if (permissions.read && permissions.write) writableCount++;
    }

    return {
      allWritable: writableCount === testFiles.length,
      verifiedPaths: writableCount,
      results
    };
  }

  /**
   * Validate migration data integrity
   */
  async validateMigrationIntegrity(sourcePath, targetPath, dataFiles) {
    const result = await this.directoryValidator.checkIntegrity(targetPath, {
      verifyMigration: true,
      dataFiles: dataFiles
    });

    return result;
  }

  /**
   * Enforce comprehensive protection across all layers
   */
  async enforceComprehensiveProtection(protectionRequest) {
    const results = {};

    try {
      // Validate input
      if (!protectionRequest.files || !Array.isArray(protectionRequest.files)) {
        throw new Error('Invalid protection request: files must be an array');
      }

      // Layer 1: Permission enforcement
      if (protectionRequest.enforceReadOnly) {
        const permissionResult = await this.permissionChecker.enforceReadOnlyMode(
          protectionRequest.files
        );
        results.permissions = permissionResult.success;
      }

      // Layer 2: Structure validation
      const structureResult = await this.directoryValidator.validateStructure('/prod');
      results.structure = structureResult ? structureResult.valid : false;

      // If structure validation fails and it's critical, fail fast
      if (structureResult && !structureResult.valid && structureResult.violations && 
          structureResult.violations.some(v => v.severity === 'critical')) {
        throw new Error('Critical structure validation failed');
      }

      // Layer 3: Content integrity
      if (protectionRequest.verifyIntegrity) {
        results.integrity = true;
        for (const file of protectionRequest.files) {
          const verification = await this.contentIntegrityChecker.verifyChecksum(file, 'expected');
          if (!verification.valid) {
            results.integrity = false;
            break;
          }
        }
      }

      // Layer 4: Audit logging
      await this.auditLogger.logAccessAttempt(
        'comprehensive_protection',
        'protection_enforcement',
        'success'
      );
      results.audit = true;

      return {
        success: Object.values(results).every(r => r === true),
        protectionLayers: results
      };

    } catch (error) {
      await this.auditLogger.logProtectionViolation(
        'comprehensive_protection',
        'protection_enforcement_failed'
      );
      throw error;
    }
  }

  /**
   * Report protection status to swarm coordination
   */
  async reportToSwarm(swarmCoordinator, protectionStatus) {
    await swarmCoordinator.notifyProtectionStatus(protectionStatus);
    
    const securityContext = {
      readOnlyEnforced: protectionStatus.systemProtected,
      integrityVerified: protectionStatus.threatLevel === 'low',
      lastVerified: protectionStatus.lastVerified
    };
    
    await swarmCoordinator.shareSecurityContext(securityContext);
    
    await this.auditLogger.logAccessAttempt(
      'swarm_coordination',
      'status_report',
      'success'
    );
  }
}

module.exports = SystemProtector;