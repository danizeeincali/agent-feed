/**
 * Claude Manager Components - Export Index
 * 
 * Exports all Claude instance management components including both
 * legacy WebSocket-based and new SSE-based implementations.
 */

// SSE-based components (recommended)
export { SSEClaudeInstanceManager } from '../../managers/ClaudeInstanceManager';
export { ClaudeInstanceManagerComponentSSE } from './ClaudeInstanceManagerComponentSSE';
export { SSETerminalInterface } from './SSETerminalInterface';
export { useSSEClaudeInstance } from '../../hooks/useSSEClaudeInstance';

// Services
export { SSEConnectionService, getSSEConnectionService } from '../../services/SSEConnectionService';
export { HTTPCommandService, createHTTPCommandService } from '../../services/HTTPCommandService';

// Legacy WebSocket components (for backward compatibility)
export { ClaudeInstanceManagerComponent } from './ClaudeInstanceManagerComponent';
export { default as ClaudeInstanceButtons } from './ClaudeInstanceButtons';

// Utilities
export * from '../../utils/sse-helpers';

// Types
export type {
  SSEClaudeInstanceConfig,
  InstanceOutputMessage,
  ConnectionState,
  InstanceConnection,
  SSEMessage,
  CommandResponse
} from '../../managers/ClaudeInstanceManager';

export type {
  UseSSEClaudeInstanceOptions,
  UseSSEClaudeInstanceReturn
} from '../../hooks/useSSEClaudeInstance';

export type {
  SSEConnectionState,
  SSEConnectionConfig,
  SSEConnectionInfo,
  SSEMessage as SSEServiceMessage,
  SSEMessageHandler,
  SSEStateChangeHandler,
  SSEErrorHandler
} from '../../services/SSEConnectionService';

export type {
  CommandRequest,
  CommandResponse as HTTPCommandResponse,
  CommandExecutionConfig,
  CommandExecutionStats
} from '../../services/HTTPCommandService';

// Default exports for convenience
export { ClaudeInstanceManagerComponentSSE as default } from './ClaudeInstanceManagerComponentSSE';