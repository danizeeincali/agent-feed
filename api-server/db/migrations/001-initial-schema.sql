-- ============================================================
-- MIGRATION 001: Initial Schema - Core Tables
-- ============================================================
-- Version: 1.0.0
-- Created: 2025-11-07
-- Description: Creates core tables for Agent Feed application
-- Dependencies: None (first migration)
-- ============================================================

-- Enable SQLite optimizations (must be before transaction)
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- ============================================================
-- USERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER,
  last_seen_at INTEGER,
  preferences TEXT,  -- JSON
  metadata TEXT      -- JSON
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================================
-- AGENT_POSTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_posts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  author TEXT,
  author_id TEXT,
  author_agent TEXT,           -- snake_case - agent identifier
  content TEXT,
  title TEXT,
  metadata TEXT,               -- JSON
  published_at INTEGER DEFAULT (unixepoch()),
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER,
  engagement_score REAL DEFAULT 0,
  content_hash TEXT,

  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON agent_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_agent ON agent_posts(author_agent);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON agent_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON agent_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_engagement ON agent_posts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_content_hash ON agent_posts(content_hash);

COMMIT;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
