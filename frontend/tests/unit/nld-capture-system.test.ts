/**
 * NLD UI Capture System Tests
 * Tests the Neural Learning Database functionality for pattern capture and analysis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NLDUICapture, UIPattern, UIFailurePattern } from '../../src/utils/nld-ui-capture';
import { NeuralPatternEngine } from '../../src/utils/nld-neural-patterns';
import { NLDDatabaseManager } from '../../src/utils/nld-database';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(),
          put: vi.fn(),
          get: vi.fn(),
          getAll: vi.fn(() => ({ onsuccess: null, onerror: null, result: [] })),
          clear: vi.fn(),
          createIndex: vi.fn()
        }))
      })),
      objectStoreNames: {
        contains: vi.fn(() => false)
      },
      createObjectStore: vi.fn(() => ({
        createIndex: vi.fn()
      }))
    }
  }))
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'indexedDB', { value: indexedDBMock });

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    getEntriesByType: vi.fn(() => []),
    memory: {
      usedJSHeapSize: 50000000
    }
  }
});

// Mock PerformanceObserver
class MockPerformanceObserver {
  constructor(callback: any) {}
  observe() {}
  disconnect() {}
}

Object.defineProperty(window, 'PerformanceObserver', { value: MockPerformanceObserver });

describe('NLD UI Capture System', () => {
  let capture: NLDUICapture;

  beforeEach(() => {
    vi.clearAllMocks();
    capture = new NLDUICapture();
  });

  afterEach(() => {
    capture.destroy();
  });

  describe('Pattern Capture', () => {
    it('should capture button click patterns', () => {
      const patternId = capture.captureButtonClick('test-button', 'TestComponent');
      expect(patternId).toBeDefined();
      expect(patternId).toMatch(/^pattern-\d+-[a-z0-9]{6}$/);
    });

    it('should capture toggle actions with state', () => {
      const patternId = capture.captureToggleAction('test-toggle', true, 'TestComponent');
      expect(patternId).toBeDefined();
    });

    it('should capture view switch events', () => {
      const patternId = capture.captureViewSwitch('oldView', 'newView', 'TestComponent');
      expect(patternId).toBeDefined();
    });

    it('should capture API call patterns with success/failure', () => {
      const successPattern = capture.captureApiCall('/test', 'GET', true, 150);
      const failurePattern = capture.captureApiCall('/test', 'POST', false, 5000, 'Network error');
      
      expect(successPattern).toBeDefined();
      expect(failurePattern).toBeDefined();
    });

    it('should capture WebSocket events', () => {
      const patternId = capture.captureWebSocketEvent('connection_open', true, { url: 'ws://test' });
      expect(patternId).toBeDefined();
    });

    it('should capture performance issues', () => {
      const patternId = capture.capturePerformanceIssue('TestComponent', 'memory', 100000000, 50000000);
      expect(patternId).toBeDefined();
    });

    it('should capture navigation actions', () => {
      const patternId = capture.captureNavigationAction('navigate', '/dashboard', true);
      expect(patternId).toBeDefined();
    });
  });

  describe('Pattern Analysis', () => {
    it('should generate recommendations based on patterns', () => {
      // Simulate some failures
      capture.captureButtonClick('test-button', 'TestComponent', false);
      capture.captureButtonClick('test-button', 'TestComponent', false);
      capture.captureButtonClick('test-button', 'TestComponent', false);
      
      const recommendations = capture.generateRecommendations();
      expect(recommendations).toBeInstanceOf(Array);
    });

    it('should export pattern data', () => {
      capture.captureButtonClick('test-button', 'TestComponent');
      
      const exported = capture.exportPatterns();
      expect(exported).toHaveProperty('patterns');
      expect(exported).toHaveProperty('failurePatterns');
      expect(exported).toHaveProperty('profiles');
      expect(exported.patterns.length).toBeGreaterThan(0);
    });

    it('should track user behavior patterns', () => {
      capture.captureViewSwitch('view1', 'view2', 'TestComponent');
      capture.captureViewSwitch('view2', 'view3', 'TestComponent');
      capture.captureViewSwitch('view3', 'view1', 'TestComponent');
      
      const profile = capture.getUserProfile();
      expect(profile).toBeDefined();
      expect(profile?.preferredViews).toBeInstanceOf(Array);
    });
  });

  describe('Failure Pattern Detection', () => {
    it('should detect recurring failure patterns', () => {
      // Create multiple failures of the same type
      for (let i = 0; i < 5; i++) {
        capture.captureApiCall('/test-endpoint', 'POST', false, 1000, 'Connection timeout');
      }
      
      const failurePatterns = capture.getFailurePatterns();
      expect(failurePatterns.length).toBeGreaterThan(0);
      
      const testPattern = failurePatterns.find(fp => fp.patternId.includes('api_call'));
      expect(testPattern).toBeDefined();
      expect(testPattern?.frequency).toBe(5);
    });

    it('should classify failure types correctly', () => {
      capture.captureWebSocketEvent('connection_error', false, {}, 'WebSocket connection failed');
      capture.captureApiCall('/api/test', 'GET', false, 30000, 'Request timeout');
      capture.capturePerformanceIssue('SlowComponent', 'render', 10000, 1000);
      
      const failurePatterns = capture.getFailurePatterns();
      
      const wsFailure = failurePatterns.find(fp => fp.failureType === 'websocket');
      const apiFailure = failurePatterns.find(fp => fp.failureType === 'api');
      const perfFailure = failurePatterns.find(fp => fp.failureType === 'performance');
      
      expect(wsFailure).toBeDefined();
      expect(apiFailure).toBeDefined();
      expect(perfFailure).toBeDefined();
    });

    it('should generate prevention strategies for recurring failures', () => {
      // Create recurring failures to trigger strategy generation
      for (let i = 0; i < 4; i++) {
        capture.captureWebSocketEvent('connection_error', false, {}, 'Connection lost');
      }
      
      const failurePatterns = capture.getFailurePatterns();
      const wsPattern = failurePatterns.find(fp => fp.failureType === 'websocket');
      
      expect(wsPattern?.preventionStrategy).toBeDefined();
      expect(wsPattern?.preventionStrategy).toContain('retry');
    });
  });

  describe('Data Persistence', () => {
    it('should store patterns in localStorage as fallback', () => {
      capture.captureButtonClick('test-button', 'TestComponent');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'nld-patterns',
        expect.any(String)
      );
    });

    it('should clear all pattern data', () => {
      capture.captureButtonClick('test-button', 'TestComponent');
      capture.clearPatterns();
      
      const exported = capture.exportPatterns();
      expect(exported.patterns.length).toBe(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('nld-patterns');
    });
  });

  describe('Neural Pattern Engine', () => {
    let neuralEngine: NeuralPatternEngine;

    beforeEach(() => {
      neuralEngine = new NeuralPatternEngine();
    });

    afterEach(() => {
      neuralEngine.clearPatterns();
    });

    it('should initialize with base neural patterns', () => {
      const buttonPattern = neuralEngine.getPatternAnalysis('button_click_sequence');
      const wsPattern = neuralEngine.getPatternAnalysis('websocket_health');
      const perfPattern = neuralEngine.getPatternAnalysis('performance_prediction');
      const userPattern = neuralEngine.getPatternAnalysis('user_preference_model');
      
      expect(buttonPattern).toBeDefined();
      expect(wsPattern).toBeDefined();
      expect(perfPattern).toBeDefined();
      expect(userPattern).toBeDefined();
    });

    it('should predict failure probability', () => {
      // Create test patterns
      const testPatterns: UIPattern[] = [
        {
          id: 'test-1',
          action: 'button_click_test',
          context: {
            component: 'TestComponent',
            viewport: { width: 1920, height: 1080 },
            userAgent: 'test-agent',
            timestamp: new Date(),
            sessionId: 'test-session'
          },
          outcome: 'success',
          timestamp: new Date(),
          sessionId: 'test-session',
          performanceMetrics: { duration: 150 }
        }
      ];

      const prediction = neuralEngine.predictFailure(testPatterns);
      
      expect(prediction).toBeDefined();
      expect(prediction.prediction).toMatch(/^(success|failure|timeout)$/);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.factors).toBeInstanceOf(Array);
      expect(prediction.recommendations).toBeInstanceOf(Array);
    });

    it('should provide meaningful recommendations based on factors', () => {
      const testPatterns: UIPattern[] = Array.from({ length: 20 }, (_, i) => ({
        id: `test-${i}`,
        action: 'api_call_test',
        context: {
          component: 'ApiComponent',
          viewport: { width: 1920, height: 1080 },
          userAgent: 'test-agent',
          timestamp: new Date(Date.now() - i * 1000),
          sessionId: 'test-session'
        },
        outcome: i % 3 === 0 ? 'failure' : 'success',
        timestamp: new Date(Date.now() - i * 1000),
        sessionId: 'test-session',
        performanceMetrics: { 
          duration: 1000 + (i * 200),
          memoryUsage: 50000000 + (i * 1000000),
          networkLatency: 100 + (i * 50)
        }
      }));

      const prediction = neuralEngine.predictFailure(testPatterns);
      
      expect(prediction.recommendations.length).toBeGreaterThan(0);
      // Should contain meaningful recommendations based on the test data
      const hasPerformanceRec = prediction.recommendations.some(rec => 
        rec.toLowerCase().includes('memory') || 
        rec.toLowerCase().includes('timeout') || 
        rec.toLowerCase().includes('optimization')
      );
      expect(hasPerformanceRec).toBe(true);
    });
  });

  describe('Database Manager', () => {
    let dbManager: NLDDatabaseManager;

    beforeEach(() => {
      dbManager = new NLDDatabaseManager();
    });

    afterEach(async () => {
      await dbManager.clearAllData();
    });

    it('should generate analytics reports', async () => {
      const report = await dbManager.generateAnalyticsReport();
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.predictions).toBeDefined();
      
      expect(report.summary.totalPatterns).toBeGreaterThanOrEqual(0);
      expect(report.summary.successRate).toBeGreaterThanOrEqual(0);
      expect(report.summary.successRate).toBeLessThanOrEqual(1);
    });

    it('should export and import database', async () => {
      const exported = await dbManager.exportDatabase();
      
      expect(exported).toBeDefined();
      expect(exported.patterns).toBeInstanceOf(Array);
      expect(exported.failurePatterns).toBeInstanceOf(Array);
      expect(exported.userProfiles).toBeInstanceOf(Array);
      expect(exported.metadata).toBeDefined();
      expect(exported.metadata.version).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with real UI interactions', async () => {
      const dbManager = new NLDDatabaseManager();
      
      // Simulate a user session
      const sessionPatterns = [
        capture.captureButtonClick('launch_button', 'SimpleLauncher'),
        capture.captureApiCall('/instances', 'POST', true, 1500),
        capture.captureWebSocketEvent('connection_open', true),
        capture.captureViewSwitch('terminal', 'web', 'SimpleLauncher'),
        capture.captureToggleAction('terminal_visibility', true, 'SimpleLauncher')
      ];

      // Verify all patterns were captured
      sessionPatterns.forEach(patternId => {
        expect(patternId).toBeDefined();
        expect(patternId).not.toBe('');
      });

      // Generate analytics
      const report = await dbManager.generateAnalyticsReport();
      expect(report.summary.totalPatterns).toBeGreaterThan(0);

      // Generate recommendations
      const recommendations = capture.generateRecommendations();
      expect(recommendations).toBeInstanceOf(Array);

      // Cleanup
      await dbManager.clearAllData();
    });

    it('should handle rapid successive interactions without data loss', () => {
      const patternIds: string[] = [];
      
      // Rapid fire interactions
      for (let i = 0; i < 50; i++) {
        patternIds.push(capture.captureButtonClick(`rapid-button-${i}`, 'TestComponent'));
      }

      // All patterns should have unique IDs
      const uniqueIds = new Set(patternIds);
      expect(uniqueIds.size).toBe(50);

      // Export should contain all patterns
      const exported = capture.exportPatterns();
      expect(exported.patterns.length).toBeGreaterThanOrEqual(50);
    });

    it('should maintain performance under load', () => {
      const startTime = performance.now();
      
      // Generate load
      for (let i = 0; i < 100; i++) {
        capture.captureButtonClick(`load-test-${i}`, 'LoadTestComponent', Math.random() > 0.8);
        capture.captureApiCall(`/api/test-${i}`, 'GET', Math.random() > 0.7, Math.random() * 2000);
        capture.capturePerformanceIssue('LoadComponent', 'render', Math.random() * 5000, 1000);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      
      // Should generate meaningful analytics
      const recommendations = capture.generateRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });
});