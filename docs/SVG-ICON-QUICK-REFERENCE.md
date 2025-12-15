# SVG Icon System - Quick Reference

**Last Updated:** 2025-10-19
**For:** Agent Feed Development Team

---

## TL;DR - Key Decisions

### ✅ What We're Using
- **Library:** lucide-react (keep current setup)
- **Pattern:** Inline SVG components with named imports
- **Styling:** Tailwind CSS + currentColor
- **Accessibility:** aria-hidden for decorative, aria-label for meaningful

### ❌ What We're NOT Using
- SVG sprite sheets (unnecessary complexity)
- External SVG files (loses styling control)
- react-icons (lucide-react is better for our needs)

---

## Common Patterns

### 1. Decorative Icon (with visible text)

```tsx
import { Bot } from 'lucide-react';

<button className="flex items-center gap-2">
  <Bot className="w-5 h-5" aria-hidden="true" />
  <span>Agent Profile</span>
</button>
```

### 2. Meaningful Icon (no visible text)

```tsx
import { Eye } from 'lucide-react';

<button aria-label="View agent details" className="p-2">
  <Eye className="w-5 h-5" aria-hidden="true" />
</button>
```

### 3. Status Icons

```tsx
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

const STATUS_ICONS = {
  active: CheckCircle,
  error: AlertCircle,
  inactive: Clock,
};

const StatusIndicator = ({ status }) => {
  const Icon = STATUS_ICONS[status] || Clock;
  return (
    <Icon
      className={`w-4 h-4 ${
        status === 'active' ? 'text-green-500' :
        status === 'error' ? 'text-red-500' :
        'text-yellow-500'
      }`}
      aria-hidden="true"
    />
  );
};
```

### 4. Agent Avatar Icons

```tsx
import { Bot } from 'lucide-react';

<div
  className="w-10 h-10 rounded-lg flex items-center justify-center"
  style={{ backgroundColor: agent.avatar_color }}
>
  <Bot className="w-6 h-6 text-white" aria-hidden="true" />
</div>
```

---

## Icon Size System

```tsx
// Standard sizes (use these)
const SIZES = {
  xs: 'w-3 h-3',    // 12px - Very small indicators
  sm: 'w-4 h-4',    // 16px - Inline text icons
  md: 'w-5 h-5',    // 20px - Default size
  lg: 'w-6 h-6',    // 24px - Buttons, cards
  xl: 'w-8 h-8',    // 32px - Headers
  '2xl': 'w-10 h-10', // 40px - Avatars
};
```

### Usage Examples

```tsx
// Button icon
<Search className="w-5 h-5" />

// List item icon
<Bot className="w-4 h-4" />

// Header icon
<Settings className="w-6 h-6" />

// Avatar icon
<Bot className="w-10 h-10" />
```

---

## Color & Theming

### Using currentColor

```tsx
// Icon inherits parent text color
<div className="text-blue-500">
  <Bot className="w-5 h-5" /> {/* Will be blue-500 */}
</div>

// Explicit color
<Bot className="w-5 h-5 text-red-500" />

// Dark mode support
<Bot className="w-5 h-5 text-gray-900 dark:text-gray-100" />
```

### Status Colors

```tsx
const STATUS_COLORS = {
  active: 'text-green-500 dark:text-green-400',
  inactive: 'text-yellow-500 dark:text-yellow-400',
  error: 'text-red-500 dark:text-red-400',
  pending: 'text-blue-500 dark:text-blue-400',
};

<CheckCircle className={`w-4 h-4 ${STATUS_COLORS[status]}`} />
```

---

## Accessibility Rules

### Rule 1: Decorative Icons
**When:** Icon appears next to visible text
**Action:** Add `aria-hidden="true"`

```tsx
✅ Correct:
<button>
  <Bot className="w-5 h-5" aria-hidden="true" />
  <span>Profile</span>
</button>

❌ Incorrect:
<button>
  <Bot className="w-5 h-5" aria-label="Bot" />
  <span>Profile</span>
</button>
```

### Rule 2: Meaningful Icons
**When:** Icon without visible text
**Action:** Add `aria-label` on interactive element

```tsx
✅ Correct:
<button aria-label="Search agents">
  <Search className="w-5 h-5" aria-hidden="true" />
</button>

❌ Incorrect:
<button>
  <Search className="w-5 h-5" />
</button>
```

### Rule 3: Status Indicators
**When:** Icon conveys status information
**Action:** Provide context for screen readers

```tsx
✅ Correct:
<div role="status" aria-label="Agent status: Active">
  <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
  <span aria-hidden="true">Active</span>
</div>
```

---

## Performance Best Practices

### ✅ DO

```tsx
// Named imports (tree-shakeable)
import { Bot, Search, Settings } from 'lucide-react';

// Separate UI chunk (already configured in vite.config.ts)
manualChunks: {
  ui: ['lucide-react'],
}
```

### ❌ DON'T

```tsx
// Default import (imports entire library)
import * as Icons from 'lucide-react';

// Dynamic imports unless necessary
const Icon = Icons[iconName]; // Prevents tree-shaking
```

---

## Common Icon Mappings

### Agent Icons

```tsx
import {
  Bot,        // Default agent
  Code,       // Developer agent
  Database,   // Database agent
  Shield,     // Security agent
  Zap,        // Optimizer agent
  Lightbulb,  // Research agent
  Wrench,     // Maintenance agent
} from 'lucide-react';
```

### UI Actions

```tsx
import {
  Eye,        // View
  Edit,       // Edit
  Trash2,     // Delete
  Plus,       // Add/Create
  Search,     // Search
  Filter,     // Filter
  RefreshCw,  // Refresh
  Settings,   // Settings
  Download,   // Download
  Upload,     // Upload
  Send,       // Send/Submit
} from 'lucide-react';
```

### Status Indicators

```tsx
import {
  CheckCircle,  // Success/Active
  AlertCircle,  // Error/Warning
  Clock,        // Pending/Inactive
  XCircle,      // Failed
  Info,         // Information
} from 'lucide-react';
```

### Navigation

```tsx
import {
  Home,       // Home
  ArrowLeft,  // Back
  ArrowRight, // Forward
  ChevronDown,  // Dropdown
  ChevronUp,    // Collapse
  Menu,       // Menu toggle
  X,          // Close
} from 'lucide-react';
```

---

## Emoji Fallbacks (Optional)

### When to Use
- User preference for emoji over icons
- Lightweight alternative for mobile
- Fun, casual contexts

### Implementation

```tsx
const EMOJI_FALLBACKS = {
  Bot: '🤖',
  Search: '🔍',
  CheckCircle: '✅',
  AlertCircle: '⚠️',
  Settings: '⚙️',
  Home: '🏠',
};

const IconOrEmoji = ({ icon, useEmoji = false }) => {
  if (useEmoji) {
    return <span role="img">{EMOJI_FALLBACKS[icon]}</span>;
  }
  const Icon = ICONS[icon];
  return <Icon className="w-5 h-5" />;
};
```

---

## Troubleshooting

### Issue: Icons not tree-shaking in dev mode

**Symptom:** Slow dev server startup
**Solution:** This is expected Vite behavior. Production builds are optimized.

```bash
# Check production bundle
npm run build
npx vite-bundle-visualizer
```

### Issue: Icon color not changing

**Symptom:** Icon stays default color
**Solution:** Ensure using `className`, not `style`

```tsx
❌ Wrong:
<Bot style={{ color: 'blue' }} />

✅ Correct:
<Bot className="text-blue-500" />
```

### Issue: Icon too small/large

**Symptom:** Icon size doesn't match design
**Solution:** Use standard size classes

```tsx
❌ Wrong:
<Bot style={{ width: 20, height: 20 }} />

✅ Correct:
<Bot className="w-5 h-5" />
```

### Issue: Screen reader announces icon twice

**Symptom:** "Bot icon, Profile button" announced
**Solution:** Add `aria-hidden="true"` to icon

```tsx
❌ Wrong:
<button>
  <Bot className="w-5 h-5" />
  <span>Profile</span>
</button>

✅ Correct:
<button>
  <Bot className="w-5 h-5" aria-hidden="true" />
  <span>Profile</span>
</button>
```

---

## Code Snippets Library

### Agent Card Component

```tsx
import { Bot, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const AgentCard = ({ agent }) => {
  const statusIcon = {
    active: CheckCircle,
    inactive: Clock,
    error: AlertCircle,
  }[agent.status] || Clock;

  const StatusIcon = statusIcon;

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg">
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: agent.avatar_color }}
      >
        <Bot className="w-8 h-8 text-white" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">{agent.name}</h3>
        <div className="flex items-center gap-2 text-sm">
          <StatusIcon className="w-4 h-4" aria-hidden="true" />
          <span>{agent.status}</span>
        </div>
      </div>
    </div>
  );
};
```

### Search Input

```tsx
import { Search } from 'lucide-react';

const SearchInput = ({ value, onChange }) => {
  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Search agents..."
        className="w-full pl-10 pr-4 py-2 border rounded-lg"
        aria-label="Search agents"
      />
    </div>
  );
};
```

### Icon Button

```tsx
import { Eye } from 'lucide-react';

const IconButton = ({ onClick, label, icon: Icon }) => {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </button>
  );
};

// Usage
<IconButton
  icon={Eye}
  label="View agent details"
  onClick={() => navigate(`/agents/${id}`)}
/>
```

### Status Badge

```tsx
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const config = {
    active: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800',
      label: 'Active',
    },
    inactive: {
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800',
      label: 'Inactive',
    },
    error: {
      icon: AlertCircle,
      color: 'bg-red-100 text-red-800',
      label: 'Error',
    },
  }[status] || {
    icon: Clock,
    color: 'bg-gray-100 text-gray-800',
    label: 'Unknown',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span aria-hidden="true">{config.label}</span>
    </span>
  );
};
```

---

## Testing Checklist

### Visual Testing
- [ ] Icons display at correct size
- [ ] Icons use correct colors
- [ ] Icons align properly with text
- [ ] Icons work in dark mode
- [ ] Icons work on mobile/tablet

### Accessibility Testing
- [ ] Decorative icons hidden from screen readers
- [ ] Meaningful icons have labels
- [ ] Icon-only buttons are announced correctly
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA

### Performance Testing
- [ ] Production bundle excludes unused icons
- [ ] Icon chunk loads efficiently
- [ ] No layout shift on icon load
- [ ] Icons render within 100ms

---

## Additional Resources

- **Full Research:** `/workspaces/agent-feed/docs/SVG-ICON-RESEARCH.md`
- **lucide-react Docs:** https://lucide.dev/guide/packages/lucide-react
- **Accessibility Guide:** https://www.a11y-collective.com/blog/svg-accessibility/

---

**Quick Questions?**

1. **Which size for button icons?** → `w-5 h-5` (md)
2. **Which size for list icons?** → `w-4 h-4` (sm)
3. **How to hide from screen readers?** → `aria-hidden="true"`
4. **How to add accessible label?** → `aria-label` on parent button/link
5. **How to change color?** → Use Tailwind `text-*` classes
6. **Why dark mode not working?** → Add `dark:text-*` variant
7. **Icons too large in dev mode?** → Expected; production is optimized
8. **How to add new agent icon?** → Add to `AGENT_ICONS` in constants

---

**Last Updated:** 2025-10-19
**Maintained by:** Development Team
