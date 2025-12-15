# Checklist Component - Cheat Sheet

## 📋 Import
```tsx
import { Checklist } from './components/dynamic-page';
import type { ChecklistItem, ChecklistProps } from './components/dynamic-page';
```

## 🎯 Props

| Prop | Type | Default | Required |
|------|------|---------|----------|
| `items` | `ChecklistItem[]` | - | ✓ |
| `allowEdit` | `boolean` | `true` | ✗ |
| `onChange` | `string` | `undefined` | ✗ |
| `className` | `string` | `undefined` | ✗ |

## 📦 ChecklistItem Interface
```tsx
{
  id: string;          // Unique identifier
  text: string;        // Display text (supports {{variables}})
  checked: boolean;    // Checkbox state
  metadata?: any;      // Optional metadata for templates
}
```

## 🚀 Quick Examples

### Minimal
```tsx
<Checklist items={[
  { id: '1', text: 'Task', checked: false }
]} />
```

### With API
```tsx
<Checklist
  items={items}
  onChange="/api/update"
/>
```

### Template Variables
```tsx
<Checklist items={[{
  id: '1',
  text: 'Deploy {{env}}',
  checked: false,
  metadata: { env: 'production' }
}]} />
```

### Read-Only
```tsx
<Checklist items={items} allowEdit={false} />
```

## 📡 API Payload
```json
{
  "itemId": "1",
  "checked": true,
  "item": {
    "id": "1",
    "text": "Task",
    "checked": true,
    "metadata": {}
  },
  "timestamp": "2025-10-05T12:00:00.000Z"
}
```

## ⌨️ Keyboard

| Key | Action |
|-----|--------|
| `Enter`/`Space` | Toggle |
| `↓` | Next |
| `↑` | Previous |
| `Home` | First |
| `End` | Last |

## 🎨 Styling States

- **Unchecked:** Gray border, white background
- **Checked:** Green border, green background
- **Loading:** Blue spinner
- **Error:** Red border, error message
- **Disabled:** Grayed out, no interaction

## ✨ Features

✅ TypeScript  
✅ API Integration  
✅ Template Variables  
✅ Keyboard Nav  
✅ Mobile Responsive  
✅ Loading States  
✅ Error Handling  
✅ Accessibility  
✅ Progress Tracking  

## 📂 Files

```
Checklist.tsx                 - Main component
Checklist.example.tsx         - Examples
Checklist.integration.tsx     - Integration
Checklist.test.tsx            - Tests
Checklist.README.md           - Full docs
CHECKLIST_QUICKSTART.md       - Quick start
CHECKLIST_CHEATSHEET.md       - This file
```

---
**Status:** Production Ready ✅ | **Version:** 1.0.0
