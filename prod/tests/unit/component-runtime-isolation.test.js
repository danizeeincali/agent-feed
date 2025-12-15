/**
 * TDD London School - Component Runtime Isolation Test
 * Test each component individually to find which one is causing the white screen
 */

describe('Component Runtime Isolation', () => {
  test('should test ErrorBoundary dependency chain', async () => {
    console.log('=== ERRORBOUNDARY DEPENDENCY CHAIN TEST ===');
    
    const fs = require('fs');
    
    // Check ErrorBoundary's dependencies
    const errorBoundaryPath = '/workspaces/agent-feed/frontend/src/components/ErrorBoundary.tsx';
    const content = fs.readFileSync(errorBoundaryPath, 'utf-8');
    
    // Extract all imports from ErrorBoundary
    const imports = content.match(/import\s+.*?\s+from\s+['"']([^'"]+)['"]/g) || [];
    
    console.log('ErrorBoundary imports:');
    imports.forEach(imp => console.log('  ', imp));
    
    // Check for @/ imports in ErrorBoundary (these might be problematic)
    const localImports = imports.filter(imp => imp.includes('@/'));
    
    if (localImports.length > 0) {
      console.log('\n🚨 FOUND LOCAL @/ IMPORTS IN ERRORBOUNDARY:');
      localImports.forEach(imp => {
        console.log('  ', imp);
        
        // Extract the path
        const pathMatch = imp.match(/from\s+['"'](@\/[^'"]+)['"]/);
        if (pathMatch) {
          const importPath = pathMatch[1].replace('@/', '');
          const fullPath = `/workspaces/agent-feed/frontend/src/${importPath}`;
          
          // Check different extensions
          const extensions = ['.ts', '.tsx', '.js', '.jsx'];
          let found = false;
          
          for (const ext of extensions) {
            if (fs.existsSync(fullPath + ext)) {
              console.log('    ✅', fullPath + ext, 'exists');
              found = true;
              break;
            }
          }
          
          if (!found) {
            console.log('    ❌', 'NOT FOUND - THIS IS THE PROBLEM!');
            expect(true).toBe(false); // Fail the test with context
          }
        }
      });
    } else {
      console.log('✅ No problematic @/ imports in ErrorBoundary');
    }
  });

  test('should check the specific @/utils/errorHandling import', () => {
    console.log('\n=== ERRORHANDLING UTILITY TEST ===');
    
    const fs = require('fs');
    const errorHandlingPath = '/workspaces/agent-feed/frontend/src/utils/errorHandling.ts';
    
    if (!fs.existsSync(errorHandlingPath)) {
      console.log('❌ CRITICAL: errorHandling.ts is missing!');
      expect(false).toBe(true);
      return;
    }
    
    console.log('✅ errorHandling.ts exists');
    
    // Check what it exports
    const content = fs.readFileSync(errorHandlingPath, 'utf-8');
    
    // Look for the exports that ErrorBoundary is trying to import
    const requiredExports = [
      'errorHandler',
      'captureComponentError', 
      'ErrorDetails',
      'createErrorBoundaryConfig',
      'logErrorBoundaryRender'
    ];
    
    console.log('\\nChecking required exports:');
    requiredExports.forEach(exportName => {
      if (content.includes(`export const ${exportName}`) || 
          content.includes(`export function ${exportName}`) ||
          content.includes(`export class ${exportName}`) ||
          content.includes(`export interface ${exportName}`) ||
          content.includes(`export type ${exportName}`)) {
        console.log('✅', exportName);
      } else {
        console.log('❌', exportName, '-> MISSING EXPORT');
      }
    });
    
    // Check for any syntax errors in the file
    try {
      // Try to detect obvious syntax issues
      if (content.includes('export {') && !content.includes('export { ')) {
        console.log('⚠️  Potential export syntax issue detected');
      }
      
      console.log('✅ No obvious syntax errors detected');
    } catch (error) {
      console.log('❌ Syntax error detected:', error.message);
    }
  });

  test('should create minimal component test', () => {
    console.log('\\n=== MINIMAL COMPONENT TEST ===');
    
    // London School: Mock all external dependencies and test the minimal flow
    const mockReact = {
      createElement: jest.fn(),
      Component: class MockComponent { 
        render() { return 'mock'; }
      },
      useState: jest.fn(() => [false, jest.fn()]),
      useEffect: jest.fn(),
      memo: jest.fn(comp => comp)
    };
    
    // Mock the problematic imports one by one
    const mocks = {
      'react-error-boundary': { ErrorBoundary: jest.fn() },
      'lucide-react': { AlertTriangle: jest.fn(), RefreshCw: jest.fn() },
      '@/utils/errorHandling': {
        errorHandler: { exportErrorLog: jest.fn() },
        captureComponentError: jest.fn(),
        createErrorBoundaryConfig: jest.fn(),
        logErrorBoundaryRender: jest.fn()
      }
    };
    
    console.log('Testing mock creation:');
    Object.keys(mocks).forEach(mockName => {
      try {
        const mock = mocks[mockName];
        expect(mock).toBeDefined();
        console.log('✅', mockName, '-> mocked successfully');
      } catch (error) {
        console.log('❌', mockName, '-> mock failed:', error.message);
      }
    });
    
    // Test if we can create a minimal ErrorBoundary-like component
    try {
      const MinimalErrorBoundary = function({ children }) {
        return children;
      };
      
      const result = MinimalErrorBoundary({ children: 'test' });
      expect(result).toBe('test');
      console.log('✅ Minimal ErrorBoundary works');
    } catch (error) {
      console.log('❌ Minimal ErrorBoundary failed:', error.message);
    }
  });

  test('should test vite configuration issues', () => {
    console.log('\\n=== VITE CONFIGURATION TEST ===');
    
    const fs = require('fs');
    const path = require('path');
    
    // Check if vite.config exists
    const viteConfigPath = path.join('/workspaces/agent-feed/frontend', 'vite.config.ts');
    const viteConfigJsPath = path.join('/workspaces/agent-feed/frontend', 'vite.config.js');
    
    let viteConfig = null;
    let configPath = null;
    
    if (fs.existsSync(viteConfigPath)) {
      viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
      configPath = viteConfigPath;
    } else if (fs.existsSync(viteConfigJsPath)) {
      viteConfig = fs.readFileSync(viteConfigJsPath, 'utf-8');  
      configPath = viteConfigJsPath;
    }
    
    if (viteConfig) {
      console.log('✅ Vite config found at:', configPath);
      
      // Check for alias configuration
      if (viteConfig.includes('resolve') && viteConfig.includes('alias')) {
        console.log('✅ Alias configuration found');
      } else {
        console.log('❌ No alias configuration - @/ imports might fail');
      }
      
      // Check for @/ alias specifically
      if (viteConfig.includes('@')) {
        console.log('✅ @ alias configured');
      } else {
        console.log('❌ @ alias not configured - THIS IS LIKELY THE ISSUE');
      }
    } else {
      console.log('❌ No vite.config found - using defaults');
    }
  });
});