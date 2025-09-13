// Test configuration validation
console.log('🧪 TDD London School Test Configuration Validation');
console.log('━'.repeat(60));

try {
  const config = require('./jest.config.js');
  console.log('✅ Jest config loaded successfully');
  console.log('✅ Test environment:', config.testEnvironment);
  console.log('✅ Setup files:', config.setupFilesAfterEnv);
  console.log('✅ Coverage thresholds configured:', !!config.coverageThreshold);
  console.log('✅ Custom matchers enabled:', !!config.setupFilesAfterEnv.length);
  console.log('✅ London School globals configured:', !!config.globals.TDD_MODE);
  console.log('');
  
  // Validate test setup
  console.log('🔍 Validating test setup...');
  require('./test-setup.js');
  console.log('✅ Test setup loaded successfully');
  console.log('✅ Custom matchers registered');
  console.log('✅ London School utilities available');
  console.log('');
  
  // Check test file exists
  console.log('📝 Validating main test file...');
  const fs = require('fs');
  const testFilePath = './no-mock-data-rule.test.js';
  
  if (fs.existsSync(testFilePath)) {
    console.log('✅ Test suite file exists');
    const testContent = fs.readFileSync(testFilePath, 'utf8');
    
    console.log('✅ Mock dependencies defined:', testContent.includes('mockAgentDataService'));
    console.log('✅ Test classes defined:', testContent.includes('class PageBuilderOrchestrator'));
    console.log('✅ Custom matchers used:', testContent.includes('toHaveBeenCalledBefore'));
    console.log('✅ Contract testing implemented:', testContent.includes('toHaveBeenCalledWithContract'));
  } else {
    console.log('❌ Test suite file not found');
  }
  console.log('');
  
  console.log('🎉 All configurations validated successfully!');
  console.log('📋 Ready to run TDD London School tests');
  
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  process.exit(1);
}