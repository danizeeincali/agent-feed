/**
 * Accessibility Media Controls Tests - London School TDD
 * 
 * Tests media control accessibility using behavior-driven mocks.
 * Focuses on ARIA compliance, keyboard navigation, and screen reader support.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Dependencies (London School - Accessibility service contracts)
interface ScreenReaderAPI {
  announce(message: string, priority?: 'polite' | 'assertive'): void;
  setLabel(element: HTMLElement, label: string): void;
  setDescription(element: HTMLElement, description: string): void;
  setRole(element: HTMLElement, role: string): void;
  setLiveRegion(element: HTMLElement, setting: 'polite' | 'assertive' | 'off'): void;
}

interface KeyboardNavigationHandler {
  registerShortcut(key: string, action: KeyboardAction): void;
  unregisterShortcut(key: string): void;
  handleNavigation(direction: NavigationDirection): void;
  setFocusTrap(container: HTMLElement, enabled: boolean): void;
  getFocusableElements(container: HTMLElement): HTMLElement[];
  moveFocus(direction: 'next' | 'previous' | 'first' | 'last'): void;
}

interface ARIAManager {
  setAttributes(element: HTMLElement, attributes: ARIAAttributes): void;
  updateState(element: HTMLElement, state: ARIAState): void;
  setExpanded(element: HTMLElement, expanded: boolean): void;
  setPressed(element: HTMLElement, pressed: boolean): void;
  setSelected(element: HTMLElement, selected: boolean): void;
  announceChange(element: HTMLElement, change: string): void;
}

interface FocusManager {
  setInitialFocus(container: HTMLElement): void;
  restoreFocus(): void;
  trapFocus(container: HTMLElement): void;
  releaseFocusTrap(): void;
  isElementFocusable(element: HTMLElement): boolean;
  getTabIndex(element: HTMLElement): number;
}

interface ColorContrastChecker {
  checkContrast(foreground: string, background: string): ContrastResult;
  meetsWCAG(level: 'AA' | 'AAA', ratio: number): boolean;
  suggestImprovements(element: HTMLElement): ContrastSuggestion[];
  validateElementContrast(element: HTMLElement): boolean;
}

interface TextScalingManager {
  testScaling(element: HTMLElement, scale: number): ScalingResult;
  ensureMinimumSize(element: HTMLElement, minSize: number): void;
  checkTextOverflow(element: HTMLElement): boolean;
  adaptToZoom(container: HTMLElement, zoomLevel: number): void;
}

// Type definitions
interface KeyboardAction {
  action: string;
  handler: () => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'home' | 'end';

interface ARIAAttributes {
  role?: string;
  label?: string;
  describedby?: string;
  labelledby?: string;
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: string;
}

interface ARIAState {
  expanded?: boolean;
  pressed?: boolean;
  selected?: boolean;
  checked?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

interface ContrastResult {
  ratio: number;
  level: 'AA' | 'AAA' | 'fail';
  passes: boolean;
}

interface ContrastSuggestion {
  property: 'foreground' | 'background';
  currentValue: string;
  suggestedValue: string;
  improvement: number;
}

interface ScalingResult {
  fits: boolean;
  overflows: boolean;
  recommendedSize: number;
}

// System Under Test
interface AccessibleMediaControlsProps {
  videoTitle: string;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  volume?: number;
  isMuted?: boolean;
  isFullscreen?: boolean;
  hasSubtitles?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onVolumeChange?: (volume: number) => void;
  onMute?: () => void;
  onFullscreen?: () => void;
  onToggleSubtitles?: () => void;
  // Injected dependencies
  screenReader: ScreenReaderAPI;
  keyboardHandler: KeyboardNavigationHandler;
  ariaManager: ARIAManager;
  focusManager: FocusManager;
  contrastChecker: ColorContrastChecker;
  textScaling: TextScalingManager;
}

const AccessibleMediaControls: React.FC<AccessibleMediaControlsProps> = ({
  videoTitle,
  isPlaying = false,
  currentTime = 0,
  duration = 300,
  volume = 1,
  isMuted = false,
  isFullscreen = false,
  hasSubtitles = false,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onMute,
  onFullscreen,
  onToggleSubtitles,
  screenReader,
  keyboardHandler,
  ariaManager,
  focusManager,
  contrastChecker,
  textScaling
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const playButtonRef = React.useRef<HTMLButtonElement>(null);
  const progressRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setupAccessibility();
    setupKeyboardShortcuts();
    
    return cleanup;
  }, []);

  React.useEffect(() => {
    updatePlaybackState();
  }, [isPlaying, currentTime]);

  const setupAccessibility = () => {
    if (!containerRef.current) return;

    // Contract: Set up ARIA attributes through ARIAManager
    ariaManager.setAttributes(containerRef.current, {
      role: 'region',
      label: `Video player controls for ${videoTitle}`,
      live: 'polite'
    });

    // Contract: Set up focus management
    focusManager.setInitialFocus(containerRef.current);

    // Contract: Validate contrast for all controls
    const buttons = containerRef.current.querySelectorAll('button');
    buttons.forEach(button => {
      const isValid = contrastChecker.validateElementContrast(button as HTMLElement);
      if (!isValid) {
        const suggestions = contrastChecker.suggestImprovements(button as HTMLElement);
        console.warn('Contrast issue detected:', suggestions);
      }
    });
  };

  const setupKeyboardShortcuts = () => {
    // Contract: Register keyboard shortcuts through KeyboardNavigationHandler
    keyboardHandler.registerShortcut('space', {
      action: 'toggle_playback',
      handler: handlePlayPause,
      preventDefault: true
    });

    keyboardHandler.registerShortcut('ArrowLeft', {
      action: 'seek_backward',
      handler: () => handleSeek(Math.max(0, currentTime - 10)),
      preventDefault: true
    });

    keyboardHandler.registerShortcut('ArrowRight', {
      action: 'seek_forward',
      handler: () => handleSeek(Math.min(duration, currentTime + 10)),
      preventDefault: true
    });

    keyboardHandler.registerShortcut('m', {
      action: 'toggle_mute',
      handler: handleMute,
      preventDefault: true
    });

    keyboardHandler.registerShortcut('f', {
      action: 'toggle_fullscreen',
      handler: handleFullscreen,
      preventDefault: true
    });

    keyboardHandler.registerShortcut('c', {
      action: 'toggle_captions',
      handler: handleToggleSubtitles,
      preventDefault: true
    });
  };

  const cleanup = () => {
    // Contract: Unregister shortcuts and clean up focus
    keyboardHandler.unregisterShortcut('space');
    keyboardHandler.unregisterShortcut('ArrowLeft');
    keyboardHandler.unregisterShortcut('ArrowRight');
    keyboardHandler.unregisterShortcut('m');
    keyboardHandler.unregisterShortcut('f');
    keyboardHandler.unregisterShortcut('c');
    
    focusManager.releaseFocusTrap();
  };

  const updatePlaybackState = () => {
    if (!playButtonRef.current) return;

    // Contract: Update ARIA state through ARIAManager
    ariaManager.updateState(playButtonRef.current, {
      pressed: isPlaying
    });

    // Contract: Announce state changes through ScreenReader
    const message = isPlaying ? 'Video playing' : 'Video paused';
    screenReader.announce(message, 'polite');

    // Update progress for screen readers
    if (progressRef.current) {
      const percentage = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
      ariaManager.setAttributes(progressRef.current, {
        label: `Video progress: ${percentage}% played, ${formatTime(currentTime)} of ${formatTime(duration)}`
      });
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  };

  const handleSeek = (time: number) => {
    onSeek?.(time);
    
    // Contract: Announce seek action
    screenReader.announce(
      `Seeked to ${formatTime(time)}`,
      'assertive'
    );
  };

  const handleVolumeChange = (newVolume: number) => {
    onVolumeChange?.(newVolume);
    
    // Contract: Announce volume change
    const volumePercent = Math.round(newVolume * 100);
    screenReader.announce(
      `Volume set to ${volumePercent}%`,
      'polite'
    );
  };

  const handleMute = () => {
    onMute?.();
    
    // Contract: Announce mute state
    const message = !isMuted ? 'Audio muted' : 'Audio unmuted';
    screenReader.announce(message, 'assertive');
  };

  const handleFullscreen = () => {
    onFullscreen?.();
    
    // Contract: Announce fullscreen state
    const message = !isFullscreen ? 'Entered fullscreen' : 'Exited fullscreen';
    screenReader.announce(message, 'assertive');
  };

  const handleToggleSubtitles = () => {
    onToggleSubtitles?.();
    
    // Contract: Announce subtitle state
    const message = !hasSubtitles ? 'Subtitles enabled' : 'Subtitles disabled';
    screenReader.announce(message, 'polite');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      data-testid="accessible-media-controls"
      className="media-controls"
      role="region"
      aria-label={`Video player controls for ${videoTitle}`}
    >
      {/* Video Information */}
      <div className="sr-only" aria-live="polite">
        Currently playing: {videoTitle}
      </div>

      {/* Play/Pause Button */}
      <button
        ref={playButtonRef}
        data-testid="play-pause-button"
        onClick={handlePlayPause}
        aria-label={isPlaying ? `Pause ${videoTitle}` : `Play ${videoTitle}`}
        aria-pressed={isPlaying}
        className="control-button play-pause"
      >
        <span aria-hidden="true">
          {isPlaying ? '⏸️' : '▶️'}
        </span>
        <span className="sr-only">
          {isPlaying ? 'Pause' : 'Play'}
        </span>
      </button>

      {/* Progress Bar */}
      <div className="progress-container">
        <div
          ref={progressRef}
          data-testid="progress-bar"
          className="progress-bar"
          role="progressbar"
          aria-label={`Video progress: ${Math.round(progressPercentage)}% played`}
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              handleSeek(Math.max(0, currentTime - 10));
            } else if (e.key === 'ArrowRight') {
              handleSeek(Math.min(duration, currentTime + 10));
            }
          }}
        >
          <div
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="time-display" aria-live="polite">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="volume-container">
        <button
          data-testid="mute-button"
          onClick={handleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          aria-pressed={isMuted}
          className="control-button mute"
        >
          <span aria-hidden="true">
            {isMuted ? '🔇' : '🔊'}
          </span>
          <span className="sr-only">
            {isMuted ? 'Unmute' : 'Mute'}
          </span>
        </button>
        
        <input
          data-testid="volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          aria-label="Volume level"
          aria-valuetext={`Volume at ${Math.round(volume * 100)}%`}
          className="volume-slider"
        />
      </div>

      {/* Subtitles Toggle */}
      <button
        data-testid="subtitles-button"
        onClick={handleToggleSubtitles}
        aria-label={hasSubtitles ? 'Disable subtitles' : 'Enable subtitles'}
        aria-pressed={hasSubtitles}
        className="control-button subtitles"
      >
        <span aria-hidden="true">CC</span>
        <span className="sr-only">
          {hasSubtitles ? 'Disable subtitles' : 'Enable subtitles'}
        </span>
      </button>

      {/* Fullscreen Toggle */}
      <button
        data-testid="fullscreen-button"
        onClick={handleFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        aria-pressed={isFullscreen}
        className="control-button fullscreen"
      >
        <span aria-hidden="true">
          {isFullscreen ? '🗗' : '🗖'}
        </span>
        <span className="sr-only">
          {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        </span>
      </button>

      {/* Keyboard Shortcuts Help */}
      <div className="sr-only">
        <h3>Keyboard shortcuts:</h3>
        <ul>
          <li>Spacebar: Play/Pause</li>
          <li>Left arrow: Seek backward 10 seconds</li>
          <li>Right arrow: Seek forward 10 seconds</li>
          <li>M: Toggle mute</li>
          <li>F: Toggle fullscreen</li>
          <li>C: Toggle captions</li>
        </ul>
      </div>
    </div>
  );
};

// Test Suite
describe('Accessible Media Controls - London School TDD', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockScreenReader: ScreenReaderAPI;
  let mockKeyboardHandler: KeyboardNavigationHandler;
  let mockARIAManager: ARIAManager;
  let mockFocusManager: FocusManager;
  let mockContrastChecker: ColorContrastChecker;
  let mockTextScaling: TextScalingManager;

  const defaultProps = {
    videoTitle: 'Test Video for Accessibility',
    screenReader: {} as ScreenReaderAPI,
    keyboardHandler: {} as KeyboardNavigationHandler,
    ariaManager: {} as ARIAManager,
    focusManager: {} as FocusManager,
    contrastChecker: {} as ColorContrastChecker,
    textScaling: {} as TextScalingManager
  };

  beforeEach(() => {
    user = userEvent.setup();

    mockScreenReader = {
      announce: vi.fn(),
      setLabel: vi.fn(),
      setDescription: vi.fn(),
      setRole: vi.fn(),
      setLiveRegion: vi.fn()
    };

    mockKeyboardHandler = {
      registerShortcut: vi.fn(),
      unregisterShortcut: vi.fn(),
      handleNavigation: vi.fn(),
      setFocusTrap: vi.fn(),
      getFocusableElements: vi.fn(),
      moveFocus: vi.fn()
    };

    mockARIAManager = {
      setAttributes: vi.fn(),
      updateState: vi.fn(),
      setExpanded: vi.fn(),
      setPressed: vi.fn(),
      setSelected: vi.fn(),
      announceChange: vi.fn()
    };

    mockFocusManager = {
      setInitialFocus: vi.fn(),
      restoreFocus: vi.fn(),
      trapFocus: vi.fn(),
      releaseFocusTrap: vi.fn(),
      isElementFocusable: vi.fn(),
      getTabIndex: vi.fn()
    };

    mockContrastChecker = {
      checkContrast: vi.fn(),
      meetsWCAG: vi.fn(),
      suggestImprovements: vi.fn(),
      validateElementContrast: vi.fn()
    };

    mockTextScaling = {
      testScaling: vi.fn(),
      ensureMinimumSize: vi.fn(),
      checkTextOverflow: vi.fn(),
      adaptToZoom: vi.fn()
    };
  });

  describe('ARIA Compliance Setup', () => {
    // Contract Test: Should set up ARIA attributes through ARIAManager
    it('should configure ARIA attributes through ARIAManager on mount', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      render(
        <AccessibleMediaControls
          {...defaultProps}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      expect(mockARIAManager.setAttributes).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        {
          role: 'region',
          label: 'Video player controls for Test Video for Accessibility',
          live: 'polite'
        }
      );
    });

    // Contract Test: Should set up initial focus through FocusManager
    it('should establish initial focus through FocusManager', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      render(
        <AccessibleMediaControls
          {...defaultProps}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      expect(mockFocusManager.setInitialFocus).toHaveBeenCalledWith(expect.any(HTMLElement));
    });

    // Contract Test: Should validate color contrast through ContrastChecker
    it('should validate color contrast through ContrastChecker on setup', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      render(
        <AccessibleMediaControls
          {...defaultProps}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      expect(mockContrastChecker.validateElementContrast).toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation Integration', () => {
    // Contract Test: Should register keyboard shortcuts through KeyboardNavigationHandler
    it('should register all keyboard shortcuts through KeyboardNavigationHandler', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      render(
        <AccessibleMediaControls
          {...defaultProps}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      const expectedShortcuts = ['space', 'ArrowLeft', 'ArrowRight', 'm', 'f', 'c'];
      
      expectedShortcuts.forEach(key => {
        expect(mockKeyboardHandler.registerShortcut).toHaveBeenCalledWith(
          key,
          expect.objectContaining({
            action: expect.any(String),
            handler: expect.any(Function),
            preventDefault: true
          })
        );
      });
    });

    // Contract Test: Should clean up shortcuts on unmount
    it('should unregister keyboard shortcuts through KeyboardNavigationHandler on unmount', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      const { unmount } = render(
        <AccessibleMediaControls
          {...defaultProps}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      unmount();

      const expectedShortcuts = ['space', 'ArrowLeft', 'ArrowRight', 'm', 'f', 'c'];
      expectedShortcuts.forEach(key => {
        expect(mockKeyboardHandler.unregisterShortcut).toHaveBeenCalledWith(key);
      });

      expect(mockFocusManager.releaseFocusTrap).toHaveBeenCalled();
    });

    // Behavior Test: Should support keyboard navigation on progress bar
    it('should handle keyboard navigation on progress bar', async () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);
      const onSeek = vi.fn();

      render(
        <AccessibleMediaControls
          {...defaultProps}
          currentTime={100}
          duration={300}
          onSeek={onSeek}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      const progressBar = screen.getByTestId('progress-bar');
      progressBar.focus();

      // Test left arrow (seek backward)
      await userEvent.keyboard('{ArrowLeft}');
      expect(onSeek).toHaveBeenCalledWith(90); // 100 - 10

      // Test right arrow (seek forward)
      await userEvent.keyboard('{ArrowRight}');
      expect(onSeek).toHaveBeenCalledWith(110); // 100 + 10
    });
  });

  describe('Screen Reader Integration', () => {
    // Contract Test: Should announce playback state changes
    it('should announce playback state changes through ScreenReader', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      const { rerender } = render(
        <AccessibleMediaControls
          {...defaultProps}
          isPlaying={false}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      // Change to playing state
      rerender(
        <AccessibleMediaControls
          {...defaultProps}
          isPlaying={true}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      expect(mockScreenReader.announce).toHaveBeenCalledWith('Video playing', 'polite');
    });

    // Contract Test: Should announce seek actions
    it('should announce seek actions through ScreenReader', async () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);
      const onSeek = vi.fn();

      render(
        <AccessibleMediaControls
          {...defaultProps}
          currentTime={50}
          duration={300}
          onSeek={onSeek}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      const progressBar = screen.getByTestId('progress-bar');
      await userEvent.click(progressBar);

      // Simulate seek action
      onSeek.mock.calls[0]?.[0] && onSeek.mock.calls[0][0](100);

      expect(mockScreenReader.announce).toHaveBeenCalledWith(
        expect.stringContaining('Seeked to'),
        'assertive'
      );
    });

    // Contract Test: Should announce volume changes
    it('should announce volume changes through ScreenReader', async () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      render(
        <AccessibleMediaControls
          {...defaultProps}
          volume={0.5}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      const volumeSlider = screen.getByTestId('volume-slider');
      await userEvent.clear(volumeSlider);
      await userEvent.type(volumeSlider, '0.8');

      expect(mockScreenReader.announce).toHaveBeenCalledWith(
        expect.stringContaining('Volume set to'),
        'polite'
      );
    });

    // Contract Test: Should announce fullscreen state changes
    it('should announce fullscreen state changes through ScreenReader', async () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      render(
        <AccessibleMediaControls
          {...defaultProps}
          isFullscreen={false}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      const fullscreenButton = screen.getByTestId('fullscreen-button');
      await userEvent.click(fullscreenButton);

      expect(mockScreenReader.announce).toHaveBeenCalledWith('Entered fullscreen', 'assertive');
    });
  });

  describe('ARIA State Management', () => {
    // Contract Test: Should update button states through ARIAManager
    it('should update play button ARIA state through ARIAManager', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      const { rerender } = render(
        <AccessibleMediaControls
          {...defaultProps}
          isPlaying={false}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      // Change to playing state
      rerender(
        <AccessibleMediaControls
          {...defaultProps}
          isPlaying={true}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      expect(mockARIAManager.updateState).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        { pressed: true }
      );
    });

    // Contract Test: Should update progress bar ARIA attributes
    it('should update progress bar ARIA attributes through ARIAManager', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      const { rerender } = render(
        <AccessibleMediaControls
          {...defaultProps}
          currentTime={0}
          duration={300}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      // Update progress
      rerender(
        <AccessibleMediaControls
          {...defaultProps}
          currentTime={150}
          duration={300}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      expect(mockARIAManager.setAttributes).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({
          label: expect.stringContaining('Video progress: 50% played')
        })
      );
    });
  });

  describe('Visual Accessibility Compliance', () => {
    // Contract Test: Should handle contrast validation failures
    it('should handle contrast validation failures through ContrastChecker', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockSuggestions: ContrastSuggestion[] = [
        {
          property: 'foreground',
          currentValue: '#666',
          suggestedValue: '#333',
          improvement: 1.2
        }
      ];

      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(false);
      (mockContrastChecker.suggestImprovements as MockedFunction<any>).mockReturnValue(mockSuggestions);

      render(
        <AccessibleMediaControls
          {...defaultProps}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      expect(mockContrastChecker.suggestImprovements).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Contrast issue detected:', mockSuggestions);
      
      consoleSpy.mockRestore();
    });

    // Behavior Test: Should provide proper button labels
    it('should provide accessible button labels that change with state', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      const { rerender } = render(
        <AccessibleMediaControls
          {...defaultProps}
          isPlaying={false}
          isMuted={false}
          isFullscreen={false}
          hasSubtitles={false}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      // Check initial states
      expect(screen.getByLabelText(/Play Test Video for Accessibility/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Mute audio/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enter fullscreen/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Enable subtitles/)).toBeInTheDocument();

      // Update states
      rerender(
        <AccessibleMediaControls
          {...defaultProps}
          isPlaying={true}
          isMuted={true}
          isFullscreen={true}
          hasSubtitles={true}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      // Check updated states
      expect(screen.getByLabelText(/Pause Test Video for Accessibility/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Unmute audio/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Exit fullscreen/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Disable subtitles/)).toBeInTheDocument();
    });

    // Behavior Test: Should provide proper progress bar accessibility
    it('should provide accessible progress bar with proper ARIA attributes', () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      render(
        <AccessibleMediaControls
          {...defaultProps}
          currentTime={90}
          duration={300}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      const progressBar = screen.getByTestId('progress-bar');
      
      expect(progressBar).toHaveAttribute('role', 'progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '90');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '300');
      expect(progressBar).toHaveAttribute('aria-valuetext', '1:30 of 5:00');
      expect(progressBar).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Comprehensive Keyboard Accessibility', () => {
    // Behavior Test: Should support tab navigation through all controls
    it('should support complete keyboard navigation through all controls', async () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);

      render(
        <AccessibleMediaControls
          {...defaultProps}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      // Tab through all controls
      await userEvent.tab();
      expect(screen.getByTestId('play-pause-button')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByTestId('progress-bar')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByTestId('mute-button')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByTestId('volume-slider')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByTestId('subtitles-button')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByTestId('fullscreen-button')).toHaveFocus();
    });

    // Behavior Test: Should handle Enter and Space key activation
    it('should activate buttons with both Enter and Space keys', async () => {
      (mockContrastChecker.validateElementContrast as MockedFunction<any>).mockReturnValue(true);
      const onPlay = vi.fn();
      const onMute = vi.fn();

      render(
        <AccessibleMediaControls
          {...defaultProps}
          isPlaying={false}
          isMuted={false}
          onPlay={onPlay}
          onMute={onMute}
          screenReader={mockScreenReader}
          keyboardHandler={mockKeyboardHandler}
          ariaManager={mockARIAManager}
          focusManager={mockFocusManager}
          contrastChecker={mockContrastChecker}
          textScaling={mockTextScaling}
        />
      );

      // Test Space key on play button
      const playButton = screen.getByTestId('play-pause-button');
      playButton.focus();
      await userEvent.keyboard(' ');
      expect(onPlay).toHaveBeenCalled();

      // Test Enter key on mute button
      const muteButton = screen.getByTestId('mute-button');
      muteButton.focus();
      await userEvent.keyboard('{Enter}');
      expect(onMute).toHaveBeenCalled();
    });
  });
});