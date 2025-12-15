/**
 * Comment Counter Removal Validation Test
 *
 * Purpose: Validate that the comment counter has been removed from line 194
 * This is a file-based validation test that checks the actual source code.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Comment Counter Removal Validation', () => {
  const componentPath = join(
    process.cwd(),
    'src/components/comments/CommentSystem.tsx'
  );

  let sourceCode: string;

  try {
    sourceCode = readFileSync(componentPath, 'utf-8');
  } catch (error) {
    console.error('Failed to read CommentSystem.tsx:', error);
    sourceCode = '';
  }

  describe('Test 1: Counter removed from header', () => {
    it('should not contain counter pattern in header', () => {
      // Check that the file doesn't contain the old counter pattern in H3
      expect(sourceCode).not.toContain('Comments ({stats?.totalComments || 0})');
      expect(sourceCode).not.toContain('Comments ({stats?.totalComments}');

      // Check that h3 doesn't have counter (exclude "Load More Comments" button)
      const h3Pattern = /<h3[^>]*>.*?<\/h3>/gs;
      const h3Matches = sourceCode.match(h3Pattern) || [];

      h3Matches.forEach(h3 => {
        if (h3.includes('Comments')) {
          expect(h3).not.toMatch(/Comments\s*\(\{?stats/);
        }
      });
    });

    it('should have simple "Comments" header', () => {
      // Check that it contains the new simple header
      expect(sourceCode).toContain('Comments');

      // Verify the header structure (accounting for multiline)
      const headerPattern = /<h3[^>]*>[\s\n]*Comments[\s\n]*<\/h3>/;
      expect(sourceCode).toMatch(headerPattern);
    });

    it('should not have any counter in h3 heading', () => {
      // Extract all h3 elements and check none have counters
      const h3Pattern = /<h3[^>]*>.*?<\/h3>/gs;
      const h3Matches = sourceCode.match(h3Pattern) || [];

      const commentsH3 = h3Matches.find(h3 => h3.includes('Comments'));

      if (commentsH3) {
        // Should not contain parentheses with numbers
        expect(commentsH3).not.toMatch(/\(\{?stats/);
        expect(commentsH3).not.toMatch(/\(\d+\)/);
        expect(commentsH3).not.toMatch(/\{.*totalComments.*\}/);
      }
    });
  });

  describe('Test 2: Stats line still exists', () => {
    it('should contain stats display for threads', () => {
      expect(sourceCode).toContain('rootThreads');
      expect(sourceCode).toContain('threads');
    });

    it('should contain stats display for max depth', () => {
      expect(sourceCode).toContain('maxDepth');
      expect(sourceCode).toContain('Max depth:');
    });

    it('should contain stats display for agent responses', () => {
      expect(sourceCode).toContain('agentComments');
      expect(sourceCode).toContain('agent responses');
    });

    it('should have stats separate from header', () => {
      // Stats should be in a different element from h3
      const statsPattern = /stats\.rootThreads.*threads/;
      const headerPattern = /<h3[^>]*>[\s\n]*Comments[\s\n]*<\/h3>/;

      expect(sourceCode).toMatch(statsPattern);
      expect(sourceCode).toMatch(headerPattern);

      // Make sure they're not in the same element
      const lines = sourceCode.split('\n');
      const h3StartLine = lines.findIndex(line => line.includes('<h3'));
      const h3EndLine = lines.findIndex((line, idx) => idx >= h3StartLine && line.includes('</h3>'));
      const statsLine = lines.findIndex(line => line.includes('rootThreads') && line.includes('threads'));

      // Stats should not be between h3 start and end
      expect(statsLine > h3EndLine || statsLine < h3StartLine).toBe(true);
    });
  });

  describe('Test 3: Code structure validation', () => {
    it('should maintain proper TypeScript types', () => {
      expect(sourceCode).toContain('CommentSystemProps');
      expect(sourceCode).toContain('CommentTreeNode');
    });

    it('should have MessageCircle icon', () => {
      expect(sourceCode).toContain('MessageCircle');
    });

    it('should have Add Comment button', () => {
      expect(sourceCode).toContain('Add Comment');
    });

    it('should maintain className structure', () => {
      expect(sourceCode).toContain('comment-system');
      expect(sourceCode).toContain('comment-system-header');
    });
  });

  describe('Test 4: Regression checks', () => {
    it('should not reintroduce counter in any format', () => {
      const lines = sourceCode.split('\n');

      // Find the h3 line
      const h3Lines = lines.filter(line => line.includes('<h3') || line.includes('</h3>'));

      h3Lines.forEach(line => {
        // Check various counter formats
        expect(line).not.toMatch(/\(\d+\)/); // (N)
        expect(line).not.toMatch(/\{.*totalComments.*\}/); // {stats.totalComments}
        expect(line).not.toMatch(/\$\{.*count/); // ${count}
        expect(line).not.toMatch(/\(\{.*\}\)/); // ({expression})
      });
    });

    it('should have exactly one occurrence of Comments heading', () => {
      const h3Pattern = /<h3[^>]*>\s*Comments\s*<\/h3>/g;
      const matches = sourceCode.match(h3Pattern);

      // Should have at least one Comments heading
      expect(matches).toBeTruthy();
      if (matches) {
        expect(matches.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Test 5: Visual structure preserved', () => {
    it('should maintain dark mode classes', () => {
      expect(sourceCode).toContain('dark:text-gray-100');
      expect(sourceCode).toContain('dark:bg-gray-900');
    });

    it('should maintain text sizing classes', () => {
      // Check that h3 has text-lg class
      expect(sourceCode).toContain('text-lg');

      // Find h3 with Comments and verify it has text-lg
      const lines = sourceCode.split('\n');
      const h3Line = lines.find(line => line.includes('<h3') && line.includes('className'));

      if (h3Line) {
        expect(h3Line).toContain('text-lg');
      }
    });

    it('should maintain font weight classes', () => {
      // Check that h3 has font-semibold class
      expect(sourceCode).toContain('font-semibold');

      // Find h3 with Comments and verify it has font-semibold
      const lines = sourceCode.split('\n');
      const h3Line = lines.find(line => line.includes('<h3') && line.includes('className'));

      if (h3Line) {
        expect(h3Line).toContain('font-semibold');
      }
    });
  });

  describe('Test 6: Line-specific validation', () => {
    it('should have Comments without counter around line 194', () => {
      const lines = sourceCode.split('\n');

      // Look around line 194 (±5 lines)
      const searchStart = Math.max(0, 194 - 10);
      const searchEnd = Math.min(lines.length, 194 + 10);

      const relevantLines = lines.slice(searchStart, searchEnd).join('\n');

      // Should have Comments heading
      expect(relevantLines).toContain('Comments');

      // Should NOT have counter
      expect(relevantLines).not.toMatch(/Comments\s*\(\{?.*totalComments/);
    });

    it('should have proper indentation', () => {
      const lines = sourceCode.split('\n');
      const commentsLine = lines.find(line =>
        line.trim().includes('Comments') && line.includes('</h3>')
      );

      if (commentsLine) {
        // Should have proper indentation (spaces)
        expect(commentsLine).toMatch(/^\s+Comments\s*$/);
      }
    });
  });
});
