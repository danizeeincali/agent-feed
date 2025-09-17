export const testMessages = {
  simple: {
    greeting: "Hello Avi, how are you today?",
    question: "What can you help me with?",
    codeRequest: "Can you help me write a React component?",
    fileRequest: "Please read the package.json file",
    longMessage: "This is a very long message that should test the text wrapping capabilities of the chat interface. It contains multiple sentences and should demonstrate how the UI handles longer content gracefully."
  },

  complex: {
    multiline: "Line 1\nLine 2\nLine 3",
    withEmojis: "Hello 👋 Avi! Can you help me? 🤖",
    withSpecialChars: "Test: @#$%^&*()_+-=[]{}|;':,.<>?",
    withCode: "```javascript\nconst hello = 'world';\nconsole.log(hello);\n```",
    withMentions: "@avi please help with @claude-code integration"
  },

  error: {
    empty: "",
    tooLong: "a".repeat(10000),
    onlySpaces: "   ",
    invalidChars: "\x00\x01\x02"
  },

  api: {
    validRequest: "List the files in the current directory",
    toolRequest: "Use the Read tool to show me the contents of README.md",
    bashCommand: "Run 'npm test' command",
    multiStep: "First read package.json, then run npm install, then list the node_modules"
  }
};

export const testImages = {
  valid: {
    small: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    medium: 'test-image-medium.png',
    large: 'test-image-large.png'
  },

  invalid: {
    notImage: 'test-document.pdf',
    tooLarge: 'test-image-50mb.png',
    corrupted: 'corrupted-image.png'
  },

  formats: {
    png: 'test.png',
    jpg: 'test.jpg',
    gif: 'test.gif',
    webp: 'test.webp',
    svg: 'test.svg'
  }
};

export const mockResponses = {
  success: {
    simple: {
      success: true,
      responses: [{
        content: "Hello! I'm Avi, your AI assistant. I'm here to help you with development tasks, answer questions, and more!",
        timestamp: new Date().toISOString()
      }]
    },

    withFiles: {
      success: true,
      responses: [{
        content: "I've successfully read the package.json file. Here are the key details:",
        files: ['package.json'],
        timestamp: new Date().toISOString()
      }]
    },

    streaming: {
      success: true,
      streaming: true,
      responses: [{
        content: "Here's the React component you requested:",
        streamData: true,
        timestamp: new Date().toISOString()
      }]
    }
  },

  error: {
    networkError: {
      success: false,
      error: "Network connection failed"
    },

    apiError: {
      success: false,
      error: "API request failed: 500"
    },

    timeout: {
      success: false,
      error: "Request timeout after 30 seconds"
    },

    invalidInput: {
      success: false,
      error: "Invalid input format"
    }
  }
};

export const testScenarios = {
  happyPath: {
    name: "Happy path conversation",
    steps: [
      { action: "navigate", target: "chat" },
      { action: "send", message: testMessages.simple.greeting },
      { action: "wait", for: "response" },
      { action: "verify", expected: "response received" }
    ]
  },

  errorRecovery: {
    name: "Error recovery scenario",
    steps: [
      { action: "navigate", target: "chat" },
      { action: "simulate", type: "network-error" },
      { action: "send", message: testMessages.simple.question },
      { action: "verify", expected: "error message" },
      { action: "restore", type: "network" },
      { action: "retry", message: testMessages.simple.question },
      { action: "verify", expected: "successful response" }
    ]
  },

  imageUpload: {
    name: "Image upload workflow",
    steps: [
      { action: "navigate", target: "chat" },
      { action: "upload", files: [testImages.valid.small] },
      { action: "send", message: "Please analyze this image" },
      { action: "wait", for: "response" },
      { action: "verify", expected: "image processed" }
    ]
  },

  concurrentChats: {
    name: "Multiple concurrent conversations",
    steps: [
      { action: "open", windows: 3 },
      { action: "navigate", target: "chat", window: "all" },
      { action: "send", message: testMessages.simple.greeting, window: "all" },
      { action: "verify", expected: "all responses received" }
    ]
  }
};

export const performanceThresholds = {
  messageResponse: 5000, // 5 seconds
  initialLoad: 3000,     // 3 seconds
  imageUpload: 10000,    // 10 seconds
  streamingStart: 2000,  // 2 seconds
  errorRecovery: 1000    // 1 second
};

export const accessibilityRequirements = {
  keyboardNavigation: [
    'Tab', 'Shift+Tab', 'Enter', 'Escape', 'Arrow keys'
  ],

  screenReaderLabels: [
    'Chat input field',
    'Send message button',
    'Upload image button',
    'Connection status',
    'Message list',
    'Error message'
  ],

  colorContrast: {
    minimumRatio: 4.5,
    largeTextRatio: 3.0
  }
};