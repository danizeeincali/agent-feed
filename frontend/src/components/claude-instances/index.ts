/**
 * Claude Instance Management Components
 * Export all components for easy importing
 */

export { ClaudeInstanceSelector } from './ClaudeInstanceSelector';
export { EnhancedChatInterface } from './EnhancedChatInterface';
export { ImageUploadZone } from './ImageUploadZone';
export { InstanceStatusIndicator } from './InstanceStatusIndicator';

// Re-export types for convenience
export type {
  ClaudeInstanceSelectorProps,
  EnhancedChatInterfaceProps,
  ImageUploadZoneProps,
  InstanceStatusIndicatorProps
} from '../../types/claude-instances';