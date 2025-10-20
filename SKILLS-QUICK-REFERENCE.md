# AVI Agent Skills - Quick Reference

**Total Skills: 25** | **Total Lines: 14,790** | **Status: Production Ready**

---

## 🎯 Find a Skill by Need

### Need to Build UI/Components?
- **design-system** (894 lines) - Design tokens, WCAG 2.1 AA, responsive patterns
- **component-library** (916 lines) - React components, hooks, performance
- **testing-patterns** (882 lines) - Unit, integration, E2E, visual regression

### Need to Manage Tasks/Goals?
- **task-management** (440 lines) - CRUD, priorities, workflows
- **time-management** (572 lines) - Time blocking, Pomodoro, deadlines
- **goal-frameworks** (602 lines) - OKRs, SMART goals, KPIs

### Need to Communicate/Collaborate?
- **conversation-patterns** (601 lines) - Rapport, active listening, questions
- **meeting-coordination** (486 lines) - Scheduling, agendas, follow-ups
- **follow-up-patterns** (496 lines) - Timing, tracking, execution

### Need to Manage Feedback/Ideas?
- **feedback-frameworks** (326 lines) - Collection, analysis, improvement
- **idea-evaluation** (449 lines) - Scoring, prioritization, ROI

### Need to Organize Knowledge?
- **link-curation** (588 lines) - Categorization, tagging, search
- **project-memory** (635 lines) - Decision logs, context, knowledge graphs
- **documentation-standards** (847 lines) - Markdown, API docs, READMEs

### Need System/Security?
- **avi-architecture** (480 lines) - System design, patterns
- **security-policies** (878 lines) - Auth, encryption, XSS/SQL prevention
- **update-protocols** (618 lines) - Versioning, rollback, migration
- **code-standards** (436 lines) - TypeScript, React, Node.js standards

### Need Templates/Branding?
- **agent-templates** (368 lines) - Agent scaffolding
- **brand-guidelines** (162 lines) - Voice, tone, style

---

## 📂 Skills by Location

### System Skills (7) - `/prod/skills/.system/`
- avi-architecture
- code-standards
- agent-templates
- brand-guidelines
- update-protocols ⭐
- documentation-standards ⭐
- security-policies ⭐

### Shared Skills (15) - `/prod/skills/shared/`
- task-management
- user-preferences
- productivity-patterns
- feedback-frameworks ⭐
- idea-evaluation ⭐
- follow-up-patterns ⭐
- meeting-coordination ⭐
- conversation-patterns ⭐
- link-curation ⭐
- design-system ⭐
- testing-patterns ⭐
- component-library ⭐
- time-management ⭐
- goal-frameworks ⭐
- project-memory ⭐

### Agent-Specific (3) - `/prod/skills/agent-specific/`
- meeting-prep-agent/agenda-frameworks
- meeting-prep-agent/note-taking
- meeting-prep-agent/meeting-templates

⭐ = Phase 3 (New)

---

## 🤖 Skills by Target Agent

### personal-todos-agent
- task-management
- time-management
- goal-frameworks
- user-preferences
- productivity-patterns

### agent-feedback-agent
- feedback-frameworks
- idea-evaluation
- user-preferences

### agent-ideas-agent
- idea-evaluation
- feedback-frameworks
- project-memory

### get-to-know-you-agent
- conversation-patterns
- user-preferences
- follow-up-patterns

### link-logger-agent
- link-curation
- project-memory

### page-builder-agent
- design-system
- component-library
- code-standards

### page-verification-agent
- testing-patterns
- design-system

### dynamic-page-testing-agent
- testing-patterns
- component-library

### follow-ups-agent
- follow-up-patterns
- time-management
- meeting-coordination

### meeting-next-steps-agent
- meeting-coordination
- follow-up-patterns
- project-memory

### meeting-prep-agent
- meeting-coordination
- agenda-frameworks
- note-taking
- meeting-templates

### meta-update-agent
- update-protocols
- documentation-standards
- security-policies

### meta-agent
- All system skills
- project-memory
- security-policies

---

## 📊 Skills by Size

**Extra Large (800+ lines):**
- component-library (916)
- design-system (894)
- testing-patterns (882)
- security-policies (878)
- documentation-standards (847)

**Large (600-799 lines):**
- productivity-patterns (702)
- meeting-templates (692)
- note-taking (653)
- agenda-frameworks (647)
- project-memory (635)
- update-protocols (618)
- goal-frameworks (602)
- conversation-patterns (601)

**Medium (400-599 lines):**
- link-curation (588)
- time-management (572)
- follow-up-patterns (496)
- meeting-coordination (486)
- avi-architecture (480)
- idea-evaluation (449)
- task-management (440)
- code-standards (436)
- user-preferences (420)

**Small (< 400 lines):**
- agent-templates (368)
- feedback-frameworks (326)
- brand-guidelines (162)

---

## 🔑 Key Skill Patterns

### Most Cross-Referenced Skills
1. user-preferences (used by 10+ agents)
2. task-management (core functionality)
3. project-memory (context retention)
4. code-standards (all development)
5. security-policies (all APIs)

### Foundational Skills (Learn These First)
1. avi-architecture - System understanding
2. code-standards - Development practices
3. task-management - Core operations
4. user-preferences - Personalization
5. documentation-standards - Knowledge sharing

### Specialized Skills (Advanced Usage)
1. testing-patterns - Quality assurance
2. component-library - Advanced React
3. security-policies - Security implementation
4. update-protocols - System maintenance
5. design-system - UI/UX excellence

---

## 📈 Skill Maturity Levels

### Production Ready (Can Use Immediately)
- All 25 skills are production-ready
- Zero placeholders or TODOs
- Complete documentation
- Real-world examples

### Integration Requirements
**No Dependencies:**
- feedback-frameworks
- conversation-patterns
- link-curation
- time-management
- goal-frameworks
- project-memory

**Minimal Configuration:**
- task-management
- user-preferences
- follow-up-patterns
- meeting-coordination

**Infrastructure Required:**
- design-system (design tokens)
- testing-patterns (test frameworks)
- component-library (React setup)
- security-policies (auth infrastructure)

---

## 🚀 Quick Start Guides

### For New Agents
1. Read: avi-architecture
2. Apply: agent-templates
3. Implement: task-management + user-preferences
4. Follow: code-standards
5. Document: documentation-standards

### For Feature Development
1. Plan: idea-evaluation
2. Design: design-system
3. Build: component-library + code-standards
4. Test: testing-patterns
5. Deploy: update-protocols

### For User Interaction
1. Discover: conversation-patterns
2. Track: follow-up-patterns
3. Schedule: meeting-coordination
4. Deliver: task-management
5. Improve: feedback-frameworks

---

## 📞 Getting Help

**Find Skill Documentation:**
- All skills: `/workspaces/agent-feed/prod/skills/`
- System: `/prod/skills/.system/`
- Shared: `/prod/skills/shared/`
- Agent-specific: `/prod/skills/agent-specific/`

**Skill File Structure:**
- Each skill has `SKILL.md` with complete documentation
- Frontmatter includes metadata and agent permissions
- Sections: Purpose, When to Use, Core Frameworks, Best Practices
- Cross-references to related skills
- Code examples and templates

**Need to Create a Skill?**
- Use agent-templates skill as guide
- Follow documentation-standards
- Reference similar existing skills
- Include frontmatter metadata
- Provide complete examples

---

**Last Updated:** 2025-10-18  
**Version:** 1.0.0  
**Skills Count:** 25 (4 system + 15 shared + 3 agent-specific + 3 new system)
