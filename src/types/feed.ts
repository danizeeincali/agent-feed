/**
 * Feed Type Definitions
 * Phase 3A: Feed Monitoring
 */

export type FeedType = 'rss' | 'atom' | 'json';

export interface ParsedFeedItem {
  guid: string;
  title: string;
  content: string;
  contentSnippet?: string;
  author?: string;
  link: string;
  publishedAt?: Date;
}

export interface ParsedFeed {
  title: string;
  items: ParsedFeedItem[];
  type: FeedType;
}

export interface UserFeed {
  id: string;
  userId: string;
  agentName: string;
  feedUrl: string;
  feedType: FeedType;
  feedName?: string;
  feedDescription?: string;
  fetchIntervalMinutes: number;
  lastFetchedAt?: Date;
  lastError?: string;
  errorCount: number;
  status: 'active' | 'paused' | 'error' | 'deleted';
  automationEnabled: boolean;
  responseConfig: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedItem {
  id: string;
  feedId: string;
  itemGuid: string;
  title?: string;
  content?: string;
  contentSnippet?: string;
  author?: string;
  link?: string;
  publishedAt?: Date;
  discoveredAt: Date;
  processed: boolean;
  processingStatus: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'skipped';
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface FeedPosition {
  feedId: string;
  lastItemGuid?: string;
  lastItemId?: string;
  lastPublishedAt?: Date;
  itemsProcessed: number;
  itemsTotal: number;
  cursorData: Record<string, any>;
  updatedAt: Date;
}

export interface AgentResponse {
  id: string;
  workTicketId?: string;
  feedItemId?: string;
  agentName: string;
  userId: string;
  responseContent: string;
  responseMetadata: Record<string, any>;
  tokensUsed?: number;
  generationTimeMs?: number;
  validationResults: Record<string, any>;
  status: 'pending' | 'validated' | 'posted' | 'failed' | 'rejected';
  postedAt?: Date;
  postUrl?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedFetchLog {
  id: string;
  feedId: string;
  status: 'success' | 'error' | 'timeout' | 'invalid';
  httpStatusCode?: number;
  itemsFound: number;
  itemsNew: number;
  fetchDurationMs?: number;
  errorMessage?: string;
  createdAt: Date;
}

export interface FeedPollResult {
  feedId: string;
  itemsFound: number;
  itemsNew: number;
  ticketsCreated: number;
  durationMs: number;
  error?: string;
}

export interface PollAllResult {
  feedsChecked: number;
  itemsFound: number;
  itemsNew: number;
  ticketsCreated: number;
  errors: Array<{ feedId: string; error: string }>;
  durationMs: number;
}
