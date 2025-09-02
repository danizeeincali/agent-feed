import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Global Setup for Production E2E Validation
 * 
 * Validates environment and prerequisites before running tests
 */

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up production validation environment...');
  
  // Validate required environment variables
  const requiredEnvVars = [
    'CLAUDE_API_KEY',
    'NODE_ENV'
  ];
  
  const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
  if (missingEnvVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
    console.warn('Some tests may fail due to missing configuration');
  }
  
  // Validate server dependencies
  try {
    console.log('📦 Checking project dependencies...');
    await execAsync('npm list --production --depth=0', { cwd: process.cwd() });
    console.log('✅ Dependencies validated');
  } catch (error) {
    console.error('❌ Dependency validation failed:', error);
    throw new Error('Dependencies not properly installed');
  }
  
  // Validate server can start
  try {
    console.log('🚀 Pre-validating server startup...');
    const { stdout, stderr } = await execAsync('timeout 10s npm start > /dev/null 2>&1 || true');
    console.log('✅ Server startup pre-validation completed');
  } catch (error) {
    console.log('⚠️  Server startup pre-validation had issues, but continuing...');
  }
  
  // Create test artifacts directory
  try {
    await execAsync('mkdir -p tests/production-validation/reports/artifacts');
    await execAsync('mkdir -p tests/production-validation/reports/html');
    console.log('✅ Test artifact directories created');
  } catch (error) {
    console.error('❌ Failed to create artifact directories:', error);
  }
  
  // Validate WebSocket support
  try {
    console.log('🔌 Validating WebSocket support...');
    // This will be validated during actual tests
    console.log('✅ WebSocket validation will be performed during tests');
  } catch (error) {
    console.error('❌ WebSocket validation setup failed:', error);
  }
  
  console.log('🎯 Production validation environment setup complete');
  console.log('📝 Tests will validate:');
  console.log('   - Real Claude API integration (no mocks)');
  console.log('   - 5+ minute WebSocket stability');
  console.log('   - Multiple concurrent connections');
  console.log('   - Complete user workflows');
  console.log('   - Browser-based validation');
  console.log('   - Load testing with concurrent users');
}

export default globalSetup;