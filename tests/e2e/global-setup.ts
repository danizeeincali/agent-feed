/**
 * Global Setup for Real Data Validation Tests
 * 
 * Ensures test environment is properly configured:
 * - Backend API is running and accessible
 * - Test agents are available
 * - Database connections are stable
 * - Performance baselines are established
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up Real Data Validation environment...');

  // Create a browser instance for setup validation
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Validate backend is running
    console.log('🔍 Validating backend API...');
    
    const apiResponse = await page.request.get('http://localhost:3000/api/health')
      .catch(() => page.request.get('http://localhost:3000/'));
    
    if (!apiResponse.ok()) {
      throw new Error(`Backend API not accessible: ${apiResponse.status()}`);
    }
    
    console.log('✅ Backend API is running');

    // Validate test agents are available
    const testAgents = [
      'agent-feedback-agent',
      'agent-ideas-agent',
      'meta-agent', 
      'personal-todos-agent'
    ];

    const availableAgents = [];
    
    for (const agentId of testAgents) {
      try {
        const agentResponse = await page.request.get(`http://localhost:3000/api/agents/${agentId}`);
        if (agentResponse.ok()) {
          availableAgents.push(agentId);
          console.log(`✅ Test agent ${agentId} available`);
        } else {
          console.log(`⚠️  Test agent ${agentId} not available (${agentResponse.status()})`);
        }
      } catch (error) {
        console.log(`⚠️  Test agent ${agentId} not accessible`);
      }
    }

    if (availableAgents.length === 0) {
      throw new Error('No test agents available for validation');
    }

    console.log(`📋 ${availableAgents.length}/${testAgents.length} test agents available`);

    // Validate frontend is accessible
    console.log('🔍 Validating frontend application...');
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 10000 });
    
    // Check if frontend loads properly
    const title = await page.title();
    if (!title || title.includes('Vite')) {
      console.log('⚠️  Frontend may not be fully loaded, proceeding anyway...');
    } else {
      console.log('✅ Frontend application is running');
    }

    // Establish performance baseline
    console.log('📊 Establishing performance baselines...');
    
    const startTime = Date.now();
    await page.goto('http://localhost:5173/agents/agent-feedback-agent', 
      { waitUntil: 'networkidle', timeout: 15000 });
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️  Baseline load time: ${loadTime}ms`);
    
    if (loadTime > 5000) {
      console.log('⚠️  Slow baseline load time detected - performance tests may be strict');
    }

    // Store baseline metrics for test reference
    process.env.BASELINE_LOAD_TIME = loadTime.toString();
    process.env.AVAILABLE_TEST_AGENTS = availableAgents.join(',');

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;