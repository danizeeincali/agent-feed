// PageBuilder Agent Configuration Validation Test
// Memory-efficient test suite for validating updated page-builder-agent

const fs = require('fs');
const path = require('path');

describe('PageBuilder Agent Configuration', () => {
  const agentConfigPath = '/workspaces/agent-feed/prod/.claude/agents/page-builder-agent.md';
  let agentConfig;

  beforeAll(() => {
    try {
      agentConfig = fs.readFileSync(agentConfigPath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read page-builder-agent.md: ${error.message}`);
    }
  });

  test('should have proper YAML frontmatter', () => {
    expect(agentConfig).toMatch(/^---\n/);
    expect(agentConfig).toContain('name: page-builder-agent');
    expect(agentConfig).toContain('proactive: true');
    expect(agentConfig).toContain('priority: P1');
  });

  test('should include shadcn/ui component documentation', () => {
    expect(agentConfig).toContain('shadcn/ui');
    expect(agentConfig).toContain('Card');
    expect(agentConfig).toContain('Grid');
    expect(agentConfig).toContain('Button');
    expect(agentConfig).toContain('Input');
    expect(agentConfig).toContain('Progress');
  });

  test('should have proper file storage path', () => {
    expect(agentConfig).toContain('/workspaces/agent-feed/data/agent-pages/');
  });

  test('should include SPARC methodology integration', () => {
    expect(agentConfig).toContain('SPARC Methodology Integration');
    expect(agentConfig).toContain('Specification Phase');
    expect(agentConfig).toContain('TDD principles');
  });

  test('should have memory safety measures', () => {
    expect(agentConfig).toContain('Memory Safety Features');
    expect(agentConfig).toContain('1GB limit');
    expect(agentConfig).toContain('automatic cleanup');
    expect(agentConfig).toContain('Circuit Breakers');
  });

  test('should include security validation framework', () => {
    expect(agentConfig).toContain('Security and Validation Framework');
    expect(agentConfig).toContain('XSS Prevention');
    expect(agentConfig).toContain('Component Whitelist');
    expect(agentConfig).toContain('Rate Limiting');
  });

  test('should have API integration instructions', () => {
    expect(agentConfig).toContain('API Integration');
    expect(agentConfig).toContain('Creating Pages');
    expect(agentConfig).toContain('Page File Structure');
  });

  test('should include working examples', () => {
    expect(agentConfig).toContain('Simple Demo Page');
    expect(agentConfig).toContain('Interactive Dashboard');
    expect(agentConfig).toMatch(/"type": "Card"/);
    expect(agentConfig).toMatch(/"type": "Badge"/);
  });
});

// Lightweight functional test
describe('PageBuilder Agent File System', () => {
  test('should have backup of original configuration', () => {
    const backupPath = '/workspaces/agent-feed/prod/.claude/agents/page-builder-agent.md.backup';
    expect(fs.existsSync(backupPath)).toBe(true);
  });

  test('should have data directory for agent pages', () => {
    const dataPath = '/workspaces/agent-feed/data/agent-pages';
    expect(fs.existsSync(dataPath)).toBe(true);
  });

  test('should have existing demo pages', () => {
    const demoPaths = [
      '/workspaces/agent-feed/data/agent-pages/personal-todos-agent-simple-demo.json',
      '/workspaces/agent-feed/data/agent-pages/personal-todos-agent-todo-list-v2.json'
    ];
    
    demoPaths.forEach(demoPath => {
      expect(fs.existsSync(demoPath)).toBe(true);
    });
  });
});

// Memory safety validation
describe('PageBuilder Configuration Memory Safety', () => {
  test('should specify memory limits', () => {
    const agentConfig = fs.readFileSync('/workspaces/agent-feed/prod/.claude/agents/page-builder-agent.md', 'utf8');
    expect(agentConfig).toContain('1GB limit');
    expect(agentConfig).toContain('85% memory usage');
    expect(agentConfig).toContain('15-second cleanup cycles');
  });

  test('should have reduced resource limits from original', () => {
    const agentConfig = fs.readFileSync('/workspaces/agent-feed/prod/.claude/agents/page-builder-agent.md', 'utf8');
    // Verify reduced limits compared to original high-memory configuration
    expect(agentConfig).not.toContain('2GB limit');
    expect(agentConfig).not.toContain('10MB maximum page size');
    expect(agentConfig).toContain('5MB maximum page size');
    expect(agentConfig).toContain('25 components per page');
  });
});