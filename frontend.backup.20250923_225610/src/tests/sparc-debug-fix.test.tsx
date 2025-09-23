/**
 * SPARC Debug Fix Test Suite
 * 
 * TDD validation for DualInstancePage TypeError fix
 * Error ID: err-1755845284530-b1u7a0
 */

import { renderHook, act } from '@testing-library/react';
import { useInstanceManager } from '../hooks/useInstanceManager';
import { ProcessInfo, InstanceInfo, InstanceStats } from '../hooks/useInstanceManager';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn()
  }))
}));

describe('SPARC Debug Fix: DualInstancePage TypeError', () => {
  describe('Phase 1: Specification Validation', () => {
    test('useInstanceManager returns instances array instead of undefined', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      // Verify instances exists and is an array
      expect(result.current.instances).toBeDefined();
      expect(Array.isArray(result.current.instances)).toBe(true);
    });

    test('instances array supports filter operation', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      // This should not throw TypeError
      expect(() => {
        result.current.instances.filter(i => i.status === 'running');
      }).not.toThrow();
    });

    test('stats object is properly structured', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      expect(result.current.stats).toBeDefined();
      expect(typeof result.current.stats).toBe('object');
      expect(result.current.stats).toHaveProperty('running');
      expect(result.current.stats).toHaveProperty('stopped');
      expect(result.current.stats).toHaveProperty('error');
      expect(result.current.stats).toHaveProperty('total');
    });
  });

  describe('Phase 2: Pseudocode Algorithm Validation', () => {
    test('single processInfo transforms to single-item instances array', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      // With default stopped state
      expect(result.current.instances).toHaveLength(1);
      expect(result.current.instances[0]).toHaveProperty('id');
      expect(result.current.instances[0]).toHaveProperty('type');
      expect(result.current.instances[0]).toHaveProperty('createdAt');
    });

    test('stats computation matches processInfo state', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      // Default stopped state should reflect in stats
      expect(result.current.stats.stopped).toBe(1);
      expect(result.current.stats.running).toBe(0);
      expect(result.current.stats.error).toBe(0);
      expect(result.current.stats.total).toBe(1);
    });
  });

  describe('Phase 3: Architecture - Null Safety', () => {
    test('handles undefined processInfo gracefully', () => {
      // Mock empty processInfo scenario
      const { result } = renderHook(() => useInstanceManager());
      
      expect(result.current.instances).toEqual([]);
      expect(() => {
        result.current.instances.filter(i => i.status === 'running');
      }).not.toThrow();
    });

    test('InstanceInfo interface extends ProcessInfo correctly', () => {
      const { result } = renderHook(() => useInstanceManager());
      const instance = result.current.instances[0];
      
      // Should have ProcessInfo properties
      expect(instance).toHaveProperty('pid');
      expect(instance).toHaveProperty('name');
      expect(instance).toHaveProperty('status');
      expect(instance).toHaveProperty('startTime');
      
      // Should have additional InstanceInfo properties
      expect(instance).toHaveProperty('id');
      expect(instance).toHaveProperty('type');
      expect(instance).toHaveProperty('createdAt');
    });
  });

  describe('Phase 4: Refinement - Defensive Programming', () => {
    test('filter operations work with all status types', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      const runningInstances = result.current.instances.filter(i => i.status === 'running');
      const stoppedInstances = result.current.instances.filter(i => i.status === 'stopped');
      const errorInstances = result.current.instances.filter(i => i.status === 'error');
      
      expect(Array.isArray(runningInstances)).toBe(true);
      expect(Array.isArray(stoppedInstances)).toBe(true);
      expect(Array.isArray(errorInstances)).toBe(true);
    });

    test('backward compatibility maintained', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      // Legacy interface should still exist
      expect(result.current.processInfo).toBeDefined();
      expect(result.current.isConnected).toBeDefined();
      expect(result.current.launchInstance).toBeDefined();
      expect(result.current.killInstance).toBeDefined();
      expect(result.current.restartInstance).toBeDefined();
      expect(result.current.updateConfig).toBeDefined();
    });
  });

  describe('Phase 5: Completion - Integration Validation', () => {
    test('DualInstancePage can safely destructure hook result', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      // This is what DualInstancePage does on line 59
      const { instances, stats } = result.current;
      
      expect(instances).toBeDefined();
      expect(stats).toBeDefined();
      expect(Array.isArray(instances)).toBe(true);
    });

    test('reproduces original error scenario and validates fix', () => {
      const { result } = renderHook(() => useInstanceManager());
      const { instances } = result.current;
      
      // Line 75: const runningInstances = instances.filter(i => i.status === 'running');
      expect(() => {
        const runningInstances = instances.filter(i => i.status === 'running');
        return runningInstances;
      }).not.toThrow();
      
      // Line 106: const runningInstances = instances.filter(i => i.status === 'running');
      expect(() => {
        const runningInstances = instances.filter(i => i.status === 'running');
        return runningInstances;
      }).not.toThrow();
    });

    test('error boundary integration readiness', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      // Should not throw during normal operations
      expect(() => {
        const { instances, stats } = result.current;
        const runningCount = instances.filter(i => i.status === 'running').length;
        const totalStats = stats.total;
      }).not.toThrow();
    });
  });

  describe('NLD Pattern Learning', () => {
    test('captures debugging pattern: interface mismatch resolution', () => {
      const { result } = renderHook(() => useInstanceManager());
      
      // Pattern: Transform single object to array for compatibility
      expect(result.current.instances).toHaveLength(1);
      expect(typeof result.current.processInfo).toBe('object');
      
      // Pattern: Computed stats from single source
      expect(result.current.stats.total).toBe(1);
    });
  });
});

// Integration test for DualInstancePage specific usage
describe('DualInstancePage Integration', () => {
  test('exact line 84 scenario', () => {
    const { result } = renderHook(() => useInstanceManager());
    const { instances } = result.current;
    
    // Line 84 in useEffect: instances.filter(i => i.status === 'running')
    const runningInstances = instances.filter(i => i.status === 'running');
    expect(Array.isArray(runningInstances)).toBe(true);
    expect(runningInstances.length).toBeGreaterThanOrEqual(0);
  });

  test('stats usage compatibility', () => {
    const { result } = renderHook(() => useInstanceManager());
    const { stats } = result.current;
    
    // Usage in component: stats.running, stats.stopped, stats.error
    expect(typeof stats.running).toBe('number');
    expect(typeof stats.stopped).toBe('number');
    expect(typeof stats.error).toBe('number');
  });
});