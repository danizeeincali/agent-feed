/**
 * Claude Integration Test Suite Configuration
 *
 * London School TDD Test Suite Runner Configuration
 * Ensures comprehensive test coverage for real Claude Code integration
 */

export const claudeIntegrationTestSuite = {
  name: 'Claude Code Real Integration Validation',
  description: 'Comprehensive TDD tests to validate NO mock responses exist and ALL functionality is real',

  testFiles: [
    'AviDirectChatReal.london-tdd.test.tsx',
    'AviDirectChatMock.anti-pattern.test.tsx',
    'EnhancedPostingInterface.integration.test.tsx',
    'Claude-Integration.contract.test.tsx'
  ],

  testCategories: {
    antiMock: {
      name: 'No Mock Response Tests',
      description: 'Critical tests that verify no hardcoded responses exist',
      tests: [
        'sending "hello" does NOT return hardcoded mock response',
        'SHOULD contain generateAviResponse function (mock behavior)',
        'validates no setTimeout-based fake responses in Avi integration'
      ]
    },

    realApiIntegration: {
      name: 'Real API Integration Tests',
      description: 'Tests that verify real Claude Code API usage',
      tests: [
        'creates Claude instance with proper metadata on mount',
        'sends messages to real Claude instance API endpoint',
        'handles real API responses without hardcoded content'
      ]
    },

    instanceCreation: {
      name: 'Instance Creation Validation',
      description: 'Tests that verify proper Claude instance creation',
      tests: [
        'verifies Claude instance created with Avi metadata',
        'uses working directory from current workspace',
        'validates instance creation request contract'
      ]
    },

    errorHandling: {
      name: 'Error Handling & Connection Failures',
      description: 'Tests that verify proper error handling',
      tests: [
        'handles Claude instance creation failure',
        'handles message sending failure and retries connection',
        'validates API response structure'
      ]
    },

    behaviorVerification: {
      name: 'Behavior Verification (London School Focus)',
      description: 'Tests that verify object interactions and collaborations',
      tests: [
        'verifies interaction sequence: connect → send → receive',
        'verifies component state transitions during message flow'
      ]
    },

    contractTesting: {
      name: 'Contract Testing',
      description: 'Tests that verify API contracts and compatibility',
      tests: [
        'validates instance creation response contract',
        'validates message response contract',
        'handles contract violations gracefully'
      ]
    }
  },

  successCriteria: {
    coverage: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    },

    criticalPaths: [
      'Claude instance creation with real API calls',
      'Message sending to real Claude instances',
      'No hardcoded mock responses',
      'Proper error handling and retry logic',
      'Contract compliance for all API interactions'
    ],

    antiPatterns: [
      'No setTimeout-based fake responses',
      'No hardcoded "I received your message" responses',
      'No client-side response generation',
      'No mock API endpoints usage'
    ]
  },

  mockingStrategy: {
    approach: 'London School (mockist)',
    mockExternalDependencies: true,
    mockInternalCollaborators: false,
    focusOnBehavior: true,
    focusOnInteractions: true
  },

  testEnvironment: {
    framework: 'Jest + React Testing Library',
    userEventLibrary: '@testing-library/user-event',
    mockingLibrary: 'Jest mocks',
    assertionLibrary: 'Jest expect'
  }
};

export const testRunnerCommands = {
  runAll: 'npm test -- --testPathPattern="components.*claude.*integration"',
  runAntiMock: 'npm test -- AviDirectChatReal.london-tdd.test.tsx',
  runContracts: 'npm test -- Claude-Integration.contract.test.tsx',
  runIntegration: 'npm test -- EnhancedPostingInterface.integration.test.tsx',
  runAntiPatterns: 'npm test -- AviDirectChatMock.anti-pattern.test.tsx',

  coverage: 'npm test -- --coverage --testPathPattern="components.*claude.*integration"',
  watch: 'npm test -- --watch --testPathPattern="components.*claude.*integration"'
};

export default claudeIntegrationTestSuite;