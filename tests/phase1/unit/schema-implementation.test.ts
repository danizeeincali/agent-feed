/**
 * TDD London School - Schema Implementation Summary Tests
 * Validates that the complete database layer implementation meets all requirements
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Phase 1 Database Schema Implementation', () => {
  const projectRoot = '/workspaces/agent-feed';

  describe('Type Definitions', () => {
    it('should have database.ts with all 6 table interfaces', () => {
      const typesPath = path.join(projectRoot, 'src/types/database.ts');
      expect(fs.existsSync(typesPath)).toBe(true);

      const content = fs.readFileSync(typesPath, 'utf-8');

      // Verify all 6 interfaces are defined
      expect(content).toContain('export interface SystemAgentTemplate');
      expect(content).toContain('export interface UserAgentCustomization');
      expect(content).toContain('export interface AgentMemory');
      expect(content).toContain('export interface AgentWorkspace');
      expect(content).toContain('export interface AviState');
      expect(content).toContain('export interface ErrorLog');
    });

    it('should have supporting JSONB type interfaces', () => {
      const typesPath = path.join(projectRoot, 'src/types/database.ts');
      const content = fs.readFileSync(typesPath, 'utf-8');

      // Verify JSONB structure interfaces
      expect(content).toContain('export interface PostingRules');
      expect(content).toContain('export interface ApiSchema');
      expect(content).toContain('export interface SafetyConstraints');
      expect(content).toContain('export interface ResponseStyle');
      expect(content).toContain('export interface MemoryMetadata');
      expect(content).toContain('export interface WorkspaceMetadata');
    });

    it('should have type guards for runtime validation', () => {
      const typesPath = path.join(projectRoot, 'src/types/database.ts');
      const content = fs.readFileSync(typesPath, 'utf-8');

      // Verify type guard functions
      expect(content).toContain('export function isSystemAgentTemplate');
      expect(content).toContain('export function isUserAgentCustomization');
      expect(content).toContain('export function isAgentMemory');
      expect(content).toContain('export function isAgentWorkspace');
      expect(content).toContain('export function isAviState');
      expect(content).toContain('export function isErrorLog');
    });
  });

  describe('SQL Schema Files', () => {
    it('should have 001_initial_schema.sql with all 6 tables', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      expect(fs.existsSync(schemaPath)).toBe(true);

      const content = fs.readFileSync(schemaPath, 'utf-8');

      // Verify all 6 CREATE TABLE statements
      expect(content).toContain('CREATE TABLE IF NOT EXISTS system_agent_templates');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS user_agent_customizations');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS agent_memories');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS agent_workspaces');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS avi_state');
      expect(content).toContain('CREATE TABLE IF NOT EXISTS error_log');
    });

    it('should have correct columns for system_agent_templates', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      // Extract system_agent_templates table definition
      const tableMatch = content.match(/CREATE TABLE IF NOT EXISTS system_agent_templates\s*\(([\s\S]*?)\);/);
      expect(tableMatch).not.toBeNull();

      const tableDef = tableMatch![1];
      expect(tableDef).toContain('name VARCHAR(50) PRIMARY KEY');
      expect(tableDef).toContain('version INTEGER NOT NULL');
      expect(tableDef).toContain('model VARCHAR(100)');
      expect(tableDef).toContain('posting_rules JSONB NOT NULL');
      expect(tableDef).toContain('api_schema JSONB NOT NULL');
      expect(tableDef).toContain('safety_constraints JSONB NOT NULL');
      expect(tableDef).toContain('default_personality TEXT');
      expect(tableDef).toContain('default_response_style JSONB');
    });

    it('should have correct columns for user_agent_customizations', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      const tableMatch = content.match(/CREATE TABLE IF NOT EXISTS user_agent_customizations\s*\(([\s\S]*?)\);/);
      expect(tableMatch).not.toBeNull();

      const tableDef = tableMatch![1];
      expect(tableDef).toContain('id SERIAL PRIMARY KEY');
      expect(tableDef).toContain('user_id VARCHAR(100) NOT NULL');
      expect(tableDef).toContain('agent_template VARCHAR(50)');
      expect(tableDef).toContain('REFERENCES system_agent_templates(name)');
      expect(tableDef).toContain('custom_name VARCHAR(100)');
      expect(tableDef).toContain('personality TEXT');
      expect(tableDef).toContain('interests JSONB');
      expect(tableDef).toContain('response_style JSONB');
      expect(tableDef).toContain('enabled BOOLEAN DEFAULT TRUE');
      expect(tableDef).toContain('UNIQUE(user_id, agent_template)');
    });

    it('should have correct columns for agent_memories', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      const tableMatch = content.match(/CREATE TABLE IF NOT EXISTS agent_memories\s*\(([\s\S]*?)\);/);
      expect(tableMatch).not.toBeNull();

      const tableDef = tableMatch![1];
      expect(tableDef).toContain('id SERIAL PRIMARY KEY');
      expect(tableDef).toContain('user_id VARCHAR(100) NOT NULL');
      expect(tableDef).toContain('agent_name VARCHAR(50) NOT NULL');
      expect(tableDef).toContain('post_id VARCHAR(100)');
      expect(tableDef).toContain('content TEXT NOT NULL');
      expect(tableDef).toContain('metadata JSONB');
      expect(tableDef).toContain('CHECK (created_at IS NOT NULL)');
    });

    it('should have correct columns for agent_workspaces', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      const tableMatch = content.match(/CREATE TABLE IF NOT EXISTS agent_workspaces\s*\(([\s\S]*?)\);/);
      expect(tableMatch).not.toBeNull();

      const tableDef = tableMatch![1];
      expect(tableDef).toContain('id SERIAL PRIMARY KEY');
      expect(tableDef).toContain('user_id VARCHAR(100) NOT NULL');
      expect(tableDef).toContain('agent_name VARCHAR(100) NOT NULL');
      expect(tableDef).toContain('file_path TEXT NOT NULL');
      expect(tableDef).toContain('content BYTEA');
      expect(tableDef).toContain('metadata JSONB');
      expect(tableDef).toContain('UNIQUE(user_id, agent_name, file_path)');
    });

    it('should have correct columns for avi_state', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      const tableMatch = content.match(/CREATE TABLE IF NOT EXISTS avi_state\s*\(([\s\S]*?)\);/);
      expect(tableMatch).not.toBeNull();

      const tableDef = tableMatch![1];
      expect(tableDef).toContain('id INTEGER PRIMARY KEY DEFAULT 1');
      expect(tableDef).toContain('last_feed_position VARCHAR(100)');
      expect(tableDef).toContain('pending_tickets JSONB');
      expect(tableDef).toContain('context_size INTEGER DEFAULT 0');
      expect(tableDef).toContain('last_restart TIMESTAMP');
      expect(tableDef).toContain('uptime_seconds INTEGER DEFAULT 0');
      expect(tableDef).toContain('CHECK (id = 1)');
    });

    it('should have correct columns for error_log', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      const tableMatch = content.match(/CREATE TABLE IF NOT EXISTS error_log\s*\(([\s\S]*?)\);/);
      expect(tableMatch).not.toBeNull();

      const tableDef = tableMatch![1];
      expect(tableDef).toContain('id SERIAL PRIMARY KEY');
      expect(tableDef).toContain('agent_name VARCHAR(50)');
      expect(tableDef).toContain('error_type VARCHAR(50)');
      expect(tableDef).toContain('error_message TEXT');
      expect(tableDef).toContain('context JSONB');
      expect(tableDef).toContain('retry_count INTEGER DEFAULT 0');
      expect(tableDef).toContain('resolved BOOLEAN DEFAULT FALSE');
    });
  });

  describe('Index Definitions', () => {
    it('should have indexes.sql with GIN indexes for JSONB columns', () => {
      const indexesPath = path.join(projectRoot, 'src/database/schema/indexes.sql');
      expect(fs.existsSync(indexesPath)).toBe(true);

      const content = fs.readFileSync(indexesPath, 'utf-8');

      // Verify GIN indexes for JSONB columns
      expect(content).toContain('idx_user_agent_customizations_interests');
      expect(content).toContain('idx_user_agent_customizations_response_style');
      expect(content).toContain('idx_agent_memories_metadata');
      expect(content).toContain('idx_agent_workspaces_metadata');
      expect(content).toContain('idx_error_log_context');
    });

    it('should have composite index for memory retrieval', () => {
      const indexesPath = path.join(projectRoot, 'src/database/schema/indexes.sql');
      const content = fs.readFileSync(indexesPath, 'utf-8');

      // Verify composite index for (user_id, agent_name, created_at DESC)
      expect(content).toContain('idx_agent_memories_user_agent_recency');
      expect(content).toContain('user_id, agent_name, created_at DESC');
    });

    it('should use jsonb_path_ops for smaller index size', () => {
      const indexesPath = path.join(projectRoot, 'src/database/schema/indexes.sql');
      const content = fs.readFileSync(indexesPath, 'utf-8');

      // Verify jsonb_path_ops usage (60% smaller indexes)
      expect(content).toContain('jsonb_path_ops');
    });
  });

  describe('Seed Data', () => {
    it('should have seed.sql with avi_state initialization', () => {
      const seedPath = path.join(projectRoot, 'src/database/schema/seed.sql');
      expect(fs.existsSync(seedPath)).toBe(true);

      const content = fs.readFileSync(seedPath, 'utf-8');

      // Verify avi_state seed
      expect(content).toContain('INSERT INTO avi_state');
      expect(content).toContain('id');
      expect(content).toContain('VALUES');
      expect(content).toContain('1'); // id must be 1
    });

    it('should use ON CONFLICT for idempotent seeding', () => {
      const seedPath = path.join(projectRoot, 'src/database/schema/seed.sql');
      const content = fs.readFileSync(seedPath, 'utf-8');

      // Verify idempotent seed pattern
      expect(content).toContain('ON CONFLICT');
      expect(content).toContain('DO NOTHING');
    });
  });

  describe('3-Tier Data Protection Model', () => {
    it('should document TIER 1 (system templates) as immutable', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      // Verify TIER 1 documentation
      expect(content).toContain('TIER 1');
      expect(content).toContain('Immutable system defaults');
      expect(content).toContain('system_agent_templates');
    });

    it('should document TIER 2 (user customizations) as user-editable', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      // Verify TIER 2 documentation
      expect(content).toContain('TIER 2');
      expect(content).toContain('User');
      expect(content).toContain('user_agent_customizations');
    });

    it('should document TIER 3 (user data) as protected', () => {
      const schemaPath = path.join(projectRoot, 'src/database/schema/001_initial_schema.sql');
      const content = fs.readFileSync(schemaPath, 'utf-8');

      // Verify TIER 3 documentation
      expect(content).toContain('TIER 3');
      expect(content).toContain('agent_memories');
      expect(content).toContain('agent_workspaces');
    });
  });

  describe('Test Coverage', () => {
    it('should have type definition tests', () => {
      const testPath = path.join(projectRoot, 'tests/phase1/unit/types.test.ts');
      expect(fs.existsSync(testPath)).toBe(true);

      const content = fs.readFileSync(testPath, 'utf-8');
      expect(content).toContain('Database Type Definitions');
      expect(content).toContain('SystemAgentTemplate');
      expect(content).toContain('UserAgentCustomization');
      expect(content).toContain('AgentMemory');
    });

    it('should have schema validation tests', () => {
      const testPath = path.join(projectRoot, 'tests/phase1/unit/schema-validation.test.ts');
      expect(fs.existsSync(testPath)).toBe(true);

      const content = fs.readFileSync(testPath, 'utf-8');
      expect(content).toContain('Database Schema Validation');
      expect(content).toContain('should have correct columns');
      expect(content).toContain('GIN index');
    });
  });
});
