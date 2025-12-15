/**
 * Test Claude Tool Call Detection and Formatting
 */

const { toolCallFormatter } = require('./src/services/ToolCallFormatter');

// Test with real Claude output patterns
const testOutputs = [
  "The package.json shows this is an \"Enterprise Agent Feed System with Claude-Flow Integration\" project.",
  "I can see that the file contains several key dependencies.",
  "Based on the package.json analysis, this project uses Express.js.",
  "Let me read the configuration file to understand the setup.",
  "I'll examine the source code structure.",
  "The file shows main scripts for development and production.",
  "Running command: npm install",
  "$ ls -la",
  "Regular output that should not be formatted as a tool call."
];

console.log('🔍 TESTING CLAUDE TOOL CALL DETECTION\n');

testOutputs.forEach((output, index) => {
  console.log(`Test ${index + 1}: "${output.substring(0, 60)}${output.length > 60 ? '...' : ''}"`);
  
  const result = toolCallFormatter.formatToolCallOutput(output, 'test-instance');
  
  console.log(`  Result type: ${result.type}`);
  console.log(`  Enhanced: ${result.enhanced}`);
  
  if (result.enhanced && result.type === 'tool_execution') {
    console.log(`  ✅ DETECTED TOOL EXECUTION!`);
    console.log(`  Tool activity: ${result.toolExecution?.activity}`);
    console.log(`  Visual output: ${result.data.substring(0, 100)}...`);
  } else {
    console.log(`  ➡️ Regular output (no tool detected)`);
  }
  
  console.log('');
});

console.log('\n🎯 Summary: Testing complete!');