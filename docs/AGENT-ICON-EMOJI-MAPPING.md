# Agent Icon & Emoji Mapping

Complete icon assignments for all 19 agents in the Agent Feed system.

## Mapping Strategy

- **T1 Agents**: User-facing icons (friendly, action-oriented)
- **T2 Agents**: System icons (technical, administrative)
- **Lucide Icons**: Primary SVG icons from lucide-react
- **Emoji Fallbacks**: Unicode emoji for compatibility

---

## T1 User-Facing Agents (8 Total)

### 1. Personal Todos Agent
```yaml
name: personal-todos-agent
tier: 1
icon: CheckSquare
icon_type: svg
icon_emoji: ✅
color: blue-600
description: Task management and personal productivity
```

### 2. Get To Know You Agent
```yaml
name: get-to-know-you-agent
tier: 1
icon: Users
icon_type: svg
icon_emoji: 👥
color: blue-500
description: User profiling and relationship building
```

### 3. Follow-ups Agent
```yaml
name: follow-ups-agent
tier: 1
icon: Clock
icon_type: svg
icon_emoji: ⏰
color: blue-500
description: Reminder tracking and follow-up management
```

### 4. Meeting Next Steps Agent
```yaml
name: meeting-next-steps-agent
tier: 1
icon: Calendar
icon_type: svg
icon_emoji: 📅
color: blue-500
description: Meeting action items and next steps
```

### 5. Meeting Prep Agent
```yaml
name: meeting-prep-agent
tier: 1
icon: FileText
icon_type: svg
icon_emoji: 📋
color: blue-500
description: Meeting preparation and agenda planning
```

### 6. Link Logger Agent
```yaml
name: link-logger-agent
tier: 1
icon: Link
icon_type: svg
icon_emoji: 🔗
color: blue-500
description: URL tracking and bookmark management
```

### 7. Agent Feedback Agent
```yaml
name: agent-feedback-agent
tier: 1
icon: MessageSquare
icon_type: svg
icon_emoji: 💬
color: blue-500
description: User feedback collection and analysis
```

### 8. Agent Ideas Agent
```yaml
name: agent-ideas-agent
tier: 1
icon: Lightbulb
icon_type: svg
icon_emoji: 💡
color: blue-500
description: Idea generation and creative brainstorming
```

---

## T2 System/Meta Agents (11 Total)

### 9. Avi (Chief of Staff)
```yaml
name: avi
tier: 1
icon: Bot
icon_type: svg
icon_emoji: 🤖
color: purple-600
description: Chief of Staff and strategic orchestrator
special: Primary user interface agent
```

### 10. Meta Agent
```yaml
name: meta-agent
tier: 2
icon: Settings
icon_type: svg
icon_emoji: ⚙️
color: gray-500
description: Multi-domain meta-coordination (deprecated)
visibility: protected
status: deprecated
```

### 11. Page Builder Agent
```yaml
name: page-builder-agent
tier: 2
icon: Layout
icon_type: svg
icon_emoji: 📐
color: gray-500
description: Dynamic page creation and management
```

### 12. Page Verification Agent
```yaml
name: page-verification-agent
tier: 2
icon: ShieldCheck
icon_type: svg
icon_emoji: 🛡️
color: gray-500
description: Autonomous QA testing for pages
```

### 13. Dynamic Page Testing Agent
```yaml
name: dynamic-page-testing-agent
tier: 2
icon: TestTube
icon_type: svg
icon_emoji: 🧪
color: gray-500
description: E2E testing for dynamic pages
```

### 14. Agent Architect Agent (PROTECTED)
```yaml
name: agent-architect-agent
tier: 2
icon: Wrench
icon_type: svg
icon_emoji: 🔧
color: gray-600
description: Creates new agents from scratch
visibility: protected
protection_reason: Phase 4.2 specialist - system critical
```

### 15. Agent Maintenance Agent (PROTECTED)
```yaml
name: agent-maintenance-agent
tier: 2
icon: Tool
icon_type: svg
icon_emoji: 🛠️
color: gray-600
description: Updates and maintains existing agents
visibility: protected
protection_reason: Phase 4.2 specialist - system critical
```

### 16. Skills Architect Agent (PROTECTED)
```yaml
name: skills-architect-agent
tier: 2
icon: BookOpen
icon_type: svg
icon_emoji: 📚
color: gray-600
description: Creates new skills from scratch
visibility: protected
protection_reason: Phase 4.2 specialist - system critical
```

### 17. Skills Maintenance Agent (PROTECTED)
```yaml
name: skills-maintenance-agent
tier: 2
icon: Pencil
icon_type: svg
icon_emoji: ✏️
color: gray-600
description: Updates and maintains existing skills
visibility: protected
protection_reason: Phase 4.2 specialist - system critical
```

### 18. Learning Optimizer Agent (PROTECTED)
```yaml
name: learning-optimizer-agent
tier: 2
icon: TrendingUp
icon_type: svg
icon_emoji: 📈
color: gray-600
description: Autonomous learning and optimization
visibility: protected
protection_reason: Phase 4.2 specialist - system critical
```

### 19. System Architect Agent (PROTECTED)
```yaml
name: system-architect-agent
tier: 2
icon: Database
icon_type: svg
icon_emoji: 🗄️
color: gray-600
description: System-wide architecture and design
visibility: protected
protection_reason: Phase 4.2 specialist - system critical
```

---

## Icon Constants (TypeScript)

```typescript
// frontend/src/constants/agent-icons.ts

import {
  Bot,
  CheckSquare,
  Users,
  Clock,
  Calendar,
  FileText,
  Link,
  MessageSquare,
  Lightbulb,
  Settings,
  Layout,
  ShieldCheck,
  TestTube,
  Wrench,
  Tool,
  BookOpen,
  Pencil,
  TrendingUp,
  Database
} from 'lucide-react';

export const AGENT_ICON_MAP: Record<string, LucideIcon> = {
  'avi': Bot,
  'personal-todos-agent': CheckSquare,
  'get-to-know-you-agent': Users,
  'follow-ups-agent': Clock,
  'meeting-next-steps-agent': Calendar,
  'meeting-prep-agent': FileText,
  'link-logger-agent': Link,
  'agent-feedback-agent': MessageSquare,
  'agent-ideas-agent': Lightbulb,
  'meta-agent': Settings,
  'page-builder-agent': Layout,
  'page-verification-agent': ShieldCheck,
  'dynamic-page-testing-agent': TestTube,
  'agent-architect-agent': Wrench,
  'agent-maintenance-agent': Tool,
  'skills-architect-agent': BookOpen,
  'skills-maintenance-agent': Pencil,
  'learning-optimizer-agent': TrendingUp,
  'system-architect-agent': Database
};

export const AGENT_EMOJI_FALLBACK: Record<string, string> = {
  'avi': '🤖',
  'personal-todos-agent': '✅',
  'get-to-know-you-agent': '👥',
  'follow-ups-agent': '⏰',
  'meeting-next-steps-agent': '📅',
  'meeting-prep-agent': '📋',
  'link-logger-agent': '🔗',
  'agent-feedback-agent': '💬',
  'agent-ideas-agent': '💡',
  'meta-agent': '⚙️',
  'page-builder-agent': '📐',
  'page-verification-agent': '🛡️',
  'dynamic-page-testing-agent': '🧪',
  'agent-architect-agent': '🔧',
  'agent-maintenance-agent': '🛠️',
  'skills-architect-agent': '📚',
  'skills-maintenance-agent': '✏️',
  'learning-optimizer-agent': '📈',
  'system-architect-agent': '🗄️'
};

export const AGENT_COLORS: Record<string, string> = {
  tier1: 'blue-600',
  tier2: 'gray-500',
  protected: 'gray-600',
  avi: 'purple-600'
};
```

---

## Emoji Fallback Strategy

### Level 1: SVG Icon (Primary)
- Loaded from lucide-react
- Dynamic import with tree-shaking
- 24x24px default size
- Color customizable via Tailwind

### Level 2: Emoji Fallback (Secondary)
- Unicode emoji character
- Cross-browser compatible
- Accessible with aria-label
- Consistent sizing via CSS

### Level 3: Initials Fallback (Tertiary)
- Generated from agent name
- First letter of first two words
- Example: "Agent Feedback" → "AF"
- Circular badge with tier-based color

---

## Color Scheme

### T1 User-Facing Agents
- **Primary Color**: `text-blue-600` / `bg-blue-100`
- **Hover**: `hover:bg-blue-200`
- **Active**: `bg-blue-600 text-white`

### T2 System Agents
- **Primary Color**: `text-gray-500` / `bg-gray-100`
- **Hover**: `hover:bg-gray-200`
- **Active**: `bg-gray-500 text-white`

### Protected Agents
- **Primary Color**: `text-gray-600` / `bg-gray-100`
- **Border**: `border-red-300`
- **Badge**: `bg-red-100 text-red-800`

### Avi (Special)
- **Primary Color**: `text-purple-600` / `bg-purple-100`
- **Hover**: `hover:bg-purple-200`
- **Active**: `bg-purple-600 text-white`

---

## Implementation Notes

### Icon Size System
```typescript
const ICON_SIZES = {
  xs: 'w-3 h-3',    // 12px
  sm: 'w-4 h-4',    // 16px
  md: 'w-6 h-6',    // 24px (default)
  lg: 'w-8 h-8',    // 32px
  xl: 'w-12 h-12',  // 48px
  '2xl': 'w-16 h-16' // 64px
};
```

### Accessibility
- All icons have `aria-label` with agent name
- Decorative icons use `aria-hidden="true"`
- Meaningful icons use `role="img"`
- WCAG 2.1 AA contrast ratios enforced

### Performance
- Tree-shaking removes unused lucide icons
- Total bundle size: ~300 bytes/icon gzipped
- Lazy loading for custom SVGs
- Memoization for icon components

---

## Testing

### Visual Regression Tests
- Screenshot validation for each icon
- Color contrast verification
- Size consistency across tiers
- Fallback rendering tests

### Accessibility Tests
- ARIA label presence
- Screen reader compatibility
- Keyboard navigation
- High contrast mode support

---

**Status**: ✅ Icon mapping complete for all 19 agents
**Next**: Update agent frontmatter with tier/icon fields
