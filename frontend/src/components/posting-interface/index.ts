/**
 * Posting Interface Components
 * Phase 4 - SPARC Implementation Export Module
 */

export { PostingInterface } from './PostingInterface';
export { QuickPostSection } from './QuickPostSection';
export { AviDMSection } from './AviDMSection';
// Use the corrected real Claude Code integration
export { AviDirectChatReal } from './AviDirectChatRealFixed';
// Export corrected version as default AviDirectChat
export { AviDirectChatReal as AviDirectChat } from './AviDirectChatRealFixed';

export type { PostingTab } from './PostingInterface';

// Re-export for backward compatibility and easier imports
export { PostingInterface as ThreeSectionPostingInterface } from './PostingInterface';

// Export corrected AviDirectChatReal as default Avi interface for new implementations
export { AviDirectChatReal as AviChatInterface } from './AviDirectChatRealFixed';
export { AviDirectChatSDK } from './AviDirectChatSDK';