/**
 * Jest Setup for Token Analytics Tests
 * Configures fake data detection and real data validation
 */

// Custom matchers for fake data detection
expect.extend({
  toContainRealTokenData(received) {
    const fakeDataPatterns = [
      /\$?\d+\.\d{2}/, // Hardcoded dollar amounts like $12.45
      /12\.45|42\.00|99\.99/, // Common fake amounts
      /lorem ipsum/i,
      /sample|dummy|test|mock|fake/i,
      /placeholder/i,
      /example\.com/i,
      /TODO|FIXME|STUB/i
    ];

    const hasFakeData = fakeDataPatterns.some(pattern =>
      pattern.test(JSON.stringify(received))
    );

    if (hasFakeData) {
      return {
        message: () => `Expected real token data but found fake/mock data patterns in: ${JSON.stringify(received, null, 2)}`,
        pass: false
      };
    }

    // Validate real data structure
    const isRealData = this.validateRealTokenData(received);

    return {
      message: () => isRealData ?
        `Expected fake data but found real token data` :
        `Token data validation failed: missing required real data properties`,
      pass: isRealData
    };
  },

  toHaveValidTokenUsage(received) {
    const requiredProps = ['tokensUsed', 'estimatedCost', 'provider', 'model', 'timestamp'];
    const hasAllProps = requiredProps.every(prop => received.hasOwnProperty(prop));

    if (!hasAllProps) {
      return {
        message: () => `Token usage missing required properties: ${requiredProps.filter(prop => !received.hasOwnProperty(prop)).join(', ')}`,
        pass: false
      };
    }

    // Validate realistic values
    if (received.tokensUsed <= 0 || received.estimatedCost < 0) {
      return {
        message: () => `Token usage has invalid values: tokens=${received.tokensUsed}, cost=${received.estimatedCost}`,
        pass: false
      };
    }

    return {
      message: () => `Valid token usage data`,
      pass: true
    };
  },

  toBeRealApiResponse(received) {
    // Check for real API response structure
    const realApiIndicators = [
      'request_id',
      'duration_ms',
      'model',
      'usage',
      'timestamp'
    ];

    const hasRealStructure = realApiIndicators.some(indicator =>
      received.hasOwnProperty(indicator)
    );

    // Check for fake response patterns
    const fakeResponsePatterns = [
      /mock|stub|fake|test/i,
      /\$12\.45|\$42\.00|\$99\.99/,
      /lorem ipsum/i
    ];

    const hasFakePatterns = fakeResponsePatterns.some(pattern =>
      pattern.test(JSON.stringify(received))
    );

    const pass = hasRealStructure && !hasFakePatterns;

    return {
      message: () => pass ?
        `Valid real API response` :
        `Expected real API response but found fake/mock data or missing structure`,
      pass
    };
  }
});

// Helper function to validate real token data
expect.extend({
  validateRealTokenData(data) {
    if (!data || typeof data !== 'object') return false;

    // Check for timestamp (should be recent and valid)
    if (data.timestamp) {
      const timestamp = new Date(data.timestamp);
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Real data should be recent (within last hour for testing)
      if (timestamp < hourAgo || timestamp > now) {
        return false;
      }
    }

    // Check for realistic cost calculations
    if (data.estimatedCost && data.tokensUsed) {
      const costPerToken = data.estimatedCost / data.tokensUsed;
      // Anthropic Claude-3 costs roughly $0.0000075 per input token
      if (costPerToken < 0.000001 || costPerToken > 0.001) {
        return false;
      }
    }

    return true;
  }
});

// Global test setup
beforeAll(() => {
  // Ensure no environment variables contain fake data
  const env = process.env;
  const suspiciousEnvVars = Object.keys(env).filter(key =>
    /MOCK|FAKE|TEST|STUB/i.test(key) && key.includes('TOKEN')
  );

  if (suspiciousEnvVars.length > 0) {
    throw new Error(`Suspicious environment variables detected: ${suspiciousEnvVars.join(', ')}`);
  }
});

// Mock prevention - fail if mocks are detected
const originalJestMock = jest.mock;
jest.mock = (...args) => {
  const [modulePath] = args;
  if (modulePath.includes('claude') || modulePath.includes('token') || modulePath.includes('api')) {
    throw new Error(`Mocking of token/API modules is forbidden: ${modulePath}`);
  }
  return originalJestMock.apply(jest, args);
};

// Global error handler for fake data detection
process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.message && reason.message.includes('fake')) {
    console.error('FAKE DATA DETECTED:', reason);
    process.exit(1);
  }
});