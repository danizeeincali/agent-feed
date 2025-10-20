# AgentTierBadge - Quick Reference

## Import
```tsx
import { AgentTierBadge } from '@/components/agents';
```

## Basic Usage
```tsx
// T1 User-facing badge
<AgentTierBadge tier={1} />  
// Output: "T1 - User-facing" (blue badge)

// T2 System badge
<AgentTierBadge tier={2} />  
// Output: "T2 - System" (gray badge)
```

## Variants
```tsx
// Default (full label with border)
<AgentTierBadge tier={1} variant="default" />
// → "T1 - User-facing"

// Compact (short label, no border)
<AgentTierBadge tier={1} variant="compact" />
// → "T1"

// Icon-only (circular, number only)
<AgentTierBadge tier={1} variant="icon-only" />
// → "1"
```

## Props
```tsx
interface AgentTierBadgeProps {
  tier: 1 | 2;                                    // Required
  variant?: 'default' | 'compact' | 'icon-only'; // Optional, default: 'default'
  showLabel?: boolean;                            // Optional, default: true
  className?: string;                             // Optional, default: ''
}
```

## Color Schemes
- **T1**: Blue (`bg-blue-100`, `text-blue-800`, `border-blue-300`)
- **T2**: Gray (`bg-gray-100`, `text-gray-800`, `border-gray-300`)

## Accessibility
- All variants include ARIA labels
- WCAG 2.1 AA compliant
- Screen reader compatible

## Test Coverage
- 45 unit tests (all passing)
- 100% feature coverage
- Production-ready

## File Locations
- Component: `/workspaces/agent-feed/frontend/src/components/agents/AgentTierBadge.tsx`
- Tests: `/workspaces/agent-feed/frontend/src/tests/unit/AgentTierBadge.test.tsx`
- Exports: `/workspaces/agent-feed/frontend/src/components/agents/index.ts`

## Run Tests
```bash
cd /workspaces/agent-feed/frontend
npm test -- AgentTierBadge.test.tsx --run
```
