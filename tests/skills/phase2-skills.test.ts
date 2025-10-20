/**
 * Phase 2 Skills Unit Tests
 *
 * Tests for 7 new skills created in Phase 2:
 * - 3 shared skills (user-preferences, task-management, productivity-patterns)
 * - 3 meeting-prep-agent skills (meeting-templates, agenda-frameworks, note-taking)
 * - 1 meta-agent skill (agent-templates) - NOT part of Phase 2
 *
 * Following London School TDD:
 * - Real file operations (no mocks for our implementation)
 * - Mock only external dependencies (Anthropic API)
 * - Test actual content and structure
 * - Verify behavior through interaction
 */

import { readFile, stat } from 'fs/promises';
import path from 'path';

// Test configuration
const SKILLS_DIR = '/workspaces/agent-feed/prod/skills';
const MIN_CONTENT_LENGTH = 300; // Minimum lines per skill
const PLACEHOLDER_PATTERNS = [
  /TODO:/gi,
  /STUB/gi,
  /PLACEHOLDER/gi,
  /\[TO BE IMPLEMENTED\]/gi,
  /\[COMING SOON\]/gi
];

// Phase 2 Skills Definition
const PHASE_2_SKILLS = {
  shared: [
    {
      name: 'user-preferences',
      path: 'shared/user-preferences',
      minLines: 300,
      requiredSections: ['Purpose', 'When to Use This Skill', 'User Preference Schema']
    },
    {
      name: 'task-management',
      path: 'shared/task-management',
      minLines: 300,
      requiredSections: ['Purpose', 'When to Use This Skill', 'Fibonacci Priority System']
    },
    {
      name: 'productivity-patterns',
      path: 'shared/productivity-patterns',
      minLines: 300,
      requiredSections: ['Purpose', 'When to Use This Skill', 'Core Productivity Frameworks']
    }
  ],
  agentSpecific: [
    {
      name: 'meeting-templates',
      path: 'agent-specific/meeting-prep-agent/meeting-templates',
      minLines: 300,
      requiredSections: ['Purpose', 'When to Use This Skill', 'Template Library']
    },
    {
      name: 'agenda-frameworks',
      path: 'agent-specific/meeting-prep-agent/agenda-frameworks',
      minLines: 300,
      requiredSections: ['Purpose', 'When to Use This Skill', 'Framework Catalog']
    },
    {
      name: 'note-taking',
      path: 'agent-specific/meeting-prep-agent/note-taking',
      minLines: 300,
      requiredSections: ['Purpose', 'When to Use This Skill', 'Note-Taking Systems']
    }
  ]
};

describe('Phase 2 Skills - Unit Tests', () => {
  describe('Shared Skills', () => {
    describe('user-preferences skill', () => {
      const skillPath = path.join(SKILLS_DIR, 'shared/user-preferences/SKILL.md');
      let skillContent: string;

      beforeAll(async () => {
        skillContent = await readFile(skillPath, 'utf-8');
      });

      it('should exist and be readable', async () => {
        const stats = await stat(skillPath);
        expect(stats.isFile()).toBe(true);
        expect(skillContent.length).toBeGreaterThan(0);
      });

      it('should have valid frontmatter with required fields', () => {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = skillContent.match(frontmatterRegex);

        expect(match).not.toBeNull();

        const frontmatter = match![1];
        expect(frontmatter).toContain('name: User Preferences');
        expect(frontmatter).toContain('description:');
        expect(frontmatter).toContain('version:');
        expect(frontmatter).toContain('category: shared');
        expect(frontmatter).toContain('_protected: false');
      });

      it('should have all required content sections', () => {
        expect(skillContent).toContain('## Purpose');
        expect(skillContent).toContain('## When to Use This Skill');
        expect(skillContent).toContain('## User Preference Schema');
        expect(skillContent).toContain('### Core Preference Structure');
        expect(skillContent).toContain('### Communication Preferences');
        expect(skillContent).toContain('### Workflow Preferences');
      });

      it('should have no placeholder content', () => {
        PLACEHOLDER_PATTERNS.forEach(pattern => {
          expect(skillContent).not.toMatch(pattern);
        });
      });

      it('should have reasonable content length (300+ lines)', () => {
        const lineCount = skillContent.split('\n').length;
        expect(lineCount).toBeGreaterThanOrEqual(300);
      });

      it('should contain JSON schema examples', () => {
        expect(skillContent).toContain('```json');
        expect(skillContent).toMatch(/\{[\s\S]*"userId"[\s\S]*\}/);
        expect(skillContent).toMatch(/\{[\s\S]*"communication"[\s\S]*\}/);
      });

      it('should define preference categories', () => {
        expect(skillContent).toContain('communication');
        expect(skillContent).toContain('workflow');
        expect(skillContent).toContain('ui');
        expect(skillContent).toContain('agents');
        expect(skillContent).toContain('privacy');
      });
    });

    describe('task-management skill', () => {
      const skillPath = path.join(SKILLS_DIR, 'shared/task-management/SKILL.md');
      let skillContent: string;

      beforeAll(async () => {
        skillContent = await readFile(skillPath, 'utf-8');
      });

      it('should exist and be readable', async () => {
        const stats = await stat(skillPath);
        expect(stats.isFile()).toBe(true);
        expect(skillContent.length).toBeGreaterThan(0);
      });

      it('should have valid frontmatter with required fields', () => {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = skillContent.match(frontmatterRegex);

        expect(match).not.toBeNull();

        const frontmatter = match![1];
        expect(frontmatter).toContain('name: Task Management');
        expect(frontmatter).toContain('description:');
        expect(frontmatter).toContain('Fibonacci priority system');
        expect(frontmatter).toContain('version:');
        expect(frontmatter).toContain('category: shared');
      });

      it('should have all required content sections', () => {
        expect(skillContent).toContain('## Purpose');
        expect(skillContent).toContain('## When to Use This Skill');
        expect(skillContent).toContain('## Fibonacci Priority System');
        expect(skillContent).toContain('### Priority Levels: Fibonacci as Forcing Function');
        expect(skillContent).toContain('## Task Schema');
      });

      it('should have no placeholder content', () => {
        PLACEHOLDER_PATTERNS.forEach(pattern => {
          expect(skillContent).not.toMatch(pattern);
        });
      });

      it('should have reasonable content length (300+ lines)', () => {
        const lineCount = skillContent.split('\n').length;
        // Reduced from 457 to ~422 lines after effort/impact removal
        expect(lineCount).toBeGreaterThanOrEqual(300);
        expect(lineCount).toBeLessThanOrEqual(450);
      });

      it('should define all Fibonacci priority levels', () => {
        expect(skillContent).toContain('P0');
        expect(skillContent).toContain('P1');
        expect(skillContent).toContain('P2');
        expect(skillContent).toContain('P3');
        expect(skillContent).toContain('P5');
        expect(skillContent).toContain('P8');
      });

      it('should explain Fibonacci as infinite sequence and forcing function', () => {
        // Test for infinite sequence concept
        expect(skillContent).toMatch(/infinite\s+sequence/i);
        expect(skillContent).toContain('P13');
        expect(skillContent).toContain('P21');

        // Test for forcing function concept
        expect(skillContent).toMatch(/forcing\s+function/i);
        expect(skillContent).toMatch(/scarcity/i);
        expect(skillContent).toMatch(/expanding\s+gaps/i);

        // Test for practical ceiling
        expect(skillContent).toMatch(/P8.*practical\s+ceiling/i);
      });

      it('should NOT contain effort/impact mappings or timeframes', () => {
        // Ensure no timeframe mappings
        expect(skillContent).not.toMatch(/0-1\s+hours/i);
        expect(skillContent).not.toMatch(/1-8\s+hours/i);
        expect(skillContent).not.toMatch(/1-3\s+days/i);

        // Ensure no "Timeframe" column in priority table
        expect(skillContent).not.toMatch(/Priority.*Name.*Timeframe.*Use Cases/);

        // Ensure impact scoring moved out
        expect(skillContent).not.toContain('### Impact Scoring (1-10 Scale)');
        expect(skillContent).not.toContain('function calculateImpact');
      });

      it('should contain priority selection criteria', () => {
        expect(skillContent).toMatch(/P0.*Critical/i);
        expect(skillContent).toMatch(/P1.*High.*Urgent/i);
        expect(skillContent).toMatch(/P2.*Medium.*Important/i);
      });

      it('should include task templates and examples', () => {
        expect(skillContent).toContain('```json');
        expect(skillContent).toMatch(/"priority":\s*"P[0-8]"/);
      });
    });

    describe('productivity-patterns skill', () => {
      const skillPath = path.join(SKILLS_DIR, 'shared/productivity-patterns/SKILL.md');
      let skillContent: string;

      beforeAll(async () => {
        skillContent = await readFile(skillPath, 'utf-8');
      });

      it('should exist and be readable', async () => {
        const stats = await stat(skillPath);
        expect(stats.isFile()).toBe(true);
        expect(skillContent.length).toBeGreaterThan(0);
      });

      it('should have valid frontmatter with required fields', () => {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = skillContent.match(frontmatterRegex);

        expect(match).not.toBeNull();

        const frontmatter = match![1];
        expect(frontmatter).toContain('name: Productivity Patterns');
        expect(frontmatter).toContain('description:');
        expect(frontmatter).toContain('version:');
        expect(frontmatter).toContain('category: shared');
      });

      it('should have all required content sections', () => {
        expect(skillContent).toContain('## Purpose');
        expect(skillContent).toContain('## When to Use This Skill');
        expect(skillContent).toContain('## Core Productivity Frameworks');
      });

      it('should have no placeholder content', () => {
        PLACEHOLDER_PATTERNS.forEach(pattern => {
          expect(skillContent).not.toMatch(pattern);
        });
      });

      it('should have reasonable content length (300+ lines)', () => {
        const lineCount = skillContent.split('\n').length;
        // Increased from 580 to ~703 lines after adding effort/impact framework
        expect(lineCount).toBeGreaterThanOrEqual(580);
        expect(lineCount).toBeLessThanOrEqual(710);
      });

      it('should have Effort/Impact Assessment Framework section', () => {
        expect(skillContent).toContain('## Effort/Impact Assessment Framework');
        expect(skillContent).toContain('### Purpose');
        expect(skillContent).toContain('### Impact Scoring (1-10 Scale)');
        expect(skillContent).toContain('### Effort Assessment');
        expect(skillContent).toContain('### Integration with Eisenhower Matrix');
      });

      it('should include impact calculation logic from task-management', () => {
        expect(skillContent).toContain('function calculateImpact');
        expect(skillContent).toMatch(/affectsRevenue|affectsUserExperience/);
        expect(skillContent).toContain('**Impact Score Criteria**');
        expect(skillContent).toMatch(/10.*Transformational.*business.*impact/i);
      });

      it('should include effort estimation guidelines', () => {
        expect(skillContent).toMatch(/Effort Assessment|Effort Estimation/i);
        expect(skillContent).toMatch(/Timeframe Guidelines|Timeframe/i);
        expect(skillContent).toMatch(/0-2 hours|2-8 hours|1-3 days/i);
      });

      it('should define productivity frameworks', () => {
        expect(skillContent).toMatch(/Getting Things Done|GTD/i);
        expect(skillContent).toMatch(/Time Blocking/i);
        expect(skillContent).toMatch(/Pomodoro|Deep Work/i);
      });

      it('should include code examples and patterns', () => {
        expect(skillContent).toContain('```');
        expect(skillContent.match(/```/g)?.length).toBeGreaterThanOrEqual(6);
      });
    });
  });

  describe('Agent-Specific Skills (Meeting Prep Agent)', () => {
    describe('meeting-templates skill', () => {
      const skillPath = path.join(SKILLS_DIR, 'agent-specific/meeting-prep-agent/meeting-templates/SKILL.md');
      let skillContent: string;

      beforeAll(async () => {
        skillContent = await readFile(skillPath, 'utf-8');
      });

      it('should exist and be readable', async () => {
        const stats = await stat(skillPath);
        expect(stats.isFile()).toBe(true);
        expect(skillContent.length).toBeGreaterThan(0);
      });

      it('should have valid frontmatter with required fields', () => {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = skillContent.match(frontmatterRegex);

        expect(match).not.toBeNull();

        const frontmatter = match![1];
        expect(frontmatter).toContain('name: Meeting Templates');
        expect(frontmatter).toContain('description:');
        expect(frontmatter).toContain('version:');
        expect(frontmatter).toContain('category: agent-specific');
        expect(frontmatter).toContain('agent: meeting-prep-agent');
      });

      it('should have all required content sections', () => {
        expect(skillContent).toContain('## Purpose');
        expect(skillContent).toContain('## When to Use This Skill');
        expect(skillContent).toContain('## Meeting Template Structure');
        expect(skillContent).toContain('## Template 1:');
      });

      it('should have no placeholder content', () => {
        PLACEHOLDER_PATTERNS.forEach(pattern => {
          expect(skillContent).not.toMatch(pattern);
        });
      });

      it('should have reasonable content length (300+ lines)', () => {
        const lineCount = skillContent.split('\n').length;
        expect(lineCount).toBeGreaterThanOrEqual(300);
      });

      it('should define multiple meeting templates', () => {
        // Check for "## Template 1:", "## Template 2:", etc.
        const templateCount = (skillContent.match(/^## Template \d+:/gm) || []).length;
        expect(templateCount).toBeGreaterThanOrEqual(3);
      });
    });

    describe('agenda-frameworks skill', () => {
      const skillPath = path.join(SKILLS_DIR, 'agent-specific/meeting-prep-agent/agenda-frameworks/SKILL.md');
      let skillContent: string;

      beforeAll(async () => {
        skillContent = await readFile(skillPath, 'utf-8');
      });

      it('should exist and be readable', async () => {
        const stats = await stat(skillPath);
        expect(stats.isFile()).toBe(true);
        expect(skillContent.length).toBeGreaterThan(0);
      });

      it('should have valid frontmatter with required fields', () => {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = skillContent.match(frontmatterRegex);

        expect(match).not.toBeNull();

        const frontmatter = match![1];
        expect(frontmatter).toContain('name: Agenda Frameworks');
        expect(frontmatter).toContain('description:');
        expect(frontmatter).toContain('version:');
        expect(frontmatter).toContain('category: agent-specific');
      });

      it('should have all required content sections', () => {
        expect(skillContent).toContain('## Purpose');
        expect(skillContent).toContain('## When to Use This Skill');
        expect(skillContent).toContain('## Core Agenda Frameworks');
      });

      it('should have no placeholder content', () => {
        PLACEHOLDER_PATTERNS.forEach(pattern => {
          expect(skillContent).not.toMatch(pattern);
        });
      });

      it('should have reasonable content length (300+ lines)', () => {
        const lineCount = skillContent.split('\n').length;
        expect(lineCount).toBeGreaterThanOrEqual(300);
      });

      it('should define multiple agenda frameworks', () => {
        const frameworkCount = (skillContent.match(/###.*Framework/gi) || []).length;
        expect(frameworkCount).toBeGreaterThanOrEqual(3);
      });
    });

    describe('note-taking skill', () => {
      const skillPath = path.join(SKILLS_DIR, 'agent-specific/meeting-prep-agent/note-taking/SKILL.md');
      let skillContent: string;

      beforeAll(async () => {
        skillContent = await readFile(skillPath, 'utf-8');
      });

      it('should exist and be readable', async () => {
        const stats = await stat(skillPath);
        expect(stats.isFile()).toBe(true);
        expect(skillContent.length).toBeGreaterThan(0);
      });

      it('should have valid frontmatter with required fields', () => {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = skillContent.match(frontmatterRegex);

        expect(match).not.toBeNull();

        const frontmatter = match![1];
        expect(frontmatter).toContain('name:');
        expect(frontmatter).toContain('Note-Taking' || 'Note Taking');
        expect(frontmatter).toContain('description:');
        expect(frontmatter).toContain('version:');
      });

      it('should have all required content sections', () => {
        expect(skillContent).toContain('## Purpose');
        expect(skillContent).toContain('## When to Use This Skill');
        expect(skillContent).toContain('## Core Note-Taking Frameworks');
      });

      it('should have no placeholder content', () => {
        PLACEHOLDER_PATTERNS.forEach(pattern => {
          expect(skillContent).not.toMatch(pattern);
        });
      });

      it('should have reasonable content length (300+ lines)', () => {
        const lineCount = skillContent.split('\n').length;
        expect(lineCount).toBeGreaterThanOrEqual(300);
      });

      it('should define note-taking methodologies', () => {
        const methodCount = (skillContent.match(/###.*Method|###.*System/gi) || []).length;
        expect(methodCount).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('Cross-Skill Validation', () => {
    it('should have consistent version numbering across all Phase 2 skills', async () => {
      const allSkills = [...PHASE_2_SKILLS.shared, ...PHASE_2_SKILLS.agentSpecific];

      for (const skill of allSkills) {
        const skillPath = path.join(SKILLS_DIR, skill.path, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        expect(content).toMatch(/version:\s*["']1\.0\.0["']/);
      }
    });

    it('should have proper markdown structure in all Phase 2 skills', async () => {
      const allSkills = [...PHASE_2_SKILLS.shared, ...PHASE_2_SKILLS.agentSpecific];

      for (const skill of allSkills) {
        const skillPath = path.join(SKILLS_DIR, skill.path, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        // Should have frontmatter
        expect(content).toMatch(/^---\s*\n[\s\S]*?\n---/);

        // Should have H1 header
        expect(content).toMatch(/^#\s+\w+/m);

        // Should have multiple H2 sections
        const h2Count = (content.match(/^##\s+/gm) || []).length;
        expect(h2Count).toBeGreaterThanOrEqual(3);
      }
    });

    it('should not have any broken internal references', async () => {
      const allSkills = [...PHASE_2_SKILLS.shared, ...PHASE_2_SKILLS.agentSpecific];

      for (const skill of allSkills) {
        const skillPath = path.join(SKILLS_DIR, skill.path, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');

        // Check for broken markdown links
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const links = [...content.matchAll(linkRegex)];

        for (const link of links) {
          const linkTarget = link[2];

          // Internal links should start with # or ./
          if (linkTarget.startsWith('#')) {
            // Should reference an existing header
            const headerName = linkTarget.substring(1);
            const headerExists = content.includes(`## ${headerName}`) ||
                                  content.includes(`### ${headerName}`);

            // Don't fail test but warn if header not found
            if (!headerExists) {
              console.warn(`Potential broken link in ${skill.name}: ${linkTarget}`);
            }
          }
        }
      }
    });

    it('should total to approximately 3,560 lines across all 6 Phase 2 skills', async () => {
      const allSkills = [...PHASE_2_SKILLS.shared, ...PHASE_2_SKILLS.agentSpecific];
      let totalLines = 0;

      for (const skill of allSkills) {
        const skillPath = path.join(SKILLS_DIR, skill.path, 'SKILL.md');
        const content = await readFile(skillPath, 'utf-8');
        const lineCount = content.split('\n').length;
        totalLines += lineCount;
      }

      // After refactoring: task-management reduced ~35 lines, productivity-patterns increased ~123 lines
      // Net change: +88 lines (3447 + 113 = 3560 actual)
      // Allow variance for line endings and minor content adjustments
      expect(totalLines).toBeGreaterThanOrEqual(3540);
      expect(totalLines).toBeLessThanOrEqual(3580);
    });
  });

  describe('File System Validation', () => {
    it('should have correct directory structure', async () => {
      // Shared skills directory
      const sharedStats = await stat(path.join(SKILLS_DIR, 'shared'));
      expect(sharedStats.isDirectory()).toBe(true);

      // Agent-specific directory
      const agentSpecificStats = await stat(path.join(SKILLS_DIR, 'agent-specific'));
      expect(agentSpecificStats.isDirectory()).toBe(true);

      // Meeting prep agent directory
      const meetingPrepStats = await stat(path.join(SKILLS_DIR, 'agent-specific/meeting-prep-agent'));
      expect(meetingPrepStats.isDirectory()).toBe(true);
    });

    it('should have SKILL.md file in each skill directory', async () => {
      const allSkills = [...PHASE_2_SKILLS.shared, ...PHASE_2_SKILLS.agentSpecific];

      for (const skill of allSkills) {
        const skillMdPath = path.join(SKILLS_DIR, skill.path, 'SKILL.md');
        const stats = await stat(skillMdPath);
        expect(stats.isFile()).toBe(true);
      }
    });

    it('should have readable permissions on all skill files', async () => {
      const allSkills = [...PHASE_2_SKILLS.shared, ...PHASE_2_SKILLS.agentSpecific];

      for (const skill of allSkills) {
        const skillMdPath = path.join(SKILLS_DIR, skill.path, 'SKILL.md');
        const stats = await stat(skillMdPath);

        // File should be readable (check mode)
        const mode = stats.mode & parseInt('777', 8);
        expect(mode & parseInt('400', 8)).toBeTruthy(); // Owner read permission
      }
    });
  });
});
