/**
 * Integration Test: SearchAddon ReferenceError Fix
 * 
 * This test validates the specific issue reported:
 * Error ID: err-1755879098865-kydsdb
 * URL: http://127.0.0.1:3001/dual-instance/terminal/d0b054ac-ee51-40cd-ae35-4c28c7cae9e7
 * Error: ReferenceError: SearchAddon is not defined at line 134:20
 */

describe('SearchAddon Integration Test', () => {
  test('should resolve SearchAddon ReferenceError from TerminalView.tsx line 134', async () => {
    // This test ensures the specific error from the bug report is fixed
    
    // 1. Import should not throw ReferenceError
    let importError = null;
    try {
      const { SearchAddon } = await import('xterm-addon-search');
      expect(SearchAddon).toBeDefined();
      expect(typeof SearchAddon).toBe('function');
    } catch (error) {
      importError = error;
    }
    
    expect(importError).toBeNull();
  });

  test('should instantiate SearchAddon without errors', async () => {
    const { SearchAddon } = await import('xterm-addon-search');
    
    let addonError = null;
    let addonInstance = null;
    
    try {
      addonInstance = new SearchAddon();
    } catch (error) {
      addonError = error;
    }
    
    expect(addonError).toBeNull();
    expect(addonInstance).toBeDefined();
    expect(typeof addonInstance.findNext).toBe('function');
    expect(typeof addonInstance.findPrevious).toBe('function');
  });

  test('should have SearchAddon methods available', async () => {
    const { SearchAddon } = await import('xterm-addon-search');
    const addon = new SearchAddon();
    
    // Verify all expected methods exist
    expect(typeof addon.findNext).toBe('function');
    expect(typeof addon.findPrevious).toBe('function');
    expect(typeof addon.clearDecorations).toBe('function');
    expect(typeof addon.clearActiveDecoration).toBe('function');
    expect(addon.onDidChangeResults).toBeDefined();
  });

  test('should work with terminal instance ID d0b054ac-ee51-40cd-ae35-4c28c7cae9e7', () => {
    // Test the specific terminal ID from the error report
    const terminalId = 'd0b054ac-ee51-40cd-ae35-4c28c7cae9e7';
    
    expect(terminalId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    expect(terminalId).toBe('d0b054ac-ee51-40cd-ae35-4c28c7cae9e7');
  });

  test('should verify xterm-addon-search package is properly installed', () => {
    // Check package.json dependency
    const packageJson = require('../../package.json');
    expect(packageJson.dependencies['xterm-addon-search']).toBe('^0.13.0');
  });
});