/**
 * Database Configuration for Activities
 * Provides database path resolution for different environments
 */

import path from 'path';
import fs from 'fs';

/**
 * Get database path based on environment
 * @returns {string} Database file path
 */
export function getDatabasePath() {
  // In test environment, use test database
  if (process.env.NODE_ENV === 'test') {
    return path.join(process.cwd(), 'tests/tdd-london-activities/test-activities.db');
  }

  // Production database path
  const prodDbPath = path.join(process.cwd(), 'database.db');

  // Ensure directory exists
  const dbDir = path.dirname(prodDbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return prodDbPath;
}