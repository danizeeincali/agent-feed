# SPARC Specification: Icon Rendering & Mermaid Diagram Fixes

## Specification Phase

### Problem Statement

**Issue 1: Icons Displaying as Text Strings**
- Dashboard and metrics show text like "file-text", "box", "users", "layout" instead of actual icons
- Root cause: Line 484 in DynamicPageRenderer.tsx renders `props.icon` directly as text
- Affects: `stat` component, `list` component, navigation items

**Issue 2: Mermaid Diagrams Not Rendering**
- All 3 Mermaid diagrams on Tab 7 show blank/empty (no loading spinner, no diagram)
- Recent fix removed hasRenderedRef and added isMounted pattern
- Need browser console investigation to determine if render succeeds but SVG not inserting

### Solution Overview

**Icon Fix:**
1. Create icon name to Lucide component mapping
2. Add icon resolver function that converts string names to React components
3. Update `stat` and `list` components to use icon resolver
4. Handle missing icons gracefully with fallback

**Mermaid Fix:**
1. Check browser console logs for render status
2. Verify containerRef timing with additional logging
3. Ensure SVG insertion happens after containerRef is ready
4. Add explicit ref callback if needed

### Success Criteria
- ✅ Icons display as actual Lucide icons (not text)
- ✅ All dashboard metrics show proper icons
- ✅ All 3 Mermaid diagrams render SVG graphics
- ✅ Browser console shows successful render logs
- ✅ No errors in console
- ✅ Screenshots prove functionality

---

## Pseudocode Phase

### Icon Resolver Algorithm

```pseudocode
// Step 1: Import all needed Lucide icons
IMPORT FileText, Box, CheckCircle, Clock, Users, Layout, etc. FROM 'lucide-react'

// Step 2: Create icon mapping
CONST iconMap = {
  'file-text': FileText,
  'box': Box,
  'check-circle': CheckCircle,
  'clock': Clock,
  'users': Users,
  'layout': Layout,
  // ... add all icons from data
}

// Step 3: Create icon resolver function
FUNCTION getIconComponent(iconName: string, props?: object):
  IF !iconName:
    RETURN null

  // Normalize icon name (kebab-case, lowercase)
  normalizedName = iconName.toLowerCase().trim()

  // Look up icon component
  IconComponent = iconMap[normalizedName]

  IF IconComponent:
    RETURN <IconComponent {...props} />
  ELSE:
    // Fallback for unknown icons
    CONSOLE.warn('Unknown icon:', iconName)
    RETURN <Circle {...props} /> // Generic fallback icon

// Step 4: Update stat component
CASE 'stat':
  RETURN (
    <div>
      <div>
        <p>{props.label}</p>
        <p>{props.value}</p>
      </div>
      {props.icon && (
        <div className="text-4xl text-gray-400">
          {getIconComponent(props.icon, { size: 40, strokeWidth: 1.5 })}
        </div>
      )}
    </div>
  )

// Step 5: Update list component
CASE 'list':
  RETURN (
    <ListTag>
      {items.map((item) => (
        <li>
          {props.icon && (
            <span className="mr-2">
              {getIconComponent(props.icon, { size: 16 })}
            </span>
          )}
          {item}
        </li>
      ))}
    </ListTag>
  )
```

### Mermaid Investigation Algorithm

```pseudocode
// Check if render is completing
FUNCTION investigateMermaid():
  1. Open browser console
  2. Navigate to Tab 7
  3. Look for logs:
     - 🎨 useEffect triggered
     - 🚀 Starting render
     - ⏳ Calling mermaid.render()
     - 🎉 Render complete
     - ✅ SVG inserted into DOM

  4. IF "Render complete" appears BUT "SVG inserted" doesn't:
     ISSUE: containerRef.current is null when inserting
     SOLUTION: Use callback ref pattern

  5. IF "Calling mermaid.render()" appears BUT "Render complete" doesn't:
     ISSUE: mermaid.render() hanging or erroring
     SOLUTION: Check for Mermaid errors, increase timeout, or try different API

  6. IF no logs appear at all:
     ISSUE: Component not mounting or useEffect not running
     SOLUTION: Check component registration in DynamicPageRenderer
```

---

## Architecture Phase

### Component Structure

```
DynamicPageRenderer
├── Icon Resolution Module
│   ├── iconMap: Record<string, LucideIcon>
│   ├── getIconComponent(name: string): ReactElement
│   └── Icon imports from lucide-react
│
├── Updated Components
│   ├── stat component (line 471)
│   │   └── Uses getIconComponent(props.icon)
│   ├── list component (line 490)
│   │   └── Uses getIconComponent(props.icon)
│   └── Any other components with icon props
│
└── MermaidDiagram (separate file)
    ├── Enhanced logging
    ├── Callback ref pattern (if needed)
    └── Error boundaries
```

### Icon Mapping Strategy

**Icons to Support:**
- file-text → FileText
- box → Box
- check-circle → CheckCircle
- clock → Clock
- users → Users
- layout → Layout (or LayoutDashboard)
- calendar → Calendar
- chart → BarChart3
- trending-up → TrendingUp
- trending-down → TrendingDown
- ... (add as discovered)

**Name Normalization:**
- Convert to lowercase
- Handle both kebab-case and camelCase
- Trim whitespace
- Map common aliases (e.g., "layout" → LayoutDashboard)

---

## Refinement Phase

### Edge Cases

1. **Unknown Icon Names**: Render fallback Circle icon with warning
2. **Null/Undefined Icon**: Don't render anything
3. **Icon Size Consistency**: Default to appropriate sizes (16px for inline, 40px for large)
4. **Icon Color**: Inherit from parent or use gray-400 default
5. **Multiple Icon Formats**: Handle "FileText", "file-text", "fileText"

### Performance Considerations

1. **Icon Map Memoization**: Create map once at module level
2. **Component Memoization**: Use React.memo for icon components if needed
3. **Lazy Loading**: Icons load with lucide-react tree-shaking

### Accessibility

1. Add `aria-hidden="true"` to decorative icons
2. Add `role="img"` and `aria-label` for meaningful icons
3. Ensure icon-only buttons have text labels

---

## Completion Phase

### Implementation Checklist

**Icon Fixes:**
- [ ] Import all needed Lucide icons
- [ ] Create iconMap with all icon names from data
- [ ] Implement getIconComponent function
- [ ] Update stat component (line 484)
- [ ] Update list component (line 499)
- [ ] Find and update any other icon usages
- [ ] Add fallback for unknown icons
- [ ] Test with all icon names in JSON data

**Mermaid Fixes:**
- [ ] Check browser console logs
- [ ] Identify specific failure point
- [ ] Implement fix based on investigation
- [ ] Add additional logging if needed
- [ ] Test all 3 diagram types
- [ ] Verify SVG actually renders
- [ ] Screenshot proof

**Testing:**
- [ ] Unit tests for getIconComponent function
- [ ] Unit tests for stat component with icons
- [ ] Unit tests for list component with icons
- [ ] Integration tests for Mermaid rendering
- [ ] Browser validation with screenshots
- [ ] Regression tests for existing functionality

**Validation:**
- [ ] Production validator agent
- [ ] Code analyzer agent
- [ ] Tester agent
- [ ] Manual browser testing
- [ ] Screenshot documentation

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Missing icon imports | Medium | Low | Add all icons, use fallback |
| Icon name mismatches | Medium | Low | Normalize names, add aliases |
| Mermaid still doesn't render | Low | High | Multiple fix strategies ready |
| Performance degradation | Very Low | Low | Icons are lightweight |
| Breaking existing components | Low | Medium | Thorough testing, backward compatible |

---

## Testing Strategy

### Unit Tests
1. getIconComponent returns correct component for valid names
2. getIconComponent returns fallback for invalid names
3. stat component renders icon correctly
4. list component renders icon correctly
5. Icon normalization handles various formats

### Integration Tests
1. Dashboard metrics display correct icons
2. Navigation items show correct icons
3. All Mermaid diagrams render
4. No console errors

### Browser Tests
1. Visual verification of icons
2. Screenshot proof of diagrams
3. Console log validation
4. Cross-component compatibility

---

**Status**: Ready for implementation
**Confidence Level**: 95% for icons, 80% for Mermaid (pending investigation)
**Estimated Time**:
- Icon fix: 30 minutes
- Mermaid investigation: 15 minutes
- Mermaid fix: 15-45 minutes (depending on root cause)
- Testing: 30 minutes
- Total: ~2 hours
