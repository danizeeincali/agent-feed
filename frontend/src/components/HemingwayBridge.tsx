/**
 * Hemingway Bridge Component
 * Always-visible engagement element that ensures users have a next action
 *
 * Architecture: UI Element (not post)
 * See: docs/ARCHITECTURE-HEMINGWAY-BRIDGE-DISPLAY.md
 *
 * Features:
 * - Sticky positioning (always visible)
 * - Fetches from /api/bridges/active/:userId
 * - 5-level priority waterfall
 * - Updates dynamically on user actions
 * - Smooth transitions between bridges
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Compass, ArrowRight, Lightbulb, MessageCircle, Sparkles } from 'lucide-react';

interface Bridge {
  id: string;
  user_id: string;
  bridge_type: 'continue_thread' | 'next_step' | 'new_feature' | 'question' | 'insight';
  content: string;
  priority: number;
  post_id: string | null;
  agent_id: string | null;
  action: string | null;
  active: number;
  created_at: number;
  completed_at: number | null;
}

interface HemingwayBridgeProps {
  userId: string;
  onBridgeAction?: (action: string, bridge: Bridge) => void;
  className?: string;
}

/**
 * Get icon for bridge type
 */
function getBridgeIcon(bridgeType: string) {
  switch (bridgeType) {
    case 'continue_thread':
      return <MessageCircle className="w-5 h-5 text-blue-600" />;
    case 'next_step':
      return <ArrowRight className="w-5 h-5 text-purple-600" />;
    case 'new_feature':
      return <Sparkles className="w-5 h-5 text-green-600" />;
    case 'question':
      return <Compass className="w-5 h-5 text-orange-600" />;
    case 'insight':
      return <Lightbulb className="w-5 h-5 text-yellow-600" />;
    default:
      return <Compass className="w-5 h-5 text-gray-600" />;
  }
}

/**
 * Get display label for bridge type
 */
function getBridgeLabel(bridgeType: string): string {
  switch (bridgeType) {
    case 'continue_thread':
      return 'Continue Thread';
    case 'next_step':
      return 'Next Step';
    case 'new_feature':
      return 'New Feature';
    case 'question':
      return 'Question';
    case 'insight':
      return 'Tip';
    default:
      return 'Next Action';
  }
}

/**
 * Get action button text
 */
function getActionText(bridge: Bridge): string {
  if (bridge.action === 'trigger_phase2') {
    return 'Start Phase 2';
  }
  if (bridge.action === 'introduce_agent') {
    return 'Meet Agent';
  }
  if (bridge.post_id) {
    return 'View Post';
  }
  if (bridge.bridge_type === 'question') {
    return 'Create Post';
  }
  return 'Continue';
}

/**
 * Hemingway Bridge Component
 * Sticky engagement prompt that ensures users always have a next action
 */
export function HemingwayBridge({ userId, onBridgeAction, className = '' }: HemingwayBridgeProps) {
  const [bridge, setBridge] = useState<Bridge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  /**
   * Fetch active bridge from API
   */
  const fetchActiveBridge = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/bridges/active/${userId}`);

      if (!response.ok) {
        // Use fallback bridge instead of error
        console.warn('No active bridge found, using fallback');
        setBridge({
          id: 'fallback-bridge',
          user_id: userId,
          bridge_type: 'question',
          content: 'Welcome! What would you like to work on today?',
          priority: 5,
          post_id: null,
          agent_id: null,
          action: null,
          active: 1,
          created_at: Date.now(),
          completed_at: null
        });
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success && data.bridge) {
        setBridge(data.bridge);
      } else {
        // Use fallback if no bridge in response
        console.warn('No bridge in response, using fallback');
        setBridge({
          id: 'fallback-bridge',
          user_id: userId,
          bridge_type: 'question',
          content: 'Welcome! What would you like to work on today?',
          priority: 5,
          post_id: null,
          agent_id: null,
          action: null,
          active: 1,
          created_at: Date.now(),
          completed_at: null
        });
      }
    } catch (err) {
      console.error('Bridge error:', err);
      // Use fallback on error instead of showing error to user
      setError(null); // Don't show error to user
      setBridge({
        id: 'fallback-bridge',
        user_id: userId,
        bridge_type: 'question',
        content: 'Welcome! What would you like to work on today?',
        priority: 5,
        post_id: null,
        agent_id: null,
        action: null,
        active: 1,
        created_at: Date.now(),
        completed_at: null
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Complete current bridge and fetch new one
   */
  const completeBridge = useCallback(async (bridgeId: string) => {
    try {
      setTransitioning(true);

      const response = await fetch(`/api/bridges/complete/${bridgeId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to complete bridge');
      }

      const data = await response.json();

      if (data.success && data.newBridge) {
        // Smooth transition to new bridge
        setTimeout(() => {
          setBridge(data.newBridge);
          setTransitioning(false);
        }, 300);
      } else {
        // Fallback: refetch
        await fetchActiveBridge();
        setTransitioning(false);
      }
    } catch (err) {
      console.error('Error completing bridge:', err);
      setError('Failed to complete action');
      setTransitioning(false);
    }
  }, [fetchActiveBridge]);

  /**
   * Handle bridge action click
   */
  const handleAction = useCallback(async () => {
    if (!bridge) return;

    // Execute custom action callback if provided
    if (onBridgeAction && bridge.action) {
      onBridgeAction(bridge.action, bridge);
    }

    // Handle built-in actions
    if (bridge.post_id) {
      // Navigate to post (scroll to post in feed)
      const postElement = document.querySelector(`[data-testid="post-card"][data-post-id="${bridge.post_id}"]`);
      if (postElement) {
        postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (bridge.bridge_type === 'question') {
      // Trigger post creator (focus on create post input)
      const postInput = document.querySelector('[data-testid="post-creator-input"]') as HTMLTextAreaElement;
      if (postInput) {
        postInput.focus();
      }
    }

    // Complete bridge and get next one
    await completeBridge(bridge.id);
  }, [bridge, onBridgeAction, completeBridge]);

  /**
   * Fetch bridge on mount and userId change
   */
  useEffect(() => {
    fetchActiveBridge();
  }, [fetchActiveBridge]);

  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800 border-b border-blue-200 dark:border-gray-700 p-3 ${className}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading next step...</span>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900 border-b border-red-200 dark:border-red-700 p-3 ${className}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm text-red-700 dark:text-red-200">{error}</span>
          <button
            onClick={fetchActiveBridge}
            className="text-sm text-red-600 dark:text-red-300 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /**
   * No bridge state (should never happen due to waterfall)
   */
  if (!bridge) {
    return null;
  }

  /**
   * Main render
   */
  return (
    <div
      className={`sticky top-0 z-40 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-b border-blue-200 dark:border-gray-700 transition-opacity duration-300 ${transitioning ? 'opacity-50' : 'opacity-100'} ${className}`}
      data-testid="hemingway-bridge"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon + Content */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="flex-shrink-0">
              {getBridgeIcon(bridge.bridge_type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {getBridgeLabel(bridge.bridge_type)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Priority {bridge.priority}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                {bridge.content}
              </p>
            </div>
          </div>

          {/* Right: Action Button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleAction}
              disabled={transitioning}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
              data-testid="bridge-action-button"
            >
              {getActionText(bridge)}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HemingwayBridge;
