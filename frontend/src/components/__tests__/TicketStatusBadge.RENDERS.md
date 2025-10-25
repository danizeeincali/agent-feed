# TicketStatusBadge Component - Visual Renders

This document shows what each status configuration renders visually.

## Status Renders

### 1. Pending Status

**Code:**
```jsx
<TicketStatusBadge
  status="pending"
  agents={["link-logger-agent"]}
  count={1}
/>
```

**Visual Description:**
```
┌─────────────────────────────────────┐
│ [Clock Icon] Waiting for link logger │  ← Amber/Yellow background
└─────────────────────────────────────┘
```

**Styling:**
- Background: Amber-50 (#FFFBEB)
- Text: Amber-600 (#D97706)
- Border: Amber-200 (#FDE68A)
- Icon: Clock (static)

---

### 2. Processing Status

**Code:**
```jsx
<TicketStatusBadge
  status="processing"
  agents={["link-logger-agent"]}
  count={1}
/>
```

**Visual Description:**
```
┌───────────────────────────────────┐
│ [⟳ Spinner] link logger analyzing... │  ← Blue background
└───────────────────────────────────┘
   ↑ Animated spin
```

**Styling:**
- Background: Blue-50 (#EFF6FF)
- Text: Blue-600 (#2563EB)
- Border: Blue-200 (#BFDBFE)
- Icon: Loader2 (spinning animation)

---

### 3. Completed Status

**Code:**
```jsx
<TicketStatusBadge
  status="completed"
  agents={["analyzer-agent"]}
  count={1}
/>
```

**Visual Description:**
```
┌──────────────────────────────────┐
│ [✓ Check] Analyzed by analyzer │  ← Green background
└──────────────────────────────────┘
```

**Styling:**
- Background: Green-50 (#F0FDF4)
- Text: Green-600 (#16A34A)
- Border: Green-200 (#BBF7D0)
- Icon: CheckCircle (static)

---

### 4. Failed Status

**Code:**
```jsx
<TicketStatusBadge
  status="failed"
  agents={["link-logger-agent"]}
  count={1}
/>
```

**Visual Description:**
```
┌──────────────────────────────────────────┐
│ [✗ X] Analysis failed - link logger │  ← Red background
└──────────────────────────────────────────┘
```

**Styling:**
- Background: Red-50 (#FEF2F2)
- Text: Red-600 (#DC2626)
- Border: Red-200 (#FECACA)
- Icon: XCircle (static)

---

## Multiple Agents Renders

### Pending with Multiple Agents

**Code:**
```jsx
<TicketStatusBadge
  status="pending"
  agents={["link-logger-agent", "analyzer-agent", "moderator-agent"]}
  count={1}
/>
```

**Visual Description:**
```
┌──────────────────────────────────────────────┐
│ [Clock] Waiting for link logger +2 more │  ← Amber background
└──────────────────────────────────────────────┘
                                   ↑ Additional agent count
```

---

### Processing with Multiple Agents

**Code:**
```jsx
<TicketStatusBadge
  status="processing"
  agents={["link-logger-agent", "analyzer-agent"]}
  count={1}
/>
```

**Visual Description:**
```
┌────────────────────────────────────────────┐
│ [⟳] link logger +1 more analyzing... │  ← Blue background
└────────────────────────────────────────────┘
```

---

### Completed with Multiple Agents

**Code:**
```jsx
<TicketStatusBadge
  status="completed"
  agents={["agent-1", "agent-2", "agent-3", "agent-4", "agent-5"]}
  count={1}
/>
```

**Visual Description:**
```
┌──────────────────────────────────────┐
│ [✓] Analyzed by agent 1 +4 more │  ← Green background
└──────────────────────────────────────┘
```

---

## Ticket Count Renders

### Multiple Tickets (Count Badge)

**Code:**
```jsx
<TicketStatusBadge
  status="processing"
  agents={["link-logger-agent"]}
  count={3}
/>
```

**Visual Description:**
```
┌─────────────────────────────────────────┐
│ [⟳] link logger analyzing... [3] │  ← Blue background with count badge
└─────────────────────────────────────────┘
                               ↑ Count badge (semi-transparent white)
```

---

### Complex Example: Multiple Agents + Multiple Tickets

**Code:**
```jsx
<TicketStatusBadge
  status="pending"
  agents={["link-logger-agent", "analyzer-agent", "moderator-agent"]}
  count={5}
/>
```

**Visual Description:**
```
┌──────────────────────────────────────────────────┐
│ [Clock] Waiting for link logger +2 more [5] │  ← Amber background
└──────────────────────────────────────────────────┘
```

---

## TicketStatusList Renders

### Mixed Status Tickets

**Code:**
```jsx
<TicketStatusList
  tickets={[
    { status: 'processing', agent: 'link-logger-agent' },
    { status: 'completed', agent: 'analyzer-agent' },
    { status: 'pending', agent: 'moderator-agent' }
  ]}
/>
```

**Visual Description:**
```
┌────────────────────────────────────┐
│ [⟳] link logger analyzing...      │  ← Blue
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ [✓] Analyzed by analyzer           │  ← Green
└────────────────────────────────────┘

┌────────────────────────────────────┐
│ [Clock] Waiting for moderator      │  ← Amber
└────────────────────────────────────┘
```

---

### Multiple Same Status

**Code:**
```jsx
<TicketStatusList
  tickets={[
    { status: 'processing', agent: 'link-logger-agent' },
    { status: 'processing', agent: 'analyzer-agent' },
    { status: 'processing', agent: 'moderator-agent' }
  ]}
/>
```

**Visual Description:**
```
┌────────────────────────────────────────────┐
│ [⟳] link logger +2 more analyzing... │  ← Blue (grouped together)
└────────────────────────────────────────────┘
```

---

## In-Context Example: PostCard Integration

**Code:**
```jsx
<div className="post-card">
  <div className="post-header">
    <h3>New AI Model Announcement</h3>
    <span>2h ago</span>
  </div>
  <div className="post-content">
    Check out this amazing new model: https://example.com/model
  </div>
  <div className="post-footer">
    <TicketStatusBadge
      status="processing"
      agents={["link-logger-agent"]}
      count={1}
    />
  </div>
</div>
```

**Visual Description:**
```
┌─────────────────────────────────────────────┐
│ New AI Model Announcement        2h ago    │
│                                             │
│ Check out this amazing new model:          │
│ https://example.com/model                  │
│                                             │
│ ┌──────────────────────────────────────┐  │
│ │ [⟳] link logger analyzing...        │  │
│ └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Agent Name Formatting Examples

### Before and After Formatting

| Original Agent ID | Displayed As |
|------------------|-------------|
| `link-logger-agent` | `link logger` |
| `my-custom-bot-agent` | `my custom bot` |
| `analyzer-agent` | `analyzer` |
| `content-moderator-agent` | `content moderator` |
| `simple-name` | `simple name` |
| `analyzer` | `analyzer` (no change) |

**Example Render:**
```jsx
<TicketStatusBadge
  status="completed"
  agents={["content-moderator-agent"]}
  count={1}
/>
```

**Visual:**
```
┌───────────────────────────────────────────┐
│ [✓] Analyzed by content moderator       │  ← "agent" suffix removed, hyphens → spaces
└───────────────────────────────────────────┘
```

---

## Accessibility Features in Action

### Screen Reader Output

When focused or announced, a screen reader would read:

**Pending:**
> "Status: Ticket pending: link-logger-agent. Waiting for link logger."

**Processing:**
> "Status: Ticket processing: link-logger-agent. link logger analyzing..."

**Completed:**
> "Status: Ticket completed: analyzer-agent. Analyzed by analyzer."

**Failed:**
> "Status: Ticket failed: link-logger-agent. Analysis failed - link logger."

**With Count:**
> "Status: Ticket processing: link-logger-agent. link logger analyzing... 3 total tickets."

---

## Color Reference Card

### Status Color Palette

```
PENDING (Amber/Yellow):
┌──────────────────────┐
│   bg-amber-50        │  Background: #FFFBEB
│   border-amber-200   │  Border:     #FDE68A
│   text-amber-600     │  Text:       #D97706
└──────────────────────┘

PROCESSING (Blue):
┌──────────────────────┐
│   bg-blue-50         │  Background: #EFF6FF
│   border-blue-200    │  Border:     #BFDBFE
│   text-blue-600      │  Text:       #2563EB
└──────────────────────┘

COMPLETED (Green):
┌──────────────────────┐
│   bg-green-50        │  Background: #F0FDF4
│   border-green-200   │  Border:     #BBF7D0
│   text-green-600     │  Text:       #16A34A
└──────────────────────┘

FAILED (Red):
┌──────────────────────┐
│   bg-red-50          │  Background: #FEF2F2
│   border-red-200     │  Border:     #FECACA
│   text-red-600       │  Text:       #DC2626
└──────────────────────┘
```

---

## Icon Visual Reference

### All Status Icons (Lucide React)

```
Pending:      [🕐]  Clock
Processing:   [⟳]  Loader2 (animated)
Completed:    [✓]  CheckCircle
Failed:       [✗]  XCircle
```

**Note:** Actual implementation uses Lucide React SVG icons, not emoji characters.

---

## Size Comparison

### Default Size
```
┌──────────────────────────────────┐
│ [Icon] Text content here         │  Height: ~32px, Padding: 8px 10px
└──────────────────────────────────┘
```

### With Long Agent Names
```
┌────────────────────────────────────────────────────────┐
│ [Icon] Waiting for my very long agent name +3 more │
└────────────────────────────────────────────────────────┘
```

### Compact (Single Agent)
```
┌────────────────────────────────┐
│ [Icon] agent analyzing...     │
└────────────────────────────────┘
```

---

## Animation Demonstration

### Processing Status Animation

```
Frame 1:  [↑] link logger analyzing...
Frame 2:  [→] link logger analyzing...
Frame 3:  [↓] link logger analyzing...
Frame 4:  [←] link logger analyzing...
(Repeats continuously at 1s per rotation)
```

**CSS:**
```css
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## Responsive Behavior

### Desktop View
```
Normal spacing, full text display
┌────────────────────────────────────┐
│ [Icon] Text content here           │
└────────────────────────────────────┘
```

### Mobile View
```
Maintains layout, text wraps if needed
┌─────────────────────────┐
│ [Icon] Text content     │
│        here (wrapped)   │
└─────────────────────────┘
```

---

## Real-World Usage Scenarios

### Scenario 1: Link Detection
```
Post: "Check out https://example.com"
Status: [⟳] link logger analyzing...
```

### Scenario 2: Multiple Analyses Complete
```
Post: "New research paper: https://arxiv.org/example"
Status: [✓] link logger +1 more [2]
```

### Scenario 3: Failed Analysis
```
Post: "Broken link: https://invalid-url.com"
Status: [✗] Analysis failed - link logger
```

### Scenario 4: Waiting for Analysis
```
Post: "Just shared: https://github.com/project"
Status: [🕐] Waiting for link logger
```

---

## Component Hierarchy

```
TicketStatusBadge
├── Container (div)
│   ├── Icon (Lucide component)
│   ├── Text Content (span)
│   │   ├── Status Label
│   │   ├── Agent Name (formatted)
│   │   └── "+N more" (if multiple agents)
│   └── Count Badge (span, if count > 1)
```

---

## Verification Checklist

- ✅ Uses Lucide React icons (Clock, Loader2, CheckCircle, XCircle)
- ✅ NO emoji characters used
- ✅ All four status types implemented (pending, processing, completed, failed)
- ✅ Color-coded with Tailwind classes
- ✅ Animated spinner for processing status
- ✅ Shows agent names with smart formatting
- ✅ Supports multiple agents with "+N more" display
- ✅ Shows count badge when count > 1
- ✅ Fully accessible with ARIA attributes
- ✅ Responsive design with flexible layout
- ✅ Semantic HTML with proper roles
- ✅ Screen reader friendly
