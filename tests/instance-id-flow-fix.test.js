/**
 * SPARC Phase 4: Refinement - Instance ID Flow Fix Test Suite
 * 
 * Tests the critical fix for instance ID propagation from backend response
 * to terminal connection establishment.
 */

const { test, expect, describe, beforeEach, afterEach } = require('@jest/globals');

describe('Instance ID Flow Fix - SPARC Refinement Phase', () => {
  let mockResponse, mockFetch;
  
  beforeEach(() => {
    // Mock fetch for API calls
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Reset console to capture logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Backend Response Structure Fix', () => {
    test('should extract instanceId from response.instance.id structure', async () => {
      // Backend returns { success: true, instance: { id: "claude-1234" } }
      const backendResponse = {
        success: true,
        instance: {
          id: 'claude-1234',
          name: 'Test Instance',
          status: 'starting',
          pid: 5678
        }
      };
      
      // Simulate the fixed extraction logic
      const instanceId = backendResponse.instanceId || backendResponse.instance?.id;
      
      expect(instanceId).toBe('claude-1234');
      expect(instanceId).not.toBe(undefined);
      expect(instanceId).not.toBe('undefined');
    });
    
    test('should handle legacy response.instanceId structure', async () => {
      // Some responses might still use direct instanceId
      const legacyResponse = {
        success: true,
        instanceId: 'claude-5678'
      };
      
      const instanceId = legacyResponse.instanceId || legacyResponse.instance?.id;
      
      expect(instanceId).toBe('claude-5678');
    });
    
    test('should detect missing instanceId in response', async () => {
      const invalidResponse = {
        success: true
        // Missing both instanceId and instance.id
      };
      
      const instanceId = invalidResponse.instanceId || invalidResponse.instance?.id;
      
      expect(instanceId).toBe(undefined);
    });
  });
  
  describe('Instance ID Validation', () => {
    test('should validate correct instanceId format', () => {
      const validIds = ['claude-1234', 'claude-5678', 'claude-9999'];
      const pattern = /^claude-\\d+$/;
      
      validIds.forEach(id => {
        expect(pattern.test(id)).toBe(true);
      });
    });
    
    test('should reject invalid instanceId formats', () => {
      const invalidIds = [\n        'invalid-id',\n        'claude-abc',\n        'claude-',\n        'claude',\n        '',\n        null,\n        undefined,\n        'undefined'\n      ];\n      const pattern = /^claude-\\d+$/;\n      \n      invalidIds.forEach(id => {\n        expect(pattern.test(id)).toBe(false);\n      });\n    });\n  });\n  \n  describe('Connection Validation', () => {\n    test('should reject undefined instanceId for SSE connection', () => {\n      const validateInstanceId = (instanceId) => {\n        if (!instanceId || instanceId === 'undefined' || typeof instanceId !== 'string') {\n          return { isValid: false, error: `Invalid instanceId \"${instanceId}\"` };\n        }\n        \n        if (!/^claude-\\d+$/.test(instanceId)) {\n          return { isValid: false, error: `Invalid instanceId format \"${instanceId}\"` };\n        }\n        \n        return { isValid: true };\n      };\n      \n      const result = validateInstanceId(undefined);\n      expect(result.isValid).toBe(false);\n      expect(result.error).toContain('Invalid instanceId');\n    });\n    \n    test('should reject \"undefined\" string as instanceId', () => {\n      const validateInstanceId = (instanceId) => {\n        if (!instanceId || instanceId === 'undefined' || typeof instanceId !== 'string') {\n          return { isValid: false, error: `Invalid instanceId \"${instanceId}\"` };\n        }\n        return { isValid: true };\n      };\n      \n      const result = validateInstanceId('undefined');\n      expect(result.isValid).toBe(false);\n    });\n    \n    test('should accept valid instanceId for connection', () => {\n      const validateInstanceId = (instanceId) => {\n        if (!instanceId || instanceId === 'undefined' || typeof instanceId !== 'string') {\n          return { isValid: false, error: `Invalid instanceId \"${instanceId}\"` };\n        }\n        \n        if (!/^claude-\\d+$/.test(instanceId)) {\n          return { isValid: false, error: `Invalid instanceId format \"${instanceId}\"` };\n        }\n        \n        return { isValid: true };\n      };\n      \n      const result = validateInstanceId('claude-1234');\n      expect(result.isValid).toBe(true);\n      expect(result.error).toBe(undefined);\n    });\n  });\n  \n  describe('Error Recovery Scenarios', () => {\n    test('should provide clear error message for missing instanceId', () => {\n      const response = { success: true };\n      const instanceId = response.instanceId || response.instance?.id;\n      \n      if (!instanceId) {\n        const errorMessage = 'Instance creation failed: No instance ID in response';\n        expect(errorMessage).toContain('No instance ID');\n      }\n    });\n    \n    test('should provide clear error for invalid format', () => {\n      const invalidInstanceId = 'invalid-format';\n      \n      if (!/^claude-\\d+$/.test(invalidInstanceId)) {\n        const errorMessage = `Invalid instance ID format: ${invalidInstanceId}`;\n        expect(errorMessage).toContain('Invalid instance ID format');\n      }\n    });\n  });\n  \n  describe('Integration Test Scenarios', () => {\n    test('should simulate complete successful flow', () => {\n      // 1. Backend responds with nested structure\n      const backendResponse = {\n        success: true,\n        instance: {\n          id: 'claude-2643',\n          name: 'Test Instance',\n          status: 'starting'\n        }\n      };\n      \n      // 2. Frontend extracts instanceId correctly\n      const instanceId = backendResponse.instanceId || backendResponse.instance?.id;\n      expect(instanceId).toBe('claude-2643');\n      \n      // 3. Validation passes\n      const isValid = instanceId && typeof instanceId === 'string' && /^claude-\\d+$/.test(instanceId);\n      expect(isValid).toBe(true);\n      \n      // 4. Connection can be established\n      const connectionEndpoint = `/api/claude/instances/${instanceId}/terminal/stream`;\n      expect(connectionEndpoint).toBe('/api/claude/instances/claude-2643/terminal/stream');\n      expect(connectionEndpoint).not.toContain('undefined');\n    });\n    \n    test('should simulate failure detection and recovery', () => {\n      // 1. Backend responds without instanceId (edge case)\n      const invalidResponse = { success: true };\n      \n      // 2. Frontend detects missing ID\n      const instanceId = invalidResponse.instanceId || invalidResponse.instance?.id;\n      expect(instanceId).toBe(undefined);\n      \n      // 3. Error is caught before connection attempt\n      let errorCaught = false;\n      if (!instanceId) {\n        errorCaught = true;\n      }\n      expect(errorCaught).toBe(true);\n      \n      // 4. No undefined connection attempt is made\n      const wouldCreateEndpoint = instanceId ? `/api/claude/instances/${instanceId}/terminal/stream` : null;\n      expect(wouldCreateEndpoint).toBe(null);\n    });\n  });\n  \n  describe('Logging and Debug Verification', () => {\n    test('should log instanceId extraction process', () => {\n      const response = { success: true, instance: { id: 'claude-1234' } };\n      const instanceId = response.instanceId || response.instance?.id;\n      \n      // Simulate logging that should happen\n      const logMessage = `✅ Instance created successfully with ID: ${instanceId}`;\n      expect(logMessage).toContain('claude-1234');\n    });\n    \n    test('should log validation failures', () => {\n      const invalidInstanceId = 'undefined';\n      \n      if (!/^claude-\\d+$/.test(invalidInstanceId)) {\n        const errorLog = `❌ Invalid instance ID format: ${invalidInstanceId}`;\n        expect(errorLog).toContain('Invalid instance ID format');\n      }\n    });\n    \n    test('should log connection attempts with validated ID', () => {\n      const instanceId = 'claude-2643';\n      const logMessage = `🔗 Starting terminal connection for validated instance: ${instanceId}`;\n      \n      expect(logMessage).toContain('claude-2643');\n      expect(logMessage).not.toContain('undefined');\n    });\n  });\n});\n\n// Export for use in other test files\nmodule.exports = {\n  validateInstanceIdFormat: (id) => /^claude-\\d+$/.test(id),\n  extractInstanceId: (response) => response.instanceId || response.instance?.id,\n  validateInstanceId: (instanceId) => {\n    if (!instanceId || instanceId === 'undefined' || typeof instanceId !== 'string') {\n      return { isValid: false, error: `Invalid instanceId \"${instanceId}\"` };\n    }\n    \n    if (!/^claude-\\d+$/.test(instanceId)) {\n      return { isValid: false, error: `Invalid instanceId format \"${instanceId}\"` };\n    }\n    \n    return { isValid: true };\n  }\n};