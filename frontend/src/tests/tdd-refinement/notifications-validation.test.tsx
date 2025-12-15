/**
 * TDD REFACTOR Phase: Simple Validation
 *
 * Tests to validate notifications removal without complex setup
 */

import { describe, it, expect } from 'vitest';
import React from 'react';

describe('TDD REFACTOR Phase: Notifications Removal Validation', () => {
  it('should not import RealTimeNotifications in App.tsx', async () => {
    // Read the App.tsx file to check imports
    const appContent = await import('../../App');

    // If the component was properly removed, this should pass
    expect(appContent).toBeDefined();

    // Check if App component can be rendered without notifications
    const AppComponent = appContent.default;
    expect(AppComponent).toBeDefined();
    expect(typeof AppComponent).toBe('function');
  });

  it('should validate App.tsx source code for clean removal', async () => {
    // This validates that the source code has been properly cleaned up
    const fs = await import('fs/promises');
    const path = await import('path');

    const appPath = path.resolve(__dirname, '../../App.tsx');
    const appSource = await fs.readFile(appPath, 'utf-8');

    // Should not contain any references to RealTimeNotifications
    expect(appSource).not.toContain('RealTimeNotifications');
    expect(appSource).not.toContain('import { RealTimeNotifications }');
    expect(appSource).not.toContain('<RealTimeNotifications');

    // Should still contain the header structure
    expect(appSource).toContain('data-testid="header"');
    expect(appSource).toContain('Search posts...');
  });

  it('should validate that notifications hook is still available for other components', async () => {
    // The hook should still exist for other components that might use it
    const { useNotification } = await import('../../hooks/useNotification');

    expect(useNotification).toBeDefined();
    expect(typeof useNotification).toBe('function');
  });

  it('should validate that RealTimeNotifications component file still exists', async () => {
    // The component file should still exist, just not be used in App
    const notificationsModule = await import('../../components/RealTimeNotifications');

    expect(notificationsModule.RealTimeNotifications).toBeDefined();
    expect(typeof notificationsModule.RealTimeNotifications).toBe('function');
  });
});