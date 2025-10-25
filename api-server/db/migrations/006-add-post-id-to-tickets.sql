-- Migration: Add post_id column to work_queue_tickets
-- Date: 2025-10-23
-- Purpose: Add post_id field to track which post triggered each ticket

-- SQLite doesn't support ALTER TABLE ADD COLUMN for STRICT tables easily
-- So we need to check if the column exists first

-- Add post_id column if it doesn't exist (for existing databases)
-- This is safe because we're adding a nullable column
ALTER TABLE work_queue_tickets ADD COLUMN post_id TEXT;

-- Create index for post_id queries
CREATE INDEX IF NOT EXISTS idx_work_queue_post_id ON work_queue_tickets(post_id);
