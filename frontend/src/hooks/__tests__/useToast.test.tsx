/**
 * Comprehensive Test Suite for useToast Hook
 * Tests toast queue management, auto-dismiss, manual dismiss, and convenience methods
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, Toast, ToastType } from '../useToast';

describe('useToast Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Toast Creation', () => {
    it('should initialize with empty toasts array', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toEqual([]);
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should create a toast with correct properties', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('success', 'Test message', 5000);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        type: 'success',
        message: 'Test message',
        duration: 5000
      });
      expect(result.current.toasts[0].id).toBeTruthy();
    });

    it('should generate unique IDs for each toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Message 1');
        result.current.showToast('info', 'Message 2');
        result.current.showToast('info', 'Message 3');
      });

      const ids = result.current.toasts.map(t => t.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
      expect(ids[0]).not.toBe(ids[1]);
      expect(ids[1]).not.toBe(ids[2]);
    });

    it('should support all toast types', () => {
      const { result } = renderHook(() => useToast());
      const types: ToastType[] = ['success', 'error', 'warning', 'info'];

      types.forEach(type => {
        act(() => {
          result.current.showToast(type, `${type} message`);
        });
      });

      expect(result.current.toasts).toHaveLength(4);
      types.forEach((type, index) => {
        expect(result.current.toasts[index].type).toBe(type);
      });
    });
  });

  describe('Toast Queue Management (Max 5)', () => {
    it('should limit toasts to maximum of 5', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.showToast('info', `Message ${i}`);
        }
      });

      expect(result.current.toasts).toHaveLength(5);
    });

    it('should remove oldest toast when limit exceeded', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Message 1');
        result.current.showToast('info', 'Message 2');
        result.current.showToast('info', 'Message 3');
        result.current.showToast('info', 'Message 4');
        result.current.showToast('info', 'Message 5');
        result.current.showToast('info', 'Message 6'); // Should remove Message 1
      });

      expect(result.current.toasts).toHaveLength(5);
      expect(result.current.toasts[0].message).toBe('Message 2');
      expect(result.current.toasts[4].message).toBe('Message 6');
    });

    it('should keep removing oldest when adding multiple over limit', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        for (let i = 1; i <= 8; i++) {
          result.current.showToast('info', `Message ${i}`);
        }
      });

      expect(result.current.toasts).toHaveLength(5);
      expect(result.current.toasts[0].message).toBe('Message 4');
      expect(result.current.toasts[4].message).toBe('Message 8');
    });

    it('should maintain FIFO order in queue', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'First');
        result.current.showToast('info', 'Second');
        result.current.showToast('info', 'Third');
      });

      expect(result.current.toasts[0].message).toBe('First');
      expect(result.current.toasts[1].message).toBe('Second');
      expect(result.current.toasts[2].message).toBe('Third');
    });
  });

  describe('Auto-Dismiss Timing', () => {
    it('should auto-dismiss toast after specified duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Test message', 5000);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should not auto-dismiss when duration is 0', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('error', 'Persistent message', 0);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it('should auto-dismiss multiple toasts independently', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Message 1', 2000);
        result.current.showToast('info', 'Message 2', 4000);
        result.current.showToast('info', 'Message 3', 6000);
      });

      expect(result.current.toasts).toHaveLength(3);

      // After 2 seconds, first should be gone
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0].message).toBe('Message 2');

      // After 4 seconds total, second should be gone
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Message 3');

      // After 6 seconds total, all should be gone
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should use default duration of 5000ms when not specified', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Test message');
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(4999);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle custom durations correctly', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Fast toast', 1000);
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('Manual Dismiss', () => {
    it('should manually dismiss toast by ID', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Message 1');
        result.current.showToast('info', 'Message 2');
        result.current.showToast('info', 'Message 3');
      });

      const toastId = result.current.toasts[1].id;

      act(() => {
        result.current.dismissToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts.find(t => t.id === toastId)).toBeUndefined();
      expect(result.current.toasts[0].message).toBe('Message 1');
      expect(result.current.toasts[1].message).toBe('Message 3');
    });

    it('should handle dismissing non-existent toast gracefully', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Message');
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.dismissToast('non-existent-id');
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it('should allow dismissing all toasts individually', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Message 1');
        result.current.showToast('info', 'Message 2');
        result.current.showToast('info', 'Message 3');
      });

      const ids = result.current.toasts.map(t => t.id);

      ids.forEach(id => {
        act(() => {
          result.current.dismissToast(id);
        });
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should dismiss toast before auto-dismiss timer', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Message', 5000);
      });

      const toastId = result.current.toasts[0].id;

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.dismissToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(0);

      // Timer should not affect already dismissed toast
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('Convenience Methods', () => {
    describe('showSuccess', () => {
      it('should create success toast with default duration', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showSuccess('Success message');
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0]).toMatchObject({
          type: 'success',
          message: 'Success message',
          duration: 5000
        });
      });

      it('should create success toast with custom duration', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showSuccess('Success message', 3000);
        });

        expect(result.current.toasts[0]).toMatchObject({
          type: 'success',
          duration: 3000
        });
      });

      it('should auto-dismiss success toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showSuccess('Success message');
        });

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        expect(result.current.toasts).toHaveLength(0);
      });
    });

    describe('showError', () => {
      it('should create error toast with duration 0 (no auto-dismiss)', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showError('Error message');
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0]).toMatchObject({
          type: 'error',
          message: 'Error message',
          duration: 0
        });
      });

      it('should not auto-dismiss error toast by default', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showError('Error message');
        });

        act(() => {
          vi.advanceTimersByTime(10000);
        });

        expect(result.current.toasts).toHaveLength(1);
      });

      it('should allow custom duration for error toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showError('Error message', 3000);
        });

        expect(result.current.toasts[0].duration).toBe(3000);

        act(() => {
          vi.advanceTimersByTime(3000);
        });

        expect(result.current.toasts).toHaveLength(0);
      });
    });

    describe('showWarning', () => {
      it('should create warning toast with default duration 7000ms', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showWarning('Warning message');
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0]).toMatchObject({
          type: 'warning',
          message: 'Warning message',
          duration: 7000
        });
      });

      it('should auto-dismiss warning toast after 7 seconds', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showWarning('Warning message');
        });

        act(() => {
          vi.advanceTimersByTime(6999);
        });

        expect(result.current.toasts).toHaveLength(1);

        act(() => {
          vi.advanceTimersByTime(1);
        });

        expect(result.current.toasts).toHaveLength(0);
      });

      it('should allow custom duration for warning toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showWarning('Warning message', 4000);
        });

        expect(result.current.toasts[0].duration).toBe(4000);
      });
    });

    describe('showInfo', () => {
      it('should create info toast with default duration 5000ms', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showInfo('Info message');
        });

        expect(result.current.toasts).toHaveLength(1);
        expect(result.current.toasts[0]).toMatchObject({
          type: 'info',
          message: 'Info message',
          duration: 5000
        });
      });

      it('should auto-dismiss info toast after 5 seconds', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showInfo('Info message');
        });

        act(() => {
          vi.advanceTimersByTime(5000);
        });

        expect(result.current.toasts).toHaveLength(0);
      });

      it('should allow custom duration for info toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
          result.current.showInfo('Info message', 2000);
        });

        expect(result.current.toasts[0].duration).toBe(2000);
      });
    });
  });

  describe('Mixed Usage Scenarios', () => {
    it('should handle mix of different toast types', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showSuccess('Success');
        result.current.showError('Error');
        result.current.showWarning('Warning');
        result.current.showInfo('Info');
      });

      expect(result.current.toasts).toHaveLength(4);
      expect(result.current.toasts[0].type).toBe('success');
      expect(result.current.toasts[1].type).toBe('error');
      expect(result.current.toasts[2].type).toBe('warning');
      expect(result.current.toasts[3].type).toBe('info');
    });

    it('should handle rapid toast creation', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        for (let i = 0; i < 20; i++) {
          result.current.showInfo(`Message ${i}`);
        }
      });

      expect(result.current.toasts).toHaveLength(5);
      expect(result.current.toasts[0].message).toBe('Message 15');
      expect(result.current.toasts[4].message).toBe('Message 19');
    });

    it('should handle mix of auto-dismiss and persistent toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showSuccess('Auto-dismiss', 2000);
        result.current.showError('Persistent'); // duration 0
        result.current.showInfo('Auto-dismiss 2', 2000);
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Persistent');
    });

    it('should handle creating toast after dismissing one', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showInfo('Message 1');
        result.current.showInfo('Message 2');
      });

      const firstId = result.current.toasts[0].id;

      act(() => {
        result.current.dismissToast(firstId);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.showInfo('Message 3');
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0].message).toBe('Message 2');
      expect(result.current.toasts[1].message).toBe('Message 3');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty message', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', '');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('');
    });

    it('should handle very long messages', () => {
      const { result } = renderHook(() => useToast());
      const longMessage = 'A'.repeat(10000);

      act(() => {
        result.current.showToast('info', longMessage);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe(longMessage);
    });

    it('should handle special characters in message', () => {
      const { result } = renderHook(() => useToast());
      const specialMessage = '<script>alert("XSS")</script> & "quotes" \'apostrophes\'';

      act(() => {
        result.current.showToast('info', specialMessage);
      });

      expect(result.current.toasts[0].message).toBe(specialMessage);
    });

    it('should handle unicode characters', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', '你好 🌍 мир');
      });

      expect(result.current.toasts[0].message).toBe('你好 🌍 мир');
    });

    it('should handle negative duration gracefully', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Message', -1000);
      });

      expect(result.current.toasts).toHaveLength(1);
      // Negative duration should not cause errors
    });

    it('should handle very large duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showToast('info', 'Message', 999999999);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should handle post creation success flow', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showSuccess('Post created successfully!', 5000);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('success');

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle post creation error flow', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showError('Failed to create post: Access denied');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('error');

      // Should not auto-dismiss
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.toasts).toHaveLength(1);

      // User manually dismisses
      act(() => {
        result.current.dismissToast(result.current.toasts[0].id);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle warning dialog flow', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showWarning('This operation contains risky content', 7000);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('warning');

      act(() => {
        vi.advanceTimersByTime(7000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should handle multiple operations with different outcomes', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.showSuccess('Operation 1 completed');
        result.current.showSuccess('Operation 2 completed');
        result.current.showError('Operation 3 failed');
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].type).toBe('error');
    });
  });

  describe('Hook Return API', () => {
    it('should expose all required methods', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current).toHaveProperty('toasts');
      expect(result.current).toHaveProperty('showToast');
      expect(result.current).toHaveProperty('dismissToast');
      expect(result.current).toHaveProperty('showSuccess');
      expect(result.current).toHaveProperty('showError');
      expect(result.current).toHaveProperty('showWarning');
      expect(result.current).toHaveProperty('showInfo');

      expect(typeof result.current.showToast).toBe('function');
      expect(typeof result.current.dismissToast).toBe('function');
      expect(typeof result.current.showSuccess).toBe('function');
      expect(typeof result.current.showError).toBe('function');
      expect(typeof result.current.showWarning).toBe('function');
      expect(typeof result.current.showInfo).toBe('function');
    });

    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useToast());

      const initialShowToast = result.current.showToast;
      const initialDismissToast = result.current.dismissToast;

      rerender();

      expect(result.current.showToast).toBe(initialShowToast);
      expect(result.current.dismissToast).toBe(initialDismissToast);
    });
  });
});
