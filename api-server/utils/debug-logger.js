/**
 * Debug Logger - Centralized debug logging for processing pipeline
 *
 * Toggle DEBUG_PILLS to enable/disable verbose logging throughout
 * the comment processing pipeline.
 */

// Toggle this flag to enable/disable debug logging
export const DEBUG_PILLS = true;

// Color-coded log prefixes for different components
const LOG_PREFIXES = {
  orchestrator: '🎯 [Orchestrator]',
  websocket: '📢 [WebSocket]',
  worker: '⚙️ [Worker]',
  api: '🌐 [API]',
  db: '💾 [Database]'
};

/**
 * Debug log function with component tagging
 * @param {string} component - Component name (orchestrator, websocket, worker, api, db)
 * @param {...any} args - Log arguments
 */
export function debugLog(component, ...args) {
  if (!DEBUG_PILLS) return;

  const prefix = LOG_PREFIXES[component] || `[${component}]`;
  console.log(prefix, ...args);
}

/**
 * Debug warn function with component tagging
 * @param {string} component - Component name
 * @param {...any} args - Log arguments
 */
export function debugWarn(component, ...args) {
  if (!DEBUG_PILLS) return;

  const prefix = LOG_PREFIXES[component] || `[${component}]`;
  console.warn(prefix, ...args);
}

/**
 * Debug error function (always logs regardless of DEBUG_PILLS)
 * @param {string} component - Component name
 * @param {...any} args - Log arguments
 */
export function debugError(component, ...args) {
  const prefix = LOG_PREFIXES[component] || `[${component}]`;
  console.error(prefix, ...args);
}

export default {
  DEBUG_PILLS,
  debugLog,
  debugWarn,
  debugError
};
