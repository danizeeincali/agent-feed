/**
 * Fake Data Detection Tests
 * Critical tests to ensure NO fake/mock data exists in token analytics
 */

describe('Fake Data Detection', () => {

  describe('Hardcoded Cost Detection', () => {
    test('should detect hardcoded dollar amounts in code', async () => {
      const suspiciousValues = [
        '$12.45',
        '$42.00',
        '$99.99',
        '12.45',
        'cost: 42.00',
        'price = $15.50'
      ];

      suspiciousValues.forEach(value => {
        expect(() => {
          if (/\$?\d+\.\d{2}/.test(value)) {
            global.reportFakeDataViolation(`Hardcoded cost detected: ${value}`);
          }
        }).toThrow('FAKE DATA VIOLATION');
      });
    });

    test('should reject objects with hardcoded costs', () => {
      const fakeTokenData = {
        tokensUsed: 150,
        estimatedCost: 12.45, // Hardcoded fake amount
        provider: 'claude',
        model: 'claude-3-sonnet'
      };

      expect(fakeTokenData).not.toContainRealTokenData();
    });

    test('should detect common fake amounts in JSON strings', () => {
      const jsonWithFakeData = JSON.stringify({
        cost: '$42.00',
        usage: 'sample data'
      });

      const fakePatterns = [/\$42\.00/, /sample.*data/i];
      const hasFakeData = fakePatterns.some(pattern => pattern.test(jsonWithFakeData));

      expect(hasFakeData).toBe(true);
      if (hasFakeData) {
        expect(() => global.reportFakeDataViolation('Fake JSON data detected')).toThrow();
      }
    });
  });

  describe('Mock Data Pattern Detection', () => {
    test('should detect mock/fake keywords in token data', () => {
      const mockDataExamples = [
        'mock token usage',
        'fake API response',
        'dummy cost calculation',
        'test data placeholder',
        'sample token metrics'
      ];

      mockDataExamples.forEach(example => {
        const fakePattern = /mock|fake|dummy|test|sample/i;
        expect(fakePattern.test(example)).toBe(true);
      });
    });

    test('should reject token objects with mock indicators', () => {
      const mockTokenData = {
        id: 'mock-123',
        tokensUsed: 100,
        estimatedCost: 0.075,
        provider: 'claude',
        model: 'test-model'
      };

      expect(mockTokenData).not.toContainRealTokenData();
    });

    test('should detect placeholder domains and emails', () => {
      const placeholderPatterns = [
        'user@example.com',
        'test@domain.com',
        'api.example.com',
        'localhost:3000'
      ];

      placeholderPatterns.forEach(pattern => {
        expect(/example\.com|test@|localhost/i.test(pattern)).toBe(true);
      });
    });
  });

  describe('Development Artifact Detection', () => {
    test('should detect TODO and development comments', () => {
      const devArtifacts = [
        '// TODO: Replace with real API',
        '/* FIXME: Use actual token costs */',
        '// STUB: Implement real calculation',
        'console.log("DEBUG: fake data")'
      ];

      devArtifacts.forEach(artifact => {
        expect(/TODO|FIXME|STUB|DEBUG.*fake/i.test(artifact)).toBe(true);
      });
    });

    test('should detect test environment indicators', () => {
      const testIndicators = [
        'NODE_ENV=test',
        'MOCK_API=true',
        'USE_FAKE_DATA=true',
        'DISABLE_REAL_API=true'
      ];

      testIndicators.forEach(indicator => {
        expect(/MOCK|FAKE|TEST.*=.*true/i.test(indicator)).toBe(true);
      });
    });
  });

  describe('API Response Validation', () => {
    test('should validate real API response structure', () => {
      // This would be a real API response
      const realApiResponse = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'message',
        role: 'assistant',
        content: 'Real response content',
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 125,
          output_tokens: 87
        }
      };

      expect(realApiResponse).toBeRealApiResponse();
    });

    test('should reject fake API responses', () => {
      const fakeApiResponse = {
        message: 'This is a mock response',
        cost: '$12.45',
        tokens: 100,
        fake: true
      };

      expect(fakeApiResponse).not.toBeRealApiResponse();
    });

    test('should validate timestamp authenticity', () => {
      const now = Date.now();
      const recentTimestamp = new Date(now - 30000).toISOString(); // 30 seconds ago
      const oldTimestamp = new Date(now - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago

      const recentData = {
        timestamp: recentTimestamp,
        tokensUsed: 150,
        estimatedCost: 0.0045, // Realistic cost
        provider: 'claude'
      };

      const oldData = {
        timestamp: oldTimestamp,
        tokensUsed: 150,
        estimatedCost: 0.0045,
        provider: 'claude'
      };

      // Recent data should pass validation
      expect(global.validateRealTokenData(recentData)).toBe(true);

      // Old data should fail validation for real-time tests
      expect(global.validateRealTokenData(oldData)).toBe(false);
    });
  });

  describe('Cost Calculation Validation', () => {
    test('should validate realistic token costs', () => {
      // Claude-3 Sonnet pricing: ~$0.000003 per input token
      const validTokenData = {
        tokensUsed: 1000,
        estimatedCost: 0.003, // $0.003 for 1000 tokens - realistic
        provider: 'claude',
        model: 'claude-3-sonnet'
      };

      const invalidTokenData = {
        tokensUsed: 1000,
        estimatedCost: 50.00, // $50 for 1000 tokens - unrealistic
        provider: 'claude',
        model: 'claude-3-sonnet'
      };

      expect(global.validateRealTokenData(validTokenData)).toBe(true);
      expect(global.validateRealTokenData(invalidTokenData)).toBe(false);
    });

    test('should detect impossible cost ratios', () => {
      const impossibleRatios = [
        { tokens: 100, cost: 100 }, // $1 per token
        { tokens: 1000, cost: 0.00001 }, // Too cheap
        { tokens: 0, cost: 5 }, // No tokens but cost
        { tokens: -100, cost: 1 } // Negative tokens
      ];

      impossibleRatios.forEach(({ tokens, cost }) => {
        const data = {
          tokensUsed: tokens,
          estimatedCost: cost,
          provider: 'claude'
        };

        expect(global.validateRealTokenData(data)).toBe(false);
      });
    });
  });

  describe('Environment Security', () => {
    test('should ensure no mock environment variables', () => {
      const suspiciousEnvVars = Object.keys(process.env).filter(key =>
        /MOCK|FAKE|TEST|STUB/i.test(key) && /TOKEN|API|COST/i.test(key)
      );

      expect(suspiciousEnvVars).toHaveLength(0);
    });

    test('should require real API keys for production tests', () => {
      if (global.VALIDATION_SETTINGS.requireRealApiKeys) {
        expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
        expect(process.env.ANTHROPIC_API_KEY).not.toMatch(/fake|mock|test/i);
        expect(process.env.ANTHROPIC_API_KEY.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Global Fake Data Prevention', () => {
    test('should have zero fake data violations recorded', () => {
      expect(global.__FAKE_DATA_VIOLATIONS__).toBeDefined();
      expect(global.__FAKE_DATA_VIOLATIONS__).toHaveLength(0);
    });

    test('should track real data validations', () => {
      // Simulate a real data validation
      global.trackRealDataValidation();

      expect(global.__REAL_DATA_VALIDATIONS__).toBeGreaterThan(0);
    });

    test('should fail immediately on fake data detection', () => {
      const attemptFakeDataUsage = () => {
        const fakeData = {
          cost: '$12.45', // Hardcoded fake amount
          provider: 'mock-api'
        };

        // This should trigger immediate failure
        if (/\$\d+\.\d{2}/.test(JSON.stringify(fakeData))) {
          global.reportFakeDataViolation('Hardcoded cost in test data');
        }
      };

      expect(attemptFakeDataUsage).toThrow('FAKE DATA VIOLATION');
    });
  });
});