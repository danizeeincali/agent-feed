import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...');
  
  try {
    // Create test database if it doesn't exist
    const dbName = process.env.DB_NAME || 'agent_feed_test';
    console.log(`📊 Setting up test database: ${dbName}`);
    
    // Check if database exists, create if not
    try {
      execSync(`createdb ${dbName}`, { stdio: 'pipe' });
      console.log('✅ Test database created');
    } catch (error) {
      console.log('📋 Test database already exists or creation failed');
    }
    
    // Run migrations
    console.log('🔄 Running database migrations...');
    execSync('npm run migrate', { 
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Build the project
    console.log('🔨 Building project...');
    execSync('npm run build', { stdio: 'pipe' });
    
    // Create test data directory
    const testDataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    console.log('✅ Global setup completed');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}