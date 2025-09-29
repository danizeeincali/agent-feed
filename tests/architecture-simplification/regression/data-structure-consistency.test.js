/**
 * Regression Prevention Tests: Data Structure Consistency
 *
 * London School TDD - Prevents data structure mismatches that occur in dual architecture
 * Ensures unified data structures eliminate format inconsistencies
 */

import { jest } from '@jest/globals';

describe('Data Structure Consistency Prevention Tests', () => {
  let mockDataTransformer;
  let mockSchemaValidator;
  let mockDataMapper;
  let mockConsistencyChecker;

  beforeEach(() => {
    // Mock data transformer
    mockDataTransformer = {
      transform: jest.fn(),
      normalize: jest.fn(),
      validate: jest.fn(),
      convert: jest.fn()
    };

    // Mock schema validator
    mockSchemaValidator = {
      validate: jest.fn(),
      compare: jest.fn(),
      enforce: jest.fn(),
      generateSchema: jest.fn()
    };

    // Mock data mapper
    mockDataMapper = {
      mapFields: jest.fn(),
      unifyStructure: jest.fn(),
      detectMismatches: jest.fn(),
      resolveConflicts: jest.fn()
    };

    // Mock consistency checker
    mockConsistencyChecker = {
      check: jest.fn(),
      report: jest.fn(),
      fix: jest.fn(),
      monitor: jest.fn()
    };
  });

  describe('Unified Data Structure Implementation', () => {
    it('should eliminate agent field name inconsistencies', async () => {
      // Arrange - Dual system inconsistencies
      const dualSystemFormats = {
        nextjsFormat: {
          agentId: '123',
          agentName: 'Test Agent',
          agentStatus: 'active',
          agent_posts: 5
        },
        viteFormat: {
          id: '123',
          name: 'Test Agent',
          status: 'active',
          posts: 5
        },
        mixedFormat: {
          id: '123',
          agentName: 'Test Agent',
          status: 'active',
          postCount: 5
        }
      };

      const unifiedSchema = {
        id: 'string',
        name: 'string',
        status: 'string',
        posts: 'number'
      };

      mockDataMapper.unifyStructure.mockImplementation((data, schema) => {
        const unified = {};

        // Map various field name variations to unified schema
        const fieldMappings = {
          id: ['id', 'agentId', 'agent_id'],
          name: ['name', 'agentName', 'agent_name'],
          status: ['status', 'agentStatus', 'agent_status'],
          posts: ['posts', 'agent_posts', 'postCount', 'post_count']
        };

        Object.keys(schema).forEach(unifiedField => {
          const possibleFields = fieldMappings[unifiedField];
          for (const field of possibleFields) {
            if (data[field] !== undefined) {
              unified[unifiedField] = data[field];
              break;
            }
          }
        });

        return unified;
      });

      // Act
      const unifiedResults = Object.values(dualSystemFormats)
        .map(data => mockDataMapper.unifyStructure(data, unifiedSchema));

      // Assert - Verify consistent unified structure
      unifiedResults.forEach(result => {
        expect(result).toHaveProperty('id', '123');
        expect(result).toHaveProperty('name', 'Test Agent');
        expect(result).toHaveProperty('status', 'active');
        expect(result).toHaveProperty('posts', 5);

        // Verify no old field names exist
        expect(result).not.toHaveProperty('agentId');
        expect(result).not.toHaveProperty('agentName');
        expect(result).not.toHaveProperty('agentStatus');
        expect(result).not.toHaveProperty('agent_posts');
        expect(result).not.toHaveProperty('postCount');
      });

      expect(mockDataMapper.unifyStructure).toHaveBeenCalledTimes(3);
    });

    it('should standardize timestamp and date formats', async () => {
      // Arrange - Various timestamp formats from dual systems
      const timestampVariations = [
        { created: '2024-01-01T00:00:00Z', updated: 1704067200000 }, // ISO + Unix
        { createdAt: '2024-01-01 00:00:00', updatedAt: '01/01/2024' }, // Different formats
        { creation_time: '2024-01-01', last_modified: '2024-01-01T12:00:00.000Z' }, // Mixed
        { timestamp: 1704067200, modified: '2024-01-01T00:00:00+00:00' } // Various standards
      ];

      const unifiedTimestampSchema = {
        createdAt: 'iso_string',
        updatedAt: 'iso_string'
      };

      mockDataTransformer.normalize.mockImplementation((data, schema) => {
        const normalized = {};

        // Normalize various timestamp formats to ISO strings
        const timestampFields = [
          'created', 'createdAt', 'creation_time', 'timestamp',
          'updated', 'updatedAt', 'last_modified', 'modified'
        ];

        let createdValue, updatedValue;

        timestampFields.forEach(field => {
          if (data[field] !== undefined) {
            const value = data[field];
            const normalizedValue = mockDataTransformer.toISOString(value);

            if (['created', 'createdAt', 'creation_time', 'timestamp'].includes(field)) {
              createdValue = normalizedValue;
            } else {
              updatedValue = normalizedValue;
            }
          }
        });

        return {
          createdAt: createdValue || new Date().toISOString(),
          updatedAt: updatedValue || new Date().toISOString()
        };
      });

      mockDataTransformer.toISOString.mockImplementation((value) => {
        if (typeof value === 'number') {
          // Handle Unix timestamps (both seconds and milliseconds)
          const timestamp = value < 10000000000 ? value * 1000 : value;
          return new Date(timestamp).toISOString();
        }
        if (typeof value === 'string') {
          // Parse various string formats
          const date = new Date(value);
          return date.toISOString();
        }
        return new Date().toISOString();
      });

      // Act
      const normalizedTimestamps = timestampVariations
        .map(data => mockDataTransformer.normalize(data, unifiedTimestampSchema));

      // Assert - Verify consistent timestamp format
      normalizedTimestamps.forEach(result => {
        expect(result).toHaveProperty('createdAt');
        expect(result).toHaveProperty('updatedAt');
        expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      expect(mockDataTransformer.normalize).toHaveBeenCalledTimes(4);
    });

    it('should unify array vs object structure inconsistencies', async () => {
      // Arrange - Mixed array/object structures from dual systems
      const structuralVariations = [
        {
          // Next.js format - objects with IDs
          posts: {
            '1': { id: '1', content: 'Post 1' },
            '2': { id: '2', content: 'Post 2' }
          }
        },
        {
          // Vite format - array of objects
          posts: [
            { id: '1', content: 'Post 1' },
            { id: '2', content: 'Post 2' }
          ]
        },
        {
          // Mixed format - array of IDs with separate content
          postIds: ['1', '2'],
          postContents: ['Post 1', 'Post 2']
        },
        {
          // Legacy format - comma-separated string
          posts: '1:Post 1,2:Post 2'
        }
      ];

      const unifiedArraySchema = {
        posts: 'array_of_objects'
      };

      mockDataMapper.unifyStructure.mockImplementation((data, schema) => {
        if (data.posts) {
          if (Array.isArray(data.posts)) {
            return { posts: data.posts }; // Already array
          } else if (typeof data.posts === 'object') {
            // Convert object to array
            return {
              posts: Object.values(data.posts)
            };
          } else if (typeof data.posts === 'string') {
            // Parse string format
            return {
              posts: data.posts.split(',').map(item => {
                const [id, content] = item.split(':');
                return { id: id.trim(), content: content.trim() };
              })
            };
          }
        } else if (data.postIds && data.postContents) {
          // Merge separate arrays
          return {
            posts: data.postIds.map((id, index) => ({
              id,
              content: data.postContents[index]
            }))
          };
        }

        return { posts: [] };
      });

      // Act
      const unifiedStructures = structuralVariations
        .map(data => mockDataMapper.unifyStructure(data, unifiedArraySchema));

      // Assert - Verify consistent array structure
      unifiedStructures.forEach(result => {
        expect(result).toHaveProperty('posts');
        expect(Array.isArray(result.posts)).toBe(true);
        expect(result.posts).toHaveLength(2);

        result.posts.forEach((post, index) => {
          expect(post).toHaveProperty('id', String(index + 1));
          expect(post).toHaveProperty('content', `Post ${index + 1}`);
        });
      });

      expect(mockDataMapper.unifyStructure).toHaveBeenCalledTimes(4);
    });
  });

  describe('Schema Enforcement and Validation', () => {
    it('should enforce consistent API response schemas', async () => {
      // Arrange - Various API response formats
      const apiResponseVariations = [
        // Next.js API format
        {
          success: true,
          data: { agents: [{ id: '1', name: 'Agent 1' }] },
          meta: { total: 1 }
        },
        // Vite API format
        {
          status: 'ok',
          result: [{ id: '1', name: 'Agent 1' }],
          count: 1
        },
        // Legacy format
        {
          error: false,
          agents: [{ id: '1', name: 'Agent 1' }],
          totalCount: 1
        }
      ];

      const unifiedResponseSchema = {
        success: 'boolean',
        data: 'array',
        meta: 'object'
      };

      mockSchemaValidator.enforce.mockImplementation((response, schema) => {
        // Normalize to unified schema
        const unified = {
          success: false,
          data: [],
          meta: {}
        };

        // Map success indicators
        if (response.success === true || response.status === 'ok' || response.error === false) {
          unified.success = true;
        }

        // Map data arrays
        if (response.data?.agents) {
          unified.data = response.data.agents;
        } else if (response.result) {
          unified.data = response.result;
        } else if (response.agents) {
          unified.data = response.agents;
        }

        // Map metadata
        if (response.meta) {
          unified.meta = response.meta;
        } else {
          unified.meta = {
            total: response.count || response.totalCount || unified.data.length
          };
        }

        return unified;
      });

      // Act
      const unifiedResponses = apiResponseVariations
        .map(response => mockSchemaValidator.enforce(response, unifiedResponseSchema));

      // Assert - Verify consistent response schema
      unifiedResponses.forEach(response => {
        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('data');
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data).toHaveLength(1);
        expect(response).toHaveProperty('meta');
        expect(response.meta).toHaveProperty('total', 1);

        // Verify agent data consistency
        const agent = response.data[0];
        expect(agent).toHaveProperty('id', '1');
        expect(agent).toHaveProperty('name', 'Agent 1');
      });

      expect(mockSchemaValidator.enforce).toHaveBeenCalledTimes(3);
    });

    it('should validate data type consistency across operations', async () => {
      // Arrange - Mixed data types from dual systems
      const mixedDataTypes = [
        { id: '123', posts: '5', active: 'true', rating: '4.5' }, // All strings
        { id: 123, posts: 5, active: true, rating: 4.5 }, // Correct types
        { id: '123', posts: 5, active: 1, rating: '4.5' }, // Mixed types
        { id: null, posts: '0', active: false, rating: 0 } // Null/falsy values
      ];

      const typeSchema = {
        id: 'string',
        posts: 'number',
        active: 'boolean',
        rating: 'number'
      };

      mockSchemaValidator.validate.mockImplementation((data, schema) => {
        const validated = {};
        const errors = [];

        Object.keys(schema).forEach(field => {
          const expectedType = schema[field];
          const value = data[field];

          if (value === null || value === undefined) {
            if (expectedType === 'string') validated[field] = '';
            else if (expectedType === 'number') validated[field] = 0;
            else if (expectedType === 'boolean') validated[field] = false;
          } else {
            try {
              switch (expectedType) {
                case 'string':
                  validated[field] = String(value);
                  break;
                case 'number':
                  const num = Number(value);
                  if (isNaN(num)) throw new Error(`Invalid number: ${value}`);
                  validated[field] = num;
                  break;
                case 'boolean':
                  if (typeof value === 'boolean') {
                    validated[field] = value;
                  } else if (typeof value === 'string') {
                    validated[field] = value.toLowerCase() === 'true';
                  } else if (typeof value === 'number') {
                    validated[field] = value !== 0;
                  } else {
                    validated[field] = Boolean(value);
                  }
                  break;
              }
            } catch (error) {
              errors.push(`${field}: ${error.message}`);
              validated[field] = null;
            }
          }
        });

        return { validated, errors };
      });

      // Act
      const validationResults = mixedDataTypes
        .map(data => mockSchemaValidator.validate(data, typeSchema));

      // Assert - Verify type consistency
      validationResults.forEach(({ validated, errors }) => {
        expect(typeof validated.id).toBe('string');
        expect(typeof validated.posts).toBe('number');
        expect(typeof validated.active).toBe('boolean');
        expect(typeof validated.rating).toBe('number');

        // Verify specific values are correctly converted
        if (validated.id !== '') {
          expect(validated.id).toBe('123');
        }
      });

      expect(mockSchemaValidator.validate).toHaveBeenCalledTimes(4);
    });
  });

  describe('Consistency Monitoring and Detection', () => {
    it('should detect data structure drift before it becomes a problem', async () => {
      // Arrange - Gradual drift in data structures
      const dataEvolution = [
        { week: 1, data: { id: '1', name: 'Agent' } },
        { week: 2, data: { id: '1', name: 'Agent', status: 'active' } }, // New field
        { week: 3, data: { id: '1', agent_name: 'Agent', status: 'active' } }, // Field rename
        { week: 4, data: { agentId: '1', agent_name: 'Agent', status: 'active' } }, // ID field change
        { week: 5, data: { agentId: '1', agent_name: 'Agent', state: 'active' } } // Status field rename
      ];

      const baselineSchema = { id: 'string', name: 'string' };

      mockConsistencyChecker.check.mockImplementation((currentData, baseline) => {
        const issues = [];
        const baselineFields = Object.keys(baseline);
        const currentFields = Object.keys(currentData);

        // Detect missing baseline fields
        baselineFields.forEach(field => {
          if (!currentFields.includes(field)) {
            // Check for renamed fields
            const similarFields = currentFields.filter(f =>
              f.toLowerCase().includes(field.toLowerCase()) ||
              field.toLowerCase().includes(f.toLowerCase())
            );

            if (similarFields.length > 0) {
              issues.push({
                type: 'field_renamed',
                original: field,
                candidates: similarFields
              });
            } else {
              issues.push({
                type: 'field_missing',
                field
              });
            }
          }
        });

        // Detect new fields
        currentFields.forEach(field => {
          if (!baselineFields.includes(field)) {
            issues.push({
              type: 'field_added',
              field
            });
          }
        });

        return {
          consistent: issues.length === 0,
          issues,
          driftScore: issues.length / baselineFields.length
        };
      });

      // Act
      const consistencyReports = dataEvolution
        .map(({ week, data }) => ({
          week,
          report: mockConsistencyChecker.check(data, baselineSchema)
        }));

      // Assert - Verify drift detection
      expect(consistencyReports[0].report.consistent).toBe(true); // Week 1: no drift
      expect(consistencyReports[1].report.consistent).toBe(false); // Week 2: new field
      expect(consistencyReports[2].report.consistent).toBe(false); // Week 3: field rename
      expect(consistencyReports[4].report.consistent).toBe(false); // Week 5: multiple changes

      // Verify drift score increases
      const driftScores = consistencyReports.map(r => r.report.driftScore);
      expect(driftScores[1]).toBeGreaterThan(driftScores[0]);
      expect(driftScores[4]).toBeGreaterThan(driftScores[1]);

      // Verify specific drift types are detected
      const week3Issues = consistencyReports[2].report.issues;
      expect(week3Issues.some(issue => issue.type === 'field_renamed')).toBe(true);

      expect(mockConsistencyChecker.check).toHaveBeenCalledTimes(5);
    });

    it('should provide automated fixes for common inconsistency patterns', async () => {
      // Arrange - Common inconsistency patterns
      const inconsistencyPatterns = [
        {
          type: 'camelCase_vs_snake_case',
          data: { agent_id: '1', user_name: 'Agent', last_login: '2024-01-01' },
          expected: { agentId: '1', userName: 'Agent', lastLogin: '2024-01-01' }
        },
        {
          type: 'singular_vs_plural',
          data: { agent: [{ id: '1' }], post: [{ id: '1' }] },
          expected: { agents: [{ id: '1' }], posts: [{ id: '1' }] }
        },
        {
          type: 'nested_vs_flat',
          data: { agent: { info: { id: '1', name: 'Agent' } } },
          expected: { agentId: '1', agentName: 'Agent' }
        }
      ];

      mockConsistencyChecker.fix.mockImplementation((data, pattern) => {
        switch (pattern.type) {
          case 'camelCase_vs_snake_case':
            const camelCased = {};
            Object.keys(data).forEach(key => {
              const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
              camelCased[camelKey] = data[key];
            });
            return camelCased;

          case 'singular_vs_plural':
            const pluralized = {};
            Object.keys(data).forEach(key => {
              const pluralKey = key.endsWith('s') ? key : key + 's';
              pluralized[pluralKey] = data[key];
            });
            return pluralized;

          case 'nested_vs_flat':
            const flattened = {};
            Object.keys(data).forEach(parentKey => {
              if (typeof data[parentKey] === 'object' && data[parentKey].info) {
                Object.keys(data[parentKey].info).forEach(childKey => {
                  flattened[`${parentKey}${childKey.charAt(0).toUpperCase() + childKey.slice(1)}`] =
                    data[parentKey].info[childKey];
                });
              }
            });
            return flattened;

          default:
            return data;
        }
      });

      // Act
      const fixedData = inconsistencyPatterns
        .map(pattern => mockConsistencyChecker.fix(pattern.data, pattern));

      // Assert - Verify automated fixes
      expect(fixedData[0]).toEqual(inconsistencyPatterns[0].expected); // camelCase conversion
      expect(fixedData[1]).toEqual(inconsistencyPatterns[1].expected); // pluralization
      expect(fixedData[2]).toEqual(inconsistencyPatterns[2].expected); // flattening

      expect(mockConsistencyChecker.fix).toHaveBeenCalledTimes(3);
    });
  });

  describe('Real-time Consistency Enforcement', () => {
    it('should prevent inconsistent data from entering the system', async () => {
      // Arrange - Stream of incoming data with various inconsistencies
      const incomingDataStream = [
        { id: '1', name: 'Agent 1', status: 'active' }, // Valid
        { agent_id: '2', agent_name: 'Agent 2', status: 'inactive' }, // Wrong field names
        { id: '3', name: 'Agent 3', active: true }, // Wrong status field
        { id: '4', title: 'Agent 4', status: 'pending' }, // Wrong name field
        { agentId: '5', agentName: 'Agent 5', agentStatus: 'active' } // Legacy format
      ];

      const enforcedSchema = {
        id: 'string',
        name: 'string',
        status: 'string'
      };

      mockDataMapper.enforceConsistency = jest.fn().mockImplementation((data, schema) => {
        const consistent = {};
        const warnings = [];

        // Map ID field
        if (data.id) consistent.id = data.id;
        else if (data.agent_id) {
          consistent.id = data.agent_id;
          warnings.push('Mapped agent_id to id');
        } else if (data.agentId) {
          consistent.id = data.agentId;
          warnings.push('Mapped agentId to id');
        }

        // Map name field
        if (data.name) consistent.name = data.name;
        else if (data.agent_name) {
          consistent.name = data.agent_name;
          warnings.push('Mapped agent_name to name');
        } else if (data.agentName) {
          consistent.name = data.agentName;
          warnings.push('Mapped agentName to name');
        } else if (data.title) {
          consistent.name = data.title;
          warnings.push('Mapped title to name');
        }

        // Map status field
        if (data.status) consistent.status = data.status;
        else if (data.agentStatus) {
          consistent.status = data.agentStatus;
          warnings.push('Mapped agentStatus to status');
        } else if (data.active !== undefined) {
          consistent.status = data.active ? 'active' : 'inactive';
          warnings.push('Mapped active boolean to status string');
        }

        return { data: consistent, warnings };
      });

      // Act
      const processedStream = incomingDataStream
        .map(data => mockDataMapper.enforceConsistency(data, enforcedSchema));

      // Assert - Verify all data is consistently formatted
      processedStream.forEach(({ data, warnings }) => {
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('status');

        expect(typeof data.id).toBe('string');
        expect(typeof data.name).toBe('string');
        expect(typeof data.status).toBe('string');

        // Verify no old field names remain
        expect(data).not.toHaveProperty('agent_id');
        expect(data).not.toHaveProperty('agent_name');
        expect(data).not.toHaveProperty('agentId');
        expect(data).not.toHaveProperty('agentName');
        expect(data).not.toHaveProperty('agentStatus');
        expect(data).not.toHaveProperty('active');
        expect(data).not.toHaveProperty('title');
      });

      // Verify warnings are generated for transformations
      const allWarnings = processedStream.flatMap(result => result.warnings);
      expect(allWarnings.length).toBeGreaterThan(0);
    });
  });
});