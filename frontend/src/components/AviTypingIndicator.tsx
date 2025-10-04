import React, { useEffect, useState, useRef, memo } from 'react';

/**
 * AviTypingIndicator Component
 *
 * Displays animated "Avi" with wave pattern:
 * - Wave animation cycling through character variations (A↔Λ, v↔V, i↔!)
 * - Single gray color (no ROYGBIV in inline mode)
 * - 200ms per frame (10 frames total = 2 second loop)
 * - Two modes: inline (in chat) or absolute (above input)
 *
 * @param isVisible - Controls animation visibility
 * @param inline - When true, renders inline in chat (no "is typing" text, single color)
 */

interface AviTypingIndicatorProps {
  isVisible: boolean;
  inline?: boolean;
  className?: string;
  activityText?: string;
}

// SPARC SPEC: 10-frame wave pattern
const ANIMATION_FRAMES = [
  'A v i', // Frame 0
  'Λ v i', // Frame 1 - A→Λ
  'Λ V i', // Frame 2 - v→V
  'Λ V !', // Frame 3 - i→!
  'A v !', // Frame 4 - Λ→A, V→v
  'A V !', // Frame 5 - v→V
  'A V i', // Frame 6 - !→i
  'A v i', // Frame 7 - V→v (reset)
  'Λ v i', // Frame 8 - A→Λ
  'Λ V i', // Frame 9 - v→V (loop prep)
] as const;

// SPARC SPEC: ROYGBIV color cycle
const ROYGBIV_COLORS = [
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#0000FF', // Blue
  '#4B0082', // Indigo
  '#9400D3', // Violet
] as const;

const FRAME_DURATION_MS = 200; // Medium speed as specified
const MAX_ACTIVITY_LENGTH = 80; // Maximum characters for activity text

/**
 * Truncates activity text to MAX_ACTIVITY_LENGTH with ellipsis
 */
const truncateActivity = (text: string): string => {
  if (text.length <= MAX_ACTIVITY_LENGTH) {
    return text;
  }
  return text.substring(0, MAX_ACTIVITY_LENGTH - 3) + '...';
};

const AviTypingIndicator: React.FC<AviTypingIndicatorProps> = memo(({ isVisible, inline = false, className = '', activityText }) => {
  const [frameIndex, setFrameIndex] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isVisible) {
      // Clean up interval when hidden
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // Reset to initial state
      setFrameIndex(0);
      setColorIndex(0);
      return;
    }

    // SPARC FIX: Reset to frame 0 when becoming visible
    setFrameIndex(0);
    setColorIndex(0);

    // CRITICAL FIX: Delay interval start to ensure frame 0 renders first
    // This prevents React batching from skipping frame 0
    const startTimeout = setTimeout(() => {
      // Start animation loop - increments every FRAME_DURATION_MS
      intervalRef.current = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % ANIMATION_FRAMES.length);
        setColorIndex(prev => (prev + 1) % ROYGBIV_COLORS.length);
      }, FRAME_DURATION_MS);
    }, FRAME_DURATION_MS); // Wait one frame duration before starting increments

    // Cleanup on unmount or visibility change
    return () => {
      clearTimeout(startTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isVisible]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  const currentFrame = ANIMATION_FRAMES[frameIndex];
  // SPARC UX FIX: Single gray color for inline mode, ROYGBIV for absolute mode
  const currentColor = inline ? '#6B7280' : ROYGBIV_COLORS[colorIndex];

  // Inline mode: Simple text-only animation for chat messages
  if (inline) {
    return (
      <span
        className={`avi-wave-text-inline ${className}`}
        role="status"
        aria-live="polite"
        aria-label="Avi is thinking"
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            color: currentColor,
            display: 'inline-block',
            minWidth: '3ch',
          }}
        >
          {currentFrame}
        </span>
        {activityText && activityText.trim() && (
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 400,
              color: '#D1D5DB',
              marginLeft: '0.5rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            - {truncateActivity(activityText)}
          </span>
        )}
      </span>
    );
  }

  // Absolute mode (legacy): Positioned above input with "is typing..."
  return (
    <div
      className={`avi-typing-indicator ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Avi is typing"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '0',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(4px)',
        fontSize: '0.875rem',
        fontWeight: 500,
        transition: 'opacity 0.3s ease-in-out',
        opacity: isVisible ? 1 : 0,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <span
        className="avi-wave-text"
        style={{
          fontFamily: 'monospace',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          letterSpacing: '0.15em',
          color: currentColor,
          textShadow: `0 0 2px rgba(255, 255, 255, 0.8), 0 0 4px ${currentColor}40`,
          willChange: 'color',
        }}
        aria-hidden="true"
      >
        {currentFrame}
      </span>
      <span
        style={{
          fontSize: '0.75rem',
          color: 'rgba(0, 0, 0, 0.5)',
          fontStyle: 'italic',
        }}
      >
        is typing...
      </span>
    </div>
  );
});

AviTypingIndicator.displayName = 'AviTypingIndicator';

export default AviTypingIndicator;
