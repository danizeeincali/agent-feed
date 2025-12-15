/**
 * Debug Logger - Frontend debug logging for processing pipeline
 *
 * Toggle DEBUG_PILLS to enable/disable verbose logging throughout
 * the comment processing pipeline on the frontend.
 */

// Toggle this flag to enable/disable debug logging
export const DEBUG_PILLS = true;

// Color-coded log prefixes for different components
const LOG_PREFIXES: Record<string, string> = {
  commentThread: '💬 [CommentThread]',
  feed: '📰 [RealSocialMediaFeed]',
  api: '🌐 [API]',
  socket: '🔌 [Socket]',
  state: '🔄 [State]'
};

/**
 * Debug log function with component tagging
 * @param component - Component name
 * @param args - Log arguments
 */
export function debugLog(component: string, ...args: any[]): void {
  if (!DEBUG_PILLS) return;

  const prefix = LOG_PREFIXES[component] || `[${component}]`;
  console.log(prefix, ...args);
}

/**
 * Debug warn function with component tagging
 * @param component - Component name
 * @param args - Log arguments
 */
export function debugWarn(component: string, ...args: any[]): void {
  if (!DEBUG_PILLS) return;

  const prefix = LOG_PREFIXES[component] || `[${component}]`;
  console.warn(prefix, ...args);
}

/**
 * Debug error function (always logs regardless of DEBUG_PILLS)
 * @param component - Component name
 * @param args - Log arguments
 */
export function debugError(component: string, ...args: any[]): void {
  const prefix = LOG_PREFIXES[component] || `[${component}]`;
  console.error(prefix, ...args);
}

export default {
  DEBUG_PILLS,
  debugLog,
  debugWarn,
  debugError
};
