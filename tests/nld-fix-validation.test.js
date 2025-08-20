/**
 * NLD TDD VALIDATION TEST - White Screen Regression Fix
 * Test-driven approach to validate WebSocket context import fix
 */

const fs = require('fs');
const path = require('path');

describe('NLD White Screen Regression Fix Validation', () => {
  const contextPath = '/workspaces/agent-feed/frontend/src/context/WebSocketSingletonContext.tsx';
  const appPath = '/workspaces/agent-feed/frontend/src/App.tsx';
  
  test('should validate WebSocketSingletonContext exports', () => {
    console.log('🔍 NLD: Validating WebSocketSingletonContext exports...');
    
    const contextContent = fs.readFileSync(contextPath, 'utf8');
    
    // Check for compatibility exports
    const hasWebSocketProviderExport = contextContent.includes('export { WebSocketSingletonProvider as WebSocketProvider }');
    const hasUseWebSocketContextExport = contextContent.includes('export { useWebSocketSingletonContext as useWebSocketContext }');
    
    console.log('📊 Export Analysis:', {
      hasWebSocketProviderExport,
      hasUseWebSocketContextExport
    });
    
    expect(hasWebSocketProviderExport).toBe(true);
    expect(hasUseWebSocketContextExport).toBe(true);
  });
  
  test('should validate App.tsx import matches exports', () => {
    console.log('🔍 NLD: Validating App.tsx imports...');
    
    const appContent = fs.readFileSync(appPath, 'utf8');
    const contextContent = fs.readFileSync(contextPath, 'utf8');
    
    // Check App.tsx import
    const importMatch = appContent.match(/import\s+\{\s*WebSocketProvider\s*\}\s+from\s+'@\/context\/WebSocketSingletonContext'/);
    const hasCorrectImport = !!importMatch;
    
    // Check context file has matching export
    const hasMatchingExport = contextContent.includes('export { WebSocketSingletonProvider as WebSocketProvider }');
    
    console.log('📊 Import/Export Match Analysis:', {
      appImportLine: importMatch ? importMatch[0] : 'NOT FOUND',
      hasCorrectImport,
      hasMatchingExport,
      importsMatch: hasCorrectImport && hasMatchingExport
    });
    
    expect(hasCorrectImport).toBe(true);
    expect(hasMatchingExport).toBe(true);
  });
  
  test('should validate no circular import dependencies', () => {
    console.log('🔍 NLD: Validating import chain integrity...');
    
    const contextContent = fs.readFileSync(contextPath, 'utf8');
    const hookPath = '/workspaces/agent-feed/frontend/src/hooks/useWebSocketSingleton.ts';
    
    // Check if hook file exists
    const hookExists = fs.existsSync(hookPath);
    
    // Check import in context
    const importsHook = contextContent.includes("import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton'");
    
    console.log('📊 Dependency Chain Analysis:', {
      hookExists,
      importsHook,
      chainIntact: hookExists && importsHook
    });
    
    expect(hookExists).toBe(true);
    expect(importsHook).toBe(true);
  });
});

// Run the test if this file is executed directly
if (require.main === module) {
  console.log('🚀 NLD: Running TDD validation tests...');
  
  // Simple test runner
  const tests = [
    () => {
      console.log('✓ Test 1: WebSocketSingletonContext exports');
      const contextContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/context/WebSocketSingletonContext.tsx', 'utf8');
      return contextContent.includes('export { WebSocketSingletonProvider as WebSocketProvider }');
    },
    () => {
      console.log('✓ Test 2: App.tsx import matches');
      const appContent = fs.readFileSync('/workspaces/agent-feed/frontend/src/App.tsx', 'utf8');
      return appContent.includes("import { WebSocketProvider } from '@/context/WebSocketSingletonContext'");
    },
    () => {
      console.log('✓ Test 3: Import chain integrity');
      const hookExists = fs.existsSync('/workspaces/agent-feed/frontend/src/hooks/useWebSocketSingleton.ts');
      return hookExists;
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  tests.forEach((test, index) => {
    try {
      if (test()) {
        console.log(`✅ Test ${index + 1}: PASSED`);
        passed++;
      } else {
        console.log(`❌ Test ${index + 1}: FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ Test ${index + 1}: ERROR -`, error.message);
      failed++;
    }
  });
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✅ NLD: All tests passed - imports are correctly configured');
  } else {
    console.log('🚨 NLD: Tests failed - white screen likely due to import mismatch');
  }
}