/**
 * Context Composer Unit Tests
 * London School TDD - Mock-based behavior verification
 */

import {
  validateCustomizations,
  composeAgentContext,
  getModelForAgent
} from '../../../src/database/context-composer';
import {
  SystemTemplate,
  UserCustomization,
  AgentContext,
  SecurityError,
  ValidationError
} from '../../../src/types/agent-context';
import { DatabaseManager } from '../../../src/types/database-manager';

describe('Context Composer - Protected Field Validation', () => {
  describe('validateCustomizations', () => {
    let mockTemplate: SystemTemplate;

    beforeEach(() => {
      mockTemplate = {
        name: 'tech-guru',
        version: 1,
        model: null,
        posting_rules: {
          max_length: 280,
          min_interval_seconds: 60,
          rate_limit_per_hour: 20,
          required_hashtags: ['#tech'],
          prohibited_words: ['spam', 'scam']
        },
        api_schema: {
          platform: 'twitter',
          endpoints: {
            post: '/v2/tweets',
            reply: '/v2/tweets/:id/replies'
          },
          auth_type: 'oauth2'
        },
        safety_constraints: {
          content_filters: ['profanity', 'harassment'],
          max_mentions_per_post: 3,
          requires_human_review: ['financial_advice', 'medical_advice']
        },
        default_personality: 'You are Tech Guru, an enthusiastic technology expert...',
        default_response_style: {
          tone: 'professional',
          length: 'concise',
          use_emojis: false
        }
      };
    });

    it('should throw SecurityError when user attempts to override model field', () => {
      const maliciousCustomization: any = {
        user_id: 'user-123',
        agent_template: 'tech-guru',
        model: 'claude-opus-4-20250514', // PROTECTED FIELD - should be rejected
        personality: 'Friendly tech expert'
      };

      expect(() => {
        validateCustomizations(maliciousCustomization, mockTemplate);
      }).toThrow(SecurityError);

      expect(() => {
        validateCustomizations(maliciousCustomization, mockTemplate);
      }).toThrow('User attempted to override protected field: model');
    });

    it('should throw SecurityError when user attempts to override posting_rules', () => {
      const maliciousCustomization: any = {
        user_id: 'user-123',
        agent_template: 'tech-guru',
        posting_rules: { max_length: 1000 }, // PROTECTED FIELD
        personality: 'Friendly tech expert'
      };

      expect(() => {
        validateCustomizations(maliciousCustomization, mockTemplate);
      }).toThrow(SecurityError);

      expect(() => {
        validateCustomizations(maliciousCustomization, mockTemplate);
      }).toThrow('User attempted to override protected field: posting_rules');
    });

    it('should throw SecurityError when user attempts to override api_schema', () => {
      const maliciousCustomization: any = {
        user_id: 'user-123',
        agent_template: 'tech-guru',
        api_schema: { platform: 'malicious' }, // PROTECTED FIELD
        personality: 'Friendly tech expert'
      };

      expect(() => {
        validateCustomizations(maliciousCustomization, mockTemplate);
      }).toThrow(SecurityError);
    });

    it('should throw SecurityError when user attempts to override safety_constraints', () => {
      const maliciousCustomization: any = {
        user_id: 'user-123',
        agent_template: 'tech-guru',
        safety_constraints: { content_filters: [] }, // PROTECTED FIELD
        personality: 'Friendly tech expert'
      };

      expect(() => {
        validateCustomizations(maliciousCustomization, mockTemplate);
      }).toThrow(SecurityError);
    });

    it('should NOT throw when user provides only valid customizations', () => {
      const validCustomization: UserCustomization = {
        user_id: 'user-123',
        agent_template: 'tech-guru',
        custom_name: 'My Tech Buddy',
        personality: 'Friendly and enthusiastic tech expert who loves explaining complex topics simply',
        interests: ['AI', 'blockchain', 'quantum computing'],
        response_style: {
          tone: 'casual',
          length: 'brief',
          use_emojis: true
        }
      };

      expect(() => {
        validateCustomizations(validCustomization, mockTemplate);
      }).not.toThrow();
    });

    it('should throw ValidationError when personality text is too long', () => {
      const invalidCustomization: UserCustomization = {
        user_id: 'user-123',
        agent_template: 'tech-guru',
        personality: 'A'.repeat(5001) // Too long (> 5000 chars)
      };

      expect(() => {
        validateCustomizations(invalidCustomization, mockTemplate);
      }).toThrow(ValidationError);

      expect(() => {
        validateCustomizations(invalidCustomization, mockTemplate);
      }).toThrow('Personality text too long');
    });

    it('should throw ValidationError when too many interests are specified', () => {
      const invalidCustomization: UserCustomization = {
        user_id: 'user-123',
        agent_template: 'tech-guru',
        interests: Array(51).fill('topic') // Too many (> 50)
      };

      expect(() => {
        validateCustomizations(invalidCustomization, mockTemplate);
      }).toThrow(ValidationError);

      expect(() => {
        validateCustomizations(invalidCustomization, mockTemplate);
      }).toThrow('Too many interests specified');
    });
  });

  describe('composeAgentContext', () => {
    let mockDb: jest.Mocked<DatabaseManager>;
    let mockTemplate: SystemTemplate;

    beforeEach(() => {
      mockDb = {
        query: jest.fn(),
        close: jest.fn()
      };

      mockTemplate = {
        name: 'tech-guru',
        version: 1,
        model: null,
        posting_rules: {
          max_length: 280,
          min_interval_seconds: 60,
          rate_limit_per_hour: 20,
          required_hashtags: ['#tech'],
          prohibited_words: ['spam', 'scam']
        },
        api_schema: {
          platform: 'twitter',
          endpoints: {
            post: '/v2/tweets',
            reply: '/v2/tweets/:id/replies'
          },
          auth_type: 'oauth2'
        },
        safety_constraints: {
          content_filters: ['profanity', 'harassment'],
          max_mentions_per_post: 3,
          requires_human_review: ['financial_advice', 'medical_advice']
        },
        default_personality: 'You are Tech Guru, an enthusiastic technology expert...',
        default_response_style: {
          tone: 'professional',
          length: 'concise',
          use_emojis: false
        }
      };
    });

    it('should compose context with system defaults when no user customization exists', async () => {
      // Mock database responses
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockTemplate] }) // System template query
        .mockResolvedValueOnce({ rows: [] }); // No user customization

      const context = await composeAgentContext('user-123', 'tech-guru', mockDb);

      // Verify database interactions (London School - behavior verification)
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      expect(mockDb.query).toHaveBeenNthCalledWith(
        1,
        'SELECT * FROM system_agent_templates WHERE name = $1',
        ['tech-guru']
      );
      expect(mockDb.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('SELECT * FROM user_agent_customizations'),
        ['user-123', 'tech-guru']
      );

      // Verify composed context
      expect(context).toEqual({
        // TIER 1: Protected fields from system template
        model: null,
        posting_rules: mockTemplate.posting_rules,
        api_schema: mockTemplate.api_schema,
        safety_constraints: mockTemplate.safety_constraints,

        // TIER 2: Default values (no user customization)
        personality: mockTemplate.default_personality,
        interests: [],
        response_style: mockTemplate.default_response_style,

        // Agent identity
        agentName: 'tech-guru',
        version: 1
      });
    });

    it('should merge user customizations while preserving protected fields', async () => {
      const userCustomization: UserCustomization = {
        id: 1,
        user_id: 'user-123',
        agent_template: 'tech-guru',
        custom_name: 'My Tech Buddy',
        personality: 'Super friendly tech enthusiast who loves AI and crypto',
        interests: ['AI', 'blockchain', 'quantum computing'],
        response_style: {
          tone: 'casual',
          length: 'brief',
          use_emojis: true
        },
        enabled: true
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockTemplate] })
        .mockResolvedValueOnce({ rows: [userCustomization] });

      const context = await composeAgentContext('user-123', 'tech-guru', mockDb);

      // Verify protected fields are NOT overridden
      expect(context.model).toBe(mockTemplate.model);
      expect(context.posting_rules).toEqual(mockTemplate.posting_rules);
      expect(context.api_schema).toEqual(mockTemplate.api_schema);
      expect(context.safety_constraints).toEqual(mockTemplate.safety_constraints);

      // Verify user customizations are applied
      expect(context.personality).toBe(userCustomization.personality);
      expect(context.interests).toEqual(userCustomization.interests);
      expect(context.response_style).toEqual(userCustomization.response_style);
      expect(context.agentName).toBe('My Tech Buddy');
    });

    it('should throw error when system template is not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] }); // No template found

      await expect(
        composeAgentContext('user-123', 'nonexistent', mockDb)
      ).rejects.toThrow('System template not found: nonexistent');

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should reject malicious user customization with protected field override', async () => {
      const maliciousCustomization: any = {
        user_id: 'user-123',
        agent_template: 'tech-guru',
        model: 'claude-opus-4-20250514', // Attempted override
        personality: 'Hacker'
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockTemplate] })
        .mockResolvedValueOnce({ rows: [maliciousCustomization] });

      await expect(
        composeAgentContext('user-123', 'tech-guru', mockDb)
      ).rejects.toThrow(SecurityError);
    });
  });

  describe('getModelForAgent', () => {
    it('should return template model when specified', () => {
      const context: AgentContext = {
        model: 'claude-opus-4-20250514',
        posting_rules: {} as any,
        api_schema: {} as any,
        safety_constraints: {} as any,
        personality: 'Test',
        interests: [],
        response_style: {} as any,
        agentName: 'test-agent',
        version: 1
      };

      const model = getModelForAgent(context);
      expect(model).toBe('claude-opus-4-20250514');
    });

    it('should return environment variable when template model is null', () => {
      const originalEnv = process.env.AGENT_MODEL;
      process.env.AGENT_MODEL = 'claude-sonnet-4-5-20250929';

      const context: AgentContext = {
        model: null,
        posting_rules: {} as any,
        api_schema: {} as any,
        safety_constraints: {} as any,
        personality: 'Test',
        interests: [],
        response_style: {} as any,
        agentName: 'test-agent',
        version: 1
      };

      const model = getModelForAgent(context);
      expect(model).toBe('claude-sonnet-4-5-20250929');

      process.env.AGENT_MODEL = originalEnv;
    });

    it('should return default model when template is null and env var not set', () => {
      const originalEnv = process.env.AGENT_MODEL;
      delete process.env.AGENT_MODEL;

      const context: AgentContext = {
        model: null,
        posting_rules: {} as any,
        api_schema: {} as any,
        safety_constraints: {} as any,
        personality: 'Test',
        interests: [],
        response_style: {} as any,
        agentName: 'test-agent',
        version: 1
      };

      const model = getModelForAgent(context);
      expect(model).toBe('claude-sonnet-4-5-20250929');

      process.env.AGENT_MODEL = originalEnv;
    });
  });

  describe('getModelForAvi', () => {
    const { getModelForAvi } = require('../../../src/database/context-composer');

    it('should return environment variable when AVI_MODEL is set', () => {
      const originalEnv = process.env.AVI_MODEL;
      process.env.AVI_MODEL = 'claude-opus-4-avi';

      const model = getModelForAvi();
      expect(model).toBe('claude-opus-4-avi');

      process.env.AVI_MODEL = originalEnv;
    });

    it('should return default model when AVI_MODEL env var not set', () => {
      const originalEnv = process.env.AVI_MODEL;
      delete process.env.AVI_MODEL;

      const model = getModelForAvi();
      expect(model).toBe('claude-sonnet-4-5-20250929');

      process.env.AVI_MODEL = originalEnv;
    });
  });
});
