#!/usr/bin/env node
/**
 * Add code-standards skill to all building agents
 * Part of comprehensive fix plan - automated skill addition
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGENTS_DIR = '/workspaces/agent-feed/prod/.claude/agents';
const BUILDING_AGENTS = [
  'agent-architect-agent',
  'agent-maintenance-agent',
  'skills-architect-agent',
  'skills-maintenance-agent'
  // Note: coder, sparc-coder, backend-dev, mobile-dev, tdd-london-swarm
  // are managed by Claude Code system, not in prod/.claude/agents
];

const SKILL_TO_ADD = `skills:
  - name: code-standards
    path: .system/code-standards
    required: true`;

function addSkillToAgent(agentFile) {
  const agentPath = path.join(AGENTS_DIR, `${agentFile}.md`);

  if (!fs.existsSync(agentPath)) {
    console.log(`⚠️  Agent not found: ${agentFile}`);
    return false;
  }

  const content = fs.readFileSync(agentPath, 'utf-8');

  // Check if already has code-standards skill
  if (content.includes('name: code-standards')) {
    console.log(`✅ ${agentFile} already has code-standards skill`);
    return true;
  }

  // Parse frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

  if (!frontmatterMatch) {
    console.log(`⚠️  No frontmatter found in ${agentFile}`);
    return false;
  }

  const frontmatter = frontmatterMatch[1];
  const restOfContent = content.substring(frontmatterMatch[0].length);

  // Check if has skills section
  let updatedFrontmatter;

  if (frontmatter.includes('skills:')) {
    // Add to existing skills section
    updatedFrontmatter = frontmatter.replace(
      /skills:/,
      `skills:\n  - name: code-standards\n    path: .system/code-standards\n    required: true`
    );
  } else {
    // Add new skills section
    updatedFrontmatter = frontmatter + `\n${SKILL_TO_ADD}`;
  }

  const updatedContent = `---\n${updatedFrontmatter}\n---${restOfContent}`;

  // Write back
  fs.writeFileSync(agentPath, updatedContent, 'utf-8');
  console.log(`✅ Added code-standards skill to ${agentFile}`);

  return true;
}

// Main execution
console.log('🔧 Adding code-standards skill to all building agents...\n');

let successCount = 0;
let skipCount = 0;
let errorCount = 0;

for (const agent of BUILDING_AGENTS) {
  try {
    const result = addSkillToAgent(agent);
    if (result) {
      successCount++;
    } else {
      skipCount++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${agent}:`, error.message);
    errorCount++;
  }
}

console.log('\n📊 Summary:');
console.log(`   ✅ Success: ${successCount}`);
console.log(`   ⚠️  Skipped: ${skipCount}`);
console.log(`   ❌ Errors: ${errorCount}`);

process.exit(errorCount > 0 ? 1 : 0);
