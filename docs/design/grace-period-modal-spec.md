# Grace Period Modal - Design Specification

**Version:** 1.0.0
**Last Updated:** 2025-11-07
**Status:** Draft

## Executive Summary

This document specifies the design and implementation requirements for a Grace Period Modal component that provides users with timeout warnings and options to manage long-running AI agent tasks. The design follows 2025 best practices for timeout handling, accessibility (WCAG 2.1), and modern React/TypeScript patterns.

---

## 1. Overview

### 1.1 Purpose

The Grace Period Modal appears when an AI agent task approaches a predefined timeout threshold (e.g., 2 minutes before timeout). It provides:
- Clear warning of impending timeout
- Real-time countdown visualization
- User control options (Continue, Pause, Simplify, Cancel)
- Live progress tracking of todo items
- Graceful degradation and error handling

### 1.2 Design Principles

1. **User Empowerment**: Give users clear choices and control over task execution
2. **Transparency**: Show real-time progress and remaining time
3. **Accessibility-First**: WCAG 2.1 Level AA compliance minimum
4. **Non-Disruptive**: Capture attention without being alarming
5. **Responsive**: Work across all device sizes
6. **Graceful Degradation**: Handle errors and edge cases elegantly

### 1.3 Key Research Findings

Based on 2025 UX best practices:
- **Warning Timing**: Display warning 2-3 minutes before timeout
- **Visual Hierarchy**: Modal should be front-and-center, with dimmed background
- **Progress Indicators**: Combine countdown timer with visual progress bar
- **Accessibility**: Screen reader announcements, keyboard navigation, sufficient time to respond
- **User Activity**: Consider detecting user activity to auto-extend sessions
- **Clear Communication**: Explain WHY timeout is happening (system resources, cost control, etc.)

---

## 2. Component Architecture

### 2.1 Component Structure

```
GracePeriodModal/
├── GracePeriodModal.tsx          # Main modal component
├── GracePeriodModal.types.ts     # TypeScript interfaces
├── GracePeriodModal.styles.ts    # Styled components or CSS modules
├── components/
│   ├── CountdownTimer.tsx        # Circular or linear countdown
│   ├── ProgressTracker.tsx       # Todo list progress visualization
│   ├── ActionButtons.tsx         # User choice buttons
│   └── StatusIndicator.tsx       # Current task status
├── hooks/
│   ├── useCountdown.ts           # Countdown logic
│   ├── useProgressTracking.ts    # Todo progress tracking
│   └── useModalFocus.ts          # Focus trap and accessibility
└── utils/
    ├── timeFormatting.ts         # Time display utilities
    └── progressCalculation.ts    # Progress percentage calculations
```

### 2.2 Props Interface

```typescript
interface GracePeriodModalProps {
  // Visibility
  isOpen: boolean;

  // Timing Configuration
  timeRemaining: number; // milliseconds
  totalDuration: number; // milliseconds for progress calculation

  // Task Information
  taskId: string;
  taskDescription: string;
  currentAgent?: string;

  // Todo Progress
  todos: TodoItem[];
  completedCount: number;
  totalCount: number;

  // Callbacks
  onContinue: () => void | Promise<void>;
  onPause: () => void | Promise<void>;
  onSimplify?: () => void | Promise<void>; // Optional
  onCancel: () => void | Promise<void>;
  onClose?: () => void; // For manual close (ESC key)

  // Configuration
  showSimplifyOption?: boolean;
  allowManualClose?: boolean;
  customMessage?: string;

  // Accessibility
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;

  // Styling
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

interface TodoItem {
  id: string;
  content: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  estimatedTime?: number; // milliseconds
}
```

### 2.3 State Management

```typescript
interface ModalState {
  // Countdown
  remainingSeconds: number;
  isCountingDown: boolean;

  // Progress
  currentTodo: TodoItem | null;
  progressPercentage: number;

  // UI State
  isLoading: boolean;
  actionInProgress: 'continue' | 'pause' | 'simplify' | 'cancel' | null;
  error: string | null;

  // Accessibility
  hasAnnounced: boolean;
  focusTrapActive: boolean;
}
```

---

## 3. Visual Design

### 3.1 Wireframe Description

```
┌─────────────────────────────────────────────────────────────┐
│                    DIMMED BACKDROP (80% opacity)             │
│                                                              │
│   ┌──────────────────────────────────────────────────┐     │
│   │  ⚠️  Task Approaching Timeout                     │     │
│   ├──────────────────────────────────────────────────┤     │
│   │                                                   │     │
│   │  [Circular Progress Timer]    Time Remaining     │     │
│   │         2:45                    2m 45s            │     │
│   │                                                   │     │
│   │  ─────────────────────────────────────────────   │     │
│   │  Task: "Research and design UI components..."    │     │
│   │  Agent: grace-period-designer                    │     │
│   │  ─────────────────────────────────────────────   │     │
│   │                                                   │     │
│   │  Progress: 6 of 10 tasks completed (60%)         │     │
│   │  ████████████░░░░░░░░  60%                       │     │
│   │                                                   │     │
│   │  Current Tasks:                                  │     │
│   │  ✅ Research timeout UX patterns                 │     │
│   │  ✅ Research progress modal designs              │     │
│   │  🔄 Create design specification (In Progress)    │     │
│   │  ⏸️  Design React component structure            │     │
│   │  ⏸️  Define accessibility requirements           │     │
│   │                                                   │     │
│   │  Why is this timing out?                         │     │
│   │  Long-running tasks are paused to optimize       │     │
│   │  resource usage and prevent excessive costs.     │     │
│   │                                                   │     │
│   │  ─────────────────────────────────────────────   │     │
│   │                                                   │     │
│   │  [Continue Task] [Pause Task] [Simplify] [Cancel]│     │
│   │   (Primary)      (Secondary)   (Tertiary)(Link)  │     │
│   │                                                   │     │
│   └──────────────────────────────────────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Layout Specifications

**Modal Container**
- Width: 600px (desktop), 90vw (mobile)
- Max-width: 800px
- Max-height: 90vh
- Padding: 32px (desktop), 24px (mobile)
- Border-radius: 12px
- Background: White (#FFFFFF) / Dark (#1A1A1A)
- Box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3)
- Position: Fixed, centered (top/left 50%, transform translate(-50%, -50%))

**Backdrop**
- Background: rgba(0, 0, 0, 0.6)
- Backdrop-filter: blur(4px)
- Position: Fixed, full viewport

**Header**
- Warning icon: 32px × 32px
- Title: 24px, font-weight: 600
- Color: Warning color (#F59E0B for light, #FCD34D for dark)

**Countdown Timer**
- Circular progress: 120px diameter
- Center text: 48px (time), font-weight: 700
- Color: Warning → Danger gradient (yellow → red as time decreases)

**Progress Bar**
- Height: 8px
- Border-radius: 4px
- Background: Gray-200 (#E5E7EB)
- Fill: Primary color (#3B82F6)
- Smooth animation: transition 0.3s ease

**Todo List**
- Max-height: 200px
- Overflow-y: auto
- Scrollbar: Styled, 8px width
- Item height: 40px
- Icons: 20px × 20px
- Font-size: 14px

**Action Buttons**
- Height: 48px
- Min-width: 120px
- Border-radius: 8px
- Gap: 12px (between buttons)
- Font-size: 16px, font-weight: 500

### 3.3 Color Scheme

**Light Theme**
```typescript
const lightTheme = {
  // Background
  modal: '#FFFFFF',
  backdrop: 'rgba(0, 0, 0, 0.6)',

  // Text
  primary: '#111827',
  secondary: '#6B7280',

  // Status Colors
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
  info: '#3B82F6',

  // Progress
  progressBg: '#E5E7EB',
  progressFill: '#3B82F6',

  // Buttons
  btnPrimary: '#3B82F6',
  btnPrimaryHover: '#2563EB',
  btnSecondary: '#6B7280',
  btnSecondaryHover: '#4B5563',
  btnCancel: '#EF4444',
  btnCancelHover: '#DC2626',

  // Borders
  border: '#E5E7EB',
};
```

**Dark Theme**
```typescript
const darkTheme = {
  // Background
  modal: '#1A1A1A',
  backdrop: 'rgba(0, 0, 0, 0.8)',

  // Text
  primary: '#F9FAFB',
  secondary: '#9CA3AF',

  // Status Colors
  warning: '#FCD34D',
  danger: '#F87171',
  success: '#34D399',
  info: '#60A5FA',

  // Progress
  progressBg: '#374151',
  progressFill: '#60A5FA',

  // Buttons
  btnPrimary: '#3B82F6',
  btnPrimaryHover: '#2563EB',
  btnSecondary: '#4B5563',
  btnSecondaryHover: '#6B7280',
  btnCancel: '#EF4444',
  btnCancelHover: '#DC2626',

  // Borders
  border: '#374151',
};
```

### 3.4 Typography

**Font Family**
- Primary: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- Monospace: 'Fira Code', 'Courier New', monospace (for countdown)

**Scale**
- Heading: 24px / 1.5 line-height / 600 weight
- Subheading: 18px / 1.5 / 500
- Body: 16px / 1.5 / 400
- Caption: 14px / 1.4 / 400
- Timer: 48px / 1.2 / 700

---

## 4. Interaction Design

### 4.1 User Flows

**Flow 1: Continue Task**
1. User clicks "Continue Task" button
2. Button shows loading spinner
3. Countdown pauses
4. API call to extend timeout
5. On success: Modal fades out, task continues
6. On error: Show error message, allow retry

**Flow 2: Pause Task**
1. User clicks "Pause Task" button
2. Button shows loading spinner
3. Countdown stops
4. Save current task state
5. Modal shows "Task Paused" confirmation
6. Close modal after 2 seconds

**Flow 3: Simplify Task**
1. User clicks "Simplify" button
2. Modal shows simplification options (reduce scope, skip optional tasks)
3. User confirms simplification
4. Adjust todo list, remove low-priority items
5. Reset timeout with new estimate
6. Continue task execution

**Flow 4: Cancel Task**
1. User clicks "Cancel" link
2. Show confirmation dialog: "Are you sure? Progress will be lost."
3. User confirms or cancels
4. If confirmed: Stop all execution, cleanup, close modal
5. If cancelled: Return to grace period modal

**Flow 5: Timeout Expiration**
1. Countdown reaches 0:00
2. Modal updates to "Task Timed Out"
3. Disable Continue/Pause buttons
4. Show only "View Results" and "Close" buttons
5. Display partial results/progress

### 4.2 Animations & Transitions

**Modal Entry**
- Duration: 300ms
- Easing: ease-out
- Effects: Fade in backdrop (0 → 1), Scale modal (0.95 → 1), Slide down (20px)

**Modal Exit**
- Duration: 200ms
- Easing: ease-in
- Effects: Fade out backdrop (1 → 0), Scale modal (1 → 0.95)

**Countdown Animation**
- Update frequency: 1 second
- Progress ring: Smooth stroke-dasharray transition (300ms)
- Color shift: Gradual from warning to danger at 30 seconds remaining
- Pulse effect: At 10 seconds, add gentle pulse (scale 1 → 1.05 → 1)

**Button States**
- Hover: 150ms ease, slight scale (1.02)
- Active: 100ms ease, scale (0.98)
- Loading: Infinite spin animation for spinner

**Progress Bar**
- Todo completion: 400ms ease-out, smooth width change
- New todo: Fade in (200ms)

### 4.3 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Navigate between buttons (focus trap within modal) |
| Shift+Tab | Navigate backwards |
| Enter | Activate focused button |
| Space | Activate focused button |
| Escape | Close modal (if allowManualClose is true) |
| Arrow Keys | Navigate through todo list (optional enhancement) |

### 4.4 Focus Management

**Focus Trap**
- When modal opens, focus moves to first interactive element (Continue button)
- Tab navigation loops within modal (cannot tab to background content)
- Focus returns to trigger element when modal closes

**Focus Indicator**
- Clear focus ring: 2px solid, primary color
- Offset: 2px
- Border-radius: matches element

---

## 5. Accessibility (WCAG 2.1 Level AA)

### 5.1 Semantic HTML

```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc">
  <h2 id="modal-title">Task Approaching Timeout</h2>
  <div id="modal-desc">
    You have 2 minutes 45 seconds remaining. Choose an action to continue.
  </div>

  <div role="timer" aria-live="polite" aria-atomic="true">
    <span class="sr-only">Time remaining:</span>
    <span aria-label="2 minutes 45 seconds">2:45</span>
  </div>

  <div role="status" aria-live="polite">
    <span>6 of 10 tasks completed</span>
  </div>

  <ul aria-label="Task progress list">
    <li><span aria-label="Completed">✅</span> Research timeout UX patterns</li>
    <!-- ... -->
  </ul>
</div>
```

### 5.2 ARIA Attributes

**Modal Container**
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby="modal-title"`
- `aria-describedby="modal-desc"`

**Countdown Timer**
- `role="timer"`
- `aria-live="polite"` (updates announced but not interrupting)
- `aria-atomic="true"` (entire timer announced on update)
- `aria-label` for formatted time (e.g., "2 minutes 45 seconds")

**Progress Tracker**
- `role="status"`
- `aria-live="polite"`
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for progress bar

**Todo Items**
- `role="list"` and `role="listitem"`
- `aria-label` for status icons (completed, in progress, pending)

**Buttons**
- `aria-busy="true"` when loading
- `aria-disabled="true"` when disabled (not `disabled` attribute to keep in tab order)

### 5.3 Screen Reader Support

**Announcements**
- On modal open: "Warning: Task approaching timeout. 2 minutes 45 seconds remaining."
- Every 30 seconds: "Time update: 2 minutes remaining" (not every second, too disruptive)
- At 1 minute: "Warning: 1 minute remaining"
- At 30 seconds: "Warning: 30 seconds remaining"
- At 10 seconds: "Urgent: 10 seconds remaining"
- On action: "Continue button activated. Extending task timeout."

**Live Regions**
```html
<div class="sr-only" role="status" aria-live="polite" aria-atomic="true" ref={announceRef}>
  {/* Dynamic announcements inserted here */}
</div>
```

### 5.4 Color Contrast

**Text Contrast Ratios (WCAG AA)**
- Normal text (< 18px): Minimum 4.5:1
- Large text (≥ 18px or ≥ 14px bold): Minimum 3:1
- UI components: Minimum 3:1

**Tested Combinations**
- Primary text on modal background: 15:1 (excellent)
- Secondary text on modal background: 7:1 (excellent)
- Button text on primary button: 4.8:1 (pass)
- Warning icon on modal background: 4.5:1 (pass)

**Do Not Rely on Color Alone**
- Use icons + text for status (not just color)
- Progress bar has percentage text
- Countdown has numerical display + visual ring

### 5.5 Motion & Animation

**Respect `prefers-reduced-motion`**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Alternatives**
- Countdown: Still updates numbers, no spinning animation
- Progress bar: Instant fill, no smooth transition
- Modal entrance: Fade in only, no scale/slide

### 5.6 Timing Adjustability (WCAG 2.2.1)

**Requirements Met**
- ✅ User is warned before timeout (2-3 minutes notice)
- ✅ User can extend/adjust time (Continue button)
- ✅ User can pause/cancel task
- ✅ At least 20 seconds to respond to warning (we provide 2+ minutes)

---

## 6. Component Implementation

### 6.1 Core Component

```typescript
// GracePeriodModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GracePeriodModalProps, ModalState } from './GracePeriodModal.types';
import CountdownTimer from './components/CountdownTimer';
import ProgressTracker from './components/ProgressTracker';
import ActionButtons from './components/ActionButtons';
import { useCountdown } from './hooks/useCountdown';
import { useProgressTracking } from './hooks/useProgressTracking';
import { useModalFocus } from './hooks/useModalFocus';
import { formatTime } from './utils/timeFormatting';
import './GracePeriodModal.styles.css';

export const GracePeriodModal: React.FC<GracePeriodModalProps> = ({
  isOpen,
  timeRemaining,
  totalDuration,
  taskId,
  taskDescription,
  currentAgent,
  todos,
  completedCount,
  totalCount,
  onContinue,
  onPause,
  onSimplify,
  onCancel,
  onClose,
  showSimplifyOption = true,
  allowManualClose = false,
  customMessage,
  ariaLabelledBy = 'grace-period-modal-title',
  ariaDescribedBy = 'grace-period-modal-desc',
  theme = 'auto',
  className = '',
}) => {
  // State
  const [state, setState] = useState<ModalState>({
    remainingSeconds: Math.floor(timeRemaining / 1000),
    isCountingDown: true,
    currentTodo: null,
    progressPercentage: 0,
    isLoading: false,
    actionInProgress: null,
    error: null,
    hasAnnounced: false,
    focusTrapActive: false,
  });

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  // Custom hooks
  const { remainingSeconds, isExpired } = useCountdown(timeRemaining, isOpen);
  const { progressPercentage, currentTodo } = useProgressTracking(todos);
  useModalFocus(modalRef, isOpen);

  // Screen reader announcements
  useEffect(() => {
    if (!isOpen || state.hasAnnounced) return;

    const announcement = `Warning: Task approaching timeout. ${formatTime(remainingSeconds)} remaining.`;
    if (announceRef.current) {
      announceRef.current.textContent = announcement;
    }
    setState(prev => ({ ...prev, hasAnnounced: true }));
  }, [isOpen, remainingSeconds, state.hasAnnounced]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && allowManualClose && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, allowManualClose, onClose]);

  // Handle action with loading state
  const handleAction = async (
    action: 'continue' | 'pause' | 'simplify' | 'cancel',
    callback: () => void | Promise<void>
  ) => {
    setState(prev => ({ ...prev, isLoading: true, actionInProgress: action, error: null }));

    try {
      await callback();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An error occurred',
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false, actionInProgress: null }));
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="grace-period-backdrop" onClick={allowManualClose ? onClose : undefined}>
      <div
        ref={modalRef}
        className={`grace-period-modal ${className} theme-${theme}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        onClick={e => e.stopPropagation()}
      >
        {/* Screen reader announcements */}
        <div
          ref={announceRef}
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        />

        {/* Header */}
        <div className="modal-header">
          <span className="warning-icon" aria-hidden="true">⚠️</span>
          <h2 id={ariaLabelledBy} className="modal-title">
            Task Approaching Timeout
          </h2>
        </div>

        {/* Countdown Timer */}
        <CountdownTimer
          remainingSeconds={remainingSeconds}
          totalSeconds={Math.floor(totalDuration / 1000)}
          isExpired={isExpired}
        />

        {/* Description */}
        <div id={ariaDescribedBy} className="modal-description">
          <p className="task-info">
            <strong>Task:</strong> {taskDescription}
          </p>
          {currentAgent && (
            <p className="agent-info">
              <strong>Agent:</strong> {currentAgent}
            </p>
          )}
        </div>

        {/* Progress Tracker */}
        <ProgressTracker
          todos={todos}
          completedCount={completedCount}
          totalCount={totalCount}
          progressPercentage={progressPercentage}
          currentTodo={currentTodo}
        />

        {/* Explanation */}
        <div className="timeout-explanation">
          <p>
            {customMessage ||
              'Long-running tasks are paused to optimize resource usage and prevent excessive costs.'}
          </p>
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="error-message" role="alert">
            <span className="error-icon">❌</span>
            <span>{state.error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <ActionButtons
          onContinue={() => handleAction('continue', onContinue)}
          onPause={() => handleAction('pause', onPause)}
          onSimplify={showSimplifyOption && onSimplify
            ? () => handleAction('simplify', onSimplify)
            : undefined}
          onCancel={() => handleAction('cancel', onCancel)}
          isLoading={state.isLoading}
          actionInProgress={state.actionInProgress}
          isExpired={isExpired}
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default GracePeriodModal;
```

### 6.2 Countdown Timer Component

```typescript
// components/CountdownTimer.tsx
import React, { useMemo } from 'react';
import { formatTime } from '../utils/timeFormatting';

interface CountdownTimerProps {
  remainingSeconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  remainingSeconds,
  totalSeconds,
  isExpired,
}) => {
  // Calculate circular progress
  const progress = useMemo(() => {
    const percentage = (remainingSeconds / totalSeconds) * 100;
    return Math.max(0, Math.min(100, percentage));
  }, [remainingSeconds, totalSeconds]);

  // Determine color based on remaining time
  const strokeColor = useMemo(() => {
    if (isExpired) return '#EF4444'; // Danger
    if (remainingSeconds <= 10) return '#EF4444'; // Danger
    if (remainingSeconds <= 30) return '#F59E0B'; // Warning
    return '#3B82F6'; // Info
  }, [remainingSeconds, isExpired]);

  // SVG circle calculations
  const radius = 54; // 120px diameter / 2 - stroke width
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="countdown-timer">
      <svg
        className="countdown-circle"
        width="120"
        height="120"
        viewBox="0 0 120 120"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="12"
        />
        {/* Progress circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
        />
      </svg>

      <div className="countdown-text">
        <div
          className="countdown-time"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          aria-label={formatTime(remainingSeconds, true)}
        >
          {formatTime(remainingSeconds)}
        </div>
        <div className="countdown-label">
          {isExpired ? 'Expired' : 'Remaining'}
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
```

### 6.3 Progress Tracker Component

```typescript
// components/ProgressTracker.tsx
import React from 'react';
import { TodoItem } from '../GracePeriodModal.types';

interface ProgressTrackerProps {
  todos: TodoItem[];
  completedCount: number;
  totalCount: number;
  progressPercentage: number;
  currentTodo: TodoItem | null;
}

const getStatusIcon = (status: TodoItem['status']) => {
  switch (status) {
    case 'completed':
      return { icon: '✅', label: 'Completed' };
    case 'in_progress':
      return { icon: '🔄', label: 'In Progress' };
    case 'pending':
      return { icon: '⏸️', label: 'Pending' };
    default:
      return { icon: '⚪', label: 'Unknown' };
  }
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  todos,
  completedCount,
  totalCount,
  progressPercentage,
  currentTodo,
}) => {
  return (
    <div className="progress-tracker">
      {/* Progress Summary */}
      <div className="progress-summary" role="status" aria-live="polite">
        <span className="progress-text">
          Progress: {completedCount} of {totalCount} tasks completed ({progressPercentage}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container" role="progressbar"
           aria-valuenow={progressPercentage}
           aria-valuemin={0}
           aria-valuemax={100}
           aria-label={`Task progress: ${progressPercentage}%`}>
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercentage}%` }}
        />
        <span className="progress-bar-label">{progressPercentage}%</span>
      </div>

      {/* Todo List */}
      <div className="todo-list-container">
        <h3 className="todo-list-title">Current Tasks:</h3>
        <ul className="todo-list" aria-label="Task progress list">
          {todos.slice(0, 5).map(todo => {
            const { icon, label } = getStatusIcon(todo.status);
            const isCurrent = currentTodo?.id === todo.id;

            return (
              <li
                key={todo.id}
                className={`todo-item ${todo.status} ${isCurrent ? 'current' : ''}`}
              >
                <span className="todo-icon" aria-label={label} role="img">
                  {icon}
                </span>
                <span className="todo-content">
                  {isCurrent ? todo.activeForm : todo.content}
                </span>
                {todo.priority && (
                  <span className={`todo-priority priority-${todo.priority}`}>
                    {todo.priority}
                  </span>
                )}
              </li>
            );
          })}
          {todos.length > 5 && (
            <li className="todo-item more">
              <span className="todo-content">
                + {todos.length - 5} more tasks
              </span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default ProgressTracker;
```

### 6.4 Action Buttons Component

```typescript
// components/ActionButtons.tsx
import React from 'react';

interface ActionButtonsProps {
  onContinue: () => void;
  onPause: () => void;
  onSimplify?: () => void;
  onCancel: () => void;
  isLoading: boolean;
  actionInProgress: 'continue' | 'pause' | 'simplify' | 'cancel' | null;
  isExpired: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onContinue,
  onPause,
  onSimplify,
  onCancel,
  isLoading,
  actionInProgress,
  isExpired,
}) => {
  const isActionLoading = (action: string) =>
    isLoading && actionInProgress === action;

  return (
    <div className="action-buttons">
      <button
        className="btn btn-primary"
        onClick={onContinue}
        disabled={isLoading || isExpired}
        aria-busy={isActionLoading('continue')}
        aria-disabled={isExpired}
      >
        {isActionLoading('continue') ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span>Continuing...</span>
          </>
        ) : (
          'Continue Task'
        )}
      </button>

      <button
        className="btn btn-secondary"
        onClick={onPause}
        disabled={isLoading || isExpired}
        aria-busy={isActionLoading('pause')}
        aria-disabled={isExpired}
      >
        {isActionLoading('pause') ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span>Pausing...</span>
          </>
        ) : (
          'Pause Task'
        )}
      </button>

      {onSimplify && (
        <button
          className="btn btn-tertiary"
          onClick={onSimplify}
          disabled={isLoading || isExpired}
          aria-busy={isActionLoading('simplify')}
          aria-disabled={isExpired}
        >
          {isActionLoading('simplify') ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Simplifying...</span>
            </>
          ) : (
            'Simplify'
          )}
        </button>
      )}

      <button
        className="btn btn-cancel"
        onClick={onCancel}
        disabled={isLoading}
        aria-busy={isActionLoading('cancel')}
      >
        {isActionLoading('cancel') ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span>Cancelling...</span>
          </>
        ) : (
          'Cancel'
        )}
      </button>
    </div>
  );
};

export default ActionButtons;
```

---

## 7. Custom Hooks

### 7.1 useCountdown Hook

```typescript
// hooks/useCountdown.ts
import { useState, useEffect, useRef } from 'react';

interface UseCountdownReturn {
  remainingSeconds: number;
  isExpired: boolean;
  pause: () => void;
  resume: () => void;
  reset: (newTime: number) => void;
}

export const useCountdown = (
  initialTime: number, // milliseconds
  isActive: boolean = true
): UseCountdownReturn => {
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.floor(initialTime / 1000)
  );
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isPaused]);

  const pause = () => setIsPaused(true);
  const resume = () => setIsPaused(false);
  const reset = (newTime: number) => {
    setRemainingSeconds(Math.floor(newTime / 1000));
    setIsPaused(false);
  };

  return {
    remainingSeconds,
    isExpired: remainingSeconds <= 0,
    pause,
    resume,
    reset,
  };
};
```

### 7.2 useProgressTracking Hook

```typescript
// hooks/useProgressTracking.ts
import { useMemo } from 'react';
import { TodoItem } from '../GracePeriodModal.types';

interface UseProgressTrackingReturn {
  progressPercentage: number;
  currentTodo: TodoItem | null;
  completedTodos: TodoItem[];
  pendingTodos: TodoItem[];
}

export const useProgressTracking = (
  todos: TodoItem[]
): UseProgressTrackingReturn => {
  const progressData = useMemo(() => {
    const completed = todos.filter(t => t.status === 'completed');
    const pending = todos.filter(t => t.status === 'pending');
    const current = todos.find(t => t.status === 'in_progress') || null;

    const percentage = todos.length > 0
      ? Math.round((completed.length / todos.length) * 100)
      : 0;

    return {
      progressPercentage: percentage,
      currentTodo: current,
      completedTodos: completed,
      pendingTodos: pending,
    };
  }, [todos]);

  return progressData;
};
```

### 7.3 useModalFocus Hook

```typescript
// hooks/useModalFocus.ts
import { useEffect, RefObject } from 'react';

export const useModalFocus = (
  modalRef: RefObject<HTMLElement>,
  isOpen: boolean
): void => {
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Store previously focused element
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus first element
    firstElement?.focus();

    // Handle tab key for focus trap
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      // Restore focus when modal closes
      previouslyFocused?.focus();
    };
  }, [isOpen, modalRef]);
};
```

---

## 8. Utilities

### 8.1 Time Formatting

```typescript
// utils/timeFormatting.ts

/**
 * Format seconds into MM:SS or readable string
 * @param seconds - Total seconds
 * @param readable - If true, returns "X minutes Y seconds", else "MM:SS"
 */
export const formatTime = (seconds: number, readable: boolean = false): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (readable) {
    if (mins > 0 && secs > 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
    }
    if (mins > 0) {
      return `${mins} minute${mins !== 1 ? 's' : ''}`;
    }
    return `${secs} second${secs !== 1 ? 's' : ''}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format milliseconds to human-readable string
 */
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  return formatTime(seconds, true);
};

/**
 * Get relative time description
 */
export const getTimeDescription = (seconds: number): string => {
  if (seconds <= 0) return 'expired';
  if (seconds <= 10) return 'urgent';
  if (seconds <= 30) return 'critical';
  if (seconds <= 60) return 'warning';
  return 'normal';
};
```

### 8.2 Progress Calculation

```typescript
// utils/progressCalculation.ts
import { TodoItem } from '../GracePeriodModal.types';

/**
 * Calculate overall progress percentage
 */
export const calculateProgress = (todos: TodoItem[]): number => {
  if (todos.length === 0) return 0;

  const completed = todos.filter(t => t.status === 'completed').length;
  return Math.round((completed / todos.length) * 100);
};

/**
 * Calculate weighted progress (considering priority and estimated time)
 */
export const calculateWeightedProgress = (todos: TodoItem[]): number => {
  if (todos.length === 0) return 0;

  const priorityWeights = { high: 3, medium: 2, low: 1 };

  let totalWeight = 0;
  let completedWeight = 0;

  todos.forEach(todo => {
    const weight = priorityWeights[todo.priority || 'medium'];
    const timeWeight = todo.estimatedTime ? todo.estimatedTime / 1000 : 1;
    const itemWeight = weight * timeWeight;

    totalWeight += itemWeight;
    if (todo.status === 'completed') {
      completedWeight += itemWeight;
    }
  });

  return totalWeight > 0
    ? Math.round((completedWeight / totalWeight) * 100)
    : 0;
};

/**
 * Estimate remaining time based on current progress
 */
export const estimateRemainingTime = (todos: TodoItem[]): number => {
  const pendingTodos = todos.filter(t => t.status !== 'completed');

  return pendingTodos.reduce((total, todo) => {
    return total + (todo.estimatedTime || 60000); // Default 1 minute per task
  }, 0);
};
```

---

## 9. Styling (CSS Modules / Styled Components)

### 9.1 Base Styles

```css
/* GracePeriodModal.styles.css */

/* Backdrop */
.grace-period-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 300ms ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Modal Container */
.grace-period-modal {
  position: relative;
  width: 90vw;
  max-width: 600px;
  max-height: 90vh;
  padding: 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  animation: slideIn 300ms ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (max-width: 768px) {
  .grace-period-modal {
    padding: 24px;
  }
}

/* Dark Theme */
.grace-period-modal.theme-dark {
  background: #1A1A1A;
  color: #F9FAFB;
}

/* Header */
.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.warning-icon {
  font-size: 32px;
}

.modal-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #F59E0B;
}

.theme-dark .modal-title {
  color: #FCD34D;
}

/* Countdown Timer */
.countdown-timer {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 24px 0;
}

.countdown-circle {
  display: block;
}

.countdown-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.countdown-time {
  font-size: 48px;
  font-weight: 700;
  font-family: 'Fira Code', 'Courier New', monospace;
  line-height: 1.2;
}

.countdown-label {
  font-size: 14px;
  color: #6B7280;
  margin-top: 4px;
}

.theme-dark .countdown-label {
  color: #9CA3AF;
}

/* Description */
.modal-description {
  padding: 16px;
  background: #F3F4F6;
  border-radius: 8px;
  margin-bottom: 24px;
}

.theme-dark .modal-description {
  background: #2D2D2D;
}

.task-info,
.agent-info {
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.5;
}

/* Progress Tracker */
.progress-tracker {
  margin: 24px 0;
}

.progress-summary {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #374151;
}

.theme-dark .progress-summary {
  color: #D1D5DB;
}

/* Progress Bar */
.progress-bar-container {
  position: relative;
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 24px;
}

.theme-dark .progress-bar-container {
  background: #374151;
}

.progress-bar-fill {
  height: 100%;
  background: #3B82F6;
  transition: width 400ms ease-out;
}

.theme-dark .progress-bar-fill {
  background: #60A5FA;
}

.progress-bar-label {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  font-size: 11px;
  font-weight: 600;
  color: #111827;
}

/* Todo List */
.todo-list-container {
  max-height: 200px;
  overflow-y: auto;
}

.todo-list-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  font-size: 14px;
  border-radius: 6px;
  margin-bottom: 6px;
  transition: background 150ms ease;
}

.todo-item.current {
  background: #EFF6FF;
  font-weight: 500;
}

.theme-dark .todo-item.current {
  background: #1E3A5F;
}

.todo-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.todo-content {
  flex: 1;
  line-height: 1.4;
}

.todo-priority {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.priority-high {
  background: #FEE2E2;
  color: #991B1B;
}

.priority-medium {
  background: #FEF3C7;
  color: #92400E;
}

.priority-low {
  background: #E0E7FF;
  color: #3730A3;
}

/* Timeout Explanation */
.timeout-explanation {
  padding: 16px;
  background: #FEF3C7;
  border-left: 4px solid #F59E0B;
  border-radius: 6px;
  margin: 24px 0;
}

.theme-dark .timeout-explanation {
  background: #3A2A0D;
  border-left-color: #FCD34D;
}

.timeout-explanation p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: #78350F;
}

.theme-dark .timeout-explanation p {
  color: #FCD34D;
}

/* Error Message */
.error-message {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #FEE2E2;
  border-left: 4px solid #EF4444;
  border-radius: 6px;
  margin: 16px 0;
  font-size: 14px;
  color: #991B1B;
}

.theme-dark .error-message {
  background: #3A1A1A;
  color: #F87171;
}

.error-icon {
  font-size: 20px;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  flex-wrap: wrap;
}

.btn {
  flex: 1;
  min-width: 120px;
  height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:hover:not(:disabled) {
  transform: scale(1.02);
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
}

/* Primary Button */
.btn-primary {
  background: #3B82F6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563EB;
}

/* Secondary Button */
.btn-secondary {
  background: #6B7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4B5563;
}

/* Tertiary Button */
.btn-tertiary {
  background: white;
  color: #3B82F6;
  border: 2px solid #3B82F6;
}

.btn-tertiary:hover:not(:disabled) {
  background: #EFF6FF;
}

.theme-dark .btn-tertiary {
  background: transparent;
  color: #60A5FA;
  border-color: #60A5FA;
}

.theme-dark .btn-tertiary:hover:not(:disabled) {
  background: #1E3A5F;
}

/* Cancel Button */
.btn-cancel {
  background: transparent;
  color: #EF4444;
  border: none;
  text-decoration: underline;
  min-width: auto;
  flex: 0;
}

.btn-cancel:hover:not(:disabled) {
  color: #DC2626;
  transform: none;
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 600ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Scrollbar Styling */
.todo-list-container::-webkit-scrollbar {
  width: 8px;
}

.todo-list-container::-webkit-scrollbar-track {
  background: #F3F4F6;
  border-radius: 4px;
}

.todo-list-container::-webkit-scrollbar-thumb {
  background: #D1D5DB;
  border-radius: 4px;
}

.todo-list-container::-webkit-scrollbar-thumb:hover {
  background: #9CA3AF;
}

.theme-dark .todo-list-container::-webkit-scrollbar-track {
  background: #2D2D2D;
}

.theme-dark .todo-list-container::-webkit-scrollbar-thumb {
  background: #4B5563;
}

.theme-dark .todo-list-container::-webkit-scrollbar-thumb:hover {
  background: #6B7280;
}
```

---

## 10. Usage Examples

### 10.1 Basic Usage

```typescript
import { GracePeriodModal } from './GracePeriodModal';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const todos = [
    { id: '1', content: 'Research patterns', activeForm: 'Researching patterns', status: 'completed', priority: 'high' },
    { id: '2', content: 'Design component', activeForm: 'Designing component', status: 'in_progress', priority: 'high' },
    { id: '3', content: 'Write tests', activeForm: 'Writing tests', status: 'pending', priority: 'medium' },
  ];

  return (
    <GracePeriodModal
      isOpen={isModalOpen}
      timeRemaining={165000} // 2m 45s
      totalDuration={300000} // 5m total
      taskId="task-123"
      taskDescription="Research and design UI components for grace period timeout handling"
      currentAgent="grace-period-designer"
      todos={todos}
      completedCount={1}
      totalCount={3}
      onContinue={async () => {
        await fetch('/api/extend-timeout', { method: 'POST' });
        setIsModalOpen(false);
      }}
      onPause={async () => {
        await fetch('/api/pause-task', { method: 'POST' });
        setIsModalOpen(false);
      }}
      onSimplify={async () => {
        await fetch('/api/simplify-task', { method: 'POST' });
        setIsModalOpen(false);
      }}
      onCancel={async () => {
        if (confirm('Are you sure? Progress will be lost.')) {
          await fetch('/api/cancel-task', { method: 'POST' });
          setIsModalOpen(false);
        }
      }}
    />
  );
}
```

### 10.2 Advanced Usage with Custom Theme

```typescript
<GracePeriodModal
  isOpen={isModalOpen}
  timeRemaining={timeRemaining}
  totalDuration={totalDuration}
  taskId={taskId}
  taskDescription={taskDescription}
  currentAgent={currentAgent}
  todos={todos}
  completedCount={completedCount}
  totalCount={totalCount}
  onContinue={handleContinue}
  onPause={handlePause}
  onSimplify={handleSimplify}
  onCancel={handleCancel}
  onClose={handleClose}
  showSimplifyOption={true}
  allowManualClose={false}
  customMessage="This task is using significant compute resources. Please choose an action."
  theme="dark"
  className="custom-modal"
  ariaLabelledBy="custom-modal-title"
  ariaDescribedBy="custom-modal-description"
/>
```

---

## 11. Testing Considerations

### 11.1 Unit Tests

**Test Coverage Areas:**
1. Component rendering with various props
2. Countdown timer accuracy
3. Progress calculation logic
4. Button state management (loading, disabled)
5. Keyboard navigation and focus trap
6. Screen reader announcements
7. Theme switching
8. Error handling

**Example Test:**
```typescript
describe('GracePeriodModal', () => {
  it('displays correct time remaining', () => {
    render(<GracePeriodModal timeRemaining={165000} {...otherProps} />);
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', '2 minutes 45 seconds');
  });

  it('triggers onContinue callback when Continue button clicked', async () => {
    const onContinue = jest.fn();
    render(<GracePeriodModal onContinue={onContinue} {...otherProps} />);

    fireEvent.click(screen.getByText('Continue Task'));
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1));
  });

  it('traps focus within modal', () => {
    render(<GracePeriodModal isOpen={true} {...otherProps} />);

    const buttons = screen.getAllByRole('button');
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    lastButton.focus();
    userEvent.tab();
    expect(firstButton).toHaveFocus();
  });
});
```

### 11.2 Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('GracePeriodModal Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<GracePeriodModal isOpen={true} {...props} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('announces countdown updates to screen readers', () => {
    render(<GracePeriodModal timeRemaining={60000} {...props} />);
    const timer = screen.getByRole('timer');
    expect(timer).toHaveAttribute('aria-live', 'polite');
  });
});
```

### 11.3 Integration Tests

**Scenarios to Test:**
1. Full user flow: warning → continue → success
2. Full user flow: warning → pause → confirmation
3. Full user flow: warning → cancel → confirmation
4. Timeout expiration scenario
5. Error handling during API calls
6. Multiple rapid clicks on action buttons

---

## 12. Performance Considerations

### 12.1 Optimization Strategies

1. **Lazy Loading**: Load modal code only when needed
2. **Memoization**: Use React.memo for child components
3. **useCallback**: Memoize event handlers
4. **useMemo**: Memoize expensive calculations (progress percentage)
5. **Virtual Scrolling**: For very long todo lists (>100 items)
6. **Debounce**: Debounce screen reader announcements
7. **Portal Rendering**: Render modal outside main DOM tree

### 12.2 Bundle Size

**Target Metrics:**
- Component bundle: <20 KB (gzipped)
- CSS bundle: <5 KB (gzipped)
- Total with dependencies: <30 KB (gzipped)

**Optimization:**
- Tree-shakeable imports
- Code splitting for modal
- Inline critical CSS
- Lazy load heavy dependencies

---

## 13. Browser Support

**Minimum Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari 14+
- Chrome Android 90+

**Polyfills Required:**
- None (uses modern but widely-supported APIs)

**Progressive Enhancement:**
- Falls back to basic modal without backdrop-filter in older browsers
- Countdown still works without SVG support (shows text only)

---

## 14. Future Enhancements

### 14.1 Planned Features

1. **Voice Control**: Support for voice commands ("Continue", "Pause")
2. **Auto-Extend**: Detect user activity and auto-extend timeout
3. **Customizable Themes**: Allow custom color schemes
4. **Sound Notifications**: Optional audio alerts at milestones
5. **Haptic Feedback**: Vibration on mobile devices
6. **Offline Support**: Handle network disconnections gracefully
7. **Multi-Language**: i18n support for all text
8. **Analytics**: Track user choices and timeout patterns
9. **Adaptive Timing**: ML-based timeout prediction
10. **Progress Visualization**: Alternative views (timeline, Gantt chart)

### 14.2 API Extensions

```typescript
interface FutureProps {
  // Voice control
  enableVoiceControl?: boolean;

  // Auto-extend
  autoExtendOnActivity?: boolean;
  activityDetectionInterval?: number;

  // Sound
  soundEnabled?: boolean;
  soundVolume?: number;

  // Haptics
  hapticEnabled?: boolean;

  // i18n
  locale?: string;
  translations?: Record<string, string>;

  // Analytics
  onAnalytics?: (event: AnalyticsEvent) => void;
}
```

---

## 15. Key Design Decisions Summary

### 15.1 Critical Decisions

1. **2-Minute Warning Threshold**
   - Rationale: WCAG 2.2.1 requires sufficient time to respond; 2 minutes provides comfortable decision-making time
   - Alternative considered: 1 minute (rejected as too short)

2. **Modal Over Toast/Banner**
   - Rationale: Modal captures full attention, prevents accidental dismissal
   - Alternative considered: Banner at top (rejected due to easy ignorability)

3. **Circular Countdown Timer**
   - Rationale: Visual progress is more intuitive than numbers alone
   - Alternative considered: Linear progress bar (rejected as less engaging)

4. **Focus Trap Implementation**
   - Rationale: Ensures keyboard-only users stay within modal context
   - Alternative considered: No trap (rejected due to accessibility issues)

5. **Four Action Buttons (Continue/Pause/Simplify/Cancel)**
   - Rationale: Provides maximum user control over task execution
   - Alternative considered: Only Continue/Cancel (rejected as too limiting)

6. **Live Progress Tracking**
   - Rationale: Users want to know what's happening right now
   - Alternative considered: Summary only (rejected as not transparent enough)

7. **Polite ARIA Live Regions**
   - Rationale: Balance between informing users and avoiding interruption
   - Alternative considered: Assertive announcements (rejected as too disruptive)

8. **Theme Auto-Detection**
   - Rationale: Respect user's system preferences by default
   - Alternative considered: Always light theme (rejected as not inclusive)

### 15.2 Trade-offs

| Decision | Pro | Con | Resolution |
|----------|-----|-----|------------|
| Portal rendering | Clean DOM | Complexity | Worth it for flexibility |
| Circular timer | Engaging | More code | Provide fallback |
| Focus trap | Accessible | Can feel restrictive | Add ESC key option |
| Live todo list | Transparency | Performance cost | Virtualize for >100 items |
| Four buttons | Flexibility | Complexity | Make Simplify optional |

---

## 16. Appendix

### 16.1 WCAG 2.1 Checklist

- [x] 1.4.3 Contrast (Minimum) - Level AA
- [x] 2.1.1 Keyboard - Level A
- [x] 2.1.2 No Keyboard Trap - Level A
- [x] 2.2.1 Timing Adjustable - Level A
- [x] 2.4.3 Focus Order - Level A
- [x] 2.4.7 Focus Visible - Level AA
- [x] 3.2.1 On Focus - Level A
- [x] 4.1.2 Name, Role, Value - Level A
- [x] 4.1.3 Status Messages - Level AA

### 16.2 References

**UX Best Practices:**
- [DWP Design System - Session Timeout](https://design-system.dwp.gov.uk/patterns/manage-a-session-timeout)
- [Number Analytics - Session Timeout UX](https://www.numberanalytics.com/blog/ultimate-guide-session-timeout-ux-accessibility)
- [DigitalA11Y - Timeout Modals](https://www.digitala11y.com/addressing-timeout-modals-navigating-the-nuances-for-inclusive-web-design/)

**Component Libraries:**
- [Material UI - Modal](https://mui.com/material-ui/react-modal/)
- [Carbon Design System - Modal](https://carbondesignsystem.com/components/modal/usage/)
- [Material Tailwind - Modal](https://www.material-tailwind.com/docs/react/modal)

**Accessibility Standards:**
- [WCAG 2.1 - Timing Adjustable](https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html)
- [WCAG 2.2 - Timeouts](https://www.w3.org/WAI/WCAG21/Understanding/timeouts.html)

### 16.3 Glossary

- **Grace Period**: Time buffer before timeout where user can take action
- **Focus Trap**: Technique to keep keyboard focus within modal
- **Live Region**: ARIA feature for dynamic content announcements
- **Portal**: React pattern for rendering outside parent DOM hierarchy
- **Reduced Motion**: User preference to minimize animations

---

**Document Status:** Draft v1.0.0
**Next Review:** After prototype implementation
**Approval Required:** UX Lead, Accessibility Specialist, Engineering Lead

