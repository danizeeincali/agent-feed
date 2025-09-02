/**
 * Global Setup for London School TDD Tests
 * 
 * Initializes the test environment for behavior-driven testing
 */

export default async function globalSetup() {
  console.log('🏗️  Setting up London School TDD environment...');
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.REACT_APP_API_URL = 'http://localhost:3000';
  
  // Initialize global mock tracking
  (global as any).mockCallHistory = [];
  (global as any).interactionTracker = {
    interactions: [],
    clear: () => { (global as any).interactionTracker.interactions = []; },
    track: (mockName: string, args: any[]) => {
      (global as any).interactionTracker.interactions.push({
        mockName,
        args,
        timestamp: Date.now()
      });
    }
  };
  
  console.log('✅ London School TDD environment ready');
}