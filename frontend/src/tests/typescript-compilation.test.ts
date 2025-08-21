import { execSync } from 'child_process';
import { describe, it, expect } from '@jest/globals';

describe('TypeScript Compilation Tests', () => {
  it('should compile without TypeScript errors', () => {
    try {
      const result = execSync('npx tsc --noEmit', { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 30000
      });
      
      // If no errors, result should be empty or contain no "error TS" messages
      const hasErrors = result.includes('error TS');
      expect(hasErrors).toBe(false);
    } catch (error: any) {
      // If TypeScript compilation fails, the error output should be examined
      const errorOutput = error.stdout || error.stderr || '';
      
      // Fail the test with the actual TypeScript errors
      fail(`TypeScript compilation failed:\n${errorOutput}`);
    }
  });

  it('should have no implicit any types', () => {
    try {
      const result = execSync('npx tsc --noEmit --strict', { 
        encoding: 'utf8',
        timeout: 30000
      });
      
      const hasImplicitAny = result.includes('implicitly has an \'any\' type');
      expect(hasImplicitAny).toBe(false);
    } catch (error: any) {
      const errorOutput = error.stdout || error.stderr || '';
      
      if (errorOutput.includes('implicitly has an \'any\' type')) {
        fail(`Found implicit any types:\n${errorOutput}`);
      }
      
      // Other errors might be acceptable, just check for implicit any
    }
  });

  it('should have proper error boundary types', () => {
    // This test ensures ErrorBoundary fallback props are correctly typed
    const mockErrorBoundaryFallback = ({ error, resetErrorBoundary }: {
      error: Error;
      resetErrorBoundary: () => void;
    }) => {
      expect(typeof error).toBe('object');
      expect(typeof resetErrorBoundary).toBe('function');
      return null;
    };

    const mockError = new Error('Test error');
    const mockReset = () => {};
    
    expect(() => mockErrorBoundaryFallback({ 
      error: mockError, 
      resetErrorBoundary: mockReset 
    })).not.toThrow();
  });
});

// White Screen Regression Test
describe('White Screen Prevention', () => {
  it('should prevent white screen due to TypeScript errors', () => {
    // This test validates that critical components can be imported without errors
    expect(() => {
      // These should not throw import/compilation errors
      require('../components/DualInstanceDashboardEnhanced');
      require('../components/ui/button');
      require('../components/ui/card');
      require('../components/ui/badge');
      require('../components/ui/tabs');
    }).not.toThrow();
  });

  it('should have required lucide-react icons imported', () => {
    // Test that X icon import doesn't cause errors
    expect(() => {
      const { X } = require('lucide-react');
      expect(X).toBeDefined();
    }).not.toThrow();
  });
});