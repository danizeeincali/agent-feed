export interface Draft {
  id: string;
  userId: string;
  title: string;
  hook?: string;
  content: string;
  tags: string[];
  agentMentions: string[];
  templateId?: string;
  metadata: DraftMetadata;
  status: DraftStatus;
  version: number;
  parentVersionId?: string;
  collaborators: string[];
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastModifiedBy?: string;
  scheduledFor?: Date;
  publishedPostId?: string;
}

export interface DraftMetadata {
  wordCount?: number;
  readingTime?: number;
  businessImpact?: number;
  postType?: string;
  workflowId?: string;
  attachments?: string[];
  lastAutoSave?: Date;
  isTemplate?: boolean;
  templateCategory?: string;
}

export enum DraftStatus {
  DRAFT = 'draft',
  SHARED = 'shared',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

export interface DraftVersion {
  id: string;
  draftId: string;
  version: number;
  title: string;
  content: string;
  changes: DraftChange[];
  createdBy: string;
  createdAt: Date;
  comment?: string;
}

export interface DraftChange {
  type: 'addition' | 'deletion' | 'modification';
  position: number;
  length?: number;
  oldText?: string;
  newText?: string;
}

export interface DraftFolder {
  id: string;
  name: string;
  description?: string;
  userId: string;
  parentId?: string;
  draftCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftFilter {
  status?: DraftStatus[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  collaborator?: string;
  folder?: string;
  search?: string;
}

export interface DraftSort {
  field: 'updatedAt' | 'createdAt' | 'title' | 'wordCount';
  direction: 'asc' | 'desc';
}

export interface DraftBulkAction {
  action: 'delete' | 'archive' | 'publish' | 'schedule' | 'share' | 'move';
  draftIds: string[];
  parameters?: {
    scheduledFor?: Date;
    folderId?: string;
    collaborators?: string[];
  };
}

export interface DraftCollaboration {
  id: string;
  draftId: string;
  userId: string;
  permission: 'view' | 'comment' | 'edit' | 'admin';
  invitedBy: string;
  invitedAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'declined';
}

export interface DraftActivity {
  id: string;
  draftId: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'shared' | 'commented' | 'published' | 'deleted';
  details?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface DraftComment {
  id: string;
  draftId: string;
  userId: string;
  userName: string;
  content: string;
  position?: {
    start: number;
    end: number;
  };
  resolved: boolean;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftStats {
  totalDrafts: number;
  publishedCount: number;
  sharedCount: number;
  scheduledCount: number;
  averageWordCount: number;
  mostUsedTags: { tag: string; count: number }[];
  collaborationStats: {
    invitationsSent: number;
    invitationsReceived: number;
    activeCollaborations: number;
  };
  recentActivity: DraftActivity[];
}

export interface AutoSaveConfig {
  enabled: boolean;
  interval: number; // milliseconds
  maxRetries: number;
  offlineStorage: boolean;
}