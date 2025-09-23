/**
 * TDD London School Unit Test for useNotification Hook
 * 
 * Tests the showNotification fix specifically
 */

import { renderHook, act } from '@testing-library/react';
import { useNotification } from '@/hooks/useNotification';

describe('useNotification Hook - TDD London School', () => {
  describe('GREEN Phase: showNotification Function Export', () => {
    it('should export showNotification function', () => {
      const { result } = renderHook(() => useNotification());
      
      expect(result.current).toHaveProperty('showNotification');
      expect(typeof result.current.showNotification).toBe('function');
    });

    it('should call showNotification and add notification', () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.showNotification({
          type: 'error',
          title: 'Terminal Connection Error',
          message: 'WebSocket connection failed',
          duration: 5000
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: 'error',
        title: 'Terminal Connection Error',
        message: 'WebSocket connection failed',
        duration: 5000
      });
    });

    it('should work with copy success notification', () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.showNotification({
          type: 'success',
          title: 'Copied',
          message: 'Selection copied to clipboard',
          duration: 2000
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: 'success',
        title: 'Copied',
        message: 'Selection copied to clipboard',
        duration: 2000
      });
    });

    it('should maintain backward compatibility with addNotification', () => {
      const { result } = renderHook(() => useNotification());
      
      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Test',
          message: 'Test message'
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: 'info',
        title: 'Test',
        message: 'Test message'
      });
    });

    it('should have same behavior for addNotification and showNotification', () => {
      const { result } = renderHook(() => useNotification());
      
      const notification = {
        type: 'warning' as const,
        title: 'Warning',
        message: 'Test warning'
      };

      let addResult: string;
      let showResult: string;

      act(() => {
        addResult = result.current.addNotification(notification);
      });

      act(() => {
        showResult = result.current.showNotification(notification);
      });

      expect(result.current.notifications).toHaveLength(2);
      expect(typeof addResult).toBe('string');
      expect(typeof showResult).toBe('string');
    });
  });

  describe('Contract Verification', () => {
    it('should provide the complete notification contract', () => {
      const { result } = renderHook(() => useNotification());
      
      const expectedContract = [
        'notifications',
        'addNotification', 
        'showNotification',
        'removeNotification',
        'clearAll'
      ];

      expectedContract.forEach(property => {
        expect(result.current).toHaveProperty(property);
      });
    });
  });
});