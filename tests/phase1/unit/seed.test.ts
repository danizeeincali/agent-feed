/**
 * Unit tests for system template seeding
 * London School TDD: Test interactions between objects using mocks
 */

import { seedSystemTemplates } from '../../../src/database/seed-templates';
import * as fs from 'fs/promises';
import { Pool } from 'pg';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../../../src/utils/logger');

describe('seedSystemTemplates - Unit Tests (London School)', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock pool with query method
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    } as any;
  });

  describe('Collaboration Pattern: File System and Database Interaction', () => {
    it('should read template directory and load JSON files', async () => {
      // Arrange: Mock filesystem to return template files
      const mockFiles = ['tech-guru.json', 'creative-writer.json', 'data-analyst.json'];
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);

      const mockTemplateContent = JSON.stringify({
        name: 'tech-guru',
        version: 1,
        model: null,
        posting_rules: { max_length: 280 },
        api_schema: { platform: 'twitter' },
        safety_constraints: { content_filters: [] },
        default_personality: 'Test personality',
        default_response_style: { tone: 'professional' }
      });

      (fs.readFile as jest.Mock).mockResolvedValue(mockTemplateContent);
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      // Act: Execute seeding
      await seedSystemTemplates(mockPool, '/config/system/agent-templates');

      // Assert: Verify file system interactions
      expect(fs.readdir).toHaveBeenCalledWith('/config/system/agent-templates');
      expect(fs.readFile).toHaveBeenCalledTimes(3);
      expect(fs.readFile).toHaveBeenCalledWith(
        '/config/system/agent-templates/tech-guru.json',
        'utf-8'
      );
    });

    it('should parse JSON and insert into database with correct parameters', async () => {
      // Arrange: Mock a single template file
      (fs.readdir as jest.Mock).mockResolvedValue(['tech-guru.json']);

      const mockTemplate = {
        name: 'tech-guru',
        version: 1,
        model: null,
        posting_rules: { max_length: 280, min_interval_seconds: 60 },
        api_schema: { platform: 'twitter', endpoints: {} },
        safety_constraints: { content_filters: ['profanity'] },
        default_personality: 'You are Tech Guru',
        default_response_style: { tone: 'professional', length: 'concise' }
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTemplate));
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await seedSystemTemplates(mockPool, '/config/system/agent-templates');

      // Assert: Verify database insert with ON CONFLICT DO UPDATE
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_agent_templates'),
        expect.arrayContaining([
          'tech-guru',
          1,
          null,
          JSON.stringify(mockTemplate.posting_rules),
          JSON.stringify(mockTemplate.api_schema),
          JSON.stringify(mockTemplate.safety_constraints),
          'You are Tech Guru',
          JSON.stringify(mockTemplate.default_response_style)
        ])
      );

      // Verify ON CONFLICT clause for idempotency
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT (name) DO UPDATE'),
        expect.any(Array)
      );
    });

    it('should validate template schema before inserting', async () => {
      // Arrange: Mock template with missing required fields
      (fs.readdir as jest.Mock).mockResolvedValue(['invalid-template.json']);

      const invalidTemplate = {
        name: 'invalid',
        version: 1
        // Missing required fields
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidTemplate));

      // Act & Assert: Should throw validation error
      await expect(
        seedSystemTemplates(mockPool, '/config/system/agent-templates')
      ).rejects.toThrow(/validation|required/i);

      // Verify no database insert attempted
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should handle multiple templates idempotently', async () => {
      // Arrange: Mock multiple template files
      const mockFiles = ['tech-guru.json', 'creative-writer.json'];
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);

      const mockTemplate = {
        name: 'test-agent',
        version: 1,
        model: null,
        posting_rules: {},
        api_schema: {},
        safety_constraints: {},
        default_personality: 'Test',
        default_response_style: {}
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTemplate));
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act: Run seeding twice (idempotency test)
      await seedSystemTemplates(mockPool, '/config/system/agent-templates');
      await seedSystemTemplates(mockPool, '/config/system/agent-templates');

      // Assert: Database upsert called same number of times
      // Each call should use ON CONFLICT DO UPDATE for idempotency
      expect(mockQuery).toHaveBeenCalledTimes(4); // 2 templates × 2 runs

      // Verify all calls use upsert pattern
      mockQuery.mock.calls.forEach(call => {
        expect(call[0]).toContain('ON CONFLICT (name) DO UPDATE');
      });
    });

    it('should skip non-JSON files in template directory', async () => {
      // Arrange: Mix of JSON and non-JSON files
      (fs.readdir as jest.Mock).mockResolvedValue([
        'tech-guru.json',
        'README.md',
        '.DS_Store',
        'creative-writer.json'
      ]);

      const mockTemplate = {
        name: 'test',
        version: 1,
        model: null,
        posting_rules: {},
        api_schema: {},
        safety_constraints: {},
        default_personality: 'Test',
        default_response_style: {}
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTemplate));
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await seedSystemTemplates(mockPool, '/config/system/agent-templates');

      // Assert: Only JSON files processed
      expect(fs.readFile).toHaveBeenCalledTimes(2);
      expect(fs.readFile).not.toHaveBeenCalledWith(
        expect.stringContaining('README.md'),
        expect.any(String)
      );
    });

    it('should handle database connection errors gracefully', async () => {
      // Arrange: Mock successful file read but database failure
      (fs.readdir as jest.Mock).mockResolvedValue(['tech-guru.json']);

      const mockTemplate = {
        name: 'tech-guru',
        version: 1,
        model: null,
        posting_rules: {},
        api_schema: {},
        safety_constraints: {},
        default_personality: 'Test',
        default_response_style: {}
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTemplate));
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(
        seedSystemTemplates(mockPool, '/config/system/agent-templates')
      ).rejects.toThrow('Database connection failed');

      // Verify error was logged (mocked logger)
      // In real implementation, logger.error would be called
    });

    it('should preserve model field (null or specific model)', async () => {
      // Arrange: Templates with different model configurations
      const templates = [
        { name: 'default-agent', model: null },
        { name: 'premium-agent', model: 'claude-opus-4-20250514' }
      ];

      (fs.readdir as jest.Mock).mockResolvedValue([
        'default-agent.json',
        'premium-agent.json'
      ]);

      let callCount = 0;
      (fs.readFile as jest.Mock).mockImplementation(() => {
        const template = {
          ...templates[callCount++],
          version: 1,
          posting_rules: {},
          api_schema: {},
          safety_constraints: {},
          default_personality: 'Test',
          default_response_style: {}
        };
        return Promise.resolve(JSON.stringify(template));
      });

      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await seedSystemTemplates(mockPool, '/config/system/agent-templates');

      // Assert: Verify model field passed correctly
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'default-agent',
          1,
          null, // First template has null model
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String)
        ])
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          'premium-agent',
          1,
          'claude-opus-4-20250514', // Second template has specific model
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String),
          expect.any(String)
        ])
      );
    });
  });

  describe('Contract Definition: Template Structure', () => {
    it('should enforce required template fields via validation', async () => {
      // Arrange: Template missing required fields
      (fs.readdir as jest.Mock).mockResolvedValue(['incomplete.json']);

      const incompleteTemplate = {
        name: 'incomplete',
        version: 1
        // Missing: posting_rules, api_schema, safety_constraints, etc.
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(incompleteTemplate));

      // Act & Assert
      await expect(
        seedSystemTemplates(mockPool, '/config/system/agent-templates')
      ).rejects.toThrow();
    });

    it('should validate JSONB field structures', async () => {
      // Arrange: Template with invalid nested structure
      (fs.readdir as jest.Mock).mockResolvedValue(['invalid-structure.json']);

      const invalidTemplate = {
        name: 'invalid',
        version: 1,
        model: null,
        posting_rules: 'not-an-object', // Should be object
        api_schema: {},
        safety_constraints: {},
        default_personality: 'Test',
        default_response_style: {}
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(invalidTemplate));

      // Act & Assert
      await expect(
        seedSystemTemplates(mockPool, '/config/system/agent-templates')
      ).rejects.toThrow(/Expected object.*received string/i);
    });
  });

  describe('Behavior Verification: Idempotent Operations', () => {
    it('should use UPSERT pattern for idempotency', async () => {
      // Arrange
      (fs.readdir as jest.Mock).mockResolvedValue(['tech-guru.json']);

      const mockTemplate = {
        name: 'tech-guru',
        version: 1,
        model: null,
        posting_rules: {},
        api_schema: {},
        safety_constraints: {},
        default_personality: 'Test',
        default_response_style: {}
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockTemplate));
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      // Act
      await seedSystemTemplates(mockPool, '/config/system/agent-templates');

      // Assert: Verify ON CONFLICT DO UPDATE pattern
      const queryCall = mockQuery.mock.calls[0];
      const sqlQuery = queryCall[0];

      expect(sqlQuery).toMatch(/INSERT INTO system_agent_templates/i);
      expect(sqlQuery).toMatch(/ON CONFLICT \(name\) DO UPDATE/i);
      expect(sqlQuery).toMatch(/version\s*=\s*EXCLUDED\.version/i);
    });
  });
});
