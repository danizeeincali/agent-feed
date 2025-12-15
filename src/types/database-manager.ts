/**
 * Database Manager Interface
 * Abstraction for database operations
 */

import { SystemTemplate, UserCustomization } from './agent-context';

export interface QueryResult<T> {
  rows: T[];
}

export interface DatabaseManager {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
}
