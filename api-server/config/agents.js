const path = require('path');

module.exports = {
  // Agent definitions directory
  agentsDirectory: path.join(__dirname, '../../prod/.claude/agents'),

  // Agent file pattern
  filePattern: '*.md',

  // Cache settings
  cache: {
    enabled: true,
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100
  },

  // File watching for auto-reload
  watch: {
    enabled: true,
    debounceMs: 300
  },

  // Supported agent properties
  supportedProperties: [
    'name',
    'description',
    'tools',
    'model',
    'color',
    'proactive',
    'priority',
    'usage'
  ],

  // Default values
  defaults: {
    model: 'sonnet',
    color: '#374151',
    proactive: false,
    priority: 'P3',
    tools: []
  }
};