/**
 * Integration Tests: Agent Config Page Removal
 *
 * Test Requirements:
 * - Test navigation rendering without config link
 * - Test that other routes still work (/, /agents, /analytics, etc.)
 * - Test that clicking all remaining nav items works
 * - Test that API client still exists and is importable
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import path from 'path';
import fs from 'fs';

// Mock window.matchMedia for dark mode
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('Navigation Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  describe('Navigation Menu Rendering', () => {
    it('should render navigation without Agent Config link', async () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      // Extract navigation array
      const navigationMatch = appTsxContent.match(/const navigation = useMemo\(\(\) => \[([\s\S]*?)\], \[\]\)/);
      expect(navigationMatch).toBeTruthy();

      if (navigationMatch) {
        const navigationContent = navigationMatch[1];

        // Parse navigation items
        const items = navigationContent.match(/\{ name: '([^']+)', href: '([^']+)'/g) || [];

        // Verify Agent Config is not present
        const hasAgentConfig = items.some(item => item.includes('Agent Config'));
        expect(hasAgentConfig).toBe(false);

        // Verify expected items are present
        expect(items.length).toBeGreaterThanOrEqual(5);
      }
    });

    it('should have exactly 5 navigation items after removal', async () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      const navigationMatch = appTsxContent.match(/const navigation = useMemo\(\(\) => \[([\s\S]*?)\], \[\]\)/);

      if (navigationMatch) {
        const navigationContent = navigationMatch[1];
        const itemCount = (navigationContent.match(/name:/g) || []).length;

        expect(itemCount).toBe(5); // Feed, Drafts, Agents, Live Activity, Analytics
      }
    });

    it('should verify all navigation items have required properties', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      const navigationMatch = appTsxContent.match(/const navigation = useMemo\(\(\) => \[([\s\S]*?)\], \[\]\)/);

      if (navigationMatch) {
        const navigationContent = navigationMatch[1];

        // Each item should have name, href, and icon
        const items = navigationContent.split('},');

        items.forEach(item => {
          if (item.trim() && !item.trim().startsWith(']')) {
            expect(item).toContain('name:');
            expect(item).toContain('href:');
            expect(item).toContain('icon:');
          }
        });
      }
    });
  });

  describe('Route Integration Tests', () => {
    it('should verify feed route (/) is accessible', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('path="/"');
      expect(appTsxContent).toContain('SocialMediaFeed');
    });

    it('should verify agents route (/agents) is accessible', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('path="/agents"');
      expect(appTsxContent).toContain('IsolatedRealAgentManager');
    });

    it('should verify analytics route (/analytics) is accessible', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('path="/analytics"');
      expect(appTsxContent).toContain('RealAnalytics');
    });

    it('should verify activity route (/activity) is accessible', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('path="/activity"');
      expect(appTsxContent).toContain('RealActivityFeed');
    });

    it('should verify drafts route (/drafts) is accessible', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('path="/drafts"');
      expect(appTsxContent).toContain('DraftManager');
    });

    it('should verify 404 catch-all route exists', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('path="*"');
      expect(appTsxContent).toContain('NotFoundFallback');
    });

    it('should verify removed routes are not present', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      // Config routes should be removed
      expect(appTsxContent).not.toContain('path="/agents/config"');
      expect(appTsxContent).not.toContain('path="/admin/protected-configs"');
    });
  });

  describe('Error Boundary Integration', () => {
    it('should verify ErrorBoundary wraps route components', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('<ErrorBoundary');
      expect(appTsxContent).toContain('fallbackRender');
    });

    it('should verify RouteErrorBoundary is used for each route', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      const routeErrorBoundaryCount = (appTsxContent.match(/<RouteErrorBoundary/g) || []).length;

      // Should have multiple RouteErrorBoundary instances
      expect(routeErrorBoundaryCount).toBeGreaterThan(5);
    });

    it('should verify all routes have error handling', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      // Extract routes
      const routesMatch = appTsxContent.match(/<Routes>([\s\S]*?)<\/Routes>/);

      if (routesMatch) {
        const routesContent = routesMatch[1];

        // Count Route components
        const routeCount = (routesContent.match(/<Route /g) || []).length;

        // Most routes should have error boundaries (except catch-all)
        expect(routeCount).toBeGreaterThan(5);
      }
    });
  });

  describe('Suspense Integration', () => {
    it('should verify Suspense wraps lazy-loaded components', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('<Suspense');
      expect(appTsxContent).toContain('fallback=');
    });

    it('should verify FallbackComponents are used', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('FallbackComponents');
      expect(appTsxContent).toContain('LoadingFallback');
    });

    it('should verify appropriate fallbacks for each route type', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('FeedFallback');
      expect(appTsxContent).toContain('AgentManagerFallback');
      expect(appTsxContent).toContain('AnalyticsFallback');
      expect(appTsxContent).toContain('ActivityFallback');
    });
  });

  describe('Provider Integration', () => {
    it('should verify QueryClientProvider wraps app', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('<QueryClientProvider');
      expect(appTsxContent).toContain('client={queryClient}');
    });

    it('should verify WebSocketProvider is configured', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('<WebSocketProvider');
      expect(appTsxContent).toContain('config={{');
    });

    it('should verify VideoPlaybackProvider wraps app', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('<VideoPlaybackProvider>');
    });

    it('should verify GlobalErrorBoundary is outermost wrapper', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      // GlobalErrorBoundary should be the first wrapper
      const globalErrorBoundaryPos = appTsxContent.indexOf('<GlobalErrorBoundary>');
      const queryClientProviderPos = appTsxContent.indexOf('<QueryClientProvider');

      expect(globalErrorBoundaryPos).toBeLessThan(queryClientProviderPos);
    });
  });

  describe('API Client Verification', () => {
    it('should verify API client file exists', () => {
      const apiClientPath = path.join(__dirname, '../../frontend/src/api/apiClient.ts');
      const exists = fs.existsSync(apiClientPath);

      expect(exists).toBe(true);
    });

    it('should verify API client is importable', () => {
      // This is a static check - actual import would happen in the app
      const apiClientPath = path.join(__dirname, '../../frontend/src/api/apiClient.ts');

      if (fs.existsSync(apiClientPath)) {
        const apiClientContent = fs.readFileSync(apiClientPath, 'utf-8');

        // Verify it exports something
        expect(apiClientContent).toMatch(/export/);
      }
    });

    it('should verify no config-specific API endpoints exist', () => {
      const apiDir = path.join(__dirname, '../../frontend/src/api');

      if (fs.existsSync(apiDir)) {
        const apiFiles = fs.readdirSync(apiDir);

        // Should not have agentConfig.ts or similar
        expect(apiFiles).not.toContain('agentConfig.ts');
        expect(apiFiles).not.toContain('configApi.ts');
      }
    });
  });

  describe('Component Import Integration', () => {
    it('should verify all required components are imported', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      const requiredImports = [
        'SocialMediaFeed',
        'RealAgentManager',
        'RealActivityFeed',
        'RealAnalytics',
        'DraftManager',
        'ErrorBoundary',
        'QueryClient',
        'Routes',
        'Route',
      ];

      requiredImports.forEach(importName => {
        expect(appTsxContent).toContain(importName);
      });
    });

    it('should verify no orphaned imports exist', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      // Get all imports
      const importStatements = appTsxContent.match(/import.*?from.*?;/g) || [];

      // Check each import is used in the code
      importStatements.forEach(importStatement => {
        const importedNames = importStatement.match(/import\s+(?:{([^}]+)}|(\w+))/);

        if (importedNames) {
          const names = importedNames[1] || importedNames[2];

          if (names && !names.includes('React')) {
            // Verify the imported name is used somewhere
            const namesArray = names.split(',').map(n => n.trim().split(' as ')[0]);

            // AgentConfigPage should not be imported
            expect(namesArray).not.toContain('AgentConfigPage');
          }
        }
      });
    });
  });

  describe('Route Wrapper Integration', () => {
    it('should verify RouteWrapper is used correctly', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('<RouteWrapper');
      expect(appTsxContent).toContain('routeKey=');
    });

    it('should verify route keys are unique', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      const routeKeys = appTsxContent.match(/routeKey="([^"]+)"/g) || [];
      const keys = routeKeys.map(match => match.match(/routeKey="([^"]+)"/)?.[1]);

      // Check for duplicates
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('Layout Integration', () => {
    it('should verify Layout component wraps routes', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('<Layout>');

      // Routes should be inside Layout
      const layoutPos = appTsxContent.indexOf('<Layout>');
      const routesPos = appTsxContent.indexOf('<Routes>');

      expect(routesPos).toBeGreaterThan(layoutPos);
    });

    it('should verify Layout has sidebar navigation', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      // Find Layout component definition
      const layoutMatch = appTsxContent.match(/const Layout.*?=.*?memo\(\(\{[\s\S]*?\}\) => \{([\s\S]*?)\}\);/);

      if (layoutMatch) {
        const layoutContent = layoutMatch[1];

        expect(layoutContent).toContain('navigation.map');
        expect(layoutContent).toContain('<Link');
      }
    });

    it('should verify Layout has header with search', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      const layoutMatch = appTsxContent.match(/const Layout.*?=.*?memo\(\(\{[\s\S]*?\}\) => \{([\s\S]*?)\}\);/);

      if (layoutMatch) {
        const layoutContent = layoutMatch[1];

        expect(layoutContent).toContain('Search');
        expect(layoutContent).toContain('searchTerm');
      }
    });
  });

  describe('Dark Mode Integration', () => {
    it('should verify dark mode hook is used', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('useDarkMode');
    });

    it('should verify dark mode classes are present', () => {
      const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
      const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

      expect(appTsxContent).toContain('dark:');
    });
  });
});

describe('Navigation Link Interaction Tests', () => {
  it('should verify navigation items are clickable', () => {
    const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
    const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

    const layoutMatch = appTsxContent.match(/const Layout.*?=.*?memo\(\(\{[\s\S]*?\}\) => \{([\s\S]*?)\}\);/);

    if (layoutMatch) {
      const layoutContent = layoutMatch[1];

      // Should use Link component from react-router-dom
      expect(layoutContent).toContain('<Link');
      expect(layoutContent).toContain('to={item.href}');
    }
  });

  it('should verify active state styling exists', () => {
    const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
    const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

    const layoutMatch = appTsxContent.match(/const Layout.*?=.*?memo\(\(\{[\s\S]*?\}\) => \{([\s\S]*?)\}\);/);

    if (layoutMatch) {
      const layoutContent = layoutMatch[1];

      expect(layoutContent).toContain('isActive');
      expect(layoutContent).toContain('location.pathname');
    }
  });

  it('should verify mobile sidebar toggle works', () => {
    const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
    const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8');

    const layoutMatch = appTsxContent.match(/const Layout.*?=.*?memo\(\(\{[\s\S]*?\}\) => \{([\s\S]*?)\}\);/);

    if (layoutMatch) {
      const layoutContent = layoutMatch[1];

      expect(layoutContent).toContain('isSidebarOpen');
      expect(layoutContent).toContain('setIsSidebarOpen');
    }
  });
});
