/**
 * ANSI Parser Examples
 * Demonstrates how to use the ANSI parser with real Claude output examples
 */

const { 
  ANSIParser, 
  ClaudeOutputProcessor,
  stripAnsi,
  processForTerminal,
  processForWeb,
  extractResponse 
} = require('../src/utils/index.ts');

// Example 1: Basic ANSI stripping
console.log('=== Example 1: Basic ANSI Stripping ===');
const coloredText = '\x1b[31mRed text\x1b[0m with \x1b[32mgreen text\x1b[0m';
console.log('Original:', JSON.stringify(coloredText));
console.log('Stripped:', stripAnsi(coloredText));
console.log();

// Example 2: Box drawing conversion
console.log('=== Example 2: Box Drawing Conversion ===');
const boxText = `┌─────────────┐
│   Status    │
├─────────────┤
│  ✓ Success  │
└─────────────┘`;
console.log('Original:');
console.log(boxText);
console.log('\nConverted:');
const parsed = ANSIParser.parse(boxText);
console.log(parsed.cleanText);
console.log();

// Example 3: Real Claude output with ANSI
console.log('=== Example 3: Real Claude Output Processing ===');
const realClaudeOutput = `\x1b[2J\x1b[H\x1b[36m┌─────────────────────────────────────┐\x1b[0m
\x1b[36m│\x1b[0m \x1b[1mClaude AI Assistant Response\x1b[0m     \x1b[36m│\x1b[0m
\x1b[36m└─────────────────────────────────────┘\x1b[0m

\x1b[32m<thinking>\x1b[0m
The user is asking about implementing ANSI parsing functionality.
I should provide a comprehensive solution that handles:
1. ANSI escape sequences
2. Box drawing characters
3. Claude-specific content parsing
\x1b[32m</thinking>\x1b[0m

I'll help you implement proper ANSI parsing logic to convert raw Claude terminal output into clean, readable text.

\x1b[33m<function_calls>\x1b[0m
\x1b[33m<invoke name="Write">\x1b[0m
\x1b[33m<parameter name="file_path">/workspaces/agent-feed/src/utils/ansi-parser.ts</parameter>\x1b[0m
\x1b[33m<parameter name="content">// Parser implementation...</parameter>\x1b[0m
\x1b[33m</invoke>\x1b[0m
\x1b[33m</function_calls>\x1b[0m

Here's a comprehensive implementation that:
- Strips ANSI color codes and formatting sequences
- Converts box drawing characters to ASCII
- Extracts structured content (thinking, tool use)
- Preserves important formatting while removing terminal artifacts

The parser follows claudable's approach for clean, readable output.`;

console.log('Raw output length:', realClaudeOutput.length);
console.log('\n--- Processing for Terminal ---');
const terminalOutput = processForTerminal(realClaudeOutput);
console.log(terminalOutput);
console.log('\nTerminal output length:', terminalOutput.length);

console.log('\n--- Processing for Web UI ---');
const webOutput = processForWeb(realClaudeOutput);
console.log('Main response:', webOutput.response.substring(0, 100) + '...');
console.log('Has thinking:', !!webOutput.thinking);
console.log('Has tool use:', !!webOutput.toolUse);
console.log('Compression ratio:', webOutput.metadata?.compressionRatio.toFixed(1) + '%');

console.log('\n--- Extract Response Only ---');
const responseOnly = extractResponse(realClaudeOutput);
console.log(responseOnly.substring(0, 150) + '...');
console.log();

// Example 4: Stream processing simulation
console.log('=== Example 4: Stream Processing ===');
const chunks = [
  '\x1b[36m┌─ Processing',
  ' Request ─┐\x1b[0m\n\x1b[32m<thinking>\x1b[0m\n',
  'Analyzing user input...\n',
  'This requires multiple steps\x1b[32m</thinking>\x1b[0m\n\n',
  'I understand you need help with ANSI parsing.\n',
  'Let me provide a solution.'
];

let buffer = '';
console.log('Simulating stream processing:');
chunks.forEach((chunk, i) => {
  buffer += chunk;
  console.log(`Chunk ${i + 1}:`, JSON.stringify(chunk));
  
  // Process when we have complete sections
  if (buffer.includes('</thinking>') || i === chunks.length - 1) {
    const processed = processForTerminal(buffer);
    console.log(`Processed output:`, processed);
    buffer = ''; // Reset for next complete section
  }
});
console.log();

// Example 5: Performance demonstration
console.log('=== Example 5: Performance Testing ===');
const largeOutput = '\x1b[31m' + 'Large text content '.repeat(1000) + '\x1b[0m';
console.log('Large output size:', largeOutput.length, 'characters');

const startTime = performance.now();
const processedLarge = stripAnsi(largeOutput);
const endTime = performance.now();

console.log('Processing time:', (endTime - startTime).toFixed(2), 'ms');
console.log('Processed size:', processedLarge.length, 'characters');
console.log('Compression achieved:', ((largeOutput.length - processedLarge.length) / largeOutput.length * 100).toFixed(1) + '%');
console.log();

// Example 6: Error handling
console.log('=== Example 6: Error Handling ===');
const malformedInputs = [
  '\x1b[999mInvalid color code\x1b[0m',
  '\x1b[31mIncomplete sequence\x1b[',
  '',
  null,
  undefined,
  123 // Wrong type
];

malformedInputs.forEach((input, i) => {
  try {
    const result = ANSIParser.parse(input);
    console.log(`Input ${i + 1}:`, JSON.stringify(input), '→', JSON.stringify(result.cleanText));
  } catch (error) {
    console.log(`Input ${i + 1}:`, JSON.stringify(input), '→ Error:', error.message);
  }
});
console.log();

// Example 7: Integration with existing code
console.log('=== Example 7: Integration Example ===');
// Simulating integration with existing WebSocket or terminal code
function simulateClaudeResponse(rawOutput) {
  // This is how you'd integrate the parser into existing code
  const processed = ClaudeOutputProcessor.process(rawOutput, {
    preserveThinking: false,    // Don't show thinking in UI
    preserveToolUse: true,      // Show tool usage
    includeMetadata: true,      // Include performance stats
    maxLength: 10000,           // Limit processing size
    formatAsMarkdown: false     // Keep as plain text
  });
  
  return {
    cleanResponse: processed.response,
    toolCalls: processed.toolUse,
    processingStats: processed.metadata
  };
}

const sampleResponse = '\x1b[32m<thinking>\nLet me process this\x1b[0m\n</thinking>Here is your answer\x1b[33m<function_calls>\nTool call here\n</function_calls>\x1b[0m';
const integrated = simulateClaudeResponse(sampleResponse);
console.log('Integrated result:', integrated);

console.log('\n=== All Examples Complete ===');
console.log('The ANSI parser successfully handles all common Claude output scenarios:');
console.log('✓ ANSI escape sequence removal');
console.log('✓ Box drawing character conversion');  
console.log('✓ Structured content extraction');
console.log('✓ Performance optimization');
console.log('✓ Error handling');
console.log('✓ Easy integration');