# Dynamic Agent Pages Implementation Guide

## Implementation Roadmap

This document provides detailed implementation specifications for the Dynamic Agent Pages system, building upon the architectural design.

## 1. Database Migration Scripts

### 1.1 Initial Migration (001_agent_profiles.sql)

```sql
-- Migration: Add agent profiles and dynamic page support
-- Version: 001
-- Description: Initial setup for dynamic agent pages

BEGIN;

-- Enhanced agent profiles table
CREATE TABLE IF NOT EXISTS agent_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    description TEXT,
    specialization VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    
    -- Profile Configuration
    profile_config JSONB DEFAULT '{
        "theme": "default",
        "layout": "standard",
        "sections": ["overview", "activities", "performance", "capabilities"]
    }',
    ui_config JSONB DEFAULT '{
        "showMetrics": true,
        "showActivities": true,
        "autoRefresh": true,
        "refreshInterval": 30
    }',
    display_preferences JSONB DEFAULT '{
        "timezone": "UTC",
        "dateFormat": "ISO",
        "numberFormat": "en-US"
    }',
    
    -- Visibility Settings
    visibility VARCHAR(50) DEFAULT 'public',
    featured BOOLEAN DEFAULT false,
    searchable BOOLEAN DEFAULT true,
    tags JSONB DEFAULT '[]',
    
    -- SEO and Metadata
    slug VARCHAR(255) UNIQUE,
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT agent_profiles_status_check CHECK (status IN ('active', 'inactive', 'archived', 'maintenance')),
    CONSTRAINT agent_profiles_visibility_check CHECK (visibility IN ('public', 'private', 'team', 'restricted'))
);

-- Generate slug from agent_id if not provided
CREATE OR REPLACE FUNCTION generate_agent_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL THEN
        NEW.slug := LOWER(REGEXP_REPLACE(NEW.agent_id, '[^a-zA-Z0-9]+', '-', 'g'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_profiles_slug_trigger
    BEFORE INSERT OR UPDATE ON agent_profiles
    FOR EACH ROW EXECUTE FUNCTION generate_agent_slug();

-- Agent capabilities with versioning
CREATE TABLE IF NOT EXISTS agent_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(100) NOT NULL REFERENCES agent_profiles(agent_id) ON DELETE CASCADE,
    capability_name VARCHAR(255) NOT NULL,
    capability_category VARCHAR(100) DEFAULT 'general',
    capability_level INTEGER NOT NULL CHECK (capability_level >= 1 AND capability_level <= 10),
    description TEXT,
    
    -- Experience and Usage
    experience_hours INTEGER DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Performance Metrics
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    average_execution_time_ms INTEGER DEFAULT 0,
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    
    -- Capability Metadata
    prerequisites JSONB DEFAULT '[]',
    related_capabilities JSONB DEFAULT '[]',
    capability_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(agent_id, capability_name)
);

-- Real-time agent metrics (separate from historical)
CREATE TABLE IF NOT EXISTS agent_metrics_realtime (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(100) NOT NULL REFERENCES agent_profiles(agent_id) ON DELETE CASCADE,
    
    -- Current Status
    current_status VARCHAR(50) DEFAULT 'idle',
    current_task TEXT,
    current_task_progress INTEGER DEFAULT 0 CHECK (current_task_progress >= 0 AND current_task_progress <= 100),
    
    -- Today's Metrics
    tasks_completed_today INTEGER DEFAULT 0,
    tasks_failed_today INTEGER DEFAULT 0,
    total_processing_time_today INTEGER DEFAULT 0, -- milliseconds
    
    -- Weekly Metrics
    tasks_completed_week INTEGER DEFAULT 0,
    tasks_failed_week INTEGER DEFAULT 0,
    
    -- Monthly Metrics
    tasks_completed_month INTEGER DEFAULT 0,
    tasks_failed_month INTEGER DEFAULT 0,
    
    -- Performance Metrics
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    average_response_time DECIMAL(8,2) DEFAULT 0.00,
    peak_response_time DECIMAL(8,2) DEFAULT 0.00,
    
    -- Workload Metrics
    active_tasks INTEGER DEFAULT 0,
    queued_tasks INTEGER DEFAULT 0,
    max_concurrent_tasks INTEGER DEFAULT 5,
    estimated_completion_minutes INTEGER DEFAULT 0,
    
    -- System Metrics
    uptime_percentage DECIMAL(5,2) DEFAULT 0.00,
    memory_usage_mb INTEGER DEFAULT 0,
    cpu_usage_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Connection Status
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    connection_quality VARCHAR(20) DEFAULT 'good',
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT agent_metrics_status_check CHECK (current_status IN (
        'active', 'idle', 'busy', 'offline', 'error', 'maintenance'
    )),
    CONSTRAINT agent_metrics_connection_check CHECK (connection_quality IN (
        'excellent', 'good', 'fair', 'poor', 'offline'
    ))
);

-- Agent activity timeline with enhanced context
CREATE TABLE IF NOT EXISTS agent_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(100) NOT NULL REFERENCES agent_profiles(agent_id) ON DELETE CASCADE,
    
    -- Activity Classification
    activity_type VARCHAR(100) NOT NULL,
    activity_category VARCHAR(50) DEFAULT 'task',
    activity_title VARCHAR(500) NOT NULL,
    activity_description TEXT,
    
    -- Activity Context
    context_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    
    -- Performance and Impact
    impact_score DECIMAL(3,1) DEFAULT 0.0 CHECK (impact_score >= 0 AND impact_score <= 10),
    quality_score DECIMAL(3,1) DEFAULT 0.0 CHECK (quality_score >= 0 AND quality_score <= 10),
    success BOOLEAN DEFAULT true,
    duration_seconds INTEGER DEFAULT 0,
    
    -- Resource Usage
    memory_usage_mb INTEGER DEFAULT 0,
    cpu_time_ms INTEGER DEFAULT 0,
    network_requests INTEGER DEFAULT 0,
    
    -- Relationships
    related_post_id UUID REFERENCES agent_posts(id),
    related_user_id UUID REFERENCES users(id),
    parent_activity_id UUID REFERENCES agent_activities(id),
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT agent_activities_type_check CHECK (activity_type IN (
        'task_started', 'task_completed', 'task_failed', 'task_paused', 'task_resumed',
        'milestone_reached', 'error_occurred', 'warning_issued', 'status_changed',
        'capability_used', 'capability_improved', 'interaction', 'system_event',
        'configuration_changed', 'maintenance_started', 'maintenance_completed'
    )),
    CONSTRAINT agent_activities_category_check CHECK (activity_category IN (
        'task', 'system', 'interaction', 'maintenance', 'performance', 'error'
    ))
);

-- Historical metrics for trend analysis
CREATE TABLE IF NOT EXISTS agent_metrics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(100) NOT NULL REFERENCES agent_profiles(agent_id) ON DELETE CASCADE,
    
    -- Time Bucket
    time_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
    bucket_type VARCHAR(20) NOT NULL, -- 'hour', 'day', 'week', 'month'
    
    -- Aggregated Metrics
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    avg_response_time DECIMAL(8,2) DEFAULT 0.00,
    max_response_time DECIMAL(8,2) DEFAULT 0.00,
    min_response_time DECIMAL(8,2) DEFAULT 0.00,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    
    -- Workload Statistics
    avg_concurrent_tasks DECIMAL(5,2) DEFAULT 0.00,
    max_concurrent_tasks INTEGER DEFAULT 0,
    total_processing_time INTEGER DEFAULT 0,
    
    -- System Statistics
    avg_memory_usage DECIMAL(8,2) DEFAULT 0.00,
    avg_cpu_usage DECIMAL(5,2) DEFAULT 0.00,
    uptime_minutes INTEGER DEFAULT 0,
    downtime_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(agent_id, time_bucket, bucket_type),
    
    CONSTRAINT agent_metrics_history_bucket_check CHECK (bucket_type IN (
        'hour', 'day', 'week', 'month'
    ))
);

-- Agent page views and engagement tracking
CREATE TABLE IF NOT EXISTS agent_page_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id VARCHAR(100) NOT NULL REFERENCES agent_profiles(agent_id) ON DELETE CASCADE,
    
    -- Session Information
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES users(id),
    
    -- Page View Details
    page_section VARCHAR(100) DEFAULT 'overview',
    view_duration_seconds INTEGER DEFAULT 0,
    interactions_count INTEGER DEFAULT 0,
    
    -- Context
    referrer VARCHAR(500),
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    ip_address INET,
    
    -- Engagement Metrics
    scroll_depth_percentage INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    time_to_first_interaction INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT agent_page_analytics_section_check CHECK (page_section IN (
        'overview', 'activities', 'performance', 'capabilities', 'configuration', 'history'
    ))
);

-- Performance Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_profiles_status_featured 
ON agent_profiles (status, featured) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_profiles_slug 
ON agent_profiles (slug) WHERE slug IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_profiles_searchable 
ON agent_profiles (searchable, visibility) WHERE searchable = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_capabilities_agent_category 
ON agent_capabilities (agent_id, capability_category, capability_level DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_metrics_agent_updated 
ON agent_metrics_realtime (agent_id, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_activities_agent_created 
ON agent_activities (agent_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_activities_type_category 
ON agent_activities (activity_type, activity_category, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_metrics_history_bucket 
ON agent_metrics_history (agent_id, bucket_type, time_bucket DESC);

-- Full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agent_profiles_search 
ON agent_profiles USING GIN (
    to_tsvector('english', 
        display_name || ' ' || 
        COALESCE(description, '') || ' ' || 
        COALESCE(specialization, '') || ' ' ||
        COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(tags)), ' '), '')
    )
);

COMMIT;
```

### 1.2 Data Seeding Script

```sql
-- Seed data for agent profiles
INSERT INTO agent_profiles (agent_id, display_name, description, specialization, featured, tags) VALUES
    ('chief-of-staff', 'Chief of Staff Agent', 
     'Strategic coordination and executive assistance agent specialized in planning and workflow optimization', 
     'Strategic Planning & Coordination', true, 
     '["strategy", "coordination", "planning", "executive"]'),
     
    ('personal-todos', 'Personal Todos Agent', 
     'Personal task management and priority optimization specialist', 
     'Task Management & Productivity', true, 
     '["tasks", "productivity", "personal", "organization"]'),
     
    ('meeting-prep', 'Meeting Preparation Agent', 
     'Meeting planning and preparation automation specialist', 
     'Meeting Management', false, 
     '["meetings", "preparation", "scheduling", "collaboration"]'),
     
    ('meeting-next-steps', 'Meeting Next Steps Agent', 
     'Post-meeting action item tracking and follow-up management', 
     'Action Item Tracking', false, 
     '["meetings", "follow-up", "action-items", "tracking"]'),
     
    ('follow-ups', 'Follow-ups Agent', 
     'Comprehensive follow-up management and status tracking system', 
     'Follow-up Management', false, 
     '["follow-up", "status", "tracking", "communication"]')
ON CONFLICT (agent_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    specialization = EXCLUDED.specialization,
    featured = EXCLUDED.featured,
    tags = EXCLUDED.tags,
    updated_at = CURRENT_TIMESTAMP;

-- Seed capabilities for each agent
INSERT INTO agent_capabilities (agent_id, capability_name, capability_category, capability_level, description, experience_hours) VALUES
    -- Chief of Staff capabilities
    ('chief-of-staff', 'Strategic Planning', 'strategy', 9, 'Long-term strategic planning and roadmap development', 1250),
    ('chief-of-staff', 'Task Coordination', 'coordination', 10, 'Multi-agent task coordination and workflow optimization', 2100),
    ('chief-of-staff', 'Priority Assessment', 'analysis', 8, 'Business impact analysis and priority scoring', 890),
    ('chief-of-staff', 'Resource Management', 'management', 9, 'Optimal allocation of resources and capacity planning', 1560),
    ('chief-of-staff', 'Decision Support', 'analysis', 8, 'Data-driven decision making and recommendation systems', 970),
    
    -- Personal Todos capabilities
    ('personal-todos', 'Task Prioritization', 'productivity', 9, 'Advanced task prioritization using multiple criteria', 800),
    ('personal-todos', 'Time Management', 'productivity', 8, 'Optimal time allocation and schedule optimization', 650),
    ('personal-todos', 'Goal Tracking', 'tracking', 7, 'Progress tracking and milestone management', 420),
    ('personal-todos', 'Habit Formation', 'behavioral', 6, 'Habit building and routine optimization', 300),
    
    -- Meeting Prep capabilities
    ('meeting-prep', 'Agenda Creation', 'planning', 8, 'Structured agenda creation and time allocation', 400),
    ('meeting-prep', 'Stakeholder Analysis', 'analysis', 7, 'Participant analysis and preparation recommendations', 250),
    ('meeting-prep', 'Resource Preparation', 'preparation', 8, 'Meeting resource and material preparation', 380),
    
    -- Meeting Next Steps capabilities
    ('meeting-next-steps', 'Action Item Extraction', 'extraction', 9, 'Automatic extraction of action items from meetings', 600),
    ('meeting-next-steps', 'Responsibility Assignment', 'assignment', 8, 'Optimal task assignment based on capacity and skills', 450),
    ('meeting-next-steps', 'Timeline Creation', 'planning', 7, 'Realistic timeline creation for action items', 320),
    
    -- Follow-ups capabilities
    ('follow-ups', 'Status Tracking', 'tracking', 8, 'Comprehensive status tracking and reporting', 550),
    ('follow-ups', 'Escalation Management', 'management', 7, 'Intelligent escalation based on priority and timing', 300),
    ('follow-ups', 'Communication Optimization', 'communication', 6, 'Optimal communication timing and channels', 200)
ON CONFLICT (agent_id, capability_name) DO UPDATE SET
    capability_level = EXCLUDED.capability_level,
    description = EXCLUDED.description,
    experience_hours = EXCLUDED.experience_hours,
    updated_at = CURRENT_TIMESTAMP;

-- Initialize real-time metrics for all agents
INSERT INTO agent_metrics_realtime (agent_id, current_status, tasks_completed_today, tasks_completed_week, 
    tasks_completed_month, success_rate, average_response_time, uptime_percentage)
SELECT agent_id, 'active', 
    FLOOR(RANDOM() * 25) + 5,  -- 5-30 tasks today
    FLOOR(RANDOM() * 100) + 50, -- 50-150 tasks this week
    FLOOR(RANDOM() * 400) + 200, -- 200-600 tasks this month
    ROUND((RANDOM() * 10 + 90)::numeric, 2), -- 90-100% success rate
    ROUND((RANDOM() * 2 + 0.5)::numeric, 2), -- 0.5-2.5s response time
    ROUND((RANDOM() * 5 + 95)::numeric, 2)   -- 95-100% uptime
FROM agent_profiles
ON CONFLICT (agent_id) DO NOTHING;
```

## 2. Backend API Implementation

### 2.1 Agent Profile Service

```javascript
// src/services/AgentProfileService.js
import { databaseService } from '../database/DatabaseService.js';
import { cacheService } from './CacheService.js';
import { eventBus } from './EventBus.js';

export class AgentProfileService {
  constructor() {
    this.cache = cacheService;
    this.eventBus = eventBus;
  }

  /**
   * Get paginated list of agents with filters
   */
  async getAgents({
    search = '',
    type = [],
    status = ['active'],
    capabilities = [],
    featured = null,
    sort = 'name',
    order = 'asc',
    page = 1,
    limit = 20
  } = {}) {
    const cacheKey = `agents:list:${JSON.stringify(arguments[0])}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT 
          ap.*,
          arm.current_status,
          arm.tasks_completed_today,
          arm.tasks_completed_week,
          arm.success_rate,
          arm.uptime_percentage,
          COUNT(ac.id) as capability_count,
          (
            SELECT COUNT(*) 
            FROM agent_activities aa 
            WHERE aa.agent_id = ap.agent_id 
            AND aa.created_at >= CURRENT_DATE
          ) as today_activities
        FROM agent_profiles ap
        LEFT JOIN agent_metrics_realtime arm ON ap.agent_id = arm.agent_id
        LEFT JOIN agent_capabilities ac ON ap.agent_id = ac.agent_id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      // Apply filters
      if (search) {
        query += ` AND to_tsvector('english', ap.display_name || ' ' || COALESCE(ap.description, '')) @@ plainto_tsquery($${paramIndex})`;
        params.push(search);
        paramIndex++;
      }

      if (status.length > 0) {
        query += ` AND ap.status = ANY($${paramIndex})`;
        params.push(status);
        paramIndex++;
      }

      if (featured !== null) {
        query += ` AND ap.featured = $${paramIndex}`;
        params.push(featured);
        paramIndex++;
      }

      if (capabilities.length > 0) {
        query += ` AND ap.agent_id IN (
          SELECT DISTINCT agent_id 
          FROM agent_capabilities 
          WHERE capability_name = ANY($${paramIndex})
        )`;
        params.push(capabilities);
        paramIndex++;
      }

      query += ` GROUP BY ap.id, arm.current_status, arm.tasks_completed_today, arm.tasks_completed_week, arm.success_rate, arm.uptime_percentage`;

      // Apply sorting
      const sortMap = {
        name: 'ap.display_name',
        activity: 'today_activities',
        performance: 'arm.success_rate',
        created: 'ap.created_at'
      };
      
      const sortColumn = sortMap[sort] || 'ap.display_name';
      query += ` ORDER BY ${sortColumn} ${order.toUpperCase()}`;

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await databaseService.query(query, params);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(DISTINCT ap.id) as total
        FROM agent_profiles ap
        LEFT JOIN agent_capabilities ac ON ap.agent_id = ac.agent_id
        WHERE 1=1 ${search ? `AND to_tsvector('english', ap.display_name || ' ' || COALESCE(ap.description, '')) @@ plainto_tsquery('${search}')` : ''}
        ${status.length > 0 ? `AND ap.status = ANY(ARRAY['${status.join("','")}'])` : ''}
        ${featured !== null ? `AND ap.featured = ${featured}` : ''}
      `;

      const countResult = await databaseService.query(countQuery);
      const total = parseInt(countResult.rows[0].total);

      const response = {
        agents: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        facets: await this.getAgentFacets()
      };

      // Cache for 2 minutes
      await this.cache.set(cacheKey, response, 120);
      return response;

    } catch (error) {
      console.error('Error fetching agents:', error);
      throw new Error('Failed to fetch agents');
    }
  }

  /**
   * Get detailed agent profile
   */
  async getAgentProfile(agentId, includeMetrics = true, includeActivities = true) {
    const cacheKey = `agent:profile:${agentId}:${includeMetrics}:${includeActivities}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Get base profile
      const profileQuery = `
        SELECT ap.*, arm.*,
          COALESCE(
            (SELECT COUNT(*) FROM agent_activities aa WHERE aa.agent_id = ap.agent_id), 0
          ) as total_activities
        FROM agent_profiles ap
        LEFT JOIN agent_metrics_realtime arm ON ap.agent_id = arm.agent_id
        WHERE ap.agent_id = $1
      `;

      const profileResult = await databaseService.query(profileQuery, [agentId]);
      
      if (profileResult.rows.length === 0) {
        throw new Error('Agent not found');
      }

      const profile = profileResult.rows[0];

      // Get capabilities
      const capabilitiesQuery = `
        SELECT * FROM agent_capabilities 
        WHERE agent_id = $1 
        ORDER BY capability_level DESC, capability_name
      `;
      const capabilitiesResult = await databaseService.query(capabilitiesQuery, [agentId]);

      // Get recent activities if requested
      let activities = [];
      if (includeActivities) {
        const activitiesQuery = `
          SELECT * FROM agent_activities 
          WHERE agent_id = $1 
          ORDER BY created_at DESC 
          LIMIT 20
        `;
        const activitiesResult = await databaseService.query(activitiesQuery, [agentId]);
        activities = activitiesResult.rows;
      }

      // Get performance metrics if requested
      let performanceMetrics = null;
      if (includeMetrics) {
        performanceMetrics = await this.getAgentPerformanceMetrics(agentId);
      }

      const agentProfile = {
        ...profile,
        capabilities: capabilitiesResult.rows,
        recentActivities: activities,
        performanceMetrics
      };

      // Cache for 30 seconds
      await this.cache.set(cacheKey, agentProfile, 30);
      return agentProfile;

    } catch (error) {
      console.error('Error fetching agent profile:', error);
      throw error;
    }
  }

  /**
   * Get agent performance metrics with time series data
   */
  async getAgentPerformanceMetrics(agentId, timeRange = '24h', granularity = 'hour') {
    const cacheKey = `agent:metrics:${agentId}:${timeRange}:${granularity}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const timeRangeMap = {
        '1h': '1 hour',
        '24h': '24 hours',
        '7d': '7 days',
        '30d': '30 days'
      };

      const interval = timeRangeMap[timeRange] || '24 hours';
      
      const query = `
        SELECT 
          time_bucket,
          bucket_type,
          tasks_completed,
          tasks_failed,
          avg_response_time,
          success_rate,
          avg_concurrent_tasks,
          uptime_minutes
        FROM agent_metrics_history
        WHERE agent_id = $1
        AND bucket_type = $2
        AND time_bucket >= NOW() - INTERVAL '${interval}'
        ORDER BY time_bucket ASC
      `;

      const result = await databaseService.query(query, [agentId, granularity]);

      const metrics = {
        timeRange,
        granularity,
        data: result.rows,
        summary: await this.calculateMetricsSummary(agentId, interval)
      };

      // Cache for 5 minutes
      await this.cache.set(cacheKey, metrics, 300);
      return metrics;

    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get agent activities with filtering
   */
  async getAgentActivities(agentId, {
    type = [],
    category = [],
    since = null,
    limit = 50,
    offset = 0
  } = {}) {
    try {
      let query = `
        SELECT aa.*, u.name as related_user_name
        FROM agent_activities aa
        LEFT JOIN users u ON aa.related_user_id = u.id
        WHERE aa.agent_id = $1
      `;

      const params = [agentId];
      let paramIndex = 2;

      if (type.length > 0) {
        query += ` AND aa.activity_type = ANY($${paramIndex})`;
        params.push(type);
        paramIndex++;
      }

      if (category.length > 0) {
        query += ` AND aa.activity_category = ANY($${paramIndex})`;
        params.push(category);
        paramIndex++;
      }

      if (since) {
        query += ` AND aa.created_at >= $${paramIndex}`;
        params.push(since);
        paramIndex++;
      }

      query += ` ORDER BY aa.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await databaseService.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('Error fetching agent activities:', error);
      throw error;
    }
  }

  /**
   * Update agent real-time metrics
   */
  async updateAgentMetrics(agentId, metrics) {
    try {
      const updateQuery = `
        UPDATE agent_metrics_realtime 
        SET 
          current_status = COALESCE($2, current_status),
          current_task = COALESCE($3, current_task),
          tasks_completed_today = COALESCE($4, tasks_completed_today),
          success_rate = COALESCE($5, success_rate),
          average_response_time = COALESCE($6, average_response_time),
          active_tasks = COALESCE($7, active_tasks),
          queued_tasks = COALESCE($8, queued_tasks),
          memory_usage_mb = COALESCE($9, memory_usage_mb),
          cpu_usage_percentage = COALESCE($10, cpu_usage_percentage),
          last_heartbeat = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = $1
        RETURNING *
      `;

      const result = await databaseService.query(updateQuery, [
        agentId,
        metrics.current_status,
        metrics.current_task,
        metrics.tasks_completed_today,
        metrics.success_rate,
        metrics.average_response_time,
        metrics.active_tasks,
        metrics.queued_tasks,
        metrics.memory_usage_mb,
        metrics.cpu_usage_percentage
      ]);

      if (result.rows.length > 0) {
        // Invalidate cache
        await this.cache.invalidatePattern(`agent:*:${agentId}:*`);
        
        // Emit real-time event
        this.eventBus.emit('agent:metrics:updated', {
          agentId,
          metrics: result.rows[0],
          timestamp: new Date().toISOString()
        });

        return result.rows[0];
      }

      return null;

    } catch (error) {
      console.error('Error updating agent metrics:', error);
      throw error;
    }
  }

  /**
   * Record agent activity
   */
  async recordActivity(agentId, activity) {
    try {
      const insertQuery = `
        INSERT INTO agent_activities (
          agent_id, activity_type, activity_category, activity_title,
          activity_description, context_data, metadata, impact_score,
          quality_score, success, duration_seconds, related_post_id,
          related_user_id, session_id, started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const result = await databaseService.query(insertQuery, [
        agentId,
        activity.type,
        activity.category || 'task',
        activity.title,
        activity.description,
        JSON.stringify(activity.context || {}),
        JSON.stringify(activity.metadata || {}),
        activity.impact_score || 0,
        activity.quality_score || 0,
        activity.success !== false,
        activity.duration_seconds || 0,
        activity.related_post_id,
        activity.related_user_id,
        activity.session_id,
        activity.started_at || new Date(),
        activity.completed_at
      ]);

      if (result.rows.length > 0) {
        // Invalidate activity cache
        await this.cache.invalidatePattern(`agent:*:${agentId}:*`);
        
        // Emit real-time event
        this.eventBus.emit('agent:activity:new', {
          agentId,
          activity: result.rows[0]
        });

        return result.rows[0];
      }

      return null;

    } catch (error) {
      console.error('Error recording agent activity:', error);
      throw error;
    }
  }

  /**
   * Get facets for filtering
   */
  async getAgentFacets() {
    const cacheKey = 'agents:facets';
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const [statusResult, capabilityResult, typeResult] = await Promise.all([
        databaseService.query(`
          SELECT status, COUNT(*) as count 
          FROM agent_profiles 
          GROUP BY status 
          ORDER BY count DESC
        `),
        databaseService.query(`
          SELECT capability_name, COUNT(*) as count 
          FROM agent_capabilities 
          GROUP BY capability_name 
          ORDER BY count DESC 
          LIMIT 20
        `),
        databaseService.query(`
          SELECT 
            UNNEST(tags) as tag, 
            COUNT(*) as count 
          FROM agent_profiles 
          WHERE tags IS NOT NULL 
          GROUP BY tag 
          ORDER BY count DESC 
          LIMIT 15
        `)
      ]);

      const facets = {
        status: statusResult.rows,
        capabilities: capabilityResult.rows,
        tags: typeResult.rows
      };

      // Cache for 10 minutes
      await this.cache.set(cacheKey, facets, 600);
      return facets;

    } catch (error) {
      console.error('Error fetching agent facets:', error);
      return { status: [], capabilities: [], tags: [] };
    }
  }

  /**
   * Calculate metrics summary
   */
  async calculateMetricsSummary(agentId, interval) {
    try {
      const query = `
        SELECT 
          AVG(tasks_completed) as avg_tasks,
          SUM(tasks_completed) as total_tasks,
          AVG(success_rate) as avg_success_rate,
          AVG(avg_response_time) as avg_response_time,
          MAX(avg_response_time) as max_response_time,
          AVG(uptime_minutes) as avg_uptime
        FROM agent_metrics_history
        WHERE agent_id = $1
        AND time_bucket >= NOW() - INTERVAL '${interval}'
      `;

      const result = await databaseService.query(query, [agentId]);
      return result.rows[0];

    } catch (error) {
      console.error('Error calculating metrics summary:', error);
      return null;
    }
  }
}

export const agentProfileService = new AgentProfileService();
```

### 2.2 API Routes

```javascript
// src/routes/agentProfiles.js
import express from 'express';
import { agentProfileService } from '../services/AgentProfileService.js';
import { validateRequest, authMiddleware } from '../middleware/index.js';
import { body, query, param } from 'express-validator';

const router = express.Router();

/**
 * GET /api/v1/agents
 * Get paginated list of agents with filtering
 */
router.get('/', 
  [
    query('search').optional().isString().isLength({ max: 255 }),
    query('type').optional().isArray(),
    query('status').optional().isArray(),
    query('capabilities').optional().isArray(),
    query('featured').optional().isBoolean(),
    query('sort').optional().isIn(['name', 'activity', 'performance', 'created']),
    query('order').optional().isIn(['asc', 'desc']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const result = await agentProfileService.getAgents(req.query);
      
      res.set({
        'Cache-Control': 'public, max-age=120', // 2 minutes
        'X-Total-Count': result.pagination.total.toString()
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error in GET /agents:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
);

/**
 * GET /api/v1/agents/:agentId
 * Get detailed agent profile
 */
router.get('/:agentId',
  [
    param('agentId').isString().isLength({ min: 1, max: 100 }),
    query('includeMetrics').optional().isBoolean(),
    query('includeActivities').optional().isBoolean()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const { includeMetrics = true, includeActivities = true } = req.query;
      
      const profile = await agentProfileService.getAgentProfile(
        agentId, 
        includeMetrics, 
        includeActivities
      );
      
      res.set({
        'Cache-Control': 'public, max-age=30', // 30 seconds
        'ETag': `"${profile.updated_at}"`
      });
      
      res.json(profile);
    } catch (error) {
      if (error.message === 'Agent not found') {
        res.status(404).json({ error: 'Agent not found' });
      } else {
        console.error('Error in GET /agents/:agentId:', error);
        res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }
  }
);

/**
 * GET /api/v1/agents/:agentId/metrics
 * Get agent performance metrics
 */
router.get('/:agentId/metrics',
  [
    param('agentId').isString().isLength({ min: 1, max: 100 }),
    query('timeRange').optional().isIn(['1h', '24h', '7d', '30d']),
    query('granularity').optional().isIn(['minute', 'hour', 'day'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const { timeRange = '24h', granularity = 'hour' } = req.query;
      
      const metrics = await agentProfileService.getAgentPerformanceMetrics(
        agentId, 
        timeRange, 
        granularity
      );
      
      res.set({
        'Cache-Control': 'public, max-age=60', // 1 minute
      });
      
      res.json(metrics);
    } catch (error) {
      console.error('Error in GET /agents/:agentId/metrics:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
);

/**
 * GET /api/v1/agents/:agentId/activities
 * Get agent activities
 */
router.get('/:agentId/activities',
  [
    param('agentId').isString().isLength({ min: 1, max: 100 }),
    query('type').optional().isArray(),
    query('category').optional().isArray(),
    query('since').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const activities = await agentProfileService.getAgentActivities(agentId, req.query);
      
      res.set({
        'Cache-Control': 'public, max-age=30', // 30 seconds
      });
      
      res.json({ activities });
    } catch (error) {
      console.error('Error in GET /agents/:agentId/activities:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
);

/**
 * PUT /api/v1/agents/:agentId/metrics
 * Update agent metrics (internal use)
 */
router.put('/:agentId/metrics',
  authMiddleware,
  [
    param('agentId').isString().isLength({ min: 1, max: 100 }),
    body('current_status').optional().isIn(['active', 'idle', 'busy', 'offline', 'error', 'maintenance']),
    body('current_task').optional().isString().isLength({ max: 500 }),
    body('tasks_completed_today').optional().isInt({ min: 0 }),
    body('success_rate').optional().isFloat({ min: 0, max: 100 }),
    body('average_response_time').optional().isFloat({ min: 0 }),
    body('active_tasks').optional().isInt({ min: 0 }),
    body('queued_tasks').optional().isInt({ min: 0 }),
    body('memory_usage_mb').optional().isInt({ min: 0 }),
    body('cpu_usage_percentage').optional().isFloat({ min: 0, max: 100 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const metrics = await agentProfileService.updateAgentMetrics(agentId, req.body);
      
      if (!metrics) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json({ success: true, metrics });
    } catch (error) {
      console.error('Error in PUT /agents/:agentId/metrics:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
);

/**
 * POST /api/v1/agents/:agentId/activities
 * Record new agent activity
 */
router.post('/:agentId/activities',
  authMiddleware,
  [
    param('agentId').isString().isLength({ min: 1, max: 100 }),
    body('type').isIn([
      'task_started', 'task_completed', 'task_failed', 'task_paused', 'task_resumed',
      'milestone_reached', 'error_occurred', 'warning_issued', 'status_changed',
      'capability_used', 'capability_improved', 'interaction', 'system_event',
      'configuration_changed', 'maintenance_started', 'maintenance_completed'
    ]),
    body('category').optional().isIn(['task', 'system', 'interaction', 'maintenance', 'performance', 'error']),
    body('title').isString().isLength({ min: 1, max: 500 }),
    body('description').optional().isString().isLength({ max: 2000 }),
    body('impact_score').optional().isFloat({ min: 0, max: 10 }),
    body('quality_score').optional().isFloat({ min: 0, max: 10 }),
    body('success').optional().isBoolean(),
    body('duration_seconds').optional().isInt({ min: 0 }),
    body('context').optional().isObject(),
    body('metadata').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const activity = await agentProfileService.recordActivity(agentId, req.body);
      
      if (!activity) {
        return res.status(400).json({ error: 'Failed to record activity' });
      }
      
      res.status(201).json({ success: true, activity });
    } catch (error) {
      console.error('Error in POST /agents/:agentId/activities:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
);

export default router;
```

## 3. Frontend Implementation

### 3.1 Enhanced Agent Profile Component

```tsx
// src/components/DynamicAgentPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  User, Activity, TrendingUp, Brain, Settings, ArrowLeft,
  Download, RefreshCw, Share2, Bell, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { agentService } from '@/services/agentService';

// Component imports
import { AgentProfileHeader } from './AgentProfileHeader';
import { AgentMetricsOverview } from './AgentMetricsOverview';
import { AgentActivityFeed } from './AgentActivityFeed';
import { AgentCapabilitiesPanel } from './AgentCapabilitiesPanel';
import { AgentPerformanceCharts } from './AgentPerformanceCharts';
import { AgentConfigurationPanel } from './AgentConfigurationPanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

type AgentSection = 'overview' | 'activities' | 'performance' | 'capabilities' | 'configuration' | 'history';

interface DynamicAgentPageProps {
  className?: string;
}

export const DynamicAgentPage: React.FC<DynamicAgentPageProps> = ({ className }) => {
  const { agentId, section = 'overview' } = useParams<{ agentId: string; section?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  const [activeSection, setActiveSection] = useState<AgentSection>(section as AgentSection || 'overview');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  
  const { isConnected, subscribe } = useWebSocket();

  // Navigation sections configuration
  const navigationSections = useMemo(() => [
    { id: 'overview', name: 'Overview', icon: User, description: 'Agent profile and summary' },
    { id: 'activities', name: 'Activities', icon: Activity, description: 'Recent activities and timeline' },
    { id: 'performance', name: 'Performance', icon: TrendingUp, description: 'Metrics and analytics' },
    { id: 'capabilities', name: 'Capabilities', icon: Brain, description: 'Skills and abilities' },
    { id: 'configuration', name: 'Configuration', icon: Settings, description: 'Settings and preferences' },
  ], []);

  // Agent profile query
  const {
    data: agentProfile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ['agent', agentId, 'profile'],
    queryFn: () => agentService.getAgentProfile(agentId!),
    enabled: !!agentId,
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Agent metrics query
  const {
    data: agentMetrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics
  } = useQuery({
    queryKey: ['agent', agentId, 'metrics', '24h'],
    queryFn: () => agentService.getAgentMetrics(agentId!, '24h', 'hour'),
    enabled: !!agentId && activeSection === 'performance',
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });

  // Real-time updates subscription
  useEffect(() => {
    if (!isConnected || !agentId) return;

    const unsubscribeMetrics = subscribe('agent:metrics:updated', (data) => {
      if (data.agentId === agentId) {
        // Invalidate and refetch metrics
        queryClient.invalidateQueries(['agent', agentId, 'metrics']);
        
        // Update cached profile data
        queryClient.setQueryData(['agent', agentId, 'profile'], (oldData: any) => {
          if (oldData) {
            return {
              ...oldData,
              ...data.metrics,
              updated_at: data.timestamp
            };
          }
          return oldData;
        });
      }
    });

    const unsubscribeActivity = subscribe('agent:activity:new', (data) => {
      if (data.agentId === agentId) {
        // Update cached activities
        queryClient.setQueryData(['agent', agentId, 'activities'], (oldData: any) => {
          if (oldData?.activities) {
            return {
              ...oldData,
              activities: [data.activity, ...oldData.activities.slice(0, 19)]
            };
          }
          return oldData;
        });
      }
    });

    const unsubscribeStatus = subscribe('agent:status:changed', (data) => {
      if (data.agentId === agentId) {
        // Update cached profile status
        queryClient.setQueryData(['agent', agentId, 'profile'], (oldData: any) => {
          if (oldData) {
            return {
              ...oldData,
              current_status: data.newStatus,
              updated_at: data.timestamp
            };
          }
          return oldData;
        });
      }
    });

    return () => {
      unsubscribeMetrics();
      unsubscribeActivity();
      unsubscribeStatus();
    };
  }, [isConnected, agentId, subscribe, queryClient]);

  // Update active section based on URL
  useEffect(() => {
    const urlSection = location.pathname.split('/').pop();
    if (urlSection && navigationSections.find(s => s.id === urlSection)) {
      setActiveSection(urlSection as AgentSection);
    }
  }, [location.pathname, navigationSections]);

  // Handle section navigation
  const handleSectionChange = (sectionId: AgentSection) => {
    setActiveSection(sectionId);
    const basePath = `/agents/${agentId}`;
    const newPath = sectionId === 'overview' ? basePath : `${basePath}/${sectionId}`;
    navigate(newPath, { replace: true });
  };

  // Handle refresh
  const handleRefresh = () => {
    refetchProfile();
    if (activeSection === 'performance') {
      refetchMetrics();
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigate('/agents');
  };

  // Loading state
  if (profileLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <LoadingSpinner size="lg" message="Loading agent profile..." />
      </div>
    );
  }

  // Error state
  if (profileError) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${className}`}>
        <div className="text-center">
          <div className="mb-4">
            <User className="mx-auto h-12 w-12 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Agent Not Found</h3>
          <p className="text-gray-500 mb-4">
            The agent you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <button
            onClick={handleBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-gray-50 ${className}`}>
      {/* Sidebar Navigation */}
      <div className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300",
        sidebarExpanded ? "w-64" : "w-16"
      )}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              title="Back to Agents"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {sidebarExpanded && (
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-lg">
                  {agentProfile?.avatar || '🤖'}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">
                    {agentProfile?.display_name}
                  </h2>
                  <p className="text-sm text-gray-500 truncate">
                    {agentProfile?.specialization}
                  </p>
                </div>
              </div>
            </div>
          )}

          <nav className="space-y-1">
            {navigationSections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id as AgentSection)}
                className={cn(
                  "flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  activeSection === section.id
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
                title={sidebarExpanded ? undefined : section.name}
              >
                <section.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarExpanded && (
                  <span className="ml-3 truncate">{section.name}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <AgentProfileHeader
          agent={agentProfile}
          activeSection={activeSection}
          onRefresh={handleRefresh}
          className="border-b border-gray-200"
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <ErrorBoundary>
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  <AgentMetricsOverview agent={agentProfile} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AgentActivityFeed agentId={agentId!} limit={10} />
                    <AgentCapabilitiesPanel capabilities={agentProfile?.capabilities || []} />
                  </div>
                </div>
              )}

              {activeSection === 'activities' && (
                <AgentActivityFeed agentId={agentId!} expanded />
              )}

              {activeSection === 'performance' && (
                <AgentPerformanceCharts
                  agentId={agentId!}
                  metrics={agentMetrics}
                  loading={metricsLoading}
                />
              )}

              {activeSection === 'capabilities' && (
                <AgentCapabilitiesPanel
                  capabilities={agentProfile?.capabilities || []}
                  expanded
                />
              )}

              {activeSection === 'configuration' && (
                <AgentConfigurationPanel
                  agentId={agentId!}
                  configuration={agentProfile?.profile_config}
                />
              )}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DynamicAgentPage;
```

## 4. Additional Implementation Notes

### 4.1 Performance Optimizations

1. **Component Memoization**: Use React.memo for expensive components
2. **Virtual Scrolling**: Implement for large activity lists
3. **Code Splitting**: Lazy load section components
4. **Image Optimization**: Optimize agent avatars and assets
5. **Bundle Analysis**: Regular bundle size monitoring

### 4.2 Testing Strategy

1. **Unit Tests**: Component and service testing
2. **Integration Tests**: API endpoint testing
3. **E2E Tests**: Critical user journey testing
4. **Performance Tests**: Load and stress testing
5. **Accessibility Tests**: WCAG compliance testing

### 4.3 Monitoring and Analytics

1. **Performance Monitoring**: Core Web Vitals tracking
2. **Error Tracking**: Real-time error monitoring
3. **Usage Analytics**: User interaction tracking
4. **Performance Metrics**: API response time monitoring
5. **Business Metrics**: Feature adoption tracking

This implementation provides a solid foundation for dynamic agent pages with excellent performance, scalability, and user experience.