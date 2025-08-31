/**
 * Expected clean outputs that match claudable's parsing style
 * These represent the desired final rendered output
 */

export const EXPECTED_CLEAN_OUTPUTS = {
  fileOperation: {
    html: `<div class="claude-output">
  <div class="operation-header">
    <span class="file-indicator">📁</span>
    <span class="file-path">Reading file: /workspaces/agent-feed/frontend/src/components/ClaudeInstanceManagerModern.tsx</span>
  </div>
  
  <div class="status-message info">
    I'll read the file to understand the current implementation.
  </div>
  
  <div class="success-indicator">
    <span class="checkmark">✓</span>
    <span class="message">File read successfully</span>
  </div>
  
  <div class="analysis-header">
    <strong>Now I'll analyze the WebSocket connection logic...</strong>
  </div>
  
  <div class="error-message">
    <span class="error-label">Error:</span>
    <span class="error-text">WebSocket connection failed: Connection refused</span>
  </div>
  
  <div class="retry-message">
    Retrying in 3 seconds...
  </div>
  
  <div class="success-indicator">
    <span class="checkmark">✓</span>
    <span class="message">WebSocket connected successfully</span>
  </div>
  
  <div class="final-success">
    <strong class="success-text">Success!</strong> Claude instance is now operational.
  </div>
</div>`,
    text: `📁 Reading file: /workspaces/agent-feed/frontend/src/components/ClaudeInstanceManagerModern.tsx

I'll read the file to understand the current implementation.

✓ File read successfully

Now I'll analyze the WebSocket connection logic...

Error: WebSocket connection failed: Connection refused
Retrying in 3 seconds...

✓ WebSocket connected successfully

Success! Claude instance is now operational.`,
  },

  codeGeneration: {
    html: `<div class="claude-output">
  <div class="operation-header">
    <span class="code-indicator">🔧</span>
    <span class="operation-text">Generating React component...</span>
  </div>
  
  <div class="code-block">
    <div class="code-comment">// Component implementation</div>
    <pre class="language-javascript"><code>import React, { useState, useEffect } from 'react';

const ClaudeParser = () => {
  const [output, setOutput] = useState('');
  
  return (
    &lt;div&gt;
      &lt;pre&gt;{output}&lt;/pre&gt;
    &lt;/div&gt;
  );
};</code></pre>
  </div>
  
  <div class="success-indicator">
    <span class="checkmark">✓</span>
    <span class="message">Component generated successfully</span>
  </div>
</div>`,
    text: `🔧 Generating React component...

// Component implementation
import React, { useState, useEffect } from 'react';

const ClaudeParser = () => {
  const [output, setOutput] = useState('');
  
  return (
    <div>
      <pre>{output}</pre>
    </div>
  );
};

✓ Component generated successfully`,
  },

  multiToolExecution: {
    html: `<div class="claude-output">
  <div class="operation-group-header">
    <strong>Executing multiple operations...</strong>
  </div>
  
  <div class="operation-section">
    <div class="section-header">
      <span class="section-title">Operation 1: Reading files</span>
    </div>
    <ul class="file-list">
      <li class="success-item">✓ Read: package.json</li>
      <li class="success-item">✓ Read: tsconfig.json</li>
      <li class="success-item">✓ Read: vite.config.js</li>
    </ul>
  </div>
  
  <div class="operation-section">
    <div class="section-header">
      <span class="section-title">Operation 2: Analyzing dependencies</span>
    </div>
    <div class="analysis-results">
      <div class="info-item">Found 247 dependencies</div>
      <div class="warning-item">Warning: 3 vulnerabilities detected</div>
      <div class="success-item">✓ Analysis complete</div>
    </div>
  </div>
  
  <div class="final-success">
    <strong>All operations completed successfully!</strong>
  </div>
</div>`,
    text: `Executing multiple operations...

Operation 1: Reading files
✓ Read: package.json
✓ Read: tsconfig.json
✓ Read: vite.config.js

Operation 2: Analyzing dependencies
Found 247 dependencies
Warning: 3 vulnerabilities detected
✓ Analysis complete

All operations completed successfully!`,
  },

  errorHandling: {
    html: `<div class="claude-output">
  <div class="error-section">
    <div class="error-header">Error occurred during execution:</div>
    
    <div class="stack-trace">
      <div class="stack-header">Stack trace:</div>
      <pre class="stack-content">Error: Cannot read property 'message' of undefined
    at parseClaudeResponse (ClaudeParser.js:42:15)
    at WebSocket.onMessage (WebSocketHandler.js:28:23)
    at WebSocket.emit (events.js:315:20)
    at Receiver.receiverOnMessage (websocket.js:825:20)</pre>
    </div>
  </div>
  
  <div class="recovery-section">
    <div class="recovery-message">Attempting recovery...</div>
    <div class="success-indicator">
      <span class="checkmark">✓</span>
      <span class="message">Recovery successful</span>
    </div>
    <div class="resume-message">
      <strong>Operation resumed</strong>
    </div>
  </div>
</div>`,
    text: `Error occurred during execution:

Stack trace:
Error: Cannot read property 'message' of undefined
    at parseClaudeResponse (ClaudeParser.js:42:15)
    at WebSocket.onMessage (WebSocketHandler.js:28:23)
    at WebSocket.emit (events.js:315:20)
    at Receiver.receiverOnMessage (websocket.js:825:20)

Attempting recovery...
✓ Recovery successful

Operation resumed`,
  },

  progressIndicators: {
    html: `<div class="claude-output">
  <div class="progress-section">
    <div class="operation-text">Processing large file...</div>
    <div class="progress-bar completed">
      <div class="progress-fill" style="width: 100%"></div>
      <span class="progress-text">100% (2.3s)</span>
    </div>
  </div>
  
  <div class="testing-section">
    <div class="operation-text">Running tests...</div>
    <ul class="test-results">
      <li class="success-item">✓ Testing component rendering...</li>
      <li class="success-item">✓ Testing WebSocket connection...</li>
      <li class="success-item">✓ Testing ANSI parsing...</li>
      <li class="success-item">✓ Testing error handling...</li>
    </ul>
    <div class="test-summary success">✓ All tests passed</div>
  </div>
  
  <div class="build-success">
    <strong>Build completed successfully!</strong> (Build time: 4.2s)
  </div>
</div>`,
    text: `Processing large file...
[████████████████████] 100% (2.3s)

Running tests...
✓ Testing component rendering...
✓ Testing WebSocket connection...
✓ Testing ANSI parsing...
✓ Testing error handling...
✓ All tests passed

Build completed successfully! (Build time: 4.2s)`,
  },

  tableOutput: {
    html: `<div class="claude-output">
  <div class="table-section">
    <h3>File Analysis Results:</h3>
    
    <table class="results-table">
      <thead>
        <tr>
          <th>File Name</th>
          <th>Size</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>ClaudeParser.js</td>
          <td>1.2 KB</td>
          <td class="status-modified">Modified</td>
        </tr>
        <tr>
          <td>WebSocketHandler.js</td>
          <td>3.4 KB</td>
          <td class="status-warning">Warning</td>
        </tr>
        <tr>
          <td>ANSIProcessor.js</td>
          <td>0.8 KB</td>
          <td class="status-clean">Clean</td>
        </tr>
      </tbody>
    </table>
    
    <div class="table-summary">
      <strong>Summary:</strong> 3 files processed, 1 warning
    </div>
  </div>
</div>`,
    text: `File Analysis Results:

File Name               Size     Status
─────────────────────────────────────────
ClaudeParser.js         1.2 KB   Modified
WebSocketHandler.js     3.4 KB   Warning
ANSIProcessor.js        0.8 KB   Clean

Summary: 3 files processed, 1 warning`,
  },
};

export const PARSING_EXPECTATIONS = {
  // Rules for how ANSI codes should be converted
  ansiToHtml: {
    '\u001b[32m': '<span class="ansi-green">',
    '\u001b[31m': '<span class="ansi-red">',
    '\u001b[33m': '<span class="ansi-yellow">',
    '\u001b[36m': '<span class="ansi-cyan">',
    '\u001b[90m': '<span class="ansi-bright-black">',
    '\u001b[1m': '<strong>',
    '\u001b[4m': '<u>',
    '\u001b[0m': '</span>',
  },
  
  // Semantic transformations
  semanticMapping: {
    '✓': 'success-indicator',
    '✗': 'error-indicator',
    '⚠': 'warning-indicator',
    '📁': 'file-indicator',
    '🔧': 'tool-indicator',
  },
  
  // Performance benchmarks
  performance: {
    maxParseTime: 100, // milliseconds
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    concurrentParsing: 10, // simultaneous operations
  },
};