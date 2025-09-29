/**
 * Data Contract Tests - London School TDD
 * Validates data structures and UUID contracts between API and Frontend
 */

import { jest } from '@jest/globals';
import { validate as uuidValidate, version as uuidVersion } from 'uuid';

// Contract definitions for API data structures
const AgentContract = {
  id: 'string',         // Must be valid UUID
  name: 'string',       // Agent display name
  status: 'string',     // 'active', 'busy', 'idle', 'offline'
  category: 'string'    // Agent category
};

const AgentPostContract = {
  id: 'string',         // Must be valid UUID
  agent_id: 'string',   // Must be valid UUID
  title: 'string',      // Post title
  content: 'string',    // Post content
  published_at: 'string', // ISO timestamp
  status: 'string',     // 'published', 'draft'
  tags: 'array',        // Array of strings
  author: 'string',     // Author name
  authorAgent: 'object' // Complete agent object
};

const ApiResponseContract = {
  success: 'boolean',   // API success flag
  data: 'array',        // Array of data items
  total: 'number',      // Total count
  limit: 'number',      // Pagination limit
  offset: 'number'      // Pagination offset
};

describe('Data Contract Tests - London School TDD', () => {
  
  describe('UUID Contract Validation', () => {
    it('should validate UUID format compliance', () => {
      const testUuid = '550e8400-e29b-41d4-a716-446655440000';
      
      // UUID validation behavior
      expect(uuidValidate(testUuid)).toBe(true);
      expect(typeof testUuid).toBe('string');
      expect(testUuid.length).toBe(36);
      expect(testUuid.includes('-')).toBe(true);
    });

    it('should support string operations on UUIDs', () => {
      const testUuid = '550e8400-e29b-41d4-a716-446655440000';
      
      // Critical: UUIDs must support .slice() for frontend
      expect(() => testUuid.slice(0, 8)).not.toThrow();
      expect(testUuid.slice(0, 8)).toBe('550e8400');
      
      // Other string operations
      expect(testUuid.includes('550e8400')).toBe(true);
      expect(testUuid.toLowerCase()).toBe(testUuid);
    });

    it('should reject invalid UUID formats', () => {
      const invalidUuids = [
        '123',                    // Too short
        '123456789',             // Number as string
        null,                    // Null value
        undefined,               // Undefined
        {},                      // Object
        [],                      // Array
        'not-a-uuid',           // Invalid format
        '550e8400-e29b-41d4-a716' // Incomplete UUID
      ];
      
      invalidUuids.forEach(invalidUuid => {
        if (typeof invalidUuid === 'string') {
          expect(uuidValidate(invalidUuid)).toBe(false);
        } else {
          expect(() => uuidValidate(invalidUuid)).toThrow();
        }
      });
    });
  });

  describe('Agent Data Contract', () => {
    const mockAgentContractValidator = jest.fn();
    
    beforeEach(() => {
      mockAgentContractValidator.mockClear();
    });

    it('should validate agent object structure', () => {
      const validAgent = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Code Assistant',
        status: 'active',
        category: 'Development'
      };

      // Contract validation behavior
      const contractValidation = validateAgentContract(validAgent);
      
      expect(contractValidation.isValid).toBe(true);
      expect(contractValidation.errors).toHaveLength(0);
      
      // Mock interaction verification
      mockAgentContractValidator(validAgent);
      expect(mockAgentContractValidator).toHaveBeenCalledWith(validAgent);
    });

    it('should reject agents with invalid structure', () => {
      const invalidAgents = [
        { id: 123, name: 'Test' },                    // Invalid ID type
        { id: 'invalid-uuid', name: 'Test' },         // Invalid UUID
        { name: 'Test', status: 'active' },           // Missing ID
        { id: '550e8400-e29b-41d4-a716-446655440000' } // Missing required fields
      ];
      
      invalidAgents.forEach(invalidAgent => {
        const contractValidation = validateAgentContract(invalidAgent);
        expect(contractValidation.isValid).toBe(false);
        expect(contractValidation.errors.length).toBeGreaterThan(0);
      });
    });

    it('should validate agent status values', () => {
      const validStatuses = ['active', 'busy', 'idle', 'offline'];
      const invalidStatuses = ['running', 'stopped', 'pending', null, undefined];
      
      validStatuses.forEach(status => {
        const agent = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Agent',
          status: status,
          category: 'Test'
        };
        
        const validation = validateAgentContract(agent);
        expect(validation.isValid).toBe(true);
      });
      
      invalidStatuses.forEach(status => {
        const agent = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Agent',
          status: status,
          category: 'Test'
        };
        
        const validation = validateAgentContract(agent);
        expect(validation.isValid).toBe(false);
      });
    });
  });

  describe('Agent Post Data Contract', () => {
    const mockPostContractValidator = jest.fn();
    
    beforeEach(() => {
      mockPostContractValidator.mockClear();
    });

    it('should validate complete agent post structure', () => {
      const validPost = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        agent_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Post',
        content: 'Test content',
        published_at: '2025-09-28T10:00:00Z',
        status: 'published',
        tags: ['test', 'development'],
        author: 'Code Assistant',
        authorAgent: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Code Assistant',
          status: 'active',
          category: 'Development'
        }
      };

      const contractValidation = validatePostContract(validPost);
      
      expect(contractValidation.isValid).toBe(true);
      expect(contractValidation.errors).toHaveLength(0);
      
      // Verify authorAgent relationship
      expect(validPost.agent_id).toBe(validPost.authorAgent.id);
      
      mockPostContractValidator(validPost);
      expect(mockPostContractValidator).toHaveBeenCalledWith(validPost);
    });

    it('should validate authorAgent relationship integrity', () => {
      const postWithMismatchedAgent = {
        id: '550e8400-e29b-41d4-a716-446655440010',
        agent_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Post',
        content: 'Test content',
        published_at: '2025-09-28T10:00:00Z',
        status: 'published',
        tags: ['test'],
        author: 'Code Assistant',
        authorAgent: {
          id: '550e8400-e29b-41d4-a716-446655440001', // Different ID!
          name: 'Different Agent',
          status: 'active',
          category: 'Development'
        }
      };

      const contractValidation = validatePostContract(postWithMismatchedAgent);
      
      expect(contractValidation.isValid).toBe(false);
      expect(contractValidation.errors).toContain('agent_id does not match authorAgent.id');
    });

    it('should validate post UUID string operations', () => {
      const postId = '550e8400-e29b-41d4-a716-446655440010';
      
      // Critical: Frontend depends on these operations
      expect(() => postId.slice(0, 8)).not.toThrow();
      expect(postId.slice(0, 8)).toBe('550e8400');
      expect(postId.slice(-8)).toBe('40440010');
      
      // Verify UUID validity
      expect(uuidValidate(postId)).toBe(true);
    });
  });

  describe('API Response Contract', () => {
    const mockApiResponseValidator = jest.fn();
    
    beforeEach(() => {
      mockApiResponseValidator.mockClear();
    });

    it('should validate API response wrapper structure', () => {
      const validApiResponse = {
        success: true,
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            agent_id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Test Post',
            content: 'Test content',
            published_at: '2025-09-28T10:00:00Z',
            status: 'published',
            tags: ['test'],
            author: 'Test Agent',
            authorAgent: {
              id: '550e8400-e29b-41d4-a716-446655440000',
              name: 'Test Agent',
              status: 'active',
              category: 'Test'
            }
          }
        ],
        total: 1,
        limit: 20,
        offset: 0
      };

      const contractValidation = validateApiResponseContract(validApiResponse);
      
      expect(contractValidation.isValid).toBe(true);
      expect(contractValidation.errors).toHaveLength(0);
      
      mockApiResponseValidator(validApiResponse);
      expect(mockApiResponseValidator).toHaveBeenCalledWith(validApiResponse);
    });

    it('should validate pagination metadata', () => {
      const apiResponse = {
        success: true,
        data: [],
        total: 100,
        limit: 20,
        offset: 40
      };
      
      const validation = validateApiResponseContract(apiResponse);
      expect(validation.isValid).toBe(true);
      
      // Verify pagination logic
      expect(apiResponse.offset).toBeLessThan(apiResponse.total);
      expect(apiResponse.limit).toBeGreaterThan(0);
    });
  });

  describe('Contract Evolution and Backward Compatibility', () => {
    it('should handle additional fields gracefully', () => {
      const agentWithExtraFields = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Code Assistant',
        status: 'active',
        category: 'Development',
        // Additional fields that might be added later
        version: '1.0.0',
        capabilities: ['code-generation', 'debugging'],
        lastSeen: '2025-09-28T10:00:00Z'
      };
      
      const validation = validateAgentContract(agentWithExtraFields, { strict: false });
      expect(validation.isValid).toBe(true);
    });

    it('should enforce strict mode for exact contract compliance', () => {
      const agentWithExtraFields = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Code Assistant',
        status: 'active',
        category: 'Development',
        extraField: 'not allowed'
      };
      
      const validation = validateAgentContract(agentWithExtraFields, { strict: true });
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Unknown field: extraField');
    });
  });
});

// Contract validation utilities
function validateAgentContract(agent, options = { strict: false }) {
  const errors = [];
  
  // Required fields
  if (!agent.id) errors.push('Missing required field: id');
  else if (typeof agent.id !== 'string') errors.push('Field id must be string');
  else if (!uuidValidate(agent.id)) errors.push('Field id must be valid UUID');
  
  if (!agent.name) errors.push('Missing required field: name');
  else if (typeof agent.name !== 'string') errors.push('Field name must be string');
  
  if (!agent.status) errors.push('Missing required field: status');
  else if (!['active', 'busy', 'idle', 'offline'].includes(agent.status)) {
    errors.push('Field status must be one of: active, busy, idle, offline');
  }
  
  if (!agent.category) errors.push('Missing required field: category');
  else if (typeof agent.category !== 'string') errors.push('Field category must be string');
  
  // Strict mode - check for unknown fields
  if (options.strict) {
    const allowedFields = ['id', 'name', 'status', 'category'];
    Object.keys(agent).forEach(field => {
      if (!allowedFields.includes(field)) {
        errors.push(`Unknown field: ${field}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function validatePostContract(post) {
  const errors = [];
  
  // Required fields
  if (!post.id) errors.push('Missing required field: id');
  else if (!uuidValidate(post.id)) errors.push('Field id must be valid UUID');
  
  if (!post.agent_id) errors.push('Missing required field: agent_id');
  else if (!uuidValidate(post.agent_id)) errors.push('Field agent_id must be valid UUID');
  
  if (!post.title) errors.push('Missing required field: title');
  if (!post.content) errors.push('Missing required field: content');
  if (!post.authorAgent) errors.push('Missing required field: authorAgent');
  
  // Relationship validation
  if (post.agent_id && post.authorAgent?.id && post.agent_id !== post.authorAgent.id) {
    errors.push('agent_id does not match authorAgent.id');
  }
  
  // Nested object validation
  if (post.authorAgent) {
    const agentValidation = validateAgentContract(post.authorAgent);
    if (!agentValidation.isValid) {
      errors.push(...agentValidation.errors.map(err => `authorAgent.${err}`));
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateApiResponseContract(response) {
  const errors = [];
  
  if (typeof response.success !== 'boolean') errors.push('Field success must be boolean');
  if (!Array.isArray(response.data)) errors.push('Field data must be array');
  if (typeof response.total !== 'number') errors.push('Field total must be number');
  if (typeof response.limit !== 'number') errors.push('Field limit must be number');
  if (typeof response.offset !== 'number') errors.push('Field offset must be number');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
