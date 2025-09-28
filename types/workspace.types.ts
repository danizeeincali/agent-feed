// Agent Dynamic Pages - TypeScript Type Definitions

export interface AgentWorkspace {
  id: string;
  agentName: string;
  created: Date;
  updated: Date;
  storageQuota: number;
  pageQuota: number;
  componentQuota: number;
  status: 'active' | 'suspended' | 'archived';
  metadata: WorkspaceMetadata;
}

export interface WorkspaceMetadata {
  description?: string;
  tags: string[];
  theme: WorkspaceTheme;
  settings: WorkspaceSettings;
}

export interface WorkspaceTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: string;
  fontFamily: string;
}

export interface WorkspaceSettings {
  enableRealTimeCollaboration: boolean;
  enableVersionHistory: boolean;
  enablePublicPages: boolean;
  maxCollaborators: number;
  autoSaveInterval: number;
}

export interface WorkspaceUsage {
  storage: number;
  pages: number;
  components: number;
  quotas: {
    storage: number;
    pages: number;
    components: number;
  };
}

export interface WorkspacePermission {
  id: string;
  workspaceId: string;
  agentName: string;
  permissionType: 'read' | 'write' | 'admin';
  resourceType: 'workspace' | 'page' | 'file';
  resourceId?: string;
  grantedAt: Date;
  grantedBy: string;
  expiresAt?: Date;
}

export interface WorkspaceFile {
  id: string;
  workspaceId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  contentHash: string;
  storageLocation: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceRequest {
  agentName: string;
  description?: string;
  theme?: Partial<WorkspaceTheme>;
  settings?: Partial<WorkspaceSettings>;
}

export interface UpdateWorkspaceRequest {
  description?: string;
  theme?: Partial<WorkspaceTheme>;
  settings?: Partial<WorkspaceSettings>;
  status?: 'active' | 'suspended' | 'archived';
}

export interface WorkspaceResponse {
  success: boolean;
  workspace?: AgentWorkspace;
  usage?: WorkspaceUsage;
  permissions?: WorkspacePermission[];
  error?: string;
}

export interface WorkspaceListResponse {
  success: boolean;
  workspaces?: AgentWorkspace[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}