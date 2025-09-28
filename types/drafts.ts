/**
 * Draft Management Types
 * Phase 3 - Production-ready types for draft functionality
 */

export interface Draft {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  status: DraftStatus;
  createdAt: Date;
  updatedAt: Date;
  autoSavedAt?: Date;
  publishedAt?: Date;
  templateId?: string;
  wordCount?: number;
  metadata?: {
    wordCount?: number;
    readingTime?: number;
    lastEditedBy?: string;
  };
}

export enum DraftStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled', 
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  SHARED = 'shared',
  TEMPLATE = 'template',
  DELETED = 'deleted'
}

export interface DraftCreateRequest {
  title: string;
  content: string;
  tags?: string[];
  templateId?: string;
}

export interface DraftUpdateRequest {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  status?: DraftStatus;
  templateId?: string;
}

export interface DraftSearchFilters {
  status?: DraftStatus;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchText?: string;
}

export interface DraftManagerConfig {
  autoSaveInterval: number; // milliseconds
  enableAutoSave: boolean;
  maxDrafts: number;
  enableVersioning: boolean;
}

export interface DraftVersion {
  id: string;
  draftId: string;
  content: string;
  title: string;
  createdAt: Date;
  versionNumber: number;
}

export interface DraftStats {
  total: number;
  byStatus: {
    draft: number;
    published: number;
    archived: number;
    shared: number;
    template: number;
  };
  totalWordCount: number;
  averageWordCount: number;
  recentlyModified: number;
}