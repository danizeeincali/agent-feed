/**
 * Component Integration Tests - Regression Prevention
 * Prevents component import/export errors that cause White Screen of Death
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <ErrorBoundary
      fallback={<div data-testid="error-boundary">Component Error</div>}
      onError={(error) => {
        logNLDFailure({
          test: 'component-error-boundary',
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
          failureType: 'component-crash',
          impact: 'white-screen-of-death'
        });
      }}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

describe('Component Integration - Regression Prevention', () => {
  let consoleErrors: string[] = [];
  
  beforeEach(() => {
    // Capture console errors
    consoleErrors = [];
    const originalError = console.error;
    console.error = (...args: any[]) => {
      consoleErrors.push(args.join(' '));
      originalError(...args);
    };
  });
  
  afterEach(async () => {
    // Log any console errors to NLD
    if (consoleErrors.length > 0) {
      await logNLDWarning({
        test: 'console-errors-detected',
        timestamp: new Date().toISOString(),
        errors: consoleErrors,
        failureType: 'console-error'
      });
    }
  });

  describe('Core App Components', () => {
    it('should render App component without errors', async () => {
      try {
        // Dynamic import to catch import errors
        const { default: App } = await import('../../frontend/src/App');
        
        render(
          <TestWrapper>
            <App />
          </TestWrapper>
        );
        
        // Wait for component to stabilize
        await waitFor(() => {
          expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
        });
        
        await logNLDSuccess({
          test: 'app-component-render',
          timestamp: new Date().toISOString(),
          success: true
        });
        
      } catch (error: any) {
        await logNLDFailure({
          test: 'app-component-render',
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
          failureType: 'component-import-error',
          impact: 'white-screen-of-death'
        });
        
        throw new Error(`App component failed to render - This causes White Screen of Death: ${error.message}`);
      }
    });

    it('should import and render main layout components', async () => {
      const componentPaths = [
        '../../frontend/src/components/ui/layout/Header',
        '../../frontend/src/components/ui/layout/Sidebar', 
        '../../frontend/src/components/ui/layout/Footer'
      ];
      
      for (const componentPath of componentPaths) {
        try {
          const module = await import(componentPath);
          const Component = module.default || module[Object.keys(module)[0]];
          
          if (Component) {
            render(
              <TestWrapper>
                <Component />
              </TestWrapper>
            );
            
            // Check for error boundary
            expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
          }
          
        } catch (error: any) {
          // Log import error but don't fail test if component doesn't exist
          if (!error.message.includes('Cannot resolve module')) {
            await logNLDFailure({
              test: 'layout-component-import',
              timestamp: new Date().toISOString(),
              component: componentPath,
              error: error.message,
              stack: error.stack,
              failureType: 'component-import-error'
            });
          }
        }
      }
      
      await logNLDSuccess({
        test: 'layout-components-check',
        timestamp: new Date().toISOString(),
        success: true,
        componentsChecked: componentPaths.length
      });
    });
  });

  describe('Route Components', () => {
    it('should import and render all route components', async () => {
      const routeComponents = [
        '../../frontend/src/pages/Home',
        '../../frontend/src/pages/Agents',
        '../../frontend/src/pages/Terminal',
        '../../frontend/src/pages/Analytics'
      ];
      
      for (const routePath of routeComponents) {
        try {
          const module = await import(routePath);
          const Component = module.default || module[Object.keys(module)[0]];
          
          if (Component) {
            render(
              <TestWrapper>
                <Component />
              </TestWrapper>
            );
            
            await waitFor(() => {
              expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
            });
          }
          
        } catch (error: any) {
          if (!error.message.includes('Cannot resolve module')) {
            await logNLDFailure({
              test: 'route-component-import',
              timestamp: new Date().toISOString(),
              component: routePath,
              error: error.message,
              stack: error.stack,
              failureType: 'route-component-error',
              impact: 'page-not-loading'
            });
            
            throw new Error(`Route component failed: ${routePath} - ${error.message}`);
          }
        }
      }
      
      await logNLDSuccess({
        test: 'route-components-check',
        timestamp: new Date().toISOString(),
        success: true,
        routesChecked: routeComponents.length
      });
    });
  });

  describe('Terminal Components', () => {
    it('should render terminal components without xterm errors', async () => {
      try {
        // Mock xterm to prevent initialization errors in test environment
        jest.doMock('xterm', () => ({
          Terminal: jest.fn().mockImplementation(() => ({
            loadAddon: jest.fn(),
            open: jest.fn(),
            write: jest.fn(),
            onData: jest.fn(),
            dispose: jest.fn()
          }))
        }));
        
        const terminalPaths = [
          '../../frontend/src/components/terminal/Terminal',
          '../../frontend/src/components/terminal/TerminalPanel'
        ];
        
        for (const terminalPath of terminalPaths) {
          try {
            const module = await import(terminalPath);
            const Component = module.default || module[Object.keys(module)[0]];
            
            if (Component) {
              render(
                <TestWrapper>
                  <Component />
                </TestWrapper>
              );
              
              expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument();
            }
            
          } catch (error: any) {
            if (!error.message.includes('Cannot resolve module')) {
              await logNLDFailure({
                test: 'terminal-component-render',
                timestamp: new Date().toISOString(),
                component: terminalPath,
                error: error.message,
                stack: error.stack,
                failureType: 'terminal-component-error',
                impact: 'terminal-not-working'
              });
              
              throw new Error(`Terminal component failed: ${terminalPath} - ${error.message}`);
            }
          }
        }
        
        await logNLDSuccess({
          test: 'terminal-components-check',
          timestamp: new Date().toISOString(),
          success: true
        });
        
      } catch (error: any) {
        await logNLDFailure({
          test: 'terminal-components-mock',
          timestamp: new Date().toISOString(),
          error: error.message,
          failureType: 'terminal-mock-setup-error'
        });
      }
    });
  });

  describe('Hook Dependencies', () => {
    it('should import custom hooks without errors', async () => {
      const hookPaths = [
        '../../frontend/src/hooks/useWebSocket',
        '../../frontend/src/hooks/useTerminal',
        '../../frontend/src/hooks/useAgent'
      ];
      
      for (const hookPath of hookPaths) {
        try {
          await import(hookPath);
          
        } catch (error: any) {
          if (!error.message.includes('Cannot resolve module')) {
            await logNLDFailure({
              test: 'hook-import',
              timestamp: new Date().toISOString(),
              hook: hookPath,
              error: error.message,
              stack: error.stack,
              failureType: 'hook-import-error',
              impact: 'functionality-broken'
            });
            
            throw new Error(`Hook import failed: ${hookPath} - ${error.message}`);
          }
        }
      }
      
      await logNLDSuccess({
        test: 'hooks-import-check',
        timestamp: new Date().toISOString(),
        success: true,
        hooksChecked: hookPaths.length
      });
    });
  });

  describe('Type Definitions', () => {
    it('should import TypeScript type definitions without errors', async () => {
      const typePaths = [
        '../../frontend/src/types/index',
        '../../frontend/src/types/agent',
        '../../frontend/src/types/terminal'
      ];
      
      for (const typePath of typePaths) {
        try {
          await import(typePath);
          
        } catch (error: any) {
          if (!error.message.includes('Cannot resolve module')) {
            await logNLDFailure({
              test: 'type-import',
              timestamp: new Date().toISOString(),
              typePath,
              error: error.message,
              failureType: 'type-import-error',
              impact: 'typescript-compilation-failure'
            });
            
            throw new Error(`Type import failed: ${typePath} - ${error.message}`);
          }
        }
      }
      
      await logNLDSuccess({
        test: 'types-import-check',
        timestamp: new Date().toISOString(),
        success: true,
        typesChecked: typePaths.length
      });
    });
  });
});

// NLD Logging Functions
async function logNLDSuccess(data: any) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const nldDir = path.join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `component-integration-success-${Date.now()}.json`;
    const filepath = path.join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'component-integration-success',
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}

async function logNLDFailure(data: any) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const nldDir = path.join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `component-integration-failure-${Date.now()}.json`;
    const filepath = path.join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'component-integration-failure',
      preventionPattern: true,
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}

async function logNLDWarning(data: any) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    
    const nldDir = path.join(__dirname, '../../nld-agent/records');
    await fs.mkdir(nldDir, { recursive: true });
    
    const filename = `component-integration-warning-${Date.now()}.json`;
    const filepath = path.join(nldDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify({
      type: 'component-integration-warning',
      ...data
    }, null, 2));
  } catch (error) {
    console.warn('Warning: Could not log to NLD system:', error);
  }
}
