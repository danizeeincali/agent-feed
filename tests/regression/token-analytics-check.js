const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for Token Analytics Database Agent...');

// Test the token analytics check directly
const agentsDir = '/workspaces/agent-feed/agents';
const files = fs.readdirSync(agentsDir).filter(file => file.endsWith('.md'));

console.log(`📁 Agent files found: ${files.length}`);
console.log('Files:', files.slice(0, 10));

// Check for token analytics in filenames
const tokenAnalyticsFiles = files.filter(file =>
  file.toLowerCase().includes('token-analytics') ||
  file.toLowerCase().includes('token_analytics')
);

console.log(`📝 Token Analytics files found: ${tokenAnalyticsFiles.length}`);
if (tokenAnalyticsFiles.length > 0) {
  console.log('❌ FOUND TOKEN ANALYTICS FILES:', tokenAnalyticsFiles);
} else {
  console.log('✅ No Token Analytics files found in filenames');
}

// Check file contents for token analytics references
console.log('🔍 Checking file contents for Token Analytics Database references...');
let foundInContent = false;
const maxFiles = Math.min(20, files.length);

for (let i = 0; i < maxFiles; i++) {
  const file = files[i];
  try {
    const content = fs.readFileSync(path.join(agentsDir, file), 'utf-8');
    if (content.toLowerCase().includes('token analytics database')) {
      console.log(`❌ Found "Token Analytics Database" reference in ${file}`);
      foundInContent = true;
    }
  } catch (error) {
    console.log(`⚠️  Could not read file ${file}: ${error.message}`);
  }
}

if (!foundInContent) {
  console.log('✅ No "Token Analytics Database" references found in content');
}

// Summary
console.log('\n📊 SUMMARY:');
console.log(`Total agent files: ${files.length}`);
console.log(`Token analytics in filenames: ${tokenAnalyticsFiles.length}`);
console.log(`Token analytics in content: ${foundInContent ? 'FOUND' : 'NOT FOUND'}`);
console.log(`Overall result: ${tokenAnalyticsFiles.length === 0 && !foundInContent ? '✅ PASSED' : '❌ FAILED'}`);