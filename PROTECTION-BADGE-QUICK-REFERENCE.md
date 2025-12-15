# ProtectionBadge - Quick Reference Guide

## Overview

Visual badge component indicating protected agents that cannot be modified.

---

## Import

```tsx
import { ProtectionBadge } from './components/agents/ProtectionBadge';
```

---

## Basic Usage

```tsx
// Minimal usage
<ProtectionBadge isProtected={true} />

// With custom message
<ProtectionBadge
  isProtected={true}
  protectionReason="System critical agent"
/>

// Without tooltip
<ProtectionBadge
  isProtected={true}
  showTooltip={false}
/>

// With custom styling
<ProtectionBadge
  isProtected={true}
  className="ml-2"
/>
```

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isProtected` | `boolean` | ✅ Yes | - | Whether agent is protected |
| `protectionReason` | `string` | ❌ No | "This agent is protected from modification" | Tooltip text |
| `showTooltip` | `boolean` | ❌ No | `true` | Show/hide tooltip |
| `className` | `string` | ❌ No | `""` | Custom CSS classes |

---

## Visual Reference

### Badge Appearance

```
┌──────────────────┐
│ 🔒 Protected     │  ← Red badge with lock icon
└──────────────────┘
```

### With Tooltip (on hover)

```
┌────────────────────────────┐
│ System critical agent      │  ← Tooltip
└─────────────┬──────────────┘
              ▼
      ┌──────────────────┐
      │ 🔒 Protected     │
      └──────────────────┘
```

---

## Integration Examples

### In AgentCard Component

```tsx
const AgentCard = ({ agent }) => (
  <div className="agent-card">
    <div className="flex items-center gap-2">
      <h3>{agent.name}</h3>
      <ProtectionBadge
        isProtected={agent.tier === 2 && agent.visibility === 'protected'}
        protectionReason="Protected system agent"
      />
    </div>
  </div>
);
```

### In Agent List

```tsx
{agents.map(agent => (
  <div key={agent.id} className="flex justify-between">
    <span>{agent.name}</span>
    <ProtectionBadge
      isProtected={isProtectedAgent(agent)}
      protectionReason={getProtectionReason(agent)}
    />
  </div>
))}
```

### In Modal Header

```tsx
<div className="modal-header">
  <h2>{agent.name}</h2>
  <ProtectionBadge
    isProtected={agent.protection?.isProtected}
    protectionReason={agent.protection?.warningMessage}
  />
</div>
```

---

## Protection Scenarios

### Tier 2 Protected Agents

```tsx
<ProtectionBadge
  isProtected={agent.tier === 2 && agent.visibility === 'protected'}
  protectionReason="System specialist agent - critical for platform operations"
/>
```

**Agents**: `agent-architect-agent`, `agent-maintenance-agent`, `skills-architect-agent`, `skills-maintenance-agent`, `learning-optimizer-agent`, `system-architect-agent`

### Meta-Coordination Agents

```tsx
<ProtectionBadge
  isProtected={agent.slug === 'meta-agent' || agent.slug === 'meta-update-agent'}
  protectionReason="Meta-agent - manages agent lifecycle"
/>
```

**Agents**: `meta-agent`, `meta-update-agent`

### System Directory Agents

```tsx
<ProtectionBadge
  isProtected={agent.filePath?.includes('.system/')}
  protectionReason="System directory agents are read-only"
/>
```

**Pattern**: Agents in `.system/` directory

---

## Accessibility Features

- **ARIA Label**: `"Protected agent - cannot be modified"`
- **Keyboard Support**: Tab to focus, shows tooltip
- **Screen Reader**: Announces protection status
- **WCAG Level**: AA compliant

---

## Styling

### Default Colors

- Background: `bg-red-100` (#FEE2E2)
- Text: `text-red-800` (#991B1B)
- Border: `border-red-300` (#FCA5A5)

### Tooltip Colors

- Background: `bg-gray-900` (#111827)
- Text: `text-white` (#FFFFFF)

### Custom Styling

```tsx
// Add custom classes
<ProtectionBadge
  isProtected={true}
  className="ml-auto mr-4 opacity-90"
/>

// Or override with Tailwind
<div className="[&_.protection-badge]:bg-yellow-100">
  <ProtectionBadge isProtected={true} />
</div>
```

---

## Test Commands

```bash
# Run tests
npm test src/tests/unit/ProtectionBadge.test.tsx

# Run with coverage
npm test -- --coverage src/tests/unit/ProtectionBadge.test.tsx

# Watch mode
npm test -- --watch src/tests/unit/ProtectionBadge.test.tsx
```

---

## Files

- **Component**: `/frontend/src/components/agents/ProtectionBadge.tsx`
- **Tests**: `/frontend/src/tests/unit/ProtectionBadge.test.tsx`
- **Report**: `/PROTECTION-BADGE-TDD-IMPLEMENTATION-REPORT.md`

---

## Test Results

```
✅ 15/15 tests passing (100%)
⏱️  456ms execution time
📊 100% test coverage
```

---

## Support

For issues or questions, refer to:
- Full implementation report: `PROTECTION-BADGE-TDD-IMPLEMENTATION-REPORT.md`
- Pseudocode specification: `docs/PSEUDOCODE-PROTECTION-VALIDATION.md`
- Test suite: `frontend/src/tests/unit/ProtectionBadge.test.tsx`

---

**Last Updated**: 2025-10-19
**Status**: Production Ready ✅
