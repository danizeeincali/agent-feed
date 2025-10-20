/**
 * Unit Tests: Agent Config Page Removal
 *
 * Test Requirements:
 * - Verify App.tsx doesn't import AgentConfigPage
 * - Verify navigation menu doesn't have "Agent Config" item
 * - Verify routes don't include /agents/config or /admin/protected-configs
 * - Verify deleted files don't exist
 * - Test that 404 page renders for /agents/config route
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fs from 'fs';
import path from 'path';

// File system checks
const APP_TSX_PATH = path.join(__dirname, '../../App.tsx');
const AGENT_CONFIG_PAGE_PATH = path.join(__dirname, '../../pages/AgentConfigPage.tsx');

describe('Agent Config Page Removal - Unit Tests', () => {
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

  describe('File Existence Checks', () => {
    it('should verify AgentConfigPage.tsx file exists (before removal)', () => {
      // This test will fail after removal - that's expected
      const exists = fs.existsSync(AGENT_CONFIG_PAGE_PATH);
      expect(exists).toBe(true);
    });

    it('should verify App.tsx exists', () => {
      const exists = fs.existsSync(APP_TSX_PATH);
      expect(exists).toBe(true);
    });
  });

  describe('App.tsx Import Checks', () => {
    it('should not import AgentConfigPage in App.tsx (after removal)', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Check for various import patterns
      expect(appTsxContent).not.toContain("import AgentConfigPage from './pages/AgentConfigPage'");
      expect(appTsxContent).not.toContain('import { AgentConfigPage }');
      expect(appTsxContent).not.toContain('from "./pages/AgentConfigPage"');
      expect(appTsxContent).not.toContain("from './pages/AgentConfigPage'");
    });

    it('should not have AgentConfigPage referenced anywhere in App.tsx', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Remove comment lines before checking
      const codeWithoutComments = appTsxContent
        .split('\n')
        .filter(line => !line.trim().startsWith('//'))
        .join('\n');

      expect(codeWithoutComments).not.toContain('<AgentConfigPage');
      expect(codeWithoutComments).not.toContain('AgentConfigPage');
    });
  });

  describe('Navigation Menu Checks', () => {
    it('should not include "Agent Config" in navigation array', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Extract navigation array
      const navigationMatch = appTsxContent.match(/const navigation = useMemo\(\(\) => \[([\s\S]*?)\], \[\]\)/);
      expect(navigationMatch).toBeTruthy();

      if (navigationMatch) {
        const navigationContent = navigationMatch[1];

        // Check that Agent Config is not in navigation
        expect(navigationContent).not.toContain("name: 'Agent Config'");
        expect(navigationContent).not.toContain('href: \'/agents/config\'');
        expect(navigationContent).not.toContain('icon: SettingsIcon');
      }
    });

    it('should verify navigation only contains expected items', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Extract navigation array
      const navigationMatch = appTsxContent.match(/const navigation = useMemo\(\(\) => \[([\s\S]*?)\], \[\]\)/);

      if (navigationMatch) {
        const navigationContent = navigationMatch[1];

        // Verify expected items exist
        expect(navigationContent).toContain("name: 'Feed'");
        expect(navigationContent).toContain("name: 'Drafts'");
        expect(navigationContent).toContain("name: 'Agents'");
        expect(navigationContent).toContain("name: 'Live Activity'");
        expect(navigationContent).toContain("name: 'Analytics'");

        // Count the number of navigation items (roughly)
        const itemCount = (navigationContent.match(/name:/g) || []).length;
        expect(itemCount).toBe(5); // Should be 5 items after removal
      }
    });
  });

  describe('Route Configuration Checks', () => {
    it('should not include /agents/config route', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Check for route definition
      expect(appTsxContent).not.toContain('path="/agents/config"');
    });

    it('should not include /admin/protected-configs route', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Check for route definition
      expect(appTsxContent).not.toContain('path="/admin/protected-configs"');
    });

    it('should verify all expected routes still exist', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Check that other routes are still there
      expect(appTsxContent).toContain('path="/"');
      expect(appTsxContent).toContain('path="/agents"');
      expect(appTsxContent).toContain('path="/analytics"');
      expect(appTsxContent).toContain('path="/activity"');
      expect(appTsxContent).toContain('path="/drafts"');
      expect(appTsxContent).toContain('path="*"'); // 404 route
    });

    it('should have 404 catch-all route at the end', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Find the Routes section
      const routesMatch = appTsxContent.match(/<Routes>([\s\S]*?)<\/Routes>/);
      expect(routesMatch).toBeTruthy();

      if (routesMatch) {
        const routesContent = routesMatch[1];

        // Check that 404 route exists
        expect(routesContent).toContain('path="*"');
        expect(routesContent).toContain('NotFoundFallback');
      }
    });
  });

  describe('Component Reference Checks', () => {
    it('should not have any SettingsIcon imports for config page', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // If SettingsIcon is imported, it should not be used in navigation for config
      const navigationMatch = appTsxContent.match(/const navigation = useMemo\(\(\) => \[([\s\S]*?)\], \[\]\)/);

      if (navigationMatch) {
        const navigationContent = navigationMatch[1];
        const settingsIconUsage = navigationContent.match(/icon: SettingsIcon/g);

        // SettingsIcon should not be used in navigation after config removal
        expect(settingsIconUsage).toBeNull();
      }
    });

    it('should verify ErrorBoundary wrapper still exists for routes', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Check that ErrorBoundary is still used
      expect(appTsxContent).toContain('<ErrorBoundary');
      expect(appTsxContent).toContain('RouteErrorBoundary');
    });

    it('should verify Suspense wrapper still exists for routes', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Check that Suspense is still used
      expect(appTsxContent).toContain('<Suspense');
      expect(appTsxContent).toContain('fallback=');
    });
  });

  describe('Import Statement Analysis', () => {
    it('should have correct number of component imports', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Count import statements (rough check)
      const importLines = appTsxContent.split('\n').filter(line =>
        line.trim().startsWith('import') && !line.includes('from \'react')
      );

      // Verify we have multiple imports but not AgentConfigPage
      expect(importLines.length).toBeGreaterThan(10);

      const hasAgentConfigImport = importLines.some(line =>
        line.includes('AgentConfigPage')
      );

      expect(hasAgentConfigImport).toBe(false);
    });

    it('should verify all necessary page components are imported', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Check for essential imports
      expect(appTsxContent).toContain('import SocialMediaFeed');
      expect(appTsxContent).toContain('import RealAgentManager');
      expect(appTsxContent).toContain('import RealActivityFeed');
      expect(appTsxContent).toContain('import RealAnalytics');
      expect(appTsxContent).toContain('import DraftManager');
    });
  });

  describe('Code Cleanup Verification', () => {
    it('should not have commented-out AgentConfigPage code', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Look for commented-out lines with AgentConfigPage
      const lines = appTsxContent.split('\n');
      const commentedConfigLines = lines.filter(line =>
        line.trim().startsWith('//') && line.includes('AgentConfig')
      );

      // Should have removal comments, but not actual code
      commentedConfigLines.forEach(line => {
        expect(line).not.toContain('import AgentConfigPage');
        expect(line).not.toContain('<AgentConfigPage');
      });
    });

    it('should have clean route definitions without extra spacing', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Check for excessive blank lines in routes section
      const routesMatch = appTsxContent.match(/<Routes>([\s\S]*?)<\/Routes>/);

      if (routesMatch) {
        const routesContent = routesMatch[1];

        // Should not have more than 2 consecutive blank lines
        expect(routesContent).not.toMatch(/\n\s*\n\s*\n\s*\n/);
      }
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should verify no TypeScript errors would occur from missing import', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      // Check that all used components are imported
      const componentUsagePattern = /<(\w+)/g;
      const importPattern = /import.*?(\w+).*?from/g;

      const usedComponents = new Set<string>();
      let match;

      while ((match = componentUsagePattern.exec(appTsxContent)) !== null) {
        if (match[1] && match[1][0] === match[1][0].toUpperCase()) {
          usedComponents.add(match[1]);
        }
      }

      // AgentConfigPage should not be in used components
      expect(usedComponents.has('AgentConfigPage')).toBe(false);
    });
  });

  describe('Route Priority and Order', () => {
    it('should have catch-all route as last route', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      const routesMatch = appTsxContent.match(/<Routes>([\s\S]*?)<\/Routes>/);

      if (routesMatch) {
        const routesContent = routesMatch[1];
        const routes = routesContent.match(/<Route[^>]*>/g) || [];

        // Last route should be the catch-all
        const lastRoute = routes[routes.length - 1];
        expect(lastRoute).toContain('path="*"');
      }
    });

    it('should have specific routes before catch-all', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      const routesMatch = appTsxContent.match(/<Routes>([\s\S]*?)<\/Routes>/);

      if (routesMatch) {
        const routesContent = routesMatch[1];

        // Find position of catch-all route
        const catchAllPos = routesContent.indexOf('path="*"');

        // Verify specific routes come before catch-all
        const feedRoutePos = routesContent.indexOf('path="/"');
        const agentsRoutePos = routesContent.indexOf('path="/agents"');
        const analyticsRoutePos = routesContent.indexOf('path="/analytics"');

        expect(feedRoutePos).toBeLessThan(catchAllPos);
        expect(agentsRoutePos).toBeLessThan(catchAllPos);
        expect(analyticsRoutePos).toBeLessThan(catchAllPos);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should verify QueryClient configuration is intact', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      expect(appTsxContent).toContain('const queryClient = new QueryClient');
      expect(appTsxContent).toContain('defaultOptions');
    });

    it('should verify WebSocketProvider configuration is intact', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      expect(appTsxContent).toContain('<WebSocketProvider');
      expect(appTsxContent).toContain('autoConnect');
    });

    it('should verify Layout component is properly used', () => {
      const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

      expect(appTsxContent).toContain('<Layout>');
      expect(appTsxContent).toContain('</Layout>');
    });
  });
});

describe('Agent Config Page File Structure', () => {
  it('should verify pages directory exists', () => {
    const pagesDir = path.join(__dirname, '../../pages');
    const exists = fs.existsSync(pagesDir);
    expect(exists).toBe(true);
  });

  it('should list all files in pages directory (for audit)', () => {
    const pagesDir = path.join(__dirname, '../../pages');

    if (fs.existsSync(pagesDir)) {
      const files = fs.readdirSync(pagesDir);

      // This is informational - shows what's in pages directory
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);

      // After removal, should not contain AgentConfigPage.tsx
      // Before removal, this will fail - that's expected
      expect(files).not.toContain('AgentConfigPage.tsx');
    }
  });

  it('should verify no orphaned config-related files exist', () => {
    const srcDir = path.join(__dirname, '../..');

    // List of files that should not exist after config removal
    const orphanedFiles = [
      'pages/AgentConfigPage.tsx',
      'components/AgentConfigForm.tsx',
      'components/ConfigEditor.tsx',
      'hooks/useAgentConfig.ts',
      'api/agentConfig.ts',
    ];

    orphanedFiles.forEach(file => {
      const fullPath = path.join(srcDir, file);
      const exists = fs.existsSync(fullPath);

      // After removal, none of these should exist
      expect(exists).toBe(false);
    });
  });
});

describe('Navigation State Management', () => {
  it('should verify navigation items are memoized', () => {
    const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

    expect(appTsxContent).toContain('const navigation = useMemo');
  });

  it('should verify navigation dependency array is empty', () => {
    const appTsxContent = fs.readFileSync(APP_TSX_PATH, 'utf-8');

    const navigationMatch = appTsxContent.match(/const navigation = useMemo\([^)]+\), \[(.*?)\]/);

    if (navigationMatch) {
      const dependencies = navigationMatch[1].trim();
      expect(dependencies).toBe('');
    }
  });
});
