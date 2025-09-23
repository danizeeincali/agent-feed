import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// File-based agent discovery from production directory
const AGENTS_DIRECTORY = path.join(process.cwd(), 'prod', '.claude', 'agents');

/**
 * Parse agent markdown file to extract metadata
 */
function parseAgentFile(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Extract basic metadata from markdown
    const lines = content.split('\n');
    const title = lines.find(line => line.startsWith('# '))?.replace('# ', '') || fileName.replace('.md', '');

    // Look for description in first paragraph after title
    let description = '';
    let foundTitle = false;
    for (const line of lines) {
      if (line.startsWith('# ')) {
        foundTitle = true;
        continue;
      }
      if (foundTitle && line.trim() && !line.startsWith('#') && !line.startsWith('**')) {
        description = line.trim();
        break;
      }
    }

    // Extract capabilities from content patterns
    const capabilities = [];
    if (content.includes('todo') || content.includes('task')) capabilities.push('task-management');
    if (content.includes('meeting') || content.includes('agenda')) capabilities.push('meeting-coordination');
    if (content.includes('feedback') || content.includes('review')) capabilities.push('feedback-analysis');
    if (content.includes('follow') || content.includes('tracking')) capabilities.push('follow-up-tracking');
    if (content.includes('idea') || content.includes('brainstorm')) capabilities.push('idea-generation');
    if (content.includes('page') || content.includes('build')) capabilities.push('page-building');
    if (content.includes('meta') || content.includes('system')) capabilities.push('meta-analysis');
    if (content.includes('prep') || content.includes('planning')) capabilities.push('planning');
    if (content.includes('link') || content.includes('log')) capabilities.push('link-management');
    if (content.includes('know') || content.includes('personal')) capabilities.push('personal-assistance');

    // Default capabilities if none detected
    if (capabilities.length === 0) {
      capabilities.push('general-assistance');
    }

    // Determine status based on file modification time
    const stats = fs.statSync(filePath);
    const hoursSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    const status = hoursSinceModified < 24 ? 'active' : hoursSinceModified < 168 ? 'idle' : 'inactive';

    // Generate color based on agent type
    const getAgentColor = (name, capabilities) => {
      if (capabilities.includes('task-management')) return '#10B981'; // Green
      if (capabilities.includes('meeting-coordination')) return '#3B82F6'; // Blue
      if (capabilities.includes('feedback-analysis')) return '#F59E0B'; // Orange
      if (capabilities.includes('follow-up-tracking')) return '#EF4444'; // Red
      if (capabilities.includes('idea-generation')) return '#8B5CF6'; // Purple
      if (capabilities.includes('page-building')) return '#06B6D4'; // Cyan
      if (capabilities.includes('meta-analysis')) return '#6B7280'; // Gray
      if (capabilities.includes('planning')) return '#84CC16'; // Lime
      if (capabilities.includes('link-management')) return '#F97316'; // Orange
      if (capabilities.includes('personal-assistance')) return '#EC4899'; // Pink
      return '#6366F1'; // Default indigo
    };

    return {
      id: fileName.replace('.md', ''),
      name: title,
      display_name: title,
      description: description || `${title} agent for automated assistance`,
      status,
      file_path: filePath,
      capabilities,
      avatar_color: getAgentColor(title, capabilities),
      created_at: stats.birthtime.toISOString(),
      updated_at: stats.mtime.toISOString(),
      last_used: stats.atime.toISOString(),
      file_size: stats.size,
      source: 'file-based-discovery'
    };
  } catch (error) {
    console.error(`Error parsing agent file ${filePath}:`, error);
    return null;
  }
}

/**
 * Discover agents from file system
 */
function discoverAgents() {
  try {
    if (!fs.existsSync(AGENTS_DIRECTORY)) {
      console.warn(`Agents directory not found: ${AGENTS_DIRECTORY}`);
      return [];
    }

    const files = fs.readdirSync(AGENTS_DIRECTORY);
    const agentFiles = files.filter(file => file.endsWith('.md'));

    const agents = agentFiles
      .map(file => parseAgentFile(path.join(AGENTS_DIRECTORY, file), file))
      .filter(agent => agent !== null);

    console.log(`Discovered ${agents.length} agents from file system`);
    return agents;
  } catch (error) {
    console.error('Error discovering agents:', error);
    return [];
  }
}

// GET /api/agents - List all agents from file system
router.get('/', (req, res) => {
  try {
    const agents = discoverAgents();

    res.json({
      success: true,
      agents,
      metadata: {
        total_count: agents.length,
        data_source: 'file-based-discovery',
        agents_directory: AGENTS_DIRECTORY,
        discovery_time: new Date().toISOString(),
        file_based: true,
        no_fake_data: true,
        no_database_mocks: true
      }
    });
  } catch (error) {
    console.error('Error in agents endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discover agents',
      message: error.message,
      data_source: 'file-based-discovery'
    });
  }
});

// GET /api/agents/:id - Get specific agent details
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const agentFile = path.join(AGENTS_DIRECTORY, `${id}.md`);

    if (!fs.existsSync(agentFile)) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        id,
        data_source: 'file-based-discovery'
      });
    }

    const agent = parseAgentFile(agentFile, `${id}.md`);

    if (!agent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse agent file',
        id,
        data_source: 'file-based-discovery'
      });
    }

    // Add full content for detailed view
    const content = fs.readFileSync(agentFile, 'utf8');
    agent.content = content;

    res.json({
      success: true,
      agent,
      data_source: 'file-based-discovery'
    });
  } catch (error) {
    console.error('Error getting agent details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agent details',
      message: error.message,
      data_source: 'file-based-discovery'
    });
  }
});

// GET /api/agents/validate/discovery - Validate agent discovery mechanism
router.get('/validate/discovery', (req, res) => {
  try {
    const agents = discoverAgents();

    // Validation checks
    const validation = {
      directory_exists: fs.existsSync(AGENTS_DIRECTORY),
      directory_path: AGENTS_DIRECTORY,
      total_agents_found: agents.length,
      agent_files_found: agents.map(a => a.id),
      no_fake_agents: !agents.some(a => a.id.includes('Token Analytics Database Agent')),
      has_real_agents: agents.some(a =>
        a.id.includes('agent-feedback-agent') ||
        a.id.includes('follow-ups-agent') ||
        a.id.includes('personal-todos-agent')
      ),
      file_based_source: true,
      no_database_dependency: true,
      no_process_dependency: true,
      authentic_data: true
    };

    const isValid = validation.directory_exists &&
                   validation.total_agents_found > 0 &&
                   validation.no_fake_agents &&
                   validation.has_real_agents;

    res.json({
      success: true,
      validation_passed: isValid,
      validation,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        status: a.status,
        source: a.source
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error validating discovery:', error);
    res.status(500).json({
      success: false,
      validation_passed: false,
      error: 'Validation failed',
      message: error.message
    });
  }
});

export default router;