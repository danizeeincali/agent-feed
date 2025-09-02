export const testCommands = {
  simple: {
    command: 'ls -la',
    description: 'List directory contents',
    expectedOutput: /total|drwx/,
    toolCalls: ['bash']
  },
  
  complex: {
    command: 'find . -name "*.ts" | head -5',
    description: 'Find TypeScript files',
    expectedOutput: /\.ts$/,
    toolCalls: ['bash', 'find']
  },
  
  interactive: {
    command: 'read -p "Enter your name: " name && echo "Hello, $name"',
    description: 'Interactive command with user input',
    userInput: 'TestUser',
    expectedOutput: /Hello, TestUser/,
    toolCalls: ['bash', 'read']
  },
  
  longRunning: {
    command: 'sleep 3 && echo "Task completed"',
    description: 'Long running command',
    expectedOutput: /Task completed/,
    toolCalls: ['bash', 'sleep'],
    timeout: 5000
  },
  
  errorProne: {
    command: 'nonexistentcommand',
    description: 'Command that should fail',
    expectError: true,
    expectedOutput: /command not found|not recognized/,
    toolCalls: ['bash']
  }
};

export const testScenarios = {
  quickStart: {
    name: 'Quick Start Flow',
    steps: [
      'Navigate to application',
      'Click Create Instance',
      'Wait for instance creation',
      'Execute simple command',
      'Verify output'
    ]
  },
  
  fullWorkflow: {
    name: 'Complete User Workflow',
    steps: [
      'Navigate to application',
      'Create new instance',
      'Execute multiple commands',
      'Handle interactive prompts',
      'Verify all tool calls',
      'Test error scenarios'
    ]
  },
  
  stressTest: {
    name: 'Stress Test Scenario',
    steps: [
      'Create multiple instances',
      'Execute concurrent commands',
      'Monitor performance',
      'Verify stability'
    ]
  }
};

export const browserConfigs = {
  desktop: {
    chromium: { width: 1920, height: 1080 },
    firefox: { width: 1920, height: 1080 },
    webkit: { width: 1920, height: 1080 }
  },
  
  mobile: {
    'iPhone 12': { width: 390, height: 844 },
    'Pixel 5': { width: 393, height: 851 }
  }
};

export const performanceThresholds = {
  pageLoadTime: 3000, // 3 seconds
  commandExecutionTime: 5000, // 5 seconds
  instanceCreationTime: 10000, // 10 seconds
  webSocketConnectionTime: 2000 // 2 seconds
};