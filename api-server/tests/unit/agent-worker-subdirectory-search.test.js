import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';
import fs from 'fs';
import path from 'path';

describe('AgentWorker - Subdirectory Intelligence Search', () => {
  let worker;
  let testWorkspaceDir;

  beforeEach(() => {
    worker = new AgentWorker({ workerId: 'test-subdirectory' });
    testWorkspaceDir = '/tmp/test-workspace-' + Date.now();
  });

  afterEach(() => {
    // Cleanup test workspace
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
  });

  it('should find intelligence in /intelligence subdirectory', async () => {
    // Create test workspace structure
    const intelligenceDir = path.join(testWorkspaceDir, 'intelligence');
    fs.mkdirSync(intelligenceDir, { recursive: true });

    // Create test briefing file with Executive Brief section
    const briefingContent = `# Lambda VI Briefing - AgentDB Analysis

## Executive Brief

AgentDB is an ultra-fast vector memory system designed by Reuven Cohen for AI agents. The system provides high-performance vector storage and retrieval capabilities for autonomous agents to maintain contextual memory across sessions.

Key features include sub-millisecond query times, scalable architecture, and seamless integration with existing agent frameworks.

## Technical Details

Additional technical implementation details...`;

    const briefingFile = path.join(intelligenceDir, 'lambda-vi-briefing-agentdb-20241024.md');
    fs.writeFileSync(briefingFile, briefingContent);

    const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

    expect(result).not.toBeNull();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);

    // Check for specific content from the intelligence files
    const hasAgentDBContent = result.includes('AgentDB') &&
                              result.includes('Reuven Cohen') &&
                              result.includes('vector memory');

    expect(hasAgentDBContent).toBe(true);
    console.log('✅ Found intelligence in subdirectory');
    console.log('Content length:', result.length);
    console.log('First 300 chars:', result.substring(0, 300));
  });

  it('should handle missing directories gracefully', async () => {
    const result = await worker.extractFromWorkspaceFiles('/nonexistent/directory');

    expect(result).toBeNull();
    console.log('✅ Handles missing directories gracefully');
  });

  it('should search both root and intelligence subdirectory', async () => {
    // Create test workspace with files in both locations
    const intelligenceDir = path.join(testWorkspaceDir, 'intelligence');
    fs.mkdirSync(intelligenceDir, { recursive: true });

    // Create file in intelligence subdirectory (should be found first)
    const intelligenceBriefing = `# Intelligence Briefing

## Executive Brief

This is intelligence from the subdirectory with priority content.`;

    fs.writeFileSync(
      path.join(intelligenceDir, 'lambda-vi-briefing-priority.md'),
      intelligenceBriefing
    );

    // Create file in root (should be ignored because intelligence/ found first)
    const rootBriefing = `# Root Briefing

## Executive Brief

This is from root directory.`;

    fs.writeFileSync(
      path.join(testWorkspaceDir, 'lambda-vi-briefing-root.md'),
      rootBriefing
    );

    const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

    // Should find content from intelligence subdirectory (priority)
    expect(result).not.toBeNull();
    expect(result).toContain('priority content');
    expect(result).not.toContain('from root directory');

    console.log('✅ Searched both root and subdirectory (priority order)');
    console.log('Total content length:', result ? result.length : 0);
  });

  it('should handle empty intelligence directory', async () => {
    // Create empty intelligence directory
    const intelligenceDir = path.join(testWorkspaceDir, 'intelligence');
    fs.mkdirSync(intelligenceDir, { recursive: true });

    const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

    // Should return null when no briefing files found
    expect(result).toBeNull();
    console.log('✅ Handles empty workspace gracefully');
  });

  it('should prioritize intelligence directory over summaries', async () => {
    // Create both intelligence and summaries directories
    const intelligenceDir = path.join(testWorkspaceDir, 'intelligence');
    const summariesDir = path.join(testWorkspaceDir, 'summaries');
    fs.mkdirSync(intelligenceDir, { recursive: true });
    fs.mkdirSync(summariesDir, { recursive: true });

    // Create file in intelligence directory
    const intelligenceBriefing = `# Intelligence Priority

## Executive Brief

Intelligence directory content should be found first.`;

    fs.writeFileSync(
      path.join(intelligenceDir, 'lambda-vi-briefing-intelligence.md'),
      intelligenceBriefing
    );

    // Create file in summaries directory
    const summaryContent = `# Summary Content

## Executive Brief

Summaries directory content should be skipped.`;

    fs.writeFileSync(
      path.join(summariesDir, 'summary-001.md'),
      summaryContent
    );

    const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

    // Should find intelligence directory content only
    expect(result).not.toBeNull();
    expect(result).toContain('Intelligence directory content');
    expect(result).not.toContain('Summaries directory content');

    console.log('✅ Prioritizes intelligence over summaries');
  });
});
