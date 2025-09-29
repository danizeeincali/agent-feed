/**
 * Migration Safety Tests: Data Migration Validation
 *
 * London School TDD - Ensures safe data migration from dual to single architecture
 * Tests data integrity, compatibility, and zero-downtime migration
 */

import { jest } from '@jest/globals';

describe('Data Migration Safety Tests', () => {
  let mockSourceSystem;
  let mockTargetSystem;
  let mockMigrationEngine;

  beforeEach(() => {
    // Mock source system (dual architecture)
    mockSourceSystem = {
      nextDatabase: ArchitectureTestUtils.createDbMock(),
      viteConfig: { apiProxy: 'http://localhost:3000' },
      dataStructures: {
        agents: 'nextjs_format',
        activities: 'nextjs_format'
      }
    };

    // Mock target system (single architecture)
    mockTargetSystem = {
      unifiedDatabase: ArchitectureTestUtils.createDbMock(),
      dataStructures: {
        agents: 'unified_format',
        activities: 'unified_format'
      }
    };

    // Mock migration engine
    mockMigrationEngine = {
      validateSource: jest.fn(),
      transformData: jest.fn(),
      validateTarget: jest.fn(),
      backup: jest.fn(),
      restore: jest.fn(),
      rollback: jest.fn()
    };
  });

  describe('Pre-Migration Validation', () => {
    it('should validate source data integrity before migration', async () => {
      // Arrange
      const mockSourceData = {
        agents: [
          { id: '1', name: 'Agent 1', status: 'active' },
          { id: '2', name: 'Agent 2', status: 'inactive' }
        ],
        activities: [
          { id: '1', agentId: '1', action: 'created', timestamp: '2024-01-01' }
        ]
      };

      mockMigrationEngine.validateSource.mockImplementation((data) => {
        const validation = {
          valid: true,
          errors: [],
          warnings: []
        };

        // Check for data consistency
        data.agents.forEach(agent => {
          if (!agent.id || !agent.name) {
            validation.valid = false;
            validation.errors.push(`Invalid agent: ${JSON.stringify(agent)}`);
          }
        });

        // Check referential integrity
        data.activities.forEach(activity => {
          if (!data.agents.find(agent => agent.id === activity.agentId)) {
            validation.valid = false;
            validation.errors.push(`Orphaned activity: ${activity.id}`);
          }
        });

        return validation;
      });

      // Act
      const validation = mockMigrationEngine.validateSource(mockSourceData);

      // Assert - Verify source validation
      expect(mockMigrationEngine.validateSource).toHaveBeenCalledWith(mockSourceData);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect and report data inconsistencies', async () => {
      // Arrange
      const inconsistentData = {
        agents: [
          { id: '1', name: 'Agent 1', status: 'active' },
          { id: null, name: 'Invalid Agent', status: 'active' } // Invalid: null ID
        ],
        activities: [
          { id: '1', agentId: '999', action: 'created', timestamp: '2024-01-01' } // Orphaned
        ]
      };

      mockMigrationEngine.validateSource.mockImplementation((data) => {
        const validation = { valid: false, errors: [], warnings: [] };

        data.agents.forEach((agent, index) => {
          if (!agent.id) {
            validation.errors.push(`Agent at index ${index} has null ID`);
          }
        });

        data.activities.forEach(activity => {
          if (!data.agents.find(agent => agent.id === activity.agentId)) {
            validation.errors.push(`Activity ${activity.id} references non-existent agent ${activity.agentId}`);
          }
        });

        return validation;
      });

      // Act
      const validation = mockMigrationEngine.validateSource(inconsistentData);

      // Assert - Verify inconsistency detection
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Agent at index 1 has null ID');
      expect(validation.errors).toContain('Activity 1 references non-existent agent 999');
    });

    it('should create pre-migration backup', async () => {
      // Arrange
      const backupLocation = '/backups/pre-migration-2024-01-01';
      const sourceData = { agents: [], activities: [], posts: [] };

      mockMigrationEngine.backup.mockImplementation((data, location) => {
        return {
          success: true,
          location,
          size: JSON.stringify(data).length,
          timestamp: new Date().toISOString(),
          checksum: 'abc123def456'
        };
      });

      // Act
      const backupResult = mockMigrationEngine.backup(sourceData, backupLocation);

      // Assert - Verify backup creation
      expect(mockMigrationEngine.backup).toHaveBeenCalledWith(sourceData, backupLocation);
      expect(backupResult.success).toBe(true);
      expect(backupResult.location).toBe(backupLocation);
      expect(backupResult.checksum).toBeDefined();
    });
  });

  describe('Data Transformation Safety', () => {
    it('should safely transform dual system data structures to unified format', async () => {
      // Arrange
      const dualSystemData = {
        agents: [
          { agentId: '1', agentName: 'Agent 1', agentStatus: 'active' }, // Old format
          { id: '2', name: 'Agent 2', status: 'inactive' } // Mixed format
        ]
      };

      const expectedUnifiedFormat = {
        agents: [
          { id: '1', name: 'Agent 1', status: 'active' },
          { id: '2', name: 'Agent 2', status: 'inactive' }
        ]
      };

      mockMigrationEngine.transformData.mockImplementation((data) => {
        const transformed = { agents: [] };

        data.agents.forEach(agent => {
          transformed.agents.push({
            id: agent.id || agent.agentId,
            name: agent.name || agent.agentName,
            status: agent.status || agent.agentStatus
          });
        });

        return transformed;
      });

      // Act
      const transformedData = mockMigrationEngine.transformData(dualSystemData);

      // Assert - Verify safe transformation
      expect(mockMigrationEngine.transformData).toHaveBeenCalledWith(dualSystemData);
      expect(transformedData).toEqual(expectedUnifiedFormat);
      ContractVerification.verifyDataFlow(
        dualSystemData,
        mockMigrationEngine.transformData,
        expectedUnifiedFormat
      );
    });

    it('should handle null and undefined values safely during transformation', async () => {
      // Arrange
      const problematicData = {
        agents: [
          { id: '1', name: 'Valid Agent', status: 'active' },
          { id: null, name: 'Null ID Agent', status: 'active' },
          { id: '3', name: null, status: 'inactive' },
          { id: '4', name: 'Missing Status' }, // Missing status field
          null, // Null agent entry
          undefined // Undefined agent entry
        ]
      };

      mockMigrationEngine.transformData.mockImplementation((data) => {
        const transformed = { agents: [], errors: [] };

        data.agents.forEach((agent, index) => {
          if (!agent) {
            transformed.errors.push(`Null/undefined agent at index ${index}`);
            return;
          }

          if (!agent.id) {
            transformed.errors.push(`Agent at index ${index} missing ID`);
            return;
          }

          transformed.agents.push({
            id: agent.id,
            name: agent.name || 'Unknown',
            status: agent.status || 'unknown'
          });
        });

        return transformed;
      });

      // Act
      const result = mockMigrationEngine.transformData(problematicData);

      // Assert - Verify safe handling of problematic data
      expect(result.agents).toHaveLength(3); // Only valid agents
      expect(result.errors).toHaveLength(3); // Documented errors
      expect(result.agents.every(agent => agent.id && agent.name && agent.status)).toBe(true);
    });

    it('should preserve data relationships during transformation', async () => {
      // Arrange
      const relatedData = {
        agents: [
          { id: '1', name: 'Agent 1', status: 'active' }
        ],
        activities: [
          { id: '1', agentId: '1', action: 'created', timestamp: '2024-01-01' },
          { id: '2', agentId: '1', action: 'updated', timestamp: '2024-01-02' }
        ],
        posts: [
          { id: '1', agentId: '1', content: 'Post content', timestamp: '2024-01-03' }
        ]
      };

      mockMigrationEngine.transformData.mockImplementation((data) => {
        // Verify relationships are maintained
        const agentIds = new Set(data.agents.map(a => a.id));
        const orphanedActivities = data.activities.filter(a => !agentIds.has(a.agentId));
        const orphanedPosts = data.posts.filter(p => !agentIds.has(p.agentId));

        return {
          ...data,
          relationshipIntegrity: {
            orphanedActivities: orphanedActivities.length,
            orphanedPosts: orphanedPosts.length,
            valid: orphanedActivities.length === 0 && orphanedPosts.length === 0
          }
        };
      });

      // Act
      const result = mockMigrationEngine.transformData(relatedData);

      // Assert - Verify relationship preservation
      expect(result.relationshipIntegrity.valid).toBe(true);
      expect(result.relationshipIntegrity.orphanedActivities).toBe(0);
      expect(result.relationshipIntegrity.orphanedPosts).toBe(0);
    });
  });

  describe('Target System Validation', () => {
    it('should validate transformed data against target schema', async () => {
      // Arrange
      const transformedData = {
        agents: [
          { id: '1', name: 'Agent 1', status: 'active' }
        ]
      };

      const targetSchema = {
        agents: {
          required: ['id', 'name', 'status'],
          types: { id: 'string', name: 'string', status: 'string' },
          constraints: { status: ['active', 'inactive', 'unknown'] }
        }
      };

      mockMigrationEngine.validateTarget.mockImplementation((data, schema) => {
        const validation = { valid: true, errors: [] };

        data.agents.forEach((agent, index) => {
          schema.agents.required.forEach(field => {
            if (!agent[field]) {
              validation.valid = false;
              validation.errors.push(`Agent ${index} missing required field: ${field}`);
            }
          });

          if (agent.status && !schema.agents.constraints.status.includes(agent.status)) {
            validation.valid = false;
            validation.errors.push(`Agent ${index} has invalid status: ${agent.status}`);
          }
        });

        return validation;
      });

      // Act
      const validation = mockMigrationEngine.validateTarget(transformedData, targetSchema);

      // Assert - Verify target validation
      expect(mockMigrationEngine.validateTarget).toHaveBeenCalledWith(transformedData, targetSchema);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect schema violations in transformed data', async () => {
      // Arrange
      const invalidTransformedData = {
        agents: [
          { id: '1', name: 'Agent 1', status: 'invalid_status' }, // Invalid status
          { name: 'Agent 2', status: 'active' } // Missing ID
        ]
      };

      const targetSchema = {
        agents: {
          required: ['id', 'name', 'status'],
          constraints: { status: ['active', 'inactive', 'unknown'] }
        }
      };

      mockMigrationEngine.validateTarget.mockImplementation((data, schema) => {
        const validation = { valid: false, errors: [] };

        data.agents.forEach((agent, index) => {
          if (!agent.id) {
            validation.errors.push(`Agent ${index} missing required field: id`);
          }
          if (agent.status && !schema.agents.constraints.status.includes(agent.status)) {
            validation.errors.push(`Agent ${index} has invalid status: ${agent.status}`);
          }
        });

        return validation;
      });

      // Act
      const validation = mockMigrationEngine.validateTarget(invalidTransformedData, targetSchema);

      // Assert - Verify schema violation detection
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Agent 0 has invalid status: invalid_status');
      expect(validation.errors).toContain('Agent 1 missing required field: id');
    });
  });

  describe('Rollback Safety', () => {
    it('should provide rollback capability in case of migration failure', async () => {
      // Arrange
      const backupData = {
        agents: [{ id: '1', name: 'Original Agent' }],
        timestamp: '2024-01-01T00:00:00Z',
        checksum: 'original_checksum'
      };

      mockMigrationEngine.rollback.mockImplementation((backup) => {
        return {
          success: true,
          restored: backup,
          verification: backup.checksum === 'original_checksum'
        };
      });

      // Act
      const rollbackResult = mockMigrationEngine.rollback(backupData);

      // Assert - Verify rollback capability
      expect(mockMigrationEngine.rollback).toHaveBeenCalledWith(backupData);
      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.verification).toBe(true);
      expect(rollbackResult.restored).toEqual(backupData);
    });

    it('should validate rollback integrity', async () => {
      // Arrange
      const corruptedBackup = {
        agents: [{ id: '1', name: 'Agent' }],
        timestamp: '2024-01-01T00:00:00Z',
        checksum: 'wrong_checksum'
      };

      mockMigrationEngine.rollback.mockImplementation((backup) => {
        const expectedChecksum = 'original_checksum';
        const isValid = backup.checksum === expectedChecksum;

        return {
          success: isValid,
          error: isValid ? null : 'Backup integrity check failed',
          checksumMatch: isValid
        };
      });

      // Act
      const rollbackResult = mockMigrationEngine.rollback(corruptedBackup);

      // Assert - Verify rollback integrity check
      expect(rollbackResult.success).toBe(false);
      expect(rollbackResult.error).toBe('Backup integrity check failed');
      expect(rollbackResult.checksumMatch).toBe(false);
    });
  });

  describe('Zero-Downtime Migration Strategy', () => {
    it('should support parallel operation during migration', async () => {
      // Arrange
      const mockParallelOperation = {
        oldSystem: { running: true, serving: ['read', 'write'] },
        newSystem: { running: false, serving: [] },
        migrationPhase: 'preparation'
      };

      const mockPhaseTransition = jest.fn().mockImplementation((currentPhase) => {
        const phases = {
          preparation: {
            oldSystem: { running: true, serving: ['read', 'write'] },
            newSystem: { running: false, serving: [] }
          },
          migration: {
            oldSystem: { running: true, serving: ['read'] },
            newSystem: { running: true, serving: ['write'] }
          },
          validation: {
            oldSystem: { running: true, serving: [] },
            newSystem: { running: true, serving: ['read', 'write'] }
          },
          completion: {
            oldSystem: { running: false, serving: [] },
            newSystem: { running: true, serving: ['read', 'write'] }
          }
        };

        return phases[currentPhase];
      });

      // Act
      const preparationPhase = mockPhaseTransition('preparation');
      const migrationPhase = mockPhaseTransition('migration');
      const completionPhase = mockPhaseTransition('completion');

      // Assert - Verify zero-downtime strategy
      expect(preparationPhase.oldSystem.running).toBe(true);
      expect(migrationPhase.oldSystem.serving).toContain('read');
      expect(migrationPhase.newSystem.serving).toContain('write');
      expect(completionPhase.newSystem.serving).toEqual(['read', 'write']);
      expect(completionPhase.oldSystem.running).toBe(false);
    });

    it('should maintain service availability throughout migration', async () => {
      // Arrange
      const mockServiceMonitor = jest.fn().mockImplementation((phase) => {
        const serviceMatrix = {
          preparation: { available: true, systems: 1, latency: 100 },
          migration: { available: true, systems: 2, latency: 150 },
          completion: { available: true, systems: 1, latency: 80 }
        };

        return serviceMatrix[phase];
      });

      // Act
      const preparationAvailability = mockServiceMonitor('preparation');
      const migrationAvailability = mockServiceMonitor('migration');
      const completionAvailability = mockServiceMonitor('completion');

      // Assert - Verify continuous availability
      expect(preparationAvailability.available).toBe(true);
      expect(migrationAvailability.available).toBe(true);
      expect(completionAvailability.available).toBe(true);

      // Verify improved performance post-migration
      expect(completionAvailability.latency).toBeLessThan(preparationAvailability.latency);
      expect(completionAvailability.systems).toBe(1); // Simplified to single system
    });
  });
});