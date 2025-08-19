-- Dual Claude Code Instance Database Schema

-- Development instance schema
CREATE SCHEMA IF NOT EXISTS development;

-- Production instance schema  
CREATE SCHEMA IF NOT EXISTS production;

-- Shared cross-instance tables
CREATE TABLE IF NOT EXISTS public.instance_coordination (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_instance VARCHAR(20) NOT NULL,
    target_instance VARCHAR(20) NOT NULL,
    handoff_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Development agent activities
CREATE TABLE IF NOT EXISTS development.agent_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production agent activities
CREATE TABLE IF NOT EXISTS production.agent_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent configurations
CREATE TABLE IF NOT EXISTS public.agent_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_type VARCHAR(20) NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    configuration JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_instance_coordination_status ON public.instance_coordination(status);
CREATE INDEX IF NOT EXISTS idx_dev_activities_agent ON development.agent_activities(agent_name);
CREATE INDEX IF NOT EXISTS idx_prod_activities_agent ON production.agent_activities(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_configs_instance ON public.agent_configurations(instance_type, active);
