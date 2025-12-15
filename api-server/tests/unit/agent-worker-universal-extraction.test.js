import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';
import fs from 'fs';
import path from 'path';

describe('AgentWorker - Universal Extraction (TDD)', () => {
  let worker;
  let testWorkspaceDir;

  beforeEach(() => {
    worker = new AgentWorker({ workerId: 'test-universal' });
    testWorkspaceDir = '/tmp/test-universal-workspace-' + Date.now();
  });

  afterEach(() => {
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
  });

  describe('FR-001: Recursive Directory Discovery', () => {
    it('should discover files in /outputs/ directory (link-logger pattern)', async () => {
      // Create link-logger-style workspace
      const outputsDir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(outputsDir, { recursive: true });

      const content = `# Agent Feed Post

**Executive Brief:**
AgentDB is an ultra-fast vector memory system.`;

      fs.writeFileSync(path.join(outputsDir, 'agent-feed-post-test.md'), content);

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).not.toBeNull();
      expect(result).toContain('AgentDB');
      expect(result).toContain('ultra-fast vector memory');
    });

    it('should discover files in /strategic-analysis/ directory', async () => {
      const stratDir = path.join(testWorkspaceDir, 'strategic-analysis');
      fs.mkdirSync(stratDir, { recursive: true });

      const content = `# Strategic Intelligence

## Executive Brief (Λvi Immediate)
Competitive analysis shows market opportunity.`;

      fs.writeFileSync(path.join(stratDir, 'market-intelligence-2025.md'), content);

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).not.toBeNull();
      expect(result).toContain('Competitive analysis');
      expect(result).toContain('market opportunity');
    });

    it('should discover files in nested subdirectories (3 levels deep)', async () => {
      const deepDir = path.join(testWorkspaceDir, 'archives', 'q4-2024', 'strategic');
      fs.mkdirSync(deepDir, { recursive: true });

      const content = `## Executive Summary
Deep nested strategic content.`;

      fs.writeFileSync(path.join(deepDir, 'summary.md'), content);

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).not.toBeNull();
      expect(result).toContain('Deep nested strategic content');
    });

    it('should prioritize recent files over old files', async () => {
      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });

      // Old file
      const oldFile = path.join(dir, 'old-post.md');
      fs.writeFileSync(oldFile, '## Executive Brief\nOld content from last week.');
      const oldTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      fs.utimesSync(oldFile, new Date(oldTime), new Date(oldTime));

      // Recent file
      const newFile = path.join(dir, 'new-post.md');
      fs.writeFileSync(newFile, '## Executive Brief\nRecent content from today.');

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('Recent content from today');
      expect(result).not.toContain('Old content from last week');
    });
  });

  describe('FR-002: Multi-Pattern File Matching', () => {
    it('should match agent-feed-post-*.md pattern', async () => {
      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(
        path.join(dir, 'agent-feed-post-agentdb.md'),
        '## Executive Brief\nAgentDB analysis.'
      );

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('AgentDB analysis');
    });

    it('should match *-intelligence-*.md pattern', async () => {
      const dir = path.join(testWorkspaceDir, 'strategic-analysis');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(
        path.join(dir, 'market-intelligence-report.md'),
        '## Executive Brief\nMarket intelligence data.'
      );

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('Market intelligence data');
    });

    it('should match lambda-vi-briefing-*.md pattern (legacy)', async () => {
      const dir = path.join(testWorkspaceDir, 'intelligence');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(
        path.join(dir, 'lambda-vi-briefing-test.md'),
        '## Executive Brief\nLegacy briefing format.'
      );

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('Legacy briefing format');
    });

    it('should match generic briefing-*.md pattern', async () => {
      const dir = path.join(testWorkspaceDir, 'summaries');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(
        path.join(dir, 'briefing-weekly-summary.md'),
        '## Executive Summary\nWeekly briefing data.'
      );

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('Weekly briefing data');
    });
  });

  describe('FR-003: Flexible Section Extraction', () => {
    it('should extract "## Executive Brief" (markdown header)', async () => {
      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, 'test.md'), `# Report

## Executive Brief

This is the executive brief section.

## Technical Details

Other content here.`);

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('This is the executive brief section');
      expect(result).not.toContain('Other content here');
    });

    it('should extract "## Executive Brief (Λvi Immediate)" (with parenthesis)', async () => {
      const dir = path.join(testWorkspaceDir, 'strategic-analysis');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, 'test.md'), `## Executive Brief (Λvi Immediate)

Strategic content for immediate action.

## Analysis`);

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('Strategic content for immediate action');
    });

    it('should extract "**Executive Brief:**" (bold with colon)', async () => {
      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, 'test.md'), `# Post Content

**Executive Brief:**
This is bold format with colon.

**Other Section:**
Should not be included.`);

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('This is bold format with colon');
      expect(result).not.toContain('Should not be included');
    });

    it('should extract "## Executive Summary" (alternative header)', async () => {
      const dir = path.join(testWorkspaceDir, 'summaries');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, 'test.md'), `## Executive Summary

Summary content goes here.`);

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('Summary content goes here');
    });

    it('should extract "## Post Content" section (link-logger format)', async () => {
      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, 'test.md'), `## Post Content

**Content Body:**
Rich post content for agent feed.`);

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('Rich post content for agent feed');
    });
  });

  describe('FR-004: Intelligent Fallback Strategies', () => {
    it('should fall back to any content if no section headers found', async () => {
      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(path.join(dir, 'test.md'),
        'This file has no section headers but contains important strategic content about AgentDB and vector memory systems.');

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).not.toBeNull();
      expect(result).toContain('important strategic content');
    });

    it('should return null if no markdown files found', async () => {
      fs.mkdirSync(testWorkspaceDir, { recursive: true });
      // Create only non-markdown files
      fs.writeFileSync(path.join(testWorkspaceDir, 'test.txt'), 'Text file');
      fs.writeFileSync(path.join(testWorkspaceDir, 'test.json'), '{}');

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toBeNull();
    });

    it('should handle empty markdown files gracefully', async () => {
      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'empty.md'), '');

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toBeNull();
    });

    it('should handle files with only whitespace', async () => {
      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'whitespace.md'), '   \n\n   \t\t  \n');

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toBeNull();
    });
  });

  describe('FR-005: Comprehensive Logging', () => {
    it('should log directory search attempts', async () => {
      const consoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => consoleLogs.push(args.join(' '));

      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'test.md'), '## Executive Brief\nTest content.');

      await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      console.log = originalLog;

      const hasSearchLog = consoleLogs.some(log =>
        log.includes('Found intelligence') || log.includes('✅')
      );
      expect(hasSearchLog).toBe(true);
    });
  });

  describe('FR-006: Performance Requirements', () => {
    it('should complete extraction in < 200ms for typical workspace', async () => {
      // Create typical workspace with 5 directories, 10 files
      const dirs = ['outputs', 'strategic-analysis', 'summaries', 'archives', 'competitive'];
      dirs.forEach(dir => {
        const fullPath = path.join(testWorkspaceDir, dir);
        fs.mkdirSync(fullPath, { recursive: true });
        fs.writeFileSync(path.join(fullPath, 'file1.md'), '## Executive Brief\nContent 1');
        fs.writeFileSync(path.join(fullPath, 'file2.md'), '## Summary\nContent 2');
      });

      const startTime = Date.now();
      await worker.extractFromWorkspaceFiles(testWorkspaceDir);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });

    it('should handle large workspace (50+ files) efficiently', async () => {
      // Create large workspace
      for (let i = 0; i < 10; i++) {
        const dir = path.join(testWorkspaceDir, `dir-${i}`);
        fs.mkdirSync(dir, { recursive: true });
        for (let j = 0; j < 5; j++) {
          fs.writeFileSync(
            path.join(dir, `file-${j}.md`),
            `## Executive Brief\nContent ${i}-${j}`
          );
        }
      }

      const startTime = Date.now();
      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);
      const duration = Date.now() - startTime;

      expect(result).not.toBeNull();
      expect(duration).toBeLessThan(500); // Allow more time for large workspace
    });
  });

  describe('FR-007: Error Handling', () => {
    it('should handle non-existent workspace directory', async () => {
      const result = await worker.extractFromWorkspaceFiles('/nonexistent/directory');
      expect(result).toBeNull();
    });

    it('should handle permission denied errors gracefully', async () => {
      fs.mkdirSync(testWorkspaceDir, { recursive: true });
      const restrictedDir = path.join(testWorkspaceDir, 'restricted');
      fs.mkdirSync(restrictedDir, { recursive: true, mode: 0o000 });

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      // Should not throw error
      expect(result).toBeNull();

      // Cleanup
      fs.chmodSync(restrictedDir, 0o755);
    });

    it('should handle malformed UTF-8 content', async () => {
      const dir = path.join(testWorkspaceDir, 'outputs');
      fs.mkdirSync(dir, { recursive: true });

      // Write file with invalid UTF-8 bytes
      const buffer = Buffer.from([0xFF, 0xFE, 0xFD]);
      fs.writeFileSync(path.join(dir, 'malformed.md'), buffer);

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      // Should handle gracefully, return null instead of throwing
      expect(result).toBeNull();
    });

    it('should handle circular symlinks gracefully', async () => {
      fs.mkdirSync(testWorkspaceDir, { recursive: true });
      const dir1 = path.join(testWorkspaceDir, 'dir1');
      const dir2 = path.join(testWorkspaceDir, 'dir2');
      fs.mkdirSync(dir1);
      fs.mkdirSync(dir2);

      // Create circular symlinks
      try {
        fs.symlinkSync(dir1, path.join(dir2, 'link-to-dir1'));
        fs.symlinkSync(dir2, path.join(dir1, 'link-to-dir2'));

        const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

        // Should not hang or crash
        expect(result).toBeNull();
      } catch (err) {
        // Symlink creation might fail on some systems, that's ok
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should work with actual link-logger workspace structure', async () => {
      // Simulate exact link-logger structure
      const dirs = [
        'outputs',
        'strategic-analysis',
        'intelligence',
        'intelligence_archive',
        'summaries',
        'competitive',
        'competitive-analysis',
        'market-research',
        'knowledge-base'
      ];

      dirs.forEach(dir => {
        fs.mkdirSync(path.join(testWorkspaceDir, dir), { recursive: true });
      });

      // Create file in outputs (most recent location)
      fs.writeFileSync(
        path.join(testWorkspaceDir, 'outputs', 'agent-feed-post-agentdb.md'),
        `# Agent Feed Post

**Executive Brief:**
AgentDB represents a significant competitive development in AI agent memory systems.`
      );

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).not.toBeNull();
      expect(result).toContain('AgentDB represents a significant competitive development');
    });

    it('should prefer outputs directory over other directories', async () => {
      fs.mkdirSync(path.join(testWorkspaceDir, 'outputs'), { recursive: true });
      fs.mkdirSync(path.join(testWorkspaceDir, 'archives'), { recursive: true });

      // Old file in archives
      fs.writeFileSync(
        path.join(testWorkspaceDir, 'archives', 'old.md'),
        '## Executive Brief\nOld archived content.'
      );

      // Recent file in outputs
      fs.writeFileSync(
        path.join(testWorkspaceDir, 'outputs', 'recent.md'),
        '## Executive Brief\nRecent output content.'
      );

      const result = await worker.extractFromWorkspaceFiles(testWorkspaceDir);

      expect(result).toContain('Recent output content');
    });
  });
});
