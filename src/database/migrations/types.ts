/**
 * Migration Infrastructure Types
 *
 * Defines types for migration system with data protection and rollback capabilities.
 */

export interface Migration {
  id: string;
  version: string;
  description: string;
  up: (client: MigrationClient) => Promise<void>;
  down: (client: MigrationClient) => Promise<void>;
}

export interface MigrationClient {
  query(sql: string, params?: any[]): Promise<QueryResult>;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export interface DataSnapshot {
  timestamp: Date;
  tables: TableSnapshot[];
  totalRows: number;
  totalUsers: number;
}

export interface TableSnapshot {
  tableName: string;
  rowCount: number;
  userRowCounts: Map<string, number>; // userId -> row count
  checksum?: string;
}

export interface MigrationResult {
  success: boolean;
  version: string;
  executedAt: Date;
  duration: number;
  snapshot: {
    before: DataSnapshot;
    after: DataSnapshot;
  };
  verification: VerificationResult;
}

export interface VerificationResult {
  passed: boolean;
  violations: DataViolation[];
}

export interface DataViolation {
  severity: 'critical' | 'warning';
  tableName: string;
  userId?: string;
  issue: string;
  beforeCount: number;
  afterCount: number;
}

export interface AuditLogEntry {
  id: string;
  migrationId: string;
  version: string;
  action: 'started' | 'completed' | 'failed' | 'rolled_back';
  timestamp: Date;
  snapshot?: DataSnapshot;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MigrationRunnerConfig {
  auditLogger: AuditLogger;
  verifyDataIntegrity?: boolean;
  autoRollbackOnFailure?: boolean;
}

export interface AuditLogger {
  log(entry: Omit<AuditLogEntry, 'id'>): Promise<void>;
  getHistory(migrationId: string): Promise<AuditLogEntry[]>;
}

export interface TransactionClient {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  query(sql: string, params?: any[]): Promise<QueryResult>;
  release(): void;
}

export interface DatabasePool {
  connect(): Promise<TransactionClient>;
  query(sql: string, params?: any[]): Promise<QueryResult>;
}
