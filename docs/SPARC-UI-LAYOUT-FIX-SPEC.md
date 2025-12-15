# SPARC Specification: UI Layout Fix - Two-Panel Agent Manager with Tier Filtering

**Project:** Agent Feed
**Component:** Agent Manager UI
**Status:** Specification Phase
**Date:** 2025-01-19
**Author:** SPARC Specification Agent

---

## 1. Executive Summary

### 1.1 Problem Statement

The user had a working **two-panel layout** (left sidebar navigation + right detail panel) in `IsolatedRealAgentManager`. During implementation, the component was swapped to `AgentManager`, which uses a **grid card layout**, breaking the intended UI structure.

### 1.2 Solution Overview

Restore the two-panel layout by reverting `App.tsx` to use `IsolatedRealAgentManager`, then enhance it with:
- **Tier filtering** (T1, T2, All toggle buttons)
- **Agent tier badges** (T1 blue, T2 gray)
- **Agent icons** (SVG → Emoji → Initials fallback)
- **Protection badges** for system agents
- **localStorage persistence** for filter preferences
- **API integration** with tier filtering endpoint

---

## 2. Functional Requirements

### FR-001: Two-Panel Layout Restoration
**Priority:** CRITICAL
**Description:** Restore the master-detail layout with left sidebar and right detail panel.

**Acceptance Criteria:**
- ✅ Left panel displays scrollable agent list (width: 320px, fixed)
- ✅ Right panel displays selected agent details (flexible width)
- ✅ Panels separated by vertical border
- ✅ Both panels support dark mode theming
- ✅ Layout maintains structure on window resize
- ✅ Selected agent highlighted in sidebar
- ✅ URL updates with agent slug on selection

**Test Cases:**
```typescript
// Test: Layout structure exists
expect(screen.getByTestId('isolated-agent-manager')).toBeInTheDocument();
expect(screen.getByTestId('agent-list-sidebar')).toBeInTheDocument();

// Test: Sidebar has correct width
const sidebar = screen.getByTestId('agent-list-sidebar');
expect(sidebar).toHaveClass('w-80'); // 320px
```

---

### FR-002: Tier Filtering Toggle
**Priority:** HIGH
**Description:** Add three-way toggle for filtering agents by tier level.

**Acceptance Criteria:**
- ✅ Three buttons displayed: "Tier 1 (9)", "Tier 2 (10)", "All (19)"
- ✅ Active button visually distinct (colored background)
- ✅ Inactive buttons have hover states
- ✅ Clicking button filters agent list immediately
- ✅ Filter preference persists in localStorage
- ✅ Loading state disables all buttons
- ✅ Agent counts update dynamically
- ✅ Keyboard accessible (Tab, Enter, Space)

**API Integration:**
```typescript
// Endpoint: /api/v1/claude-live/prod/agents?tier={tier}
// tier values: "1", "2", "all"

GET /api/v1/claude-live/prod/agents?tier=1
Response: { success: true, agents: [...], totalAgents: 9 }

GET /api/v1/claude-live/prod/agents?tier=2
Response: { success: true, agents: [...], totalAgents: 10 }

GET /api/v1/claude-live/prod/agents?tier=all
Response: { success: true, agents: [...], totalAgents: 19 }
```

**Test Cases:**
```typescript
// Test: Tier toggle displays with correct counts
const toggle = screen.getByRole('group', { name: 'Agent tier filter' });
expect(within(toggle).getByText(/Tier 1/)).toBeInTheDocument();
expect(within(toggle).getByText(/\(9\)/)).toBeInTheDocument();

// Test: Clicking T1 filters to 9 agents
fireEvent.click(screen.getByRole('button', { name: /Tier 1/ }));
await waitFor(() => {
  expect(screen.getAllByTestId('agent-list-item')).toHaveLength(9);
});

// Test: Filter persists after reload
localStorage.setItem('agentTierFilter', '2');
rerender(<IsolatedRealAgentManager />);
expect(screen.getByRole('button', { name: /Tier 2/, pressed: true }));
```

---

### FR-003: Agent Icon Display System
**Priority:** HIGH
**Description:** Display agent icons with three-level fallback system.

**Acceptance Criteria:**
- ✅ Level 1: SVG icon from lucide-react (if `icon_type === 'svg'`)
- ✅ Level 2: Emoji fallback (if `icon_emoji` exists)
- ✅ Level 3: Initials fallback (generated from agent name)
- ✅ Icons support multiple sizes: xs, sm, md, lg, xl, 2xl
- ✅ Tier-based color coding (T1: blue, T2: gray)
- ✅ Accessibility: aria-label with agent name

**Initials Generation Rules:**
```typescript
// Examples:
"personal-todos-agent" → "PT" (Personal Todos)
"meta-agent" → "ME" (Meta)
"test-agent" → "TE" (Test)
"AVI Orchestrator" → "AO" (AVI Orchestrator)
"Single" → "SI" (First 2 letters)
"" → "A" (Default fallback)
```

**Test Cases:**
```typescript
// Test: SVG icon renders when icon_type='svg'
const agent = { name: 'test', icon: 'Bot', icon_type: 'svg' };
render(<AgentIcon agent={agent} />);
expect(screen.getByRole('img', { name: 'test' })).toBeInTheDocument();

// Test: Emoji renders when no SVG
const agent = { name: 'test', icon_emoji: '🤖' };
render(<AgentIcon agent={agent} />);
expect(screen.getByText('🤖')).toBeInTheDocument();

// Test: Initials render as last fallback
const agent = { name: 'test-agent' };
render(<AgentIcon agent={agent} />);
expect(screen.getByText('TE')).toBeInTheDocument();
```

---

### FR-004: Agent Tier Badges
**Priority:** MEDIUM
**Description:** Display tier badges on agent cards and detail views.

**Acceptance Criteria:**
- ✅ T1 badge: Blue background (#3B82F6), white text, "T1" label
- ✅ T2 badge: Gray background (#6B7280), white text, "T2" label
- ✅ Three variants: default, compact, icon-only
- ✅ Badges display in agent list items
- ✅ Badges display in agent detail header
- ✅ Accessibility: aria-label with full tier description

**Badge Variants:**
```typescript
// Compact: "T1" or "T2" only
<AgentTierBadge tier={1} variant="compact" />

// Default: "T1 - User-facing"
<AgentTierBadge tier={1} />

// Icon-only: Circular badge with number
<AgentTierBadge tier={1} variant="icon-only" />
```

**Test Cases:**
```typescript
// Test: T1 badge has blue styling
render(<AgentTierBadge tier={1} />);
const badge = screen.getByLabelText(/Tier 1/);
expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');

// Test: Compact variant shows short label
render(<AgentTierBadge tier={2} variant="compact" />);
expect(screen.getByText('T2')).toBeInTheDocument();
```

---

### FR-005: Protection Badge Display
**Priority:** MEDIUM
**Description:** Display protection badges for system-critical agents.

**Acceptance Criteria:**
- ✅ Badge shows lock icon + "Protected" text
- ✅ Red color scheme (bg-red-100, text-red-800, border-red-300)
- ✅ Tooltip displays protection reason on hover/focus
- ✅ Only shown when `agent.visibility === 'protected'`
- ✅ Prevents bulk selection of protected agents
- ✅ Disables edit/delete buttons for protected agents
- ✅ Keyboard accessible (Tab, hover, focus)

**Protection Rules:**
```typescript
// Protected agents:
// - All agents in .system directory
// - meta-agent, meta-update-agent
// - Phase 4.2 specialist agents (tier 2)
// - Any agent with visibility: 'protected'
```

**Test Cases:**
```typescript
// Test: Protected badge renders for protected agent
const agent = { visibility: 'protected', name: 'meta-agent' };
render(<ProtectionBadge isProtected={true} protectionReason="System agent" />);
expect(screen.getByText('Protected')).toBeInTheDocument();

// Test: Tooltip shows on hover
const badge = screen.getByText('Protected');
fireEvent.mouseEnter(badge);
await waitFor(() => {
  expect(screen.getByRole('tooltip')).toHaveTextContent('System agent');
});

// Test: Edit button disabled for protected agent
const editBtn = screen.getByTitle('Edit');
expect(editBtn).toBeDisabled();
```

---

### FR-006: localStorage Filter Persistence
**Priority:** MEDIUM
**Description:** Persist tier filter preference across sessions.

**Acceptance Criteria:**
- ✅ Store current tier in localStorage key: `agentTierFilter`
- ✅ Load saved tier on component mount
- ✅ Default to "1" (Tier 1) if no saved preference
- ✅ Update localStorage immediately on tier change
- ✅ Handle localStorage errors gracefully (console.warn)
- ✅ Validate stored values ("1", "2", "all" only)

**Storage Format:**
```typescript
// localStorage key: agentTierFilter
// Value: "1" | "2" | "all"

localStorage.setItem('agentTierFilter', '1'); // Tier 1
localStorage.setItem('agentTierFilter', '2'); // Tier 2
localStorage.setItem('agentTierFilter', 'all'); // All tiers
```

**Test Cases:**
```typescript
// Test: Default to T1 when no localStorage
localStorage.clear();
render(<IsolatedRealAgentManager />);
expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Tier 1');

// Test: Load saved preference
localStorage.setItem('agentTierFilter', '2');
render(<IsolatedRealAgentManager />);
expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Tier 2');

// Test: Persist selection
fireEvent.click(screen.getByText('All'));
expect(localStorage.getItem('agentTierFilter')).toBe('all');
```

---

### FR-007: Dark Mode Support
**Priority:** HIGH
**Description:** All components must support dark mode theming.

**Acceptance Criteria:**
- ✅ Sidebar: `dark:bg-gray-900`, `dark:border-gray-700`
- ✅ Detail panel: `dark:bg-gray-900`
- ✅ Text: `dark:text-gray-100` (headings), `dark:text-gray-400` (body)
- ✅ Borders: `dark:border-gray-700`
- ✅ Hover states: `dark:hover:bg-gray-800`
- ✅ Selected state: `dark:bg-blue-900/30`
- ✅ No visual artifacts in dark mode
- ✅ Consistent color contrast (WCAG AA)

**Test Cases:**
```typescript
// Test: Dark mode classes applied
document.documentElement.classList.add('dark');
render(<IsolatedRealAgentManager />);
const sidebar = screen.getByTestId('agent-list-sidebar');
expect(sidebar).toHaveClass('dark:bg-gray-900', 'dark:border-gray-700');
```

---

## 3. Non-Functional Requirements

### NFR-001: Performance
**Target:** Sub-200ms render time for 20 agents

**Metrics:**
- Initial load: < 1 second
- Tier filter switch: < 200ms
- Agent selection: < 100ms (instant)
- API response time: < 500ms (p95)

**Optimization Strategies:**
- Memoize agent list items (`React.memo`)
- Debounce search input (300ms)
- Virtual scrolling for 100+ agents
- Lazy load agent details on selection

---

### NFR-002: Accessibility (WCAG 2.1 AA)

**Requirements:**
- ✅ All interactive elements keyboard accessible
- ✅ ARIA labels on all buttons/controls
- ✅ Focus indicators visible (2px blue outline)
- ✅ Color contrast ratio ≥ 4.5:1
- ✅ Screen reader announcements for filter changes
- ✅ Semantic HTML structure
- ✅ Skip links for navigation

**Test Cases:**
```typescript
// Test: Keyboard navigation works
const toggle = screen.getByRole('group', { name: 'Agent tier filter' });
const buttons = within(toggle).getAllByRole('button');
buttons[0].focus();
fireEvent.keyDown(buttons[0], { key: 'Tab' });
expect(buttons[1]).toHaveFocus();

// Test: Screen reader support
const badge = screen.getByRole('status', { name: /Protected agent/ });
expect(badge).toBeInTheDocument();
```

---

### NFR-003: Browser Compatibility

**Supported Browsers:**
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Features:**
- localStorage API
- CSS Grid/Flexbox
- ES6+ JavaScript
- Fetch API

---

### NFR-004: Responsive Design

**Breakpoints:**
- Desktop: 1024px+ (two-panel layout)
- Tablet: 768px-1023px (collapsible sidebar)
- Mobile: < 768px (stacked layout, hamburger menu)

**Note:** Initial implementation focuses on desktop. Mobile optimization deferred to Phase 2.

---

## 4. Component Architecture

### 4.1 Component Hierarchy

```
App.tsx
└─ Layout
   └─ Routes
      └─ /agents → IsolatedRealAgentManager (RESTORED)
         ├─ AgentListSidebar (LEFT PANEL)
         │  ├─ Search Input
         │  ├─ AgentTierToggle (NEW)
         │  └─ AgentListItem[]
         │     ├─ AgentIcon (NEW)
         │     ├─ AgentTierBadge (NEW)
         │     └─ ProtectionBadge (NEW)
         └─ Detail Panel (RIGHT PANEL)
            └─ WorkingAgentProfile
```

### 4.2 Data Flow

```
User clicks "Tier 1" button
    ↓
AgentTierToggle.onTierChange('1')
    ↓
useAgentTierFilter.setCurrentTier('1')
    ↓
localStorage.setItem('agentTierFilter', '1')
    ↓
useEffect detects tier change
    ↓
loadAgents() calls API: /api/v1/claude-live/prod/agents?tier=1
    ↓
API returns 9 T1 agents
    ↓
setAgents(transformedAgents)
    ↓
AgentListSidebar re-renders with 9 items
    ↓
AgentTierToggle displays "Tier 1 (9)" as active
```

### 4.3 State Management

```typescript
// IsolatedRealAgentManager.tsx
const [agents, setAgents] = useState<Agent[]>([]); // Filtered agents from API
const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
const [searchTerm, setSearchTerm] = useState(''); // Client-side search
const { currentTier, setCurrentTier } = useAgentTierFilter(); // localStorage-backed

// useAgentTierFilter.ts
const [currentTier, setCurrentTier] = useState<'1' | '2' | 'all'>('1'); // Default T1
```

### 4.4 Component Modifications

#### **File:** `/workspaces/agent-feed/frontend/src/App.tsx`

**Change:**
```diff
- <AgentManager key="agents-manager" />
+ <IsolatedRealAgentManager key="isolated-agents-manager" />
```

**Rationale:** Restore two-panel layout by using the correct component.

---

#### **File:** `/workspaces/agent-feed/frontend/src/components/IsolatedRealAgentManager.tsx`

**Changes:**
1. Add `useAgentTierFilter` hook import
2. Add `AgentTierToggle` component to sidebar
3. Update `loadAgents()` to include tier parameter
4. Calculate tier counts from agents array
5. Pass tier counts to toggle component

**Pseudocode:**
```typescript
// 1. Import tier filtering hook
import { useAgentTierFilter } from '@/hooks/useAgentTierFilter';
import { AgentTierToggle } from '@/components/agents/AgentTierToggle';

// 2. Add hook to component
const { currentTier, setCurrentTier } = useAgentTierFilter();

// 3. Update loadAgents to include tier parameter
const loadAgents = useCallback(async () => {
  const url = `/api/v1/claude-live/prod/agents?tier=${currentTier}`;
  const response = await apiService.getAgents(url);
  // ... existing logic
}, [currentTier, apiService]);

// 4. Calculate tier counts
const tierCounts = {
  tier1: agents.filter(a => a.tier === 1).length,
  tier2: agents.filter(a => a.tier === 2).length,
  total: agents.length
};

// 5. Add toggle to AgentListSidebar props
<AgentListSidebar
  agents={agents}
  selectedAgentId={selectedAgentId}
  onSelectAgent={handleSelectAgent}
  searchTerm={searchTerm}
  onSearchChange={setSearchTerm}
  tierFilter={currentTier}
  onTierChange={setCurrentTier}
  tierCounts={tierCounts}
  loading={loading}
/>
```

---

#### **File:** `/workspaces/agent-feed/frontend/src/components/AgentListSidebar.tsx`

**Changes:**
1. Add tier filter props
2. Add `AgentTierToggle` component below search
3. Update agent list items to show badges and icons

**Pseudocode:**
```typescript
// 1. Update props interface
interface AgentListSidebarProps {
  // ... existing props
  tierFilter?: '1' | '2' | 'all';
  onTierChange?: (tier: '1' | '2' | 'all') => void;
  tierCounts?: { tier1: number; tier2: number; total: number };
}

// 2. Add toggle component
<div className="sticky top-0 z-10 bg-white dark:bg-gray-900">
  <Search input... />

  {/* NEW: Tier Toggle */}
  {tierFilter && onTierChange && tierCounts && (
    <div className="mt-3 px-4">
      <AgentTierToggle
        currentTier={tierFilter}
        onTierChange={onTierChange}
        tierCounts={tierCounts}
        loading={loading}
      />
    </div>
  )}
</div>

// 3. Update AgentListItem to show badges
<AgentListItem>
  <AgentIcon agent={agent} size="md" />
  <div>
    <h3>{agent.name}</h3>
    <div className="flex gap-2">
      <AgentTierBadge tier={agent.tier} variant="compact" />
      {agent.visibility === 'protected' && (
        <ProtectionBadge isProtected={true} />
      )}
    </div>
  </div>
</AgentListItem>
```

---

## 5. API Integration Points

### 5.1 Agent List Endpoint

**Endpoint:** `GET /api/v1/claude-live/prod/agents`

**Query Parameters:**
```typescript
tier?: '1' | '2' | 'all' // Filter by tier (default: 'all')
```

**Response Format:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "agent-001",
      "name": "personal-todos-agent",
      "display_name": "Personal Todos",
      "description": "Manages personal tasks and todos",
      "slug": "personal-todos-agent",
      "status": "active",
      "tier": 1,
      "visibility": "public",
      "icon": "CheckSquare",
      "icon_type": "svg",
      "icon_emoji": "✅",
      "avatar_color": "#3B82F6",
      "posts_as_self": true,
      "show_in_default_feed": true
    }
  ],
  "totalAgents": 9,
  "tier": "1"
}
```

**Error Handling:**
```typescript
// 404: Endpoint not found
{ "success": false, "error": "Endpoint not found" }

// 500: Server error
{ "success": false, "error": "Internal server error" }

// Network error
catch (err) {
  setError('Error connecting to agent API');
  console.error('Failed to load agents:', err);
}
```

---

## 6. Test Criteria

### 6.1 Unit Tests

**File:** `/workspaces/agent-feed/frontend/src/tests/unit/IsolatedRealAgentManager.test.tsx`

```typescript
describe('IsolatedRealAgentManager', () => {
  test('renders two-panel layout', () => {
    render(<IsolatedRealAgentManager />);
    expect(screen.getByTestId('isolated-agent-manager')).toBeInTheDocument();
    expect(screen.getByTestId('agent-list-sidebar')).toBeInTheDocument();
  });

  test('displays tier toggle with correct counts', async () => {
    render(<IsolatedRealAgentManager />);
    await waitFor(() => {
      const toggle = screen.getByRole('group', { name: 'Agent tier filter' });
      expect(within(toggle).getByText(/Tier 1/)).toBeInTheDocument();
      expect(within(toggle).getByText(/\(9\)/)).toBeInTheDocument();
    });
  });

  test('filters agents when tier button clicked', async () => {
    render(<IsolatedRealAgentManager />);

    // Click Tier 2 button
    fireEvent.click(screen.getByRole('button', { name: /Tier 2/ }));

    // Wait for API call and re-render
    await waitFor(() => {
      expect(screen.getAllByTestId('agent-list-item')).toHaveLength(10);
    });
  });

  test('persists tier filter in localStorage', () => {
    render(<IsolatedRealAgentManager />);

    fireEvent.click(screen.getByText(/Tier 2/));
    expect(localStorage.getItem('agentTierFilter')).toBe('2');
  });
});
```

### 6.2 Integration Tests

**File:** `/workspaces/agent-feed/tests/e2e/ui-layout-validation.spec.ts`

```typescript
test('two-panel layout visible and functional', async ({ page }) => {
  await page.goto('/agents');

  // Verify layout structure
  const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
  const detailPanel = page.locator('[data-testid="agent-detail-panel"]');

  await expect(sidebar).toBeVisible();
  await expect(detailPanel).toBeVisible();

  // Verify sidebar width
  const sidebarWidth = await sidebar.evaluate(el => el.offsetWidth);
  expect(sidebarWidth).toBe(320);
});

test('tier filtering works end-to-end', async ({ page }) => {
  await page.goto('/agents');

  // Wait for agents to load
  await page.waitForSelector('[data-testid="agent-list-item"]');

  // Count initial agents (should default to T1)
  const initialCount = await page.locator('[data-testid="agent-list-item"]').count();
  expect(initialCount).toBe(9);

  // Click Tier 2 button
  await page.click('button:has-text("Tier 2")');

  // Verify agent count updates
  await page.waitForTimeout(500); // Wait for API + render
  const tier2Count = await page.locator('[data-testid="agent-list-item"]').count();
  expect(tier2Count).toBe(10);

  // Verify localStorage updated
  const storedTier = await page.evaluate(() => localStorage.getItem('agentTierFilter'));
  expect(storedTier).toBe('2');
});

test('dark mode theming works', async ({ page }) => {
  await page.goto('/agents');

  // Enable dark mode
  await page.evaluate(() => document.documentElement.classList.add('dark'));

  // Verify dark mode classes applied
  const sidebar = page.locator('[data-testid="agent-list-sidebar"]');
  const classes = await sidebar.getAttribute('class');
  expect(classes).toContain('dark:bg-gray-900');
  expect(classes).toContain('dark:border-gray-700');
});

test('agent icons display with fallback', async ({ page }) => {
  await page.goto('/agents');

  // Wait for first agent to render
  await page.waitForSelector('[data-testid="agent-list-item"]');

  // Check icon rendered (SVG, emoji, or initials)
  const icon = page.locator('[data-testid="agent-list-item"]').first().locator('[role="img"]');
  await expect(icon).toBeVisible();
});

test('protection badges show for system agents', async ({ page }) => {
  await page.goto('/agents');

  // Click Tier 2 to see system agents
  await page.click('button:has-text("Tier 2")');

  // Verify protection badge present
  const protectedBadge = page.locator('text="Protected"').first();
  await expect(protectedBadge).toBeVisible();

  // Hover to show tooltip
  await protectedBadge.hover();
  await page.waitForTimeout(200); // Tooltip delay
  const tooltip = page.locator('[role="tooltip"]');
  await expect(tooltip).toBeVisible();
});
```

### 6.3 Visual Regression Tests

**File:** `/workspaces/agent-feed/tests/e2e/visual-regression-ui-layout.spec.ts`

```typescript
test('two-panel layout screenshot - tier 1', async ({ page }) => {
  await page.goto('/agents');
  await page.waitForSelector('[data-testid="agent-list-item"]');

  await expect(page).toHaveScreenshot('two-panel-tier1.png', {
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 720 }
  });
});

test('two-panel layout screenshot - tier 2', async ({ page }) => {
  await page.goto('/agents');
  await page.click('button:has-text("Tier 2")');
  await page.waitForSelector('[data-testid="agent-list-item"]');

  await expect(page).toHaveScreenshot('two-panel-tier2.png', {
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 720 }
  });
});

test('dark mode screenshot', async ({ page }) => {
  await page.goto('/agents');
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForSelector('[data-testid="agent-list-item"]');

  await expect(page).toHaveScreenshot('two-panel-dark-mode.png', {
    fullPage: false,
    clip: { x: 0, y: 0, width: 1280, height: 720 }
  });
});
```

---

## 7. Edge Cases

### 7.1 Empty Agent List

**Scenario:** API returns 0 agents for selected tier

**Expected Behavior:**
- Display empty state message: "No Tier X agents found"
- Show illustration (Bot icon)
- Tier toggle remains functional
- No console errors

**Test:**
```typescript
test('handles empty tier gracefully', async () => {
  // Mock API to return empty array
  server.use(
    rest.get('/api/v1/claude-live/prod/agents', (req, res, ctx) => {
      return res(ctx.json({ success: true, agents: [], totalAgents: 0 }));
    })
  );

  render(<IsolatedRealAgentManager />);

  await waitFor(() => {
    expect(screen.getByText(/No agents found/)).toBeInTheDocument();
  });
});
```

---

### 7.2 API Timeout/Network Error

**Scenario:** API request fails or times out

**Expected Behavior:**
- Show error banner: "Error connecting to agent API"
- Display retry button
- Keep previous agent list visible (if any)
- Log error to console

**Test:**
```typescript
test('handles API error gracefully', async () => {
  server.use(
    rest.get('/api/v1/claude-live/prod/agents', (req, res, ctx) => {
      return res.networkError('Failed to connect');
    })
  );

  render(<IsolatedRealAgentManager />);

  await waitFor(() => {
    expect(screen.getByText(/Error connecting to agent API/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
```

---

### 7.3 localStorage Unavailable

**Scenario:** Browser blocks localStorage (privacy mode, quota exceeded)

**Expected Behavior:**
- Default to Tier 1 filter
- Log warning to console
- App remains functional
- No crashes or infinite loops

**Test:**
```typescript
test('handles localStorage failure gracefully', () => {
  // Mock localStorage to throw error
  const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('QuotaExceededError');
  });

  render(<IsolatedRealAgentManager />);

  // Should default to Tier 1
  expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Tier 1');

  // Should log warning
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('Failed to save tier filter')
  );

  setItemSpy.mockRestore();
});
```

---

### 7.4 Invalid Agent Data

**Scenario:** API returns agent without required fields

**Expected Behavior:**
- Use fallback values for missing fields
- Display agent in list (no crash)
- Log warning for invalid data
- Show "Unknown Agent" if name missing

**Fallback Values:**
```typescript
{
  tier: 1, // Default to user-facing
  visibility: 'public', // Default to public
  icon_type: 'emoji', // Prefer emoji fallback
  icon_emoji: '🤖', // Bot emoji
  avatar_color: '#6B7280', // Gray
  status: 'inactive' // Assume inactive if unspecified
}
```

**Test:**
```typescript
test('handles invalid agent data', () => {
  const invalidAgent = { id: '123' }; // Missing name, tier, etc.

  render(<AgentListItem agent={invalidAgent} />);

  expect(screen.getByText('Unknown Agent')).toBeInTheDocument();
  expect(screen.getByText('🤖')).toBeInTheDocument(); // Fallback emoji
});
```

---

### 7.5 Route Navigation Conflicts

**Scenario:** User navigates to `/agents` then `/agents/:agentSlug`

**Expected Behavior:**
- Sidebar remains visible on both routes
- Selected agent updates when slug changes
- URL updates without page reload
- Tier filter persists across navigation

**Test:**
```typescript
test('handles route navigation correctly', async () => {
  render(<IsolatedRealAgentManager />);

  // Wait for agents to load
  await waitFor(() => {
    expect(screen.getAllByTestId('agent-list-item')).toHaveLength(9);
  });

  // Click an agent
  fireEvent.click(screen.getByText('Personal Todos'));

  // Verify URL updated
  expect(window.location.pathname).toBe('/agents/personal-todos-agent');

  // Verify sidebar still visible
  expect(screen.getByTestId('agent-list-sidebar')).toBeInTheDocument();
});
```

---

### 7.6 Concurrent Tier Changes

**Scenario:** User rapidly clicks tier buttons

**Expected Behavior:**
- Debounce API calls (last click wins)
- Show loading state during transition
- Cancel in-flight requests
- No race conditions

**Test:**
```typescript
test('handles rapid tier changes', async () => {
  render(<IsolatedRealAgentManager />);

  // Rapidly click tier buttons
  fireEvent.click(screen.getByText('Tier 2'));
  fireEvent.click(screen.getByText('All'));
  fireEvent.click(screen.getByText('Tier 1'));

  // Wait for final state
  await waitFor(() => {
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Tier 1');
    expect(screen.getAllByTestId('agent-list-item')).toHaveLength(9);
  });
});
```

---

## 8. Implementation Phases

### Phase 1: Layout Restoration (Priority: CRITICAL)
**Duration:** 30 minutes
**Tasks:**
1. ✅ Revert `App.tsx` to use `IsolatedRealAgentManager`
2. ✅ Verify two-panel layout renders
3. ✅ Test dark mode classes intact
4. ✅ Run smoke tests (no console errors)

**Validation:**
```bash
npm run dev
# Navigate to /agents
# Verify sidebar + detail panel visible
```

---

### Phase 2: Tier Filtering Integration (Priority: HIGH)
**Duration:** 1-2 hours
**Tasks:**
1. ✅ Add `useAgentTierFilter` hook to `IsolatedRealAgentManager`
2. ✅ Update `loadAgents()` to include tier parameter
3. ✅ Calculate tier counts from agent data
4. ✅ Add `AgentTierToggle` to `AgentListSidebar`
5. ✅ Test localStorage persistence
6. ✅ Test API integration with tier parameter

**Validation:**
```bash
npm run test:unit -- IsolatedRealAgentManager
npm run test:e2e -- ui-layout-validation
```

---

### Phase 3: Visual Components (Priority: HIGH)
**Duration:** 1 hour
**Tasks:**
1. ✅ Add `AgentIcon` to agent list items
2. ✅ Add `AgentTierBadge` to agent list items
3. ✅ Add `ProtectionBadge` for protected agents
4. ✅ Test icon fallback system (SVG → Emoji → Initials)
5. ✅ Test badge variants (compact, default, icon-only)

**Validation:**
```bash
npm run test:unit -- AgentIcon AgentTierBadge ProtectionBadge
```

---

### Phase 4: Testing & Polish (Priority: MEDIUM)
**Duration:** 2 hours
**Tasks:**
1. ✅ Write unit tests for new features
2. ✅ Write E2E tests for tier filtering
3. ✅ Test edge cases (empty list, API errors, etc.)
4. ✅ Visual regression testing
5. ✅ Accessibility audit (keyboard nav, ARIA)
6. ✅ Performance testing (render time < 200ms)

**Validation:**
```bash
npm run test:all
npm run test:a11y
npm run lighthouse -- /agents
```

---

## 9. Success Criteria Checklist

### 9.1 Functional Validation

- [ ] Two-panel layout visible (left sidebar + right detail panel)
- [ ] Dark mode works (all `dark:` classes render correctly)
- [ ] Tier toggle displays with correct counts (T1: 9, T2: 10, All: 19)
- [ ] Clicking T1 filters to 9 agents
- [ ] Clicking T2 filters to 10 agents
- [ ] Clicking All shows 19 agents
- [ ] localStorage persists tier preference
- [ ] Agent icons display (SVG/Emoji/Initials)
- [ ] Tier badges show (T1 blue, T2 gray)
- [ ] Protection badges show for system agents
- [ ] No console errors or warnings
- [ ] Both AVI Orchestrator and tier filtering work together

### 9.2 Technical Validation

- [ ] Unit tests pass (100% coverage for new components)
- [ ] Integration tests pass (E2E tier filtering)
- [ ] Visual regression tests pass (no unexpected changes)
- [ ] Accessibility tests pass (WCAG 2.1 AA)
- [ ] Performance tests pass (render < 200ms)
- [ ] API integration tests pass (tier parameter)
- [ ] localStorage tests pass (persistence + error handling)

### 9.3 User Experience Validation

- [ ] Layout responsive and intuitive
- [ ] Tier filtering feels instant (< 200ms)
- [ ] Agent selection smooth (< 100ms)
- [ ] Dark mode theme consistent
- [ ] Icons clear and recognizable
- [ ] Badges informative and unobtrusive
- [ ] Protection badges explain restrictions
- [ ] Error states friendly and actionable

---

## 10. Dependencies

### 10.1 Existing Components (No Changes)

- ✅ `useAgentTierFilter` hook (already implemented)
- ✅ `AgentTierToggle` component (already implemented)
- ✅ `AgentTierBadge` component (already implemented)
- ✅ `AgentIcon` component (already implemented)
- ✅ `ProtectionBadge` component (already implemented)
- ✅ `WorkingAgentProfile` component (already implemented)

### 10.2 Modified Components

- 🔧 `App.tsx` (revert to `IsolatedRealAgentManager`)
- 🔧 `IsolatedRealAgentManager.tsx` (add tier filtering)
- 🔧 `AgentListSidebar.tsx` (add tier toggle + badges)

### 10.3 API Dependencies

- 🌐 `GET /api/v1/claude-live/prod/agents?tier={tier}` (already implemented)
- 🌐 Backend tier filtering logic (already implemented)
- 🌐 Agent metadata with tier/visibility fields (already implemented)

---

## 11. Rollback Plan

### 11.1 Rollback Triggers

- Critical bug preventing agent loading
- Console errors crashing the app
- API integration failure
- Layout broken in production
- Accessibility violations

### 11.2 Rollback Steps

```bash
# 1. Revert App.tsx change
git checkout HEAD~1 -- frontend/src/App.tsx

# 2. Revert IsolatedRealAgentManager changes
git checkout HEAD~1 -- frontend/src/components/IsolatedRealAgentManager.tsx

# 3. Revert AgentListSidebar changes
git checkout HEAD~1 -- frontend/src/components/AgentListSidebar.tsx

# 4. Rebuild
npm run build

# 5. Verify rollback
npm run dev
# Navigate to /agents
# Verify old layout (grid cards) works
```

### 11.3 Communication Plan

- Update team in Slack: "UI layout fix rolled back due to [reason]"
- Document issue in GitHub: "Rollback: UI layout fix - [issue details]"
- Schedule post-mortem meeting
- Re-plan implementation with fixes

---

## 12. Monitoring & Metrics

### 12.1 Performance Metrics

```typescript
// Add performance logging
console.time('IsolatedRealAgentManager:mount');
// ... component logic
console.timeEnd('IsolatedRealAgentManager:mount');

console.time('tierFilter:switch');
// ... tier switch logic
console.timeEnd('tierFilter:switch');
```

**Target Metrics:**
- Component mount: < 500ms
- Tier filter switch: < 200ms
- Agent selection: < 100ms
- API response: < 500ms (p95)

### 12.2 Error Monitoring

```typescript
// Track API errors
if (error) {
  analytics.track('agentManager:apiError', {
    error: error.message,
    tier: currentTier,
    timestamp: Date.now()
  });
}

// Track localStorage errors
if (localStorageError) {
  analytics.track('agentManager:localStorageError', {
    error: localStorageError.message,
    timestamp: Date.now()
  });
}
```

### 12.3 Usage Analytics

```typescript
// Track tier filter usage
analytics.track('agentManager:tierFilterChange', {
  from: previousTier,
  to: currentTier,
  timestamp: Date.now()
});

// Track agent selections
analytics.track('agentManager:agentSelected', {
  agentId: agent.id,
  tier: agent.tier,
  timestamp: Date.now()
});
```

---

## 13. Documentation Updates

### 13.1 User Documentation

**File:** `/workspaces/agent-feed/docs/USER-GUIDE.md`

Add section:
```markdown
## Filtering Agents by Tier

The Agent Manager supports filtering agents by tier level:

- **Tier 1 (User-facing):** Agents that post to the public feed
- **Tier 2 (System):** Backend agents for infrastructure tasks
- **All:** View all agents regardless of tier

To filter:
1. Click the tier button in the sidebar (Tier 1, Tier 2, or All)
2. The agent list updates immediately
3. Your preference is saved for future sessions
```

### 13.2 Developer Documentation

**File:** `/workspaces/agent-feed/docs/DEVELOPER-GUIDE.md`

Add section:
```markdown
## Agent Tier System Implementation

### Architecture

The tier filtering system consists of:
- `useAgentTierFilter` hook for localStorage-backed state
- `AgentTierToggle` component for UI controls
- API endpoint `/api/v1/claude-live/prod/agents?tier={tier}`
- `IsolatedRealAgentManager` orchestrating the flow

### Adding a New Tier

1. Update `TierFilter` type in `useAgentTierFilter.ts`
2. Add button to `AgentTierToggle.tsx`
3. Update API tier validation
4. Add tests for new tier

### Testing

```bash
# Unit tests
npm run test:unit -- useAgentTierFilter AgentTierToggle

# E2E tests
npm run test:e2e -- ui-layout-validation

# Visual regression
npm run test:visual -- two-panel-layout
```
```

---

## 14. Appendix

### 14.1 Type Definitions

```typescript
// Agent type with tier system fields
interface Agent {
  id: string;
  name: string;
  display_name: string;
  description: string;
  slug: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';

  // Tier system
  tier: 1 | 2;
  visibility: 'public' | 'protected';
  icon?: string;
  icon_type?: 'svg' | 'emoji';
  icon_emoji?: string;
  avatar_color: string;
  posts_as_self: boolean;
  show_in_default_feed: boolean;
}

// Tier filter type
type TierFilter = '1' | '2' | 'all';

// Tier counts
interface TierCounts {
  tier1: number;
  tier2: number;
  total: number;
}
```

### 14.2 CSS Classes Reference

```css
/* Two-panel layout */
.w-80 { width: 320px; } /* Sidebar width */
.flex-shrink-0 { flex-shrink: 0; } /* Fixed sidebar */
.flex-1 { flex: 1 1 0%; } /* Flexible detail panel */

/* Dark mode */
.dark\:bg-gray-900 { background-color: #111827; }
.dark\:border-gray-700 { border-color: #374151; }
.dark\:text-gray-100 { color: #f3f4f6; }

/* Tier badges */
.bg-blue-100 { background-color: #dbeafe; }
.text-blue-800 { color: #1e40af; }
.bg-gray-100 { background-color: #f3f4f6; }
.text-gray-800 { color: #1f2937; }
```

### 14.3 API Response Examples

**Tier 1 Agents:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "agent-001",
      "name": "personal-todos-agent",
      "tier": 1,
      "visibility": "public",
      "icon": "CheckSquare",
      "icon_type": "svg",
      "icon_emoji": "✅"
    }
  ],
  "totalAgents": 9,
  "tier": "1"
}
```

**Tier 2 Agents:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "agent-010",
      "name": "meta-agent",
      "tier": 2,
      "visibility": "protected",
      "icon": "Brain",
      "icon_type": "svg",
      "icon_emoji": "🧠"
    }
  ],
  "totalAgents": 10,
  "tier": "2"
}
```

---

## 15. Glossary

| Term | Definition |
|------|------------|
| **Two-Panel Layout** | UI pattern with fixed sidebar (left) and flexible content area (right) |
| **Tier 1** | User-facing agents that post to the public feed |
| **Tier 2** | System agents for backend/infrastructure tasks |
| **Master-Detail** | UI pattern where sidebar shows list, detail panel shows selected item |
| **localStorage** | Browser API for persistent client-side storage |
| **Dark Mode** | UI theme with dark backgrounds and light text |
| **Fallback System** | Progressive enhancement with multiple backup options |
| **ARIA** | Accessible Rich Internet Applications (screen reader support) |
| **WCAG** | Web Content Accessibility Guidelines |
| **Visual Regression** | Testing UI for unintended visual changes |

---

## 16. References

- [SPARC Methodology](https://github.com/sparc-ai/sparc)
- [Agent Tier System Spec](/workspaces/agent-feed/docs/SPARC-AGENT-TIER-SYSTEM-SPEC.md)
- [Agent Icon Emoji Mapping](/workspaces/agent-feed/docs/AGENT-ICON-EMOJI-MAPPING.md)
- [Protection Validation Spec](/workspaces/agent-feed/docs/PSEUDOCODE-PROTECTION-VALIDATION.md)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright E2E Testing](https://playwright.dev/)

---

**END OF SPECIFICATION**

**Status:** ✅ Ready for Implementation
**Review Date:** 2025-01-19
**Next Step:** Begin Phase 1 - Layout Restoration
