import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for TDD London School Testing
 * 
 * PURPOSE: Prepare test environment and verify system state
 * APPROACH: Ensure clean state for mock-driven testing
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 TDD London School: Global Test Setup');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Verify backend is accessible
    console.log('📡 Checking backend availability...');
    await page.goto('http://localhost:3000/api/health');
    await page.waitForLoadState('networkidle');
    
    const healthStatus = await page.textContent('body');
    console.log('✅ Backend health:', healthStatus?.substring(0, 100));
    
    // Verify frontend is accessible  
    console.log('🌐 Checking frontend availability...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const frontendTitle = await page.title();
    console.log('✅ Frontend loaded:', frontendTitle);
    
    // Clear any existing test data
    console.log('🧹 Clearing test environment...');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Verify Claude instances API
    console.log('🤖 Checking Claude instances API...');
    try {
      await page.goto('http://localhost:3000/api/claude/instances');
      const apiResponse = await page.textContent('body');
      console.log('✅ Claude API available:', apiResponse?.substring(0, 100));
    } catch (error) {
      console.warn('⚠️ Claude API check failed:', error);
    }
    
    // Setup test isolation
    console.log('🔒 Setting up test isolation...');
    await setupTestIsolation(page);
    
    console.log('✅ TDD London School: Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ TDD London School: Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestIsolation(page: any) {
  // Inject test isolation utilities
  await page.addInitScript(() => {
    // Test isolation namespace
    (window as any).TDDLondonSchool = {
      testId: `test-${Date.now()}`,
      mocks: new Map(),
      contracts: new Map(),
      behaviorLog: [],
      
      // Mock management
      addMock: (name: string, mock: any) => {
        (window as any).TDDLondonSchool.mocks.set(name, mock);
      },
      
      getMock: (name: string) => {
        return (window as any).TDDLondonSchool.mocks.get(name);
      },
      
      // Contract verification
      defineContract: (name: string, contract: any) => {
        (window as any).TDDLondonSchool.contracts.set(name, contract);
      },
      
      verifyContract: (name: string, implementation: any) => {
        const contract = (window as any).TDDLondonSchool.contracts.get(name);
        if (!contract) return { valid: false, error: 'Contract not found' };
        
        // Basic contract verification
        for (const key in contract) {
          if (!(key in implementation)) {
            return { valid: false, error: `Missing property: ${key}` };
          }
        }
        return { valid: true };
      },
      
      // Behavior logging
      logBehavior: (action: string, data: any) => {
        (window as any).TDDLondonSchool.behaviorLog.push({
          timestamp: Date.now(),
          action,
          data
        });
      },
      
      getBehaviorLog: () => (window as any).TDDLondonSchool.behaviorLog,
      
      clearBehaviorLog: () => {
        (window as any).TDDLondonSchool.behaviorLog = [];
      },
      
      // Test utilities
      reset: () => {
        (window as any).TDDLondonSchool.mocks.clear();
        (window as any).TDDLondonSchool.contracts.clear();
        (window as any).TDDLondonSchool.behaviorLog = [];
      }
    };
    
    console.log('🔧 TDD London School test utilities initialized');
  });
}

export default globalSetup;