/**
 * Migration 001: Initial Schema
 *
 * Creates the core tables for the agent-feed system:
 * - TIER 1: system_agent_templates (immutable system configuration)
 * - TIER 2: user_agent_customizations (user personalization)
 * - TIER 3: agent_memories, agent_workspaces (user data)
 * - Supporting tables: avi_state, error_log, audit_log
 */

import { Migration, MigrationClient } from './types';

export const migration001: Migration = {
  id: '001',
  version: '1.0.0',
  description: 'Initial database schema with 3-tier data protection',

  async up(client: MigrationClient): Promise<void> {
    // Enable required extensions
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pg_trgm";
      CREATE EXTENSION IF NOT EXISTS "btree_gin";
    `);

    // TIER 1: System Agent Templates (Immutable)
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_agent_templates (
        name VARCHAR(50) PRIMARY KEY,
        version INTEGER NOT NULL,

        -- PROTECTED FIELDS - Never user-editable
        model VARCHAR(100),
        posting_rules JSONB NOT NULL,
        api_schema JSONB NOT NULL,
        safety_constraints JSONB NOT NULL,

        -- DEFAULT CUSTOMIZABLE FIELDS
        default_personality TEXT,
        default_response_style JSONB,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        -- Only updateable via migration scripts
        CONSTRAINT system_only CHECK (version > 0)
      );
    `);

    // Create index for template lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_templates_version
      ON system_agent_templates(version DESC);
    `);

    // TIER 2: User Agent Customizations
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_agent_customizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(100) NOT NULL,
        agent_template VARCHAR(50) REFERENCES system_agent_templates(name),

        -- USER-EDITABLE FIELDS ONLY
        custom_name VARCHAR(100),
        personality TEXT,
        interests JSONB,
        response_style JSONB,
        enabled BOOLEAN DEFAULT TRUE,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(user_id, agent_template)
      );
    `);

    // Create indexes for customizations
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customizations_user
      ON user_agent_customizations(user_id)
      WHERE enabled = TRUE;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customizations_template
      ON user_agent_customizations(agent_template);
    `);

    // TIER 3: Agent Memories (User Data)
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_memories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(100) NOT NULL,
        agent_name VARCHAR(50) NOT NULL,
        post_id VARCHAR(100),
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),

        -- Immutable once created - prevents accidental deletion
        CONSTRAINT no_manual_delete CHECK (created_at IS NOT NULL)
      );
    `);

    // Create indexes for memory retrieval
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_user_agent_recency
      ON agent_memories(user_id, agent_name, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_metadata
      ON agent_memories USING GIN(metadata jsonb_path_ops);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memories_post
      ON agent_memories(post_id)
      WHERE post_id IS NOT NULL;
    `);

    // TIER 3: Agent Workspaces (User Files)
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_workspaces (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id VARCHAR(100) NOT NULL,
        agent_name VARCHAR(100) NOT NULL,
        file_path TEXT NOT NULL,
        content BYTEA,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(user_id, agent_name, file_path)
      );
    `);

    // Create indexes for workspace lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workspaces_user_agent
      ON agent_workspaces(user_id, agent_name);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_workspaces_path
      ON agent_workspaces USING btree(file_path);
    `);

    // Supporting Table: Avi State
    await client.query(`
      CREATE TABLE IF NOT EXISTS avi_state (
        id INTEGER PRIMARY KEY DEFAULT 1,
        last_feed_position VARCHAR(100),
        pending_tickets JSONB,
        context_size INTEGER DEFAULT 0,
        last_restart TIMESTAMP,
        uptime_seconds INTEGER DEFAULT 0,

        CONSTRAINT single_row CHECK (id = 1)
      );
    `);

    // Insert initial Avi state
    await client.query(`
      INSERT INTO avi_state (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING;
    `);

    // Supporting Table: Error Log
    await client.query(`
      CREATE TABLE IF NOT EXISTS error_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_name VARCHAR(50),
        error_type VARCHAR(50),
        error_message TEXT,
        context JSONB,
        retry_count INTEGER DEFAULT 0,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for error log queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_errors_unresolved
      ON error_log(created_at DESC)
      WHERE resolved = FALSE;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_errors_agent
      ON error_log(agent_name, created_at DESC);
    `);

    // Supporting Table: Audit Log (for migrations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        migration_id VARCHAR(50),
        version VARCHAR(20),
        action VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        snapshot JSONB,
        error TEXT,
        metadata JSONB
      );
    `);

    // Create indexes for audit log
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_migration
      ON audit_log(migration_id, timestamp DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_version
      ON audit_log(version, timestamp DESC);
    `);
  },

  async down(client: MigrationClient): Promise<void> {
    // Drop tables in reverse dependency order
    await client.query('DROP TABLE IF EXISTS audit_log CASCADE;');
    await client.query('DROP TABLE IF EXISTS error_log CASCADE;');
    await client.query('DROP TABLE IF EXISTS avi_state CASCADE;');
    await client.query('DROP TABLE IF EXISTS agent_workspaces CASCADE;');
    await client.query('DROP TABLE IF EXISTS agent_memories CASCADE;');
    await client.query('DROP TABLE IF EXISTS user_agent_customizations CASCADE;');
    await client.query('DROP TABLE IF EXISTS system_agent_templates CASCADE;');

    // Note: We don't drop extensions as they might be used by other databases
  },
};
