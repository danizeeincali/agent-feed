#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgentsTable = createAgentsTable;
const connection_1 = require("./connection");
const logger_1 = require("@/utils/logger");
async function createAgentsTable() {
    try {
        // Check if agents table exists
        const tableCheck = await connection_1.db.query(`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agents'
      );`);
        if (tableCheck.rows[0].exists) {
            logger_1.logger.info('Agents table already exists');
            return;
        }
        logger_1.logger.info('Creating agents table...');
        // Create agents table
        await connection_1.db.query(`
      CREATE TABLE agents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        system_prompt TEXT NOT NULL,
        avatar_color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
        capabilities JSONB NOT NULL DEFAULT '[]',
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error', 'testing')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_used TIMESTAMP WITH TIME ZONE,
        usage_count INTEGER DEFAULT 0,
        performance_metrics JSONB NOT NULL DEFAULT '{
          "success_rate": 0.0,
          "average_response_time": 0,
          "total_tokens_used": 0,
          "error_count": 0
        }',
        health_status JSONB NOT NULL DEFAULT '{
          "cpu_usage": 0,
          "memory_usage": 0,
          "response_time": 0,
          "last_heartbeat": null
        }',
        UNIQUE(user_id, name)
      );
    `);
        // Create agent execution logs table
        await connection_1.db.query(`
      CREATE TABLE agent_execution_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN ('test', 'task', 'heartbeat')),
        input_data JSONB,
        output_data JSONB,
        execution_time_ms INTEGER,
        status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
        // Create indexes
        await connection_1.db.query(`
      CREATE INDEX idx_agents_user_id ON agents(user_id);
      CREATE INDEX idx_agents_status ON agents(status);
      CREATE INDEX idx_agents_name ON agents(user_id, name);
      CREATE INDEX idx_agents_capabilities_gin ON agents USING GIN (capabilities);
      CREATE INDEX idx_agents_performance_gin ON agents USING GIN (performance_metrics);
      
      CREATE INDEX idx_agent_execution_logs_agent_id ON agent_execution_logs(agent_id);
      CREATE INDEX idx_agent_execution_logs_created_at ON agent_execution_logs(created_at);
      CREATE INDEX idx_agent_execution_logs_status ON agent_execution_logs(status);
    `);
        // Create trigger for updated_at
        await connection_1.db.query(`
      CREATE TRIGGER update_agents_updated_at 
      BEFORE UPDATE ON agents 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
    `);
        logger_1.logger.info('Agents table created successfully');
        // Create some sample agents for testing
        const sampleAgents = [
            {
                name: 'research-assistant',
                display_name: 'Research Assistant',
                description: 'Specialized in web research and data analysis',
                system_prompt: 'You are a research specialist focused on gathering, analyzing, and synthesizing information from various sources.',
                avatar_color: '#3B82F6',
                capabilities: ['research', 'analysis', 'data-mining', 'reporting']
            },
            {
                name: 'content-creator',
                display_name: 'Content Creator',
                description: 'Creates engaging content and marketing materials',
                system_prompt: 'You are a creative content specialist focused on generating engaging, high-quality content.',
                avatar_color: '#8B5CF6',
                capabilities: ['writing', 'content-creation', 'marketing', 'social-media']
            }
        ];
        // Get a sample user ID (create one if none exists)
        let userResult = await connection_1.db.query('SELECT id FROM users LIMIT 1');
        let userId;
        if (userResult.rows.length === 0) {
            // Create a sample user
            const newUserResult = await connection_1.db.query(`
        INSERT INTO users (email, name, claude_user_id) 
        VALUES ('demo@agentlink.com', 'Demo User', 'demo-user-001')
        RETURNING id
      `);
            userId = newUserResult.rows[0].id;
            logger_1.logger.info('Created demo user');
        }
        else {
            userId = userResult.rows[0].id;
        }
        // Insert sample agents
        for (const agent of sampleAgents) {
            await connection_1.db.query(`
        INSERT INTO agents (
          user_id, name, display_name, description, system_prompt,
          avatar_color, capabilities, status, usage_count,
          performance_metrics, health_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
                userId,
                agent.name,
                agent.display_name,
                agent.description,
                agent.system_prompt,
                agent.avatar_color,
                JSON.stringify(agent.capabilities),
                'active',
                Math.floor(Math.random() * 50),
                JSON.stringify({
                    success_rate: Math.random() * 0.3 + 0.7,
                    average_response_time: Math.floor(Math.random() * 1000) + 200,
                    total_tokens_used: Math.floor(Math.random() * 10000) + 1000,
                    error_count: Math.floor(Math.random() * 5)
                }),
                JSON.stringify({
                    cpu_usage: Math.random() * 50,
                    memory_usage: Math.random() * 80,
                    response_time: Math.floor(Math.random() * 500) + 100,
                    last_heartbeat: new Date().toISOString()
                })
            ]);
        }
        logger_1.logger.info('Sample agents created successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to create agents table:', error);
        process.exit(1);
    }
    finally {
        await connection_1.db.close();
    }
}
if (require.main === module) {
    createAgentsTable();
}
//# sourceMappingURL=migrate-agents.js.map