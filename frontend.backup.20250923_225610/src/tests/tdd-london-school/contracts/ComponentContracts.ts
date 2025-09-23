/**
 * Component Contracts for TDD London School Testing
 * Defines behavioral contracts for all major components
 */

import { MentionSuggestion } from '@/components/MentionInput';
import { Comment } from '@/components/CommentThread';
import { LondonTestUtils } from '../framework/LondonSchoolTestFramework';

// ==================== MENTION SYSTEM CONTRACTS ====================

/**
 * MentionService Contract
 */
export interface IMentionService {
  searchMentions(query: string, config?: any): Promise<MentionSuggestion[]>;
  getAllAgents(): MentionSuggestion[];
  getQuickMentions(context?: string): MentionSuggestion[];
  getAgentById(id: string): MentionSuggestion | null;
  validateMention(name: string): boolean;
  extractMentions(content: string): string[];
  clearCache(): void;
}

export const MentionServiceContract = LondonTestUtils.contract<IMentionService>()
  .named('MentionService')
  .withMethods([
    'searchMentions',
    'getAllAgents', 
    'getQuickMentions',
    'getAgentById',
    'validateMention',
    'extractMentions',
    'clearCache'
  ])
  .withExpectations([
    { method: 'searchMentions', returns: [], times: 1 },
    { method: 'getAllAgents', returns: [] },
    { method: 'getQuickMentions', returns: [] },
  ])
  .build();

/**
 * MentionInput Component Contract
 */
export interface IMentionInput {
  focus(): void;
  blur(): void;
  insertMention(mention: MentionSuggestion): void;
  getCurrentMentionQuery(): string | null;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  setSelectionRange(start: number, end: number): void;
}

export const MentionInputContract = LondonTestUtils.contract<IMentionInput>()
  .named('MentionInput')
  .withMethods([
    'focus',
    'blur',
    'insertMention',
    'getCurrentMentionQuery',
    'setSelectionRange'
  ])
  .build();

// ==================== POST CREATION CONTRACTS ====================

/**
 * PostCreator Component Contract
 */
export interface IPostCreator {
  onPostCreated?: (post: any) => void;
  onMentionSelect?: (mention: MentionSuggestion) => void;
  onTemplateApplied?: (template: any) => void;
  onDraftSaved?: (draft: any) => void;
  onSubmit?: () => Promise<void>;
  validate?: () => boolean;
  reset?: () => void;
}

export const PostCreatorContract = LondonTestUtils.contract<IPostCreator>()
  .named('PostCreator')
  .withMethods([
    'onPostCreated',
    'onMentionSelect', 
    'onTemplateApplied',
    'onDraftSaved',
    'onSubmit',
    'validate',
    'reset'
  ])
  .build();

/**
 * Draft Manager Contract
 */
export interface IDraftManager {
  createDraft(title: string, content: string, tags: string[]): Promise<any>;
  updateDraft(id: string, updates: any): Promise<any>;
  deleteDraft(id: string): Promise<void>;
  getDraft(id: string): Promise<any>;
  getAllDrafts(): Promise<any[]>;
  autosave(data: any): Promise<void>;
}

export const DraftManagerContract = LondonTestUtils.contract<IDraftManager>()
  .named('DraftManager')
  .withMethods([
    'createDraft',
    'updateDraft',
    'deleteDraft',
    'getDraft',
    'getAllDrafts',
    'autosave'
  ])
  .withExpectations([
    { method: 'createDraft', returns: Promise.resolve({}) },
    { method: 'updateDraft', returns: Promise.resolve({}) },
    { method: 'deleteDraft', returns: Promise.resolve() }
  ])
  .build();

// ==================== COMMENT THREADING CONTRACTS ====================

/**
 * CommentThread Contract
 */
export interface ICommentThread {
  onReply(parentId: string, content: string): Promise<void>;
  onEdit(commentId: string, content: string): Promise<void>;
  onDelete(commentId: string): Promise<void>;
  onPin(commentId: string): Promise<void>;
  onReport(commentId: string, reason: string, description?: string): Promise<void>;
  onToggleExpand(commentId: string): void;
  onHighlight(commentId: string): void;
  onNavigate(commentId: string, direction: 'parent' | 'next' | 'prev'): void;
  onCommentsUpdate?: () => void;
  onSortChange?: (sort: any) => void;
  onFilterChange?: (filter: any) => void;
}

export const CommentThreadContract = LondonTestUtils.contract<ICommentThread>()
  .named('CommentThread')
  .withMethods([
    'onReply',
    'onEdit',
    'onDelete',
    'onPin',
    'onReport',
    'onToggleExpand',
    'onHighlight',
    'onNavigate',
    'onCommentsUpdate',
    'onSortChange',
    'onFilterChange'
  ])
  .build();

/**
 * Comment API Service Contract
 */
export interface ICommentAPI {
  createReply(parentId: string, content: string, authorAgent: string): Promise<Comment>;
  updateComment(commentId: string, content: string): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;
  pinComment(commentId: string): Promise<void>;
  reportComment(commentId: string, reason: string, description?: string): Promise<void>;
  getComments(postId: string): Promise<Comment[]>;
  getCommentThread(commentId: string): Promise<Comment[]>;
}

export const CommentAPIContract = LondonTestUtils.contract<ICommentAPI>()
  .named('CommentAPI')
  .withMethods([
    'createReply',
    'updateComment',
    'deleteComment',
    'pinComment',
    'reportComment',
    'getComments',
    'getCommentThread'
  ])
  .withExpectations([
    { method: 'createReply', returns: Promise.resolve({}) },
    { method: 'updateComment', returns: Promise.resolve({}) },
    { method: 'deleteComment', returns: Promise.resolve() }
  ])
  .build();

// ==================== DATA INTEGRATION CONTRACTS ====================

/**
 * HTTP Service Contract
 */
export interface IHTTPService {
  get<T>(url: string, options?: any): Promise<T>;
  post<T>(url: string, data: any, options?: any): Promise<T>;
  put<T>(url: string, data: any, options?: any): Promise<T>;
  delete<T>(url: string, options?: any): Promise<T>;
  patch<T>(url: string, data: any, options?: any): Promise<T>;
}

export const HTTPServiceContract = LondonTestUtils.contract<IHTTPService>()
  .named('HTTPService')
  .withMethods(['get', 'post', 'put', 'delete', 'patch'])
  .withExpectations([
    { method: 'get', returns: Promise.resolve({}) },
    { method: 'post', returns: Promise.resolve({}) },
    { method: 'put', returns: Promise.resolve({}) },
    { method: 'delete', returns: Promise.resolve() }
  ])
  .build();

/**
 * WebSocket Service Contract
 */
export interface IWebSocketService {
  connect(url: string): void;
  disconnect(): void;
  send(data: any): void;
  subscribe(event: string, callback: (data: any) => void): void;
  unsubscribe(event: string): void;
  isConnected(): boolean;
  getConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'error';
}

export const WebSocketServiceContract = LondonTestUtils.contract<IWebSocketService>()
  .named('WebSocketService')
  .withMethods([
    'connect',
    'disconnect',
    'send',
    'subscribe',
    'unsubscribe',
    'isConnected',
    'getConnectionState'
  ])
  .build();

/**
 * Cache Service Contract
 */
export interface ICacheService {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  keys(): string[];
}

export const CacheServiceContract = LondonTestUtils.contract<ICacheService>()
  .named('CacheService')
  .withMethods(['get', 'set', 'delete', 'clear', 'has', 'keys'])
  .build();

// ==================== UI COMPONENT CONTRACTS ====================

/**
 * Router Contract
 */
export interface IRouter {
  navigate(path: string, options?: any): void;
  goBack(): void;
  goForward(): void;
  getCurrentPath(): string;
  getParams(): Record<string, string>;
  getSearchParams(): URLSearchParams;
}

export const RouterContract = LondonTestUtils.contract<IRouter>()
  .named('Router')
  .withMethods([
    'navigate',
    'goBack', 
    'goForward',
    'getCurrentPath',
    'getParams',
    'getSearchParams'
  ])
  .build();

/**
 * Notification Service Contract
 */
export interface INotificationService {
  success(message: string, options?: any): void;
  error(message: string, options?: any): void;
  warning(message: string, options?: any): void;
  info(message: string, options?: any): void;
  dismiss(id?: string): void;
  dismissAll(): void;
}

export const NotificationServiceContract = LondonTestUtils.contract<INotificationService>()
  .named('NotificationService')
  .withMethods([
    'success',
    'error',
    'warning',
    'info',
    'dismiss',
    'dismissAll'
  ])
  .build();

/**
 * LocalStorage Contract
 */
export interface ILocalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

export const LocalStorageContract = LondonTestUtils.contract<ILocalStorage>()
  .named('LocalStorage')
  .withMethods([
    'getItem',
    'setItem', 
    'removeItem',
    'clear',
    'key'
  ])
  .build();

// ==================== BUSINESS LOGIC CONTRACTS ====================

/**
 * Template Service Contract
 */
export interface ITemplateService {
  getTemplates(): Promise<any[]>;
  getTemplate(id: string): Promise<any>;
  applyTemplate(templateId: string, context: any): Promise<any>;
  createCustomTemplate(template: any): Promise<any>;
}

export const TemplateServiceContract = LondonTestUtils.contract<ITemplateService>()
  .named('TemplateService')
  .withMethods([
    'getTemplates',
    'getTemplate',
    'applyTemplate',
    'createCustomTemplate'
  ])
  .build();

/**
 * Validation Service Contract
 */
export interface IValidationService {
  validatePost(data: any): { isValid: boolean; errors: string[] };
  validateComment(data: any): { isValid: boolean; errors: string[] };
  validateMention(mention: string): boolean;
  validateTag(tag: string): boolean;
  sanitizeContent(content: string): string;
}

export const ValidationServiceContract = LondonTestUtils.contract<IValidationService>()
  .named('ValidationService')
  .withMethods([
    'validatePost',
    'validateComment',
    'validateMention',
    'validateTag',
    'sanitizeContent'
  ])
  .build();

// Export all contracts for easy registration
export const ALL_CONTRACTS = [
  MentionServiceContract,
  MentionInputContract,
  PostCreatorContract,
  DraftManagerContract,
  CommentThreadContract,
  CommentAPIContract,
  HTTPServiceContract,
  WebSocketServiceContract,
  CacheServiceContract,
  RouterContract,
  NotificationServiceContract,
  LocalStorageContract,
  TemplateServiceContract,
  ValidationServiceContract
];